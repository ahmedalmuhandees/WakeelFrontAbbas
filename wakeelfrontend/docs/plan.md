# الباقات القياسية (Economy / Plus / Gold) — دليل الفرونت

## نظرة عامة

- **`TenantPlanType`**: `0` = Standard، `1` = Vip (كما كان سابقاً في `GET /api/Auth/me` واستجابة تسجيل الدخول).
- **`StandardPlanTier`**: يُستخدم **فقط** مع Standard: `economy` | `plus` | `gold` (نص)، أو رقمياً `0` | `1` | `2` في الحقول الجديدة.
- **Vip**: لا تُطبَّق قيود الباقات القياسية على مستوى الـ API (يُعامل كوصول كامل كما طلبتم).
- **مستأجرون قدامى (Standard بدون `standardPlanTier` في قاعدة البيانات)**: يُعاملون كوصول كامل حتى لا يُكسر الإنتاج.

## كتالوج الباقات (قبل إنشاء وكيل)

**`GET /wakeel/api/Tenants/standard-plan-tiers`**  
**صلاحية:** `Admin` فقط (نفس باقي `Tenants`).

**الاستجابة:** مصفوفة عناصر، كل عنصر يحتوي تقريباً على:

| حقل | معنى |
|-----|------|
| `tier` | `economy` / `plus` / `gold` |
| `tierId` | `0` / `1` / `2` (متوافق مع enum الفرونت) |
| `displayNameAr` | اسم عربي للعرض |
| `maxResellers` | الحد الأقصى لعدد الريسيلرز لهذه الباقة |
| `featureLabelsAr` | قائمة نصوص عربية للميزات المعروضة للأدمن |
| `featureCodes` | أكواد تقنية تطابق `GET /api/me/features` |

استخدم هذا الـ endpoint لملء واجهة «اختيار الباقة» وعرض المميزات قبل الضغط على «إنشاء وكيل».

## إنشاء وكيل جديد (أدمن)

**`POST /wakeel/api/Agents`**

في جسم الطلب، عند **`tenantPlanType: 0` (Standard)**:

- أرسل **`standardPlanTier`** كرقم: `0` = Economy، `1` = Plus، `2` = Gold (يُربط بـ `Wakeel.Enums.StandardPlanTier`).
- عند **`tenantPlanType: 1` (Vip)** لا تُرسل `standardPlanTier` (يُتجاهل).

عند إنشاء وكيل فرعي **من وكيل رئيسي (MainAgent)**، الخادم يقلّد `standardPlanTier` من مستأجر الوكيل الرئيسي تلقائياً.

## بعد تسجيل الدخول — بيانات الخطة

### `POST /api/Auth/login`

تتضمن الاستجابة (عند نجاح إصدار التوكن):

- `tenantPlanType`
- `standardPlanTierId` (أو `null` إن لم تنطبق)
- `standardPlanTier` (نص `economy` | `plus` | `gold` أو `null`)
- `maxResellers` — الحد الأقصى لعدد الريسيلرز؛ `null` يعني غير محدود (مثلاً Vip أو بيانات قديمة).

### `GET /api/Auth/me`

نفس الحقول الإضافية في `CurrentUserDto` (مع `tenantPlanType`).

### `GET /api/me/features`

يعيد قائمة **`featureCodes`** المفعّلة للمستأجر الحالي (مثل `module_subscribers`, `module_employee_tasks`, …).  
استخدمها لإظهار/إخفاء عناصر القائمة في الواجهة بما يتوافق مع الباقة.

## حد الريسيلر

عند **`POST /api/Agents/me/resellers`**: إذا وصل الوكيل للحد `maxResellers` للمستأجر، يعيد الخادم **400** برسالة توضح الحد.

الفرونت يمكنه منع الضغط مسبقاً بمقارنة `عدد الريسيلرز الحالي` مع `maxResellers` من `Auth/me` أو تسجيل الدخول.

## رموز الميزات (Feature codes) — مرجع سريع

| الكود | وصف تقريبي |
|--------|------------|
| `module_subscribers` | المشتركين، المزامنة، استيراد Excel |
| `module_activations` | التفعيلات، SAS، بروفايلات التفعيل |
| `module_debts` | الديون |
| `module_accounts` | الحساب اليومي، التسليم، الرصيد، الأرباح |
| `module_receipts` | إيصالات التفعيل |
| `module_customer_invoices` | فواتير العملاء |
| `module_employees` | إدارة الموظفين |
| `module_salary_sheet` | رواتب الموظفين |
| `module_whatsapp_linking` | ربط جهاز واتساب (وأدوات الأدمن للجلسات) |
| `module_whatsapp_templates` | قوالب الواتساب |
| `module_office_expenses` | مصاريف المكتب |
| `module_materials` | المواد |
| `module_employee_tasks` | مهام الموظفين |
| `module_cashback` | الكاش باك |
| `module_main_agent_panel` | لوحة الوكيل الرئيسي (يُفحص للمستأجرين الذين لديهم الميزة؛ المستخدمون بصلاحية global مثل MainAgent في السيرفر يتجاوزون فحص الميزة) |

## الأخطاء

- عند محاولة استدعاء API لميزة غير مفعّلة للمستأجر: **403 Forbidden** (بدون رسالة موحّدة حالياً؛ يمكن الاعتماد على فحص الميزات مسبقاً من `GET /api/me/features`).

## ملاحظة للأدمن — تحديث مستأجر يدوياً

`PUT /api/Tenants/{id}` يدعم الآن حقل **`standardPlanTier`** في الجسم عند الحاجة. تغيير الباقة يدوياً **لا يعيد توليد `TenantFeatures` تلقائياً** في هذا الإصدار؛ لتطبيق ميزات جديدة بعد التعديل يمكن لاحقاً استدعاء مسار صيانة أو إعادة إنشاء الربط من لوحة داخلية.
