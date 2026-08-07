import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, Filter, Pencil, RefreshCw, Save, Trash2, X } from 'lucide-react';
import Pagination from '../components/Pagination';
import { useAuth } from '../contexts/AuthContext';
import { useDigits } from '../contexts/DigitsContext';
import { apiService, ApiService } from '../services/api';
import {
  AgentReseller,
  FiberxCashbackAppSubscriptionRow,
  FiberxCashbackSubscriberAccount,
  UserRole,
} from '../types';
import { createXlsxBlob } from '../utils/excelExport';
import { showError, showSuccess } from '../utils/notifications';

function formatBaghdadDate(value: string | null | undefined): string {
  const text = (value ?? '').toString().trim();
  if (!text) return '—';
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('ar-IQ', {
    timeZone: 'Asia/Baghdad',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatAppPaymentMethod(raw?: string | null): string {
  if (raw == null || String(raw).trim() === '') return '—';
  const v = String(raw).trim();
  const lower = v.toLowerCase();
  if (lower === 'card') return 'بطاقة دفع';
  if (lower === 'wallet') return 'محفظة الرصيد';
  if (lower === 'direct payment' || lower === 'directpayment') return 'الدفع المباشر';
  if (lower === 'user_credit') return 'بطاقة ائتمان المشترك';
  return v;
}

function paymentMethodFromTitle(title: string | null | undefined): string {
  const text = (title ?? '').toString().trim();
  if (!text) return '—';
  const packageMatch = text.match(/purchasing profile\s+(.+?)\s+from Mobile App using/i);
  const packageName = packageMatch?.[1]?.trim() || '';

  if (/using\s+Direct Payment/i.test(text)) {
    return packageName ? `الدفع المباشر - ${packageName}` : 'الدفع المباشر';
  }
  if (/using\s+Wallet/i.test(text)) {
    return packageName ? `محفظة - ${packageName}` : 'محفظة';
  }
  return packageName || text;
}

function resolveAppSubscriptionPaymentMethod(row: FiberxCashbackAppSubscriptionRow): string {
  const isMobileActivation =
    row.isMobile === true && (row.apiKeyName ?? '').toString().trim() === 'MobileActivationsAPI';
  if (isMobileActivation) {
    const fromField = formatAppPaymentMethod(row.paymentMethod);
    if (fromField !== '—') return fromField;
  }
  return paymentMethodFromTitle(row.title);
}

function regionBadgeClass(seed: string): string {
  const palettes = [
    'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200',
    'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
    'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
    'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200',
    'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200',
    'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-200',
  ];
  const value = (seed || '').trim();
  if (!value) return palettes[0];
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return palettes[hash % palettes.length];
}

const AppSubscribersAccountsPage: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const { formatNumber } = useDigits();
  const queryClient = useQueryClient();
  const [selectedResellerId, setSelectedResellerId] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [recordModalOpen, setRecordModalOpen] = useState(false);
  const [sourceCreatedAtDateFilter, setSourceCreatedAtDateFilter] = useState('');
  const [pendingSourceRowKeys, setPendingSourceRowKeys] = useState<Set<string>>(new Set());
  const [savedSourceRowKeys, setSavedSourceRowKeys] = useState<Set<string>>(new Set());
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [recordForm, setRecordForm] = useState({ username: '', amount: '', resellerId: '' });
  const [filters, setFilters] = useState({ fromDate: '', toDate: '', username: '', resellerId: '' });
  const [draftFilters, setDraftFilters] = useState({ fromDate: '', toDate: '', username: '', resellerId: '' });
  const [page, setPage] = useState(1);
  const [refreshTick, setRefreshTick] = useState(0);
  const perPage = 10;

  const { data: myResellers = [] } = useQuery<AgentReseller[]>({
    queryKey: ['myResellers', 'app-cashback-subscribers'],
    queryFn: () => apiService.getMyResellers(),
    enabled:
      isAuthenticated &&
      (user?.role === UserRole.Agent || user?.role === UserRole.SubAgent || user?.role === UserRole.Employee),
    staleTime: 60_000,
  });

  const effectiveResellerId = useMemo(() => {
    if (selectedResellerId.trim()) return selectedResellerId.trim();
    if (myResellers.length > 0) return myResellers[0].id;
    return '';
  }, [myResellers, selectedResellerId]);

  const {
    data: cashbackData,
    isFetching,
    error,
  } = useQuery({
    queryKey: ['fiberx-app-cashback-subscribers', effectiveResellerId, page, refreshTick],
    queryFn: () =>
      apiService.getFiberxCashbackAppSubscriptions({
        resellerId: effectiveResellerId,
        page,
        perPage,
        serviceType: 'MobileCashBack',
      }),
    enabled: isModalOpen && !!effectiveResellerId,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const rows = useMemo(() => cashbackData?.data ?? [], [cashbackData?.data]);
  const filteredSourceRows = useMemo(() => {
    if (!sourceCreatedAtDateFilter) return rows;
    return rows.filter((row) => {
      const raw = (row.createdAt ?? '').toString().trim();
      if (!raw) return false;
      const date = new Date(raw);
      if (Number.isNaN(date.getTime())) return false;
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}` === sourceCreatedAtDateFilter;
    });
  }, [rows, sourceCreatedAtDateFilter]);
  const sourcePackageName = 'باقة فايبر اكس';
  const resellerNameMap = useMemo(() => {
    const map = new Map<string, string>();
    myResellers.forEach((r) => map.set(r.id, r.name));
    return map;
  }, [myResellers]);

  const {
    data: recordsData,
    isFetching: isRecordsLoading,
    error: recordsError,
  } = useQuery({
    queryKey: ['fiberx-cashback-subscriber-accounts', filters, refreshTick],
    queryFn: () =>
      apiService.getFiberxCashbackSubscriberAccounts({
        fromDate: filters.fromDate || undefined,
        toDate: filters.toDate || undefined,
        username: filters.username || undefined,
        resellerId: filters.resellerId || undefined,
      }),
    enabled: isAuthenticated,
  });

  const records = recordsData?.items ?? [];
  const totalAmount = Number(recordsData?.statistics?.totalAmount ?? recordsData?.totalAmount ?? 0);

  const createRecordMutation = useMutation({
    mutationFn: (payload: { resellerId: string; username: string; amount: number }) =>
      apiService.createFiberxCashbackSubscriberAccount(payload),
    onSuccess: () => {
      showSuccess('حفظ الربح', 'تم حفظ الربح بنجاح.');
      closeRecordModal();
      queryClient.invalidateQueries({ queryKey: ['fiberx-cashback-subscriber-accounts'] });
    },
    onError: (error) => showError('حفظ الربح', ApiService.showError(error)),
  });

  const updateRecordMutation = useMutation({
    mutationFn: (args: { id: string; payload: { resellerId: string; username: string; amount: number } }) =>
      apiService.updateFiberxCashbackSubscriberAccount(args.id, args.payload),
    onSuccess: () => {
      showSuccess('تعديل السجل', 'تم تعديل السجل بنجاح.');
      closeRecordModal();
      queryClient.invalidateQueries({ queryKey: ['fiberx-cashback-subscriber-accounts'] });
    },
    onError: (error) => showError('تعديل السجل', ApiService.showError(error)),
  });

  const deleteRecordMutation = useMutation({
    mutationFn: (id: string) => apiService.deleteFiberxCashbackSubscriberAccount(id),
    onSuccess: () => {
      showSuccess('حذف السجل', 'تم حذف السجل بنجاح.');
      queryClient.invalidateQueries({ queryKey: ['fiberx-cashback-subscriber-accounts'] });
    },
    onError: (error) => showError('حذف السجل', ApiService.showError(error)),
  });

  const openAndRefresh = () => {
    if (!effectiveResellerId) {
      showError('تحديث البيانات', 'يرجى اختيار رسيلر أولاً.');
      return;
    }
    setPage(1);
    setIsModalOpen(true);
    setPendingSourceRowKeys(new Set());
    setSavedSourceRowKeys(new Set());
    setRefreshTick((v) => v + 1);
  };

  const handleSaveExcel = () => {
    if (filteredSourceRows.length === 0) {
      showError('حفظ Excel', 'لا توجد بيانات في الجدول حالياً.');
      return;
    }
    const aoa: (string | number)[][] = [
      ['اسم المشترك', 'طريقة الدفع', 'التاريخ', 'مبلغ الربح'],
      ...filteredSourceRows.map((row) => [
        (row.username ?? '').toString().trim() || '—',
        resolveAppSubscriptionPaymentMethod(row),
        formatBaghdadDate(row.createdAt),
        Number.isFinite(Number(row.amount)) ? Number(row.amount) : 0,
      ]),
    ];
    const blob = createXlsxBlob(aoa, 'حسابات_مشتركين_التطبيق', {
      alignCenter: true,
      colWidths: [24, 52, 24, 16],
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `حسابات_مشتركين_التطبيق_${new Date().toISOString().slice(0, 10)}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
    showSuccess('حفظ Excel', 'تم حفظ الملف بنجاح.');
  };

  const closeRecordModal = () => {
    setRecordModalOpen(false);
    setEditingRecordId(null);
    setRecordForm({ username: '', amount: '', resellerId: effectiveResellerId || '' });
  };

  const quickSaveFromSource = (row: FiberxCashbackAppSubscriptionRow) => {
    const rowKey = String(row.id ?? `${row.username ?? ''}-${row.createdAt ?? ''}-${row.amount ?? ''}`);
    if (savedSourceRowKeys.has(rowKey) || pendingSourceRowKeys.has(rowKey)) return;
    const resellerId = effectiveResellerId.trim();
    const username = (row.username ?? '').toString().trim();
    const amount = Number(row.amount);
    if (!resellerId) {
      showError('حفظ الربح', 'يرجى اختيار الرسيلر أولاً.');
      return;
    }
    if (!username) {
      showError('حفظ الربح', 'لا يمكن حفظ سجل بدون Username.');
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      showError('حفظ الربح', 'قيمة Amount غير صالحة للحفظ.');
      return;
    }
    setPendingSourceRowKeys((prev) => {
      const next = new Set(prev);
      next.add(rowKey);
      return next;
    });
    createRecordMutation.mutate(
      { resellerId, username, amount },
      {
        onSuccess: () => {
          setSavedSourceRowKeys((prev) => {
            const next = new Set(prev);
            next.add(rowKey);
            return next;
          });
          setPendingSourceRowKeys((prev) => {
            const next = new Set(prev);
            next.delete(rowKey);
            return next;
          });
        },
        onError: () => {
          setPendingSourceRowKeys((prev) => {
            const next = new Set(prev);
            next.delete(rowKey);
            return next;
          });
        },
      }
    );
  };

  const openEditRecord = (record: FiberxCashbackSubscriberAccount) => {
    setEditingRecordId(record.id);
    setRecordForm({
      username: (record.username ?? '').toString().trim(),
      amount: String(Number(record.amount) || 0),
      resellerId: record.resellerId || record.agentResellerId || effectiveResellerId || '',
    });
    setRecordModalOpen(true);
  };

  const submitRecord = () => {
    const username = recordForm.username.trim();
    const amount = Number(recordForm.amount);
    const resellerId = (recordForm.resellerId || effectiveResellerId).trim();
    if (!username) {
      showError('حفظ الربح', 'يرجى إدخال Username.');
      return;
    }
    if (!resellerId) {
      showError('حفظ الربح', 'يرجى اختيار الرسيلر.');
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      showError('حفظ الربح', 'يرجى إدخال مبلغ ربح صحيح أكبر من صفر.');
      return;
    }
    const payload = { resellerId, username, amount };
    if (editingRecordId) {
      updateRecordMutation.mutate({ id: editingRecordId, payload });
    } else {
      createRecordMutation.mutate(payload);
    }
  };

  const removeRecord = (record: FiberxCashbackSubscriberAccount) => {
    if (!window.confirm(`هل تريد حذف سجل المشترك "${record.username}"؟`)) return;
    deleteRecordMutation.mutate(record.id);
  };

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">حسابات مشتركين التطبيق</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">حسابات و ارباح اشتراكات التفعيل من جانب المشترك عبر التطبيق</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedResellerId}
            onChange={(e) => setSelectedResellerId(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white text-sm min-w-[220px]"
          >
            {myResellers.length === 0 ? (
              <option value="">لا توجد رسيلرات</option>
            ) : (
              <>
                <option value="">اختر المنطقة</option>
                {myResellers.map((reseller) => (
                  <option key={reseller.id} value={reseller.id}>
                    {reseller.name}
                  </option>
                ))}
              </>
            )}
          </select>
          <button
            type="button"
            onClick={openAndRefresh}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md text-sm"
          >
            <RefreshCw className="h-4 w-4" />
            تحديث البيانات
          </button>
          <button
            type="button"
            onClick={() => setShowAdvancedFilters(true)}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-700 dark:text-gray-200"
          >
            <Filter className="h-4 w-4" />
            فلاتر متقدمة
          </button>
        </div>
      </div>

      <div className="mb-4 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-900/20 p-4">
        <p className="text-sm text-gray-600 dark:text-gray-300">إجمالي الأرباح</p>
        <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 tabular-nums">
          {formatNumber(Number.isFinite(totalAmount) ? totalAmount : 0, { suffix: ' د.ع' })}
        </p>
      </div>

      <div className="wakeel-table-scroll rounded-lg border border-gray-200 dark:border-gray-700 mb-8">
        <table className="min-w-full text-right">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/30">
              <th className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400"> المشترك</th>
              <th className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">الربح </th>
              <th className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">المنطقة </th>
              <th className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400"> التاريخ</th>
              <th className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">الباقة</th>
              <th className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {recordsError ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-sm text-red-600 dark:text-red-400 text-center">
                  {ApiService.showError(recordsError)}
                </td>
              </tr>
            ) : isRecordsLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-sm text-gray-500 dark:text-gray-400 text-center">
                  جاري تحميل السجلات...
                </td>
              </tr>
            ) : records.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-sm text-gray-500 dark:text-gray-400 text-center">
                  لا توجد سجلات مطابقة للفلاتر.
                </td>
              </tr>
            ) : (
              records.map((record) => (
                <tr key={record.id} className="border-b border-gray-100 dark:border-gray-700/80">
                  <td className="px-3 py-2 text-sm text-gray-900 dark:text-white">{record.username || '—'}</td>
                  <td className="px-3 py-2 text-sm text-gray-900 dark:text-white tabular-nums">
                    {formatNumber(Number(record.amount) || 0, { suffix: ' د.ع' })}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-900 dark:text-white">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${regionBadgeClass(
                        (record.resellerId || record.agentResellerId || '').toString()
                      )}`}
                    >
                      {record.resellerName ||
                        resellerNameMap.get(record.resellerId || record.agentResellerId || '') ||
                        record.resellerId ||
                        record.agentResellerId ||
                        '—'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-900 dark:text-white tabular-nums">
                    {formatBaghdadDate(record.createdAt)}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-900 dark:text-white">{sourcePackageName}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEditRecord(record)}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md border border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        تعديل
                      </button>
                      <button
                        type="button"
                        onClick={() => removeRecord(record)}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        حذف
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" role="dialog" aria-modal="true">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">حسابات مشتركين التطبيق</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  الصفحة {cashbackData?.pagination.currentPage ?? page} من {cashbackData?.pagination.lastPage ?? 1}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={sourceCreatedAtDateFilter}
                    onChange={(e) => setSourceCreatedAtDateFilter(e.target.value)}
                    className="px-2.5 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm"
                    title="فلترة حسب تاريخ CreatedAt"
                  />
                  {sourceCreatedAtDateFilter && (
                    <button
                      type="button"
                      onClick={() => setSourceCreatedAtDateFilter('')}
                      className="px-2 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-xs text-gray-700 dark:text-gray-200"
                    >
                      مسح التاريخ
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleSaveExcel}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm"
                >
                  <Download className="h-4 w-4" />
                  حفظ اكسل
                </button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                  aria-label="إغلاق"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="p-4 overflow-auto">
              {error ? (
                <div className="text-sm text-red-600 dark:text-red-400">
                  {ApiService.showError(error)}
                </div>
              ) : (
                <>
                  <div className="wakeel-table-scroll rounded-lg border border-gray-200 dark:border-gray-700">
                    <table className="min-w-full text-right">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/30">
                          <th className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">اسم المشترك</th>
                          <th className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">طريقة الدفع</th>
                          <th className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">التاريخ</th>
                          <th className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">مبلغ الربح</th>
                          <th className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">إجراء</th>
                        </tr>
                      </thead>
                      <tbody>
                        {isFetching ? (
                          <tr>
                            <td colSpan={5} className="px-4 py-8 text-sm text-gray-500 dark:text-gray-400 text-center">
                              جاري تحميل البيانات...
                            </td>
                          </tr>
                        ) : filteredSourceRows.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-4 py-8 text-sm text-gray-500 dark:text-gray-400 text-center">
                              لا توجد بيانات مطابقة لتاريخ الفلترة.
                            </td>
                          </tr>
                        ) : (
                          filteredSourceRows.map((row) => {
                            const rowKey = String(row.id ?? `${row.username ?? ''}-${row.createdAt ?? ''}-${row.amount ?? ''}`);
                            const isRowPending = pendingSourceRowKeys.has(rowKey);
                            const isRowSaved = savedSourceRowKeys.has(rowKey);
                            return (
                            <tr
                              key={row.id}
                              className={`border-b border-gray-100 dark:border-gray-700/80 ${
                                isRowSaved ? 'bg-emerald-50/70 dark:bg-emerald-900/20 opacity-70' : ''
                              }`}
                            >
                              <td className="px-3 py-2 text-sm text-gray-900 dark:text-white">
                                {(row.username ?? '').toString().trim() || '—'}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-900 dark:text-white">
                                {resolveAppSubscriptionPaymentMethod(row)}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-900 dark:text-white tabular-nums">
                                {formatBaghdadDate(row.createdAt)}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-900 dark:text-white tabular-nums">
                                {formatNumber(Number(row.amount) || 0, { suffix: ' د.ع' })}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-900 dark:text-white">
                                <button
                                  type="button"
                                  onClick={() => quickSaveFromSource(row)}
                                  disabled={isRowPending || isRowSaved}
                                  className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 disabled:opacity-60"
                                >
                                  <Save className="h-3.5 w-3.5" />
                                  {isRowSaved ? 'تم الحفظ' : isRowPending ? 'جاري الحفظ...' : 'حفظ الربح'}
                                </button>
                              </td>
                            </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                  {(cashbackData?.pagination.total ?? 0) > 0 && (
                    <Pagination
                      currentPage={cashbackData?.pagination.currentPage ?? 1}
                      totalPages={cashbackData?.pagination.lastPage ?? 1}
                      totalItems={cashbackData?.pagination.total ?? 0}
                      pageSize={cashbackData?.pagination.perPage ?? perPage}
                      hasNextPage={(cashbackData?.pagination.currentPage ?? 1) < (cashbackData?.pagination.lastPage ?? 1)}
                      hasPreviousPage={(cashbackData?.pagination.currentPage ?? 1) > 1}
                      onPageChange={setPage}
                    />
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {showAdvancedFilters && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" role="dialog" aria-modal="true">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-xl">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">فلاتر متقدمة</h3>
              <button
                type="button"
                onClick={() => setShowAdvancedFilters(false)}
                className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                aria-label="إغلاق"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="text-sm text-gray-700 dark:text-gray-200">
                من تاريخ
                <input
                  type="date"
                  value={draftFilters.fromDate}
                  onChange={(e) => setDraftFilters((v) => ({ ...v, fromDate: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                />
              </label>
              <label className="text-sm text-gray-700 dark:text-gray-200">
                إلى تاريخ
                <input
                  type="date"
                  value={draftFilters.toDate}
                  onChange={(e) => setDraftFilters((v) => ({ ...v, toDate: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                />
              </label>
              <label className="text-sm text-gray-700 dark:text-gray-200">
                المشترك 
                <input
                  type="text"
                  value={draftFilters.username}
                  onChange={(e) => setDraftFilters((v) => ({ ...v, username: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                />
              </label>
              <label className="text-sm text-gray-700 dark:text-gray-200">
                المنطقة
                <select
                  value={draftFilters.resellerId}
                  onChange={(e) => setDraftFilters((v) => ({ ...v, resellerId: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                >
                  <option value="">الكل</option>
                  {myResellers.map((reseller) => (
                    <option key={reseller.id} value={reseller.id}>
                      {reseller.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="px-4 pb-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  const reset = { fromDate: '', toDate: '', username: '', resellerId: '' };
                  setDraftFilters(reset);
                  setFilters(reset);
                  setShowAdvancedFilters(false);
                }}
                className="px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-200"
              >
                تصفير
              </button>
              <button
                type="button"
                onClick={() => {
                  setFilters(draftFilters);
                  setShowAdvancedFilters(false);
                }}
                className="px-3 py-2 rounded-md bg-primary-600 hover:bg-primary-700 text-white text-sm"
              >
                تطبيق الفلاتر
              </button>
            </div>
          </div>
        </div>
      )}

      {recordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" role="dialog" aria-modal="true">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editingRecordId ? 'تعديل سجل ربح المشترك' : 'حفظ ربح مشترك'}
              </h3>
              <button
                type="button"
                onClick={closeRecordModal}
                className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                aria-label="إغلاق"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 grid grid-cols-1 gap-3">
              <label className="text-sm text-gray-700 dark:text-gray-200">
                المنطقة 
                <select
                  value={recordForm.resellerId}
                  onChange={(e) => setRecordForm((v) => ({ ...v, resellerId: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                >
                  <option value="">اختر الرسيلر</option>
                  {myResellers.map((reseller) => (
                    <option key={reseller.id} value={reseller.id}>
                      {reseller.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm text-gray-700 dark:text-gray-200">
                المشترك
                <input
                  type="text"
                  value={recordForm.username}
                  onChange={(e) => setRecordForm((v) => ({ ...v, username: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                />
              </label>
              <label className="text-sm text-gray-700 dark:text-gray-200">
                الربح
                <input
                  type="number"
                  value={recordForm.amount}
                  onChange={(e) => setRecordForm((v) => ({ ...v, amount: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                />
              </label>
            </div>
            <div className="px-4 pb-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={closeRecordModal}
                className="px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-200"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={submitRecord}
                disabled={createRecordMutation.isPending || updateRecordMutation.isPending}
                className="px-3 py-2 rounded-md bg-primary-600 hover:bg-primary-700 text-white text-sm disabled:opacity-60"
              >
                {editingRecordId ? 'تحديث' : 'حفظ الربح'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppSubscribersAccountsPage;
