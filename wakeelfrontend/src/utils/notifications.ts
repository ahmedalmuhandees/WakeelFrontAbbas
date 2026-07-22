import { mapBackendErrorMessageForUser } from '../services/api';

// دالة مساعدة لعرض الإشعارات
export const showNotification = (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string, duration?: number) => {
  if (typeof window !== 'undefined' && (window as any).showNotification) {
    (window as any).showNotification({
      type,
      title,
      message,
      duration: duration || 3000
    });
  }
};

// دوال مختصرة للاستخدام السهل
export const showSuccess = (title: string, message: string, duration?: number) => {
  showNotification('success', title, message, duration);
};

export const showError = (title: string, message: string, duration?: number) => {
  showNotification('error', title, message, duration);
};

export const showWarning = (title: string, message: string, duration?: number) => {
  showNotification('warning', title, message, duration);
};

export const showInfo = (title: string, message: string, duration?: number) => {
  showNotification('info', title, message, duration);
};

// دالة لعرض رسائل الخطأ من API
export const showApiError = (error: any, defaultMessage: string = 'حدث خطأ غير متوقع') => {
  let message = defaultMessage;

  if (error?.message) {
    message = error.message;
  } else if (error?.response?.data?.message) {
    message = error.response.data.message;
  } else if (typeof error === 'string') {
    message = error;
  }

  showError('خطأ', mapBackendErrorMessageForUser(String(message)));
};

// دالة لعرض رسائل النجاح من العمليات
export const showApiSuccess = (message: string) => {
  showSuccess('نجح', message);
};
