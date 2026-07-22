import 'axios';

declare module 'axios' {
  export interface AxiosRequestConfig {
    /**
     * عند 401/403: لا تحذف التوكن ولا أعد التوجيه لـ /login.
     * يُستخدم أثناء تمهيد الجلسة لطلبات اختيارية قد ترفضها الصلاحيات دون إلغاء الدخول.
     */
    skipAuthRedirect?: boolean;
  }
}
