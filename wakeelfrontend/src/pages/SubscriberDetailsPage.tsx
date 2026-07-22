import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  Calendar,
  CreditCard,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  MessageCircle,
  Wrench,
  User,
  RefreshCw,
  MapPin,
  Hash,
  Building2,
  Eye,
  X,
} from 'lucide-react';
import {
  type Subscriber,
  type SubscriberWhatsAppMessageTypeSummary,
  type SubscriberWhatsAppSendLogItem,
  type SubscriberWhatsAppSendKind,
  RenewalHistory,
  EmployeeTask,
  EmployeeTaskStatus,
  EmployeeTaskType,
  SubscriberNoteType,
  SubscriberMaintenanceKind,
  SubscriptionStatus,
  SubscriptionType,
  PaymentStatus,
  UserRole,
} from '../types';
import { apiService, ApiService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useDigits } from '../contexts/DigitsContext';
import { useMyAgent } from '../hooks/useMyAgent';
import Pagination from '../components/Pagination';
import { showSuccess, showError } from '../utils/notifications';
import { SUBSCRIBER_NOTE_TYPE_LABEL_AR } from '../utils/subscriberNoteTypeLabels';

const RENEWAL_PAGE_SIZE = 10;
const MAINT_PAGE_SIZE = 10;

function getWhatsAppReminderErrorMessage(err: unknown): string {
  const msg = ApiService.showError(err);
  if (/قالب|قالب لرسالة|رسالة واحدة على الأقل/.test(msg)) {
    return msg + '\n\nلإعداد قوالب الرسائل: الإعدادات ← رسالة التفعيل، رسالة تنبيه الاشتراك، رسالة الدين او التفاصيل.';
  }
  return msg;
}

const WA_KIND_LABELS: Record<SubscriberWhatsAppSendKind, string> = {
  activation: 'التفعيل',
  alert: 'التنبيه',
  debtAlert: 'تنبيه الدين',
  details: 'التفاصيل',
  custom: 'مخصص',
};

const WA_KIND_ENTRIES: { key: SubscriberWhatsAppSendKind; pick: (s: Subscriber['whatsAppMessaging']) => SubscriberWhatsAppMessageTypeSummary | null | undefined }[] = [
  { key: 'activation', pick: (m) => m?.activation },
  { key: 'alert', pick: (m) => m?.alert },
  { key: 'debtAlert', pick: (m) => m?.debtAlert },
  { key: 'details', pick: (m) => m?.details },
  { key: 'custom', pick: (m) => m?.custom },
];

function WhatsAppTypeBadge({
  kind,
  summary,
  formatDateFn,
}: {
  kind: SubscriberWhatsAppSendKind;
  summary?: SubscriberWhatsAppMessageTypeSummary | null;
  formatDateFn: (v: string) => string;
}) {
  const label = WA_KIND_LABELS[kind] ?? kind;
  const lastAt =
    summary?.lastAttemptAt && summary.lastAttemptAt.trim()
      ? formatDateFn(summary.lastAttemptAt)
      : null;
  if (!summary || !summary.anyAttempt) {
    return (
      <span className="inline-flex flex-col gap-0.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50/80 dark:bg-gray-800/50 px-2.5 py-1.5 text-xs">
        <span className="font-medium text-gray-800 dark:text-gray-200">{label}</span>
        <span className="text-gray-500 dark:text-gray-400">لا محاولات مسجّلة</span>
      </span>
    );
  }
  if (summary.anySuccess) {
    return (
      <span className="inline-flex flex-col gap-0.5 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50/90 dark:bg-emerald-950/30 px-2.5 py-1.5 text-xs">
        <span className="font-medium text-emerald-900 dark:text-emerald-200">{label}</span>
        <span className="text-emerald-700 dark:text-emerald-300">تم إرسال بنجاح (العدد المرسل مرة)</span>
        {summary.attemptCount != null && (
          <span className="text-emerald-600/90 dark:text-emerald-400/80">السجلات: {summary.attemptCount}</span>
        )}
        {lastAt && <span className="text-emerald-600/80 dark:text-emerald-500/80">آخر ارسال: {lastAt}</span>}
      </span>
    );
  }
  if (summary.lastSuccess === false) {
    return (
      <span
        className="inline-flex flex-col gap-0.5 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50/90 dark:bg-red-950/30 px-2.5 py-1.5 text-xs text-right"
        title={summary.lastError ?? undefined}
      >
        <span className="font-medium text-red-900 dark:text-red-200">{label}</span>
        <span className="text-red-700 dark:text-red-300">فشل آخر إرسال</span>
        {summary.lastError && (
          <span className="text-red-600/90 dark:text-red-400 line-clamp-2 break-words">{summary.lastError}</span>
        )}
        {lastAt && <span className="text-red-600/70 dark:text-red-400/70">آخر ارسال: {lastAt}</span>}
      </span>
    );
  }
  return (
    <span className="inline-flex flex-col gap-0.5 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-950/20 px-2.5 py-1.5 text-xs">
      <span className="font-medium text-amber-900 dark:text-amber-200">{label}</span>
      <span className="text-amber-800 dark:text-amber-300">محاولات بدون نجاح مسجّل</span>
      {lastAt && <span className="text-amber-700/80 dark:text-amber-400/80">آخر ارسال: {lastAt}</span>}
    </span>
  );
}

type TaskNewSubscriberRow = EmployeeTask & {
  NewSubscriberName?: string | null;
  NewSubscriberPhone?: string | null;
  NewSubscriberAddress?: string | null;
};

function taskInstallationNewName(t: EmployeeTask): string {
  const x = t as TaskNewSubscriberRow;
  return String(t.newSubscriberName ?? x.NewSubscriberName ?? '').trim();
}
function taskInstallationNewPhone(t: EmployeeTask): string {
  const x = t as TaskNewSubscriberRow;
  return String(t.newSubscriberPhone ?? x.NewSubscriberPhone ?? '').trim();
}
function taskInstallationNewAddress(t: EmployeeTask): string {
  const x = t as TaskNewSubscriberRow;
  return String(t.newSubscriberAddress ?? x.NewSubscriberAddress ?? '').trim();
}

const SubscriberDetailsPage: React.FC = () => {
  const { subscriberId } = useParams<{ subscriberId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { formatNumber, formatDate } = useDigits();
  const needMyAgentForWhatsApp =
    user?.role === UserRole.Agent ||
    user?.role === UserRole.SubAgent ||
    user?.role === UserRole.Employee ||
    user?.role === UserRole.MainAgent;
  const [renewalPage, setRenewalPage] = useState(1);
  const [maintPage, setMaintPage] = useState(1);
  const [reminderSending, setReminderSending] = useState(false);
  const [selectedTask, setSelectedTask] = useState<EmployeeTask | null>(null);
  const [taskLoadingId, setTaskLoadingId] = useState<string | null>(null);

  useEffect(() => {
    setRenewalPage(1);
    setMaintPage(1);
  }, [subscriberId]);

  const {
    data: subscriber,
    isLoading: subscriberLoading,
    isError: subscriberError,
    error: subscriberErr,
    refetch: refetchSubscriber,
  } = useQuery({
    queryKey: ['subscriber-details', subscriberId],
    queryFn: () => apiService.getSubscriberById(subscriberId!),
    enabled: !!subscriberId,
  });

  const {
    data: renewalsPageData,
    isLoading: renewalsLoading,
    isFetching: renewalsFetching,
  } = useQuery({
    queryKey: ['subscriber-renewals-paged', subscriberId, renewalPage],
    queryFn: () =>
      apiService.getRenewalsBySubscriber(subscriberId!, renewalPage, RENEWAL_PAGE_SIZE),
    enabled: !!subscriberId,
  });

  const { data: myAgent } = useMyAgent(!!needMyAgentForWhatsApp);
  const hasWhatsAppSession = !!(myAgent?.whatsAppSessionId?.trim());

  const sortedMaintenanceRecords = useMemo(() => {
    const list = [...(subscriber?.maintenanceRecords ?? [])];
    list.sort((a, b) => {
      const aTime = new Date(a.completedAt || a.createdAt || 0).getTime();
      const bTime = new Date(b.completedAt || b.createdAt || 0).getTime();
      return bTime - aTime;
    });
    return list;
  }, [subscriber?.maintenanceRecords]);

  const maintTotalItems = sortedMaintenanceRecords.length;
  const maintTotalPages = Math.max(1, Math.ceil(maintTotalItems / MAINT_PAGE_SIZE) || 1);
  const maintSlice = useMemo(() => {
    const start = (maintPage - 1) * MAINT_PAGE_SIZE;
    return sortedMaintenanceRecords.slice(start, start + MAINT_PAGE_SIZE);
  }, [sortedMaintenanceRecords, maintPage]);

  useEffect(() => {
    if (maintPage > maintTotalPages) setMaintPage(1);
  }, [maintPage, maintTotalPages]);

  const getNoteTypeLabel = (noteType?: SubscriberNoteType | null, note?: string | null): string => {
    const hasFreeNote = (note ?? '').toString().trim().length > 0;
    if (!noteType) return hasFreeNote ? SUBSCRIBER_NOTE_TYPE_LABEL_AR[SubscriberNoteType.Other] : '—';
    return SUBSCRIBER_NOTE_TYPE_LABEL_AR[noteType] ?? String(noteType);
  };

  const maintenanceKindLabel = (kind?: SubscriberMaintenanceKind | number | null) => {
    if (kind == null) return '—';
    const k = Number(kind);
    if (k === SubscriberMaintenanceKind.CableCut) return 'قطع كيبل';
    if (k === SubscriberMaintenanceKind.ServiceProblem) return 'مشكلة في الخدمة';
    if (k === SubscriberMaintenanceKind.RouterPasswordChange) return 'تغيير رمز الراوتر';
    if (k === SubscriberMaintenanceKind.Other) return 'أخرى';
    if (k === SubscriberMaintenanceKind.PathSwitch) return 'تبديل مسار';
    if (k === SubscriberMaintenanceKind.RouterReplacement) return 'استبدال راوتر';
    return String(kind);
  };

  const formatDuration = (seconds?: number | null, taskDuration?: string | null) => {
    const td = (taskDuration ?? '').toString().trim();
    if (td) return td;
    if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return '—';
    const s = Math.floor(seconds);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h} س ${m} د ${sec} ث`;
    if (m > 0) return `${m} د ${sec} ث`;
    return `${sec} ث`;
  };

  const getNoteTypeBadge = (noteType?: SubscriberNoteType | null, note?: string | null) => {
    const label = getNoteTypeLabel(noteType, note);
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
  };

  const getPaymentStatusBadge = (status: number) => {
    const statusConfig: { [key: number]: { text: string; icon: typeof AlertCircle; class: string } } = {
      0: {
        text: 'غير معروف',
        icon: AlertCircle,
        class: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400',
      },
      1: {
        text: 'مدفوع',
        icon: CheckCircle,
        class: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      },
      2: {
        text: 'غير مدفوع',
        icon: XCircle,
        class: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
      },
      3: {
        text: 'معلق',
        icon: AlertCircle,
        class: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
      },
    };

    const config = statusConfig[status] || statusConfig[0];
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${config.class}`}>
        <Icon className="h-3 w-3 shrink-0" />
        {config.text}
      </span>
    );
  };

  const subscriptionStatusLabel = (s: Subscriber) => {
    const cfg: Record<SubscriptionStatus, string> = {
      [SubscriptionStatus.Active]: 'فعال',
      [SubscriptionStatus.ExpiringSoon]: 'سينتهي قريباً',
      [SubscriptionStatus.Expired]: 'منتهي',
      [SubscriptionStatus.ExpiredToday]: 'سينتهي اليوم',
    };
    const backendStatus = s.status as SubscriptionStatus | undefined;
    if (backendStatus && cfg[backendStatus]) return cfg[backendStatus];
    if (s.isSubscriptionActive === true) return cfg[SubscriptionStatus.Active];
    if (s.isSubscriptionActive === false) return cfg[SubscriptionStatus.Expired];
    return cfg[SubscriptionStatus.Active];
  };

  const subscriptionTypeLabel = (t: SubscriptionType) =>
    t === SubscriptionType.Free ? 'مجاني' : t === SubscriptionType.Paid ? 'مدفوع' : String(t);

  const subscriberPaymentLabel = (ps: PaymentStatus) => {
    if (ps === PaymentStatus.Paid) return 'مدفوع';
    if (ps === PaymentStatus.Unpaid) return 'غير مدفوع';
    if (ps === PaymentStatus.Pending) return 'معلق';
    if (ps === PaymentStatus.Unknown) return 'غير معروف';
    return 'غير معروف';
  };

  const renewalData = renewalsPageData?.data ?? [];
  const renewalTotalItems = renewalsPageData?.totalItems ?? 0;
  const renewalTotalPages = Math.max(1, renewalsPageData?.totalPages ?? 1);
  const openTaskDetails = async (taskId: string) => {
    if (!subscriberId || !taskId) return;
    setTaskLoadingId(taskId);
    try {
      // المسار الجديد يدعم searchTerm؛ نستخدمه أولاً للعثور السريع على المهمة.
      const bySearch = await apiService.getSubscriberEmployeeTasks(subscriberId, {
        page: 1,
        pageSize: 10,
        searchTerm: taskId,
      });
      let found = (bySearch.data || []).find((t) => t.id === taskId);

      // fallback في حال searchTerm لا يبحث بالـ id في بعض البيئات.
      if (!found) {
        const fallback = await apiService.getSubscriberEmployeeTasks(subscriberId, {
          page: 1,
          pageSize: 100,
        });
        found = (fallback.data || []).find((t) => t.id === taskId);
      }

      if (!found) {
        showError('تفاصيل المهمة', 'تعذر العثور على تفاصيل المهمة المطلوبة.');
        return;
      }
      setSelectedTask(found);
    } catch (err) {
      showError('تفاصيل المهمة', ApiService.showError(err));
    } finally {
      setTaskLoadingId(null);
    }
  };

  const taskTypeLabel = (taskType?: EmployeeTaskType | number | null) => {
    if (taskType == null) return '—';
    const t = Number(taskType);
    if (t === EmployeeTaskType.SubscriberInstallation) return 'تنصيب مشترك';
    if (t === EmployeeTaskType.SubscriberMaintenance) return 'صيانة مشترك';
    if (t === EmployeeTaskType.AmountReception) return 'استلام مبلغ';
    if (t === EmployeeTaskType.Other) return 'أخرى';
    return String(taskType);
  };

  const taskStatusLabel = (status?: EmployeeTaskStatus | number | null) => {
    if (status == null) return '—';
    const s = Number(status);
    if (s === EmployeeTaskStatus.Pending) return 'قيد القبول';
    if (s === EmployeeTaskStatus.Accepted) return 'مقبولة';
    if (s === EmployeeTaskStatus.Completed) return 'مكتملة';
    if (s === EmployeeTaskStatus.Rejected) return 'مرفوضة';
    return String(status);
  };

  if (!subscriberId) {
    return (
      <div className="max-w-3xl mx-auto text-center py-16">
        <p className="text-gray-600 dark:text-gray-400">معرّف المشترك غير صالح.</p>
        <button
          type="button"
          onClick={() => navigate('/admin/subscribers')}
          className="mt-4 text-primary-600 dark:text-primary-400 font-medium"
        >
          العودة إلى المشتركين
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* Top bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <button
          type="button"
          onClick={() => navigate('/admin/subscribers')}
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
        >
          <ArrowRight className="h-4 w-4 rotate-180" />
          العودة إلى قائمة المشتركين
        </button>
        {hasWhatsAppSession && subscriber && (
          <button
            type="button"
            onClick={async () => {
              setReminderSending(true);
              try {
                await apiService.sendWhatsAppAlert(subscriber.id);
                showSuccess('رسالة تنبيه واتساب', 'تم إرسال رسالة التنبيه بنجاح.');
                await refetchSubscriber();
              } catch (err) {
                showError('رسالة تنبيه واتساب', getWhatsAppReminderErrorMessage(err));
              } finally {
                setReminderSending(false);
              }
            }}
            disabled={reminderSending || !subscriber.phoneNumber?.trim()}
            className="inline-flex items-center gap-2 rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 px-4 py-2 text-sm font-medium text-green-800 dark:text-green-200 hover:bg-green-100 dark:hover:bg-green-900/40 disabled:opacity-50 transition-colors"
          >
            <MessageCircle className="h-4 w-4" />
            {reminderSending ? 'جاري الإرسال...' : 'رسالة تنبيه واتساب'}
          </button>
        )}
      </div>

      {subscriberLoading && (
        <div className="flex flex-col items-center justify-center py-24 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-900/30">
          <RefreshCw className="h-10 w-10 animate-spin text-primary-500 mb-3" />
          <p className="text-sm text-gray-600 dark:text-gray-400">جاري تحميل بيانات المشترك...</p>
        </div>
      )}

      {subscriberError && (
        <div className="rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50/80 dark:bg-red-950/30 p-8 text-center">
          <p className="text-red-800 dark:text-red-200 font-medium">
            {ApiService.showError(subscriberErr)}
          </p>
          <div className="mt-4 flex justify-center gap-3">
            <button
              type="button"
              onClick={() => refetchSubscriber()}
              className="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm hover:bg-primary-700"
            >
              إعادة المحاولة
            </button>
            <button
              type="button"
              onClick={() => navigate('/admin/subscribers')}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm"
            >
              رجوع
            </button>
          </div>
        </div>
      )}

      {subscriber && !subscriberLoading && (
        <>
          {/* Hero */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-primary-900 text-white shadow-xl">
            <div className="absolute inset-0 opacity-30 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary-400/40 via-transparent to-transparent" />
            <div className="relative px-6 py-8 sm:px-10 sm:py-10">
              <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 text-primary-200/90 text-xs font-medium uppercase tracking-wider">
                    <User className="h-3.5 w-3.5" />
                    ملف المشترك
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{subscriber.fullName}</h1>
                  <p className="text-slate-300 text-sm flex flex-wrap gap-x-4 gap-y-1">
                    <span>{subscriber.phoneNumber || '—'}</span>
                    <span className="text-slate-500">|</span>
                    <span>@{subscriber.username}</span>
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                      subscriber.isSubscriptionActive
                        ? 'bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-400/40'
                        : 'bg-amber-500/15 text-amber-100 ring-1 ring-amber-400/30'
                    }`}
                  >
                    {subscriptionStatusLabel(subscriber)}
                  </span>
                  {subscriber.agentCompanyName && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-xs ring-1 ring-white/10">
                      <Building2 className="h-3.5 w-3.5 opacity-80" />
                      {subscriber.agentCompanyName}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 1 — معلومات المشترك */}
          <section className="scroll-mt-24">
            <div className="flex items-center gap-3 mb-4">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 text-sm font-bold">
                1
              </span>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">معلومات المشترك</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">البيانات الأساسية والاشتراك والموقع</p>
              </div>
            </div>
            <div className="rounded-2xl border border-gray-200/80 dark:border-gray-700/80 bg-white dark:bg-gray-900/40 shadow-sm overflow-hidden">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-gray-100 dark:bg-gray-800">
                <InfoCell label="الاسم الكامل" value={subscriber.fullName} />
                <InfoCell label="اسم المستخدم" value={subscriber.username} />
                <InfoCell label="رقم الهاتف" value={subscriber.phoneNumber || '—'} />
                <InfoCell label="الباقة" value={`${subscriber.profileName} — ${formatNumber(subscriber.profilePrice || 0, { suffix: ' د.ع' })}`} />
                <InfoCell label="نوع الاشتراك" value={subscriptionTypeLabel(subscriber.subscriptionType)} />
                <InfoCell label="حالة الاشتراك" value={subscriptionStatusLabel(subscriber)} />
                <InfoCell label="حالة الدفع (المشترك)" value={subscriberPaymentLabel(subscriber.paymentStatus)} />
                <InfoCell
                  label="إجمالي الديون"
                  value={formatNumber(subscriber.totalDebt || 0, { suffix: ' د.ع' })}
                  valueClass={(subscriber.totalDebt || 0) > 0 ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-emerald-600 dark:text-emerald-400'}
                />
                <InfoCell label="طريقة الدفع" value={subscriber.paymentMethod?.trim() || '—'} />
                <InfoCell label="تاريخ التفعيل" value={formatDate(subscriber.activationDate)} />
                <InfoCell
                  label="تاريخ الانتهاء"
                  value={
                    subscriber.expirationDate
                      ? formatDate(subscriber.expirationDate)
                      : 'غير محدد'
                  }
                  hint={
                    subscriber.daysUntilExpiryText?.trim()
                      ? subscriber.daysUntilExpiryText
                      : subscriber.daysUntilExpiry > 0
                        ? `${subscriber.daysUntilExpiry} يوم متبقي`
                        : undefined
                  }
                />
                <InfoCell label="معرف الاشتراك" value={subscriber.secruptionId?.trim() || '—'} icon={<Hash className="h-3.5 w-3.5" />} />
                <InfoCell label="FTTH subscription" value={subscriber.ftthSubscriptionId?.trim() || '—'} />
                <InfoCell label="الكابينة (FAT)" value={subscriber.fat?.trim() || '—'} icon={<MapPin className="h-3.5 w-3.5" />} />
                <InfoCell label="المنطقة" value={subscriber.zone?.trim() || '—'} />
                <InfoCell label="نوع الملاحظة" value="" custom={getNoteTypeBadge(subscriber.noteType, subscriber.note ?? null)} />
                {((subscriber.noteType === SubscriberNoteType.Other) ||
                  (!subscriber.noteType && (subscriber.note || '').toString().trim())) &&
                  (subscriber.note || '').toString().trim() && (
                    <div className="sm:col-span-2 lg:col-span-3 p-4 bg-gray-50/80 dark:bg-gray-800/40">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">نص الملاحظة</p>
                      <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">{(subscriber.note || '').toString().trim()}</p>
                    </div>
                  )}
              </div>
            </div>
          </section>

          {/* سجل إرسال واتساب — من GET /Subscribers/{id} → whatsAppMessaging */}
          <section className="scroll-mt-24">
            <div className="flex items-center gap-3 mb-4">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200">
                <MessageCircle className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">إرسالات واتساب</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  ملخص لكل نوع رسالة وسجل آخر المحاولات
                </p>
              </div>
            </div>
            <div className="rounded-2xl border border-gray-200/80 dark:border-gray-700/80 bg-white dark:bg-gray-900/40 shadow-sm overflow-hidden p-4 sm:p-5 space-y-4">
              {!subscriber.whatsAppMessaging ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  لا يتوفر ملخص واتساب في هذه الاستجابة. افتح تفاصيل المشترك من الخادم المحدث لعرض الحقل{' '}
                  <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">whatsAppMessaging</code>.
                </p>
              ) : (
                <>
                  <div className="flex flex-wrap gap-2">
                    {WA_KIND_ENTRIES.map(({ key, pick }) => (
                      <WhatsAppTypeBadge
                        key={key}
                        kind={key}
                        summary={pick(subscriber.whatsAppMessaging)}
                        formatDateFn={formatDate}
                      />
                    ))}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">سجل المحاولات (آخر 20)</h3>
                    {!(subscriber.whatsAppMessaging.recentSends && subscriber.whatsAppMessaging.recentSends.length > 0) ? (
                      <p className="text-xs text-gray-500 dark:text-gray-400">لا توجد محاولات في السجل بعد.</p>
                    ) : (
                      <div className="wakeel-table-scroll max-h-80">
                        <table className="w-full border-collapse text-right text-xs sm:text-sm">
                          <thead>
                            <tr className="bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                              <th className="p-2 font-semibold whitespace-nowrap">النوع</th>
                              <th className="p-2 font-semibold whitespace-nowrap">النتيجة</th>
                              <th className="p-2 font-semibold whitespace-nowrap">الوقت</th>
                              <th className="p-2 font-semibold whitespace-nowrap">تلقائي</th>
                              <th className="p-2 font-semibold min-w-[8rem]">معرّف الرسالة / الخطأ</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(subscriber.whatsAppMessaging.recentSends as SubscriberWhatsAppSendLogItem[]).map((row, idx) => {
                              const k = String(row.kind) as SubscriberWhatsAppSendKind;
                              const kindAr = WA_KIND_LABELS[k] ?? row.kind;
                              return (
                                <tr
                                  key={`${row.sentAt}-${idx}`}
                                  className="border-b border-gray-100 dark:border-gray-800/80 hover:bg-gray-50/80 dark:hover:bg-gray-800/30"
                                >
                                  <td className="p-2 whitespace-nowrap">{kindAr}</td>
                                  <td className="p-2">
                                    {row.success ? (
                                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">نجاح</span>
                                    ) : (
                                      <span className="text-red-600 dark:text-red-400 font-medium">فشل</span>
                                    )}
                                  </td>
                                  <td className="p-2 whitespace-nowrap tabular-nums">{formatDate(row.sentAt)}</td>
                                  <td className="p-2 whitespace-nowrap">{row.automatic ? 'نعم' : '—'}</td>
                                  <td className="p-2 break-all text-gray-700 dark:text-gray-300">
                                    {row.externalMessageId && (
                                      <span className="block font-mono text-[11px] opacity-90">{row.externalMessageId}</span>
                                    )}
                                    {!row.success && row.errorMessage && (
                                      <span className="block text-red-600 dark:text-red-400 mt-0.5">{row.errorMessage}</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </section>

          {/* 2 — سجل التفعيلات */}
          <section className="scroll-mt-24">
            <div className="flex items-center gap-3 mb-4">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 text-sm font-bold">
                2
              </span>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">سجل التفعيلات</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">تجديدات الاشتراك والمدفوعات</p>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200/80 dark:border-gray-700/80 bg-white dark:bg-gray-900/40 shadow-sm overflow-hidden">
              {renewalsLoading && renewalPage === 1 ? (
                <div className="flex flex-col items-center py-16">
                  <RefreshCw className="h-8 w-8 animate-spin text-amber-500 mb-2" />
                  <p className="text-sm text-gray-500">جاري تحميل سجل التفعيلات...</p>
                </div>
              ) : renewalData.length === 0 && !renewalsFetching ? (
                <div className="text-center py-16 px-4">
                  <Clock className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600 mb-3" />
                  <p className="text-gray-700 dark:text-gray-300 font-medium">لا يوجد سجل تفعيلات</p>
                  <p className="text-sm text-gray-500 mt-1">لم يُسجَّل أي تجديد لهذا المشترك بعد.</p>
                </div>
              ) : (
                <>
                  <div className="wakeel-table-scroll overflow-x-auto">
                    <table className="min-w-[960px] w-full text-right text-sm">
                      <thead>
                        <tr className="bg-gray-50/90 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700">
                          <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">رقم الفاتورة</th>
                          <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">تاريخ التفعيل</th>
                          <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">الباقة</th>
                          <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">الفترة</th>
                          <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">السعر الأصلي</th>
                          <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">سعر البيع</th>
                          <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">المدفوع</th>
                          <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">المتبقي</th>
                          <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">الدفع</th>
                          <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">الانتهاء</th>
                          <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">الوكيل</th>
                        </tr>
                      </thead>
                      <tbody>
                        {renewalData.map((renewal: RenewalHistory) => (
                          <tr
                            key={renewal.id}
                            className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50/80 dark:hover:bg-gray-800/50 transition-colors"
                          >
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="inline-flex items-center gap-1.5 font-medium text-gray-900 dark:text-white">
                                <CreditCard className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                                {renewal.receiptNumber}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-gray-800 dark:text-gray-200">
                              <div className="flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                                {formatDate(renewal.renewalDate)}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-gray-800 dark:text-gray-200">{renewal.newProfileName}</td>
                            <td className="px-4 py-3 whitespace-nowrap tabular-nums">{renewal.renewalDays} يوم</td>
                            <td className="px-4 py-3 whitespace-nowrap tabular-nums">{formatNumber(renewal.newProfileOriginalPrice, { suffix: ' د.ع' })}</td>
                            <td className="px-4 py-3 whitespace-nowrap tabular-nums">{formatNumber(renewal.newProfileSalePrice, { suffix: ' د.ع' })}</td>
                            <td className="px-4 py-3 whitespace-nowrap tabular-nums">{formatNumber(renewal.amountPaid, { suffix: ' د.ع' })}</td>
                            <td className="px-4 py-3 whitespace-nowrap tabular-nums">
                              <span className={renewal.remainingAmount > 0 ? 'text-red-600 dark:text-red-400 font-medium' : 'text-emerald-600 dark:text-emerald-400'}>
                                {formatNumber(renewal.remainingAmount, { suffix: ' د.ع' })}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">{getPaymentStatusBadge(renewal.paymentStatus)}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-gray-700 dark:text-gray-300">{formatDate(renewal.newExpirationDate)}</td>
                            <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs max-w-[140px] truncate" title={renewal.agentCompanyName}>
                              {renewal.agentCompanyName || '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {renewalTotalItems > 0 && (
                    <Pagination
                      currentPage={renewalPage}
                      totalPages={renewalTotalPages}
                      totalItems={renewalTotalItems}
                      pageSize={RENEWAL_PAGE_SIZE}
                      hasNextPage={renewalPage < renewalTotalPages}
                      hasPreviousPage={renewalPage > 1}
                      onPageChange={setRenewalPage}
                      className="rounded-b-2xl"
                    />
                  )}
                </>
              )}
            </div>
          </section>

          {/* 3 — سجل الصيانات */}
          <section className="scroll-mt-24">
            <div className="flex items-center gap-3 mb-4">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-900/40 text-violet-800 dark:text-violet-200 text-sm font-bold">
                3
              </span>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">سجل الصيانات</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">مهام الصيانة المكتملة المرتبطة بالمشترك</p>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200/80 dark:border-gray-700/80 bg-white dark:bg-gray-900/40 shadow-sm overflow-hidden">
              {maintTotalItems === 0 ? (
                <div className="text-center py-16 px-4">
                  <Wrench className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600 mb-3" />
                  <p className="text-gray-700 dark:text-gray-300 font-medium">لا توجد سجلات صيانة</p>
                  <p className="text-sm text-gray-500 mt-1">لم تُسجَّل صيانات مكتملة لهذا المشترك بعد.</p>
                </div>
              ) : (
                <>
                  <div className="wakeel-table-scroll overflow-x-auto">
                    <table className="min-w-[900px] w-full text-right text-sm">
                      <thead>
                        <tr className="bg-violet-50/80 dark:bg-violet-950/20 border-b border-gray-200 dark:border-gray-700">
                          <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">نوع الصيانة</th>
                          <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">الموظف</th>
                          <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">ملاحظة الإكمال</th>
                          <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">الإنشاء</th>
                          <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">القبول</th>
                          <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">الإكمال</th>
                          <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">المدة</th>
                          <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">المهمة</th>
                        </tr>
                      </thead>
                      <tbody>
                        {maintSlice.map((rec) => (
                          <tr key={rec.taskId} className="border-b border-gray-100 dark:border-gray-800 hover:bg-violet-50/40 dark:hover:bg-violet-950/10">
                            <td className="px-4 py-3 whitespace-nowrap">{maintenanceKindLabel(rec.maintenanceType)}</td>
                            <td className="px-4 py-3">{rec.employeeName || '—'}</td>
                            <td className="px-4 py-3 max-w-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">
                              {(rec.completedNote ?? '').toString().trim() || '—'}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-gray-600 dark:text-gray-400">{rec.createdAt ? formatDate(rec.createdAt) : '—'}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-gray-600 dark:text-gray-400">{rec.acceptedAt ? formatDate(rec.acceptedAt) : '—'}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-gray-600 dark:text-gray-400">{rec.completedAt ? formatDate(rec.completedAt) : '—'}</td>
                            <td className="px-4 py-3 whitespace-nowrap tabular-nums">{formatDuration(rec.durationSeconds, rec.taskDuration)}</td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => openTaskDetails(rec.taskId)}
                                disabled={taskLoadingId === rec.taskId}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 dark:border-violet-700 px-3 py-1.5 text-xs font-medium text-violet-700 dark:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                {taskLoadingId === rec.taskId ? 'جاري التحميل...' : 'عرض المهمة'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {maintTotalItems > MAINT_PAGE_SIZE && (
                    <Pagination
                      currentPage={maintPage}
                      totalPages={maintTotalPages}
                      totalItems={maintTotalItems}
                      pageSize={MAINT_PAGE_SIZE}
                      hasNextPage={maintPage < maintTotalPages}
                      hasPreviousPage={maintPage > 1}
                      onPageChange={setMaintPage}
                      className="rounded-b-2xl"
                    />
                  )}
                </>
              )}
            </div>
          </section>

          {selectedTask && (
            <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[1px] flex items-center justify-center p-4">
              <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">تفاصيل المهمة</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedTask(null)}
                    className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <X className="h-4 w-4 text-gray-500" />
                  </button>
                </div>

                <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <TaskInfoItem label="عنوان المهمة" value={selectedTask.taskTitle || '—'} />
                  <TaskInfoItem label="نوع المهمة" value={taskTypeLabel(selectedTask.taskType)} />
                  <TaskInfoItem label="حالة المهمة" value={taskStatusLabel(selectedTask.status)} />
                  <TaskInfoItem label="الموظف" value={selectedTask.employeeName || '—'} />
                  <TaskInfoItem label="نوع الصيانة" value={maintenanceKindLabel(selectedTask.maintenanceType)} />
                  <TaskInfoItem label="المبلغ المستلم" value={selectedTask.amountReceived != null ? formatNumber(selectedTask.amountReceived, { suffix: ' د.ع' }) : '—'} />
                  <TaskInfoItem label="المادة" value={selectedTask.materialName || '—'} />
                  <TaskInfoItem label="سعر المادة" value={selectedTask.materialPrice != null ? formatNumber(selectedTask.materialPrice, { suffix: ' د.ع' }) : '—'} />
                  <TaskInfoItem label="تاريخ الإنشاء" value={selectedTask.createdAt ? formatDate(selectedTask.createdAt) : '—'} />
                  <TaskInfoItem label="تاريخ القبول" value={selectedTask.acceptedAt ? formatDate(selectedTask.acceptedAt) : '—'} />
                  <TaskInfoItem label="تاريخ الإكمال" value={selectedTask.completedAt ? formatDate(selectedTask.completedAt) : '—'} />
                  <TaskInfoItem label="مدة التنفيذ" value={formatDuration(selectedTask.durationSeconds, selectedTask.taskDuration)} />
                </div>

                <div className="px-5 pb-5 space-y-3">
                  {Number(selectedTask.taskType) === EmployeeTaskType.SubscriberInstallation && (
                    <div className="rounded-xl border border-primary-200 dark:border-primary-900/40 bg-primary-50/50 dark:bg-primary-950/20 p-4 space-y-2">
                      <p className="text-xs font-semibold text-primary-800 dark:text-primary-200">المشترك الجديد (من المهمة)</p>
                      <TaskInfoBlock label="الاسم" value={taskInstallationNewName(selectedTask) || '—'} />
                      <TaskInfoBlock label="الهاتف" value={taskInstallationNewPhone(selectedTask) || '—'} />
                      <TaskInfoBlock label="العنوان" value={taskInstallationNewAddress(selectedTask) || '—'} />
                    </div>
                  )}
                  <TaskInfoBlock label="تفاصيل المهمة" value={selectedTask.taskDetails || '—'} />
                  <TaskInfoBlock label="الملاحظة" value={selectedTask.note || '—'} />
                  <TaskInfoBlock label="ملاحظة الإكمال" value={selectedTask.completedNote || '—'} />
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

function InfoCell({
  label,
  value,
  hint,
  valueClass,
  custom,
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  valueClass?: string;
  custom?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="p-4 bg-white dark:bg-gray-900/60">
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
        {icon}
        {label}
      </p>
      {custom != null ? (
        <div className="mt-0.5">{custom}</div>
      ) : (
        <>
          <p className={`text-sm text-gray-900 dark:text-white ${valueClass ?? ''}`}>{value}</p>
          {hint && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{hint}</p>}
        </>
      )}
    </div>
  );
}

function TaskInfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-gray-50 dark:bg-gray-800/60 p-3">
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
      <p className="text-sm text-gray-900 dark:text-gray-100">{value}</p>
    </div>
  );
}

function TaskInfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-3">
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
      <p className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words">{value}</p>
    </div>
  );
}

export default SubscriberDetailsPage;
