import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { apiService, ApiService, defaultSubscriberNoteTypeOptions } from '../services/api';
import { fetchSubscribersWithCache, fetchProfilesWithCache, queueOperation, buildCreateRenewalPayload, cacheProfiles } from '../services/offlineSync';
import { showSuccess, showError, showInfo } from '../utils/notifications';
import { DEFAULT_DETAILS_TEMPLATE, DEFAULT_ACTIVATION_TEMPLATE } from '../utils/activationMessage';
import { buildSubscriberNotesPatch } from '../utils/subscriberNotesPatch';
import { useConfirmation } from '../contexts/ConfirmationContext';
import { useAuth } from '../contexts/AuthContext';
import { useMyAgent } from '../hooks/useMyAgent';
import { useOffline } from '../contexts/OfflineContext';
import { useDigits } from '../contexts/DigitsContext';
import { Subscriber, SubscriptionStatus, SubscriptionType, SubscriberCreateRequest, Profile, RenewalData, RenewalActivationMode, PaymentStatus, PaginatedResponse, PaginationParams, UserRole, ServiceType, SubscriberNoteType, EARTHLINK_USER_MANAGEMENT_URL, AgentReseller, ProfilePackageType, formatServiceTypeLabelAr, SUBSCRIBER_FETCH_LIMIT_PRESETS, type SubscriberFetchLimitOption, type CashbackSynchronizationFtthResponse, type CashbackSynchronizationFtthRow, type ZainfiSubscriberDiffResponse, type ZainfiSubscriberDiffItem, type ZainfiApplyExternalExpirationRequest, type ActivationInvoicePrintSettingsDto, type BalanceTopUpRequest, type Dealer, type SubscriberNoteTypeOption, User } from '../types';
import {
  buildActivationReceiptPrintHtml,
  printActivationReceiptDocument,
  renewalLikeToActivationPrintPayload,
} from '../utils/activationReceiptPrintHtml';
import { getBaghdadDefaultExportRangeLast30Days, getBaghdadRangeBoundsIso, getBaghdadTodayYmd } from '../utils/iraqCalendar';
import { styleAccountsExportExcelBlob } from '../utils/excelExport';
import { SUBSCRIBER_NOTE_TYPE_LABEL_AR, subscriberNoteTypeLabelAr } from '../utils/subscriberNoteTypeLabels';
import EditSubscriberModal from '../components/EditSubscriberModal';
import AddNoteModal from '../components/AddNoteModal';
import Pagination from '../components/Pagination';
import WifiLoaderComponent from '../components/WifiLoaderComponent';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Eye, 
  UserPlus,
  Phone,
  X,
  Save,
  CheckSquare,
  Square,
  RefreshCw,
  MoreHorizontal,
  MessageCircle,
  ExternalLink,
  Settings2,
  FileText,
  Filter,
  Check,
  Info,
  Wallet,
  Download,
} from 'lucide-react';

const SUBSCRIBERS_TABLE_COLUMNS: { id: string; label: string }[] = [
  { id: 'secruptionId', label: 'معرف الاشتراك' },
  { id: 'subscriber', label: 'المشترك (الاسم)' },
  { id: 'username', label: 'اسم المستخدم' },
  { id: 'subscriberRegion', label: 'منطقة المشترك' },
  { id: 'phoneNumber', label: 'رقم الهاتف' },
  { id: 'agentCompanyName', label: 'شركة الوكيل' },
  { id: 'fat', label: 'الموقع الجغرافي' },
  { id: 'zone', label: 'اسم المسار' },
  { id: 'deviceSerialNumber', label: 'السيريال' },
  { id: 'noteType', label: 'نوع الملاحظة' },
  { id: 'note', label: 'الملاحظات' },
  { id: 'profile', label: 'الباقة' },
  { id: 'paymentMethod', label: 'طريقة الدفع' },
  { id: 'activationDate', label: 'تاريخ التفعيل' },
  { id: 'expirationDate', label: 'تاريخ الانتهاء' },
  { id: 'status', label: 'الحالة' },
];

function googleMapsUrlFromCoordinates(value?: string | null): string | null {
  const coordinates = (value ?? '').trim();
  const match = coordinates.match(
    /^\s*(-?\d+(?:\.\d+)?)\s*[,،]\s*(-?\d+(?:\.\d+)?)\s*$/
  );
  if (!match) return null;
  const latitude = Number(match[1]);
  const longitude = Number(match[2]);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180)
    return null;
  return `https://www.google.com/maps?q=${encodeURIComponent(`${latitude},${longitude}`)}`;
}

/** للتأكد من فتح صفحة إدارة المستخدمين فقط لـ Earthlink، وليس رابط التفعيل المباشر (#/user/activate/xxx) */
function normalizeEarthlinkActivationUrl(url: string | undefined): string | undefined {
  if (!url || typeof url !== 'string') return url;
  const u = url.trim();
  if (/admin\.earthlink\.iq/i.test(u) && (u.includes('#') || u.includes('/user/activate'))) return EARTHLINK_USER_MANAGEMENT_URL;
  return u;
}

// (SAS Python activation) تم تعليقها مؤقتاً — لا يتم تنفيذ أي منطق هنا حالياً.

const STORAGE_KEY_VISIBLE_COLUMNS = 'wakeel_subscribers_visible_columns';

const REGION_BADGE_COLORS = [
  'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200 border-blue-200 dark:border-blue-700',
  'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200 border-purple-200 dark:border-purple-700',
  'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200 border-emerald-200 dark:border-emerald-700',
  'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200 border-amber-200 dark:border-amber-700',
  'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-200 border-rose-200 dark:border-rose-700',
  'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-200 border-cyan-200 dark:border-cyan-700',
];

function pickRegionBadgeColor(regionKey: string): string {
  let hash = 0;
  for (let i = 0; i < regionKey.length; i += 1) {
    hash = (hash * 31 + regionKey.charCodeAt(i)) >>> 0;
  }
  return REGION_BADGE_COLORS[hash % REGION_BADGE_COLORS.length];
}

/** تطبيع بسيط لمطابقة «وكيل اخر» في أسماء الباقات */
function normalizeArabicForProfileKeyword(s: string): string {
  return (s || '')
    .replace(/\u0640/g, '')
    .replace(/[\u0623\u0625\u0622\u0671]/g, '\u0627')
    .replace(/\u0649/g, '\u064A')
    .replace(/\u0629/g, '\u0647')
    .toLowerCase();
}

function profileNameIndicatesOtherDealerKeyword(name: string | undefined): boolean {
  const n = normalizeArabicForProfileKeyword(name || '');
  return n.includes('وكيل اخر') || n.includes('وكيلاخر') || n.includes('لوكيل اخر');
}

/** عنوان واجهة سكربت البايثون SAS (زر تفعيل المشترك عند SAS): تسجيل الدخول /sas/login، التفعيل /sas/activate. إنتاج https://api.execute-iq.com/apipy، تطوير localhost. يمكن تخطيه بـ REACT_APP_SAS_PYTHON_API_URL */
// const SAS_PYTHON_API_BASE =
//   process.env.REACT_APP_SAS_PYTHON_API_URL ||
//   (process.env.NODE_ENV === 'production' ? 'https://api.execute-iq.com/apipy' : 'http://localhost:8000');

function getSubscriberNoteTypeLabel(noteType?: SubscriberNoteType | null, note?: string | null): string {
  const hasFreeNote = (note ?? '').toString().trim().length > 0;
  if (!noteType) return hasFreeNote ? SUBSCRIBER_NOTE_TYPE_LABEL_AR[SubscriberNoteType.Other] : '—';
  return SUBSCRIBER_NOTE_TYPE_LABEL_AR[noteType] ?? String(noteType);
}

/** تاريخ Zain للتطبيق على المشترك؛ يفضّل externalEndDate ثم عمود الانتهاء المعروض */
function resolveZainfiApplyExternalEndDate(row: ZainfiSubscriberDiffItem): string | null {
  const ext = (row.externalEndDate != null && String(row.externalEndDate).trim()) || '';
  if (ext) return ext;
  const exp = (row.expirationDate != null && String(row.expirationDate).trim()) || '';
  return exp || null;
}

function getSubscriberNoteTypeBadge(noteType?: SubscriberNoteType | null, note?: string | null) {
  const label = getSubscriberNoteTypeLabel(noteType, note);
  if (label === '—') return <span className="text-gray-400">—</span>;

  const normalizedType: SubscriberNoteType | null =
    noteType ?? (((note ?? '').toString().trim().length > 0) ? SubscriberNoteType.Other : null);

  const base = 'inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full';
  const styles: Record<number, string> = {
    [SubscriberNoteType.NoResponse]:
      'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300',
    [SubscriberNoteType.WillActivateSoon]:
      'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
    [SubscriberNoteType.DoesNotWantActivation]:
      'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300',
    [SubscriberNoteType.BadService]:
      'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300',
    [SubscriberNoteType.NeedsMaintenance]:
      'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300',
    [SubscriberNoteType.Other]:
      'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-300',
  };

  const cls = normalizedType ? (styles[normalizedType] ?? styles[SubscriberNoteType.Other]) : styles[SubscriberNoteType.Other];
  return <span className={`${base} ${cls}`}>{label}</span>;
}

function getDefaultVisibleColumns(): Record<string, boolean> {
  return SUBSCRIBERS_TABLE_COLUMNS.reduce<Record<string, boolean>>((acc, col) => {
    acc[col.id] = true;
    return acc;
  }, {});
}

function loadVisibleColumns(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_VISIBLE_COLUMNS);
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, boolean>;
      const defaults = getDefaultVisibleColumns();
      return { ...defaults, ...parsed };
    }
  } catch (_) {}
  return getDefaultVisibleColumns();
}

/** Card / Wallet وغيرها — للجدول الرئيسي ومزامنة المعاملات */
function formatPaymentMethodLabel(raw?: string | null): string {
  if (raw == null || String(raw).trim() === '') return '—';
  const v = String(raw).trim();
  const lower = v.toLowerCase();
  if (lower === 'card') return 'بطاقة دفع';
  if (lower === 'wallet') return 'محفظة الرصيد';
  return v;
}

/** مزامنة تلقائياً: الصفوف التي يعيدها الباكند مع deviceUsername فارغ لا تُعرض كمشترك */
function filterAutoSyncFtthRowsWithDeviceUsername(
  res: CashbackSynchronizationFtthResponse
): CashbackSynchronizationFtthResponse {
  const data = (res.data ?? []).filter((row) => {
    const v = row.deviceUsername;
    if (v === undefined) return true;
    return String(v).trim() !== '';
  });
  return { ...res, data, count: data.length };
}

const SubscribersPage: React.FC = () => {
  const { confirmDelete } = useConfirmation();
  const { user, isAuthenticated } = useAuth();
  const { online, refreshPendingCount } = useOffline();
  const { formatNumber, formatDate, locale } = useDigits();
  const navigate = useNavigate();

  const [searchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<SubscriptionStatus | 'all'>('all');
  const [sortDescending, setSortDescending] = useState<boolean>(true);
  const [maxDaysUntilExpiry, setMaxDaysUntilExpiry] = useState<string>('');
  const [appliedMaxDaysUntilExpiry, setAppliedMaxDaysUntilExpiry] = useState<string>('');
  const [fatFilter, setFatFilter] = useState<string>('');
  const [zoneFilter, setZoneFilter] = useState<string>('');
  const [appliedFatFilter, setAppliedFatFilter] = useState<string>('');
  const [appliedZoneFilter, setAppliedZoneFilter] = useState<string>('');
  const [noteTypeFilter, setNoteTypeFilter] = useState<string>('all');
  const [appliedNoteTypeFilter, setAppliedNoteTypeFilter] = useState<string>('all');
  const [extensionActivationFilter, setExtensionActivationFilter] = useState<boolean>(false);
  const [appliedExtensionActivationFilter, setAppliedExtensionActivationFilter] = useState<boolean>(false);
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false);
  const [showExcelExportModal, setShowExcelExportModal] = useState(false);
  const [excelExportOmitDates, setExcelExportOmitDates] = useState(false);
  const [excelExportFromYmd, setExcelExportFromYmd] = useState('');
  const [excelExportToYmd, setExcelExportToYmd] = useState('');
  const [excelExportResellerId, setExcelExportResellerId] = useState('');
  const [excelExportExecutorUserId, setExcelExportExecutorUserId] = useState('');
  const [excelExportPackageType, setExcelExportPackageType] = useState('');
  const [exportingExcel, setExportingExcel] = useState(false);
  const [expirationFromDate, setExpirationFromDate] = useState('');
  const [expirationToDate, setExpirationToDate] = useState('');
  const [appliedExpirationFromDate, setAppliedExpirationFromDate] = useState('');
  const [appliedExpirationToDate, setAppliedExpirationToDate] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRenewalModal, setShowRenewalModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [selectedSubscriberForEdit, setSelectedSubscriberForEdit] = useState<Subscriber | null>(null);
  const [selectedSubscriberForNote, setSelectedSubscriberForNote] = useState<Subscriber | null>(null);
  const [selectedSubscriberForRenewal, setSelectedSubscriberForRenewal] = useState<Subscriber | null>(null);
  const [renewalViaSasTab, setRenewalViaSasTab] = useState(false);
  const [sasLinkLoading, setSasLinkLoading] = useState(false);
  const [lastReceipt, setLastReceipt] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showActionsDropdown, setShowActionsDropdown] = useState(false);
  const [sendReminderLoading, setSendReminderLoading] = useState(false);
  const [profileSearchInAdd, setProfileSearchInAdd] = useState('');
  const [showProfileDropdownAdd, setShowProfileDropdownAdd] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const profileDropdownAddRef = useRef<HTMLDivElement>(null);
  /** يمنع إعادة ضبط المبلغ الواصل عند إعادة جلب قائمة الباقات دون تغيير الاختيار */
  const renewalProfileIdForAmountSyncRef = useRef<string>('');
  const renewalGeneralNotesTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const columnSettingsRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => loadVisibleColumns());
  const [showColumnSettings, setShowColumnSettings] = useState(false);
  const [selectedOperationalResellerId, setSelectedOperationalResellerId] = useState<string>('');
  /**
   * حد أقصى لعدد المشتركين في طلب مقارنة Zain Fi² / FiberX.
   * `null` = الكل (لا يُرسل maxSubscribersToFetch في الاستعلام).
   */
  const [subscriberFetchMaxChoice, setSubscriberFetchMaxChoice] = useState<number | null>(null);
  /** بعد التفعيل أو التفعيل (دين): عرض مودال لاختيار إرسال واتساب أو إلغاء. */
  const [postActivationWhatsApp, setPostActivationWhatsApp] = useState<{ subscriberId: string; mode: 'activation' | 'details' } | null>(null);
  const [showAutoSyncModal, setShowAutoSyncModal] = useState(false);
  const [autoSyncFtthResult, setAutoSyncFtthResult] = useState<CashbackSynchronizationFtthResponse | null>(null);
  /** نتيجة GET …/zainfi|fiberx/sync-diff عند «تحديث بيانات» لرسيلر Zain Fi² أو FiberX */
  const [zainfiDiffResult, setZainfiDiffResult] = useState<ZainfiSubscriberDiffResponse | null>(null);
  /** أيهما أُجري: لمطابقة عنوان apply-external-expiration */
  const [syncDiffProvider, setSyncDiffProvider] = useState<'zainfi' | 'fiberx' | null>(null);
  /** الرسيلر المستخدم في آخر GET sync-diff (لإرسال resellerId مع apply-external-expiration) */
  const [zainfiSyncDiffResellerId, setZainfiSyncDiffResellerId] = useState<string | null>(null);
  const [applyingZainfiExpirationSubscriberId, setApplyingZainfiExpirationSubscriberId] = useState<string | null>(null);
  const [savingFtthRowIndex, setSavingFtthRowIndex] = useState<number | null>(null);
  const [savingAllSasRows, setSavingAllSasRows] = useState(false);
  const [openingRenewalFtthRowIndex, setOpeningRenewalFtthRowIndex] = useState<number | null>(null);
  const [savedFtthRowIndices, setSavedFtthRowIndices] = useState<Set<number>>(new Set());
  const [activatedFtthRowIndices, setActivatedFtthRowIndices] = useState<Set<number>>(new Set());
  const [pendingFtthRenewalRowIndex, setPendingFtthRenewalRowIndex] = useState<number | null>(null);

  const toggleColumnVisibility = (id: string) => {
    setVisibleColumns((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem(STORAGE_KEY_VISIBLE_COLUMNS, JSON.stringify(next));
      } catch (_) {}
      return next;
    });
  };

  const col = (id: string) => (visibleColumns[id] !== false ? '' : 'hidden');

  const getSubscriberRegion = (subscriber: Subscriber): { name: string; badgeClass: string } => {
    const byName = (subscriber.agentResellerName ?? '').trim();
    const byLookup = myResellers.find((r) => r.id === subscriber.agentResellerId)?.name?.trim() ?? '';
    const regionName = byName || byLookup;
    if (!regionName) {
      return {
        name: 'بدون منطقة',
        badgeClass: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600',
      };
    }
    return { name: regionName, badgeClass: pickRegionBadgeColor(regionName.toLowerCase()) };
  };

  // Form state for adding new subscriber
  const [formData, setFormData] = useState<SubscriberCreateRequest>({
    secruptionId: '',
    username: '',
    password: '',
    firstName: '',
    lastName: '',
    phoneNumber: '',
    noteType: SubscriberNoteType.NoResponse,
    note: '',
    profileId: '',
    activationDate: new Date().toISOString().split('T')[0],
    expirationDate: new Date().toISOString().split('T')[0],
    subscriptionType: SubscriptionType.Paid,
    fat: '',
    zone: '',
    agentResellerId: ''
  });

  // Form state for renewal
  const [renewalData, setRenewalData] = useState<RenewalData>({
    subscriberId: '',
    newProfileId: '',
    paymentStatus: PaymentStatus.Paid,
    overrideSalePrice: 0,
    amountPaid: 0,
    notes: '',
    remainingAmount: 0,
    debtDescription: '',
    debtDueDate: '',
    renewalDate: '',
    activationMode: RenewalActivationMode.Full,
    dealerId: '',
    subscriberNoteType: null,
  });
  const [showOtherDealerTopUpModal, setShowOtherDealerTopUpModal] = useState(false);
  const [otherDealerTopUpForm, setOtherDealerTopUpForm] = useState<
    BalanceTopUpRequest & { topUpDate: string }
  >({
    amountIqd: 0,
    recipientName: '',
    companyName: '',
    topUpDate: new Date().toISOString().split('T')[0],
    agentResellerId: '',
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);

  const { data: subscribersResponse, error, isLoading } = useQuery<PaginatedResponse<Subscriber>>({
    queryKey: ['subscribers', 'offline', online, currentPage, pageSize, debouncedSearchTerm, statusFilter, sortDescending, appliedMaxDaysUntilExpiry, appliedFatFilter, appliedZoneFilter, appliedNoteTypeFilter, appliedExtensionActivationFilter, appliedExpirationFromDate, appliedExpirationToDate, selectedOperationalResellerId],
    queryFn: async () => {
      const daysNum = appliedMaxDaysUntilExpiry.trim() === '' ? undefined : parseInt(appliedMaxDaysUntilExpiry, 10);
      const noteTypeNum =
        appliedNoteTypeFilter === 'all' ? undefined : (parseInt(appliedNoteTypeFilter, 10) as SubscriberNoteType);
      const rawSearch = debouncedSearchTerm && debouncedSearchTerm.trim() ? debouncedSearchTerm.trim() : '';
      const employeeRequiresTwoWords = user?.role === UserRole.Employee && !user?.canViewAllSubscribers;
      const searchWords = rawSearch ? rawSearch.split(/\s+/).filter(Boolean) : [];
      const effectiveSearch =
        !rawSearch
          ? undefined
          : employeeRequiresTwoWords && searchWords.length < 2
            ? undefined
            : rawSearch;
      const params: PaginationParams = {
        page: currentPage,
        pageSize: pageSize,
        search: effectiveSearch,
        status: statusFilter !== 'all' ? statusFilter.toString() : undefined,
        sortDescending: sortDescending,
        maxDaysUntilExpiry: daysNum !== undefined && !isNaN(daysNum) && daysNum >= 0 ? daysNum : undefined,
        fat: appliedFatFilter.trim() || undefined,
        zone: appliedZoneFilter.trim() || undefined,
        noteType: noteTypeNum !== undefined && !isNaN(noteTypeNum as any) ? noteTypeNum : undefined,
        hasExtensionActivation: appliedExtensionActivationFilter || undefined,
        expirationFromDate: appliedExpirationFromDate.trim() || undefined,
        expirationToDate: appliedExpirationToDate.trim() || undefined,
        resellerId: selectedOperationalResellerId || undefined,
      };
      if (params.maxDaysUntilExpiry === undefined) delete params.maxDaysUntilExpiry;
      if (params.fat === undefined) delete params.fat;
      if (params.zone === undefined) delete params.zone;
      if (params.noteType === undefined) delete params.noteType;
      if (params.hasExtensionActivation === undefined) delete params.hasExtensionActivation;
      if (params.expirationFromDate === undefined) delete params.expirationFromDate;
      if (params.expirationToDate === undefined) delete params.expirationToDate;
      return fetchSubscribersWithCache(online, params);
    },
    enabled: true,
  });

  const subscribers = subscribersResponse?.data || [];
  const selectedSubscriber =
    selectedSubscriberForRenewal ?? subscribers?.find((s) => s.id === renewalData.subscriberId) ?? null;
  const renewalResellerIdForQuery = (selectedSubscriber?.agentResellerId ?? '').trim() || undefined;

  const { data: profilesResponse } = useQuery({
    queryKey: ['profiles', 'all', online, selectedOperationalResellerId],
    queryFn: () => fetchProfilesWithCache(online, { page: 1, pageSize: 100, resellerId: selectedOperationalResellerId || undefined }),
  });

  const profiles = React.useMemo(
    () => (profilesResponse?.data ?? []) as Profile[],
    [profilesResponse]
  );
  const activeProfiles = React.useMemo(
    () => profiles.filter((p) => p.isActive),
    [profiles]
  );
  const { data: renewalProfiles = [] } = useQuery<Profile[]>({
    queryKey: ['renewal-profiles', renewalResellerIdForQuery ?? '__no_reseller__'],
    queryFn: () => apiService.getRenewalProfiles(renewalResellerIdForQuery),
    enabled: showRenewalModal && !!selectedSubscriber,
  });

  const { data: renewalSubscriberContext } = useQuery<{
    dealers: Dealer[];
    subscriberNoteTypes: SubscriberNoteTypeOption[];
  }>({
    queryKey: [
      'renewal-subscriber-context',
      selectedSubscriber?.id ?? '',
      renewalResellerIdForQuery ?? '',
      renewalData.activationMode ?? RenewalActivationMode.Full,
    ],
    queryFn: async () => {
      const sub = selectedSubscriber!;
      const rid = renewalResellerIdForQuery;
      const mode = renewalData.activationMode ?? RenewalActivationMode.Full;
      const ctx = await apiService.getRenewalSubscriberAvailableDealers(sub.id, rid);
      let dealers = ctx.dealers;
      if (dealers.length === 0 && mode === RenewalActivationMode.OtherDealer) {
        const agentId = (sub.agentId ?? '').trim();
        if (agentId) {
          dealers = await apiService.getRenewalDealersList({
            agentId,
            resellerId: rid,
          });
        }
      }
      return { dealers, subscriberNoteTypes: ctx.subscriberNoteTypes };
    },
    enabled: showRenewalModal && !!selectedSubscriber,
    staleTime: 60_000,
  });
  const renewalAvailableDealers = React.useMemo(
    () => renewalSubscriberContext?.dealers ?? [],
    [renewalSubscriberContext?.dealers]
  );
  const renewalSubscriberNoteTypes = React.useMemo(() => {
    const fromApi = renewalSubscriberContext?.subscriberNoteTypes;
    if (fromApi && fromApi.length > 0) {
      return fromApi.map((opt) => ({
        value: opt.value,
        label: subscriberNoteTypeLabelAr(opt.value) ?? opt.label,
      }));
    }
    return defaultSubscriberNoteTypeOptions();
  }, [renewalSubscriberContext?.subscriberNoteTypes]);

  useEffect(() => {
    if ((renewalData.activationMode ?? RenewalActivationMode.Full) !== RenewalActivationMode.OtherDealer) return;
    const id = (renewalData.dealerId ?? '').trim();
    if (!id) return;
    if (!renewalAvailableDealers.some((d) => d.id === id)) {
      setRenewalData((p) => ({ ...p, dealerId: '' }));
    }
  }, [renewalAvailableDealers, renewalData.dealerId, renewalData.activationMode]);

  useEffect(() => {
    if (Array.isArray(profiles) && profiles.length > 0) {
      cacheProfiles(profiles).catch(() => {});
    }
  }, [profiles]);

  /** باقات إنشاء مشترك: نفس الرسيلر المختار في الفلتر فقط */
  const profilesForCreate = React.useMemo(() => {
    const rid = (selectedOperationalResellerId ?? '').trim();
    if (!rid) return [] as Profile[];
    return activeProfiles.filter((p) => (p.agentResellerId ?? '').trim() === rid);
  }, [activeProfiles, selectedOperationalResellerId]);

  const filteredProfilesForAdd = React.useMemo(() => {
    const list = profilesForCreate;
    const q = (profileSearchInAdd || '').trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (p) =>
        (p.name || '').toLowerCase().includes(q) ||
        String(p.salePrice || '').includes(q) ||
        (p.id || '').toLowerCase().includes(q)
    );
  }, [profilesForCreate, profileSearchInAdd]);

  /** باقات تعديل مشترك: مربوطة بـ agentResellerId للمشترك */
  const profilesForEditSubscriber = React.useMemo(() => {
    const sub = selectedSubscriberForEdit;
    if (!sub) return [] as Profile[];
    const rid = (sub.agentResellerId ?? '').trim();
    if (!rid) return activeProfiles;
    return activeProfiles.filter((p) => (p.agentResellerId ?? '').trim() === rid);
  }, [selectedSubscriberForEdit, activeProfiles]);

  useEffect(() => {
    if (!showAddModal) return;
    const rid = (selectedOperationalResellerId ?? '').trim();
    setFormData((prev) => {
      const next: SubscriberCreateRequest = { ...prev, agentResellerId: rid };
      if (!rid) return { ...next, profileId: '' };
      const stillValid = profilesForCreate.some((p) => p.id === prev.profileId);
      if (!stillValid) return { ...next, profileId: '' };
      return next;
    });
  }, [showAddModal, selectedOperationalResellerId, profilesForCreate]);

  const { data: overdueDebtsResponse } = useQuery({
    queryKey: ['overdue-unpaid-debts', 'subscriber-ids'],
    queryFn: () => apiService.getOverdueUnpaidDebts({ page: 1, pageSize: 10000 }),
    enabled: true,
  });

  const subscriberIdsWithOverdueDebt = React.useMemo(() => {
    const debts = overdueDebtsResponse?.data ?? [];
    return new Set(debts.map((d) => d.subscriberId));
  }, [overdueDebtsResponse]);

  /** الوكيل والمدير الثانوي والموظف: جلب وكيل المستخدم (للموظف/المدير الثانوي يرجع الوكيل التابع له — نفس جلسة واتساب) */
  const isAgentOrSubAgentOrEmployee = user?.role === UserRole.Agent || user?.role === UserRole.SubAgent || user?.role === UserRole.Employee;
  /** صلاحية مزامنة المشتركين / SAS (أدمن، وكيل، نائب وكيل، موظف حسب module_subscribers في الباكند) */
  const canSyncSas =
    user?.role === UserRole.Admin ||
    user?.role === UserRole.Agent ||
    user?.role === UserRole.SubAgent ||
    user?.role === UserRole.Employee;
  /** للموظف: كل إجراء يظهر فقط عند منح صلاحيته بشكل مستقل */
  const isEmployee = user?.role === UserRole.Employee;
  const showEditSubscriberAction = !isEmployee || !!user?.canEditSubscriber;
  const showDeleteSubscriberAction = !isEmployee || !!user?.canDeleteSubscriber;
  const showViewDetailsAction = !isEmployee || !!user?.canEditSubscriber || !!user?.canDeleteSubscriber;
  /** ليس موظفاً، أو موظف مع صلاحية تفعيل صريحة من GET /users/me */
  const showActivateSubscriberAction =
    user?.role !== UserRole.Employee || !!user?.canActivateSubscriber;
  const showActivateViaTabAction = showActivateSubscriberAction;
  /** للموظف بدون صلاحية عرض الكل: إلزام إدخال الاسم الأول والثاني (كلمتين على الأقل) للبحث */
  const requireTwoWordsForSearch = isEmployee && !user?.canViewAllSubscribers;
  const {
    data: myAgent,
    isLoading: myAgentLoading,
    error: myAgentError,
  } = useMyAgent(!!isAgentOrSubAgentOrEmployee || !!canSyncSas);
  const { data: myResellers = [] } = useQuery<AgentReseller[]>({
    queryKey: ['myResellers'],
    queryFn: () => apiService.getMyResellers(),
    enabled: !!isAgentOrSubAgentOrEmployee || !!canSyncSas,
  });

  const accountsExcelExportAgentId =
    user?.role === UserRole.Admin ? (myAgent?.id ?? '').trim() : '';

  const { data: accountsExecutorOptionsForExcel = [] } = useQuery<User[]>({
    queryKey: ['accounts-executor-options', 'subscribers-page', accountsExcelExportAgentId || 'me', user?.id],
    queryFn: async () => {
      if (user?.role === UserRole.Admin) {
        const aid = accountsExcelExportAgentId;
        if (!aid) return [];
        const emps = await apiService.getAgentEmployees(aid);
        const ag = myAgent;
        const list = [...emps];
        const agUid = ag?.userId?.trim();
        if (ag && agUid && !list.some((e) => e.id === agUid)) {
          list.unshift({
            id: agUid,
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
      isAuthenticated &&
      (user?.role === UserRole.Admin
        ? !!accountsExcelExportAgentId
        : isAgentOrSubAgentOrEmployee),
    staleTime: 60_000,
  });

  const { data: subscriberFetchLimitOptions = [] } = useQuery({
    queryKey: ['subscriber-fetch-limit-options'],
    queryFn: () => apiService.getSubscriberFetchLimitOptions(),
    enabled: canSyncSas,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
  const subscriberFetchLimitSelectOptions = React.useMemo((): SubscriberFetchLimitOption[] => {
    if (subscriberFetchLimitOptions.length > 0) return subscriberFetchLimitOptions;
    return SUBSCRIBER_FETCH_LIMIT_PRESETS;
  }, [subscriberFetchLimitOptions]);

  const handleSubscribersResellerCardClick = (resellerId: string) => {
    const next = selectedOperationalResellerId === resellerId ? '' : resellerId;
    setSelectedOperationalResellerId(next);
    if (next) localStorage.setItem('selectedOperationalResellerId', next);
    else localStorage.removeItem('selectedOperationalResellerId');
    setCurrentPage(1);
  };

  const [showResellerPickerModal, setShowResellerPickerModal] = useState(false);
  const [showAutoSyncResellerPickerModal, setShowAutoSyncResellerPickerModal] = useState(false);
  const defaultFtthReseller = React.useMemo(
    () =>
      myResellers.find(
        (r) =>
          r.serviceType === ServiceType.Ftth ||
          r.serviceType === ServiceType.Zainfi ||
          r.serviceType === ServiceType.Fiberx
      ) ?? null,
    [myResellers]
  );
  const autoSyncReseller = React.useMemo(() => {
    if (myAgent?.serviceType != null) {
      const byAgentType = myResellers.find((r) => r.serviceType === myAgent.serviceType);
      if (byAgentType) return byAgentType;
    }
    return defaultFtthReseller ?? myResellers[0] ?? null;
  }, [myResellers, myAgent?.serviceType, defaultFtthReseller]);
  const hasMixedResellerTypes = React.useMemo(() => {
    const types = new Set((myResellers ?? []).map((r) => r.serviceType));
    return types.size > 1;
  }, [myResellers]);

  const [pendingActivateSubscriberId, setPendingActivateSubscriberId] = useState<string | null>(null);
  const hasWhatsAppSession = !!(myAgent?.whatsAppSessionId?.trim());

  const openAccountsExcelExportModal = () => {
    setExcelExportOmitDates(false);
    const { fromYmd, toYmd } = getBaghdadDefaultExportRangeLast30Days();
    setExcelExportFromYmd(fromYmd);
    setExcelExportToYmd(toYmd);
    setExcelExportResellerId(selectedOperationalResellerId || '');
    setExcelExportExecutorUserId('');
    setExcelExportPackageType('');
    setShowExcelExportModal(true);
  };

  const handleAccountsExcelExport = async () => {
    if (user?.role === UserRole.Admin && !accountsExcelExportAgentId) {
      showError('خطأ', 'تعذر تحديد الوكيل لتصدير التقرير. تأكد من تحميل بيانات الوكيل.');
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
        agentId: user?.role === UserRole.Admin ? accountsExcelExportAgentId : undefined,
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

  useEffect(() => {
    if (!showAddModal) {
      setShowProfileDropdownAdd(false);
      setProfileSearchInAdd('');
    }
  }, [showAddModal]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showProfileDropdownAdd && profileDropdownAddRef.current && !profileDropdownAddRef.current.contains(e.target as Node)) {
        setShowProfileDropdownAdd(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showProfileDropdownAdd]);

  // Initialize filter from URL parameters
  useEffect(() => {
    const statusParam = searchParams.get('status');
    if (statusParam) {
      switch (statusParam) {
        case 'active':
          setStatusFilter(SubscriptionStatus.Active);
          break;
        case 'expiring_soon':
          setStatusFilter(SubscriptionStatus.ExpiringSoon);
          break;
        case 'expired':
          setStatusFilter(SubscriptionStatus.Expired);
          break;
        case 'expired_today':
          setStatusFilter(SubscriptionStatus.ExpiredToday);
          break;
        default:
          setStatusFilter('all');
      }
    }
  }, [searchParams]);

  const profilesList = React.useMemo(() => {
    const raw = (renewalProfiles ?? []) as Profile[];
    const active = raw.filter((p) => p.isActive);
    const subReseller = (selectedSubscriber?.agentResellerId ?? '').trim();
    if (subReseller) return active.filter((p) => (p.agentResellerId ?? '').trim() === subReseller);
    return active.filter((p) => !(p.agentResellerId ?? '').trim());
  }, [renewalProfiles, selectedSubscriber?.agentResellerId]);
  const renewalInfo = React.useMemo(
    () =>
      selectedSubscriber
        ? {
    subscriberId: selectedSubscriber.id,
    subscriberName: selectedSubscriber.fullName || 'غير محدد',
    subscriberPhone: selectedSubscriber.phoneNumber || 'غير محدد',
    currentProfile: {
              id: selectedSubscriber.profileName || 'غير محدد',
      name: selectedSubscriber.profileName || 'غير محدد',
      price: selectedSubscriber.profilePrice || 0
    },
    expirationDate: selectedSubscriber.expirationDate,
    daysUntilExpiry: selectedSubscriber.daysUntilExpiry || 0,
            availableProfiles: profilesList
          }
        : null,
    [selectedSubscriber, profilesList]
  );
  const daysUntilExpiryText = React.useMemo(() => {
    const raw = selectedSubscriber?.daysUntilExpiryText?.trim();
    if (raw) return raw;
    if ((selectedSubscriber?.daysUntilExpiry || 0) > 0) return `${selectedSubscriber?.daysUntilExpiry} يوم متبقي`;
    return '';
  }, [selectedSubscriber?.daysUntilExpiry, selectedSubscriber?.daysUntilExpiryText]);

  const renewalProfilesForSelect = React.useMemo(() => {
    const list = [...profilesList];
    if ((renewalData.activationMode ?? RenewalActivationMode.Full) !== RenewalActivationMode.OtherDealer) {
      return list;
    }
    return list.sort((a, b) => {
      const ma = profileNameIndicatesOtherDealerKeyword(a.name);
      const mb = profileNameIndicatesOtherDealerKeyword(b.name);
      if (ma !== mb) return ma ? -1 : 1;
      return (a.name || '').localeCompare(b.name || '', 'ar');
    });
  }, [profilesList, renewalData.activationMode]);

  const renewalModalBalanceQueryEnabled =
    isAuthenticated &&
    showRenewalModal &&
    (user?.role !== UserRole.Employee || user?.canAccessAccounts !== false) &&
    (renewalData.activationMode ?? RenewalActivationMode.Full) === RenewalActivationMode.OtherDealer &&
    !!selectedSubscriber;

  const { data: renewalModalBalanceDetail } = useQuery({
    queryKey: ['balance-detail'],
    queryFn: () => apiService.getBalance(),
    enabled: renewalModalBalanceQueryEnabled,
    staleTime: 30_000,
  });

  const renewalModalResellerRows = renewalModalBalanceDetail?.resellerBalances ?? [];
  const hasRenewalModalResellerRegions = renewalModalResellerRows.length > 0;

  useEffect(() => {
    if (renewalInfo && !renewalData.newProfileId) {
      const currentProfile = renewalInfo.availableProfiles?.find(p => p.name === renewalInfo.currentProfile.name);
      if (currentProfile) {
        const salePrice = currentProfile.salePrice || 0;
        setRenewalData(prev => ({
          ...prev,
          newProfileId: currentProfile.id,
          overrideSalePrice: salePrice,
          amountPaid: salePrice,
          remainingAmount: 0,
          debtDescription: '',
          debtDueDate: '',
          renewalDate: '',
        }));
      }
    }
  }, [renewalInfo, renewalData.newProfileId]);

  useEffect(() => {
    if (!showRenewalModal) {
      renewalProfileIdForAmountSyncRef.current = '';
    }
  }, [showRenewalModal]);

  useEffect(() => {
    if (!renewalData.newProfileId || !renewalInfo?.availableProfiles) return;
    const selectedProfile = renewalInfo.availableProfiles.find((p) => p.id === renewalData.newProfileId);
    if (!selectedProfile) return;

    const pid = renewalData.newProfileId;
    const profileSelectionChanged = renewalProfileIdForAmountSyncRef.current !== pid;
    if (!profileSelectionChanged) return;
    renewalProfileIdForAmountSyncRef.current = pid;

    const salePrice = selectedProfile.salePrice || 0;
    const amountPaid = salePrice;
    const calculatedRemaining = 0;

    setRenewalData((prev) => ({
      ...prev,
      overrideSalePrice: salePrice,
      amountPaid,
      remainingAmount: calculatedRemaining,
      debtDescription:
        calculatedRemaining === 0
          ? ''
          : !(prev.debtDescription || '').trim()
            ? `الباقي من المبلغ: ${formatNumber(calculatedRemaining, { suffix: ' د.ع' })}`
            : (prev.debtDescription ?? ''),
      debtDueDate: calculatedRemaining === 0 ? '' : prev.debtDueDate,
    }));
  }, [renewalData.newProfileId, renewalInfo?.availableProfiles, formatNumber]);

  const deleteSubscriberMutation = useMutation({
    mutationFn: (id: string) => apiService.deleteSubscriber(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscribers'] });
      showSuccess('تم الحذف', 'تم حذف المشترك بنجاح');
    },
    onError: (error: any) => {
      console.error('Error deleting subscriber:', error);
      const errorMessage = ApiService.showError(error);
      showError('خطأ في الحذف', errorMessage);
    }
  });

  type AutoSyncMutationResult =
    | { mode: 'fiProviderDiff'; provider: 'zainfi' | 'fiberx'; payload: ZainfiSubscriberDiffResponse }
    | { mode: 'ftthSas'; payload: CashbackSynchronizationFtthResponse };

  const synchronizationFtthMutation = useMutation({
    mutationFn: async (selectedReseller?: AgentReseller | null): Promise<AutoSyncMutationResult> => {
      const targetReseller = selectedReseller ?? autoSyncReseller;
      if (!targetReseller?.id) {
        throw new Error('لا يوجد رسيلر للمزامنة.');
      }
      const agentId = user?.role === UserRole.Admin ? myAgent?.id : undefined;
      const maxFetch =
        subscriberFetchMaxChoice != null && subscriberFetchMaxChoice > 0 ? subscriberFetchMaxChoice : null;

      if (targetReseller.serviceType === ServiceType.Zainfi) {
        const payload = await apiService.getZainfiSyncDiff({
          resellerId: targetReseller.id,
          maxSubscribersToFetch: maxFetch,
          agentId,
        });
        return { mode: 'fiProviderDiff', provider: 'zainfi', payload };
      }

      if (targetReseller.serviceType === ServiceType.Fiberx) {
        const payload = await apiService.getFiberxSyncDiff({
          resellerId: targetReseller.id,
          maxSubscribersToFetch: maxFetch,
          agentId,
        });
        return { mode: 'fiProviderDiff', provider: 'fiberx', payload };
      }

      if (targetReseller.serviceType === ServiceType.Sas) {
        const res = await apiService.synchronizationSASDiff({
          resellerId: targetReseller.id || undefined,
          agentId,
          onlyDiff: true,
        });
        return { mode: 'ftthSas', payload: filterAutoSyncFtthRowsWithDeviceUsername(res) };
      }

      const res = await apiService.synchronizationFTTHDiff({
        resellerId: targetReseller.id || undefined,
        agentId,
      });
      return { mode: 'ftthSas', payload: filterAutoSyncFtthRowsWithDeviceUsername(res) };
    },
    onSuccess: (wrapped, targetReseller) => {
      if (wrapped.mode === 'fiProviderDiff') {
        if (wrapped.payload.error) {
          const label = wrapped.provider === 'fiberx' ? 'FiberX' : 'Zain Fi²';
          showError(label, wrapped.payload.error);
          return;
        }
        setSyncDiffProvider(wrapped.provider);
        setZainfiDiffResult(wrapped.payload);
        setZainfiSyncDiffResellerId(targetReseller?.id?.trim() || null);
        setAutoSyncFtthResult(null);
        setSavedFtthRowIndices(new Set());
        setActivatedFtthRowIndices(new Set());
        setPendingFtthRenewalRowIndex(null);
        setShowAutoSyncModal(true);
        const n =
          wrapped.payload.differences?.length ??
          wrapped.payload.matchedPairCount ??
          0;
        showSuccess('تحديث بيانات', `تم جلب المقارنة: ${n} سجل باختلاف محتمل.`);
        return;
      }
      setZainfiDiffResult(null);
      setSyncDiffProvider(null);
      setZainfiSyncDiffResellerId(null);
      setAutoSyncFtthResult(wrapped.payload);
      setSavedFtthRowIndices(new Set());
      setActivatedFtthRowIndices(new Set());
      setPendingFtthRenewalRowIndex(null);
      setShowAutoSyncModal(true);
      showSuccess(
        'مزامنة تلقائيا',
        `تم جلب ${wrapped.payload.count ?? wrapped.payload.data?.length ?? 0} سجل بنجاح.`
      );
    },
    onError: (err: unknown) => {
      showError('تحديث بيانات', ApiService.showError(err));
    },
  });

  const applyZainfiExternalExpirationMutation = useMutation({
    mutationFn: async (variables: { subscriberId: string; externalEndDate: string }) => {
      const agentId = user?.role === UserRole.Admin ? myAgent?.id : undefined;
      const resellerTrim = (zainfiSyncDiffResellerId || selectedOperationalResellerId || '').trim();
      const body: ZainfiApplyExternalExpirationRequest = {
        subscriberId: variables.subscriberId,
        externalEndDate: variables.externalEndDate,
      };
      if (resellerTrim) body.resellerId = resellerTrim;
      if (syncDiffProvider === 'fiberx') {
        return apiService.applyFiberxExternalExpiration(body, agentId);
      }
      return apiService.applyZainfiExternalExpiration(body, agentId);
    },
    onMutate: (variables) => {
      setApplyingZainfiExpirationSubscriberId(variables.subscriberId);
    },
    onSuccess: (_updated, variables) => {
      showSuccess(
        'تحديث',
        syncDiffProvider === 'fiberx'
          ? 'تم تطبيق تاريخ انتهاء FiberX على المشترك.'
          : 'تم تطبيق تاريخ انتهاء Zain Fi² على المشترك.'
      );
      queryClient.invalidateQueries({ queryKey: ['subscribers'] });
      const sid = variables?.subscriberId;
      if (sid) {
        setZainfiDiffResult((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            differences: prev.differences.filter((d) => d.subscriberId !== sid),
          };
        });
      }
    },
    onError: (err: unknown) => {
      showError('تحديث', ApiService.showError(err));
    },
    onSettled: () => {
      setApplyingZainfiExpirationSubscriberId(null);
    },
  });

  const handleAutoSyncClick = () => {
    if (synchronizationFtthMutation.isPending) return;
    if ((myResellers?.length ?? 0) > 1 && hasMixedResellerTypes) {
      setShowAutoSyncResellerPickerModal(true);
      return;
    }
    synchronizationFtthMutation.mutate(autoSyncReseller ?? undefined);
  };

  const saveFtthSyncItemMutation = useMutation({
    mutationFn: ({ row, rowIndex }: { row: CashbackSynchronizationFtthRow; rowIndex: number }) =>
      (autoSyncReseller?.serviceType === ServiceType.Sas
        ? apiService.synchronizationSASDiffSave(row, {
            resellerId: autoSyncReseller?.id || undefined,
            agentId: user?.role === UserRole.Admin ? myAgent?.id : undefined,
          })
        : apiService.synchronizationFTTHSave(row, {
            resellerId: autoSyncReseller?.id || undefined,
            agentId: user?.role === UserRole.Admin ? myAgent?.id : undefined,
          })),
    onMutate: (variables) => {
      setSavingFtthRowIndex(variables.rowIndex);
    },
    onSuccess: (res, variables) => {
      setSavedFtthRowIndices((prev) => new Set(prev).add(variables.rowIndex));
      queryClient.invalidateQueries({ queryKey: ['subscribers'] });
      showSuccess('حفظ بدون خصم', res?.message ?? 'تم حفظ المشترك بدون خصم بنجاح.');
    },
    onError: (err: unknown) => {
      showError('حفظ بدون خصم', ApiService.showError(err));
    },
    onSettled: () => {
      setSavingFtthRowIndex(null);
    },
  });
  const saveAllSasSyncItemsMutation = useMutation({
    mutationFn: async () => {
      const rows = autoSyncFtthResult?.data ?? [];
      const resellerId = autoSyncReseller?.id || undefined;
      const agentId = user?.role === UserRole.Admin ? myAgent?.id : undefined;
      const pendingRows = rows
        .map((row, idx) => ({ row, idx }))
        .filter(({ idx }) => !savedFtthRowIndices.has(idx) && !activatedFtthRowIndices.has(idx));
      const settled = await Promise.allSettled(
        pendingRows.map(({ row }) => apiService.synchronizationSASDiffSave(row, { resellerId, agentId }))
      );
      return { settled, pendingRows };
    },
    onMutate: () => {
      setSavingAllSasRows(true);
    },
    onSuccess: ({ settled, pendingRows }) => {
      const succeededIndexes = pendingRows
        .map((item, i) => ({ idx: item.idx, ok: settled[i]?.status === 'fulfilled' }))
        .filter((x) => x.ok)
        .map((x) => x.idx);
      if (succeededIndexes.length > 0) {
        setSavedFtthRowIndices((prev) => {
          const next = new Set(prev);
          succeededIndexes.forEach((i) => next.add(i));
          return next;
        });
        queryClient.invalidateQueries({ queryKey: ['subscribers'] });
      }
      const failedCount = pendingRows.length - succeededIndexes.length;
      if (failedCount === 0) {
        showSuccess('حفظ الكل', `تم حفظ ${succeededIndexes.length} مشترك بنجاح.`);
      } else {
        showError('حفظ الكل', `تم حفظ ${succeededIndexes.length} وفشل ${failedCount}. يمكن إعادة المحاولة للمتبقي.`);
      }
    },
    onError: (err: unknown) => {
      showError('حفظ الكل', ApiService.showError(err));
    },
    onSettled: () => {
      setSavingAllSasRows(false);
    },
  });

  const openRenewalModalForFtthSyncRow = async (row: CashbackSynchronizationFtthRow, rowIndex: number) => {
    if (user?.role === UserRole.Employee && !user?.canActivateSubscriber) {
      showError('تفعيل المشترك', 'لا تملك صلاحية تفعيل المشترك.');
      return;
    }
    const username = (row.deviceUsername ?? row.username ?? '').toString().trim();
    if (!username) {
      showError('تفعيل المشترك', 'لا يمكن التفعيل لأن deviceUsername فارغ. احفظ المشترك أولاً ثم أعد المحاولة.');
      return;
    }
    setOpeningRenewalFtthRowIndex(rowIndex);
    try {
      let subscriberToRenew =
        (subscribers ?? []).find((s) => (s.username ?? '').toString().trim().toLowerCase() === username.toLowerCase()) ?? null;

      if (!subscriberToRenew) {
        const searchRes = await apiService.getSubscribers({ page: 1, pageSize: 20, search: username });
        subscriberToRenew =
          (searchRes.data ?? []).find((s) => (s.username ?? '').toString().trim().toLowerCase() === username.toLowerCase()) ??
          searchRes.data?.[0] ??
          null;
      }

      if (!subscriberToRenew?.id) {
        showError('تفعيل المشترك', 'تعذر العثور على المشترك داخل النظام بهذا اسم المستخدم. نفّذ الحفظ أولاً ثم أعد التفعيل.');
        return;
      }

      setSelectedSubscriberForRenewal(subscriberToRenew);
      setRenewalData({
        subscriberId: subscriberToRenew.id,
        newProfileId: '',
        paymentStatus: PaymentStatus.Paid,
        overrideSalePrice: 0,
        amountPaid: 0,
        notes: '',
        remainingAmount: 0,
        debtDescription: '',
        debtDueDate: '',
        renewalDate: '',
        activationMode: RenewalActivationMode.Full,
        dealerId: '',
        subscriberNoteType: null,
      });
      setRenewalViaSasTab(false);
      setPendingFtthRenewalRowIndex(rowIndex);
      setShowAutoSyncModal(false);
      setShowRenewalModal(true);
    } catch (err: unknown) {
      showError('تفعيل المشترك', ApiService.showError(err));
    } finally {
      setOpeningRenewalFtthRowIndex(null);
    }
  };

  const createSubscriberMutation = useMutation({
    mutationFn: (subscriberData: SubscriberCreateRequest) => apiService.createSubscriber(subscriberData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscribers'] });
      setShowAddModal(false);
      setFormData({
        secruptionId: '',
        username: '',
        password: '',
        firstName: '',
        lastName: '',
        phoneNumber: '',
        noteType: SubscriberNoteType.NoResponse,
        note: '',
        profileId: '',
        activationDate: new Date().toISOString().split('T')[0],
        expirationDate: new Date().toISOString().split('T')[0],
        subscriptionType: SubscriptionType.Paid,
        fat: '',
        zone: '',
        agentResellerId: selectedOperationalResellerId || ''
      });
      showSuccess('تم الإنشاء', 'تم إنشاء المشترك بنجاح');
    },
    onError: (error: any) => {
      console.error('Error creating subscriber:', error);
      const errorMessage = ApiService.showError(error);
      showError('خطأ في الإنشاء', errorMessage);
    }
  });

  const createRenewalMutation = useMutation({
    mutationFn: async (renewalData: RenewalData) => {
      if (!online) {
        await queueOperation('CreateRenewal', buildCreateRenewalPayload(renewalData));
        return { receiptNumber: '(معلق للمزامنة)', subscriberId: renewalData.subscriberId } as any;
      }
      return await apiService.createRenewal(renewalData);
    },
    onSuccess: async (receiptData, renewalData) => {
      const isOfflineQueued = receiptData?.receiptNumber === '(معلق للمزامنة)';
      if (isOfflineQueued) {
        showSuccess('تم الحفظ محلياً', 'سيتم رفع التجديد عند عودة الاتصال');
        await refreshPendingCount();
      }
      if (!isOfflineQueued) {
        const pickedNoteType = renewalData?.subscriberNoteType;
        if (pickedNoteType != null && Number.isFinite(Number(pickedNoteType))) {
          try {
            await apiService.patchSubscriberNotes(renewalData.subscriberId, {
              noteType: Number(pickedNoteType),
            });
          } catch (patchErr) {
            // لا نلغي نجاح التفعيل إذا فشل تحديث نوع الملاحظة؛ نعرض تنبيه فقط.
            showError(
              'تنبيه بعد التفعيل',
              `تم التفعيل لكن تعذر حفظ نوع الملاحظة: ${ApiService.showError(patchErr)}`
            );
          }
        }
      }
      console.log('Receipt data received from backend:', receiptData);
      console.log('Receipt number in received data:', receiptData?.receiptNumber);

      queryClient.invalidateQueries({ queryKey: ['subscribers'] });
      queryClient.invalidateQueries({ queryKey: ['renewal-receipts'] });
      queryClient.invalidateQueries({ queryKey: ['debts'] });
      queryClient.invalidateQueries({ queryKey: ['subscribers-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['balance-detail'] });
      queryClient.invalidateQueries({ queryKey: ['dealer-debts'], exact: false });
      setShowOtherDealerTopUpModal(false);
      setShowRenewalModal(false);
      setRenewalViaSasTab(false);
      setSelectedIds([]);

      const normalizedReceipt = {
        ...receiptData,
        subscriberId: receiptData.subscriberId ?? renewalData.subscriberId,
      };

      console.log('Final receipt data to display:', normalizedReceipt);
      console.log('Final receipt number:', normalizedReceipt?.receiptNumber);

      setLastReceipt(normalizedReceipt);
      setShowReceiptModal(true);
      
      setSelectedSubscriberForRenewal(null);
      setShowRenewalModal(false);
      if (pendingFtthRenewalRowIndex != null) {
        setActivatedFtthRowIndices((prev) => new Set(prev).add(pendingFtthRenewalRowIndex));
        setShowAutoSyncModal(true);
        setPendingFtthRenewalRowIndex(null);
      }
      setRenewalData({
        subscriberId: '',
        newProfileId: '',
        paymentStatus: PaymentStatus.Paid,
        overrideSalePrice: 0,
        amountPaid: 0,
        notes: '',
        remainingAmount: 0,
        debtDescription: '',
        debtDueDate: '',
        renewalDate: '',
        activationMode: RenewalActivationMode.Full,
        dealerId: '',
        subscriberNoteType: null,
      });
    },
    onError: (error: any) => {
      console.error('Error creating renewal:', error);
      const errorMessage = ApiService.showError(error);
      const rawMessage = error?.response?.data?.message ?? error?.originalError?.response?.data?.message ?? '';
      const isInsufficientBalance =
        /رصيد غير كاف|insufficient balance|رصيد الوكيل غير كاف/i.test(errorMessage) ||
        (rawMessage && /insufficient|رصيد غير كاف/i.test(String(rawMessage)));
      if (isInsufficientBalance) {
        showError(
          'لا يمكن تفعيل المشترك',
          'الرصيد غير كافي. يرجى تعبئة الرصيد من صفحة الرصيد (للمنطقة المعنية) ثم المحاولة مرة أخرى.'
        );
      } else {
      showError('خطأ في التجديد', errorMessage);
      }
      if (pendingFtthRenewalRowIndex != null) {
        setShowAutoSyncModal(true);
      }
    }
  });

  const otherDealerTopUpMutation = useMutation({
    mutationFn: (body: BalanceTopUpRequest) => apiService.postBalanceTopUp(body),
    onSuccess: (data) => {
      setShowOtherDealerTopUpModal(false);
      setOtherDealerTopUpForm({
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

  const handleOtherDealerTopUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(otherDealerTopUpForm.amountIqd);
    if (!Number.isFinite(amount) || amount <= 0) {
      showError('خطأ', 'يرجى إدخال مبلغ صحيح');
      return;
    }
    if (!otherDealerTopUpForm.recipientName?.trim()) {
      showError('خطأ', 'يرجى إدخال اسم المستلم');
      return;
    }
    if (!otherDealerTopUpForm.companyName?.trim()) {
      showError('خطأ', 'يرجى إدخال الشركة / جهة الرصيد');
      return;
    }
    if (hasRenewalModalResellerRegions && !(otherDealerTopUpForm.agentResellerId ?? '').trim()) {
      showError('خطأ', 'يرجى اختيار المنطقة التي يُضاف إليها الرصيد');
      return;
    }
    otherDealerTopUpMutation.mutate({
      amountIqd: amount,
      recipientName: otherDealerTopUpForm.recipientName.trim(),
      companyName: otherDealerTopUpForm.companyName.trim(),
      topUpDate: otherDealerTopUpForm.topUpDate || undefined,
      agentResellerId: hasRenewalModalResellerRegions
        ? (otherDealerTopUpForm.agentResellerId ?? '').trim()
        : undefined,
    });
  };

  const renewMutation = useMutation({
    mutationFn: (ids: string[]) => apiService.renewSubscribers(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscribers'] });
      setSelectedIds([]);
    },
  });

  const updateSubscriberMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiService.updateSubscriber(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscribers'] });
      setShowEditModal(false);
      setSelectedSubscriberForEdit(null);
    },
  });
  
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setDebouncedSearchTerm('');
    setMaxDaysUntilExpiry('');
    setAppliedMaxDaysUntilExpiry('');
    setFatFilter('');
    setZoneFilter('');
    setAppliedFatFilter('');
    setAppliedZoneFilter('');
    setNoteTypeFilter('all');
    setAppliedNoteTypeFilter('all');
    setExtensionActivationFilter(false);
    setAppliedExtensionActivationFilter(false);
    setExpirationFromDate('');
    setExpirationToDate('');
    setAppliedExpirationFromDate('');
    setAppliedExpirationToDate('');
    setCurrentPage(1);
  };

  const handleApplyAdvancedFilter = () => {
    setDebouncedSearchTerm(searchTerm.trim());
    setAppliedMaxDaysUntilExpiry(maxDaysUntilExpiry.trim());
    setAppliedFatFilter(fatFilter.trim());
    setAppliedZoneFilter(zoneFilter.trim());
    setAppliedNoteTypeFilter(noteTypeFilter);
    setAppliedExtensionActivationFilter(extensionActivationFilter);
    setAppliedExpirationFromDate(expirationFromDate.trim());
    setAppliedExpirationToDate(expirationToDate.trim());
    setCurrentPage(1);
  };

  /** تطبيق البحث؛ للموظف بدون صلاحية عرض الكل يلزم إدخال الاسم الأول والثاني (كلمتين على الأقل) */
  const applySearch = () => {
    const term = searchTerm.trim();
    if (requireTwoWordsForSearch && term) {
      const words = term.split(/\s+/).filter(Boolean);
      if (words.length < 2) {
        showError('بحث المشتركين', 'يرجى إدخال الاسم الأول والثاني للبحث (كلمتين على الأقل).');
        return;
      }
    }
    setDebouncedSearchTerm(term);
    setCurrentPage(1);
  };

  const hasActiveAdvancedFilter =
    appliedExpirationFromDate !== '' || appliedExpirationToDate !== '' ||
    appliedMaxDaysUntilExpiry !== '' || appliedFatFilter !== '' || appliedZoneFilter !== '' ||
    appliedNoteTypeFilter !== 'all' || appliedExtensionActivationFilter || (debouncedSearchTerm?.trim() ?? '') !== '' || statusFilter !== 'all';

  useEffect(() => {
    if (showAdvancedFilter) {
      setSearchTerm(debouncedSearchTerm ?? '');
      setFatFilter(appliedFatFilter);
      setZoneFilter(appliedZoneFilter);
      setNoteTypeFilter(appliedNoteTypeFilter);
      setExtensionActivationFilter(appliedExtensionActivationFilter);
      setMaxDaysUntilExpiry(appliedMaxDaysUntilExpiry);
      setExpirationFromDate(appliedExpirationFromDate?.split('T')[0] ?? '');
      setExpirationToDate(appliedExpirationToDate?.split('T')[0] ?? '');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAdvancedFilter]);

  const getStatusBadge = (subscriber: Subscriber) => {
    const statusConfig: Record<SubscriptionStatus, { text: string; class: string }> = {
      [SubscriptionStatus.Active]: { 
        text: 'فعال', 
        class: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' 
      },
      [SubscriptionStatus.ExpiringSoon]: { 
        text: 'سينتهي قريباً', 
        class: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' 
      },
      [SubscriptionStatus.Expired]: { 
        text: 'منتهي', 
        class: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' 
      },
      [SubscriptionStatus.ExpiredToday]: {
        text: 'سينتهي اليوم',
        class: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300'
      },
    };

    const backendStatus = subscriber.status as SubscriptionStatus | undefined;
    const config =
      backendStatus && statusConfig[backendStatus]
        ? statusConfig[backendStatus]
        : subscriber.isSubscriptionActive === true
          ? statusConfig[SubscriptionStatus.Active]
          : subscriber.isSubscriptionActive === false
            ? statusConfig[SubscriptionStatus.Expired]
            : statusConfig[SubscriptionStatus.Active];
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.class}`}>
        {config.text}
      </span>
    );
  };

  const _handleDelete = async (id: string) => {
    const confirmed = await confirmDelete('مشترك');
    if (confirmed) {
      deleteSubscriberMutation.mutate(id);
    }
  };
  void _handleDelete;

  const validateSubscriberData = (data: any): string | null => {
    if (!data.username || !data.password || !data.firstName || !data.lastName || !data.phoneNumber || !data.profileId) {
      return 'يرجى ملء جميع الحقول المطلوبة';
    }
    const secruptionId = (data.secruptionId ?? '').toString().trim();
    if (!secruptionId) {
      return 'معرف الاشتراك مطلوب';
    }
    if (secruptionId.length > 100) {
      return 'معرف الاشتراك يجب أن يكون أقل من 100 حرف';
    }
    if (data.username.length < 3) {
      return 'اسم المستخدم يجب أن يكون على الأقل 3 أحرف';
    }
    if (data.username.length > 100) {
      return 'اسم المستخدم يجب أن يكون أقل من 100 حرف';
    }
    if (data.password.length < 4) {
      return 'كلمة المرور يجب أن تكون على الأقل 4 أحرف';
    }
    if (data.firstName.length > 100) {
      return 'الاسم الأول يجب أن يكون أقل من 100 حرف';
    }
    if (data.lastName.length > 100) {
      return 'الاسم الأخير يجب أن يكون أقل من 100 حرف';
    }
    if (data.phoneNumber.length < 10) {
      return 'رقم الهاتف يجب أن يكون على الأقل 10 أرقام';
    }
    if (data.phoneNumber.length > 20) {
      return 'رقم الهاتف يجب أن يكون أقل من 20 رقم';
    }
    if (data.wifiCode && data.wifiCode.length > 100) {
      return 'كود الواي فاي يجب أن يكون أقل من 100 حرف';
    }
    if (data.note && data.note.length > 1000) {
      return 'الملاحظة يجب أن تكون أقل من 1000 حرف';
    }
    if (data.noteType === SubscriberNoteType.Other) {
      const noteText = (data.note ?? '').toString().trim();
      if (!noteText) {
        return 'يرجى كتابة نص الملاحظة عند اختيار "أخرى"';
      }
    }
    return null;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const rid = (selectedOperationalResellerId ?? '').trim();
    if (myResellers.length > 0 && !rid) {
      showError('المنطقة مطلوبة', 'يجب تحديد المنطقة/الرسيلر (agentResellerId). اختر المنطقة من القائمة أعلاه.');
      return;
    }
    if (myResellers.length > 0 && !profilesForCreate.some((p) => p.id === formData.profileId)) {
      showError(
        'الباقة',
        'اختر باقة مربوطة بنفس المنطقة المحددة (الباقات العامة بدون رسيلر لم تعد مدعومة).'
      );
      return;
    }

    const validationError = validateSubscriberData(formData);
    if (validationError) {
      showError('خطأ في التحقق', validationError);
      return;
    }

    const noteType = formData.noteType ?? null;
    const noteText = (formData.note ?? '').toString().trim();
    const payload: SubscriberCreateRequest = {
      ...formData,
      secruptionId: (formData.secruptionId ?? '').trim(),
      noteType,
      note: noteType === SubscriberNoteType.Other ? (noteText || undefined) : undefined,
      agentResellerId: rid,
    };
    createSubscriberMutation.mutate(payload);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      if (name === 'noteType') {
        const nextNoteType =
          value === '' ? null : (parseInt(value, 10) as SubscriberNoteType);
        return {
      ...prev,
          noteType: nextNoteType,
          note: nextNoteType === SubscriberNoteType.Other ? prev.note : '',
        };
      }
      return {
        ...prev,
        [name]: value,
      } as any;
    });
  };

  const handleRenewalInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;

    if (name === 'activationMode') {
      const m = Number(value) as RenewalActivationMode;
      setRenewalData((prev) => ({
        ...prev,
        activationMode: m,
        dealerId: m === RenewalActivationMode.Full ? '' : prev.dealerId,
      }));
      return;
    }

    if (name.startsWith('wiFiQRCode.')) {
      const field = name.split('.')[1];
      setRenewalData(prev => ({
        ...prev,
        wiFiQRCode: {
          ...prev.wiFiQRCode!,
          [field]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
        }
      }));
    } else {
      const newValue = type === 'number' ? Number(value) : value;
      
      setRenewalData(prev => {
        const updated = {
          ...prev,
          [name]: newValue
        };
        const selectedProfile = renewalInfo?.availableProfiles?.find(p => p.id === updated.newProfileId);

        if (name === 'newProfileId') {
          const rawId = String(newValue ?? '');
          renewalProfileIdForAmountSyncRef.current = rawId;
          if (!rawId) {
            updated.overrideSalePrice = 0;
            updated.amountPaid = 0;
            updated.remainingAmount = 0;
            updated.debtDescription = '';
            updated.debtDueDate = '';
            updated.renewalDate = '';
            updated.activationMode = RenewalActivationMode.Full;
            updated.dealerId = '';
            updated.subscriberNoteType = null;
            return updated;
          }
          const sp = renewalInfo?.availableProfiles?.find((p) => p.id === rawId);
          const salePrice = sp?.salePrice || 0;
          updated.overrideSalePrice = salePrice;
          updated.amountPaid = salePrice;
          updated.remainingAmount = 0;
          updated.debtDescription = '';
          updated.debtDueDate = '';
          return updated;
        }

        if (name === 'overrideSalePrice') {
          const o = Number(updated.overrideSalePrice) || 0;
          const effectiveSubscription = o > 0 ? o : (selectedProfile?.salePrice || 0);
          updated.amountPaid = effectiveSubscription;
        }

        if (name === 'amountPaid' || name === 'overrideSalePrice') {
          const overridePrice = updated.overrideSalePrice || 0;
          const finalPrice = overridePrice > 0 
            ? overridePrice 
            : (selectedProfile?.salePrice || 0);
          
          const amountPaid = name === 'amountPaid' ? Number(newValue) : (updated.amountPaid || 0);
          const calculatedRemaining = Math.max(0, finalPrice - amountPaid);
          
          updated.remainingAmount = calculatedRemaining;
          if (calculatedRemaining > 0) {
            if (!(updated.debtDueDate || '').toString().trim()) {
              updated.debtDueDate = new Date().toISOString().split('T')[0];
            }
          } else {
            updated.debtDueDate = '';
          }
        }
        
        return updated;
      });
    }
  };

  const handleRenewalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const selectedProfile = renewalInfo?.availableProfiles?.find(p => p.id === renewalData.newProfileId);
    const remaining = renewalData.remainingAmount || 0;
    const mode = renewalData.activationMode ?? RenewalActivationMode.Full;

    if (mode === RenewalActivationMode.OtherDealer && !(renewalData.dealerId || '').trim()) {
      showError('خطأ', 'اختر الوكيل (التاجر) عند تفعيل «لوكيل آخر».');
      return;
    }

    if (!(renewalData.newProfileId || '').trim()) {
      showError('الباقة', 'اختر الباقة الجديدة.');
      return;
    }

    if (remaining > 0) {
      const due = (renewalData.debtDueDate || '').toString().trim();
      if (!due) {
        showError('خطأ', 'يرجى اختيار تاريخ الاستحقاق / تسديد الدين عند وجود مبلغ متبقي.');
        return;
      }
    }

    const renewalDateRaw = (renewalData.renewalDate ?? '').toString().trim();
    const renewalDateNorm = renewalDateRaw
      ? renewalDateRaw.length > 10
        ? renewalDateRaw.split('T')[0]
        : renewalDateRaw
      : '';
    if (renewalDateNorm) {
      const todayBaghdad = getBaghdadTodayYmd();
      if (renewalDateNorm > todayBaghdad) {
        showError('خطأ', 'تاريخ التجديد لا يمكن أن يكون بعد اليوم.');
        return;
      }
    }

    const enhancedRenewalData = {
      ...renewalData,
      paymentStatus: remaining > 0 ? PaymentStatus.Unpaid : PaymentStatus.Paid,
      overrideSalePrice: renewalData.overrideSalePrice ?? 0,
      amountPaid: renewalData.amountPaid ?? 0,
      remainingAmount: remaining,
      debtDescription: renewalData.debtDescription ?? '',
      debtDueDate: renewalData.debtDueDate ?? '',
      renewalDate: renewalDateNorm,
      currentExpirationDate: renewalInfo?.expirationDate,
      renewalPeriod: selectedProfile?.renewalPeriod || 30
    };

    // تم تعليق التفعيل عبر سكربت البايثون مؤقتاً.
    createRenewalMutation.mutate(enhancedRenewalData);
  };

  const handlePrintReceipt = async (receipt: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('يرجى السماح بالنوافذ المنبثقة (Pop-ups) لطباعة الفاتورة');
      return;
    }

    const agentIdForTemplate =
      subscribers?.find((s) => s.id === receipt.subscriberId)?.agentId?.trim() ||
      (user?.role === UserRole.Admin ? myAgent?.id : undefined) ||
      myAgent?.id;

    const printBase = {
      appOrigin: typeof window !== 'undefined' ? window.location.origin : '',
      apiBaseUrl: apiService.getBaseURL(),
    };

    let settings: ActivationInvoicePrintSettingsDto = {};
    try {
      settings = await apiService.getActivationInvoicePrintSettings(agentIdForTemplate || undefined);
    } catch {
      settings = {};
    }

    const sub = subscribers?.find((s) => s.id === receipt.subscriberId);
    const profilePeriod =
      profiles?.find(
        (p) =>
          p.id === receipt.newProfileId ||
          p.id === receipt.profileId ||
          p.name === receipt.newProfileName ||
          (sub?.profileId != null && p.id === sub.profileId)
      )?.renewalPeriod ?? undefined;
    const payload = renewalLikeToActivationPrintPayload({
      ...(receipt as Record<string, unknown>),
      username: receipt.subscriberUsername ?? receipt.username ?? sub?.username,
      userId: receipt.subscriberUsername ?? receipt.userId ?? receipt.username ?? sub?.username,
      renewalPeriod: receipt.renewalPeriod ?? receipt.durationDays ?? profilePeriod,
    });

    const printContent = buildActivationReceiptPrintHtml(settings, payload, {
      formatDate,
      locale,
      ...printBase,
      fallbackOrganizerName: (user?.fullName || user?.username || '').trim() || undefined,
    });

    const printed = await printActivationReceiptDocument(printContent, printWindow);
    if (!printed) {
      alert('يرجى السماح بالنوافذ المنبثقة (Pop-ups) لطباعة الفاتورة');
    }
  };

  const getWhatsAppReminderErrorMessage = (err: any): string => {
    const msg = ApiService.showError(err);
    if (/قالب|قالب لرسالة|رسالة واحدة على الأقل/.test(msg)) {
      return msg + '\n\nلإعداد قوالب الرسائل: الإعدادات ← رسالة التفعيل، رسالة تنبيه الاشتراك، رسالة الدين او التفاصيل.';
    }
    return msg;
  };

  /** فشل GET /Agents/me يمنع إرسال واتساب قبل أي طلب لإرسال الرسالة — لذلك قد لا يظهر طلب جديد في Network عند الضغط. */
  const showMyAgentFetchFailed = (title: string) => {
    const detail = myAgentError ? getWhatsAppReminderErrorMessage(myAgentError) : '';
    showError(
      title,
      `تعذّر جلب بيانات الوكيل من الخادم (طلب /Agents/me). ${detail ? `${detail} ` : ''}افتح Network وابحث عن «Agents/me» عند تحميل الصفحة، أو حدّث الصفحة ثم أعد المحاولة.`
    );
  };

  const sendWhatsAppToSelected = async (
    title: string,
    sender: (subscriberId: string) => Promise<void>
  ) => {
    if (!subscribers || selectedIds.length === 0 || !hasWhatsAppSession) return;
    const withPhone = selectedIds
      .map(id => subscribers.find(s => s.id === id))
      .filter((s): s is Subscriber => !!s && !!(s.phoneNumber?.trim()));
    if (withPhone.length === 0) {
      showError(title, 'لا يوجد لدى المشتركين المحددين رقم هاتف.');
      return;
    }

    setSendReminderLoading(true);
    showInfo(title, `جاري الإرسال إلى ${withPhone.length} مشترك...`);
    let successCount = 0;
    let lastError: string | null = null;

    for (const sub of withPhone) {
      const displayName =
        (sub.fullName || '').trim() ||
        `${sub.firstName || ''} ${sub.lastName || ''}`.trim() ||
        sub.username;
      try {
        showInfo(title, `جاري الإرسال إلى ${displayName}...`);
        await sender(sub.id);
        successCount++;
        showSuccess(title, `تم الإرسال إلى ${displayName}.`);
      } catch (err: any) {
        lastError = getWhatsAppReminderErrorMessage(err);
        showError(title, `فشل الإرسال إلى ${displayName}: ${lastError}`);
      }
    }

    setShowActionsDropdown(false);
    setSendReminderLoading(false);
    if (successCount > 0) {
      showSuccess(
        title,
        (successCount === withPhone.length
          ? 'تم الإرسال بنجاح.'
          : `تم الإرسال لـ ${successCount} من ${withPhone.length}. ${lastError ? `آخر خطأ: ${lastError}` : ''}`) +
          ' تحقق من وصولها في واتساب؛ إن لم تصل فراجع سجلات الباكند وجلسة واتساب المربوطة.'
      );
    }
    if (lastError && successCount === 0) {
      showError(title, lastError);
    }
  };

  const handleSendWhatsApp = async (receipt: any) => {
    if (myAgentLoading) {
      showInfo('إرسال واتساب', 'جاري التحقق من جلسة واتساب...');
      return;
    }
    if (myAgentError) {
      showMyAgentFetchFailed('إرسال واتساب');
      return;
    }
    if (!hasWhatsAppSession) {
      showError('إرسال واتساب', 'لم يتم حفظ معرف جلسة واتساب في Wakeel. افتح الإعدادات ← ربط واتساب ← ثم اضغط «حفظ معرف الجلسة في Wakeel».');
      return;
    }
    const subscriberId = receipt.subscriberId;
    if (!subscriberId) {
      showError('إرسال واتساب', 'معرف المشترك غير متوفر.');
      return;
    }
    try {
      try {
        const normalizeActivationTemplateForBackend = (template: string): string => {
          let out = String(template || '');
          out = out.replace(/\{\{\s*subscriberName\s*\}\}/gi, '{{SubscriberName}}');
          out = out.replace(/\{\{\s*subscriberPhone\s*\}\}/gi, '{{SubscriberPhone}}');
          out = out.replace(/\{\{\s*phoneNumber\s*\}\}/gi, '{{PhoneNumber}}');
          out = out.replace(/\{\{\s*activationDate\s*\}\}/gi, '{{ActivationDate}}');
          out = out.replace(/\{\{\s*expirationDate\s*\}\}/gi, '{{ExpirationDate}}');
          out = out.replace(/\{\{\s*daysUntilExpiry\s*\}\}/gi, '{{DaysUntilExpiry}}');
          out = out.replace(/\{\{\s*profileName\s*\}\}/gi, '{{ProfileName}}');
          out = out.replace(/\{\{\s*companyName\s*\}\}/gi, '{{AgentCompanyName}}');
          out = out.replace(/\{\{\s*agentCompanyName\s*\}\}/gi, '{{AgentCompanyName}}');
          out = out.replace(/\{\{\s*CompanyName\s*\}\}/g, '{{AgentCompanyName}}');
          out = out.replace(/\{\{\s*debtDueDate\s*\}\}/gi, '{{DebtDueDate}}');
          out = out.replace(/\{\{\s*debtAmount\s*\}\}/gi, '{{DebtAmount}}');
          return out;
        };

        const isBarePlaceholdersTemplate = (template: string): boolean => {
          const t = String(template || '');
          const withoutTokens = t.replace(/\{\{\s*[A-Za-z]+\s*\}\}/g, '');
          const withoutNoise = withoutTokens.replace(/[\s\r\n\t\-—–_,.،؛:|/\\]+/g, '');
          return withoutNoise.length === 0;
        };

        const current = await apiService.getActivationMessage();
        const currentTpl = (current?.template || '').trim();
        if (!currentTpl) {
          await apiService.setActivationMessage(DEFAULT_ACTIVATION_TEMPLATE);
        } else if (isBarePlaceholdersTemplate(currentTpl)) {
          await apiService.setActivationMessage(DEFAULT_ACTIVATION_TEMPLATE);
        } else if (/\{\{\s*subscriber(Name|Phone)\s*\}\}|\{\{\s*activationDate\s*\}\}|\{\{\s*expirationDate\s*\}\}|\{\{\s*companyName\s*\}\}/i.test(currentTpl)) {
          await apiService.setActivationMessage(normalizeActivationTemplateForBackend(currentTpl));
        }
      } catch {
        // ignore template fix errors
      }
      await apiService.sendWhatsAppActivation(subscriberId);
      showSuccess('إرسال واتساب', 'تم إرسال رسالة التفعيل/التجديد بنجاح. تحقق من وصولها في واتساب المشترك؛ إن لم تصل فراجع سجلات الباكند وجلسة واتساب المربوطة.');
    } catch (err: any) {
      showError('إرسال واتساب', getWhatsAppReminderErrorMessage(err));
    }
  };

  const handleSendSubscriberDetails = async (subscriber: Subscriber) => {
    if (myAgentLoading) {
      showInfo('إرسال دين او التفاصيل', 'جاري التحقق من جلسة واتساب...');
      return;
    }
    if (myAgentError) {
      showMyAgentFetchFailed('إرسال دين او التفاصيل');
      return;
    }
    if (!hasWhatsAppSession) {
      showError('إرسال دين او التفاصيل', 'لم يتم حفظ معرف جلسة واتساب في Wakeel. افتح الإعدادات ← ربط واتساب ← ثم اضغط «حفظ معرف الجلسة في Wakeel».');
      return;
    }
    if (!subscriber.phoneNumber?.trim()) {
      showError('إرسال دين او التفاصيل', 'رقم هاتف المشترك غير معرّف.');
      return;
    }
    try {
      await apiService.sendWhatsAppDetails(subscriber.id);
      showSuccess('إرسال تفاصيل المشترك', 'تم إرسال رسالة الدين او التفاصيل بنجاح. تحقق من وصولها في واتساب المشترك؛ إن لم تصل فراجع سجلات الباكند وجلسة واتساب المربوطة.');
    } catch (err: any) {
      const msg = ApiService.showError(err);
      if (/لا يوجد قالب لرسالة تفاصيل المشترك/.test(msg)) {
        try {
          showInfo('إرسال دين او التفاصيل', 'لا يوجد قالب تفاصيل. سيتم إنشاء القالب الافتراضي تلقائياً ثم إعادة الإرسال...');
          await apiService.setDetailsMessage(DEFAULT_DETAILS_TEMPLATE);
          await apiService.sendWhatsAppDetails(subscriber.id);
          showSuccess('إرسال تفاصيل المشترك', 'تم إنشاء القالب الافتراضي وإرسال رسالة الدين او التفاصيل بنجاح.');
          return;
        } catch (e: any) {
          showError('إرسال تفاصيل المشترك', getWhatsAppReminderErrorMessage(e));
          return;
        }
      }
      showError('إرسال تفاصيل المشترك', getWhatsAppReminderErrorMessage(err));
    }
  };

  const handleSendSubscriberDetailsById = async (subscriberId: string) => {
    if (myAgentLoading) {
      showInfo('إرسال دين او التفاصيل', 'جاري التحقق من جلسة واتساب...');
      return;
    }
    if (myAgentError) {
      showMyAgentFetchFailed('إرسال دين او التفاصيل');
      return;
    }
    if (!hasWhatsAppSession) {
      showError('إرسال دين او التفاصيل', 'لم يتم حفظ معرف جلسة واتساب في Wakeel. افتح الإعدادات ← ربط واتساب ← ثم اضغط «حفظ معرف الجلسة في Wakeel».');
      return;
    }
    try {
      await apiService.sendWhatsAppDetails(subscriberId);
      showSuccess('إرسال تفاصيل المشترك', 'تم إرسال رسالة الدين او التفاصيل بنجاح. تحقق من وصولها في واتساب المشترك؛ إن لم تصل فراجع سجلات الباكند وجلسة واتساب المربوطة.');
    } catch (err: any) {
      const msg = ApiService.showError(err);
      if (/لا يوجد قالب لرسالة تفاصيل المشترك/.test(msg)) {
        try {
          showInfo('إرسال دين او التفاصيل', 'لا يوجد قالب تفاصيل. سيتم إنشاء القالب الافتراضي تلقائياً ثم إعادة الإرسال...');
          await apiService.setDetailsMessage(DEFAULT_DETAILS_TEMPLATE);
          await apiService.sendWhatsAppDetails(subscriberId);
          showSuccess('إرسال تفاصيل المشترك', 'تم إنشاء القالب الافتراضي وإرسال رسالة الدين او التفاصيل بنجاح.');
          return;
        } catch (e: any) {
          showError('إرسال تفاصيل المشترك', getWhatsAppReminderErrorMessage(e));
          return;
        }
      }
      showError('إرسال تفاصيل المشترك', getWhatsAppReminderErrorMessage(err));
    }
  };

  const handleSendAlertMessage = async () => {
    if (!subscribers || selectedIds.length === 0) return;
    if (myAgentLoading) {
      showInfo('رسالة تنبيه الاشتراك', 'جاري التحقق من جلسة واتساب...');
      setShowActionsDropdown(false);
      return;
    }
    if (myAgentError) {
      showMyAgentFetchFailed('رسالة تنبيه الاشتراك');
      setShowActionsDropdown(false);
      return;
    }
    if (!hasWhatsAppSession) {
      showError('رسالة تنبيه الاشتراك', 'لم يتم حفظ معرف جلسة واتساب في Wakeel. افتح الإعدادات ← ربط واتساب ← ثم اضغط «حفظ معرف الجلسة في Wakeel».');
      setShowActionsDropdown(false);
      return;
    }
    await sendWhatsAppToSelected('رسالة تنبيه الاشتراك', (id) => apiService.sendWhatsAppAlert(id));
  };

  const handleSendCustomMessage = async (subscriber: Subscriber) => {
    if (myAgentLoading) {
      showInfo('إرسال رسالة حر', 'جاري التحقق من جلسة واتساب...');
      return;
    }
    if (myAgentError) {
      showMyAgentFetchFailed('إرسال رسالة حر');
      return;
    }
    if (!hasWhatsAppSession) {
      showError('إرسال رسالة حر', 'لم يتم حفظ معرف جلسة واتساب في Wakeel. افتح الإعدادات ← ربط واتساب ← ثم اضغط «حفظ معرف الجلسة في Wakeel».');
      return;
    }
    if (!subscriber.phoneNumber?.trim()) {
      showError('إرسال رسالة حر', 'رقم هاتف المشترك غير معرّف.');
      return;
    }
    try {
      await apiService.sendWhatsAppCustomMessage(subscriber.id);
      showSuccess('إرسال رسالة حر', 'تم إرسال قالب رسالة خاصة بنجاح. تحقق من وصولها في واتساب المشترك.');
    } catch (err: any) {
      showError('إرسال رسالة حر', ApiService.showError(err));
    }
  };

  const toggleSelectAll = () => {
    if (!subscribers) return;
    if (selectedIds.length === subscribers.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(subscribers.map(s => s.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleBulkRenew = () => {
    if (user?.role === UserRole.Employee && !user?.canActivateSubscriber) {
      showError('تفعيل المشترك', 'لا تملك صلاحية تفعيل المشترك.');
      return;
    }
    if (selectedIds.length === 0) return;
    if (selectedIds.length === 1) {
      if (!subscribers || subscribers.length === 0) {
        showInfo('تحميل البيانات', 'جاري تحميل بيانات المشتركين، يرجى المحاولة مرة أخرى');
        return;
      }

      const subscriberToRenew = subscribers.find(s => s.id === selectedIds[0]);
      if (!subscriberToRenew) {
        showError('خطأ في البيانات', 'لم يتم العثور على بيانات المشترك المحدد');
        return;
      }

      setSelectedSubscriberForRenewal(subscriberToRenew);
      setRenewalData(prev => ({
        ...prev,
        subscriberId: selectedIds[0],
        renewalDate: '',
        subscriberNoteType: null,
      }));
      setRenewalViaSasTab(false);
      setShowRenewalModal(true);
    } else {
      selectedIds.forEach(subscriberId => {
        const subscriber = subscribers?.find(s => s.id === subscriberId);
        const renewalData: RenewalData = {
          subscriberId: subscriberId,
          newProfileId: '',
          paymentStatus: PaymentStatus.Paid,
          overrideSalePrice: 0,
          amountPaid: 0,
          notes: '',
          remainingAmount: 0,
          debtDescription: '',
          renewalDate: '',
          currentExpirationDate: subscriber?.expirationDate,
          renewalPeriod: 30,
          activationMode: RenewalActivationMode.Full,
          dealerId: '',
          subscriberNoteType: null,
        };
        createRenewalMutation.mutate(renewalData);
      });
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    const confirmed = await confirmDelete('مشترك', selectedIds.length);
    if (confirmed) {
      selectedIds.forEach(id => deleteSubscriberMutation.mutate(id));
      setSelectedIds([]);
    }
  };

  /** فتح رابط التفعيل بعد اختيار الرسيلر (أو مباشرة عند رسيلر واحد). يستدعي getSasLink ويفتح الرابط ويعرض مودال التجديد. */
  const openActivationLinkWithReseller = async (subscriberId: string, resellerId?: string) => {
    if (user?.role === UserRole.Employee && !user?.canActivateSubscriber) {
      showError('تفعيل المشترك', 'لا تملك صلاحية تفعيل المشترك.');
      return;
    }
    const subscriberToRenew = subscribers?.find(s => s.id === subscriberId);
    if (!subscriberToRenew) {
      showError('خطأ في البيانات', 'لم يتم العثور على بيانات المشترك المحدد');
      return;
    }
    setSasLinkLoading(true);
    try {
      const data = await apiService.getSasLink(subscriberId, resellerId);
      const serviceType = data?.serviceType;
      const sasUrl = data?.url;
      const activationUrl = (data as any)?.activationUrl;

      if (serviceType === ServiceType.Sas && sasUrl) {
        window.open(normalizeEarthlinkActivationUrl(sasUrl) || sasUrl, '_blank');
        setSelectedSubscriberForRenewal(subscriberToRenew);
        setRenewalData(prev => ({ ...prev, subscriberId, renewalDate: '', subscriberNoteType: null }));
        setRenewalViaSasTab(true);
        setShowRenewalModal(true);
        showInfo('تم فتح نافذة SAS', 'أتمم التفعيل في النافذة المفتوحة ثم اضغط «تم التفعيل» هنا.');
        return;
      }
      if (
        serviceType === ServiceType.Ftth ||
        serviceType === ServiceType.Zainfi ||
        serviceType === ServiceType.Fiberx
      ) {
        const subscriberIdVal = String(
          subscriberToRenew.ftthSubscriptionId ?? subscriberToRenew.secruptionId ?? (data as any)?.secruptionId ?? ''
        ).trim();
        const urlToOpen =
          activationUrl ||
          (subscriberIdVal
            ? `${String((data as any)?.ftthBaseUrl || 'https://admin.ftth.iq').replace(/\/$/, '')}/customer-details/${encodeURIComponent(subscriberIdVal)}/details/view`
            : null);
        if (!urlToOpen) {
          showError(
            serviceType === ServiceType.Ftth ? 'FTTH' : formatServiceTypeLabelAr(serviceType),
            'معرف المشترك (FtthSubscriptionId أو SecruptionId) غير موجود.'
          );
          return;
        }
        window.open(urlToOpen, '_blank');
        setSelectedSubscriberForRenewal(subscriberToRenew);
        setRenewalData(prev => ({ ...prev, subscriberId, renewalDate: '', subscriberNoteType: null }));
        setRenewalViaSasTab(true);
        setShowRenewalModal(true);
        showInfo(
          formatServiceTypeLabelAr(serviceType),
          serviceType === ServiceType.Ftth
            ? 'تم فتح صفحة تفاصيل الزبون في FTTH. أكمل الإجراء هناك ثم اضغط «تم التفعيل» هنا.'
            : 'تم فتح رابط التفعيل. أكمل الإجراء هناك ثم اضغط «تم التفعيل» هنا.'
        );
        return;
      }
      if (serviceType === ServiceType.Earthlink) {
        const earthlinkName = encodeURIComponent(String(subscriberToRenew.fullName ?? '').trim());
        const earthlinkUrl = earthlinkName
          ? `${EARTHLINK_USER_MANAGEMENT_URL}?mn=${earthlinkName}&userst=0`
          : EARTHLINK_USER_MANAGEMENT_URL;
        window.open(earthlinkUrl, '_blank');
        setSelectedSubscriberForRenewal(subscriberToRenew);
        setRenewalData(prev => ({ ...prev, subscriberId, renewalDate: '', subscriberNoteType: null }));
        setRenewalViaSasTab(true);
        setShowRenewalModal(true);
        showInfo('Earthlink', 'تم فتح صفحة إدارة المستخدمين في Earthlink. أكمل التفعيل هناك ثم اضغط «تم التفعيل» هنا.');
        return;
      }
      if (sasUrl) {
        window.open(normalizeEarthlinkActivationUrl(sasUrl) || sasUrl, '_blank');
        setSelectedSubscriberForRenewal(subscriberToRenew);
        setRenewalData(prev => ({ ...prev, subscriberId, renewalDate: '', subscriberNoteType: null }));
        setRenewalViaSasTab(true);
        setShowRenewalModal(true);
        showInfo('تم فتح نافذة التفعيل', 'أتمم التفعيل في النافذة المفتوحة ثم اضغط «تم التفعيل» هنا.');
        return;
      }
      showError('خطأ', 'لم يُرجَع رابط تفعيل صالح من الخادم.');
    } catch (err: any) {
      showError('لا يمكن فتح رابط التفعيل', ApiService.showError(err));
    } finally {
      setSasLinkLoading(false);
    }
  };

  const handleActivateViaSasTab = async () => {
    if (selectedIds.length !== 1) {
      showError('اختر مشتركاً واحداً', 'لتفعيل عبر تاب SAS يرجى اختيار مشترك واحد فقط.');
      return;
    }
    const subscriberToRenew = subscribers?.find(s => s.id === selectedIds[0]);
    if (!subscriberToRenew) {
      showError('خطأ في البيانات', 'لم يتم العثور على بيانات المشترك المحدد');
      return;
    }


    if (myResellers.length > 1) {
      setPendingActivateSubscriberId(selectedIds[0]);
      setShowResellerPickerModal(true);
      setShowActionsDropdown(false);
      return;
    }

    // رسيلر واحد فقط: فتح التاب مباشرة دون عرض مودال الاختيار
    await openActivationLinkWithReseller(selectedIds[0], selectedOperationalResellerId || myResellers[0]?.id);
    setShowActionsDropdown(false);
  };

  const handleViewSubscriber = (id: string) => {
    navigate(`/admin/subscribers/${id}`);
  };

  const handleEditSubscriber = (id: string) => {
    const subscriber = subscribers?.find(s => s.id === id);
    if (subscriber) {
      setSelectedSubscriberForEdit(subscriber);
      setShowEditModal(true);
    }
  };

  const handleOpenNoteModal = (id: string) => {
    const subscriber = subscribers?.find(s => s.id === id);
    if (subscriber) {
      setSelectedSubscriberForNote(subscriber);
      setShowNoteModal(true);
    }
  };

  const handleSaveNote = async (id: string, noteType: SubscriberNoteType | null, note: string) => {
    const sub = selectedSubscriberForNote!;
    const nextNotePlain = noteType === SubscriberNoteType.Other ? (note || '').trim() : '';
    const patch = buildSubscriberNotesPatch(
      { noteType: sub.noteType ?? null, note: sub.note ?? '' },
      { noteType, note: nextNotePlain }
    );
    if (!patch) {
      setShowNoteModal(false);
      setSelectedSubscriberForNote(null);
      return;
    }
    try {
      await apiService.patchSubscriberNotes(id, patch);
      queryClient.invalidateQueries({ queryKey: ['subscribers'] });
      showSuccess('ادخال ملاحظة', 'تم حفظ الملاحظة بنجاح');
    } catch (err: unknown) {
      showError('ادخال ملاحظة', ApiService.showError(err));
    } finally {
      setShowNoteModal(false);
      setSelectedSubscriberForNote(null);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowActionsDropdown(false);
      }
      if (columnSettingsRef.current && !columnSettingsRef.current.contains(event.target as Node)) {
        setShowColumnSettings(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);


  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-md">
          خطأ في تحميل بيانات المشتركين
            </div>
          </div>
    );
  }

  if (createSubscriberMutation.isPending) {
    return (
      <div className="p-6 flex items-center justify-center h-screen">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <span className="text-lg font-medium text-gray-600 dark:text-gray-400">إضافة مشترك جديد...</span>
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
          text="تحميل المشتركين..."
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
            إدارة المشتركين
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
            عرض وإدارة جميع المشتركين
          </p>
        </div>
        {isAgentOrSubAgentOrEmployee && myResellers.length > 0 && (
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">المناطق</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              <button
                type="button"
                onClick={() => handleSubscribersResellerCardClick('')}
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
                    onClick={() => handleSubscribersResellerCardClick(r.id)}
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
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setShowActionsDropdown(!showActionsDropdown)}
              disabled={selectedIds.length === 0}
              className="flex items-center gap-2 px-3 py-2.5 sm:px-4 sm:py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm sm:text-base transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] touch-manipulation"
            >
              <MoreHorizontal className="h-4 w-4" />
              <span>الإجراءات ({selectedIds.length})</span>
            </button>
            
            {showActionsDropdown && selectedIds.length > 0 && (
              <div className="absolute top-full right-0 mt-2 min-w-[220px] w-max max-w-[320px] bg-white dark:bg-gray-800 rounded-lg shadow-xl ring-1 ring-black/10 dark:ring-white/10 border border-gray-200 dark:border-gray-600 z-50">
                <div className="py-1.5 flex flex-col gap-0.5">
                  {showActivateSubscriberAction && (
                  <button
                    onClick={() => {
                      handleBulkRenew();
                      setShowActionsDropdown(false);
                    }}
                    disabled={renewMutation.isPending}
                    className="w-full text-right px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    <span>تفعيل المشترك</span>
                  </button>
                  )}
                  {selectedIds.length === 1 && showActivateViaTabAction && (
                    <button
                      onClick={() => {
                        handleActivateViaSasTab();
                      }}
                      disabled={sasLinkLoading}
                      className="w-full text-right px-4 py-2 text-sm text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 flex items-center space-x-2"
                    >
                      <ExternalLink className="h-4 w-4" />
                      <span>{sasLinkLoading ? 'جاري جلب الرابط...' : 'تفعيل عبر اللوحة'}</span>
                    </button>
                  )}
                  {showViewDetailsAction && (
                  <button
                    onClick={() => {
                      selectedIds.forEach(id => handleViewSubscriber(id));
                      setShowActionsDropdown(false);
                    }}
                    className="w-full text-right px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                  >
                    <Eye className="h-4 w-4" />
                    <span>عرض تفاصيل المشترك</span>
                  </button>
                  )}
                  {showEditSubscriberAction && (
                  <button
                    onClick={() => {
                      selectedIds.forEach(id => handleEditSubscriber(id));
                      setShowActionsDropdown(false);
                    }}
                    className="w-full text-right px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                  >
                    <Edit className="h-4 w-4" />
                    <span>تعديل المشترك</span>
                  </button>
                  )}
                  
                  {selectedIds.length === 1 && (
                  <button
                    onClick={() => {
                        handleOpenNoteModal(selectedIds[0]);
                        setShowActionsDropdown(false);
                      }}
                      className="w-full text-right px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                    >
                      <FileText className="h-4 w-4" />
                      <span>ادخال ملاحظة</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      if (selectedIds.length !== 1) {
                        showError('إرسال تفاصيل المشترك', 'يرجى تحديد مشترك واحد فقط لإرسال التفاصيل.');
                        setShowActionsDropdown(false);
                        return;
                      }
                      const subscriber = subscribers?.find(s => s.id === selectedIds[0]);
                      if (subscriber) handleSendSubscriberDetails(subscriber);
                      setShowActionsDropdown(false);
                    }}
                    className="w-full text-right px-4 py-2 text-sm text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 flex items-center space-x-2"
                  >
                    <MessageCircle className="h-4 w-4" />
                    <span>إرسال دين او التفاصيل</span>
                  </button>
                  <button
                    onClick={() => handleSendAlertMessage()}
                    disabled={sendReminderLoading}
                    className="w-full text-right px-4 py-2 text-sm text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <MessageCircle className="h-4 w-4" />
                    <span>{sendReminderLoading ? 'جاري إرسال التنبيه...' : 'رسالة تنبيه الاشتراك'}</span>
                  </button>
                  {selectedIds.length === 1 && (
                    <button
                      onClick={() => {
                        const subscriber = subscribers?.find(s => s.id === selectedIds[0]);
                        if (subscriber) handleSendCustomMessage(subscriber);
                        setShowActionsDropdown(false);
                      }}
                      className="w-full text-right px-4 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 flex items-center space-x-2"
                    >
                      <MessageCircle className="h-4 w-4" />
                      <span>إرسال رسالة حر</span>
                    </button>
                  )}
                  {showDeleteSubscriberAction && (
                  <button
                    onClick={() => {
                      handleBulkDelete();
                      setShowActionsDropdown(false);
                    }}
                    className="w-full text-right px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center space-x-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>حذف المشترك</span>
                  </button>
                  )}
                </div>
              </div>
            )}
          </div>
          
          {canSyncSas && (
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 min-w-0">
                <label className="text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                  حد السحب (Zain Fi² / FiberX)
                </label>
                <select
                  value={subscriberFetchMaxChoice === null ? '__all__' : String(subscriberFetchMaxChoice)}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === '__all__') setSubscriberFetchMaxChoice(null);
                    else setSubscriberFetchMaxChoice(Number(v));
                  }}
                  className="px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white max-w-[120px]"
                  title="لمقارنة Zain Fi² و FiberX؛ «الكل» = maxSubscribersToFetch غير مُرسل (سحب الكل)"
                >
                  {subscriberFetchLimitSelectOptions.map((opt, i) => (
                    <option
                      key={`sync-fetch-${opt.label}-${String(opt.value)}-${i}`}
                      value={opt.value === null ? '__all__' : String(opt.value)}
                    >
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={handleAutoSyncClick}
                disabled={synchronizationFtthMutation.isPending}
                className="flex items-center gap-2 px-3 py-2.5 sm:px-4 sm:py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg text-sm sm:text-base transition-colors min-h-[44px] touch-manipulation border border-gray-300 dark:border-gray-600"
              >
                <RefreshCw className={`h-4 w-4 ${synchronizationFtthMutation.isPending ? 'animate-spin' : ''}`} />
                <span>{synchronizationFtthMutation.isPending ? 'جاري التحديث...' : 'تحديث بيانات'}</span>
              </button>
              {!synchronizationFtthMutation.isPending && (autoSyncFtthResult != null || zainfiDiffResult != null) && (
                <button
                  type="button"
                  onClick={() => setShowAutoSyncModal(true)}
                  className="flex items-center gap-2 px-3 py-2.5 sm:px-4 sm:py-2 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-200 rounded-lg text-sm sm:text-base transition-colors min-h-[44px] touch-manipulation border border-blue-200 dark:border-blue-800"
                >
                  <Eye className="h-4 w-4" />
                  <span>
                    عرض آخر قائمة (
                    {zainfiDiffResult != null
                      ? zainfiDiffResult.differences?.length ?? zainfiDiffResult.matchedPairCount ?? 0
                      : autoSyncFtthResult?.count ?? autoSyncFtthResult?.data?.length ?? 0}
                    )
                  </span>
                </button>
              )}
            </div>
          )}
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            disabled={createSubscriberMutation.isPending}
            className="flex items-center gap-2 px-3 py-2.5 sm:px-4 sm:py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm sm:text-base transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] touch-manipulation"
          >
            <Plus className="h-4 w-4" />
            <span>إضافة مشترك</span>
          </button>
        </div>
      </div>

      {/* فلترة متقدمة + تصدير تقرير الحسابات */}
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
              <span className="mr-1 px-1.5 py-0.5 text-xs rounded-full bg-primary-200 dark:bg-primary-800">
                مفعّل
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={openAccountsExcelExportModal}
            disabled={
              exportingExcel ||
              (user?.role === UserRole.Admin && (!accountsExcelExportAgentId || myAgentLoading))
            }
            title={
              user?.role === UserRole.Admin && !accountsExcelExportAgentId
                ? 'تعذر تحديد الوكيل'
                : 'تصدير تقرير حسابات المشتركين (Excel)'
            }
            className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-md border border-emerald-600/80 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:pointer-events-none text-white font-medium shadow-sm transition-colors"
          >
            <Download className="h-4 w-4 shrink-0" aria-hidden />
            تصدير Excel
          </button>
        </div>

        {showAdvancedFilter && (
          <div className="mt-3 p-4 bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              الحالة، الموقع الجغرافي، المنطقة، نوع الملاحظة، ترتيب التاريخ، الأيام حتى الانتهاء، ونطاق تاريخ انتهاء الاشتراك.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">الحالة</label>
            <select
              value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as SubscriptionStatus | 'all')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white text-sm"
            >
              <option value="all">جميع الحالات</option>
              <option value={SubscriptionStatus.Active}>نشط</option>
              <option value={SubscriptionStatus.ExpiringSoon}>سينتهي قريباً</option>
              <option value={SubscriptionStatus.Expired}>منتهي</option>
                  <option value={SubscriptionStatus.ExpiredToday}>سينتهي اليوم</option>
            </select>
          </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">ترتيب التاريخ</label>
                <select
                  value={sortDescending ? 'true' : 'false'}
                  onChange={(e) => { setSortDescending(e.target.value === 'true'); setCurrentPage(1); }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white text-sm"
                >
                  <option value="false">تصاعدي</option>
                  <option value="true">تنازلي</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">الموقع الجغرافي</label>
                <input
                  type="text"
                  placeholder="الموقع الجغرافي"
                  maxLength={200}
                  value={fatFilter}
                  onChange={(e) => setFatFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">اسم المسار</label>
                <input
                  type="text"
                  placeholder="اسم المسار"
                  maxLength={200}
                  value={zoneFilter}
                  onChange={(e) => setZoneFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">نوع الملاحظة</label>
                <select
                  value={noteTypeFilter}
                  onChange={(e) => setNoteTypeFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white text-sm"
                >
                  <option value="all">كل الملاحظات</option>
                  <option value={SubscriberNoteType.NoResponse}>تحويل ماستر</option>
                  <option value={SubscriberNoteType.WillActivateSoon}>الدفع عن طريق جهاز الماستر</option>
                  <option value={SubscriberNoteType.DoesNotWantActivation}>نقدا</option>
                  <option value={SubscriberNoteType.BadService}>واصل لمكتب محمد الجيزاني</option>
                  <option value={SubscriberNoteType.NeedsMaintenance}>دين</option>
                  <option value={SubscriberNoteType.Other}>أخرى</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">ينتهي خلال (يوم)</label>
                <input
                  type="number"
                  min={0}
                  placeholder="—"
                  value={maxDaysUntilExpiry}
                  onChange={(e) => setMaxDaysUntilExpiry(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">انتهاء الاشتراك من تاريخ</label>
                <input
                  type="date"
                  value={expirationFromDate}
                  onChange={(e) => setExpirationFromDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">انتهاء الاشتراك إلى تاريخ</label>
                <input
                  type="date"
                  value={expirationToDate}
                  onChange={(e) => setExpirationToDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white text-sm"
                />
              </div>
              <div className="flex items-end">
                <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={extensionActivationFilter}
                    onChange={(e) => setExtensionActivationFilter(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  تم تفعيل باقة تمديد
                </label>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              <button
                type="button"
                onClick={handleApplyAdvancedFilter}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-md text-sm font-medium"
              >
                <Check className="h-4 w-4" />
                تطبيق الفلتر
              </button>
              <button
                type="button"
                onClick={handleClearSearch}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-gray-200 rounded-md text-sm font-medium"
              >
                <X className="h-4 w-4" />
                مسح الفلتر
              </button>
            </div>
          </div>
        )}
      </div>

      {/* فلترة البحث */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder={requireTwoWordsForSearch ? 'البحث بالاسم الأول والثاني (كلمتين على الأقل)...' : 'البحث بالاسم أو رقم الهاتف...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), applySearch())}
            className="w-full pr-10 pl-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white text-sm"
          />
        </div>
        <button
          type="button"
          onClick={applySearch}
          className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md text-sm font-medium whitespace-nowrap"
        >
          بحث
        </button>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="flex items-center justify-end px-3 py-2 border-b border-gray-200 dark:border-gray-700">
          <div className="relative" ref={columnSettingsRef}>
            <button
              type="button"
              onClick={() => setShowColumnSettings((v) => !v)}
              className="p-2 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
              title="إعدادات عرض الجدول"
              aria-label="إعدادات عرض الجدول"
            >
              <Settings2 className="h-5 w-5" />
            </button>
            {showColumnSettings && (
              <div className="absolute left-0 top-full mt-1 z-20 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2">
                <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">الأعمدة الظاهرة</span>
                </div>
                <div className="max-h-64 overflow-y-auto px-2 py-1">
                  {SUBSCRIBERS_TABLE_COLUMNS.map(({ id, label }) => (
                    <label
                      key={id}
                      className="flex items-center gap-2 px-2 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={visibleColumns[id] !== false}
                        onChange={() => toggleColumnVisibility(id)}
                        className="rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="wakeel-table-scroll">
          <table className="min-w-full text-right">
            <thead>
              <tr>
                <th className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3">
                  <button onClick={toggleSelectAll} className="p-1" aria-label="تحديد الكل">
                    {subscribers && selectedIds.length === subscribers.length && subscribers.length > 0 ? (
                      <CheckSquare className="h-3 w-3 sm:h-4 sm:w-4 text-primary-600" />
                    ) : (
                      <Square className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
                    )}
                  </button>
                </th>
                <th className={`px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider ${col('secruptionId')}`}>
                  معرف الاشتراك
                </th>
                <th className={`px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider ${col('subscriber')}`}>
                  المشترك
                </th>
                <th className={`px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider ${col('username')}`}>
                  اسم المستخدم
                </th>
                <th className={`px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider ${col('subscriberRegion')}`}>
                  منطقة المشترك
                </th>
                <th className={`px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider ${col('phoneNumber')}`}>
                  رقم الهاتف
                </th>
                <th className={`px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider ${col('agentCompanyName')}`}>
                  شركة الوكيل
                </th>
                <th className={`px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider ${col('fat')}`}>
                  الموقع الجغرافي
                </th>
                <th className={`px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider ${col('zone')}`}>
                  اسم المسار
                </th>
                <th className={`px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider ${col('deviceSerialNumber')}`}>
                  السيريال
                </th>
                <th className={`px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider ${col('noteType')}`}>
                  نوع الملاحظة
                </th>
                <th className={`px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider ${col('note')}`}>
                  الملاحظات
                </th>
                <th className={`px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider ${col('profile')}`}>
                  الباقة
                </th>
                <th className={`px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider ${col('paymentMethod')}`}>
                  طريقة الدفع
                </th>
                <th className={`px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider ${col('activationDate')}`}>
                  تاريخ التفعيل
                </th>
                <th className={`px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider ${col('expirationDate')}`}>
                  تاريخ الانتهاء
                </th>
                <th className={`px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider ${col('status')}`}>
                  الحالة
                </th>
              </tr>
            </thead>
            <tbody>
              {subscribers?.map((subscriber) => (
                <tr
                  key={subscriber.id}
                  className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${
                    subscriberIdsWithOverdueDebt.has(subscriber.id) ? 'bg-red-50 dark:bg-red-900/20' : ''
                  }`}
                >
                  <td className="px-2 sm:px-4 lg:px-6 py-2 sm:py-4">
                    <button onClick={() => toggleSelectOne(subscriber.id)} className="p-1" aria-label="تحديد">
                      {selectedIds.includes(subscriber.id) ? (
                        <CheckSquare className="h-3 w-3 sm:h-4 sm:w-4 text-primary-600" />
                      ) : (
                        <Square className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
                      )}
                    </button>
                  </td>
                  <td className={`px-2 sm:px-4 lg:px-6 py-2 sm:py-4 whitespace-nowrap ${col('secruptionId')}`}>
                    <div className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">
                      {subscriber.secruptionId || '—'}
                    </div>
                  </td>
                  <td className={`px-2 sm:px-4 lg:px-6 py-2 sm:py-4 whitespace-nowrap ${col('subscriber')}`}>
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-8 w-8 sm:h-10 sm:w-10">
                        <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                          <span className="text-primary-600 dark:text-primary-400 text-xs sm:text-sm font-semibold">
                            {subscriber.firstName.charAt(0)}
                          </span>
                        </div>
                      </div>
                      <div className="mr-2 sm:mr-4">
                        <div className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">
                          {subscriber.fullName}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className={`px-2 sm:px-4 lg:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900 dark:text-white ${col('username')}`}>
                    {subscriber.username}
                  </td>
                  <td className={`px-2 sm:px-4 lg:px-6 py-2 sm:py-4 whitespace-nowrap ${col('subscriberRegion')}`}>
                    {(() => {
                      const region = getSubscriberRegion(subscriber);
                      return (
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold border ${region.badgeClass}`}>
                          {region.name}
                        </span>
                      );
                    })()}
                  </td>
                  <td className={`px-2 sm:px-4 lg:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900 dark:text-white ${col('phoneNumber')}`}>
                    <span className="flex items-center">
                      <Phone className="h-3 w-3 mr-1 text-gray-400 flex-shrink-0" />
                      {subscriber.phoneNumber}
                    </span>
                  </td>
                  <td className={`px-2 sm:px-4 lg:px-6 py-2 sm:py-4 whitespace-nowrap ${col('agentCompanyName')}`}>
                    <div className="text-xs sm:text-sm text-gray-900 dark:text-white">
                      {subscriber.agentCompanyName || 'غير محدد'}
                    </div>
                  </td>
                  <td className={`px-2 sm:px-4 lg:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900 dark:text-white ${col('fat')}`}>
                    {(() => {
                      const mapsUrl = googleMapsUrlFromCoordinates(subscriber.fat);
                      return mapsUrl ? (
                        <button
                          type="button"
                          onClick={() => window.open(mapsUrl, '_blank', 'noopener,noreferrer')}
                          className="text-primary-600 underline decoration-dotted underline-offset-2 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-200"
                          title="فتح الموقع في خرائط Google"
                        >
                          {subscriber.fat}
                        </button>
                      ) : (
                        subscriber.fat ?? '—'
                      );
                    })()}
                  </td>
                  <td className={`px-2 sm:px-4 lg:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900 dark:text-white ${col('zone')}`}>
                    {subscriber.zone ?? '—'}
                  </td>
                  <td className={`px-2 sm:px-4 lg:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900 dark:text-white ${col('deviceSerialNumber')}`}>
                    {subscriber.deviceSerialNumber ?? '—'}
                  </td>
                  <td className={`px-2 sm:px-4 lg:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900 dark:text-white ${col('noteType')}`}>
                    {getSubscriberNoteTypeBadge(subscriber.noteType, subscriber.note ?? null)}
                  </td>
                  <td className={`px-2 sm:px-4 lg:px-6 py-2 sm:py-4 text-xs sm:text-sm text-gray-900 dark:text-white ${col('note')}`}>
                    <div
                      className="max-w-[180px] sm:max-w-[240px] truncate"
                      title={(subscriber.note || '').toString()}
                    >
                      {(subscriber.note || '').toString().trim() || '—'}
                    </div>
                  </td>
                  <td className={`px-2 sm:px-4 lg:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900 dark:text-white ${col('profile')}`}>
                    {subscriber.profileName}
                  </td>
                  <td className={`px-2 sm:px-4 lg:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900 dark:text-white ${col('paymentMethod')}`}>
                    {formatPaymentMethodLabel(subscriber.paymentMethod)}
                  </td>
                  <td className={`px-2 sm:px-4 lg:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900 dark:text-white ${col('activationDate')}`}>
                    {formatDate(subscriber.activationDate, { year: 'numeric', month: 'numeric', day: 'numeric' })}
                  </td>
                  <td className={`px-2 sm:px-4 lg:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900 dark:text-white ${col('expirationDate')}`}>
                    {subscriber.expirationDate
                      ? formatDate(subscriber.expirationDate, { year: 'numeric', month: 'numeric', day: 'numeric' })
                      : 'غير محدد'}
                  </td>
                  <td className={`px-2 sm:px-4 lg:px-6 py-2 sm:py-4 whitespace-nowrap ${col('status')}`}>
                    {getStatusBadge(subscriber)}
                    {subscriber.daysUntilExpiry > 0 && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {subscriber.daysUntilExpiry} يوم متبقي
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {subscribers?.length === 0 && (
          <div className="text-center py-12">
            <UserPlus className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
              لا توجد مشتركين
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              ابدأ بإضافة مشترك جديد
            </p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {subscribersResponse && (
        <Pagination
          currentPage={subscribersResponse.currentPage}
          totalPages={subscribersResponse.totalPages}
          totalItems={subscribersResponse.totalItems}
          pageSize={subscribersResponse.pageSize}
          hasNextPage={subscribersResponse.hasNextPage}
          hasPreviousPage={subscribersResponse.hasPreviousPage}
          onPageChange={handlePageChange}
        />
      )}

      {/* Add Subscriber Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
                إضافة مشترك جديد
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
              >
                <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* معرف الاشتراك */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    معرف الاشتراك *
                  </label>
                  <input
                    type="text"
                    name="secruptionId"
                    value={formData.secruptionId ?? ''}
                    onChange={handleInputChange}
                    required
                    maxLength={100}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                    placeholder="معرف الاشتراك"
                  />
                </div>

                {/* Username */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    اسم المستخدم *
                  </label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                    placeholder="اسم المستخدم"
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    كلمة المرور *
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                    placeholder="كلمة المرور"
                  />
                </div>

                {/* First Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    الاسم الأول *
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                    placeholder="الاسم الأول"
                  />
                </div>

                {/* Last Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    اسم العائلة 
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                    placeholder="اسم العائلة"
                  />
                </div>

                {/* Phone Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    رقم الهاتف *
                  </label>
                  <input
                    type="tel"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                    placeholder="رقم الهاتف"
                  />
                </div>

                {/* Profile — قائمة مع بحث */}
                <div ref={profileDropdownAddRef}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    الباقة *
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowProfileDropdownAdd((v) => !v)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white text-right flex items-center justify-between"
                    >
                      <span className="truncate">
                        {formData.profileId && profilesForCreate.length > 0
                          ? (profilesForCreate.find((p) => p.id === formData.profileId)?.name ?? 'اختر الباقة')
                          : 'اختر الباقة'}
                        {formData.profileId && profilesForCreate.length > 0 && (() => {
                          const p = profilesForCreate.find((x) => x.id === formData.profileId);
                          return p ? ` - ${formatNumber(p.salePrice || 0, { suffix: ' د.ع' })}` : '';
                        })()}
                      </span>
                      <Search className="h-4 w-4 text-gray-400 flex-shrink-0 mr-2" />
                    </button>
                    {showProfileDropdownAdd && (
                      <div className="absolute z-20 mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 shadow-lg max-h-64 flex flex-col">
                        <div className="p-2 border-b border-gray-200 dark:border-gray-600 sticky top-0 bg-white dark:bg-gray-700">
                          <div className="relative">
                            <Search className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                              type="text"
                              value={profileSearchInAdd}
                              onChange={(e) => setProfileSearchInAdd(e.target.value)}
                              placeholder="البحث عن الباقة..."
                              className="w-full pl-3 pr-8 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-600 dark:text-white"
                              autoFocus
                            />
                          </div>
                        </div>
                        <ul className="overflow-y-auto py-1 max-h-48">
                          {filteredProfilesForAdd.length === 0 ? (
                            <li className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">لا توجد نتائج</li>
                          ) : (
                            filteredProfilesForAdd.map((profile) => (
                              <li key={profile.id}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setFormData((prev) => ({ ...prev, profileId: profile.id }));
                                    setShowProfileDropdownAdd(false);
                                    setProfileSearchInAdd('');
                                  }}
                                  className={`w-full text-right px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-600 ${
                                    formData.profileId === profile.id ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300' : 'text-gray-700 dark:text-gray-300'
                                  }`}
                                >
                        {profile.name} - {formatNumber(profile.salePrice || 0, { suffix: ' د.ع' })}
                                </button>
                              </li>
                            ))
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                <input type="hidden" name="activationDate" value={formData.activationDate} />
                <input type="hidden" name="expirationDate" value={formData.expirationDate} />
                
                {/* Info message */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        <strong>ملاحظة:</strong> المشترك الجديد سيتم إنشاؤه بحالة منتهي تلقائياً. يمكنك تفعيله لاحقاً من خلال عملية التجديد.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Subscription Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    نوع الاشتراك *
                  </label>
                  <select
                    name="subscriptionType"
                    value={formData.subscriptionType}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value={SubscriptionType.Paid}>مدفوع</option>
                    <option value={SubscriptionType.Free}>مجاني</option>
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    نوع الملاحظة
                  </label>
                  <select
                    name="noteType"
                    value={formData.noteType ?? ''}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value={SubscriberNoteType.NoResponse}>تحويل ماستر</option>
                    <option value={SubscriberNoteType.WillActivateSoon}>الدفع عن طريق جهاز الماستر</option>
                    <option value={SubscriberNoteType.DoesNotWantActivation}>نقدا</option>
                    <option value={SubscriberNoteType.BadService}>واصل لمكتب محمد الجيزاني</option>
                    <option value={SubscriberNoteType.NeedsMaintenance}>دين</option>
                    <option value={SubscriberNoteType.Other}>أخرى</option>
                  </select>
                </div>

                {formData.noteType === SubscriberNoteType.Other && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      نص الملاحظة
                </label>
                <textarea
                  name="note"
                  value={formData.note}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                      placeholder="اكتب الملاحظة..."
                    />
                  </div>
                )}
              </div>

              {/* الموقع الجغرافي واسم المسار والسيريال */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    الموقع الجغرافي
                  </label>
                  <input
                    type="text"
                    name="fat"
                    value={formData.fat ?? ''}
                    onChange={handleInputChange}
                    maxLength={200}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                    placeholder="الموقع الجغرافي (اختياري)"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    اسم المسار
                  </label>
                  <input
                    type="text"
                    name="zone"
                    value={formData.zone ?? ''}
                    onChange={handleInputChange}
                    maxLength={200}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                    placeholder="اسم المسار (اختياري)"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">السيريال</label>
                  <input type="text" name="deviceSerialNumber" value={formData.deviceSerialNumber ?? ''}
                    onChange={handleInputChange} maxLength={200}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                    placeholder="السيريال (اختياري)" />
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={createSubscriberMutation.isPending}
                  className="flex items-center space-x-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {createSubscriberMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>جاري الحفظ...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      <span>حفظ المشترك</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Renewal Modal */}
      {showRenewalModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-[2px] flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200/90 dark:border-gray-700 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-l from-primary-50/90 via-white to-white dark:from-primary-950/40 dark:via-gray-800 dark:to-gray-800 shrink-0">
              <div className="min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <h2
                    className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white tracking-tight truncate"
                    title={
                      (renewalInfo?.subscriberName || selectedSubscriberForRenewal?.fullName || '').trim() ||
                      undefined
                    }
                  >
                    {(renewalInfo?.subscriberName || selectedSubscriberForRenewal?.fullName || '').trim() ||
                      'تفعيل المشترك'}
                  </h2>
                  {daysUntilExpiryText && (
                    <span className="shrink-0 text-xs sm:text-sm font-medium text-amber-700 dark:text-amber-300 bg-amber-100/80 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-full px-2 py-0.5">
                      {daysUntilExpiryText}
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedSubscriberForRenewal(null);
                  setShowRenewalModal(false);
                  setRenewalViaSasTab(false);
                  setShowOtherDealerTopUpModal(false);
                }}
                className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors shrink-0"
              >
                <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            {renewalViaSasTab && (
              <div className="mx-4 sm:mx-6 mb-2 shrink-0 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                <p className="text-amber-800 dark:text-amber-200 text-sm">
                  تم فتح نافذة SAS. بعد إتمام التفعيل واضغط الزر في SAS يُغلق التاب ويرجعك للنظام تلقائياً. ثم أدخل بيانات التجديد هنا واضغط «تم التفعيل» أو «طباعة» أدناه.
                </p>
              </div>
            )}

            {!renewalInfo ? (
              <div className="p-6 text-center">
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <p className="text-red-600 dark:text-red-400 font-medium">
                    خطأ في تحميل بيانات المشترك
                  </p>
                  <p className="text-red-500 dark:text-red-500 text-sm mt-2">
                    لم يتم العثور على بيانات المشترك المحدد. تأكد من أن المشترك موجود في القائمة.
                  </p>
                  <button
                    onClick={() => {
                      setSelectedSubscriberForRenewal(null);
                      setShowRenewalModal(false);
                      setRenewalViaSasTab(false);
                      setShowOtherDealerTopUpModal(false);
                    }}
                    className="mt-3 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
                  >
                    إغلاق
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleRenewalSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
                <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4 min-h-0">
                  <section className="rounded-xl border border-gray-200/90 dark:border-gray-600/70 overflow-hidden bg-white/60 dark:bg-gray-800/30">
                    <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700/80 bg-gray-50/90 dark:bg-gray-900/25">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">الباقة الجديدة</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">اختر باقة التجديد أو التمديد.</p>
                    </div>
                    <div className="p-3 sm:p-4">
                      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">الباقة *</label>
                          <select
                            name="newProfileId"
                            value={renewalData.newProfileId}
                            onChange={handleRenewalInputChange}
                            className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                          >
                            <option value="">اختر الباقة</option>
                            {renewalProfilesForSelect.map((profile) => (
                              <option key={profile.id} value={profile.id}>
                                {profile.name} -{' '}
                                {profile.packageType === ProfilePackageType.Extension
                                  ? `${formatNumber(profile.salePrice || 0, { suffix: ' د.ع' })} — تمديد`
                                  : profile.packageType === ProfilePackageType.SpecialOffer
                                    ? `${formatNumber(profile.salePrice || 0, { suffix: ' د.ع' })} — عرض خاص`
                                    : formatNumber(profile.salePrice || 0, { suffix: ' د.ع' })}{' '}
                                ({profile.renewalPeriod || 30} يوم)
                              </option>
                            ))}
                          </select>
                        </div>
                        {renewalData.newProfileId && (
                          <div className="group relative flex justify-end sm:pt-8">
                            <button
                              type="button"
                              className="rounded-full p-2 text-primary-600 hover:bg-primary-50 dark:text-primary-400 dark:hover:bg-primary-950/40"
                              aria-label="معلومات التجديد والتفعيل"
                            >
                              <Info className="h-5 w-5" aria-hidden />
                            </button>
                            <div
                              role="tooltip"
                              className="pointer-events-none invisible absolute bottom-full left-1/2 z-50 mb-2 w-[min(18rem,calc(100vw-2rem))] -translate-x-1/2 rounded-lg border border-gray-200 bg-white p-3 text-start text-xs text-gray-700 opacity-0 shadow-lg transition-opacity group-hover:visible group-hover:opacity-100 group-focus-within:visible dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                            >
                              {(() => {
                                const p = renewalInfo.availableProfiles?.find((pr) => pr.id === renewalData.newProfileId);
                                const period = p?.renewalPeriod || 30;
                                const isExt = p?.packageType === ProfilePackageType.Extension;
                                return (
                                  <div className="space-y-1.5">
                                    <p>
                                      <strong>فترة التجديد:</strong> {period} يوم
                                    </p>
                                    <p>
                                      <strong>نوع التفعيل:</strong> {isExt ? 'تمديد' : 'اشتراك'}
                                    </p>
                                    <p>
                                      <strong>انتهاء جديد:</strong> يُضاف للمدة الحالية للمشترك
                                    </p>
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </section>

                  <section className="rounded-xl border border-gray-200/90 dark:border-gray-600/70 overflow-hidden bg-white/60 dark:bg-gray-800/30">
                    <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700/80 bg-gray-50/90 dark:bg-gray-900/25">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">المبالغ والدين والملاحظات</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">اضبط السعر والواصل ثم راجع الدين قبل التأكيد.</p>
                    </div>
                    <div className="p-3 sm:p-4 space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">سعر الاشتراك (د.ع)</label>
                          <input
                            type="number"
                            name="overrideSalePrice"
                            value={renewalData.overrideSalePrice === 0 ? '' : renewalData.overrideSalePrice}
                            onChange={handleRenewalInputChange}
                            min="0"
                            placeholder="افتراضي = سعر الباقة"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">المبلغ الواصل (د.ع)</label>
                          <input
                            type="number"
                            name="amountPaid"
                            value={renewalData.amountPaid === 0 ? '' : renewalData.amountPaid}
                            onChange={handleRenewalInputChange}
                            min="0"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                            مبلغ الدين <span className="text-gray-400 font-normal">(تلقائي)</span>
                          </label>
                          <input
                            type="number"
                            name="remainingAmount"
                            value={renewalData.remainingAmount || 0}
                            onChange={handleRenewalInputChange}
                            min="0"
                            readOnly
                            className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800/80 cursor-not-allowed"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">ملاحظات الدين</label>
                          <input
                            type="text"
                            name="debtDescription"
                            value={renewalData.debtDescription || ''}
                            onChange={handleRenewalInputChange}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                            placeholder="اختياري"
                          />
                        </div>
                      </div>
                      {(renewalData.remainingAmount || 0) > 0 && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                            تاريخ الاستحقاق / تسديد الدين *
                          </label>
                          <input
                            type="date"
                            name="debtDueDate"
                            value={renewalData.debtDueDate || ''}
                            onChange={handleRenewalInputChange}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white max-w-xs"
                          />
                        </div>
                      )}
                      <div className="space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-end gap-2 sm:gap-3">
                          <div className="flex-1 min-w-0">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                              جهة المبلغ الواصل
                            </label>
                            <select
                              value={
                                renewalData.subscriberNoteType != null && Number.isFinite(renewalData.subscriberNoteType)
                                  ? String(renewalData.subscriberNoteType)
                                  : ''
                              }
                              onChange={(e) => {
                                const v = e.target.value;
                                setRenewalData((p) => ({
                                  ...p,
                                  subscriberNoteType: v === '' ? null : parseInt(v, 10),
                                }));
                              }}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                            >
                              <option value="">— اختر —</option>
                              {renewalSubscriberNoteTypes.map((opt, idx) => (
                                <option key={`${opt.value}-${idx}`} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <button
                            type="button"
                            onClick={() => renewalGeneralNotesTextareaRef.current?.focus()}
                            className="shrink-0 px-4 py-2 text-sm font-medium rounded-lg border border-primary-600 text-primary-700 bg-primary-50 hover:bg-primary-100 dark:border-primary-500 dark:text-primary-200 dark:bg-primary-950/40 dark:hover:bg-primary-900/50 transition-colors"
                          >
                            إدخال ملاحظة
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">ملاحظات عامة</label>
                        <textarea
                          ref={renewalGeneralNotesTextareaRef}
                          name="notes"
                          value={renewalData.notes}
                          onChange={handleRenewalInputChange}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                          placeholder="ملاحظات إضافية..."
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                          تاريخ استلام الحساب <span className="text-gray-400 font-normal">(اختياري)</span>
                        </label>
                        <input
                          type="date"
                          name="renewalDate"
                          value={renewalData.renewalDate || ''}
                          onChange={handleRenewalInputChange}
                          max={getBaghdadTodayYmd()}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white max-w-xs"
                        />
                     
                      </div>
                    </div>
                  </section>
                </div>

                <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 px-4 sm:px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50/90 dark:bg-gray-900/40 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSubscriberForRenewal(null);
                      setShowRenewalModal(false);
                      setRenewalViaSasTab(false);
                      setShowOtherDealerTopUpModal(false);
                    }}
                    className="w-full sm:w-auto px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={createRenewalMutation.isPending}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md disabled:opacity-50 disabled:cursor-not-allowed min-w-[140px]"
                  >
                    {createRenewalMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                        جاري التفعيل...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4" />
                        {renewalViaSasTab ? 'تم التفعيل' : 'تفعيل المشترك'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {showOtherDealerTopUpModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="subscriber-renewal-topup-title"
        >
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
              <h2
                id="subscriber-renewal-topup-title"
                className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2"
              >
                <Wallet className="h-5 w-5" />
                تعبئة الرصيد
              </h2>
              <button
                type="button"
                onClick={() => setShowOtherDealerTopUpModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                aria-label="إغلاق"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto">
              <form onSubmit={handleOtherDealerTopUpSubmit} className="space-y-4">
                {hasRenewalModalResellerRegions && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">المنطقة *</label>
                    <select
                      value={otherDealerTopUpForm.agentResellerId ?? ''}
                      onChange={(e) =>
                        setOtherDealerTopUpForm((prev) => ({ ...prev, agentResellerId: e.target.value }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                      required
                    >
                      <option value="">— اختر المنطقة —</option>
                      {renewalModalResellerRows.map((r) => (
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
                    value={otherDealerTopUpForm.amountIqd || ''}
                    onChange={(e) =>
                      setOtherDealerTopUpForm((prev) => ({ ...prev, amountIqd: Number(e.target.value) || 0 }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">اسم المستلم *</label>
                  <input
                    type="text"
                    value={otherDealerTopUpForm.recipientName}
                    onChange={(e) =>
                      setOtherDealerTopUpForm((prev) => ({ ...prev, recipientName: e.target.value }))
                    }
                    placeholder="أحمد محمد"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الشركة / جهة الرصيد *</label>
                  <input
                    type="text"
                    value={otherDealerTopUpForm.companyName}
                    onChange={(e) =>
                      setOtherDealerTopUpForm((prev) => ({ ...prev, companyName: e.target.value }))
                    }
                    placeholder="شركة الاتصالات"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">تاريخ التعبئة (اختياري)</label>
                  <input
                    type="date"
                    value={otherDealerTopUpForm.topUpDate}
                    onChange={(e) =>
                      setOtherDealerTopUpForm((prev) => ({ ...prev, topUpDate: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={otherDealerTopUpMutation.isPending}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-md text-sm font-medium"
                  >
                    {otherDealerTopUpMutation.isPending ? 'جاري الحفظ...' : 'تسجيل التعبئة'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowOtherDealerTopUpModal(false)}
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

      {/* Receipt Modal */}
      {showReceiptModal && lastReceipt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                فاتورة التفعيل
              </h2>
              <button
                onClick={() => setShowReceiptModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
              >
                <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Receipt Header */}
              <div className="text-center border-b border-gray-200 dark:border-gray-700 pb-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  {(() => {
                    console.log('Modal displaying receiptNumber:', lastReceipt.receiptNumber);
                    console.log('Modal lastReceipt object:', lastReceipt);
                    return lastReceipt.receiptNumber;
                  })()}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {formatDate(lastReceipt.renewalDate)} - {new Date(lastReceipt.renewalDate).toLocaleTimeString(locale)}
                </p>
              </div>

              {/* Subscriber Info */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">المشترك:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{lastReceipt.subscriberName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">رقم الهاتف:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{lastReceipt.subscriberPhone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">الباقة:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{lastReceipt.newProfileName}</span>
                </div>
              </div>

              {/* Pricing Details */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-2">
                {(lastReceipt.discountAmount ?? 0) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">الخصم:</span>
                    <span className="text-red-600 dark:text-red-400">-{formatNumber(lastReceipt.discountAmount ?? 0, { suffix: ' د.ع' })} ({(lastReceipt.discountPercent ?? 0).toFixed(1)}%)</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg border-t border-gray-200 dark:border-gray-600 pt-2">
                  <span className="text-gray-900 dark:text-white">سعر الاشتراك:</span>
                  <span className="text-primary-600 dark:text-primary-400">{formatNumber(lastReceipt.finalPrice ?? 0, { suffix: ' د.ع' })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">المبلغ الواصل:</span>
                  <span className="text-green-600 dark:text-green-400">{formatNumber(lastReceipt.amountPaid ?? 0, { suffix: ' د.ع' })}</span>
                </div>
                  <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">مبلغ الدين:</span>
                  <span className="text-red-600 dark:text-red-400">{formatNumber((lastReceipt.finalPrice ?? 0) - (lastReceipt.amountPaid ?? 0), { suffix: ' د.ع' })}</span>
                  </div>
              </div>

              {/* Renewal Details */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">تاريخ الانتهاء الجديد:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{formatDate(lastReceipt.newExpirationDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">ملاحظات الدين:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {((lastReceipt.finalPrice ?? 0) - (lastReceipt.amountPaid ?? 0)) > 0
                      ? `الباقي من المبلغ: ${formatNumber((lastReceipt.finalPrice ?? 0) - (lastReceipt.amountPaid ?? 0), { suffix: ' د.ع' })}`
                      : 'لا يوجد دين'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">حالة الدفع:</span>
                  <span className={`font-medium ${
                    lastReceipt.paymentStatus === 1 ? 'text-green-600 dark:text-green-400' :
                    lastReceipt.paymentStatus === 2 ? 'text-red-600 dark:text-red-400' :
                    'text-yellow-600 dark:text-yellow-400'
                  }`}>
                    {lastReceipt.paymentStatus === 1 ? 'مدفوع' :
                     lastReceipt.paymentStatus === 2 ? 'غير مدفوع' : 'معلق'}
                  </span>
                </div>
              </div>

              {lastReceipt.notes && (
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    <span className="font-medium">ملاحظات:</span> {lastReceipt.notes}
                  </p>
                </div>
              )}

              {/* Actions */}
              {!hasWhatsAppSession && (
                <p className="text-sm text-amber-600 dark:text-amber-400 pt-2">لإرسال رسائل واتساب أضف معرف جلسة واتساب في الإعدادات.</p>
              )}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setShowReceiptModal(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
                >
                  إغلاق
                </button>
                <button
                  onClick={() => handleSendWhatsApp(lastReceipt)}
                  disabled={!hasWhatsAppSession || !lastReceipt.subscriberId}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>إرسال واتساب</span>
                </button>
                <button
                  onClick={() => handlePrintReceipt(lastReceipt)}
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md transition-colors"
                >
                  طباعة
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* نافذة اختيار الرسيلر عند التفعيل عبر تاب (عند وجود أكثر من رسيلر) */}
      {showResellerPickerModal && pendingActivateSubscriberId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">اختر الرسيلر للتفعيل</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              قد يكون المشترك موجوداً في أكثر من مصدر. اختر الرسيلر الذي تريد فتح رابط التفعيل منه.
            </p>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {[...myResellers].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)).map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    openActivationLinkWithReseller(pendingActivateSubscriberId, r.id);
                    setShowResellerPickerModal(false);
                    setPendingActivateSubscriberId(null);
                  }}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 text-right rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:border-primary-300 dark:hover:border-primary-700 transition-colors"
                >
                  <span className="font-medium text-gray-900 dark:text-white">{r.name}</span>
                  <span className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                    {formatServiceTypeLabelAr(r.serviceType as ServiceType)}
                  </span>
                </button>
              ))}
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowResellerPickerModal(false);
                  setPendingActivateSubscriberId(null);
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {showExcelExportModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="subscribers-accounts-excel-export-title"
        >
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <Download className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden />
                <h2
                  id="subscribers-accounts-excel-export-title"
                  className="text-lg font-semibold text-gray-900 dark:text-white truncate"
                >
                  تصدير Excel — تقرير الحسابات
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
            
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-1 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  checked={excelExportOmitDates}
                  disabled={exportingExcel}
                  onChange={(e) => setExcelExportOmitDates(e.target.checked)}
                />

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
                  disabled={exportingExcel || myResellers.length === 0}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm dark:bg-gray-700 dark:text-white text-sm"
                >
                  <option value="">الكل</option>
                  {myResellers.map((r) => (
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
                  {accountsExecutorOptionsForExcel.map((u) => (
                    <option key={u.id} value={u.id}>
                      {(u.fullName || u.username || u.id).trim()}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="subscribers-excel-accounts-package-type"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  نوع التفعيل
                </label>
                <select
                  id="subscribers-excel-accounts-package-type"
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

      {showAutoSyncModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-6xl bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {zainfiDiffResult
                    ? syncDiffProvider === 'fiberx'
                      ? 'مقارنة FiberX مع النظام'
                      : 'مقارنة Zain Fi² مع النظام'
                    : `نتائج المزامنة التلقائية ${String(autoSyncFtthResult?.provider || '').toUpperCase() || 'FTTH'}`}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {zainfiDiffResult
                    ? ''
                    : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAutoSyncModal(false)}
                className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                aria-label="إغلاق"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {!zainfiDiffResult && (
              <div className="px-5 py-3 text-sm text-gray-700 dark:text-gray-300 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between gap-3">
                <div>
                  عدد السجلات:{' '}
                  <strong>{autoSyncFtthResult?.count ?? autoSyncFtthResult?.data?.length ?? 0}</strong>
                </div>
                {String(autoSyncFtthResult?.provider || '').toLowerCase() === 'sas' &&
                  (autoSyncFtthResult?.data?.length ?? 0) > 0 && (
                    <button
                      type="button"
                      onClick={() => saveAllSasSyncItemsMutation.mutate()}
                      disabled={savingAllSasRows}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-60"
                    >
                      {savingAllSasRows ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : null}
                      حفظ الكل
                    </button>
                  )}
              </div>
            )}

            <div className="overflow-auto bg-gray-50/40 dark:bg-gray-900/20 flex-1 min-h-0">
              {zainfiDiffResult ? (
                <table className="min-w-[520px] w-full text-sm text-right border-separate border-spacing-0">
                  <thead className="bg-white/95 dark:bg-gray-800/95 sticky top-0 z-10 backdrop-blur-sm">
                    <tr>
                      <th className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 font-semibold text-gray-700 dark:text-gray-200">
                        اسم المشترك
                      </th>
                      <th className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 font-semibold text-gray-700 dark:text-gray-200">
                        تاريخ الانتهاء
                      </th>
                      <th className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 font-semibold text-gray-700 dark:text-gray-200">
                        {syncDiffProvider === 'fiberx' ? 'الباقة(FiberX)' : 'الباقة(Zain)'}
                      </th>
                      <th className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 font-semibold text-gray-700 dark:text-gray-200 w-[1%] whitespace-nowrap">
                        إجراء
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(zainfiDiffResult.differences ?? []).length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-10 text-center text-gray-500 dark:text-gray-400">
                          لا توجد فروقات مسجّلة لهذا الجلب.
                        </td>
                      </tr>
                    ) : (
                      (zainfiDiffResult.differences ?? []).map((diffRow, dIdx) => {
                        const offerDisplay =
                          (diffRow.offerName && String(diffRow.offerName).trim()) ||
                          (diffRow.externalOfferName && String(diffRow.externalOfferName).trim()) ||
                          '';
                        const externalEndForApply = resolveZainfiApplyExternalEndDate(diffRow);
                        const isApplyingThis =
                          applyingZainfiExpirationSubscriberId === diffRow.subscriberId;
                        return (
                          <tr
                            key={`${diffRow.subscriberId}-${dIdx}`}
                            className="border-t border-gray-100 dark:border-gray-700 even:bg-white odd:bg-gray-50/70 dark:even:bg-gray-800/40 dark:odd:bg-gray-800/20"
                          >
                            <td className="px-4 py-3 align-top font-medium text-gray-900 dark:text-gray-100 max-w-[200px]">
                              {diffRow.subscriberName?.trim() ? diffRow.subscriberName : '—'}
                            </td>
                            <td className="px-4 py-3 align-top whitespace-nowrap text-gray-700 dark:text-gray-300">
                              {diffRow.expirationDate
                                ? formatDate(String(diffRow.expirationDate))
                                : '—'}
                            </td>
                            <td className="px-4 py-3 align-top max-w-[220px]">
                              {offerDisplay ? (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200">
                                  {offerDisplay}
                                </span>
                              ) : (
                                '—'
                              )}
                            </td>
                            <td className="px-4 py-3 align-top whitespace-nowrap">
                              <button
                                type="button"
                                disabled={
                                  !externalEndForApply ||
                                  !diffRow.subscriberId ||
                                  applyZainfiExternalExpirationMutation.isPending
                                }
                                onClick={() => {
                                  const ext = resolveZainfiApplyExternalEndDate(diffRow);
                                  if (!ext || !diffRow.subscriberId) return;
                                  applyZainfiExternalExpirationMutation.mutate({
                                    subscriberId: diffRow.subscriberId,
                                    externalEndDate: ext,
                                  });
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-primary-600 hover:bg-primary-700 text-white disabled:opacity-50 disabled:pointer-events-none"
                              >
                                {isApplyingThis ? (
                                  <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-hidden />
                                ) : null}
                                تحديث
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              ) : (
              <table className="min-w-[980px] w-full text-sm text-right border-separate border-spacing-0">
                <thead className="bg-white/95 dark:bg-gray-800/95 sticky top-0 z-10 backdrop-blur-sm">
                  <tr>
                    <th className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 font-semibold text-gray-700 dark:text-gray-200">اسم المشترك</th>
                    <th className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 font-semibold text-gray-700 dark:text-gray-200">الباقة</th>
                    <th className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 font-semibold text-gray-700 dark:text-gray-200">انتهاء الاشتراك</th>
                    <th className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 font-semibold text-gray-700 dark:text-gray-200">
                      {autoSyncReseller?.serviceType === ServiceType.Sas ? 'الوكيل' : 'المنطقة'}
                    </th>
                    <th className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 font-semibold text-gray-700 dark:text-gray-200">اسم المستخدم</th>
                    <th className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 font-semibold text-gray-700 dark:text-gray-200">طريقة التفعيل</th>
                    <th className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 font-semibold text-gray-700 dark:text-gray-200">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {(autoSyncFtthResult?.data ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-gray-500 dark:text-gray-400">
                        لا توجد بيانات ضمن آخر أسبوع.
                      </td>
                    </tr>
                  ) : (
                    (autoSyncFtthResult?.data ?? []).map((row: CashbackSynchronizationFtthRow, idx: number) => {
                      const isSavingThisRow = savingFtthRowIndex === idx;
                      const isOpeningRenewalThisRow = openingRenewalFtthRowIndex === idx;
                      const isSaved = savedFtthRowIndices.has(idx);
                      const isActivated = activatedFtthRowIndices.has(idx);
                      const customerName = row.customerName ?? row.firstname ?? null;
                      const packageName = row.subscriptionName ?? row.profile_details?.name ?? null;
                      const expirationAt = row.subscriptionEndsAt ?? row.new_expiration ?? null;
                      const zoneOrParent = row.zoneId ?? row.parent_username ?? null;
                      const deviceOrUsername = (row.deviceUsername ?? row.username ?? '').toString().trim();
                      const rawActivationMethod = (row.activationType ?? row.activation_method ?? '').toString().trim();
                      const activationMethod = (() => {
                        const normalized = rawActivationMethod.toLowerCase();
                        if (normalized === 'user_credit') return 'بطاقة ائتمان المشترك';
                        if (normalized === 'voucher') return 'محفظة الوكيل';
                        if (normalized === 'credit') return 'قسيمة';
                        return rawActivationMethod || null;
                      })();
                      return (
                        <tr
                          key={`${deviceOrUsername || customerName || 'r'}-${idx}`}
                          className="border-t border-gray-100 dark:border-gray-700 even:bg-white odd:bg-gray-50/70 dark:even:bg-gray-800/40 dark:odd:bg-gray-800/20 hover:bg-primary-50/70 dark:hover:bg-primary-900/20 transition-colors"
                        >
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{customerName || '—'}</td>
                        <td className="px-4 py-3">
                          {packageName ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200">
                              {packageName}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-700 dark:text-gray-300">{expirationAt ? formatDate(expirationAt) : '—'}</td>
                        <td className="px-4 py-3">
                          {zoneOrParent ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200">
                              {zoneOrParent}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {deviceOrUsername ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                              {deviceOrUsername}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-200">
                              (مشترك جديد)
                            </span>
                          )}
                        </td>
                          <td className="px-4 py-3">
                            {activationMethod ? (
                              <span
                                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                                  activationMethod.includes('الوكيل') || activationMethod.includes('قسيمة')
                                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200'
                                    : 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-200'
                                }`}
                              >
                                {activationMethod}
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="inline-flex items-center gap-2">
                              <button
                                type="button"
                                disabled={savingAllSasRows || isSavingThisRow || isOpeningRenewalThisRow}
                                onClick={() => saveFtthSyncItemMutation.mutate({ row, rowIndex: idx })}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold bg-gray-700 hover:bg-gray-800 text-white disabled:opacity-60"
                              >
                                {isSavingThisRow ? <RefreshCw className="h-3 w-3 animate-spin" /> : null}
                                حفظ
                              </button>
                              {showActivateSubscriberAction && (
                              <button
                                type="button"
                                disabled={savingAllSasRows || isSavingThisRow || isOpeningRenewalThisRow}
                                onClick={() => openRenewalModalForFtthSyncRow(row, idx)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold bg-primary-600 hover:bg-primary-700 text-white disabled:opacity-60"
                              >
                                {isOpeningRenewalThisRow ? <RefreshCw className="h-3 w-3 animate-spin" /> : null}
                                تفعيل
                              </button>
                              )}
                              {(isSaved || isActivated) && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">
                                  <Check className="h-3 w-3" />
                                  {isActivated ? 'تم التفعيل' : 'تم الحفظ'}
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
              )}
            </div>

            <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
              <button
                type="button"
                onClick={() => setShowAutoSyncModal(false)}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md text-gray-700 dark:text-gray-200"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {showAutoSyncResellerPickerModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">اختر الرسيلر للمزامنة</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              لديك أكثر من رسيلر بأنواع مختلفة. اختر الرسيلر ليتم استدعاء API المزامنة الصحيح حسب النوع.
            </p>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {[...myResellers].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)).map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    setShowAutoSyncResellerPickerModal(false);
                    synchronizationFtthMutation.mutate(r);
                  }}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 text-right rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:border-primary-300 dark:hover:border-primary-700 transition-colors"
                >
                  <span className="font-medium text-gray-900 dark:text-white">{r.name}</span>
                  <span className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                    {formatServiceTypeLabelAr(r.serviceType as ServiceType)}
                  </span>
                </button>
              ))}
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setShowAutoSyncResellerPickerModal(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {postActivationWhatsApp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-sm w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {postActivationWhatsApp.mode === 'activation' ? 'إرسال رسالة التفعيل بالواتساب؟' : 'إرسال رسالة الدين/التفاصيل بالواتساب؟'}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              تم تفعيل المشترك بنجاح. يمكنك الآن اختيار إرسال رسالة واتساب أو إغلاق هذه النافذة.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPostActivationWhatsApp(null)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md text-sm"
              >
                إلغاء
              </button>
              {postActivationWhatsApp.mode === 'activation' ? (
                <button
                  type="button"
                  onClick={async () => {
                    const id = postActivationWhatsApp.subscriberId;
                    setPostActivationWhatsApp(null);
                    await apiService.sendWhatsAppActivation(id);
                  }}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm"
                >
                  إرسال رسالة التفعيل
                </button>
              ) : (
                <button
                  type="button"
                  onClick={async () => {
                    const id = postActivationWhatsApp.subscriberId;
                    setPostActivationWhatsApp(null);
                    await handleSendSubscriberDetailsById(id);
                  }}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm"
                >
                  إرسال رسالة الدين/التفاصيل
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Subscriber Modal */}
      {selectedSubscriberForEdit && (
        <EditSubscriberModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedSubscriberForEdit(null);
          }}
          subscriber={selectedSubscriberForEdit}
          profiles={profilesForEditSubscriber}
          onUpdate={async (id, data) => {
            await updateSubscriberMutation.mutateAsync({ id, data });
          }}
        />
      )}

      {/* Add Note Modal */}
      {selectedSubscriberForNote && (
        <AddNoteModal
          isOpen={showNoteModal}
          onClose={() => {
            setShowNoteModal(false);
            setSelectedSubscriberForNote(null);
          }}
          subscriber={selectedSubscriberForNote}
          onSave={handleSaveNote}
        />
      )}
    </div>
  );
};

export default SubscribersPage;