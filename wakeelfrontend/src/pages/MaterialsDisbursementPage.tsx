import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { apiService, ApiService } from '../services/api';
import { useMyAgent } from '../hooks/useMyAgent';
import { tryEmbedInvoiceLogoAsDataUrl, waitForDocumentImages } from '../utils/activationReceiptPrintHtml';
import { buildSalesMaterialInvoicePrintHtml } from '../utils/salesMaterialInvoicePrintHtml';
import type { ActivationInvoicePrintSettingsDto, Dealer, SalesInvoicePrintSettingsDto } from '../types';
import { MaterialDisburseRequest, MaterialReturnRequest, DisbursementType } from '../types';
import type { MaterialDisbursement } from '../types';
import { showSuccess, showError } from '../utils/notifications';
import { useAuth } from '../contexts/AuthContext';
import { useOffline } from '../contexts/OfflineContext';
import { useDigits } from '../contexts/DigitsContext';
import { fetchAllSubscribersForDisbursePicker } from '../services/offlineSync';
import { UserRole, type User } from '../types';
import WifiLoaderComponent from '../components/WifiLoaderComponent';
import Pagination from '../components/Pagination';
import { GlassSummaryCard } from '../components/GlassSummaryCard';
import { Package, X, Save, ShoppingCart, Search, Printer, RotateCcw, UserCircle } from 'lucide-react';

function disbursementTypeLabel(t: number): string {
  if (t === DisbursementType.Sale) return 'بيع';
  if (t === DisbursementType.SpecialOfferPackage) return 'باقة عرض خاص';
  return 'سحب';
}

/** تسمية نوع الفاتورة في الطباعة (مطابقة للنماذج التجارية) */
function invoiceTypeForSalesPrint(t: number): string {
  if (t === DisbursementType.Sale) return 'نقدي';
  return disbursementTypeLabel(t);
}

/** بيانات فاتورة بيع مادة للطباعة (نفس قياس فاتورة الاشتراك 50×80mm) */
interface MaterialInvoicePrintData {
  materialName: string;
  subscriberName: string;
  subscriberPhone?: string;
  quantity: number;
  unitSubscriberPrice?: number;
  pricePaidBySubscriber: number;
  materialDebt?: number;
  notes?: string;
  createdAt: string;
  disbursementType: number;
  /** رقم الفاتورة (من الباكند عند البيع فقط) */
  invoiceNumber?: string;
  /** لاستخراج العنوان/المنطقة عند الطباعة */
  subscriberId?: string;
}

interface PosCartItem {
  materialId: string;
  quantity: number;
  pricePaidBySubscriber: number;
}

type SaleTargetType = 'subscriber' | 'dealer';

const MaterialsDisbursementPage: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();
  const { online } = useOffline();
  const { formatNumber, locale } = useDigits();

  /** تاريخ بغداد فقط (يُفصل عن الوقت لعرض أنظف في الجدول). */
  const formatBaghdadDateOnly = React.useCallback(
    (d: string | Date | undefined | null) => {
      if (d == null) return '';
      const date = typeof d === 'string' ? new Date(d) : d;
      if (Number.isNaN(date.getTime())) return '';
      return date.toLocaleDateString(locale, {
        timeZone: 'Asia/Baghdad',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
    },
    [locale]
  );

  /** وقت بغداد 12 ساعة مع ثوانٍ. */
  const formatBaghdadTimeOnly = React.useCallback(
    (d: string | Date | undefined | null) => {
      if (d == null) return '';
      const date = typeof d === 'string' ? new Date(d) : d;
      if (Number.isNaN(date.getTime())) return '';
      return date.toLocaleTimeString(locale, {
        timeZone: 'Asia/Baghdad',
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
    },
    [locale]
  );
  const isAdmin = user?.role === UserRole.Admin;
  const canAccessMaterialsApi = user?.role !== UserRole.Employee || !!user?.canManageMaterialsAndSales;
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [appliedSearchTerm, setAppliedSearchTerm] = useState('');
  const [disbursementTypeFilter, setDisbursementTypeFilter] = useState<string>('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [appliedFromDate, setAppliedFromDate] = useState('');
  const [appliedToDate, setAppliedToDate] = useState('');
  /** سجل المبيعات: فلتر صاحب الصرف (معرّف مستخدم) */
  const [disbursedByUserIdFilter, setDisbursedByUserIdFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [showDisburseModal, setShowDisburseModal] = useState(false);
  const [disburseForm, setDisburseForm] = useState<MaterialDisburseRequest>({
    materialId: '',
    subscriberId: '',
    dealerId: '',
    disbursementType: DisbursementType.Replacement,
    quantity: 0,
    pricePaidBySubscriber: 0,
    notes: '',
  });
  const [materialSearch, setMaterialSearch] = useState('');
  const [subscriberSearch, setSubscriberSearch] = useState('');
  /** بحث مشترك لواجهة فاتورة نقاط البيع (قابل للبحث مثل النموذج اليدوي) */
  const [posSubscriberSearch, setPosSubscriberSearch] = useState('');
  const [showMaterialDropdown, setShowMaterialDropdown] = useState(false);
  const [showSubscriberDropdown, setShowSubscriberDropdown] = useState(false);
  const [showPosSubscriberDropdown, setShowPosSubscriberDropdown] = useState(false);
  const [showPosDealerDropdown, setShowPosDealerDropdown] = useState(false);
  const [showManualDealerDropdown, setShowManualDealerDropdown] = useState(false);
  const materialDropdownRef = useRef<HTMLDivElement>(null);
  const subscriberDropdownRef = useRef<HTMLDivElement>(null);
  const posSubscriberDropdownRef = useRef<HTMLDivElement>(null);
  const posDealerDropdownRef = useRef<HTMLDivElement>(null);
  const manualDealerDropdownRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { data: myAgent } = useMyAgent(!!user);
  const [lastDisbursementForPrint, setLastDisbursementForPrint] = useState<MaterialInvoicePrintData | null>(null);
  const [showSuccessPrintModal, setShowSuccessPrintModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnInvoiceNumber, setReturnInvoiceNumber] = useState('');
  const [returnFoundDisbursement, setReturnFoundDisbursement] = useState<MaterialDisbursement | null>(null);
  const [returnSearching, setReturnSearching] = useState(false);
  const [returnQuantity, setReturnQuantity] = useState<number>(0);
  const [returnNotes, setReturnNotes] = useState('');
  const [selectedSubscriberIdForPos, setSelectedSubscriberIdForPos] = useState<string>('');
  const [selectedDealerIdForPos, setSelectedDealerIdForPos] = useState<string>('');
  const [selectedDealerIdForManual, setSelectedDealerIdForManual] = useState<string>('');
  const [posSaleTargetType, setPosSaleTargetType] = useState<SaleTargetType>('subscriber');
  const [manualSaleTargetType, setManualSaleTargetType] = useState<SaleTargetType>('subscriber');
  const [posDealerSearch, setPosDealerSearch] = useState('');
  const [manualDealerSearch, setManualDealerSearch] = useState('');
  const [cartItems, setCartItems] = useState<PosCartItem[]>([]);
  const isSalesHistoryMode = location.pathname.endsWith('/sales-history');
  const isPosMode = !isSalesHistoryMode;

  const { data: agentsResponse } = useQuery({
    queryKey: ['agents', 1, 100],
    queryFn: () => apiService.getAllAgents({ page: 1, pageSize: 100 }),
    enabled: isAdmin,
  });
  const agents = React.useMemo(() => agentsResponse?.data ?? [], [agentsResponse?.data]);

  const selectedAgentRecord = React.useMemo(
    () => agents.find((a) => a.id === selectedAgentId),
    [agents, selectedAgentId]
  );

  const { data: employeesForDisburserFilter } = useQuery<User[]>({
    queryKey: ['materials-disburser-users', isAdmin ? selectedAgentId : 'me'],
    queryFn: () =>
      isAdmin ? apiService.getAgentEmployees(selectedAgentId!) : apiService.getMyEmployees(),
    enabled:
      canAccessMaterialsApi && isSalesHistoryMode && (!isAdmin || !!selectedAgentId),
  });

  const disburserSelectOptions = React.useMemo(() => {
    const rows: { value: string; label: string }[] = [];
    const add = (id: string, label: string) => {
      const idt = (id || '').trim();
      if (!idt) return;
      if (rows.some((r) => r.value === idt)) return;
      rows.push({ value: idt, label: (label || idt).trim() });
    };
    if (!isSalesHistoryMode) return rows;
    if (isAdmin) {
      if (selectedAgentRecord?.userId) {
        add(
          selectedAgentRecord.userId,
          (selectedAgentRecord.companyName || selectedAgentRecord.fullName || 'الوكيل').trim()
        );
      }
    } else if (user?.id) {
      add(user.id, (user.fullName || user.username || '').trim());
    }
    for (const e of employeesForDisburserFilter ?? []) {
      add(e.id, (e.fullName || e.username || '').trim());
    }
    rows.sort((a, b) => a.label.localeCompare(b.label, 'ar'));
    return rows;
  }, [isSalesHistoryMode, isAdmin, selectedAgentRecord, user, employeesForDisburserFilter]);

  useEffect(() => {
    if (!isAdmin) return;
    setDisbursedByUserIdFilter('');
    setCurrentPage(1);
  }, [selectedAgentId, isAdmin]);

  const { data: materialsResponse } = useQuery({
    queryKey: ['materials', isAdmin ? selectedAgentId : undefined, 1, 100],
    queryFn: () =>
      apiService.getMaterials(isAdmin ? (selectedAgentId || undefined) : undefined, {
        page: 1,
        pageSize: 100,
      }),
    enabled: canAccessMaterialsApi,
  });
  const list = React.useMemo(() => materialsResponse?.data ?? [], [materialsResponse?.data]);

  const { data: disbursementsResponse, error, isLoading } = useQuery({
    queryKey: [
      'material-disbursements',
      isAdmin ? selectedAgentId : undefined,
      currentPage,
      pageSize,
      appliedSearchTerm,
      disbursementTypeFilter,
      appliedFromDate,
      appliedToDate,
      disbursedByUserIdFilter,
    ],
    queryFn: () =>
      apiService.getMaterialDisbursements(isAdmin ? (selectedAgentId || undefined) : undefined, {
        page: currentPage,
        pageSize,
        searchTerm: appliedSearchTerm.trim() || undefined,
        disbursementType:
          disbursementTypeFilter === '' ? undefined : (parseInt(disbursementTypeFilter, 10) as DisbursementType),
        fromDate: appliedFromDate.trim() || undefined,
        toDate: appliedToDate.trim() || undefined,
        disbursedByUserId: disbursedByUserIdFilter.trim() || undefined,
      }),
    enabled: canAccessMaterialsApi,
  });
  const disbursements = disbursementsResponse?.data ?? [];
  const statistics = disbursementsResponse?.statistics;

  const { data: subscribers = [], isLoading: subscribersLoading } = useQuery({
    queryKey: ['subscribers-for-disburse-all', online, user?.id],
    queryFn: () => fetchAllSubscribersForDisbursePicker(online),
    enabled: canAccessMaterialsApi && !!user,
    staleTime: 60_000,
  });

  const { data: dealers = [], isLoading: dealersLoading } = useQuery<Dealer[]>({
    queryKey: ['materials-dealers', isAdmin ? selectedAgentId : 'me'],
    queryFn: () =>
      apiService.getRenewalDealersList(isAdmin ? { agentId: selectedAgentId } : undefined),
    enabled: canAccessMaterialsApi && (!isAdmin || !!selectedAgentId),
    staleTime: 60_000,
  });

  const filteredMaterials = React.useMemo(() => {
    const q = (materialSearch || '').trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (m) =>
        (m.name || '').toLowerCase().includes(q) ||
        String(m.quantity ?? '').includes(q)
    );
  }, [list, materialSearch]);

  const filterSubscribersByQuery = React.useCallback((list: typeof subscribers, qRaw: string) => {
    const q = (qRaw || '').trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (s) =>
        (s.fullName || '').toLowerCase().includes(q) ||
        (s.firstName || '').toLowerCase().includes(q) ||
        (s.lastName || '').toLowerCase().includes(q) ||
        (s.username || '').toLowerCase().includes(q) ||
        (s.phoneNumber || '').replace(/\s/g, '').includes(q.replace(/\s/g, ''))
    );
  }, []);

  const filteredSubscribers = React.useMemo(
    () => filterSubscribersByQuery(subscribers, subscriberSearch),
    [subscribers, subscriberSearch, filterSubscribersByQuery]
  );

  const filteredPosSubscribers = React.useMemo(
    () => filterSubscribersByQuery(subscribers, posSubscriberSearch),
    [subscribers, posSubscriberSearch, filterSubscribersByQuery]
  );

  const filterDealersByQuery = React.useCallback((rows: Dealer[], qRaw: string) => {
    const q = (qRaw || '').trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (d) =>
        (d.fullName || '').toLowerCase().includes(q) ||
        (d.userName || '').toLowerCase().includes(q) ||
        (d.phone || '').replace(/\s/g, '').includes(q.replace(/\s/g, ''))
    );
  }, []);

  const filteredPosDealers = React.useMemo(
    () => filterDealersByQuery(dealers, posDealerSearch),
    [dealers, posDealerSearch, filterDealersByQuery]
  );
  const filteredManualDealers = React.useMemo(
    () => filterDealersByQuery(dealers, manualDealerSearch),
    [dealers, manualDealerSearch, filterDealersByQuery]
  );

  useEffect(() => {
    if (!showDisburseModal) {
      setShowMaterialDropdown(false);
      setShowSubscriberDropdown(false);
      setShowManualDealerDropdown(false);
      setMaterialSearch('');
      setSubscriberSearch('');
      setManualDealerSearch('');
    }
  }, [showDisburseModal]);

  useEffect(() => {
    if (disburseForm.disbursementType !== DisbursementType.Sale) {
      setManualSaleTargetType('subscriber');
      setSelectedDealerIdForManual('');
    }
  }, [disburseForm.disbursementType]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (materialDropdownRef.current && !materialDropdownRef.current.contains(e.target as Node)) {
        setShowMaterialDropdown(false);
      }
      if (subscriberDropdownRef.current && !subscriberDropdownRef.current.contains(e.target as Node)) {
        setShowSubscriberDropdown(false);
      }
      if (posSubscriberDropdownRef.current && !posSubscriberDropdownRef.current.contains(e.target as Node)) {
        setShowPosSubscriberDropdown(false);
      }
      if (posDealerDropdownRef.current && !posDealerDropdownRef.current.contains(e.target as Node)) {
        setShowPosDealerDropdown(false);
      }
      if (manualDealerDropdownRef.current && !manualDealerDropdownRef.current.contains(e.target as Node)) {
        setShowManualDealerDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedMaterial = list.find((m) => m.id === disburseForm.materialId);
  const selectedPosSubscriber = subscribers.find((s) => s.id === selectedSubscriberIdForPos);
  const selectedPosDealer = dealers.find((d) => d.id === selectedDealerIdForPos);
  const selectedManualSubscriber = subscribers.find((s) => s.id === disburseForm.subscriberId);
  const selectedManualDealer = dealers.find((d) => d.id === selectedDealerIdForManual);

  const disburseMutation = useMutation({
    mutationFn: (data: MaterialDisburseRequest) =>
      apiService.postMaterialDisburse(data, isAdmin ? (selectedAgentId || undefined) : undefined),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      queryClient.invalidateQueries({ queryKey: ['material-disbursements'] });
      const fallbackSubscriberName =
        selectedManualSubscriber?.fullName?.trim() ||
        [selectedManualSubscriber?.firstName, selectedManualSubscriber?.lastName].filter(Boolean).join(' ') ||
        selectedManualDealer?.fullName?.trim() ||
        '';
      setLastDisbursementForPrint({
        materialName: created?.materialName ?? selectedMaterial?.name ?? '',
        subscriberName: created?.subscriberName ?? fallbackSubscriberName,
        subscriberPhone:
          created?.subscriberPhone ??
          created?.dealerPhone ??
          selectedManualSubscriber?.phoneNumber ??
          selectedManualDealer?.phone,
        quantity: created?.quantity ?? disburseForm.quantity ?? 0,
        unitSubscriberPrice:
          created?.unitSubscriberPrice ??
          (manualSaleTargetType === 'dealer' ? selectedMaterial?.dealerPrice : selectedMaterial?.subscriberPrice),
        pricePaidBySubscriber: created?.pricePaidBySubscriber ?? disburseForm.pricePaidBySubscriber ?? 0,
        materialDebt: created?.materialDebt,
        notes: created?.notes ?? (disburseForm.notes?.trim() || undefined),
        createdAt: created?.createdAt ?? new Date().toISOString(),
        disbursementType: created?.disbursementType ?? disburseForm.disbursementType ?? DisbursementType.Replacement,
        invoiceNumber: created?.invoiceNumber,
        subscriberId:
          (created?.subscriberId && String(created.subscriberId).trim()) ||
          (disburseForm.subscriberId ?? '').trim() ||
          undefined,
      });
      setShowSuccessPrintModal(true);
      setShowDisburseModal(false);
      setDisburseForm({
        materialId: '',
        subscriberId: '',
        dealerId: '',
        disbursementType: DisbursementType.Replacement,
        quantity: 0,
        pricePaidBySubscriber: 0,
        notes: '',
      });
      setSelectedDealerIdForManual('');
      setManualSaleTargetType('subscriber');
      showSuccess('تم الصرف', 'تم تسجيل بيع/صرف المادة بنجاح');
    },
    onError: (err: unknown) => {
      const msg = ApiService.showError(err);
      showError('خطأ في الصرف', msg);
    },
  });

  const submitDisbursement = async (options?: { fromManualForm?: boolean }) => {
    /** النموذج اليدوي يستخدم disburseForm؛ مسار السلة يخص زر «تأكيد البيع» فقط */
    if (isPosMode && !options?.fromManualForm) {
      if (cartDetailedItems.length === 0) {
        showError('خطأ', 'أضف مادة واحدة على الأقل للفاتورة');
        return;
      }
      if (isAdmin && !selectedAgentId) {
        showError('خطأ', 'يرجى اختيار الوكيل');
        return;
      }
      try {
        if (posSaleTargetType === 'dealer' && !selectedDealerIdForPos.trim()) {
          showError('خطأ', 'يرجى اختيار التاجر للبيع');
          return;
        }
        let lastCreated: MaterialDisbursement | null = null;
        for (const line of cartDetailedItems) {
          const sendingDealerId = posSaleTargetType === 'dealer' ? selectedDealerIdForPos.trim() || null : null;
          const sendingSubscriberId = posSaleTargetType === 'subscriber' ? selectedSubscriberIdForPos.trim() || null : null;
          const created = await apiService.postMaterialDisburse(
            {
              materialId: line.material.id,
              subscriberId: sendingSubscriberId,
              dealerId: sendingDealerId,
              disbursementType: DisbursementType.Sale,
              quantity: line.item.quantity,
              pricePaidBySubscriber: line.item.pricePaidBySubscriber || 0,
              notes: '',
            },
            isAdmin ? (selectedAgentId || undefined) : undefined
          );
          lastCreated = created;
        }
        await queryClient.invalidateQueries({ queryKey: ['materials'] });
        await queryClient.invalidateQueries({ queryKey: ['material-disbursements'] });
        setCartItems([]);
        if (lastCreated) {
          const fallbackSubscriberName =
            selectedPosSubscriber?.fullName?.trim() ||
            [selectedPosSubscriber?.firstName, selectedPosSubscriber?.lastName].filter(Boolean).join(' ') ||
            selectedPosDealer?.fullName?.trim() ||
            '';
          setLastDisbursementForPrint({
            materialName: lastCreated.materialName ?? '',
            subscriberName: lastCreated.subscriberName ?? fallbackSubscriberName,
            subscriberPhone:
              lastCreated.subscriberPhone ??
              lastCreated.dealerPhone ??
              selectedPosSubscriber?.phoneNumber ??
              selectedPosDealer?.phone,
            quantity: lastCreated.quantity ?? 0,
            unitSubscriberPrice: lastCreated.unitSubscriberPrice,
            pricePaidBySubscriber: lastCreated.pricePaidBySubscriber ?? 0,
            materialDebt: lastCreated.materialDebt,
            notes: lastCreated.notes ?? undefined,
            createdAt: lastCreated.createdAt ?? new Date().toISOString(),
            disbursementType: lastCreated.disbursementType ?? DisbursementType.Sale,
            invoiceNumber: lastCreated.invoiceNumber,
            subscriberId:
              (lastCreated.subscriberId && String(lastCreated.subscriberId).trim()) ||
              selectedSubscriberIdForPos.trim() ||
              undefined,
          });
          setShowSuccessPrintModal(true);
        }
        showSuccess('تم الصرف', 'تم تسجيل عناصر الفاتورة بنجاح');
      } catch (err) {
        showError('خطأ في الصرف', ApiService.showError(err));
      }
      return;
    }

    if (!disburseForm.materialId) {
      showError('خطأ', 'يرجى اختيار المادة');
      return;
    }
    if ((disburseForm.quantity || 0) <= 0) {
      showError('خطأ', 'الكمية يجب أن تكون أكبر من صفر');
      return;
    }
    if (isAdmin && !selectedAgentId) {
      showError('خطأ', 'يرجى اختيار الوكيل');
      return;
    }
    const isSale = disburseForm.disbursementType === DisbursementType.Sale;
    if (isSale && manualSaleTargetType === 'dealer' && !selectedDealerIdForManual.trim()) {
      showError('خطأ', 'يرجى اختيار التاجر للبيع');
      return;
    }
    const subscriberIdForRequest =
      isSale && manualSaleTargetType === 'dealer'
        ? null
        : (disburseForm.subscriberId ?? '').trim() || null;
    const dealerIdForRequest =
      isSale && manualSaleTargetType === 'dealer'
        ? selectedDealerIdForManual.trim() || null
        : null;
    disburseMutation.mutate({
      materialId: disburseForm.materialId,
      subscriberId: subscriberIdForRequest,
      dealerId: dealerIdForRequest,
      disbursementType: disburseForm.disbursementType,
      quantity: disburseForm.quantity ?? 0,
      pricePaidBySubscriber: disburseForm.pricePaidBySubscriber ?? 0,
      notes: disburseForm.notes?.trim() || undefined,
    });
  };

  const handleDisburseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void submitDisbursement({ fromManualForm: true });
  };

  const handleDisburseInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setDisburseForm((prev) => ({
      ...prev,
      [name]: name === 'materialId' || name === 'subscriberId' || name === 'notes' ? value : Number(value) || 0,
    }));
  };

  const increaseMaterialQty = (materialId: string) => {
    setCartItems((prev) => {
      const existing = prev.find((i) => i.materialId === materialId);
      if (existing) {
        return prev.map((i) => (i.materialId === materialId ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [...prev, { materialId, quantity: 1, pricePaidBySubscriber: 0 }];
    });
  };

  const setCartItemQty = (materialId: string, qty: number) => {
    if (qty <= 0) {
      removeCartItem(materialId);
      return;
    }
    setCartItems((prev) => prev.map((i) => (i.materialId === materialId ? { ...i, quantity: qty } : i)));
  };

  const setCartItemPaid = (materialId: string, paid: number) => {
    setCartItems((prev) => prev.map((i) => (i.materialId === materialId ? { ...i, pricePaidBySubscriber: Math.max(0, paid) } : i)));
  };

  const removeCartItem = (materialId: string) => {
    setCartItems((prev) => prev.filter((i) => i.materialId !== materialId));
  };

  const cartDetailedItems = React.useMemo(
    () =>
      cartItems
        .map((item) => {
          const material = list.find((m) => m.id === item.materialId);
          if (!material) return null;
          return { item, material };
        })
        .filter(Boolean) as Array<{ item: PosCartItem; material: (typeof list)[number] }>,
    [cartItems, list]
  );

  const cartTotal = React.useMemo(
    () =>
      cartDetailedItems.reduce(
        (sum, line) =>
          sum +
          (line.item.quantity *
            (posSaleTargetType === 'dealer'
              ? (line.material.dealerPrice ?? 0)
              : (line.material.subscriberPrice ?? 0))),
        0
      ),
    [cartDetailedItems, posSaleTargetType]
  );

  const returnMutation = useMutation({
    mutationFn: (data: MaterialReturnRequest) =>
      apiService.postMaterialReturn(data, isAdmin ? (selectedAgentId || undefined) : undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      queryClient.invalidateQueries({ queryKey: ['material-disbursements'] });
      setShowReturnModal(false);
      setReturnInvoiceNumber('');
      setReturnFoundDisbursement(null);
      setReturnQuantity(0);
      setReturnNotes('');
      showSuccess('تم الاسترجاع', 'تم استرجاع المادة بنجاح');
    },
    onError: (err: unknown) => {
      showError('خطأ في الاسترجاع', ApiService.showError(err));
    },
  });

  const handleReturnVerify = async () => {
    const inv = returnInvoiceNumber.trim();
    if (!inv) {
      showError('خطأ', 'يرجى إدخال رقم الصرف');
      return;
    }
    if (isAdmin && !selectedAgentId) {
      showError('خطأ', 'يرجى اختيار الوكيل');
      return;
    }
    setReturnSearching(true);
    setReturnFoundDisbursement(null);
    const invNorm = inv.toUpperCase();
    const getInvoiceNum = (d: MaterialDisbursement) =>
      String((d as { invoiceNumber?: string; InvoiceNumber?: string }).invoiceNumber ?? (d as { InvoiceNumber?: string }).InvoiceNumber ?? '').trim().toUpperCase();

    try {
      let list: MaterialDisbursement[] = (await apiService.getMaterialDisbursements(
        isAdmin ? selectedAgentId || undefined : undefined,
        { searchTerm: inv, pageSize: 50 }
      )).data ?? [];

      if (list.length === 0) {
        const fallback = await apiService.getMaterialDisbursements(
          isAdmin ? selectedAgentId || undefined : undefined,
          { pageSize: 500 }
        );
        list = fallback.data ?? [];
      }

      const match = list.find((d) => getInvoiceNum(d) === invNorm);
      if (match) {
        const normalized = {
          ...match,
          invoiceNumber: match.invoiceNumber ?? (match as { InvoiceNumber?: string }).InvoiceNumber ?? inv,
        };
        setReturnFoundDisbursement(normalized);
        const maxReturn = (match.quantity ?? 0) - (match.returnedQuantity ?? 0);
        setReturnQuantity(maxReturn > 0 ? maxReturn : 0);
      } else {
        showError('غير موجود', 'لم يتم العثور على صرف بهذا رقم الصرف. تحقق من الرقم أو أن الصرف من نوع بيع.');
      }
    } catch {
      showError('خطأ', 'فشل التحقق من رقم الصرف');
    } finally {
      setReturnSearching(false);
    }
  };

  const handleReturnSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const inv = returnInvoiceNumber.trim();
    if (!inv) {
      showError('خطأ', 'رقم الصرف مطلوب');
      return;
    }
    const qty = returnQuantity || 0;
    if (qty <= 0) {
      showError('خطأ', 'الكمية يجب أن تكون أكبر من صفر');
      return;
    }
    if (returnFoundDisbursement) {
      const maxReturn = (returnFoundDisbursement.quantity ?? 0) - (returnFoundDisbursement.returnedQuantity ?? 0);
      if (maxReturn <= 0) {
        showError('خطأ', 'لا يوجد كمية قابلة للاسترجاع من هذا الصرف');
        return;
      }
      if (qty > maxReturn) {
        showError('خطأ', `الكمية يجب ألا تتجاوز ${maxReturn}`);
        return;
      }
    }
    returnMutation.mutate({
      invoiceNumber: inv,
      quantity: qty,
      notes: returnNotes.trim() || undefined,
    });
  };

  /** طباعة فاتورة بيع — قالب A4 حسب إعدادات قالب فاتورة المبيعات */
  const handlePrintMaterialInvoice = async (data: MaterialInvoicePrintData) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showError('الطباعة', 'يرجى السماح بالنوافذ المنبثقة (Pop-ups) ثم أعد المحاولة.');
      return;
    }
    printWindow.document.open();
    printWindow.document.write(
      `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"/><title>…</title></head><body style="margin:0;font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f8fafc;color:#334155"><p style="font-size:14px">جاري تجهيز الفاتورة…</p></body></html>`
    );
    printWindow.document.close();

    const printBase = {
      appOrigin: typeof window !== 'undefined' ? window.location.origin : '',
      apiBaseUrl: apiService.getBaseURL(),
    };

    const agentIdForTemplate = isAdmin ? selectedAgentId || undefined : myAgent?.id;

    let settings: SalesInvoicePrintSettingsDto = {};
    try {
      settings = await apiService.getSalesInvoicePrintSettings(agentIdForTemplate);
    } catch {
      settings = {};
    }
    settings = (await tryEmbedInvoiceLogoAsDataUrl(
      settings as ActivationInvoicePrintSettingsDto,
      printBase
    )) as SalesInvoicePrintSettingsDto;

    const dateBaghdad = formatBaghdadDateOnly(data.createdAt ? data.createdAt : new Date()) || '—';
    const typeLabel = invoiceTypeForSalesPrint(data.disbursementType);
    const subForAddr =
      (data.subscriberId ? subscribers.find((s) => s.id === data.subscriberId) : undefined) ||
      selectedPosSubscriber ||
      selectedManualSubscriber;
    const addrParts = [subForAddr?.zone, subForAddr?.fat].filter(Boolean);
    const customerAddress = addrParts.length > 0 ? addrParts.join(' — ') : undefined;

    const qty = data.quantity ?? 0;
    const unit = typeof data.unitSubscriberPrice === 'number' ? data.unitSubscriberPrice : 0;
    const lineTotal = qty > 0 && unit > 0 ? qty * unit : data.pricePaidBySubscriber ?? 0;
    const gross = lineTotal;
    const net = gross;
    const paid = data.pricePaidBySubscriber ?? 0;
    const debt = data.materialDebt ?? Math.max(0, net - paid);

    const printContent = buildSalesMaterialInvoicePrintHtml(
      settings,
      {
        invoiceNumber: data.invoiceNumber,
        customerName: data.subscriberName || '—',
        customerAddress,
        invoiceTypeLabel: typeLabel,
        dateStr: dateBaghdad,
        rows: [
          {
            serial: 1,
            productCode: '—',
            productName: data.materialName || '—',
            quantity: qty,
            unitLabel: 'مادة',
            unitPrice: unit || (qty > 0 ? lineTotal / qty : lineTotal),
            lineTotal,
          },
        ],
        grossTotal: gross,
        netTotal: net,
        amountPaid: paid,
        previousBalance: 0,
        materialDebt: debt,
        notesText: data.notes?.trim() || undefined,
      },
      {
        ...printBase,
        formatNumber,
      }
    );

    printWindow.document.open();
    printWindow.document.write(printContent);
    printWindow.document.close();

    const runPrint = () => {
      printWindow.focus?.();
      printWindow.print();
      const closeAfter = () => {
        printWindow.close();
      };
      if (typeof printWindow.onafterprint !== 'undefined') {
        printWindow.onafterprint = closeAfter;
      } else {
        setTimeout(closeAfter, 1500);
      }
    };

    void (async () => {
      await new Promise<void>((r) => {
        requestAnimationFrame(() => r());
      });
      await waitForDocumentImages(printWindow.document);
      setTimeout(runPrint, 200);
    })();
  };

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-md">
          خطأ في تحميل بيانات المواد المصروفة
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center h-screen">
        <WifiLoaderComponent
          background="transparent"
          desktopSize="150px"
          mobileSize="150px"
          text="تحميل سجل المواد المصروفة..."
          backColor="#E8F2FC"
          frontColor="#4645F6"
        />
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 lg:p-6">
      <div className="flex flex-col gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
            {isPosMode ? 'نقاط البيع' : 'سجل المبيعات'}
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
            {isPosMode ? 'بيع المواد بنمط الكاشير مع فاتورة مباشرة' : 'متابعة كل عمليات البيع والسحب والاسترجاع'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && (
            <div className="min-w-[180px]">
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">الوكيل</label>
              <select
                value={selectedAgentId}
                onChange={(e) => setSelectedAgentId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white text-sm"
              >
                <option value="">-- اختر الوكيل --</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.companyName || a.fullName || a.username}
                  </option>
                ))}
              </select>
            </div>
          )}
          {isPosMode && (
            <button
              type="button"
              onClick={() => setShowDisburseModal(true)}
              disabled={(isAdmin && !selectedAgentId) || list.length === 0}
              className="flex items-center gap-2 px-3 py-2.5 sm:px-4 sm:py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm sm:text-base transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] touch-manipulation"
            >
              <ShoppingCart className="h-4 w-4" />
              <span>نموذج بيع يدوي</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setShowReturnModal(true);
              setReturnInvoiceNumber('');
              setReturnFoundDisbursement(null);
              setReturnQuantity(0);
              setReturnNotes('');
            }}
            disabled={isAdmin && !selectedAgentId}
            className="flex items-center gap-2 px-3 py-2.5 sm:px-4 sm:py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm sm:text-base transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] touch-manipulation"
          >
            <RotateCcw className="h-4 w-4" />
            <span>استرجاع مادة</span>
          </button>
        </div>
      </div>

      {isPosMode && (
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-6">
        <div className="xl:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">المواد المتاحة</h2>
              <span className="text-xs text-gray-500 dark:text-gray-400">اضغط + لإضافة الكمية للفاتورة</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {list.map((m) => {
                const cartItem = cartItems.find((i) => i.materialId === m.id);
                const qtyInCart = cartItem?.quantity ?? 0;
                const qty = m.quantity ?? 0;
                return (
                  <div
                    key={m.id}
                    className={`rounded-2xl border p-3 text-center transition-all bg-white dark:bg-gray-800 ${
                      qtyInCart > 0
                        ? 'border-primary-400 shadow-md'
                        : 'border-gray-200 dark:border-gray-700 shadow-sm'
                    }`}
                  >
                    <div className="h-full flex flex-col justify-between gap-3">
                      <div className="space-y-2">
                        <div className="mx-auto w-20 h-20 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700 flex items-center justify-center p-1">
                          {m.imagePngUrl ? (
                            <img src={m.imagePngUrl} alt={m.name} className="w-full h-full object-contain" loading="lazy" />
                          ) : (
                            <Package className="h-6 w-6 text-gray-400" />
                          )}
                        </div>
                        <p className="font-semibold text-sm text-gray-900 dark:text-white line-clamp-2 min-h-[40px]">{m.name}</p>
                        <p className="text-xl font-bold text-gray-900 dark:text-white">
                          {formatNumber(
                            posSaleTargetType === 'dealer' ? (m.dealerPrice ?? 0) : (m.subscriberPrice ?? 0),
                            { suffix: ' د.ع' }
                          )}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">المتوفر: {formatNumber(qty)}</p>
                      </div>
                      <div className="flex items-center justify-center gap-3 pt-1">
                        <button
                          type="button"
                          onClick={() => setCartItemQty(m.id, qtyInCart - 1)}
                          className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-lg font-bold"
                          title="تقليل"
                        >
                          -
                        </button>
                        <span className="min-w-[28px] text-base font-semibold text-gray-900 dark:text-white">{qtyInCart}</span>
                        <button
                          type="button"
                          onClick={() => increaseMaterialQty(m.id)}
                          className="w-9 h-9 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-lg font-bold"
                          title="زيادة"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="xl:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sticky top-3">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3">الفاتورة</h2>
            {cartDetailedItems.length > 0 ? (
              <div className="space-y-3">
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {cartDetailedItems.map(({ item, material }) => (
                    <div key={material.id} className="rounded-lg bg-gray-50 dark:bg-gray-700/40 p-2.5 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{material.name}</p>
                        <button type="button" onClick={() => removeCartItem(material.id)} className="text-red-500 text-xs hover:underline">حذف</button>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        سعر الوحدة: {formatNumber(posSaleTargetType === 'dealer' ? (material.dealerPrice ?? 0) : (material.subscriberPrice ?? 0), { suffix: ' د.ع' })}
                      </p>
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => setCartItemQty(material.id, item.quantity - 1)} className="w-7 h-7 rounded bg-gray-100 dark:bg-gray-700">-</button>
                        <input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) => setCartItemQty(material.id, Number(e.target.value) || 1)}
                          className="w-16 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-center dark:bg-gray-700 dark:text-white"
                        />
                        <button type="button" onClick={() => setCartItemQty(material.id, item.quantity + 1)} className="w-7 h-7 rounded bg-primary-600 text-white">+</button>
                        <span className="text-xs text-gray-500 dark:text-gray-400 mr-auto">
                          الإجمالي: {formatNumber(item.quantity * (posSaleTargetType === 'dealer' ? (material.dealerPrice ?? 0) : (material.subscriberPrice ?? 0)), { suffix: ' د.ع' })}
                        </span>
                      </div>
                      <input
                        type="number"
                        min={0}
                        value={item.pricePaidBySubscriber || ''}
                        onChange={(e) => setCartItemPaid(material.id, Number(e.target.value) || 0)}
                        placeholder="المدفوع لهذا الصنف"
                        className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white text-sm"
                      />
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPosSaleTargetType('subscriber')}
                    className={`px-3 py-2 rounded-md border text-sm ${posSaleTargetType === 'subscriber' ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300' : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'}`}
                  >
                    بيع لمشترك
                  </button>
                  <button
                    type="button"
                    onClick={() => setPosSaleTargetType('dealer')}
                    className={`px-3 py-2 rounded-md border text-sm ${posSaleTargetType === 'dealer' ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300' : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'}`}
                  >
                    بيع لوكيل
                  </button>
                </div>
                {posSaleTargetType === 'subscriber' ? (
                <div ref={posSubscriberDropdownRef}>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">المشترك (اختياري)</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setShowPosSubscriberDropdown((v) => {
                          const next = !v;
                          if (next) setPosSubscriberSearch('');
                          return next;
                        });
                      }}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white text-right flex items-center justify-between text-sm"
                    >
                      <span className="truncate">
                        {subscribersLoading
                          ? 'جاري تحميل المشتركين...'
                          : selectedPosSubscriber
                            ? `${selectedPosSubscriber.fullName || `${(selectedPosSubscriber.firstName || '').trim()} ${(selectedPosSubscriber.lastName || '').trim()}`.trim() || selectedPosSubscriber.username} — ${selectedPosSubscriber.phoneNumber || ''}`
                            : 'بدون مشترك — اختر أو ابحث'}
                      </span>
                      <Search className="h-4 w-4 text-gray-400 flex-shrink-0 mr-2" />
                    </button>
                    {showPosSubscriberDropdown && (
                      <div className="absolute z-30 mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 shadow-lg max-h-64 flex flex-col">
                        <div className="p-2 border-b border-gray-200 dark:border-gray-600 sticky top-0 bg-white dark:bg-gray-700">
                          <div className="relative">
                            <Search className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                              type="text"
                              value={posSubscriberSearch}
                              onChange={(e) => setPosSubscriberSearch(e.target.value)}
                              placeholder="بحث بالاسم أو رقم الهاتف..."
                              className="w-full pl-3 pr-8 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-600 dark:text-white text-right"
                              autoFocus
                            />
                          </div>
                        </div>
                        <ul className="overflow-y-auto py-1 max-h-48">
                          <li>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedSubscriberIdForPos('');
                                setShowPosSubscriberDropdown(false);
                                setPosSubscriberSearch('');
                              }}
                              className={`w-full text-right px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-600 ${
                                !selectedSubscriberIdForPos ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300' : 'text-gray-700 dark:text-gray-300'
                              }`}
                            >
                              بدون مشترك
                            </button>
                          </li>
                          {filteredPosSubscribers.length === 0 ? (
                            <li className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">لا توجد نتائج</li>
                          ) : (
                            filteredPosSubscribers.map((s) => {
                              const label = s.fullName || `${(s.firstName || '').trim()} ${(s.lastName || '').trim()}`.trim() || s.username;
                              return (
                                <li key={s.id}>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedSubscriberIdForPos(s.id);
                                      setShowPosSubscriberDropdown(false);
                                      setPosSubscriberSearch('');
                                    }}
                                    className={`w-full text-right px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-600 ${
                                      selectedSubscriberIdForPos === s.id ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300' : 'text-gray-700 dark:text-gray-300'
                                    }`}
                                  >
                                    {label} — {s.phoneNumber || ''}
                                  </button>
                                </li>
                              );
                            })
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
                ) : (
                <div ref={posDealerDropdownRef}>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">الوكيل *</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setShowPosDealerDropdown((v) => {
                          const next = !v;
                          if (next) setPosDealerSearch('');
                          return next;
                        });
                      }}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white text-right flex items-center justify-between text-sm"
                    >
                      <span className="truncate">
                        {dealersLoading
                          ? 'جاري تحميل الوكلاء...'
                          : selectedPosDealer
                            ? `${selectedPosDealer.fullName || selectedPosDealer.userName} — ${selectedPosDealer.phone || ''}`
                            : 'اختر الوكيل'}
                      </span>
                      <Search className="h-4 w-4 text-gray-400 flex-shrink-0 mr-2" />
                    </button>
                    {showPosDealerDropdown && (
                      <div className="absolute z-30 mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 shadow-lg max-h-64 flex flex-col">
                        <div className="p-2 border-b border-gray-200 dark:border-gray-600 sticky top-0 bg-white dark:bg-gray-700">
                          <div className="relative">
                            <Search className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                              type="text"
                              value={posDealerSearch}
                              onChange={(e) => setPosDealerSearch(e.target.value)}
                              placeholder="بحث باسم التاجر أو الهاتف..."
                              className="w-full pl-3 pr-8 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-600 dark:text-white text-right"
                              autoFocus
                            />
                          </div>
                        </div>
                        <ul className="overflow-y-auto py-1 max-h-48">
                          {filteredPosDealers.length === 0 ? (
                            <li className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">لا توجد نتائج</li>
                          ) : (
                            filteredPosDealers.map((d) => (
                              <li key={d.id}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedDealerIdForPos(d.id);
                                    setShowPosDealerDropdown(false);
                                    setPosDealerSearch('');
                                  }}
                                  className={`w-full text-right px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-600 ${
                                    selectedDealerIdForPos === d.id ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300' : 'text-gray-700 dark:text-gray-300'
                                  }`}
                                >
                                  {(d.fullName || d.userName)} — {d.phone || ''}
                                </button>
                              </li>
                            ))
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                  <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400"></p>
                </div>
                )}
                <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-600 p-2 text-sm flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-300">إجمالي الفاتورة</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{formatNumber(cartTotal, { suffix: ' د.ع' })}</span>
                </div>
                <button
                  type="button"
                  onClick={() => void submitDisbursement()}
                  disabled={disburseMutation.isPending || (isAdmin && !selectedAgentId) || cartDetailedItems.length === 0}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg disabled:opacity-50"
                >
                  <ShoppingCart className="h-4 w-4" />
                  {disburseMutation.isPending ? 'جاري الحفظ...' : 'تأكيد البيع'}
                </button>
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">اختر مادة/مواد من الكاردات لإظهار الفاتورة.</p>
            )}
          </div>
        </div>
      </div>
      )}

      {isSalesHistoryMode && (
      <>
      <div className="mt-3 flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="بحث (المادة، المشترك، الملاحظات، الموظف الصارف)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) =>
              e.key === 'Enter' &&
              (e.preventDefault(), setAppliedSearchTerm(searchTerm.trim()), setCurrentPage(1))
            }
            className="w-full pr-10 pl-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white text-sm"
          />
        </div>
        <select
          value={disbursementTypeFilter}
          onChange={(e) => {
            setDisbursementTypeFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white text-sm"
        >
          <option value="">كل الأنواع</option>
          <option value={DisbursementType.Replacement}>سحب</option>
          <option value={DisbursementType.Sale}>بيع</option>
          <option value={DisbursementType.SpecialOfferPackage}>باقة عرض خاص</option>
        </select>
        <div className="flex items-center gap-1.5 min-w-[160px]">
          <UserCircle className="h-4 w-4 text-gray-400 shrink-0" aria-hidden />
          <select
            value={disbursedByUserIdFilter}
            onChange={(e) => {
              setDisbursedByUserIdFilter(e.target.value);
              setCurrentPage(1);
            }}
            disabled={isAdmin && !selectedAgentId}
            title="صاحب الصرف"
            className="min-w-[140px] max-w-[220px] px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white text-sm disabled:opacity-50"
          >
            <option value="">كل الموظفين</option>
            {disburserSelectOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
          <span>من تاريخ</span>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white text-sm"
          />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
          <span>إلى تاريخ</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white text-sm"
          />
        </label>
        <button
          type="button"
          onClick={() => {
            setAppliedSearchTerm(searchTerm.trim());
            setAppliedFromDate(fromDate.trim().split('T')[0]);
            setAppliedToDate(toDate.trim().split('T')[0]);
            setCurrentPage(1);
          }}
          className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md text-sm font-medium whitespace-nowrap"
        >
          بحث
        </button>
      </div>
      {!(appliedFromDate || appliedToDate) && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
          بدون تحديد تاريخ: القائمة تعرض كل الصرف، والإحصائيات لليوم الحالي فقط.
        </p>
      )}

      {statistics && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">ملخص المبيعات</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-3.5">
            <GlassSummaryCard title="مواد مباعة" variant="emerald">
              {formatNumber(statistics.soldQuantity ?? 0)}
            </GlassSummaryCard>
            <GlassSummaryCard title="مواد مسحوبة" variant="sky">
              {formatNumber(statistics.replacedQuantity ?? 0)}
            </GlassSummaryCard>
            <GlassSummaryCard title="مواد عرض خاص" variant="violet">
              {formatNumber(statistics.specialOfferPackageQuantity ?? 0)}
            </GlassSummaryCard>
            <GlassSummaryCard title="إجمالي دين المواد" variant="rose">
              {formatNumber(statistics.totalMaterialDebt ?? 0, { suffix: ' د.ع' })}
            </GlassSummaryCard>
            <GlassSummaryCard title="إجمالي البيع" variant="amber">
              {formatNumber(statistics.totalSaleAmount ?? 0, { suffix: ' د.ع' })}
            </GlassSummaryCard>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="wakeel-table-scroll">
          <table className="min-w-full text-right">
            <thead>
              <tr>
                <th className="px-3 py-2 sm:px-4 sm:py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">صاحب الصرف</th>
                <th className="px-3 py-2 sm:px-4 sm:py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">اسم المادة</th>
                <th className="px-3 py-2 sm:px-4 sm:py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">نوع الصرف</th>
                <th className="px-3 py-2 sm:px-4 sm:py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">العميل/الوكيل</th>
                <th className="px-3 py-2 sm:px-4 sm:py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">رقم الصرف</th>
                <th className="px-3 py-2 sm:px-4 sm:py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">الكمية</th>
                <th className="px-3 py-2 sm:px-4 sm:py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">المدفوع (د.ع)</th>
                <th className="px-3 py-2 sm:px-4 sm:py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">الدين (د.ع)</th>
                <th className="w-[9.5rem] min-w-[9rem] max-w-[11rem] shrink-0 px-2 py-2 sm:px-2.5 sm:py-3 text-[10px] sm:text-xs font-medium text-gray-500 dark:text-gray-400 leading-snug">التاريخ والوقت</th>
                <th className="min-w-[12rem] max-w-[min(22rem,32vw)] px-3 py-2 sm:px-4 sm:py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">ملاحظات</th>
                <th className="px-3 py-2 sm:px-4 sm:py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {(!disbursements || disbursements.length === 0) ? (
                <tr>
                  <td colSpan={11} className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">
                    <Package className="mx-auto h-12 w-12 text-gray-400 mb-2" />
                    <p>لا توجد سجلات صرف</p>
                    <p className="text-sm mt-1">اضغط «بيع مادة» لتسجيل صرف مادة لمشترك</p>
                  </td>
                </tr>
              ) : (
                disbursements.map((d) => (
                  <tr key={d.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-3 py-2 sm:px-4 sm:py-3 text-sm text-gray-700 dark:text-gray-300 max-w-[140px] truncate" title={d.disbursedByUserName ?? ''}>
                      {d.disbursedByUserName ?? '—'}
                    </td>
                    <td className="px-3 py-2 sm:px-4 sm:py-3 text-sm font-medium text-gray-900 dark:text-white">{d.materialName}</td>
                    <td className="px-3 py-2 sm:px-4 sm:py-3 text-sm">
                      <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                        d.disbursementType === DisbursementType.Sale
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                          : d.disbursementType === DisbursementType.SpecialOfferPackage
                            ? 'bg-violet-100 text-violet-800 dark:bg-violet-900/25 dark:text-violet-300'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300'
                      }`}>
                        {disbursementTypeLabel(d.disbursementType ?? DisbursementType.Replacement)}
                      </span>
                    </td>
                    <td className="px-3 py-2 sm:px-4 sm:py-3 text-sm text-gray-900 dark:text-white">
                      <span className="block">{d.dealerName || d.subscriberName || '—'}</span>
                      {(d.dealerPhone || d.subscriberPhone) && <span className="text-xs text-gray-500 dark:text-gray-400">{d.dealerPhone || d.subscriberPhone}</span>}
                    </td>
                    <td className="px-3 py-2 sm:px-4 sm:py-3 text-sm text-gray-900 dark:text-white font-mono">{d.invoiceNumber ?? '—'}</td>
                    <td className="px-3 py-2 sm:px-4 sm:py-3 text-sm text-gray-900 dark:text-white">{formatNumber(d.quantity ?? 0)}</td>
                    <td className="px-3 py-2 sm:px-4 sm:py-3 text-sm text-gray-900 dark:text-white">{formatNumber(d.pricePaidBySubscriber ?? 0)}</td>
                    <td className="px-3 py-2 sm:px-4 sm:py-3 text-sm text-gray-900 dark:text-white">{formatNumber(d.materialDebt ?? 0)}</td>
                    <td className="w-[9.5rem] min-w-[9rem] max-w-[11rem] shrink-0 px-2 py-2 sm:px-2.5 sm:py-3 align-top">
                      {d.createdAt ? (
                        <div className="flex flex-col gap-1 items-stretch" dir="ltr">
                          <span className="block text-[11px] sm:text-xs text-gray-600 dark:text-gray-300 tabular-nums leading-snug text-end">
                            {formatBaghdadDateOnly(d.createdAt)}
                          </span>
                          <span className="block text-[11px] sm:text-sm font-medium text-gray-800 dark:text-gray-100 tabular-nums leading-snug text-end">
                            {formatBaghdadTimeOnly(d.createdAt)}
                          </span>
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="min-w-[12rem] max-w-[min(22rem,32vw)] px-3 py-2 sm:px-4 sm:py-3 text-sm text-gray-900 dark:text-white whitespace-normal break-words leading-snug align-top">{d.notes ?? '—'}</td>
                    <td className="px-3 py-2 sm:px-4 sm:py-3 text-sm whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1 flex-wrap">
                        {((d.quantity ?? 0) - (d.returnedQuantity ?? 0)) > 0 && (d.invoiceNumber ?? '').trim() && (
                          <button
                            type="button"
                            onClick={() => {
                              setReturnFoundDisbursement(d);
                              setReturnInvoiceNumber(d.invoiceNumber ?? '');
                              setReturnQuantity((d.quantity ?? 0) - (d.returnedQuantity ?? 0));
                              setReturnNotes('');
                              setShowReturnModal(true);
                            }}
                            className="inline-flex items-center gap-1 px-2 py-1.5 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-md transition-colors"
                            title="استرجاع من هذا السجل (برقم الصرف)"
                          >
                            <RotateCcw className="h-4 w-4" />
                            <span className="hidden sm:inline">استرجاع</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() =>
                            void handlePrintMaterialInvoice({
                              materialName: d.materialName ?? '',
                              subscriberName: d.subscriberName ?? '',
                              subscriberPhone: d.subscriberPhone,
                              quantity: d.quantity ?? 0,
                              unitSubscriberPrice: d.unitSubscriberPrice,
                              pricePaidBySubscriber: d.pricePaidBySubscriber ?? 0,
                              materialDebt: d.materialDebt,
                              notes: d.notes ?? undefined,
                              createdAt: d.createdAt ?? new Date().toISOString(),
                              disbursementType: d.disbursementType ?? DisbursementType.Replacement,
                              invoiceNumber: d.invoiceNumber,
                              subscriberId: d.subscriberId,
                            })
                          }
                          className="inline-flex items-center gap-1 px-2 py-1.5 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-md transition-colors"
                          title="طباعة الصرف"
                        >
                          <Printer className="h-4 w-4" />
                          <span className="hidden sm:inline">طباعة</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {disbursementsResponse && (
        <Pagination
          currentPage={disbursementsResponse.currentPage}
          totalPages={disbursementsResponse.totalPages}
          totalItems={disbursementsResponse.totalItems}
          pageSize={disbursementsResponse.pageSize}
          hasNextPage={disbursementsResponse.hasNextPage}
          hasPreviousPage={disbursementsResponse.hasPreviousPage}
          onPageChange={(page) => setCurrentPage(page)}
        />
      )}
      </>
      )}

      {/* بيع مادة Modal */}
      {showDisburseModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">بيع مادة</h2>
              <button
                type="button"
                onClick={() => setShowDisburseModal(false)}
                className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
              >
                <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleDisburseSubmit} className="p-6 space-y-4">
              <div ref={materialDropdownRef}>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">المادة *</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setShowMaterialDropdown((v) => !v);
                      setShowSubscriberDropdown(false);
                      if (!showMaterialDropdown) setMaterialSearch('');
                    }}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white text-right flex items-center justify-between"
                  >
                    <span className="truncate">
                      {selectedMaterial ? `${selectedMaterial.name} — متوفر: ${formatNumber(selectedMaterial.quantity ?? 0)}` : '-- اختر المادة أو ابحث --'}
                    </span>
                    <Search className="h-4 w-4 text-gray-400 flex-shrink-0 mr-2" />
                  </button>
                  {showMaterialDropdown && (
                    <div className="absolute z-20 mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 shadow-lg max-h-64 flex flex-col">
                      <div className="p-2 border-b border-gray-200 dark:border-gray-600 sticky top-0 bg-white dark:bg-gray-700">
                        <div className="relative">
                          <Search className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <input
                            type="text"
                            value={materialSearch}
                            onChange={(e) => setMaterialSearch(e.target.value)}
                            placeholder="بحث عن مادة..."
                            className="w-full pl-3 pr-8 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-600 dark:text-white text-right"
                            autoFocus
                          />
                        </div>
                      </div>
                      <ul className="overflow-y-auto py-1 max-h-48">
                        {filteredMaterials.length === 0 ? (
                          <li className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">لا توجد نتائج</li>
                        ) : (
                          filteredMaterials.map((m) => (
                            <li key={m.id}>
                              <button
                                type="button"
                                onClick={() => {
                                  setDisburseForm((prev) => ({ ...prev, materialId: m.id }));
                                  setShowMaterialDropdown(false);
                                  setMaterialSearch('');
                                }}
                                className={`w-full text-right px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-600 ${
                                  disburseForm.materialId === m.id ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300' : 'text-gray-700 dark:text-gray-300'
                                }`}
                              >
                                {m.name} — متوفر: {formatNumber(m.quantity ?? 0)}
                              </button>
                            </li>
                          ))
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
              <div ref={subscriberDropdownRef}>
                {disburseForm.disbursementType === DisbursementType.Sale && (
                <>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">نوع البيع</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => setManualSaleTargetType('subscriber')}
                    className={`px-3 py-2 rounded-md border text-sm ${manualSaleTargetType === 'subscriber' ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300' : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'}`}
                  >
                    بيع لمشترك تاجر
                  </button>
                  <button
                    type="button"
                    onClick={() => setManualSaleTargetType('dealer')}
                    className={`px-3 py-2 rounded-md border text-sm ${manualSaleTargetType === 'dealer' ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300' : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'}`}
                  >
                    بيع لوكيل
                  </button>
                </div>
                </>
                )}
                {(disburseForm.disbursementType !== DisbursementType.Sale || manualSaleTargetType === 'subscriber') ? (
                <>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">المشترك (اختياري — للبيع/التبديل بدون مشترك)</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setShowSubscriberDropdown((v) => !v);
                      setShowMaterialDropdown(false);
                      if (!showSubscriberDropdown) setSubscriberSearch('');
                    }}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white text-right flex items-center justify-between"
                  >
                    <span className="truncate">
                      {selectedManualSubscriber
                        ? `${selectedManualSubscriber.fullName || `${(selectedManualSubscriber.firstName || '').trim()} ${(selectedManualSubscriber.lastName || '').trim()}`.trim() || selectedManualSubscriber.username} — ${selectedManualSubscriber.phoneNumber || ''}`
                        : '-- اختر المشترك أو بدون مشترك --'}
                    </span>
                    <Search className="h-4 w-4 text-gray-400 flex-shrink-0 mr-2" />
                  </button>
                  {showSubscriberDropdown && (
                    <div className="absolute z-20 mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 shadow-lg max-h-64 flex flex-col">
                      <div className="p-2 border-b border-gray-200 dark:border-gray-600 sticky top-0 bg-white dark:bg-gray-700">
                        <div className="relative">
                          <Search className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <input
                            type="text"
                            value={subscriberSearch}
                            onChange={(e) => setSubscriberSearch(e.target.value)}
                            placeholder="بحث بالاسم أو رقم الهاتف..."
                            className="w-full pl-3 pr-8 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-600 dark:text-white text-right"
                            autoFocus
                          />
                        </div>
                      </div>
                      <ul className="overflow-y-auto py-1 max-h-48">
                        <li>
                          <button
                            type="button"
                            onClick={() => {
                              setDisburseForm((prev) => ({ ...prev, subscriberId: '' }));
                              setShowSubscriberDropdown(false);
                              setSubscriberSearch('');
                            }}
                            className={`w-full text-right px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-600 ${
                              !disburseForm.subscriberId ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300' : 'text-gray-700 dark:text-gray-300'
                            }`}
                          >
                            بدون مشترك
                          </button>
                        </li>
                        {filteredSubscribers.length === 0 ? (
                          <li className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">لا توجد نتائج</li>
                        ) : (
                          filteredSubscribers.map((s) => {
                            const label = s.fullName || `${(s.firstName || '').trim()} ${(s.lastName || '').trim()}`.trim() || s.username;
                            return (
                              <li key={s.id}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setDisburseForm((prev) => ({ ...prev, subscriberId: s.id }));
                                    setShowSubscriberDropdown(false);
                                    setSubscriberSearch('');
                                  }}
                                  className={`w-full text-right px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-600 ${
                                    disburseForm.subscriberId === s.id ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300' : 'text-gray-700 dark:text-gray-300'
                                  }`}
                                >
                                  {label} — {s.phoneNumber || ''}
                                </button>
                              </li>
                            );
                          })
                        )}
                      </ul>
                    </div>
                  )}
                </div>
                </>
                ) : (
                <div ref={manualDealerDropdownRef}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">التاجر *</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setShowManualDealerDropdown((v) => {
                          const next = !v;
                          if (next) setManualDealerSearch('');
                          return next;
                        });
                        setShowMaterialDropdown(false);
                        setShowSubscriberDropdown(false);
                      }}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white text-right flex items-center justify-between"
                    >
                      <span className="truncate">
                        {dealersLoading
                          ? 'جاري تحميل التجار...'
                          : selectedManualDealer
                            ? `${selectedManualDealer.fullName || selectedManualDealer.userName} — ${selectedManualDealer.phone || ''}`
                            : '-- اختر التاجر --'}
                      </span>
                      <Search className="h-4 w-4 text-gray-400 flex-shrink-0 mr-2" />
                    </button>
                    {showManualDealerDropdown && (
                      <div className="absolute z-20 mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 shadow-lg max-h-64 flex flex-col">
                        <div className="p-2 border-b border-gray-200 dark:border-gray-600 sticky top-0 bg-white dark:bg-gray-700">
                          <div className="relative">
                            <Search className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                              type="text"
                              value={manualDealerSearch}
                              onChange={(e) => setManualDealerSearch(e.target.value)}
                              placeholder="بحث باسم التاجر أو الهاتف..."
                              className="w-full pl-3 pr-8 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-600 dark:text-white text-right"
                              autoFocus
                            />
                          </div>
                        </div>
                        <ul className="overflow-y-auto py-1 max-h-48">
                          {filteredManualDealers.length === 0 ? (
                            <li className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">لا توجد نتائج</li>
                          ) : (
                            filteredManualDealers.map((d) => (
                              <li key={d.id}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedDealerIdForManual(d.id);
                                    setShowManualDealerDropdown(false);
                                    setManualDealerSearch('');
                                  }}
                                  className={`w-full text-right px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-600 ${
                                    selectedDealerIdForManual === d.id ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300' : 'text-gray-700 dark:text-gray-300'
                                  }`}
                                >
                                  {(d.fullName || d.userName)} — {d.phone || ''}
                                </button>
                              </li>
                            ))
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">الاحتساب سيكون تلقائياً على DealerPrice في الباكند.</p>
                </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">نوع الصرف</label>
                <select
                  name="disbursementType"
                  value={disburseForm.disbursementType}
                  onChange={handleDisburseInputChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value={DisbursementType.Replacement}>سحب</option>
                  <option value={DisbursementType.Sale}>بيع</option>
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">الكمية *</label>
                  <input
                    type="number"
                    name="quantity"
                    value={disburseForm.quantity || ''}
                    onChange={handleDisburseInputChange}
                    required
                    min={1}
                    max={2147483647}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">المبلغ المدفوع من المشترك (د.ع)</label>
                  <input
                    type="number"
                    name="pricePaidBySubscriber"
                    value={disburseForm.pricePaidBySubscriber || ''}
                    onChange={handleDisburseInputChange}
                    min={0}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                    placeholder="0"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">ملاحظات</label>
                <textarea
                  name="notes"
                  value={disburseForm.notes ?? ''}
                  onChange={handleDisburseInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                  placeholder="ملاحظات اختيارية..."
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setShowDisburseModal(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={disburseMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {disburseMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                      <span>جاري الحفظ...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      <span>تسجيل البيع/الصرف</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* مودال استرجاع مادة */}
      {showReturnModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">استرجاع مادة</h2>
              <button
                type="button"
                onClick={() => {
                  setShowReturnModal(false);
                  setReturnFoundDisbursement(null);
                  setReturnInvoiceNumber('');
                }}
                className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
              >
                <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleReturnSubmit} className="p-6 space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                أدخل رقم الصرف للتحقق من أن الصرف تم (بيع أو سحب) ثم حدد الكمية والملاحظات وتأكيد الاسترجاع.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="رقم الصرف (مثال: 482917AB)"
                  value={returnInvoiceNumber}
                  onChange={(e) => setReturnInvoiceNumber(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white font-mono"
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={handleReturnVerify}
                  disabled={returnSearching || !returnInvoiceNumber.trim()}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {returnSearching ? 'جاري التحقق...' : 'تحقق'}
                </button>
              </div>

              {returnFoundDisbursement && (
                <>
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-2 text-sm">
                    <p className="font-medium text-gray-900 dark:text-white">بيانات الصرف:</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-gray-700 dark:text-gray-300">
                      <span>المادة:</span>
                      <span>{returnFoundDisbursement.materialName}</span>
                      <span>المشترك:</span>
                      <span>{returnFoundDisbursement.subscriberName}</span>
                      <span>نوع الصرف:</span>
                      <span>{disbursementTypeLabel(returnFoundDisbursement.disbursementType ?? DisbursementType.Replacement)}</span>
                      <span>الكمية المصروفة:</span>
                      <span>{formatNumber(returnFoundDisbursement.quantity ?? 0)}</span>
                      <span>الكمية المسترجعة سابقاً:</span>
                      <span>{formatNumber(returnFoundDisbursement.returnedQuantity ?? 0)}</span>
                      <span>القابل للاسترجاع:</span>
                      <span className="font-medium">
                        {formatNumber((returnFoundDisbursement.quantity ?? 0) - (returnFoundDisbursement.returnedQuantity ?? 0))}
                      </span>
                    </div>
                  </div>
                  <div>
                    {(() => {
                      const maxReturn = Math.max(0, (returnFoundDisbursement.quantity ?? 0) - (returnFoundDisbursement.returnedQuantity ?? 0));
                      return (
                        <>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">الكمية المراد استرجاعها *</label>
                          {maxReturn === 0 ? (
                            <p className="text-sm text-amber-600 dark:text-amber-400 py-2">لا توجد كمية قابلة للاسترجاع من هذا الصرف (تم استرجاع الكامل مسبقاً).</p>
                          ) : (
                            <input
                              type="number"
                              min={0}
                              max={maxReturn}
                              value={returnQuantity || ''}
                              onChange={(e) => setReturnQuantity(Number(e.target.value) || 0)}
                              required
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                            />
                          )}
                        </>
                      );
                    })()}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">ملاحظات (اختياري)</label>
                    <textarea
                      value={returnNotes}
                      onChange={(e) => setReturnNotes(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                      placeholder="ملاحظات الاسترجاع..."
                    />
                  </div>
                </>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => {
                    setShowReturnModal(false);
                    setReturnFoundDisbursement(null);
                  }}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={
                    !returnFoundDisbursement ||
                    returnMutation.isPending ||
                    (returnFoundDisbursement && Math.max(0, (returnFoundDisbursement.quantity ?? 0) - (returnFoundDisbursement.returnedQuantity ?? 0)) === 0)
                  }
                  className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {returnMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                      <span>جاري الاسترجاع...</span>
                    </>
                  ) : (
                    <>
                      <RotateCcw className="h-4 w-4" />
                      <span>تأكيد الاسترجاع</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* مودال تم البيع بنجاح + طباعة الفاتورة */}
      {showSuccessPrintModal && lastDisbursementForPrint && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">تم البيع بنجاح</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">هل تريد طباعة فاتورة بيع المادة؟</p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowSuccessPrintModal(false);
                  setLastDisbursementForPrint(null);
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
              >
                إغلاق
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (lastDisbursementForPrint) {
                    await handlePrintMaterialInvoice(lastDisbursementForPrint);
                  }
                  setShowSuccessPrintModal(false);
                  setLastDisbursementForPrint(null);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md transition-colors"
              >
                <Printer className="h-4 w-4" />
                طباعة الفاتورة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaterialsDisbursementPage;
