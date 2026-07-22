export enum UserRole {
  Admin = 1,
  Agent = 2,
  Subscriber = 3,
  Employee = 4,
  /** مدير ثانوي: نفس صلاحيات الوكيل، تابع للوكيل الذي أنشأه */
  SubAgent = 5,
  /** وكيل رئيسي: يدير وكلاء فرعيين (sub-agents) واشتراكه مخزن في User */
  MainAgent = 6,
}

export enum SubscriptionType {
  Free = 1,
  Paid = 2
}

export enum SubscriptionStatus {
  Active = 1,
  ExpiringSoon = 2,
  Expired = 3,
  ExpiredToday = 4
}

export enum PaymentStatus {
  Paid = 1,
  Unpaid = 2,
  Pending = 3,
  Unknown = 0  // للقيم غير المعرفة من الباكند
}

/** يطابق `Wakeel.Enums.SubscriberNoteType` — الأرقام ثابتة للبيانات المخزّنة؛ التسميات المعروضة في `subscriberNoteTypeLabels.ts`. */
export enum SubscriberNoteType {
  /** لم يتم الرد */
  NoResponse = 1,
  /** ستتم التفعيل قريباً */
  WillActivateSoon = 2,
  /** لا يرغب في التفعيل */
  DoesNotWantActivation = 3,
  /** واصل ماستر */
  BadService = 4,
  /** واصل مكتب الزهور */
  NeedsMaintenance = 5,
  /** أخرى (نص حر في الملاحظة) */
  Other = 6,
}

export enum DebtStatus {
  Unpaid = 0,
  Paid = 1,
  Partial = 2
}

export interface SubscriberInfo {
  id: string;
  username: string;
  fullName: string;
  isActive: boolean;
  expirationDate: string;
  daysRemaining: number;
  isExpired: boolean;
  status: string;
  agentName: string;
  agentCompanyName: string;
  /** سعر الباقة (SalePrice) الذي حدده الوكيل للعرض في صفحة معلومات المشترك */
  salePrice?: number;
  /** طرق الدفع المفعلة من الوكيل (زين كاش، ماستر كارد، نقد) مع التفاصيل */
  paymentOptions?: PaymentOption[];
  /** إعلانات الوكيل (من الأحدث للأقدم) لعرضها في كروت الإعلانات */
  announcements?: AgentAnnouncementDto[];
  noteType?: SubscriberNoteType | null;
  note?: string | null;
  createdAt: string;
  lastRenewalDate?: string;
  totalRenewals: number;
}

export enum IraqGovernorates {
  Baghdad = 1,
  Basra = 2,
  Mosul = 3,
  Erbil = 4,
  Sulaymaniyah = 5,
  Dohuk = 6,
  Kirkuk = 7,
  Anbar = 8,
  Karbala = 9,
  Najaf = 10,
  Babylon = 11,
  Wasit = 12,
  Diyala = 13,
  Salahuddin = 14,
  Maysan = 15,
  Muthanna = 16,
  DhiQar = 17,
  Qadisiyyah = 18
}

/** عرض اسم المحافظة بالعربية (لـ Dealers / BalanceTransfers) */
export function formatIraqGovernorateAr(g: number | IraqGovernorates | null | undefined): string {
  const n = Number(g);
  const labels: Record<number, string> = {
    [IraqGovernorates.Baghdad]: 'بغداد',
    [IraqGovernorates.Basra]: 'البصرة',
    [IraqGovernorates.Mosul]: 'الموصل',
    [IraqGovernorates.Erbil]: 'أربيل',
    [IraqGovernorates.Sulaymaniyah]: 'السليمانية',
    [IraqGovernorates.Dohuk]: 'دهوك',
    [IraqGovernorates.Kirkuk]: 'كركوك',
    [IraqGovernorates.Anbar]: 'الأنبار',
    [IraqGovernorates.Karbala]: 'كربلاء',
    [IraqGovernorates.Najaf]: 'النجف',
    [IraqGovernorates.Babylon]: 'بابل',
    [IraqGovernorates.Wasit]: 'واسط',
    [IraqGovernorates.Diyala]: 'ديالى',
    [IraqGovernorates.Salahuddin]: 'صلاح الدين',
    [IraqGovernorates.Maysan]: 'ميسان',
    [IraqGovernorates.Muthanna]: 'المثنى',
    [IraqGovernorates.DhiQar]: 'ذي قار',
    [IraqGovernorates.Qadisiyyah]: 'القادسية',
  };
  if (!Number.isFinite(n) || n < 1) return '—';
  return labels[n] ?? String(n);
}

/** وكلاء المناطق — GET/POST /api/Dealers */
export interface Dealer {
  id: string;
  fullName: string;
  userName: string;
  iraqGovernorates: IraqGovernorates | number;
  address: string;
  phone: string;
  agentResellerId: string;
}

export interface DealerCreateRequest {
  fullName: string;
  userName: string;
  iraqGovernorates: IraqGovernorates | number;
  address: string;
  phone: string;
  agentResellerId: string;
}

export type DealerUpdateRequest = DealerCreateRequest;

/** نوع التحويل — POST /api/BalanceTransfers */
export enum BalanceTransferType {
  ZainCashConversion = 1,
  BalanceConversion = 2,
}

export function formatBalanceTransferTypeAr(t: number | BalanceTransferType | null | undefined): string {
  const n = Number(t);
  if (n === BalanceTransferType.ZainCashConversion) return 'تحويل زين كاش';
  if (n === BalanceTransferType.BalanceConversion) return 'تحويل من الرصيد';
  if (t == null || Number.isNaN(n)) return '—';
  return String(n);
}

/** سجل حسابات الوكلاء — GET/POST /api/BalanceTransfers */
export interface BalanceTransfer {
  id: string;
  agentId?: string | null;
  /** منطقة التاجر (رسيلر الوكيل) */
  agentResellerId?: string | null;
  dealerId: string;
  fullName?: string | null;
  userName?: string | null;
  iraqGovernorates?: number | null;
  address?: string | null;
  phone?: string | null;
  balanceAmount: number;
  deductionAmount?: number | null;
  profitAmount?: number | null;
  typeTransfer?: BalanceTransferType | number | null;
  /** تاريخ ووقت التحويل — من CreatedAt */
  createdAt?: string | null;
  /** تاريخ التعبئة إن وُجد من الباكند */
  filledDate?: string | null;
  /** اسم من قام بالتحويل — من CreatedByUser (نص أو كائن مستخدم) */
  createdByUserName?: string | null;
}

export interface BalanceTransferCreateRequest {
  dealerId: string;
  agentResellerId: string;
  balanceAmount: number;
  deductionAmount: number;
  /** اختياري في الإنشاء؛ قد يُطلب في التعديل حسب الباكند */
  typeTransfer?: BalanceTransferType | number;
}

export type BalanceTransferUpdateRequest = BalanceTransferCreateRequest;

/** معاملات GET /api/Dealers — ترقيم وفلترة الاسم */
export interface DealersListParams {
  /** مطابقة جزئية على FullName */
  fullName?: string;
  page?: number;
  pageSize?: number;
}

export type DealersListResponse = PaginatedResponse<Dealer>;

/** معاملات GET /api/Dealers/debts */
export interface DealerDebtsListParams {
  dealerId?: string;
  agentId?: string;
  /** مطابقة جزئية على اسم التاجر */
  dealerFullName?: string;
  /** yyyy-MM-dd — نطاق DebtDate */
  fromDate?: string;
  toDate?: string;
  /** عند true: ديون ناشئة من تفعيلات «لوكيل آخر» فقط */
  fromRenewalActivations?: boolean;
  /**
   * عند false: قائمة مسطحة من DealerDebt في data (مُستحسن للجدول الرئيسي).
   * عند true: صفوف مجمّعة DealerDebtGroupedDto (يُفضّل استخدام getDealerDebtsStatement للمودال).
   */
  groupByDealer?: boolean;
  page?: number;
  pageSize?: number;
}

/** استجابة GET /Dealers/debts — قد تتضمن إجماليات تطابق الفلاتر الحالية */
export interface DealerDebtsListResponse extends PaginatedResponse<DealerDebt> {
  totalPaidAmount?: number;
  totalUnpaidAmount?: number;
}

/** صف مجمّع واحد لكل تاجر — GET .../debts?groupByDealer=true */
export interface DealerDebtGroupedSummary {
  dealerId?: string;
  dealerFullName?: string | null;
  totalAmount: number;
  totalRemainingAmount: number;
  debtRecordCount: number;
}

/** كشف تاجر في المودال: سجلات مسطحة + ملخص من أول صف مجمّع */
export interface DealerDebtsStatementResponse extends DealerDebtsListResponse {
  groupedSummary?: DealerDebtGroupedSummary | null;
}

export interface DealerDebtPayByDealerRequest {
  dealerId: string;
  amount: number;
  notes?: string | null;
}

/** سطر مُرجَع اختياري من الباكند بعد التسديد المجمع */
export interface DealerDebtPayByDealerPaidRow {
  subscriberName?: string | null;
  debtDate?: string | null;
  /** تاريخ التسديد إن وُجد في الاستجابة */
  paidAt?: string | null;
  updatedAt?: string | null;
  /** مبلغ السجل في التسديد المجمع */
  amount?: number | null;
}

/** POST .../debts/pay-by-dealer */
export interface DealerDebtPayByDealerResponse {
  amountApplied: number;
  totalRemainingAmountAfter: number;
  dealerId: string;
  /** إن وُجدت في الاستجابة تُعرَض في سند القبض */
  paidRecords?: DealerDebtPayByDealerPaidRow[];
}

/** معاملات GET /api/BalanceTransfers */
export interface BalanceTransfersListParams {
  fullName?: string;
  typeTransfer?: number;
  /** نطاق CreatedAt (ISO) */
  createdAtFrom?: string;
  createdAtTo?: string;
  /** نطاق تاريخ التعبئة (ISO) */
  filledDateFrom?: string;
  filledDateTo?: string;
  /** فلتر المنطقة — يُمرَّر مع الترقيم كما يحدده الباكند */
  resellerId?: string;
  page?: number;
  pageSize?: number;
}

/** استجابة GET /api/BalanceTransfers — إجماليات لجميع السجلات المطابقة للفلاتر */
export interface BalanceTransfersListResponse extends PaginatedResponse<BalanceTransfer> {
  totalProfitAmount?: number;
  totalBalanceTransferAmount?: number;
}

/** ديون وكلاء المناطق — /api/Dealers/debts */
export interface DealerDebt {
  id: string;
  dealerId: string;
  /** قد يُعاد من الباكند مع السجل */
  dealerFullName?: string | null;
  amount: number;
  debtDate: string;
  remainingAmount: number;
  notes?: string | null;
  /** تاريخ الاستحقاق المتوقع (ديون من تفعيلات لوكيل آخر) */
  dueDate?: string | null;
  renewalId?: string | null;
  subscriberId?: string | null;
  subscriberName?: string | null;
  /** يُفضّل لسند القبض (تاريخ آخر تحديث / تسديد) */
  updatedAt?: string | null;
  createdAt?: string | null;
}

/** GET /api/Dealers/debts/summary-from-renewals — إجماليات ديون التفعيلات (لوكيل آخر) */
export interface DealerDebtsRenewalTotals {
  totalPaidAmount: number;
  totalUnpaidAmount: number;
}

export interface DealerDebtCreateRequest {
  dealerId: string;
  amount: number;
  debtDate: string;
  /** إن حُذف يُعاد تلقائياً = amount في الخادم */
  remainingAmount?: number;
  notes?: string | null;
}

export interface DealerDebtUpdateRequest {
  amount: number;
  debtDate: string;
  remainingAmount: number;
  notes?: string | null;
}

export interface DealerDebtPayRequest {
  amount: number;
  notes?: string | null;
}

/** استجابة POST .../debts/{id}/pay — قد تُرجع عدة سجلات مُحدَّثة */
export interface DealerDebtPaySingleResponse {
  debts: DealerDebt[];
}

export enum SubscriptionSystemType {
  Yearly = 1,
  Daily = 2
}

export enum RenewalCalculationType {
  Fixed = 0,
  MonthlyEnd = 1
}

// Auth Types
export interface LoginRequest {
  username: string;
  password: string;
  /** توكن Cloudflare Turnstile (يُرسل للباكند للتحقق) */
  turnstileToken?: string;
}

export interface LoginResponse {
  token: string;
  expiresInSeconds: number;
  role: string;
  roleId?: number;
  tenantPlanType?: TenantPlanType | null;
  standardPlanTierId?: StandardPlanTier | null;
  standardPlanTier?: 'economy' | 'plus' | 'gold' | null;
  /** null = غير محدود (Vip أو بيانات قديمة) */
  maxResellers?: number | null;
  /** عند true: الباكند لا يتوقع استدعاء GET /users/me أو مزامنة وكيل — نبني المستخدم من الاستجابة والـ JWT */
  skipAgentsMeAndSync?: boolean;
  pendingEmployeeTasksCount?: number;
  errorMessage?: string | null;
  /** للموظف فقط: الوصول إلى التجار (DealersController) — يُعاد من الباكند في تسجيل الدخول */
  canAccessDealers?: boolean;
}

/** شكل بيانات الميزات المخزّنة محلياً (AuthContext) — لا يُجلب من API حالياً */
export interface MeFeaturesResponse {
  tenantId?: string;
  features: string[];
  globalAccess: boolean;
}

// System Message (for agents)
export interface SystemMessageResponse {
  message: string;
  expiresAt: string; // ISO date
}

export interface SystemMessageCreateRequest {
  message: string;
  durationMinutes: number;
}

/** استجابة رسالة التفعيل أو التنبيه (قالب من الباكند) */
export interface MessageTemplateResponse {
  template: string;
}

// SAS provider sync
export interface SasSyncRequest {
  baseUrl: string;
  username: string;
  password: string;
  /** اختياري — إن وُجد يُستخدم مباشرة دون محاولة تسجيل الدخول من السيرفر */
  token?: string;
  /**
   * حد أقصى لعدد المشتركين المسحوبين من المزوّد (مثل Zain Fi²).
   * null أو 0 أو عدم الإرسال = سحب الكل. يُفضّل القيم من GET …/subscriber-fetch-limit-options.
   */
  maxSubscribersToFetch?: number | null;
}

/** عنصر من GET /api/providers/sas/subscriber-fetch-limit-options */
export interface SubscriberFetchLimitOption {
  value: number | null;
  label: string;
}

/** ترتيب افتراضي لحد السحب (Zain Fi² / FiberX): 10، 100، 500، الكل (`null` = سحب الكل) */
export const SUBSCRIBER_FETCH_LIMIT_PRESETS: SubscriberFetchLimitOption[] = [
  { value: 10, label: '10' },
  { value: 100, label: '100' },
  { value: 500, label: '500' },
  { value: null, label: 'الكل' },
];

/** طلب POST /api/providers/zainfi/sync — عند السحب من رسيلر محدد أرسل دائماً resellerId في الجسم (مع maxSubscribersToFetch اختيارياً) */
export interface ZainfiSyncRequest {
  resellerId?: string;
  baseUrl?: string;
  username?: string;
  password?: string;
  /** عند السحب من رسيلر: أرسل رقماً موجباً؛ عدم الإرسال أو null = سحب كامل حسب الخادم */
  maxSubscribersToFetch?: number | null;
}

/** استجابة POST /api/providers/zainfi/sync */
export interface ZainfiSyncResponse {
  synced: number;
  error: string | null;
}

/**
 * صف فرق Zain Fi² — GET /api/providers/zainfi/sync-diff (ZainfiSubscriberDiffRowDto).
 * ترتيب الحقول في JSON من الباكند: الحقول التالية أولاً، ثم subscriberId وdiffFields ثم حقول external/local التفصيلية…
 */
export interface ZainfiSubscriberDiffItem {
  /** الاسم من النظام (FirstName+LastName) إن وُجد، وإلا من Zain بعد المابّنغ */
  subscriberName?: string | null;
  /** تاريخ الانتهاء للعرض: من Zain إن وُجد، وإلا من آخر تجديد محلي */
  expirationDate?: string | null;
  /** الباقةمن Zain (بعد Trim) */
  offerName?: string | null;
  /** يُعبأ بنفس قيمة offerName للتوافق مع كود قديم */
  externalOfferName?: string | null;

  subscriberId: string;
  /** تاريخ انتهاء Zain (لـ POST …/apply-external-expiration) */
  externalEndDate?: string | null;
  /** msisdn | startDate | endDate | offer | status */
  diffFields?: string[];

  [key: string]: unknown;
}

/** طلب POST /api/providers/zainfi/apply-external-expiration */
export interface ZainfiApplyExternalExpirationRequest {
  subscriberId: string;
  externalEndDate: string;
  /** يُنصح بإرساله عند العمل ضمن منطقة؛ يجب أن يطابق AgentResellerId للمشترك */
  resellerId?: string;
}

/** استجابة GET /api/providers/zainfi/sync-diff */
export interface ZainfiSubscriberDiffResponse {
  error: string | null;
  externalRowCount?: number;
  localSubscriberCount?: number;
  matchedPairCount?: number;
  differences: ZainfiSubscriberDiffItem[];
}

export interface SasSyncResponse {
  message: string;
  synced: number;
}

/** طلب POST /providers/sas/sync-contract-id-to-fat?resellerId=... */
export interface SyncContractIdToFatRequest {
  baseUrl: string;
  username: string;
  password: string;
}

/** استجابة مزامنة contract_id → Fat */
export interface SyncContractIdToFatResponse {
  message?: string;
  synced?: number;
  updated?: number;
  matched?: number;
  total?: number;
  error?: string;
}

/** استجابة POST /providers/sas/sync-using-saved-credentials — المزامنة باستخدام الاعتماديات المحفوظة فقط */
export interface SasSyncUsingSavedCredentialsResponse {
  message: string;
  agentId?: string;
  synced: number;
  onlineCount: number;
}

/** طلب POST /api/providers/sas/sync-subscribers — جلب قائمة المزامنة. الجسم اختياري إن وُجدت اعتماديات من رسيلر محفوظ. */
export interface SyncSubscribersRequest {
  /** مطلوب عند عدم استخدام رسيلر (resellerId). */
  baseUrl?: string;
  username?: string;
  password?: string;
  /** اختياري — يُمرَّر في الـ query. للوكيل اختياري، للأدمن مطلوب عند اختيار وكيل. */
  agentId?: string;
  /** اختياري — يُمرَّر في الـ query. عند الإرسال تُستخدم اعتماديات هذا الرسيلر المحفوظة (بدون إرسال الجسم). */
  resellerId?: string;
  /** اختياري — حد أقصى للسحب؛ null أو 0 أو عدم الإرسال = الكل */
  maxSubscribersToFetch?: number | null;
}

/** عنصر في قائمة المشتركين المُرجعة من POST sync-subscribers (مع type/type_ar من المعاملات عند توحيد المزامنة) */
export interface SyncSubscribersDataItem {
  id: number;
  username: string;
  firstname: string;
  lastname: string | null;
  expiration: string;
  phone: string | null;
  profile_details: { name: string };
  customer_id?: string;
  customer_name?: string;
  zone?: string;
  /** طريقة الدفع في FTTH (مثال: Wallet / Card) */
  payment_method?: string;
  /** من المعاملات عند دمج المزامنة — اختياري */
  type?: string;
  /** من المعاملات: شراء اشتراك / تجديد الاشتراك / اشتراك تجريبي */
  type_ar?: string;
}

/** استجابة POST /api/providers/sas/sync-subscribers */
export interface SyncSubscribersResponse {
  data: SyncSubscribersDataItem[];
  provider?: string;
}

/** معاملات (قائمة ثانية للمعاينة) — POST /api/providers/sas/sync-transactions (mode=transactions). النوع: PLAN_PURCHASE → شراء اشتراك، PLAN_RENEW → تجديد، TRIAL_PERIOD → اشتراك تجريبي */
export interface TransactionItem {
  username: string;
  expiration: string;
  customer_id?: string;
  customer_name?: string;
  zone?: string;
  profile_name?: string;
  type_ar: string;
  /** اختياري — إن وُجد من الباكند */
  wallet_owner_type?: string | null;
  /** اختياري — نفس حقل المزامنة عند توحيد الاستجابة */
  payment_method?: string;
}

/** طلب POST /api/providers/sas/sync-transactions — نفس آلية sync-subscribers (agentId, resellerId + اعتماديات اختيارية) */
export interface SyncTransactionsRequest {
  baseUrl?: string;
  username?: string;
  password?: string;
  agentId?: string;
  resellerId?: string;
  maxSubscribersToFetch?: number | null;
}

/** استجابة POST /api/providers/sas/sync-transactions */
export interface SyncTransactionsResponse {
  data: TransactionItem[];
  provider?: string;
  mode?: string; // متوقع "transactions"
}

/** عنصر معاملة خام يُرسل إلى POST /api/providers/sas/cashback-transactions */
export interface CashbackTransactionInputItem {
  id: number;
  occuredAt: string;
  planPrice?: number;
  discountType?: string;
  discountAmount?: number;
  subscriptionName?: string;
  subscriptionStartsAt?: string;
  subscriptionEndsAt?: string;
  deviceUsername?: string;
  zoneId?: string;
  partnerId?: string;
  partnerName?: string;
  customerName?: string;
  createdBy?: string;
  walletOwnerType?: string;
  paymentMode?: string;
  paymentMethod?: string;
}

/** ربح الباقة لكل تفعيل (يُمرَّر للباكند لحساب/عرض نسب الربح في التقرير والـ Excel) */
export interface CashbackPlanProfitInput {
  subscriptionName: string;
  profitPerActivation: number;
}

/** باقات الوكيل المتاحة لحساب الكاش باك — GET /api/providers/sas/cashback-transactions/packages */
export interface CashbackPackageDto {
  profileId: string;
  subscriptionName: string;
  originalPrice?: number;
  salePrice?: number;
  profitPerActivation: number;
}

/** طلب POST /api/providers/sas/cashback-transactions */
export interface CashbackTransactionsRequest {
  /** ثانوي عند وجود المفاتيح — يُفضَّل اتساقاً معها (مثل نفس التاريخ + T00:00:00.000Z) للعرض */
  fromDate: string;
  /** مثل fromDate لنهاية النطاق */
  toDate: string;
  /**
   * يوم تقويمي yyyy-MM-dd يعكس اليوم الظاهر في منتقي التاريخ (مكوّن من سنة/شهر/يوم التقويم المحلي).
   * عند الإرسال مع toDateKey يكون المصدر الموثوق للفلترة؛ الباكند يطبّق منطق بغداد على الزوج.
   */
  fromDateKey?: string;
  /** آخر يوم شامل بنفس أسلوب fromDateKey */
  toDateKey?: string;
  zoneIds?: string[];
  data: CashbackTransactionInputItem[];
  planProfits?: CashbackPlanProfitInput[];
  saveRecord?: boolean;
  /** اختياري عند الحفظ — إن لم يُرسل يُحفظ 0 حتى التحديث لاحقاً */
  totalCashbackAmount?: number;
  cashbackReceivedAt?: string;
}

/** صف نهائي جاهز للتصدير من استجابة cashback-transactions */
export interface CashbackTransactionRow {
  [key: string]: unknown;
}

/** استجابة POST /api/providers/sas/cashback-transactions أو POST .../cashback-transactions/fetch (JSON) */
export interface CashbackTransactionsResponse {
  rows: CashbackTransactionRow[];
  totalActivations?: number;
  subscriberOrMasterActivations?: number;
  agentWalletActivations?: number;
  saved?: boolean;
  /** معرف سجل الكاش باك المحفوظ */
  savedRecordId?: string;
  subscriptionStartMonth?: number;
  subscriptionStartYear?: number;
  subscriptionEndMonth?: number;
  subscriptionEndYear?: number;
  filterFromDate?: string;
  filterToDate?: string;
  zoneIds?: string[];
  cashbackReceivedAt?: string;
  /** شهر الراجع (1–12) من «من تاريخ» الفلترة — للعرض والتخزين */
  cashbackMonth?: number;
  /** سنة الراجع من «من تاريخ» الفلترة */
  cashbackYear?: number;
}

/** عنصر من GET /api/providers/sas/cashback-transactions/records */
export interface CashbackTransactionRecordDto {
  id: string;
  /** إن عادها الباكند يُفضَّل استخدامها عند تنزيل Excel بدل اختيار الرسيلر يدوياً */
  resellerId?: string;
  /** للأدمن عند جلب سجلات أكثر من وكيل — لتمرير agentId عند إعادة طلب التقرير */
  agentId?: string;
  cashbackMonth?: number;
  cashbackYear?: number;
  filterFromDate?: string;
  filterToDate?: string;
  /** إن عادها الباكند مع السجل يُستخدم لتنزيل Excel بنفس نية التقويم */
  fromDateKey?: string;
  toDateKey?: string;
  zoneIds?: string[];
  /** إن عاد السيرفر نصاً مفصولاً بفواصل */
  zoneIdsCsv?: string;
  /** المبلغ المتوقع المحفوظ في السجل (من الوكيل عند الحفظ أو عبر PUT .../total) */
  totalCashbackAmount?: number;
  /** المبلغ الحقيقي بعد مراجعة الإكسل — يُحدَّث من الواجهة عبر PUT .../records/{id}/real-total */
  realTotalCashbackAmount?: number | null;
  cashbackReceivedAt?: string;
  totalActivations?: number;
  agentWalletActivations?: number;
  subscriberOrMasterActivations?: number;
  subscriptionStartMonth?: number;
  subscriptionStartYear?: number;
  subscriptionEndMonth?: number;
  subscriptionEndYear?: number;
  planProfits?: CashbackPlanProfitInput[];
  createdAt?: string;
}

/** جسم PUT /api/providers/sas/cashback-transactions/records/{id}/real-total */
export interface CashbackRecordRealTotalUpdateRequest {
  realTotalCashbackAmount: number;
}

/** جسم PUT /api/providers/sas/cashback-transactions/records/{id}/total — يجب أن يكون المبلغ > 0 */
export interface CashbackExpectedTotalUpdateRequest {
  totalCashbackAmount: number;
}

/** رد PUT .../records/{id}/total */
export interface CashbackExpectedTotalUpdateResponse {
  id: string;
  totalCashbackAmount: number;
}

/** استجابة GET /api/providers/sas/cashback-transactions/zones */
export interface CashbackSubscriberZonesResponse {
  zones: string[];
}

/** صف نتيجة POST /providers/sas/synchronizationFTTH */
export interface CashbackSynchronizationFtthRow {
  customerName?: string | null;
  subscriptionName?: string | null;
  subscriptionEndsAt?: string | null;
  zoneId?: string | null;
  deviceUsername?: string | null;
  activationType?: string | null;
  // SAS diff fields
  firstname?: string | null;
  profile_details?: { name?: string | null } | null;
  new_expiration?: string | null;
  parent_username?: string | null;
  username?: string | null;
  activation_method?: string | null;
}

/** استجابة POST /providers/sas/synchronizationFTTH */
export interface CashbackSynchronizationFtthResponse {
  provider?: string;
  mode?: string;
  dateRange?: {
    fromDate?: string;
    toDate?: string;
  };
  count?: number;
  data: CashbackSynchronizationFtthRow[];
}

/** جسم POST /api/providers/sas/cashback-transactions/fetch — مثل الكاش باك بدون data (السيرفر يجلب FTTH من اعتماديات الرسيلر) */
export type CashbackFetchBody = Omit<CashbackTransactionsRequest, 'data'>;

/** نوع العميل — GET/POST /api/CustomerInvoices */
export enum CustomerInvoiceCustomerType {
  NewCustomer = 0,
  Agent = 1,
}

/** طريقة الدفع — GET/POST /api/CustomerInvoices */
export enum CustomerInvoicePaymentMethod {
  Cash = 0,
  MasterCard = 1,
  ZainCash = 2,
  Other = 3,
}

/** عميل — GET /api/CustomerInvoices (قائمة)؛ قد تتضمن مجاميع للعرض */
export interface CustomerInvoiceCustomerDto {
  id: string;
  agentId: string;
  createdByUserId?: string;
  /** معرف العميل عندما يكون الصف يمثل فاتورة مرتبطة بعميل */
  customerId?: string;
  customerName: string;
  /** قد يُحتفَظ به للترحيل من البيانات القديمة */
  customerUsername?: string | null;
  address?: string | null;
  phoneNumber?: string | null;
  customerType: CustomerInvoiceCustomerType | number;
  createdAt?: string;
  updatedAt?: string | null;
  /** مجاميع اختيارية لصف القائمة */
  balanceAmount?: number;
  transferAmount?: number;
  debtAmount?: number;
  debtPaid?: number;
  debtRemaining?: number;
  invoicesCount?: number;
  /** 0 = فاتورة عميل، 1 = فاتورة على الشركة */
  invoiceType?: number | null;
  debtDate?: string | null;
  paymentMethod?: CustomerInvoicePaymentMethod | number;
  /** ملاحظة تظهر في قائمة العملاء إن زودها الخادم */
  notes?: string | null;
}

/** سجل فاتورة مرتبط بعميل */
export interface CustomerInvoiceRecordDto {
  id: string;
  customerId: string;
  /** نوع الفاتورة (مثل: Standard, CompanyDebt) */
  invoiceType?: string | number | null;
  balanceAmount: number;
  transferAmount: number;
  /** غالباً balanceAmount − transferAmount في الـ API */
  debtAmount?: number;
  debtPaid?: number;
  debtRemaining?: number;
  /** تاريخ الدين (خصوصاً لفواتير CompanyDebt) */
  debtDate?: string | null;
  paymentMethod: CustomerInvoicePaymentMethod | number;
  /** ملاحظات الفاتورة — يطابقها الخادم (Notes) */
  notes?: string | null;
  createdAt: string;
  updatedAt?: string | null;
}

/** GET /api/CustomerInvoices/{customerId} — العميل + كل فواتيره */
export interface CustomerInvoiceDetailDto extends CustomerInvoiceCustomerDto {
  invoices: CustomerInvoiceRecordDto[];
}

/** إحصائيات GET /CustomerInvoices — على النتائج المفلترة فقط */
export interface CustomerInvoiceStatisticsDto {
  totalDebtAmount: number;
  totalDebtPaid: number;
  totalDebtRemaining: number;
  totalBalanceAmount: number;
  totalTransferAmount: number;
  /** إجمالي المبالغ المتبقية على الشركة (CompanyDebt) */
  totalCompanyDebtAmount?: number;
  customerCount: number;
}

/** مجموعة عميل — GET /CustomerInvoices?groupByCustomer=true */
export interface CustomerInvoiceCustomerGroupDto {
  customerId: string;
  agentId?: string;
  customerName: string;
  customerUsername?: string | null;
  phoneNumber?: string | null;
  address?: string | null;
  customerType: CustomerInvoiceCustomerType | number;
  createdAt?: string | null;
  updatedAt?: string | null;
  totalDebtAmount: number;
  totalDebtPaid: number;
  totalDebtRemaining: number;
  /** 0 = دين وكلاء، 1 = دين شركة (قد تعيده بعض إصدارات API على مستوى المجموعة) */
  invoiceType?: number | null;
  invoices: CustomerInvoiceRecordDto[];
}

/** استجابة GET /CustomerInvoices */
export interface CustomerInvoicesListResponse {
  /** عند groupByCustomer=false */
  items: CustomerInvoiceCustomerDto[] | null;
  /** عند groupByCustomer=true (الافتراضي) */
  customerGroups: CustomerInvoiceCustomerGroupDto[] | null;
  statistics: CustomerInvoiceStatisticsDto;
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/** POST /api/CustomerInvoices/pay-debt-by-customer */
export interface CustomerInvoicePayDebtByCustomerRequest {
  customerId: string;
  amount: number;
  notes?: string | null;
}

export interface CustomerInvoicePayDebtByCustomerResponse {
  customerId: string;
  amountApplied: number;
  totalDebtRemainingAfter: number;
}

/** جسم POST /api/CustomerInvoices — إنشاء عميل فقط */
export interface CustomerInvoiceCustomerCreateDto {
  customerName: string;
  phoneNumber?: string | null;
  address?: string | null;
  customerType: CustomerInvoiceCustomerType | number;
}

/** جسم PUT /api/CustomerInvoices/{customerId} — تعديل بيانات العميل */
export type CustomerInvoiceCustomerUpdateDto = CustomerInvoiceCustomerCreateDto;

/** جسم POST …/invoices و PUT /api/CustomerInvoices/{id} — فاتورة (يُحسب debtAmount = balance − transfer) */
export interface CustomerInvoiceRecordCreateDto {
  balanceAmount: number;
  transferAmount: number;
  paymentMethod: CustomerInvoicePaymentMethod | number;
  notes?: string | null;
}

/** جسم POST /api/CustomerInvoices/company-debt */
export interface CustomerInvoiceCompanyDebtCreateDto {
  customerName: string;
  debtAmount: number;
  debtDate: string;
  notes?: string | null;
}

/** جسم POST /api/CustomerInvoices/journal-entry */
export interface CustomerInvoiceJournalEntryCreateDto {
  fromCustomerId: string;
  toCustomerId: string;
  amount: number;
  /** ISO 8601 */
  date: string;
  notes?: string | null;
}

/** استجابة POST /api/CustomerInvoices/{id}/send-whatsapp */
export interface CustomerInvoiceSendWhatsAppResponse {
  message?: string;
  messageId?: string;
}

/** جسم POST /api/CustomerInvoices/{id}/pay-debt */
export interface CustomerInvoicePayDebtRequest {
  amount: number;
}

/** طلب POST /api/providers/sas/update-subscription — تفعيل مشترك واحد من القائمة */
export interface UpdateSubscriptionRequest {
  id: number;
  username: string;
  firstname: string;
  lastname: string;
  expiration: string;
  phone: string | null;
  profileName: string;
  /** إذا كان false: تفعيل بدون خصم من الرصيد مع إضافة دين للمشترك. إن لم يُرسَل أو true يُعتبر مدفوعاً. */
  isPaid?: boolean;
  /** عند isPaid: false — مبلغ الدين المُضاف. إن لم يُرسَل يُستخدم سعر الباقة (SalePrice). */
  debtAmount?: number;
}

/** استجابة POST /api/providers/sas/update-subscription */
export interface UpdateSubscriptionResponse {
  message: string;
  subscriberId?: string;
  renewalId?: string;
}

/** طلب POST /api/providers/sas/save-subscriber — يحدّث التاريخ فقط (انتهاء + اشتراك). لا فاتورة ولا خصم رصيد. الاستعلام: agentId اختياري. */
export interface SaveSubscriberFromSyncRequest {
  customer_id?: string;
  username: string;
  customer_name?: string;
  expiration: string;
  profile_name?: string;
  zone?: string;
  type_ar?: string | null;
  activationDate?: string;
}

/** عنصر واحد من SAS (overview) للمرسل إلى sync-from-data */
export interface SasOverviewDataItem {
  id: number;
  username: string;
  firstname: string;
  profile_Name: string;
  password: string;
  phone: string;
  expiration: string; // "2025-03-01 00:00:00"
}

export interface SasSyncFromDataRequest {
  users: SasOverviewDataItem[];
}

/** بيانات اعتماد SAS للوكيل (من GET /providers/sas/credentials) */
export interface SasCredentialsItem {
  agentId: string;
  agentName: string;
  serviceType: ServiceType; // 1 FTTH، 2 SAS، 4 Zain Fi²
  /** رابط SAS (فارغ إذا الوكيل FTTH فقط) */
  baseUrl: string;
  /** رابط FTTH (فارغ إذا الوكيل SAS فقط) */
  ftthBaseUrl: string;
  username: string;
  password: string;
}

/** اعتماديات رسيلر (من GET /providers/sas/resellers-credentials) — للأدمن، كلمة السر صريحة، ترتيب من الأحدث أولاً */
export interface AgentResellerCredentialsDto {
  agentId: string;
  agentName: string;
  resellerId: string;
  name: string;
  serviceType: ServiceType;
  baseUrl: string;
  username: string | null;
  /** كلمة السر بشكل صريح (بعد فك التشفير) */
  password: string;
  createdAt: string;
}

// User Types
/** صلاحيات الموظف (Employee) — تُطبّق في الباكند عند دور Employee فقط */
export interface EmployeePermissions {
  canActivateSubscriber: boolean;
  canEditSubscriber: boolean;
  canDeleteSubscriber: boolean;
  canPayDebt: boolean;
  canAccessAccounts: boolean;
  /** تعديل باقة تفعيل في سجل الحسابات (AccountsFul) */
  canEditAccountsLedger: boolean;
  /** الوصول الكامل لـ API التجار وديونهم (DealersController). */
  canAccessDealers: boolean;
  canAccessInvoices: boolean;
  canAccessExpensesAndSalarySheet: boolean;
  /** مشاهدة لوحة تحكم المشتركين (GET /api/Subscribers/dashboard). افتراضي false. */
  canAccessSubscriberDashboard: boolean;
  /** عرض قائمة كل المشتركين بدون فلتر اسم. إن false يُرجع API قائمة فارغة إلا مع SearchTerm. افتراضي false. */
  canViewAllSubscribers: boolean;
  /** السماح باستلام وتنفيذ طلبات المهام (EmployeeTasks). افتراضي false. */
  canReceiveTaskRequests: boolean;
  /** إسناد وإدارة مهام الموظفين كواجهة الوكيل (EmployeeTasks). افتراضي false. */
  canManageEmployeeTasks: boolean;
  /**
   * إدارة المبيعات والمواد (واجهات Materials، شاشة البيع، سجل الصرف/المبيعات).
   * للموظف: تمنح أيضاً الوصول لقسم «إدارة الموظفين» (عرض الموظفين، مهام الموظفين) وإدارة المهام كالوكيل عبر الـ API.
   * افتراضي false.
   */
  canManageMaterialsAndSales: boolean;
}

export const DEFAULT_EMPLOYEE_PERMISSIONS: EmployeePermissions = {
  canActivateSubscriber: true,
  canEditSubscriber: true,
  canDeleteSubscriber: true,
  canPayDebt: true,
  canAccessAccounts: true,
  canEditAccountsLedger: false,
  canAccessDealers: false,
  canAccessInvoices: true,
  canAccessExpensesAndSalarySheet: true,
  canAccessSubscriberDashboard: false,
  canViewAllSubscribers: false,
  canReceiveTaskRequests: false,
  canManageEmployeeTasks: false,
  canManageMaterialsAndSales: false,
};

/** تسميات الصلاحيات للعرض في الواجهة */
export const EMPLOYEE_PERMISSION_LABELS: Record<keyof EmployeePermissions, string> = {
  canActivateSubscriber: 'تفعيل مشترك',
  canEditSubscriber: 'تعديل مشترك',
  canDeleteSubscriber: 'حذف مشترك',
  canPayDebt: 'تسديد دين',
  canAccessAccounts: 'الوصول إلى الحسابات (رصيد، حساب يومي، تسليم)',
  canEditAccountsLedger: 'تعديل باقة التفعيل في سجل الحسابات',
  canAccessDealers: 'إدارة التجار وديونهم — CanAccessDealers (حسابات الوكلاء)',
  canAccessInvoices: 'الوصول إلى الفواتير (إيصالات)',
  canAccessExpensesAndSalarySheet: 'الوصول إلى المصاريف وكشوفات الموظفين',
  canAccessSubscriberDashboard: 'مشاهدة لوحة تحكم المشتركين',
  canViewAllSubscribers: 'عرض كل المشتركين (بدون اشتراط البحث بالاسم)',
  canReceiveTaskRequests: 'استلام طلبات المهام',
  canManageEmployeeTasks: 'إدارة مهام الموظفين',
  /** تُعرض في نماذج الصلاحيات؛ تشمل المواد/الصرف ووصول الموظف لعرض الموظفين ومهامهم */
  canManageMaterialsAndSales: 'إدارة المبيعات والمواد',
};

/**
 * ترتيب عرض صلاحيات الموظف في نماذج الإضافة/التعديل (وكيل، أدمن، إلخ).
 * يجب أن يشمل كل مفتاح من `EmployeePermissions` — منها **canAccessDealers** (CanAccessDealers في الـ API).
 */
export const EMPLOYEE_PERMISSION_FORM_KEYS: readonly (keyof EmployeePermissions)[] = [
  'canActivateSubscriber',
  'canEditSubscriber',
  'canDeleteSubscriber',
  'canPayDebt',
  'canAccessAccounts',
  'canEditAccountsLedger',
  'canAccessDealers',
  'canAccessInvoices',
  'canAccessExpensesAndSalarySheet',
  'canAccessSubscriberDashboard',
  'canViewAllSubscribers',
  'canReceiveTaskRequests',
  'canManageEmployeeTasks',
  'canManageMaterialsAndSales',
] as const;

/** قيمة صلاحية للعرض في checkbox — يعتمد القيمة المحفوظة أو الافتراضي من `DEFAULT_EMPLOYEE_PERMISSIONS`. */
export function getEmployeePermissionChecked(
  stored: Partial<EmployeePermissions> | null | undefined,
  key: keyof EmployeePermissions
): boolean {
  const v = stored?.[key];
  if (typeof v === 'boolean') return v;
  return DEFAULT_EMPLOYEE_PERMISSIONS[key];
}

export interface User {
  id: string;
  username: string;
  fullName: string;
  isActive: boolean;
  role: UserRole;
  tenantPlanType?: TenantPlanType;
  standardPlanTierId?: StandardPlanTier | null;
  standardPlanTier?: 'economy' | 'plus' | 'gold' | null;
  /** null = غير محدود */
  maxResellers?: number | null;
  createdByAgentName?: string;
  /** معرف الوكيل للمستخدم من نوع Agent أو الموظف التابع لوكيل */
  agentId?: string;
  /** صلاحيات الموظف (موجودة عندما role = Employee) */
  canActivateSubscriber?: boolean;
  canEditSubscriber?: boolean;
  canDeleteSubscriber?: boolean;
  canPayDebt?: boolean;
  canAccessAccounts?: boolean;
  canEditAccountsLedger?: boolean;
  canAccessDealers?: boolean;
  canAccessInvoices?: boolean;
  canAccessExpensesAndSalarySheet?: boolean;
  canAccessSubscriberDashboard?: boolean;
  canViewAllSubscribers?: boolean;
  canReceiveTaskRequests?: boolean;
  canManageEmployeeTasks?: boolean;
  canManageMaterialsAndSales?: boolean;
  allowedResellerIds?: string[];
  /** اشتراك الوكيل الرئيسي (عندما role = MainAgent) */
  subscriptionType?: SubscriptionSystemType;
  subscriptionStartDate?: string;
  subscriptionEndDate?: string;
}

export interface UserCreateRequest {
  username: string;
  fullName: string;
  password: string;
  role: UserRole;
  /** للوكيل الرئيسي (MainAgent) */
  subscriptionType?: SubscriptionSystemType;
  subscriptionStartDate?: string;
  subscriptionEndDate?: string;
  /** صلاحيات الموظف (عند role = Employee) أو حسب ما يقبله الباكند */
  canActivateSubscriber?: boolean;
  canEditSubscriber?: boolean;
  canDeleteSubscriber?: boolean;
  canPayDebt?: boolean;
  canAccessAccounts?: boolean;
  canEditAccountsLedger?: boolean;
  canAccessDealers?: boolean;
  canAccessInvoices?: boolean;
  canAddMaterial?: boolean;
  canDisburseMaterial?: boolean;
  canAccessExpensesAndSalarySheet?: boolean;
  canAccessSubscriberDashboard?: boolean;
  canViewAllSubscribers?: boolean;
  canReceiveTaskRequests?: boolean;
  canManageEmployeeTasks?: boolean;
  canManageMaterialsAndSales?: boolean;
}

export interface UserUpdateRequest {
  fullName: string;
  isActive: boolean;
  role: UserRole;
  /** للوكيل الرئيسي (MainAgent) */
  subscriptionType?: SubscriptionSystemType;
  subscriptionStartDate?: string;
  subscriptionEndDate?: string;
}

/** طلب تسجيل وكيل — POST /AgentRegistration/register (بدون تسجيل دخول) */
export type AgentRegistrationServiceType = 'ftth' | 'sas' | 'earthlink' | 'zainfi' | 'fiberx';

export interface AgentRegistrationRequest {
  fullName: string;
  /** 11 رقماً حسب الباكند */
  phone: string;
  serviceType: AgentRegistrationServiceType;
  resellerBaseUrl: string;
  resellerUsername: string;
  resellerPassword: string;
  loginUsername: string;
  /** يُثبته الباكند تلقائياً حالياً (12345) */
  loginPassword?: string;
}

/** استجابة POST /AgentRegistration/register */
export interface AgentRegistrationRegisterResponse {
  message?: string;
  loginUsername?: string;
  defaultPassword?: string;
  whatsAppUrl?: string;
  whatsAppMessage?: string;
}

/** موافقة الأدمن — POST /AgentRegistration/approve */
export interface AgentRegistrationApproveRequest {
  /** نفس loginUsername في الطلب */
  username: string;
  subscriptionStartDate: string;
  subscriptionEndDate: string;
}

export interface AgentRegistrationApproveResponse {
  message?: string;
  agentId?: string;
  userId?: string;
}

/** عنوان RES الافتراضي لـ Zain Fi² (يُمرَّر للباكند كـ --base-url عند الحاجة) */
export const ZAINFI_DEFAULT_BASE_URL = 'https://zainfi2-res.iq.zain.com';

/** افتراضي FiberX للمزامنة عندما يكون SasBaseUrl فارغاً (وكيل بدون رسيلر) */
export const FIBERX_DEFAULT_BASE_URL = 'https://core.fiberx.iq';

/** رابط تسجيل الدخول / التفعيل في واجهة FiberX */
export const FIBERX_ACTIVATION_LOGIN_URL = 'https://x.fiberx.iq/auth/login';

// ربط SAS/FTTH/Earthlink/Zain Fi²/FiberX للتفعيل عبر تاب المتصفح
export enum ServiceType {
  Ftth = 1,
  Sas = 2,
  Earthlink = 3,
  /** Zain Fi² — اعتماديات مثل SAS؛ المزامنة والتخزين كـ FTTH في الباكند */
  Zainfi = 4,
  /** FiberX — نفس نمط اعتماديات Zain Fi² والمزامنة */
  Fiberx = 5,
}

/** حقول SasBaseUrl / SasUsername / SasPassword (يشمل Zain Fi² و FiberX) */
export function usesSasCredentialFields(st: ServiceType | undefined | null): boolean {
  return st === ServiceType.Sas || st === ServiceType.Zainfi || st === ServiceType.Fiberx;
}

/** تسمية عربية مختصرة لنوع الخدمة في الواجهة */
export function formatServiceTypeLabelAr(st: ServiceType): string {
  switch (st) {
    case ServiceType.Ftth:
      return 'FTTH';
    case ServiceType.Sas:
      return 'SAS';
    case ServiceType.Earthlink:
      return 'Earthlink';
    case ServiceType.Zainfi:
      return 'Zain Fi²';
    case ServiceType.Fiberx:
      return 'FiberX';
    default:
      return String(st);
  }
}

export enum TenantPlanType {
  Standard = 0,
  Vip = 1,
}

/** طبقات الخطة القياسية (Standard) */
export enum StandardPlanTier {
  Economy = 0,
  Plus = 1,
  Gold = 2,
}

export enum EmployeeTaskType {
  SubscriberInstallation = 1,
  SubscriberMaintenance = 2,
  Other = 3,
  AmountReception = 4,
}

/** يطابق Wakeel/Enums/EmployeeTaskEnums.cs — SubscriberMaintenanceKind */
export enum SubscriberMaintenanceKind {
  CableCut = 1,
  ServiceProblem = 2,
  RouterPasswordChange = 3,
  Other = 4,
  /** تبديل مسار */
  PathSwitch = 5,
  /** استبدال راوتر */
  RouterReplacement = 6,
}

export enum EmployeeTaskStatus {
  Pending = 1,
  Accepted = 2,
  Completed = 3,
  Rejected = 4,
}

/** رابط إدارة المستخدمين عند نوع الخدمة Earthlink */
export const EARTHLINK_USER_MANAGEMENT_URL = 'https://admin.earthlink.iq/UserManagement.aspx';

export interface SasActivationLinkResponse {
  serviceType: ServiceType;
  /** عند ServiceType.Sas */
  url?: string;
  /** عند ServiceType.Ftth */
  loginUrl?: string;
  /** عند ServiceType.Ftth أو Zainfi أو Fiberx: رابط تفاصيل المشترك / معرّف اشتراك مستقر */
  activationUrl?: string;
  /** معرف المشترك (SecruptionId) — يُرجَع من الباكند لاستخدامه في رابط FTTH */
  secruptionId?: string;
}

/** رسيلر وكيل (SAS / FTTH / Earthlink) — من GET/POST/PUT /Agents/me/resellers */
export interface AgentReseller {
  id: string;
  agentId?: string;
  name: string;
  serviceType: ServiceType;
  baseUrl: string;
  username: string | null;
  telegramChatId?: string | null;
  /** كلمة مرور الرسيلر — تُرجَع من GET /Agents/me/resellers لاستخدامها في تفعيل SAS عبر سكربت البايثون */
  password?: string | null;
  displayOrder: number;
  /** رصيد التفعيل لهذه المنطقة (من الباكند) */
  balanceIqd?: number;
}

/** طلب إضافة رسيلر — POST /Agents/me/resellers */
export interface AgentResellerCreateRequest {
  name: string;
  serviceType: ServiceType;
  baseUrl: string;
  username?: string | null;
  telegramChatId?: string | null;
  password?: string | null;
  displayOrder?: number;
}

/** طلب تعديل رسيلر — PUT /Agents/me/resellers/{id}. إن حذفت password أو أرسلت فارغاً لا تُغيّر كلمة المرور. */
export interface AgentResellerUpdateRequest {
  name: string;
  serviceType: ServiceType;
  baseUrl: string;
  username?: string | null;
  telegramChatId?: string | null;
  password?: string | null;
  displayOrder?: number;
}

/** جسم POST /providers/sas/ftth-subscribers-export — اعتماديات FTTH (أو {} إن وُجدت على الرسيلر في الباكند) */
export interface FtthSubscribersExportBody {
  baseUrl?: string;
  username?: string;
  password?: string;
}

/** رد POST /providers/sas/ftth-subscribers-export */
export interface FtthSubscribersExportResponse {
  data?: unknown[];
  provider?: string;
  mode?: string;
  includeAllStatuses?: boolean;
  error?: string;
}

/** رد POST /providers/sas/ftth-subscribers-import */
export interface FtthSubscribersImportResponse {
  imported?: number;
  skippedDuplicate?: number;
  phoneUpdated?: number;
  updated?: number;
  errors?: number;
  errorMessages?: string[];
}

/** جسم POST /providers/sas/sas-subscribers-export — يدعم login الكلاسيكي أو token المباشر */
export interface SasSubscribersExportBody extends FtthSubscribersExportBody {
  /** توكن جاهز (اختياري) — عند تمريره يتجاوزه الباكند على login التقليدي */
  token?: string;
  /** مسار user API في لوحة SAS (اختياري). الافتراضي في الباكند: admin/api/index.php/api/index/user */
  userPath?: string;
}

/** رد POST /providers/sas/sas-subscribers-export */
export type SasSubscribersExportResponse = FtthSubscribersExportResponse;

/** رد POST /providers/sas/sas-subscribers-import */
export type SasSubscribersImportResponse = FtthSubscribersImportResponse;

/** إعدادات قالب طباعة فاتورة التفعيل — GET/PUT …/InvoicePrintTemplates/activation */
export interface ActivationInvoicePrintSettingsDto {
  logoUrl?: string | null;
  invoiceTitle?: string | null;
  companyName?: string | null;
  companyAddress?: string | null;
  companyPhones?: string | null;
  notesSectionHeading?: string | null;
  footerLegalText?: string | null;
  hasSavedSettings?: boolean;
}

/** نص تذييل افتراضي (يتوافق مع القيم الافتراضية في الباكند) */
export const DEFAULT_INVOICE_PRINT_FOOTER_LEGAL =
  'شركة انجاز لادارة الانظمة والحلول البرمجية 2026';

/** إعدادات قالب فاتورة المبيعات — نفس حقول التفعيل + تسميات الجدول والملخص + مظهر الطباعة (المرحلة 1) */
export interface SalesInvoicePrintSettingsDto extends ActivationInvoicePrintSettingsDto {
  columnSerialLabel?: string | null;
  columnProductNameLabel?: string | null;
  columnQuantityLabel?: string | null;
  columnMaterialPriceLabel?: string | null;
  columnMaterialNotesLabel?: string | null;
  columnLineTotalLabel?: string | null;
  summaryTotalAmountLabel?: string | null;
  summaryPaidAmountLabel?: string | null;
  summaryRemainingAmountLabel?: string | null;
  /** حجم الورقة للطباعة */
  pageSize?: string | null;
  marginTopMm?: number | null;
  marginRightMm?: number | null;
  marginBottomMm?: number | null;
  marginLeftMm?: number | null;
  /** لون التمييز (رأس الجدول، المبالغ المهمة، رقم الفاتورة إن لم يُضبط لون منفصل) */
  accentColor?: string | null;
  textColor?: string | null;
  borderColor?: string | null;
  tableHeaderTextColor?: string | null;
  invoiceNumberColor?: string | null;
  baseFontSizePx?: number | null;
  companyNameFontSizePx?: number | null;
  logoMaxHeightPx?: number | null;
  logoMaxWidthPx?: number | null;
  logoPrintGrayscale?: boolean | null;
  /** موضع الشعار أفقياً: يسار أو يمين الورقة */
  headerLogoPosition?: string | null;
  showFooterLegal?: boolean | null;
  salesTemplateSchemaVersion?: number | null;
}

export type ActivationInvoicePrintSettingsUpdate = Partial<
  Omit<ActivationInvoicePrintSettingsDto, 'hasSavedSettings'>
>;

export type SalesInvoicePrintSettingsUpdate = Partial<
  Omit<SalesInvoicePrintSettingsDto, 'hasSavedSettings'>
>;

/** استجابة تحديث حالة إطفاء/تشغيل ديون المشترك */
export interface SubscriberOffOnUpdateResponse {
  updatedCount: number;
  offOn: number;
}

// Agent Types
export interface Agent {
  id: string;
  userId: string;
  username: string;
  plainPassword?: string; // كلمة المرور للعرض
  fullName: string;
  companyName: string;
  phone: string;
  address: string;
  governorate: IraqGovernorates;
  isActive: boolean;
  subscriptionType: SubscriptionSystemType;
  subscriptionStartDate: string;
  subscriptionEndDate: string;
  renewalPeriod?: number;
  renewalCalculationType?: RenewalCalculationType;
  isSubscriptionExpired: boolean;
  daysUntilExpiry: number;
  createdAt: string;
  updatedAt?: string;
  createdByUserName: string;
  /** نوع الخدمة (1 FTTH، 2 SAS، 3 Earthlink، 4 Zain Fi²). الافتراضي للموجودين = 2 */
  serviceType?: ServiceType;
  /** رابط قاعدة SAS للوكيل (إعدادات التفعيل) */
  sasBaseUrl?: string;
  /** اسم مستخدم SAS للوكيل */
  sasUsername?: string;
  /** رابط FTTH للوكيل (اختياري، الافتراضي: https://admin.ftth.iq) */
  ftthBaseUrl?: string;
  /** اسم مستخدم FTTH (اختياري) */
  ftthUsername?: string;
  /** هل توجد كلمة سر مزامنة مخزنة (SAS/FTTH) لاستخدام «بيانات محفوظة» */
  hasStoredSyncPassword?: boolean;
  /** معرف جلسة واتساب (لإرسال التذكير عبر wwebjs-api) */
  whatsAppSessionId?: string | null;
  tenantPlanType?: TenantPlanType | null;
  standardPlanTierId?: StandardPlanTier | null;
  standardPlanTier?: 'economy' | 'plus' | 'gold' | null;
  maxResellers?: number | null;
}

export interface AgentCreateRequest {
  username: string;
  fullName: string;
  password: string;
  companyName: string;
  phone: string;
  address: string;
  governorate: IraqGovernorates;
  /** اختياري في الباكند — عند عدم الإرسال (وكيل فرعي) يُؤخذ الاشتراك من الوكيل الرئيسي */
  subscriptionType?: SubscriptionSystemType;
  subscriptionStartDate?: string;
  subscriptionEndDate?: string;
  renewalPeriod?: number;
  renewalCalculationType?: RenewalCalculationType;
  serviceType?: ServiceType;
  sasBaseUrl?: string;
  sasUsername?: string;
  sasPassword?: string;
  ftthBaseUrl?: string;
  ftthUsername?: string;
  ftthPassword?: string;
  whatsAppSessionId?: string;
  /** للأدمن: نوع خطة المستأجر للوكيل الجديد */
  tenantPlanType?: TenantPlanType;
  /** @deprecated لم يعد الباكند يقبل الحقل عند POST /Agents — تُحدد الطبقة من الخادم */
  standardPlanTier?: StandardPlanTier;
  /** عند إنشاء وكيل فرعي من الوكيل الرئيسي: يُرسل تلقائياً role = UserRole.MainAgent (6) لربط السجل بالمستخدم الحالي */
  role?: number;
}

/** كتالوج طبقات الخطة القياسية (لم يعد المسار متاحاً بعد النشر — للعرض الثابت فقط إن لزم) */
export interface StandardPlanTierCatalogItem {
  tier: 'economy' | 'plus' | 'gold';
  tierId: StandardPlanTier;
  displayNameAr: string;
  maxResellers: number | null;
  featureLabelsAr: string[];
  featureCodes: string[];
}

export interface EmployeeTask {
  id: string;
  tenantId?: string;
  agentId: string;
  employeeUserId: string;
  employeeName?: string;
  employeeUserName?: string;
  employeeFullName?: string;
  createdByUserId?: string;
  createdByUserName?: string;
  taskType: EmployeeTaskType;
  status: EmployeeTaskStatus;
  taskDetails?: string | null;
  subscriberId?: string | null;
  subscriberName?: string | null;
  subscriberPhone?: string | null;
  subscriberDisplayName?: string | null;
  /** عند taskType = SubscriberMaintenance: 1–4 و 5 = تبديل مسار، 6 = استبدال راوتر */
  maintenanceType?: SubscriberMaintenanceKind | null;
  amountReceived?: number | null;
  materialId?: string | null;
  materialName?: string | null;
  materialPrice?: number | null;
  taskTitle?: string | null;
  note?: string | null;
  signalNumber?: string | null;
  /** بيانات المشترك الجديد لمهمة تنصيب (من الخادم؛ قد تُرسل أيضاً بأسماء PascalCase) */
  newSubscriberName?: string | null;
  newSubscriberPhone?: string | null;
  newSubscriberAddress?: string | null;
  acceptedAt?: string | null;
  completedAt?: string | null;
  durationSeconds?: number | null;
  taskDuration?: string | null;
  completedSubscriberName?: string | null;
  completedPhoneNumber?: string | null;
  completedSignalNumber?: string | null;
  completedNote?: string | null;
  /** سبب الرفض (حالة Rejected) */
  rejectionReason?: string | null;
  rejectedAt?: string | null;
  createdAt: string;
}

export interface EmployeeTaskCreateRequest {
  employeeUserId: string;
  taskType: EmployeeTaskType;
  subscriberId?: string;
  /** عدة مشتركين — الخادم ينشئ مهمة لكل معرّف ويرسل employeeTaskAssignedBatch */
  subscriberIds?: string[];
  /** true: يُشترط TotalDebt > 0 لكل المشتركين المختارين */
  debtCollection?: boolean;
  /** مع taskType = SubscriberMaintenance: 1–4 كالسابق؛ 5 = تبديل مسار؛ 6 = استبدال راوتر */
  maintenanceType?: SubscriberMaintenanceKind;
  amountReceived?: number;
  taskTitle?: string;
  /** تفاصيل إضافية (غالباً ما يقرأها الباكند مع دفعة المهام) */
  taskDetails?: string;
  note?: string;
  /** مطلوب عند taskType = SubscriberInstallation */
  newSubscriberName?: string;
  newSubscriberPhone?: string;
  newSubscriberAddress?: string;
}

/** استجابة POST /EmployeeTasks عند إرسال subscriberIds */
export interface EmployeeTaskCreateBatchResponse {
  message?: string;
  tasks: EmployeeTask[];
}

/** POST /EmployeeTasks/{id}/reject — موظف فقط؛ reason مطلوب (بعد Trim) */
export interface EmployeeTaskRejectRequest {
  reason: string;
}

export interface EmployeeTaskUpdateRequest {
  /** إن لم تُرسل أو كانت نفس الموظف الحالي لا يتغيّر المكلّف في الباكند */
  employeeUserId?: string;
  taskType: EmployeeTaskType;
  subscriberId?: string;
  /** مع taskType = SubscriberMaintenance: 1–4 كالسابق؛ 5 = تبديل مسار؛ 6 = استبدال راوتر */
  maintenanceType?: SubscriberMaintenanceKind;
  amountReceived?: number;
  taskTitle?: string;
  note?: string;
  newSubscriberName?: string;
  newSubscriberPhone?: string;
  newSubscriberAddress?: string;
}

/** POST …/complete-installation — المبلغ المستلم مطلوب؛ الملاحظة اختيارية (تُخزَّن في CompletedNote) */
export interface EmployeeTaskCompleteInstallationRequest {
  amountReceived: number;
  note?: string;
}

export interface EmployeeTaskCompleteMaintenanceRequest {
  note?: string;
}

export interface EmployeeTaskCompleteAmountReceptionRequest {
  amountReceived: number;
  note?: string;
}

export interface EmployeeTasksQuery {
  page?: number;
  pageSize?: number;
  searchTerm?: string;
  status?: EmployeeTaskStatus;
  agentId?: string;
}

/** GET /EmployeeTasks/agent — أعداد حسب نوع المهمة (نفس الوكيل + status + searchTerm، وليس الصفحة الحالية فقط) */
export interface EmployeeTasksTaskTypeStatistics {
  subscriberInstallation: number;
  subscriberMaintenance: number;
  amountReception: number;
  other: number;
}

/** جسم GET /EmployeeTasks/agent (امتداد للترقيم + taskTypeStatistics) */
export interface EmployeeTasksAgentPageDto extends PaginatedResponse<EmployeeTask> {
  taskTypeStatistics?: EmployeeTasksTaskTypeStatistics;
}

export interface EmployeeTaskMaterialOption {
  id: string;
  name: string;
  quantity: number;
  agentPrice: number;
  subscriberPrice: number;
}

// GET /EmployeeTasks/subscribers — خيارات مشتركي الوكيل (للـ SubscriberMaintenance / استلام مبلغ)
export interface EmployeeTaskSubscriberOption {
  id: string;
  username?: string | null;
  displayName: string;
  phoneNumber?: string | null;
  /** يُعاد من الباكند (بما فيها عند debtOnly=false) */
  totalDebt?: number | null;
}

export interface AgentUpdateRequest {
  fullName: string;
  companyName: string;
  phone: string;
  address: string;
  governorate: IraqGovernorates;
  isActive: boolean;
  subscriptionType: SubscriptionSystemType;
  subscriptionStartDate: string;
  subscriptionEndDate: string;
  renewalPeriod?: number;
  renewalCalculationType?: RenewalCalculationType;
  serviceType?: ServiceType;
  /** إعدادات التفعيل عبر SAS (اختياري) */
  sasBaseUrl?: string;
  sasUsername?: string;
  sasPassword?: string;
  ftthBaseUrl?: string;
  ftthUsername?: string;
  ftthPassword?: string;
  /** معرف جلسة واتساب */
  whatsAppSessionId?: string;
  /** كلمة مرور تسجيل الدخول — اختياري؛ إن لم تُرسل أو تُرك فارغاً لا يُغيّر الخادم كلمة المرور (مثلاً PUT /main-agent/sub-agents/{id}) */
  password?: string;
}

/** POST /Agents/{id}/whatsapp/device — تسجيل الجهاز في Go عبر Wakeel */
export interface WhatsAppDeviceResponse {
  message?: string;
  deviceId?: string;
}

/** POST /Agents/{id}/whatsapp/pair-code */
export interface WhatsAppPairCodeResponse {
  pairCode: string;
  deviceId: string;
  hint?: string;
}

/** GET /Agents/{id}/whatsapp/status */
export interface WhatsAppStatusResponse {
  deviceId: string;
  isConnected: boolean;
  isLoggedIn: boolean;
}

/** بيانات الوكيل المرتبطة بجلسة واتساب (Admin sessions list) */
export interface WhatsAppSessionAgentSummary {
  id: string;
  companyName: string;
  phone: string;
}

/** عنصر من GET /Agents/whatsapp/sessions/devices (قائمة كاملة؛ الفلترة في الفرونت) */
export interface WhatsAppDeviceSession {
  /** يُعرَض من الحقول deviceId أو id في JSON */
  deviceId: string;
  state: string;
  createdAt: string;
  displayName?: string;
  jid?: string;
  agent?: WhatsAppSessionAgentSummary | null;
}

/** استجابة GET /Agents/whatsapp/sessions/devices */
export interface WhatsAppSessionsListResponse {
  count: number;
  items: WhatsAppDeviceSession[];
}

/** GET /Agents/whatsapp/sessions/devices/:device_id */
export interface WhatsAppDeviceDetailResponse extends WhatsAppDeviceSession {
  /** حقول إضافية خام من الـ API للعرض/التشخيص */
  raw?: Record<string, unknown> | null;
}

/** GET /Agents/whatsapp/sessions/devices/:device_id/status */
export interface WhatsAppDeviceStatusAdmin {
  deviceId: string;
  isConnected: boolean;
  isLoggedIn: boolean;
}

/** عنصر واحد من طرق الدفع في معلومات المشترك */
export interface PaymentOption {
  methodName: string;
  details: string;
}

/** إعلان الوكيل لتطبيق المشترك (عنصر في القائمة أو في استجابة معلومات المشترك) */
export interface AgentAnnouncementDto {
  id: string;
  createdAt?: string;
  mainTitle: string;
  subTitle: string;
  phone: string;
  /** لون بداية تدرج كارت الإعلان (مثلاً #2962FF) */
  gradientStart?: string;
  /** لون نهاية تدرج كارت الإعلان (مثلاً #1E40AF) */
  gradientEnd?: string;
}

/** طلب إنشاء/تعديل إعلان — POST/PUT بدون id */
export interface AgentAnnouncementCreateRequest {
  mainTitle: string;
  subTitle: string;
  phone: string;
  gradientStart?: string;
  gradientEnd?: string;
}

/** استجابة GET /api/AppSettings — إعدادات تطبيق المشترك (طرق الدفع المتعددة) */
export interface AppSettingsResponse {
  zainCashEnabled: boolean;
  zainCashNumber: string;
  masterCardEnabled: boolean;
  masterCardNumber: string;
  cashEnabled: boolean;
  cashOfficeAddress: string;
}

/** طلب PUT /api/AppSettings */
export interface AppSettingsUpdateRequest {
  zainCashEnabled: boolean;
  zainCashNumber?: string;
  masterCardEnabled: boolean;
  masterCardNumber?: string;
  cashEnabled: boolean;
  cashOfficeAddress?: string;
}

/** طلب تغيير بيانات الدخول (الوكيل/المدير الثانوي) — PUT /api/Agents/me/credentials */
export interface UpdateMyCredentialsRequest {
  /** كلمة المرور الحالية (مطلوبة للتحقق) */
  currentPassword: string;
  /** اسم المستخدم الجديد (اختياري) */
  newUsername?: string;
  /** كلمة المرور الجديدة (اختياري، 4 أحرف على الأقل) */
  newPassword?: string;
  /** تأكيد كلمة المرور الجديدة (مطلوب عند إرسال newPassword) */
  confirmNewPassword?: string;
}

// Profile/Package Types
export interface Profile {
  id: string;
  name: string;
  originalPrice: number;
  salePrice: number;
  renewalPeriod: number; // فترة التجديد بالأيام
  packageType?: ProfilePackageType;
  /** مواد مرتبطة بباقة «عرض خاص» (عند packageType = SpecialOffer) */
  includedMaterialIds?: string[] | null;
  isActive: boolean;
  createdAt: string;
  agentCompanyName: string;
  agentResellerId?: string | null;
  agentResellerName?: string | null;
}

export interface ProfileCreateRequest {
  name: string;
  originalPrice: number;
  salePrice: number;
  renewalPeriod: number; // فترة التجديد بالأيام
  packageType?: ProfilePackageType;
  includedMaterialIds?: string[];
  isActive?: boolean;
  agentResellerId?: string;
}

export interface ProfileUpdateRequest {
  name: string;
  originalPrice: number;
  salePrice: number;
  renewalPeriod: number; // فترة التجديد بالأيام
  packageType?: ProfilePackageType;
  includedMaterialIds?: string[];
  isActive: boolean;
  agentResellerId?: string;
}

export enum ProfilePackageType {
  Subscription = 1,
  Extension = 2,
  /** عرض خاص — أسعار + مواد اختيارية تُصرف عند التفعيل */
  SpecialOffer = 3,
}

export enum ActivationType {
  Subscription = 1,
  Extension = 2,
}

/** مادة (مواد الوكيل) — GET /api/Materials */
export interface Material {
  id: string;
  name: string;
  imagePngUrl?: string | null;
  quantity: number;
  agentPrice: number;
  subscriberPrice: number;
  dealerPrice: number;
  notes?: string | null;
  agentId?: string;
  createdAt?: string;
  updatedAt?: string;
}

/** طلب إنشاء مادة — POST /api/Materials (أدمن/وكيل/مدير ثانوي) */
export interface MaterialCreateRequest {
  name: string;
  imagePngUrl?: string;
  quantity: number;
  agentPrice: number;
  subscriberPrice: number;
  dealerPrice: number;
  notes?: string;
}

/** طلب تعديل مادة — PUT /api/Materials/{id} */
export interface MaterialUpdateRequest {
  name: string;
  imagePngUrl?: string;
  quantity: number;
  agentPrice: number;
  subscriberPrice: number;
  dealerPrice: number;
  notes?: string;
}

/** نوع صرف المادة — يطابق DisbursementType في الباكند */
export enum DisbursementType {
  /** سحب */
  Replacement = 0,
  /** بيع */
  Sale = 1,
  /** باقة عرض خاص */
  SpecialOfferPackage = 2,
}

/** طلب صرف/بيع مادة — POST /api/Materials/disburse. SubscriberId اختياري (null عند البيع/التبديل بدون مشترك). */
export interface MaterialDisburseRequest {
  materialId: string;
  /** اختياري — يمكن عدم إرساله أو null عند البيع/التبديل بدون مشترك */
  subscriberId?: string | null;
  /** اختياري — عند البيع لوكيل. لا يُرسل مع subscriberId. */
  dealerId?: string | null;
  disbursementType: number;
  quantity: number;
  /** قيمة افتراضية 0 — يمكن عدم إرساله أو 0 عند عدم وجود مبلغ مدفوع */
  pricePaidBySubscriber?: number;
  notes?: string;
}

/** سجل صرف مادة — GET /api/Materials/disbursements */
export interface MaterialDisbursement {
  id: string;
  materialId: string;
  materialName: string;
  materialAgentPrice: number;
  materialSubscriberPrice: number;
  subscriberId?: string;
  subscriberName?: string;
  subscriberPhone?: string;
  dealerId?: string;
  dealerName?: string;
  dealerPhone?: string;
  disbursedByUserId: string;
  disbursedByUserName: string;
  disbursementType: number;
  quantity: number;
  unitSubscriberPrice: number;
  pricePaidBySubscriber: number;
  materialDebt: number;
  notes: string;
  createdAt: string;
  /** رقم الفاتورة (يُملأ عند البيع فقط، شكل: 6 أرقام + حرفان مثل 482917AB) */
  invoiceNumber?: string;
  /** عدد الوحدات المسترجعة من هذا الصرف */
  returnedQuantity?: number;
}

/** طلب استرجاع مادة — POST /api/Materials/disbursements/return (الباكند يبحث بالسجل باستخدام رقم الفاتورة + الوكيل) */
export interface MaterialReturnRequest {
  invoiceNumber: string;
  quantity: number;
  notes?: string;
}

/** إحصائيات المواد المصروفة (ضمن استجابة GET /api/Materials/disbursements) */
export interface MaterialDisbursementsStatistics {
  soldQuantity: number;
  replacedQuantity: number;
  totalMaterialDebt: number;
  totalSaleAmount: number;
  /** وحدات صرفت ضمن باقة عرض خاص (نفس نطاق الإحصائيات) */
  specialOfferPackageQuantity?: number;
}

/** استجابة GET /api/Materials/disbursements مع الترقيم والإحصائيات */
export interface MaterialDisbursementsResponse {
  data: MaterialDisbursement[];
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  statistics?: MaterialDisbursementsStatistics;
}

/** معاملات جلب الباقات (مطابقة GET /api/Subscribers/profiles) */
export interface ProfileListParams {
  page?: number;
  pageSize?: number;
  searchTerm?: string;
  sortBy?: string;
  sortDescending?: boolean;
  status?: number; // 1 نشط، 0 غير نشط، عدم الإرسال = الكل
  resellerId?: string;
}

// Subscriber Types

/** أنواع رسائل واتساب المسجّلة — GET /api/Subscribers/{id} → whatsAppMessaging */
export type SubscriberWhatsAppSendKind = 'activation' | 'alert' | 'debtAlert' | 'details' | 'custom';

export interface SubscriberWhatsAppMessageTypeSummary {
  anyAttempt?: boolean;
  anySuccess?: boolean;
  attemptCount?: number;
  lastAttemptAt?: string | null;
  lastSuccess?: boolean | null;
  lastError?: string | null;
  lastExternalMessageId?: string | null;
}

export interface SubscriberWhatsAppSendLogItem {
  kind: SubscriberWhatsAppSendKind | string;
  success: boolean;
  sentAt: string;
  externalMessageId?: string | null;
  errorMessage?: string | null;
  /** true عند الإرسال التلقائي بعد إنشاء المشترك (مثل activation) */
  automatic?: boolean;
}

/** ملخص إرسالات واتساب + آخر محاولات — من GET /api/Subscribers/{id} (قد يكون null في القوائم) */
export interface SubscriberWhatsAppMessaging {
  activation?: SubscriberWhatsAppMessageTypeSummary | null;
  alert?: SubscriberWhatsAppMessageTypeSummary | null;
  debtAlert?: SubscriberWhatsAppMessageTypeSummary | null;
  details?: SubscriberWhatsAppMessageTypeSummary | null;
  custom?: SubscriberWhatsAppMessageTypeSummary | null;
  recentSends?: SubscriberWhatsAppSendLogItem[] | null;
}

/** سجل صيانة من مهام الموظفين (SubscriberMaintenance مكتملة) — GET /api/Subscribers/{id} */
export interface SubscriberMaintenanceRecordDto {
  taskId: string;
  employeeUserId: string;
  employeeName: string;
  maintenanceType: SubscriberMaintenanceKind | number;
  completedNote?: string | null;
  createdAt?: string | null;
  acceptedAt?: string | null;
  completedAt?: string | null;
  /** مدة التنفيذ بالثواني */
  durationSeconds?: number | null;
  /** قد يكون نصاً أو تنسيقاً من الباكند */
  taskDuration?: string | null;
}

export interface Subscriber {
  id: string;
  /** معرف الاشتراك (اختياري) */
  secruptionId?: string | null;
  /** FTTH: subscriptionId (مثال 8433625) */
  ftthSubscriptionId?: string | null;
  /** FTTH: customerId (مثال 2319750) */
  ftthCustomerId?: string | null;
  username: string;
  firstName: string;
  lastName: string;
  fullName: string;
  phoneNumber: string;
  noteType?: SubscriberNoteType | null;
  note?: string;
  isActive: boolean;
  /** اشتراك المشترك فعّال (لم ينتهِ). يُستخدم لعرض "فعال" وعدّ المشتركين الفعالين بدلاً من التحقق من status. */
  isSubscriptionActive?: boolean;
  activationDate: string;
  expirationDate?: string;  // اختياري لأنه قد لا يكون موجوداً في بعض الحالات
  subscriptionType: SubscriptionType;
  status: SubscriptionStatus;
  paymentStatus: PaymentStatus;
  /** طريقة الدفع من الباكند: مثل Card أو Wallet */
  paymentMethod?: string | null;
  daysUntilExpiry: number;
  /** نص من الخادم يصف المدة المتبقية حتى الانتهاء (إن وُجد) */
  daysUntilExpiryText?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  profileId?: string;  // إضافة profileId من الباكند
  profileName: string;
  profilePrice: number;
  agentCompanyName: string;
  /** معرف الوكيل */
  agentId?: string | null;
  /** معرف رسيلر الوكيل المرتبط بالمشترك (إن وُجد) — يُستخدم عند فتح رابط التفعيل */
  agentResellerId?: string | null;
  /** اسم المنطقة/الرسيلر المرتبط بالمشترك (إن وُجد) */
  agentResellerName?: string | null;
  totalDebt?: number;
  /** الكابينة (اختياري، حد أقصى 200 حرف) */
  fat?: string | null;
  /** المنطقة (اختياري، حد أقصى 200 حرف) */
  zone?: string | null;
  /** صيانات مكتملة مرتبطة بالمشترك (من مهام الموظفين)، من الأحدث للأقدم */
  maintenanceRecords?: SubscriberMaintenanceRecordDto[];
  /** ملخص إرسالات واتساب وسجل محاولات (يُملأ من تفاصيل المشترك بالمعرّف) */
  whatsAppMessaging?: SubscriberWhatsAppMessaging | null;
}

export interface SubscriberCreateRequest {
  /** معرف الاشتراك (اختياري، حد أقصى 100 حرف) */
  secruptionId?: string;
  ftthSubscriptionId?: string;
  ftthCustomerId?: string;
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  noteType?: SubscriberNoteType | null;
  note?: string;
  profileId: string;
  activationDate: string;
  expirationDate: string;
  subscriptionType: SubscriptionType;
  /** الكابينة (اختياري، حد أقصى 200 حرف) */
  fat?: string;
  /** المنطقة (اختياري، حد أقصى 200 حرف) */
  zone?: string;
  /** مطلوب — رسيلر/منطقة الوكيل؛ الباقة يجب أن تكون مربوطة بنفس الرسيلر */
  agentResellerId: string;
}

/** PATCH /Subscribers/{id}/notes — تحديث نوع الملاحظة والنص فقط */
export interface SubscriberNotesPatchDto {
  noteType?: number;
  clearNoteType?: boolean;
  note?: string;
  clearNote?: boolean;
}

export interface SubscriberUpdateRequest {
  secruptionId?: string;
  ftthSubscriptionId?: string;
  ftthCustomerId?: string;
  username: string;
  password?: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  noteType?: SubscriberNoteType | null;
  note?: string;
  profileId?: string;
  isActive: boolean;
  activationDate: string;
  expirationDate: string;
  subscriptionType?: SubscriptionType;
  fat?: string;
  zone?: string;
  /** مطلوب — نفس قيمة المشترك من GET (الرسيلر التابع لوكيل المشترك) */
  agentResellerId: string;
}

// Dashboard Stats (قديم — يُستخدم كـ fallback إن لزم)
export interface DashboardStats {
  totalSubscribers: number;
  activeSubscribers: number;
  expiringSoonSubscribers: number;
  expiredSubscribers: number;
}

/** إحصائيات لوحة الوكيل الرئيسي من GET /main-agent/dashboard */
export interface MainAgentDashboardDto {
  totalSubscribersCount: number;
  subAgentsCount: number;
  expiredSubscribersCount: number;
  activeSubscribersCount: number;
  totalDebtsAmount: number;
  totalIncomingAmount: number;
}

/** إحصائيات لوحة التحكم من GET /Subscribers/dashboard */
export interface SubscribersDashboardStats {
  total: number;
  active: number;
  online: number;
  expiringWithin3Days: number;
  offline: number;
  expired: number;
  /** مجموع amountPaid ضمن فترة الوارد */
  incomingAmount?: number;
  /** مجموع ربح التفعيل (FinalPrice − OriginalPrice) ضمن نفس فترة الوارد والفلاتر */
  totalActivationProfit?: number;
  /** مجموع ربح تحويلات الوكلاء ضمن نفس فترة fromDate/toDate (مطابق لمجموع الربح في قائمة التحويلات عند نفس الفترة) */
  totalProfitAmount?: number;
  /** بداية الفترة التي حُسب بها الوارد */
  incomingFromDate?: string | null;
  /** نهاية الفترة التي حُسب بها الوارد */
  incomingToDate?: string | null;
  /** إجمالي الديون غير المدفوعة (للمشتركين ضمن نطاق الوكيل/الفلاتر) */
  totalDebtAmount?: number;
  /** إجمالي مبيعات المواد (صرف نوع بيع) ضمن نفس فترة fromDate/toDate */
  totalMaterialSales?: number;
  /** عند تمرير resellerId: رصيد التفعيل لتلك المنطقة */
  regionalBalanceIqd?: number | null;
  /** رصيد SAS الحالي (كنص من الباكند مثل "IQD 500,000") — يظهر فقط لوكيل نوعه SAS */
  sasBalance?: string | null;
  /** عدد المشتركين الأونلاين حالياً من لوحة SAS — يظهر فقط لوكيل نوعه SAS */
  sasOnlineUsers?: number | null;
}

/** نوع الحركة في سجل النشاط */
export enum ActivityType {
  ActivateSubscriber = 1, // تفعيل مشترك
  AddSubscriber = 2, // إضافة مشترك
  DeleteSubscriber = 3, // حذف مشترك
  UpdateSubscriber = 4, // تعديل مشترك
  PayDebt = 5, // تسديد دين
  MaterialDisbursement = 6, // صرف مادة
  MaterialReturn = 7, // استرجاع مادة من المشترك
  AddProfile = 8, // إضافة باقة
  UpdateProfile = 9, // تعديل باقة
  DeleteProfile = 10, // حذف باقة
  BalanceTopUp = 11, // تعبئة الرصيد
  BalanceUpdate = 12, // تعديل رصيد
  BalanceDelete = 13, // حذف رصيد
  /** قيد محاسبي بين عملاء فواتير العملاء — يجب أن يطابق قيمة الـ API في GET /admin/activity-log/activity-types */
  CustomerInvoiceJournalEntry = 14,
}

/** تسميات عربية لـ ActivityType (للفلاتر والعرض الاحتياطي) */
export const ACTIVITY_TYPE_LABELS_AR: Record<ActivityType, string> = {
  [ActivityType.ActivateSubscriber]: 'تفعيل مشترك',
  [ActivityType.AddSubscriber]: 'إضافة مشترك',
  [ActivityType.DeleteSubscriber]: 'حذف مشترك',
  [ActivityType.UpdateSubscriber]: 'تعديل مشترك',
  [ActivityType.PayDebt]: 'تسديد دين',
  [ActivityType.MaterialDisbursement]: 'صرف مادة',
  [ActivityType.MaterialReturn]: 'استرجاع مادة من المشترك',
  [ActivityType.AddProfile]: 'إضافة باقة',
  [ActivityType.UpdateProfile]: 'تعديل باقة',
  [ActivityType.DeleteProfile]: 'حذف باقة',
  [ActivityType.BalanceTopUp]: 'تعبئة الرصيد',
  [ActivityType.BalanceUpdate]: 'تعديل رصيد',
  [ActivityType.BalanceDelete]: 'حذف رصيد',
  [ActivityType.CustomerInvoiceJournalEntry]: 'قيد محاسبي — فواتير العملاء',
};

export interface ActivityLogItem {
  /** معرف السجل إن وُجد من الـ API */
  id?: string;
  actorName: string;
  actorUsername: string;
  activityType: ActivityType;
  activityTypeName: string;
  /** نص تفصيلي من الخادم (مثل عمليات الرصيد) */
  details?: string;
  subscriberName: string;
  subscriberUsername: string;
  createdAt: string;
}

/** فلتر سجل الحركات (اختياري) — يمرّر كـ query للـ API */
export interface ActivityLogFilterParams {
  activityType?: ActivityType;
  subscriberName?: string;
  fromDate?: string;
  toDate?: string;
}

/** عنصر من GET /admin/activity-log/activity-types — قيمة النوع والتسمية للعرض */
export interface ActivityLogActivityTypeOption {
  value: number;
  name: string;
}

/** طلب إنشاء موظف لوكيل — يُرسل إلى POST /api/Agents/me/employees أو POST /api/Agents/:id/employees */
export interface AgentEmployeeCreateRequest {
  username: string;
  fullName: string;
  password: string;
  /** دور المستخدم: 4 = Employee (موظف)، 5 = SubAgent (مدير ثانوي). القيمة الافتراضية 4. القيم المسموحة في الـ API هما هذان فقط. */
  role?: UserRole;
  /** صلاحيات الموظف (اختيارية، افتراضيها true في الباكند) */
  canActivateSubscriber?: boolean;
  canEditSubscriber?: boolean;
  canDeleteSubscriber?: boolean;
  canPayDebt?: boolean;
  canAccessAccounts?: boolean;
  canEditAccountsLedger?: boolean;
  canAccessDealers?: boolean;
  canAccessInvoices?: boolean;
  canAccessExpensesAndSalarySheet?: boolean;
  canAccessSubscriberDashboard?: boolean;
  canViewAllSubscribers?: boolean;
  canReceiveTaskRequests?: boolean;
  canManageEmployeeTasks?: boolean;
  canManageMaterialsAndSales?: boolean;
  allowedResellerIds?: string[];
}

/** طلب تعديل موظف لوكيل */
export interface AgentEmployeeUpdateRequest {
  fullName: string;
  isActive?: boolean;
  canActivateSubscriber?: boolean;
  canEditSubscriber?: boolean;
  canDeleteSubscriber?: boolean;
  canPayDebt?: boolean;
  canAccessAccounts?: boolean;
  canEditAccountsLedger?: boolean;
  canAccessDealers?: boolean;
  canAccessInvoices?: boolean;
  canAccessExpensesAndSalarySheet?: boolean;
  canAccessSubscriberDashboard?: boolean;
  canViewAllSubscribers?: boolean;
  canReceiveTaskRequests?: boolean;
  canManageEmployeeTasks?: boolean;
  canManageMaterialsAndSales?: boolean;
  allowedResellerIds?: string[];
}

/** عنصر رصيد منطقة من GET /Renewals/balance */
export interface AgentResellerBalanceItem {
  id: string;
  name: string;
  balanceIqd: number;
}

/** تفاصيل الرصيد: الإجمالي = الرصيد العام + أرصدة المناطق */
export interface AgentBalanceDetail {
  balanceIqd: number;
  agentPoolBalanceIqd: number;
  resellerBalances?: AgentResellerBalanceItem[] | null;
}

/** GET /providers/fiberx/latest-topup/preview — معاملة التعبئة الأحدث من FiberX */
export interface FiberxLatestTopUpTransaction {
  uuid: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  paymentMethod?: string | null;
  description?: string | null;
  status?: string | null;
  createdAt?: string | null;
}

export interface FiberxLatestTopUpPreviewResponse {
  resellerId: string;
  resellerName: string;
  currentResellerBalanceIqd: number;
  alreadyRegistered: boolean;
  suggestedRecipientName?: string | null;
  transaction?: FiberxLatestTopUpTransaction | null;
  /** خطأ جلب المعاينة (واجهة فقط) */
  fetchError?: string | null;
}

/** طلب تعبئة رصيد الوكيل */
export interface BalanceTopUpRequest {
  amountIqd: number;
  recipientName: string;
  companyName: string;
  topUpDate?: string; // ISO date "YYYY-MM-DD"
  /** إلزامي عند وجود مناطق للوكيل */
  agentResellerId?: string;
}

/** استجابة تعبئة الرصيد */
export type BalanceTopUpResponse = AgentBalanceDetail;

/** سجل تعبئة رصيد */
export interface AgentBalanceTopUp {
  id: string;
  amountIqd: number;
  recipientName: string;
  companyName: string;
  topUpDate: string;
  createdAt: string;
  agentResellerId?: string | null;
  agentResellerName?: string | null;
}

/** استجابة GET /Renewals/balance/topups بعد إضافة الباجنيشن */
export interface AgentBalanceTopUpsPage {
  data: AgentBalanceTopUp[];
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// Renewal Receipt Types
export interface RenewalReceipt {
  id: string;
  receiptNumber: string;
  amount?: number | null;
  issueDate?: string | null;
  notes?: string;
  renewalId?: string | null;
  finalPrice: number;
  amountPaid: number;
  remainingAmount: number;
  discountAmount: number;
  discountPercent: number;
  renewalPeriod: number;
  renewalDays: number;
  renewalDate: string;
  newExpirationDate: string;
  paymentStatus: number;
  activationType?: ActivationType;
  wiFiCode: string;
  wiFiQRCode?: WiFiQRCode;
  createdAt: string;
  updatedAt?: string | null;
  subscriberId: string;
  /** اسم المستخدم للمشترك (في لوحة SAS/FTTH) — يُستخدم في تصدير Excel التفعيلات */
  subscriberUsername?: string | null;
  subscriberName: string;
  subscriberPhone: string;
  subscriberWiFiCode?: string | null;
  profileName?: string | null;
  oldProfileName: string;
  newProfileName: string;
  newProfileOriginalPrice: number;
  newProfileSalePrice: number;
  agentCompanyName: string;
  agentPhone?: string | null;
  agentAddress?: string | null;
  /** الفاتورة المرتبطة بالتجديد إن وُجدت (من الباكند) */
  createdReceipt?: unknown | null;
  /** من قام بالتفعيل — للطباعة؛ يدعمها الخادم عند الإرجاع (أو حقول بديلة في الاستجابة) */
  organizerName?: string | null;
  createdByUserName?: string | null;
  activatedByUserName?: string | null;
  employeeName?: string | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/** استجابة GET /api/Debts أو /api/Debts/overdue-unpaid — تحتوي إجمالي الديون المطابقة للاستعلام (كل الصفحات) */
export interface DebtsListResponse extends PaginatedResponse<Debt> {
  /** إجمالي مبالغ الديون المطابقة للاستعلام (كل الصفحات وليس الصفحة الحالية فقط) */
  totalDebtAmount?: number;
}

/** إحصائيات قائمة الوكلاء (مرتبطة بتتبع آخر دخول وانتهاء الاشتراك) */
export interface AgentsListStatistics {
  /** وكلاء سجّلوا دخولاً خلال آخر 24 ساعة */
  activeCount: number;
  /** وكلاء لم يسجّلوا دخولاً خلال 24 ساعة أو LastLoginAt == null */
  offlineCount: number;
  /** وكلاء منتهي اشتراكهم (SubscriptionEndDate <= الآن) */
  expiredSubscriptionCount: number;
}

/** استجابة GET /api/Agents مع الإحصائيات */
export interface AgentsListResponse extends PaginatedResponse<Agent> {
  statistics?: AgentsListStatistics;
}

// Renewal History Types
export interface RenewalHistory {
  id: string;
  receiptNumber: string;
  finalPrice: number;
  amountPaid: number;
  remainingAmount: number;
  discountAmount: number;
  discountPercent: number;
  renewalPeriod: number;
  renewalDays: number;
  renewalDate: string;
  newExpirationDate: string;
  paymentStatus: number;
  notes: string;
  wiFiCode: string | null;
  wiFiQRCode?: WiFiQRCode;
  createdAt: string;
  updatedAt: string | null;
  subscriberId: string;
  subscriberName: string;
  subscriberPhone: string;
  oldProfileName: string;
  newProfileName: string;
  newProfileOriginalPrice: number;
  newProfileSalePrice: number;
  agentCompanyName: string;
}

export interface ProfitStats {
  totalProfit: number;
  totalAmountPaid: number;
  totalOriginalPrice: number;
  averageProfitPercentage: number;
  /** عدد التجديدات في الصفحة الحالية */
  totalRenewals: number;
}

export interface DateRangeRequest {
  startDate: string;
  endDate: string;
}

/** GET /Accounts — سجل الحركة في دفتر الحسابات */
export type AccountLedgerEntryKind = 'DebtPayment' | 'Renewal';

/** نوع باقة التجديد في سجل /Accounts (لكل صف) */
export type AccountLedgerPackageType = 1 | 2 | 3;

/** عنصر قائمة «جهة المبلغ الواصل» من الخادم (مثلاً GET /Accounts أو GET /Renewals/subscriber/...) */
export interface SubscriberNoteTypeOption {
  value: number;
  label: string;
}

export interface AccountLedgerEntry {
  kind: AccountLedgerEntryKind;
  id: string;
  renewalDate: string;
  createdAt?: string | null;
  amount: number;
  subscriberId: string;
  subscriberName?: string | null;
  username?: string | null;
  /** اسم الباقة (الملف الشخصي) كما يعيده الخادم */
  profileName?: string | null;
  agentResellerId?: string | null;
  receiptNumber?: string | null;
  debtId?: string | null;
  /** 1 اشتراك، 2 تمديد اشتراك، 3 اشتراك عرض خاص */
  packageType?: number | null;
  /** ملاحظات التجديد من الخادم (صفوف Renewal فقط عادةً) */
  notes?: string | null;
  /** قيمة نوع جهة المبلغ الواصل (SubscriberNoteType في الباكند) */
  subscriberNoteType?: number | null;
  /** تسمية جهة المبلغ الواصل كما يعيدها الخادم للصف */
  subscriberNoteTypeLabel?: string | null;
  extension?: { count?: number } | null;
  /** من نفّذ التفعيل أو التسديد */
  executedByUserId?: string | null;
  executedByFullName?: string | null;
  /** ربح التفعيل لصف التجديد؛ null لصفوف تسديد الدين (DebtPayment) */
  activationProfit?: number | null;
}

/** استجابة PUT /Accounts/ledger/{renewalId}/profile */
export interface UpdateAccountsLedgerProfileResponse {
  balanceRefunded: number;
  balanceDeducted: number;
  resellerBalanceIqd?: number | null;
  agentBalanceIqd?: number | null;
  ledgerEntry: AccountLedgerEntry;
}

export interface AccountsLedgerPage {
  data: AccountLedgerEntry[];
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/** GET /Accounts — ملخص + ترقيم السجل */
export interface AccountsResponse {
  amountPaid: number;
  subscriberTotalDebt: number;
  totalReceived: number;
  /** مجموع أرباح التفعيل لنفس فلاتر التاريخ/المنطقة/المنفّذ */
  totalActivationProfit?: number;
  /** عدد التمديدات (مستوى الاستجابة، ليس لكل صف فقط) */
  extension?: { count?: number } | null;
  /** قائمة أنواع/جهات المبلغ الواصل للعرض في الواجهة ومودال التفعيل */
  subscriberNoteTypes?: SubscriberNoteTypeOption[];
  ledger: AccountsLedgerPage;
}

/** GET /AccountsOtherDealer — سجل تفعيلات «وكيل آخر» */
export interface AccountsOtherDealerEntry {
  id: string;
  renewalId?: string | null;
  renewalDate?: string | null;
  subscriberName?: string | null;
  dealerFullName?: string | null;
  packageType?: number | null;
  profileName?: string | null;
  renewalPeriod?: number | null;
  notes?: string | null;
  debtAmount?: number | null;
  activationProfit?: number | null;
  executedByUserId?: string | null;
  executedByFullName?: string | null;
  agentResellerId?: string | null;
  agentResellerName?: string | null;
}

export interface AccountsOtherDealerLedgerPage {
  data: AccountsOtherDealerEntry[];
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface AccountsOtherDealerReportResponse {
  ledger: AccountsOtherDealerLedgerPage;
  /** مجموع ربح التفعيل لكل السجلات المطابقة للفلاتر (وليس صفحة الترقيم فقط) */
  totalActivationProfit?: number;
  /** مجموع debtAmount لنفس المجموعة */
  totalDebtAmount?: number;
}

/** صف معاملة من GET /providers/fiberx/getCashbackfiberxsubscriptionsapp */
export interface FiberxCashbackAppSubscriptionRow {
  id: string;
  userId?: number | null;
  amount: number;
  type?: string | null;
  serviceType?: string | null;
  profileId?: string | null;
  status?: string | null;
  title?: string | null;
  salveId?: string | null;
  description?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  username?: string | null;
  usernameId?: string | null;
  /** تفعيل من تطبيق المشترك */
  isMobile?: boolean;
  /** مثل MobileActivationsAPI */
  apiKeyName?: string | null;
  /** طريقة الدفع من الباكند: Card / Wallet / Direct Payment */
  paymentMethod?: string | null;
}

export interface FiberxCashbackAppPagination {
  total: number;
  perPage: number;
  currentPage: number;
  lastPage: number;
}

export interface FiberxCashbackAppSubscriptionsResponse {
  message?: string;
  data: FiberxCashbackAppSubscriptionRow[];
  pagination: FiberxCashbackAppPagination;
}

/** سجل أرباح حسابات مشتركين FiberX — GET/POST/PUT/DELETE /api/FiberxCashbackSubscriberAccounts */
export interface FiberxCashbackSubscriberAccount {
  id: string;
  /** قد يعود من API باسم resellerId أو AgentResellerId */
  resellerId?: string | null;
  agentResellerId?: string | null;
  /** اسم المنطقة الجاهز من الخادم */
  resellerName?: string | null;
  username: string;
  amount: number;
  createdByUserId?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  /** عنوان العملية من FiberX (تتضمن اسم الباقة في النص) */
  title?: string | null;
}

export interface FiberxCashbackSubscriberAccountsListParams {
  fromDate?: string;
  toDate?: string;
  username?: string;
  resellerId?: string;
  page?: number;
  pageSize?: number;
}

export interface FiberxCashbackSubscriberAccountsListResponse {
  items: FiberxCashbackSubscriberAccount[];
  totalAmount?: number;
  count?: number;
  statistics?: {
    totalAmount?: number;
  };
}

export interface FiberxCashbackSubscriberAccountCreateRequest {
  resellerId: string;
  username: string;
  amount: number;
}

export interface FiberxCashbackSubscriberAccountUpdateRequest {
  resellerId: string;
  username: string;
  amount: number;
}

// Daily Account / Handovers
export interface DailyHandover {
  id: string;
  handoverDate: string;
  amount: number;
  handedByName: string;
  receivedByName: string;
  notes?: string | null;
  createdAt: string;
  /** إن وُجد من الـ API — لملء نموذج التعديل */
  receivedByUserId?: string | null;
  receivedByAgentId?: string | null;
}

export interface DailyAccountResponse {
  summaryDate?: string;
  incomingAmount: number;
  dailyDebtPayments?: number;
  debtTotal: number;
  /** إجمالي البيع (من الباكند إن وُجد، وإلا يُستخدم incomingTotal) */
  salesTotal?: number;
  /**
   * صافي الوارد لليوم: Max(0، (مبيعات + وارد تفعيلات بعد التسليم + مدفوعات ديون اليوم) − مجموع سلف ذلك اليوم).
   * يوم التقويم كما في الحساب اليومي (العراق).
   */
  incomingTotal: number;
  /** مجموع سلف الموظفين المسحوبة في ذلك اليوم (WithdrawalDate كيوم تقويم، بما يطابق يوم الحساب اليومي) */
  dailySalaryAdvancesTotal?: number;
  /** مجموع مبيعات المخزن لذلك اليوم (من صرف نوع Sale فقط) */
  totalSaleAmount?: number;
  handovers: DailyHandover[];
}

export interface DailyHandoverRecipient {
  userId: string;
  agentId?: string | null;
  fullName: string;
  displayName: string;
}

export interface DailyHandoverCreateRequest {
  amount: number;
  receivedByUserId?: string;
  receivedByAgentId?: string;
  /** yyyy-MM-dd (optional) */
  handoverDate?: string;
  notes?: string;
}

/** جسم PUT /Renewals/daily-handover/{id} — نفس حقول الإنشاء */
export type DailyHandoverUpdateRequest = DailyHandoverCreateRequest;

// Debt Types
/** حالة إطفاء/تشغيل المشترك على الدين (من الباكند) */
export enum DebtOffOn {
  Off = 0,
  On = 1,
}

export interface Debt {
  id: string;
  subscriberId: string;
  agentId?: string;
  amount: number;
  description: string;
  dueDate: string;
  isPaid?: boolean;
  paidDate?: string;
  createdAt: string;
  updatedAt?: string;
  subscriberName: string;
  agentName?: string;
  notes?: string;
  status: DebtStatus;
  /** إطفاء / تشغيل المشترك (Off = 0، On = 1) */
  offOn?: DebtOffOn;
  // Additional fields from API response (الباكند يعتمد dueDate فقط لتاريخ التسديد)
  subscriberPhone?: string;
  agentCompanyName?: string;
  createdByUserName?: string;
  subscriberTotalDebt?: number;
  /** معرف المشترك (SecruptionId) — يُرجَع من الباكند لاستخدامه في رابط التفعيل FTTH/SAS */
  secruptionId?: string;
  /** حقول اختيارية عندما يكون الدين مرتبطاً بصرف مادة (دين مواد) */
  materialName?: string;
  materialQuantity?: number;
  materialPricePaid?: number;
  materialDebtAmount?: number;
  materialDisbursementDate?: string;
  /** تاريخ/وقت إنشاء آخر تسديد (يُرجع بعد POST تسديد دين، وفي قائمة الديون قد يكون null) */
  paymentCreatedAt?: string | null;
}

export interface DebtCreateRequest {
  subscriberId: string;
  amount: number;
  description: string;
  /** ISO datetime string */
  dueDate: string;
  notes?: string;
  /** اختياري — إن لم يُرسَل يُستخدم On */
  offOn?: DebtOffOn;
}

export interface DebtUpdateRequest {
  amount: number;
  description: string;
  /** ISO datetime string */
  dueDate: string;
  notes?: string;
  /** اختياري — يُرسل عند تغيير حالة إطفاء/تشغيل المشترك */
  offOn?: DebtOffOn;
}

export interface DebtPaymentRequest {
  paymentAmount: number;
  notes?: string;
}

// GET /Debts/subscriber/{subscriberId}/total يرجّع رقم فقط
export type SubscriberDebtTotal = number;

// WiFi QR Code Types
export interface WiFiQRCode {
  ssid: string;
  password: string;
  encryption: number;
  isHidden: boolean;
}

/** وضع التفعيل — يتوافق مع Wakeel RenewalActivationMode */
export enum RenewalActivationMode {
  /** تفعيل كامل؛ المتبقي → دين مشترك (Debts) */
  Full = 0,
  /** تفعيل لوكيل آخر؛ يتطلب dealerId؛ المتبقي → DealerDebt */
  OtherDealer = 1,
}

// Renewal Types
export interface RenewalData {
  subscriberId: string;
  newProfileId: string;
  paymentStatus: PaymentStatus;
  overrideSalePrice?: number;
  amountPaid?: number;
  notes?: string;
  /** جهة المبلغ الواصل — قيمة من subscriberNoteTypes */
  subscriberNoteType?: number | null;
  wifiCode?: string;
  wiFiQRCode?: WiFiQRCode;
  remainingAmount?: number;
  debtDescription?: string;
  /** تاريخ تسديد الدين (يدوي) عند وجود متبقي */
  debtDueDate?: string;
  /** يوم استلام/تجديد الحساب yyyy-MM-dd؛ إن وُجد يُرسل كـ renewalDate؛ بدون الحقل يستخدم الخادم UtcNow */
  renewalDate?: string;
  // إضافة معلومات إضافية لمساعدة الباكند على حساب التاريخ بشكل صحيح
  currentExpirationDate?: string;
  renewalPeriod?: number;
  /** 0 تفعيل كامل | 1 تفعيل لوكيل آخر */
  activationMode?: RenewalActivationMode;
  /** مطلوب عند activationMode === OtherDealer — معرف التاجر (GET /Dealers) */
  dealerId?: string;
}

export interface SubscriberRenewalInfo {
  subscriberId: string;
  subscriberName: string;
  subscriberPhone: string;
  currentProfile: {
    id: string;
    name: string;
    price: number;
  };
  expirationDate: string;
  daysUntilExpiry: number;
  availableProfiles: Profile[];
}

// Agent Renewal Types
export interface AgentRenewalRequest {
  newSubscriptionEndDate: string;
  newSubscriptionType: SubscriptionSystemType;
}

export interface AgentSubscriptionCheck {
  expiredAgents: Agent[];
  totalExpired: number;
}

// Theme Types
export type Theme = 'light' | 'dark' | 'system';

// API Response Types
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
}

// Excel Import Types
export interface ExcelImportAgent {
  id: string;
  username: string;
  fullName: string;
  companyName: string;
  phone: string;
  address: string;
  governorate: IraqGovernorates;
  isActive: boolean;
  subscriptionType: SubscriptionSystemType;
  subscriptionStartDate: string;
  subscriptionEndDate: string;
  isSubscriptionExpired: boolean;
  daysUntilExpiry: number;
  createdAt: string;
  updatedAt?: string;
  createdByUserName: string;
}

export interface ExcelImportRequest {
  agentId: string;
  file: File;
}

export interface ExcelImportResponse {
  success: boolean;
  message: string;
  importedCount?: number;
  failedCount?: number;
  errors?: string[];
  importLogId?: string;
  totalRecords?: number;
  successCount?: number;
  errorCount?: number;
  errorDetails?: string;
  importDate?: string;
}

// Pagination Types
export interface PaginatedResponse<T> {
  data: T[];
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  totalCount: number;
  pageNumber: number;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  role?: string;
  sortBy?: string;
  sortDescending?: boolean;
  /** المشتركون الذين سينتهي اشتراكهم خلال 0..N يوم (يشمل المنتهي، 0 يوم) */
  maxDaysUntilExpiry?: number;
  /** فلترة بالمطابقة الجزئية على الكابينة (Fat) */
  fat?: string;
  /** فلترة بالمطابقة الجزئية على الزون */
  zone?: string;
  /** فلترة حسب نوع الملاحظة (SubscriberNoteType) */
  noteType?: SubscriberNoteType;
  /** تاريخ انتهاء الاشتراك من — المشتركون الذين انتهاؤهم ≥ هذا التاريخ (yyyy-MM-dd) */
  expirationFromDate?: string;
  /** تاريخ انتهاء الاشتراك إلى — المشتركون الذين انتهاؤهم ≤ هذا التاريخ (yyyy-MM-dd) */
  expirationToDate?: string;
  /** فلترة حسب الرسيلر/المنطقة */
  resellerId?: string;
  /** فلترة المشتركين الذين لديهم تفعيل تمديد */
  hasExtensionActivation?: boolean;
}

/** معاملات استعلام قائمة الديون (GET /api/Debts) */
export interface DebtsListParams extends Omit<PaginationParams, 'status'> {
  searchTerm?: string;
  sortBy?: string;
  sortDescending?: boolean;
  /** حالة الدين (DebtStatus) — يرسل كـ DebtStatus في الباكند */
  status?: DebtStatus;
  maxDaysUntilExpiry?: number;
  fat?: string;
  zone?: string;
  noteType?: SubscriberNoteType;
  /** وصف الدين (مطابقة جزئية) — يرسل كـ DebtDescription */
  debtDescription?: string;
  /** تاريخ استلام الدين من — ISO 8601، يرسل كـ paymentCreatedAtFrom */
  paymentCreatedAtFrom?: string;
  /** تاريخ استلام الدين إلى — ISO 8601، يرسل كـ paymentCreatedAtTo */
  paymentCreatedAtTo?: string;
  /** فلترة ديون مشتركي منطقة معيّنة (نفس مفتاح المشتركين) */
  resellerId?: string;
}

// --- مصاريف المكتب (Office Expenses) ---
export interface OfficeExpense {
  id: string;
  name: string;
  amount: number;
  expenseDate: string;
  isPaid: boolean;
  paidAt: string | null;
  notes?: string | null;
  agentId?: string;
  createdAt?: string;
  updatedAt?: string | null;
}

export interface OfficeExpenseCreateRequest {
  name: string;
  amount: number;
  expenseDate: string;
  notes?: string | null;
}

export interface OfficeExpenseUpdateRequest {
  name?: string;
  amount?: number;
  expenseDate?: string;
  notes?: string | null;
}

// --- كشف الرواتب (Salary Sheet) ---
export interface SalaryDeduction {
  id: string;
  salarySheetEntryId: string;
  amount: number;
  reason: string;
  deductionDate: string;
  createdAt?: string;
}

export interface SalaryAdvance {
  id: string;
  salarySheetEntryId: string;
  amount: number;
  reason: string;
  withdrawalDate: string;
  createdAt?: string;
}

export interface SalarySheetEntry {
  id: string;
  employeeName: string;
  workType: string;
  salaryAmount: number;
  paymentDate: string;
  notes?: string | null;
  totalDeductions: number;
  totalAdvances: number;
  netSalary: number;
  deductions: SalaryDeduction[];
  advances: SalaryAdvance[];
  agentId?: string;
  createdAt?: string;
  updatedAt?: string | null;
}

export interface SalarySheetEntryCreateRequest {
  employeeName: string;
  workType: string;
  salaryAmount: number;
  paymentDate: string;
  notes?: string | null;
}

export interface SalarySheetEntryUpdateRequest {
  employeeName?: string;
  workType?: string;
  salaryAmount?: number;
  paymentDate?: string;
  notes?: string | null;
}

export interface SalaryDeductionCreateRequest {
  salarySheetEntryId: string;
  amount: number;
  reason: string;
  deductionDate: string;
}

export interface SalaryDeductionUpdateRequest {
  amount: number;
  reason: string;
  deductionDate: string;
}

export interface SalaryAdvanceCreateRequest {
  salarySheetEntryId: string;
  amount: number;
  reason: string;
  withdrawalDate: string;
}

export interface SalaryAdvanceUpdateRequest {
  amount: number;
  reason: string;
  withdrawalDate: string;
}

/** استجابة GET /api/SalarySheet (قائمة كشف الرواتب مع الإجماليات) */
export interface SalarySheetListResponse {
  data: SalarySheetEntry[];
  totalDeductions: number;
  totalAdvances: number;
}

// --- Offline / Sync (الباكند: SyncController) ---
export type SyncOperationType = 'CreateRenewal' | 'PayDebt';

export interface SyncOperationDto {
  clientId: string;
  type: SyncOperationType;
  payload: Record<string, unknown>;
}

export interface SyncUploadRequestDto {
  operations: SyncOperationDto[];
}

export interface SyncOperationResultDto {
  clientId: string;
  success: boolean;
  data?: unknown;
  message?: string;
}

export interface SyncUploadResponseDto {
  results: SyncOperationResultDto[];
}

export interface SyncChangesResponseDto {
  renewals?: unknown[];
  debts?: Debt[];
}
