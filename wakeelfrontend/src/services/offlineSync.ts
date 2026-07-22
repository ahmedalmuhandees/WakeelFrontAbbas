import { apiService } from './api';
import { wakeelDb, type PendingOperation } from '../db/wakeelDb';
import type {
  SyncOperationDto,
  SyncUploadResponseDto,
  SyncChangesResponseDto,
  Subscriber,
  Debt,
  Profile,
  ProfileListParams,
  RenewalData,
  RenewalReceipt,
  PaginationParams,
  PaginatedResponse,
  DebtsListParams,
  DebtsListResponse,
  SubscribersDashboardStats,
} from '../types';
import { SubscriptionStatus } from '../types';

const DASHBOARD_STATS_CACHE_KEY = 'wakeel_dashboard_stats';

/** إضافة عملية إلى طابور المعلقات (عند العمل دون اتصال) */
export async function queueOperation(
  type: 'CreateRenewal' | 'PayDebt',
  payload: Record<string, unknown>,
  clientId?: string
): Promise<string> {
  const id = clientId || `op-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  await wakeelDb.pendingOperations.add({
    clientId: id,
    type,
    payload: JSON.stringify(payload),
    createdAt: Date.now(),
    status: 'pending',
  });
  return id;
}

/** جلب العمليات المعلقة (status = pending) */
export async function getPendingOperations(): Promise<PendingOperation[]> {
  return wakeelDb.pendingOperations.where('status').equals('pending').sortBy('createdAt');
}

/** تحديث حالة عملية بعد الرفع */
export async function updateOperationStatus(
  id: number,
  status: 'sent' | 'failed',
  errorMessage?: string
): Promise<void> {
  await wakeelDb.pendingOperations.update(id, { status, errorMessage });
}

/** حذف عمليات تم رفعها بنجاح */
export async function deleteSentOperations(): Promise<void> {
  await wakeelDb.pendingOperations.where('status').equals('sent').delete();
}

let uploadLock: Promise<unknown> | null = null;

/** رفع طابور العمليات إلى السيرفر (POST /sync/upload). يُستدعى مرة واحدة فقط في نفس الوقت؛ العمليات تُستَلَم فوراً بعد القراءة حتى لا يرفعها استدعاء مزامن ثانٍ (تفادي تفعيل مزدوج عند العودة أونلاين). */
export async function uploadPendingOperations(): Promise<SyncUploadResponseDto> {
  const run = async (): Promise<SyncUploadResponseDto> => {
    const pending = await getPendingOperations();
    if (pending.length === 0) {
      return { results: [] };
    }
    const ids = pending.map((op) => op.id).filter((id): id is number => id != null);
    await wakeelDb.transaction('rw', wakeelDb.pendingOperations, async () => {
      for (const id of ids) {
        await wakeelDb.pendingOperations.delete(id);
      }
    });

    const operations: SyncOperationDto[] = pending.map((op) => ({
      clientId: op.clientId,
      type: op.type,
      payload: JSON.parse(op.payload) as Record<string, unknown>,
    }));

    try {
      const result = await apiService.syncUpload({ operations });
      return result;
    } catch (err) {
      for (const op of pending) {
        await wakeelDb.pendingOperations.add({
          clientId: op.clientId,
          type: op.type,
          payload: op.payload,
          createdAt: op.createdAt,
          status: 'pending',
        });
      }
      throw err;
    }
  };

  while (uploadLock) {
    await uploadLock;
  }
  const lockPromise = run();
  uploadLock = lockPromise.finally(() => {
    uploadLock = null;
  });
  return lockPromise;
}

/**
 * سحب التغييرات من السيرفر معطّل — لا يُستدعى GET /sync/changes (تجنّباً لـ 401 وعدم دعم المسار في البيئة الحالية).
 * التحديث الأوفلاين يعتمد على جلب القوائم الكاملة مع التخزين المؤقت (مثل fetchSubscribersWithCache).
 */
export async function fetchAndApplyChanges(_agentId?: string): Promise<SyncChangesResponseDto> {
  return { debts: [], renewals: [] };
}

/** تشغيل المزامنة: رفع الطابور (POST /sync/upload)؛ سحب التغييرات من الخادم معطّل */
export async function runFullSync(agentId?: string): Promise<{
  uploadResult: SyncUploadResponseDto;
  changesResult: SyncChangesResponseDto;
}> {
  const uploadResult = await uploadPendingOperations();
  const changesResult = await fetchAndApplyChanges(agentId);
  return { uploadResult, changesResult };
}

/** عدد العمليات المعلقة */
export async function getPendingCount(): Promise<number> {
  return wakeelDb.pendingOperations.where('status').equals('pending').count();
}

// --- تخزين مؤقت للقراءة دون اتصال ---

export async function cacheSubscribers(subscribers: Subscriber[]): Promise<void> {
  const now = Date.now();
  await wakeelDb.transaction('rw', wakeelDb.subscribers, async () => {
    for (const s of subscribers) {
      await wakeelDb.subscribers.put({
        id: s.id,
        data: JSON.stringify(s),
        updatedAt: now,
      });
    }
  });
}

export async function cacheDebts(debts: Debt[]): Promise<void> {
  const now = Date.now();
  await wakeelDb.transaction('rw', wakeelDb.debts, async () => {
    for (const d of debts) {
      await wakeelDb.debts.put({
        id: d.id,
        data: JSON.stringify(d),
        updatedAt: now,
      });
    }
  });
}

export async function getCachedSubscribers(): Promise<Subscriber[]> {
  const rows = await wakeelDb.subscribers.toArray();
  return rows.map((r) => JSON.parse(r.data) as Subscriber);
}

export async function getCachedDebts(): Promise<Debt[]> {
  const rows = await wakeelDb.debts.toArray();
  return rows.map((r) => JSON.parse(r.data) as Debt);
}

export async function cacheReceipts(receipts: RenewalReceipt[]): Promise<void> {
  const now = Date.now();
  await wakeelDb.transaction('rw', wakeelDb.receipts, async () => {
    for (const r of receipts) {
      await wakeelDb.receipts.put({
        id: r.id,
        data: JSON.stringify(r),
        updatedAt: now,
      });
    }
  });
}

export async function getCachedReceipts(): Promise<RenewalReceipt[]> {
  const rows = await wakeelDb.receipts.toArray();
  return rows.map((r) => JSON.parse(r.data) as RenewalReceipt);
}

/** حفظ آخر إحصائيات لوحة التحكم من الـ API (لاستخدامها عند عدم الاتصال) */
export function setDashboardStatsCache(stats: SubscribersDashboardStats): void {
  try {
    localStorage.setItem(DASHBOARD_STATS_CACHE_KEY, JSON.stringify(stats));
  } catch {
    // ignore quota / private mode
  }
}

/** قراءة آخر إحصائيات لوحة التحكم المحفوظة */
export function getDashboardStatsCache(): SubscribersDashboardStats | null {
  try {
    const raw = localStorage.getItem(DASHBOARD_STATS_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SubscribersDashboardStats;
  } catch {
    return null;
  }
}

/** بناء إحصائيات لوحة التحكم من الكاش (عند عدم الاتصال أو فشل الطلب). نفضّل إحصائيات آخر طلب ناجح من الـ API (عدد المشتركين الصحيح) ثم نرجع لحسابها من المشتركين المخزنين إن لم توجد. */
export async function getDashboardStatsFromCache(): Promise<SubscribersDashboardStats> {
  const saved = getDashboardStatsCache();
  if (saved != null) {
    return { ...saved, online: 0, offline: 0 };
  }
  const [subscribers, debts] = await Promise.all([
    getCachedSubscribers(),
    getCachedDebts(),
  ]);
  const total = subscribers.length;
  const active = subscribers.filter((s) => s.status === SubscriptionStatus.Active || (s.daysUntilExpiry != null && s.daysUntilExpiry > 0)).length;
  const expiringWithin3Days = subscribers.filter((s) => (s.daysUntilExpiry != null && s.daysUntilExpiry > 0 && s.daysUntilExpiry <= 3) || s.status === SubscriptionStatus.ExpiringSoon).length;
  const expired = subscribers.filter((s) => (s.daysUntilExpiry != null && s.daysUntilExpiry <= 0) || s.status === SubscriptionStatus.Expired || s.status === SubscriptionStatus.ExpiredToday).length;
  const totalDebtAmount = debts.reduce((sum, d) => sum + (d.amount ?? 0), 0);
  return {
    total,
    active,
    online: 0,
    expiringWithin3Days,
    offline: 0,
    expired,
    incomingAmount: 0,
    totalActivationProfit: 0,
    totalProfitAmount: 0,
    totalDebtAmount,
  };
}

export async function cacheProfiles(profiles: Profile[]): Promise<void> {
  const now = Date.now();
  await wakeelDb.transaction('rw', wakeelDb.profiles, async () => {
    for (const p of profiles) {
      await wakeelDb.profiles.put({
        id: p.id,
        data: JSON.stringify(p),
        updatedAt: now,
      });
    }
  });
}

export async function getCachedProfiles(): Promise<Profile[]> {
  const rows = await wakeelDb.profiles.toArray();
  return rows.map((r) => JSON.parse(r.data) as Profile);
}

/** جلب الباقات: من الـ API عند الاتصال (مع التخزين المؤقت)، أو من IndexedDB عند الانقطاع. عند فشل الطلب نعود للكاش إن وُجد. */
export async function fetchProfilesWithCache(
  online: boolean,
  params?: ProfileListParams
): Promise<PaginatedResponse<Profile>> {
  const fallback = async (): Promise<PaginatedResponse<Profile>> => {
    const cached = await getCachedProfiles();
    const total = cached.length;
    return {
      data: cached,
      totalItems: total,
      totalCount: total,
      currentPage: 1,
      pageSize: total || 10,
      totalPages: total ? 1 : 0,
      pageNumber: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    };
  };
  if (online) {
    try {
      const res = await apiService.getProfiles(params);
      if (res?.data?.length) await cacheProfiles(res.data);
      return res as PaginatedResponse<Profile>;
    } catch {
      return fallback();
    }
  }
  return fallback();
}

/** جلب إحصائيات لوحة التحكم: من الـ API أو من الكاش عند الفشل/عدم الاتصال. عند نجاح الطلب نُخزّن الإحصائيات لاستخدامها أوفلاين (حتى يبقى عدد المشتركين صحيحاً). */
export async function fetchDashboardWithCache(
  online: boolean,
  params?: { agentId?: string; fromDate?: string; toDate?: string; resellerId?: string }
): Promise<SubscribersDashboardStats> {
  if (online) {
    try {
      const stats = await apiService.getSubscribersDashboard(params);
      setDashboardStatsCache(stats);
      return stats;
    } catch {
      return getDashboardStatsFromCache();
    }
  }
  return getDashboardStatsFromCache();
}

/** بناء payload عملية CreateRenewal لمطابقة الباكند (نفس شكل POST /renewals) */
export function buildCreateRenewalPayload(renewalData: RenewalData): Record<string, unknown> {
  const mode = renewalData.activationMode ?? 0;
  const debtRaw = (renewalData.debtDueDate ?? '').toString().trim();
  const debtDueDateNorm = debtRaw
    ? debtRaw.length > 10
      ? debtRaw.split('T')[0]
      : debtRaw
    : null;
  const renewalRaw = (renewalData.renewalDate ?? '').toString().trim();
  const renewalDateNorm = renewalRaw
    ? renewalRaw.length > 10
      ? renewalRaw.split('T')[0]
      : renewalRaw
    : null;
  const payload: Record<string, unknown> = {
    subscriberId: renewalData.subscriberId,
    newProfileId: renewalData.newProfileId,
    paymentStatus: renewalData.paymentStatus,
    overrideSalePrice: renewalData.overrideSalePrice ?? null,
    amountPaid: renewalData.amountPaid ?? null,
    debtDueDate: debtDueDateNorm,
    notes: renewalData.notes || '',
    wiFiCode: renewalData.wifiCode || '',
    wiFiQRCode: renewalData.wiFiQRCode ?? null,
    remainingAmount: renewalData.remainingAmount ?? 0,
    debtDescription: renewalData.debtDescription || '',
    currentExpirationDate: renewalData.currentExpirationDate ?? null,
    renewalPeriod: renewalData.renewalPeriod ?? null,
    activationMode: mode,
  };
  const snt = renewalData.subscriberNoteType;
  if (snt != null && Number.isFinite(Number(snt))) {
    payload.subscriberNoteType = Number(snt);
  }
  if (mode === 1 && renewalData.dealerId?.trim()) {
    payload.dealerId = renewalData.dealerId.trim();
  }
  if (renewalDateNorm) {
    payload.renewalDate = renewalDateNorm;
  }
  return payload;
}

/** بناء payload عملية PayDebt لمطابقة الباكند */
export function buildPayDebtPayload(
  debtId: string,
  paymentData: { paymentAmount: number; notes?: string }
): Record<string, unknown> {
  return {
    debtId,
    paymentAmount: paymentData.paymentAmount,
    notes: paymentData.notes ?? '',
  };
}

// --- جلب مع تخزين مؤقت (للربط في الصفحات) ---

const SUBSCRIBERS_SYNC_PAGE_SIZE = 2000;

/** مزامنة كاملة للمشتركين في الخلفية (بدون فلاتر) لاستخدامها أوفلاين — لا نعيق الاستجابة الحالية. */
function backgroundSyncSubscribersToCache(totalItems: number): void {
  if (totalItems <= 0) return;
  const pageSize = Math.min(totalItems, SUBSCRIBERS_SYNC_PAGE_SIZE);
  apiService
    .getSubscribers({ page: 1, pageSize })
    .then((res) => {
      if (res?.data?.length) return cacheSubscribers(res.data);
    })
    .catch(() => {});
}

/** هل الطلب الحالي هو "القائمة الكاملة" بدون بحث أو فلاتر (مناسب لتفعيل المزامنة في الخلفية)؟ */
function isUnfilteredSubscribersRequest(params: PaginationParams): boolean {
  if (params.search?.trim()) return false;
  if (params.status !== undefined && params.status !== '') return false;
  if (params.fat?.trim()) return false;
  if (params.zone?.trim()) return false;
  if (params.noteType !== undefined && params.noteType !== null) return false;
  if (params.expirationFromDate?.trim()) return false;
  if (params.expirationToDate?.trim()) return false;
  if (params.maxDaysUntilExpiry !== undefined && params.maxDaysUntilExpiry >= 0) return false;
  return true;
}

/** جلب المشتركين: من الـ API عند الاتصال (مع التخزين المؤقت)، أو من IndexedDB عند الانقطاع. عند فشل الطلب نعود للكاش إن وُجد. عند نجاح طلب القائمة الكاملة (صفحة 1 بدون فلاتر) نملأ الكاش في الخلفية بجميع المشتركين لاستخدامهم أوفلاين. */
export async function fetchSubscribersWithCache(
  online: boolean,
  params: PaginationParams
): Promise<PaginatedResponse<Subscriber>> {
  const fallback = async (): Promise<PaginatedResponse<Subscriber>> => {
    const cached = await getCachedSubscribers();
    const total = cached.length;
    const page = Math.max(1, params.page ?? 1);
    const size = Math.max(1, params.pageSize ?? 10);
    const start = (page - 1) * size;
    const data = total === 0 ? [] : cached.slice(start, start + size);
    const totalPages = total === 0 ? 0 : Math.ceil(total / size);
    return {
      data,
      totalItems: total,
      totalCount: total,
      currentPage: page,
      pageSize: size,
      totalPages,
      pageNumber: page,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };
  };
  if (online) {
    try {
      const res = await apiService.getSubscribers(params);
      if (res?.data?.length) await cacheSubscribers(res.data);
      if (
        res &&
        params.page === 1 &&
        isUnfilteredSubscribersRequest(params) &&
        (res.totalItems ?? 0) > (res.data?.length ?? 0)
      ) {
        backgroundSyncSubscribersToCache(res.totalItems ?? 0);
      }
      return res as PaginatedResponse<Subscriber>;
    } catch {
      return fallback();
    }
  }
  return fallback();
}

/**
 * كل المشتركين المتاحين للمستخدم الحالي (صفحات متتالية بدون بحث).
 * الصلاحيات والمناطق تُطبَّق في الخادم؛ الموظف يرى مناطقه، الوكيل/الوكيل الفرعي القائمة الكاملة حسب الباكند.
 * أوفلاين: يُعاد كامل الكاش المحلي.
 */
export async function fetchAllSubscribersForDisbursePicker(online: boolean): Promise<Subscriber[]> {
  if (!online) {
    return getCachedSubscribers();
  }
  const pageSize = SUBSCRIBERS_SYNC_PAGE_SIZE;
  const byId = new Map<string, Subscriber>();
  let page = 1;

  while (page <= 500) {
    const res = await fetchSubscribersWithCache(true, { page, pageSize });
    const batch = res.data ?? [];
    for (const s of batch) {
      const id = String(s.id ?? '').trim();
      if (id) byId.set(id, s);
    }
    const totalItems = res.totalItems ?? res.totalCount ?? 0;
    const totalPages =
      res.totalPages && res.totalPages > 0
        ? res.totalPages
        : totalItems > 0
          ? Math.max(1, Math.ceil(totalItems / pageSize))
          : page;

    if (batch.length === 0) break;
    if (page >= totalPages && batch.length < pageSize) break;

    page += 1;
  }

  return Array.from(byId.values());
}

/** جلب الديون: من الـ API عند الاتصال (مع التخزين المؤقت)، أو من IndexedDB عند الانقطاع. عند فشل الطلب نعود للكاش إن وُجد. */
export async function fetchDebtsWithCache(
  online: boolean,
  params: DebtsListParams,
  useOverdue: boolean
): Promise<DebtsListResponse> {
  const fallback = async (): Promise<DebtsListResponse> => {
    const cached = await getCachedDebts();
    return {
      data: cached,
      currentPage: 1,
      pageSize: cached.length,
      totalItems: cached.length,
      totalPages: cached.length ? 1 : 0,
      hasNextPage: false,
      hasPreviousPage: false,
      totalCount: cached.length,
      pageNumber: 1,
    };
  };
  if (online) {
    try {
      const res = useOverdue
        ? await apiService.getOverdueUnpaidDebts(params)
        : await apiService.getAllDebts(params);
      if (res?.data?.length) await cacheDebts(res.data);
      return res;
    } catch {
      return fallback();
    }
  }
  return fallback();
}

/** جلب إيصالات التجديد: من الـ API عند الاتصال (مع التخزين المؤقت)، أو من IndexedDB عند الانقطاع. عند فشل الطلب نعود للكاش إن وُجد. */
export async function fetchReceiptsWithCache(
  online: boolean,
  page: number,
  size: number,
  fromDate?: string,
  toDate?: string,
  resellerId?: string,
  searchTerm?: string
): Promise<{ receipts: RenewalReceipt[]; pagination: any }> {
  const normSearch = (searchTerm ?? '').trim();
  const filterBySearch = (list: RenewalReceipt[]) => {
    if (!normSearch) return list;
    const t = normSearch.toLowerCase();
    return list.filter((r) => {
      const name = (r.subscriberName ?? '').toLowerCase();
      const phone = r.subscriberPhone ?? '';
      const num = (r.receiptNumber ?? '').toLowerCase();
      const user = (r.subscriberUsername ?? '').toLowerCase();
      return (
        name.includes(t) ||
        num.includes(t) ||
        phone.includes(normSearch) ||
        user.includes(t)
      );
    });
  };
  const fallback = async () => {
    const cached = filterBySearch(await getCachedReceipts());
    return {
      receipts: cached,
      pagination: {
        currentPage: 1,
        pageSize: cached.length,
        totalItems: cached.length,
        totalPages: cached.length ? 1 : 0,
      },
    };
  };
  if (online) {
    try {
      const res = await apiService.getRenewalReceipts(page, size, fromDate, toDate, resellerId, searchTerm);
      if (res?.receipts?.length) await cacheReceipts(res.receipts);
      return res;
    } catch {
      return fallback();
    }
  }
  return fallback();
}
