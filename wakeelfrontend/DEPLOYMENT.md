# تعليمات النشر - نظام الوكيل

## النشر على GitHub Pages

### الخطوة 1: تثبيت gh-pages
```bash
npm install --save-dev gh-pages
```

### الخطوة 2: إضافة scripts في package.json
```json
{
  "scripts": {
    "predeploy": "npm run build",
    "deploy": "gh-pages -d build"
  }
}
```

### الخطوة 3: النشر
```bash
npm run deploy
```

## النشر على Vercel

### الخطوة 1: ربط المشروع بـ Vercel
1. اذهب إلى [vercel.com](https://vercel.com)
2. سجل الدخول بحساب GitHub
3. اضغط على "New Project"
4. اختر مستودع `wakeel`
5. اضغط على "Deploy"

### الخطوة 2: إعداد متغيرات البيئة
في لوحة تحكم Vercel:
1. اذهب إلى Settings > Environment Variables
2. أضف متغير جديد:
   - Name: `REACT_APP_API_URL`
   - Value: `https://wakeelbackend-production.up.railway.app/wakeel/api`

## النشر على Netlify

### الخطوة 1: ربط المشروع بـ Netlify
1. اذهب إلى [netlify.com](https://netlify.com)
2. سجل الدخول بحساب GitHub
3. اضغط على "New site from Git"
4. اختر مستودع `wakeel`
5. اضغط على "Deploy site"

### الخطوة 2: إعداد متغيرات البيئة
في لوحة تحكم Netlify:
1. اذهب إلى Site settings > Environment variables
2. أضف متغير جديد:
   - Key: `REACT_APP_API_URL`
   - Value: `https://wakeelbackend-production.up.railway.app/wakeel/api`

## النشر على Firebase Hosting

### الخطوة 1: تثبيت Firebase CLI
```bash
npm install -g firebase-tools
```

### الخطوة 2: تسجيل الدخول
```bash
firebase login
```

### الخطوة 3: تهيئة المشروع
```bash
firebase init hosting
```

### الخطوة 4: بناء المشروع
```bash
npm run build
```

### الخطوة 5: النشر
```bash
firebase deploy
```

## رابط الباكند

رابط الباكند الحالي (Railway):

```
REACT_APP_API_URL=https://wakeelbackend-production.up.railway.app/wakeel/api
```

انسخ `.env.example` إلى `.env.local` وعدّل القيمة إن لزم. التطبيق يقرأ `REACT_APP_API_URL` من البيئة.

**مهم:** في React تُحقَن متغيرات البيئة عند **وقت البناء** (build). إذا ظهرت الطلبات على الرابط القديم (مثل api.execute-iq.com) بعد النشر:
1. في منصة النشر (Railway / Vercel / Netlify): عيّن **متغير البيئة** `REACT_APP_API_URL` = `https://wakeelbackend-production.up.railway.app/wakeel/api`
2. نفّذ **إعادة بناء وتنشر** (Redeploy / Build again) حتى يُبنى المشروع من جديد بالقيمة الجديدة.

## إعدادات مهمة

### متغيرات البيئة المطلوبة
```
# الباكند الحالي (Railway)
REACT_APP_API_URL=https://wakeelbackend-production.up.railway.app/wakeel/api

# إنتاج (بديل)
# REACT_APP_API_URL=https://wakeeliq-001-site1.qtempurl.com/api

# تطوير محلي
# REACT_APP_API_URL=http://localhost:5112/wakeel/api
```

### إعدادات البناء
- Build command: `npm run build`
- Publish directory: `build`
- Node version: `18.x` أو أحدث

### إعدادات DNS (اختياري)
إذا كنت تستخدم نطاق مخصص:
1. أضف CNAME record يشير إلى موقع النشر
2. أو أضف A record يشير إلى IP الخاص بالموقع

## استكشاف الأخطاء

### مشاكل شائعة
1. **خطأ في API**: تأكد من صحة `REACT_APP_API_URL`
2. **مشاكل في البناء**: تأكد من تثبيت جميع الحزم
3. **مشاكل في التوجيه**: تأكد من إعدادات SPA routing

### حلول سريعة
```bash
# تنظيف cache
npm start -- --reset-cache

# إعادة تثبيت الحزم
rm -rf node_modules package-lock.json
npm install

# بناء نظيف
rm -rf build
npm run build
```

## مراقبة الأداء

### Vercel Speed Insights
المشروع يتضمن Vercel Speed Insights للمراقبة التلقائية للأداء.

### Google Analytics (اختياري)
يمكن إضافة Google Analytics لتتبع الزوار والإحصائيات.

## الدعم

للحصول على المساعدة في النشر:
1. راجع وثائق خدمة النشر المستخدمة
2. تحقق من logs الأخطاء
3. تواصل مع فريق التطوير
