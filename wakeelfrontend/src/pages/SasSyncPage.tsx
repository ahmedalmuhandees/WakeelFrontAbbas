import React, { useState, useRef, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiService } from '../services/api';
import { ApiService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { showSuccess, showError } from '../utils/notifications';
import { UserRole } from '../types';
import {
  SUBSCRIBER_FETCH_LIMIT_PRESETS,
  type SasOverviewDataItem,
  type SasSyncRequest,
  type SubscriberFetchLimitOption,
} from '../types';
import { RefreshCw, Key, Globe, User, Loader2, Shield, FileJson } from 'lucide-react';

const TOKEN_HINT =
  'إذا ظهر خطأ 500 أو فشل تسجيل الدخول إلى SAS، سجّل الدخول إلى لوحة SAS من المتصفح، ثم انسخ الـ Token من Network (طلب login) والصقه هنا.';

/** تحويل كائن من SAS (أي تسميات) إلى SasOverviewDataItem */
function normalizeOverviewItem(d: any): SasOverviewDataItem | null {
  if (!d || (d.id == null && d.Id == null)) return null;
  const id = Number(d.id ?? d.Id);
  const username = String(d.username ?? d.Username ?? '');
  const firstname = String(d.firstname ?? d.Firstname ?? '');
  const profile_Name = String(d.profile_Name ?? d.Profile_Name ?? d.profile_name ?? '');
  const password = String(d.password ?? d.Password ?? '');
  const phone = String(d.phone ?? d.Phone ?? '');
  const expiration = d.expiration ?? d.Expiration ?? '';
  return {
    id,
    username,
    firstname,
    profile_Name,
    password,
    phone,
    expiration: typeof expiration === 'string' ? expiration : String(expiration),
  };
}

const SasSyncPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === UserRole.Admin;
  const tokenInputRef = useRef<HTMLInputElement>(null);

  const [baseUrl, setBaseUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [showTokenTip, setShowTokenTip] = useState(false);
  const [jsonPaste, setJsonPaste] = useState('');
  const [syncFromJsonLoading, setSyncFromJsonLoading] = useState(false);
  const [maxSubscribersToFetch, setMaxSubscribersToFetch] = useState<number | null>(null);

  const { data: agentsData, isLoading: agentsLoading } = useQuery({
    queryKey: ['agents-for-sas'],
    queryFn: () => apiService.getAllAgents({ page: 1, pageSize: 500 }),
    enabled: isAdmin,
  });

  const agents = agentsData?.data ?? [];

  const { data: subscriberFetchLimitOptions = [] } = useQuery({
    queryKey: ['subscriber-fetch-limit-options'],
    queryFn: () => apiService.getSubscriberFetchLimitOptions(),
    staleTime: 60_000,
  });

  const limitSelectOptions = useMemo((): SubscriberFetchLimitOption[] => {
    if (subscriberFetchLimitOptions.length > 0) return subscriberFetchLimitOptions;
    return SUBSCRIBER_FETCH_LIMIT_PRESETS;
  }, [subscriberFetchLimitOptions]);

  const syncMutation = useMutation({
    mutationFn: () => {
      const request: SasSyncRequest = {
        baseUrl: baseUrl.trim(),
        username: username.trim(),
        password,
      };
      if (token.trim()) request.token = token.trim();
      if (maxSubscribersToFetch != null && maxSubscribersToFetch > 0) {
        request.maxSubscribersToFetch = maxSubscribersToFetch;
      }
      return apiService.syncFromSas(request, isAdmin ? selectedAgentId || undefined : undefined);
    },
    onSuccess: (data) => {
      setShowTokenTip(false);
      showSuccess('تمت المزامنة', `${data.message}. تم مزامنة ${data.synced} مشترك.`);
    },
    onError: (err: any) => {
      const msg = ApiService.showError(err);
      showError('خطأ في المزامنة', msg);
      const is500 = err?.response?.status === 500 || err?.originalError?.response?.status === 500;
      const isLoginFailure = /فشل تسجيل الدخول|500/.test(msg);
      if (is500 || isLoginFailure) {
        setShowTokenTip(true);
        setTimeout(() => tokenInputRef.current?.focus(), 300);
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!baseUrl.trim()) {
      showError('خطأ', 'يرجى إدخال عنوان SAS (Base URL)');
      return;
    }
    if (!username.trim()) {
      showError('خطأ', 'يرجى إدخال اسم المستخدم');
      return;
    }
    if (!password) {
      showError('خطأ', 'يرجى إدخال كلمة المرور');
      return;
    }
    if (isAdmin && !selectedAgentId) {
      showError('خطأ', 'يرجى اختيار الوكيل الذي تريد المزامنة لحسابه');
      return;
    }
    syncMutation.mutate();
  };

  const handleSyncFromJson = async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = jsonPaste.trim();
    if (!raw) {
      showError('خطأ', 'يرجى لصق مصفوفة المستخدمين (JSON).');
      return;
    }
    if (isAdmin && !selectedAgentId) {
      showError('خطأ', 'يرجى اختيار الوكيل الذي تريد المزامنة لحسابه');
      return;
    }
    setSyncFromJsonLoading(true);
    try {
      let parsed: any;
      try {
        parsed = JSON.parse(raw);
      } catch {
        showError('JSON غير صالح', 'المحتوى المُلصق ليس JSON صحيحاً.');
        setSyncFromJsonLoading(false);
        return;
      }
      const arr = Array.isArray(parsed) ? parsed : parsed?.data ?? parsed?.users ?? [];
      const users: SasOverviewDataItem[] = [];
      for (const item of arr) {
        const normalized = normalizeOverviewItem(item);
        if (normalized) users.push(normalized);
      }
      if (users.length === 0) {
        showError('لا بيانات', 'لم يُعثر على عناصر مستخدمين صالحة في JSON. تأكد من الشكل: مصفوفة من كائنات تحتوي id, username, firstname, profile_Name, password, phone, expiration.');
        setSyncFromJsonLoading(false);
        return;
      }
      const data = await apiService.syncFromSasData(
        { users },
        isAdmin ? selectedAgentId || undefined : undefined
      );
      showSuccess('تمت المزامنة', `${data.message}. تم مزامنة ${data.synced} مشترك.`);
      setJsonPaste('');
    } catch (err: any) {
      showError('خطأ', err?.message || ApiService.showError(err));
    } finally {
      setSyncFromJsonLoading(false);
    }
  };

  const isSubmitting = syncMutation.isPending;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <RefreshCw className="h-7 w-7 text-primary-500" />
          مزامنة من SAS
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          سحب المشتركين من نظام SAS ومزامنتهم مع Wakeel. أدخل بيانات الدخول إلى SAS ثم اختر الوكيل (للأدمن) واضغط مزامنة.
        </p>
      </div>

      <div className="max-w-xl">
        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-5">
          {isAdmin && (
            <div>
              <label htmlFor="agentId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                الوكيل (مطلوب للأدمن)
              </label>
              <select
                id="agentId"
                value={selectedAgentId}
                onChange={(e) => setSelectedAgentId(e.target.value)}
                required={isAdmin}
                className="block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                disabled={agentsLoading}
              >
                <option value="">-- اختر الوكيل --</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.companyName || a.fullName} ({a.username})
                  </option>
                ))}
              </select>
              {agentsLoading && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">جاري تحميل قائمة الوكلاء...</p>
              )}
            </div>
          )}

          <div>
            <label htmlFor="baseUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <span className="flex items-center gap-1">
                <Globe className="h-4 w-4" />
                عنوان SAS (Base URL)
              </span>
            </label>
            <input
              id="baseUrl"
              type="url"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="مثال: http://94.176.182.184"
              className="block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm placeholder-gray-400"
            />
          </div>

          <div>
            <label htmlFor="sasUsername" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <span className="flex items-center gap-1">
                <User className="h-4 w-4" />
                اسم المستخدم في SAS
              </span>
            </label>
            <input
              id="sasUsername"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="مثال: yahya"
              className="block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm placeholder-gray-400"
            />
          </div>

          <div>
            <label htmlFor="sasPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <span className="flex items-center gap-1">
                <Key className="h-4 w-4" />
                كلمة المرور في SAS
              </span>
            </label>
            <input
              id="sasPassword"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="كلمة المرور"
              className="block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm placeholder-gray-400"
            />
          </div>

          <div>
            <label htmlFor="sasToken" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <span className="flex items-center gap-1">
                <Shield className="h-4 w-4" />
                رمز SAS / Token <span className="text-gray-500 font-normal">(اختياري)</span>
              </span>
            </label>
            <input
              ref={tokenInputRef}
              id="sasToken"
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="إذا فشل تسجيل الدخول من السيرفر، الصق الـ Token هنا"
              className="block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm placeholder-gray-400"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {TOKEN_HINT}
            </p>
            {showTokenTip && (
              <div className="mt-2 p-3 rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-sm">
                جرّب إدخال رمز SAS (Token) بعد تسجيل الدخول إلى SAS من المتصفح ونسخه من Network.
              </div>
            )}
          </div>

          <div>
            <label htmlFor="maxSubscribersFetch" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              حد أقصى لعدد المشتركين المسحوبين (اختياري)
            </label>
            <select
              id="maxSubscribersFetch"
              value={maxSubscribersToFetch === null ? '__all__' : String(maxSubscribersToFetch)}
              onChange={(e) => {
                const v = e.target.value;
                if (v === '__all__') setMaxSubscribersToFetch(null);
                else setMaxSubscribersToFetch(Number(v));
              }}
              className="block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            >
              {limitSelectOptions.map((opt, i) => (
                <option key={`${opt.label}-${String(opt.value)}-${i}`} value={opt.value === null ? '__all__' : String(opt.value)}>
                  {opt.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              «الكل» = سحب كامل القائمة. القيم من الخادم عند توفرها.
            </p>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || (isAdmin && agentsLoading)}
            className="inline-flex items-center gap-2 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                جاري المزامنة...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                مزامنة المشتركين
              </>
            )}
          </button>
        </form>

        {/* استيراد من JSON — بعد الحصول على البيانات من SAS (postMessage أو نسخ) */}
        <form
          onSubmit={handleSyncFromJson}
          className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-5 border-t-4 border-t-primary-500"
        >
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <FileJson className="h-5 w-5 text-primary-500" />
            استيراد من JSON
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            افتح SAS في iframe أو نافذة جديدة، سجّل الدخول واذهب إلى صفحة المستخدمين. احصل على مصفوفة المستخدمين عبر postMessage (إن كنت تتحكم في SAS) أو نسخ الـ response، ثم الصق هنا مصفوفة JSON من كائنات تحتوي: <code className="text-xs bg-gray-100 dark:bg-gray-700 px-1 rounded">id, username, firstname, profile_Name, password, phone, expiration</code> واضغط مزامنة.
          </p>

          {isAdmin && (
            <div>
              <label htmlFor="agentIdJson" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                الوكيل (مطلوب للأدمن)
              </label>
              <select
                id="agentIdJson"
                value={selectedAgentId}
                onChange={(e) => setSelectedAgentId(e.target.value)}
                required={isAdmin}
                className="block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                disabled={agentsLoading}
              >
                <option value="">-- اختر الوكيل --</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.companyName || a.fullName} ({a.username})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label htmlFor="jsonPaste" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              مصفوفة المستخدمين (JSON)
            </label>
            <textarea
              id="jsonPaste"
              rows={8}
              value={jsonPaste}
              onChange={(e) => setJsonPaste(e.target.value)}
              placeholder='[{"id":1,"username":"user1","firstname":"اسم","profile_Name":"باقة","password":"...","phone":"07...","expiration":"2025-03-01 00:00:00"},...]'
              className="block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm placeholder-gray-400"
            />
          </div>

          <button
            type="submit"
            disabled={syncFromJsonLoading || (isAdmin && agentsLoading)}
            className="inline-flex items-center gap-2 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {syncFromJsonLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                جاري المزامنة...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                مزامنة من JSON
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default SasSyncPage;
