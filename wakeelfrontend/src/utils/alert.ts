// دالة مساعدة لاستبدال alert() التقليدي
export const alert = (message: string) => {
  // تقسيم الرسالة إلى عنوان ووصف
  const lines = message.split('\n');
  const title = lines[0];
  const description = lines.slice(1).join('\n') || title;
  
  // تحديد نوع الإشعار بناءً على المحتوى
  let type: 'success' | 'error' | 'warning' | 'info' = 'info';
  
  if (message.includes('تم') && (message.includes('بنجاح') || message.includes('نجح'))) {
    type = 'success';
  } else if (message.includes('خطأ') || message.includes('فشل') || message.includes('غير موجود')) {
    type = 'error';
  } else if (message.includes('تحذير') || message.includes('انتبه')) {
    type = 'warning';
  }
  
  // عرض الإشعار باستخدام النظام الجديد
  if (typeof window !== 'undefined' && (window as any).showNotification) {
    (window as any).showNotification({
      type,
      title,
      message: description,
      duration: 4000 // 4 ثواني للرسائل التقليدية
    });
  } else {
    // fallback للـ alert التقليدي إذا لم يكن النظام متاحاً
    window.alert(message);
  }
};

// تصدير الدالة كـ default
export default alert;
