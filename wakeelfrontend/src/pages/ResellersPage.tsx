import React, { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiService, ApiService } from '../services/api';
import { AgentResellerCredentialsDto, ServiceType, formatServiceTypeLabelAr } from '../types';
import WifiLoaderComponent from '../components/WifiLoaderComponent';
import { UserCheck, Copy, Check, Code2, RefreshCw, X, Eye, EyeOff } from 'lucide-react';
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

  const [devSyncModalOpen, setDevSyncModalOpen] = useState(false);
  const [devSyncBaseUrl, setDevSyncBaseUrl] = useState('');
  const [devSyncUsername, setDevSyncUsername] = useState('');
  const [devSyncPassword, setDevSyncPassword] = useState('');
  const [devSyncResellerId, setDevSyncResellerId] = useState('');
  const [devSyncShowPassword, setDevSyncShowPassword] = useState(false);

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

  /** قائمة أوسع لاختيار الرسيلر في مودال المطور (بدون فلتر الصفحة الحالية) */
  const { data: allCredsForSelect } = useQuery({
    queryKey: ['resellers-credentials-dev-sync-options'],
    queryFn: () =>
      apiService.getResellersCredentials({
        page: 1,
        pageSize: 500,
      }),
    enabled: devSyncModalOpen,
    staleTime: 60_000,
  });

  const items = useMemo<AgentResellerCredentialsDto[]>(
    () => data?.data ?? [],
    [data?.data]
  );

  const sasDevSyncOptions = useMemo(() => {
    const source = allCredsForSelect?.data ?? items;
    return source.filter(
      (r) => r.serviceType === ServiceType.Sas || r.serviceType === ServiceType.Earthlink
    );
  }, [allCredsForSelect?.data, items]);

  const selectedDevReseller = useMemo(
    () => sasDevSyncOptions.find((r) => r.resellerId === devSyncResellerId) ?? null,
    [sasDevSyncOptions, devSyncResellerId]
  );

  const openDevSyncModal = () => {
    setDevSyncBaseUrl('');
    setDevSyncUsername('');
    setDevSyncPassword('');
    setDevSyncResellerId('');
    setDevSyncShowPassword(false);
    setDevSyncModalOpen(true);
  };

  const syncContractIdToFatMutation = useMutation({
    mutationFn: (payload: {
      resellerId: string;
      agentId?: string;
      baseUrl: string;
      username: string;
      password: string;
    }) => {
      const resellerId = payload.resellerId.trim();
      const baseUrl = payload.baseUrl.trim();
      const username = payload.username.trim();
      const password = payload.password;
      if (!resellerId) return Promise.reject(new Error('اختر الرسيلر الموجود في النظام.'));
      if (!baseUrl || !username || !password.trim()) {
        return Promise.reject(
          new Error('يلزم رابط الرسيلر واسم المستخدم وكلمة المرور لمزامنة مطور.')
        );
      }
      return apiService.syncContractIdToFat(resellerId, {
        baseUrl,
        username,
        password,
        agentId: payload.agentId,
      });
    },
    onSuccess: (result) => {
      if (result.error) {
        showError('مزامنة مطور', result.error);
        return;
      }
      const updated = result.updated ?? result.synced;
      const totalSas = result.totalFromSas ?? result.total;
      const parts = [
        result.message?.trim() || 'اكتملت مزامنة contract_id إلى Fat',
        updated != null ? `تم تحديث ${updated}` : null,
        result.skippedNoMatch != null ? `بدون مطابقة ${result.skippedNoMatch}` : null,
        result.matched != null ? `مطابقة ${result.matched}` : null,
        totalSas != null ? `إجمالي SAS ${totalSas}` : null,
      ].filter(Boolean);
      showSuccess('مزامنة مطور', parts.join(' — '));
      setDevSyncModalOpen(false);
    },
    onError: (err: unknown) => {
      showError('مزامنة مطور', ApiService.showError(err));
    },
  });

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
      <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
        <div className="flex items-center gap-2">
          <UserCheck className="h-7 w-7 text-primary-600 dark:text-primary-400" />
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">اعتماديات الرسيلرز</h1>
        </div>
        <button
          type="button"
          onClick={openDevSyncModal}
          disabled={syncContractIdToFatMutation.isPending}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-slate-700 hover:bg-slate-800 text-white disabled:opacity-50"
          title="مزامنة مطور عامة: إدخال اعتماديات SAS واختيار رسيلر لتحديث Fat من contract_id"
        >
          {syncContractIdToFatMutation.isPending ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Code2 className="h-4 w-4" />
          )}
          مزامنة مطور
        </button>
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
            onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
            placeholder="اسم الرسيلر..."
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
          />
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">تصفية باسم الوكيل</label>
          <input
            type="text"
            value={agentNameFilter}
            onChange={(e) => setAgentNameFilter(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
            placeholder="اسم الشركة..."
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
          />
        </div>
        <button
          type="button"
          onClick={applyFilters}
          className="px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm"
        >
          بحث
        </button>
      </div>

      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-600 p-8 text-center text-gray-500 dark:text-gray-400">
          لا توجد اعتماديات مطابقة.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800/80">
              <tr>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-300">الوكيل</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-300">الرسيلر</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-300">النوع</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-300">الرابط</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-300">المستخدم</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-300">كلمة المرور</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-300">أُنشئ</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-300">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
              {items.map((row) => {
                const typeBadgeClass =
                  row.serviceType === ServiceType.Earthlink
                    ? 'bg-teal-100 text-teal-800 dark:bg-teal-900/20 dark:text-teal-300'
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
                      <div className="flex flex-wrap items-center gap-1 justify-end">
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

      {devSyncModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-gray-200 dark:border-gray-700 px-5 py-4">
              <div className="flex items-center gap-2">
                <Code2 className="h-5 w-5 text-slate-700 dark:text-slate-200" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">مزامنة مطور</h3>
              </div>
              <button
                type="button"
                onClick={() => !syncContractIdToFatMutation.isPending && setDevSyncModalOpen(false)}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                aria-label="إغلاق"
                disabled={syncContractIdToFatMutation.isPending}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5 space-y-4 text-right">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                أدخل اعتماديات لوحة SAS، ثم اختر الرسيلر في النظام لمطابقة المشتركين وتحديث Fat من contract_id.
              </p>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">رابط الرسيلر *</label>
                <input
                  type="url"
                  value={devSyncBaseUrl}
                  onChange={(e) => setDevSyncBaseUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white"
                  disabled={syncContractIdToFatMutation.isPending}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">اسم المستخدم *</label>
                <input
                  type="text"
                  value={devSyncUsername}
                  onChange={(e) => setDevSyncUsername(e.target.value)}
                  autoComplete="username"
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white"
                  disabled={syncContractIdToFatMutation.isPending}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">كلمة المرور *</label>
                <div className="relative">
                  <input
                    type={devSyncShowPassword ? 'text' : 'password'}
                    value={devSyncPassword}
                    onChange={(e) => setDevSyncPassword(e.target.value)}
                    autoComplete="current-password"
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 pe-10 text-sm text-gray-900 dark:text-white"
                    disabled={syncContractIdToFatMutation.isPending}
                  />
                  <button
                    type="button"
                    onClick={() => setDevSyncShowPassword((v) => !v)}
                    className="absolute inset-y-0 left-2 flex items-center text-gray-500"
                    tabIndex={-1}
                  >
                    {devSyncShowPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  الرسيلر في النظام (لحفظ Fat) *
                </label>
                <select
                  value={devSyncResellerId}
                  onChange={(e) => setDevSyncResellerId(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white"
                  disabled={syncContractIdToFatMutation.isPending}
                >
                  <option value="">— اختر الرسيلر —</option>
                  {sasDevSyncOptions.map((r) => (
                    <option key={r.resellerId} value={r.resellerId}>
                      {r.agentName ? `${r.agentName} — ` : ''}
                      {r.name || r.resellerId} ({formatServiceTypeLabelAr(r.serviceType)})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-gray-200 dark:border-gray-700 px-5 py-4">
              <button
                type="button"
                onClick={() => setDevSyncModalOpen(false)}
                disabled={syncContractIdToFatMutation.isPending}
                className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 disabled:opacity-50"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() =>
                  syncContractIdToFatMutation.mutate({
                    resellerId: devSyncResellerId,
                    agentId: selectedDevReseller?.agentId,
                    baseUrl: devSyncBaseUrl,
                    username: devSyncUsername,
                    password: devSyncPassword,
                  })
                }
                disabled={syncContractIdToFatMutation.isPending || !devSyncResellerId}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-slate-700 hover:bg-slate-800 text-white disabled:opacity-50"
              >
                {syncContractIdToFatMutation.isPending ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Code2 className="h-4 w-4" />
                )}
                بدء المزامنة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResellersPage;
