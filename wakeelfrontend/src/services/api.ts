import axios, { AxiosInstance, AxiosResponse } from 'axios';
import {
  clearAuthAndRedirectToLogin,
  isAuthLoginRequestUrl,
} from '../utils/sessionManager';
import { normalizeUser, normalizeUserList } from '../utils/normalizeUser';

import { 
  LoginRequest, 
  LoginResponse, 
  User, 
  UserCreateRequest, 
  UserUpdateRequest,
  Agent,
  AgentCreateRequest,
  AgentUpdateRequest,
  UpdateMyCredentialsRequest,
  SasActivationLinkResponse,
  PaginatedResponse,
  AgentsListResponse,
  PaginationParams,
  DebtsListParams,
  Profile,
  ProfileCreateRequest,
  ProfileUpdateRequest,
  ProfileListParams,
  Material,
  MaterialCreateRequest,
  MaterialUpdateRequest,
  MaterialDisburseRequest,
  MaterialDisbursement,
  MaterialDisbursementsResponse,
  MaterialReturnRequest,
  Subscriber,
  SubscriberCreateRequest,
  SubscriberUpdateRequest,
  SubscriberNotesPatchDto,
  SubscriberInfo,
  DashboardStats,
  SubscribersDashboardStats,
  RenewalReceipt,
  RenewalHistory,
  RenewalData,
  RenewalActivationMode,
  PaymentStatus,
  SubscriptionType,
  SubscriptionStatus,
  Debt,
  DebtsListResponse,
  DebtCreateRequest,
  DebtUpdateRequest,
  DebtPaymentRequest,
  ProfitStats,
  DateRangeRequest,
  DailyAccountResponse,
  AccountsResponse,
  AccountsOtherDealerReportResponse,
  AccountsOtherDealerEntry,
  FiberxCashbackAppSubscriptionsResponse,
  FiberxCashbackAppSubscriptionRow,
  FiberxCashbackSubscriberAccount,
  FiberxCashbackSubscriberAccountCreateRequest,
  FiberxCashbackSubscriberAccountsListParams,
  FiberxCashbackSubscriberAccountsListResponse,
  FiberxCashbackSubscriberAccountUpdateRequest,
  FiberxLatestTopUpPreviewResponse,
  AccountLedgerEntry,
  UpdateAccountsLedgerProfileResponse,
  AccountLedgerEntryKind,
  SubscriberNoteTypeOption,
  DailyHandoverCreateRequest,
  DailyHandoverUpdateRequest,
  DailyHandoverRecipient,
  AgentRenewalRequest,
  AgentSubscriptionCheck,
  ExcelImportAgent,
  ExcelImportResponse,
  ActivityLogItem,
  ActivityLogActivityTypeOption,
  ActivityType,
  AgentEmployeeCreateRequest,
  AgentEmployeeUpdateRequest,
  UserRole,
  SystemMessageResponse,
  SystemMessageCreateRequest,
  MessageTemplateResponse,
  SasSyncRequest,
  SasSyncResponse,
  SasSyncUsingSavedCredentialsResponse,
  SyncContractIdToFatRequest,
  SyncContractIdToFatResponse,
  SyncSubscribersRequest,
  SyncSubscribersResponse,
  SubscriberFetchLimitOption,
  ZainfiSyncRequest,
  ZainfiSyncResponse,
  ZainfiSubscriberDiffResponse,
  ZainfiSubscriberDiffItem,
  ZainfiApplyExternalExpirationRequest,
  CashbackTransactionsRequest,
  CashbackTransactionsResponse,
  CashbackSynchronizationFtthResponse,
  CashbackSubscriberZonesResponse,
  CashbackPackageDto,
  CashbackTransactionRecordDto,
  CashbackRecordRealTotalUpdateRequest,
  CashbackExpectedTotalUpdateRequest,
  CashbackExpectedTotalUpdateResponse,
  CashbackFetchBody,
  CustomerInvoiceCustomerCreateDto,
  CustomerInvoiceCustomerDto,
  CustomerInvoiceCustomerUpdateDto,
  CustomerInvoiceDetailDto,
  CustomerInvoicePayDebtRequest,
  CustomerInvoicePayDebtByCustomerRequest,
  CustomerInvoicePayDebtByCustomerResponse,
  CustomerInvoiceCustomerGroupDto,
  CustomerInvoiceRecordCreateDto,
  CustomerInvoiceRecordDto,
  CustomerInvoiceCompanyDebtCreateDto,
  CustomerInvoiceJournalEntryCreateDto,
  CustomerInvoicesListResponse,
  CustomerInvoiceSendWhatsAppResponse,
  CustomerInvoiceStatisticsDto,
  UpdateSubscriptionRequest,
  UpdateSubscriptionResponse,
  SaveSubscriberFromSyncRequest,
  SasSyncFromDataRequest,
  SasCredentialsItem,
  AgentResellerCredentialsDto,
  BalanceTopUpRequest,
  BalanceTopUpResponse,
  BalanceTransfer,
  BalanceTransferCreateRequest,
  BalanceTransferUpdateRequest,
  BalanceTransferType,
  Dealer,
  DealerCreateRequest,
  DealerUpdateRequest,
  DealersListParams,
  DealersListResponse,
  DealerDebtsListParams,
  DealerDebtsListResponse,
  DealerDebtsStatementResponse,
  DealerDebtPayByDealerRequest,
  DealerDebtPayByDealerResponse,
  DealerDebtPayByDealerPaidRow,
  BalanceTransfersListParams,
  BalanceTransfersListResponse,
  DealerDebt,
  DealerDebtsRenewalTotals,
  DealerDebtCreateRequest,
  DealerDebtPayRequest,
  DealerDebtPaySingleResponse,
  DealerDebtUpdateRequest,
  IraqGovernorates,
  AgentBalanceTopUp,
  AgentBalanceTopUpsPage,
  AgentBalanceDetail,
  OfficeExpense,
  OfficeExpenseCreateRequest,
  OfficeExpenseUpdateRequest,
  SalarySheetEntry,
  SalarySheetEntryCreateRequest,
  SalarySheetEntryUpdateRequest,
  SalaryDeductionCreateRequest,
  SalaryDeductionUpdateRequest,
  SalaryAdvanceCreateRequest,
  SalaryAdvanceUpdateRequest,
  SalarySheetListResponse,
  SyncUploadRequestDto,
  SyncUploadResponseDto,
  AppSettingsResponse,
  AppSettingsUpdateRequest,
  AgentAnnouncementDto,
  AgentAnnouncementCreateRequest,
  AgentReseller,
  AgentResellerCreateRequest,
  AgentResellerUpdateRequest,
  MainAgentDashboardDto,
  AgentRegistrationRequest,
  AgentRegistrationRegisterResponse,
  AgentRegistrationApproveRequest,
  AgentRegistrationApproveResponse,
  FtthSubscribersExportBody,
  FtthSubscribersExportResponse,
  FtthSubscribersImportResponse,
  SasSubscribersExportBody,
  SasSubscribersExportResponse,
  SasSubscribersImportResponse,
  ActivationInvoicePrintSettingsDto,
  SalesInvoicePrintSettingsDto,
  ActivationInvoicePrintSettingsUpdate,
  SalesInvoicePrintSettingsUpdate,
  WhatsAppDeviceResponse,
  WhatsAppPairCodeResponse,
  WhatsAppStatusResponse,
} from '../types';
import { getNumberLocale } from '../utils/localeDigits';
import { createCashbackReportXlsxBlob } from '../utils/excelExport';
import {
  RECEIVED_AMOUNT_DESTINATION_OPTIONS,
  subscriberNoteTypeLabelAr,
} from '../utils/subscriberNoteTypeLabels';

/** قائمة «جهة المبلغ الواصل» عندما لا يعيد الـ API كتالوجاً أو يكون فارغاً بعد التطبيع */
export function defaultSubscriberNoteTypeOptions(): SubscriberNoteTypeOption[] {
  return RECEIVED_AMOUNT_DESTINATION_OPTIONS.map((o) => ({
    value: o.value,
    label: o.label,
  }));
}

function asSubscriberNoteTypesArray(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === 'object') {
    const r = raw as Record<string, unknown>;
    const nested =
      r.items ??
      r.Items ??
      r.data ??
      r.Data ??
      r.list ??
      r.List ??
      r.results ??
      r.Results;
    if (Array.isArray(nested)) return nested;
  }
  return [];
}

/** تطبيع مصفوفة subscriberNoteTypes من الباكند (camelCase أو PascalCase). */
export function parseSubscriberNoteTypesCatalog(raw: unknown): SubscriberNoteTypeOption[] {
  const arr = asSubscriberNoteTypesArray(raw);
  const out: SubscriberNoteTypeOption[] = [];
  const seen = new Set<number>();
  for (const item of arr) {
    if (item == null || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    const value =
      o.value ??
      o.Value ??
      o.id ??
      o.Id ??
      o.type ??
      o.Type ??
      o.subscriberNoteType ??
      o.SubscriberNoteType ??
      o.noteType ??
      o.NoteType;
    const label =
      o.label ??
      o.Label ??
      o.labelAr ??
      o.LabelAr ??
      o.name ??
      o.Name ??
      o.title ??
      o.Title ??
      o.text ??
      o.Text ??
      o.description ??
      o.Description ??
      o.displayName ??
      o.DisplayName ??
      o.arabicLabel ??
      o.ArabicLabel;
    const vn = Number(value);
    let ls = label != null ? String(label).trim() : '';
    if (!Number.isFinite(vn)) continue;
    const frontendLabel = subscriberNoteTypeLabelAr(vn);
    if (frontendLabel) ls = frontendLabel;
    if (!ls) continue;
    if (seen.has(vn)) continue;
    seen.add(vn);
    out.push({ value: vn, label: ls });
  }
  return out;
}

/** عندما يعيد السيرفر JSON بدلاً من ملف xlsx (نفس جسم الـ fetch) — نبني ملفاً محلياً حتى لا يفشل التنزيل. */
function cashBackRowDate(v: unknown): string {
  if (v == null || v === '') return '';
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleString('ar-IQ');
}

/**
 * GET /Renewals قد يعيد حقولاً بصيغة PascalCase (.NET) — نملأ الحقول camelCase لتصدير Excel والواجهات.
 */
function normalizeRenewalReceiptFromApi(raw: unknown): RenewalReceipt {
  if (raw == null || typeof raw !== 'object') {
    return raw as RenewalReceipt;
  }
  const r = raw as Record<string, unknown>;
  const str = (camel: string, pascal: string, ...alts: string[]) => {
    const v =
      r[camel] ??
      r[pascal] ??
      alts.map((k) => r[k]).find((x) => x != null && x !== '');
    return v == null ? '' : String(v);
  };
  return {
    ...(r as unknown as RenewalReceipt),
    subscriberName: str('subscriberName', 'SubscriberName'),
    subscriberPhone: str('subscriberPhone', 'SubscriberPhone', 'phoneNumber', 'PhoneNumber'),
    subscriberUsername:
      (r.subscriberUsername ??
        r.SubscriberUsername ??
        r.username ??
        r.Username ??
        null) as string | null | undefined,
    subscriberWiFiCode:
      (r.subscriberWiFiCode ?? r.SubscriberWiFiCode ?? null) as string | null | undefined,
    subscriberId: str('subscriberId', 'SubscriberId'),
  };
}

function buildCashbackXlsxBlobFromJson(res: CashbackTransactionsResponse): Blob {
  const headers = [
    'اسم المشترك',
    'نوع التفعيل',
    'نسبة الربح',
    'سعر الاشتراك',
    'الباقة',
    'الوكيل',
    'المنطقة',
    'من تاريخ',
    'إلى تاريخ',
    'اسم المستخدم',
  ];
  const rows = (res.rows ?? []) as Record<string, unknown>[];
  const planProfitStats = new Map<string, { profitPerActivation: number; activations: number }>();
  const dataRows: (string | number)[][] = rows.map((r) => [
    String(r.subscriberName ?? ''),
    String(r.activationType ?? ''),
    r.profitPerActivation != null ? Number(r.profitPerActivation) : '',
    r.planPrice != null ? Number(r.planPrice) : '',
    String(r.subscriptionName ?? ''),
    String(r.agentName ?? ''),
    String(r.zoneId ?? ''),
    cashBackRowDate(r.subscriptionStartsAt),
    cashBackRowDate(r.subscriptionEndsAt),
    String(r.deviceUsername ?? ''),
  ]);
  for (const r of rows) {
    const name = String(r.subscriptionName ?? '').trim();
    const profit = Number(r.profitPerActivation ?? 0);
    if (!name || Number.isNaN(profit) || profit <= 0) continue;
    const prev = planProfitStats.get(name);
    if (prev) {
      prev.activations += 1;
    } else {
      planProfitStats.set(name, { profitPerActivation: profit, activations: 1 });
    }
  }
  const aoa: (string | number)[][] = [headers, ...dataRows];
  aoa.push([]);
  aoa.push(['مجموع التفعيلات:', res.totalActivations ?? '']);
  aoa.push(['مجموع تفعيلات من محفظة الوكيل', res.agentWalletActivations ?? '']);
  aoa.push(['مجموع التفعيلات من تطبيق الوطني او ماستر', res.subscriberOrMasterActivations ?? '']);
  planProfitStats.forEach((stat, subscriptionName) => {
    aoa.push([`مجموع التفعيلات ${subscriptionName}`, stat.activations]);
    aoa.push([`الربح ${stat.profitPerActivation} × ${stat.activations}`, stat.profitPerActivation * stat.activations]);
  });
  let excelGrandTotal = 0;
  for (const row of rows) {
    const p = Number((row as { profitPerActivation?: unknown }).profitPerActivation ?? 0);
    if (!Number.isNaN(p)) excelGrandTotal += p;
  }
  aoa.push(['مبلغ الراجع الكلي', excelGrandTotal]);
  return createCashbackReportXlsxBlob(aoa, 'تقرير الكاش باك', {
    colWidths: [28, 14, 12, 14, 24, 14, 18, 18, 18, 18],
  });
}

/** رسالة عامة من الباكند عند استثناء غير متوقع — نعرض للمستخدم نصاً موحّداً */
export const API_BACKEND_UNEXPECTED_MESSAGE = 'حدث خطأ غير متوقع في السيرفر';
export const API_USER_UNEXPECTED_MESSAGE = 'خطأ أثناء التنفيذ اتصل بفريق التقني';

export function mapBackendErrorMessageForUser(message: string | undefined | null): string {
  if (message == null) return '';
  const s = typeof message === 'string' ? message : String(message);
  if (s.trim() === API_BACKEND_UNEXPECTED_MESSAGE) return API_USER_UNEXPECTED_MESSAGE;
  return s;
}

type MaterialDisbursementApi = MaterialDisbursement & {
  InvoiceNumber?: string;
  SubscriberId?: string;
  SubscriberName?: string;
  SubscriberPhone?: string;
  DealerId?: string;
  DealerName?: string;
  DealerPhone?: string;
  Dealer?: Record<string, unknown> | null;
};

/** يوحّد رقم الفاتورة عندما يرسل الباكند InvoiceNumber بدل invoiceNumber (JSON من ASP.NET) */
function normalizeMaterialDisbursementFromApi(d: MaterialDisbursementApi): MaterialDisbursement {
  const dealerObj = (d.Dealer ?? (d as { dealer?: Record<string, unknown> | null }).dealer) ?? null;
  const dealerNameFromObj =
    dealerObj && typeof dealerObj === 'object'
      ? String(
          (dealerObj.fullName ??
            dealerObj.FullName ??
            dealerObj.userName ??
            dealerObj.UserName ??
            '') as string
        ).trim()
      : '';
  const dealerPhoneFromObj =
    dealerObj && typeof dealerObj === 'object'
      ? String((dealerObj.phone ?? dealerObj.Phone ?? '') as string).trim()
      : '';
  const inv = String(d.invoiceNumber ?? d.InvoiceNumber ?? '').trim() || undefined;
  const subscriberId = String(d.subscriberId ?? d.SubscriberId ?? '').trim() || undefined;
  const dealerId = String(d.dealerId ?? d.DealerId ?? '').trim() || undefined;
  return {
    ...d,
    subscriberId,
    subscriberName: String(d.subscriberName ?? d.SubscriberName ?? '').trim() || undefined,
    subscriberPhone: String(d.subscriberPhone ?? d.SubscriberPhone ?? '').trim() || undefined,
    dealerId,
    dealerName:
      String(d.dealerName ?? d.DealerName ?? '').trim() ||
      dealerNameFromObj ||
      undefined,
    dealerPhone:
      String(d.dealerPhone ?? d.DealerPhone ?? '').trim() ||
      dealerPhoneFromObj ||
      undefined,
    invoiceNumber: inv,
  };
}

/** GET /admin/activity-log/activity-types — مصفوفة أو { data | items } */
function normalizeActivityLogActivityTypesFromApi(raw: unknown): ActivityLogActivityTypeOption[] {
  let arr: unknown[] = [];
  if (Array.isArray(raw)) {
    arr = raw;
  } else if (raw != null && typeof raw === 'object') {
    const o = raw as Record<string, unknown>;
    if (Array.isArray(o.data)) arr = o.data;
    else if (Array.isArray(o.Data)) arr = o.Data;
    else if (Array.isArray(o.items)) arr = o.items;
    else if (Array.isArray(o.Items)) arr = o.Items;
    else if (Array.isArray(o.activityTypes)) arr = o.activityTypes;
    else if (Array.isArray(o.ActivityTypes)) arr = o.ActivityTypes;
  }
  const out: ActivityLogActivityTypeOption[] = [];
  for (const item of arr) {
    if (item == null || typeof item !== 'object') continue;
    const r = item as Record<string, unknown>;
    const value = Number(
      r.value ?? r.Value ?? r.id ?? r.Id ?? r.activityType ?? r.ActivityType ?? r.key ?? r.Key,
    );
    const name = String(
      r.name ?? r.Name ?? r.label ?? r.Label ?? r.title ?? r.Title ?? r.activityTypeName ?? r.ActivityTypeName ?? '',
    ).trim();
    if (!Number.isFinite(value) || value < 1) continue;
    out.push({ value, name: name || String(value) });
  }
  out.sort((a, b) => a.value - b.value);
  return out;
}

/** GET /admin/activity-log — توحيد camelCase / PascalCase */
function normalizeActivityLogItemFromApi(raw: unknown): ActivityLogItem {
  if (raw == null || typeof raw !== 'object') {
    return {
      actorName: '',
      actorUsername: '',
      activityType: ActivityType.ActivateSubscriber,
      activityTypeName: '',
      subscriberName: '',
      subscriberUsername: '',
      createdAt: '',
    };
  }
  const r = raw as Record<string, unknown>;
  const str = (a: string, b: string) => String(r[a] ?? r[b] ?? '').trim();
  const at = Number(r.activityType ?? r.ActivityType ?? 0);
  const idStr = str('id', 'Id');
  const detailsRaw = r.details ?? r.Details;
  const details =
    detailsRaw == null || detailsRaw === '' ? undefined : String(detailsRaw).trim();
  return {
    ...(idStr ? { id: idStr } : {}),
    actorName: str('actorName', 'ActorName'),
    actorUsername: str('actorUsername', 'ActorUsername'),
    activityType: (Number.isFinite(at) ? at : 0) as ActivityType,
    activityTypeName: str('activityTypeName', 'ActivityTypeName'),
    ...(details ? { details } : {}),
    subscriberName: str('subscriberName', 'SubscriberName'),
    subscriberUsername: str('subscriberUsername', 'SubscriberUsername'),
    createdAt: str('createdAt', 'CreatedAt'),
  };
}

function normalizePaginatedActivityLogFromApi(raw: unknown): PaginatedResponse<ActivityLogItem> {
  const empty: PaginatedResponse<ActivityLogItem> = {
    data: [],
    currentPage: 1,
    pageSize: 20,
    totalItems: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
    totalCount: 0,
    pageNumber: 1,
  };
  if (raw == null || typeof raw !== 'object') return empty;
  const o = raw as Record<string, unknown>;
  const dataRaw = o.data ?? o.Data;
  const arr = Array.isArray(dataRaw) ? dataRaw : [];
  const data = arr.map((item) => normalizeActivityLogItemFromApi(item));
  const currentPage = Math.max(1, Number(o.currentPage ?? o.CurrentPage ?? o.pageNumber ?? o.PageNumber ?? 1) || 1);
  const pageSize = Math.max(1, Number(o.pageSize ?? o.PageSize ?? 20) || 20);
  const totalItemsRaw = Number(o.totalItems ?? o.TotalItems ?? o.totalCount ?? o.TotalCount ?? 0);
  const totalItems = Number.isFinite(totalItemsRaw) ? totalItemsRaw : data.length;
  const totalPages = Math.max(1, Number(o.totalPages ?? o.TotalPages ?? 1) || 1);
  const hasNextPage = Boolean(o.hasNextPage ?? o.HasNextPage ?? currentPage < totalPages);
  const hasPreviousPage = Boolean(o.hasPreviousPage ?? o.HasPreviousPage ?? currentPage > 1);
  return {
    data,
    currentPage,
    pageSize,
    totalItems,
    totalPages,
    hasNextPage,
    hasPreviousPage,
    totalCount: totalItems,
    pageNumber: currentPage,
  };
}

class ApiService {
  private api: AxiosInstance;

  // دالة لترجمة رسائل الخطأ إلى العربية
  private translateError(error: any): string {
    // معالجة رسائل ModelState (أخطاء التحقق)
    if (error.response?.data?.errors) {
      const errors = error.response.data.errors;
      const errorMessages: string[] = [];
      
      // جمع جميع رسائل الخطأ
      for (const field in errors) {
        if (Array.isArray(errors[field])) {
          errorMessages.push(...errors[field]);
        }
      }
      
      // إرجاع الرسائل مجمعة
      if (errorMessages.length > 0) {
        return errorMessages.join('\n');
      }
    }
    
    // رسالة نصية مباشرة في body (مثل BadRequest("نص") في .NET)
    const data = error.response?.data;
    if (typeof data === 'string' && data.trim()) {
      return mapBackendErrorMessageForUser(data.trim());
    }
    // ProblemDetails أو غيره: حقل detail
    if (data?.detail && typeof data.detail === 'string' && data.detail.trim()) {
      return mapBackendErrorMessageForUser(data.detail.trim());
    }
    // إذا كان الخطأ يحتوي على رسالة باللغة العربية، استخدمها
    if (data?.message) {
      const message = mapBackendErrorMessageForUser(
        typeof data.message === 'string' ? data.message : String(data.message),
      );
      
      // قائمة بالرسائل الشائعة وترجماتها
      const errorTranslations: { [key: string]: string } = {
        // رسائل المصادقة
        'Invalid credentials': 'بيانات الدخول غير صحيحة',
        'User not found': 'المستخدم غير موجود',
        'Invalid token': 'رمز المصادقة غير صالح',
        'Token expired': 'انتهت صلاحية رمز المصادقة',
        'Unauthorized': 'غير مخول للوصول',
        'Forbidden': 'ممنوع الوصول',
        'اسم المستخدم أو كلمة المرور غير صحيحة': 'اسم المستخدم أو كلمة المرور غير صحيحة',
        'اسم المستخدم أو كلمة السر غير صحيحة': 'اسم المستخدم أو كلمة السر غير صحيحة',
        'غير مصرح': 'غير مصرح',
        'غير مصرح للوصول': 'غير مصرح للوصول',
        
        // رسائل التحقق
        'Validation failed': 'فشل في التحقق من البيانات',
        'Required field': 'هذا الحقل مطلوب',
        'Invalid email': 'البريد الإلكتروني غير صالح',
        'Invalid phone number': 'رقم الهاتف غير صالح',
        'Password too short': 'كلمة المرور قصيرة جداً',
        'Username already exists': 'اسم المستخدم موجود بالفعل',
        'Email already exists': 'البريد الإلكتروني موجود بالفعل',
        
        // رسائل قاعدة البيانات
        'Database error': 'خطأ في قاعدة البيانات',
        'Record not found': 'السجل غير موجود',
        'Duplicate entry': 'هذا السجل موجود بالفعل',
        'Foreign key constraint': 'خطأ في العلاقات بين الجداول',
        'Got timeout reading communication packets': 'انتهت مهلة الاتصال بقاعدة البيانات على السيرفر. جرّب مرة أخرى أو تأكد من تشغيل قاعدة البيانات.',
        'timeout reading communication packets': 'انتهت مهلة الاتصال بقاعدة البيانات على السيرفر. جرّب مرة أخرى أو تأكد من تشغيل قاعدة البيانات.',
        
        // رسائل الملفات
        'File not found': 'الملف غير موجود',
        'File too large': 'حجم الملف كبير جداً',
        'Invalid file type': 'نوع الملف غير مدعوم',
        'Upload failed': 'فشل في رفع الملف',
        'No file uploaded': 'لم يتم رفع ملف',
        'Only Excel files (.xlsx, .xls) are allowed': 'يُسمح فقط بملفات Excel (.xlsx, .xls)',
        
        // رسائل الشبكة
        'Network error': 'خطأ في الشبكة',
        'Connection timeout': 'انتهت مهلة الاتصال',
        'Server error': 'خطأ في الخادم',
        'Service unavailable': 'الخدمة غير متاحة',
        
        // رسائل خاصة بالتطبيق - الوكلاء
        'Agent not found': 'الوكيل غير موجود',
        'الوكيل غير موجود': 'الوكيل غير موجود',
        'لا يمكن حذف الوكيل الذي قام بإنشاء وكلاء آخرين': 'لا يمكن حذف الوكيل الذي قام بإنشاء وكلاء آخرين. يرجى إعادة تعيين أو حذف الوكلاء التابعين أولاً.',
        'لا يمكن حذف الوكيل الذي لديه مشتركين': 'لا يمكن حذف الوكيل الذي لديه مشتركين. يرجى إعادة تعيين أو حذف المشتركين أولاً.',
        'لا يمكن حذف الوكيل الذي لديه ملفات شخصية': 'لا يمكن حذف الوكيل الذي لديه ملفات شخصية. يرجى حذف الملفات الشخصية أولاً.',
        'حدث خطأ أثناء حذف الوكيل': 'حدث خطأ أثناء حذف الوكيل',
        
        // رسائل خاصة بالتطبيق - المشتركين
        'Subscriber not found': 'المشترك غير موجود',
        'المشترك غير موجود': 'المشترك غير موجود',
        'الملف الشخصي غير موجود': 'الملف الشخصي غير موجود',
        'الملف الشخصي بالمعرف': 'الملف الشخصي بالمعرف المحدد غير موجود أو لا ينتمي إلى هذا الوكيل',
        'رقم الهاتف موجود بالفعل في النظام': 'رقم الهاتف المحدد موجود بالفعل في النظام',
        'حدث خطأ أثناء إنشاء المشترك': 'حدث خطأ أثناء إنشاء المشترك',
        'حدث خطأ أثناء جلب معلومات المشترك': 'حدث خطأ أثناء جلب معلومات المشترك',
        
        // رسائل خاصة بالتطبيق - الديون
        'Debt not found': 'الدين غير موجود',
        'الدين غير موجود': 'الدين غير موجود',
        
        // رسائل خاصة بالتطبيق - المستخدمين
        'Only agents can view their subscribers': 'يمكن للوكلاء فقط عرض مشتركيهم',
        'Agents can only create Subscriber users': 'يمكن للوكلاء فقط إنشاء مستخدمين من نوع المشترك',
        'المستخدم غير موجود': 'المستخدم غير موجود',
        'Subscriber not found or not authorized to view': 'المشترك غير موجود أو غير مخول للعرض',
        'Subscriber not found or not authorized to update': 'المشترك غير موجود أو غير مخول للتحديث',
        
        // رسائل خاصة بالتطبيق - التجديدات
        'Renewal not found': 'التجديد غير موجود',
        'التجديد غير موجود': 'التجديد غير موجود',
        'Receipt not found': 'الإيصال غير موجود',
        'الإيصال غير موجود': 'الإيصال غير موجود',
        'الملف الشخصي لا ينتمي إلى هذا الوكيل': 'الملف الشخصي لا ينتمي إلى هذا الوكيل',
        'حدث خطأ أثناء تصدير البيانات': 'حدث خطأ أثناء تصدير البيانات',
        
        // رسائل خاصة بالتطبيق - الباقات
        'Profile not found': 'الباقة غير موجودة',
        'الباقة غير موجودة': 'الباقة غير موجودة',
        
        // رسائل خاصة بالتطبيق - الفواتير
        'الفاتورة غير موجودة': 'الفاتورة غير موجودة',
        
        // رسائل خاصة بالتطبيق - الاستيراد
        'معرف الوكيل مطلوب للمدير': 'معرف الوكيل مطلوب للمدير',
        'لم يتم العثور على ورقة عمل في ملف Excel': 'لم يتم العثور على ورقة عمل في ملف Excel',
        'ملف Excel يجب أن يحتوي على الأقل صف رؤوس وصف بيانات واحد': 'ملف Excel يجب أن يحتوي على الأقل صف رؤوس وصف بيانات واحد',
        
        // رسائل التحقق من DTOs
        'اسم المستخدم مطلوب': 'اسم المستخدم مطلوب',
        'اسم المستخدم يجب أن يكون أقل من 100 حرف': 'اسم المستخدم يجب أن يكون أقل من 100 حرف',
        'الاسم الكامل مطلوب': 'الاسم الكامل مطلوب',
        'الاسم الكامل يجب أن يكون أقل من 200 حرف': 'الاسم الكامل يجب أن يكون أقل من 200 حرف',
        'كلمة السر مطلوبة': 'كلمة السر مطلوبة',
        'كلمة السر يجب أن تكون على الأقل 4 أحرف': 'كلمة السر يجب أن تكون على الأقل 4 أحرف',
        'اسم الشركة مطلوب': 'اسم الشركة مطلوب',
        'اسم الشركة يجب أن يكون أقل من 200 حرف': 'اسم الشركة يجب أن يكون أقل من 200 حرف',
        'رقم الهاتف يجب أن يكون أقل من 20 رقم': 'رقم الهاتف يجب أن يكون أقل من 20 رقم',
        'العنوان يجب أن يكون أقل من 500 حرف': 'العنوان يجب أن يكون أقل من 500 حرف',
        'الاسم الأول مطلوب': 'الاسم الأول مطلوب',
        'الاسم الأول يجب أن يكون أقل من 100 حرف': 'الاسم الأول يجب أن يكون أقل من 100 حرف',
        'الاسم الأخير مطلوب': 'الاسم الأخير مطلوب',
        'الاسم الأخير يجب أن يكون أقل من 100 حرف': 'الاسم الأخير يجب أن يكون أقل من 100 حرف',
        'رقم الهاتف مطلوب': 'رقم الهاتف مطلوب',
        'كود الواي فاي يجب أن يكون أقل من 100 حرف': 'كود الواي فاي يجب أن يكون أقل من 100 حرف',
        'الملاحظة يجب أن تكون أقل من 1000 حرف': 'الملاحظة يجب أن تكون أقل من 1000 حرف',
        'معرف الملف الشخصي مطلوب': 'معرف الملف الشخصي مطلوب',
        'تاريخ انتهاء الصلاحية مطلوب': 'تاريخ انتهاء الصلاحية مطلوب',
        'معرف المشترك مطلوب': 'معرف المشترك مطلوب',
        'المبلغ مطلوب': 'المبلغ مطلوب',
        'المبلغ يجب أن يكون أكبر من صفر': 'المبلغ يجب أن يكون أكبر من صفر',
        'ملاحظات الدين مطلوب': 'ملاحظات الدين مطلوب',
        'ملاحظات الدين يجب أن يكون أقل من 500 حرف': 'ملاحظات الدين يجب أن يكون أقل من 500 حرف',
        'الملاحظات يجب أن تكون أقل من 1000 حرف': 'الملاحظات يجب أن تكون أقل من 1000 حرف',
        'معرف الملف الشخصي الجديد مطلوب': 'معرف الملف الشخصي الجديد مطلوب',
        'فترة التجديد مطلوبة': 'فترة التجديد مطلوبة',
        'حالة الدفع مطلوبة': 'حالة الدفع مطلوبة',
        'سعر البيع يجب أن يكون أكبر من أو يساوي صفر': 'سعر البيع يجب أن يكون أكبر من أو يساوي صفر',
        'المبلغ المدفوع يجب أن يكون أكبر من أو يساوي صفر': 'المبلغ المدفوع يجب أن يكون أكبر من أو يساوي صفر',
        'اسم الشبكة يجب أن يكون أقل من 100 حرف': 'اسم الشبكة يجب أن يكون أقل من 100 حرف',
        'كلمة سر الشبكة يجب أن تكون أقل من 100 حرف': 'كلمة سر الشبكة يجب أن تكون أقل من 100 حرف',
        'نوع التشفير مطلوب': 'نوع التشفير مطلوب',
        
        // رسائل الاستيراد من Excel
        'الصف': 'خطأ في الصف المحدد',
        'الملف الشخصي مطلوب': 'الملف الشخصي مطلوب',
        'الملف الشخصي غير موجود لهذا الوكيل': 'الملف الشخصي غير موجود لهذا الوكيل',
        'تنسيق تاريخ الانتهاء غير صحيح': 'تنسيق تاريخ الانتهاء غير صحيح',
        
        // رسائل أخرى - الرصيد عند التفعيل/التجديد
        'Insufficient balance': 'الرصيد غير كافي',
        'InsufficientBalance': 'الرصيد غير كافي',
        'رصيد الوكيل غير كافٍ': 'الرصيد غير كافي',
        'Subscription expired': 'انتهت صلاحية الاشتراك',
        'Payment failed': 'فشل في الدفع',
        'Renewal failed': 'فشل في التجديد',
        'Export failed': 'فشل في التصدير',
        'Import failed': 'فشل في الاستيراد'
      };
      
      // البحث عن ترجمة للرسالة
      for (const [key, arabic] of Object.entries(errorTranslations)) {
        // البحث في الرسالة الأصلية
        if (message.includes(key)) {
          return arabic;
        }
        
        // البحث في الرسالة الصغيرة (case insensitive)
        if (message.toLowerCase().includes(key.toLowerCase())) {
          return arabic;
        }
      }
      
      // إذا كانت الرسالة باللغة العربية بالفعل، استخدمها كما هي
      if (/[\u0600-\u06FF]/.test(message)) {
        return message;
      }
      
      // إذا لم توجد ترجمة، استخدم الرسالة الأصلية
      return message;
    }
    
    const statusCode = error.response?.status;
    const rawMessage = (error.response?.data?.message ?? error.message ?? '') as string;
    if (statusCode === 500 && /timeout reading communication packets/i.test(rawMessage)) {
      return 'انتهت مهلة الاتصال بقاعدة البيانات على السيرفر. جرّب مرة أخرى أو تأكد من تشغيل قاعدة البيانات.';
    }

    const statusMessages: { [key: number]: string } = {
      400: 'طلب غير صالح - تحقق من البيانات المرسلة',
      401: 'غير مخول - يرجى تسجيل الدخول مرة أخرى',
      403: 'ممنوع الوصول - ليس لديك صلاحية للوصول',
      404: 'غير موجود - المورد المطلوب غير موجود',
      409: 'تعارض - البيانات المرسلة تتعارض مع البيانات الموجودة',
      422: 'خطأ في التحقق - البيانات المرسلة غير صحيحة',
      500: 'خطأ داخلي في الخادم - يرجى المحاولة لاحقاً',
      502: 'خطأ في البوابة - الخادم غير متاح',
      503: 'الخدمة غير متاحة - يرجى المحاولة لاحقاً',
      504: 'انتهت مهلة البوابة - الخادم لا يستجيب'
    };

    if (statusCode && statusMessages[statusCode]) {
      return statusMessages[statusCode];
    }

    if (error.message) {
      return `خطأ: ${error.message}`;
    }
    
    return 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.';
  }

  constructor() {
    // API URL - Priority: 1. REACT_APP_API_URL, 2. رابط جيزان الاحتياطي
    // يجب أن ينتهي الرابط بـ /wakeel/api وليس /api فقط
    const defaultForDev = 'https://jizan-api.execute-iq.com/wakeel/api';
    const defaultForProd = 'https://jizan-api.execute-iq.com/wakeel/api';
    const baseURL = process.env.REACT_APP_API_URL
      || (process.env.NODE_ENV === 'development' ? defaultForDev : defaultForProd);

    const timeoutMs = typeof process.env.REACT_APP_API_TIMEOUT_MS !== 'undefined'
      ? Number(process.env.REACT_APP_API_TIMEOUT_MS)
      : 30000;
    this.api = axios.create({
      baseURL, // Backend API URL
      timeout: timeoutMs,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor to handle auth errors and translate messages
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        // ترجمة رسالة الخطأ إلى العربية
        const translatedError = new Error(this.translateError(error));
        translatedError.name = error.name;
        
        // إضافة معلومات إضافية للخطأ المترجم
        (translatedError as any).originalError = error;
        (translatedError as any).status = error.response?.status;
        (translatedError as any).response = error.response;
        
        const skipRedirect = Boolean((error.config as { skipAuthRedirect?: boolean } | undefined)?.skipAuthRedirect);
        const requestUrl = String(error.config?.url ?? '');
        console.warn('[AUTH_DEBUG][API] response error', {
          status: error.response?.status,
          url: requestUrl,
          method: String(error.config?.method ?? '').toUpperCase(),
          skipRedirect,
        });

        if (error.response?.status === 401) {
          if (!skipRedirect && !isAuthLoginRequestUrl(requestUrl)) {
            const h = error.config?.headers as Record<string, unknown> | undefined;
            const ax = error.config?.headers as { get?: (k: string) => unknown } | undefined;
            const hadAuth = Boolean(
              h?.Authorization ||
                h?.authorization ||
                (typeof ax?.get === 'function' && (ax.get('Authorization') || ax.get('authorization')))
            );
            if (hadAuth) {
              console.warn('[AUTH_DEBUG][API] 401 مع توكن — انتهاء الجلسة، إعادة توجيه مرة واحدة', {
                url: requestUrl,
              });
              clearAuthAndRedirectToLogin('expired');
            }
          }
        }

        if (error.response?.status === 403 && !skipRedirect) {
          const rawMessage = String(error.response?.data?.message ?? error.response?.data ?? '');
          if (/tenant context is required/i.test(rawMessage)) {
            clearAuthAndRedirectToLogin('unauthorized');
          }
        }
        
        return Promise.reject(translatedError);
      }
    );
  }

  // Auth endpoints
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    console.log('[AUTH_DEBUG][API][login] request start');
    let response: AxiosResponse<LoginResponse | Record<string, unknown>>;
    try {
      response = await this.api.post('/Auth/login', credentials, {
        timeout: 60000, // مهلة أطول لتسجيل الدخول (قد يكون السيرفر في بداية تشغيل)
      });
    } catch (error: any) {
      // بعض البيئات تستخدم مسار auth بحروف صغيرة
      if (error?.response?.status === 404) {
        response = await this.api.post('/auth/login', credentials, {
          timeout: 60000,
        });
      } else {
        throw error;
      }
    }
    const raw = response.data as LoginResponse & {
      accessToken?: string;
      jwt?: string;
      data?: {
        token?: string;
        accessToken?: string;
        jwt?: string;
      };
    };

    const resolvedToken =
      raw.token ||
      raw.accessToken ||
      raw.jwt ||
      raw.data?.token ||
      raw.data?.accessToken ||
      raw.data?.jwt;

    if (!resolvedToken || typeof resolvedToken !== 'string' || !resolvedToken.trim()) {
      throw new Error('لم يتم استلام رمز دخول صالح من الخادم');
    }
    console.log('[AUTH_DEBUG][API][login] response normalized', {
      hasToken: !!resolvedToken,
      role: raw.role,
      roleId: raw.roleId,
      skipAgentsMeAndSync: !!raw.skipAgentsMeAndSync,
    });

    return {
      ...raw,
      token: resolvedToken.trim(),
      expiresInSeconds:
        typeof raw.expiresInSeconds === 'number' && Number.isFinite(raw.expiresInSeconds)
          ? raw.expiresInSeconds
          : 0,
      role: typeof raw.role === 'string' ? raw.role : String(raw.role ?? ''),
    };
  }

  // User endpoints
  async getCurrentUser(opts?: { skipAuthRedirect?: boolean }): Promise<User> {
    const response: AxiosResponse<User> = await this.api.get('/users/me', {
      ...(opts?.skipAuthRedirect ? { skipAuthRedirect: true } : {}),
    });
    return normalizeUser(response.data);
  }

  /** فحص خفيف للاتصال بالسيرفر (للوضع دون اتصال) — مهلة قصيرة لتفادي انتظار 30s */
  async healthCheck(timeoutMs = 10_000): Promise<void> {
    /**
     * يبقى skipAuthRedirect: بعض الأدوار قد ترجع 401 لـ /users/me رغم توكن صالح.
     * انتهاء الجلسة يُدار بمؤقت انتهاء التوكن + 401 على بقية الطلبات التي تحمل Authorization.
     */
    await this.api.get('/users/me', { timeout: timeoutMs, skipAuthRedirect: true });
  }

  async getAllUsers(params?: PaginationParams): Promise<PaginatedResponse<User>> {
    const response: AxiosResponse<PaginatedResponse<User>> = await this.api.get('/users', { params });
    const d = response.data;
    return { ...d, data: normalizeUserList(d.data) };
  }

  async getUserById(id: string): Promise<User> {
    const response: AxiosResponse<User> = await this.api.get(`/users/${id}`);
    return normalizeUser(response.data);
  }

  async createUser(userData: UserCreateRequest): Promise<User> {
    const response: AxiosResponse<User> = await this.api.post('/users', userData);
    return normalizeUser(response.data);
  }

  async updateUser(id: string, userData: UserUpdateRequest): Promise<User> {
    const response: AxiosResponse<User> = await this.api.put(`/users/${id}`, userData);
    return normalizeUser(response.data);
  }

  async deleteUser(id: string): Promise<void> {
    await this.api.delete(`/users/${id}`);
  }

  async getMySubscribers(): Promise<User[]> {
    const response: AxiosResponse<User[]> = await this.api.get('/users/my-subscribers');
    return normalizeUserList(response.data);
  }

  // Agent endpoints — الباكند يتوقع searchTerm (وليس search)
  async getAllAgents(params?: PaginationParams): Promise<AgentsListResponse> {
    const queryParams: Record<string, unknown> = {
      page: params?.page,
      pageSize: params?.pageSize,
    };
    if (params?.search?.trim()) queryParams.searchTerm = params.search.trim();
    if (params?.expirationFromDate) queryParams.expirationFromDate = params.expirationFromDate;
    if (params?.expirationToDate) queryParams.expirationToDate = params.expirationToDate;
    const response: AxiosResponse<AgentsListResponse> = await this.api.get('/Agents', { params: queryParams });
    return response.data;
  }

  // Try to find an agent by username (best-effort for sidebar badge)
  async findAgentByUsername(username: string): Promise<Agent | null> {
    try {
      const params = { searchTerm: username, page: 1, pageSize: 10 };
      const response: AxiosResponse<AgentsListResponse> = await this.api.get('/Agents', { params });
      const list = response.data?.data || [] as any[];
      const exact = list.find((a: Agent) => a.username?.toLowerCase() === username.toLowerCase());
      return exact || list[0] || null;
    } catch (e) {
      console.warn('findAgentByUsername failed', e);
      return null;
    }
  }

  async getAgentById(id: string): Promise<Agent> {
    const response: AxiosResponse<Agent> = await this.api.get(`/Agents/${id}`);
    return response.data;
  }

  /**
   * جلب وكيل المستخدم الحالي (GET /api/Agents/me)
   * - للوكيل: يرجع وكالته
   * - للموظف: يرجع وكيله (CreatedByAgentId) الذي يملك جلسة الواتساب
   * يستخدم نفس جلسة الواتساب للوكيل والموظفين التابعين له
   */
  async getMyAgent(): Promise<Agent> {
    const response: AxiosResponse<Agent> = await this.api.get('/Agents/me');
    return response.data;
  }

  /**
   * تغيير بيانات الدخول (الوكيل/المدير الثانوي) — PUT /api/Agents/me/credentials
   * currentPassword مطلوب؛ يمكن إرسال newUsername و/أو newPassword + confirmNewPassword
   */
  async updateMyCredentials(data: UpdateMyCredentialsRequest): Promise<{ message: string }> {
    const response: AxiosResponse<{ message: string }> = await this.api.put('/Agents/me/credentials', data);
    return response.data;
  }

  /** جلب رابط تفعيل SAS/FTTH للمشترك. إن وُجد resellerId يُستخدم ذلك الرسيلر؛ وإلا إعدادات الوكيل أو رسيلر المشترك. */
  async getSasLink(subscriberId: string, resellerId?: string): Promise<SasActivationLinkResponse> {
    const params: Record<string, string> = { subscriberId };
    if (resellerId) params.resellerId = resellerId;
    const response: AxiosResponse<SasActivationLinkResponse> = await this.api.get('/Agents/sas-link', { params });
    return response.data;
  }

  /** قائمة رسيلرز الوكيل — GET /Agents/me/resellers */
  async getMyResellers(): Promise<AgentReseller[]> {
    const response = await this.api.get<AgentReseller[]>('/Agents/me/resellers');
    return response.data ?? [];
  }

  /** قائمة رسيلرز وكيل معيّن — GET /Agents/{agentId}/resellers. استخدم "me" للوكيل الحالي. للأدمن: agentId الوكيل المختار. */
  async getAgentResellers(agentId: string): Promise<AgentReseller[]> {
    const response = await this.api.get<AgentReseller[]>(`/Agents/${agentId}/resellers`);
    return response.data ?? [];
  }

  /** إضافة رسيلر — POST /Agents/me/resellers */
  async createMyReseller(data: AgentResellerCreateRequest): Promise<AgentReseller> {
    const response = await this.api.post<AgentReseller>('/Agents/me/resellers', data);
    return response.data;
  }

  /** تعديل رسيلر — PUT /Agents/me/resellers/{id} */
  async updateMyReseller(id: string, data: AgentResellerUpdateRequest): Promise<AgentReseller> {
    const response = await this.api.put<AgentReseller>(`/Agents/me/resellers/${id}`, data);
    return response.data;
  }

  /** حذف رسيلر — DELETE /Agents/me/resellers/{id} */
  async deleteMyReseller(id: string): Promise<void> {
    await this.api.delete(`/Agents/me/resellers/${id}`);
  }

  async createAgent(agentData: AgentCreateRequest): Promise<Agent> {
    const response: AxiosResponse<Agent> = await this.api.post('/Agents', agentData);
    return response.data;
  }

  /** تسجيل طلب وكيل (بدون حساب فعّال) — POST /AgentRegistration/register */
  async registerAgent(request: AgentRegistrationRequest): Promise<AgentRegistrationRegisterResponse> {
    const response = await this.api.post<AgentRegistrationRegisterResponse>('/AgentRegistration/register', request, {
      timeout: 120_000,
    });
    return response.data ?? {};
  }

  /** موافقة الأدمن وتفعيل الحساب — POST /AgentRegistration/approve (Admin فقط) */
  async approveAgentRegistration(
    request: AgentRegistrationApproveRequest
  ): Promise<AgentRegistrationApproveResponse> {
    const response = await this.api.post<AgentRegistrationApproveResponse>('/AgentRegistration/approve', request, {
      timeout: 120_000,
    });
    return response.data ?? {};
  }

  async updateAgent(id: string, agentData: AgentUpdateRequest): Promise<Agent> {
    const response: AxiosResponse<Agent> = await this.api.put(`/Agents/${id}`, agentData);
    return response.data;
  }

  /** POST /Agents/{agentId}/whatsapp/device — تسجيل الجهاز في خادم Go (عبر Wakeel) */
  async postAgentWhatsAppDevice(agentId: string): Promise<WhatsAppDeviceResponse> {
    const response = await this.api.post<WhatsAppDeviceResponse>(`/Agents/${agentId}/whatsapp/device`);
    const d = response.data as WhatsAppDeviceResponse & { Message?: string; DeviceId?: string };
    return {
      message: d?.message ?? d?.Message,
      deviceId: d?.deviceId ?? d?.DeviceId,
    };
  }

  /** POST /Agents/{agentId}/whatsapp/pair-code — رمز الاقتران؛ phone اختياري (وإلا رقم الوكيل من السجل) */
  async postAgentWhatsAppPairCode(agentId: string, phone?: string): Promise<WhatsAppPairCodeResponse> {
    const trimmed = phone?.trim();
    const response = await this.api.post<WhatsAppPairCodeResponse>(
      `/Agents/${agentId}/whatsapp/pair-code`,
      undefined,
      trimmed ? { params: { phone: trimmed } } : undefined
    );
    const d = response.data as WhatsAppPairCodeResponse & {
      PairCode?: string;
      DeviceId?: string;
      Hint?: string;
    };
    return {
      pairCode: d.pairCode ?? d.PairCode ?? '',
      deviceId: d.deviceId ?? d.DeviceId ?? '',
      hint: d.hint ?? d.Hint,
    };
  }

  /** GET /Agents/{agentId}/whatsapp/status */
  async getAgentWhatsAppStatus(agentId: string): Promise<WhatsAppStatusResponse> {
    const response = await this.api.get<WhatsAppStatusResponse>(`/Agents/${agentId}/whatsapp/status`);
    const d = response.data as WhatsAppStatusResponse & {
      DeviceId?: string;
      IsConnected?: boolean;
      IsLoggedIn?: boolean;
    };
    return {
      deviceId: d.deviceId ?? d.DeviceId ?? '',
      isConnected: d.isConnected ?? d.IsConnected ?? false,
      isLoggedIn: d.isLoggedIn ?? d.IsLoggedIn ?? false,
    };
  }

  private static readonly WHATSAPP_ADMIN_SESSIONS_BASE = '/Agents/whatsapp/sessions';

  /** GET /Agents/whatsapp/sessions/devices — قائمة أجهزة كاملة (Admin؛ الفلترة في الفرونت) */
  async getWhatsAppSessionsDevices(): Promise<import('../types').WhatsAppSessionsListResponse> {
    const response = await this.api.get<unknown>(
      `${ApiService.WHATSAPP_ADMIN_SESSIONS_BASE}/devices`
    );
    const rawItems = ApiService.extractWhatsAppDevicesArray(response.data);
    const items = rawItems.map(ApiService.normalizeWhatsAppDeviceRow).filter((x) => x.deviceId);
    return { count: items.length, items };
  }

  /** GET /Agents/whatsapp/sessions/devices/:device_id — تفاصيل جهاز */
  async getWhatsAppSessionsDeviceDetail(
    deviceId: string
  ): Promise<import('../types').WhatsAppDeviceDetailResponse> {
    const response = await this.api.get<unknown>(
      `${ApiService.WHATSAPP_ADMIN_SESSIONS_BASE}/devices/${encodeURIComponent(deviceId)}`
    );
    const unwrapped = ApiService.unwrapWhatsAppDevicePayload(response.data);
    const row = ApiService.normalizeWhatsAppDeviceRow(unwrapped);
    const raw =
      unwrapped && typeof unwrapped === 'object' && !Array.isArray(unwrapped)
        ? (unwrapped as Record<string, unknown>)
        : null;
    return { ...row, raw };
  }

  /** DELETE /Agents/whatsapp/sessions/devices/:device_id */
  async deleteWhatsAppSessionsDevice(deviceId: string): Promise<void> {
    await this.api.delete(
      `${ApiService.WHATSAPP_ADMIN_SESSIONS_BASE}/devices/${encodeURIComponent(deviceId)}`
    );
  }

  /** GET /Agents/whatsapp/sessions/devices/:device_id/status */
  async getWhatsAppSessionsDeviceStatus(deviceId: string): Promise<import('../types').WhatsAppDeviceStatusAdmin> {
    const response = await this.api.get<unknown>(
      `${ApiService.WHATSAPP_ADMIN_SESSIONS_BASE}/devices/${encodeURIComponent(deviceId)}/status`
    );
    return ApiService.parseWhatsAppDeviceStatusPayload(response.data, deviceId);
  }

  private static extractWhatsAppDevicesArray(payload: unknown): unknown[] {
    if (Array.isArray(payload)) return payload;
    if (payload == null || typeof payload !== 'object') return [];
    const o = payload as Record<string, unknown>;
    const direct = o.items ?? o.Items ?? o.devices ?? o.Devices ?? o.data ?? o.Data ?? o.results ?? o.Results;
    if (Array.isArray(direct)) return direct;
    const wrap = o.results ?? o.Results ?? o.data ?? o.Data;
    if (wrap && typeof wrap === 'object' && !Array.isArray(wrap)) {
      const w = wrap as Record<string, unknown>;
      for (const k of ['items', 'Items', 'devices', 'Devices', 'data', 'Data']) {
        if (Array.isArray(w[k])) return w[k] as unknown[];
      }
    }
    return [];
  }

  private static normalizeWhatsAppDeviceRow(item: unknown): import('../types').WhatsAppDeviceSession {
    if (item == null || typeof item !== 'object') {
      return { deviceId: '', state: '', createdAt: '' };
    }
    const o = item as Record<string, unknown>;
    /** الباكند قد يرسل المعرف كـ id فقط (بدون deviceId) */
    const deviceId = String(
      o.deviceId ?? o.DeviceId ?? o.device_id ?? o.id ?? o.Id ?? ''
    );
    const state = String(o.state ?? o.State ?? '');
    const createdAt = String(o.createdAt ?? o.CreatedAt ?? o.created_at ?? '');
    const displayNameRaw = o.display_name ?? o.displayName ?? o.DisplayName;
    const displayName =
      displayNameRaw != null && String(displayNameRaw).trim() ? String(displayNameRaw).trim() : undefined;
    const jidRaw = o.jid ?? o.Jid;
    const jid = jidRaw != null && String(jidRaw).trim() ? String(jidRaw).trim() : undefined;
    const agentRaw = o.agent ?? o.Agent;
    let agent: import('../types').WhatsAppSessionAgentSummary | null = null;
    if (agentRaw && typeof agentRaw === 'object') {
      const a = agentRaw as Record<string, unknown>;
      agent = {
        id: String(a.id ?? a.Id ?? ''),
        companyName: String(a.companyName ?? a.CompanyName ?? ''),
        phone: String(a.phone ?? a.Phone ?? ''),
      };
    }
    return { deviceId, state, createdAt, ...(displayName ? { displayName } : {}), ...(jid ? { jid } : {}), agent };
  }

  private static unwrapWhatsAppDevicePayload(payload: unknown): unknown {
    if (payload == null || typeof payload !== 'object') return payload;
    const o = payload as Record<string, unknown>;
    const inner = o.results ?? o.Results ?? o.data ?? o.Data ?? o.device ?? o.Device;
    if (inner != null && typeof inner === 'object' && !Array.isArray(inner)) {
      return inner;
    }
    return payload;
  }

  private static parseWhatsAppDeviceStatusPayload(
    payload: unknown,
    fallbackDeviceId: string
  ): import('../types').WhatsAppDeviceStatusAdmin {
    const root = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {};
    const inner = (root.results ?? root.Results ?? root) as Record<string, unknown>;
    const s =
      inner && typeof inner === 'object' && !Array.isArray(inner)
        ? inner
        : ({} as Record<string, unknown>);
    return {
      deviceId: String(
        s.device_id ?? s.deviceId ?? s.DeviceId ?? s.id ?? s.Id ?? fallbackDeviceId
      ),
      isConnected: Boolean(s.is_connected ?? s.isConnected ?? s.IsConnected),
      isLoggedIn: Boolean(s.is_logged_in ?? s.isLoggedIn ?? s.IsLoggedIn),
    };
  }

  async deleteAgent(id: string): Promise<void> {
    await this.api.delete(`/Agents/${id}`);
  }

  // --- Main Agent (الوكيل الرئيسي) — إدارة الوكلاء الفرعيين ---
  /** GET /main-agent/sub-agents — قائمة الوكلاء الفرعيين مع pagination وبحث */
  async getMainAgentSubAgents(params?: { page?: number; pageSize?: number; searchTerm?: string }): Promise<AgentsListResponse> {
    const queryParams: Record<string, string | number> = {
      page: params?.page ?? 1,
      pageSize: params?.pageSize ?? 10,
    };
    if (params?.searchTerm?.trim()) queryParams.searchTerm = params.searchTerm.trim();
    const response: AxiosResponse<AgentsListResponse> = await this.api.get('/main-agent/sub-agents', { params: queryParams });
    return response.data;
  }

  /** مسار لوحة الوكيل الرئيسي — GET /api/main-agent/dashboard */
  private static readonly MAIN_AGENT_DASHBOARD_PATH = '/main-agent/dashboard';

  /** GET /api/main-agent/dashboard — إحصائيات لوحة الوكيل الرئيسي (مجموع الوكلاء الفرعيين) */
  async getMainAgentDashboard(): Promise<MainAgentDashboardDto> {
    const response = await this.api.get(ApiService.MAIN_AGENT_DASHBOARD_PATH);
    const d = response.data as MainAgentDashboardDto & {
      TotalSubscribersCount?: number;
      SubAgentsCount?: number;
      ExpiredSubscribersCount?: number;
      ActiveSubscribersCount?: number;
      TotalDebtsAmount?: number;
      TotalIncomingAmount?: number;
    };
    return {
      totalSubscribersCount: d.totalSubscribersCount ?? d.TotalSubscribersCount ?? 0,
      subAgentsCount: d.subAgentsCount ?? d.SubAgentsCount ?? 0,
      expiredSubscribersCount: d.expiredSubscribersCount ?? d.ExpiredSubscribersCount ?? 0,
      activeSubscribersCount: d.activeSubscribersCount ?? d.ActiveSubscribersCount ?? 0,
      totalDebtsAmount: d.totalDebtsAmount ?? d.TotalDebtsAmount ?? 0,
      totalIncomingAmount: d.totalIncomingAmount ?? d.TotalIncomingAmount ?? 0,
    };
  }

  /** PUT /main-agent/sub-agents/{id} — تعديل وكيل فرعي */
  async updateMainAgentSubAgent(id: string, data: AgentUpdateRequest): Promise<Agent> {
    const response: AxiosResponse<Agent> = await this.api.put(`/main-agent/sub-agents/${id}`, data);
    return response.data;
  }

  /** DELETE /main-agent/sub-agents/{id} — حذف وكيل فرعي */
  async deleteMainAgentSubAgent(id: string): Promise<void> {
    await this.api.delete(`/main-agent/sub-agents/${id}`);
  }

  /** GET /main-agent/sub-agents/{agentId}/subscribers — مشتركو وكيل فرعي */
  async getMainAgentSubAgentSubscribers(agentId: string, params?: PaginationParams): Promise<PaginatedResponse<Subscriber>> {
    const queryParams: Record<string, unknown> = { page: params?.page ?? 1, pageSize: params?.pageSize ?? 10 };
    if (params?.search?.trim()) queryParams.searchTerm = params.search.trim();
    const response: AxiosResponse<PaginatedResponse<Subscriber>> = await this.api.get(
      `/main-agent/sub-agents/${agentId}/subscribers`,
      { params: queryParams }
    );
    return response.data;
  }

  /** GET /main-agent/sub-agents/{agentId}/renewals — تفعيلات/تجديدات وكيل فرعي */
  async getMainAgentSubAgentRenewals(
    agentId: string,
    params?: { page?: number; pageSize?: number; fromDate?: string; toDate?: string }
  ): Promise<PaginatedResponse<RenewalReceipt>> {
    const queryParams: Record<string, string | number> = { page: params?.page ?? 1, pageSize: params?.pageSize ?? 10 };
    if (params?.fromDate) queryParams.fromDate = params.fromDate;
    if (params?.toDate) queryParams.toDate = params.toDate;
    const response: AxiosResponse<PaginatedResponse<RenewalReceipt>> = await this.api.get(
      `/main-agent/sub-agents/${agentId}/renewals`,
      { params: queryParams }
    );
    return response.data;
  }

  /** GET /main-agent/sub-agents/{agentId}/debts — ديون مشتركي وكيل فرعي */
  async getMainAgentSubAgentDebts(agentId: string, params?: DebtsListParams): Promise<DebtsListResponse> {
    const queryParams = this.buildDebtsQueryParams(params);
    const response = await this.api.get(`/main-agent/sub-agents/${agentId}/debts`, { params: queryParams });
    const raw = response.data as DebtsListResponse & { data?: any[] };
    const transformedData = (raw.data || []).map((debt: any) => ({
      ...debt,
      isPaid: debt.status === 1,
      agentId: debt.agentId || '',
      agentName: debt.agentCompanyName || 'غير محدد',
      paidDate: undefined,
      status: debt.status ?? 0,
    }));
    return { ...raw, data: transformedData };
  }

  /** GET /main-agent/sub-agents/{agentId}/daily-account?date= — الحساب اليومي لوكيل فرعي */
  async getMainAgentSubAgentDailyAccount(agentId: string, date: string): Promise<DailyAccountResponse> {
    const response: AxiosResponse<DailyAccountResponse> = await this.api.get(
      `/main-agent/sub-agents/${agentId}/daily-account`,
      { params: { date } }
    );
    return response.data;
  }

  async renewAgentSubscription(id: string, renewalData: AgentRenewalRequest): Promise<Agent> {
    const response: AxiosResponse<Agent> = await this.api.post(`/Agents/${id}/renew`, renewalData);
    return response.data;
  }

  async checkExpiredAgents(): Promise<AgentSubscriptionCheck> {
    const response: AxiosResponse<AgentSubscriptionCheck> = await this.api.post('/Agents/check-expired');
    return response.data;
  }

  async getAgentEmployees(agentId: string): Promise<User[]> {
    const response: AxiosResponse<User[]> = await this.api.get(`/Agents/${agentId}/employees`);
    return normalizeUserList(response.data);
  }

  async createAgentEmployee(agentId: string, data: AgentEmployeeCreateRequest): Promise<User> {
    const body = {
      ...data,
      role: data.role === UserRole.SubAgent ? UserRole.SubAgent : UserRole.Employee,
    };
    const response: AxiosResponse<User> = await this.api.post(`/Agents/${agentId}/employees`, body);
    return normalizeUser(response.data);
  }

  /** موظفو الوكيل الحالي (Agent) */
  async getMyEmployees(): Promise<User[]> {
    const response: AxiosResponse<User[]> = await this.api.get('/Agents/me/employees');
    return normalizeUserList(response.data);
  }

  /** إضافة موظف للوكيل الحالي (Agent) — Body يتضمن role: 4 (Employee) أو 5 (SubAgent) */
  async createMyEmployee(data: AgentEmployeeCreateRequest): Promise<User> {
    const body = {
      ...data,
      role: data.role === UserRole.SubAgent ? UserRole.SubAgent : UserRole.Employee,
    };
    const response: AxiosResponse<User> = await this.api.post('/Agents/me/employees', body);
    return normalizeUser(response.data);
  }

  /** تعديل موظف تابع للوكيل الحالي (Agent) */
  async updateMyEmployee(id: string, data: AgentEmployeeUpdateRequest): Promise<User> {
    const response: AxiosResponse<User> = await this.api.put(`/Agents/me/employees/${id}`, data);
    return normalizeUser(response.data);
  }

  /** حذف موظف تابع للوكيل الحالي (Agent) */
  async deleteMyEmployee(id: string): Promise<void> {
    await this.api.delete(`/Agents/me/employees/${id}`);
  }

  // --- Employee Tasks ---
  async createEmployeeTask(
    data: import('../types').EmployeeTaskCreateRequest
  ): Promise<import('../types').EmployeeTask | import('../types').EmployeeTaskCreateBatchResponse> {
    const response = await this.api.post('/EmployeeTasks', data);
    const d = response.data as import('../types').EmployeeTask & import('../types').EmployeeTaskCreateBatchResponse;
    if (d && Array.isArray((d as import('../types').EmployeeTaskCreateBatchResponse).tasks)) {
      return d as import('../types').EmployeeTaskCreateBatchResponse;
    }
    return d as import('../types').EmployeeTask;
  }

  async updateEmployeeTask(
    id: string,
    data: import('../types').EmployeeTaskUpdateRequest
  ): Promise<import('../types').EmployeeTask> {
    const response = await this.api.put<import('../types').EmployeeTask>(`/EmployeeTasks/${id}`, data);
    return response.data;
  }

  async deleteEmployeeTask(id: string): Promise<void> {
    await this.api.delete(`/EmployeeTasks/${id}`);
  }

  async getMyEmployeeTasks(
    params?: import('../types').EmployeeTasksQuery
  ): Promise<PaginatedResponse<import('../types').EmployeeTask>> {
    const queryParams: Record<string, string | number> = {
      page: params?.page ?? 1,
      pageSize: params?.pageSize ?? 10,
    };
    if (params?.searchTerm?.trim()) queryParams.searchTerm = params.searchTerm.trim();
    if (typeof params?.status === 'number') queryParams.status = params.status;
    const response = await this.api.get<PaginatedResponse<import('../types').EmployeeTask>>('/EmployeeTasks/my', {
      params: queryParams,
    });
    return response.data;
  }

  async getAgentEmployeeTasks(
    params?: import('../types').EmployeeTasksQuery
  ): Promise<import('../types').EmployeeTasksAgentPageDto> {
    const queryParams: Record<string, string | number> = {
      page: params?.page ?? 1,
      pageSize: params?.pageSize ?? 10,
    };
    if (params?.searchTerm?.trim()) queryParams.searchTerm = params.searchTerm.trim();
    if (typeof params?.status === 'number') queryParams.status = params.status;
    if (params?.agentId?.trim()) queryParams.agentId = params.agentId.trim();
    const response = await this.api.get<import('../types').EmployeeTasksAgentPageDto>('/EmployeeTasks/agent', {
      params: queryParams,
    });
    const d = response.data as import('../types').EmployeeTasksAgentPageDto & Record<string, unknown>;
    const rawStats =
      (d.taskTypeStatistics as Record<string, unknown> | undefined) ??
      (d.TaskTypeStatistics as Record<string, unknown> | undefined);
    const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : Number(v) || 0);
    const taskTypeStatistics =
      rawStats && typeof rawStats === 'object'
        ? {
            subscriberInstallation: num(rawStats.subscriberInstallation ?? rawStats.SubscriberInstallation),
            subscriberMaintenance: num(rawStats.subscriberMaintenance ?? rawStats.SubscriberMaintenance),
            amountReception: num(rawStats.amountReception ?? rawStats.AmountReception),
            other: num(rawStats.other ?? rawStats.Other),
          }
        : undefined;
    return {
      ...d,
      data: Array.isArray(d.data) ? d.data : Array.isArray((d as any).Data) ? (d as any).Data : [],
      taskTypeStatistics,
    };
  }

  async getEmployeeTaskMaterials(params?: {
    page?: number;
    pageSize?: number;
    searchTerm?: string;
    agentId?: string;
  }): Promise<PaginatedResponse<import('../types').EmployeeTaskMaterialOption>> {
    const queryParams: Record<string, string | number> = {
      page: params?.page ?? 1,
      pageSize: params?.pageSize ?? 10,
    };
    if (params?.searchTerm?.trim()) queryParams.searchTerm = params.searchTerm.trim();
    if (params?.agentId?.trim()) queryParams.agentId = params.agentId.trim();

    const response = await this.api.get<PaginatedResponse<import('../types').EmployeeTaskMaterialOption>>(
      '/EmployeeTasks/materials',
      { params: queryParams }
    );
    return response.data;
  }

  /** GET /EmployeeTasks/subscribers — خيارات مشتركي الوكيل (صيانة / استلام مبلغ؛ debtOnly=ذوو الدين فقط) */
  async getEmployeeTaskSubscribers(params?: {
    page?: number;
    pageSize?: number;
    searchTerm?: string;
    agentId?: string;
    debtOnly?: boolean;
  }): Promise<PaginatedResponse<import('../types').EmployeeTaskSubscriberOption>> {
    const queryParams: Record<string, string | number | boolean> = {
      page: params?.page ?? 1,
      pageSize: params?.pageSize ?? 10,
    };
    if (params?.searchTerm?.trim()) queryParams.searchTerm = params.searchTerm.trim();
    if (params?.agentId?.trim()) queryParams.agentId = params.agentId.trim();
    if (params?.debtOnly === true) queryParams.debtOnly = true;

    const response = await this.api.get<PaginatedResponse<import('../types').EmployeeTaskSubscriberOption>>(
      '/EmployeeTasks/subscribers',
      { params: queryParams }
    );
    return response.data;
  }

  /** GET /EmployeeTasks/subscriber/{subscriberId}/tasks — مهام المشترك مع ترقيم */
  async getSubscriberEmployeeTasks(
    subscriberId: string,
    params?: { page?: number; pageSize?: number; searchTerm?: string }
  ): Promise<PaginatedResponse<import('../types').EmployeeTask>> {
    const queryParams: Record<string, string | number> = {
      Page: params?.page ?? 1,
      PageSize: params?.pageSize ?? 10,
    };
    if (params?.searchTerm?.trim()) queryParams.searchTerm = params.searchTerm.trim();
    const response = await this.api.get<PaginatedResponse<import('../types').EmployeeTask>>(
      `/EmployeeTasks/subscriber/${encodeURIComponent(subscriberId)}/tasks`,
      { params: queryParams }
    );
    const body = response.data;
    return {
      ...body,
      data: Array.isArray(body?.data) ? body.data : [],
    };
  }

  // --- Web Push (PWA) ---
  async getWebPushVapidPublicKey(): Promise<{ publicKey: string }> {
    const response = await this.api.get<{ publicKey: string }>('/Push/vapid-public-key');
    return response.data;
  }

  async subscribeWebPush(body: { subscription: any; userAgent?: string }): Promise<{ ok: boolean }> {
    const response = await this.api.post<{ ok: boolean }>('/Push/subscribe', body);
    return response.data;
  }

  async acceptEmployeeTask(id: string): Promise<import('../types').EmployeeTask> {
    const response = await this.api.post<import('../types').EmployeeTask>(`/EmployeeTasks/${id}/accept`);
    return response.data;
  }

  async rejectEmployeeTask(
    id: string,
    data: import('../types').EmployeeTaskRejectRequest
  ): Promise<import('../types').EmployeeTask> {
    const response = await this.api.post<import('../types').EmployeeTask>(`/EmployeeTasks/${id}/reject`, data);
    return response.data;
  }

  async completeEmployeeInstallationTask(
    id: string,
    data: import('../types').EmployeeTaskCompleteInstallationRequest
  ): Promise<import('../types').EmployeeTask> {
    const payload: Record<string, unknown> = {
      amountReceived: data.amountReceived,
    };
    const note = (data.note || '').trim();
    if (note) payload.note = note;
    const response = await this.api.post<import('../types').EmployeeTask>(`/EmployeeTasks/${id}/complete-installation`, payload);
    return response.data;
  }

  async completeEmployeeMaintenanceTask(
    id: string,
    data: import('../types').EmployeeTaskCompleteMaintenanceRequest
  ): Promise<import('../types').EmployeeTask> {
    const payload: Record<string, string> = {
      note: (data.note || '').trim(),
    };
    if (!payload.note) delete payload.note;
    const response = await this.api.post<import('../types').EmployeeTask>(
      `/EmployeeTasks/${id}/complete-maintenance`,
      payload
    );
    return response.data;
  }

  async completeEmployeeAmountReceptionTask(
    id: string,
    data: import('../types').EmployeeTaskCompleteAmountReceptionRequest
  ): Promise<import('../types').EmployeeTask> {
    const payload: Record<string, unknown> = {
      amountReceived: data.amountReceived,
    };
    const note = (data.note || '').trim();
    if (note) payload.note = note;
    const response = await this.api.post<import('../types').EmployeeTask>(
      `/EmployeeTasks/${id}/complete-amount-reception`,
      payload
    );
    return response.data;
  }

  /**
   * سجل النظام (GET /admin/activity-log) — المسار الكامل: /wakeel/api/admin/activity-log
   * - Agent: لا يرسل agentId (الباكند يستنتجه من التوكن)
   * - Admin: يجب إرسال agentId
   * - فلترة متقدمة: activityType (انظر GET …/activity-types), subscriberName, fromDate, toDate (yyyy-MM-dd)
   */
  async getActivityLog(params: {
    agentId?: string;
    page: number;
    pageSize: number;
    activityType?: ActivityType;
    subscriberName?: string;
    fromDate?: string;
    toDate?: string;
  }): Promise<PaginatedResponse<ActivityLogItem>> {
    const queryParams: Record<string, string | number> = {
      page: params.page,
      pageSize: params.pageSize,
    };
    if (params.agentId) queryParams.agentId = params.agentId;
    if (params.activityType != null) queryParams.activityType = params.activityType;
    if (params.subscriberName?.trim()) queryParams.subscriberName = params.subscriberName.trim();
    if (params.fromDate) queryParams.fromDate = params.fromDate.split('T')[0];
    if (params.toDate) queryParams.toDate = params.toDate.split('T')[0];
    const response: AxiosResponse<unknown> = await this.api.get('/admin/activity-log', {
      params: queryParams,
    });
    return normalizePaginatedActivityLogFromApi(response.data);
  }

  /**
   * أنواع النشاط للفلتر (GET /admin/activity-log/activity-types)
   */
  async getActivityLogActivityTypes(): Promise<ActivityLogActivityTypeOption[]> {
    const response: AxiosResponse<unknown> = await this.api.get('/admin/activity-log/activity-types');
    return normalizeActivityLogActivityTypesFromApi(response.data);
  }

  // Profile/Package endpoints
  async getProfiles(params?: ProfileListParams): Promise<PaginatedResponse<Profile>> {
    const response: AxiosResponse<PaginatedResponse<Profile> | Profile[]> = await this.api.get('/subscribers/profiles', {
      params: params ? {
        page: params.page,
        pageSize: params.pageSize,
        searchTerm: params.searchTerm || undefined,
        sortBy: params.sortBy || undefined,
        sortDescending: params.sortDescending,
        status: params.status,
        resellerId: params.resellerId || undefined,
      } : undefined,
    });
    const data = response.data;
    if (Array.isArray(data)) {
      return {
        data,
        currentPage: 1,
        pageSize: data.length,
        totalItems: data.length,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
        totalCount: data.length,
        pageNumber: 1,
      };
    }
    return data as PaginatedResponse<Profile>;
  }

  async createProfile(profileData: ProfileCreateRequest): Promise<Profile> {
    const response: AxiosResponse<Profile> = await this.api.post('/subscribers/profiles', profileData);
    return response.data;
  }

  async updateProfile(id: string, profileData: ProfileUpdateRequest): Promise<Profile> {
    const response: AxiosResponse<Profile> = await this.api.put(`/subscribers/profiles/${id}`, profileData);
    return response.data;
  }

  async deleteProfile(id: string): Promise<void> {
    await this.api.delete(`/subscribers/profiles/${id}`);
  }

  private normalizeMaterial(m: any): Material {
    return {
      ...m,
      id: m?.id ?? m?.Id ?? '',
      name: m?.name ?? m?.Name ?? '',
      imagePngUrl: m?.imagePngUrl ?? m?.ImagePngUrl ?? null,
      quantity: Number(m?.quantity ?? m?.Quantity ?? 0) || 0,
      agentPrice: Number(m?.agentPrice ?? m?.AgentPrice ?? 0) || 0,
      subscriberPrice: Number(m?.subscriberPrice ?? m?.SubscriberPrice ?? 0) || 0,
      dealerPrice: Number(m?.dealerPrice ?? m?.DealerPrice ?? 0) || 0,
      notes: m?.notes ?? m?.Notes ?? null,
      agentId: m?.agentId ?? m?.AgentId,
      createdAt: m?.createdAt ?? m?.CreatedAt,
      updatedAt: m?.updatedAt ?? m?.UpdatedAt,
    };
  }

  /** قائمة المواد — GET /api/Materials مع ترقيم وفلترة (searchTerm: اسم المادة أو الملاحظات) */
  async getMaterials(
    agentId?: string,
    params?: { page?: number; pageSize?: number; searchTerm?: string }
  ): Promise<PaginatedResponse<Material>> {
    const queryParams: Record<string, number | string | undefined> = {
      page: params?.page ?? 1,
      pageSize: params?.pageSize ?? 10,
    };
    if (agentId) queryParams.agentId = agentId;
    if (params?.searchTerm?.trim()) queryParams.searchTerm = params.searchTerm.trim();

    const response: AxiosResponse<PaginatedResponse<Material> | Material[]> = await this.api.get('/Materials', {
      params: queryParams,
    });
    const data = response.data;
    if (Array.isArray(data)) {
      const normalized = data.map((m) => this.normalizeMaterial(m));
      const total = normalized.length;
      return {
        data: normalized,
        currentPage: 1,
        pageSize: total,
        totalItems: total,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
        totalCount: total,
        pageNumber: 1,
      };
    }
    const paginated = data as PaginatedResponse<Material>;
    const totalItems = paginated.totalItems ?? paginated.totalCount ?? (paginated.data?.length ?? 0);
    const currentPage = paginated.currentPage ?? paginated.pageNumber ?? 1;
    const pageSize = paginated.pageSize ?? 10;
    return {
      data: (paginated.data ?? []).map((m: any) => this.normalizeMaterial(m)),
      currentPage,
      pageSize,
      totalItems,
      totalPages: paginated.totalPages ?? 1,
      hasNextPage: paginated.hasNextPage ?? false,
      hasPreviousPage: paginated.hasPreviousPage ?? false,
      totalCount: totalItems,
      pageNumber: currentPage,
    };
  }

  /** إضافة مادة — POST /api/Materials (أدمن/وكيل/مدير ثانوي، اختياري: agentId للأدمن) */
  async createMaterial(data: MaterialCreateRequest, agentId?: string): Promise<Material> {
    const response: AxiosResponse<Material> = await this.api.post('/Materials', data, {
      params: agentId ? { agentId } : undefined,
    });
    return this.normalizeMaterial(response.data);
  }

  /** تعديل مادة — PUT /api/Materials/{id} (اختياري: agentId للأدمن) */
  async updateMaterial(id: string, data: MaterialUpdateRequest, agentId?: string): Promise<Material> {
    const response: AxiosResponse<Material> = await this.api.put(`/Materials/${id}`, data, {
      params: agentId ? { agentId } : undefined,
    });
    return this.normalizeMaterial(response.data);
  }

  /** حذف مادة — DELETE /api/Materials/{id} (اختياري: agentId للأدمن) */
  async deleteMaterial(id: string, agentId?: string): Promise<void> {
    await this.api.delete(`/Materials/${id}`, {
      params: agentId ? { agentId } : undefined,
    });
  }

  /** صرف/بيع مادة — POST /api/Materials/disburse (اختياري: agentId للأدمن)، يُرجع السجل المُنشأ مع رقم الفاتورة عند البيع */
  async postMaterialDisburse(data: MaterialDisburseRequest, agentId?: string): Promise<MaterialDisbursement> {
    const response = await this.api.post<MaterialDisbursementApi>('/Materials/disburse', data, {
      params: agentId ? { agentId } : undefined,
    });
    return normalizeMaterialDisbursementFromApi(response.data);
  }

  /** استرجاع مادة — POST /api/Materials/disbursements/return (اختياري: agentId للأدمن) */
  async postMaterialReturn(data: MaterialReturnRequest, agentId?: string): Promise<void> {
    await this.api.post('/Materials/disbursements/return', data, {
      params: agentId ? { agentId } : undefined,
    });
  }

  /** قائمة المواد المصروفة — GET /api/Materials/disbursements مع فلترة وترقيم وإحصائيات */
  async getMaterialDisbursements(
    agentId?: string,
    params?: {
      page?: number;
      pageSize?: number;
      searchTerm?: string;
      disbursementType?: number;
      fromDate?: string;
      toDate?: string;
      /** فلتر اختياري على MaterialDisbursement.DisbursedByUserId — يُطبَّق على القائمة والإحصائيات */
      disbursedByUserId?: string;
    }
  ): Promise<MaterialDisbursementsResponse> {
    const queryParams: Record<string, number | string | undefined> = {
      page: params?.page ?? 1,
      pageSize: params?.pageSize ?? 10,
    };
    if (agentId) queryParams.agentId = agentId;
    if (params?.searchTerm?.trim()) queryParams.searchTerm = params.searchTerm.trim();
    if (params?.disbursementType !== undefined && params?.disbursementType !== null)
      queryParams.disbursementType = params.disbursementType;
    if (params?.fromDate?.trim()) queryParams.fromDate = params.fromDate.trim().split('T')[0];
    if (params?.toDate?.trim()) queryParams.toDate = params.toDate.trim().split('T')[0];
    if (params?.disbursedByUserId?.trim()) queryParams.disbursedByUserId = params.disbursedByUserId.trim();

    const response: AxiosResponse<MaterialDisbursementsResponse> = await this.api.get('/Materials/disbursements', {
      params: queryParams,
    });
    const data = response.data;
    if (Array.isArray(data)) {
      const rows = (data as MaterialDisbursementApi[]).map((d) => normalizeMaterialDisbursementFromApi(d));
      return {
        data: rows,
        currentPage: 1,
        pageSize: rows.length,
        totalItems: rows.length,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      };
    }
    const raw = data as { data?: MaterialDisbursement[]; Data?: MaterialDisbursement[]; currentPage?: number; pageSize?: number; totalItems?: number; totalPages?: number; hasNextPage?: boolean; hasPreviousPage?: boolean; statistics?: MaterialDisbursementsResponse['statistics'] };
    const items = (raw.data ?? raw.Data ?? []).map((d) =>
      normalizeMaterialDisbursementFromApi(d as MaterialDisbursementApi)
    );
    return {
      data: items,
      currentPage: raw.currentPage ?? 1,
      pageSize: raw.pageSize ?? 10,
      totalItems: raw.totalItems ?? 0,
      totalPages: raw.totalPages ?? 1,
      hasNextPage: raw.hasNextPage ?? false,
      hasPreviousPage: raw.hasPreviousPage ?? false,
      statistics: raw.statistics,
    };
  }

  // Subscriber endpoints

  /**
   * تصدير/سحب مشتركي FTTH — POST /providers/sas/ftth-subscribers-export
   * query: agentId (أدمن)، resellerId، expirationFrom، expirationTo (اختياري)
   */
  async exportFtthSubscribers(
    query: {
      agentId?: string;
      resellerId?: string;
      expirationFrom?: string;
      expirationTo?: string;
    },
    body: FtthSubscribersExportBody | Record<string, never>
  ): Promise<FtthSubscribersExportResponse> {
    const params: Record<string, string> = {};
    if (query.agentId) params.agentId = query.agentId;
    if (query.resellerId) params.resellerId = query.resellerId;
    if (query.expirationFrom) params.expirationFrom = query.expirationFrom;
    if (query.expirationTo) params.expirationTo = query.expirationTo;
    const response = await this.api.post<FtthSubscribersExportResponse>(
      '/providers/sas/ftth-subscribers-export',
      body,
      {
        params: Object.keys(params).length ? params : undefined,
        timeout: 600_000,
        headers: { 'Content-Type': 'application/json' },
      }
    );
    return response.data ?? {};
  }

  /**
   * حفظ قائمة مشتركي FTTH المُصدَّرة في قاعدة الوكيل — POST /providers/sas/ftth-subscribers-import
   */
  async importFtthSubscribers(
    payload: { data: unknown[] },
    options?: { agentId?: string; resellerId?: string }
  ): Promise<FtthSubscribersImportResponse> {
    const params: Record<string, string> = {};
    if (options?.agentId?.trim()) params.agentId = options.agentId.trim();
    if (options?.resellerId?.trim()) params.resellerId = options.resellerId.trim();
    const response = await this.api.post<FtthSubscribersImportResponse>(
      '/providers/sas/ftth-subscribers-import',
      payload,
      {
        params: Object.keys(params).length ? params : undefined,
        timeout: 600_000,
        headers: { 'Content-Type': 'application/json' },
      }
    );
    return response.data ?? {};
  }

  /**
   * تصدير/سحب مشتركي SAS أو Earthlink — POST /providers/sas/sas-subscribers-export
   * (للوحات FTTH استخدم ftth-subscribers-export؛ هذا المسار يرد 400 إن كان الرسيلر FTTH)
   */
  async exportSasSubscribers(
    query: {
      agentId?: string;
      resellerId?: string;
      expirationFrom?: string;
      expirationTo?: string;
    },
    body: SasSubscribersExportBody | Record<string, never>
  ): Promise<SasSubscribersExportResponse> {
    const params: Record<string, string> = {};
    if (query.agentId) params.agentId = query.agentId;
    if (query.resellerId) params.resellerId = query.resellerId;
    if (query.expirationFrom) params.expirationFrom = query.expirationFrom;
    if (query.expirationTo) params.expirationTo = query.expirationTo;
    const response = await this.api.post<SasSubscribersExportResponse>(
      '/providers/sas/sas-subscribers-export',
      body,
      {
        params: Object.keys(params).length ? params : undefined,
        timeout: 600_000,
        headers: { 'Content-Type': 'application/json' },
      }
    );
    return response.data ?? {};
  }

  /**
   * حفظ قائمة مشتركي SAS المُصدَّرة في قاعدة الوكيل — POST /providers/sas/sas-subscribers-import-json
   * (يستورد مصفوفة data الجاهزة؛ مرّر resellerId لربط المشتركين بالمنطقة)
   */
  async importSasSubscribers(
    payload: { data: unknown[] },
    options?: { agentId?: string; resellerId?: string }
  ): Promise<SasSubscribersImportResponse> {
    const params: Record<string, string> = {};
    if (options?.agentId?.trim()) params.agentId = options.agentId.trim();
    if (options?.resellerId?.trim()) params.resellerId = options.resellerId.trim();
    const response = await this.api.post<SasSubscribersImportResponse & { synced?: number; skippedByNameUsername?: number }>(
      '/providers/sas/sas-subscribers-import-json',
      payload,
      {
        params: Object.keys(params).length ? params : undefined,
        timeout: 600_000,
        headers: { 'Content-Type': 'application/json' },
      }
    );
    const raw = response.data ?? {};
    return {
      imported: raw.imported ?? raw.synced,
      skippedDuplicate: raw.skippedDuplicate ?? raw.skippedByNameUsername,
      phoneUpdated: raw.phoneUpdated,
      updated: raw.updated,
      errors: raw.errors,
      errorMessages: raw.errorMessages,
    };
  }

  async getSubscribers(params?: PaginationParams): Promise<PaginatedResponse<Subscriber>> {
    try {
      // تنظيف params - إزالة undefined values
      const cleanParams: any = {};
      if (params?.page !== undefined) cleanParams.Page = params.page;
      if (params?.pageSize !== undefined) cleanParams.PageSize = params.pageSize;
      // الباكند يستخدم searchTerm بدلاً من search
      if (params?.search && params.search.trim()) {
        cleanParams.searchTerm = params.search.trim();
      }
      // الباكند يستخدم Status (بحرف S كبير)
      if (params?.status) cleanParams.Status = params.status;
      if (params?.role) cleanParams.role = params.role;
      if (params?.sortBy) cleanParams.sortBy = params.sortBy;
      if (params?.sortDescending !== undefined) cleanParams.sortDescending = params.sortDescending === true;
      if (params?.maxDaysUntilExpiry !== undefined && params.maxDaysUntilExpiry >= 0) {
        cleanParams.maxDaysUntilExpiry = params.maxDaysUntilExpiry;
      }
      if (params?.fat?.trim()) cleanParams.fat = params.fat.trim();
      if (params?.zone?.trim()) cleanParams.zone = params.zone.trim();
      if (params?.noteType !== undefined && params.noteType !== null) {
        cleanParams.noteType = params.noteType;
      }
      if (params?.expirationFromDate?.trim()) {
        cleanParams.ExpirationFromDate = params.expirationFromDate.trim().split('T')[0];
      }
      if (params?.expirationToDate?.trim()) {
        cleanParams.ExpirationToDate = params.expirationToDate.trim().split('T')[0];
      }
      if (params?.resellerId?.trim()) {
        cleanParams.resellerId = params.resellerId.trim();
      }
      if (params?.hasExtensionActivation) {
        cleanParams.hasExtensionActivation = true;
      }
      
      console.log('🌐 API: getSubscribers called with params:', cleanParams);
      console.log('🌐 API: Full URL will be:', this.api.defaults.baseURL + '/subscribers?' + new URLSearchParams(cleanParams).toString());
      
      const response: AxiosResponse<PaginatedResponse<Subscriber>> = await this.api.get('/subscribers', { params: cleanParams });
      const body = response.data as PaginatedResponse<Subscriber> & { Data?: Subscriber[] };
      const list: Subscriber[] = Array.isArray(body.data)
        ? body.data
        : Array.isArray(body.Data)
          ? body.Data
          : [];

      console.log('✅ API: getSubscribers response received:', {
        totalItems: body.totalItems ?? (body as any).TotalItems,
        dataLength: list.length,
        currentPage: body.currentPage ?? (body as any).CurrentPage,
      });

      const processedData: PaginatedResponse<Subscriber> = {
        ...body,
        currentPage: body.currentPage ?? (body as any).CurrentPage ?? 1,
        pageSize: body.pageSize ?? (body as any).PageSize ?? list.length,
        totalItems: body.totalItems ?? (body as any).TotalItems ?? list.length,
        totalPages: body.totalPages ?? (body as any).TotalPages ?? 1,
        hasNextPage: body.hasNextPage ?? (body as any).HasNextPage ?? false,
        hasPreviousPage: body.hasPreviousPage ?? (body as any).HasPreviousPage ?? false,
        data: list.map((subscriber: any) => ({
          ...subscriber,
          id: String(subscriber.id ?? subscriber.Id ?? '').trim(),
          paymentStatus: subscriber.paymentStatus === 0 ? PaymentStatus.Unknown : subscriber.paymentStatus,
          paymentMethod: subscriber.paymentMethod ?? subscriber.PaymentMethod ?? null,
          expirationDate: subscriber.expirationDate || subscriber.activationDate,
        })),
      };

      return processedData;
    } catch (error) {
      console.error('Error fetching subscribers:', error);
      // إرجاع بيانات وهمية للتطوير
      const mockSubscribers: Subscriber[] = [
        {
          id: '1',
          username: 'ahmed123',
          firstName: 'أحمد',
          lastName: 'محمد',
          fullName: 'أحمد محمد',
          phoneNumber: '07701234567',
          note: 'مشترك نشط',
          isActive: true,
          activationDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          subscriptionType: SubscriptionType.Paid,
          status: SubscriptionStatus.Active,
          paymentStatus: PaymentStatus.Paid,
          daysUntilExpiry: 25,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          profileName: 'باقة شهرية',
          profilePrice: 25000,
          agentCompanyName: 'وكيل بغداد'
        },
        {
          id: '2',
          username: 'fatima456',
          firstName: 'فاطمة',
          lastName: 'علي',
          fullName: 'فاطمة علي',
          phoneNumber: '07701234568',
          note: 'مشترك جديد',
          isActive: true,
          activationDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          expirationDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
          subscriptionType: SubscriptionType.Paid,
          status: SubscriptionStatus.Active,
          paymentStatus: PaymentStatus.Unpaid,
          daysUntilExpiry: 3,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          profileName: 'باقة أسبوعية',
          profilePrice: 8000,
          agentCompanyName: 'وكيل بغداد'
        }
      ];
      
      return {
        data: mockSubscribers,
        currentPage: 1,
        pageSize: 10,
        totalItems: mockSubscribers.length,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
        totalCount: mockSubscribers.length,
        pageNumber: 1
      };
    }
  }

  async getSubscriberById(id: string): Promise<Subscriber> {
    const response: AxiosResponse<Subscriber> = await this.api.get(`/subscribers/${id}`);
    // معالجة البيانات للتأكد من التطابق
    const d = response.data as any;
    const mr = d.maintenanceRecords ?? d.MaintenanceRecords;
    return {
      ...response.data,
      paymentStatus: response.data.paymentStatus === 0 ? PaymentStatus.Unknown : response.data.paymentStatus,
      paymentMethod: d.paymentMethod ?? d.PaymentMethod ?? null,
      expirationDate: response.data.expirationDate || response.data.activationDate,
      maintenanceRecords: Array.isArray(mr) ? mr : [],
    };
  }

  async createSubscriber(subscriberData: SubscriberCreateRequest): Promise<Subscriber> {
    const response: AxiosResponse<Subscriber> = await this.api.post('/subscribers', subscriberData);
    return response.data;
  }

  async updateSubscriber(id: string, subscriberData: SubscriberUpdateRequest): Promise<Subscriber> {
    const response: AxiosResponse<Subscriber> = await this.api.put(`/subscribers/${id}`, subscriberData);
    return response.data;
  }

  /**
   * PATCH /subscribers/{id}/notes — تحديث ملاحظات المشترك (SubscriberNotesPatchDto).
   * لا تُرسل إلا الحقول التي تغيّرت؛ انظر buildSubscriberNotesPatch.
   */
  async patchSubscriberNotes(id: string, patch: SubscriberNotesPatchDto): Promise<Subscriber> {
    const body: Record<string, unknown> = {};
    if (patch.noteType !== undefined) body.noteType = patch.noteType;
    if (patch.clearNoteType === true) body.clearNoteType = true;
    if (patch.note !== undefined) body.note = patch.note;
    if (patch.clearNote === true) body.clearNote = true;
    const response: AxiosResponse<Subscriber> = await this.api.patch(`/subscribers/${id}/notes`, body);
    return response.data;
  }

  async deleteSubscriber(id: string): Promise<void> {
    await this.api.delete(`/subscribers/${id}`);
  }

  /**
   * إرسال رسالة تنبيه واحدة عبر `POST .../send-whatsapp-alert` (لا يُستدعى تفعيل منفصل ولا تفاصيل منفصلة).
   * الاسم التاريخي `sendWhatsAppReminder` يبقى لتوافق الاستدعاءات؛ السلوك هو نفس `sendWhatsAppAlert`.
   */
  async sendWhatsAppReminder(subscriberId: string): Promise<void> {
    await this.sendWhatsAppAlert(subscriberId);
  }

  /** مهلة أطول لإرسال واتساب لأن wwebjs على Railway قد يستغرق وقتاً */
  static readonly WHATSAPP_SEND_TIMEOUT_MS = 60000;

  /** مزامنة SAS/FTTH (جلب قائمة، JSON، إلخ) قد تتجاوز دقيقتين بعد توسيع السكربت */
  static readonly SAS_SYNC_TIMEOUT_MS = 600_000; // 10 minutes
  /** مزامنة Zain Fi² (سكربت طويل للقوائم الكبيرة) */
  static readonly ZAINFI_SYNC_TIMEOUT_MS = 900_000; // 15 minutes

  /** إرسال رسالة التفعيل/التجديد فقط عبر wwebjs-api */
  async sendWhatsAppActivation(subscriberId: string): Promise<void> {
    await this.api.post(`/subscribers/${subscriberId}/send-whatsapp-activation`, undefined, {
      timeout: ApiService.WHATSAPP_SEND_TIMEOUT_MS,
    });
  }

  /** إرسال رسالة التنبيه فقط عبر wwebjs-api */
  async sendWhatsAppAlert(subscriberId: string): Promise<void> {
    await this.api.post(`/subscribers/${subscriberId}/send-whatsapp-alert`, undefined, {
      timeout: ApiService.WHATSAPP_SEND_TIMEOUT_MS,
    });
  }

  /** إرسال رسالة الدين او التفاصيل فقط عبر wwebjs-api */
  async sendWhatsAppDetails(subscriberId: string): Promise<void> {
    await this.api.post(`/subscribers/${subscriberId}/send-whatsapp-details`, undefined, {
      timeout: ApiService.WHATSAPP_SEND_TIMEOUT_MS,
    });
  }

  /** إرسال تنبيه تسديد الدين عبر القالب المستقل DebtAlertMessage */
  async sendWhatsAppDebtAlert(subscriberId: string): Promise<void> {
    await this.api.post(`/subscribers/${subscriberId}/send-whatsapp-debt-alert`, undefined, {
      timeout: ApiService.WHATSAPP_SEND_TIMEOUT_MS,
    });
  }

  async getSubscriberInfo(username: string): Promise<SubscriberInfo> {
    const response: AxiosResponse<SubscriberInfo> = await this.api.get(`/subscribers/info/${username}`);
    return response.data;
  }

  /** إعدادات تطبيق المشترك (طريقة الدفع، رقم البطاقة، عنوان المكتب) — GET /api/AppSettings */
  async getAppSettings(): Promise<AppSettingsResponse> {
    const response = await this.api.get<AppSettingsResponse>('/AppSettings');
    return response.data;
  }

  /** تحديث إعدادات تطبيق المشترك — PUT /api/AppSettings */
  async updateAppSettings(data: AppSettingsUpdateRequest): Promise<AppSettingsResponse> {
    const response = await this.api.put<AppSettingsResponse>('/AppSettings', data);
    return response.data;
  }

  /** قائمة إعلانات الوكيل — GET /api/AppSettings/announcements */
  async getAgentAnnouncements(): Promise<AgentAnnouncementDto[]> {
    const response = await this.api.get<AgentAnnouncementDto[]>('/AppSettings/announcements');
    return response.data;
  }

  /** إعلان واحد — GET /api/AppSettings/announcements/{id} */
  async getAgentAnnouncementById(id: string): Promise<AgentAnnouncementDto> {
    const response = await this.api.get<AgentAnnouncementDto>(`/AppSettings/announcements/${id}`);
    return response.data;
  }

  /** إنشاء إعلان — POST /api/AppSettings/announcements */
  async createAgentAnnouncement(data: AgentAnnouncementCreateRequest): Promise<AgentAnnouncementDto> {
    const response = await this.api.post<AgentAnnouncementDto>('/AppSettings/announcements', data);
    return response.data;
  }

  /** تعديل إعلان — PUT /api/AppSettings/announcements/{id} */
  async updateAgentAnnouncement(id: string, data: AgentAnnouncementCreateRequest): Promise<AgentAnnouncementDto> {
    const response = await this.api.put<AgentAnnouncementDto>(`/AppSettings/announcements/${id}`, data);
    return response.data;
  }

  /** حذف إعلان — DELETE /api/AppSettings/announcements/{id} */
  async deleteAgentAnnouncement(id: string): Promise<void> {
    await this.api.delete(`/AppSettings/announcements/${id}`);
  }

  // Renewals
  async renewSubscribers(subscriberIds: string[]): Promise<void> {
    await this.api.post('/renewals', { subscriberIds });
  }

  async createRenewal(renewalData: RenewalData): Promise<any> {
    try {
      const mode = renewalData.activationMode ?? RenewalActivationMode.Full;
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
        wiFiQRCode: renewalData.wiFiQRCode || null,
        remainingAmount: renewalData.remainingAmount || 0,
        debtDescription: renewalData.debtDescription || '',
        currentExpirationDate: renewalData.currentExpirationDate || null,
        renewalPeriod: renewalData.renewalPeriod || null,
        activationMode: mode,
      };
      if (mode === RenewalActivationMode.OtherDealer) {
        const did = renewalData.dealerId?.trim();
        if (did) payload.dealerId = did;
      }
      if (renewalDateNorm) {
        payload.renewalDate = renewalDateNorm;
      }
      const snt = renewalData.subscriberNoteType;
      if (snt != null && Number.isFinite(Number(snt))) {
        payload.subscriberNoteType = Number(snt);
      }

      const response: AxiosResponse<any> = await this.api.post('/renewals', payload);
      
      // تسجيل استجابة الباك إند للتحقق من رقم الفاتورة
      console.log('Backend response for renewal creation:', response.data);
      console.log('Receipt number from backend:', response.data?.receiptNumber);
      
      return response.data;
    } catch (error) {
      console.error('Error creating renewal:', error);
      throw error; // إعادة رمي الخطأ بدلاً من إرجاع بيانات وهمية
    }
  }


  /** إحصائيات المشتركين للوحة التحكم + الوارد */
  async getSubscribersDashboard(params?: { agentId?: string; fromDate?: string; toDate?: string; resellerId?: string }): Promise<SubscribersDashboardStats> {
    const response: AxiosResponse<SubscribersDashboardStats> = await this.api.get('/subscribers/dashboard', { params });
    return response.data;
  }

  // Dashboard stats (قديم — للتوافق إن استُدعي من مكان آخر)
  async getDashboardStats(): Promise<DashboardStats> {
    try {
      const response: AxiosResponse<DashboardStats> = await this.api.get('/dashboard/stats');
      return response.data;
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      try {
        const subscribersResponse = await this.getSubscribers({ page: 1, pageSize: 1000 });
        const subscribers = subscribersResponse.data;
        const totalSubscribers = subscribers.length;
        const activeSubscribers = subscribers.filter(s =>
          s.isSubscriptionActive === true || (s.isSubscriptionActive == null && (s.status === 1 || s.status === 2))
        ).length;
        const expiringSoonSubscribers = subscribers.filter(s => s.daysUntilExpiry > 0 && s.daysUntilExpiry <= 7).length;
        const expiredSubscribers = subscribers.filter(s => s.status === 3).length;
        return {
          totalSubscribers,
          activeSubscribers,
          expiringSoonSubscribers,
          expiredSubscribers
        };
      } catch (fallbackError) {
        console.error('Error calculating dashboard stats:', fallbackError);
        return {
          totalSubscribers: 0,
          activeSubscribers: 0,
          expiringSoonSubscribers: 0,
          expiredSubscribers: 0
        };
      }
    }
  }

  // Debts stats
  async getDebtsStats(): Promise<{ totalDebtAmount: number; totalDebtors: number }> {
    const subscribersResponse = await this.getSubscribers({ page: 1, pageSize: 1000 });
    const subscribers = subscribersResponse.data;

    const subscribersWithDebts = subscribers.filter((subscriber: Subscriber) =>
      subscriber.paymentStatus === PaymentStatus.Unpaid || subscriber.paymentStatus === PaymentStatus.Pending
    );

    const totalDebtAmount = subscribersWithDebts.reduce((total: number, subscriber: Subscriber) => {
      return total + (subscriber.profilePrice || 0);
    }, 0);

    return {
      totalDebtAmount,
      totalDebtors: subscribersWithDebts.length
    };
  }

  async getSubscriberRenewalHistory(subscriberId: string): Promise<any[]> {
    try {
      const response = await this.api.get(`/subscribers/${subscriberId}/renewal-history`);
      return response.data;
    } catch (error) {
      console.error('Error fetching subscriber renewal history:', error);
      // إرجاع مصفوفة فارغة في حالة عدم توفر البيانات
      return [];
    }
  }

  async updateSubscriberProfile(id: string, profileId: string): Promise<Subscriber> {
    const response = await this.api.put(`/subscribers/profiles/${id}`, { profileId });
    return response.data;
  }

  /** يبني query params لطلبات الديون (GET /api/Debts) — يدعم DebtDescription, paymentCreatedAtFrom/To, DebtStatus */
  private buildDebtsQueryParams(params?: DebtsListParams): Record<string, string | number | boolean | undefined> {
    const queryParams: Record<string, string | number | boolean | undefined> = {
      page: params?.page ?? 1,
      pageSize: params?.pageSize ?? 10,
    };
    if (params?.searchTerm?.trim()) queryParams.searchTerm = params.searchTerm.trim();
    if (params?.search?.trim()) queryParams.searchTerm = params.search.trim();
    if (params?.sortBy) queryParams.sortBy = params.sortBy;
    if (params?.sortDescending !== undefined) queryParams.sortDescending = params.sortDescending;
    if (params?.status !== undefined && params?.status !== null) queryParams.DebtStatus = params.status;
    if (params?.maxDaysUntilExpiry !== undefined && params.maxDaysUntilExpiry >= 0) queryParams.maxDaysUntilExpiry = params.maxDaysUntilExpiry;
    if (params?.fat?.trim()) queryParams.fat = params.fat.trim();
    if (params?.zone?.trim()) queryParams.zone = params.zone.trim();
    if (params?.noteType !== undefined && params.noteType !== null) queryParams.noteType = params.noteType;
    if (params?.paymentCreatedAtFrom?.trim()) queryParams.paymentCreatedAtFrom = params.paymentCreatedAtFrom.trim();
    if (params?.paymentCreatedAtTo?.trim()) queryParams.paymentCreatedAtTo = params.paymentCreatedAtTo.trim();
    if (params?.debtDescription?.trim()) queryParams.DebtDescription = params.debtDescription.trim();
    if (params?.resellerId?.trim()) queryParams.resellerId = params.resellerId.trim();
    return queryParams;
  }

  // Debt Management — يدعم فلترة: searchTerm, sortBy, sortDescending, DebtStatus, DebtDescription, DueDateFrom, DueDateTo, إلخ
  async getAllDebts(params?: DebtsListParams): Promise<DebtsListResponse> {
    const queryParams = this.buildDebtsQueryParams(params);
    const response = await this.api.get('/Debts', { params: queryParams });
    const raw = response.data as DebtsListResponse & { data: any[] };

    const transformedData = (raw.data || []).map((debt: any) => ({
      ...debt,
      isPaid: debt.status === 1,
      agentId: debt.agentId || '',
      agentName: debt.agentCompanyName || 'غير محدد',
      paidDate: undefined,
      status: debt.status ?? 0,
    }));

    return {
      ...raw,
      data: transformedData,
      totalDebtAmount: raw.totalDebtAmount,
    };
  }

  async getOverdueUnpaidDebts(params?: DebtsListParams): Promise<DebtsListResponse> {
    const queryParams = this.buildDebtsQueryParams(params);
    const response = await this.api.get('/Debts/overdue-unpaid', { params: queryParams });
    const raw = response.data as DebtsListResponse & { data: any[] };
    const transformedData = (raw.data || []).map((debt: any) => ({
      ...debt,
      isPaid: debt.status === 1,
      agentId: debt.agentId || '',
      agentName: debt.agentCompanyName || debt.agentName || 'غير محدد',
      paidDate: undefined,
      status: debt.status ?? 0,
    }));
    return { ...raw, data: transformedData, totalDebtAmount: raw.totalDebtAmount };
  }

  async getSubscriberDebts(subscriberId: string, params?: PaginationParams): Promise<PaginatedResponse<Debt>> {
    const response = await this.api.get(`/Debts/subscriber/${subscriberId}`, { params });
    const transformedData = (response.data?.data || []).map((debt: any) => ({
      ...debt,
      isPaid: debt.status === 1,
      agentId: debt.agentId || '',
      agentName: debt.agentCompanyName || debt.agentName || 'غير محدد',
      status: debt.status || 0,
    }));
    return { ...response.data, data: transformedData };
  }

  async getDebt(id: string): Promise<Debt> {
    const response = await this.api.get(`/Debts/${id}`);
    return {
      ...response.data,
      isPaid: response.data.status === 1, // Paid status
      status: response.data.status || 0 // Default to Unpaid if not provided
    };
  }

  async createDebt(debtData: DebtCreateRequest): Promise<Debt> {
    const response = await this.api.post('/Debts', debtData);
    return {
      ...response.data,
      isPaid: response.data.status === 1, // Paid status
      status: response.data.status || 0 // Default to Unpaid if not provided
    };
  }

  async updateDebt(id: string, debtData: DebtUpdateRequest): Promise<Debt> {
    const response = await this.api.put(`/Debts/${id}`, debtData);
    return {
      ...response.data,
      isPaid: response.data.status === 1, // Paid status
      status: response.data.status || 0 // Default to Unpaid if not provided
    };
  }

  async payDebt(id: string, paymentData: DebtPaymentRequest): Promise<Debt> {
    console.log('API: payDebt called with:', { id, paymentData });
    const response = await this.api.post(`/Debts/${id}/pay`, paymentData);
    console.log('API: payDebt response:', response.data);
    return {
      ...response.data,
      isPaid: response.data.status === 1, // Paid status
      status: response.data.status || 0 // Default to Unpaid if not provided
    };
  }

  async deleteDebt(id: string): Promise<void> {
    await this.api.delete(`/Debts/${id}`);
  }

  async getSubscriberDebtTotal(subscriberId: string): Promise<number> {
    const response = await this.api.get(`/Debts/subscriber/${subscriberId}/total`);
    return Number(response.data ?? 0) || 0;
  }

  /** تحديث حالة إطفاء/تشغيل لجميع ديون المشترك (0 = إطفاء، 1 = تشغيل) */
  async putSubscriberOffOn(subscriberId: string, offOn: 0 | 1): Promise<{ updatedCount: number; offOn: number }> {
    const response = await this.api.put(`/Debts/subscriber/${subscriberId}/offon`, { offOn });
    return response.data;
  }

  // --- مصاريف المكتب (Office Expenses) ---
  private officeExpensesParams(options?: { agentId?: string; fromDate?: string; toDate?: string }): Record<string, string> {
    const params: Record<string, string> = {};
    if (options?.agentId) params.agentId = options.agentId;
    if (options?.fromDate) params.fromDate = options.fromDate.split('T')[0];
    if (options?.toDate) params.toDate = options.toDate.split('T')[0];
    return params;
  }

  async getOfficeExpenses(agentId?: string, fromDate?: string, toDate?: string): Promise<OfficeExpense[]> {
    const params = this.officeExpensesParams({ agentId, fromDate, toDate });
    const response = await this.api.get<any[]>('/OfficeExpenses', { params });
    const raw = Array.isArray(response.data) ? response.data : [];
    return raw.map((e: any) => ({
      ...e,
      id: e.id,
      name: e.name ?? e.Name,
      amount: e.amount ?? e.Amount ?? 0,
      expenseDate: e.expenseDate ?? e.ExpenseDate ?? '',
      isPaid: e.isPaid ?? e.IsPaid ?? false,
      paidAt: e.paidAt ?? e.PaidAt ?? null,
      notes: e.notes ?? e.Notes ?? null,
    }));
  }

  async getOfficeExpense(id: string, agentId?: string): Promise<OfficeExpense> {
    const response = await this.api.get<any>(`/OfficeExpenses/${id}`, { params: this.officeExpensesParams({ agentId }) });
    const e = response.data;
    return {
      ...e,
      id: e.id,
      name: e.name ?? e.Name,
      amount: e.amount ?? e.Amount ?? 0,
      expenseDate: e.expenseDate ?? e.ExpenseDate ?? '',
      isPaid: e.isPaid ?? e.IsPaid ?? false,
      paidAt: e.paidAt ?? e.PaidAt ?? null,
      notes: e.notes ?? e.Notes ?? null,
    };
  }

  async createOfficeExpense(data: OfficeExpenseCreateRequest, agentId?: string): Promise<OfficeExpense> {
    const body = {
      Name: data.name,
      Amount: data.amount,
      ExpenseDate: data.expenseDate,
      Notes: data.notes ?? undefined,
    };
    const response = await this.api.post<any>('/OfficeExpenses', body, { params: this.officeExpensesParams({ agentId }) });
    const e = response.data;
    return {
      ...e,
      isPaid: e?.isPaid ?? e?.IsPaid ?? false,
      paidAt: e?.paidAt ?? e?.PaidAt ?? null,
    };
  }

  async updateOfficeExpense(id: string, data: OfficeExpenseUpdateRequest, agentId?: string): Promise<OfficeExpense> {
    const response = await this.api.put<any>(`/OfficeExpenses/${id}`, data, { params: this.officeExpensesParams({ agentId }) });
    const e = response.data;
    return {
      ...e,
      isPaid: e?.isPaid ?? e?.IsPaid ?? false,
      paidAt: e?.paidAt ?? e?.PaidAt ?? null,
    };
  }

  async deleteOfficeExpense(id: string, agentId?: string): Promise<void> {
    await this.api.delete(`/OfficeExpenses/${id}`, { params: this.officeExpensesParams({ agentId }) });
  }

  async payOfficeExpense(id: string, agentId?: string): Promise<OfficeExpense> {
    const response = await this.api.post<any>(`/OfficeExpenses/${id}/pay`, {}, { params: this.officeExpensesParams({ agentId }) });
    const e = response.data;
    return {
      ...e,
      isPaid: true,
      paidAt: e?.paidAt ?? e?.PaidAt ?? new Date().toISOString(),
    };
  }

  // --- كشف الرواتب (Salary Sheet) ---
  private salarySheetParams(options?: { agentId?: string; fromDate?: string; toDate?: string }): Record<string, string> {
    const params: Record<string, string> = {};
    if (options?.agentId) params.agentId = options.agentId;
    if (options?.fromDate) params.fromDate = options.fromDate.split('T')[0];
    if (options?.toDate) params.toDate = options.toDate.split('T')[0];
    return params;
  }

  async getSalarySheet(agentId?: string, fromDate?: string, toDate?: string): Promise<SalarySheetListResponse> {
    const params = this.salarySheetParams({ agentId, fromDate, toDate });
    const response = await this.api.get<any>('/SalarySheet', { params });
    const raw = response.data;
    const data = Array.isArray(raw?.data) ? raw.data : (Array.isArray(raw) ? raw : []);
    const totalDeductions = Number(raw?.totalDeductions ?? raw?.TotalDeductions ?? 0) || 0;
    const totalAdvances = Number(raw?.totalAdvances ?? raw?.TotalAdvances ?? 0) || 0;
    return {
      data: data.map((e: any) => this.normalizeSalarySheetEntry(e)),
      totalDeductions,
      totalAdvances,
    };
  }

  private normalizeSalarySheetEntry(e: any): SalarySheetEntry {
    return {
      ...e,
      id: e.id,
      employeeName: e.employeeName ?? e.EmployeeName ?? '',
      workType: e.workType ?? e.WorkType ?? '',
      salaryAmount: e.salaryAmount ?? e.SalaryAmount ?? 0,
      paymentDate: e.paymentDate ?? e.PaymentDate ?? '',
      notes: e.notes ?? e.Notes ?? null,
      totalDeductions: e.totalDeductions ?? e.TotalDeductions ?? 0,
      totalAdvances: e.totalAdvances ?? e.TotalAdvances ?? 0,
      netSalary: e.netSalary ?? e.NetSalary ?? 0,
      deductions: (e.deductions ?? e.Deductions ?? []).map((d: any) => ({
        id: d.id,
        salarySheetEntryId: d.salarySheetEntryId ?? d.SalarySheetEntryId,
        amount: d.amount ?? d.Amount ?? 0,
        reason: d.reason ?? d.Reason ?? '',
        deductionDate: d.deductionDate ?? d.DeductionDate ?? '',
        createdAt: d.createdAt ?? d.CreatedAt,
      })),
      advances: (e.advances ?? e.Advances ?? []).map((a: any) => ({
        id: a.id,
        salarySheetEntryId: a.salarySheetEntryId ?? a.SalarySheetEntryId,
        amount: a.amount ?? a.Amount ?? 0,
        reason: a.reason ?? a.Reason ?? '',
        withdrawalDate: a.withdrawalDate ?? a.WithdrawalDate ?? '',
        createdAt: a.createdAt ?? a.CreatedAt,
      })),
    };
  }

  async getSalarySheetEntry(id: string, agentId?: string): Promise<SalarySheetEntry> {
    const response = await this.api.get<any>(`/SalarySheet/${id}`, { params: this.salarySheetParams({ agentId }) });
    return this.normalizeSalarySheetEntry(response.data);
  }

  async createSalarySheetEntry(data: SalarySheetEntryCreateRequest, agentId?: string): Promise<SalarySheetEntry> {
    const body = {
      EmployeeName: data.employeeName,
      WorkType: data.workType,
      SalaryAmount: data.salaryAmount,
      PaymentDate: data.paymentDate,
      Notes: data.notes ?? undefined,
    };
    const response = await this.api.post<any>('/SalarySheet', body, { params: this.salarySheetParams({ agentId }) });
    return this.normalizeSalarySheetEntry(response.data);
  }

  async updateSalarySheetEntry(id: string, data: SalarySheetEntryUpdateRequest, agentId?: string): Promise<SalarySheetEntry> {
    const body: Record<string, unknown> = {};
    if (data.employeeName !== undefined) body.EmployeeName = data.employeeName;
    if (data.workType !== undefined) body.WorkType = data.workType;
    if (data.salaryAmount !== undefined) body.SalaryAmount = data.salaryAmount;
    if (data.paymentDate !== undefined) body.PaymentDate = data.paymentDate;
    if (data.notes !== undefined) body.Notes = data.notes;
    const response = await this.api.put<any>(`/SalarySheet/${id}`, body, { params: this.salarySheetParams({ agentId }) });
    return this.normalizeSalarySheetEntry(response.data);
  }

  async deleteSalarySheetEntry(id: string, agentId?: string): Promise<void> {
    await this.api.delete(`/SalarySheet/${id}`, { params: this.salarySheetParams({ agentId }) });
  }

  async addSalaryDeduction(data: SalaryDeductionCreateRequest, agentId?: string): Promise<SalarySheetEntry> {
    const body = {
      SalarySheetEntryId: data.salarySheetEntryId,
      Amount: data.amount,
      Reason: data.reason,
      DeductionDate: data.deductionDate,
    };
    const response = await this.api.post<any>('/SalarySheet/deductions', body, { params: this.salarySheetParams({ agentId }) });
    return this.normalizeSalarySheetEntry(response.data);
  }

  async addSalaryAdvance(data: SalaryAdvanceCreateRequest, agentId?: string): Promise<SalarySheetEntry> {
    const body = {
      SalarySheetEntryId: data.salarySheetEntryId,
      Amount: data.amount,
      Reason: data.reason,
      WithdrawalDate: data.withdrawalDate,
    };
    const response = await this.api.post<any>('/SalarySheet/advances', body, { params: this.salarySheetParams({ agentId }) });
    return this.normalizeSalarySheetEntry(response.data);
  }

  async updateSalaryDeduction(id: string, data: SalaryDeductionUpdateRequest, agentId?: string): Promise<void> {
    const body = {
      Amount: data.amount,
      Reason: data.reason,
      DeductionDate: data.deductionDate,
    };
    await this.api.put(`/SalarySheet/deductions/${id}`, body, { params: this.salarySheetParams({ agentId }) });
  }

  async updateSalaryAdvance(id: string, data: SalaryAdvanceUpdateRequest, agentId?: string): Promise<void> {
    const body = {
      Amount: data.amount,
      Reason: data.reason,
      WithdrawalDate: data.withdrawalDate,
    };
    await this.api.put(`/SalarySheet/advances/${id}`, body, { params: this.salarySheetParams({ agentId }) });
  }

  // --- Offline Sync (الباكند: POST /sync/upload فقط؛ سحب GET /sync/changes غير مُستخدَم في الواجهة) ---
  async syncUpload(request: SyncUploadRequestDto): Promise<SyncUploadResponseDto> {
    const response = await this.api.post<SyncUploadResponseDto>('/sync/upload', request);
    return response.data;
  }

  // Utility method to get base URL
  getBaseURL(): string {
    return this.api.defaults.baseURL || '';
  }

  // دالة مساعدة لعرض رسائل الخطأ المترجمة
  static showError(error: any): string {
    // إذا كان الخطأ يحتوي على رسالة مترجمة، استخدمها
    if (error.message && typeof error.message === 'string') {
      return mapBackendErrorMessageForUser(error.message);
    }
    
    // إذا كان الخطأ يحتوي على رسالة أصلية، ترجمها
    if (error.originalError) {
      const apiService = new ApiService();
      return apiService.translateError(error.originalError);
    }
    
    // رسالة افتراضية
    return 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.';
  }

  // Export receipts to Excel (xlsx) - client-side with custom columns
  async exportReceiptsToExcel(
    fromDate?: string,
    toDate?: string,
    resellerId?: string,
    searchTerm?: string
  ): Promise<Blob> {
    const { createXlsxBlob } = await import('../utils/excelExport');
    const { receipts } = await this.getRenewalReceipts(1, 10000, fromDate, toDate, resellerId, searchTerm);
    // Fallback for missing receipt username: resolve from subscribers list.
    let subscribersById = new Map<string, string>();
    try {
      const subscribersRes = await this.getSubscribers({ page: 1, pageSize: 10000 });
      subscribersById = new Map(
        (subscribersRes.data ?? [])
          .filter((s) => Boolean(s?.id && s?.username))
          .map((s) => [String(s.id), String(s.username)])
      );
    } catch {
      // Keep export resilient even if subscribers lookup fails.
    }
    const headers = [
      'المشترك',
      'اسم المستخدم',
      'رقم الهاتف',
      'الباقة',
      'تاريخ التفعيل',
      'تاريخ الانتهاء',
      'السعر',
      'المبلغ المدفوع',
      'المبلغ المتبقي',
      'الخصم',
      'اسم الشركة',
    ];
    const rows = (receipts || []).map((r) => [
      r.subscriberName ?? '',
      r.subscriberUsername ?? subscribersById.get(String(r.subscriberId ?? '')) ?? '',
      r.subscriberPhone ?? '',
      r.newProfileName ?? r.profileName ?? '',
      r.renewalDate ? new Date(r.renewalDate).toLocaleDateString(getNumberLocale()) : '',
      r.newExpirationDate ? new Date(r.newExpirationDate).toLocaleDateString(getNumberLocale()) : '',
      r.newProfileSalePrice ?? r.finalPrice ?? 0,
      r.amountPaid ?? 0,
      r.remainingAmount ?? 0,
      r.discountAmount ?? 0,
      r.agentCompanyName ?? '',
    ]);
    return createXlsxBlob([headers, ...rows], 'التفعيلات', {
      alignCenter: true,
      colWidths: [22, 18, 16, 20, 16, 16, 14, 16, 16, 12, 20],
    });
  }

  // Renewal Receipts endpoints
  async getRenewalReceipts(
    page: number = 1,
    size: number = 10,
    fromDate?: string,
    toDate?: string,
    resellerId?: string,
    searchTerm?: string
  ): Promise<{ receipts: RenewalReceipt[], pagination: any }> {
    try {
      const token = localStorage.getItem('token');
      console.log('Current token:', token ? 'Token exists' : 'No token found');
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', String(size));
      if (fromDate) params.set('FromDate', fromDate);
      if (toDate) params.set('ToDate', toDate);
      if (resellerId?.trim()) params.set('resellerId', resellerId.trim());
      const st = (searchTerm ?? '').trim();
      if (st) params.set('searchTerm', st);

      const response: AxiosResponse<PaginatedResponse<RenewalReceipt>> = await this.api.get(`/Renewals?${params.toString()}`);
      console.log('API Response from backend:', response.data);
      console.log('Response status:', response.status);
      
      // استخراج البيانات من الاستجابة
      let receipts: RenewalReceipt[] = [];
      let pagination: any = {};
      
      if (response.data && typeof response.data === 'object') {
        // إذا كانت البيانات في حقل 'data' (PaginatedResponse)
        if (response.data.data && Array.isArray(response.data.data)) {
          receipts = response.data.data.map(normalizeRenewalReceiptFromApi);
          pagination = {
            currentPage: response.data.currentPage,
            pageSize: response.data.pageSize,
            totalItems: response.data.totalItems,
            totalPages: response.data.totalPages,
            hasNextPage: response.data.hasNextPage,
            hasPreviousPage: response.data.hasPreviousPage
          };
          console.log('Found receipts in paginated response:', receipts.length);
          console.log('Pagination info:', pagination);
        }
        // إذا كانت البيانات مباشرة كمصفوفة
        else if (Array.isArray(response.data)) {
          receipts = response.data.map(normalizeRenewalReceiptFromApi);
          pagination = {
            currentPage: 1,
            pageSize: receipts.length,
            totalItems: receipts.length,
            totalPages: 1,
            hasNextPage: false,
            hasPreviousPage: false
          };
          console.log('Found receipts directly:', receipts.length);
        }
        // إذا كانت البيانات في حقل آخر
        else {
          console.warn('Unexpected data structure:', response.data);
          return { receipts: [], pagination: {} };
        }
      }
      
      console.log('Number of receipts:', receipts.length);
      return { receipts, pagination };
    } catch (error) {
      console.error('Error fetching renewal receipts:', error);
      
      // إذا كان الخطأ 401، فهذا يعني مشكلة في المصادقة
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as any;
        if (axiosError.response?.status === 401) {
          console.error('Authentication failed - user needs to login');
        }
      }
      
      throw error;
    }
  }

  // Renewal History endpoints - GET /Renewals?subscriberId=... returns paginated { data, ... }
  async getRenewalsBySubscriber(
    subscriberId: string,
    page: number = 1,
    pageSize: number = 10
  ): Promise<PaginatedResponse<RenewalHistory>> {
    const response = await this.api.get<PaginatedResponse<RenewalHistory>>('/Renewals', {
      params: { subscriberId, page, pageSize },
    });
    const body = response.data;
    const raw = body?.data ?? [];
    const data = Array.isArray(raw)
      ? raw.map((item) => normalizeRenewalReceiptFromApi(item as unknown) as RenewalHistory)
      : [];
    return {
      ...body,
      data,
    };
  }

  async getRenewalHistory(subscriberId: string): Promise<RenewalHistory[]> {
    const res = await this.getRenewalsBySubscriber(subscriberId, 1, 10000);
    return res.data ?? [];
  }

  // Profit endpoints
  async getProfitStats(): Promise<ProfitStats> {
    const response: AxiosResponse<ProfitStats> = await this.api.get('/Renewals/profit');
    return response.data;
  }

  async getProfitStatsByDateRange(dateRange: DateRangeRequest): Promise<ProfitStats> {
    const response: AxiosResponse<ProfitStats> = await this.api.get('/Renewals/profit/date-range', {
      params: dateRange
    });
    return response.data;
  }

  /** GET /Accounts — ملخص الحساب وسجل الحركات (فلترة بالتاريخ والرسيلر والوكيل للأدمن) */
  private static normalizeAccountLedgerEntry(row: Record<string, unknown>): AccountLedgerEntry {
    const ptRaw = row.packageType ?? row.PackageType;
    let packageType: number | null = null;
    if (ptRaw !== null && ptRaw !== undefined && ptRaw !== '') {
      const n = Number(ptRaw);
      if (n === 1 || n === 2 || n === 3) packageType = n;
    }
    const extRaw = row.extension ?? row.Extension;
    let extension: { count?: number } | null = null;
    if (extRaw && typeof extRaw === 'object' && !Array.isArray(extRaw)) {
      const o = extRaw as Record<string, unknown>;
      const c = o.count ?? o.Count;
      if (c !== null && c !== undefined && c !== '') {
        const cn = Number(c);
        if (Number.isFinite(cn)) extension = { count: cn };
      }
    }
    const apRaw = row.activationProfit ?? row.ActivationProfit;
    let activationProfit: number | null = null;
    if (apRaw !== null && apRaw !== undefined && apRaw !== '') {
      const an = Number(apRaw);
      if (Number.isFinite(an)) activationProfit = an;
    }
    const notesRaw = row.notes ?? row.Notes;
    let notes: string | null = null;
    if (notesRaw != null && String(notesRaw).trim() !== '') {
      notes = String(notesRaw).trim();
    }
    const sntVal = row.subscriberNoteType ?? row.SubscriberNoteType;
    let subscriberNoteType: number | null = null;
    if (sntVal != null && sntVal !== '') {
      const n = Number(sntVal);
      if (Number.isFinite(n)) subscriberNoteType = n;
    }
    const sntlRaw = row.subscriberNoteTypeLabel ?? row.SubscriberNoteTypeLabel;
    let subscriberNoteTypeLabel: string | null = null;
    if (sntlRaw != null && String(sntlRaw).trim() !== '') {
      subscriberNoteTypeLabel = String(sntlRaw).trim();
    } else {
      const sntStr = row.subscriberNoteTypes ?? row.SubscriberNoteTypes;
      if (typeof sntStr === 'string' && sntStr.trim() !== '') {
        subscriberNoteTypeLabel = sntStr.trim();
      }
    }

    return {
      kind: String(row.kind ?? row.Kind ?? 'Renewal') as AccountLedgerEntryKind,
      id: String(row.id ?? row.Id ?? ''),
      renewalDate: String(row.renewalDate ?? row.RenewalDate ?? ''),
      createdAt:
        row.createdAt != null && String(row.createdAt).trim() !== ''
          ? String(row.createdAt)
          : row.CreatedAt != null && String(row.CreatedAt).trim() !== ''
            ? String(row.CreatedAt)
            : null,
      amount: Number(row.amount ?? row.Amount ?? 0),
      subscriberId: String(row.subscriberId ?? row.SubscriberId ?? ''),
      subscriberName: (row.subscriberName ?? row.SubscriberName ?? null) as string | null,
      username: (row.username ?? row.Username ?? null) as string | null,
      profileName: (row.profileName ?? row.ProfileName ?? null) as string | null,
      agentResellerId: (row.agentResellerId ?? row.AgentResellerId ?? null) as string | null,
      receiptNumber: (row.receiptNumber ?? row.ReceiptNumber ?? null) as string | null,
      debtId: (row.debtId ?? row.DebtId ?? null) as string | null,
      packageType,
      notes,
      subscriberNoteType,
      subscriberNoteTypeLabel,
      extension,
      executedByUserId: (row.executedByUserId ?? row.ExecutedByUserId ?? null) as string | null,
      executedByFullName: (row.executedByFullName ?? row.ExecutedByFullName ?? null) as string | null,
      activationProfit,
    };
  }

  async getAccounts(params: {
    fromDate: string;
    toDate: string;
    page?: number;
    pageSize?: number;
    agentId?: string;
    resellerId?: string;
    /** فلترة على من نفّذ التفعيل أو التسديد */
    executedByUserId?: string;
    /** نوع الباقة (ProfilePackageType): 1 اشتراك، 2 تمديد، 3 عرض خاص */
    packageType?: number;
    /** فلترة باسم المشترك (SubscriberName/Username) */
    subscriberName?: string;
  }): Promise<AccountsResponse> {
    const queryParams: Record<string, string | number> = {
      fromDate: params.fromDate,
      toDate: params.toDate,
      page: params.page ?? 1,
      pageSize: params.pageSize ?? 20,
    };
    const aid = params.agentId?.trim();
    if (aid) queryParams.agentId = aid;
    const rid = params.resellerId?.trim();
    if (rid) queryParams.resellerId = rid;
    const ex = params.executedByUserId?.trim();
    if (ex) queryParams.executedByUserId = ex;
    const pt = params.packageType;
    if (pt === 1 || pt === 2 || pt === 3) queryParams.packageType = pt;
    const sn = params.subscriberName?.trim();
    if (sn) queryParams.subscriberName = sn;

    const response = await this.api.get<Record<string, unknown>>('/Accounts', { params: queryParams });
    const raw = response.data ?? {};
    const ledgerRaw = (raw.ledger ?? raw.Ledger) as Record<string, unknown> | undefined;
    const rows = (ledgerRaw?.data ?? ledgerRaw?.Data ?? []) as unknown[];

    const ledger: AccountsResponse['ledger'] = {
      data: Array.isArray(rows)
        ? rows.map((r) => ApiService.normalizeAccountLedgerEntry((r ?? {}) as Record<string, unknown>))
        : [],
      currentPage: Number(ledgerRaw?.currentPage ?? ledgerRaw?.CurrentPage ?? 1),
      pageSize: Number(ledgerRaw?.pageSize ?? ledgerRaw?.PageSize ?? 20),
      totalItems: Number(ledgerRaw?.totalItems ?? ledgerRaw?.TotalItems ?? 0),
      totalPages: Math.max(1, Number(ledgerRaw?.totalPages ?? ledgerRaw?.TotalPages ?? 1)),
      hasNextPage: Boolean(ledgerRaw?.hasNextPage ?? ledgerRaw?.HasNextPage),
      hasPreviousPage: Boolean(ledgerRaw?.hasPreviousPage ?? ledgerRaw?.HasPreviousPage),
    };

    const extTop = raw.extension ?? raw.Extension;
    let responseExtension: { count?: number } | null = null;
    if (extTop && typeof extTop === 'object' && !Array.isArray(extTop)) {
      const o = extTop as Record<string, unknown>;
      const c = o.count ?? o.Count;
      if (c !== null && c !== undefined && c !== '') {
        const cn = Number(c);
        if (Number.isFinite(cn)) responseExtension = { count: cn };
      }
    }

    const tapRaw = raw.totalActivationProfit ?? raw.TotalActivationProfit;
    let totalActivationProfit: number | undefined;
    if (tapRaw !== null && tapRaw !== undefined && tapRaw !== '') {
      const tn = Number(tapRaw);
      if (Number.isFinite(tn)) totalActivationProfit = tn;
    }

    const subscriberNoteTypes = parseSubscriberNoteTypesCatalog(raw.subscriberNoteTypes ?? raw.SubscriberNoteTypes);

    return {
      amountPaid: Number(raw.amountPaid ?? raw.AmountPaid ?? 0),
      subscriberTotalDebt: Number(raw.subscriberTotalDebt ?? raw.SubscriberTotalDebt ?? 0),
      totalReceived: Number(raw.totalReceived ?? raw.TotalReceived ?? 0),
      totalActivationProfit,
      extension: responseExtension,
      subscriberNoteTypes: subscriberNoteTypes.length > 0 ? subscriberNoteTypes : undefined,
      ledger,
    };
  }

  /**
   * DELETE /Accounts/ledger/{id} — حذف سطر من تقرير الحسابات (AccountsFul / سجل تسديد).
   * Admin يرسل agentId؛ الوكيل الرئيسي لا (يُستنتج من التوكن).
   */
  async deleteAccountsLedgerEntry(
    id: string,
    params: { kind: 'Renewal' | 'DebtPayment'; agentId?: string }
  ): Promise<void> {
    const q: Record<string, string> = { kind: params.kind };
    const aid = params.agentId?.trim();
    if (aid) q.agentId = aid;
    await this.api.delete(`/Accounts/ledger/${encodeURIComponent(id)}`, { params: q });
  }

  /**
   * PUT /Accounts/ledger/{renewalId}/profile — تعديل باقة تفعيل في سجل AccountsFul.
   * Admin يرسل agentId؛ renewalId = id عندما kind === Renewal.
   */
  async updateAccountsLedgerProfile(
    renewalId: string,
    newProfileId: string,
    params?: { agentId?: string }
  ): Promise<UpdateAccountsLedgerProfileResponse> {
    const q: Record<string, string> = {};
    const aid = params?.agentId?.trim();
    if (aid) q.agentId = aid;
    const response = await this.api.put<Record<string, unknown>>(
      `/Accounts/ledger/${encodeURIComponent(renewalId)}/profile`,
      { newProfileId: newProfileId.trim() },
      { params: q }
    );
    const raw = response.data ?? {};
    const num = (v: unknown, fallback = 0): number => {
      const n = Number(v);
      return Number.isFinite(n) ? n : fallback;
    };
    const ledgerRaw = (raw.ledgerEntry ?? raw.LedgerEntry ?? {}) as Record<string, unknown>;
    const resellerBal = raw.resellerBalanceIqd ?? raw.ResellerBalanceIqd;
    const agentBal = raw.agentBalanceIqd ?? raw.AgentBalanceIqd;
    return {
      balanceRefunded: num(raw.balanceRefunded ?? raw.BalanceRefunded),
      balanceDeducted: num(raw.balanceDeducted ?? raw.BalanceDeducted),
      resellerBalanceIqd:
        resellerBal != null && resellerBal !== '' && Number.isFinite(Number(resellerBal))
          ? Number(resellerBal)
          : null,
      agentBalanceIqd:
        agentBal != null && agentBal !== '' && Number.isFinite(Number(agentBal)) ? Number(agentBal) : null,
      ledgerEntry: ApiService.normalizeAccountLedgerEntry(ledgerRaw),
    };
  }

  /**
   * GET /Accounts/export/excel — تصدير تقرير AccountsFul كملف Excel.
   * المعاملات اختيارية؛ عند عدم إرسال التاريخ قد يطبّق الخادم الافتراضي (مثلاً آخر 30 يوماً).
   */
  async getAccountsExportExcel(params: {
    fromDate?: string;
    toDate?: string;
    agentId?: string;
    resellerId?: string;
    executedByUserId?: string;
    packageType?: number;
  }): Promise<{ blob: Blob; filename: string }> {
    const queryParams: Record<string, string> = {};
    if (params.fromDate) queryParams.fromDate = params.fromDate;
    if (params.toDate) queryParams.toDate = params.toDate;
    const aid = params.agentId?.trim();
    if (aid) queryParams.agentId = aid;
    const rid = params.resellerId?.trim();
    if (rid) queryParams.resellerId = rid;
    const ex = params.executedByUserId?.trim();
    if (ex) queryParams.executedByUserId = ex;
    const pt = params.packageType;
    if (pt === 1 || pt === 2 || pt === 3) queryParams.packageType = String(pt);

    try {
      const response = await this.api.get<Blob>('/Accounts/export/excel', {
        params: queryParams,
        responseType: 'blob',
        timeout: 600_000,
      });
      const ct = (response.headers['content-type'] || '').toLowerCase();
      if (ct.includes('application/json') && response.data) {
        const text = await new Response(response.data).text();
        let parsed: unknown;
        try {
          parsed = JSON.parse(text);
        } catch {
          throw new Error(text.trim().slice(0, 500) || 'فشل تصدير التقرير');
        }
        const j = parsed as { detail?: string; message?: string; title?: string };
        throw new Error(j.detail || j.message || j.title || 'فشل تصدير التقرير');
      }
      const rawName = this.filenameFromContentDisposition(response.headers['content-disposition']);
      const now = new Date();
      const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
      const fallback = `accounts-report-${stamp}.xlsx`;
      const filename = rawName && /\.(xlsx|xls)$/i.test(rawName) ? rawName : fallback;
      return { blob: response.data, filename };
    } catch (e: unknown) {
      if (axios.isAxiosError(e) && e.response?.data instanceof Blob) {
        const text = await new Response(e.response.data).text();
        let parsed: unknown;
        try {
          parsed = JSON.parse(text);
        } catch {
          throw new Error(text.trim().slice(0, 500) || 'فشل تصدير التقرير');
        }
        const j = parsed as { detail?: string; message?: string; title?: string };
        throw new Error(j.detail || j.message || j.title || 'فشل تصدير التقرير');
      }
      throw e;
    }
  }

  /** GET /AccountsOtherDealer — تقرير تفعيلات «وكيل آخر» */
  async getAccountsOtherDealer(params: {
    fromDate: string;
    toDate: string;
    page?: number;
    pageSize?: number;
    agentId?: string;
    resellerId?: string;
    executedByUserId?: string;
    /** تكرار المعامل: ?dealerIds=id1&dealerIds=id2 */
    dealerIds?: string[];
    /** ProfilePackageType: 1 اشتراك، 2 تمديد، 3 عرض خاص */
    packageType?: number | null;
  }): Promise<AccountsOtherDealerReportResponse> {
    const usp = new URLSearchParams();
    usp.set('fromDate', params.fromDate);
    usp.set('toDate', params.toDate);
    usp.set('page', String(params.page ?? 1));
    usp.set('pageSize', String(params.pageSize ?? 20));
    const aid = params.agentId?.trim();
    if (aid) usp.set('agentId', aid);
    const rid = params.resellerId?.trim();
    if (rid) usp.set('resellerId', rid);
    const ex = params.executedByUserId?.trim();
    if (ex) usp.set('executedByUserId', ex);
    const pt = params.packageType != null ? Number(params.packageType) : NaN;
    if (pt === 1 || pt === 2 || pt === 3) usp.set('packageType', String(pt));
    for (const raw of params.dealerIds ?? []) {
      const d = (raw ?? '').toString().trim();
      if (d) usp.append('dealerIds', d);
    }

    const response = await this.api.get<Record<string, unknown>>('/AccountsOtherDealer', { params: usp });
    const raw = response.data ?? {};
    const ledgerRaw = (raw.ledger ?? raw.Ledger) as Record<string, unknown> | undefined;
    const rows = (ledgerRaw?.data ?? ledgerRaw?.Data ?? []) as unknown[];

    const normRow = (row: Record<string, unknown>): AccountsOtherDealerEntry => ({
      id: String(row.id ?? row.Id ?? ''),
      renewalId: (row.renewalId ?? row.RenewalId ?? null) as string | null,
      renewalDate: (row.renewalDate ?? row.RenewalDate ?? null) as string | null,
      subscriberName: (row.subscriberName ?? row.SubscriberName ?? null) as string | null,
      dealerFullName: (row.dealerFullName ?? row.DealerFullName ?? null) as string | null,
      packageType: (() => {
        const pt = row.packageType ?? row.PackageType;
        if (pt == null || pt === '') return null;
        const n = Number(pt);
        return n === 1 || n === 2 || n === 3 ? n : null;
      })(),
      profileName: (row.profileName ?? row.ProfileName ?? null) as string | null,
      renewalPeriod: (() => {
        const v = row.renewalPeriod ?? row.RenewalPeriod;
        if (v == null || v === '') return null;
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
      })(),
      notes: (() => {
        const n = row.notes ?? row.Notes;
        if (n == null || String(n).trim() === '') return null;
        return String(n).trim();
      })(),
      debtAmount: (() => {
        const v = row.debtAmount ?? row.DebtAmount;
        if (v == null || v === '') return null;
        const num = Number(v);
        return Number.isFinite(num) ? num : null;
      })(),
      activationProfit: (() => {
        const v = row.activationProfit ?? row.ActivationProfit;
        if (v == null || v === '') return null;
        const num = Number(v);
        return Number.isFinite(num) ? num : null;
      })(),
      executedByUserId: (row.executedByUserId ?? row.ExecutedByUserId ?? null) as string | null,
      executedByFullName: (row.executedByFullName ?? row.ExecutedByFullName ?? null) as string | null,
      agentResellerId: (row.agentResellerId ?? row.AgentResellerId ?? null) as string | null,
      agentResellerName: (row.agentResellerName ?? row.AgentResellerName ?? null) as string | null,
    });

    const ledger = {
      data: Array.isArray(rows) ? rows.map((r) => normRow((r ?? {}) as Record<string, unknown>)) : [],
      currentPage: Number(ledgerRaw?.currentPage ?? ledgerRaw?.CurrentPage ?? 1),
      pageSize: Number(ledgerRaw?.pageSize ?? ledgerRaw?.PageSize ?? 20),
      totalItems: Number(ledgerRaw?.totalItems ?? ledgerRaw?.TotalItems ?? 0),
      totalPages: Math.max(1, Number(ledgerRaw?.totalPages ?? ledgerRaw?.TotalPages ?? 1)),
      hasNextPage: Boolean(ledgerRaw?.hasNextPage ?? ledgerRaw?.HasNextPage),
      hasPreviousPage: Boolean(ledgerRaw?.hasPreviousPage ?? ledgerRaw?.HasPreviousPage),
    };

    const numOrUndef = (v: unknown): number | undefined => {
      if (v == null || v === '') return undefined;
      const n = Number(v);
      return Number.isFinite(n) ? n : undefined;
    };

    const totalActivationProfit = numOrUndef(raw.totalActivationProfit ?? raw.TotalActivationProfit);
    const totalDebtAmount = numOrUndef(raw.totalDebtAmount ?? raw.TotalDebtAmount);

    return { ledger, totalActivationProfit, totalDebtAmount };
  }

  /** GET /providers/fiberx/getCashbackfiberxsubscriptionsapp */
  async getFiberxCashbackAppSubscriptions(params: {
    resellerId: string;
    page?: number;
    perPage?: number;
    serviceType?: string;
  }): Promise<FiberxCashbackAppSubscriptionsResponse> {
    const queryParams: Record<string, string | number> = {
      resellerId: params.resellerId.trim(),
      page: params.page ?? 1,
      perPage: params.perPage ?? 10,
      serviceType: params.serviceType?.trim() || 'MobileCashBack',
    };

    const response = await this.api.get<Record<string, unknown>>(
      '/providers/fiberx/getCashbackfiberxsubscriptionsapp',
      { params: queryParams }
    );
    const raw = response.data ?? {};

    const pickRowsArray = (obj: Record<string, unknown>): unknown[] => {
      const direct =
        obj.data ?? obj.Data ?? obj.transactions ?? obj.Transactions ?? obj.rows ?? obj.Rows ?? obj.items ?? obj.Items;
      if (Array.isArray(direct)) return direct;
      for (const value of Object.values(obj)) {
        if (Array.isArray(value)) return value;
      }
      return [];
    };

    const rowsRaw = pickRowsArray(raw);
    const normalizeRow = (row: Record<string, unknown>): FiberxCashbackAppSubscriptionRow => {
      const amountRaw = row.amount ?? row.Amount ?? 0;
      const amountNum = Number(amountRaw);
      return {
        id: String(row.id ?? row.Id ?? ''),
        userId: (() => {
          const v = row.user_id ?? row.userId ?? row.UserId;
          if (v == null || v === '') return null;
          const n = Number(v);
          return Number.isFinite(n) ? n : null;
        })(),
        amount: Number.isFinite(amountNum) ? amountNum : 0,
        type: (row.type ?? row.Type ?? null) as string | null,
        serviceType: (row.service_type ?? row.serviceType ?? row.ServiceType ?? null) as string | null,
        profileId: (row.profile_id ?? row.profileId ?? row.ProfileId ?? null) as string | null,
        status: (row.status ?? row.Status ?? null) as string | null,
        title: (row.title ?? row.Title ?? null) as string | null,
        salveId: (row.salveId ?? row.SalveId ?? null) as string | null,
        description: (row.description ?? row.Description ?? null) as string | null,
        createdAt: (row.created_at ?? row.createdAt ?? row.CreatedAt ?? null) as string | null,
        updatedAt: (row.updated_at ?? row.updatedAt ?? row.UpdatedAt ?? null) as string | null,
        username: (row.username ?? row.Username ?? null) as string | null,
        usernameId: (row.username_id ?? row.usernameId ?? row.UsernameId ?? null) as string | null,
        isMobile: (() => {
          const v = row.isMobile ?? row.IsMobile;
          if (v === true || v === 'true' || v === 1 || v === '1') return true;
          if (v === false || v === 'false' || v === 0 || v === '0') return false;
          return undefined;
        })(),
        apiKeyName: (row.apiKeyName ?? row.ApiKeyName ?? null) as string | null,
        paymentMethod: (row.paymentMethod ?? row.PaymentMethod ?? null) as string | null,
      };
    };

    const paginationRaw = (raw.pagination ?? raw.Pagination ?? {}) as Record<string, unknown>;
    const toNum = (v: unknown, fallback: number): number => {
      const n = Number(v);
      return Number.isFinite(n) ? n : fallback;
    };

    return {
      message:
        (raw.message ?? raw.Message) != null ? String(raw.message ?? raw.Message) : undefined,
      data: rowsRaw.map((r) => normalizeRow((r ?? {}) as Record<string, unknown>)),
      pagination: {
        total: toNum(paginationRaw.total ?? paginationRaw.Total, 0),
        perPage: toNum(paginationRaw.per_page ?? paginationRaw.perPage ?? paginationRaw.PerPage, Number(queryParams.perPage)),
        currentPage: toNum(
          paginationRaw.current_page ?? paginationRaw.currentPage ?? paginationRaw.CurrentPage,
          Number(queryParams.page)
        ),
        lastPage: Math.max(
          1,
          toNum(paginationRaw.last_page ?? paginationRaw.lastPage ?? paginationRaw.LastPage, 1)
        ),
      },
    };
  }

  /** GET /api/FiberxCashbackSubscriberAccounts */
  async getFiberxCashbackSubscriberAccounts(
    params: FiberxCashbackSubscriberAccountsListParams
  ): Promise<FiberxCashbackSubscriberAccountsListResponse> {
    const response = await this.api.get<Record<string, unknown>>('/FiberxCashbackSubscriberAccounts', {
      params: {
        ...(params.fromDate ? { fromDate: params.fromDate } : {}),
        ...(params.toDate ? { toDate: params.toDate } : {}),
        ...(params.username ? { username: params.username.trim() } : {}),
        ...(params.resellerId ? { resellerId: params.resellerId } : {}),
        ...(params.page ? { page: params.page } : {}),
        ...(params.pageSize ? { pageSize: params.pageSize } : {}),
      },
    });
    const raw = (response.data ?? {}) as Record<string, unknown>;
    const rawItems = raw.items ?? raw.Items ?? [];
    const itemsArray = Array.isArray(rawItems) ? rawItems : [];
    const normalize = (row: Record<string, unknown>): FiberxCashbackSubscriberAccount => {
      const amountRaw = row.amount ?? row.Amount ?? 0;
      const amountNum = Number(amountRaw);
      const resellerIdRaw = row.resellerId ?? row.ResellerId ?? row.agentResellerId ?? row.AgentResellerId ?? null;
      return {
        id: String(row.id ?? row.Id ?? ''),
        resellerId: resellerIdRaw != null ? String(resellerIdRaw) : null,
        agentResellerId: resellerIdRaw != null ? String(resellerIdRaw) : null,
        resellerName: (row.resellerName ?? row.ResellerName ?? null) as string | null,
        username: String(row.username ?? row.Username ?? '').trim(),
        amount: Number.isFinite(amountNum) ? amountNum : 0,
        createdByUserId: (row.createdByUserId ?? row.CreatedByUserId ?? null) as string | null,
        createdAt: (row.createdAt ?? row.CreatedAt ?? null) as string | null,
        updatedAt: (row.updatedAt ?? row.UpdatedAt ?? null) as string | null,
        title: (row.title ?? row.Title ?? null) as string | null,
      };
    };
    const totalAmountRaw =
      raw.totalAmount ??
      raw.TotalAmount ??
      ((raw.statistics ?? raw.Statistics) as Record<string, unknown> | undefined)?.totalAmount ??
      ((raw.statistics ?? raw.Statistics) as Record<string, unknown> | undefined)?.TotalAmount;
    const totalAmount = Number(totalAmountRaw);
    const countRaw = raw.count ?? raw.Count;
    const count = Number(countRaw);

    return {
      items: itemsArray.map((item) => normalize((item ?? {}) as Record<string, unknown>)),
      totalAmount: Number.isFinite(totalAmount) ? totalAmount : undefined,
      count: Number.isFinite(count) ? count : undefined,
      statistics: {
        totalAmount: Number.isFinite(totalAmount) ? totalAmount : undefined,
      },
    };
  }

  /** POST /api/FiberxCashbackSubscriberAccounts */
  async createFiberxCashbackSubscriberAccount(
    payload: FiberxCashbackSubscriberAccountCreateRequest
  ): Promise<FiberxCashbackSubscriberAccount> {
    const response = await this.api.post<FiberxCashbackSubscriberAccount>('/FiberxCashbackSubscriberAccounts', payload);
    return response.data;
  }

  /** PUT /api/FiberxCashbackSubscriberAccounts/{id} */
  async updateFiberxCashbackSubscriberAccount(
    id: string,
    payload: FiberxCashbackSubscriberAccountUpdateRequest
  ): Promise<FiberxCashbackSubscriberAccount> {
    const response = await this.api.put<FiberxCashbackSubscriberAccount>(
      `/FiberxCashbackSubscriberAccounts/${encodeURIComponent(id)}`,
      payload
    );
    return response.data;
  }

  /** DELETE /api/FiberxCashbackSubscriberAccounts/{id} */
  async deleteFiberxCashbackSubscriberAccount(id: string): Promise<void> {
    await this.api.delete(`/FiberxCashbackSubscriberAccounts/${encodeURIComponent(id)}`);
  }

  // Daily account / handovers
  async getDailyAccount(agentId?: string, date?: string): Promise<DailyAccountResponse> {
    const params: any = {};
    if (agentId) params.agentId = agentId;
    if (date) params.date = date;
    const response: AxiosResponse<DailyAccountResponse> = await this.api.get('/Renewals/daily-account', { params });
    return response.data;
  }

  async getDailyHandoverRecipients(agentId?: string): Promise<DailyHandoverRecipient[]> {
    const params: any = {};
    if (agentId) params.agentId = agentId;
    const response: AxiosResponse<DailyHandoverRecipient[]> = await this.api.get('/Renewals/daily-handover/recipients', { params });
    return response.data;
  }

  async postDailyHandover(body: DailyHandoverCreateRequest): Promise<DailyAccountResponse> {
    const payload: any = { ...body };
    if (payload.handoverDate === '' || payload.handoverDate == null) delete payload.handoverDate;
    if (payload.notes === '' || payload.notes == null) delete payload.notes;
    if (payload.receivedByUserId === '' || payload.receivedByUserId == null) delete payload.receivedByUserId;
    if (payload.receivedByAgentId === '' || payload.receivedByAgentId == null) delete payload.receivedByAgentId;
    const response: AxiosResponse<DailyAccountResponse> = await this.api.post('/Renewals/daily-handover', payload);
    return response.data;
  }

  /** PUT /Renewals/daily-handover/{id} — تعديل سجل تسليم؛ الاستجابة نفس ملخص الحساب اليومي */
  async putDailyHandover(id: string, body: DailyHandoverUpdateRequest): Promise<DailyAccountResponse> {
    const payload: any = { ...body };
    if (payload.handoverDate === '' || payload.handoverDate == null) delete payload.handoverDate;
    if (payload.notes === '' || payload.notes == null) delete payload.notes;
    if (payload.receivedByUserId === '' || payload.receivedByUserId == null) delete payload.receivedByUserId;
    if (payload.receivedByAgentId === '' || payload.receivedByAgentId == null) delete payload.receivedByAgentId;
    const response: AxiosResponse<DailyAccountResponse> = await this.api.put(
      `/Renewals/daily-handover/${encodeURIComponent(id)}`,
      payload
    );
    return response.data;
  }

  // Balance top-up (رصيد الوكيل)
  async getBalance(): Promise<AgentBalanceDetail> {
    const response: AxiosResponse<AgentBalanceDetail> = await this.api.get('/Renewals/balance');
    return response.data;
  }

  /** تعديل رصيد الوكيل مباشرة (الرصيد العام فقط — لا يغيّر أرصدة المناطق) */
  async putBalance(balanceIqd: number): Promise<AgentBalanceDetail> {
    await this.api.put('/Renewals/balance', { balanceIqd });
    return await this.getBalance();
  }

  /** PUT /Renewals/balance/reseller/{agentResellerId} — تعيين رصيد منطقة محددة */
  async putResellerBalance(agentResellerId: string, balanceIqd: number): Promise<AgentBalanceDetail> {
    await this.api.put(
      `/Renewals/balance/reseller/${encodeURIComponent(agentResellerId)}`,
      { balanceIqd }
    );
    return await this.getBalance();
  }

  /** GET /providers/fiberx/latest-topup/preview — معاينة أحدث تعبئة (بدون حفظ) */
  async getFiberxLatestTopUpPreview(resellerId: string): Promise<FiberxLatestTopUpPreviewResponse> {
    const response = await this.api.get<Record<string, unknown>>('/providers/fiberx/latest-topup/preview', {
      params: { resellerId: resellerId.trim() },
    });
    return ApiService.normalizeFiberxLatestTopUpPreview(response.data ?? {}, resellerId);
  }

  /** جلب معاينة أحدث تعبئة لعدة مناطق */
  async getFiberxLatestTopUpPreviews(resellerIds: string[]): Promise<FiberxLatestTopUpPreviewResponse[]> {
    const ids = resellerIds.map((id) => id.trim()).filter(Boolean);
    const results = await Promise.all(
      ids.map(async (id) => {
        try {
          return await this.getFiberxLatestTopUpPreview(id);
        } catch (err: unknown) {
          return {
            resellerId: id,
            resellerName: '',
            currentResellerBalanceIqd: 0,
            alreadyRegistered: false,
            transaction: null,
            fetchError: ApiService.showError(err),
          } satisfies FiberxLatestTopUpPreviewResponse;
        }
      })
    );
    return results;
  }

  /** POST /providers/fiberx/latest-topup/register — تسجيل التعبئة بعد الموافقة */
  async registerFiberxLatestTopUp(
    resellerId: string,
    transactionUuid: string
  ): Promise<Record<string, unknown>> {
    const response = await this.api.post<Record<string, unknown>>(
      '/providers/fiberx/latest-topup/register',
      { transactionUuid: transactionUuid.trim() },
      { params: { resellerId: resellerId.trim() } }
    );
    return response.data ?? {};
  }

  private static normalizeFiberxLatestTopUpPreview(
    raw: Record<string, unknown>,
    fallbackResellerId: string
  ): FiberxLatestTopUpPreviewResponse {
    const num = (v: unknown, fallback = 0): number => {
      const n = Number(v);
      return Number.isFinite(n) ? n : fallback;
    };
    const txRaw = raw.transaction ?? raw.Transaction;
    let transaction: FiberxLatestTopUpPreviewResponse['transaction'] = null;
    if (txRaw && typeof txRaw === 'object' && !Array.isArray(txRaw)) {
      const t = txRaw as Record<string, unknown>;
      transaction = {
        uuid: String(t.uuid ?? t.Uuid ?? ''),
        amount: num(t.amount ?? t.Amount),
        balanceBefore: num(t.balanceBefore ?? t.BalanceBefore),
        balanceAfter: num(t.balanceAfter ?? t.BalanceAfter),
        paymentMethod: (t.paymentMethod ?? t.PaymentMethod ?? null) as string | null,
        description: (t.description ?? t.Description ?? null) as string | null,
        status: (t.status ?? t.Status ?? null) as string | null,
        createdAt: (t.createdAt ?? t.CreatedAt ?? null) as string | null,
      };
    }
    const alreadyRaw = raw.alreadyRegistered ?? raw.AlreadyRegistered;
    return {
      resellerId: String(raw.resellerId ?? raw.ResellerId ?? fallbackResellerId),
      resellerName: String(raw.resellerName ?? raw.ResellerName ?? ''),
      currentResellerBalanceIqd: num(raw.currentResellerBalanceIqd ?? raw.CurrentResellerBalanceIqd),
      alreadyRegistered:
        alreadyRaw === true || alreadyRaw === 'true' || alreadyRaw === 1 || alreadyRaw === '1',
      suggestedRecipientName: (raw.suggestedRecipientName ?? raw.SuggestedRecipientName ?? null) as
        | string
        | null,
      transaction,
    };
  }

  async postBalanceTopUp(body: BalanceTopUpRequest): Promise<BalanceTopUpResponse> {
    const payload: Record<string, unknown> = { ...body };
    if (payload.topUpDate === '' || payload.topUpDate == null) delete payload.topUpDate;
    if (!payload.agentResellerId) delete payload.agentResellerId;
    const response: AxiosResponse<BalanceTopUpResponse> = await this.api.post('/Renewals/balance/topup', payload);
    return response.data;
  }

  async getBalanceTopUps(params?: {
    page?: number;
    pageSize?: number;
    fromDate?: string;
    toDate?: string;
    /** منطقة واحدة */
    resellerId?: string;
    /** عدة مناطق — تُرسل كـ resellerIds=…&resellerIds=… */
    resellerIds?: string[];
  }): Promise<AgentBalanceTopUpsPage> {
    const searchParams = new URLSearchParams();
    searchParams.set('page', String(params?.page ?? 1));
    searchParams.set('pageSize', String(params?.pageSize ?? 20));
    const fromDate = params?.fromDate?.trim();
    const toDate = params?.toDate?.trim();
    if (fromDate) searchParams.set('fromDate', fromDate);
    if (toDate) searchParams.set('toDate', toDate);

    const singleResellerId = params?.resellerId?.trim();
    const multiResellerIds = (params?.resellerIds ?? []).map((id) => id.trim()).filter(Boolean);
    if (singleResellerId) {
      searchParams.set('resellerId', singleResellerId);
    } else if (multiResellerIds.length > 0) {
      multiResellerIds.forEach((id) => searchParams.append('resellerIds', id));
    }

    const response: AxiosResponse<Record<string, unknown>> = await this.api.get(
      `/Renewals/balance/topups?${searchParams.toString()}`
    );
    const raw = (response.data ?? {}) as Record<string, unknown>;
    const rowsRaw = (raw.data ?? raw.Data ?? []) as unknown[];

    const data: AgentBalanceTopUp[] = Array.isArray(rowsRaw)
      ? rowsRaw.map((r) => {
          const row = (r ?? {}) as Record<string, unknown>;
          return {
            id: String(row.id ?? row.Id ?? ''),
            amountIqd: Number(row.amountIqd ?? row.AmountIqd ?? 0),
            recipientName: String(row.recipientName ?? row.RecipientName ?? ''),
            companyName: String(row.companyName ?? row.CompanyName ?? ''),
            topUpDate: String(row.topUpDate ?? row.TopUpDate ?? ''),
            createdAt: String(row.createdAt ?? row.CreatedAt ?? ''),
            agentResellerId: (row.agentResellerId ?? row.AgentResellerId ?? null) as string | null,
            agentResellerName: (row.agentResellerName ?? row.AgentResellerName ?? null) as string | null,
          };
        })
      : [];

    return {
      data,
      currentPage: Number(raw.currentPage ?? raw.CurrentPage ?? params?.page ?? 1),
      pageSize: Number(raw.pageSize ?? raw.PageSize ?? params?.pageSize ?? 20),
      totalItems: Number(raw.totalItems ?? raw.TotalItems ?? data.length),
      totalPages: Math.max(1, Number(raw.totalPages ?? raw.TotalPages ?? 1)),
      hasNextPage: Boolean(raw.hasNextPage ?? raw.HasNextPage),
      hasPreviousPage: Boolean(raw.hasPreviousPage ?? raw.HasPreviousPage),
    };
  }

  // Agent Basic Update endpoint (only basic info, no subscription data)
  async updateAgentBasicInfo(agentId: string, data: {
    fullName: string;
    phone: string;
    companyName: string;
    address: string;
    governorate: string;
    isActive: boolean;
  }): Promise<void> {
    const response: AxiosResponse<void> = await this.api.put(`/Agents/${agentId}/basic-info`, data);
    return response.data;
  }

  // Agent Password Change endpoint
  async changeAgentPassword(agentId: string, passwordData: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }): Promise<void> {
    const response: AxiosResponse<void> = await this.api.put(`/Agents/${agentId}/change-password`, passwordData);
    return response.data;
  }

  // Excel Import endpoints
  async getExcelImportAgents(): Promise<ExcelImportAgent[]> {
    const response: AxiosResponse<ExcelImportAgent[]> = await this.api.get('/ExcelImport/agents');
    return response.data;
  }

  async importSubscribersFromExcel(agentId: string, file: File): Promise<ExcelImportResponse> {
    const formData = new FormData();
    formData.append('file', file);
    
    // Send agentId as query parameter since FormData doesn't work
    const response: AxiosResponse<ExcelImportResponse> = await this.api.post(`/ExcelImport/subscribers?agentId=${agentId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 600000, // up to 10 minutes (Excel import can be slow)
    });
    return response.data;
  }

  // System Message - GET (called when opening login page; no auth required for active message)
  async getSystemMessage(): Promise<SystemMessageResponse | null> {
    try {
      const response: AxiosResponse<SystemMessageResponse> = await this.api.get('/SystemMessage');
      if (response.data?.message && response.data?.expiresAt) {
        const expiresAt = new Date(response.data.expiresAt).getTime();
        if (expiresAt > Date.now()) return response.data;
      }
      return null;
    } catch {
      return null;
    }
  }

  // System Message - POST (Admin only)
  async createSystemMessage(data: SystemMessageCreateRequest): Promise<SystemMessageResponse> {
    const response: AxiosResponse<SystemMessageResponse> = await this.api.post('/SystemMessage', data);
    return response.data;
  }

  // رسالة التفعيل (Activation Message) - للوكيل الحالي
  async getActivationMessage(): Promise<MessageTemplateResponse | null> {
    try {
      const response: AxiosResponse<MessageTemplateResponse> = await this.api.get('/ActivationMessage');
      return response.data;
    } catch (err: any) {
      if (err?.response?.status === 404) return null;
      throw err;
    }
  }

  async setActivationMessage(template: string): Promise<MessageTemplateResponse> {
    try {
      await this.getActivationMessage();
      const response: AxiosResponse<MessageTemplateResponse> = await this.api.put('/ActivationMessage', { template });
      return response.data;
    } catch (err: any) {
      if (err?.response?.status === 404) {
        const response: AxiosResponse<MessageTemplateResponse> = await this.api.post('/ActivationMessage', { template });
        return response.data;
      }
      throw err;
    }
  }

  // رسالة التنبيه (Alert Message) - للوكيل الحالي
  async getAlertMessage(): Promise<MessageTemplateResponse | null> {
    try {
      const response: AxiosResponse<MessageTemplateResponse> = await this.api.get('/AlertMessage');
      return response.data;
    } catch (err: any) {
      if (err?.response?.status === 404) return null;
      throw err;
    }
  }

  async setAlertMessage(template: string): Promise<MessageTemplateResponse> {
    try {
      await this.getAlertMessage();
      const response: AxiosResponse<MessageTemplateResponse> = await this.api.put('/AlertMessage', { template });
      return response.data;
    } catch (err: any) {
      if (err?.response?.status === 404) {
        const response: AxiosResponse<MessageTemplateResponse> = await this.api.post('/AlertMessage', { template });
        return response.data;
      }
      throw err;
    }
  }

  // alias (older frontend code): keep names but use correct backend endpoint
  async getDetailsMessage(): Promise<MessageTemplateResponse | null> {
    return await this.getSubscriberDetailsMessage();
  }

  async setDetailsMessage(template: string): Promise<MessageTemplateResponse> {
    return await this.setSubscriberDetailsMessage(template);
  }

  // رسالة تفاصيل المشترك (Subscriber Details Message) - للوكيل الحالي
  async getSubscriberDetailsMessage(): Promise<MessageTemplateResponse | null> {
    try {
      const response: AxiosResponse<MessageTemplateResponse> = await this.api.get('/SubscriberDetailsMessage');
      return response.data;
    } catch (err: any) {
      if (err?.response?.status === 404) return null;
      throw err;
    }
  }

  async setSubscriberDetailsMessage(template: string): Promise<MessageTemplateResponse> {
    try {
      await this.getSubscriberDetailsMessage();
      const response: AxiosResponse<MessageTemplateResponse> = await this.api.put('/SubscriberDetailsMessage', { template });
      return response.data;
    } catch (err: any) {
      if (err?.response?.status === 404) {
        const response: AxiosResponse<MessageTemplateResponse> = await this.api.post('/SubscriberDetailsMessage', { template });
        return response.data;
      }
      throw err;
    }
  }

  /** قالب رسالة خاصة — قالب واحد لكل وكيل (حتى 2000 حرف)، يُرسل كما هو بدون مكانات */
  async getCustomMessage(): Promise<MessageTemplateResponse | null> {
    try {
      const response: AxiosResponse<MessageTemplateResponse> = await this.api.get('/CustomMessage');
      return response.data;
    } catch (err: any) {
      if (err?.response?.status === 404) return null;
      throw err;
    }
  }

  async setCustomMessage(template: string): Promise<MessageTemplateResponse> {
    try {
      await this.getCustomMessage();
      const response: AxiosResponse<MessageTemplateResponse> = await this.api.put('/CustomMessage', { template });
      return response.data;
    } catch (err: any) {
      if (err?.response?.status === 404) {
        const response: AxiosResponse<MessageTemplateResponse> = await this.api.post('/CustomMessage', { template });
        return response.data;
      }
      throw err;
    }
  }

  /** إرسال قالب رسالة خاصة لمشترك عبر واتساب (بدون body) */
  async sendWhatsAppCustomMessage(subscriberId: string): Promise<void> {
    await this.api.post(`/subscribers/${subscriberId}/send-whatsapp-custom`, undefined, {
      timeout: ApiService.WHATSAPP_SEND_TIMEOUT_MS,
    });
  }

  /** اعتماد SAS للوكلاء (أدمن فقط) مع ترقيم وبحث وفرز */
  async getSasCredentials(params?: {
    page?: number;
    pageSize?: number;
    searchTerm?: string;
    sortBy?: string;
  }): Promise<PaginatedResponse<SasCredentialsItem>> {
    const queryParams: Record<string, number | string | undefined> = {
      page: params?.page ?? 1,
      pageSize: params?.pageSize ?? 10,
    };
    if (params?.searchTerm?.trim()) queryParams.searchTerm = params.searchTerm.trim();
    if (params?.sortBy?.trim()) queryParams.sortBy = params.sortBy.trim();

    const response: AxiosResponse<PaginatedResponse<SasCredentialsItem>> = await this.api.get(
      '/providers/sas/credentials',
      { params: queryParams }
    );
    return response.data;
  }

  /** اعتماديات رسيلرز الوكلاء مع كلمة السر (أدمن فقط) — GET /providers/sas/resellers-credentials. الترتيب من الأحدث أولاً. */
  async getResellersCredentials(params?: {
    page?: number;
    pageSize?: number;
    searchTerm?: string;
    /** نص يُبحث عنه داخل اسم الشركة للوكيل (CompanyName). إن حُذف أو فُرغ: لا فلترة على الوكيل. */
    agentName?: string;
  }): Promise<PaginatedResponse<AgentResellerCredentialsDto> & { hasNextPage?: boolean; hasPreviousPage?: boolean; currentPage?: number; totalItems?: number }> {
    const queryParams: Record<string, string | number> = {
      page: params?.page ?? 1,
      pageSize: params?.pageSize ?? 20,
    };
    if (params?.searchTerm?.trim()) queryParams.searchTerm = params.searchTerm.trim();
    if (params?.agentName?.trim()) queryParams.agentName = params.agentName.trim();
    const response = await this.api.get('/providers/sas/resellers-credentials', { params: queryParams });
    const raw = response.data as PaginatedResponse<AgentResellerCredentialsDto> & {
      pageNumber?: number;
      hasNextPage?: boolean;
      hasPreviousPage?: boolean;
      totalItems?: number;
    };
    return {
      ...raw,
      currentPage: raw.currentPage ?? raw.pageNumber ?? 1,
      totalItems: raw.totalItems ?? raw.totalCount ?? 0,
      hasNextPage: raw.hasNextPage ?? (raw.currentPage ?? raw.pageNumber ?? 1) < (raw.totalPages ?? 1),
      hasPreviousPage: raw.hasPreviousPage ?? (raw.currentPage ?? raw.pageNumber ?? 1) > 1,
    };
  }

  /** خيارات حد أقصى لعدد المشتركين المسحوبين — GET …/providers/sas/subscriber-fetch-limit-options (أساس axios = …/wakeel/api) */
  async getSubscriberFetchLimitOptions(): Promise<SubscriberFetchLimitOption[]> {
    const response = await this.api.get<unknown>('/providers/sas/subscriber-fetch-limit-options');
    const raw = response.data;
    const arr = Array.isArray(raw) ? raw : (raw as { data?: unknown })?.data;
    if (!Array.isArray(arr)) return [];
    return arr.map((item: Record<string, unknown>) => {
      const v = item.value ?? item.Value;
      const value = v === undefined || v === null || v === '' ? null : Number(v);
      return {
        value: value != null && !Number.isNaN(value) ? value : null,
        label: String(item.label ?? item.Label ?? ''),
      };
    });
  }

  private static buildFiProviderSyncBody(request: ZainfiSyncRequest): Record<string, unknown> {
    const body: Record<string, unknown> = {};
    const rid = request.resellerId?.trim();
    if (rid) {
      body.resellerId = rid;
      const max = request.maxSubscribersToFetch;
      if (max != null && max > 0) body.maxSubscribersToFetch = max;
    } else {
      const bu = request.baseUrl?.trim();
      if (bu) body.baseUrl = bu;
      const un = request.username?.trim();
      if (un) body.username = un;
      if (request.password != null && request.password !== '') body.password = request.password;
      const max = request.maxSubscribersToFetch;
      if (max != null && max > 0) body.maxSubscribersToFetch = max;
    }
    return body;
  }

  /** مزامنة Zain Fi² وحفظ المشتركين — POST /providers/zainfi/sync. للأدمن: params.agentId */
  async syncZainfi(request: ZainfiSyncRequest, agentId?: string): Promise<ZainfiSyncResponse> {
    const params = agentId ? { agentId } : undefined;
    const body = ApiService.buildFiProviderSyncBody(request);

    const response = await this.api.post<ZainfiSyncResponse>('/providers/zainfi/sync', body, {
      params,
      timeout: ApiService.ZAINFI_SYNC_TIMEOUT_MS,
    });
    const raw = (response.data ?? {}) as unknown as Record<string, unknown>;
    const syncedRaw = raw.synced ?? raw.Synced;
    const errRaw = raw.error ?? raw.Error;
    return {
      synced: typeof syncedRaw === 'number' ? syncedRaw : Number(syncedRaw) || 0,
      error: errRaw != null && errRaw !== '' ? String(errRaw) : null,
    };
  }

  /** مزامنة FiberX — POST /providers/fiberx/sync (نفس جسم Zain Fi²). للأدمن: params.agentId */
  async syncFiberx(request: ZainfiSyncRequest, agentId?: string): Promise<ZainfiSyncResponse> {
    const params = agentId ? { agentId } : undefined;
    const body = ApiService.buildFiProviderSyncBody(request);
    const response = await this.api.post<ZainfiSyncResponse>('/providers/fiberx/sync', body, {
      params,
      timeout: ApiService.ZAINFI_SYNC_TIMEOUT_MS,
    });
    const raw = (response.data ?? {}) as unknown as Record<string, unknown>;
    const syncedRaw = raw.synced ?? raw.Synced;
    const errRaw = raw.error ?? raw.Error;
    return {
      synced: typeof syncedRaw === 'number' ? syncedRaw : Number(syncedRaw) || 0,
      error: errRaw != null && errRaw !== '' ? String(errRaw) : null,
    };
  }

  private static buildFiProviderSyncDiffQuery(params: {
    resellerId: string;
    maxSubscribersToFetch?: number | null;
    agentId?: string;
  }): Record<string, string> {
    const query: Record<string, string> = {
      resellerId: params.resellerId.trim(),
    };
    const m = params.maxSubscribersToFetch;
    if (m != null && m > 0) query.maxSubscribersToFetch = String(m);
    if (params.agentId) query.agentId = params.agentId;
    return query;
  }

  /** مقارنة مشتركي Zain Fi² مع النظام — GET /providers/zainfi/sync-diff */
  async getZainfiSyncDiff(params: {
    resellerId: string;
    maxSubscribersToFetch?: number | null;
    agentId?: string;
  }): Promise<ZainfiSubscriberDiffResponse> {
    const response = await this.api.get<unknown>('/providers/zainfi/sync-diff', {
      params: ApiService.buildFiProviderSyncDiffQuery(params),
      timeout: 600_000,
    });
    return ApiService.normalizeFiSubscriberSyncDiffResponse(response.data);
  }

  /** مقارنة FiberX مع النظام — GET /providers/fiberx/sync-diff */
  async getFiberxSyncDiff(params: {
    resellerId: string;
    maxSubscribersToFetch?: number | null;
    agentId?: string;
  }): Promise<ZainfiSubscriberDiffResponse> {
    const response = await this.api.get<unknown>('/providers/fiberx/sync-diff', {
      params: ApiService.buildFiProviderSyncDiffQuery(params),
      timeout: 600_000,
    });
    return ApiService.normalizeFiSubscriberSyncDiffResponse(response.data);
  }

  /**
   * تطبيق تاريخ انتهاء Zain على المشترك المحلي — POST /providers/zainfi/apply-external-expiration
   * للأدمن: نفس سلوك sync-diff عبر `agentId` في الاستعلام.
   */
  async applyZainfiExternalExpiration(
    body: ZainfiApplyExternalExpirationRequest,
    agentId?: string
  ): Promise<Subscriber> {
    const params = agentId ? { agentId } : undefined;
    const response = await this.api.post<Subscriber>('/providers/zainfi/apply-external-expiration', body, {
      params,
    });
    return response.data;
  }

  /** تطبيق تاريخ انتهاء FiberX — POST /providers/fiberx/apply-external-expiration */
  async applyFiberxExternalExpiration(
    body: ZainfiApplyExternalExpirationRequest,
    agentId?: string
  ): Promise<Subscriber> {
    const params = agentId ? { agentId } : undefined;
    const response = await this.api.post<Subscriber>('/providers/fiberx/apply-external-expiration', body, {
      params,
    });
    return response.data;
  }

  private static normalizeFiSubscriberSyncDiffResponse(raw: unknown): ZainfiSubscriberDiffResponse {
    const r = (raw ?? {}) as Record<string, unknown>;
    const err = r.error ?? r.Error;
    const differencesRaw = r.differences ?? r.Differences;
    const list = Array.isArray(differencesRaw) ? differencesRaw : [];
    const differences: ZainfiSubscriberDiffItem[] = list.map((item: unknown) => {
      const row = (item ?? {}) as Record<string, unknown>;
      const sid = String(row.subscriberId ?? row.SubscriberId ?? '');
      const df = row.diffFields ?? row.DiffFields;
      const diffFields = Array.isArray(df) ? df.map((x) => String(x)) : undefined;
      const subscriberName = row.subscriberName ?? row.SubscriberName;
      const expirationDate = row.expirationDate ?? row.ExpirationDate;
      const externalEndDate = row.externalEndDate ?? row.ExternalEndDate;
      const offerName = row.offerName ?? row.OfferName;
      const externalOfferName = row.externalOfferName ?? row.ExternalOfferName ?? offerName;
      const str = (v: unknown) =>
        v != null && String(v).trim() !== '' ? String(v).trim() : undefined;
      return {
        ...row,
        subscriberId: sid,
        diffFields,
        subscriberName: str(subscriberName),
        expirationDate: str(expirationDate),
        externalEndDate: str(externalEndDate),
        offerName: str(offerName),
        externalOfferName: str(externalOfferName),
      } as ZainfiSubscriberDiffItem;
    });
    const num = (v: unknown): number | undefined => {
      const n = typeof v === 'number' ? v : Number(v);
      return Number.isFinite(n) ? n : undefined;
    };
    return {
      error: err != null && String(err).trim() !== '' ? String(err) : null,
      externalRowCount: num(r.externalRowCount ?? r.ExternalRowCount),
      localSubscriberCount: num(r.localSubscriberCount ?? r.LocalSubscriberCount),
      matchedPairCount: num(r.matchedPairCount ?? r.MatchedPairCount),
      differences,
    };
  }

  /** مزامنة من الاعتماديات المحفوظة فقط — POST /providers/sas/sync-using-saved-credentials (بدون إرسال رابط/اسم مستخدم/كلمة مرور). agentId اختياري للأدمن. */
  async syncUsingSavedSasCredentials(agentId?: string): Promise<SasSyncUsingSavedCredentialsResponse> {
    const params = agentId ? { agentId } : undefined;
    const response = await this.api.post<SasSyncUsingSavedCredentialsResponse>(
      '/providers/sas/sync-using-saved-credentials',
      undefined,
      { params, timeout: ApiService.SAS_SYNC_TIMEOUT_MS }
    );
    return response.data;
  }

  /** جلب قائمة المزامنة — POST /providers/sas/sync-subscribers. الاستعلام: agentId (اختياري للوكيل، مطلوب للأدمن)، resellerId (اختياري). الجسم اختياري عند استخدام رسيلر محفوظ. */
  async syncSubscribers(request: SyncSubscribersRequest): Promise<SyncSubscribersResponse> {
    const { agentId, resellerId, baseUrl, username, password, maxSubscribersToFetch } = request;
    const params: Record<string, string> = {};
    if (agentId) params.agentId = agentId;
    if (resellerId) params.resellerId = resellerId;
    const body: Record<string, unknown> =
      baseUrl != null || username != null || password != null
        ? { baseUrl: baseUrl ?? '', username: username ?? '', password: password ?? '' }
        : {};
    if (maxSubscribersToFetch != null && maxSubscribersToFetch > 0) {
      body.maxSubscribersToFetch = maxSubscribersToFetch;
    }
    const response = await this.api.post<SyncSubscribersResponse>('/providers/sas/sync-subscribers', body, {
      params: Object.keys(params).length ? params : undefined,
      timeout: ApiService.SAS_SYNC_TIMEOUT_MS,
    });
    return response.data;
  }

  /** POST /providers/sas/synchronizationFTTH — مزامنة FTTH لآخر أسبوع (شامل اليوم) */
  async synchronizationFTTH(params?: {
    resellerId?: string;
    agentId?: string;
    onlyDiff?: boolean;
  }): Promise<CashbackSynchronizationFtthResponse> {
    const query: Record<string, string> = {};
    if (params?.resellerId) query.resellerId = params.resellerId;
    if (params?.agentId) query.agentId = params.agentId;
    if (params?.onlyDiff) query.onlyDiff = 'true';
    const response = await this.api.post<CashbackSynchronizationFtthResponse>(
      '/providers/sas/synchronizationFTTH',
      {},
      { params: Object.keys(query).length ? query : undefined, timeout: 600_000 }
    );
    const body = response.data;
    return {
      ...body,
      data: Array.isArray(body?.data) ? body.data : [],
    };
  }

  /** GET /providers/sas/synchronizationFTTH/diff — alias للفرق (onlyDiff=true) */
  async synchronizationFTTHDiff(params?: {
    resellerId?: string;
    agentId?: string;
  }): Promise<CashbackSynchronizationFtthResponse> {
    const query: Record<string, string> = {};
    if (params?.resellerId) query.resellerId = params.resellerId;
    if (params?.agentId) query.agentId = params.agentId;
    const response = await this.api.get<CashbackSynchronizationFtthResponse>(
      '/providers/sas/synchronizationFTTH/diff',
      { params: Object.keys(query).length ? query : undefined, timeout: 600_000 }
    );
    const body = response.data;
    return {
      ...body,
      data: Array.isArray(body?.data) ? body.data : [],
    };
  }

  /** POST /providers/sas/synchronizationSAS-diff — مزامنة SAS (الفرق فقط افتراضيا) */
  async synchronizationSASDiff(params?: {
    resellerId?: string;
    agentId?: string;
    onlyDiff?: boolean;
  }): Promise<CashbackSynchronizationFtthResponse> {
    const query: Record<string, string> = {};
    if (params?.resellerId) query.resellerId = params.resellerId;
    if (params?.agentId) query.agentId = params.agentId;
    query.onlyDiff = params?.onlyDiff === false ? 'false' : 'true';
    const response = await this.api.post<CashbackSynchronizationFtthResponse>(
      '/providers/sas/synchronizationSAS-diff',
      {},
      { params: query, timeout: 600_000 }
    );
    const body = response.data;
    return {
      ...body,
      data: Array.isArray(body?.data) ? body.data : [],
    };
  }

  /** POST /providers/sas/synchronizationSAS-diff/save — حفظ نتيجة SAS diff بدون خصم/فاتورة */
  async synchronizationSASDiffSave(
    row: import('../types').CashbackSynchronizationFtthRow,
    params?: { resellerId?: string; agentId?: string }
  ): Promise<{ message?: string; subscriberId?: string }> {
    const query: Record<string, string> = {};
    if (params?.resellerId) query.resellerId = params.resellerId;
    if (params?.agentId) query.agentId = params.agentId;
    const response = await this.api.post<{ message?: string; subscriberId?: string }>(
      '/providers/sas/synchronizationSAS-diff/save',
      row,
      { params: Object.keys(query).length ? query : undefined, timeout: 600_000 }
    );
    return response.data ?? {};
  }

  /** POST /providers/sas/synchronizationFTTH/save — حفظ بيانات المشترك بدون خصم/فاتورة */
  async synchronizationFTTHSave(
    row: import('../types').CashbackSynchronizationFtthRow,
    params?: { resellerId?: string; agentId?: string }
  ): Promise<{ message?: string; subscriberId?: string }> {
    const query: Record<string, string> = {};
    if (params?.resellerId) query.resellerId = params.resellerId;
    if (params?.agentId) query.agentId = params.agentId;
    const response = await this.api.post<{ message?: string; subscriberId?: string }>(
      '/providers/sas/synchronizationFTTH/save',
      row,
      { params: Object.keys(query).length ? query : undefined, timeout: 600_000 }
    );
    return response.data ?? {};
  }

  /** GET /Renewals/profiles — الباقات المستخدمة في مودال التفعيل/التجديد */
  async getRenewalProfiles(resellerId?: string): Promise<Profile[]> {
    const response = await this.api.get<PaginatedResponse<Profile> | Profile[]>('/Renewals/profiles', {
      params: {
        page: 1,
        pageSize: 500,
        ...(resellerId ? { resellerId } : {}),
      },
    });
    if (Array.isArray(response.data)) return response.data;
    return response.data?.data ?? [];
  }

  /**
   * GET /Renewals/subscriber/{subscriberId} — يتضمن AvailableDealers (فلتر resellerId كما في ترقيم الباقات).
   */
  async getRenewalSubscriberAvailableDealers(
    subscriberId: string,
    resellerId?: string
  ): Promise<{ dealers: Dealer[]; subscriberNoteTypes: SubscriberNoteTypeOption[] }> {
    const response = await this.api.get<Record<string, unknown>>(
      `/Renewals/subscriber/${encodeURIComponent(subscriberId)}`,
      {
        params: {
          page: 1,
          pageSize: 500,
          ...(resellerId ? { resellerId } : {}),
        },
      }
    );
    const raw = response.data;
    if (raw == null || typeof raw !== 'object') {
      return { dealers: [], subscriberNoteTypes: defaultSubscriberNoteTypeOptions() };
    }
    const o = raw as Record<string, unknown>;
    const inner = o.data ?? o.Data;
    const payload =
      inner && typeof inner === 'object' && !Array.isArray(inner) ? ({ ...o, ...(inner as object) } as Record<string, unknown>) : o;

    let dealersArr = payload.availableDealers ?? payload.AvailableDealers;
    if (!Array.isArray(dealersArr) || dealersArr.length === 0) {
      const onlyInner = inner && typeof inner === 'object' && !Array.isArray(inner) ? (inner as Record<string, unknown>) : null;
      dealersArr = onlyInner?.availableDealers ?? onlyInner?.AvailableDealers ?? dealersArr;
    }
    const dealers = Array.isArray(dealersArr) ? dealersArr.map((x) => ApiService.normalizeDealer(x)) : [];

    let noteRaw: unknown =
      payload.subscriberNoteTypes ?? payload.SubscriberNoteTypes ?? o.subscriberNoteTypes ?? o.SubscriberNoteTypes;
    if (!Array.isArray(noteRaw) || noteRaw.length === 0) {
      const onlyInner = inner && typeof inner === 'object' && !Array.isArray(inner) ? (inner as Record<string, unknown>) : null;
      noteRaw = onlyInner?.subscriberNoteTypes ?? onlyInner?.SubscriberNoteTypes ?? noteRaw;
    }
    let subscriberNoteTypes = parseSubscriberNoteTypesCatalog(noteRaw);
    if (subscriberNoteTypes.length === 0) {
      subscriberNoteTypes = defaultSubscriberNoteTypeOptions();
    }
    return { dealers, subscriberNoteTypes };
  }

  /**
   * GET /Renewals/dealers — تجار الوكيل الحالي (للأدمن: agentId إلزامي). resellerId اختياري.
   */
  async getRenewalDealersList(params?: { agentId?: string; resellerId?: string }): Promise<Dealer[]> {
    const q: Record<string, string | number> = { page: 1, pageSize: 500 };
    if (params?.resellerId) q.resellerId = params.resellerId;
    if (params?.agentId) q.agentId = params.agentId;
    const response = await this.api.get<unknown>('/Renewals/dealers', { params: q });
    if (Array.isArray(response.data)) {
      return response.data.map((x) => ApiService.normalizeDealer(x));
    }
    const norm = ApiService.normalizePaginationDto(response.data, (x) => ApiService.normalizeDealer(x));
    return norm.data;
  }

  /** حساب الراجع وتجهيز صفوف التصدير — POST /providers/sas/cashback-transactions */
  async getCashbackTransactions(request: CashbackTransactionsRequest): Promise<CashbackTransactionsResponse> {
    const response = await this.api.post<CashbackTransactionsResponse>(
      '/providers/sas/cashback-transactions',
      request,
      {
        timeout: 600_000,
        headers: { 'Content-Type': 'application/json' },
      }
    );
    return response.data ?? { rows: [] };
  }

  /** مناطق مشتركي الوكيل (Subscriber.Zone) — GET /providers/sas/cashback-transactions/zones. للأدمن: params.agentId إلزامي. */
  async getCashbackSubscriberZones(agentId?: string): Promise<CashbackSubscriberZonesResponse> {
    const params = agentId ? { agentId } : undefined;
    const response = await this.api.get<CashbackSubscriberZonesResponse>('/providers/sas/cashback-transactions/zones', {
      params,
    });
    return response.data ?? { zones: [] };
  }

  /** باقات الوكيل لحساب الكاش باك — GET /providers/sas/cashback-transactions/packages. للأدمن: params.agentId إلزامي. */
  async getCashbackPackages(agentId?: string): Promise<CashbackPackageDto[]> {
    const params = agentId ? { agentId } : undefined;
    const response = await this.api.get<CashbackPackageDto[] | { data?: CashbackPackageDto[] }>(
      '/providers/sas/cashback-transactions/packages',
      { params }
    );
    const d = response.data;
    if (Array.isArray(d)) return d;
    if (d && typeof d === 'object' && Array.isArray((d as { data?: CashbackPackageDto[] }).data)) {
      return (d as { data: CashbackPackageDto[] }).data;
    }
    return [];
  }

  /**
   * سجلات الكاش باك المحفوظة — GET /providers/sas/cashback-transactions/records
   * Query: agentId (اختياري للأدمن)، year، month، take (افتراضي 100، حد أقصى 500).
   */
  async getCashbackTransactionRecords(query?: {
    agentId?: string;
    year?: number;
    month?: number;
    take?: number;
  }): Promise<CashbackTransactionRecordDto[]> {
    const params: Record<string, string | number> = {};
    if (query?.agentId) params.agentId = query.agentId;
    if (query?.year != null && !Number.isNaN(query.year)) params.year = query.year;
    if (query?.month != null && !Number.isNaN(query.month)) params.month = query.month;
    const take = query?.take != null ? Math.min(500, Math.max(1, Math.floor(query.take))) : undefined;
    if (take != null) params.take = take;
    const response = await this.api.get<CashbackTransactionRecordDto[] | { data?: CashbackTransactionRecordDto[] }>(
      '/providers/sas/cashback-transactions/records',
      { params }
    );
    const d = response.data;
    if (Array.isArray(d)) return d;
    if (d && typeof d === 'object' && Array.isArray((d as { data?: CashbackTransactionRecordDto[] }).data)) {
      return (d as { data: CashbackTransactionRecordDto[] }).data;
    }
    return [];
  }

  /**
   * تحديث المبلغ الحقيقي للكاش باك لسجل محفوظ — PUT /providers/sas/cashback-transactions/records/{id}/real-total
   */
  async updateCashbackRecordRealTotal(
    recordId: string,
    body: CashbackRecordRealTotalUpdateRequest
  ): Promise<void> {
    await this.api.put(
      `/providers/sas/cashback-transactions/records/${encodeURIComponent(recordId)}/real-total`,
      body,
      { headers: { 'Content-Type': 'application/json' } }
    );
  }

  /**
   * تحديث المبلغ المتوقع المحفوظ في السجل — PUT /providers/sas/cashback-transactions/records/{id}/total (المبلغ يجب أن يكون > 0)
   */
  async updateCashbackRecordExpectedTotal(
    recordId: string,
    body: CashbackExpectedTotalUpdateRequest
  ): Promise<CashbackExpectedTotalUpdateResponse> {
    const response = await this.api.put<CashbackExpectedTotalUpdateResponse>(
      `/providers/sas/cashback-transactions/records/${encodeURIComponent(recordId)}/total`,
      body,
      { headers: { 'Content-Type': 'application/json' } }
    );
    return response.data ?? { id: recordId, totalCashbackAmount: body.totalCashbackAmount };
  }

  /** يُمرَّر مع cashback-transactions/fetch مع الجسم — احتياط عند دمج الباكند للمفاتيح من الاستعلام */
  private static appendCashbackFetchDateKeysToQuery(
    params: Record<string, string>,
    body: Pick<CashbackFetchBody, 'fromDateKey' | 'toDateKey'>
  ): void {
    const f = body.fromDateKey?.trim();
    const t = body.toDateKey?.trim();
    if (f) params.fromDateKey = f;
    if (t) params.toDateKey = t;
  }

  /**
   * تقرير الكاش باك عبر السيرفر (FTTH من قاعدة البيانات) — POST /providers/sas/cashback-transactions/fetch
   * Query: resellerId، agentId، format (json افتراضياً)، واختيارياً fromDateKey/toDateKey (نفس yyyy-MM-dd في الجسم للاتساق).
   */
  async fetchCashbackTransactionsJson(
    body: CashbackFetchBody,
    query: { resellerId?: string; agentId?: string }
  ): Promise<CashbackTransactionsResponse> {
    const params: Record<string, string> = {};
    if (query.resellerId) params.resellerId = query.resellerId;
    if (query.agentId) params.agentId = query.agentId;
    ApiService.appendCashbackFetchDateKeysToQuery(params, body);
    const response = await this.api.post<CashbackTransactionsResponse>(
      '/providers/sas/cashback-transactions/fetch',
      body,
      {
        params,
        timeout: 600_000,
        headers: { 'Content-Type': 'application/json' },
      }
    );
    return response.data ?? { rows: [] };
  }

  /**
   * نفس fetch مع format=excel|xlsx — استجابة ملف Excel (أعمدة عربية + ملخص).
   * تُمرَّر fromDateKey/toDateKey في الاستعلام أيضاً إن وُجدتا في الجسم (احتياط إن أُزيلت من JSON بعد التنظيف).
   */
  async fetchCashbackTransactionsExcel(
    body: CashbackFetchBody,
    query: { resellerId?: string; agentId?: string; format?: 'excel' | 'xlsx' }
  ): Promise<{ blob: Blob; filename: string }> {
    const params: Record<string, string> = {};
    if (query.resellerId) params.resellerId = query.resellerId;
    if (query.agentId) params.agentId = query.agentId;
    params.format = query.format === 'excel' ? 'excel' : 'xlsx';
    ApiService.appendCashbackFetchDateKeysToQuery(params, body);
    try {
      const response = await this.api.post<Blob>('/providers/sas/cashback-transactions/fetch', body, {
        params,
        responseType: 'blob',
        timeout: 600_000,
        headers: { 'Content-Type': 'application/json' },
      });
      const ct = (response.headers['content-type'] || '').toLowerCase();
      if (ct.includes('application/json') && response.data) {
        const text = await new Response(response.data).text();
        let parsed: unknown;
        try {
          parsed = JSON.parse(text);
        } catch {
          throw new Error(text.trim().slice(0, 500) || 'فشل تصدير Excel');
        }
        const j = parsed as CashbackTransactionsResponse & {
          detail?: string;
          message?: string;
          title?: string;
        };
        /** السيرفر أحياناً يعيد نفس JSON الـ fetch بدل ملف xlsx — نُنشئ الملف من الصفوف محلياً. */
        if (Array.isArray(j.rows)) {
          const blob = buildCashbackXlsxBlobFromJson(j);
          const rawName = this.filenameFromContentDisposition(response.headers['content-disposition']);
          const filename =
            rawName && /\.(xlsx|xls)$/i.test(rawName) ? rawName : `cashback-${Date.now()}.xlsx`;
          return { blob, filename };
        }
        throw new Error(j.detail || j.message || j.title || 'فشل تصدير Excel');
      }
      const rawName = this.filenameFromContentDisposition(response.headers['content-disposition']);
      const filename = rawName && /\.(xlsx|xls)$/i.test(rawName) ? rawName : `cashback-${Date.now()}.xlsx`;
      return { blob: response.data, filename };
    } catch (e: unknown) {
      if (axios.isAxiosError(e) && e.response?.data instanceof Blob) {
        const text = await new Response(e.response.data as Blob).text();
        let msg = 'فشل تصدير Excel';
        try {
          const j = JSON.parse(text) as { detail?: string; message?: string; title?: string; errors?: Record<string, string[]> };
          msg = j.detail || j.message || j.title || msg;
          if (j.errors && typeof j.errors === 'object') {
            const parts = Object.values(j.errors).flat();
            if (parts.length) msg = parts.join('\n');
          }
        } catch {
          if (text.trim()) msg = text.trim().slice(0, 500);
        }
        throw new Error(msg);
      }
      throw e;
    }
  }

  /** Query اختياري للأدمن فقط — إلزامي لجميع طلبات CustomerInvoices */
  private static customerInvoicesAgentParams(agentId?: string): { agentId: string } | undefined {
    return agentId ? { agentId } : undefined;
  }

  private static defaultCustomerInvoiceStatistics(): CustomerInvoiceStatisticsDto {
    return {
      totalDebtAmount: 0,
      totalDebtPaid: 0,
      totalDebtRemaining: 0,
      totalBalanceAmount: 0,
      totalTransferAmount: 0,
      totalCompanyDebtAmount: 0,
      customerCount: 0,
    };
  }

  private static normalizeCustomerInvoiceStatistics(raw: unknown): CustomerInvoiceStatisticsDto {
    const o = (raw ?? {}) as Record<string, unknown>;
    const num = (v: unknown): number => {
      const n = Number(v);
      return Number.isFinite(n) ? n : 0;
    };
    return {
      totalDebtAmount: num(o.totalDebtAmount ?? o.TotalDebtAmount),
      totalDebtPaid: num(o.totalDebtPaid ?? o.TotalDebtPaid),
      totalDebtRemaining: num(o.totalDebtRemaining ?? o.TotalDebtRemaining),
      totalBalanceAmount: num(o.totalBalanceAmount ?? o.TotalBalanceAmount),
      totalTransferAmount: num(o.totalTransferAmount ?? o.TotalTransferAmount),
      totalCompanyDebtAmount: num(o.totalCompanyDebtAmount ?? o.TotalCompanyDebtAmount),
      customerCount: num(o.customerCount ?? o.CustomerCount),
    };
  }

  private static normalizeCustomerInvoiceListItem(row: CustomerInvoiceCustomerDto): CustomerInvoiceCustomerDto {
    const r = row as unknown as Record<string, unknown>;
    const notesVal = r.notes ?? r.Notes;
    const notes =
      notesVal == null || notesVal === '' ? null : String(notesVal);
    const customerIdRaw = r.customerId ?? r.CustomerId;
    const customerId =
      customerIdRaw != null && String(customerIdRaw).trim() !== ''
        ? String(customerIdRaw)
        : undefined;
    const invoiceTypeRaw = r.invoiceType ?? r.InvoiceType;
    let invoiceType: number | null = null;
    if (invoiceTypeRaw != null && invoiceTypeRaw !== '') {
      const n = Number(invoiceTypeRaw);
      if (Number.isFinite(n)) invoiceType = n;
    }
    const debtDateRaw = r.debtDate ?? r.DebtDate;
    const debtDate =
      debtDateRaw != null && String(debtDateRaw).trim() !== '' ? String(debtDateRaw) : null;
    const paymentMethodRaw = r.paymentMethod ?? r.PaymentMethod;
    let paymentMethod: number | undefined;
    if (paymentMethodRaw != null && paymentMethodRaw !== '') {
      const pm = Number(paymentMethodRaw);
      if (Number.isFinite(pm)) paymentMethod = pm;
    }
    return { ...row, notes, customerId, invoiceType, debtDate, paymentMethod };
  }

  private static normalizeCustomerInvoiceRecordRow(inv: Record<string, unknown>): CustomerInvoiceRecordDto {
    const notesVal = inv.notes ?? inv.Notes;
    const notes =
      notesVal == null || notesVal === '' ? null : String(notesVal);
    const id = String(inv.id ?? inv.Id ?? '');
    const debtDate =
      inv.debtDate != null && String(inv.debtDate).trim() !== ''
        ? String(inv.debtDate)
        : inv.DebtDate != null && String(inv.DebtDate).trim() !== ''
          ? String(inv.DebtDate)
          : null;
    const invoiceType = (inv.invoiceType ?? inv.InvoiceType ?? null) as string | number | null;
    return {
      ...inv,
      id,
      customerId: String(inv.customerId ?? inv.CustomerId ?? ''),
      notes,
      debtDate,
      invoiceType,
    } as CustomerInvoiceRecordDto;
  }

  private static normalizeCustomerInvoiceCustomerGroup(raw: unknown): CustomerInvoiceCustomerGroupDto {
    const g = (raw ?? {}) as Record<string, unknown>;
    const num = (v: unknown): number => {
      const n = Number(v);
      return Number.isFinite(n) ? n : 0;
    };
    const customerId = String(g.customerId ?? g.CustomerId ?? g.id ?? g.Id ?? '').trim();
    const invRaw = g.invoices ?? g.Invoices;
    const invoices = Array.isArray(invRaw)
      ? (invRaw as Record<string, unknown>[]).map((x) => ApiService.normalizeCustomerInvoiceRecordRow(x))
      : [];
    const agentRaw = g.agentId ?? g.AgentId;
    const invoiceTypeRaw = g.invoiceType ?? g.InvoiceType;
    let invoiceType: number | null = null;
    if (invoiceTypeRaw != null && String(invoiceTypeRaw).trim() !== '') {
      const n = Number(invoiceTypeRaw);
      if (Number.isFinite(n)) invoiceType = n;
    }
    return {
      customerId,
      agentId: agentRaw != null && String(agentRaw).trim() !== '' ? String(agentRaw) : undefined,
      customerName: String(g.customerName ?? g.CustomerName ?? ''),
      customerUsername:
        g.customerUsername != null && String(g.customerUsername).trim() !== ''
          ? String(g.customerUsername)
          : g.CustomerUsername != null && String(g.CustomerUsername).trim() !== ''
            ? String(g.CustomerUsername)
            : null,
      phoneNumber:
        g.phoneNumber != null && String(g.phoneNumber).trim() !== ''
          ? String(g.phoneNumber)
          : g.PhoneNumber != null && String(g.PhoneNumber).trim() !== ''
            ? String(g.PhoneNumber)
            : null,
      address:
        g.address != null && String(g.address).trim() !== ''
          ? String(g.address)
          : g.Address != null && String(g.Address).trim() !== ''
            ? String(g.Address)
            : null,
      customerType: Number(g.customerType ?? g.CustomerType ?? 0),
      createdAt:
        g.createdAt != null ? String(g.createdAt) : g.CreatedAt != null ? String(g.CreatedAt) : null,
      updatedAt:
        g.updatedAt != null ? String(g.updatedAt) : g.UpdatedAt != null ? String(g.UpdatedAt) : null,
      totalDebtAmount: num(g.totalDebtAmount ?? g.TotalDebtAmount),
      totalDebtPaid: num(g.totalDebtPaid ?? g.TotalDebtPaid),
      totalDebtRemaining: num(g.totalDebtRemaining ?? g.TotalDebtRemaining),
      invoiceType,
      invoices,
    };
  }

  private static parseCustomerInvoicesListResponse(payload: unknown): CustomerInvoicesListResponse {
    const root = ApiService.unwrapApiEntityPayload(payload);
    const o = (root && typeof root === 'object' ? root : {}) as Record<string, unknown>;
    const num = (v: unknown, d: number): number => {
      const n = Number(v);
      return Number.isFinite(n) ? n : d;
    };
    const currentPage = Math.max(1, num(o.currentPage ?? o.CurrentPage, 1));
    const pageSize = Math.min(200, Math.max(1, num(o.pageSize ?? o.PageSize, 20)));
    const totalItemsRaw = o.totalItems ?? o.TotalItems;
    const totalPagesRaw = o.totalPages ?? o.TotalPages;
    const fallbackCount = (() => {
      const groupsRaw = o.customerGroups ?? o.CustomerGroups;
      if (Array.isArray(groupsRaw)) return groupsRaw.length;
      const itemsRaw = o.items ?? o.Items ?? o.data ?? o.Data;
      if (Array.isArray(itemsRaw)) return itemsRaw.length;
      return 0;
    })();
    const totalItems = Math.max(
      0,
      num(totalItemsRaw, fallbackCount)
    );
    const totalPages = Math.max(
      1,
      num(totalPagesRaw, Math.max(1, Math.ceil(totalItems / Math.max(1, pageSize))))
    );
    const hasNextPage = Boolean(o.hasNextPage ?? o.HasNextPage ?? currentPage < totalPages);
    const hasPreviousPage = Boolean(o.hasPreviousPage ?? o.HasPreviousPage ?? currentPage > 1);
    const stats = ApiService.normalizeCustomerInvoiceStatistics(
      o.statistics ?? o.Statistics ?? ApiService.defaultCustomerInvoiceStatistics()
    );

    const cgRaw = o.customerGroups ?? o.CustomerGroups;
    if (Array.isArray(cgRaw)) {
      return {
        items: null,
        customerGroups: cgRaw.map((g) => ApiService.normalizeCustomerInvoiceCustomerGroup(g)),
        statistics: stats,
        currentPage,
        pageSize,
        totalItems,
        totalPages,
        hasNextPage,
        hasPreviousPage,
      };
    }

    const mapItems = (items: CustomerInvoiceCustomerDto[]) =>
      items.map((x) => ApiService.normalizeCustomerInvoiceListItem(x));

    const itemsRaw = o.items ?? o.Items ?? o.data ?? o.Data;
    if (Array.isArray(itemsRaw)) {
      return {
        items: mapItems(itemsRaw as CustomerInvoiceCustomerDto[]),
        customerGroups: null,
        statistics: stats,
        currentPage,
        pageSize,
        totalItems,
        totalPages,
        hasNextPage,
        hasPreviousPage,
      };
    }

    if (Array.isArray(root)) {
      return {
        items: mapItems(root as CustomerInvoiceCustomerDto[]),
        customerGroups: null,
        statistics: stats,
        currentPage,
        pageSize,
        totalItems,
        totalPages,
        hasNextPage,
        hasPreviousPage,
      };
    }

    return {
      items: [],
      customerGroups: null,
      statistics: stats,
      currentPage,
      pageSize,
      totalItems,
      totalPages,
      hasNextPage,
      hasPreviousPage,
    };
  }

  /** GET /CustomerInvoices — للأدمن: agentId إلزامي؛ فلترة اختيارية على النتائج */
  async getCustomerInvoices(query?: {
    agentId?: string;
    customerName?: string;
    customerUsername?: string;
    phoneNumber?: string;
    customerType?: number;
    page?: number;
    pageSize?: number;
    /** الافتراضي true: customerGroups + items=null */
    groupByCustomer?: boolean;
  }): Promise<CustomerInvoicesListResponse> {
    const params: Record<string, string | number | boolean> = {};
    if (query?.agentId) params.agentId = query.agentId;
    if (query?.customerName?.trim()) params.customerName = query.customerName.trim();
    if (query?.customerUsername?.trim()) params.customerUsername = query.customerUsername.trim();
    if (query?.phoneNumber?.trim()) params.phoneNumber = query.phoneNumber.trim();
    if (query?.customerType !== undefined && query?.customerType !== null) {
      params.customerType = query.customerType;
    }
    if (query?.page !== undefined && query?.page !== null) params.page = query.page;
    if (query?.pageSize !== undefined && query?.pageSize !== null) params.pageSize = query.pageSize;
    if (query?.groupByCustomer === false) {
      params.groupByCustomer = false;
    } else {
      params.groupByCustomer = true;
    }
    const response = await this.api.get<unknown>('/CustomerInvoices', { params });
    return ApiService.parseCustomerInvoicesListResponse(response.data);
  }

  /** يزيل غلاف { data: T } إن وُجد — مطابقاً لأنماط ASP.NET الشائعة */
  private static unwrapApiEntityPayload(raw: unknown): unknown {
    if (raw == null || typeof raw !== 'object') return raw;
    const o = raw as Record<string, unknown>;
    if (
      'data' in o &&
      o.data != null &&
      typeof o.data === 'object' &&
      !Array.isArray(o.data)
    ) {
      return o.data;
    }
    return raw;
  }

  /**
   * بعض إصدارات الـ API تعيد فاتورة واحدة مدمجة مع بيانات العميل دون مصفوفة `invoices`
   * (حقول الرصيد/التحويل/الدفع على الجذر مع `customerId`).
   */
  private static looksLikeMergedCustomerInvoiceDetailWithoutInvoicesArray(r: Record<string, unknown>): boolean {
    const nested = r.invoices ?? r.Invoices;
    if (Array.isArray(nested) && nested.length > 0) return false;
    const cid = (r.customerId ?? r.CustomerId ?? '').toString().trim();
    if (!cid) return false;
    return (
      r.balanceAmount !== undefined ||
      r.transferAmount !== undefined ||
      r.debtAmount !== undefined ||
      r.paymentMethod !== undefined
    );
  }

  /** صف فاتورة واحد مستخرج من استجابة GET مدمجة (الجذر = سجل فاتورة + حقول عميل). */
  private static syntheticInvoiceFromMergedDetailRoot(r: Record<string, unknown>): CustomerInvoiceRecordDto {
    const notesVal = r.notes ?? r.Notes;
    const notes =
      notesVal == null || notesVal === '' ? null : String(notesVal);
    return {
      id: String(r.id ?? r.Id ?? ''),
      customerId: String(r.customerId ?? r.CustomerId ?? ''),
      invoiceType: (r.invoiceType ?? r.InvoiceType ?? null) as string | number | null,
      balanceAmount: Number(r.balanceAmount ?? 0),
      transferAmount: Number(r.transferAmount ?? 0),
      debtAmount: r.debtAmount != null ? Number(r.debtAmount) : undefined,
      debtPaid: r.debtPaid != null ? Number(r.debtPaid) : undefined,
      debtRemaining: r.debtRemaining != null ? Number(r.debtRemaining) : undefined,
      debtDate:
        r.debtDate != null && String(r.debtDate).trim() !== ''
          ? String(r.debtDate)
          : r.DebtDate != null && String(r.DebtDate).trim() !== ''
            ? String(r.DebtDate)
            : null,
      paymentMethod: Number(r.paymentMethod ?? 0),
      notes,
      createdAt: String(r.createdAt ?? ''),
      updatedAt: r.updatedAt != null ? String(r.updatedAt) : null,
    } as CustomerInvoiceRecordDto;
  }

  private static normalizeCustomerInvoiceDetail(raw: unknown): CustomerInvoiceDetailDto {
    const payload = ApiService.unwrapApiEntityPayload(raw);
    if (payload == null || typeof payload !== 'object') {
      return { id: '', agentId: '', customerName: '', customerType: 0, invoices: [] } as CustomerInvoiceDetailDto;
    }
    const r = payload as Record<string, unknown>;
    const invRaw = r.invoices ?? r.Invoices;
    let invoices: CustomerInvoiceRecordDto[] = Array.isArray(invRaw)
      ? (invRaw as Record<string, unknown>[]).map((inv) => ApiService.normalizeCustomerInvoiceRecordRow(inv))
      : [];

    if (invoices.length === 0 && ApiService.looksLikeMergedCustomerInvoiceDetailWithoutInvoicesArray(r)) {
      invoices = [ApiService.syntheticInvoiceFromMergedDetailRoot(r)];
    }

    const customerId = String(r.customerId ?? r.CustomerId ?? '').trim();
    /** مع الشكل المدمج يكون `r.id` أحياناً معرف الفاتورة؛ لعرض التفاصيل نثبت معرف العميل في `id`. */
    const id =
      invoices.length > 0 && customerId && ApiService.looksLikeMergedCustomerInvoiceDetailWithoutInvoicesArray(r)
        ? customerId
        : String(r.id ?? r.Id ?? '');

    const merged = { ...r, id, invoices } as CustomerInvoiceDetailDto;
    return merged;
  }

  /** GET /api/CustomerInvoices/{id} — تفاصيل العميل وجميع فواتيره كمصفوفة `invoices` */
  async getCustomerInvoiceById(id: string, agentId?: string): Promise<CustomerInvoiceDetailDto> {
    const response = await this.api.get<unknown>(
      `/CustomerInvoices/${encodeURIComponent(id)}`,
      { params: ApiService.customerInvoicesAgentParams(agentId) }
    );
    return ApiService.normalizeCustomerInvoiceDetail(response.data);
  }

  /** POST /CustomerInvoices — إنشاء عميل فقط */
  async createCustomerInvoiceCustomer(
    body: CustomerInvoiceCustomerCreateDto,
    agentId?: string
  ): Promise<CustomerInvoiceCustomerDto> {
    const response = await this.api.post<CustomerInvoiceCustomerDto>('/CustomerInvoices', body, {
      params: ApiService.customerInvoicesAgentParams(agentId),
    });
    return response.data;
  }

  /** PUT /CustomerInvoices/{customerId} — تعديل بيانات العميل */
  async updateCustomerInvoiceCustomer(
    customerId: string,
    body: CustomerInvoiceCustomerUpdateDto,
    agentId?: string
  ): Promise<CustomerInvoiceCustomerDto> {
    const response = await this.api.put<CustomerInvoiceCustomerDto>(
      `/CustomerInvoices/${encodeURIComponent(customerId)}`,
      body,
      { params: ApiService.customerInvoicesAgentParams(agentId) }
    );
    return response.data;
  }

  /** DELETE /CustomerInvoices/{customerId} — 204 */
  async deleteCustomerInvoiceCustomer(customerId: string, agentId?: string): Promise<void> {
    await this.api.delete(`/CustomerInvoices/${encodeURIComponent(customerId)}`, {
      params: ApiService.customerInvoicesAgentParams(agentId),
    });
  }

  /** POST /CustomerInvoices/{customerId}/invoices — إضافة فاتورة (debtAmount = balance − transfer) */
  async createCustomerInvoiceRecord(
    customerId: string,
    body: CustomerInvoiceRecordCreateDto,
    agentId?: string
  ): Promise<CustomerInvoiceRecordDto> {
    const response = await this.api.post<CustomerInvoiceRecordDto>(
      `/CustomerInvoices/${encodeURIComponent(customerId)}/invoices`,
      body,
      { params: ApiService.customerInvoicesAgentParams(agentId) }
    );
    return response.data;
  }

  /** POST /api/CustomerInvoices/company-debt — إضافة فاتورة دين على الشركة */
  async createCustomerInvoiceCompanyDebt(
    body: CustomerInvoiceCompanyDebtCreateDto,
    agentId?: string
  ): Promise<CustomerInvoiceRecordDto> {
    const response = await this.api.post<CustomerInvoiceRecordDto>(
      '/CustomerInvoices/company-debt',
      body,
      { params: ApiService.customerInvoicesAgentParams(agentId) }
    );
    return response.data;
  }

  /** POST /api/CustomerInvoices/journal-entry — قيد محاسبي بين عميلين */
  async createCustomerInvoiceJournalEntry(
    body: CustomerInvoiceJournalEntryCreateDto,
    agentId?: string
  ): Promise<void> {
    await this.api.post('/CustomerInvoices/journal-entry', body, {
      params: ApiService.customerInvoicesAgentParams(agentId),
    });
  }

  /** PUT /CustomerInvoices/{id} — تعديل فاتورة (معرّف الفاتورة) */
  async updateCustomerInvoiceRecord(
    invoiceId: string,
    body: CustomerInvoiceRecordCreateDto,
    agentId?: string
  ): Promise<CustomerInvoiceRecordDto> {
    const response = await this.api.put<CustomerInvoiceRecordDto>(
      `/CustomerInvoices/${encodeURIComponent(invoiceId)}`,
      body,
      { params: ApiService.customerInvoicesAgentParams(agentId) }
    );
    return response.data;
  }

  /** DELETE /CustomerInvoices/{id} — حذف فاتورة (معرّف الفاتورة) — 204 */
  async deleteCustomerInvoiceRecord(invoiceId: string, agentId?: string): Promise<void> {
    await this.api.delete(`/CustomerInvoices/${encodeURIComponent(invoiceId)}`, {
      params: ApiService.customerInvoicesAgentParams(agentId),
    });
  }

  /** POST /CustomerInvoices/{invoiceId}/send-whatsapp — إرسال نص الفاتورة (معرّف الفاتورة) */
  async sendCustomerInvoiceWhatsApp(
    invoiceId: string,
    agentId?: string
  ): Promise<CustomerInvoiceSendWhatsAppResponse> {
    const response = await this.api.post<CustomerInvoiceSendWhatsAppResponse>(
      `/CustomerInvoices/${encodeURIComponent(invoiceId)}/send-whatsapp`,
      undefined,
      {
        params: ApiService.customerInvoicesAgentParams(agentId),
        timeout: ApiService.WHATSAPP_SEND_TIMEOUT_MS,
      }
    );
    return response.data ?? {};
  }

  /** POST /CustomerInvoices/{invoiceId}/pay-debt — تسديد جزء من الدين */
  async payCustomerInvoiceDebt(
    invoiceId: string,
    body: CustomerInvoicePayDebtRequest,
    agentId?: string
  ): Promise<CustomerInvoiceRecordDto> {
    const response = await this.api.post<CustomerInvoiceRecordDto>(
      `/CustomerInvoices/${encodeURIComponent(invoiceId)}/pay-debt`,
      body,
      { params: ApiService.customerInvoicesAgentParams(agentId) }
    );
    return response.data;
  }

  /** POST /CustomerInvoices/pay-debt-by-customer — توزيع المبلغ على الفواتير (الأقدم أولاً) */
  async payCustomerInvoiceDebtByCustomer(
    body: CustomerInvoicePayDebtByCustomerRequest,
    agentId?: string
  ): Promise<CustomerInvoicePayDebtByCustomerResponse> {
    const response = await this.api.post<CustomerInvoicePayDebtByCustomerResponse>(
      '/CustomerInvoices/pay-debt-by-customer',
      body,
      { params: ApiService.customerInvoicesAgentParams(agentId) }
    );
    const raw = response.data as unknown as Record<string, unknown> | undefined;
    if (!raw || typeof raw !== 'object') {
      return {
        customerId: body.customerId,
        amountApplied: body.amount,
        totalDebtRemainingAfter: 0,
      };
    }
    const num = (v: unknown): number => {
      const n = Number(v);
      return Number.isFinite(n) ? n : 0;
    };
    return {
      customerId: String(raw.customerId ?? raw.CustomerId ?? body.customerId),
      amountApplied: num(raw.amountApplied ?? raw.AmountApplied),
      totalDebtRemainingAfter: num(raw.totalDebtRemainingAfter ?? raw.TotalDebtRemainingAfter),
    };
  }

  private filenameFromContentDisposition(header?: string): string | undefined {
    if (!header) return undefined;
    const star = /filename\*=(?:UTF-8''|utf-8'')([^;\s]+)/i.exec(header);
    if (star?.[1]) {
      try {
        return decodeURIComponent(star[1].replace(/["']/g, '').trim());
      } catch {
        return star[1];
      }
    }
    const plain = /filename="([^"]+)"/i.exec(header) || /filename=([^;\s]+)/i.exec(header);
    return plain?.[1]?.replace(/["']/g, '')?.trim();
  }

  /** جلب المعاملات من FTTH (transactions) — POST /providers/sas/sync-transactions. نفس آلية sync-subscribers (agentId, resellerId + اعتماديات اختيارية). */
  // ملاحظة: واجهة sync-transactions (المعاملات) تُستخدم حالياً مباشرة من الباكند ولا تحتاج استدعاء منفصل من الفرونت.

  /**
   * تفعيل مشترك واحد من قائمة المزامنة — POST /providers/sas/update-subscription.
   * السلوك: خصم من رصيد الوكيل، إنشاء فاتورة/إيصال، ومعاملات التفعيل الكاملة (منطق منفصل عن save-subscriber).
   */
  async updateSubscription(request: UpdateSubscriptionRequest): Promise<UpdateSubscriptionResponse> {
    const response = await this.api.post<UpdateSubscriptionResponse>('/providers/sas/update-subscription', request, {
      timeout: 60000,
    });
    return response.data;
  }

  /**
   * حفظ مشترك من قائمة المزامنة — POST /providers/sas/save-subscriber.
   * السلوك: يحدّث التاريخ فقط (تاريخ الانتهاء + تاريخ الاشتراك). لا إنشاء فاتورة ولا إيصال ولا خصم رصيد.
   * (التفعيل الكامل عبر update-subscription منفصل: خصم رصيد، فاتورة، ومعاملات التفعيل.)
   */
  async saveSubscriberFromSync(request: SaveSubscriberFromSyncRequest, agentId?: string): Promise<{ message?: string }> {
    const response = await this.api.post<{ message?: string }>('/providers/sas/save-subscriber', request, {
      params: agentId ? { agentId } : undefined,
      timeout: 30000,
    });
    return response.data ?? {};
  }

  // SAS provider sync (Admin or Agent). agentId required for Admin.
  async syncFromSas(request: SasSyncRequest, agentId?: string): Promise<SasSyncResponse> {
    const params = agentId ? { agentId } : undefined;
    const response: AxiosResponse<SasSyncResponse> = await this.api.post('/providers/sas/sync', request, {
      params,
      timeout: ApiService.SAS_SYNC_TIMEOUT_MS,
    });
    return response.data;
  }

  /** مزامنة من مصفوفة مستخدمين جاهزة (مثلاً بعد لصق JSON من لوحة SAS أو postMessage) */
  async syncFromSasData(request: SasSyncFromDataRequest, agentId?: string): Promise<SasSyncResponse> {
    const params = agentId ? { agentId } : undefined;
    const response: AxiosResponse<SasSyncResponse> = await this.api.post(
      '/providers/sas/sync-from-data',
      request,
      { params, timeout: ApiService.SAS_SYNC_TIMEOUT_MS }
    );
    return response.data;
  }

  /**
   * مزامنة من JSON خام (كما هو من SAS) — للأدمن عادة.
   * يرسل النص الخام دون تعديل (حتى لا نغيّر شكل الـ JSON).
   */
  async syncFromSasJsonRaw(rawJson: string, resetOnline: boolean = true): Promise<SasSyncResponse> {
    const response: AxiosResponse<SasSyncResponse> = await this.api.post(
      '/providers/sas/sync-from-json',
      rawJson,
      {
        params: { resetOnline },
        timeout: ApiService.SAS_SYNC_TIMEOUT_MS,
        headers: { 'Content-Type': 'application/json' },
      }
    );
    return response.data;
  }

  /**
   * سحب المشتركين من رسيلر SAS وحفظهم في قاعدة البيانات — POST /providers/sas/sync-subscribers-sas?resellerId=...
   * متاح للوكيل عندما يكون نوع الخدمة SAS. يعيد عدد المشتركين الذين تمت مزامنتهم فعلياً (synced)
   * والعدد الكلي الذي رجع من لوحة SAS (total).
   */
  async syncSubscribersFromSasReseller(resellerId: string): Promise<SasSyncResponse & { total?: number }> {
    const response: AxiosResponse<SasSyncResponse & { total?: number }> = await this.api.post(
      '/providers/sas/sync-subscribers-sas',
      {},
      { params: { resellerId }, timeout: ApiService.SAS_SYNC_TIMEOUT_MS }
    );
    return response.data;
  }

  /**
   * مزامنة مطور: سحب مستخدمي SAS (بما فيهم غير المفعّلين) ومطابقة مشتركي الرسيلر ثم تحديث Fat من contract_id.
   * POST /providers/sas/sync-contract-id-to-fat?resellerId=...&agentId=...
   */
  async syncContractIdToFat(
    resellerId: string,
    body: SyncContractIdToFatRequest
  ): Promise<SyncContractIdToFatResponse> {
    const params: Record<string, string> = { resellerId: resellerId.trim() };
    const agentId = body.agentId?.trim();
    if (agentId) params.agentId = agentId;
    const response: AxiosResponse<SyncContractIdToFatResponse> = await this.api.post(
      '/providers/sas/sync-contract-id-to-fat',
      {
        baseUrl: body.baseUrl.trim(),
        username: body.username.trim(),
        password: body.password,
      },
      {
        params,
        timeout: ApiService.SAS_SYNC_TIMEOUT_MS,
      }
    );
    return response.data;
  }

  /**
   * سحب كل مشتركي FTTH من رسيلر وحفظهم في قاعدة بيانات الوكيل مع فلتر التكرار (الاسم الكامل + username) — POST /providers/sas/sync-subscribers-save?resellerId=...
   * يرجع synced (المحفوظ فعلياً)، total (قبل الفلترة)، skippedByNameUsername (التي تم تجاهلها بسبب التكرار).
   */
  async syncSubscribersSaveFromFtthReseller(resellerId: string): Promise<SasSyncResponse & { total?: number; skippedByNameUsername?: number }> {
    const response: AxiosResponse<SasSyncResponse & { total?: number; skippedByNameUsername?: number }> = await this.api.post(
      '/providers/sas/sync-subscribers-save',
      {},
      { params: { resellerId }, timeout: ApiService.SAS_SYNC_TIMEOUT_MS }
    );
    return response.data;
  }

  /** رصيد SAS الحي — GET /sas/live-balance. الوكيل من JWT، ونوع الخدمة يجب أن يكون SAS. */
  async getSasLiveBalance(): Promise<{ status: string; balance?: string | null }> {
    const response = await this.api.get<{ status: string; balance?: string | null }>('/sas/live-balance', {
      headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
      params: { _t: Date.now() },
    });
    return response.data;
  }

  /** عدد المتصلين الحي من SAS — GET /sas/live-online. الوكيل من JWT، ونوع الخدمة SAS. الباكند قد يرجّع onlineUsers أو online_users. */
  async getSasLiveOnline(): Promise<{ status: string; onlineUsers?: number; online_users?: number }> {
    const response = await this.api.get<{ status: string; onlineUsers?: number; online_users?: number }>('/sas/live-online', {
      headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
      params: { _t: Date.now() },
    });
    return response.data;
  }

  // ——— Invoice print templates (GET/PUT …/InvoicePrintTemplates) ———

  private static invoicePrintAgentParams(agentId?: string): { params?: { agentId: string } } {
    const id = agentId?.trim();
    if (!id) return {};
    return { params: { agentId: id } };
  }

  private static readInvoicePrintStr(r: Record<string, unknown>, camel: string, pascal: string): string | undefined {
    const v = r[camel] ?? r[pascal];
    if (v == null) return undefined;
    const s = String(v).trim();
    return s || undefined;
  }

  private static readInvoicePrintNum(r: Record<string, unknown>, camel: string, pascal: string): number | undefined {
    const v = r[camel] ?? r[pascal];
    if (v == null || v === '') return undefined;
    const n = typeof v === 'number' ? v : Number(v);
    return Number.isFinite(n) ? n : undefined;
  }

  private static readInvoicePrintBool(r: Record<string, unknown>, camel: string, pascal: string): boolean | undefined {
    const v = r[camel] ?? r[pascal];
    if (typeof v === 'boolean') return v;
    if (v === 'true' || v === true) return true;
    if (v === 'false' || v === false) return false;
    return undefined;
  }

  private static normalizeActivationInvoicePrintSettings(raw: unknown): ActivationInvoicePrintSettingsDto {
    const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    const rs = ApiService.readInvoicePrintStr;
    const hb = r.hasSavedSettings ?? r.HasSavedSettings;
    const hasSaved =
      typeof hb === 'boolean' ? hb : hb === 'true' ? true : hb === 'false' ? false : undefined;
    return {
      logoUrl: rs(r, 'logoUrl', 'LogoUrl'),
      invoiceTitle: rs(r, 'invoiceTitle', 'InvoiceTitle'),
      companyName: rs(r, 'companyName', 'CompanyName'),
      companyAddress: rs(r, 'companyAddress', 'CompanyAddress'),
      companyPhones: rs(r, 'companyPhones', 'CompanyPhones'),
      notesSectionHeading: rs(r, 'notesSectionHeading', 'NotesSectionHeading'),
      footerLegalText: rs(r, 'footerLegalText', 'FooterLegalText'),
      hasSavedSettings: hasSaved,
    };
  }

  private static normalizeSalesInvoicePrintSettings(raw: unknown): SalesInvoicePrintSettingsDto {
    const base = ApiService.normalizeActivationInvoicePrintSettings(raw);
    const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    const rs = ApiService.readInvoicePrintStr;
    const rn = ApiService.readInvoicePrintNum;
    const rb = ApiService.readInvoicePrintBool;
    return {
      ...base,
      columnSerialLabel: rs(r, 'columnSerialLabel', 'ColumnSerialLabel'),
      columnProductNameLabel: rs(r, 'columnProductNameLabel', 'ColumnProductNameLabel'),
      columnQuantityLabel: rs(r, 'columnQuantityLabel', 'ColumnQuantityLabel'),
      columnMaterialPriceLabel: rs(r, 'columnMaterialPriceLabel', 'ColumnMaterialPriceLabel'),
      columnMaterialNotesLabel: rs(r, 'columnMaterialNotesLabel', 'ColumnMaterialNotesLabel'),
      columnLineTotalLabel: rs(r, 'columnLineTotalLabel', 'ColumnLineTotalLabel'),
      summaryTotalAmountLabel: rs(r, 'summaryTotalAmountLabel', 'SummaryTotalAmountLabel'),
      summaryPaidAmountLabel: rs(r, 'summaryPaidAmountLabel', 'SummaryPaidAmountLabel'),
      summaryRemainingAmountLabel: rs(r, 'summaryRemainingAmountLabel', 'SummaryRemainingAmountLabel'),
      pageSize: rs(r, 'pageSize', 'PageSize'),
      marginTopMm: rn(r, 'marginTopMm', 'MarginTopMm'),
      marginRightMm: rn(r, 'marginRightMm', 'MarginRightMm'),
      marginBottomMm: rn(r, 'marginBottomMm', 'MarginBottomMm'),
      marginLeftMm: rn(r, 'marginLeftMm', 'MarginLeftMm'),
      accentColor: rs(r, 'accentColor', 'AccentColor'),
      textColor: rs(r, 'textColor', 'TextColor'),
      borderColor: rs(r, 'borderColor', 'BorderColor'),
      tableHeaderTextColor: rs(r, 'tableHeaderTextColor', 'TableHeaderTextColor'),
      invoiceNumberColor: rs(r, 'invoiceNumberColor', 'InvoiceNumberColor'),
      baseFontSizePx: rn(r, 'baseFontSizePx', 'BaseFontSizePx'),
      companyNameFontSizePx: rn(r, 'companyNameFontSizePx', 'CompanyNameFontSizePx'),
      logoMaxHeightPx: rn(r, 'logoMaxHeightPx', 'LogoMaxHeightPx'),
      logoMaxWidthPx: rn(r, 'logoMaxWidthPx', 'LogoMaxWidthPx'),
      logoPrintGrayscale: rb(r, 'logoPrintGrayscale', 'LogoPrintGrayscale'),
      headerLogoPosition: rs(r, 'headerLogoPosition', 'HeaderLogoPosition'),
      showFooterLegal: rb(r, 'showFooterLegal', 'ShowFooterLegal'),
      salesTemplateSchemaVersion: rn(r, 'salesTemplateSchemaVersion', 'SalesTemplateSchemaVersion'),
    };
  }

  /** GET …/InvoicePrintTemplates/generate-invoice-number */
  async generateInvoicePrintNumber(): Promise<string> {
    const response = await this.api.get<{ invoiceNumber?: string; InvoiceNumber?: string }>(
      '/InvoicePrintTemplates/generate-invoice-number'
    );
    const d = response.data ?? {};
    return String(d.invoiceNumber ?? d.InvoiceNumber ?? '').trim();
  }

  async getActivationInvoicePrintSettings(agentId?: string): Promise<ActivationInvoicePrintSettingsDto> {
    const response = await this.api.get<unknown>('/InvoicePrintTemplates/activation', {
      ...ApiService.invoicePrintAgentParams(agentId),
    });
    return ApiService.normalizeActivationInvoicePrintSettings(response.data);
  }

  async updateActivationInvoicePrintSettings(
    body: ActivationInvoicePrintSettingsUpdate,
    agentId?: string
  ): Promise<void> {
    await this.api.put('/InvoicePrintTemplates/activation', body, ApiService.invoicePrintAgentParams(agentId));
  }

  async uploadActivationInvoiceLogo(file: File, agentId?: string): Promise<void> {
    const fd = new FormData();
    fd.append('file', file);
    const id = agentId?.trim();
    const q = id ? `?agentId=${encodeURIComponent(id)}` : '';
    await this.api.post(`/InvoicePrintTemplates/activation/logo${q}`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  }

  async deleteActivationInvoiceLogo(agentId?: string): Promise<void> {
    await this.api.delete('/InvoicePrintTemplates/activation/logo', ApiService.invoicePrintAgentParams(agentId));
  }

  async getSalesInvoicePrintSettings(agentId?: string): Promise<SalesInvoicePrintSettingsDto> {
    const response = await this.api.get<unknown>('/InvoicePrintTemplates/sales', {
      ...ApiService.invoicePrintAgentParams(agentId),
    });
    return ApiService.normalizeSalesInvoicePrintSettings(response.data);
  }

  async updateSalesInvoicePrintSettings(body: SalesInvoicePrintSettingsUpdate, agentId?: string): Promise<void> {
    await this.api.put('/InvoicePrintTemplates/sales', body, ApiService.invoicePrintAgentParams(agentId));
  }

  async uploadSalesInvoiceLogo(file: File, agentId?: string): Promise<void> {
    const fd = new FormData();
    fd.append('file', file);
    const id = agentId?.trim();
    const q = id ? `?agentId=${encodeURIComponent(id)}` : '';
    await this.api.post(`/InvoicePrintTemplates/sales/logo${q}`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  }

  async deleteSalesInvoiceLogo(agentId?: string): Promise<void> {
    await this.api.delete('/InvoicePrintTemplates/sales/logo', ApiService.invoicePrintAgentParams(agentId));
  }

  private static unwrapApiArray(data: unknown): unknown[] {
    if (Array.isArray(data)) return data;
    if (data && typeof data === 'object') {
      const o = data as Record<string, unknown>;
      if (Array.isArray(o.data)) return o.data;
      if (Array.isArray(o.Data)) return o.Data;
      if (Array.isArray(o.items)) return o.items;
      if (Array.isArray(o.Items)) return o.Items;
    }
    return [];
  }

  private static normalizeDealer(raw: unknown): Dealer {
    const r = raw as Record<string, unknown>;
    const id = String(r.id ?? r.Id ?? '');
    const gov = Number(r.iraqGovernorates ?? r.IraqGovernorates ?? IraqGovernorates.Baghdad);
    return {
      id,
      fullName: String(r.fullName ?? r.FullName ?? ''),
      userName: String(r.userName ?? r.UserName ?? ''),
      iraqGovernorates: Number.isFinite(gov) ? gov : IraqGovernorates.Baghdad,
      address: String(r.address ?? r.Address ?? ''),
      phone: String(r.phone ?? r.Phone ?? ''),
      agentResellerId: String(r.agentResellerId ?? r.AgentResellerId ?? ''),
    };
  }

  /** يستخرج نصاً للعرض من CreatedByUser (سلسلة أو كائن مستخدم من الباكند) */
  private static balanceTransferCreatedByLabel(r: Record<string, unknown>): string | null {
    const v =
      r.createdByUserName ??
      r.CreatedByUserName ??
      r.createdByUser ??
      r.CreatedByUser;
    if (v == null || v === '') return null;
    if (typeof v === 'string') {
      const t = v.trim();
      return t || null;
    }
    if (typeof v === 'object' && v !== null) {
      const o = v as Record<string, unknown>;
      const pick =
        o.fullName ??
        o.FullName ??
        o.userName ??
        o.UserName ??
        o.name ??
        o.Name ??
        o.email ??
        o.Email;
      if (pick != null && String(pick).trim() !== '') return String(pick).trim();
    }
    return null;
  }

  private static normalizeBalanceTransfer(raw: unknown): BalanceTransfer {
    const r = raw as Record<string, unknown>;
    const num = (camel: string, pascal: string, fallback = 0): number => {
      const v = r[camel] ?? r[pascal];
      if (v == null || v === '') return fallback;
      const n = Number(v);
      return Number.isFinite(n) ? n : fallback;
    };
    const optStr = (camel: string, pascal: string): string | null | undefined => {
      const v = r[camel] ?? r[pascal];
      if (v == null || v === '') return null;
      return String(v);
    };
    const optNum = (camel: string, pascal: string): number | null => {
      const v = r[camel] ?? r[pascal];
      if (v == null || v === '') return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };
    const agentIdRaw = r.agentId ?? r.AgentId;
    const agentResellerIdRaw = r.agentResellerId ?? r.AgentResellerId;
    const createdRaw = r.createdAt ?? r.CreatedAt;
    const filledRaw = r.filledDate ?? r.FilledDate;
    return {
      id: String(r.id ?? r.Id ?? ''),
      agentId: agentIdRaw != null && agentIdRaw !== '' ? String(agentIdRaw) : null,
      agentResellerId:
        agentResellerIdRaw != null && agentResellerIdRaw !== '' ? String(agentResellerIdRaw) : null,
      dealerId: String(r.dealerId ?? r.DealerId ?? ''),
      fullName: optStr('fullName', 'FullName') ?? undefined,
      userName: optStr('userName', 'UserName') ?? undefined,
      iraqGovernorates: optNum('iraqGovernorates', 'IraqGovernorates'),
      address: optStr('address', 'Address') ?? undefined,
      phone: optStr('phone', 'Phone') ?? undefined,
      balanceAmount: num('balanceAmount', 'BalanceAmount', 0),
      deductionAmount: optNum('deductionAmount', 'DeductionAmount'),
      profitAmount: optNum('profitAmount', 'ProfitAmount'),
      typeTransfer:
        r.typeTransfer != null || r.TypeTransfer != null
          ? (Number(r.typeTransfer ?? r.TypeTransfer) as BalanceTransferType)
          : null,
      createdAt: createdRaw != null && createdRaw !== '' ? String(createdRaw) : null,
      filledDate: filledRaw != null && filledRaw !== '' ? String(filledRaw) : null,
      createdByUserName: ApiService.balanceTransferCreatedByLabel(r),
    };
  }

  /** ترقيم موحّد لـ PaginationResponseDto (camel أو Pascal) */
  private static normalizePaginationDto<T>(raw: unknown, mapItem: (row: unknown) => T): PaginatedResponse<T> {
    const empty: PaginatedResponse<T> = {
      data: [],
      currentPage: 1,
      pageSize: 10,
      totalItems: 0,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
      totalCount: 0,
      pageNumber: 1,
    };
    if (raw == null) return empty;
    if (Array.isArray(raw)) {
      const data = raw.map(mapItem);
      return {
        data,
        currentPage: 1,
        pageSize: Math.min(200, Math.max(1, data.length || 10)),
        totalItems: data.length,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
        totalCount: data.length,
        pageNumber: 1,
      };
    }
    if (typeof raw !== 'object') return empty;
    const o = raw as Record<string, unknown>;
    const dataRaw = o.data ?? o.Data;
    const arr = Array.isArray(dataRaw) ? dataRaw : [];
    const data = arr.map(mapItem);
    const currentPage = Math.max(1, Number(o.currentPage ?? o.CurrentPage ?? o.pageNumber ?? o.PageNumber ?? 1) || 1);
    const pageSize = Math.max(1, Number(o.pageSize ?? o.PageSize ?? 10) || 10);
    const totalItemsRaw = Number(o.totalItems ?? o.TotalItems ?? o.totalCount ?? o.TotalCount ?? 0);
    const totalItems = Number.isFinite(totalItemsRaw) ? totalItemsRaw : data.length;
    const totalPages = Math.max(1, Number(o.totalPages ?? o.TotalPages ?? 1) || 1);
    const hasNextPage = Boolean(o.hasNextPage ?? o.HasNextPage ?? currentPage < totalPages);
    const hasPreviousPage = Boolean(o.hasPreviousPage ?? o.HasPreviousPage ?? currentPage > 1);
    return {
      data,
      currentPage,
      pageSize,
      totalItems,
      totalPages,
      hasNextPage,
      hasPreviousPage,
      totalCount: totalItems,
      pageNumber: currentPage,
    };
  }

  async getDealers(params?: DealersListParams): Promise<DealersListResponse> {
    const page = params?.page != null ? Math.max(1, params.page) : 1;
    const pageSize = params?.pageSize != null ? Math.max(1, Math.min(200, params.pageSize)) : 10;
    const q: Record<string, string | number> = { page, pageSize };
    if (params?.fullName?.trim()) q.fullName = params.fullName.trim();
    const response = await this.api.get<unknown>('/Dealers', { params: q });
    return ApiService.normalizePaginationDto(response.data, (x) => ApiService.normalizeDealer(x));
  }

  async getDealerById(id: string): Promise<Dealer> {
    const response = await this.api.get<unknown>(`/Dealers/${encodeURIComponent(id)}`);
    return ApiService.normalizeDealer(response.data);
  }

  async createDealer(body: DealerCreateRequest): Promise<Dealer> {
    const response = await this.api.post<unknown>('/Dealers', body);
    return ApiService.normalizeDealer(response.data);
  }

  async updateDealer(id: string, body: DealerUpdateRequest): Promise<Dealer> {
    const response = await this.api.put<unknown>(`/Dealers/${encodeURIComponent(id)}`, body);
    return ApiService.normalizeDealer(response.data);
  }

  async deleteDealer(id: string): Promise<void> {
    await this.api.delete(`/Dealers/${encodeURIComponent(id)}`);
  }

  private static normalizeDealerDebt(raw: unknown): DealerDebt {
    const r = raw as Record<string, unknown>;
    const num = (camel: string, pascal: string, fallback = 0): number => {
      const v = r[camel] ?? r[pascal];
      if (v == null || v === '') return fallback;
      const n = Number(v);
      return Number.isFinite(n) ? n : fallback;
    };
    const optStr = (camel: string, pascal: string): string | null => {
      const v = r[camel] ?? r[pascal];
      if (v == null || v === '') return null;
      return String(v);
    };
    return {
      id: String(r.id ?? r.Id ?? ''),
      dealerId: String(r.dealerId ?? r.DealerId ?? ''),
      dealerFullName: optStr('dealerFullName', 'DealerFullName'),
      amount: num('amount', 'Amount', 0),
      debtDate: String(r.debtDate ?? r.DebtDate ?? ''),
      remainingAmount: num('remainingAmount', 'RemainingAmount', 0),
      notes: (r.notes ?? r.Notes) == null || (r.notes ?? r.Notes) === '' ? null : String(r.notes ?? r.Notes),
      dueDate: optStr('dueDate', 'DueDate'),
      renewalId: optStr('renewalId', 'RenewalId'),
      subscriberId: optStr('subscriberId', 'SubscriberId'),
      subscriberName: optStr('subscriberName', 'SubscriberName'),
      updatedAt: optStr('updatedAt', 'UpdatedAt'),
      createdAt: optStr('createdAt', 'CreatedAt'),
    };
  }

  async getDealerDebts(params?: DealerDebtsListParams): Promise<DealerDebtsListResponse> {
    const page = params?.page != null ? Math.max(1, params.page) : 1;
    const pageSize = params?.pageSize != null ? Math.max(1, Math.min(200, params.pageSize)) : 10;
    const q: Record<string, string | number | boolean> = { page, pageSize };
    /** الافتراضي في الخادم قد يكون groupByDealer=true؛ القائمة الرئيسية تحتاج قائمة مسطحة */
    q.groupByDealer = params?.groupByDealer === true;
    if (params?.dealerId?.trim()) q.dealerId = params.dealerId.trim();
    if (params?.agentId?.trim()) q.agentId = params.agentId.trim();
    if (params?.dealerFullName?.trim()) q.dealerFullName = params.dealerFullName.trim();
    if (params?.fromDate?.trim()) q.fromDate = params.fromDate.trim();
    if (params?.toDate?.trim()) q.toDate = params.toDate.trim();
    if (params?.fromRenewalActivations === true) q.fromRenewalActivations = true;
    const response = await this.api.get<unknown>('/Dealers/debts', { params: q });
    const raw = response.data;
    const base = ApiService.normalizePaginationDto(raw, (x) => ApiService.normalizeDealerDebt(x));
    const o = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
    const tp = o.totalPaidAmount ?? o.TotalPaidAmount;
    const tu = o.totalUnpaidAmount ?? o.TotalUnpaidAmount;
    const numOrUndef = (v: unknown): number | undefined => {
      if (v == null || v === '') return undefined;
      const n = Number(v);
      return Number.isFinite(n) ? n : undefined;
    };
    return {
      ...base,
      totalPaidAmount: numOrUndef(tp),
      totalUnpaidAmount: numOrUndef(tu),
    };
  }

  /**
   * كشف تاجر في المودال — GET /Dealers/debts?dealerId=&groupByDealer=true
   * يفك أول صف مجمّع ويعيد سجلات debts مع ملخص التاجر وحقول الترقيم.
   */
  async getDealerDebtsStatement(params: {
    dealerId: string;
    agentId?: string;
    fromRenewalActivations?: boolean;
    page?: number;
    pageSize?: number;
  }): Promise<DealerDebtsStatementResponse> {
    const page = params.page != null ? Math.max(1, params.page) : 1;
    const pageSize = params.pageSize != null ? Math.max(1, Math.min(200, params.pageSize)) : 10;
    const q: Record<string, string | number | boolean> = {
      dealerId: params.dealerId.trim(),
      groupByDealer: true,
      page,
      pageSize,
    };
    if (params.agentId?.trim()) q.agentId = params.agentId.trim();
    if (params.fromRenewalActivations === true) q.fromRenewalActivations = true;
    const response = await this.api.get<unknown>('/Dealers/debts', { params: q });
    const raw = response.data;
    const o = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
    const dataRaw = o.data ?? o.Data;
    const arr = Array.isArray(dataRaw) ? dataRaw : [];
    const first = arr[0] as Record<string, unknown> | undefined;
    const nested = first?.debts ?? first?.Debts;
    let debts: DealerDebt[] = [];
    let groupedSummary: DealerDebtsStatementResponse['groupedSummary'] = null;

    if (first && Array.isArray(nested)) {
      debts = nested.map((x) => ApiService.normalizeDealerDebt(x));
      const num = (row: Record<string, unknown>, c: string, p: string, fb = 0): number => {
        const v = row[c] ?? row[p];
        if (v == null || v === '') return fb;
        const n = Number(v);
        return Number.isFinite(n) ? n : fb;
      };
      groupedSummary = {
        dealerId: first.dealerId != null || first.DealerId != null ? String(first.dealerId ?? first.DealerId) : params.dealerId.trim(),
        dealerFullName:
          first.dealerFullName != null || first.DealerFullName != null
            ? String(first.dealerFullName ?? first.DealerFullName)
            : null,
        totalAmount: num(first, 'totalAmount', 'TotalAmount', 0),
        totalRemainingAmount: num(first, 'totalRemainingAmount', 'TotalRemainingAmount', 0),
        debtRecordCount: num(first, 'debtRecordCount', 'DebtRecordCount', 0),
      };
    } else {
      debts = arr.map((x) => ApiService.normalizeDealerDebt(x));
    }

    const base = ApiService.normalizePaginationDto(raw, (x) => ApiService.normalizeDealerDebt(x));
    const tp = o.totalPaidAmount ?? o.TotalPaidAmount;
    const tu = o.totalUnpaidAmount ?? o.TotalUnpaidAmount;
    const numOrUndef = (v: unknown): number | undefined => {
      if (v == null || v === '') return undefined;
      const n = Number(v);
      return Number.isFinite(n) ? n : undefined;
    };

    let totalItems = base.totalItems;
    let totalPages = base.totalPages;
    const drc = groupedSummary?.debtRecordCount ?? 0;
    if (drc > 0 && (totalItems <= 1 || totalItems < drc)) {
      totalItems = drc;
      totalPages = Math.max(1, Math.ceil(drc / pageSize));
    }
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    return {
      ...base,
      data: debts,
      totalItems,
      totalCount: totalItems,
      totalPages,
      currentPage: base.currentPage,
      pageNumber: base.pageNumber,
      pageSize: base.pageSize,
      hasNextPage,
      hasPreviousPage,
      totalPaidAmount: numOrUndef(tp),
      totalUnpaidAmount: numOrUndef(tu),
      groupedSummary,
    };
  }

  private static normalizeDealerDebtPayByDealerPaidRows(raw: unknown): DealerDebtPayByDealerPaidRow[] | undefined {
    if (!Array.isArray(raw)) return undefined;
    const rows: DealerDebtPayByDealerPaidRow[] = [];
    for (const item of raw) {
      if (!item || typeof item !== 'object') continue;
      const o = item as Record<string, unknown>;
      const inner = (o.debt ?? o.Debt) as Record<string, unknown> | undefined;
      const fromInner = Boolean(inner && typeof inner === 'object');
      const subscriberName = String(
        (fromInner && inner
          ? inner.subscriberName ?? inner.SubscriberName
          : o.subscriberName ?? o.SubscriberName) ?? ''
      ).trim();
      const debtDateRaw = (
        fromInner && inner ? inner.debtDate ?? inner.DebtDate : o.debtDate ?? o.DebtDate
      ) as unknown;
      const paidAtRaw = (fromInner && inner
        ? inner.paidAt ?? inner.PaidAt ?? inner.paymentDate ?? inner.PaymentDate
        : o.paidAt ?? o.PaidAt ?? o.paymentDate ?? o.PaymentDate) as unknown;
      const updatedAtRaw = (fromInner && inner
        ? inner.updatedAt ?? inner.UpdatedAt
        : o.updatedAt ?? o.UpdatedAt) as unknown;
      const amountRaw = (fromInner && inner ? inner.amount ?? inner.Amount : o.amount ?? o.Amount) as unknown;
      let rowAmount: number | null = null;
      if (amountRaw != null && amountRaw !== '') {
        const n = Number(amountRaw);
        if (Number.isFinite(n)) rowAmount = n;
      }
      rows.push({
        subscriberName: subscriberName || null,
        debtDate: debtDateRaw != null && debtDateRaw !== '' ? String(debtDateRaw) : null,
        paidAt: paidAtRaw != null && paidAtRaw !== '' ? String(paidAtRaw) : null,
        updatedAt: updatedAtRaw != null && updatedAtRaw !== '' ? String(updatedAtRaw) : null,
        amount: rowAmount,
      });
    }
    return rows.length ? rows : undefined;
  }

  private static normalizeDealerDebtPayByDealerResponse(raw: unknown): DealerDebtPayByDealerResponse {
    const r = raw as Record<string, unknown>;
    const num = (c: string, p: string, fb = 0): number => {
      const v = r[c] ?? r[p];
      if (v == null || v === '') return fb;
      const n = Number(v);
      return Number.isFinite(n) ? n : fb;
    };
    const paidRaw =
      r.paidRecords ??
      r.PaidRecords ??
      r.settledDebts ??
      r.SettledDebts ??
      r.appliedDebts ??
      r.AppliedDebts ??
      r.settledDebtRecords ??
      r.SettledDebtRecords;
    return {
      amountApplied: num('amountApplied', 'AmountApplied', 0),
      totalRemainingAmountAfter: num('totalRemainingAmountAfter', 'TotalRemainingAmountAfter', 0),
      dealerId: String(r.dealerId ?? r.DealerId ?? ''),
      paidRecords: ApiService.normalizeDealerDebtPayByDealerPaidRows(paidRaw),
    };
  }

  /** POST /Dealers/debts/pay-by-dealer — تسديد على إجمالي ديون التاجر */
  async payDealerDebtsByDealer(
    body: DealerDebtPayByDealerRequest,
    agentId?: string
  ): Promise<DealerDebtPayByDealerResponse> {
    const params = agentId?.trim() ? { agentId: agentId.trim() } : undefined;
    const response = await this.api.post<unknown>('/Dealers/debts/pay-by-dealer', body, {
      params,
      headers: { 'Content-Type': 'application/json' },
    });
    return ApiService.normalizeDealerDebtPayByDealerResponse(response.data);
  }

  async getDealerDebtById(debtId: string): Promise<DealerDebt> {
    const response = await this.api.get<unknown>(`/Dealers/debts/${encodeURIComponent(debtId)}`);
    return ApiService.normalizeDealerDebt(response.data);
  }

  async createDealerDebt(body: DealerDebtCreateRequest): Promise<DealerDebt> {
    const response = await this.api.post<unknown>('/Dealers/debts', body);
    return ApiService.normalizeDealerDebt(response.data);
  }

  async updateDealerDebt(debtId: string, body: DealerDebtUpdateRequest): Promise<DealerDebt> {
    const response = await this.api.put<unknown>(`/Dealers/debts/${encodeURIComponent(debtId)}`, body);
    return ApiService.normalizeDealerDebt(response.data);
  }

  async deleteDealerDebt(debtId: string): Promise<void> {
    await this.api.delete(`/Dealers/debts/${encodeURIComponent(debtId)}`);
  }

  private static normalizeDealerDebtPayResponse(raw: unknown): DealerDebtPaySingleResponse {
    if (raw == null) return { debts: [] };
    if (Array.isArray(raw)) {
      return { debts: raw.map((x) => ApiService.normalizeDealerDebt(x)) };
    }
    if (typeof raw !== 'object') return { debts: [] };
    const r = raw as Record<string, unknown>;
    const nested = r.data ?? r.Data;
    if (nested != null && nested !== r && (Array.isArray(nested) || typeof nested === 'object')) {
      return ApiService.normalizeDealerDebtPayResponse(nested);
    }
    const arr =
      r.debts ??
      r.Debts ??
      r.appliedDebts ??
      r.AppliedDebts ??
      r.paidDebts ??
      r.PaidDebts ??
      r.paidRecords ??
      r.PaidRecords ??
      r.updatedDebts ??
      r.UpdatedDebts;
    if (Array.isArray(arr) && arr.length > 0) {
      return { debts: arr.map((x) => ApiService.normalizeDealerDebt(x)) };
    }
    return { debts: [ApiService.normalizeDealerDebt(raw)] };
  }

  async payDealerDebt(debtId: string, body: DealerDebtPayRequest): Promise<DealerDebtPaySingleResponse> {
    const response = await this.api.post<unknown>(`/Dealers/debts/${encodeURIComponent(debtId)}/pay`, body);
    return ApiService.normalizeDealerDebtPayResponse(response.data);
  }

  /** إجمالي المسدد وغير المسدد لديون التفعيلات (لوكيل آخر) — GET /Dealers/debts/summary-from-renewals */
  async getDealerDebtsSummaryFromRenewals(params?: { agentId?: string }): Promise<DealerDebtsRenewalTotals> {
    const q: Record<string, string> = {};
    if (params?.agentId?.trim()) q.agentId = params.agentId.trim();
    const response = await this.api.get<unknown>('/Dealers/debts/summary-from-renewals', { params: q });
    const raw = response.data;
    const num = (o: Record<string, unknown>, c: string, p: string, fb = 0): number => {
      const v = o[c] ?? o[p];
      if (v == null || v === '') return fb;
      const n = Number(v);
      return Number.isFinite(n) ? n : fb;
    };
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      const o = raw as Record<string, unknown>;
      return {
        totalPaidAmount: num(o, 'totalPaidAmount', 'TotalPaidAmount', 0),
        totalUnpaidAmount: num(o, 'totalUnpaidAmount', 'TotalUnpaidAmount', 0),
      };
    }
    return { totalPaidAmount: 0, totalUnpaidAmount: 0 };
  }

  async getBalanceTransfers(params?: BalanceTransfersListParams): Promise<BalanceTransfersListResponse> {
    const page = params?.page != null ? Math.max(1, params.page) : 1;
    const pageSize = params?.pageSize != null ? Math.max(1, Math.min(200, params.pageSize)) : 10;
    const q: Record<string, string | number> = { page, pageSize };
    if (params?.fullName?.trim()) q.fullName = params.fullName.trim();
    if (params?.typeTransfer != null && [1, 2].includes(Number(params.typeTransfer))) {
      q.typeTransfer = Number(params.typeTransfer);
    }
    if (params?.createdAtFrom?.trim()) q.createdAtFrom = params.createdAtFrom.trim();
    if (params?.createdAtTo?.trim()) q.createdAtTo = params.createdAtTo.trim();
    if (params?.filledDateFrom?.trim()) q.filledDateFrom = params.filledDateFrom.trim();
    if (params?.filledDateTo?.trim()) q.filledDateTo = params.filledDateTo.trim();
    if (params?.resellerId?.trim()) q.resellerId = params.resellerId.trim();
    const response = await this.api.get<unknown>('/BalanceTransfers', { params: q });
    const raw = response.data;
    const base = ApiService.normalizePaginationDto(raw, (x) => ApiService.normalizeBalanceTransfer(x));
    const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
    const tp = o.totalProfitAmount ?? o.TotalProfitAmount;
    const tb = o.totalBalanceTransferAmount ?? o.TotalBalanceTransferAmount;
    return {
      ...base,
      totalProfitAmount:
        tp != null && tp !== '' && Number.isFinite(Number(tp)) ? Number(tp) : undefined,
      totalBalanceTransferAmount:
        tb != null && tb !== '' && Number.isFinite(Number(tb)) ? Number(tb) : undefined,
    };
  }

  async getBalanceTransferById(id: string): Promise<BalanceTransfer> {
    const response = await this.api.get<unknown>(`/BalanceTransfers/${encodeURIComponent(id)}`);
    return ApiService.normalizeBalanceTransfer(response.data);
  }

  async createBalanceTransfer(body: BalanceTransferCreateRequest): Promise<BalanceTransfer> {
    const response = await this.api.post<unknown>('/BalanceTransfers', body);
    return ApiService.normalizeBalanceTransfer(response.data);
  }

  async updateBalanceTransfer(id: string, body: BalanceTransferUpdateRequest): Promise<BalanceTransfer> {
    const response = await this.api.put<unknown>(`/BalanceTransfers/${encodeURIComponent(id)}`, body);
    return ApiService.normalizeBalanceTransfer(response.data);
  }

  async deleteBalanceTransfer(id: string): Promise<void> {
    await this.api.delete(`/BalanceTransfers/${encodeURIComponent(id)}`);
  }

}

export const apiService = new ApiService();
export { ApiService };
