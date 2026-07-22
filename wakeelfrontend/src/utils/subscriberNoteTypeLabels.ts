import { SubscriberNoteType } from '../types';

/**
 * تسميات عربية موحّدة مع `Wakeel.Enums.SubscriberNoteType` (الخادم) وواجهة التطبيق.
 * أرقام الـ enum ثابتة (1–6؛ BadService = 4، NeedsMaintenance = 5، …)؛ أي تعديل لاحق يكون على النصوص المعروضة فقط.
 *
 * | القيمة | المعنى |
 * |--------|--------|
 * | 1 | لم يتم الرد |
 * | 2 | ستتم التفعيل قريباً |
 * | 3 | لا يرغب في التفعيل |
 * | 4 | واصل ماستر |
 * | 5 | واصل مكتب الزهور |
 * | 6 | أخرى (نص حر في الملاحظة) |
 */
export const SUBSCRIBER_NOTE_TYPE_LABEL_AR: Record<SubscriberNoteType, string> = {
  [SubscriberNoteType.NoResponse]: 'لم يتم الرد',
  [SubscriberNoteType.WillActivateSoon]: 'ستتم التفعيل قريباً',
  [SubscriberNoteType.DoesNotWantActivation]: 'لا يرغب في التفعيل',
  [SubscriberNoteType.BadService]: 'واصل ماستر',
  [SubscriberNoteType.NeedsMaintenance]: 'واصل مكتب الزهور',
  [SubscriberNoteType.Other]: 'أخرى',
};

/** تسمية عربية لقيمة رقمية (API، Excel، …) ضمن 1–6 فقط */
export function subscriberNoteTypeLabelAr(value: number): string | undefined {
  return SUBSCRIBER_NOTE_TYPE_LABEL_AR[value as SubscriberNoteType];
}
