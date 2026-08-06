import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Clock3, Search } from 'lucide-react';
import { apiService, ApiService } from '../services/api';
import { ActivationRequestStatus, UserRole } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useDigits } from '../contexts/DigitsContext';

const statusLabel: Record<ActivationRequestStatus, string> = {
  [ActivationRequestStatus.PendingResellerActivation]: 'بانتظار تفعيل الرسيلر',
  [ActivationRequestStatus.Confirmed]: 'تم تأكيد التفعيل',
  [ActivationRequestStatus.Cancelled]: 'ملغي',
};

const ActivationRequestsPage: React.FC = () => {
  const { user } = useAuth();
  const { formatDate } = useDigits();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [status, setStatus] = useState<ActivationRequestStatus | ''>(ActivationRequestStatus.PendingResellerActivation);
  const [page, setPage] = useState(1);
  const canActivate = user?.role !== UserRole.Employee || user?.canActivateSubscriber === true;

  const { data, isLoading, error } = useQuery({
    queryKey: ['activation-requests', page, status, appliedSearch],
    queryFn: () => apiService.getActivationRequests({
      page, pageSize: 20, status: status === '' ? undefined : status, searchTerm: appliedSearch || undefined,
    }),
  });

  const confirm = useMutation({
    mutationFn: apiService.confirmActivationRequest.bind(apiService),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['activation-requests'] }),
  });

  const requests = data?.data ?? [];
  return (
    <div className="p-4 sm:p-6 space-y-5" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">طلبات التفعيل</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          الطلبات التي تم إصدار وصلها وتنتظر تفعيل الرسيلر.
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
          <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { setAppliedSearch(searchTerm.trim()); setPage(1); } }}
            placeholder="ابحث بالاسم أو اسم المستخدم" className="w-full pr-9 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" />
        </div>
        <select value={status} onChange={(e) => { setStatus(e.target.value === '' ? '' : Number(e.target.value) as ActivationRequestStatus); setPage(1); }}
          className="py-2 px-3 border rounded-lg dark:bg-gray-700 dark:border-gray-600">
          <option value="">كل الحالات</option>
          <option value={ActivationRequestStatus.PendingResellerActivation}>بانتظار الرسيلر</option>
          <option value={ActivationRequestStatus.Confirmed}>مؤكد</option>
          <option value={ActivationRequestStatus.Cancelled}>ملغي</option>
        </select>
        <button onClick={() => { setAppliedSearch(searchTerm.trim()); setPage(1); }}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg">بحث</button>
      </div>

      {error && <div className="text-red-600">تعذر تحميل طلبات التفعيل: {ApiService.showError(error)}</div>}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700 text-right">
            <tr><th className="p-3">المشترك</th><th className="p-3">الرسيلر</th><th className="p-3">الوصل</th><th className="p-3">الحالة</th><th className="p-3">التاريخ</th><th className="p-3">إجراء</th></tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={6} className="p-8 text-center">جاري التحميل...</td></tr>}
            {!isLoading && requests.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-gray-500">لا توجد طلبات.</td></tr>}
            {requests.map((item) => (
              <tr key={item.id} className="border-t dark:border-gray-700">
                <td className="p-3"><div className="font-medium">{item.subscriberName || item.subscriberUsername}</div><div className="text-gray-500">{item.subscriberUsername}</div></td>
                <td className="p-3">{item.agentResellerName || '—'}</td>
                <td className="p-3">{item.renewal?.receiptNumber || '—'}</td>
                <td className="p-3"><span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 ${item.status === ActivationRequestStatus.PendingResellerActivation ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'}`}>
                  {item.status === ActivationRequestStatus.PendingResellerActivation ? <Clock3 className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}{statusLabel[item.status]}
                </span></td>
                <td className="p-3">{formatDate(item.createdAt)}</td>
                <td className="p-3">{item.status === ActivationRequestStatus.PendingResellerActivation && canActivate && (
                  <button onClick={() => { if (window.confirm('تأكيد إتمام تفعيل الرسيلر؟')) confirm.mutate(item.id); }}
                    disabled={confirm.isPending} className="text-primary-600 font-medium disabled:opacity-50">تأكيد التفعيل</button>
                )}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {(data?.totalPages ?? 1) > 1 && <div className="flex justify-between">
        <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="px-3 py-2 border rounded disabled:opacity-50">السابق</button>
        <span>صفحة {page} من {data?.totalPages}</span>
        <button disabled={!data?.hasNextPage} onClick={() => setPage(page + 1)} className="px-3 py-2 border rounded disabled:opacity-50">التالي</button>
      </div>}
    </div>
  );
};

export default ActivationRequestsPage;
