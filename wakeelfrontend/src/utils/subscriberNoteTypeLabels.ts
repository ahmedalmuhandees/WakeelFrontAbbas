import { SubscriberNoteType } from '../types';

/**
 * تسميات عربية لـ `Wakeel.Enums.SubscriberNoteType` — تُستخدم لـ «جهة المبلغ الواصل».
 * أرقام الـ enum ثابتة (1–6)؛ التسميات قابلة للتغيير في الواجهة فقط.
 *
 * | القيمة | المعنى |
 * |--------|--------|
 * | 1 | تحويل ماستر |
 * | 2 | الدفع عن طريق جهاز الماستر |
 * | 3 | نقدا |
 * | 4 | واصل لمكتب محمد الجيزاني |
 * | 5 | دين |
 * | 6 | أخرى (نص حر في الملاحظة) |
 */
export const SUBSCRIBER_NOTE_TYPE_LABEL_AR: Record<SubscriberNoteType, string> = {
  [SubscriberNoteType.NoResponse]: 'تحويل ماستر',
  [SubscriberNoteType.WillActivateSoon]: 'الدفع عن طريق جهاز الماستر',
  [SubscriberNoteType.DoesNotWantActivation]: 'نقدا',
  [SubscriberNoteType.BadService]: 'واصل لمكتب محمد الجيزاني',
  [SubscriberNoteType.NeedsMaintenance]: 'دين',
  [SubscriberNoteType.Other]: 'أخرى',
};

/** خيارات «جهة المبلغ الواصل» فقط (بدون «أخرى») */
export const RECEIVED_AMOUNT_DESTINATION_OPTIONS: ReadonlyArray<{
  value: SubscriberNoteType;
  label: string;
}> = [
  { value: SubscriberNoteType.NoResponse, label: SUBSCRIBER_NOTE_TYPE_LABEL_AR[SubscriberNoteType.NoResponse] },
  { value: SubscriberNoteType.WillActivateSoon, label: SUBSCRIBER_NOTE_TYPE_LABEL_AR[SubscriberNoteType.WillActivateSoon] },
  { value: SubscriberNoteType.DoesNotWantActivation, label: SUBSCRIBER_NOTE_TYPE_LABEL_AR[SubscriberNoteType.DoesNotWantActivation] },
  { value: SubscriberNoteType.BadService, label: SUBSCRIBER_NOTE_TYPE_LABEL_AR[SubscriberNoteType.BadService] },
  { value: SubscriberNoteType.NeedsMaintenance, label: SUBSCRIBER_NOTE_TYPE_LABEL_AR[SubscriberNoteType.NeedsMaintenance] },
];

/** تسمية عربية لقيمة رقمية (API، Excel، …) ضمن 1–6 فقط */
export function subscriberNoteTypeLabelAr(value: number): string | undefined {
  return SUBSCRIBER_NOTE_TYPE_LABEL_AR[value as SubscriberNoteType];
}
