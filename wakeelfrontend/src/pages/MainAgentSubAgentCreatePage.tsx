import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService, ApiService } from '../services/api';
import { showSuccess, showError } from '../utils/notifications';
import {
  AgentCreateRequest,
  IraqGovernorates,
  RenewalCalculationType,
  SubscriptionSystemType,
  ServiceType,
  UserRole,
} from '../types';
import { Building2, ChevronRight } from 'lucide-react';

const MainAgentSubAgentCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<AgentCreateRequest>({
    username: '',
    fullName: '',
    password: '',
    companyName: '',
    phone: '',
    address: '',
    governorate: IraqGovernorates.Baghdad,
    subscriptionType: SubscriptionSystemType.Yearly,
    subscriptionStartDate: '',
    subscriptionEndDate: '',
    renewalPeriod: 30,
    renewalCalculationType: RenewalCalculationType.Fixed,
    serviceType: ServiceType.Sas,
    sasBaseUrl: '',
    sasUsername: '',
    sasPassword: '',
    ftthBaseUrl: 'https://admin.ftth.iq',
    ftthUsername: '',
    ftthPassword: '',
    whatsAppSessionId: '',
  });

  const createMutation = useMutation({
    mutationFn: (data: AgentCreateRequest) => apiService.createAgent(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['main-agent-sub-agents'] });
      showSuccess('تم الإنشاء', 'تم إنشاء الوكيل الفرعي بنجاح. يُؤخذ الاشتراك من اشتراكك إن وُجد.');
      navigate('/admin/main-agent/sub-agents');
    },
    onError: (err: unknown) => {
      showError('خطأ', ApiService.showError(err));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.username?.trim() || !form.fullName?.trim() || !form.password) {
      showError('خطأ', 'اسم المستخدم، الاسم الكامل وكلمة المرور مطلوبة.');
      return;
    }
    const payload: AgentCreateRequest = {
      username: form.username.trim(),
      fullName: form.fullName.trim(),
      password: form.password,
      companyName: form.companyName?.trim() ?? '',
      phone: form.phone?.trim() ?? '',
      address: form.address?.trim() ?? '',
      governorate: form.governorate,
      role: UserRole.MainAgent,
    };
    createMutation.mutate(payload);
  };

  return (
    <div className="p-4 sm:p-6 max-w-2xl">
      <div className="flex items-center gap-2 mb-6">
        <Link to="/admin/main-agent/sub-agents" className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
          <ChevronRight className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        </Link>
        <Building2 className="h-7 w-7 text-primary-600 dark:text-primary-400" />
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">إضافة وكيل فرعي</h1>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        إنشاء وكيل فرعي جديد. اشتراك الوكيل الفرعي يُؤخذ من اشتراك الوكيل الرئيسي إن وُجد في حسابك.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">اسم المستخدم *</label>
          <input
            type="text"
            value={form.username}
            onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الاسم الكامل *</label>
          <input
            type="text"
            value={form.fullName}
            onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">كلمة المرور *</label>
          <input
            type="password"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">اسم الشركة</label>
          <input
            type="text"
            value={form.companyName}
            onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الهاتف</label>
          <input
            type="text"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">العنوان</label>
          <input
            type="text"
            value={form.address}
            onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">المحافظة</label>
          <select
            value={form.governorate}
            onChange={(e) => setForm((f) => ({ ...f, governorate: Number(e.target.value) as IraqGovernorates }))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
          >
            {Object.entries(IraqGovernorates).filter(([k]) => isNaN(Number(k))).map(([key, val]) => (
              <option key={key} value={val}>{key}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2 pt-2">
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md font-medium disabled:opacity-50"
          >
            {createMutation.isPending ? 'جاري الحفظ...' : 'إنشاء الوكيل الفرعي'}
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

export default MainAgentSubAgentCreatePage;
