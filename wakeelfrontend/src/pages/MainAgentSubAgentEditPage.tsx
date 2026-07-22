import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService, ApiService } from '../services/api';
import { showSuccess, showError } from '../utils/notifications';
import {
  Agent,
  AgentUpdateRequest,
  IraqGovernorates,
  RenewalCalculationType,
  SubscriptionSystemType,
} from '../types';
import { Building2, ChevronRight } from 'lucide-react';

const toIsoDate = (s: string) => {
  const t = String(s || '').trim();
  if (!t) return t;
  if (t.includes('T')) return t.slice(0, 10);
  const d = new Date(`${t}T00:00:00`);
  return Number.isNaN(d.getTime()) ? t : d.toISOString().slice(0, 10);
};

const MainAgentSubAgentEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<AgentUpdateRequest | null>(null);
  /** كلمة مرور دخول جديدة — تُرسل فقط إن وُجدت نصاً؛ لا تُحمّل من الخادم */
  const [newLoginPassword, setNewLoginPassword] = useState('');

  const { data: agent, error, isLoading } = useQuery<Agent>({
    queryKey: ['main-agent-sub-agent', id],
    queryFn: () => apiService.getAgentById(id!),
    enabled: !!id,
  });

  useEffect(() => {
    if (agent) {
      setForm({
        fullName: agent.fullName || '',
        companyName: agent.companyName || '',
        phone: agent.phone || '',
        address: agent.address || '',
        governorate: (Number(agent.governorate) || IraqGovernorates.Baghdad) as IraqGovernorates,
        isActive: !!agent.isActive,
        subscriptionType: agent.subscriptionType ?? SubscriptionSystemType.Yearly,
        subscriptionStartDate: (agent.subscriptionStartDate || '').slice(0, 10),
        subscriptionEndDate: (agent.subscriptionEndDate || '').slice(0, 10),
        renewalPeriod: agent.renewalPeriod,
        renewalCalculationType: agent.renewalCalculationType ?? RenewalCalculationType.Fixed,
        serviceType: agent.serviceType,
        sasBaseUrl: agent.sasBaseUrl || '',
        sasUsername: agent.sasUsername || '',
        ftthBaseUrl: agent.ftthBaseUrl || 'https://admin.ftth.iq',
        ftthUsername: agent.ftthUsername || '',
        whatsAppSessionId: agent.whatsAppSessionId || undefined,
      });
    }
  }, [agent]);

  const updateMutation = useMutation({
    mutationFn: ({ id: agentId, data }: { id: string; data: AgentUpdateRequest }) =>
      apiService.updateMainAgentSubAgent(agentId, data),
    onSuccess: () => {
      setNewLoginPassword('');
      queryClient.invalidateQueries({ queryKey: ['main-agent-sub-agents'] });
      queryClient.invalidateQueries({ queryKey: ['main-agent-sub-agent', id] });
      showSuccess('تم التحديث', 'تم تحديث الوكيل الفرعي بنجاح');
      navigate('/admin/main-agent/sub-agents');
    },
    onError: (err: unknown) => {
      showError('خطأ', ApiService.showError(err));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !form) return;
    const pwd = newLoginPassword.trim();
    const data: AgentUpdateRequest = {
      ...form,
      governorate: Number(form.governorate) as IraqGovernorates,
      subscriptionStartDate: form.subscriptionStartDate ? toIsoDate(form.subscriptionStartDate) : form.subscriptionStartDate,
      subscriptionEndDate: form.subscriptionEndDate ? toIsoDate(form.subscriptionEndDate) : form.subscriptionEndDate,
    };
    if (pwd) data.password = pwd;
    updateMutation.mutate({ id, data });
  };

  if (isLoading || !form) return (
    <div className="p-6 flex items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
    </div>
  );
  if (error || !agent) {
    return (
      <div className="p-6">
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 text-red-700 dark:text-red-300">
          فشل تحميل بيانات الوكيل الفرعي أو لا تملك صلاحية عرضه.
        </div>
        <Link to="/admin/main-agent/sub-agents" className="mt-4 inline-block text-primary-600 dark:text-primary-400">العودة للقائمة</Link>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl">
      <div className="flex items-center gap-2 mb-6">
        <Link to="/admin/main-agent/sub-agents" className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
          <ChevronRight className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        </Link>
        <Building2 className="h-7 w-7 text-primary-600 dark:text-primary-400" />
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">تعديل وكيل فرعي</h1>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        تعديل بيانات الوكيل: {agent.companyName || agent.fullName} ({agent.username})
      </p>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الاسم الكامل *</label>
          <input
            type="text"
            value={form.fullName}
            onChange={(e) => setForm((f) => f ? { ...f, fullName: e.target.value } : f)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">اسم الشركة</label>
          <input
            type="text"
            value={form.companyName}
            onChange={(e) => setForm((f) => f ? { ...f, companyName: e.target.value } : f)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الهاتف</label>
          <input
            type="text"
            value={form.phone}
            onChange={(e) => setForm((f) => f ? { ...f, phone: e.target.value } : f)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">العنوان</label>
          <input
            type="text"
            value={form.address}
            onChange={(e) => setForm((f) => f ? { ...f, address: e.target.value } : f)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">المحافظة</label>
          <select
            value={Number(form.governorate)}
            onChange={(e) => setForm((f) => f ? { ...f, governorate: Number(e.target.value) as IraqGovernorates } : f)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
          >
            {Object.entries(IraqGovernorates).filter(([k]) => isNaN(Number(k))).map(([key, val]) => (
              <option key={key} value={val}>{key}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isActive"
            checked={form.isActive}
            onChange={(e) => setForm((f) => f ? { ...f, isActive: e.target.checked } : f)}
            className="rounded border-gray-300"
          />
          <label htmlFor="isActive" className="text-sm font-medium text-gray-700 dark:text-gray-300">الوكيل نشط</label>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">كلمة مرور تسجيل الدخول (اختياري)</label>
          <input
            type="password"
            autoComplete="new-password"
            value={newLoginPassword}
            onChange={(e) => setNewLoginPassword(e.target.value)}
            placeholder="اتركه فارغاً إن لم ترد تغيير كلمة المرور"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            عند إدخال كلمة مرور جديدة يتم تحديث حساب الدخول للوكيل الفرعي ({agent.username}).
          </p>
        </div>
        <div className="flex gap-2 pt-2">
          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md font-medium disabled:opacity-50"
          >
            {updateMutation.isPending ? 'جاري الحفظ...' : 'حفظ التعديلات'}
          </button>
          <Link
            to="/admin/main-agent/sub-agents"
            className="px-4 py-2 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-white rounded-md font-medium"
          >
            إلغاء
          </Link>
        </div>
      </form>
    </div>
  );
};

export default MainAgentSubAgentEditPage;
