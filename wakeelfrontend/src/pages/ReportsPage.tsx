import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiService, ApiService } from '../services/api';
import Pagination from '../components/Pagination';
import { GlassSummaryCard } from '../components/GlassSummaryCard';
import WifiLoaderComponent from '../components/WifiLoaderComponent';
import { useAuth } from '../contexts/AuthContext';
import { useDigits } from '../contexts/DigitsContext';
import {
  Agent,
  AgentReseller,
  AccountLedgerEntry,
  AccountLedgerEntryKind,
  SubscriberNoteTypeOption,
  ProfilePackageType,
  Profile,
  ServiceType,
  User,
  UserRole,
  formatServiceTypeLabelAr,
} from '../types';
import { showError, showSuccess } from '../utils/notifications';
import { AlertCircle, Download, Pencil, RefreshCw, SlidersHorizontal, Trash2, X } from 'lucide-react';
import {
  getBaghdadDefaultExportRangeLast30Days,
  getBaghdadRangeBoundsIso,
  getBaghdadTodayYmd,
} from '../utils/iraqCalendar';
import { styleAccountsExportExcelBlob } from '../utils/excelExport';
import { subscriberNoteTypeLabelAr } from '../utils/subscriberNoteTypeLabels';

/**
 * اليوم التقويمي لـ renewalDate بتوقيت بغداد (yyyy-MM-dd).
 * إن لم يُذكر إزاحة في النص، يُفترض أن القيمة UTC (شائع في ASP.NET) ثم تُحوَّل لبغداد.
 */
function getBaghdadYmdFromRenewalDateString(renewalDateIso: string): string | null {
  const s = (renewalDateIso || '').trim();
  if (!s) return null;
  const d = parseApiDateInput(s);
  if (!d || Number.isNaN(d.getTime())) return null;
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Baghdad',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d);
  const y = parts.find((p) => p.type === 'year')?.value;
  const mo = parts.find((p) => p.type === 'month')?.value;
  const day = parts.find((p) => p.type === 'day')?.value;
  return y && mo && day ? `${y}-${mo}-${day}` : null;
}

/** صفوف يطابق فيها renewalDate نطاقاً تقويمياً في بغداد (تصحيح واجهة عندما لا يصفّي الخادم بدقة). */
function filterLedgerByRenewalBaghdadRange(
  rows: AccountLedgerEntry[],
  fromYmd: string,
  toYmd: string
): AccountLedgerEntry[] {
  const a = (fromYmd || '').trim();
  const b = (toYmd || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(a) || !/^\d{4}-\d{2}-\d{2}$/.test(b)) return rows;
  const from = a <= b ? a : b;
  const to = a <= b ? b : a;
  return rows.filter((row) => {
    const ymd = getBaghdadYmdFromRenewalDateString(row.renewalDate);
    if (!ymd) return false;
    return ymd >= from && ymd <= to;
  });
}

function parseApiDateInput(value: string | null | undefined): Date | null {
  const s = (value ?? '').toString().trim();
  if (!s) return null;
  const hasTz = /[zZ]|[+-]\d{2}:?\d{2}$/.test(s);
  if (hasTz) {
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  // عند غياب الـ timezone من الباكند، نعتبر التاريخ بتوقيت بغداد المحلي (UTC+3)
  // لتجنّب انزياح اليوم أثناء الفلترة عند أوقات متأخرة مثل 23:xx.
  const m = s.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2})(?::(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?)?)?$/
  );
  if (!m) {
    const fallback = new Date(s);
    return Number.isNaN(fallback.getTime()) ? null : fallback;
  }
  const [, yy, mm, dd, hh = '00', mi = '00', ss = '00', ms = '0'] = m;
  const millisecond = Number(ms.padEnd(3, '0').slice(0, 3));
  const utcTs =
    Date.UTC(Number(yy), Number(mm) - 1, Number(dd), Number(hh), Number(mi), Number(ss), millisecond) -
    3 * 60 * 60 * 1000;
  const d = new Date(utcTs);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatBaghdadDateOnly(value: string | null | undefined): string {
  const d = parseApiDateInput(value);
  if (!d) return '—';
  return new Intl.DateTimeFormat('ar-IQ', {
    timeZone: 'Asia/Baghdad',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

function ledgerKindLabelAr(kind: AccountLedgerEntryKind): string {
  if (kind === 'DebtPayment') return 'تسديد دين';
  return 'تجديد اشتراك';
}

/** تفعيلات Full في سجل AccountsFul — kind Renewal و packageType اشتراك (1) أو غير محدد */
function isAccountsFulRenewalRow(row: AccountLedgerEntry): boolean {
  return (
    row.kind === 'Renewal' &&
    (row.packageType == null ||
      row.packageType === ProfilePackageType.Subscription ||
      row.packageType === 1)
  );
}

function ledgerPaymentSourceLabel(
  row: AccountLedgerEntry,
  catalog?: SubscriberNoteTypeOption[] | null
): string {
  const v = row.subscriberNoteType;
  if (v != null && Number.isFinite(Number(v))) {
    const num = Number(v);
    const fromEnum = subscriberNoteTypeLabelAr(num);
    if (fromEnum) return fromEnum;
    if (catalog && catalog.length > 0) {
      const hit = catalog.find((x) => x.value === num);
      if (hit) return hit.label;
    }
  }
  const raw = (row.subscriberNoteTypeLabel ?? '').toString().trim();
  if (raw) return raw;
  return '—';
}

function ledgerResellerDisplayName(
  agentResellerId: string | null | undefined,
  resellers: AgentReseller[]
): string {
  const id = (agentResellerId ?? '').toString().trim();
  if (!id) return '—';
  const hit = resellers.find((r) => r.id === id);
  return (hit?.name ?? '').trim() || id;
}

function renewalPackageTypeLabel(packageType: number | null | undefined): string {
  if (packageType === 1) return 'اشتراك';
  if (packageType === 2) return 'تمديد اشتراك';
  if (packageType === 3) return 'اشتراك عرض خاص';
  return '—';
}

function LedgerRenewalPackageBadge({
  packageType,
  extension,
}: {
  packageType: number | null | undefined;
  extension?: { count?: number } | null;
}) {
  const pt = packageType === 1 || packageType === 2 || packageType === 3 ? packageType : null;
  if (pt == null) {
    return <span className="text-sm text-gray-400 dark:text-gray-500">—</span>;
  }
  const label = renewalPackageTypeLabel(pt);
  const extHint =
    extension?.count != null && Number.isFinite(extension.count)
      ? ` · عدد الامتداد: ${extension.count}`
      : '';
  const ring =
    pt === 1
      ? 'bg-sky-50 text-sky-900 ring-sky-400/75 shadow-sm shadow-sky-200/40 dark:bg-sky-950/55 dark:text-sky-50 dark:ring-sky-500/45'
      : pt === 2
        ? 'bg-emerald-50 text-emerald-950 ring-emerald-400/80 shadow-sm shadow-emerald-200/35 dark:bg-emerald-950/50 dark:text-emerald-50 dark:ring-emerald-500/45'
        : 'bg-fuchsia-50 text-fuchsia-950 ring-fuchsia-400/75 shadow-sm shadow-fuchsia-200/35 dark:bg-fuchsia-950/45 dark:text-fuchsia-50 dark:ring-fuchsia-500/40';
  return (
    <span
      title={label + extHint}
      className={`inline-flex max-w-full items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${ring}`}
    >
      {label}
    </span>
  );
}

const ReportsPage: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const { formatNumber } = useDigits();
  const queryClient = useQueryClient();

  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const isAdmin = user?.role === UserRole.Admin;
  /** حذف من سجل الحسابات: أدمن، وكيل، وكيل رئيسي — لا يظهر للموظف ولا لنائب الوكيل (يتوافق مع الباكند) */
  const canDeleteLedgerEntry =
    isAdmin || user?.role === UserRole.Agent || user?.role === UserRole.MainAgent;
  /** تعديل باقة التفعيل في السجل */
  const canEditLedgerProfile =
    isAdmin ||
    user?.role === UserRole.Agent ||
    user?.role === UserRole.MainAgent ||
    user?.role === UserRole.SubAgent ||
    (user?.role === UserRole.Employee &&
      user.canAccessAccounts !== false &&
      user.canEditAccountsLedger === true);
  const showLedgerActions = canDeleteLedgerEntry || canEditLedgerProfile;
  const [deletingLedgerKey, setDeletingLedgerKey] = useState<string | null>(null);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [editingLedgerRow, setEditingLedgerRow] = useState<AccountLedgerEntry | null>(null);
  const [selectedNewProfileId, setSelectedNewProfileId] = useState('');
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [showIncomingDateModal, setShowIncomingDateModal] = useState(false);
  const [incomingDate, setIncomingDate] = useState<string>(() => getBaghdadTodayYmd());
  /** نطاق الفترة المطبّق (تقويم بغداد yyyy-MM-dd) لـ GET /Accounts */
  const [appliedFromYmd, setAppliedFromYmd] = useState<string>(() => getBaghdadTodayYmd());
  const [appliedToYmd, setAppliedToYmd] = useState<string>(() => getBaghdadTodayYmd());
  const [showAdvancedFilterModal, setShowAdvancedFilterModal] = useState(false);
  const [advFromYmd, setAdvFromYmd] = useState('');
  const [advToYmd, setAdvToYmd] = useState('');
  const [advExecutorUserId, setAdvExecutorUserId] = useState('');
  const [advPackageType, setAdvPackageType] = useState('');
  const [advSubscriberName, setAdvSubscriberName] = useState('');
  const [selectedResellerId, setSelectedResellerId] = useState<string>('');
  /** فلترة GET /Accounts على من نفّذ التفعيل أو التسديد */
  const [selectedExecutorUserId, setSelectedExecutorUserId] = useState<string>('');
  /** فلترة GET /Accounts حسب نوع الباقة (ProfilePackageType) */
  const [selectedPackageType, setSelectedPackageType] = useState<string>('');
  /** فلترة GET /Accounts باسم المشترك */
  const [selectedSubscriberName, setSelectedSubscriberName] = useState<string>('');
  const [ledgerPage, setLedgerPage] = useState(1);
  const ledgerPageSize = 20;

  const [showExcelExportModal, setShowExcelExportModal] = useState(false);
  /** عند التفعيل لا يُرسل fromDate/toDate فيطبّق الخادم الافتراضي (مثلاً آخر 30 يوماً) */
  const [excelExportOmitDates, setExcelExportOmitDates] = useState(false);
  const [excelExportFromYmd, setExcelExportFromYmd] = useState('');
  const [excelExportToYmd, setExcelExportToYmd] = useState('');
  const [excelExportResellerId, setExcelExportResellerId] = useState('');
  const [excelExportExecutorUserId, setExcelExportExecutorUserId] = useState('');
  const [excelExportPackageType, setExcelExportPackageType] = useState('');
  const [exportingExcel, setExportingExcel] = useState(false);

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
    queryKey: ['agentResellers', 'accounts-filter', selectedAgentId],
    queryFn: () => apiService.getAgentResellers(selectedAgentId),
    enabled: isAuthenticated && isAdmin && !!selectedAgentId,
    staleTime: 60_000,
  });

  const accountResellers = isAdmin ? adminResellersForAccounts : myResellersForAccounts;

  const { data: allAgentsResponse } = useQuery({
    queryKey: ['allAgents', 'accounts-admin'],
    queryFn: () => apiService.getAllAgents({ page: 1, pageSize: 5000 }),
    enabled: isAuthenticated && isAdmin,
    retry: false,
  });
  const adminAgents = (allAgentsResponse?.data ?? []) as Agent[];

  useEffect(() => {
    setSelectedResellerId('');
    setSelectedExecutorUserId('');
    setSelectedPackageType('');
    setSelectedSubscriberName('');
    setAdvExecutorUserId('');
    setAdvPackageType('');
    setAdvSubscriberName('');
    setLedgerPage(1);
  }, [selectedAgentId]);

  useEffect(() => {
    setLedgerPage(1);
  }, [appliedFromYmd, appliedToYmd, selectedResellerId, selectedExecutorUserId, selectedPackageType, selectedSubscriberName]);

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

  const accountsQueryKey = useMemo(
    () =>
      [
        'accounts',
        isAdmin ? (selectedAgentId || null) : null,
        appliedFromYmd,
        appliedToYmd,
        selectedResellerId,
        selectedExecutorUserId,
        selectedPackageType,
        selectedSubscriberName,
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
      selectedPackageType,
      selectedSubscriberName,
      ledgerPage,
    ]
  );

  const accountsQueryEnabled =
    isAuthenticated && (isAdmin ? !!selectedAgentId : true);

  const selectedAdminAgentUserId = isAdmin
    ? (adminAgents.find((a) => a.id === selectedAgentId)?.userId ?? '')
    : '';

  const { data: accountsExecutorOptions = [] } = useQuery<User[]>({
    queryKey: [
      'accounts-executor-options',
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
      accountsQueryEnabled &&
      (isAdmin ? !!selectedAgentId : user?.role === UserRole.Agent || user?.role === UserRole.SubAgent || user?.role === UserRole.Employee),
    staleTime: 60_000,
  });

  const {
    data: accountsData,
    error: accountsError,
    refetch: refetchAccounts,
    isLoading: accountsLoading,
  } = useQuery({
    queryKey: accountsQueryKey,
    queryFn: () =>
      apiService.getAccounts({
        fromDate: accountsBounds.fromDate,
        toDate: accountsBounds.toDate,
        page: ledgerPage,
        pageSize: ledgerPageSize,
        agentId: isAdmin ? selectedAgentId : undefined,
        resellerId: selectedResellerId || undefined,
        executedByUserId: selectedExecutorUserId || undefined,
        subscriberName: selectedSubscriberName.trim() || undefined,
        packageType:
          selectedPackageType === '1' || selectedPackageType === '2' || selectedPackageType === '3'
            ? Number(selectedPackageType)
            : undefined,
      }),
    enabled: accountsQueryEnabled,
    retry: 1,
    refetchOnWindowFocus: false,
    refetchInterval: 30000,
  });

  const normalizedLedgerRange = useMemo(() => {
    const a = (appliedFromYmd || '').trim();
    const b = (appliedToYmd || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(a) || !/^\d{4}-\d{2}-\d{2}$/.test(b)) return { from: a, to: b };
    return a <= b ? { from: a, to: b } : { from: b, to: a };
  }, [appliedFromYmd, appliedToYmd]);

  const filteredLedgerRows = useMemo(
    () =>
      filterLedgerByRenewalBaghdadRange(
        accountsData?.ledger?.data ?? [],
        normalizedLedgerRange.from,
        normalizedLedgerRange.to
      ),
    [accountsData?.ledger?.data, normalizedLedgerRange.from, normalizedLedgerRange.to]
  );
  const ledgerRowsHiddenByRenewalDayFilter = Math.max(
    0,
    (accountsData?.ledger?.data ?? []).length - filteredLedgerRows.length
  );

  const handleRefresh = () => {
    void refetchAccounts();
    setLastUpdated(new Date());
  };

  const { data: ledgerEditProfilesResponse, isLoading: ledgerEditProfilesLoading } = useQuery({
    queryKey: [
      'ledger-edit-profiles',
      editingLedgerRow?.agentResellerId ?? '',
      isAdmin ? selectedAgentId : 'me',
    ],
    queryFn: () =>
      apiService.getProfiles({
        page: 1,
        pageSize: 200,
        status: 1,
        resellerId: editingLedgerRow?.agentResellerId?.trim() || undefined,
      }),
    enabled: showEditProfileModal && !!editingLedgerRow,
    staleTime: 30_000,
  });

  const ledgerEditProfiles = useMemo(() => {
    const list = ledgerEditProfilesResponse?.data ?? [];
    const rid = (editingLedgerRow?.agentResellerId ?? '').trim();
    return list.filter((p: Profile) => {
      if (!p.isActive) return false;
      if (p.packageType != null && p.packageType !== ProfilePackageType.Subscription) {
        return false;
      }
      if (rid && p.agentResellerId && p.agentResellerId !== rid) return false;
      return true;
    });
  }, [ledgerEditProfilesResponse?.data, editingLedgerRow?.agentResellerId]);

  const editLedgerProfileMutation = useMutation({
    mutationFn: ({ renewalId, newProfileId }: { renewalId: string; newProfileId: string }) =>
      apiService.updateAccountsLedgerProfile(renewalId, newProfileId, {
        agentId: isAdmin ? selectedAgentId : undefined,
      }),
    onSuccess: (data) => {
      setShowEditProfileModal(false);
      setEditingLedgerRow(null);
      setSelectedNewProfileId('');
      void queryClient.invalidateQueries({ queryKey: ['accounts'] });
      void queryClient.invalidateQueries({ queryKey: ['balance-detail'] });
      const profit = data.ledgerEntry.activationProfit;
      showSuccess(
        'تعديل الباقة',
        `تم التحديث. استرداد ${formatNumber(data.balanceRefunded, { suffix: ' د.ع' })} — خصم ${formatNumber(data.balanceDeducted, { suffix: ' د.ع' })}${
          profit != null && Number.isFinite(Number(profit))
            ? ` — ربح التفعيل: ${formatNumber(Number(profit), { suffix: ' د.ع' })}`
            : ''
        }`
      );
    },
    onError: (err: unknown) => {
      showError('تعديل الباقة', ApiService.showError(err));
    },
  });

  const openEditLedgerProfile = (row: AccountLedgerEntry) => {
    if (!canEditLedgerProfile) return;
    if (!isAccountsFulRenewalRow(row)) {
      showError('تعديل الباقة', 'يُسمح بتعديل تفعيلات الاشتراك (Full) فقط.');
      return;
    }
    if (isAdmin && !selectedAgentId.trim()) {
      showError('تعديل الباقة', 'يرجى اختيار الوكيل أولاً.');
      return;
    }
    const id = (row.id ?? '').trim();
    if (!id) {
      showError('تعديل الباقة', 'معرّف التفعيل غير صالح.');
      return;
    }
    setEditingLedgerRow(row);
    setSelectedNewProfileId('');
    setShowEditProfileModal(true);
  };

  const submitEditLedgerProfile = () => {
    const renewalId = (editingLedgerRow?.id ?? '').trim();
    const newProfileId = selectedNewProfileId.trim();
    if (!renewalId) {
      showError('تعديل الباقة', 'معرّف التفعيل غير صالح.');
      return;
    }
    if (!newProfileId) {
      showError('تعديل الباقة', 'يرجى اختيار الباقة الجديدة.');
      return;
    }
    editLedgerProfileMutation.mutate({ renewalId, newProfileId });
  };

  const handleDeleteLedgerRow = async (row: AccountLedgerEntry) => {
    if (!canDeleteLedgerEntry) return;
    if (isAdmin && !selectedAgentId.trim()) {
      showError('الحذف', 'يرجى اختيار الوكيل أولاً.');
      return;
    }
    if (row.kind !== 'Renewal' && row.kind !== 'DebtPayment') {
      showError('الحذف', 'نوع السطر غير مدعوم للحذف.');
      return;
    }
    const id = (row.id ?? '').trim();
    if (!id) {
      showError('الحذف', 'معرّف السجل غير صالح.');
      return;
    }
    const ok = window.confirm(
      'حذف هذا السطر من تقرير الحسابات؟\n' +
        (row.kind === 'Renewal'
          ? 'يُزال سطر التقرير فقط (سجل التجديد نفسه لا يُحذف).'
          : 'يُزال سجل تسديد الدين من التاريخ.')
    );
    if (!ok) return;
    const key = `${row.kind}-${id}`;
    setDeletingLedgerKey(key);
    try {
      await apiService.deleteAccountsLedgerEntry(id, {
        kind: row.kind,
        agentId: isAdmin ? selectedAgentId : undefined,
      });
      showSuccess('تم الحذف', 'تم حذف السطر من تقرير الحسابات.');
      await refetchAccounts();
    } catch (e) {
      showError('فشل الحذف', ApiService.showError(e));
    } finally {
      setDeletingLedgerKey(null);
    }
  };

  const openExcelExportModal = () => {
    setExcelExportOmitDates(false);
    setExcelExportFromYmd(normalizedLedgerRange.from);
    setExcelExportToYmd(normalizedLedgerRange.to);
    setExcelExportResellerId(selectedResellerId);
    setExcelExportExecutorUserId(selectedExecutorUserId);
    setExcelExportPackageType(selectedPackageType);
    setShowExcelExportModal(true);
  };

  const handleAccountsExcelExport = async () => {
    if (isAdmin && !selectedAgentId.trim()) {
      showError('خطأ', 'يرجى اختيار وكيل أولاً.');
      return;
    }
    let fromDate: string | undefined;
    let toDate: string | undefined;
    if (!excelExportOmitDates) {
      const f = (excelExportFromYmd || '').trim();
      const t = (excelExportToYmd || '').trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(f) || !/^\d{4}-\d{2}-\d{2}$/.test(t)) {
        showError('خطأ', 'يرجى اختيار من تاريخ وإلى تاريخ بصيغة صحيحة، أو تفعيل «بدون نطاق تاريخ (افتراضي الخادم)».');
        return;
      }
      const b = getBaghdadRangeBoundsIso(f, t);
      fromDate = b.fromDate;
      toDate = b.toDate;
    }
    setExportingExcel(true);
    try {
      const pkg =
        excelExportPackageType === '1' ||
        excelExportPackageType === '2' ||
        excelExportPackageType === '3'
          ? Number(excelExportPackageType)
          : undefined;
      const { blob, filename } = await apiService.getAccountsExportExcel({
        fromDate,
        toDate,
        agentId: isAdmin ? selectedAgentId : undefined,
        resellerId: excelExportResellerId || undefined,
        executedByUserId: excelExportExecutorUserId || undefined,
        packageType: pkg,
      });
      const styled = await styleAccountsExportExcelBlob(blob);
      const url = URL.createObjectURL(styled);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showSuccess('تم التحميل', 'تم حفظ ملف Excel بعد تنسيقه.');
      setShowExcelExportModal(false);
    } catch (e) {
      showError('فشل التصدير', ApiService.showError(e));
    } finally {
      setExportingExcel(false);
    }
  };

  if (accountsError) {
    return (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-red-400" />
            </div>
            <div className="mr-3">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">خطأ في تحميل البيانات</h3>
              <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                <p>{ApiService.showError(accountsError)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (accountsLoading && accountsQueryEnabled) {
    return (
      <div className="p-6 flex items-center justify-center h-screen">
        <WifiLoaderComponent
          background="transparent"
          desktopSize="150px"
          mobileSize="150px"
          text="تحميل حسابات المشتركين..."
          backColor="#E8F2FC"
          frontColor="#4645F6"
        />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">حسابات المشتركين</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">ملخص الحساب وسجل الحركات</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            آخر تحديث: {lastUpdated.toLocaleTimeString('ar-EG')}
          </div>
          {isAdmin && (
            <select
              value={selectedAgentId}
              onChange={(e) => setSelectedAgentId(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
              title="اختيار الوكيل"
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
            onClick={handleRefresh}
            className="flex items-center space-x-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            <span>تحديث</span>
          </button>
        </div>
      </div>

      <div className="mb-6">
        {isAdmin && !selectedAgentId ? (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 text-sm text-amber-800 dark:text-amber-200">
            يرجى اختيار وكيل لعرض حسابات المشتركين (للأدمن).
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1.5 min-w-0">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  الفترة:{' '}
                  <span className="font-semibold text-gray-900 dark:text-white tabular-nums">
                    {normalizedLedgerRange.from}
                  </span>
                  <span className="mx-1 text-gray-400">—</span>
                  <span className="font-semibold text-gray-900 dark:text-white tabular-nums">
                    {normalizedLedgerRange.to}
                  </span>
                  <span className="text-gray-500 dark:text-gray-500 mr-1">(تقويم بغداد)</span>
                </p>
                {(selectedExecutorUserId || selectedPackageType || selectedSubscriberName.trim()) && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {selectedExecutorUserId && (
                      <>
                        منفّذ الإجراء:{' '}
                        <span className="font-medium text-gray-700 dark:text-gray-300">
                          {(
                            accountsExecutorOptions.find((u) => u.id === selectedExecutorUserId)?.fullName ||
                            accountsExecutorOptions.find((u) => u.id === selectedExecutorUserId)?.username ||
                            'محدد'
                          ).trim()}
                        </span>
                      </>
                    )}
                    {selectedExecutorUserId && selectedPackageType ? ' · ' : ''}
                    {selectedSubscriberName.trim() && (
                      <>
                        {(selectedExecutorUserId || selectedPackageType) ? ' · ' : ''}
                        اسم المشترك:{' '}
                        <span className="font-medium text-gray-700 dark:text-gray-300">
                          {selectedSubscriberName.trim()}
                        </span>
                      </>
                    )}
                    {selectedPackageType && (
                      <>
                        نوع التفعيل:{' '}
                        <span className="font-medium text-gray-700 dark:text-gray-300">
                          {renewalPackageTypeLabel(Number(selectedPackageType))}
                        </span>
                      </>
                    )}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setIncomingDate(normalizedLedgerRange.from);
                    setShowIncomingDateModal(true);
                  }}
                  className="px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-100"
                >
                  تغيير التاريخ
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAdvFromYmd(normalizedLedgerRange.from);
                    setAdvToYmd(normalizedLedgerRange.to);
                    setAdvExecutorUserId(selectedExecutorUserId);
                    setAdvPackageType(selectedPackageType);
                    setAdvSubscriberName(selectedSubscriberName);
                    setShowAdvancedFilterModal(true);
                  }}
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-100"
                >
                  <SlidersHorizontal className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
                  فلترة متقدمة
                </button>
                <button
                  type="button"
                  onClick={openExcelExportModal}
                  disabled={isAdmin && !selectedAgentId}
                  title={isAdmin && !selectedAgentId ? 'اختر وكيلاً أولاً' : 'تصدير تقرير الحسابات إلى Excel'}
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-emerald-600/80 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:pointer-events-none text-white font-medium shadow-sm"
                >
                  <Download className="h-4 w-4 shrink-0" aria-hidden />
                  تصدير Excel
                </button>
              </div>
            </div>

            {accountResellers.length > 0 && (
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">المناطق</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedResellerId('')}
                    className={`rounded-xl border px-3 py-2 text-right transition-colors min-h-[44px] ${
                      !selectedResellerId
                        ? 'bg-primary-100 dark:bg-primary-900/40 border-primary-500 text-primary-800 dark:text-primary-200'
                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <div className="text-sm font-semibold truncate">الكل</div>
                    <div className="text-xs opacity-75 truncate">كل المناطق</div>
                  </button>
                  {accountResellers.map((r) => {
                    const active = selectedResellerId === r.id;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setSelectedResellerId(r.id)}
                        className={`rounded-xl border px-3 py-2 text-right transition-colors min-h-[44px] ${
                          active
                            ? 'bg-primary-100 dark:bg-primary-900/40 border-primary-500 text-primary-800 dark:text-primary-200'
                            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                      >
                        <div className="text-sm font-semibold truncate">{r.name}</div>
                        <div className="text-xs opacity-75 truncate">
                          {formatServiceTypeLabelAr(r.serviceType as ServiceType)}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">ملخص الحساب</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-3.5">
                <GlassSummaryCard title="مجموع الإيرادات" variant="emerald">
                  {formatNumber(accountsData?.totalReceived ?? 0, { suffix: ' د.ع' })}
                </GlassSummaryCard>
                <GlassSummaryCard title="إيرادات التفعيل" variant="sky">
                  {formatNumber(accountsData?.amountPaid ?? 0, { suffix: ' د.ع' })}
                </GlassSummaryCard>
                <GlassSummaryCard title="ربح التفعيل" variant="emerald">
                  {formatNumber(accountsData?.totalActivationProfit ?? 0, { suffix: ' د.ع' })}
                </GlassSummaryCard>
                <GlassSummaryCard title="مجموع تسديدات المشتركين" variant="violet">
                  {formatNumber(accountsData?.subscriberTotalDebt ?? 0, { suffix: ' د.ع' })}
                </GlassSummaryCard>
                <GlassSummaryCard title="عدد التمديدات" variant="amber">
                  {formatNumber(accountsData?.extension?.count ?? 0)}
                </GlassSummaryCard>
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden shadow-sm">
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">سجل الحركات</h3>
              </div>
              {ledgerRowsHiddenByRenewalDayFilter > 0 && (
                <div className="mx-4 mt-3 rounded-md border border-amber-200 dark:border-amber-800 bg-amber-50/90 dark:bg-amber-900/25 px-3 py-2 text-xs text-amber-950 dark:text-amber-100">
                  تم استبعاد {ledgerRowsHiddenByRenewalDayFilter} صفاً لا يطابق تاريخ التجديد ضمن النطاق (بغداد).
                  الإجماليات أعلاه من الخادم؛ لضبط القائمة والترقيم بالكامل يجب أن يصفّي الـ API بـ renewalDate ضمن fromDate/toDate.
                </div>
              )}
              <div className="wakeel-table-scroll">
                <table className="min-w-full text-right">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/30">
                      <th className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">اسم المشترك</th>
                      <th className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">النوع</th>
                      <th className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 hidden lg:table-cell">اسم الباقة</th>
                      <th className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">نوع التجديد</th>
                      <th className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 hidden xl:table-cell">جهة المبلغ الواصل</th>
                      <th className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 hidden xl:table-cell">ملاحظات</th>
                      <th className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">المبلغ</th>
                      <th className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">تاريخ تنفيذ العملية</th>
                      <th className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">تاريخ التفعيل</th>
                      <th className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 hidden md:table-cell">ربح التفعيل</th>
                      <th className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">المنفّذ</th>
                      <th className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 hidden lg:table-cell">المنطقة</th>
                      {showLedgerActions ? (
                        <th className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 w-[1%] whitespace-nowrap">
                          إجراءات
                        </th>
                      ) : null}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLedgerRows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={showLedgerActions ? 13 : 12}
                          className="px-4 py-8 text-sm text-gray-500 dark:text-gray-400 text-center"
                        >
                          {(accountsData?.ledger?.data ?? []).length > 0
                            ? 'لا توجد حركات يطابق تاريخ التجديد ضمن النطاق بتقويم بغداد (جرّب فلترة أخرى أو انتظر تصحيح الخادم).'
                            : 'لا توجد حركات في هذه الفترة.'}
                        </td>
                      </tr>
                    ) : (
                      filteredLedgerRows.map((row) => (
                        <tr
                          key={`${row.kind}-${row.id}`}
                          className="border-b border-gray-100 dark:border-gray-700/80 hover:bg-gray-50/80 dark:hover:bg-gray-700/40"
                        >
                          <td
                            className="px-3 py-2 text-sm text-gray-900 dark:text-white max-w-[220px] truncate"
                            title={(row.subscriberName ?? '').toString()}
                          >
                            {row.subscriberName || '—'}
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-900 dark:text-white whitespace-nowrap">
                            {ledgerKindLabelAr(row.kind)}
                          </td>
                          <td
                            className="px-3 py-2 text-sm text-gray-900 dark:text-white max-w-[200px] truncate hidden lg:table-cell"
                            title={(row.profileName ?? '').toString()}
                          >
                            {(row.profileName ?? '').trim() || '—'}
                          </td>
                          <td className="px-3 py-2 align-middle">
                            <LedgerRenewalPackageBadge packageType={row.packageType} extension={row.extension} />
                          </td>
                          <td
                            className="px-3 py-2 text-sm text-gray-800 dark:text-gray-200 max-w-[min(12rem,32vw)] align-top whitespace-normal break-words leading-snug hidden xl:table-cell"
                            title={ledgerPaymentSourceLabel(row, accountsData?.subscriberNoteTypes)}
                          >
                            {ledgerPaymentSourceLabel(row, accountsData?.subscriberNoteTypes)}
                          </td>
                          <td
                            className="px-3 py-2 text-sm text-gray-800 dark:text-gray-200 max-w-[min(14rem,40vw)] align-top whitespace-normal break-words leading-snug hidden xl:table-cell"
                            title={(row.notes ?? '').toString()}
                          >
                            {(row.notes ?? '').trim() || '—'}
                          </td>
                          <td className="px-3 py-2 text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap tabular-nums">
                            {formatNumber(row.amount ?? 0, { suffix: ' د.ع' })}
                          </td>
                          <td className="px-3 py-2 text-sm whitespace-nowrap">
                            <span
                              className="inline-flex rounded-md px-2 py-1 text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200 tabular-nums"
                              title={(row.createdAt ?? '').toString()}
                            >
                              {formatBaghdadDateOnly(row.createdAt)}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-sm whitespace-nowrap">
                            <span
                              className="inline-flex rounded-md px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200 tabular-nums"
                              title={(row.renewalDate ?? '').toString()}
                            >
                              {formatBaghdadDateOnly(row.renewalDate)}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-900 dark:text-white whitespace-nowrap tabular-nums hidden md:table-cell">
                            {row.kind === 'Renewal' &&
                            row.activationProfit != null &&
                            Number.isFinite(Number(row.activationProfit))
                              ? formatNumber(Number(row.activationProfit), { suffix: ' د.ع' })
                              : '—'}
                          </td>
                          <td
                            className="px-3 py-2 text-sm text-gray-800 dark:text-gray-200 max-w-[180px] truncate"
                            title={(row.executedByFullName ?? '').toString()}
                          >
                            {row.executedByFullName?.trim() || '—'}
                          </td>
                          <td
                            className="px-3 py-2 text-sm text-gray-800 dark:text-gray-200 max-w-[200px] truncate hidden lg:table-cell"
                            title={ledgerResellerDisplayName(row.agentResellerId, accountResellers)}
                          >
                            {ledgerResellerDisplayName(row.agentResellerId, accountResellers)}
                          </td>
                          {showLedgerActions ? (
                            <td className="px-3 py-2 whitespace-nowrap">
                              <div className="inline-flex items-center gap-1">
                                {canEditLedgerProfile && isAccountsFulRenewalRow(row) ? (
                                  <button
                                    type="button"
                                    title="تعديل الباقة"
                                    disabled={
                                      editLedgerProfileMutation.isPending ||
                                      !(row.id ?? '').trim() ||
                                      (isAdmin && !selectedAgentId.trim())
                                    }
                                    onClick={() => openEditLedgerProfile(row)}
                                    className="inline-flex items-center justify-center rounded-md p-1.5 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/40 disabled:opacity-40 disabled:pointer-events-none"
                                    aria-label="تعديل الباقة"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </button>
                                ) : null}
                                {canDeleteLedgerEntry ? (
                                  <button
                                    type="button"
                                    title="حذف السطر من تقرير الحسابات"
                                    disabled={
                                      deletingLedgerKey === `${row.kind}-${row.id}` ||
                                      !(row.id ?? '').trim() ||
                                      (isAdmin && !selectedAgentId.trim())
                                    }
                                    onClick={() => void handleDeleteLedgerRow(row)}
                                    className="inline-flex items-center justify-center rounded-md p-1.5 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40 disabled:opacity-40 disabled:pointer-events-none"
                                    aria-label="حذف السطر"
                                  >
                                    {deletingLedgerKey === `${row.kind}-${row.id}` ? (
                                      <RefreshCw className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Trash2 className="h-4 w-4" />
                                    )}
                                  </button>
                                ) : null}
                              </div>
                            </td>
                          ) : null}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {(accountsData?.ledger?.totalItems ?? 0) > 0 && (
                <Pagination
                  currentPage={accountsData?.ledger?.currentPage ?? 1}
                  totalPages={accountsData?.ledger?.totalPages ?? 1}
                  totalItems={accountsData?.ledger?.totalItems ?? 0}
                  pageSize={accountsData?.ledger?.pageSize ?? ledgerPageSize}
                  hasNextPage={accountsData?.ledger?.hasNextPage ?? false}
                  hasPreviousPage={accountsData?.ledger?.hasPreviousPage ?? false}
                  onPageChange={setLedgerPage}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {showIncomingDateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" role="dialog" aria-modal="true" aria-labelledby="incoming-date-title">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 id="incoming-date-title" className="text-lg font-semibold text-gray-900 dark:text-white">
                فلترة حسابات المشتركين حسب التاريخ
              </h2>
              <button
                type="button"
                onClick={() => setShowIncomingDateModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                aria-label="إغلاق"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                يُضبط «من» و«إلى» على نفس اليوم. لنطاق تواريخ استخدم «فلترة متقدمة».
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  التاريخ
                </label>
                <input
                  type="date"
                  value={incomingDate}
                  onChange={(e) => setIncomingDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div className="flex gap-2 justify-end pt-2 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => {
                    const today = getBaghdadTodayYmd();
                    setIncomingDate(today);
                    setAppliedFromYmd(today);
                    setAppliedToYmd(today);
                    setShowIncomingDateModal(false);
                  }}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 rounded-md text-sm font-medium"
                >
                  اليوم
                </button>
                <button
                  type="button"
                  onClick={() => setShowIncomingDateModal(false)}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 rounded-md text-sm font-medium"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const d = (incomingDate || '').toString().trim();
                    if (!d) {
                      showError('خطأ', 'يرجى اختيار تاريخ.');
                      return;
                    }
                    setAppliedFromYmd(d);
                    setAppliedToYmd(d);
                    setShowIncomingDateModal(false);
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

      {showAdvancedFilterModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="accounts-advanced-filter-title"
        >
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <SlidersHorizontal className="h-5 w-5 text-primary-600 dark:text-primary-400 shrink-0" aria-hidden />
                <h2 id="accounts-advanced-filter-title" className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                  فلترة متقدمة
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowAdvancedFilterModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                aria-label="إغلاق"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">من تاريخ</label>
                  <input
                    type="date"
                    value={advFromYmd}
                    onChange={(e) => setAdvFromYmd(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">إلى تاريخ</label>
                  <input
                    type="date"
                    value={advToYmd}
                    onChange={(e) => setAdvToYmd(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  منفّذ الإجراء <span className="text-gray-400 font-normal"></span>
                </label>
                <select
                  value={advExecutorUserId}
                  onChange={(e) => setAdvExecutorUserId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm dark:bg-gray-700 dark:text-white text-sm"
                >
                  <option value="">الكل</option>
                  {accountsExecutorOptions.map((u) => (
                    <option key={u.id} value={u.id}>
                      {(u.fullName || u.username || u.id).trim()}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  اسم المشترك
                </label>
                <input
                  type="text"
                  value={advSubscriberName}
                  onChange={(e) => setAdvSubscriberName(e.target.value)}
                  placeholder="بحث بالاسم أو اليوزرنيم"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm dark:bg-gray-700 dark:text-white text-sm"
                />
              </div>
              <div>
                <label htmlFor="adv-accounts-package-type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  نوع التفعيل <span className="text-gray-400 font-normal"></span>
                </label>
                <select
                  id="adv-accounts-package-type"
                  value={advPackageType}
                  onChange={(e) => setAdvPackageType(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                >
                  <option value="">الكل</option>
                  <option value={String(ProfilePackageType.Subscription)}>اشتراك</option>
                  <option value={String(ProfilePackageType.Extension)}>تمديد اشتراك</option>
                  <option value={String(ProfilePackageType.SpecialOffer)}>عرض خاص</option>
                </select>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 justify-end p-4 border-t border-gray-200 dark:border-gray-700 shrink-0 bg-gray-50/80 dark:bg-gray-900/40">
              <button
                type="button"
                onClick={() => setShowAdvancedFilterModal(false)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-gray-100 rounded-lg text-sm font-medium"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => {
                  const f = (advFromYmd || '').trim();
                  const t = (advToYmd || '').trim();
                  if (!/^\d{4}-\d{2}-\d{2}$/.test(f) || !/^\d{4}-\d{2}-\d{2}$/.test(t)) {
                    showError('خطأ', 'يرجى اختيار من تاريخ وإلى تاريخ بصيغة صحيحة.');
                    return;
                  }
                  setAppliedFromYmd(f);
                  setAppliedToYmd(t);
                  setSelectedExecutorUserId(advExecutorUserId);
                  setSelectedPackageType(advPackageType);
                  setSelectedSubscriberName(advSubscriberName.trim());
                  setLedgerPage(1);
                  setShowAdvancedFilterModal(false);
                }}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium"
              >
                تطبيق الفلترة
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditProfileModal && editingLedgerRow && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-ledger-profile-title"
        >
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 id="edit-ledger-profile-title" className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Pencil className="h-5 w-5" />
                تعديل باقة التفعيل
              </h2>
              <button
                type="button"
                onClick={() => {
                  if (!editLedgerProfileMutation.isPending) {
                    setShowEditProfileModal(false);
                    setEditingLedgerRow(null);
                    setSelectedNewProfileId('');
                  }
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                aria-label="إغلاق"
                disabled={editLedgerProfileMutation.isPending}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/30 px-3 py-2 text-sm">
                <p className="text-gray-700 dark:text-gray-200">
                  <span className="font-medium">المشترك:</span>{' '}
                  {editingLedgerRow.subscriberName?.trim() || '—'}
                </p>
                <p className="text-gray-700 dark:text-gray-200 mt-1">
                  <span className="font-medium">الباقة الحالية:</span>{' '}
                  {editingLedgerRow.profileName?.trim() || '—'}
                </p>
                <p className="text-gray-600 dark:text-gray-400 mt-1 text-xs">
                  يُحدَّث سعر الوكيل وربح التفعيل والرصيد تلقائياً حسب الفرق بين الباقتين.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  الباقة الجديدة *
                </label>
                <select
                  value={selectedNewProfileId}
                  onChange={(e) => setSelectedNewProfileId(e.target.value)}
                  disabled={editLedgerProfileMutation.isPending || ledgerEditProfilesLoading}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white disabled:opacity-60"
                >
                  <option value="">
                    {ledgerEditProfilesLoading ? 'جاري تحميل الباقات...' : '— اختر الباقة —'}
                  </option>
                  {ledgerEditProfiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {formatNumber(p.salePrice, { suffix: ' د.ع' })}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 justify-end pt-2 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditProfileModal(false);
                    setEditingLedgerRow(null);
                    setSelectedNewProfileId('');
                  }}
                  disabled={editLedgerProfileMutation.isPending}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 rounded-md text-sm font-medium disabled:opacity-50"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={submitEditLedgerProfile}
                  disabled={editLedgerProfileMutation.isPending || !selectedNewProfileId.trim()}
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md text-sm font-medium disabled:opacity-50"
                >
                  {editLedgerProfileMutation.isPending ? 'جاري الحفظ...' : 'حفظ التعديل'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showExcelExportModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="accounts-excel-export-title"
        >
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <Download className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden />
                <h2 id="accounts-excel-export-title" className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                  تصدير Excel — فلترة التقرير
                </h2>
              </div>
              <button
                type="button"
                onClick={() => !exportingExcel && setShowExcelExportModal(false)}
                disabled={exportingExcel}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors disabled:opacity-50"
                aria-label="إغلاق"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 space-y-4 overflow-y-auto">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                يُطبَّق نفس معاملات التقرير (تقويم بغداد). يمكن ترك التاريخ للخادم ليستخدم الافتراضي (مثلاً آخر 30 يوماً).
              </p>
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-1 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  checked={excelExportOmitDates}
                  disabled={exportingExcel}
                  onChange={(e) => setExcelExportOmitDates(e.target.checked)}
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  بدون نطاق تاريخ — يعتمد الخادم على الافتراضي (آخر 30 يوماً تقريباً)
                </span>
              </label>
              <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 ${excelExportOmitDates ? 'opacity-50 pointer-events-none' : ''}`}>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">من تاريخ</label>
                  <input
                    type="date"
                    value={excelExportFromYmd}
                    onChange={(e) => setExcelExportFromYmd(e.target.value)}
                    disabled={exportingExcel || excelExportOmitDates}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">إلى تاريخ</label>
                  <input
                    type="date"
                    value={excelExportToYmd}
                    onChange={(e) => setExcelExportToYmd(e.target.value)}
                    disabled={exportingExcel || excelExportOmitDates}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm"
                  />
                </div>
              </div>
              <button
                type="button"
                disabled={exportingExcel || excelExportOmitDates}
                onClick={() => {
                  const { fromYmd, toYmd } = getBaghdadDefaultExportRangeLast30Days();
                  setExcelExportFromYmd(fromYmd);
                  setExcelExportToYmd(toYmd);
                  setExcelExportOmitDates(false);
                }}
                className="text-sm text-primary-600 dark:text-primary-400 hover:underline disabled:opacity-50 disabled:no-underline"
              >
                
              </button>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">المنطقة / الرسيلر</label>
                <select
                  value={excelExportResellerId}
                  onChange={(e) => setExcelExportResellerId(e.target.value)}
                  disabled={exportingExcel || accountResellers.length === 0}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm dark:bg-gray-700 dark:text-white text-sm"
                >
                  <option value="">الكل</option>
                  {accountResellers.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">من نفّذ التفعيل</label>
                <select
                  value={excelExportExecutorUserId}
                  onChange={(e) => setExcelExportExecutorUserId(e.target.value)}
                  disabled={exportingExcel}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm dark:bg-gray-700 dark:text-white text-sm"
                >
                  <option value="">الكل</option>
                  {accountsExecutorOptions.map((u) => (
                    <option key={u.id} value={u.id}>
                      {(u.fullName || u.username || u.id).trim()}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="excel-accounts-package-type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  نوع التفعيل
                </label>
                <select
                  id="excel-accounts-package-type"
                  value={excelExportPackageType}
                  onChange={(e) => setExcelExportPackageType(e.target.value)}
                  disabled={exportingExcel}
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                >
                  <option value="">الكل</option>
                  <option value={String(ProfilePackageType.Subscription)}>اشتراك</option>
                  <option value={String(ProfilePackageType.Extension)}>تمديد اشتراك</option>
                  <option value={String(ProfilePackageType.SpecialOffer)}>عرض خاص</option>
                </select>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 justify-end p-4 border-t border-gray-200 dark:border-gray-700 shrink-0 bg-gray-50/80 dark:bg-gray-900/40">
              <button
                type="button"
                onClick={() => setShowExcelExportModal(false)}
                disabled={exportingExcel}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-gray-100 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => void handleAccountsExcelExport()}
                disabled={exportingExcel}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium disabled:opacity-60"
              >
                {exportingExcel ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" aria-hidden />
                    جاري التحميل…
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" aria-hidden />
                    تطبيق وتحميل
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsPage;