import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { apiService, ApiService } from '../services/api';
import { showSuccess, showError } from '../utils/notifications';
import { useConfirmation } from '../contexts/ConfirmationContext';
import { useDigits } from '../contexts/DigitsContext';
import { Agent, AgentsListResponse } from '../types';
import Pagination from '../components/Pagination';
import WifiLoaderComponent from '../components/WifiLoaderComponent';
import {
  Building2,
  Plus,
  Search,
  Edit,
  Trash2,
  Users,
  RefreshCw,
  CreditCard,
  Calendar,
  MoreHorizontal,
} from 'lucide-react';

const MainAgentSubAgentsPage: React.FC = () => {
  const { confirmDelete } = useConfirmation();
  const { formatDate } = useDigits();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [appliedSearchTerm, setAppliedSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  const { data: response, error, isLoading } = useQuery<AgentsListResponse>({
    queryKey: ['main-agent-sub-agents', currentPage, pageSize, appliedSearchTerm],
    queryFn: () =>
      apiService.getMainAgentSubAgents({
        page: currentPage,
        pageSize,
        searchTerm: appliedSearchTerm.trim() || undefined,
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiService.deleteMainAgentSubAgent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['main-agent-sub-agents'] });
      setOpenDropdownId(null);
      showSuccess('تم الحذف', 'تم حذف الوكيل الفرعي بنجاح');
    },
    onError: (err: unknown) => {
      showError('خطأ', ApiService.showError(err));
    },
  });

  const agents = response?.data ?? [];
  const totalPages = response?.totalPages ?? 1;
  const totalCount = response?.totalCount ?? 0;
  const currentPageVal = response?.pageNumber ?? response?.currentPage ?? currentPage;
  const hasNextPage = currentPageVal < totalPages;
  const hasPreviousPage = currentPageVal > 1;

  const handleSearch = () => {
    setAppliedSearchTerm(searchTerm.trim());
    setCurrentPage(1);
  };

  const handleDelete = async (agent: Agent) => {
    const confirmed = await confirmDelete(`الوكيل الفرعي "${agent.companyName || agent.fullName}"`);
    if (confirmed) deleteMutation.mutate(agent.id);
    setOpenDropdownId(null);
  };

  const subscriptionEndDisplay = (agent: Agent) => {
    if (!agent.subscriptionEndDate) return '—';
    return formatDate(new Date(agent.subscriptionEndDate));
  };

  if (isLoading) return <WifiLoaderComponent />;
  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 text-red-700 dark:text-red-300">
          فشل تحميل قائمة الوكلاء الفرعيين. تأكد من صلاحيات الوكيل الرئيسي.
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="flex items-center gap-2 mb-6">
        <Building2 className="h-7 w-7 text-primary-600 dark:text-primary-400" />
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">المكاتب الفرعية</h1>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        قائمة المكاتب الفرعية. يمكنك إنشاء مكتب فرعي، تعديله، حذفه، وعرض المشتركين والتفعيلات والفواتير والديون والحسابات.
      </p>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="بحث بالاسم أو الشركة..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white text-sm"
          />
        </div>
        <button
          type="button"
          onClick={handleSearch}
          className="px-3 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md text-sm font-medium inline-flex items-center gap-1"
        >
          <Search className="h-4 w-4" />
          بحث
        </button>
        <Link
          to="/admin/main-agent/sub-agents/new"
          className="px-3 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md text-sm font-medium inline-flex items-center gap-1"
        >
          <Plus className="h-4 w-4" />
          إضافة وكيل فرعي
        </Link>
      </div>

      {agents.length === 0 ? (
        <div className="rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-8 text-center text-gray-600 dark:text-gray-400">
          لا يوجد وكلاء فرعيون. استخدم «إضافة وكيل فرعي» لإنشاء أول وكيل.
        </div>
      ) : (
        <div className="wakeel-table-scroll">
          <table className="min-w-full text-right">
            <thead>
              <tr>
                <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">الشركة / الاسم</th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">اسم المستخدم</th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">الهاتف</th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">انتهاء الاشتراك</th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((agent) => (
                <tr key={agent.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                    {agent.companyName || agent.fullName || '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{agent.username || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{agent.phone || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{subscriptionEndDisplay(agent)}</td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex flex-wrap items-center gap-1 justify-end">
                      <Link
                        to={`/admin/main-agent/sub-agents/subscribers?agentId=${agent.id}`}
                        className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-400"
                        title="المشتركين"
                      >
                        <Users className="h-4 w-4" />
                      </Link>
                      <Link
                        to={`/admin/main-agent/sub-agents/renewals?agentId=${agent.id}`}
                        className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-400"
                        title="التفعيلات"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Link>
                      <Link
                        to={`/admin/main-agent/sub-agents/debts?agentId=${agent.id}`}
                        className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-400"
                        title="الديون"
                      >
                        <CreditCard className="h-4 w-4" />
                      </Link>
                      <Link
                        to={`/admin/main-agent/sub-agents/daily-account?agentId=${agent.id}`}
                        className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-400"
                        title="الحسابات"
                      >
                        <Calendar className="h-4 w-4" />
                      </Link>
                      <Link
                        to={`/admin/main-agent/sub-agents/${agent.id}/edit`}
                        className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-400"
                        title="تعديل"
                      >
                        <Edit className="h-4 w-4" />
                      </Link>
                      <div className="relative inline-block">
                        <button
                          type="button"
                          onClick={() => setOpenDropdownId(openDropdownId === agent.id ? null : agent.id)}
                          className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-400"
                          aria-label="المزيد"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                        {openDropdownId === agent.id && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setOpenDropdownId(null)} aria-hidden="true" />
                            <div className="absolute left-0 top-full mt-1 z-20 py-1 w-40 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
                              <button
                                type="button"
                                onClick={() => handleDelete(agent)}
                                className="w-full px-3 py-2 text-right text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 justify-end"
                              >
                                <Trash2 className="h-4 w-4" />
                                حذف
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
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
    </div>
  );
};

export default MainAgentSubAgentsPage;
