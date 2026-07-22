import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '../services/api';
import { useDigits } from '../contexts/DigitsContext';
import { DebtsListParams } from '../types';
import Pagination from '../components/Pagination';
import WifiLoaderComponent from '../components/WifiLoaderComponent';
import { CreditCard, ChevronRight } from 'lucide-react';

const MainAgentSubAgentDebtsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const agentIdFromUrl = searchParams.get('agentId') ?? '';
  const [selectedAgentId, setSelectedAgentId] = useState(agentIdFromUrl);
  const { formatNumber, formatDate } = useDigits();
  const [searchTerm, setSearchTerm] = useState('');
  const [appliedSearchTerm, setAppliedSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);

  useEffect(() => {
    if (agentIdFromUrl && !selectedAgentId) setSelectedAgentId(agentIdFromUrl);
  }, [agentIdFromUrl, selectedAgentId]);

  const { data: subAgentsResponse } = useQuery({
    queryKey: ['main-agent-sub-agents-list'],
    queryFn: () => apiService.getMainAgentSubAgents({ page: 1, pageSize: 200 }),
  });
  const subAgents = subAgentsResponse?.data ?? [];

  const params: DebtsListParams = {
    page: currentPage,
    pageSize,
    searchTerm: appliedSearchTerm.trim() || undefined,
  };

  const { data: response, error, isLoading } = useQuery({
    queryKey: ['main-agent-sub-agent-debts', selectedAgentId, currentPage, pageSize, appliedSearchTerm],
    queryFn: () => apiService.getMainAgentSubAgentDebts(selectedAgentId, params),
    enabled: !!selectedAgentId,
  });

  const debts = response?.data ?? [];
  const totalPages = response?.totalPages ?? 1;
  const totalCount = response?.totalCount ?? 0;
  const totalDebtAmount = response?.totalDebtAmount ?? 0;
  const currentPageVal = response?.pageNumber ?? response?.currentPage ?? currentPage;
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
        <CreditCard className="h-7 w-7 text-primary-600 dark:text-primary-400" />
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">الديون</h1>
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
          اختر وكيلاً فرعياً من القائمة أعلاه لعرض الديون.
        </div>
      ) : isLoading ? (
        <WifiLoaderComponent />
      ) : error ? (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 text-red-700 dark:text-red-300">
          فشل تحميل ديون الوكيل الفرعي.
        </div>
      ) : (
        <>
          {totalDebtAmount > 0 && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              إجمالي الديون المعروضة: {formatNumber(totalDebtAmount)} د.ع
            </p>
          )}

          <div className="mb-4 flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (setAppliedSearchTerm(searchTerm.trim()), setCurrentPage(1))}
              placeholder="بحث..."
              className="flex-1 min-w-[200px] px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white text-sm"
            />
            <button
              type="button"
              onClick={() => { setAppliedSearchTerm(searchTerm.trim()); setCurrentPage(1); }}
              className="px-3 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md text-sm font-medium"
            >
              بحث
            </button>
          </div>

          {debts.length === 0 ? (
            <div className="rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-8 text-center text-gray-600 dark:text-gray-400">
              لا توجد ديون.
            </div>
          ) : (
            <div className="wakeel-table-scroll">
              <table className="min-w-full text-right">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">المشترك</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">المبلغ</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">الحالة</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">تاريخ الاستحقاق</th>
                  </tr>
                </thead>
                <tbody>
                  {debts.map((d: any) => (
                    <tr key={d.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{d.subscriberName ?? d.agentName ?? '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{formatNumber(d.amount ?? d.totalAmount ?? 0)}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{d.isPaid ? 'مسدّد' : 'غير مسدّد'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {d.dueDate ? formatDate(new Date(d.dueDate)) : '—'}
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

export default MainAgentSubAgentDebtsPage;
