import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService, ApiService } from '../services/api';
import {
  Agent,
  AgentReseller,
  BalanceTransfer,
  BalanceTransferCreateRequest,
  BalanceTransferType,
  Dealer,
  formatIraqGovernorateAr,
  UserRole,
} from '../types';
import { showSuccess, showError } from '../utils/notifications';
import { useConfirmation } from '../contexts/ConfirmationContext';
import { useDigits } from '../contexts/DigitsContext';
import { useAuth } from '../contexts/AuthContext';
import WifiLoaderComponent from '../components/WifiLoaderComponent';
import Pagination from '../components/Pagination';
import { GlassSummaryCard } from '../components/GlassSummaryCard';
import { Wallet, Plus, Pencil, Trash2 } from 'lucide-react';
import { getBaghdadDayBoundsIso, getBaghdadRangeBoundsIso } from '../utils/iraqCalendar';

const emptyForm: BalanceTransferCreateRequest = {
  dealerId: '',
  agentResellerId: '',
  balanceAmount: 0,
  deductionAmount: 0,
};

type DateFilterMode = 'created' | 'filled';

const DealerBalanceTransfersPage: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const { confirmDelete } = useConfirmation();
  const { formatNumber, formatDate } = useDigits();
  const queryClient = useQueryClient();
  const isAdmin = user?.role === UserRole.Admin;

  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<BalanceTransfer | null>(null);
  const [form, setForm] = useState<BalanceTransferCreateRequest>(emptyForm);
  /** عند التعديل فقط — يُرسل مع PUT إن وُجد */
  const [editTypeTransfer, setEditTypeTransfer] = useState<BalanceTransferType>(BalanceTransferType.ZainCashConversion);

  const [fullNameDraft, setFullNameDraft] = useState('');
  const [appliedFullName, setAppliedFullName] = useState('');
  const [typeDraft, setTypeDraft] = useState<string>('');
  const [appliedType, setAppliedType] = useState<number | undefined>(undefined);
  const [dateMode, setDateMode] = useState<DateFilterMode>('created');
  const [appliedDateMode, setAppliedDateMode] = useState<DateFilterMode>('created');
  const [fromDraft, setFromDraft] = useState('');
  const [toDraft, setToDraft] = useState('');
  const [appliedFrom, setAppliedFrom] = useState('');
  const [appliedTo, setAppliedTo] = useState('');
  const [resellerIdDraft, setResellerIdDraft] = useState('');
  const [appliedResellerId, setAppliedResellerId] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);

  const { data: allAgentsResponse } = useQuery({
    queryKey: ['allAgents', 'balance-transfers-admin'],
    queryFn: () => apiService.getAllAgents({ page: 1, pageSize: 5000 }),
    enabled: isAuthenticated && isAdmin,
    retry: false,
  });
  const adminAgents = useMemo(() => (allAgentsResponse?.data ?? []) as Agent[], [allAgentsResponse?.data]);

  useEffect(() => {
    if (!isAdmin || adminAgents.length === 0 || selectedAgentId) return;
    const first = adminAgents[0];
    if (first?.id) setSelectedAgentId(first.id);
  }, [isAdmin, adminAgents, selectedAgentId]);

  const { data: myResellers = [] } = useQuery<AgentReseller[]>({
    queryKey: ['myResellers', 'balance-transfers'],
    queryFn: () => apiService.getMyResellers(),
    enabled:
      isAuthenticated &&
      !isAdmin &&
      (user?.role === UserRole.Agent || user?.role === UserRole.SubAgent || user?.role === UserRole.Employee),
    staleTime: 60_000,
  });

  const { data: adminResellers = [] } = useQuery<AgentReseller[]>({
    queryKey: ['agentResellers', 'balance-transfers', selectedAgentId],
    queryFn: () => apiService.getAgentResellers(selectedAgentId),
    enabled: isAuthenticated && isAdmin && !!selectedAgentId,
    staleTime: 60_000,
  });

  const accountResellers = isAdmin ? adminResellers : myResellers;
  const resellerNameById = useMemo(() => {
    const m = new Map<string, string>();
    accountResellers.forEach((r) => m.set(r.id, r.name));
    return m;
  }, [accountResellers]);

  const applyFilters = () => {
    setAppliedFullName(fullNameDraft.trim());
    setAppliedType(typeDraft === '' ? undefined : Number(typeDraft));
    setAppliedDateMode(dateMode);
    setAppliedResellerId(resellerIdDraft.trim());
    const f = fromDraft.trim();
    const t = toDraft.trim();
    const fOk = /^\d{4}-\d{2}-\d{2}$/.test(f);
    const tOk = /^\d{4}-\d{2}-\d{2}$/.test(t);
    if (fOk && tOk) {
      const b = getBaghdadRangeBoundsIso(f, t);
      setAppliedFrom(b.fromDate);
      setAppliedTo(b.toDate);
    } else if (fOk) {
      const b = getBaghdadDayBoundsIso(f);
      setAppliedFrom(b.fromDate);
      setAppliedTo(b.toDate);
    } else if (tOk) {
      const b = getBaghdadDayBoundsIso(t);
      setAppliedFrom(b.fromDate);
      setAppliedTo(b.toDate);
    } else {
      setAppliedFrom('');
      setAppliedTo('');
    }
    setCurrentPage(1);
  };

  const { data: dealerListRes } = useQuery({
    queryKey: ['dealers', 'dropdown'],
    queryFn: () => apiService.getDealers({ page: 1, pageSize: 200 }),
  });
  const dealersData = dealerListRes?.data;

  const listQueryEnabled =
    isAuthenticated && (!isAdmin || !!selectedAgentId);

  const { data: btResponse, isLoading, error } = useQuery({
    queryKey: [
      'balance-transfers',
      appliedFullName,
      appliedType,
      appliedDateMode,
      appliedFrom,
      appliedTo,
      appliedResellerId,
      currentPage,
      pageSize,
      isAdmin ? selectedAgentId : null,
    ],
    enabled: listQueryEnabled,
    queryFn: () => {
      const base = {
        fullName: appliedFullName || undefined,
        typeTransfer: appliedType,
        resellerId: appliedResellerId || undefined,
        page: currentPage,
        pageSize,
      };
      const dateParams =
        appliedDateMode === 'filled'
          ? {
              filledDateFrom: appliedFrom || undefined,
              filledDateTo: appliedTo || undefined,
            }
          : {
              createdAtFrom: appliedFrom || undefined,
              createdAtTo: appliedTo || undefined,
            };
      return apiService.getBalanceTransfers({ ...base, ...dateParams });
    },
  });

  const transfers = btResponse?.data ?? [];

  const dealerById = useMemo(() => {
    const m = new Map<string, Dealer>();
    (dealersData ?? []).forEach((d) => m.set(d.id, d));
    return m;
  }, [dealersData]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editing) {
        const body: BalanceTransferCreateRequest = {
          dealerId: form.dealerId.trim(),
          agentResellerId: form.agentResellerId.trim(),
          balanceAmount: form.balanceAmount,
          deductionAmount: form.deductionAmount,
          typeTransfer: editTypeTransfer,
        };
        return apiService.updateBalanceTransfer(editing.id, body);
      }
      return apiService.createBalanceTransfer({
        dealerId: form.dealerId.trim(),
        agentResellerId: form.agentResellerId.trim(),
        balanceAmount: form.balanceAmount,
        deductionAmount: form.deductionAmount,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['balance-transfers'], exact: false });
      setShowModal(false);
      setEditing(null);
      setForm(emptyForm);
      showSuccess('تم الحفظ', editing ? 'تم تحديث السجل.' : 'تم تسجيل التحويل.');
    },
    onError: (err: unknown) => showError('خطأ', ApiService.showError(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiService.deleteBalanceTransfer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['balance-transfers'], exact: false });
      showSuccess('تم الحذف', 'تم حذف السجل.');
    },
    onError: (err: unknown) => showError('خطأ', ApiService.showError(err)),
  });

  const profitPreview =
    Number.isFinite(form.balanceAmount) && Number.isFinite(form.deductionAmount)
      ? form.balanceAmount - form.deductionAmount
      : null;

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setEditTypeTransfer(BalanceTransferType.ZainCashConversion);
    setShowModal(true);
  };

  const openEdit = (t: BalanceTransfer) => {
    setEditing(t);
    const tt = (t.typeTransfer != null ? Number(t.typeTransfer) : BalanceTransferType.ZainCashConversion) as BalanceTransferType;
    setEditTypeTransfer(tt);
    setForm({
      dealerId: t.dealerId,
      agentResellerId: (t.agentResellerId ?? dealerById.get(t.dealerId)?.agentResellerId ?? '').trim(),
      balanceAmount: t.balanceAmount,
      deductionAmount: t.deductionAmount ?? 0,
    });
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.dealerId.trim()) {
      showError('بيانات ناقصة', 'اختر الوكيل.');
      return;
    }
    if (!form.agentResellerId.trim()) {
      showError('بيانات ناقصة', 'اختر المنطقة (الرسيلر).');
      return;
    }
    if (form.balanceAmount < 0 || form.deductionAmount < 0) {
      showError('قيم غير صالحة', 'المبالغ يجب أن تكون صفراً أو أكثر.');
      return;
    }
    saveMutation.mutate();
  };

  const handleDelete = async (t: BalanceTransfer) => {
    const ok = await confirmDelete('حذف سجل التحويل؟');
    if (ok) deleteMutation.mutate(t.id);
  };

  const displayRow = (t: BalanceTransfer) => {
    const d = dealerById.get(t.dealerId);
    const fullName = t.fullName ?? d?.fullName ?? '—';
    const userName = t.userName ?? d?.userName ?? '—';
    const govRaw = t.iraqGovernorates ?? d?.iraqGovernorates;
    const iraqGovernorates = formatIraqGovernorateAr(govRaw != null ? Number(govRaw) : undefined);
    const address = t.address ?? d?.address ?? '—';
    const phone = t.phone ?? d?.phone ?? '—';
    const rid = (t.agentResellerId ?? d?.agentResellerId ?? '').trim();
    const zoneLabel = rid ? resellerNameById.get(rid) ?? rid : '—';
    return { fullName, userName, iraqGovernorates, address, phone, zoneLabel };
  };

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4 text-red-700 dark:text-red-300">
          تعذر تحميل تحويلات أرصدة الوكلاء. تأكد من واجهة /BalanceTransfers.
        </div>
      </div>
    );
  }

  const pg = btResponse;

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2">
          <Wallet className="h-7 w-7 text-primary-600 dark:text-primary-400" />
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">تحويلات أرصدة الوكلاء</h1>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium"
        >
          <Plus className="h-4 w-4" />
          تحويل رصيد لوكيل
        </button>
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        تسجيل ومتابعة تحويلات الأرصدة. الإجماليات أدناه لجميع السجلات المطابقة للفلاتر (وليس الصفحة الحالية فقط).
      </p>

      {isAdmin && (
        <div className="mb-4 rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/80 dark:bg-amber-950/25 p-4">
          <label className="block text-xs font-medium text-amber-900 dark:text-amber-200 mb-1">الوكيل (لعرض المناطق والفلتر)</label>
          <select
            value={selectedAgentId}
            onChange={(e) => {
              setSelectedAgentId(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full max-w-md px-3 py-2 border border-amber-300 dark:border-amber-700 rounded-lg dark:bg-gray-800 dark:text-white text-sm"
          >
            {adminAgents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.fullName || a.username || a.id}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <GlassSummaryCard title="مجموع الربح" variant="emerald">
          {formatNumber(pg?.totalProfitAmount ?? 0, { suffix: ' د.ع' })}
        </GlassSummaryCard>
        <GlassSummaryCard title="مجموع مبالغ التحويل" variant="sky">
          {formatNumber(pg?.totalBalanceTransferAmount ?? 0, { suffix: ' د.ع' })}
        </GlassSummaryCard>
      </div>

      <div className="mb-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/40 p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">اسم الوكيل</label>
            <input
              value={fullNameDraft}
              onChange={(e) => setFullNameDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), applyFilters())}
              placeholder="FullName..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">نوع التحويل</label>
            <select
              value={typeDraft}
              onChange={(e) => setTypeDraft(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm"
            >
              <option value="">الكل</option>
              <option value="1">تحويل زين كاش</option>
              <option value="2">تحويل من الرصيد</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">نطاق التاريخ حسب</label>
            <select
              value={dateMode}
              onChange={(e) => setDateMode(e.target.value as DateFilterMode)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm"
            >
              <option value="created">تاريخ الإنشاء (createdAt)</option>
              <option value="filled">تاريخ التعبئة (filledDate)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">المنطقة (resellerId)</label>
            <select
              value={resellerIdDraft}
              onChange={(e) => setResellerIdDraft(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm"
            >
              <option value="">كل المناطق</option>
              {accountResellers.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">من تاريخ</label>
            <input
              type="date"
              value={fromDraft}
              onChange={(e) => setFromDraft(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">إلى تاريخ</label>
            <input
              type="date"
              value={toDraft}
              onChange={(e) => setToDraft(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm"
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={applyFilters}
            className="px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium"
          >
            تطبيق الفلاتر
          </button>
          <button
            type="button"
            onClick={() => {
              setFullNameDraft('');
              setTypeDraft('');
              setFromDraft('');
              setToDraft('');
              setDateMode('created');
              setResellerIdDraft('');
              setAppliedFullName('');
              setAppliedType(undefined);
              setAppliedFrom('');
              setAppliedTo('');
              setAppliedDateMode('created');
              setAppliedResellerId('');
              setCurrentPage(1);
            }}
            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm"
          >
            مسح
          </button>
        </div>
      </div>

      {!listQueryEnabled && isAdmin ? (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-8 text-center text-gray-600 dark:text-gray-400">
          لا يوجد وكيل للعرض. أضف وكلاءً من لوحة الإدارة.
        </div>
      ) : isLoading ? (
        <WifiLoaderComponent />
      ) : transfers.length === 0 ? (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-8 text-center text-gray-600 dark:text-gray-400">
          لا توجد سجلات تحويل مطابقة.
        </div>
      ) : (
        <div className="wakeel-table-scroll rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="min-w-full text-right text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/80">
              <tr>
                <th className="px-3 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">اسم الوكيل   </th>
                <th className="px-3 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">اسم المستخدم</th>
                <th className="px-3 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">المنطقة</th>
                <th className="px-3 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">المحافظة</th>
                <th className="px-3 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">العنوان</th>
                <th className="px-3 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">الهاتف</th>
                <th className="px-3 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">مبلغ التحويل</th>
                <th className="px-3 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">الربح</th>
                <th className="px-3 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">تاريخ التحويل </th>
                <th className="px-3 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 w-24">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {transfers.map((t) => {
                const row = displayRow(t);
                return (
                  <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                    <td className="px-3 py-3 text-gray-900 dark:text-white font-medium">{row.fullName}</td>
                    <td className="px-3 py-3 text-gray-700 dark:text-gray-300">{row.userName}</td>
                    <td className="px-3 py-3 text-gray-700 dark:text-gray-300 text-sm max-w-[140px] truncate" title={row.zoneLabel}>
                      {row.zoneLabel}
                    </td>
                    <td className="px-3 py-3 text-gray-700 dark:text-gray-300">{row.iraqGovernorates}</td>
                    <td className="px-3 py-3 text-gray-700 dark:text-gray-300 max-w-[140px] truncate" title={row.address}>
                      {row.address}
                    </td>
                    <td className="px-3 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">{row.phone}</td>
                    <td className="px-3 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap font-mono" dir="ltr">
                      {formatNumber(t.balanceAmount)}
                    </td>
                    <td className="px-3 py-3 text-emerald-700 dark:text-emerald-300 whitespace-nowrap font-mono font-semibold" dir="ltr">
                      {formatNumber(t.profitAmount ?? 0)}
                    </td>
                    <td className="px-3 py-3 text-gray-600 dark:text-gray-400 whitespace-nowrap text-sm">
                      {t.createdAt ? formatDate(t.createdAt, { dateStyle: 'short' }) : '—'}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(t)}
                          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-primary-600"
                          title="تعديل"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(t)}
                          className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600"
                          title="حذف"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!isLoading && pg && pg.totalItems > 0 && (
        <Pagination
          currentPage={pg.currentPage}
          totalPages={pg.totalPages}
          totalItems={pg.totalItems}
          pageSize={pg.pageSize}
          hasNextPage={pg.hasNextPage}
          hasPreviousPage={pg.hasPreviousPage}
          onPageChange={setCurrentPage}
          className="rounded-b-lg"
        />
      )}

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50" role="dialog" aria-modal="true">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{editing ? 'تعديل تحويل' : 'تحويل رصيد لوكيل'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الوكيل (Dealer)</label>
                <select
                  required
                  value={form.dealerId}
                  onChange={(e) => {
                    const id = e.target.value;
                    const d = dealerById.get(id);
                    setForm((f) => ({
                      ...f,
                      dealerId: id,
                      agentResellerId: d?.agentResellerId?.trim() ? d.agentResellerId.trim() : f.agentResellerId,
                    }));
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                >
                  <option value="">— اختر الوكيل —</option>
                  {(dealersData ?? []).map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.fullName} ({d.userName})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">المنطقة (agentResellerId)</label>
                <select
                  required
                  value={form.agentResellerId}
                  onChange={(e) => setForm((f) => ({ ...f, agentResellerId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                >
                  <option value="">— اختر المنطقة —</option>
                  {accountResellers.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">مبلغ التحويل</label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  required
                  value={form.balanceAmount}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, balanceAmount: Number(e.target.value) || 0 }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">مبلغ الاستقطاع</label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  required
                  value={form.deductionAmount}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, deductionAmount: Number(e.target.value) || 0 }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />
              </div>
              {editing && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">نوع التحويل</label>
                  <select
                    value={editTypeTransfer}
                    onChange={(e) =>
                      setEditTypeTransfer(Number(e.target.value) as BalanceTransferType)
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  >
                    <option value={BalanceTransferType.ZainCashConversion}>تحويل زين كاش (1)</option>
                    <option value={BalanceTransferType.BalanceConversion}>تحويل من الرصيد (2)</option>
                  </select>
                </div>
              )}
              {profitPreview != null && Number.isFinite(profitPreview) && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  معاينة الربح (مبلغ التحويل − الاستقطاع){' '}
                  <span dir="ltr" className="font-mono font-semibold inline-block">
                    {formatNumber(profitPreview)}
                  </span>
                </p>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditing(null);
                  }}
                  className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={
                    saveMutation.isPending ||
                    !(dealersData?.length) ||
                    !form.dealerId.trim() ||
                    !form.agentResellerId.trim()
                  }
                  className="px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white disabled:opacity-50"
                >
                  {saveMutation.isPending ? 'جاري الحفظ...' : 'حفظ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DealerBalanceTransfersPage;
