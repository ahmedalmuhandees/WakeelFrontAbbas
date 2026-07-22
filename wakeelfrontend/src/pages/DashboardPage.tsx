import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { DashboardSolidCard } from '../components/DashboardSolidCard';
import { DashboardBalanceCreditCard } from '../components/dashboard/DashboardBalanceCreditCard';
import { DashboardBarChartPanel, type DashboardBarChartItem } from '../components/dashboard/DashboardBarChartPanel';
import WifiLoaderComponent from '../components/WifiLoaderComponent';
import IraqSubAgentsMap from '../components/IraqSubAgentsMap';
import { apiService, ApiService } from '../services/api';
import { showSuccess, showError } from '../utils/notifications';
import { createXlsxBlob } from '../utils/excelExport';
import { getAgentBalance } from '../utils/balance';
import { useAuth } from '../contexts/AuthContext';
import { useOffline } from '../contexts/OfflineContext';
import { useDigits } from '../contexts/DigitsContext';
import { fetchDebtsWithCache, fetchDashboardWithCache, fetchReceiptsWithCache } from '../services/offlineSync';
import { getBaghdadDayBoundsIso, getBaghdadRangeBoundsIso, getBaghdadTodayYmd } from '../utils/iraqCalendar';
import {
  Agent,
  PaginatedResponse,
  SubscribersDashboardStats,
  MainAgentDashboardDto,
  Debt,
  DebtStatus,
  PaginationParams,
  UserRole,
  AgentReseller,
  ServiceType,
  formatServiceTypeLabelAr,
  EmployeeTask,
  EmployeeTaskType,
  EmployeeTaskStatus,
  RenewalReceipt,
} from '../types';
import {
  RefreshCw,
  X,
  FileSpreadsheet,
  MapPin,
  History,
  ListChecks,
} from 'lucide-react';

const DASHBOARD_AGENT_STORAGE_KEY = 'wakeel_dashboard_agentId';
const DASHBOARD_RESELLER_STORAGE_KEY = 'selectedOperationalResellerId';

/** ارتفاع موحّد للوحات المؤشرات (مخطط + جدول) على الشاشات العريضة */
const DASHBOARD_KPI_PANEL_HEIGHT = 'h-full min-h-0 xl:min-h-[26rem]';

/** نفس غلاف المخططات: زوايا، حدود، ظل — للجداول */
const DASHBOARD_KPI_TABLE_SHELL =
  'rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-[0_20px_50px_-12px_rgba(15,23,42,0.1)] dark:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.35)] overflow-hidden flex flex-col ' + DASHBOARD_KPI_PANEL_HEIGHT;

function dashboardEmployeeTaskTypeLabelAr(type: EmployeeTaskType): string {
  switch (type) {
    case EmployeeTaskType.SubscriberInstallation:
      return 'تنصيب مشترك';
    case EmployeeTaskType.SubscriberMaintenance:
      return 'صيانة مشترك';
    case EmployeeTaskType.AmountReception:
      return 'استلام مبلغ';
    case EmployeeTaskType.Other:
      return 'أخرى';
    default:
      return '—';
  }
}

function dashboardEmployeeTaskStatusLabelAr(status: EmployeeTaskStatus): string {
  switch (status) {
    case EmployeeTaskStatus.Pending:
      return 'معلقة';
    case EmployeeTaskStatus.Accepted:
      return 'مقبولة';
    case EmployeeTaskStatus.Completed:
      return 'مكتملة';
    case EmployeeTaskStatus.Rejected:
      return 'مرفوضة';
    default:
      return '—';
  }
}

/** شارة ملوّنة لحالة المهمة — متناسقة مع ألوان صفحة مهام الموظفين */
function dashboardEmployeeTaskStatusBadgeClass(status: EmployeeTaskStatus): string {
  switch (status) {
    case EmployeeTaskStatus.Pending:
      return 'bg-amber-100 text-amber-900 ring-1 ring-amber-200/90 dark:bg-amber-900/45 dark:text-amber-100 dark:ring-amber-600/50';
    case EmployeeTaskStatus.Accepted:
      return 'bg-sky-100 text-sky-900 ring-1 ring-sky-200/90 dark:bg-sky-900/45 dark:text-sky-100 dark:ring-sky-600/50';
    case EmployeeTaskStatus.Completed:
      return 'bg-emerald-100 text-emerald-900 ring-1 ring-emerald-200/90 dark:bg-emerald-900/45 dark:text-emerald-100 dark:ring-emerald-600/50';
    case EmployeeTaskStatus.Rejected:
      return 'bg-rose-100 text-rose-900 ring-1 ring-rose-200/90 dark:bg-rose-900/45 dark:text-rose-100 dark:ring-rose-600/50';
    default:
      return 'bg-gray-100 text-gray-800 ring-1 ring-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:ring-gray-600';
  }
}

function getBaghdadHour24(): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Baghdad',
    hour: 'numeric',
    hour12: false,
  }).formatToParts(new Date());
  const h = Number(parts.find((p) => p.type === 'hour')?.value ?? 12);
  return Number.isFinite(h) ? h : 12;
}

function dashboardTimeGreeting(isEvening: boolean): { withYa: string; plain: string } {
  return isEvening
    ? { withYa: 'مساء الخير يا', plain: 'مساء الخير' }
    : { withYa: 'صباح الخير يا', plain: 'صباح الخير' };
}

const DashboardWelcomeHeading: React.FC<{ accountDisplayName: string }> = ({ accountDisplayName }) => {
  const isEvening = getBaghdadHour24() >= 12;
  const greeting = dashboardTimeGreeting(isEvening);
  return (
    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
      {accountDisplayName ? (
        <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-1">
          <span>
            {greeting.withYa} {accountDisplayName}
          </span>
          <span
            className="inline-flex text-[1.15em] leading-none select-none drop-shadow-[0_2px_6px_rgba(244,63,94,0.35)] motion-safe:animate-[pulse_2.5s_ease-in-out_infinite]"
            role="img"
            aria-label="وردة"
          >
            🌹
          </span>
        </span>
      ) : (
        <span className="inline-flex items-center gap-x-1.5">
          <span>{greeting.plain}</span>
          <span
            className="inline-flex text-[1.15em] leading-none select-none drop-shadow-[0_2px_6px_rgba(244,63,94,0.35)]"
            role="img"
            aria-label="وردة"
          >
            🌹
          </span>
        </span>
      )}
    </h1>
  );
};

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { online } = useOffline();
  const { formatDate, formatNumber } = useDigits();
  const isAdmin = user?.role === UserRole.Admin;
  const isMainAgent = user?.role === UserRole.MainAgent;
  const accountDisplayName = (user?.fullName?.trim() || user?.username || '').trim();
  const [balance, setBalance] = useState(0);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [selectedResellerId, setSelectedResellerId] = useState<string>('');
  const [showIncomingModal, setShowIncomingModal] = useState(false);
  const [incomingFromDate, setIncomingFromDate] = useState('');
  const [incomingToDate, setIncomingToDate] = useState('');
  const [appliedIncomingFromDate, setAppliedIncomingFromDate] = useState('');
  const [appliedIncomingToDate, setAppliedIncomingToDate] = useState('');
  const [showRenewalsExcelModal, setShowRenewalsExcelModal] = useState(false);
  const [renewalsFromDate, setRenewalsFromDate] = useState('');
  const [renewalsToDate, setRenewalsToDate] = useState('');
  const [renewalsExporting, setRenewalsExporting] = useState(false);
  const [showDebtsExcelModal, setShowDebtsExcelModal] = useState(false);
  const [debtsFromDate, setDebtsFromDate] = useState('');
  const [debtsToDate, setDebtsToDate] = useState('');
  /** 'received' = الواصلة (لها paymentCreatedAt)، 'unreceived' = الغير واصلة (بدون paymentCreatedAt) */
  const [debtExportFilter, setDebtExportFilter] = useState<'received' | 'unreceived'>('received');
  const [debtsExporting, setDebtsExporting] = useState(false);

  /** نفس حدود اليوم العراقي (+03:00) الافتراضية أو المختارة — تُمرَّر لـ GET /subscribers/dashboard ولتطابق ربح التحويلات */
  const effectiveDashboardBounds = useMemo(() => {
    const f = (appliedIncomingFromDate || '').trim();
    const t = (appliedIncomingToDate || '').trim();
    if (!f && !t) {
      return getBaghdadDayBoundsIso(getBaghdadTodayYmd());
    }
    const fOk = /^\d{4}-\d{2}-\d{2}$/.test(f);
    const tOk = /^\d{4}-\d{2}-\d{2}$/.test(t);
    if (fOk && tOk) return getBaghdadRangeBoundsIso(f, t);
    if (fOk && !tOk) return getBaghdadDayBoundsIso(f);
    if (!fOk && tOk) return getBaghdadDayBoundsIso(t);
    return getBaghdadDayBoundsIso(getBaghdadTodayYmd());
  }, [appliedIncomingFromDate, appliedIncomingToDate]);

  useEffect(() => {
    apiService.getBalance()
      .then((r) => setBalance(r.balanceIqd))
      .catch(() => setBalance(getAgentBalance(user?.id)));
  }, [user?.id]);
  useEffect(() => {
    const onFocus = () => {
      apiService.getBalance()
        .then((r) => setBalance(r.balanceIqd))
        .catch(() => setBalance(getAgentBalance(user?.id)));
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [user?.id]);

  const { data: agentsResponse } = useQuery<PaginatedResponse<Agent>>({
    queryKey: ['dashboard-agents'],
    enabled: !!isAdmin,
    queryFn: () => {
      const params: PaginationParams = { page: 1, pageSize: 2000 };
      return apiService.getAllAgents(params);
    },
  });

  const agents = agentsResponse?.data ?? [];

  useEffect(() => {
    if (!isAdmin) return;
    if (!agents.length) return;
    const saved = localStorage.getItem(DASHBOARD_AGENT_STORAGE_KEY);
    if (saved && agents.some(a => a.id === saved)) {
      setSelectedAgentId(saved);
    } else {
      setSelectedAgentId(agents[0].id);
    }
  }, [isAdmin, agents.length]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isAdmin) return;
    if (!selectedAgentId) return;
    localStorage.setItem(DASHBOARD_AGENT_STORAGE_KEY, selectedAgentId);
  }, [isAdmin, selectedAgentId]);

  const { data: mainAgentDashboard, error: mainAgentDashboardError, refetch: refetchMainAgentDashboard, isLoading: mainAgentDashboardLoading } = useQuery<MainAgentDashboardDto>({
    queryKey: ['main-agent-dashboard'],
    queryFn: () => apiService.getMainAgentDashboard(),
    enabled: !!isMainAgent,
    refetchInterval: 30000,
  });

  const { data: mainAgentSubAgentsResponse } = useQuery({
    queryKey: ['main-agent-sub-agents-map'],
    queryFn: () => apiService.getMainAgentSubAgents({ page: 1, pageSize: 300 }),
    enabled: !!isMainAgent,
  });
  const mainAgentSubAgentsList = mainAgentSubAgentsResponse?.data ?? [];

  const { data: myResellers = [] } = useQuery<AgentReseller[]>({
    queryKey: ['dashboard-my-resellers'],
    queryFn: () => apiService.getMyResellers(),
    enabled: !isAdmin && !isMainAgent,
  });

  const { data: stats, error, refetch: refetchStats, isLoading: statsLoading } = useQuery<SubscribersDashboardStats>({
    queryKey: [
      'subscribers-dashboard',
      isAdmin ? selectedAgentId : 'me',
      effectiveDashboardBounds.fromDate,
      effectiveDashboardBounds.toDate,
      selectedResellerId || null,
      online,
    ],
    enabled: !isMainAgent && (!isAdmin || !!selectedAgentId),
    queryFn: () =>
      fetchDashboardWithCache(
        online,
        isAdmin
          ? {
              agentId: selectedAgentId,
              fromDate: effectiveDashboardBounds.fromDate,
              toDate: effectiveDashboardBounds.toDate,
            }
          : {
              fromDate: effectiveDashboardBounds.fromDate,
              toDate: effectiveDashboardBounds.toDate,
              resellerId: selectedResellerId || undefined,
            }
      ),
    refetchInterval: 30000,
  });

  const { data: debtsData, isLoading: debtsLoading } = useQuery({
    queryKey: ['debts-stats', 'offline', online],
    queryFn: () => fetchDebtsWithCache(online, { page: 1, pageSize: 10000 }, false),
    refetchInterval: 30000,
    enabled: !isMainAgent,
  });

  /** آخر تفعيلات من إيصالات التجديد — جلب دفعة ثم ترتيب حسب التاريخ لضمان أحدث 5 */
  const { data: recentActivationReceipts = [], isLoading: recentActivationsLoading } = useQuery<RenewalReceipt[]>({
    queryKey: [
      'dashboard-recent-activations',
      online,
      selectedResellerId || null,
      isAdmin ? selectedAgentId : 'me',
    ],
    queryFn: async () => {
      const res = await fetchReceiptsWithCache(
        online,
        1,
        40,
        undefined,
        undefined,
        selectedResellerId || undefined,
        undefined
      );
      const list = [...(res.receipts ?? [])];
      list.sort(
        (a, b) =>
          new Date(b.createdAt || b.renewalDate).getTime() -
          new Date(a.createdAt || a.renewalDate).getTime()
      );
      return list.slice(0, 5);
    },
    enabled: !isMainAgent && (!isAdmin || !!selectedAgentId),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const teamStatsEnabled =
    !isMainAgent &&
    !!user &&
    ((isAdmin && !!selectedAgentId) ||
      user.role === UserRole.Agent ||
      user.role === UserRole.SubAgent ||
      user.role === UserRole.Employee);

  /** عرض ملخص المبالغ وآخر المهام — يتطابق مع تفعيل استعلام لوحة الإحصائيات */
  const dashboardStatsSummaryVisible = !isMainAgent && (!isAdmin || !!selectedAgentId);

  const { data: recentEmployeeTasks = [], isLoading: recentEmployeeTasksLoading, isError: recentEmployeeTasksError } =
    useQuery<EmployeeTask[]>({
      queryKey: ['dashboard-recent-employee-tasks', user?.role, isAdmin ? selectedAgentId : 'me'],
      queryFn: async () => {
        let list: EmployeeTask[] = [];
        if (user?.role === UserRole.Employee) {
          const res = await apiService.getMyEmployeeTasks({ page: 1, pageSize: 30 });
          list = [...(res.data ?? [])];
        } else {
          const res = await apiService.getAgentEmployeeTasks({
            page: 1,
            pageSize: 30,
            ...(isAdmin && selectedAgentId ? { agentId: selectedAgentId } : {}),
          });
          list = [...(res.data ?? [])];
        }
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        return list.slice(0, 5);
      },
      enabled: teamStatsEnabled,
      staleTime: 30_000,
      refetchInterval: 120_000,
      retry: 1,
    });

  const debtsStats = {
    totalDebtAmount: stats?.totalDebtAmount ?? (debtsData?.data?.reduce((total: number, debt: Debt) => total + debt.amount, 0) || 0),
    totalDebtors: debtsData?.data?.length || 0
  };

  useEffect(() => {
    if (isAdmin || isMainAgent) return;
    const saved = localStorage.getItem(DASHBOARD_RESELLER_STORAGE_KEY) || '';
    if (saved && myResellers.some((r) => r.id === saved)) {
      setSelectedResellerId(saved);
      return;
    }
    setSelectedResellerId('');
  }, [isAdmin, isMainAgent, myResellers]);

  // مؤقتاً: تعطيل كروت live-balance و live-online. عند إعادة التفعيل: أعد استعلام myAgent (getMyAgent) و isSasAgent و showSasCards
  // // بيانات SAS الحية (الرصيد + عدد المتصلين) — عبر ApiService لاستخدام نفس baseURL والـ JWT
  // const { data: sasBalanceData } = useQuery<{ status: string; balance?: string | null }>({
  //   queryKey: ['sas-live-balance'],
  //   enabled: isSasAgent,
  //   refetchInterval: 10000,
  //   queryFn: () => apiService.getSasLiveBalance(),
  // });

  // const { data: sasOnlineData } = useQuery<{ status: string; onlineUsers?: number; online_users?: number }>({
  //   queryKey: ['sas-live-online'],
  //   enabled: isSasAgent,
  //   refetchInterval: 10000,
  //   queryFn: () => apiService.getSasLiveOnline(),
  // });

  // const sasBalance = sasBalanceData?.balance ?? null;
  // const sasOnlineUsers = sasOnlineData?.onlineUsers ?? sasOnlineData?.online_users ?? null;

  // // كروت SAS — عند إعادة التفعيل: showSasCards = isSasAgent && (sasBalance != null || sasOnlineUsers != null)

  const handleRefresh = () => {
    if (isMainAgent) refetchMainAgentDashboard();
    else refetchStats();
    if (!isMainAgent) {
      apiService.getBalance()
        .then((r) => setBalance(r.balanceIqd))
        .catch(() => setBalance(getAgentBalance(user?.id)));
      void queryClient.invalidateQueries({ queryKey: ['dashboard-recent-employee-tasks'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard-recent-activations'] });
    }
    showSuccess('تم التحديث', 'تم تحديث البيانات بنجاح');
  };

  const handleTotalSubscribersClick = () => {
    if (isMainAgent) navigate('/admin/main-agent/sub-agents/subscribers');
    else navigate('/admin/subscribers');
  };

  const handleActiveSubscribersClick = () => {
    if (isMainAgent) navigate('/admin/main-agent/sub-agents/subscribers');
    else navigate('/admin/subscribers?status=active');
  };

  const handleExpiringWithin3DaysClick = () => {
    if (isMainAgent) navigate('/admin/main-agent/sub-agents/subscribers');
    else navigate('/admin/subscribers?status=expiring_soon');
  };

  const handleExpiredClick = () => {
    if (isMainAgent) navigate('/admin/main-agent/sub-agents/subscribers');
    else navigate('/admin/subscribers?status=expired');
  };

  const handleResellerCardClick = (resellerId: string) => {
    const next = selectedResellerId === resellerId ? '' : resellerId;
    setSelectedResellerId(next);
    if (next) localStorage.setItem(DASHBOARD_RESELLER_STORAGE_KEY, next);
    else localStorage.removeItem(DASHBOARD_RESELLER_STORAGE_KEY);
  };

  const handleDebtsClick = () => {
    if (isMainAgent) navigate('/admin/main-agent/sub-agents/debts');
    else navigate('/admin/debts');
  };

  const handleMainAgentSubAgentsClick = () => {
    navigate('/admin/main-agent/sub-agents');
  };

  const handleBalanceClick = () => {
    navigate('/admin/receipts');
  };

  const handleIncomingClick = () => {
    if (isMainAgent) {
      navigate('/admin/main-agent/sub-agents/renewals');
      return;
    }
    const y = getBaghdadTodayYmd();
    setIncomingFromDate(appliedIncomingFromDate.trim() || y);
    setIncomingToDate(appliedIncomingToDate.trim() || y);
    setShowIncomingModal(true);
  };

  const handleRenewalsExcelClick = () => {
    setRenewalsFromDate('');
    setRenewalsToDate('');
    setShowRenewalsExcelModal(true);
  };

  const handleDebtsExcelClick = () => {
    setDebtsFromDate('');
    setDebtsToDate('');
    setShowDebtsExcelModal(true);
  };

  const handleDownloadRenewalsExcel = async () => {
    try {
      setRenewalsExporting(true);
      const blob = await apiService.exportReceiptsToExcel(
        renewalsFromDate || undefined,
        renewalsToDate || undefined
      );
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `تفعيلات_${renewalsFromDate || 'all'}_${renewalsToDate || 'all'}.xlsx`;
      document.body.appendChild(link);
      
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      showSuccess('تم التحميل', 'تم تنزيل تقرير التفعيلات بنجاح.');
      setShowRenewalsExcelModal(false);
    } catch (err: any) {
      showError('خطأ في التحميل', ApiService.showError(err));
    } finally {
      setRenewalsExporting(false);
    }
  };

  const handleDownloadDebtsExcel = async () => {
    try {
      setDebtsExporting(true);
      const pageSize = 500;
      const params: any = { page: 1, pageSize };
      const df = debtsFromDate?.split('T')[0];
      const dt = debtsToDate?.split('T')[0];
      if (df && /^\d{4}-\d{2}-\d{2}$/.test(df)) params.paymentCreatedAtFrom = `${df}T00:00:00.000Z`;
      if (dt && /^\d{4}-\d{2}-\d{2}$/.test(dt)) params.paymentCreatedAtTo = `${dt}T23:59:59.999Z`;
      // تمرير حالة الدين للـ API حتى يرجع كل الديون المطلوبة فقط (غير مدفوع = 0، مدفوع = 1)
      params.status = debtExportFilter === 'received' ? DebtStatus.Paid : DebtStatus.Unpaid;
      const allDebts: Debt[] = [];
      let page = 1;
      let res: Awaited<ReturnType<typeof apiService.getAllDebts>>;
      do {
        res = await apiService.getAllDebts({ ...params, page });
        const chunk = res?.data ?? [];
        allDebts.push(...chunk);
        if (!res?.hasNextPage || chunk.length < pageSize) break;
        page += 1;
      } while (true);
      const debts = allDebts;
      const grouped = debts.reduce((acc: Record<string, any>, debt: Debt) => {
        const key = debt.subscriberId;
        if (!acc[key]) {
          acc[key] = {
            subscriberId: debt.subscriberId,
            subscriberName: debt.subscriberName,
            subscriberPhone: debt.subscriberPhone,
            activationDate: (debt as any).activationDate ?? (debt as any).subscriberActivationDate ?? null,
            agentName: debt.agentName || debt.agentCompanyName || 'غير محدد',
            totalDebt: 0,
            unpaidDebt: 0,
            debts: [],
          };
        }
        acc[key].debts.push(debt);
        acc[key].totalDebt += debt.amount;
        if (debt.status === 0) acc[key].unpaidDebt += debt.amount;
        if (!acc[key].activationDate && ((debt as any).activationDate || (debt as any).subscriberActivationDate)) {
          acc[key].activationDate = (debt as any).activationDate ?? (debt as any).subscriberActivationDate;
        }
        return acc;
      }, {});
      const rows = Object.values(grouped);
      const headers = ['المشترك', 'رقم هاتف المشترك', 'تاريخ التفعيل', 'إجمالي الدين', 'تاريخ التسديد', 'الدين غير المدفوع', 'عدد الديون', 'وصف الدين'];
      const dataRows = rows.map((sd: any) => {
        const debtsWithPayment = (sd.debts || []).filter((d: any) => d.paymentCreatedAt);
        const latestPayment = debtsWithPayment.length === 0 ? null : debtsWithPayment.reduce((latest: any, d: any) => {
          if (!latest) return d;
          return d.paymentCreatedAt && (!latest.paymentCreatedAt || d.paymentCreatedAt > latest.paymentCreatedAt) ? d : latest;
        }, null as any);
        const dueDateStr = latestPayment?.paymentCreatedAt
          ? formatDate(latestPayment.paymentCreatedAt)
          : (() => {
              const withDue = (sd.debts || []).filter((d: any) => d.dueDate);
              const earliest = withDue.reduce((min: string | null, d: any) => {
                const dDate = d.dueDate ? new Date(d.dueDate).toISOString().split('T')[0] : null;
                if (!dDate) return min;
                return !min || dDate < min ? dDate : min;
              }, null as string | null);
              return earliest ? formatDate(earliest + 'T00:00:00') : '';
            })();
        const activationDateStr = sd.activationDate
          ? formatDate(sd.activationDate)
          : '';
        const descStr = (sd.debts || []).map((d: any) => d.description || '').filter(Boolean).join('، ') || '';
        return [
          sd.subscriberName ?? '',
          sd.subscriberPhone ?? '',
          activationDateStr,
          sd.totalDebt ?? 0,
          dueDateStr,
          sd.unpaidDebt ?? 0,
          sd.debts?.length ?? 0,
          descStr,
        ];
      });
      const sumTotalDebt = dataRows.reduce((s, row) => s + (Number(row[3]) || 0), 0);
      const sumUnpaidDebt = dataRows.reduce((s, row) => s + (Number(row[5]) || 0), 0);
      const sumDebtCount = dataRows.reduce((s, row) => s + (Number(row[6]) || 0), 0);
      const totalRow = ['المجموع', '', '', sumTotalDebt, '', sumUnpaidDebt, sumDebtCount, ''];
      const blob = createXlsxBlob([headers, ...dataRows, totalRow], 'الديون', {
        alignCenter: true,
        colWidths: [22, 16, 16, 16, 16, 18, 12, 28],
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ديون_${debtExportFilter === 'received' ? 'واصلة' : 'غير_واصلة'}_${debtsFromDate || 'all'}_${debtsToDate || 'all'}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showSuccess('تم التحميل', 'تم تنزيل تقرير الديون بنجاح.');
      setShowDebtsExcelModal(false);
    } catch (err: any) {
      showError('خطأ في التحميل', ApiService.showError(err));
    } finally {
      setDebtsExporting(false);
    }
  };

  const balanceAmountIqd = selectedResellerId ? Number(stats?.regionalBalanceIqd ?? 0) : balance;

  const sortedDashboardResellers = useMemo(
    () => [...myResellers].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)),
    [myResellers]
  );

  const subscriberChartItems = useMemo(
    () => [
      { id: 'active', label: 'الفعالين', value: stats?.active ?? 0, color: '#10b981' },
      { id: 'expiring', label: 'منتهي خلال 3 أيام', value: stats?.expiringWithin3Days ?? 0, color: '#f59e0b' },
      { id: 'expired', label: 'منتهي الصلاحية', value: stats?.expired ?? 0, color: '#f43f5e' },
      { id: 'total', label: 'إجمالي المشتركين', value: stats?.total ?? 0, color: '#6366f1' },
    ],
    [stats?.active, stats?.expiringWithin3Days, stats?.expired, stats?.total]
  );

  const financialChartItems = useMemo(() => {
    const rows: DashboardBarChartItem[] = [
      { id: 'incoming', label: 'الوارد', value: Number(stats?.incomingAmount ?? 0) || 0, color: '#10b981' },
      { id: 'debts', label: 'الديون', value: debtsStats?.totalDebtAmount || 0, color: '#8b5cf6' },
      {
        id: 'profitActivation',
        label: 'ربح التفعيل',
        value: Number(stats?.totalActivationProfit ?? 0) || 0,
        color: '#0ea5e9',
      },
      {
        id: 'profitTransfers',
        label: 'ربح التحويلات',
        value: Number(stats?.totalProfitAmount ?? 0) || 0,
        color: '#14b8a6',
      },
    ];
    if (user?.role !== UserRole.Employee || user?.canManageMaterialsAndSales) {
      rows.push({
        id: 'materials',
        label: 'مبيعات المواد',
        value: Number(stats?.totalMaterialSales ?? 0) || 0,
        color: '#f43f5e',
      });
    }
    return rows;
  }, [
    stats?.incomingAmount,
    stats?.totalActivationProfit,
    stats?.totalProfitAmount,
    stats?.totalMaterialSales,
    debtsStats?.totalDebtAmount,
    user?.role,
    user?.canManageMaterialsAndSales,
  ]);

  const mainAgentSubscriberChartItems = useMemo(
    () => [
      { id: 'active', label: 'الفعالين', value: mainAgentDashboard?.activeSubscribersCount ?? 0, color: '#10b981' },
      { id: 'expired', label: 'منتهي الصلاحية', value: mainAgentDashboard?.expiredSubscribersCount ?? 0, color: '#f43f5e' },
      { id: 'total', label: 'إجمالي المشتركين', value: mainAgentDashboard?.totalSubscribersCount ?? 0, color: '#6366f1' },
      { id: 'subAgents', label: 'المكاتب الفرعية', value: mainAgentDashboard?.subAgentsCount ?? 0, color: '#3b82f6' },
    ],
    [
      mainAgentDashboard?.activeSubscribersCount,
      mainAgentDashboard?.expiredSubscribersCount,
      mainAgentDashboard?.totalSubscribersCount,
      mainAgentDashboard?.subAgentsCount,
    ]
  );

  const handleSubscriberChartClick = (id: string) => {
    if (id === 'total') handleTotalSubscribersClick();
    else if (id === 'active') handleActiveSubscribersClick();
    else if (id === 'expiring') handleExpiringWithin3DaysClick();
    else if (id === 'expired') handleExpiredClick();
  };

  const handleFinancialChartClick = (id: string) => {
    if (id === 'incoming') handleIncomingClick();
    else if (id === 'debts') handleDebtsClick();
    else if (id === 'materials') navigate('/admin/materials/disbursed');
  };

  const handleMainAgentSubscriberChartClick = (id: string) => {
    if (id === 'subAgents') handleMainAgentSubAgentsClick();
    else if (id === 'total') handleTotalSubscribersClick();
    else if (id === 'active') handleActiveSubscribersClick();
    else if (id === 'expired') handleExpiredClick();
  };

  if ((isMainAgent ? mainAgentDashboardError : error) && online) {
    return (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-md">
          خطأ في تحميل البيانات
        </div>
      </div>
    );
  }

  if (isMainAgent ? mainAgentDashboardLoading : (statsLoading || debtsLoading)) {
    return (
      <div className="p-6 flex items-center justify-center h-screen">
        <WifiLoaderComponent
          background="transparent"
          desktopSize="150px"
          mobileSize="150px"
          text="تحميل لوحة التحكم..."
          backColor="#E8F2FC"
          frontColor="#4645F6"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f6f9] dark:bg-gray-950">
      <div className="p-4 sm:p-5 lg:p-8 max-w-[1600px] mx-auto">
      {/* ترحيب + بطاقة رصيد (العمود الثاني = اليسار في الواجهة العربية) */}
      {!isMainAgent ? (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_minmax(280px,420px)] gap-6 mb-6">
          <div className="rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-[0_20px_50px_-12px_rgba(15,23,42,0.1)] dark:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.35)] overflow-hidden">
            <div className="p-5 sm:p-7 lg:p-8 bg-gradient-to-br from-sky-50 to-white dark:from-slate-800/80 dark:to-gray-800">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:justify-between">
                <DashboardWelcomeHeading accountDisplayName={accountDisplayName} />
                <button
                  type="button"
                  onClick={handleRefresh}
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-lg shadow-indigo-600/25 transition-colors shrink-0 w-full sm:w-auto"
                >
                  <RefreshCw className="h-4 w-4" />
                  تحديث
                </button>
              </div>

              {myResellers.length > 0 && (
                <div className="mt-6 pt-6 border-t border-sky-200/60 dark:border-gray-600/80">
                  <div className="flex items-center gap-2 mb-4">
                    <MapPin className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" aria-hidden />
                    <p className="text-sm font-bold text-gray-800 dark:text-gray-100">فلترة المناطق</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => handleResellerCardClick('')}
                      className={`flex items-start gap-2 rounded-xl border px-2.5 py-2 text-right transition-all ${
                        !selectedResellerId
                          ? 'border-indigo-500 bg-indigo-600 text-white shadow-sm shadow-indigo-600/15'
                          : 'border-gray-200 dark:border-gray-600 bg-white/70 dark:bg-gray-900/40 text-gray-800 dark:text-gray-100 hover:border-indigo-300 dark:hover:border-indigo-500'
                      }`}
                    >
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                          !selectedResellerId
                            ? 'bg-white/20 text-white'
                            : 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400'
                        }`}
                      >
                        <MapPin className="h-4 w-4" strokeWidth={2} aria-hidden />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold leading-snug break-words">الكل</div>
                        <div
                          className={`text-[11px] leading-snug break-words mt-0.5 ${
                            !selectedResellerId ? 'text-white/85' : 'text-gray-500 dark:text-gray-400'
                          }`}
                        >
                          كل المناطق
                        </div>
                      </div>
                    </button>
                    {sortedDashboardResellers.map((r) => {
                      const active = selectedResellerId === r.id;
                      return (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => handleResellerCardClick(r.id)}
                          className={`flex items-start gap-2 rounded-xl border px-2.5 py-2 text-right transition-all ${
                            active
                              ? 'border-indigo-500 bg-indigo-600 text-white shadow-sm shadow-indigo-600/15'
                              : 'border-gray-200 dark:border-gray-600 bg-white/70 dark:bg-gray-900/40 text-gray-800 dark:text-gray-100 hover:border-indigo-300 dark:hover:border-indigo-500'
                          }`}
                        >
                          <div
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                              active
                                ? 'bg-white/20 text-white'
                                : 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400'
                            }`}
                          >
                            <MapPin className="h-4 w-4" strokeWidth={2} aria-hidden />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-bold leading-snug break-words">{r.name}</div>
                            <div
                              className={`text-[11px] leading-snug break-words mt-0.5 ${
                                active ? 'text-white/85' : 'text-gray-500 dark:text-gray-400'
                              }`}
                            >
                              {formatServiceTypeLabelAr(r.serviceType as ServiceType)}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={handleBalanceClick}
            className="block w-full text-right rounded-3xl focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#f4f6f9] dark:focus-visible:ring-offset-gray-950"
          >
            <DashboardBalanceCreditCard
              formattedAmount={formatNumber(balanceAmountIqd)}
              subtitle={selectedResellerId ? 'رصيد المنطقة المحددة' : 'الرصيد العام'}
            />
          </button>
        </div>
      ) : (
        <div className="rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-[0_20px_50px_-12px_rgba(15,23,42,0.1)] dark:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.35)] mb-6 overflow-hidden">
          <div className="p-5 sm:p-7 lg:p-8 bg-gradient-to-br from-sky-50 to-white dark:from-slate-800/80 dark:to-gray-800">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:justify-between">
              <DashboardWelcomeHeading accountDisplayName={accountDisplayName} />
              <button
                type="button"
                onClick={handleRefresh}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-lg shadow-indigo-600/25 transition-colors shrink-0 w-full sm:w-auto"
              >
                <RefreshCw className="h-4 w-4" />
                تحديث البيانات
              </button>
            </div>
          </div>
        </div>
      )}

      {isAdmin && (
        <div className="mb-6 rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-5 sm:p-6 shadow-[0_20px_50px_-12px_rgba(15,23,42,0.1)] dark:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.35)]">
          <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
            اختر الوكيل لعرض إحصائياته
          </label>
          <select
            value={selectedAgentId}
            onChange={(e) => setSelectedAgentId(e.target.value)}
            className="w-full sm:max-w-md px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 dark:bg-gray-800 dark:text-white"
          >
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.fullName} ({a.username})
              </option>
            ))}
          </select>
          {!selectedAgentId && (
            <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">
              يجب اختيار وكيل لعرض الأرقام.
            </p>
          )}
        </div>
      )}

      {/* لوحة الوكيل الرئيسي — إحصائيات من getMainAgentDashboard (GET /api/main-agent/dashboard) */}
      {isMainAgent && (
        <section className="mb-8" aria-label="إحصائيات الوكيل الرئيسي">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-5">
            إحصائيات الوكيل الرئيسي
          </h2>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
            <DashboardBarChartPanel
              title="مؤشرات المشتركين"
              subtitle="اضغط على عمود للانتقال"
              variant="vertical"
              items={mainAgentSubscriberChartItems}
              formatValue={(n) => formatNumber(n)}
              onItemClick={handleMainAgentSubscriberChartClick}
            />
            <DashboardBarChartPanel
              title="ملخص مالي"
              subtitle="بالدينار العراقي"
              variant="horizontal"
              items={[
                {
                  id: 'debts',
                  label: 'الديون',
                  value: mainAgentDashboard?.totalDebtsAmount ?? 0,
                  color: '#8b5cf6',
                },
                {
                  id: 'incoming',
                  label: 'الوارد',
                  value: mainAgentDashboard?.totalIncomingAmount ?? 0,
                  color: '#10b981',
                },
              ]}
              formatValue={(n) => `${formatNumber(n)} د.ع`}
              onItemClick={(id) => {
                if (id === 'debts') handleDebtsClick();
                else handleIncomingClick();
              }}
            />
          </div>

          <div className="mt-8 rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-5 sm:p-6 shadow-[0_20px_50px_-12px_rgba(15,23,42,0.1)] dark:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.35)]">
            <h3 className="text-base font-bold text-gray-800 dark:text-gray-100 mb-3">أماكن التغطية في العراق</h3>
            <IraqSubAgentsMap agents={mainAgentSubAgentsList} className="w-full" />
          </div>
        </section>
      )}

      {/* Stats Cards — من GET /Subscribers/dashboard (غير الوكيل الرئيسي) */}
      {!isMainAgent && (
      <>
      {dashboardStatsSummaryVisible && (
        <div className="mb-6 rounded-3xl border border-gray-100 bg-white p-5 shadow-[0_20px_50px_-12px_rgba(15,23,42,0.1)] dark:border-gray-700 dark:bg-gray-800 dark:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.35)] sm:p-6">
          <h3 className="mb-4 text-sm font-bold text-gray-900 dark:text-white">ملخص المبالغ</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-gray-100 bg-gray-50/80 p-4 text-right dark:border-gray-700 dark:bg-gray-900/40">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">مبالغ الاشتراكات</p>
              <p className="mt-2 text-xl font-bold tabular-nums text-gray-900 dark:text-white">
                {statsLoading ? '…' : `${formatNumber(Number(stats?.incomingAmount ?? 0))} د.ع`}
              </p>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-gray-50/80 p-4 text-right dark:border-gray-700 dark:bg-gray-900/40">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">مبالغ أرباح الاشتراكات</p>
              <p className="mt-2 text-xl font-bold tabular-nums text-gray-900 dark:text-white">
                {statsLoading ? '…' : `${formatNumber(Number(stats?.totalActivationProfit ?? 0))} د.ع`}
              </p>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-gray-50/80 p-4 text-right dark:border-gray-700 dark:bg-gray-900/40">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">مبالغ أرباح تحويلات الأرصدة</p>
              <p className="mt-2 text-xl font-bold tabular-nums text-gray-900 dark:text-white">
                {statsLoading ? '…' : `${formatNumber(Number(stats?.totalProfitAmount ?? 0))} د.ع`}
              </p>
            </div>
          </div>
        </div>
      )}

      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-5">
        مؤشرات المشتركين والمالية
      </h3>
      <div className="grid grid-cols-1 min-w-0 gap-6 mb-6 xl:grid-cols-2 xl:grid-rows-2">
        <DashboardBarChartPanel
          title="حالة المشتركين"
          subtitle="اضغط على عمود للانتقال إلى القائمة"
          variant="vertical"
          items={subscriberChartItems}
          formatValue={(n) => formatNumber(n)}
          onItemClick={handleSubscriberChartClick}
          className={DASHBOARD_KPI_PANEL_HEIGHT}
        />
        <DashboardBarChartPanel
          title="الملخص المالي"
          subtitle="المبالغ بالدينار العراقي"
          variant="horizontal"
          items={financialChartItems}
          formatValue={(n) => `${formatNumber(n)} د.ع`}
          onItemClick={handleFinancialChartClick}
          className={DASHBOARD_KPI_PANEL_HEIGHT}
        />
        <div className={DASHBOARD_KPI_TABLE_SHELL}>
          <div className="flex shrink-0 items-center gap-2 border-b border-gray-100 dark:border-gray-700 bg-gray-50/80 px-5 py-3 dark:bg-gray-900/40 sm:px-6">
            <History className="h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-400" aria-hidden />
            <h3 className="text-base font-bold text-gray-900 dark:text-white">احدث التفعيلات</h3>
          </div>
          <div className="flex min-h-0 flex-1 flex-col p-4 sm:p-5">
            {recentActivationsLoading ? (
              <div className="flex flex-1 items-center justify-center py-8">
                <p className="text-sm text-gray-500 dark:text-gray-400">جاري التحميل…</p>
              </div>
            ) : recentActivationReceipts.length === 0 ? (
              <div className="flex flex-1 items-center justify-center py-8">
                <p className="text-sm text-gray-500 dark:text-gray-400">لا توجد تفعيلات حديثة</p>
              </div>
            ) : (
              <div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto">
                <table className="w-full min-w-[280px] text-sm text-right">
                  <thead>
                    <tr className="border-b border-gray-100 text-xs font-semibold text-gray-500 dark:border-gray-700 dark:text-gray-400">
                      <th className="pb-2 pl-3 font-semibold">اسم المشترك</th>
                      <th className="whitespace-nowrap pb-2 px-2 font-semibold">المبلغ</th>
                      <th className="pb-2 pr-3 font-semibold">الباقة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentActivationReceipts.map((r) => {
                      const amount = Number(r.amountPaid ?? 0) || Number(r.finalPrice ?? 0);
                      const pkg = (r.newProfileName || r.profileName || '—').trim() || '—';
                      return (
                        <tr
                          key={r.id}
                          className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 dark:border-gray-700/80 dark:hover:bg-gray-900/30"
                        >
                          <td className="max-w-[140px] py-2.5 pl-3 font-medium break-words text-gray-900 dark:text-white sm:max-w-none">
                            <button
                              type="button"
                              onClick={() => navigate(`/admin/subscribers/${r.subscriberId}`)}
                              className="w-full text-right hover:text-indigo-600 hover:underline dark:hover:text-indigo-400 underline-offset-2"
                            >
                              {r.subscriberName?.trim() || '—'}
                            </button>
                          </td>
                          <td className="whitespace-nowrap py-2.5 px-2 tabular-nums text-gray-800 dark:text-gray-200">
                            {formatNumber(amount)} د.ع
                          </td>
                          <td className="max-w-[120px] py-2.5 pr-3 break-words text-gray-700 dark:text-gray-300 sm:max-w-[200px]">
                            {pkg}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
        <div className={DASHBOARD_KPI_TABLE_SHELL}>
          <div className="flex shrink-0 items-center gap-2 border-b border-gray-100 dark:border-gray-700 bg-gray-50/80 px-5 py-3 dark:bg-gray-900/40 sm:px-6">
            <ListChecks className="h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-400" aria-hidden />
            <h3 className="text-base font-bold text-gray-900 dark:text-white">احدث المهام للموظفين </h3>
          </div>
          <div className="flex min-h-0 flex-1 flex-col p-4 sm:p-5">
            {recentEmployeeTasksLoading ? (
              <div className="flex flex-1 items-center justify-center py-8">
                <p className="text-sm text-gray-500 dark:text-gray-400">جاري التحميل…</p>
              </div>
            ) : recentEmployeeTasksError ? (
              <div className="flex flex-1 items-center justify-center py-8">
                <p className="text-sm text-amber-600 dark:text-amber-400">تعذّر تحميل المهام</p>
              </div>
            ) : recentEmployeeTasks.length === 0 ? (
              <div className="flex flex-1 items-center justify-center py-8">
                <p className="text-sm text-gray-500 dark:text-gray-400">لا توجد مهام حديثة</p>
              </div>
            ) : (
              <div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto">
                <table className="w-full min-w-[280px] text-sm text-right">
                  <thead>
                    <tr className="border-b border-gray-100 text-xs font-semibold text-gray-500 dark:border-gray-700 dark:text-gray-400">
                      <th className="pb-2 pl-3 font-semibold">اسم الموظف</th>
                      <th className="pb-2 px-2 font-semibold">نوع المهمة</th>
                      <th className="whitespace-nowrap pb-2 pr-3 font-semibold">حالة المهمة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentEmployeeTasks.map((t) => {
                      const empName =
                        (t.employeeFullName || t.employeeName || t.employeeUserName || '').trim() || '—';
                      return (
                        <tr
                          key={t.id}
                          className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 dark:border-gray-700/80 dark:hover:bg-gray-900/30"
                        >
                          <td className="max-w-[120px] py-2.5 pl-3 font-medium break-words text-gray-900 dark:text-white sm:max-w-none">
                            {empName}
                          </td>
                          <td className="py-2.5 px-2 break-words text-gray-700 dark:text-gray-300">
                            {dashboardEmployeeTaskTypeLabelAr(t.taskType)}
                          </td>
                          <td className="py-2.5 pr-3">
                            <span
                              className={`inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-bold whitespace-nowrap ${dashboardEmployeeTaskStatusBadgeClass(
                                t.status
                              )}`}
                            >
                              {dashboardEmployeeTaskStatusLabelAr(t.status)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-8">
        <div onClick={handleRenewalsExcelClick} className="cursor-pointer">
          <DashboardSolidCard
            title="تقرير اكسل تفعيلات"
            accent="sky"
            actionLayout
            endIcon={FileSpreadsheet}
            footer="اضغط لاختيار التاريخ والتحميل"
          />
        </div>
        <div onClick={handleDebtsExcelClick} className="cursor-pointer">
          <DashboardSolidCard
            title="تقرير اكسل ديون"
            accent="violet"
            actionLayout
            endIcon={FileSpreadsheet}
            footer="اضغط لاختيار التاريخ والتحميل"
          />
        </div>
      </div>
      </>
      )}

      {/* Renewals Excel modal */}
      {showRenewalsExcelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" role="dialog" aria-modal="true">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                تقرير اكسل تفعيلات
              </h2>
              <button
                type="button"
                onClick={() => setShowRenewalsExcelModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                aria-label="إغلاق"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  من تاريخ
                </label>
                <input
                  type="date"
                  value={renewalsFromDate}
                  onChange={(e) => setRenewalsFromDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  إلى تاريخ
                </label>
                <input
                  type="date"
                  value={renewalsToDate}
                  onChange={(e) => setRenewalsToDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div className="flex gap-2 justify-end pt-2 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setShowRenewalsExcelModal(false)}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 rounded-md text-sm font-medium"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleDownloadRenewalsExcel}
                  disabled={renewalsExporting}
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md text-sm font-medium disabled:opacity-50"
                >
                  {renewalsExporting ? 'جاري التحميل...' : 'تحميل'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Debts Excel modal */}
      {showDebtsExcelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" role="dialog" aria-modal="true">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                تقرير اكسل ديون
              </h2>
              <button
                type="button"
                onClick={() => setShowDebtsExcelModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                aria-label="إغلاق"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  من تاريخ
                </label>
                <input
                  type="date"
                  value={debtsFromDate}
                  onChange={(e) => setDebtsFromDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  إلى تاريخ
                </label>
                <input
                  type="date"
                  value={debtsToDate}
                  onChange={(e) => setDebtsToDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  نوع الديون
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="debtExportFilter"
                      checked={debtExportFilter === 'received'}
                      onChange={() => setDebtExportFilter('received')}
                      className="text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">الديون الواصلة</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="debtExportFilter"
                      checked={debtExportFilter === 'unreceived'}
                      onChange={() => setDebtExportFilter('unreceived')}
                      className="text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">الديون الغير واصلة</span>
                  </label>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {debtExportFilter === 'received' ? '' : ''}
                </p>
              </div>
              <div className="flex gap-2 justify-end pt-2 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setShowDebtsExcelModal(false)}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 rounded-md text-sm font-medium"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleDownloadDebtsExcel}
                  disabled={debtsExporting}
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md text-sm font-medium disabled:opacity-50"
                >
                  {debtsExporting ? 'جاري التحميل...' : 'تحميل'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Incoming filter modal */}
      {showIncomingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" role="dialog" aria-modal="true">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                فلترة الوارد
              </h2>
              <button
                type="button"
                onClick={() => setShowIncomingModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                aria-label="إغلاق"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  من تاريخ
                </label>
                <input
                  type="date"
                  value={incomingFromDate}
                  onChange={(e) => setIncomingFromDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  إلى تاريخ
                </label>
                <input
                  type="date"
                  value={incomingToDate}
                  onChange={(e) => setIncomingToDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div className="flex gap-2 justify-end pt-2 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => {
                    setIncomingFromDate('');
                    setIncomingToDate('');
                    setAppliedIncomingFromDate('');
                    setAppliedIncomingToDate('');
                    setShowIncomingModal(false);
                  }}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 rounded-md text-sm font-medium"
                >
                  مسح
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAppliedIncomingFromDate(incomingFromDate);
                    setAppliedIncomingToDate(incomingToDate);
                    setShowIncomingModal(false);
                  }}
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md text-sm font-medium"
                >
                  تطبيق
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default DashboardPage;
