import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiService, ApiService } from '../services/api';
import Pagination from '../components/Pagination';
import { GlassSummaryCard } from '../components/GlassSummaryCard';
import WifiLoaderComponent from '../components/WifiLoaderComponent';
import { useAuth } from '../contexts/AuthContext';
import { useDigits } from '../contexts/DigitsContext';
import {
  Agent,
  AgentReseller,
  Dealer,
  ProfilePackageType,
  ServiceType,
  User,
  UserRole,
  formatServiceTypeLabelAr,
} from '../types';
import { showError, showSuccess } from '../utils/notifications';
import { createAccountsOtherDealerExcelBlob } from '../utils/excelExport';
import { AlertCircle, Download, RefreshCw, SlidersHorizontal, X } from 'lucide-react';
import { getBaghdadRangeBoundsIso, getBaghdadTodayYmd } from '../utils/iraqCalendar';

function renewalPackageTypeLabel(packageType: number | null | undefined): string {
  if (packageType === ProfilePackageType.Subscription || packageType === 1) return 'اشتراك';
  if (packageType === ProfilePackageType.Extension || packageType === 2) return 'تمديد اشتراك';
  if (packageType === ProfilePackageType.SpecialOffer || packageType === 3) return 'اشتراك عرض خاص';
  return '—';
}

/** نفس شارة «نوع التجديد» في صفحة حسابات المشتركين */
function LedgerRenewalPackageBadge({
  packageType,
}: {
  packageType: number | null | undefined;
}) {
  const pt =
    packageType === ProfilePackageType.Subscription ||
    packageType === ProfilePackageType.Extension ||
    packageType === ProfilePackageType.SpecialOffer
      ? packageType
      : packageType === 1 || packageType === 2 || packageType === 3
        ? packageType
        : null;
  if (pt == null) {
    return <span className="text-sm text-gray-400 dark:text-gray-500">—</span>;
  }
  const kind = Number(pt);
  const label = renewalPackageTypeLabel(kind);
  const ring =
    kind === ProfilePackageType.Subscription
      ? 'bg-sky-50 text-sky-900 ring-sky-400/75 shadow-sm shadow-sky-200/40 dark:bg-sky-950/55 dark:text-sky-50 dark:ring-sky-500/45'
      : kind === ProfilePackageType.Extension
        ? 'bg-emerald-50 text-emerald-950 ring-emerald-400/80 shadow-sm shadow-emerald-200/35 dark:bg-emerald-950/50 dark:text-emerald-50 dark:ring-emerald-500/45'
        : 'bg-fuchsia-50 text-fuchsia-950 ring-fuchsia-400/75 shadow-sm shadow-fuchsia-200/35 dark:bg-fuchsia-950/45 dark:text-fuchsia-50 dark:ring-fuchsia-500/40';
  return (
    <span
      title={label}
      className={`inline-flex max-w-full items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${ring}`}
    >
      {label}
    </span>
  );
}

const AccountsOtherDealerPage: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const { formatNumber, formatDate } = useDigits();

  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const isAdmin = user?.role === UserRole.Admin;
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [appliedFromYmd, setAppliedFromYmd] = useState<string>(() => getBaghdadTodayYmd());
  const [appliedToYmd, setAppliedToYmd] = useState<string>(() => getBaghdadTodayYmd());
  const [showAdvancedFilterModal, setShowAdvancedFilterModal] = useState(false);
  const [advFromYmd, setAdvFromYmd] = useState('');
  const [advToYmd, setAdvToYmd] = useState('');
  const [advExecutorUserId, setAdvExecutorUserId] = useState('');
  const [selectedResellerId, setSelectedResellerId] = useState<string>('');
  const [selectedExecutorUserId, setSelectedExecutorUserId] = useState<string>('');
  const [selectedDealerIds, setSelectedDealerIds] = useState<string[]>([]);
  const [selectedPackageType, setSelectedPackageType] = useState<number | null>(null);
  const [advDealerIds, setAdvDealerIds] = useState<string[]>([]);
  const [advPackageType, setAdvPackageType] = useState<string>('');
  const [ledgerPage, setLedgerPage] = useState(1);
  const ledgerPageSize = 20;
  const exportLedgerPageSize = 200;
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  const { data: myResellersForAccounts = [] } = useQuery<AgentReseller[]>({
    queryKey: ['myResellers'],
    queryFn: () => apiService.getMyResellers(),
    enabled:
      isAuthenticated &&
      !isAdmin &&
      (user?.role === UserRole.Agent ||
        user?.role === UserRole.SubAgent ||
        user?.role === UserRole.Employee),
    staleTime: 60_000,
  });

  const { data: adminResellersForAccounts = [] } = useQuery<AgentReseller[]>({
    queryKey: ['agentResellers', 'accounts-other-dealer', selectedAgentId],
    queryFn: () => apiService.getAgentResellers(selectedAgentId),
    enabled: isAuthenticated && isAdmin && !!selectedAgentId,
    staleTime: 60_000,
  });

  const accountResellers = isAdmin ? adminResellersForAccounts : myResellersForAccounts;

  const { data: allAgentsResponse } = useQuery({
    queryKey: ['allAgents', 'accounts-other-dealer-admin'],
    queryFn: () => apiService.getAllAgents({ page: 1, pageSize: 5000 }),
    enabled: isAuthenticated && isAdmin,
    retry: false,
  });
  const adminAgents = (allAgentsResponse?.data ?? []) as Agent[];

  useEffect(() => {
    setSelectedResellerId('');
    setSelectedExecutorUserId('');
    setAdvExecutorUserId('');
    setSelectedDealerIds([]);
    setSelectedPackageType(null);
    setAdvDealerIds([]);
    setAdvPackageType('');
    setLedgerPage(1);
  }, [selectedAgentId]);

  useEffect(() => {
    setSelectedDealerIds([]);
    setAdvDealerIds([]);
  }, [selectedResellerId]);

  useEffect(() => {
    setLedgerPage(1);
  }, [
    appliedFromYmd,
    appliedToYmd,
    selectedResellerId,
    selectedExecutorUserId,
    selectedDealerIds,
    selectedPackageType,
  ]);

  const dealerIdsQueryKey = useMemo(
    () => [...selectedDealerIds].sort().join('|'),
    [selectedDealerIds]
  );

  const queryEnabled = isAuthenticated && (isAdmin ? !!selectedAgentId : true);

  const accountsBounds = useMemo(() => {
    const a = (appliedFromYmd || '').trim();
    const b = (appliedToYmd || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(a) || !/^\d{4}-\d{2}-\d{2}$/.test(b)) {
      const t = getBaghdadTodayYmd();
      return getBaghdadRangeBoundsIso(t, t);
    }
    if (a <= b) return getBaghdadRangeBoundsIso(a, b);
    return getBaghdadRangeBoundsIso(b, a);
  }, [appliedFromYmd, appliedToYmd]);

  const normalizedRange = useMemo(() => {
    const a = (appliedFromYmd || '').trim();
    const b = (appliedToYmd || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(a) || !/^\d{4}-\d{2}-\d{2}$/.test(b)) return { from: a, to: b };
    return a <= b ? { from: a, to: b } : { from: b, to: a };
  }, [appliedFromYmd, appliedToYmd]);

  const queryKey = useMemo(
    () =>
      [
        'accounts-other-dealer',
        isAdmin ? (selectedAgentId || null) : null,
        appliedFromYmd,
        appliedToYmd,
        selectedResellerId,
        selectedExecutorUserId,
        dealerIdsQueryKey,
        selectedPackageType,
        ledgerPage,
        ledgerPageSize,
      ] as const,
    [
      isAdmin,
      selectedAgentId,
      appliedFromYmd,
      appliedToYmd,
      selectedResellerId,
      selectedExecutorUserId,
      dealerIdsQueryKey,
      selectedPackageType,
      ledgerPage,
    ]
  );

  const { data: dealersForAdvancedFilter = [] } = useQuery<Dealer[]>({
    queryKey: ['renewal-dealers', 'accounts-other-dealer-adv', isAdmin ? selectedAgentId : 'me', selectedResellerId],
    queryFn: () =>
      apiService.getRenewalDealersList({
        agentId: isAdmin ? selectedAgentId : undefined,
        resellerId: selectedResellerId || undefined,
      }),
    enabled: queryEnabled,
    staleTime: 60_000,
  });

  const selectedAdminAgentUserId = isAdmin
    ? (adminAgents.find((a) => a.id === selectedAgentId)?.userId ?? '')
    : '';

  const { data: executorOptions = [] } = useQuery<User[]>({
    queryKey: [
      'accounts-other-dealer-executors',
      isAdmin ? selectedAgentId : 'me',
      user?.id,
      selectedAdminAgentUserId,
    ],
    queryFn: async () => {
      if (isAdmin) {
        if (!selectedAgentId) return [];
        const emps = await apiService.getAgentEmployees(selectedAgentId);
        const ag = adminAgents.find((a) => a.id === selectedAgentId);
        const list = [...emps];
        if (ag?.userId && !list.some((e) => e.id === ag.userId)) {
          list.unshift({
            id: ag.userId,
            username: ag.username,
            fullName: `${(ag.fullName || ag.companyName || ag.username).trim()} (وكيل)`,
            isActive: ag.isActive,
            role: UserRole.Agent,
          } as User);
        }
        return list;
      }
      const emps = await apiService.getMyEmployees();
      const uid = user?.id;
      if (uid && !emps.some((e) => e.id === uid)) {
        return [
          {
            id: uid,
            username: user?.username ?? '',
            fullName: (user?.fullName ?? user?.username ?? uid).trim(),
            isActive: user?.isActive ?? true,
            role: user?.role ?? UserRole.Employee,
          } as User,
          ...emps,
        ];
      }
      return emps;
    },
    enabled:
      queryEnabled &&
      (isAdmin ? !!selectedAgentId : user?.role === UserRole.Agent || user?.role === UserRole.SubAgent || user?.role === UserRole.Employee),
    staleTime: 60_000,
  });

  const {
    data: reportData,
    error,
    refetch,
    isLoading,
  } = useQuery({
    queryKey,
    queryFn: () =>
      apiService.getAccountsOtherDealer({
        fromDate: accountsBounds.fromDate,
        toDate: accountsBounds.toDate,
        page: ledgerPage,
        pageSize: ledgerPageSize,
        agentId: isAdmin ? selectedAgentId : undefined,
        resellerId: selectedResellerId || undefined,
        executedByUserId: selectedExecutorUserId || undefined,
        dealerIds: selectedDealerIds.length > 0 ? selectedDealerIds : undefined,
        packageType: selectedPackageType,
      }),
    enabled: queryEnabled,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const rows = reportData?.ledger?.data ?? [];

  const handleDownloadAccountExcel = async () => {
    if (!queryEnabled) return;
    if (isAdmin && !selectedAgentId) {
      showError('تنزيل', 'اختر الوكيل أولاً.');
      return;
    }
    setIsExportingExcel(true);
    try {
      const baseParams = {
        fromDate: accountsBounds.fromDate,
        toDate: accountsBounds.toDate,
        agentId: isAdmin ? selectedAgentId : undefined,
        resellerId: selectedResellerId || undefined,
        executedByUserId: selectedExecutorUserId || undefined,
        dealerIds: selectedDealerIds.length > 0 ? selectedDealerIds : undefined,
        packageType: selectedPackageType,
      };
      const first = await apiService.getAccountsOtherDealer({
        ...baseParams,
        page: 1,
        pageSize: exportLedgerPageSize,
      });
      const allRows = [...first.ledger.data];
      for (let p = 2; p <= first.ledger.totalPages; p += 1) {
        const next = await apiService.getAccountsOtherDealer({
          ...baseParams,
          page: p,
          pageSize: exportLedgerPageSize,
        });
        allRows.push(...next.ledger.data);
      }
      /** عنوان الصف الأول = dealerFullName من السجلات؛ إن لم تُجلب بعد نُكمّل من أسماء التجار في الفلتر */
      const uniqueDealerNamesFromRows = Array.from(
        new Set(
          allRows
            .map((r) => (r.dealerFullName ?? '').toString().trim())
            .filter((s) => s.length > 0)
        )
      );
      let dealerTitle = '—';
      if (uniqueDealerNamesFromRows.length === 1) {
        dealerTitle = uniqueDealerNamesFromRows[0]!;
      } else if (uniqueDealerNamesFromRows.length > 1) {
        dealerTitle = uniqueDealerNamesFromRows.join('، ');
      } else if (selectedDealerIds.length === 1) {
        const d = dealersForAdvancedFilter.find((x) => x.id === selectedDealerIds[0]);
        dealerTitle = (d?.fullName ?? '').trim() || '—';
      } else if (selectedDealerIds.length > 1) {
        const labels = selectedDealerIds
          .map((id) => dealersForAdvancedFilter.find((x) => x.id === id)?.fullName?.trim())
          .filter((s): s is string => !!s);
        dealerTitle = labels.length > 0 ? Array.from(new Set(labels)).join('، ') : '—';
      }
      const totalDebt = allRows.reduce((sum, row) => {
        const v = row.debtAmount;
        if (v != null && Number.isFinite(Number(v))) return sum + Number(v);
        return sum;
      }, 0);
      const footerSpacerRowCount = 3;
      const dataRows: (string | number)[][] = allRows.map((row) => {
        const debt =
          row.debtAmount != null && Number.isFinite(Number(row.debtAmount)) ? Number(row.debtAmount) : 0;
        const dateStr =
          row.renewalDate != null && String(row.renewalDate).trim() !== ''
            ? formatDate(String(row.renewalDate), {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
              })
            : '';
        return [
          ((row.subscriberName ?? '') as string).trim() || '—',
          ((row.profileName ?? '') as string).trim() || '—',
          debt,
          dateStr,
        ];
      });
      const emptyRow: (string | number)[] = ['', '', '', ''];
      const aoa: (string | number)[][] = [
        [dealerTitle, '', '', ''],
        ['اسم المشترك', 'اسم الباقة', 'مبلغ الدين', 'تاريخ التفعيل'],
        ...dataRows,
        ...Array.from({ length: footerSpacerRowCount }, () => [...emptyRow]),
        ['مجموع الدين الكلي :', '', totalDebt, ''],
      ];
      const blob = createAccountsOtherDealerExcelBlob(aoa, {
        sheetName: 'حساب',
        colWidths: [28, 24, 14, 18],
        bodyDataRowCount: allRows.length,
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const safeDealer = dealerTitle.replace(/[^\w\u0600-\u06FF-]+/g, '_').slice(0, 40);
      link.href = url;
      link.download = `حساب_وكلاء_${safeDealer || 'تقرير'}_${normalizedRange.from}_${normalizedRange.to}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
      showSuccess('تم التنزيل', 'تم إنشاء ملف Excel.');
    } catch (e) {
      showError('تنزيل Excel', ApiService.showError(e));
    } finally {
      setIsExportingExcel(false);
    }
  };

  const handleRefresh = () => {
    void refetch();
    setLastUpdated(new Date());
  };

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
            <div className="mr-3">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">خطأ في تحميل البيانات</h3>
              <p className="mt-2 text-sm text-red-700 dark:text-red-300">{ApiService.showError(error)}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading && queryEnabled) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[50vh]">
        <WifiLoaderComponent
          background="transparent"
          desktopSize="150px"
          mobileSize="150px"
          text="تحميل حسابات مشتركين الوكلاء..."
          backColor="#E8F2FC"
          frontColor="#4645F6"
        />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">حسابات مشتركين الوكلاء</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">تفعيلات «وكيل آخر» — فلترة بالفترة والمنطقة والمنفّذ</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-gray-500 dark:text-gray-400">آخر تحديث: {lastUpdated.toLocaleTimeString('ar-EG')}</span>
          {isAdmin && (
            <select
              value={selectedAgentId}
              onChange={(e) => setSelectedAgentId(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white text-sm"
            >
              <option value="">اختر الوكيل...</option>
              {adminAgents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.companyName || a.fullName || a.username}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            onClick={() => void handleDownloadAccountExcel()}
            disabled={isExportingExcel}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="h-4 w-4" />
            {isExportingExcel ? 'جاري التنزيل…' : 'طباعة الحساب'}
          </button>
          <button
            type="button"
            onClick={handleRefresh}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md text-sm"
          >
            <RefreshCw className="h-4 w-4" />
            تحديث
          </button>
        </div>
      </div>

      {isAdmin && !selectedAgentId ? (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 text-sm text-amber-900 dark:text-amber-200">
          يرجى اختيار وكيل لعرض التقرير (للأدمن).
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              الفترة:{' '}
              <span className="font-semibold tabular-nums text-gray-900 dark:text-white">{normalizedRange.from}</span>
              <span className="mx-1 text-gray-400">—</span>
              <span className="font-semibold tabular-nums text-gray-900 dark:text-white">{normalizedRange.to}</span>
              <span className="text-gray-500 mr-1">(بغداد)</span>
              {selectedExecutorUserId ? (
                <span className="block sm:inline sm:mr-2 mt-1 sm:mt-0 text-xs text-gray-500">
                  · المنفّذ:{' '}
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    {(executorOptions.find((u) => u.id === selectedExecutorUserId)?.fullName ||
                      executorOptions.find((u) => u.id === selectedExecutorUserId)?.username ||
                      selectedExecutorUserId).trim()}
                  </span>
                </span>
              ) : null}
              {selectedDealerIds.length > 0 ? (
                <span className="block sm:inline sm:mr-2 mt-1 sm:mt-0 text-xs text-gray-500">
                  · التجار:{' '}
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    {selectedDealerIds.length} مختار
                  </span>
                </span>
              ) : null}
              {selectedPackageType != null ? (
                <span className="block sm:inline sm:mr-2 mt-1 sm:mt-0 text-xs text-gray-500">
                  · نوع الباقة:{' '}
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    {renewalPackageTypeLabel(selectedPackageType)}
                  </span>
                </span>
              ) : null}
            </p>
            <button
              type="button"
              onClick={() => {
                setAdvFromYmd(normalizedRange.from);
                setAdvToYmd(normalizedRange.to);
                setAdvExecutorUserId(selectedExecutorUserId);
                setAdvDealerIds([...selectedDealerIds]);
                setAdvPackageType(
                  selectedPackageType != null && [1, 2, 3].includes(Number(selectedPackageType))
                    ? String(selectedPackageType)
                    : ''
                );
                setShowAdvancedFilterModal(true);
              }}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <SlidersHorizontal className="h-4 w-4 opacity-80" />
              فلترة متقدمة
            </button>
          </div>

          {accountResellers.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">المناطق</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedResellerId('')}
                  className={`rounded-xl border px-3 py-2 text-right min-h-[44px] transition-colors ${
                    !selectedResellerId
                      ? 'bg-primary-100 dark:bg-primary-900/40 border-primary-500 text-primary-800 dark:text-primary-200'
                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <div className="text-sm font-semibold truncate">الكل</div>
                </button>
                {accountResellers.map((r) => {
                  const active = selectedResellerId === r.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setSelectedResellerId(r.id)}
                      className={`rounded-xl border px-3 py-2 text-right min-h-[44px] transition-colors ${
                        active
                          ? 'bg-primary-100 dark:bg-primary-900/40 border-primary-500 text-primary-800 dark:text-primary-200'
                          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      <div className="text-sm font-semibold truncate">{r.name}</div>
                      <div className="text-xs opacity-75 truncate">{formatServiceTypeLabelAr(r.serviceType as ServiceType)}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">ملخص التقرير</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              الإجماليات لجميع السجلات المطابقة للفلاتر الحالية (وليس الصفحة الحالية فقط). القيم غير المرسلة تُعرض كصفر.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3.5">
              <GlassSummaryCard title="مجموع ربح التفعيل" variant="emerald">
                {formatNumber(reportData?.totalActivationProfit ?? 0, { suffix: ' د.ع' })}
              </GlassSummaryCard>
              <GlassSummaryCard title="مجموع المبالغ (دين)" variant="violet">
                {formatNumber(reportData?.totalDebtAmount ?? 0, { suffix: ' د.ع' })}
              </GlassSummaryCard>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">سجل الحركات</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                تفعيلات «وكيل آخر» ضمن الفترة والمنطقة المختارة — النطاق{' '}
                <span className="font-medium tabular-nums">
                  {normalizedRange.from} — {normalizedRange.to}
                </span>{' '}
                بتقويم بغداد.
              </p>
            </div>
            <div className="wakeel-table-scroll">
              <table className="min-w-full text-right">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/30">
                    <th className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">اسم المشترك</th>
                    <th className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">الوكيل لهذا المشترك</th>
                    <th className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">اسم الباقة</th>
                    <th className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">نوع التجديد</th>
                    <th className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">ملاحظات</th>
                    <th className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">المبلغ (دين)</th>
                    <th className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">ربح التفعيل</th>
                    <th className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">المنفّذ</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-sm text-gray-500 dark:text-gray-400 text-center">
                        لا توجد حركات في هذه الفترة.
                      </td>
                    </tr>
                  ) : (
                    rows.map((row) => (
                        <tr
                          key={row.id}
                          className="border-b border-gray-100 dark:border-gray-700/80 hover:bg-gray-50/80 dark:hover:bg-gray-700/40"
                        >
                          <td
                            className="px-3 py-2 text-sm text-gray-900 dark:text-white max-w-[220px] truncate"
                            title={(row.subscriberName ?? '').toString()}
                          >
                            {row.subscriberName?.trim() || '—'}
                          </td>
                          <td
                            className="px-3 py-2 text-sm text-gray-900 dark:text-white max-w-[200px] truncate"
                            title={(row.dealerFullName ?? '').toString()}
                          >
                            {row.dealerFullName?.trim() || '—'}
                          </td>
                          <td
                            className="px-3 py-2 text-sm text-gray-900 dark:text-white max-w-[200px] truncate"
                            title={(row.profileName ?? '').toString()}
                          >
                            {row.profileName?.trim() || '—'}
                          </td>
                          <td className="px-3 py-2 align-middle">
                            <LedgerRenewalPackageBadge packageType={row.packageType} />
                          </td>
                          <td
                            className="px-3 py-2 text-sm text-gray-800 dark:text-gray-200 max-w-[min(14rem,40vw)] align-top whitespace-normal break-words leading-snug"
                            title={(row.notes ?? '').toString()}
                          >
                            {(row.notes ?? '').trim() || '—'}
                          </td>
                          <td className="px-3 py-2 text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap tabular-nums">
                            {row.debtAmount != null && Number.isFinite(Number(row.debtAmount))
                              ? formatNumber(Number(row.debtAmount), { suffix: ' د.ع' })
                              : '—'}
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-900 dark:text-white whitespace-nowrap tabular-nums">
                            {row.activationProfit != null && Number.isFinite(Number(row.activationProfit))
                              ? formatNumber(Number(row.activationProfit), { suffix: ' د.ع' })
                              : '—'}
                          </td>
                          <td
                            className="px-3 py-2 text-sm text-gray-800 dark:text-gray-200 max-w-[180px] truncate"
                            title={(row.executedByFullName ?? '').toString()}
                          >
                            {row.executedByFullName?.trim() || '—'}
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
            {(reportData?.ledger?.totalItems ?? 0) > 0 && (
              <Pagination
                currentPage={reportData?.ledger?.currentPage ?? 1}
                totalPages={reportData?.ledger?.totalPages ?? 1}
                totalItems={reportData?.ledger?.totalItems ?? 0}
                pageSize={reportData?.ledger?.pageSize ?? ledgerPageSize}
                hasNextPage={reportData?.ledger?.hasNextPage ?? false}
                hasPreviousPage={reportData?.ledger?.hasPreviousPage ?? false}
                onPageChange={setLedgerPage}
              />
            )}
          </div>
        </div>
      )}

      {showAdvancedFilterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" role="dialog" aria-modal="true">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <SlidersHorizontal className="h-5 w-5" />
                فلترة متقدمة
              </h2>
              <button type="button" onClick={() => setShowAdvancedFilterModal(false)} className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700" aria-label="إغلاق">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">من تاريخ</label>
                  <input type="date" value={advFromYmd} onChange={(e) => setAdvFromYmd(e.target.value)} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:text-white text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">إلى تاريخ</label>
                  <input type="date" value={advToYmd} onChange={(e) => setAdvToYmd(e.target.value)} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:text-white text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">منفّذ الإجراء</label>
                <select value={advExecutorUserId} onChange={(e) => setAdvExecutorUserId(e.target.value)} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:text-white text-sm">
                  <option value="">الكل</option>
                  {executorOptions.map((u) => (
                    <option key={u.id} value={u.id}>
                      {(u.fullName || u.username || u.id).trim()}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">نوع الباقة (ProfilePackageType)</label>
                <select
                  value={advPackageType}
                  onChange={(e) => setAdvPackageType(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:text-white text-sm"
                >
                  <option value="">الكل</option>
                  <option value={String(ProfilePackageType.Subscription)}>1 — اشتراك</option>
                  <option value={String(ProfilePackageType.Extension)}>2 — تمديد</option>
                  <option value={String(ProfilePackageType.SpecialOffer)}>3 — عرض خاص</option>
                </select>
              </div>
              <div>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">التجار (متعدد)</label>
                  <button
                    type="button"
                    onClick={() => setAdvDealerIds([])}
                    className="text-xs font-medium text-primary-600 dark:text-primary-400 hover:underline"
                  >
                    مسح الكل
                  </button>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  القائمة وفق الوكيل والمنطقة الحالية؛ يُرسل للخادم كـ dealerIds متكررة.
                </p>
                <div className="max-h-52 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-600 p-2 space-y-0.5 bg-gray-50/50 dark:bg-gray-900/20">
                  {dealersForAdvancedFilter.length === 0 ? (
                    <p className="text-xs text-gray-500 dark:text-gray-400 py-2 px-1">لا توجد تجار في القائمة.</p>
                  ) : (
                    dealersForAdvancedFilter.map((d) => (
                      <label
                        key={d.id}
                        className="flex items-center gap-2 text-sm text-gray-900 dark:text-gray-100 cursor-pointer rounded-md px-2 py-1.5 hover:bg-white/80 dark:hover:bg-gray-800/80"
                      >
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 dark:border-gray-600 shrink-0"
                          checked={advDealerIds.includes(d.id)}
                          onChange={() => {
                            setAdvDealerIds((prev) =>
                              prev.includes(d.id) ? prev.filter((x) => x !== d.id) : [...prev, d.id]
                            );
                          }}
                        />
                        <span className="truncate min-w-0" title={`${d.fullName} (${d.userName})`}>
                          {d.fullName}{' '}
                          <span className="text-gray-500 dark:text-gray-400">({d.userName})</span>
                        </span>
                      </label>
                    ))
                  )}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/40">
              <button type="button" onClick={() => setShowAdvancedFilterModal(false)} className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-600 text-sm">
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => {
                  const f = (advFromYmd || '').trim();
                  const t = (advToYmd || '').trim();
                  if (!/^\d{4}-\d{2}-\d{2}$/.test(f) || !/^\d{4}-\d{2}-\d{2}$/.test(t)) {
                    showError('خطأ', 'يرجى اختيار من تاريخ وإلى تاريخ صحيحين.');
                    return;
                  }
                  const ptRaw = (advPackageType || '').trim();
                  let nextPt: number | null = null;
                  if (ptRaw !== '') {
                    const n = Number(ptRaw);
                    if (n !== ProfilePackageType.Subscription && n !== ProfilePackageType.Extension && n !== ProfilePackageType.SpecialOffer) {
                      showError('خطأ', 'نوع الباقة غير صالح.');
                      return;
                    }
                    nextPt = n;
                  }
                  setAppliedFromYmd(f);
                  setAppliedToYmd(t);
                  setSelectedExecutorUserId(advExecutorUserId);
                  setSelectedDealerIds([...advDealerIds]);
                  setSelectedPackageType(nextPt);
                  setLedgerPage(1);
                  setShowAdvancedFilterModal(false);
                }}
                className="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium"
              >
                تطبيق
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AccountsOtherDealerPage;
