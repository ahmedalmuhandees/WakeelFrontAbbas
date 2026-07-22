/**
 * إعدادات رسالة التفعيل وإمكانية البناء من قالب مع متغيرات.
 */

const STORAGE_KEY_PREFIX = 'wakeel_activation_message_';

export type ActivationMessageMode = 'default' | 'custom';

export interface ActivationMessageSettings {
  mode: ActivationMessageMode;
  /** قالب الرسالة المخصصة (يدعم placeholders مثل {{SubscriberName}}) */
  template: string;
  /** نص مخصص يظهر مكان {{customText}} */
  customText: string;
}

export const PLACEHOLDERS = [
  { key: 'SubscriberName', label: 'اسم المشترك', token: '{{SubscriberName}}' },
  { key: 'SubscriberPhone', label: 'رقم الهاتف (SubscriberPhone)', token: '{{SubscriberPhone}}' },
  { key: 'PhoneNumber', label: 'رقم الهاتف (PhoneNumber)', token: '{{PhoneNumber}}' },
  { key: 'ActivationDate', label: 'تاريخ التفعيل', token: '{{ActivationDate}}' },
  { key: 'ExpirationDate', label: 'تاريخ الانتهاء', token: '{{ExpirationDate}}' },
  { key: 'DaysUntilExpiry', label: 'الأيام المتبقية', token: '{{DaysUntilExpiry}}' },
  { key: 'ProfileName', label: 'الباقة', token: '{{ProfileName}}' },
  { key: 'AgentCompanyName', label: 'اسم الشركة', token: '{{AgentCompanyName}}' },
  { key: 'DebtDueDate', label: 'تاريخ التسديد', token: '{{DebtDueDate}}' },
  { key: 'DebtAmount', label: 'المبلغ الدين', token: '{{DebtAmount}}' },
] as const;

export interface ActivationMessageData {
  subscriberName: string;
  subscriberPhone: string;
  activationDate: string;
  expirationDate: string;
  companyName: string;
}

const defaultSettings: ActivationMessageSettings = {
  mode: 'default',
  template: '',
  customText: '',
};

export function getActivationMessageSettings(userId: string | undefined): ActivationMessageSettings {
  if (!userId) return defaultSettings;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PREFIX + userId);
    if (!raw) return defaultSettings;
    const parsed = JSON.parse(raw) as Partial<ActivationMessageSettings>;
    return {
      mode: parsed.mode === 'custom' ? 'custom' : 'default',
      template: typeof parsed.template === 'string' ? parsed.template : '',
      customText: typeof parsed.customText === 'string' ? parsed.customText : '',
    };
  } catch {
    return defaultSettings;
  }
}

export function setActivationMessageSettings(
  userId: string | undefined,
  settings: ActivationMessageSettings
): void {
  if (!userId) return;
  localStorage.setItem(STORAGE_KEY_PREFIX + userId, JSON.stringify(settings));
}

/**
 * يبني الرسالة النهائية من القالب باستبدال المتغيرات (يدعم أسلوب الباكند PascalCase والمحلي camelCase).
 */
export function buildActivationMessageFromTemplate(
  template: string,
  data: ActivationMessageData,
  customText: string
): string {
  let out = template;
  out = out.replace(/\{\{subscriberName\}\}/gi, data.subscriberName);
  out = out.replace(/\{\{SubscriberName\}\}/g, data.subscriberName);
  out = out.replace(/\{\{subscriberPhone\}\}/gi, data.subscriberPhone);
  out = out.replace(/\{\{SubscriberPhone\}\}/g, data.subscriberPhone);
  out = out.replace(/\{\{activationDate\}\}/gi, data.activationDate);
  out = out.replace(/\{\{ActivationDate\}\}/g, data.activationDate);
  out = out.replace(/\{\{expirationDate\}\}/gi, data.expirationDate);
  out = out.replace(/\{\{ExpirationDate\}\}/g, data.expirationDate);
  out = out.replace(/\{\{companyName\}\}/gi, data.companyName);
  out = out.replace(/\{\{CompanyName\}\}/g, data.companyName);
  out = out.replace(/\{\{AgentCompanyName\}\}/g, data.companyName);
  out = out.replace(/\{\{customText\}\}/gi, customText);
  out = out.replace(/\{\{CustomText\}\}/g, customText);
  return out;
}

/** وضع رسالة التنبيه: افتراضي أو مخصص */
export type AlertMessageMode = 'default' | 'custom';

/** متغيرات قالب رسالة التنبيه */
export const ALERT_PLACEHOLDERS = [
  { key: 'SubscriberName', label: 'اسم المشترك', token: '{{SubscriberName}}' },
  { key: 'ExpirationDate', label: 'تاريخ الانتهاء', token: '{{ExpirationDate}}' },
  { key: 'DaysUntilExpiry', label: 'الأيام المتبقية', token: '{{DaysUntilExpiry}}' },
  // ملاحظة: بعض نسخ الباكند تستبدل AgentCompanyName فقط (وليس CompanyName)
  { key: 'AgentCompanyName', label: 'اسم الشركة', token: '{{AgentCompanyName}}' },
  { key: 'CompanyName', label: 'اسم الشركة (قديم)', token: '{{CompanyName}}' },
  { key: 'SecruptionId', label: 'معرف المشترك (SecruptionId)', token: '{{SecruptionId}}' },
] as const;

/** بيانات رسالة التنبيه (انتهاء الاشتراك) */
export interface AlertMessageData {
  subscriberName: string;
  expirationDate: string;
  daysUntilExpiry: number;
  companyName: string;
}

const SUBSCRIBER_INFO_LINK = 'https://wakeel-iq.vercel.app/wakeel/subscriber-info';

/** القالب الافتراضي لرسالة التفعيل/التجديد */
export const DEFAULT_ACTIVATION_TEMPLATE = `تم تفعيل/تجديد الاشتراك
اسم المشترك: {{SubscriberName}}
رقم الهاتف: {{PhoneNumber}}
تاريخ التفعيل: {{ActivationDate}}
تاريخ الانتهاء: {{ExpirationDate}}
اسم الشركة: {{AgentCompanyName}}
الباقة: {{ProfileName}}
الأيام المتبقية: {{DaysUntilExpiry}} يوم
تاريخ التسديد: {{DebtDueDate}}
المبلغ الدين: {{DebtAmount}}
رابط التطبيق: ${SUBSCRIBER_INFO_LINK}`;

/** القالب الافتراضي لرسالة التنبيه */
export const DEFAULT_ALERT_TEMPLATE = `تذكير بانتهاء الاشتراك
اسم المشترك: {{SubscriberName}}
تاريخ انتهاء الاشتراك: {{ExpirationDate}}
الأيام المتبقية: {{DaysUntilExpiry}} يوم
اسم الشركة: {{AgentCompanyName}}
رابط التطبيق: ${SUBSCRIBER_INFO_LINK}`;

/** وضع رسالة الدين او التفاصيل: افتراضي أو مخصص */
export type DetailsMessageMode = 'default' | 'custom';

/** متغيرات قالب رسالة الدين او التفاصيل */
export const DETAILS_PLACEHOLDERS = [
  { key: 'SubscriberName', label: 'اسم المشترك', token: '{{SubscriberName}}' },
  { key: 'Username', label: 'اسم المستخدم', token: '{{Username}}' },
  { key: 'SubscriberPhone', label: 'رقم الهاتف (SubscriberPhone)', token: '{{SubscriberPhone}}' },
  { key: 'PhoneNumber', label: 'رقم الهاتف (PhoneNumber)', token: '{{PhoneNumber}}' },
  { key: 'ProfileName', label: 'الباقة', token: '{{ProfileName}}' },
  { key: 'ActivationDate', label: 'تاريخ التفعيل', token: '{{ActivationDate}}' },
  { key: 'ExpirationDate', label: 'تاريخ الانتهاء', token: '{{ExpirationDate}}' },
  { key: 'DaysUntilExpiry', label: 'الأيام المتبقية', token: '{{DaysUntilExpiry}}' },
  { key: 'AgentCompanyName', label: 'اسم الشركة', token: '{{AgentCompanyName}}' },
  { key: 'DebtDueDate', label: 'تاريخ التسديد', token: '{{DebtDueDate}}' },
  { key: 'DebtAmount', label: 'المبلغ الدين', token: '{{DebtAmount}}' },
] as const;

/** بيانات رسالة التفاصيل/الدين (يجب أن يستبدل الباكند نفس المتغيرات عند الإرسال) */
export interface DetailsMessageData {
  subscriberName: string;
  /** اسم الدخول / المستخدم — يُستبدل {{Username}} و{{username}} (غير حساس لحالة الأحرف) */
  subscriberUsername: string;
  subscriberPhone: string;
  profileName: string;
  activationDate: string;
  expirationDate: string;
  daysUntilExpiry: number;
  companyName: string;
  debtDueDate: string;
  debtAmount: string;
}

/**
 * يبني رسالة التفاصيل/الدين من القالب (استبدال كل المتغيرات بما فيها {{ActivationDate}}).
 * الباكند عند إرسال رسالة التفاصيل أو التفعيل يجب أن يستبدل نفس المتغيرات من بيانات المشترك.
 */
export function buildDetailsMessageFromTemplate(template: string, data: DetailsMessageData): string {
  let out = template;
  out = out.replace(/\{\{SubscriberName\}\}/g, data.subscriberName);
  out = out.replace(/\{\{subscriberName\}\}/gi, data.subscriberName);
  out = out.replace(/\{\{username\}\}/gi, data.subscriberUsername);
  out = out.replace(/\{\{SubscriberPhone\}\}/g, data.subscriberPhone);
  out = out.replace(/\{\{subscriberPhone\}\}/gi, data.subscriberPhone);
  out = out.replace(/\{\{PhoneNumber\}\}/g, data.subscriberPhone);
  out = out.replace(/\{\{phoneNumber\}\}/gi, data.subscriberPhone);
  out = out.replace(/\{\{ProfileName\}\}/g, data.profileName);
  out = out.replace(/\{\{profileName\}\}/gi, data.profileName);
  out = out.replace(/\{\{ActivationDate\}\}/g, data.activationDate);
  out = out.replace(/\{\{activationDate\}\}/gi, data.activationDate);
  out = out.replace(/\{\{ExpirationDate\}\}/g, data.expirationDate);
  out = out.replace(/\{\{expirationDate\}\}/gi, data.expirationDate);
  out = out.replace(/\{\{DaysUntilExpiry\}\}/g, String(data.daysUntilExpiry));
  out = out.replace(/\{\{daysUntilExpiry\}\}/gi, String(data.daysUntilExpiry));
  out = out.replace(/\{\{AgentCompanyName\}\}/g, data.companyName);
  out = out.replace(/\{\{agentCompanyName\}\}/gi, data.companyName);
  out = out.replace(/\{\{CompanyName\}\}/g, data.companyName);
  out = out.replace(/\{\{companyName\}\}/gi, data.companyName);
  out = out.replace(/\{\{DebtDueDate\}\}/g, data.debtDueDate);
  out = out.replace(/\{\{debtDueDate\}\}/gi, data.debtDueDate);
  out = out.replace(/\{\{DebtAmount\}\}/g, data.debtAmount);
  out = out.replace(/\{\{debtAmount\}\}/gi, data.debtAmount);
  return out;
}

/** القالب الافتراضي لرسالة الدين او التفاصيل (يُطابق الباكند: تاريخ التفعيل من آخر تجديد) */
export const DEFAULT_DETAILS_TEMPLATE = `تفاصيل المشترك
اسم المشترك: {{SubscriberName}}
اسم المستخدم: {{Username}}
الباقة: {{ProfileName}}
تاريخ التفعيل: {{ActivationDate}}
تاريخ الانتهاء: {{ExpirationDate}}
الأيام المتبقية: {{DaysUntilExpiry}} يوم
اسم الشركة: {{AgentCompanyName}}
تاريخ التسديد: {{DebtDueDate}}
المبلغ الدين: {{DebtAmount}}
رابط التطبيق: ${SUBSCRIBER_INFO_LINK}`;

/**
 * يبني رسالة التنبيه من القالب
 * (يدعم SubscriberName, ExpirationDate, DaysUntilExpiry, AgentCompanyName, CompanyName).
 */
export function buildAlertMessageFromTemplate(template: string, data: AlertMessageData): string {
  let out = template;
  out = out.replace(/\{\{SubscriberName\}\}/g, data.subscriberName);
  out = out.replace(/\{\{subscriberName\}\}/gi, data.subscriberName);
  out = out.replace(/\{\{ExpirationDate\}\}/g, data.expirationDate);
  out = out.replace(/\{\{expirationDate\}\}/gi, data.expirationDate);
  out = out.replace(/\{\{DaysUntilExpiry\}\}/g, String(data.daysUntilExpiry));
  out = out.replace(/\{\{daysUntilExpiry\}\}/gi, String(data.daysUntilExpiry));
  out = out.replace(/\{\{AgentCompanyName\}\}/g, data.companyName);
  out = out.replace(/\{\{agentCompanyName\}\}/gi, data.companyName);
  out = out.replace(/\{\{CompanyName\}\}/g, data.companyName);
  out = out.replace(/\{\{companyName\}\}/gi, data.companyName);
  return out;
}
