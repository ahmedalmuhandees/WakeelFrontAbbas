# دعم ألوان إعلانات الوكيل في الباكند

لكي تظهر ألوان الكارت (التدرج) التي يحددها الوكيل في صفحة المشترك، يجب أن يقوم الباكند بالتالي.

---

## 1. نموذج/جدول الإعلان (Entity)

تأكد أن كيان الإعلان يحتوي على حقلين للون التدرج، مثلاً:

```csharp
public class AgentAnnouncement  // أو Announcement
{
    public Guid Id { get; set; }
    public string MainTitle { get; set; }
    public string SubTitle { get; set; }
    public string Phone { get; set; }
    public string GradientStart { get; set; }  // مثال: "#2962FF"
    public string GradientEnd { get; set; }    // مثال: "#1E40AF"
    public DateTime CreatedAt { get; set; }
    // ... ربط بالوكيل AgentId إلخ
}
```

- إضافة عمودين في قاعدة البيانات إن لم يكونا موجودين: `GradientStart`, `GradientEnd` (نوع string/nvarchar).
- تشغيل migration بعد التعديل.

---

## 2. DTO المستخدم في الـ API

يجب أن يحتوي الـ DTO على الحقلين في الاستجابة والطلب.

**مثال لـ AgentAnnouncementDto (أو الاسم المستخدم عندك):**

```csharp
public class AgentAnnouncementDto
{
    public Guid Id { get; set; }
    public DateTime CreatedAt { get; set; }
    public string MainTitle { get; set; }
    public string SubTitle { get; set; }
    public string Phone { get; set; }
    public string GradientStart { get; set; }  // اختياري
    public string GradientEnd { get; set; }    // اختياري
}
```

- عند التسلسل إلى JSON، استخدم **camelCase** حتى يصل للفرونت كـ `gradientStart` و `gradientEnd` (وهذا غالباً الافتراضي في ASP.NET Core).

---

## 3. نقاط الـ API التي يجب أن تعيد أو تقبل الألوان

| الـ API | المطلوب |
|--------|---------|
| **GET** `/api/AppSettings/announcements` | إرجاع قائمة إعلانات، كل عنصر يحتوي على `gradientStart` و `gradientEnd` (أو null إن لم يُخزَّن). |
| **GET** `/api/AppSettings/announcements/{id}` | إرجاع الإعلان مع `gradientStart` و `gradientEnd`. |
| **POST** `/api/AppSettings/announcements` | قبول الجسم (body) يحتوي على `mainTitle`, `subTitle`, `phone`, واختيارياً `gradientStart`, `gradientEnd`، وحفظها ثم إرجاع نفس الـ DTO. |
| **PUT** `/api/AppSettings/announcements/{id}` | قبول نفس الحقول (بما فيها `gradientStart`, `gradientEnd`) وتحديث الإعلان ثم إرجاع الـ DTO المحدّث. |

---

## 4. استجابة معلومات المشترك (الأهم لظهور اللون عند المشترك)

استجابة **GET /api/subscribers/info/{username}** (أو ما يعادلها لمعلومات المشترك) يجب أن تحتوي على مصفوفة إعلانات، و**كل عنصر فيها يجب أن يحتوي على نفس الحقول بما فيها الألوان**:

```json
{
  "id": "...",
  "username": "...",
  "fullName": "...",
  "announcements": [
    {
      "id": "guid-1",
      "createdAt": "2025-02-06T...",
      "mainTitle": "العنوان الرئيسي",
      "subTitle": "عنوان فرعي",
      "phone": "07701234567",
      "gradientStart": "#2962FF",
      "gradientEnd": "#1E40AF"
    }
  ]
}
```

- في `SubscribersService` (أو المنطق الذي يملأ `SubscriberInfoDto`): عند تعبئة `Announcements` من إعلانات الوكيل، استخدم نفس الـ DTO أو تأكد من نسخ `GradientStart` و `GradientEnd` إلى كل عنصر في المصفوفة.
- إذا كانت الدالة المساعدة `GetAgentAnnouncementsDtos` ترجع قائمة من نوع `AgentAnnouncementDto` وتضمّن فيها `GradientStart` و `GradientEnd` من الـ Entity، فستكفي.

---

## 5. التحقق السريع

1. **من تطبيق الوكيل (الإعدادات):** إنشاء أو تعديل إعلان مع اختيار لونين وحفظ. ثم استدعاء `GET /api/AppSettings/announcements` والتأكد أن الاستجابة تحتوي على `gradientStart` و `gradientEnd` لكل إعلان.
2. **من واجهة المشترك:** استدعاء `GET /api/subscribers/info/{username}` لمشترك تابع لذات الوكيل، والتأكد أن `announcements[].gradientStart` و `gradientEnd` موجودان في الـ JSON.

بعد تنفيذ النقاط أعلاه في الباكند، الفرونت سيعرض اللون تلقائياً لأنه يقرأ هذين الحقلين من `subscriberInfo.announcements[i]`.

---

## تم التنفيذ في الباكند

- في `SubscribersService.GetAgentAnnouncementsDtos`: كل عنصر في `announcements` يُملأ بـ `GradientStart` و `GradientEnd` من الـ entity.
- استجابة `GET /api/subscribers/info/{username}` تتضمن لكل إعلان: `id`, `createdAt`, `mainTitle`, `subTitle`, `phone`, `gradientStart`, `gradientEnd`.
