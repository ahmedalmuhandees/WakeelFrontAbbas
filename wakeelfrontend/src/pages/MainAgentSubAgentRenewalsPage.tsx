import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '../services/api';
import { useDigits } from '../contexts/DigitsContext';
import Pagination from '../components/Pagination';
import WifiLoaderComponent from '../components/WifiLoaderComponent';
import { RefreshCw, ChevronRight } from 'lucide-react';

const MainAgentSubAgentRenewalsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const agentIdFromUrl = searchParams.get('agentId') ?? '';
  const [selectedAgentId, setSelectedAgentId] = useState(agentIdFromUrl);
  const { formatNumber, formatDate } = useDigits();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  useEffect(() => {
    if (agentIdFromUrl && !selectedAgentId) setSelectedAgentId(agentIdFromUrl);
  }, [agentIdFromUrl, selectedAgentId]);

  const { data: subAgentsResponse } = useQuery({
    queryKey: ['main-agent-sub-agents-list'],
    queryFn: () => apiService.getMainAgentSubAgents({ page: 1, pageSize: 200 }),
  });
  const subAgents = subAgentsResponse?.data ?? [];

  const { data: response, error, isLoading } = useQuery({
    queryKey: ['main-agent-sub-agent-renewals', selectedAgentId, currentPage, pageSize, fromDate, toDate],
    queryFn: () =>
      apiService.getMainAgentSubAgentRenewals(selectedAgentId, {
        page: currentPage,
        pageSize,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      }),
    enabled: !!selectedAgentId,
  });

  const receipts = (response as { data?: unknown[] })?.data ?? [];
  const list = Array.isArray(receipts) ? receipts : [];
  const totalPages = (response as { totalPages?: number })?.totalPages ?? 1;
  const totalCount = (response as { totalCount?: number })?.totalCount ?? (response as { totalItems?: number })?.totalItems ?? 0;
  const currentPageVal = (response as { currentPage?: number })?.currentPage ?? (response as { pageNumber?: number })?.pageNumber ?? currentPage;
  const hasNextPage = currentPageVal < totalPages;
  const hasPreviousPage = currentPageVal > 1;

  const handleAgentChange = (id: string) => {
    setSelectedAgentId(id);
    setCurrentPage(1);
    if (id) setSearchParams({ agentId: id });
    else setSearchParams({});
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="flex items-center gap-2 mb-6">
        <Link to="/admin/main-agent/sub-agents" className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
          <ChevronRight className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        </Link>
        <RefreshCw className="h-7 w-7 text-primary-600 dark:text-primary-400" />
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">التفعيلات والفواتير</h1>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">اختر الوكيل الفرعي:</label>
        <select
          value={selectedAgentId}
          onChange={(e) => handleAgentChange(e.target.value)}
          className="min-w-[220px] px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white text-sm"
        >
          <option value="">— اختر وكيلاً —</option>
          {subAgents.map((a) => (
            <option key={a.id} value={a.id}>
              {a.companyName || a.fullName || a.username}
            </option>
          ))}
        </select>
      </div>

      {!selectedAgentId ? (
        <div className="rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-8 text-center text-gray-600 dark:text-gray-400">
          اختر وكيلاً فرعياً من القائمة أعلاه لعرض التفعيلات.
        </div>
      ) : isLoading ? (
        <WifiLoaderComponent />
      ) : error ? (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 text-red-700 dark:text-red-300">
          فشل تحميل تفعيلات الوكيل الفرعي.
        </div>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white text-sm"
            />
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white text-sm"
            />
          </div>

          {list.length === 0 ? (
            <div className="rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-8 text-center text-gray-600 dark:text-gray-400">
              لا توجد تفعيلات في النطاق المحدد.
            </div>
          ) : (
            <div className="wakeel-table-scroll">
              <table className="min-w-full text-right">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">رقم الإيصال</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">المشترك</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">المبلغ</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">التاريخ</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((r: any) => (
                    <tr key={r.id || r.receiptNumber} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{r.receiptNumber ?? '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{r.subscriberName ?? '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{formatNumber(r.amountPaid ?? r.finalPrice ?? 0)}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {r.renewalDate || r.createdAt ? formatDate(new Date(r.renewalDate || r.createdAt)) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="mt-4">
              <Pagination
                currentPage={currentPageVal}
                totalPages={totalPages}
                totalItems={totalCount}
                pageSize={pageSize}
                hasNextPage={hasNextPage}
                hasPreviousPage={hasPreviousPage}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MainAgentSubAgentRenewalsPage;
