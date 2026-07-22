# إغلاق تاب SAS بعد التفعيل والعودة لتاب الوكيل

عند فتح صفحة التفعيل من نظام الوكيل (Wakeel) في تاب جديد (`94.176.182.184/#/user/activate/...`) يمر المستخدم بخطوتين:

1. **الزر الأول Activate** (في الصفحة الرئيسية):  
   `<button class="btn btn-primary float-right">Activate</button>`  
   → يفتح مودال "Confirm Activation".

2. **الزر الثاني Activate** (داخل المودال):  
   داخل `p-dialog` في الـ footer:  
   `div.modal-footer > button.btn.btn-primary.float-right`  
   → ينفذ تأكيد التفعيل.

**المطلوب:** بعد الضغط على **الزر الثاني** (داخل مودال Confirm Activation) وإتمام التفعيل بنجاح، أن يُغلق تاب SAS تلقائياً ويُرجع التركيز لتاب الوكيل.

---

## أين يُضاف الكود؟

يجب إضافة منطق الإغلاق في **معالج الزر الثاني فقط** (زر Activate داخل مودال "Confirm Activation")، **بعد** نجاح استدعاء التفعيل (بعد نجاح الـ API أو إغلاق المودال بنجاح).

لا يُضاف عند الزر الأول؛ الزر الأول يفتح المودال فقط.

---

## الكود المطلوب في تطبيق SAS (Angular)

في الـ **component** الذي يعرض مودال "Confirm Activation" (p-dialog) ويتعامل مع زر "Activate" في الـ `modal-footer`:

**بعد** تنفيذ تأكيد التفعيل (مثلاً بعد نجاح الـ API أو بعد `this.dialogRef.close()` أو ما يعادله)، أضف:

```typescript
// بعد نجاح التفعيل (بعد إغلاق المودال أو بعد response ناجح من الـ API)
if (typeof window !== 'undefined' && window.opener) {
  window.opener.focus();  // إرجاع التركيز لتاب الوكيل
  window.close();         // إغلاق تاب SAS
}
```

### مثال كامل لمعالج الزر الثاني (داخل المودال)

```typescript
// مثال: في الـ component الذي فيه p-dialog "Confirm Activation"
onConfirmActivate() {
  // 1) تنفيذ التفعيل (API أو ما شابه)
  this.activationService.confirmActivate(this.payload).subscribe({
    next: () => {
      // 2) إغلاق المودال إن كان مطلوباً
      this.dialogRef?.close();
      // 3) إن فُتح التاب من الوكيل، أرجِع التركيز وأغلق التاب
      if (typeof window !== 'undefined' && window.opener) {
        window.opener.focus();
        window.close();
      }
    },
    error: (err) => {
      // معالجة الخطأ كالمعتاد
    }
  });
}
```

إذا كان المودال يُغلق أولاً ثم يُنفَّذ شيء بعد الإغلاق، يمكن وضع نفس الكود في الـ callback الذي يُنفَّذ بعد إغلاق المودال (بعد نجاح التفعيل).

---

## ملاحظات

- **الزر الأول** (Activate في الصفحة): يبقى كما هو؛ يفتح المودال فقط، ولا يُضاف فيه `window.close()`.
- **الزر الثاني** (Activate في المودال): هذا المكان الصحيح لإضافة `window.opener.focus()` و `window.close()` بعد نجاح التفعيل.
- `window.close()` يعمل فقط على نافذة فُتحت من سكربت (مثل `window.open` من الوكيل)، وهذا ينطبق على تاب SAS عند فتحه من Wakeel.
- التحقق من `window.opener` يضمن أن الإغلاق يحدث فقط عندما يكون التاب قد فُتح من نظام الوكيل، وليس عند الدخول المباشر لصفحة SAS.

---

## إن لم يكن لديك مصدر SAS

إذا كان تطبيق SAS (94.176.182.184) يديره فريق آخر، انقل لهم هذا الملف أو الملخص أعلاه واطلب إضافة الكود في معالج **الزر الثاني Activate** داخل مودال "Confirm Activation" بعد نجاح التفعيل.
