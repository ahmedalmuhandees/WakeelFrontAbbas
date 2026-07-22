import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { useDigits } from '../contexts/DigitsContext';
import { apiService, ApiService } from '../services/api';
import {
  ACTIVITY_TYPE_LABELS_AR,
  ActivityLogActivityTypeOption,
  ActivityType,
  Agent,
  PaginatedResponse,
  ActivityLogItem,
  UserRole,
} from '../types';
import { showError } from '../utils/notifications';
import WifiLoaderComponent from '../components/WifiLoaderComponent';
import Pagination from '../components/Pagination';
import { Filter, RefreshCw, ScrollText } from 'lucide-react';

const PAGE_SIZE = 20;
const ACTIVITY_LOG_AGENT_STORAGE_KEY = 'activityLogSelectedAgentId';

const FALLBACK_ACTIVITY_TYPE_OPTIONS: ActivityLogActivityTypeOption[] = [
  ActivityType.ActivateSubscriber,
  ActivityType.AddSubscriber,
  ActivityType.DeleteSubscriber,
  ActivityType.UpdateSubscriber,
  ActivityType.PayDebt,
  ActivityType.MaterialDisbursement,
  ActivityType.MaterialReturn,
  ActivityType.AddProfile,
  ActivityType.UpdateProfile,
  ActivityType.DeleteProfile,
  ActivityType.BalanceTopUp,
  ActivityType.BalanceUpdate,
  ActivityType.BalanceDelete,
  ActivityType.CustomerInvoiceJournalEntry,
].map((t) => ({ value: t, name: ACTIVITY_TYPE_LABELS_AR[t] }));

function ActivityLogSubscriberCell({ row }: { row: ActivityLogItem }) {
  const subName = (row.subscriberName || '').trim();
  const subUser = (row.subscriberUsername || '').trim();
  if (!subName && !subUser) return <>—</>;
  if (subName && subUser) {
    return (
      <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
        <span className="font-medium text-gray-900 dark:text-white">{subName}</span>
        <span className="text-gray-400 dark:text-gray-500" aria-hidden>
          ·
        </span>
        <span className="text-gray-700 dark:text-gray-300 tabular-nums">{subUser}</span>
      </span>
    );
  }
  return <span className="text-gray-900 dark:text-white">{subName || subUser}</span>;
}

const SystemLogPage: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const { formatDate } = useDigits();
  const isAdmin = user?.role === UserRole.Admin;

  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [page, setPage] = useState(1);

  const [draftSubscriberName, setDraftSubscriberName] = useState('');
  const [draftActivityType, setDraftActivityType] = useState<string>('');
  const [draftFromDate, setDraftFromDate] = useState('');
  const [draftToDate, setDraftToDate] = useState('');

  const [appliedSubscriberName, setAppliedSubscriberName] = useState('');
  const [appliedActivityType, setAppliedActivityType] = useState<string>('');
  const [appliedFromDate, setAppliedFromDate] = useState('');
  const [appliedToDate, setAppliedToDate] = useState('');

  const { data: agentsResponse } = useQuery({
    queryKey: ['allAgents', 'system-log'],
    queryFn: () => apiService.getAllAgents({ page: 1, pageSize: 5000 }),
    enabled: isAuthenticated && isAdmin,
    retry: false,
  });
  const adminAgents = (agentsResponse?.data ?? []) as Agent[];

  const { data: activityTypesFromApi = [] } = useQuery({
    queryKey: ['activity-log-activity-types'],
    queryFn: () => apiService.getActivityLogActivityTypes(),
    enabled: isAuthenticated,
    staleTime: 60 * 60 * 1000,
    retry: 1,
  });

  const activityTypeFilterOptions = useMemo((): ActivityLogActivityTypeOption[] => {
    if (activityTypesFromApi.length > 0) return activityTypesFromApi;
    return FALLBACK_ACTIVITY_TYPE_OPTIONS;
  }, [activityTypesFromApi]);

  useEffect(() => {
    if (!isAdmin) return;
    if (!adminAgents.length) return;
    const saved = localStorage.getItem(ACTIVITY_LOG_AGENT_STORAGE_KEY);
    if (saved && adminAgents.some((a) => a.id === saved)) {
      setSelectedAgentId(saved);
    } else {
      setSelectedAgentId(adminAgents[0].id);
    }
  }, [isAdmin, adminAgents.length]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isAdmin || !selectedAgentId) return;
    localStorage.setItem(ACTIVITY_LOG_AGENT_STORAGE_KEY, selectedAgentId);
  }, [isAdmin, selectedAgentId]);

  const activityTypeParam = useMemo((): ActivityType | undefined => {
    if (appliedActivityType === '') return undefined;
    const n = Number(appliedActivityType);
    return Number.isFinite(n) ? (n as ActivityType) : undefined;
  }, [appliedActivityType]);

  const listEnabled =
    isAuthenticated && (!isAdmin || !!selectedAgentId);

  const activityQueryKey = [
    'activity-log',
    isAdmin ? selectedAgentId : 'me',
    page,
    PAGE_SIZE,
    activityTypeParam ?? null,
    appliedSubscriberName.trim(),
    appliedFromDate,
    appliedToDate,
  ] as const;

  const {
    data: logData,
    error,
    isLoading,
    isFetching,
    refetch,
  } = useQuery<PaginatedResponse<ActivityLogItem>>({
    queryKey: activityQueryKey,
    queryFn: () =>
      apiService.getActivityLog({
        page,
        pageSize: PAGE_SIZE,
        agentId: isAdmin ? selectedAgentId : undefined,
        activityType: activityTypeParam,
        subscriberName: appliedSubscriberName.trim() || undefined,
        fromDate: appliedFromDate || undefined,
        toDate: appliedToDate || undefined,
      }),
    enabled: listEnabled,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (!error) return;
    showError('سجل النظام', ApiService.showError(error));
  }, [error]);

  const handleApplyFilters = () => {
    setAppliedSubscriberName(draftSubscriberName);
    setAppliedActivityType(draftActivityType);
    setAppliedFromDate(draftFromDate);
    setAppliedToDate(draftToDate);
    setPage(1);
  };

  const handleResetFilters = () => {
    setDraftSubscriberName('');
    setDraftActivityType('');
    setDraftFromDate('');
    setDraftToDate('');
    setAppliedSubscriberName('');
    setAppliedActivityType('');
    setAppliedFromDate('');
    setAppliedToDate('');
    setPage(1);
  };

  const rows = logData?.data ?? [];

  if (!isAuthenticated) {
    return (
      <div className="p-6">
        <p className="text-center text-gray-600 dark:text-gray-400">يرجى تسجيل الدخول.</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-[1400px] mx-auto space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-200">
            <ScrollText className="h-6 w-6" aria-hidden />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">سجل النظام</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              تتبع عمليات المشتركين والباقات والمواد حسب الصلاحيات
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void refetch()}
          disabled={!listEnabled || isFetching}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          تحديث
        </button>
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-gray-100">
          <Filter className="h-4 w-4 text-primary-600 dark:text-primary-400" />
          الفلاتر
        </div>

        {isAdmin && (
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">الوكيل</label>
            <select
              value={selectedAgentId}
              onChange={(e) => {
                setSelectedAgentId(e.target.value);
                setPage(1);
              }}
              className="w-full sm:max-w-md rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
            >
              {adminAgents.map((a) => (
                <option key={a.id} value={a.id}>
                  {(a.companyName || a.fullName || a.username).trim() || a.id}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              يجب اختيار وكيل لعرض السجل (مطلوب للمسؤول).
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">نوع النشاط</label>
            <select
              value={draftActivityType}
              onChange={(e) => setDraftActivityType(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
            >
              <option value="">كل الأنواع</option>
              {activityTypeFilterOptions.map((opt) => (
                <option key={opt.value} value={String(opt.value)}>
                  {opt.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">اسم المشترك (بحث)</label>
            <input
              type="text"
              value={draftSubscriberName}
              onChange={(e) => setDraftSubscriberName(e.target.value)}
              placeholder="اختياري"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">من تاريخ</label>
            <input
              type="date"
              value={draftFromDate}
              onChange={(e) => setDraftFromDate(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">إلى تاريخ</label>
            <input
              type="date"
              value={draftToDate}
              onChange={(e) => setDraftToDate(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 justify-end">
          <button
            type="button"
            onClick={handleResetFilters}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            مسح الفلاتر
          </button>
          <button
            type="button"
            onClick={handleApplyFilters}
            disabled={!listEnabled}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-primary-600 hover:bg-primary-700 text-white disabled:opacity-50"
          >
            تطبيق
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden shadow-sm relative min-h-[200px]">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 dark:bg-gray-900/50">
            <WifiLoaderComponent />
          </div>
        )}
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">السجلات</h2>
        </div>
        <div className="wakeel-table-scroll">
          <table className="min-w-full text-right">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/30">
                <th className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">النشاط</th>
                <th className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">من نفّذ</th>
                <th className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">المستخدم</th>
                <th className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">المشترك</th>
                <th className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 min-w-[200px]">التفاصيل</th>
                <th className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {!listEnabled ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-sm text-gray-500 dark:text-gray-400 text-center">
                    اختر وكيلاً لعرض السجل.
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-sm text-gray-500 dark:text-gray-400 text-center">
                    لا توجد سجلات مطابقة.
                  </td>
                </tr>
              ) : (
                rows.map((row, idx) => (
                  <tr
                    key={row.id ?? `${row.createdAt}-${idx}`}
                    className="border-b border-gray-100 dark:border-gray-700/80 hover:bg-gray-50/80 dark:hover:bg-gray-700/40"
                  >
                    <td className="px-3 py-2 text-sm text-gray-900 dark:text-white max-w-[200px]" title={row.activityTypeName}>
                      {row.activityTypeName?.trim() ||
                        activityTypeFilterOptions.find((o) => o.value === row.activityType)?.name ||
                        ACTIVITY_TYPE_LABELS_AR[row.activityType as ActivityType] ||
                        '—'}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900 dark:text-white max-w-[160px] truncate" title={row.actorName}>
                      {row.actorName || '—'}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-800 dark:text-gray-200 max-w-[140px] truncate" title={row.actorUsername}>
                      {row.actorUsername || '—'}
                    </td>
                    <td
                      className="px-3 py-2 text-sm text-gray-800 dark:text-gray-200 max-w-[240px]"
                      title={[row.subscriberName, row.subscriberUsername].filter(Boolean).join(' — ')}
                    >
                      <ActivityLogSubscriberCell row={row} />
                    </td>
                    <td
                      className="px-3 py-2 text-sm text-gray-800 dark:text-gray-200 max-w-[320px]"
                      title={row.details || undefined}
                    >
                      {row.details?.trim() ? (
                        <span className="line-clamp-2 break-words">{row.details.trim()}</span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-800 dark:text-gray-200 whitespace-nowrap tabular-nums">
                      {row.createdAt ? formatDate(row.createdAt, { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {listEnabled && (logData?.totalItems ?? 0) > 0 && (
          <Pagination
            currentPage={logData?.currentPage ?? page}
            totalPages={logData?.totalPages ?? 1}
            totalItems={logData?.totalItems ?? 0}
            pageSize={logData?.pageSize ?? PAGE_SIZE}
            hasNextPage={logData?.hasNextPage ?? false}
            hasPreviousPage={logData?.hasPreviousPage ?? false}
            onPageChange={setPage}
          />
        )}
      </div>
    </div>
  );
};

export default SystemLogPage;
