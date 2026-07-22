# متغيرات قوالب واتساب

هذا المستند يصف الـ placeholders التي يدعمها **الفرونتند** (معاينة/القوالب الافتراضية) ويجب أن يطابقها **الباكند** عند بناء النص قبل الإرسال إلى واتساب.

**الاستبدال:** أسماء المتغيرات داخل `{{...}}` تُقارَن عادة **بدون حساسية لحالة الأحرف** حيث وُثّق ذلك (مثل `{{username}}` و`{{Username}}`).

**قوالب محفوظة مسبقاً:** النصوص المخزّنة في قاعدة البيانات **لا تُحدَّث تلقائياً** عند تغيير القالب الافتراضي. الوكيل يمكنه إضافة `{{Username}}` يدوياً في القالب المخصص، أو حفظ قالب جديد من الإعدادات ليُستخدم الافتراضي الجديد عند **إنشاء** قالب جديد فقط.

الكود المرجعي في الواجهة: `src/utils/activationMessage.ts`.

---

## رسالة التفعيل / التجديد (Activation)

| المتغير | المعنى |
|--------|--------|
| `{{SubscriberName}}` | اسم المشترك (الظاهر) |
| `{{SubscriberPhone}}` / `{{PhoneNumber}}` | رقم الهاتف |
| `{{ActivationDate}}` | تاريخ التفعيل |
| `{{ExpirationDate}}` | تاريخ انتهاء الاشتراك |
| `{{DaysUntilExpiry}}` | الأيام المتبقية |
| `{{ProfileName}}` | اسم الباقة |
| `{{AgentCompanyName}}` | اسم شركة الوكيل |
| `{{DebtDueDate}}` | تاريخ استحقاق الدين |
| `{{DebtAmount}}` | مبلغ الدين |
| `{{customText}}` / `{{CustomText}}` | نص مخصص (حسب إعدادات الواجهة) |

القالب الافتراضي: `DEFAULT_ACTIVATION_TEMPLATE`. الدالة: `buildActivationMessageFromTemplate`.

---

## رسالة التنبيه (انتهاء الاشتراك)

| المتغير | المعنى |
|--------|--------|
| `{{SubscriberName}}` | اسم المشترك |
| `{{ExpirationDate}}` | تاريخ انتهاء الاشتراك |
| `{{DaysUntilExpiry}}` | الأيام المتبقية |
| `{{AgentCompanyName}}` / `{{CompanyName}}` | اسم الشركة |
| `{{SecruptionId}}` | معرف المشترك (حسب الباكند) |

القالب الافتراضي: `DEFAULT_ALERT_TEMPLATE`. الدالة: `buildAlertMessageFromTemplate`.

---

## رسالة التفاصيل / الدين (Subscriber details)

تُستخدم عند إرسال «تفاصيل المشترك» عبر واتساب. يجب أن يوفّر الباكند نفس القيم عند ملء القالب.

| المتغير | المعنى |
|--------|--------|
| `{{SubscriberName}}` | اسم المشترك (الظاهر) |
| `{{Username}}` | اسم المستخدم / اسم الدخول (`subscriber.Username`) — غير حساس لحالة الأحرف داخل الأقواس |
| `{{SubscriberPhone}}` / `{{PhoneNumber}}` | رقم الهاتف |
| `{{ProfileName}}` | الباقة |
| `{{ActivationDate}}` | تاريخ التفعيل |
| `{{ExpirationDate}}` | تاريخ الانتهاء |
| `{{DaysUntilExpiry}}` | الأيام المتبقية |
| `{{AgentCompanyName}}` / `{{CompanyName}}` | اسم الشركة |
| `{{DebtDueDate}}` | تاريخ التسديد |
| `{{DebtAmount}}` | المبلغ (الدين) |

القالب الافتراضي: `DEFAULT_DETAILS_TEMPLATE`. أزرار الإدراج في الإعدادات تُبنى من `DETAILS_PLACEHOLDERS`. الدالة: `buildDetailsMessageFromTemplate` (تتوقع حقل `subscriberUsername` في `DetailsMessageData`).

---

## مرجع سريع للباكند

راجع أيضاً [backend-message-placeholders.md](./backend-message-placeholders.md) لمشكلة `{{ActivationDate}}` الظاهرة حرفياً ولمثال استبدال.
