import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { useDigits } from '../contexts/DigitsContext';
import { apiService, ApiService } from '../services/api';
import Pagination from '../components/Pagination';
import { BalanceTopUpRequest, AgentBalanceTopUpsPage, UserRole, AgentReseller, FiberxLatestTopUpPreviewResponse } from '../types';
import { getAgentBalance } from '../utils/balance';
import { showSuccess, showError } from '../utils/notifications';
import { Wallet, Plus, History, X, User, CircleDollarSign, RefreshCw } from 'lucide-react';

const BalancePage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const { formatNumber, formatDate } = useDigits();
  const queryClient = useQueryClient();

  const balanceQueryEnabled =
    isAuthenticated &&
    (user?.role !== UserRole.Employee || user?.canAccessAccounts !== false);

  const { data: balanceDetail } = useQuery({
    queryKey: ['balance-detail'],
    queryFn: () => apiService.getBalance(),
    enabled: balanceQueryEnabled,
  });

  const balanceTotal =
    balanceDetail?.balanceIqd ??
    (balanceQueryEnabled ? 0 : getAgentBalance(user?.id));

  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [showEditBalanceModal, setShowEditBalanceModal] = useState(false);
  const [showLatestTopUpModal, setShowLatestTopUpModal] = useState(false);
  const [latestTopUpResellerId, setLatestTopUpResellerId] = useState('');
  const [registeringTopUpKey, setRegisteringTopUpKey] = useState<string | null>(null);
  const [topUpsFromDate, setTopUpsFromDate] = useState<string>('');
  const [topUpsToDate, setTopUpsToDate] = useState<string>('');
  const [appliedTopUpsFromDate, setAppliedTopUpsFromDate] = useState<string>('');
  const [appliedTopUpsToDate, setAppliedTopUpsToDate] = useState<string>('');
  /** فلترة سجل التعبئات — فارغ = الكل؛ قيمة واحدة = resellerId؛ أكثر = resellerIds */
  const [topUpsResellerFilterIds, setTopUpsResellerFilterIds] = useState<string[]>([]);
  const [appliedTopUpsResellerFilterIds, setAppliedTopUpsResellerFilterIds] = useState<string[]>([]);
  const [topUpsPage, setTopUpsPage] = useState(1);
  const topUpsPageSize = 20;
  /** 'pool' = الرصيد العام، وإلا معرف منطقة (AgentReseller id) */
  const [editBalanceTarget, setEditBalanceTarget] = useState<'pool' | string>('pool');
  const [editBalanceValue, setEditBalanceValue] = useState<number>(0);
  const [topUpForm, setTopUpForm] = useState<BalanceTopUpRequest & { topUpDate: string }>({
    amountIqd: 0,
    recipientName: '',
    companyName: '',
    topUpDate: new Date().toISOString().split('T')[0],
    agentResellerId: '',
  });

  useEffect(() => {
    if (!balanceDetail) return;
    if (editBalanceTarget === 'pool') {
      setEditBalanceValue(balanceDetail.agentPoolBalanceIqd ?? balanceTotal);
      return;
    }
    const row = (balanceDetail.resellerBalances ?? []).find((r) => r.id === editBalanceTarget);
    setEditBalanceValue(row?.balanceIqd ?? 0);
  }, [balanceDetail, editBalanceTarget, balanceTotal]);

  const topUpsResellerFilterParams = useMemo(() => {
    const ids = appliedTopUpsResellerFilterIds.map((id) => id.trim()).filter(Boolean);
    if (ids.length === 0) return {};
    if (ids.length === 1) return { resellerId: ids[0] };
    return { resellerIds: ids };
  }, [appliedTopUpsResellerFilterIds]);

  const { data: topUpsData } = useQuery<AgentBalanceTopUpsPage>({
    queryKey: [
      'balance-topups',
      topUpsPage,
      topUpsPageSize,
      appliedTopUpsFromDate,
      appliedTopUpsToDate,
      appliedTopUpsResellerFilterIds,
    ],
    queryFn: () =>
      apiService.getBalanceTopUps({
        page: topUpsPage,
        pageSize: topUpsPageSize,
        fromDate: appliedTopUpsFromDate || undefined,
        toDate: appliedTopUpsToDate || undefined,
        ...topUpsResellerFilterParams,
      }),
    enabled: isAuthenticated && balanceQueryEnabled,
  });
  const topUpsList = topUpsData?.data ?? [];

  const resellerRows = useMemo(
    () => balanceDetail?.resellerBalances ?? [],
    [balanceDetail?.resellerBalances]
  );
  const hasResellerRegions = resellerRows.length > 0;

  const { data: myResellers = [] } = useQuery<AgentReseller[]>({
    queryKey: ['myResellers', 'balance-page'],
    queryFn: () => apiService.getMyResellers(),
    enabled: isAuthenticated && balanceQueryEnabled,
    staleTime: 60_000,
  });

  const syncResellerOptions = useMemo(() => {
    if (resellerRows.length > 0) {
      return resellerRows.map((r) => ({ id: r.id, name: r.name }));
    }
    return myResellers.map((r) => ({ id: r.id, name: r.name }));
  }, [resellerRows, myResellers]);

  const latestTopUpResellerIdsKey = useMemo(
    () => syncResellerOptions.map((r) => r.id).join(','),
    [syncResellerOptions]
  );

  const {
    data: latestTopUpPreviews = [],
    isFetching: latestTopUpPreviewsLoading,
    refetch: refetchLatestTopUpPreviews,
  } = useQuery<FiberxLatestTopUpPreviewResponse[]>({
    queryKey: ['fiberx-latest-topup-previews', latestTopUpResellerIdsKey, latestTopUpResellerId],
    queryFn: () => {
      const ids =
        latestTopUpResellerId.trim() !== ''
          ? [latestTopUpResellerId.trim()]
          : syncResellerOptions.map((r) => r.id);
      return apiService.getFiberxLatestTopUpPreviews(ids);
    },
    enabled: showLatestTopUpModal && syncResellerOptions.length > 0,
    retry: false,
  });

  const registerLatestTopUpMutation = useMutation({
    mutationFn: (args: { resellerId: string; transactionUuid: string }) =>
      apiService.registerFiberxLatestTopUp(args.resellerId, args.transactionUuid),
    onSuccess: () => {
      showSuccess('تعبئة الرصيد', 'تم تسجيل التعبئة وتحديث الرصيد بنجاح.');
      void queryClient.invalidateQueries({ queryKey: ['fiberx-latest-topup-previews'] });
      void queryClient.invalidateQueries({ queryKey: ['balance-detail'] });
      void queryClient.invalidateQueries({ queryKey: ['balance-topups'] });
      void queryClient.invalidateQueries({ queryKey: ['subscribers-dashboard'] });
      setRegisteringTopUpKey(null);
    },
    onError: (err: unknown) => {
      setRegisteringTopUpKey(null);
      showError('تعبئة الرصيد', ApiService.showError(err));
    },
  });

  const openLatestTopUpModal = () => {
    if (syncResellerOptions.length === 0) {
      showError('عرض سجل التعبئة', 'لا توجد مناطق (رسيلرات) متاحة.');
      return;
    }
    setLatestTopUpResellerId(syncResellerOptions.length === 1 ? syncResellerOptions[0].id : '');
    setShowLatestTopUpModal(true);
  };

  const handleRegisterLatestTopUp = (preview: FiberxLatestTopUpPreviewResponse) => {
    const uuid = (preview.transaction?.uuid ?? '').trim();
    if (!uuid) {
      showError('تعبئة الرصيد', 'لا توجد معاملة تعبئة للتسجيل.');
      return;
    }
    if (preview.alreadyRegistered) {
      showError('تعبئة الرصيد', 'هذه التعبئة مسجّلة مسبقاً في النظام.');
      return;
    }
    const key = `${preview.resellerId}-${uuid}`;
    setRegisteringTopUpKey(key);
    registerLatestTopUpMutation.mutate({ resellerId: preview.resellerId, transactionUuid: uuid });
  };

  const topUpMutation = useMutation({
    mutationFn: (body: BalanceTopUpRequest) => apiService.postBalanceTopUp(body),
    onSuccess: (data) => {
      setShowTopUpModal(false);
      setTopUpForm({
        amountIqd: 0,
        recipientName: '',
        companyName: '',
        topUpDate: new Date().toISOString().split('T')[0],
        agentResellerId: '',
      });
      queryClient.invalidateQueries({ queryKey: ['balance-topups'] });
      queryClient.invalidateQueries({ queryKey: ['balance-detail'] });
      queryClient.invalidateQueries({ queryKey: ['myResellers'] });
      queryClient.invalidateQueries({ queryKey: ['subscribers-dashboard'] });
      showSuccess('تمت التعبئة', `الرصيد الإجمالي: ${formatNumber(data.balanceIqd, { suffix: ' د.ع' })}`);
    },
    onError: (err: unknown) => {
      showError('خطأ في التعبئة', ApiService.showError(err));
    },
  });

  const editBalanceMutation = useMutation({
    mutationFn: (vars: { target: 'pool' | string; balanceIqd: number }) =>
      vars.target === 'pool'
        ? apiService.putBalance(vars.balanceIqd)
        : apiService.putResellerBalance(vars.target, vars.balanceIqd),
    onSuccess: (data, vars) => {
      setShowEditBalanceModal(false);
      queryClient.invalidateQueries({ queryKey: ['balance-detail'] });
      const label =
        vars.target === 'pool'
          ? 'الرصيد العام'
          : (data.resellerBalances ?? []).find((r) => r.id === vars.target)?.name ?? 'المنطقة';
      showSuccess(
        'تم التعديل',
        `${label}: ${formatNumber(vars.balanceIqd, { suffix: ' د.ع' })} — الإجمالي: ${formatNumber(data.balanceIqd, { suffix: ' د.ع' })}`
      );
    },
    onError: (err: unknown) => {
      showError('خطأ في تعديل الرصيد', ApiService.showError(err));
    },
  });

  const handleTopUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(topUpForm.amountIqd);
    if (!Number.isFinite(amount) || amount <= 0) {
      showError('خطأ', 'يرجى إدخال مبلغ صحيح');
      return;
    }
    if (!topUpForm.recipientName?.trim()) {
      showError('خطأ', 'يرجى إدخال اسم المستلم');
      return;
    }
    if (!topUpForm.companyName?.trim()) {
      showError('خطأ', 'يرجى إدخال الشركة / جهة الرصيد');
      return;
    }
    if (hasResellerRegions && !(topUpForm.agentResellerId ?? '').trim()) {
      showError('خطأ', 'يرجى اختيار المنطقة التي يُضاف إليها الرصيد');
      return;
    }
    topUpMutation.mutate({
      amountIqd: amount,
      recipientName: topUpForm.recipientName.trim(),
      companyName: topUpForm.companyName.trim(),
      topUpDate: topUpForm.topUpDate || undefined,
      agentResellerId: hasResellerRegions ? (topUpForm.agentResellerId ?? '').trim() : undefined,
    });
  };

  const applyTopUpsFilters = () => {
    if ((topUpsFromDate && !topUpsToDate) || (!topUpsFromDate && topUpsToDate)) {
      showError('خطأ', 'يرجى تحديد من تاريخ وإلى تاريخ معاً.');
      return;
    }
    if (topUpsFromDate && topUpsToDate && topUpsFromDate > topUpsToDate) {
      showError('خطأ', 'من تاريخ يجب أن يكون أصغر أو يساوي إلى تاريخ.');
      return;
    }
    setAppliedTopUpsFromDate(topUpsFromDate);
    setAppliedTopUpsToDate(topUpsToDate);
    setAppliedTopUpsResellerFilterIds([...topUpsResellerFilterIds]);
    setTopUpsPage(1);
  };

  const clearTopUpsFilters = () => {
    setTopUpsFromDate('');
    setTopUpsToDate('');
    setAppliedTopUpsFromDate('');
    setAppliedTopUpsToDate('');
    setTopUpsResellerFilterIds([]);
    setAppliedTopUpsResellerFilterIds([]);
    setTopUpsPage(1);
  };

  const toggleTopUpsResellerFilter = (resellerId: string) => {
    setTopUpsResellerFilterIds((prev) => {
      const id = resellerId.trim();
      if (!id) return prev;
      return prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <User className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">يرجى تسجيل الدخول</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">يجب تسجيل الدخول لعرض الرصيد</p>
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="mt-4 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md transition-colors"
          >
            تسجيل الدخول
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-white">
          <CircleDollarSign className="h-8 w-8 shrink-0 text-primary-600 dark:text-primary-400" aria-hidden />
          الرصيد
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          عرض الرصيد الإجمالي (عام + مناطق)، التعبئة باختيار المنطقة عند وجودها، وتعديل الرصيد العام أو رصيد منطقة (حسب الصلاحية)
        </p>
      </div>

      {!balanceQueryEnabled && (
        <div className="mb-4 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
          لا تتوفر صلاحية الحسابات لعرض الرصيد من الخادم.
        </div>
      )}

      {hasResellerRegions && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">المناطق والرصيد العام</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-right">
              <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">الرصيد العام</div>
              <div className="text-xs opacity-75 truncate">بدون منطقة / قديم</div>
              <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400 mt-1" dir="ltr">
                {formatNumber(balanceDetail?.agentPoolBalanceIqd ?? 0, { suffix: ' د.ع' })}
              </div>
            </div>
            {resellerRows.map((r) => (
              <div
                key={r.id}
                className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-right"
              >
                <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">{r.name}</div>
                <div className="text-xs opacity-75 truncate">رصيد المنطقة</div>
                <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400 mt-1" dir="ltr">
                  {formatNumber(r.balanceIqd, { suffix: ' د.ع' })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-indigo-100 dark:bg-indigo-900/40">
              <Wallet className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">الرصيد الإجمالي</h2>
              <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                {formatNumber(balanceTotal, { suffix: ' د.ع' })}
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row flex-wrap gap-2">
            {(user?.role === UserRole.Admin || user?.role === UserRole.Agent || user?.role === UserRole.SubAgent) && (
              <button
                type="button"
                onClick={() => {
                  setEditBalanceTarget(hasResellerRegions && resellerRows[0] ? resellerRows[0].id : 'pool');
                  setShowEditBalanceModal(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-md text-sm font-medium"
              >
                <Wallet className="h-4 w-4" />
                تعديل الرصيد
              </button>
            )}
            {balanceQueryEnabled && syncResellerOptions.length > 0 && (
              <button
                type="button"
                onClick={openLatestTopUpModal}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-sm font-medium"
              >
                <History className="h-4 w-4" />
                عرض سجل التعبئة
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowTopUpModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium"
            >
              <Plus className="h-4 w-4" />
              تعبئة الرصيد
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div className="mb-4 flex flex-col gap-3">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <History className="h-4 w-4" />
            سجل التعبئات (الأحدث أولاً)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto_auto] gap-2">
            {syncResellerOptions.length > 0 && (
              <div className="sm:col-span-2 lg:col-span-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/30 px-3 py-2">
                <p className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-2">المنطقة (رسيلر)</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setTopUpsResellerFilterIds([])}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                      topUpsResellerFilterIds.length === 0
                        ? 'bg-primary-600 border-primary-600 text-white'
                        : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    الكل
                  </button>
                  {syncResellerOptions.map((r) => {
                    const selected = topUpsResellerFilterIds.includes(r.id);
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => toggleTopUpsResellerFilter(r.id)}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                          selected
                            ? 'bg-primary-600 border-primary-600 text-white'
                            : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        {r.name}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1.5">
                  اختر منطقة واحدة أو أكثر، أو «الكل» لعرض كل التعبئات.
                </p>
              </div>
            )}
            <input
              type="date"
              value={topUpsFromDate}
              onChange={(e) => setTopUpsFromDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white text-sm"
              title="من تاريخ"
            />
            <input
              type="date"
              value={topUpsToDate}
              onChange={(e) => setTopUpsToDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white text-sm"
              title="إلى تاريخ"
            />
            <button
              type="button"
              onClick={applyTopUpsFilters}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md text-sm font-medium"
            >
              تطبيق الفلترة
            </button>
            <button
              type="button"
              onClick={clearTopUpsFilters}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 rounded-md text-sm font-medium"
            >
              مسح
            </button>
          </div>
        </div>
        <div className="wakeel-table-scroll">
          <table className="min-w-full text-right text-sm">
            <thead>
              <tr>
                <th className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">المبلغ</th>
                <th className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">المنطقة</th>
                <th className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">المستلم</th>
                <th className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">الشركة</th>
                <th className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {topUpsList.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-4 text-gray-500 dark:text-gray-400 text-center">
                    لا توجد تعبئات مسجّلة
                  </td>
                </tr>
              ) : (
                topUpsList.map((row) => (
                  <tr key={row.id} className="bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700">
                    <td className="px-3 py-2">{formatNumber(row.amountIqd, { suffix: ' د.ع' })}</td>
                    <td className="px-3 py-2">{row.agentResellerName?.trim() || 'الرصيد العام'}</td>
                    <td className="px-3 py-2">{row.recipientName}</td>
                    <td className="px-3 py-2">{row.companyName}</td>
                    <td className="px-3 py-2">{row.topUpDate ? formatDate(row.topUpDate) : '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {(topUpsData?.totalItems ?? 0) > 0 && (
          <Pagination
            currentPage={topUpsData?.currentPage ?? 1}
            totalPages={topUpsData?.totalPages ?? 1}
            totalItems={topUpsData?.totalItems ?? 0}
            pageSize={topUpsData?.pageSize ?? topUpsPageSize}
            hasNextPage={topUpsData?.hasNextPage ?? false}
            hasPreviousPage={topUpsData?.hasPreviousPage ?? false}
            onPageChange={setTopUpsPage}
          />
        )}
      </div>

      {showLatestTopUpModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="latest-topup-title"
        >
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
              <h2 id="latest-topup-title" className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <History className="h-5 w-5" />
                عرض سجل التعبئة (FiberX)
              </h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void refetchLatestTopUpPreviews()}
                  disabled={latestTopUpPreviewsLoading || registerLatestTopUpMutation.isPending}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 disabled:opacity-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${latestTopUpPreviewsLoading ? 'animate-spin' : ''}`} />
                  تحديث
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!registerLatestTopUpMutation.isPending) {
                      setShowLatestTopUpModal(false);
                      setLatestTopUpResellerId('');
                    }
                  }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                  aria-label="إغلاق"
                  disabled={registerLatestTopUpMutation.isPending}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="p-4 overflow-auto space-y-4">
              {syncResellerOptions.length > 1 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">المنطقة</label>
                  <select
                    value={latestTopUpResellerId}
                    onChange={(e) => setLatestTopUpResellerId(e.target.value)}
                    disabled={latestTopUpPreviewsLoading || registerLatestTopUpMutation.isPending}
                    className="w-full max-w-md px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white disabled:opacity-60"
                  >
                    <option value="">كل المناطق</option>
                    {syncResellerOptions.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <p className="text-xs text-gray-500 dark:text-gray-400">
                معاينة أحدث تعبئة من FiberX — راجع البيانات ثم اضغط «تعبئة الرصيد» للتسجيل في Wakeel.
              </p>
              {latestTopUpPreviewsLoading ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2 py-8 justify-center">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  جاري جلب سجل التعبئة...
                </p>
              ) : latestTopUpPreviews.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">لا توجد بيانات.</p>
              ) : (
                <div className="space-y-3">
                  {latestTopUpPreviews.map((preview) => {
                    const tx = preview.transaction;
                    const resellerLabel =
                      preview.resellerName?.trim() ||
                      syncResellerOptions.find((r) => r.id === preview.resellerId)?.name ||
                      preview.resellerId;
                    const registerKey = tx?.uuid ? `${preview.resellerId}-${tx.uuid}` : '';
                    const isRegistering = registeringTopUpKey === registerKey;
                    return (
                      <div
                        key={preview.resellerId}
                        className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/20 p-4"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
                          <div>
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{resellerLabel}</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                              الرصيد الحالي:{' '}
                              {formatNumber(preview.currentResellerBalanceIqd, { suffix: ' د.ع' })}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            {preview.alreadyRegistered ? (
                              <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                                مسجّلة مسبقاً
                              </span>
                            ) : null}
                            {tx?.uuid ? (
                              <button
                                type="button"
                                onClick={() => handleRegisterLatestTopUp(preview)}
                                disabled={
                                  preview.alreadyRegistered ||
                                  registerLatestTopUpMutation.isPending ||
                                  !!preview.fetchError
                                }
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
                              >
                                {isRegistering ? (
                                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Plus className="h-3.5 w-3.5" />
                                )}
                                {isRegistering ? 'جاري التعبئة...' : 'تعبئة الرصيد'}
                              </button>
                            ) : null}
                          </div>
                        </div>
                        {preview.fetchError ? (
                          <p className="text-sm text-red-600 dark:text-red-400">{preview.fetchError}</p>
                        ) : !tx ? (
                          <p className="text-sm text-gray-500 dark:text-gray-400">لا توجد تعبئة حديثة من FiberX.</p>
                        ) : (
                          <div className="wakeel-table-scroll rounded-md border border-gray-200 dark:border-gray-700 overflow-hidden">
                            <table className="min-w-full text-right text-sm">
                              <tbody>
                                <tr className="border-b border-gray-100 dark:border-gray-700/80">
                                  <td className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 w-36">المبلغ</td>
                                  <td className="px-3 py-2 font-medium tabular-nums">
                                    {formatNumber(tx.amount, { suffix: ' د.ع' })}
                                  </td>
                                </tr>
                                <tr className="border-b border-gray-100 dark:border-gray-700/80">
                                  <td className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">الرصيد قبل</td>
                                  <td className="px-3 py-2 tabular-nums">
                                    {formatNumber(tx.balanceBefore, { suffix: ' د.ع' })}
                                  </td>
                                </tr>
                                <tr className="border-b border-gray-100 dark:border-gray-700/80">
                                  <td className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">الرصيد بعد</td>
                                  <td className="px-3 py-2 tabular-nums text-emerald-700 dark:text-emerald-300 font-medium">
                                    {formatNumber(tx.balanceAfter, { suffix: ' د.ع' })}
                                  </td>
                                </tr>
                                <tr className="border-b border-gray-100 dark:border-gray-700/80">
                                  <td className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">طريقة الدفع</td>
                                  <td className="px-3 py-2">{tx.paymentMethod?.trim() || '—'}</td>
                                </tr>
                                <tr className="border-b border-gray-100 dark:border-gray-700/80">
                                  <td className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">الوصف</td>
                                  <td className="px-3 py-2">{tx.description?.trim() || '—'}</td>
                                </tr>
                                <tr className="border-b border-gray-100 dark:border-gray-700/80">
                                  <td className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">الحالة</td>
                                  <td className="px-3 py-2">{tx.status?.trim() || '—'}</td>
                                </tr>
                                <tr className="border-b border-gray-100 dark:border-gray-700/80">
                                  <td className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">التاريخ</td>
                                  <td className="px-3 py-2">
                                    {tx.createdAt ? formatDate(tx.createdAt) : '—'}
                                  </td>
                                </tr>
                                {preview.suggestedRecipientName?.trim() ? (
                                  <tr>
                                    <td className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">المستلم المقترح</td>
                                    <td className="px-3 py-2">{preview.suggestedRecipientName.trim()}</td>
                                  </tr>
                                ) : null}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showEditBalanceModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-balance-title"
        >
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 id="edit-balance-title" className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                تعديل الرصيد
              </h2>
              <button
                type="button"
                onClick={() => setShowEditBalanceModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                aria-label="إغلاق"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
                       <form
              onSubmit={(e) => {
                e.preventDefault();
                const v = Number(editBalanceValue);
                if (!Number.isFinite(v) || v < 0) {
                  showError('خطأ', 'يرجى إدخال رصيد صحيح (>= 0).');
                  return;
                }
                editBalanceMutation.mutate({ target: editBalanceTarget, balanceIqd: v });
              }}
              className="p-4 space-y-4"
            >
              <p className="text-xs text-gray-500 dark:text-gray-400">
                اختر <strong className="text-gray-700 dark:text-gray-300">الرصيد العام</strong> أو{' '}
                <strong className="text-gray-700 dark:text-gray-300">منطقة</strong> لتعيين رصيدها عبر الخادم.
              </p>
              {hasResellerRegions && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ما يُعدّل</label>
                  <select
                    value={editBalanceTarget}
                    onChange={(e) => setEditBalanceTarget(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                  >
                    <option value="pool">الرصيد العام</option>
                    {resellerRows.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} — رصيد المنطقة
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {editBalanceTarget === 'pool' ? 'الرصيد العام (د.ع)' : 'رصيد المنطقة (د.ع)'}
                </label>
                <input
                  type="number"
                  min={0}
                  value={Number.isFinite(editBalanceValue) ? editBalanceValue : 0}
                  onChange={(e) => setEditBalanceValue(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div className="flex gap-2 justify-end pt-2 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setShowEditBalanceModal(false)}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 rounded-md text-sm font-medium"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={editBalanceMutation.isPending}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-md text-sm font-medium"
                >
                  {editBalanceMutation.isPending ? 'جاري الحفظ...' : 'حفظ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showTopUpModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="topup-modal-title"
        >
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 id="topup-modal-title" className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                تعبئة الرصيد
              </h2>
              <button
                type="button"
                onClick={() => setShowTopUpModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                aria-label="إغلاق"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto">
              <form onSubmit={handleTopUpSubmit} className="space-y-4">
                {hasResellerRegions && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">المنطقة *</label>
                    <select
                      value={topUpForm.agentResellerId ?? ''}
                      onChange={(e) =>
                        setTopUpForm((prev) => ({ ...prev, agentResellerId: e.target.value }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                      required
                    >
                      <option value="">— اختر المنطقة —</option>
                      {resellerRows.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">المبلغ (د.ع) *</label>
                  <input
                    type="number"
                    min={1}
                    value={topUpForm.amountIqd || ''}
                    onChange={(e) => setTopUpForm((prev) => ({ ...prev, amountIqd: Number(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">اسم المستلم *</label>
                  <input
                    type="text"
                    value={topUpForm.recipientName}
                    onChange={(e) => setTopUpForm((prev) => ({ ...prev, recipientName: e.target.value }))}
                    placeholder="أحمد محمد"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الشركة / جهة الرصيد *</label>
                  <input
                    type="text"
                    value={topUpForm.companyName}
                    onChange={(e) => setTopUpForm((prev) => ({ ...prev, companyName: e.target.value }))}
                    placeholder="شركة الاتصالات"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">تاريخ التعبئة (اختياري)</label>
                  <input
                    type="date"
                    value={topUpForm.topUpDate}
                    onChange={(e) => setTopUpForm((prev) => ({ ...prev, topUpDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={topUpMutation.isPending}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-md text-sm font-medium"
                  >
                    {topUpMutation.isPending ? 'جاري الحفظ...' : 'تسجيل التعبئة'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowTopUpModal(false)}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 rounded-md text-sm font-medium"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BalancePage;
