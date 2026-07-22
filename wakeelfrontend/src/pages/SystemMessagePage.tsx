import React, { useState } from 'react';
import { apiService } from '../services/api';
import { ApiService } from '../services/api';
import { showSuccess, showError } from '../utils/notifications';
import { MessageSquare, Send, Clock } from 'lucide-react';

const DEFAULT_DURATION_MINUTES = 1440; // 24 hours

const SystemMessagePage: React.FC = () => {
  const [message, setMessage] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(DEFAULT_DURATION_MINUTES);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = message.trim();
    if (!trimmed) {
      showError('خطأ', 'يرجى إدخال نص الرسالة');
      return;
    }
    if (durationMinutes < 1) {
      showError('خطأ', 'مدة العرض يجب أن تكون دقيقة واحدة على الأقل');
      return;
    }
    setIsSubmitting(true);
    try {
      await apiService.createSystemMessage({
        message: trimmed,
        durationMinutes,
      });
      showSuccess('تم الحفظ', 'تم تعيين رسالة النظام للوكلاء بنجاح. ستظهر لهم عند تسجيل الدخول.');
      setMessage('');
      setDurationMinutes(DEFAULT_DURATION_MINUTES);
    } catch (err: any) {
      showError('خطأ', ApiService.showError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <MessageSquare className="h-7 w-7 text-primary-500" />
          رسالة النظام
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          إعداد رسالة تظهر للوكلاء عند تسجيل الدخول. يمكنهم إغلاق النافذة ومتابعة العمل.
        </p>
      </div>

      <div className="max-w-2xl">
        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-6">
          <div>
            <label htmlFor="message" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              نص الرسالة للوكلاء
            </label>
            <textarea
              id="message"
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm placeholder-gray-400"
              placeholder="مثال: سيتم إيقاف النظام للصيانة يوم الأحد من الساعة 10 صباحاً حتى 12 ظهراً."
            />
          </div>

          <div>
            <label htmlFor="durationMinutes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                مدة عرض الرسالة (بالدقائق)
              </span>
            </label>
            <input
              id="durationMinutes"
              type="number"
              min={1}
              max={525600}
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(parseInt(e.target.value, 10) || DEFAULT_DURATION_MINUTES)}
              className="block w-full max-w-xs rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              القيمة الافتراضية 1440 = 24 ساعة. بعد انتهاء المدة لن تظهر الرسالة تلقائياً.
            </p>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !message.trim()}
            className="inline-flex items-center gap-2 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="h-4 w-4" />
            {isSubmitting ? 'جاري الحفظ...' : 'تعيين رسالة النظام'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default SystemMessagePage;
