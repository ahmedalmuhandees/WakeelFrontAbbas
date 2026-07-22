import React, { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService, ApiService } from '../services/api';
import {
  DealerDebt,
  DealerDebtCreateRequest,
  DealerDebtPayRequest,
  DealerDebtUpdateRequest,
  DealerDebtsStatementResponse,
  UserRole,
} from '../types';
import { showSuccess, showError } from '../utils/notifications';
import { useConfirmation } from '../contexts/ConfirmationContext';
import { useDigits } from '../contexts/DigitsContext';
import { useAuth } from '../contexts/AuthContext';
import { useMyAgent } from '../hooks/useMyAgent';
import WifiLoaderComponent from '../components/WifiLoaderComponent';
import Pagination from '../components/Pagination';
import { GlassSummaryCard } from '../components/GlassSummaryCard';
import { CreditCard, Plus, Pencil, Trash2, Banknote, Search, ScrollText, X, FileSpreadsheet, Printer } from 'lucide-react';
import { createDealerDebtsExcelBlob } from '../utils/excelExport';
import { saveDealerCashReceiptPdf } from '../utils/dealerCashReceiptPrint';

function debtDateToInput(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toISOString().slice(0, 10);
  } catch {
    return '';
  }
}

function inputDateToIsoUtc(dateStr: string): string {
  const s = dateStr.trim();
  if (!s) return new Date().toISOString();
  return new Date(`${s}T00:00:00.000Z`).toISOString();
}

function formatDebtDateDisplayReceipt(iso: string): string {
  try {
    if (!iso || !String(iso).trim()) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso).split('T')[0] || '—';
    return d.toLocaleDateString('ar-IQ', { year: 'numeric', month: '2-digit', day: '2-digit' });
  } catch {
    return '—';
  }
}

/** تاريخ التسديد للسند: يُفضّل updatedAt ثم createdAt */
function paymentDateDisplayForDebt(row: DealerDebt): string {
  const iso = (row.updatedAt && String(row.updatedAt).trim()) || (row.createdAt && String(row.createdAt).trim()) || '';
  if (iso) return formatDebtDateDisplayReceipt(iso);
  if (Number(row.remainingAmount) <= 0) return formatDebtDateDisplayReceipt(new Date().toISOString());
  return '—';
}

const DealerDebtsPage: React.FC = () => {
  const { user } = useAuth();
  const { data: myAgent } = useMyAgent(!!user && user.role !== UserRole.Admin);
  const scopedAgentId = user?.role === UserRole.Admin ? undefined : myAgent?.id;
  const { confirmDelete } = useConfirmation();
  const { formatNumber } = useDigits();
  const queryClient = useQueryClient();
  const [dealerFilter, setDealerFilter] = useState<string>('');
  const [dealerFullNameDraft, setDealerFullNameDraft] = useState('');
  const [appliedDealerFullName, setAppliedDealerFullName] = useState('');
  const [fromDraft, setFromDraft] = useState('');
  const [toDraft, setToDraft] = useState('');
  const [appliedFrom, setAppliedFrom] = useState('');
  const [appliedTo, setAppliedTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [fromRenewalActivationsOnly, setFromRenewalActivationsOnly] = useState(false);
  const [statementDealerId, setStatementDealerId] = useState<string | null>(null);
  const [statementDealerLabel, setStatementDealerLabel] = useState('');
  const [statementPage, setStatementPage] = useState(1);
  const statementPageSize = 10;
  const [exportingExcel, setExportingExcel] = useState(false);
  /** سجلات محددة في الصفحة الحالية — لطباعة سند يضم كل السجلات المختارة */
  const [selectedDebtIds, setSelectedDebtIds] = useState<Set<string>>(() => new Set());
  /** سجلات محددة داخل مودال كشف الوكيل */
  const [statementSelectedDebtIds, setStatementSelectedDebtIds] = useState<Set<string>>(() => new Set());
  const mainSelectAllRef = useRef<HTMLInputElement>(null);
  const statementSelectAllRef = useRef<HTMLInputElement>(null);

  const applyDebtFilters = () => {
    setAppliedDealerFullName(dealerFullNameDraft.trim());
    setAppliedFrom(fromDraft.trim());
    setAppliedTo(toDraft.trim());
    setCurrentPage(1);
  };

  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<DealerDebt | null>(null);
  const [paying, setPaying] = useState<DealerDebt | null>(null);

  const [addForm, setAddForm] = useState<{
    dealerId: string;
    amount: number;
    debtDate: string;
    useCustomRemaining: boolean;
    remainingAmount: number;
    notes: string;
  }>({
    dealerId: '',
    amount: 0,
    debtDate: new Date().toISOString().slice(0, 10),
    useCustomRemaining: false,
    remainingAmount: 0,
    notes: '',
  });

  const [editForm, setEditForm] = useState<{
    amount: number;
    debtDate: string;
    remainingAmount: number;
    notes: string;
  }>({
    amount: 0,
    debtDate: '',
    remainingAmount: 0,
    notes: '',
  });

  const [payForm, setPayForm] = useState<DealerDebtPayRequest>({ amount: 0, notes: '' });
  const [payByDealerOpen, setPayByDealerOpen] = useState(false);
  const [payByDealerForm, setPayByDealerForm] = useState<{ amount: number; notes: string }>({ amount: 0, notes: '' });

  const { data: dealersRes } = useQuery({
    queryKey: ['dealers', 'dropdown'],
    queryFn: () => apiService.getDealers({ page: 1, pageSize: 200 }),
  });
  const dealersData = dealersRes?.data;

  const handleExportDealerDebtsExcel = async () => {
    const dealerId = dealerFilter.trim();
    if (!dealerId) {
      showError('اختر الوكيل', 'يرجى اختيار وكيل من القائمة قبل استيراد الإكسل.');
      return;
    }
    setExportingExcel(true);
    try {
      const exportPageSize = 200;
      const collected: DealerDebt[] = [];
      let page = 1;
      let hasMore = true;
      while (hasMore) {
        const res = await apiService.getDealerDebts({
          dealerId,
          agentId: scopedAgentId,
          dealerFullName: appliedDealerFullName || undefined,
          fromDate: appliedFrom || undefined,
          toDate: appliedTo || undefined,
          fromRenewalActivations: fromRenewalActivationsOnly ? true : undefined,
          page,
          pageSize: exportPageSize,
        });
        const chunk = res.data ?? [];
        collected.push(...chunk);
        hasMore = Boolean(res.hasNextPage && chunk.length > 0);
        page += 1;
        if (page > 500) break;
      }

      let sumAmount = 0;
      let sumRemaining = 0;
      for (const row of collected) {
        sumAmount += Number(row.amount) || 0;
        sumRemaining += Number(row.remainingAmount) || 0;
      }

      const headers: string[] = [
        'اسم الوكيل',
        'اسم المشترك',
        'مبلغ الدين',
        'تاريخ الدين',
        'المتبقي',
        'مجموع المتبقي',
        'مجموع الدين',
      ];
      const rows: (string | number)[][] = [headers];
      for (const row of collected) {
        const dealerFullNameCol =
          (row.dealerFullName && String(row.dealerFullName).trim()) ||
          dealersData?.find((d) => d.id === row.dealerId)?.fullName ||
          '';
        const subscriberName = (row.subscriberName ?? '').toString().trim();
        const amount = row.amount;
        const debtDate = debtDateToInput(row.debtDate) || (row.debtDate ? String(row.debtDate).split('T')[0] : '');
        const remaining = row.remainingAmount;
        rows.push([dealerFullNameCol, subscriberName, amount, debtDate, remaining, '', '']);
      }

      rows.push(['الإجمالي', '', '', '', '', sumRemaining, sumAmount]);

      const blob = createDealerDebtsExcelBlob(rows, {
        sheetName: 'ديون الوكيل',
        colWidths: [26, 26, 14, 14, 14, 16, 16],
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const safeName = (dealersData?.find((d) => d.id === dealerId)?.userName || dealerId).replace(/[^\w.-]+/g, '_');
      link.href = url;
      link.download = `dealer_debts_${safeName}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showSuccess('تم التحميل', `تم إنشاء ملف الإكسل (${collected.length} سطراً).`);
    } catch (err: unknown) {
      showError('فشل التصدير', ApiService.showError(err));
    } finally {
      setExportingExcel(false);
    }
  };

  const dealerLabel = useMemo(() => {
    const m = new Map<string, string>();
    (dealersData ?? []).forEach((d) => m.set(d.id, `${d.fullName} (${d.userName})`));
    return m;
  }, [dealersData]);

  const dealerDisplayNameForRow = useCallback(
    (row: DealerDebt) =>
      (row.dealerFullName && row.dealerFullName.trim()) || dealerLabel.get(row.dealerId) || row.dealerId,
    [dealerLabel]
  );

  const formatAmountReceipt = useCallback((n: number) => formatNumber(n, { suffix: ' د.ع' }), [formatNumber]);

  const { data: statementDebtsPage, isLoading: statementLoading } = useQuery<DealerDebtsStatementResponse>({
    queryKey: ['dealer-debts-statement', statementDealerId, scopedAgentId, statementPage],
    queryFn: () =>
      apiService.getDealerDebtsStatement({
        dealerId: statementDealerId!,
        fromRenewalActivations: true,
        agentId: scopedAgentId,
        page: statementPage,
        pageSize: statementPageSize,
      }),
    enabled: !!statementDealerId,
  });

  const { data: debtsPage, isLoading, error } = useQuery({
    queryKey: [
      'dealer-debts',
      dealerFilter,
      appliedDealerFullName,
      appliedFrom,
      appliedTo,
      fromRenewalActivationsOnly,
      scopedAgentId,
      currentPage,
      pageSize,
    ],
    queryFn: () =>
      apiService.getDealerDebts({
        dealerId: dealerFilter.trim() || undefined,
        dealerFullName: appliedDealerFullName || undefined,
        fromDate: appliedFrom || undefined,
        toDate: appliedTo || undefined,
        fromRenewalActivations: fromRenewalActivationsOnly ? true : undefined,
        agentId: scopedAgentId,
        page: currentPage,
        pageSize,
      }),
  });

  const debts = useMemo(() => debtsPage?.data ?? [], [debtsPage?.data]);
  const debtsPg = debtsPage;

  useEffect(() => {
    setSelectedDebtIds(new Set());
  }, [
    currentPage,
    dealerFilter,
    appliedDealerFullName,
    appliedFrom,
    appliedTo,
    fromRenewalActivationsOnly,
    scopedAgentId,
    pageSize,
  ]);

  useEffect(() => {
    setStatementSelectedDebtIds(new Set());
  }, [statementPage, statementDealerId]);

  useEffect(() => {
    const el = mainSelectAllRef.current;
    if (!el || debts.length === 0) return;
    const ids = debts.map((d) => d.id);
    const n = ids.filter((id) => selectedDebtIds.has(id)).length;
    el.indeterminate = n > 0 && n < ids.length;
  }, [debts, selectedDebtIds]);

  useEffect(() => {
    const el = statementSelectAllRef.current;
    const list = statementDebtsPage?.data ?? [];
    if (!el || list.length === 0) return;
    const ids = list.map((d) => d.id);
    const n = ids.filter((id) => statementSelectedDebtIds.has(id)).length;
    el.indeterminate = n > 0 && n < ids.length;
  }, [statementDebtsPage?.data, statementSelectedDebtIds]);

  const printReceiptForDebts = useCallback(
    async (rows: DealerDebt[], paymentAmountHeader: number, totalUnpaidOverride?: number) => {
      if (!rows.length) return;
      if (rows.some((r) => r.dealerId !== rows[0].dealerId)) {
        showError('سند القبض', 'يرجى اختيار سجلات لنفس الوكيل فقط.');
        return;
      }
      const totalUnpaid = totalUnpaidOverride ?? debtsPg?.totalUnpaidAmount;
      const records = rows.map((row) => {
        const rowAmt = Number(row.amount) || 0;
        const showAmt = rows.length > 1 || Math.abs(paymentAmountHeader - rowAmt) > 0.01;
        return {
          subscriberName: (row.subscriberName && row.subscriberName.trim()) || '—',
          paymentDateDisplay: paymentDateDisplayForDebt(row),
          recordAmount: showAmt ? rowAmt : undefined,
        };
      });
      const ok = await saveDealerCashReceiptPdf({
        dealerFullName: dealerDisplayNameForRow(rows[0]),
        paymentAmount: paymentAmountHeader,
        formatAmount: formatAmountReceipt,
        accountantName: (user?.fullName || user?.username || '').trim() || undefined,
        totalUnpaidAmount:
          totalUnpaid != null && Number.isFinite(Number(totalUnpaid)) ? Number(totalUnpaid) : undefined,
        records,
      });
      if (!ok) showError('حفظ PDF', 'تعذر إنشاء ملف السند. أعد المحاولة.');
    },
    [dealerDisplayNameForRow, formatAmountReceipt, debtsPg?.totalUnpaidAmount, user?.fullName, user?.username]
  );

  const printDebtRowReceipt = useCallback(
    (row: DealerDebt, totalUnpaidOverride?: number) => {
      const unpaid =
        totalUnpaidOverride != null && Number.isFinite(Number(totalUnpaidOverride))
          ? Number(totalUnpaidOverride)
          : Number(row.remainingAmount) || 0;
      void printReceiptForDebts([row], Number(row.amount) || 0, unpaid);
    },
    [printReceiptForDebts]
  );

  const toggleDebtSelect = (id: string) => {
    setSelectedDebtIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllDebtsPage = () => {
    const ids = debts.map((d) => d.id);
    const all = ids.length > 0 && ids.every((id) => selectedDebtIds.has(id));
    setSelectedDebtIds((prev) => {
      const next = new Set(prev);
      if (all) ids.forEach((i) => next.delete(i));
      else ids.forEach((i) => next.add(i));
      return next;
    });
  };

  const printSelectedDebtsFromMain = () => {
    const rows = debts.filter((d) => selectedDebtIds.has(d.id));
    if (!rows.length) {
      showError('سند القبض', 'يرجى تحديد سجل أو أكثر ثم حفظ السند.');
      return;
    }
    const total = rows.reduce((s, r) => s + (Number(r.amount) || 0), 0);
    const remainingSel = rows.reduce((s, r) => s + (Number(r.remainingAmount) || 0), 0);
    void printReceiptForDebts(rows, total, remainingSel);
  };

  const toggleStatementDebtSelect = (id: string) => {
    setStatementSelectedDebtIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleStatementSelectAllPage = () => {
    const list = statementDebtsPage?.data ?? [];
    const ids = list.map((d) => d.id);
    const all = ids.length > 0 && ids.every((id) => statementSelectedDebtIds.has(id));
    setStatementSelectedDebtIds((prev) => {
      const next = new Set(prev);
      if (all) ids.forEach((i) => next.delete(i));
      else ids.forEach((i) => next.add(i));
      return next;
    });
  };

  const printSelectedDebtsFromStatement = () => {
    const list = statementDebtsPage?.data ?? [];
    const rows = list.filter((d) => statementSelectedDebtIds.has(d.id));
    if (!rows.length) {
      showError('سند القبض', 'يرجى تحديد سجل أو أكثر ثم حفظ السند.');
      return;
    }
    const total = rows.reduce((s, r) => s + (Number(r.amount) || 0), 0);
    const remainingSel = rows.reduce((s, r) => s + (Number(r.remainingAmount) || 0), 0);
    void printReceiptForDebts(rows, total, remainingSel);
  };

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['dealer-debts'], exact: false });
    queryClient.invalidateQueries({ queryKey: ['dealer-debts-statement'], exact: false });
  };

  const openDealerStatement = (dealerId: string, label: string) => {
    setStatementSelectedDebtIds(new Set());
    setStatementDealerId(dealerId);
    setStatementDealerLabel(label);
    setStatementPage(1);
  };

  const closeDealerStatement = () => {
    setStatementDealerId(null);
    setStatementDealerLabel('');
    setStatementPage(1);
    setPayByDealerOpen(false);
    setPayByDealerForm({ amount: 0, notes: '' });
    setStatementSelectedDebtIds(new Set());
  };

  const statementTotalRemaining =
    statementDebtsPage?.groupedSummary?.totalRemainingAmount ??
    (statementDebtsPage?.data ?? []).reduce((s, d) => s + (Number(d.remainingAmount) || 0), 0);

  const payByDealerMutation = useMutation({
    mutationFn: () => {
      if (!statementDealerId) throw new Error('no dealer');
      if (payByDealerForm.amount <= 0) throw new Error('amount');
      return apiService.payDealerDebtsByDealer(
        {
          dealerId: statementDealerId,
          amount: payByDealerForm.amount,
          notes: payByDealerForm.notes.trim() || undefined,
        },
        scopedAgentId
      );
    },
    onSuccess: (res) => {
      invalidate();
      setPayByDealerOpen(false);
      setPayByDealerForm({ amount: 0, notes: '' });
      setStatementSelectedDebtIds(new Set());
      const dealerName =
        (statementDebtsPage?.groupedSummary?.dealerFullName &&
          String(statementDebtsPage.groupedSummary.dealerFullName).trim()) ||
        statementDealerLabel ||
        (statementDealerId ? dealerLabel.get(statementDealerId) : '') ||
        statementDealerId ||
        '—';
      const paid = res.paidRecords;
      const records =
        paid && paid.length > 0
          ? paid.map((r) => ({
              subscriberName: (r.subscriberName && String(r.subscriberName).trim()) || '—',
              paymentDateDisplay:
                formatDebtDateDisplayReceipt(
                  (r.paidAt && String(r.paidAt)) ||
                    (r.updatedAt && String(r.updatedAt)) ||
                    (r.debtDate && String(r.debtDate)) ||
                    ''
                ) || '—',
              recordAmount:
                r.amount != null && Number.isFinite(Number(r.amount)) ? Number(r.amount) : undefined,
            }))
          : [{ subscriberName: '—', paymentDateDisplay: '—' }];
      const remainingAfter =
        res.totalRemainingAmountAfter != null && Number.isFinite(Number(res.totalRemainingAmountAfter))
          ? Number(res.totalRemainingAmountAfter)
          : undefined;
      const applied = Number(res.amountApplied) || 0;
      const debtTotalForReceipt =
        remainingAfter != null ? applied + remainingAfter : applied;
      void (async () => {
        const saved = await saveDealerCashReceiptPdf({
          dealerFullName: dealerName,
          paymentAmount: debtTotalForReceipt,
          formatAmount: formatAmountReceipt,
          accountantName: (user?.fullName || user?.username || '').trim() || undefined,
          totalUnpaidAmount: remainingAfter,
          records,
          subtitle:
            paid && paid.length > 0
              ? undefined
              : 'تسديد إجمالي — تفاصيل المشتركين تظهر هنا عندما يُرجِعها الخادم في الاستجابة',
        });
        if (!saved) showError('حفظ PDF', 'تعذر إنشاء ملف السند. أعد المحاولة.');
      })();
      showSuccess(
        'تم التسديد',
        `المبلغ المُطبَّق: ${formatNumber(res.amountApplied, { suffix: ' د.ع' })} — المتبقي بعد التسديد: ${formatNumber(
          res.totalRemainingAmountAfter,
          { suffix: ' د.ع' }
        )}`
      );
    },
    onError: (err: unknown) => showError('خطأ', ApiService.showError(err)),
  });

  const handlePayByDealer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!statementDealerId) return;
    if (payByDealerForm.amount <= 0) {
      showError('مبلغ غير صالح', 'أدخل مبلغاً أكبر من صفر.');
      return;
    }
    if (payByDealerForm.amount > statementTotalRemaining) {
      showError('مبلغ كبير', 'لا يمكن تسديد مبلغ أكبر من إجمالي المتبقي.');
      return;
    }
    payByDealerMutation.mutate();
  };

  const createMutation = useMutation({
    mutationFn: () => {
      const body: DealerDebtCreateRequest = {
        dealerId: addForm.dealerId.trim(),
        amount: addForm.amount,
        debtDate: inputDateToIsoUtc(addForm.debtDate),
        notes: addForm.notes.trim() || undefined,
      };
      if (addForm.useCustomRemaining) {
        body.remainingAmount = addForm.remainingAmount;
      }
      return apiService.createDealerDebt(body);
    },
    onSuccess: () => {
      invalidate();
      setShowAdd(false);
      setAddForm({
        dealerId: '',
        amount: 0,
        debtDate: new Date().toISOString().slice(0, 10),
        useCustomRemaining: false,
        remainingAmount: 0,
        notes: '',
      });
      showSuccess('تم الحفظ', 'تم إضافة الدين.');
    },
    onError: (err: unknown) => showError('خطأ', ApiService.showError(err)),
  });

  const updateMutation = useMutation({
    mutationFn: () => {
      if (!editing) throw new Error('no edit');
      const body: DealerDebtUpdateRequest = {
        amount: editForm.amount,
        debtDate: inputDateToIsoUtc(editForm.debtDate),
        remainingAmount: editForm.remainingAmount,
        notes: editForm.notes.trim() || undefined,
      };
      return apiService.updateDealerDebt(editing.id, body);
    },
    onSuccess: () => {
      invalidate();
      setEditing(null);
      showSuccess('تم الحفظ', 'تم تحديث الدين.');
    },
    onError: (err: unknown) => showError('خطأ', ApiService.showError(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiService.deleteDealerDebt(id),
    onSuccess: () => {
      invalidate();
      showSuccess('تم الحذف', 'تم حذف الدين وسجلات التسديد التابعة.');
    },
    onError: (err: unknown) => showError('خطأ', ApiService.showError(err)),
  });

  const payMutation = useMutation({
    mutationFn: () => {
      if (!paying) throw new Error('no pay');
      return apiService.payDealerDebt(paying.id, {
        amount: payForm.amount,
        notes: payForm.notes?.trim() || undefined,
      });
    },
    onSuccess: (payRes) => {
      const debts = payRes.debts ?? [];
      if (debts.length > 0) {
        const debtTotal = debts.reduce((s, d) => s + (Number(d.amount) || 0), 0);
        const remTotal = debts.reduce((s, d) => s + (Number(d.remainingAmount) || 0), 0);
        void printReceiptForDebts(debts, debtTotal, remTotal);
      }
      setSelectedDebtIds(new Set());
      invalidate();
      setPaying(null);
      setPayForm({ amount: 0, notes: '' });
      showSuccess('تم التسديد', 'تم تسجيل الدفعة.');
    },
    onError: (err: unknown) => showError('خطأ', ApiService.showError(err)),
  });

  const openEdit = (d: DealerDebt) => {
    setEditing(d);
    setEditForm({
      amount: d.amount,
      debtDate: debtDateToInput(d.debtDate) || new Date().toISOString().slice(0, 10),
      remainingAmount: d.remainingAmount,
      notes: d.notes ?? '',
    });
  };

  const openPay = (d: DealerDebt) => {
    setPaying(d);
    setPayForm({ amount: 0, notes: '' });
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.dealerId.trim()) {
      showError('بيانات ناقصة', 'اختر الوكيل.');
      return;
    }
    if (addForm.amount <= 0) {
      showError('مبلغ غير صالح', 'المبلغ يجب أن يكون أكبر من صفر.');
      return;
    }
    if (addForm.useCustomRemaining && addForm.remainingAmount < 0) {
      showError('مبلغ غير صالح', 'المتبقي لا يمكن أن يكون سالباً.');
      return;
    }
    createMutation.mutate();
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (editForm.amount < 0 || editForm.remainingAmount < 0) {
      showError('مبالغ غير صالحة', 'تحقق من القيم.');
      return;
    }
    updateMutation.mutate();
  };

  const handlePay = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paying) return;
    if (payForm.amount <= 0) {
      showError('مبلغ غير صالح', 'أدخل مبلغاً أكبر من صفر.');
      return;
    }
    if (payForm.amount > paying.remainingAmount) {
      showError('مبلغ كبير', 'لا يمكن تسديد مبلغ أكبر من المتبقي.');
      return;
    }
    payMutation.mutate();
  };

  const handleDelete = async (d: DealerDebt) => {
    const ok = await confirmDelete('حذف هذا الدين وجميع تسديداته؟');
    if (ok) deleteMutation.mutate(d.id);
  };

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4 text-red-700 dark:text-red-300">
          تعذر تحميل ديون الوكلاء. تأكد من واجهة /Dealers/debts.
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2">
          <CreditCard className="h-7 w-7 text-primary-600 dark:text-primary-400" />
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">ديون الوكلاء</h1>
        </div>
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          disabled={!(dealersData?.length)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          إضافة دين
        </button>
      </div>

      <div className="mb-4 space-y-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/40 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1"> اختر الوكيل </label>
            <select
              value={dealerFilter}
              onChange={(e) => {
                setDealerFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm"
            >
              <option value="">كل الوكلاء</option>
              {(dealersData ?? []).map((d) => (
                <option key={d.id} value={d.id}>
                  {d.fullName} ({d.userName})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">اسم الوكيل</label>
            <input
              value={dealerFullNameDraft}
              onChange={(e) => setDealerFullNameDraft(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm"
              placeholder="dealerFullName"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">من تاريخ الدين</label>
            <input
              type="date"
              value={fromDraft}
              onChange={(e) => setFromDraft(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">إلى تاريخ الدين</label>
            <input
              type="date"
              value={toDraft}
              onChange={(e) => setToDraft(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm"
            />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={fromRenewalActivationsOnly}
                onChange={(e) => {
                  setFromRenewalActivationsOnly(e.target.checked);
                  setCurrentPage(1);
                }}
                className="rounded border-gray-300"
              />
              من تفعيلات لوكيل آخر فقط
            </label>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={applyDebtFilters}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium"
          >
            <Search className="h-4 w-4" />
            تطبيق الفلاتر
          </button>
          <button
            type="button"
            onClick={handleExportDealerDebtsExcel}
            disabled={!dealerFilter.trim() || exportingExcel || !(dealersData?.length)}
            title="يُحمَّل ملف Excel من استجابة GET /Dealers/debts للوكيل المحدد مع نفس الفلاتر المطبّقة"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-emerald-600/80 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 text-emerald-900 dark:text-emerald-100 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileSpreadsheet className="h-4 w-4" />
            {exportingExcel ? 'جاري الإنشاء...' : 'استيراد إكسل'}
          </button>
          {selectedDebtIds.size > 0 && (
            <button
              type="button"
              onClick={printSelectedDebtsFromMain}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-violet-600/90 bg-violet-50 hover:bg-violet-100 dark:bg-violet-950/50 dark:hover:bg-violet-900/40 text-violet-900 dark:text-violet-100 text-sm font-medium"
              title="حفظ سند قبض PDF لجميع السجلات المحددة في الصفحة"
            >
              <Printer className="h-4 w-4" />
              سند القبض ({selectedDebtIds.size})
            </button>
          )}
        </div>
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        إدارة ديون وكلاء المناطق. يمكن عرض ديون ناشئة عن تفعيل مشترك لصالح وكيل آخر، وتسديدها من هنا.
      </p>

      <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3.5">
        <GlassSummaryCard title="إجمالي الدين المسدد (تفعيلات لوكيل آخر)" variant="emerald">
          {formatNumber(debtsPg?.totalPaidAmount ?? 0, { suffix: ' د.ع' })}
        </GlassSummaryCard>
        <GlassSummaryCard title="إجمالي الدين غير المسدد (تفعيلات لوكيل آخر)" variant="rose">
          {formatNumber(debtsPg?.totalUnpaidAmount ?? 0, { suffix: ' د.ع' })}
        </GlassSummaryCard>
      </div>

      {isLoading ? (
        <WifiLoaderComponent />
      ) : debts.length === 0 ? (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-8 text-center text-gray-600 dark:text-gray-400">
          لا توجد ديون مطابقة للتصفية.
        </div>
      ) : (
        <div className="wakeel-table-scroll rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="min-w-full text-right text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/80">
              <tr>
                <th className="px-2 py-3 w-10 text-center">
                  <input
                    ref={mainSelectAllRef}
                    type="checkbox"
                    checked={debts.length > 0 && debts.every((d) => selectedDebtIds.has(d.id))}
                    onChange={toggleSelectAllDebtsPage}
                    className="rounded border-gray-300 dark:border-gray-600"
                    title="تحديد كل السجلات في الصفحة"
                    aria-label="تحديد الكل في الصفحة"
                  />
                </th>
                <th className="px-3 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">الوكيل</th>
                <th className="px-3 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">المبلغ الكلي</th>
                <th className="px-3 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">تاريخ الدين</th>
                <th className="px-3 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">الاستحقاق</th>
                <th className="px-3 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">المشترك</th>
                <th className="px-3 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">التجديد</th>
                <th className="px-3 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">المتبقي</th>
                <th className="px-3 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">ملاحظات</th>
                <th className="px-3 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 w-52">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {debts.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                  <td className="px-2 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={selectedDebtIds.has(row.id)}
                      onChange={() => toggleDebtSelect(row.id)}
                      className="rounded border-gray-300 dark:border-gray-600"
                      aria-label="تحديد السجل لسند القبض"
                    />
                  </td>
                  <td className="px-3 py-3 text-gray-900 dark:text-white font-medium">
                    {dealerLabel.get(row.dealerId) ?? row.dealerId}
                  </td>
                  <td className="px-3 py-3 font-mono" dir="ltr">
                    {formatNumber(row.amount)}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-gray-600 dark:text-gray-400">
                    {row.debtDate
                      ? new Date(row.debtDate).toLocaleDateString('ar-IQ', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                        })
                      : '—'}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-gray-600 dark:text-gray-400 text-xs">
                    {row.dueDate
                      ? new Date(row.dueDate).toLocaleDateString('ar-IQ', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                        })
                      : '—'}
                  </td>
                  <td className="px-3 py-3 max-w-[140px] truncate text-gray-700 dark:text-gray-300 text-sm" title={row.subscriberName ?? ''}>
                    {row.subscriberName?.trim() || '—'}
                  </td>
                  <td className="px-3 py-3 font-mono text-[11px] text-gray-500 dark:text-gray-400 max-w-[100px] truncate" dir="ltr" title={row.renewalId ?? ''}>
                    {row.renewalId || '—'}
                  </td>
                  <td className="px-3 py-3 font-mono font-semibold text-amber-700 dark:text-amber-300" dir="ltr">
                    {formatNumber(row.remainingAmount)}
                  </td>
                  <td className="px-3 py-3 max-w-[200px] truncate text-gray-600 dark:text-gray-400" title={row.notes ?? ''}>
                    {row.notes || '—'}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap justify-end gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          openDealerStatement(row.dealerId, dealerLabel.get(row.dealerId) ?? row.dealerId)
                        }
                        className="p-2 rounded-lg hover:bg-sky-50 dark:hover:bg-sky-900/20 text-sky-600 dark:text-sky-400"
                        title="كشف حساب الوكيل (تفعيلات لوكيل آخر)"
                      >
                        <ScrollText className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => printDebtRowReceipt(row)}
                        className="p-2 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-900/25 text-violet-600 dark:text-violet-400"
                        title="سند قبض — حفظ PDF"
                      >
                        <Printer className="h-4 w-4" />
                      </button>
                      {row.remainingAmount > 0 && (
                        <button
                          type="button"
                          onClick={() => openPay(row)}
                          className="p-2 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400"
                          title="تسديد"
                        >
                          <Banknote className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => openEdit(row)}
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-primary-600"
                        title="تعديل"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(row)}
                        className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600"
                        title="حذف"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!isLoading && debtsPg && debtsPg.totalItems > 0 && (
        <Pagination
          currentPage={debtsPg.currentPage}
          totalPages={debtsPg.totalPages}
          totalItems={debtsPg.totalItems}
          pageSize={debtsPg.pageSize}
          hasNextPage={debtsPg.hasNextPage}
          hasPreviousPage={debtsPg.hasPreviousPage}
          onPageChange={setCurrentPage}
          className="rounded-b-lg"
        />
      )}

      {statementDealerId && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="dealer-statement-title"
        >
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-gray-200 dark:border-gray-700 shrink-0">
              <h2 id="dealer-statement-title" className="text-lg font-bold text-gray-900 dark:text-white truncate pr-2">
                كشف حساب الوكيل — {statementDealerLabel}
              </h2>
              <div className="flex items-center gap-2 shrink-0">
                {statementSelectedDebtIds.size > 0 && (
                  <button
                    type="button"
                    onClick={printSelectedDebtsFromStatement}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-violet-600/90 bg-violet-50 hover:bg-violet-100 dark:bg-violet-950/50 dark:hover:bg-violet-900/40 text-violet-900 dark:text-violet-100 text-sm font-medium"
                    title="حفظ سند قبض PDF بجميع السجلات المحددة"
                  >
                    <Printer className="h-4 w-4" />
                    سند القبض ({statementSelectedDebtIds.size})
                  </button>
                )}
                {statementTotalRemaining > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setPayByDealerOpen((v) => !v);
                      setPayByDealerForm({ amount: 0, notes: '' });
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium"
                  >
                    <Banknote className="h-4 w-4" />
                    تسديد على إجمالي الدين
                  </button>
                )}
                <button
                  type="button"
                  onClick={closeDealerStatement}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
                  aria-label="إغلاق"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <p className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700/80">
              سجلات الديون الناشئة من تفعيلات «لوكيل آخر» لهذا الوكيل فقط (جلب مجمّع من واجهة GET /Dealers/debts?groupByDealer=true).
            </p>
            {!statementLoading && statementDebtsPage?.groupedSummary && (
              <div className="px-4 py-3 grid grid-cols-1 sm:grid-cols-3 gap-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50/90 dark:bg-gray-900/40">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">إجمالي المبلغ</p>
                  <p className="font-mono font-semibold text-gray-900 dark:text-white" dir="ltr">
                    {formatNumber(statementDebtsPage.groupedSummary.totalAmount, { suffix: ' د.ع' })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">إجمالي المتبقي</p>
                  <p className="font-mono font-semibold text-amber-700 dark:text-amber-300" dir="ltr">
                    {formatNumber(statementDebtsPage.groupedSummary.totalRemainingAmount, { suffix: ' د.ع' })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">عدد سجلات الدين</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    {statementDebtsPage.groupedSummary.debtRecordCount.toLocaleString('ar-IQ')}
                  </p>
                </div>
              </div>
            )}
            {payByDealerOpen && (
              <div className="px-4 py-3 border-b border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/60 dark:bg-emerald-950/30">
                <form onSubmit={handlePayByDealer} className="flex flex-col sm:flex-row sm:flex-wrap sm:items-end gap-3">
                  <div className="flex-1 min-w-[140px]">
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      مبلغ التسديد (الحد الأقصى: {formatNumber(statementTotalRemaining)})
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={statementTotalRemaining}
                      step={1}
                      required
                      value={payByDealerForm.amount || ''}
                      onChange={(e) =>
                        setPayByDealerForm((f) => ({ ...f, amount: Number(e.target.value) || 0 }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm"
                    />
                  </div>
                  <div className="flex-1 min-w-[160px]">
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">ملاحظات (اختياري)</label>
                    <input
                      value={payByDealerForm.notes}
                      onChange={(e) => setPayByDealerForm((f) => ({ ...f, notes: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setPayByDealerOpen(false);
                        setPayByDealerForm({ amount: 0, notes: '' });
                      }}
                      className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-300"
                    >
                      إلغاء
                    </button>
                    <button
                      type="submit"
                      disabled={payByDealerMutation.isPending || statementTotalRemaining <= 0}
                      className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium disabled:opacity-50"
                    >
                      {payByDealerMutation.isPending ? 'جاري التسديد...' : 'تأكيد التسديد'}
                    </button>
                  </div>
                </form>
              </div>
            )}
            <div className="flex-1 min-h-0 overflow-auto p-4">
              {statementLoading ? (
                <WifiLoaderComponent />
              ) : (
                <div className="wakeel-table-scroll rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <table className="min-w-full text-right text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-800/80 sticky top-0">
                      <tr>
                        <th className="px-1 py-2 w-9 text-center">
                          <input
                            ref={statementSelectAllRef}
                            type="checkbox"
                            checked={
                              (statementDebtsPage?.data ?? []).length > 0 &&
                              (statementDebtsPage?.data ?? []).every((d) => statementSelectedDebtIds.has(d.id))
                            }
                            onChange={toggleStatementSelectAllPage}
                            className="rounded border-gray-300 dark:border-gray-600"
                            title="تحديد كل السجلات في الصفحة"
                            aria-label="تحديد الكل في الصفحة"
                          />
                        </th>
                        <th className="px-2 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">المبلغ الكلي</th>
                        <th className="px-2 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">تاريخ الدين</th>
                        <th className="px-2 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">الاستحقاق</th>
                        <th className="px-2 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">المشترك</th>
                        <th className="px-2 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">التجديد</th>
                        <th className="px-2 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">المتبقي</th>
                        <th className="px-2 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">ملاحظات</th>
                        <th className="px-2 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 w-40">إجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {(statementDebtsPage?.data ?? []).length === 0 ? (
                        <tr>
                          <td colSpan={9} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                            لا توجد سجلات مطابقة.
                          </td>
                        </tr>
                      ) : (
                        (statementDebtsPage?.data ?? []).map((row) => (
                          <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                            <td className="px-1 py-2 text-center">
                              <input
                                type="checkbox"
                                checked={statementSelectedDebtIds.has(row.id)}
                                onChange={() => toggleStatementDebtSelect(row.id)}
                                className="rounded border-gray-300 dark:border-gray-600"
                                aria-label="تحديد السجل لسند القبض"
                              />
                            </td>
                            <td className="px-2 py-2 font-mono" dir="ltr">
                              {formatNumber(row.amount)}
                            </td>
                            <td className="px-2 py-2 whitespace-nowrap text-gray-600 dark:text-gray-400 text-xs">
                              {row.debtDate
                                ? new Date(row.debtDate).toLocaleDateString('ar-IQ', {
                                    year: 'numeric',
                                    month: '2-digit',
                                    day: '2-digit',
                                  })
                                : '—'}
                            </td>
                            <td className="px-2 py-2 whitespace-nowrap text-gray-600 dark:text-gray-400 text-xs">
                              {row.dueDate
                                ? new Date(row.dueDate).toLocaleDateString('ar-IQ', {
                                    year: 'numeric',
                                    month: '2-digit',
                                    day: '2-digit',
                                  })
                                : '—'}
                            </td>
                            <td className="px-2 py-2 max-w-[120px] truncate text-sm" title={row.subscriberName ?? ''}>
                              {row.subscriberName?.trim() || '—'}
                            </td>
                            <td className="px-2 py-2 font-mono text-[11px] text-gray-500 max-w-[90px] truncate" dir="ltr">
                              {row.renewalId || '—'}
                            </td>
                            <td className="px-2 py-2 font-mono font-semibold text-amber-700 dark:text-amber-300" dir="ltr">
                              {formatNumber(row.remainingAmount)}
                            </td>
                            <td className="px-2 py-2 max-w-[140px] truncate text-xs text-gray-600" title={row.notes ?? ''}>
                              {row.notes || '—'}
                            </td>
                            <td className="px-2 py-2">
                              <div className="flex flex-wrap justify-end gap-0.5">
                                <button
                                  type="button"
                                  onClick={() =>
                                    printDebtRowReceipt(row)
                                  }
                                  className="p-1.5 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-900/25 text-violet-600"
                                  title="سند قبض — حفظ PDF"
                                >
                                  <Printer className="h-4 w-4" />
                                </button>
                                {row.remainingAmount > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => openPay(row)}
                                    className="p-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-emerald-600"
                                    title="تسديد"
                                  >
                                    <Banknote className="h-4 w-4" />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => openEdit(row)}
                                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-primary-600"
                                  title="تعديل"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDelete(row)}
                                  className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600"
                                  title="حذف"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            {statementDebtsPage && statementDebtsPage.totalItems > 0 && (
              <div className="border-t border-gray-200 dark:border-gray-700 px-2 py-2 shrink-0">
                <Pagination
                  currentPage={statementDebtsPage.currentPage}
                  totalPages={statementDebtsPage.totalPages}
                  totalItems={statementDebtsPage.totalItems}
                  pageSize={statementDebtsPage.pageSize}
                  hasNextPage={statementDebtsPage.hasNextPage}
                  hasPreviousPage={statementDebtsPage.hasPreviousPage}
                  onPageChange={setStatementPage}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50" role="dialog" aria-modal="true">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">إضافة دين</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الوكيل</label>
                <select
                  required
                  value={addForm.dealerId}
                  onChange={(e) => setAddForm((f) => ({ ...f, dealerId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                >
                  <option value="">— اختر —</option>
                  {(dealersData ?? []).map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.fullName} ({d.userName})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">المبلغ (amount)</label>
                <input
                  type="number"
                  min={1}
                  step={1}
                  required
                  value={addForm.amount || ''}
                  onChange={(e) => setAddForm((f) => ({ ...f, amount: Number(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">تاريخ الدين</label>
                <input
                  type="date"
                  required
                  value={addForm.debtDate}
                  onChange={(e) => setAddForm((f) => ({ ...f, debtDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="customRem"
                  type="checkbox"
                  checked={addForm.useCustomRemaining}
                  onChange={(e) => setAddForm((f) => ({ ...f, useCustomRemaining: e.target.checked }))}
                  className="rounded border-gray-300"
                />
                <label htmlFor="customRem" className="text-sm text-gray-700 dark:text-gray-300">
                  تحديد المتبقي يدوياً (افتراضي الخادم = المبلغ)
                </label>
              </div>
              {addForm.useCustomRemaining && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">المتبقي (remainingAmount)</label>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={addForm.remainingAmount}
                    onChange={(e) => setAddForm((f) => ({ ...f, remainingAmount: Number(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ملاحظات</label>
                <textarea
                  value={addForm.notes}
                  onChange={(e) => setAddForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white disabled:opacity-50"
                >
                  {createMutation.isPending ? 'جاري الحفظ...' : 'حفظ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50" role="dialog" aria-modal="true">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">تعديل دين</h2>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">المبلغ الأصلي</label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  required
                  value={editForm.amount}
                  onChange={(e) => setEditForm((f) => ({ ...f, amount: Number(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">تاريخ الدين</label>
                <input
                  type="date"
                  required
                  value={editForm.debtDate}
                  onChange={(e) => setEditForm((f) => ({ ...f, debtDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">المتبقي</label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  required
                  value={editForm.remainingAmount}
                  onChange={(e) => setEditForm((f) => ({ ...f, remainingAmount: Number(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ملاحظات</label>
                <textarea
                  value={editForm.notes}
                  onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white disabled:opacity-50"
                >
                  {updateMutation.isPending ? 'جاري الحفظ...' : 'حفظ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {paying && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50" role="dialog" aria-modal="true">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">تسديد جزء من الدين</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              المتبقي الحالي:{' '}
              <span className="font-mono font-semibold text-amber-600">{paying.remainingAmount.toLocaleString('ar-IQ')}</span> د.ع
            </p>
            <form onSubmit={handlePay} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">مبلغ التسديد</label>
                <input
                  type="number"
                  min={1}
                  max={paying.remainingAmount}
                  step={1}
                  required
                  value={payForm.amount || ''}
                  onChange={(e) => setPayForm((f) => ({ ...f, amount: Number(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ملاحظات (اختياري)</label>
                <input
                  value={payForm.notes ?? ''}
                  onChange={(e) => setPayForm((f) => ({ ...f, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setPaying(null);
                    setPayForm({ amount: 0, notes: '' });
                  }}
                  className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={payMutation.isPending || paying.remainingAmount <= 0}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
                >
                  {payMutation.isPending ? 'جاري التسديد...' : 'تسديد'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DealerDebtsPage;
