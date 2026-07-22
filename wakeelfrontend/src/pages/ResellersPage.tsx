import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '../services/api';
import { AgentResellerCredentialsDto, ServiceType, formatServiceTypeLabelAr } from '../types';
import WifiLoaderComponent from '../components/WifiLoaderComponent';
import { UserCheck, Copy, Check } from 'lucide-react';
import { showSuccess, showError } from '../utils/notifications';
import Pagination from '../components/Pagination';

const ResellersPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [appliedSearchTerm, setAppliedSearchTerm] = useState('');
  const [agentNameFilter, setAgentNameFilter] = useState('');
  const [appliedAgentName, setAppliedAgentName] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const applyFilters = () => {
    setAppliedSearchTerm(searchTerm.trim());
    setAppliedAgentName(agentNameFilter.trim());
    setCurrentPage(1);
  };

  const { data, error, isLoading } = useQuery({
    queryKey: ['resellers-credentials', currentPage, pageSize, appliedSearchTerm, appliedAgentName],
    queryFn: () =>
      apiService.getResellersCredentials({
        page: currentPage,
        pageSize,
        searchTerm: appliedSearchTerm.trim() || undefined,
        agentName: appliedAgentName.trim() || undefined,
      }),
  });

  const items: AgentResellerCredentialsDto[] = data?.data ?? [];

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(label);
      showSuccess('نسخ', 'تم النسخ إلى الحافظة.');
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      showError('نسخ', 'فشل النسخ.');
    }
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('ar-IQ', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  if (isLoading) return <WifiLoaderComponent />;
  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 text-red-700 dark:text-red-300">
          فشل تحميل بيانات اعتماديات الرسيلرز. تأكد من صلاحيات الأدمن.
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="flex items-center gap-2 mb-6">
        <UserCheck className="h-7 w-7 text-primary-600 dark:text-primary-400" />
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">اعتماديات الرسيلرز</h1>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
        قائمة رسيلرز الوكلاء (الرابط، اسم المستخدم، كلمة المرور). الترتيب من الأحدث أولاً. يمكن البحث باسم الرسيلر، وتصفية النتائج بحيث تظهر فقط اعتماديات الوكلاء الذين يحتوي اسم شركتهم على النص المدخل.
      </p>

      <div className="mb-4 flex flex-col sm:flex-row flex-wrap items-stretch sm:items-end gap-2">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">بحث باسم الرسيلر</label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                applyFilters();
              }
            }}
            placeholder="اسم الرسيلر..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white text-sm"
          />
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">فلترة باسم الوكيل / الشركة</label>
          <input
            type="text"
            value={agentNameFilter}
            onChange={(e) => setAgentNameFilter(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                applyFilters();
              }
            }}
            placeholder="مثال: خالد — يطابق اسم الشركة المعروض"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white text-sm"
          />
        </div>
        <button
          type="button"
          onClick={applyFilters}
          className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md text-sm font-medium shrink-0 sm:self-end"
        >
          بحث
        </button>
      </div>

      {items.length === 0 ? (
        <div className="rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-8 text-center text-gray-600 dark:text-gray-400">
          لا توجد اعتماديات رسيلرز.
        </div>
      ) : (
        <div className="wakeel-table-scroll">
          <table className="min-w-full text-right">
            <thead>
              <tr>
                <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  الوكيل
                </th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  اسم الرسيلر
                </th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  نوع الخدمة
                </th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  الرابط
                </th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  اسم المستخدم
                </th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  كلمة المرور
                </th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  تاريخ الإضافة
                </th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-24">
                  إجراءات
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => {
                const typeBadgeClass =
                  row.serviceType === ServiceType.Earthlink
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300'
                    : row.serviceType === ServiceType.Ftth
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300'
                      : row.serviceType === ServiceType.Zainfi || row.serviceType === ServiceType.Fiberx
                        ? 'bg-violet-100 text-violet-800 dark:bg-violet-900/20 dark:text-violet-300'
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300';
                return (
                  <tr key={row.resellerId} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white font-medium">
                      {row.agentName || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {row.name || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${typeBadgeClass}`}>
                        {formatServiceTypeLabelAr(row.serviceType)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 max-w-xs truncate" title={row.baseUrl}>
                      {row.baseUrl || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {row.username ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-700 dark:text-gray-300">
                      {row.password ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {row.createdAt ? formatDate(row.createdAt) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          type="button"
                          onClick={() => copyToClipboard(row.password ?? '', `pwd-${row.resellerId}`)}
                          className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-400"
                          title="نسخ كلمة المرور"
                        >
                          {copiedField === `pwd-${row.resellerId}` ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {data && (data.totalPages ?? 1) > 1 && (
        <div className="mt-4">
          <Pagination
            currentPage={data.currentPage ?? 1}
            totalPages={data.totalPages ?? 1}
            totalItems={data.totalItems ?? data.totalCount ?? 0}
            pageSize={data.pageSize ?? pageSize}
            hasNextPage={data.hasNextPage ?? false}
            hasPreviousPage={data.hasPreviousPage ?? false}
            onPageChange={(page) => setCurrentPage(page)}
          />
        </div>
      )}
    </div>
  );
};

export default ResellersPage;
