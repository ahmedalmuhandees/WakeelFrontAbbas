import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService, ApiService } from '../services/api';
import { Debt, DebtCreateRequest, DebtUpdateRequest, DebtPaymentRequest, UserRole, PaginatedResponse, DebtsListResponse, Subscriber, DebtStatus, DebtsListParams, ServiceType, EARTHLINK_USER_MANAGEMENT_URL, DebtOffOn, AgentReseller, formatServiceTypeLabelAr } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useMyAgent } from '../hooks/useMyAgent';
import { useOffline } from '../contexts/OfflineContext';
import { useDigits } from '../contexts/DigitsContext';
import { fetchDebtsWithCache, fetchSubscribersWithCache, queueOperation, buildPayDebtPayload } from '../services/offlineSync';
import Pagination from '../components/Pagination';
import WifiLoaderComponent from '../components/WifiLoaderComponent';
import { showError, showSuccess, showInfo } from '../utils/notifications';
import { createXlsxBlob } from '../utils/excelExport';
import { 
  Search, 
  CreditCard,
  DollarSign,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  X,
  Save,
  Eye,
  MoreHorizontal,
  CheckSquare,
  Square,
  FileSpreadsheet,
  Filter,
  Check,
  Power
} from 'lucide-react';

/** استخراج جزء التاريخ YYYY-MM-DD من dueDate دون تحويل التوقيت (لتجنب تغيّر اليوم حسب timezone) */
function getDueDatePart(isoOrDate?: string | null): string | null {
  if (!isoOrDate || typeof isoOrDate !== 'string') return null;
  const part = isoOrDate.split('T')[0];
  return /^\d{4}-\d{2}-\d{2}$/.test(part) ? part : null;
}


/** YYYY-MM-DD → بداية اليوم UTC (paymentCreatedAtFrom) */
function ymdToPaymentCreatedAtFromUtc(ymd: string): string | undefined {
  const t = ymd.trim();
  if (!t || !/^\d{4}-\d{2}-\d{2}$/.test(t)) return undefined;
  return `${t}T00:00:00.000Z`;
}

/** YYYY-MM-DD → نهاية اليوم UTC (paymentCreatedAtTo) */
function ymdToPaymentCreatedAtToUtc(ymd: string): string | undefined {
  const t = ymd.trim();
  if (!t || !/^\d{4}-\d{2}-\d{2}$/.test(t)) return undefined;
  return `${t}T23:59:59.999Z`;
}

/** تطبيع رابط Earthlink للعرض */
function normalizeEarthlinkActivationUrl(url: string | undefined): string | undefined {
  if (!url || typeof url !== 'string') return url;
  const u = url.trim();
  if (/admin\.earthlink\.iq/i.test(u) && (u.includes('#') || u.includes('/user/activate'))) return EARTHLINK_USER_MANAGEMENT_URL;
  return u;
}

const DebtsPage: React.FC = () => {
  const { user } = useAuth();
  const { online, refreshPendingCount } = useOffline();
  const { formatNumber, formatDate } = useDigits();
  /** المدير الثانوي يملك نفس صلاحيات الوكيل في إدارة الديون */
  const canManageDebts = user?.role === UserRole.Admin || user?.role === UserRole.Agent || user?.role === UserRole.SubAgent;
  const canEmployeeEditDebtNotesOnly = user?.role === UserRole.Employee && !!user?.canPayDebt;
  const canEditDebt = canManageDebts || canEmployeeEditDebtNotesOnly;
  const isAgentOrSubAgentOrEmployee =
    user?.role === UserRole.Agent || user?.role === UserRole.SubAgent || user?.role === UserRole.Employee;

  const formatDueDateForDisplay = (debt: { dueDate?: string | null }) => {
    const part = getDueDatePart(debt?.dueDate);
    return part ? formatDate(new Date(part + 'T12:00:00')) : '—';
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [appliedSearchTerm, setAppliedSearchTerm] = useState('');
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false);
  const [statusFilter, setStatusFilter] = useState<DebtStatus | ''>('');
  const [sortDescending, setSortDescending] = useState(true);
  const [paymentReceivedFrom, setPaymentReceivedFrom] = useState('');
  const [paymentReceivedTo, setPaymentReceivedTo] = useState('');
  const [debtDescription, setDebtDescription] = useState('');
  const [appliedFilters, setAppliedFilters] = useState<{
    status?: DebtStatus;
    sortDescending?: boolean;
    /** YYYY-MM-DD — يُحوَّل إلى ISO عند الطلب */
    paymentReceivedFrom?: string;
    paymentReceivedTo?: string;
    debtDescription?: string;
  }>({});
  const [showAddDebtModal, setShowAddDebtModal] = useState(false);
  const [showPayDebtModal, setShowPayDebtModal] = useState(false);
  const [showEditDebtModal, setShowEditDebtModal] = useState(false);
  const [showViewDebtModal, setShowViewDebtModal] = useState(false);
  const [showSubscriberDebtsModal, setShowSubscriberDebtsModal] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);
  const [selectedSubscriberDebts, setSelectedSubscriberDebts] = useState<Debt[]>([]);
  const [selectedSubscriberTotalDebt, setSelectedSubscriberTotalDebt] = useState<number | null>(null);
  const [selectedSubscriberForDebtsModalId, setSelectedSubscriberForDebtsModalId] = useState<string | null>(null);
  const [selectedSubscriberNameForAddDebt, setSelectedSubscriberNameForAddDebt] = useState<string>('');
  const [addDebtSubscriberSearch, setAddDebtSubscriberSearch] = useState('');
  const [addDebtSubscriberPage, setAddDebtSubscriberPage] = useState(1);
  const [showAddDebtSubscriberResults, setShowAddDebtSubscriberResults] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [openedFromSubscriberDebts, setOpenedFromSubscriberDebts] = useState(false);
  const [activationLinkLoadingForId, setActivationLinkLoadingForId] = useState<string | null>(null);
  const [pendingOffOnSubscriberId, setPendingOffOnSubscriberId] = useState<string | null>(null);
  const [pendingOffOnSubscriberName, setPendingOffOnSubscriberName] = useState<string>('');
  const [showOffOnModal, setShowOffOnModal] = useState(false);
  const [offOnModalSubscriberId, setOffOnModalSubscriberId] = useState<string | null>(null);
  const [offOnModalSubscriberName, setOffOnModalSubscriberName] = useState<string>('');
  const [offOnModalSubmitting, setOffOnModalSubmitting] = useState(false);
  const [postDebtPaymentWhatsApp, setPostDebtPaymentWhatsApp] = useState<{ subscriberId: string; subscriberName?: string | null } | null>(null);
  const [sendingDebtDetailsWhatsApp, setSendingDebtDetailsWhatsApp] = useState(false);
  const [sendingDebtAlertBulk, setSendingDebtAlertBulk] = useState(false);
  const [selectedOperationalResellerId, setSelectedOperationalResellerId] = useState('');

  const { data: myResellers = [] } = useQuery<AgentReseller[]>({
    queryKey: ['myResellers'],
    queryFn: () => apiService.getMyResellers(),
    enabled: !!isAgentOrSubAgentOrEmployee,
  });

  useEffect(() => {
    if (!isAgentOrSubAgentOrEmployee) return;
    const saved = localStorage.getItem('selectedOperationalResellerId') || '';
    setSelectedOperationalResellerId(saved);
  }, [isAgentOrSubAgentOrEmployee]);

  useEffect(() => {
    if (!isAgentOrSubAgentOrEmployee) return;
    const exists = !selectedOperationalResellerId || myResellers.some((r) => r.id === selectedOperationalResellerId);
    if (exists) return;
    setSelectedOperationalResellerId('');
    localStorage.removeItem('selectedOperationalResellerId');
  }, [isAgentOrSubAgentOrEmployee, myResellers, selectedOperationalResellerId]);

  const handleDebtsResellerCardClick = (resellerId: string) => {
    const next = selectedOperationalResellerId === resellerId ? '' : resellerId;
    setSelectedOperationalResellerId(next);
    if (next) localStorage.setItem('selectedOperationalResellerId', next);
    else localStorage.removeItem('selectedOperationalResellerId');
    setCurrentPage(1);
    setSelectedIds([]);
  };

  useMyAgent(canManageDebts && (user?.role === UserRole.Agent || user?.role === UserRole.SubAgent));

  const [showActionsDropdown, setShowActionsDropdown] = useState(false);
  const [, setSelectedSubscriberId] = useState<string>('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [showOverdueOnly, setShowOverdueOnly] = useState(false);
  const [newDebtData, setNewDebtData] = useState<DebtCreateRequest>({
    subscriberId: '',
    amount: 0,
    description: '',
    dueDate: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const [editDebtData, setEditDebtData] = useState<DebtUpdateRequest>({
    amount: 0,
    description: '',
    dueDate: new Date().toISOString().split('T')[0],
    notes: ''
  });
  const [paymentData, setPaymentData] = useState<DebtPaymentRequest>({
    paymentAmount: 0,
    notes: ''
  });

  const queryClient = useQueryClient();
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowActionsDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Selection handlers
  const toggleSelectAll = () => {
    if (!filteredDebts) return;
    if (selectedIds.length === filteredDebts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredDebts.map((d: any) => d.subscriberId));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleSendDebtAlertMessage = async () => {
    if (selectedIds.length === 0) {
      showInfo('تنبيه تسديد الدين', 'اختر مشتركًا واحدًا على الأقل.');
      return;
    }
    try {
      setSendingDebtAlertBulk(true);
      const settled = await Promise.allSettled(selectedIds.map((id) => apiService.sendWhatsAppDebtAlert(id)));
      const successCount = settled.filter((r) => r.status === 'fulfilled').length;
      const failCount = settled.length - successCount;
      if (failCount === 0) {
        showSuccess('تنبيه تسديد الدين', `تم إرسال الرسالة إلى ${successCount} مشترك.`);
      } else {
        showError('تنبيه تسديد الدين', `تم إرسال ${successCount} وفشل ${failCount}.`);
      }
    } catch (err: any) {
      showError('تنبيه تسديد الدين', ApiService.showError(err));
    } finally {
      setSendingDebtAlertBulk(false);
      setShowActionsDropdown(false);
    }
  };

  const handleViewSubscriberDebts = async (subscriberId: string) => {
    // فتح المودال فوراً مع حالة تحميل
    setShowSubscriberDebtsModal(true);
    setSelectedSubscriberDebts([]);
    setSelectedSubscriberTotalDebt(null);
    setSelectedSubscriberForDebtsModalId(subscriberId);
    
    try {
      const [debtsRes, total] = await Promise.all([
        apiService.getSubscriberDebts(subscriberId, { page: 1, pageSize: 100 } as any),
        apiService.getSubscriberDebtTotal(subscriberId),
      ]);
      const raw = (debtsRes?.data ?? []) as any[];
      setSelectedSubscriberDebts(raw.map((d: any) => ({ ...d, dueDate: d.dueDate ?? '' })));
      setSelectedSubscriberTotalDebt(total);
    } catch (error: any) {
      console.error('Error fetching subscriber debts:', error);
      const errorMessage = ApiService.showError(error);
      console.warn('Failed to fetch subscriber debts:', errorMessage);
      setSelectedSubscriberDebts([]);
      setSelectedSubscriberTotalDebt(null);
    } finally {
    }
  };

  // Get debts based on user role (مع فلترة متقدمة من الباكند)
  const { data: debtsResponse, error, isLoading, isFetching } = useQuery<DebtsListResponse>({
    queryKey: [
      'debts',
      'offline',
      online,
      user?.id,
      user?.role,
      currentPage,
      pageSize,
      showOverdueOnly,
      appliedSearchTerm,
      appliedFilters,
      selectedOperationalResellerId,
    ],
    queryFn: async () => {
      if (!user) return { data: [], currentPage: 1, pageSize: 10, totalItems: 0, totalPages: 0, hasNextPage: false, hasPreviousPage: false, totalCount: 0, pageNumber: 1 };
      const params: DebtsListParams = {
        page: currentPage,
        pageSize: pageSize,
        searchTerm: appliedSearchTerm.trim() || undefined,
        sortDescending: appliedFilters.sortDescending ?? true,
        status: appliedFilters.status !== undefined && appliedFilters.status !== null ? appliedFilters.status : undefined,
        paymentCreatedAtFrom: ymdToPaymentCreatedAtFromUtc(appliedFilters.paymentReceivedFrom ?? '') || undefined,
        paymentCreatedAtTo: ymdToPaymentCreatedAtToUtc(appliedFilters.paymentReceivedTo ?? '') || undefined,
        debtDescription: appliedFilters.debtDescription?.trim() || undefined,
        resellerId: selectedOperationalResellerId || undefined,
      };
      return fetchDebtsWithCache(online, params, showOverdueOnly);
    },
    enabled: !!user,
  });

  const debts = debtsResponse?.data || [];
  const subscriberTotalDebt = debts.reduce((total: number, debt: Debt) => total + debt.amount, 0);

  // مزامنة رقم الصفحة مع الباكند فقط عند وجود response فعلي (بدون fallback إلى 1)
  // لمنع مشكلة الرجوع إلى الصفحة الأولى أثناء جلب الصفحة الجديدة.
  const prevPageRef = useRef<number>(currentPage);
  useEffect(() => {
    if (!debtsResponse || typeof debtsResponse.currentPage !== 'number' || debtsResponse.currentPage < 1) return;
    const currentPageFromApi = debtsResponse.currentPage;
    if (prevPageRef.current !== currentPageFromApi) {
      prevPageRef.current = currentPageFromApi;
      if (currentPage !== currentPageFromApi) {
        setCurrentPage(currentPageFromApi);
      }
      setSelectedIds([]);
    }
  }, [debtsResponse, currentPage]);

  const { data: addDebtSubscribersResponse, isLoading: addDebtSubscribersLoading } = useQuery<PaginatedResponse<Subscriber>>({
    queryKey: [
      'add-debt-subscribers',
      'offline',
      online,
      addDebtSubscriberSearch,
      addDebtSubscriberPage,
      showAddDebtModal,
      selectedOperationalResellerId,
    ],
    queryFn: () =>
      fetchSubscribersWithCache(online, {
        page: addDebtSubscriberPage,
        pageSize: 10,
        search: addDebtSubscriberSearch,
        resellerId: selectedOperationalResellerId || undefined,
      }),
    enabled: showAddDebtModal,
    staleTime: 10_000,
  });

  // الباكند يرسل dueDate فقط (تاريخ التسديد). العرض والترتيب يعتمدان عليه.
  const transformedDebts = debts.map((debt: Debt) => ({
    ...debt,
    dueDate: debt.dueDate ?? '',
    isPaid: debt.isPaid ?? false,
    agentName: debt.agentName || debt.agentCompanyName || 'غير محدد',
    status: debt.status ?? 0
  }));

  // Group debts by subscriber
  const groupedDebts = transformedDebts.reduce((acc: any, debt: Debt) => {
    const key = debt.subscriberId;
    if (!acc[key]) {
      acc[key] = {
        subscriberId: debt.subscriberId,
        subscriberName: debt.subscriberName,
        subscriberPhone: debt.subscriberPhone,
        agentName: debt.agentName,
        agentCompanyName: debt.agentCompanyName,
        totalDebt: 0,
        unpaidDebt: 0,
        paidDebt: 0,
        partialDebt: 0,
        debts: []
      };
    }
    acc[key].debts.push(debt);
    acc[key].totalDebt += debt.amount;
    
    // حساب الديون حسب الحالة
    if (debt.status === 0) { // Unpaid
      acc[key].unpaidDebt += debt.amount;
    } else if (debt.status === 1) { // Paid
      acc[key].paidDebt += debt.amount;
    } else if (debt.status === 2) { // Partial
      acc[key].partialDebt += debt.amount;
    }
    return acc;
  }, {} as Record<string, {
    subscriberId: string;
    subscriberName: string;
    subscriberPhone?: string;
    agentName: string;
    agentCompanyName?: string;
    totalDebt: number;
    unpaidDebt: number;
    paidDebt: number;
    partialDebt: number;
    debts: typeof transformedDebts;
  }>);

  // Convert grouped debts to array for display
  const subscriberDebts = Object.values(groupedDebts);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Get unique subscribers from debts data (reserved for future use)
  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  const _uniqueSubscribers = transformedDebts.reduce((acc: any[], debt: Debt) => {
    if (!acc.find((sub: any) => sub.id === debt.subscriberId)) {
      acc.push({
        id: debt.subscriberId,
        name: debt.subscriberName
      });
    }
    return acc;
  }, [] as { id: string; name: string }[]);

  const filteredDebts = subscriberDebts || [];

  const handleApplyAdvancedFilter = () => {
    setAppliedSearchTerm(searchTerm.trim());
    setAppliedFilters({
      status: statusFilter === '' ? undefined : statusFilter,
      sortDescending,
      paymentReceivedFrom: paymentReceivedFrom.trim() || undefined,
      paymentReceivedTo: paymentReceivedTo.trim() || undefined,
      debtDescription: debtDescription.trim() || undefined,
    });
    setCurrentPage(1);
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setAppliedSearchTerm('');
    setStatusFilter('');
    setSortDescending(true);
    setPaymentReceivedFrom('');
    setPaymentReceivedTo('');
    setDebtDescription('');
    setAppliedFilters({});
    setShowOverdueOnly(false);
    setCurrentPage(1);
  };

  const hasActiveAdvancedFilter =
    appliedSearchTerm !== '' || Object.keys(appliedFilters).length > 0 || showOverdueOnly;

  /** فتح رابط إطفاء/تشغيل المشترك (نفس رابط تفعيل عبر تاب SAS/FTTH). عند العودة للنظام يُظهَر مودال لتحديث الحالة. */
  const handleOpenActivationTab = async (subscriberId: string, subscriberName?: string) => {
    setActivationLinkLoadingForId(subscriberId);
    try {
      const data = await apiService.getSasLink(subscriberId);
      const st = data?.serviceType;

      if (st === ServiceType.Sas && data?.url) {
        window.open(normalizeEarthlinkActivationUrl(data.url) || data.url, '_blank');
        showInfo('تم فتح نافذة SAS', 'بعد إتمام الإجراء، عد إلى هذه الصفحة لتحديث حالة الإطفاء/التشغيل.');
        setPendingOffOnSubscriberId(subscriberId);
        setPendingOffOnSubscriberName(subscriberName ?? '');
        return;
      }
      if (st === ServiceType.Ftth || st === ServiceType.Zainfi || st === ServiceType.Fiberx) {
        const url = data?.activationUrl;
        if (url) {
          window.open(url, '_blank');
          showInfo(
            formatServiceTypeLabelAr(st),
            'بعد إتمام الإجراء، عد إلى هذه الصفحة لتحديث حالة الإطفاء/التشغيل.'
          );
          setPendingOffOnSubscriberId(subscriberId);
          setPendingOffOnSubscriberName(subscriberName ?? '');
        } else {
          showError(
            formatServiceTypeLabelAr(st),
            'معرف الاشتراك (FtthSubscriptionId) غير معرّف لهذا المشترك.'
          );
        }
        return;
      }
      if (st === ServiceType.Earthlink) {
        window.open(EARTHLINK_USER_MANAGEMENT_URL, '_blank');
        showInfo('Earthlink', 'تم فتح صفحة إدارة المستخدمين. أتمم الإجراء هناك.');
        return;
      }
      if (data?.url) {
        window.open(normalizeEarthlinkActivationUrl(data.url) || data.url, '_blank');
        showInfo('تم فتح الرابط', 'بعد إتمام الإجراء، عد إلى هذه الصفحة لتحديث حالة الإطفاء/التشغيل.');
        setPendingOffOnSubscriberId(subscriberId);
        setPendingOffOnSubscriberName(subscriberName ?? '');
      } else {
        showError('رابط غير متوفر', 'لم يُرجَع رابط التفعيل لهذا المشترك.');
      }
    } catch (err: any) {
      showError('خطأ', ApiService.showError(err));
    } finally {
      setActivationLinkLoadingForId(null);
    }
  };

  useEffect(() => {
    if (showAdvancedFilter) {
      setPaymentReceivedFrom(appliedFilters.paymentReceivedFrom?.split('T')[0] ?? '');
      setPaymentReceivedTo(appliedFilters.paymentReceivedTo?.split('T')[0] ?? '');
      setSortDescending(appliedFilters.sortDescending ?? true);
      setStatusFilter(appliedFilters.status ?? '');
      setDebtDescription(appliedFilters.debtDescription ?? '');
    }
    // Sync only when panel opens; appliedFilters are intentionally omitted to avoid overwriting form on every filter change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAdvancedFilter]);

  /** عند العودة للتبويب بعد فتح رابط الإطفاء/التشغيل، إظهار مودال تحديث الحالة */
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible' && pendingOffOnSubscriberId) {
        setOffOnModalSubscriberId(pendingOffOnSubscriberId);
        setOffOnModalSubscriberName(pendingOffOnSubscriberName);
        setShowOffOnModal(true);
        setPendingOffOnSubscriberId(null);
        setPendingOffOnSubscriberName('');
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [pendingOffOnSubscriberId, pendingOffOnSubscriberName]);

  const handleOffOnModalSubmit = async (offOn: 0 | 1) => {
    if (!offOnModalSubscriberId) return;
    setOffOnModalSubmitting(true);
    try {
      const res = await apiService.putSubscriberOffOn(offOnModalSubscriberId, offOn);
      queryClient.invalidateQueries({ queryKey: ['debts'] });
      if (selectedSubscriberForDebtsModalId === offOnModalSubscriberId) {
        const [debtsRes] = await Promise.all([
          apiService.getSubscriberDebts(offOnModalSubscriberId, { page: 1, pageSize: 100 } as any),
        ]);
        const raw = (debtsRes?.data ?? []) as any[];
        setSelectedSubscriberDebts(raw.map((d: any) => ({ ...d, dueDate: d.dueDate ?? '' })));
      }
      showSuccess('تم التحديث', `تم تحديث حالة ${res.updatedCount} دين إلى ${offOn === 1 ? 'تشغيل' : 'إطفاء'}.`);
      setShowOffOnModal(false);
      setOffOnModalSubscriberId(null);
      setOffOnModalSubscriberName('');
    } catch (err: any) {
      showError('خطأ', ApiService.showError(err));
    } finally {
      setOffOnModalSubmitting(false);
    }
  };

  const toIsoDateTime = (v: string): string => {
    const s = String(v || '').trim();
    if (!s) return new Date().toISOString();
    if (s.includes('T')) return new Date(s).toISOString();
    return new Date(`${s}T00:00:00.000Z`).toISOString();
  };

  const totalDebtAmount = debtsResponse?.totalDebtAmount ?? subscriberTotalDebt;

  const [isExporting, setIsExporting] = useState(false);

  const handleExportDebtsToExcel = () => {
    try {
      setIsExporting(true);
      const headers = ['المشترك', 'إجمالي الدين', 'تاريخ التسديد', 'الدين غير المدفوع', 'عدد الديون', 'ملاحظات الدين', 'إطفاء/تشغيل', 'الإجراءات'];
      const dataRows = (filteredDebts || []).map((sd: any) => {
        const unpaidDebts = (sd.debts || []).filter((d: any) => d.status === 0);
        const datesToShow = unpaidDebts.length > 0 ? unpaidDebts : sd.debts || [];
        const earliestDue = datesToShow.reduce((min: string | null, d: any) => {
          const dDate = getDueDatePart(d.dueDate);
          if (!dDate) return min;
          return !min || dDate < min ? dDate : min;
        }, null as string | null);
        const dueDateStr = earliestDue ? formatDate(earliestDue + 'T12:00:00') : '';
        const descStr = (sd.debts || []).map((d: any) => d.description || '').filter(Boolean).join('، ') || '';
        const offOn = sd.debts?.[0]?.offOn;
        const offOnStr = offOn === DebtOffOn.Off || offOn === 0 ? 'إطفاء' : 'تشغيل';
        return [
          sd.subscriberName ?? '',
          sd.totalDebt ?? 0,
          dueDateStr,
          sd.unpaidDebt ?? 0,
          sd.debts?.length ?? 0,
          descStr,
          offOnStr,
          '',
        ];
      });
      const sumTotalDebt = dataRows.reduce((s, row) => s + (Number(row[1]) || 0), 0);
      const sumUnpaidDebt = dataRows.reduce((s, row) => s + (Number(row[3]) || 0), 0);
      const sumDebtCount = dataRows.reduce((s, row) => s + (Number(row[4]) || 0), 0);
      const totalRow = ['المجموع', sumTotalDebt, '', sumUnpaidDebt, sumDebtCount, '', '', ''];
      const blob = createXlsxBlob([headers, ...dataRows, totalRow], 'الديون', {
        alignCenter: true,
        colWidths: [22, 16, 16, 18, 12, 28, 14, 14],
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ديون_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showSuccess('تم التصدير', 'تم تنزيل ملف Excel بنجاح.');
    } catch (err: any) {
      showError('خطأ في التصدير', ApiService.showError(err));
    } finally {
      setIsExporting(false);
    }
  };

  const openAddDebtForSubscriber = (subscriberId: string, subscriberName?: string) => {
    if (!subscriberId) {
      showError('إضافة دين', 'معرف المشترك غير متوفر.');
      return;
    }
    setSelectedSubscriberNameForAddDebt(subscriberName || '');
    setAddDebtSubscriberSearch(subscriberName || '');
    setAddDebtSubscriberPage(1);
    setShowAddDebtSubscriberResults(false);
    setNewDebtData((prev) => ({
      ...prev,
      subscriberId,
      amount: 0,
      description: '',
      dueDate: new Date().toISOString().split('T')[0],
      notes: '',
    }));
    setShowAddDebtModal(true);
  };

  const openAddDebtChooser = () => {
    setSelectedSubscriberNameForAddDebt('');
    setAddDebtSubscriberSearch('');
    setAddDebtSubscriberPage(1);
    setShowAddDebtSubscriberResults(true);
    setNewDebtData((prev) => ({
      ...prev,
      subscriberId: '',
      amount: 0,
      description: '',
      dueDate: new Date().toISOString().split('T')[0],
      notes: '',
    }));
    setShowAddDebtModal(true);
  };

  // Mutations
  const createDebtMutation = useMutation({
    mutationFn: (debtData: DebtCreateRequest) => apiService.createDebt(debtData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debts', user?.id, user?.role] });
      queryClient.invalidateQueries({ queryKey: ['debt-totals'] });
      setShowAddDebtModal(false);
      setSelectedSubscriberId('');
      setSelectedSubscriberNameForAddDebt('');
      setNewDebtData({
        subscriberId: '',
        amount: 0,
        description: '',
        dueDate: new Date().toISOString().split('T')[0],
        notes: ''
      });
      showSuccess('تم الحفظ', 'تم إضافة الدين بنجاح.');
    },
    onError: (err: any) => {
      showError('خطأ', ApiService.showError(err));
    },
  });

  const payDebtMutation = useMutation({
    mutationFn: async ({ id, paymentData }: { id: string; paymentData: DebtPaymentRequest }) => {
      if (!online) {
        await queueOperation('PayDebt', buildPayDebtPayload(id, paymentData));
        return { id, ...paymentData, status: 1, _offlineQueued: true } as unknown as Debt & { _offlineQueued?: boolean };
      }
      return apiService.payDebt(id, paymentData);
    },
    onSuccess: async (updatedDebt: Debt & { _offlineQueued?: boolean }, variables) => {
      const isOfflineQueued = (updatedDebt as any)?._offlineQueued === true;
      if (isOfflineQueued) {
        showSuccess('تم الحفظ محلياً', 'سيتم رفع تسديد الدين عند عودة الاتصال');
        await refreshPendingCount();
      }
      // دمج الاستجابة (بما فيها paymentCreatedAt) في كاش قائمة الديون لعرض تاريخ الاستلام فوراً دون إبطال القائمة (لأن الباكند يُرجع paymentCreatedAt null في القوائم)
      queryClient.setQueriesData(
        { queryKey: ['debts', user?.id, user?.role], exact: false },
        (old: DebtsListResponse | undefined) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: old.data.map((d: Debt) => d.id === updatedDebt.id ? { ...d, ...updatedDebt } : d),
          };
        }
      );
      queryClient.invalidateQueries({ queryKey: ['debt-totals'] });
      setShowPayDebtModal(false);
      setSelectedDebt(null);
      const paidSubscriberId = updatedDebt?.subscriberId ?? selectedDebt?.subscriberId;
      const paidSubscriberName = updatedDebt?.subscriberName ?? selectedDebt?.subscriberName;
      if (paidSubscriberId) {
        setPostDebtPaymentWhatsApp({ subscriberId: paidSubscriberId, subscriberName: paidSubscriberName });
      }

      // إذا كان المودال فُتح من مودال تفاصيل ديون المشترك، أعد فتحه
      if (openedFromSubscriberDebts && selectedDebt) {
        handleViewSubscriberDebts(selectedDebt.subscriberId);
        setOpenedFromSubscriberDebts(false);
      }
    },
  });

  const updateDebtMutation = useMutation({
    mutationFn: ({ id, debtData }: { id: string; debtData: DebtUpdateRequest }) => 
      apiService.updateDebt(id, debtData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debts', user?.id, user?.role] });
      queryClient.invalidateQueries({ queryKey: ['debt-totals'] });
      setShowEditDebtModal(false);
      setSelectedDebt(null);
      setEditDebtData({
        amount: 0,
        description: '',
        dueDate: new Date().toISOString().split('T')[0],
        notes: ''
      });
    },
  });

  const deleteDebtMutation = useMutation({
    mutationFn: (id: string) => apiService.deleteDebt(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debts', user?.id, user?.role] });
      queryClient.invalidateQueries({ queryKey: ['debt-totals'] });
    },
  });


  if (error) {
    return (
      <div className="p-3 sm:p-4 lg:p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-md">
          خطأ في تحميل بيانات الديون
        </div>
      </div>
    );
  }

  if (createDebtMutation.isPending) {
    return (
      <div className="p-6 flex items-center justify-center h-screen">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <span className="text-lg font-medium text-gray-600 dark:text-gray-400">إضافة دين جديد...</span>
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
          text="تحميل الديون..."
          backColor="#E8F2FC"
          frontColor="#4645F6"
        />
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 lg:p-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
            إدارة الديون
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
            {user?.role === UserRole.Admin
              ? 'عرض وإدارة ديون المشتركين والوكلاء'
              : 'عرض وإدارة ديون مشتركيك'
            }
          </p>
        </div>

        {isAgentOrSubAgentOrEmployee && myResellers.length > 0 && (
          <div className="mb-1">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">المناطق</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              <button
                type="button"
                onClick={() => handleDebtsResellerCardClick('')}
                className={`rounded-xl border px-3 py-2 text-right transition-colors min-h-[44px] ${
                  !selectedOperationalResellerId
                    ? 'bg-primary-100 dark:bg-primary-900/40 border-primary-500 text-primary-800 dark:text-primary-200'
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <div className="text-sm font-semibold truncate">الكل</div>
                <div className="text-xs opacity-75 truncate">كل المناطق</div>
              </button>
              {myResellers.map((r) => {
                const active = selectedOperationalResellerId === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => handleDebtsResellerCardClick(r.id)}
                    className={`rounded-xl border px-3 py-2 text-right transition-colors min-h-[44px] ${
                      active
                        ? 'bg-primary-100 dark:bg-primary-900/40 border-primary-500 text-primary-800 dark:text-primary-200'
                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <div className="text-sm font-semibold truncate">{r.name}</div>
                    <div className="text-xs opacity-75 truncate">
                      {formatServiceTypeLabelAr(r.serviceType)}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 sm:p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
              <div>
                <p className="text-xs sm:text-sm text-red-600 dark:text-red-400">إجمالي الديون غير المدفوعة</p>
                <p className="text-base sm:text-lg font-bold text-red-700 dark:text-red-300">
                  {formatNumber(Number(totalDebtAmount), { suffix: ' د.ع' })}
                </p>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleExportDebtsToExcel}
            disabled={isExporting || (filteredDebts?.length ?? 0) === 0}
            className="flex items-center gap-2 px-3 py-2.5 sm:px-4 sm:py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] touch-manipulation"
            title="تصدير جدول الديون إلى Excel"
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>{isExporting ? 'جاري التصدير...' : 'تصدير اكسل'}</span>
          </button>
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowActionsDropdown(!showActionsDropdown)}
              className="flex items-center gap-2 px-3 py-2.5 sm:px-4 sm:py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md text-sm transition-colors min-h-[44px] touch-manipulation"
            >
              <MoreHorizontal className="h-4 w-4" />
              <span>الإجراءات ({selectedIds.length})</span>
            </button>
            
            {showActionsDropdown && (
              <div className="absolute top-full right-0 mt-2 min-w-[200px] w-max max-w-[280px] bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-600 z-50 py-1.5">
                <div className="flex flex-col gap-0.5">
                  {canManageDebts && (
                    <button
                      onClick={() => {
                        openAddDebtChooser();
                        setShowActionsDropdown(false);
                      }}
                      className="w-full text-right px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                    >
                      <>
                        <Plus className="h-4 w-4" />
                        <span>إضافة دين</span>
                      </>
                    </button>
                  )}
                  
                  {selectedIds.length > 0 && (
                    <>
                      <button
                        onClick={() => {
                          if (selectedIds.length === 1) {
                            const subscriberDebt = subscriberDebts.find((sd: any) => sd.subscriberId === selectedIds[0]) as any;
                            if (subscriberDebt && subscriberDebt.debts.length > 0) {
                              // استخدام أول دين من هذا المشترك
                              const firstDebt = subscriberDebt.debts[0];
                              setSelectedDebt(firstDebt);
                              setShowViewDebtModal(true);
                            }
                          }
                          setShowActionsDropdown(false);
                        }}
                        disabled={selectedIds.length !== 1}
                        className="w-full text-right px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2 disabled:opacity-50"
                      >
                        <Eye className="h-4 w-4" />
                        <span>عرض تفاصيل الدين</span>
                      </button>
                  
                      <button
                        onClick={() => {
                          if (selectedIds.length === 1) {
                            const subscriberDebt = subscriberDebts.find((sd: any) => sd.subscriberId === selectedIds[0]) as any;
                            if (subscriberDebt && subscriberDebt.unpaidDebt > 0) {
                              const unpaidDebt = subscriberDebt.debts.find((d: any) => !d.isPaid);
                              if (unpaidDebt) {
                                setSelectedDebt(unpaidDebt);
                                setPaymentData({
                                  paymentAmount: unpaidDebt.amount,
                                  notes: ''
                                });
                                setShowPayDebtModal(true);
                              }
                            }
                          }
                          setShowActionsDropdown(false);
                        }}
                        disabled={selectedIds.length !== 1}
                        className="w-full text-right px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2 disabled:opacity-50"
                      >
                        <CheckCircle className="h-4 w-4" />
                        <span>دفع الدين</span>
                      </button>

                      <button
                        onClick={handleSendDebtAlertMessage}
                        disabled={selectedIds.length < 1 || sendingDebtAlertBulk}
                        className="w-full text-right px-4 py-2 text-sm text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 flex items-center space-x-2 disabled:opacity-50"
                      >
                        <CheckCircle className="h-4 w-4" />
                        <span>{sendingDebtAlertBulk ? 'جاري الإرسال...' : 'رسالة تنبيه تسديد الدين'}</span>
                      </button>
                      
                      {canEditDebt && (
                        <button
                        onClick={() => {
                          if (selectedIds.length === 1) {
                            const subscriberDebt = subscriberDebts.find((sd: any) => sd.subscriberId === selectedIds[0]) as any;
                            if (subscriberDebt && subscriberDebt.debts.length > 0) {
                              // استخدام أول دين من هذا المشترك
                              const firstDebt = subscriberDebt.debts[0];
                              setSelectedDebt(firstDebt);
                              setEditDebtData({
                                amount: firstDebt.amount,
                                description: firstDebt.description,
                                dueDate: firstDebt.dueDate.split('T')[0],
                                notes: firstDebt.notes || ''
                              });
                              setShowEditDebtModal(true);
                            }
                          }
                          setShowActionsDropdown(false);
                        }}
                          disabled={selectedIds.length !== 1}
                          className="w-full text-right px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2 disabled:opacity-50"
                        >
                          <Edit className="h-4 w-4" />
                          <span>تعديل الدين</span>
                        </button>
                      )}

                      <button
                        onClick={() => {
                          if (selectedIds.length === 1) {
                            const sd = subscriberDebts.find((s: any) => s.subscriberId === selectedIds[0]) as any;
                            handleOpenActivationTab(selectedIds[0], sd?.subscriberName);
                          }
                          setShowActionsDropdown(false);
                        }}
                        disabled={selectedIds.length !== 1 || (selectedIds.length === 1 && activationLinkLoadingForId === selectedIds[0])}
                        className="w-full text-right px-4 py-2 text-sm text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 flex items-center space-x-2 disabled:opacity-50"
                      >
                        {selectedIds.length === 1 && activationLinkLoadingForId === selectedIds[0] ? (
                          <Power className="h-4 w-4 animate-pulse" />
                        ) : (
                          <Power className="h-4 w-4" />
                        )}
                        <span>إطفاء / تشغيل المشترك</span>
                      </button>
                      
                      {canManageDebts && (
                        <button
                          onClick={() => {
                            if (window.confirm(`هل أنت متأكد من حذف ${selectedIds.length} دين؟`)) {
                              selectedIds.forEach(subscriberId => {
                                const subscriberDebt = subscriberDebts.find((sd: any) => sd.subscriberId === subscriberId) as any;
                                if (subscriberDebt) {
                                  // حذف جميع ديون هذا المشترك
                                  subscriberDebt.debts.forEach((debt: any) => deleteDebtMutation.mutate(debt.id));
                                }
                              });
                              setSelectedIds([]);
                            }
                            setShowActionsDropdown(false);
                          }}
                          className="w-full text-right px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center space-x-2"
                        >
                          <>
                            <Trash2 className="h-4 w-4" />
                            <span>حذف الدين</span>
                          </>
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* فلترة متقدمة */}
      <div className="mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowAdvancedFilter((v) => !v)}
            className={`flex items-center gap-2 px-3 py-2 rounded-md border text-sm font-medium transition-colors ${
              showAdvancedFilter || hasActiveAdvancedFilter
                ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-500 text-primary-700 dark:text-primary-300'
                : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <Filter className="h-4 w-4" />
            <span>فلترة متقدمة</span>
            {hasActiveAdvancedFilter && (
              <span className="mr-1 px-1.5 py-0.5 text-xs rounded-full bg-primary-200 dark:bg-primary-800">مفعّل</span>
            )}
          </button>
          <button
            type="button"
            onClick={() => { setShowOverdueOnly((v) => !v); setCurrentPage(1); }}
            className={`px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap ${
              showOverdueOnly ? 'bg-orange-600 hover:bg-orange-700 text-white' : 'bg-orange-100 dark:bg-orange-900/20 text-orange-800 dark:text-orange-300'
            }`}
            title="عرض الديون المتأخرة غير المسددة فقط"
          >
            الديون المتأخرة
          </button>
        </div>

        {showAdvancedFilter && (
          <div className="mt-3 p-4 bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              استخدم شريط البحث أدناه للاسم أو الهاتف. هنا: الحالة، اتجاه الترتيب، نطاق تاريخ استلام الدين (تسجيل الاستلام)، ووصف الدين.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">وصف الدين (مطابقة جزئية)</label>
                <input
                  type="text"
                  placeholder="مثال: تجديد، اشتراك..."
                  value={debtDescription}
                  onChange={(e) => setDebtDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">حالة الدين</label>
                <select
                  value={statusFilter === '' ? '' : statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value === '' ? '' : (Number(e.target.value) as DebtStatus))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white text-sm"
                >
                  <option value="">الكل</option>
                  <option value={DebtStatus.Unpaid}>غير مدفوع</option>
                  <option value={DebtStatus.Paid}>مدفوع</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">اتجاه الترتيب</label>
                <select
                  value={sortDescending ? 'true' : 'false'}
                  onChange={(e) => setSortDescending(e.target.value === 'true')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white text-sm"
                >
                  <option value="false">تصاعدي</option>
                  <option value="true">تنازلي</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">تاريخ استلام الدين من</label>
                <input
                  type="date"
                  value={paymentReceivedFrom}
                  onChange={(e) => setPaymentReceivedFrom(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">تاريخ استلام الدين إلى</label>
                <input
                  type="date"
                  value={paymentReceivedTo}
                  onChange={(e) => setPaymentReceivedTo(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white text-sm"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              <button type="button" onClick={handleApplyAdvancedFilter} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-md text-sm font-medium">
                <Check className="h-4 w-4" />
                تطبيق الفلتر
              </button>
              <button type="button" onClick={handleClearSearch} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-gray-200 rounded-md text-sm font-medium">
                <X className="h-4 w-4" />
                مسح الفلتر
              </button>
            </div>
          </div>
        )}
      </div>

      {/* فلترة البحث — الاسم أو الهاتف */}
      <div className="mt-3 flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="البحث بالاسم أو رقم الهاتف..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), setAppliedSearchTerm(searchTerm.trim()), setCurrentPage(1))}
            className="w-full pr-10 pl-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white text-sm"
          />
        </div>
        <button type="button" onClick={() => { setAppliedSearchTerm(searchTerm.trim()); setCurrentPage(1); }} className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md text-sm font-medium whitespace-nowrap">
          بحث
        </button>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="wakeel-table-scroll">
          <table className="min-w-[640px] w-full text-right">
            <thead>
              <tr>
                <th className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3">
                  <button onClick={toggleSelectAll} className="p-1" aria-label="تحديد الكل">
                    {filteredDebts && selectedIds.length === filteredDebts.length && filteredDebts.length > 0 ? (
                      <CheckSquare className="h-4 w-4 text-primary-600" />
                    ) : (
                      <Square className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </th>
                <th className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  المشترك
                </th>
                <th className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  إجمالي الدين
                </th>
                <th className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  الدين غير المدفوع
                </th>
                <th className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  عدد الديون
                </th>
                <th className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden md:table-cell">
                  ملاحظات الدين
                </th>
                <th className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  تاريخ التسديد
                </th>
                <th className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden lg:table-cell">
                  تاريخ استلام الدين
                </th>
                <th className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  إطفاء/تشغيل
                </th>
                {canManageDebts && (
                  <th className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    الإجراءات
                  </th>
                )}
              </tr>
            </thead>
            <tbody
              key={`debts-${showOverdueOnly ? 'overdue' : 'all'}-page-${debtsResponse?.currentPage ?? 1}`}
            >
              {filteredDebts.map((subscriberDebt: any) => (
                <tr key={`${subscriberDebt.subscriberId}-${(subscriberDebt.debts?.[0]?.id ?? '')}`} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-2 sm:px-4 lg:px-6 py-3 sm:py-4">
                    <button onClick={() => toggleSelectOne(subscriberDebt.subscriberId)} className="p-1" aria-label="تحديد">
                      {selectedIds.includes(subscriberDebt.subscriberId) ? (
                        <CheckSquare className="h-4 w-4 text-primary-600" />
                      ) : (
                        <Square className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                  </td>
                  <td className="px-2 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-8 w-8 sm:h-10 sm:w-10">
                        <div className={`h-8 w-8 sm:h-10 sm:w-10 rounded-full flex items-center justify-center ${
                          subscriberDebt.unpaidDebt > 0 ? 'bg-red-100 dark:bg-red-900' : 'bg-green-100 dark:bg-green-900'
                        }`}>
                          <CreditCard className={`h-4 w-4 sm:h-5 sm:w-5 ${
                            subscriberDebt.unpaidDebt > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                          }`} />
                        </div>
                      </div>
                      <div className="mr-2 sm:mr-4">
                        <div className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">
                          {subscriberDebt.subscriberName}
                        </div>
                        <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                          {subscriberDebt.agentName}
                        </div>
                        {subscriberDebt.subscriberPhone && (
                          <div className="text-xs text-gray-400">
                            {subscriberDebt.subscriberPhone}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-2 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-900 dark:text-white">
                    {formatNumber(subscriberDebt.totalDebt, { suffix: ' د.ع' })}
                  </td>
                  <td className="px-2 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-red-600 dark:text-red-400">
                    {formatNumber(subscriberDebt.unpaidDebt, { suffix: ' د.ع' })}
                  </td>
                  <td className="px-2 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900 dark:text-white">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                      {subscriberDebt.debts.length} دين
                    </span>
                  </td>
                  <td className="px-2 sm:px-4 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-900 dark:text-white max-w-[200px] hidden md:table-cell">
                    <div className="truncate" title={(subscriberDebt.debts || []).map((d: any) => d.description || '').filter(Boolean).join(' | ')}>
                      {(subscriberDebt.debts || []).map((d: any) => d.description || '—').filter((s: string) => s !== '—').join('، ') || '—'}
                    </div>
                  </td>
                  <td className="px-2 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900 dark:text-white">
                    {(() => {
                      const unpaidDebts = (subscriberDebt.debts || []).filter((d: any) => d.status === 0);
                      const datesToShow = unpaidDebts.length > 0 ? unpaidDebts : subscriberDebt.debts || [];
                      const earliestDue = datesToShow.reduce((min: string | null, d: any) => {
                        const dDate = getDueDatePart(d.dueDate);
                        if (!dDate) return min;
                        return !min || dDate < min ? dDate : min;
                      }, null as string | null);
                      const today = new Date().toISOString().split('T')[0];
                      const isOverdue = earliestDue && earliestDue < today;
                      return earliestDue ? (
                        <span className={isOverdue ? 'text-red-600 dark:text-red-400 font-medium' : ''}>
                          {formatDate(earliestDue + 'T12:00:00')}
                          {isOverdue && <span className="text-xs mr-1">(متأخر)</span>}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      );
                    })()}
                  </td>
                  <td className="px-2 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 dark:text-gray-400 hidden lg:table-cell">
                    {(() => {
                      const withDate = (subscriberDebt.debts || []).filter((d: any) => d.paymentCreatedAt);
                      const latest = withDate.length === 0 ? null : withDate.reduce((a: any, d: any) =>
                        !a || (d.paymentCreatedAt && d.paymentCreatedAt > a.paymentCreatedAt) ? d : a
                      );
                      return latest?.paymentCreatedAt
                        ? formatDate(latest.paymentCreatedAt)
                        : '—';
                    })()}
                  </td>
                  <td className="px-2 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium">
                    {(() => {
                      const offOn = subscriberDebt.debts?.[0]?.offOn;
                      const isOff = offOn === DebtOffOn.Off;
                      return (
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          isOff
                            ? 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                            : 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                        }`}>
                          {isOff ? 'إطفاء' : 'تشغيل'}
                        </span>
                      );
                    })()}
                  </td>
                  {canManageDebts && (
                    <td className="px-2 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium">
                      <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                        <button
                          onClick={() => {
                            if (subscriberDebt.unpaidDebt > 0) {
                              const unpaidDebt = subscriberDebt.debts.find((d: any) => d.status === 0 || !d.isPaid);
                              if (unpaidDebt) {
                                setSelectedDebt(unpaidDebt);
                                setPaymentData({ paymentAmount: unpaidDebt.amount, notes: '' });
                                setShowPayDebtModal(true);
                              }
                            }
                          }}
                          disabled={subscriberDebt.unpaidDebt <= 0}
                          className="inline-flex items-center gap-1 px-2 py-1.5 sm:px-3 sm:py-1.5 text-xs sm:text-sm text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                          <span>تسديد</span>
                        </button>
                        <button
                          onClick={() => handleViewSubscriberDebts(subscriberDebt.subscriberId)}
                          className="inline-flex items-center gap-1 px-2 py-1.5 sm:px-3 sm:py-1.5 text-xs sm:text-sm text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-md transition-colors"
                        >
                          <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                          <span>عرض التفاصيل</span>
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredDebts.length === 0 && (
          <div className="text-center py-12">
            <CreditCard className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
              لا توجد ديون
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              لا توجد ديون مسجلة حالياً
            </p>
          </div>
        )}
      </div>

      {/* Pagination — قيمها من الباكند فقط؛ تُعطّل أثناء جلب الصفحة الجديدة */}
      {debtsResponse && debtsResponse.totalPages > 1 && (
        <div className={isFetching ? 'opacity-70 pointer-events-none' : ''}>
          <Pagination
            currentPage={debtsResponse.currentPage}
            totalPages={debtsResponse.totalPages}
            totalItems={debtsResponse.totalItems}
            pageSize={debtsResponse.pageSize}
            hasNextPage={debtsResponse.hasNextPage}
            hasPreviousPage={debtsResponse.hasPreviousPage}
            onPageChange={handlePageChange}
          />
        </div>
      )}

      {/* Summary */}
      

      {/* Add Debt Modal */}
      {showAddDebtModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md my-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                إضافة دين جديد
              </h2>
              <button
                onClick={() => {
                  setShowAddDebtModal(false);
                  setSelectedSubscriberNameForAddDebt('');
                  setAddDebtSubscriberSearch('');
                  setAddDebtSubscriberPage(1);
                  setShowAddDebtSubscriberResults(false);
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
              >
                <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              createDebtMutation.mutate({
                ...newDebtData,
                dueDate: toIsoDateTime(newDebtData.dueDate),
              });
            }} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  اختر المشترك *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={addDebtSubscriberSearch}
                    onChange={(e) => {
                      setAddDebtSubscriberSearch(e.target.value);
                      setAddDebtSubscriberPage(1);
                      setShowAddDebtSubscriberResults(true);
                      // عند تغيير البحث، اعتبر أن الاختيار لم يعد مؤكداً
                      setSelectedSubscriberNameForAddDebt('');
                      setNewDebtData((prev) => ({ ...prev, subscriberId: '' }));
                    }}
                    onFocus={() => setShowAddDebtSubscriberResults(true)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                    placeholder="ابحث باسم المشترك أو اسم المستخدم..."
                  />
                  {showAddDebtSubscriberResults && (
                    <div className="absolute z-20 mt-1 w-full rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-lg max-h-64 overflow-auto">
                      {addDebtSubscribersLoading ? (
                        <div className="p-3 text-sm text-gray-500 dark:text-gray-400">جاري التحميل...</div>
                      ) : (addDebtSubscribersResponse?.data?.length ?? 0) === 0 ? (
                        <div className="p-3 text-sm text-gray-500 dark:text-gray-400">لا توجد نتائج</div>
                      ) : (
                        <ul className="py-1">
                          {(addDebtSubscribersResponse?.data ?? []).map((s) => {
                            const displayName =
                              (s.fullName || '').trim() ||
                              `${s.firstName || ''} ${s.lastName || ''}`.trim() ||
                              s.username;
                            return (
                              <li key={s.id}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setNewDebtData((prev) => ({ ...prev, subscriberId: s.id }));
                                    setSelectedSubscriberNameForAddDebt(displayName);
                                    setAddDebtSubscriberSearch(displayName);
                                    setShowAddDebtSubscriberResults(false);
                                  }}
                                  className="w-full text-right px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="font-medium text-gray-900 dark:text-white truncate">{displayName}</span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400 font-mono truncate">{s.phoneNumber || ''}</span>
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{s.username}</div>
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                      {(addDebtSubscribersResponse?.totalPages ?? 1) > 1 && (
                        <div className="flex items-center justify-between px-3 py-2 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-300">
                          <button
                            type="button"
                            onClick={() => setAddDebtSubscriberPage((p) => Math.max(1, p - 1))}
                            disabled={(addDebtSubscribersResponse?.hasPreviousPage ?? false) === false}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            السابق
                          </button>
                          <span>
                            صفحة {addDebtSubscribersResponse?.currentPage ?? addDebtSubscriberPage} من {addDebtSubscribersResponse?.totalPages ?? 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => setAddDebtSubscriberPage((p) => p + 1)}
                            disabled={(addDebtSubscribersResponse?.hasNextPage ?? false) === false}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            التالي
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {!newDebtData.subscriberId && (
                  <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                    يرجى اختيار مشترك قبل حفظ الدين.
                  </p>
                )}
                {newDebtData.subscriberId && selectedSubscriberNameForAddDebt && (
                  <p className="mt-1 text-xs text-green-700 dark:text-green-300">
                    المشترك المختار: <span className="font-semibold">{selectedSubscriberNameForAddDebt}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  المبلغ *
                </label>
                <input
                  type="number"
                  value={newDebtData.amount}
                  onChange={(e) => setNewDebtData(prev => ({ ...prev, amount: Number(e.target.value) }))}
                  required
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                  placeholder="المبلغ"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  ملاحظات الدين *
                </label>
                <textarea
                  value={newDebtData.description}
                  onChange={(e) => setNewDebtData(prev => ({ ...prev, description: e.target.value }))}
                  required
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                  placeholder="ملاحظات الدين"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  تاريخ التسديد *
                </label>
                <input
                  type="date"
                  value={newDebtData.dueDate}
                  onChange={(e) => setNewDebtData(prev => ({ ...prev, dueDate: e.target.value }))}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  ملاحظات
                </label>
                <textarea
                  value={newDebtData.notes || ''}
                  onChange={(e) => setNewDebtData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                  placeholder="ملاحظات إضافية (اختياري)"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddDebtModal(false);
                    setSelectedSubscriberNameForAddDebt('');
                    setAddDebtSubscriberSearch('');
                    setAddDebtSubscriberPage(1);
                    setShowAddDebtSubscriberResults(false);
                  }}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={createDebtMutation.isPending || !newDebtData.subscriberId}
                  className="flex items-center space-x-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {createDebtMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>جاري الحفظ...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      <span>حفظ الدين</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Debt Modal */}
      {showEditDebtModal && selectedDebt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                تعديل الدين
              </h2>
              <button
                onClick={() => setShowEditDebtModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
              >
                <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              if (canEmployeeEditDebtNotesOnly) {
                updateDebtMutation.mutate({
                  id: selectedDebt.id,
                  debtData: {
                    amount: selectedDebt.amount,
                    dueDate: selectedDebt.dueDate,
                    description: editDebtData.description,
                    notes: selectedDebt.notes || '',
                    offOn: selectedDebt.offOn,
                  },
                });
                return;
              }
              updateDebtMutation.mutate({ id: selectedDebt.id, debtData: editDebtData });
            }} className="p-6 space-y-4">
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                  تفاصيل الدين
                </h3>
                <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                  <div>المشترك: {selectedDebt.subscriberName}</div>
                  <div>الوكيل: {selectedDebt.agentName}</div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  المبلغ (د.ع) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editDebtData.amount}
                  onChange={(e) => setEditDebtData((prev: DebtUpdateRequest) => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                  required
                  disabled={canEmployeeEditDebtNotesOnly}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                  placeholder="مبلغ الدين"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  ملاحظات الدين *
                </label>
                <textarea
                  value={editDebtData.description}
                  onChange={(e) => setEditDebtData((prev: DebtUpdateRequest) => ({ ...prev, description: e.target.value }))}
                  required
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                  placeholder="ملاحظات الدين"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  تاريخ التسديد *
                </label>
                <input
                  type="date"
                  value={editDebtData.dueDate}
                  onChange={(e) => setEditDebtData((prev: DebtUpdateRequest) => ({ ...prev, dueDate: e.target.value }))}
                  required
                  disabled={canEmployeeEditDebtNotesOnly}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  الملاحظات
                </label>
                <textarea
                  value={editDebtData.notes || ''}
                  onChange={(e) => setEditDebtData((prev: DebtUpdateRequest) => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  disabled={canEmployeeEditDebtNotesOnly}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                  placeholder="ملاحظات إضافية..."
                />
              </div>

              {canEmployeeEditDebtNotesOnly && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  بصلاحية الموظف يمكن تعديل ملاحظات الدين فقط، أما المبلغ وتاريخ التسديد والملاحظات الإضافية فهي للقراءة فقط.
                </p>
              )}

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setShowEditDebtModal(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={updateDebtMutation.isPending}
                  className="flex items-center space-x-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {updateDebtMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>جاري التحديث...</span>
                    </>
                  ) : (
                    <>
                      <Edit className="h-4 w-4" />
                      <span>تحديث الدين</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pay Debt Modal */}
      {showPayDebtModal && selectedDebt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                دفع الدين
              </h2>
              <button
                onClick={() => {
                  setShowPayDebtModal(false);
                  // إذا كان المودال فُتح من مودال تفاصيل ديون المشترك، أعد فتحه
                  if (openedFromSubscriberDebts && selectedDebt) {
                    handleViewSubscriberDebts(selectedDebt.subscriberId);
                    setOpenedFromSubscriberDebts(false);
                  }
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
              >
                <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              payDebtMutation.mutate({ id: selectedDebt.id, paymentData });
            }} className="p-6 space-y-4">
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                  تفاصيل الدين
                </h3>
                <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                  <div>المشترك: {selectedDebt.subscriberName}</div>
                  <div>الوكيل: {selectedDebt.agentName}</div>
                  <div>المبلغ: {formatNumber(selectedDebt.amount, { suffix: ' د.ع' })}</div>
                  <div>ملاحظات الدين: {selectedDebt.description}</div>
                  {selectedDebt.materialName && (
                    <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600 space-y-0.5">
                      <div className="font-medium text-gray-700 dark:text-gray-300">دين مواد</div>
                      <div>المادة: {selectedDebt.materialName}</div>
                      {typeof selectedDebt.materialQuantity === 'number' && (
                        <div>الكمية: {formatNumber(selectedDebt.materialQuantity)}</div>
                      )}
                      {typeof selectedDebt.materialPricePaid === 'number' && (
                        <div>المدفوع: {formatNumber(selectedDebt.materialPricePaid, { suffix: ' د.ع' })}</div>
                      )}
                      {typeof selectedDebt.materialDebtAmount === 'number' && (
                        <div>مبلغ الدين: {formatNumber(selectedDebt.materialDebtAmount, { suffix: ' د.ع' })}</div>
                      )}
                      {selectedDebt.materialDisbursementDate && (
                        <div>تاريخ الصرف: {formatDate(selectedDebt.materialDisbursementDate + 'T12:00:00')}</div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  مبلغ الدفع *
                </label>
                <input
                  type="number"
                  value={paymentData.paymentAmount}
                  onChange={(e) => setPaymentData(prev => ({ ...prev, paymentAmount: Number(e.target.value) }))}
                  required
                  min="0"
                  max={selectedDebt.amount}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                  placeholder="مبلغ الدفع"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  ملاحظات
                </label>
                <textarea
                  value={paymentData.notes}
                  onChange={(e) => setPaymentData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                  placeholder="ملاحظات إضافية..."
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => {
                    setShowPayDebtModal(false);
                    // إذا كان المودال فُتح من مودال تفاصيل ديون المشترك، أعد فتحه
                    if (openedFromSubscriberDebts && selectedDebt) {
                      handleViewSubscriberDebts(selectedDebt.subscriberId);
                      setOpenedFromSubscriberDebts(false);
                    }
                  }}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={payDebtMutation.isPending}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {payDebtMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>جاري الدفع...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      <span>تأكيد الدفع</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {postDebtPaymentWhatsApp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-sm w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              إرسال رسالة الدين/التفاصيل؟
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              تم تسديد الدين بنجاح للمشترك{' '}
              <span className="font-medium text-gray-900 dark:text-white">
                {postDebtPaymentWhatsApp.subscriberName || '—'}
              </span>
              . يمكنك الآن إرسال رسالة الدين/التفاصيل من هنا.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPostDebtPaymentWhatsApp(null)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md text-sm"
              >
                إغلاق
              </button>
              <button
                type="button"
                disabled={sendingDebtDetailsWhatsApp}
                onClick={async () => {
                  try {
                    setSendingDebtDetailsWhatsApp(true);
                    await apiService.sendWhatsAppDetails(postDebtPaymentWhatsApp.subscriberId);
                    showSuccess('واتساب', 'تم إرسال رسالة الدين/التفاصيل بنجاح.');
                    setPostDebtPaymentWhatsApp(null);
                  } catch (err: any) {
                    showError('واتساب', ApiService.showError(err));
                  } finally {
                    setSendingDebtDetailsWhatsApp(false);
                  }
                }}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm disabled:opacity-60"
              >
                {sendingDebtDetailsWhatsApp ? 'جاري الإرسال...' : 'إرسال رسالة الدين/التفاصيل'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* مودال تحديث حالة الإطفاء/التشغيل (بعد العودة من رابط SAS/FTTH) */}
      {showOffOnModal && offOnModalSubscriberId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                تحديث حالة الإطفاء/التشغيل
              </h3>
              <button
                onClick={() => {
                  setShowOffOnModal(false);
                  setOffOnModalSubscriberId(null);
                  setOffOnModalSubscriberName('');
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                حدّث الحالة حسب ما قمت به في الصفحة المفتوحة للمشترك{' '}
                <span className="font-medium text-gray-900 dark:text-white">{offOnModalSubscriberName || offOnModalSubscriberId}</span>.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => handleOffOnModalSubmit(0)}
                  disabled={offOnModalSubmitting}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Power className="h-4 w-4" />
                  تم إطفاء المشترك
                </button>
                <button
                  type="button"
                  onClick={() => handleOffOnModalSubmit(1)}
                  disabled={offOnModalSubmitting}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-md font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Power className="h-4 w-4" />
                  تم تشغيل المشترك
                </button>
              </div>
              {offOnModalSubmitting && (
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center">جاري التحديث...</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* View Debt Details Modal */}
      {showViewDebtModal && selectedDebt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                تفاصيل الدين
              </h3>
              <button
                onClick={() => {
                  setShowViewDebtModal(false);
                  setSelectedDebt(null);
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    اسم المشترك
                  </label>
                  <p className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 p-2 rounded">
                    {selectedDebt.subscriberName}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    اسم الوكيل
                  </label>
                  <p className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 p-2 rounded">
                    {selectedDebt.agentName}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  المبلغ
                </label>
                <p className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 p-2 rounded">
                  {formatNumber(selectedDebt.amount, { suffix: ' د.ع' })}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  ملاحظات الدين
                </label>
                <p className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 p-2 rounded">
                  {selectedDebt.description}
                </p>
              </div>

              {selectedDebt.materialName && (
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 border border-amber-200 dark:border-amber-800">
                  <h4 className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-2">دين مواد</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <span>المادة:</span>
                    <span>{selectedDebt.materialName}</span>
                    {typeof selectedDebt.materialQuantity === 'number' && (
                      <>
                        <span>الكمية:</span>
                        <span>{formatNumber(selectedDebt.materialQuantity)}</span>
                      </>
                    )}
                    {typeof selectedDebt.materialPricePaid === 'number' && (
                      <>
                        <span>المدفوع:</span>
                        <span>{formatNumber(selectedDebt.materialPricePaid, { suffix: ' د.ع' })}</span>
                      </>
                    )}
                    {typeof selectedDebt.materialDebtAmount === 'number' && (
                      <>
                        <span>مبلغ الدين:</span>
                        <span>{formatNumber(selectedDebt.materialDebtAmount, { suffix: ' د.ع' })}</span>
                      </>
                    )}
                    {selectedDebt.materialDisbursementDate && (
                      <>
                        <span>تاريخ الصرف:</span>
                        <span>{formatDate(selectedDebt.materialDisbursementDate + 'T12:00:00')}</span>
                      </>
                    )}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  تاريخ التسديد
                </label>
                <p className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 p-2 rounded">
                  {formatDueDateForDisplay(selectedDebt)}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  الحالة
                </label>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    selectedDebt.isPaid 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                      : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                  }`}>
                    {selectedDebt.isPaid ? 'مدفوع' : 'غير مدفوع'}
                  </span>
                </div>
              </div>

              {selectedDebt.paidDate && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    تاريخ الدفع
                  </label>
                  <p className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 p-2 rounded">
                    {formatDate(selectedDebt.paidDate)}
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  تاريخ الإنشاء
                </label>
                <p className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 p-2 rounded">
                  {formatDate(selectedDebt.createdAt)}
                </p>
              </div>

              {selectedDebt.updatedAt && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    تاريخ آخر تحديث
                  </label>
                  <p className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 p-2 rounded">
                    {formatDate(selectedDebt.updatedAt)}
                  </p>
                </div>
              )}

              {selectedDebt.notes && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    ملاحظات
                  </label>
                  <p className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 p-2 rounded">
                    {selectedDebt.notes}
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end p-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  setShowViewDebtModal(false);
                  setSelectedDebt(null);
                }}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md transition-colors"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Subscriber Debts Details Modal */}
      {showSubscriberDebtsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                تفاصيل ديون المشترك
              </h3>
              <div className="flex items-center gap-2">
                {canManageDebts && selectedSubscriberForDebtsModalId && (
                  <>
                    <button
                      type="button"
                      onClick={() => selectedSubscriberForDebtsModalId && handleOpenActivationTab(selectedSubscriberForDebtsModalId, selectedSubscriberDebts[0]?.subscriberName)}
                      disabled={!!activationLinkLoadingForId}
                      className="flex items-center gap-2 px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-md transition-colors disabled:opacity-50"
                    >
                      {activationLinkLoadingForId === selectedSubscriberForDebtsModalId ? (
                        <Power className="h-4 w-4 animate-pulse" />
                      ) : (
                        <Power className="h-4 w-4" />
                      )}
                      <span>إطفاء / تشغيل المشترك</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const subId = selectedSubscriberForDebtsModalId;
                        const subName = selectedSubscriberDebts[0]?.subscriberName || '';
                        openAddDebtForSubscriber(subId, subName);
                        setShowSubscriberDebtsModal(false);
                      }}
                      className="flex items-center gap-2 px-3 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                      <span>إضافة دين</span>
                    </button>
                  </>
                )}
                <button
                  onClick={() => {
                    setShowSubscriberDebtsModal(false);
                    setSelectedSubscriberDebts([]);
                    setSelectedSubscriberTotalDebt(null);
                    setSelectedSubscriberForDebtsModalId(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  aria-label="إغلاق"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              {selectedSubscriberDebts.length > 0 ? (
                <>
                  <div className="mb-4">
                    <h4 className="text-md font-medium text-gray-900 dark:text-white mb-2">
                      {selectedSubscriberDebts[0]?.subscriberName} - {selectedSubscriberDebts[0]?.agentName}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      إجمالي الديون: {formatNumber(selectedSubscriberTotalDebt ?? selectedSubscriberDebts.reduce((total, debt) => total + debt.amount, 0), { suffix: ' د.ع' })}
                    </p>
                  </div>
              
              <div className="wakeel-table-scroll">
                <table className="min-w-full text-right">
                  <thead>
                    <tr>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        ملاحظات الدين
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        المبلغ
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        تاريخ التسديد
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        تاريخ استلام الدين
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        حالة الدين
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        إطفاء/تشغيل
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        تاريخ الإنشاء
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        الإجراءات
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedSubscriberDebts.map((debt: Debt) => (
                      <tr key={debt.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                          <div>
                            <span>{debt.description}</span>
                            {debt.materialName && (
                              <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                دين مواد: {debt.materialName}
                                {typeof debt.materialQuantity === 'number' && (
                                  <> · كمية: {formatNumber(debt.materialQuantity)}</>
                                )}
                                {typeof debt.materialPricePaid === 'number' && (
                                  <> · مدفوع: {formatNumber(debt.materialPricePaid, { suffix: ' د.ع' })}</>
                                )}
                                {debt.materialDisbursementDate && (
                                  <> · تاريخ الصرف: {formatDate(debt.materialDisbursementDate + 'T12:00:00')}</>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                          {formatNumber(debt.amount, { suffix: ' د.ع' })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {formatDueDateForDisplay(debt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {debt.paymentCreatedAt
                            ? formatDate(debt.paymentCreatedAt)
                            : '—'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {(() => {
                            const getDebtStatusText = (status: number) => {
                              switch (status) {
                                case 0: return 'غير مدفوع';
                                case 1: return 'مدفوع';
                                case 2: return 'مدفوع جزئياً';
                                default: return 'غير محدد';
                              }
                            };
                            
                            const getDebtStatusColor = (status: number) => {
                              switch (status) {
                                case 0: return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
                                case 1: return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
                                case 2: return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
                                default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
                              }
                            };
                            
                            return (
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getDebtStatusColor(debt.status)}`}>
                                {getDebtStatusText(debt.status)}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {(() => {
                            const offOn = debt.offOn;
                            const isOff = offOn === DebtOffOn.Off;
                            return (
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                isOff
                                  ? 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                                  : 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                              }`}>
                                {isOff ? 'إطفاء' : 'تشغيل'}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {debt.createdAt ? formatDate(debt.createdAt) : '—'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center gap-2 flex-wrap">
                            {canManageDebts ? (
                              <>
                                {!debt.isPaid && (
                                  <button
                                    onClick={() => {
                                      setSelectedDebt(debt);
                                      setPaymentData({ paymentAmount: debt.amount, notes: '' });
                                      setOpenedFromSubscriberDebts(true);
                                      setShowPayDebtModal(true);
                                      setShowSubscriberDebtsModal(false);
                                    }}
                                    className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 flex items-center space-x-1"
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                    <span>تسديد</span>
                                  </button>
                                )}
                                <button
                                  onClick={() => {
                                    if (window.confirm('هل أنت متأكد من حذف هذا الدين؟')) {
                                      deleteDebtMutation.mutate(debt.id, {
                                        onSuccess: () => {
                                          setSelectedSubscriberDebts(prev => prev.filter((d: any) => d.id !== debt.id));
                                          setSelectedSubscriberTotalDebt(prev => (prev != null ? prev - (debt.amount || 0) : null));
                                          showSuccess('تم الحذف', 'تم حذف الدين.');
                                        },
                                      });
                                    }
                                  }}
                                  className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 flex items-center space-x-1"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  <span>حذف</span>
                                </button>
                                {debt.isPaid && <span className="text-gray-400 text-xs">مدفوع</span>}
                              </>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <CreditCard className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                    لا توجد ديون
                  </h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    لا توجد ديون مسجلة لهذا المشترك حالياً
                  </p>
                </div>
              )}
            </div>
            
            <div className="flex justify-end p-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  setShowSubscriberDebtsModal(false);
                  setSelectedSubscriberDebts([]);
                }}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md transition-colors"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DebtsPage;
