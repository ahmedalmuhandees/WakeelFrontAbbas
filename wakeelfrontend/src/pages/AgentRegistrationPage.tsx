import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Eye, EyeOff, AlertTriangle, Loader2 } from 'lucide-react';
import { apiService, ApiService } from '../services/api';
import {
  ZAINFI_DEFAULT_BASE_URL,
  FIBERX_DEFAULT_BASE_URL,
  type AgentRegistrationRequest,
  type AgentRegistrationServiceType,
} from '../types';

const SERVICE_OPTIONS: { value: AgentRegistrationServiceType; label: string }[] = [
  { value: 'ftth', label: 'FTTH' },
  { value: 'sas', label: 'SAS' },
  { value: 'earthlink', label: 'Earthlink' },
  { value: 'zainfi', label: 'Zain Fi²' },
  { value: 'fiberx', label: 'FiberX' },
];

function normalizePhoneDigits(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, 11);
}

/** كلمة المرور الافتراضية يثبتها الباكند */
const FIXED_LOGIN_PASSWORD = '12345';

/** يُضاف اللاحقة @wkt تلقائياً إن لم تكن موجودة */
function ensureWktSuffix(raw: string): string {
  const t = raw.trim();
  if (!t) return '';
  if (t.toLowerCase().endsWith('@wkt')) return t;
  return `${t}@wkt`;
}
const AgentRegistrationPage: React.FC = () => {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [serviceType, setServiceType] = useState<AgentRegistrationServiceType>('ftth');
  const [resellerBaseUrl, setResellerBaseUrl] = useState('');
  const [resellerUsername, setResellerUsername] = useState('');
  const [resellerPassword, setResellerPassword] = useState('');
  const [showResellerPw, setShowResellerPw] = useState(false);
  const [loginUsername, setLoginUsername] = useState('');
  const [clientError, setClientError] = useState('');

  const previewLoginUser = useMemo(() => ensureWktSuffix(loginUsername), [loginUsername]);

  const resellerBaseUrlPlaceholder = useMemo(
    () =>
      serviceType === 'zainfi'
        ? ZAINFI_DEFAULT_BASE_URL
        : serviceType === 'fiberx'
          ? FIBERX_DEFAULT_BASE_URL
          : 'https://...',
    [serviceType]
  );

  const registerMutation = useMutation({
    mutationFn: (body: AgentRegistrationRequest) => apiService.registerAgent(body),
    onSuccess: (result) => {
      const waUrl = result?.whatsAppUrl?.trim();
      if (waUrl) {
        const opened = window.open(waUrl, '_blank', 'noopener,noreferrer');
        if (!opened) window.location.assign(waUrl);
      }
    },
    onError: (err: unknown) => {
      setClientError(ApiService.showError(err));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setClientError('');
    const phoneDigits = normalizePhoneDigits(phone);
    if (phoneDigits.length !== 11) {
      setClientError('رقم الهاتف يجب أن يكون 11 رقماً بالضبط.');
      return;
    }
    if (!resellerBaseUrl.trim() || !resellerUsername.trim() || !resellerPassword) {
      setClientError('يرجى إكمال بيانات اعتماد الرسيلر (الرابط، اسم المستخدم، كلمة المرور).');
      return;
    }
    if (!loginUsername.trim()) {
      setClientError('يرجى إدخال اسم مستخدم للدخول المستقبلي.');
      return;
    }

    const body: AgentRegistrationRequest = {
      fullName: fullName.trim(),
      phone: phoneDigits,
      serviceType,
      resellerBaseUrl: resellerBaseUrl.trim(),
      resellerUsername: resellerUsername.trim(),
      resellerPassword,
      loginUsername: ensureWktSuffix(loginUsername),
    };
    registerMutation.mutate(body);
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-lg rounded-lg border border-gray-200 bg-white p-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-900">طلب تسجيل وكيل</h1>
          <Link to="/login" className="text-sm text-gray-600 hover:text-gray-900">
            تسجيل الدخول
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {clientError && (
            <div className="flex gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span className="whitespace-pre-line">{clientError || 'حدث خطأ'}</span>
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm text-gray-700">الاسم الكامل</label>
            <input
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-gray-500 focus:outline-none"
              placeholder="الاسم الكامل"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-gray-700">رقم الهاتف (11 رقم)</label>
            <input
              required
              inputMode="numeric"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(normalizePhoneDigits(e.target.value))}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-gray-500 focus:outline-none"
              placeholder="07XXXXXXXXX"
              maxLength={11}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-gray-700">نوع الخدمة</label>
            <select
              value={serviceType}
              onChange={(e) => setServiceType(e.target.value as AgentRegistrationServiceType)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-gray-500 focus:outline-none"
            >
              {SERVICE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm text-gray-700">رابط الرسيلر (Base URL)</label>
            <input
              required
              type="text"
              value={resellerBaseUrl}
              onChange={(e) => setResellerBaseUrl(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-gray-500 focus:outline-none"
              placeholder={resellerBaseUrlPlaceholder}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-gray-700">
              {serviceType === 'zainfi'
                ? 'البريد (نفس بريد تسجيل الدخول في Zain Fi²)'
                : serviceType === 'fiberx'
                  ? 'البريد أو اسم المستخدم (FiberX)'
                  : 'اسم مستخدم الرسيلر'}
            </label>
            <input
              required
              value={resellerUsername}
              onChange={(e) => setResellerUsername(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-gray-500 focus:outline-none"
              autoComplete="off"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-gray-700">كلمة مرور الرسيلر</label>
            <div className="relative">
              <input
                required
                type={showResellerPw ? 'text' : 'password'}
                value={resellerPassword}
                onChange={(e) => setResellerPassword(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 pr-10 text-gray-900 focus:border-gray-500 focus:outline-none"
                autoComplete="new-password"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 px-3 text-gray-500 hover:text-gray-700"
                onClick={() => setShowResellerPw((s) => !s)}
                aria-label="إظهار كلمة المرور"
              >
                {showResellerPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm text-gray-700">اسم المستخدم</label>
            <input
              required
              value={loginUsername}
              onChange={(e) => setLoginUsername(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-gray-500 focus:outline-none"
              placeholder="ali أو ali@wkt"
              autoComplete="username"
            />
            {previewLoginUser ? (
              <p className="mt-1 text-xs text-gray-500">
                سيتم الحفظ: <span className="font-mono">{previewLoginUser}</span> - كلمة المرور: <span className="font-mono">{FIXED_LOGIN_PASSWORD}</span>
              </p>
            ) : null}
          </div>

          <button
            type="submit"
            disabled={registerMutation.isPending}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-gray-900 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60"
          >
            {registerMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                جاري الإرسال...
              </>
            ) : (
              'إرسال الطلب'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AgentRegistrationPage;
