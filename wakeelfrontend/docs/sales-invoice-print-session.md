# ملخص عمل — قالب فاتورة المبيعات والطباعة (2026-04-11)

## قالب طباعة بيع المواد (`salesMaterialInvoicePrintHtml.ts`)

- تخطيط الرأس: شعار يسار الورقة، بيانات الشركة يميناً، نص أوضح لاسم الشركة.
- رقم الفاتورة في السطر `Invoice : #…` من بيانات الصرف (مع دعم `invoiceNumber` / `InvoiceNumber` من الـ API).
- ملاحظات الفاتورة في **أسفل** الصفحة؛ ربط `notesText` من صفحة الصرف.
- شعار الطباعة: خيار رمادي (أبيض/أسود) عبر الإعدادات؛ أبعاد قابلة للضبط من الإعدادات.
- مظهر الطباعة من الإعدادات: ألوان، هوامش `@page`، حجم ورقة A4/A5، خطوط، موضع الشعار، إظهار/إخفاء التذييل القانوني — عبر `resolveSalesMaterialPrintTheme`.

## إعدادات قالب المبيعات (واجهة)

- حقول جديدة في `SalesInvoicePrintSettingsDto` ومزامنة `GET/PUT` في `api.ts` (camel + Pascal).
- قسم **«مظهر الطباعة»** في `InvoicePrintTemplateSettings` (نمط `sales` فقط): ألوان، هوامش، خط، شعار، معاينة محدثة.

## API صرف المواد (`api.ts`)

- تطبيع `invoiceNumber` من `InvoiceNumber` عند الاستجابة لسجلات الصرف و`postMaterialDisburse`.

## الشعار ومسارات الملفات (`activationReceiptPrintHtml.ts`)

- `resolveInvoiceLogoUrlCandidates`: عدة روابط محتملة (بما فيها بادئة التطبيق مثل `/wakeel` عندما يكون الـ API تحت `/wakeel/api`).
- `tryEmbedInvoiceLogoAsDataUrl`: يجرّب المرشحين ويضمّن الشعار كـ **data URL** للطباعة (مع Bearer).
- `waitForDocumentImages`: انتظار تحميل الصور قبل الطباعة.

## نافذة الطباعة (`MaterialsDisbursementPage.tsx`)

- فتح النافذة **مباشرة مع النقر**، عرض «جاري تجهيز الفاتورة…»، ثم استبدال المحتوى بعد جلب الإعدادات (تفادي `about:blank` فارغ بعد `await`).
- عدم استدعاء `close()` مباشرة بعد `print()`؛ الإغلاق عبر `onafterprint` (أو بديل زمني).

---

*مختصر للمراجعة الداخلية؛ التفاصيل في الكود والـ commit messages.*
