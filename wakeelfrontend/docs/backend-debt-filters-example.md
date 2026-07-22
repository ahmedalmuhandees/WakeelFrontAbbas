# فلترة الديون في الباكند (C#) — مثال للتكامل

هذا الملف يوضح كيفية إضافة الفلاتر في الباكند. انسخ الأجزاء المناسبة إلى مشروع الـ API لديك.

## 1. معاملات الاستعلام (Query / DTO)

أضف الخصائص التالية إلى الـ DTO أو الـ query model المستخدم في `GET /api/Debts` (و endpoints الديون الأخرى):

```csharp
// مثال لخصائص الفلترة في الـ Request / Query
public string? DebtDescription { get; set; }  // مطابقة جزئية على وصف الدين
public DateTime? DueDateFrom { get; set; }     // DueDate >= DueDateFrom
public DateTime? DueDateTo { get; set; }       // DueDate <= DueDateTo
public int? DebtStatus { get; set; }          // 0 = غير مدفوع، 1 = مدفوع، 2 = مدفوع جزئياً
```

مثال على استدعاء من الفرونت:

- `?DebtDescription=تجديد` — وصف يحتوي على "تجديد"
- `?DueDateFrom=2026-01-01&DueDateTo=2026-02-28` — استحقاق ضمن النطاق
- `?DebtStatus=0` — غير مدفوع فقط
- `?DebtStatus=1` — مدفوع فقط
- دمج: `GET /api/Debts?Page=1&PageSize=10&DebtDescription=اشتراك&DueDateFrom=2026-01-01&DueDateTo=2026-03-31&DebtStatus=0`

---

## 2. دالة مساعدة في DebtsService.cs

افتراض: استعلام الديون من نوع `IQueryable<Debt>` (أو ما يعادله في مشروعك).

```csharp
/// <summary>
/// يطبّق فلاتر الديون (وصف، نطاق تاريخ التسديد، الحالة) على استعلام الديون.
/// </summary>
private static IQueryable<Debt> ApplyDebtFilters(
    IQueryable<Debt> query,
    string? debtDescription,
    DateTime? dueDateFrom,
    DateTime? dueDateTo,
    int? debtStatus)
{
    if (!string.IsNullOrWhiteSpace(debtDescription))
        query = query.Where(d => d.Description != null && d.Description.Contains(debtDescription.Trim()));

    if (dueDateFrom.HasValue)
        query = query.Where(d => d.DueDate >= dueDateFrom.Value);

    if (dueDateTo.HasValue)
    {
        var toEndOfDay = dueDateTo.Value.Date.AddDays(1).AddTicks(-1);
        query = query.Where(d => d.DueDate <= toEndOfDay);
    }

    if (debtStatus.HasValue)
        query = query.Where(d => d.Status == debtStatus.Value);

    return query;
}
```

استدعاء الدالة من دوال الخدمة (بعد قراءة المعاملات من الـ request):

```csharp
// مثال داخل GetAllDebtsAsync (أو ما يعادله)
var query = _context.Debts.AsQueryable(); // أو من مصدر الاستعلام الحالي
query = ApplyDebtFilters(query, request.DebtDescription, request.DueDateFrom, request.DueDateTo, request.DebtStatus);
// ثم الاستمرار في الصفحة والترتيب...
```

---

## 3. أماكن استدعاء ApplyDebtFilters

استدعِ `ApplyDebtFilters` في كل من:

- **GetAllDebtsAsync** — قائمة الديون العامة (مثلاً GET /api/Debts).
- **GetDebtsBySubscriberAsync** — ديون مشترك معيّن (مثلاً GET /api/Debts/subscriber/{id}).
- **GetDebtsByAgentAsync** — ديون وكيل معيّن.
- **GetDebtsByAgentSubscribersAsync** — ديون مشتركي وكيل.

في كل دالة:

1. ابنِ استعلام الديون الأساسي (حسب المشترك/الوكيل إن لزم).
2. مرّر المعاملات `DebtDescription`, `DueDateFrom`, `DueDateTo`, `DebtStatus` من الـ request إلى `ApplyDebtFilters`.
3. استخدم الاستعلام الناتج للصفحة والترتيب والإرجاع.

---

## 4. ربط الـ Controller

تأكد أن الـ Controller يقرأ المعاملات من الـ query string ويمررها للـ service:

```csharp
// مثال في DebtsController
[HttpGet]
public async Task<ActionResult<PagedResult<DebtDto>>> GetDebts(
    [FromQuery] int page = 1,
    [FromQuery] int pageSize = 10,
    [FromQuery] string? searchTerm = null,
    [FromQuery] string? DebtDescription = null,
    [FromQuery] DateTime? DueDateFrom = null,
    [FromQuery] DateTime? DueDateTo = null,
    [FromQuery] int? DebtStatus = null,
    // ... باقي المعاملات
    )
{
    var request = new DebtsListRequest
    {
        Page = page,
        PageSize = pageSize,
        SearchTerm = searchTerm,
        DebtDescription = DebtDescription,
        DueDateFrom = DueDateFrom,
        DueDateTo = DueDateTo,
        DebtStatus = DebtStatus,
    };
    var result = await _debtsService.GetAllDebtsAsync(request);
    return Ok(result);
}
```

---

الفرونت (wakeel) يرسل بالفعل:

- `DebtDescription` — من حقل "وصف الدين" في الفلترة المتقدمة.
- `DueDateFrom` و `DueDateTo` — من "من تاريخ التسديد" و "إلى تاريخ التسديد" (مع `fromDate`/`toDate` إن احتجتها).
- `DebtStatus` — من "حالة الدين" (0/1/2).

بعد تطبيق الكود أعلاه في الباكند، فلترة الديون ستكون متوافقة مع الواجهة.
