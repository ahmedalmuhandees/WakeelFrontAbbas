import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '../services/api';
import { useDigits } from '../contexts/DigitsContext';
import WifiLoaderComponent from '../components/WifiLoaderComponent';
import { Calendar, ChevronRight } from 'lucide-react';

const MainAgentSubAgentDailyAccountPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const agentIdFromUrl = searchParams.get('agentId') ?? '';
  const [selectedAgentId, setSelectedAgentId] = useState(agentIdFromUrl);
  const { formatNumber } = useDigits();
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);

  useEffect(() => {
    if (agentIdFromUrl && !selectedAgentId) setSelectedAgentId(agentIdFromUrl);
  }, [agentIdFromUrl, selectedAgentId]);

  const { data: subAgentsResponse } = useQuery({
    queryKey: ['main-agent-sub-agents-list'],
    queryFn: () => apiService.getMainAgentSubAgents({ page: 1, pageSize: 200 }),
  });
  const subAgents = subAgentsResponse?.data ?? [];

  const { data: dailyAccount, error, isLoading } = useQuery({
    queryKey: ['main-agent-sub-agent-daily-account', selectedAgentId, date],
    queryFn: () => apiService.getMainAgentSubAgentDailyAccount(selectedAgentId, date),
    enabled: !!selectedAgentId && !!date,
  });

  const handleAgentChange = (id: string) => {
    setSelectedAgentId(id);
    if (id) setSearchParams({ agentId: id });
    else setSearchParams({});
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="flex items-center gap-2 mb-6">
        <Link to="/admin/main-agent/sub-agents" className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
          <ChevronRight className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        </Link>
        <Calendar className="h-7 w-7 text-primary-600 dark:text-primary-400" />
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">الحسابات</h1>
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
          اختر مكتباً فرعياً من القائمة أعلاه لعرض الحسابات.
        </div>
      ) : isLoading ? (
        <WifiLoaderComponent />
      ) : error ? (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 text-red-700 dark:text-red-300">
          فشل تحميل الحسابات.
        </div>
      ) : (
        <>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">التاريخ</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
            />
          </div>

          {!dailyAccount ? (
            <div className="rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-8 text-center text-gray-600 dark:text-gray-400">
              لا توجد بيانات للحساب اليومي في هذا التاريخ.
            </div>
          ) : (
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow overflow-hidden">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 p-6 border-b border-gray-200 dark:border-gray-700">
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">الوارد الكلي (بعد السلف)</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{formatNumber(dailyAccount.incomingTotal ?? 0)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">إجمالي المبيعات</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{formatNumber(dailyAccount.salesTotal ?? dailyAccount.incomingTotal ?? 0)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">مدفوعات الديون</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{formatNumber(dailyAccount.dailyDebtPayments ?? 0)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">سلف الموظفين</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{formatNumber(dailyAccount.dailySalaryAdvancesTotal ?? 0)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">إجمالي الديون</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{formatNumber(dailyAccount.debtTotal ?? 0)}</p>
                </div>
              </div>
              {dailyAccount.handovers && dailyAccount.handovers.length > 0 && (
                <div className="p-6">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">التسليمات</h3>
                  <ul className="space-y-2">
                    {dailyAccount.handovers.map((h: any) => (
                      <li key={h.id} className="flex justify-between items-center text-sm text-gray-600 dark:text-gray-400">
                        <span>{h.handedByName} → {h.receivedByName}</span>
                        <span className="font-medium text-gray-900 dark:text-white">{formatNumber(h.amount ?? 0)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MainAgentSubAgentDailyAccountPage;
