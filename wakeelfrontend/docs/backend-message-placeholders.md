# استبدال متغيرات القوالب في رسائل واتساب (الباكند)

عند إرسال رسالة التفعيل أو رسالة التفاصيل/الدين عبر واتساب، يجب على الباكند **استبدال كل المتغيرات** في القالب بقيم من بيانات المشترك. إذا لم يُستبدل متغير (مثل `{{ActivationDate}}`) تظهر النص كما هو في الرسالة المرسلة.

## المشكلة الشائعة: `{{ActivationDate}}` يظهر حرفياً

إذا ظهر في الرسالة النص `{{ActivationDate}}` أو `ActivationDate` بدلاً من تاريخ التفعيل الفعلي، فالسبب أن الباكند **لم يطبّق استبدال** هذا المتغير عند بناء نص الرسالة.

## الحل في الباكند

عند بناء نص الرسالة (قبل إرسالها إلى واتساب):

1. جلب القالب من الإعدادات (ActivationMessage أو SubscriberDetailsMessage).
2. جلب بيانات المشترك (مع وجود حقل **activationDate**).
3. استبدال كل placeholder بالقيمة المناسبة، ومنها:
   - **`{{ActivationDate}}`** ← قيمة **تاريخ التفعيل** للمشترك (مثلاً من `subscriber.ActivationDate` أو `subscriber.activationDate`)، مُنسّقة كتاريخ فقط، مثلاً `yyyy-MM-dd` أو بتنسيق العرض المحلي (مثل `ar-EG`).

## قائمة المتغيرات المطلوب استبدالها

### رسالة التفعيل/التجديد (Activation)

| المتغير في القالب | المصدر في الباكند (مثال) |
|-------------------|---------------------------|
| `{{SubscriberName}}` | اسم المشترك |
| `{{SubscriberPhone}}` / `{{PhoneNumber}}` | رقم هاتف المشترك |
| **`{{ActivationDate}}`** | **تاريخ التفعيل للمشترك (يجب استبداله)** |
| `{{ExpirationDate}}` | تاريخ انتهاء الاشتراك |
| `{{DaysUntilExpiry}}` | الأيام المتبقية حتى الانتهاء |
| `{{ProfileName}}` | اسم الباقة |
| `{{AgentCompanyName}}` | اسم شركة الوكيل |
| `{{DebtDueDate}}` | تاريخ استحقاق الدين |
| `{{DebtAmount}}` | مبلغ الدين |

### رسالة التفاصيل/الدين (Details)

نفس متغيرات التفعيل أعلاه، مع إضافة:

- **`{{Username}}`** (أو `{{username}}` — الاستبدال غير حساس لحالة الأحرف) ← اسم المستخدم / اسم الدخول للمشترك (`subscriber.Username`).

مع التأكيد على:

- **`{{ActivationDate}}`** ← من بيانات المشترك (تاريخ التفعيل)، مُنسّق كسلسلة تاريخ للعرض.

مرجع مفصّل للقوالب: [WhatsApp-Template-Variables.md](./WhatsApp-Template-Variables.md).

## مثال استبدال في C#

```csharp
// عند بناء نص الرسالة (مثلاً في DetailsMessageService أو ActivationMessageService)
var activationDateStr = subscriber.ActivationDate.HasValue
    ? subscriber.ActivationDate.Value.ToString("yyyy-MM-dd")  // أو ToString("d", new CultureInfo("ar-EG"))
    : "";

var body = template
    .Replace("{{ActivationDate}}", activationDateStr)
    .Replace("{{ExpirationDate}}", expirationDateStr)
    // ... باقي الاستبدالات
```

## مرجع الفرونتند

الفرونتند يطبّق نفس المنطق في:

- `src/utils/activationMessage.ts`:
  - `buildActivationMessageFromTemplate()` لرسالة التفعيل
  - `buildDetailsMessageFromTemplate()` لرسالة التفاصيل

يمكن للباكند أن يطابق نفس أسماء المتغيرات ونفس الاستبدال لضمان ظهور تاريخ التفعيل وغيره بشكل صحيح في الرسالة.
