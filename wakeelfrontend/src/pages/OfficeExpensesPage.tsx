import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService, ApiService } from '../services/api';
import {
  OfficeExpense,
  OfficeExpenseCreateRequest,
  OfficeExpenseUpdateRequest,
  UserRole,
} from '../types';
import { showSuccess, showError } from '../utils/notifications';
import { useAuth } from '../contexts/AuthContext';
import { useMyAgent } from '../hooks/useMyAgent';
import { useDigits } from '../contexts/DigitsContext';
import WifiLoaderComponent from '../components/WifiLoaderComponent';
import { StatCard } from '../components/StatCard';
import {
  Plus,
  X,
  Edit2,
  Trash2,
  Wallet,
  CheckCircle,
  DollarSign,
} from 'lucide-react';

const DASHBOARD_OFFICE_EXPENSES_AGENT_KEY = 'wakeel_office_expenses_agentId';

const OfficeExpensesPage: React.FC = () => {
  const { user } = useAuth();
  const { formatNumber, formatDate } = useDigits();
  const queryClient = useQueryClient();
  const isAdmin = user?.role === UserRole.Admin;

  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<OfficeExpense | null>(null);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [appliedFromDate, setAppliedFromDate] = useState('');
  const [appliedToDate, setAppliedToDate] = useState('');

  const [formData, setFormData] = useState<OfficeExpenseCreateRequest>({
    name: '',
    amount: 0,
    expenseDate: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [editFormData, setEditFormData] = useState<OfficeExpenseUpdateRequest>({
    name: '',
    amount: 0,
    expenseDate: '',
    notes: '',
  });

  const { data: agentsResponse } = useQuery({
    queryKey: ['agents', 1, 100],
    queryFn: () => apiService.getAllAgents({ page: 1, pageSize: 100 }),
    enabled: isAdmin,
  });
  const agents = useMemo(() => agentsResponse?.data ?? [], [agentsResponse]);

  const { data: myAgent } = useMyAgent(!isAdmin);

  const effectiveAgentId = isAdmin ? selectedAgentId : myAgent?.id;
  const canLoadData = isAdmin ? !!effectiveAgentId : true;

  useEffect(() => {
    if (!isAdmin) return;
    if (!agents.length) return;
    const saved = localStorage.getItem(DASHBOARD_OFFICE_EXPENSES_AGENT_KEY);
    if (saved && agents.some((a) => a.id === saved)) {
      setSelectedAgentId(saved);
    } else {
      setSelectedAgentId(agents[0]?.id ?? '');
    }
  }, [isAdmin, agents]);

  useEffect(() => {
    if (!isAdmin || !selectedAgentId) return;
    localStorage.setItem(DASHBOARD_OFFICE_EXPENSES_AGENT_KEY, selectedAgentId);
  }, [isAdmin, selectedAgentId]);

  const { data: expenses = [], error, isLoading } = useQuery<OfficeExpense[]>({
    queryKey: ['office-expenses', effectiveAgentId ?? null, appliedFromDate || null, appliedToDate || null],
    queryFn: () =>
      apiService.getOfficeExpenses(
        isAdmin ? effectiveAgentId || undefined : undefined,
        appliedFromDate || undefined,
        appliedToDate || undefined
      ),
    enabled: canLoadData,
  });

  const { data: salarySheetResponse } = useQuery({
    queryKey: ['salary-sheet', effectiveAgentId ?? null],
    queryFn: () => apiService.getSalarySheet(isAdmin ? effectiveAgentId || undefined : undefined),
    enabled: canLoadData,
  });
  const totalNetSalary = (salarySheetResponse?.data ?? []).reduce((s: number, e: { netSalary?: number }) => s + (e.netSalary ?? 0), 0);

  const createMutation = useMutation({
    mutationFn: (data: OfficeExpenseCreateRequest) =>
      apiService.createOfficeExpense(data, isAdmin ? effectiveAgentId : undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['office-expenses'] });
      setShowAddModal(false);
      setFormData({
        name: '',
        amount: 0,
        expenseDate: new Date().toISOString().split('T')[0],
        notes: '',
      });
      showSuccess('تمت الإضافة', 'تم إضافة المصروف بنجاح');
    },
    onError: (err: unknown) => {
      showError('خطأ في الإضافة', ApiService.showError(err));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: OfficeExpenseUpdateRequest }) =>
      apiService.updateOfficeExpense(id, data, isAdmin ? effectiveAgentId : undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['office-expenses'] });
      setShowEditModal(false);
      setSelectedExpense(null);
      showSuccess('تم التعديل', 'تم تعديل المصروف بنجاح');
    },
    onError: (err: unknown) => {
      showError('خطأ في التعديل', ApiService.showError(err));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiService.deleteOfficeExpense(id, isAdmin ? effectiveAgentId : undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['office-expenses'] });
      showSuccess('تم الحذف', 'تم حذف المصروف بنجاح');
    },
    onError: (err: unknown) => {
      showError('خطأ في الحذف', ApiService.showError(err));
    },
  });

  const payMutation = useMutation({
    mutationFn: (id: string) =>
      apiService.payOfficeExpense(id, isAdmin ? effectiveAgentId : undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['office-expenses'] });
      showSuccess('تم التسديد', 'تم تسديد المصروف بنجاح');
    },
    onError: (err: unknown) => {
      showError('خطأ في التسديد', ApiService.showError(err));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) {
      showError('خطأ', 'اسم المصروف مطلوب');
      return;
    }
    if (formData.amount <= 0) {
      showError('خطأ', 'المبلغ يجب أن يكون أكبر من صفر');
      return;
    }
    if (isAdmin && !effectiveAgentId) {
      showError('خطأ', 'يرجى اختيار الوكيل');
      return;
    }
    createMutation.mutate({
      ...formData,
      name: formData.name.trim(),
      notes: formData.notes?.trim() || undefined,
    });
  };

  const handleEditClick = (exp: OfficeExpense) => {
    setSelectedExpense(exp);
    setEditFormData({
      name: exp.name ?? '',
      amount: exp.amount ?? 0,
      expenseDate: exp.expenseDate ? exp.expenseDate.split('T')[0] : '',
      notes: exp.notes ?? '',
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExpense?.id) return;
    if (!editFormData.name?.trim()) {
      showError('خطأ', 'اسم المصروف مطلوب');
      return;
    }
    if ((editFormData.amount ?? 0) <= 0) {
      showError('خطأ', 'المبلغ يجب أن يكون أكبر من صفر');
      return;
    }
    updateMutation.mutate({
      id: selectedExpense.id,
      data: {
        ...editFormData,
        name: editFormData.name!.trim(),
        notes: editFormData.notes?.trim() || undefined,
      },
    });
  };

  const handleDeleteClick = (exp: OfficeExpense) => {
    if (!window.confirm(`هل أنت متأكد من حذف المصروف «${exp.name}»؟`)) return;
    deleteMutation.mutate(exp.id);
  };

  const handlePayClick = (exp: OfficeExpense) => {
    if (!window.confirm(`تسديد المصروف «${exp.name}»؟`)) return;
    payMutation.mutate(exp.id);
  };

  const normalizeExpense = (e: OfficeExpense): OfficeExpense => ({
    ...e,
    isPaid: e.isPaid ?? (e as any).isPaid === true,
    paidAt: e.paidAt ?? (e as any).paidAt ?? null,
  });

  const list = expenses.map(normalizeExpense);
  const totalAmount = list.reduce((s, e) => s + (e.amount ?? 0), 0);

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-md">
          خطأ في تحميل مصاريف المكتب
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[50vh]">
        <WifiLoaderComponent
          background="transparent"
          desktopSize="120px"
          mobileSize="100px"
          text="تحميل مصاريف المكتب..."
          backColor="#E8F2FC"
          frontColor="#4645F6"
        />
      </div>
    );
  }
  

  return (
    <div className="p-3 sm:p-4 lg:p-6">
      <div className="flex flex-col gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
            مصاريف المكتب
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
            عرض وإدارة مصاريف المكتب
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && (
            <div className="min-w-[180px]">
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                الوكيل
              </label>
              <select
                value={selectedAgentId}
                onChange={(e) => setSelectedAgentId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white text-sm"
              >
                <option value="">-- اختر الوكيل --</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.companyName || a.fullName || a.username}
                  </option>
                ))}
              </select>
            </div>
          )}
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            disabled={isAdmin && !effectiveAgentId}
            className="flex items-center gap-2 px-3 py-2.5 sm:px-4 sm:py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm sm:text-base transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] touch-manipulation"
          >
            <Plus className="h-4 w-4" />
            <span>إضافة مصروف</span>
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-3 sm:gap-4 mt-2">
          <button
            type="button"
            onClick={() => {
              setFromDate(appliedFromDate);
              setToDate(appliedToDate);
              setShowFilterModal(true);
            }}
            className="text-right w-full rounded-lg border-0 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
          >
            <StatCard
              title="إجمالي المصاريف"
              value={totalAmount}
              icon={DollarSign}
              color="blue"
              isAmount
            />
          </button>
          <StatCard
            title="إجمالي صافي الرواتب"
            value={totalNetSalary}
            icon={DollarSign}
            color="green"
            isAmount
          />
        </div>
        {(appliedFromDate || appliedToDate) && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            الفلترة: من {appliedFromDate || '—'} إلى {appliedToDate || '—'}
          </p>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="wakeel-table-scroll">
          <table className="min-w-full text-right">
            <thead>
              <tr>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  اسم المصروف
                </th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  المبلغ (د.ع)
                </th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  تاريخ الصرف
                </th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  تاريخ التسديد
                </th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  ملاحظات
                </th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  إجراءات
                </th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-gray-500 dark:text-gray-400"
                  >
                    <Wallet className="mx-auto h-12 w-12 text-gray-400 mb-2" />
                    <p>لا توجد مصاريف</p>
                    <p className="text-sm mt-1">أضف مصروفاً جديداً باستخدام الزر أعلاه</p>
                  </td>
                </tr>
              ) : (
                list.map((exp) => (
                  <tr key={exp.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                      {exp.name}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      {formatNumber(exp.amount ?? 0, { suffix: ' د.ع' })}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      {exp.expenseDate
                        ? formatDate(exp.expenseDate.includes('T') ? exp.expenseDate : exp.expenseDate + 'T00:00:00')
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {exp.paidAt
                        ? formatDate(exp.paidAt)
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white max-w-[180px] truncate" title={exp.notes ?? ''}>
                      {exp.notes ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1 flex-wrap">
                        {!exp.isPaid && (
                          <button
                            type="button"
                            onClick={() => handlePayClick(exp)}
                            disabled={payMutation.isPending}
                            className="inline-flex items-center gap-1 px-2 py-1.5 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-md transition-colors disabled:opacity-50"
                            title="تسديد المصروف"
                          >
                            <CheckCircle className="h-4 w-4" />
                            <span className="hidden sm:inline">تسديد</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleEditClick(exp)}
                          className="inline-flex items-center gap-1 px-2 py-1.5 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-md transition-colors"
                          title="تعديل"
                        >
                          <Edit2 className="h-4 w-4" />
                          <span className="hidden sm:inline">تعديل</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteClick(exp)}
                          className="inline-flex items-center gap-1 px-2 py-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                          title="حذف"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="hidden sm:inline">حذف</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
                إضافة مصروف
              </h2>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
              >
                <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  اسم المصروف *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                  required
                  maxLength={500}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                  placeholder="مثال: إيجار، كهرباء، إنترنت..."
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    المبلغ (د.ع) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={formData.amount || ''}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, amount: Number(e.target.value) || 0 }))
                    }
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    تاريخ الصرف *
                  </label>
                  <input
                    type="date"
                    value={formData.expenseDate}
                    onChange={(e) => setFormData((p) => ({ ...p, expenseDate: e.target.value }))}
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  ملاحظات
                </label>
                <textarea
                  value={formData.notes ?? ''}
                  onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                  placeholder="اختياري"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md disabled:opacity-50"
                >
                  {createMutation.isPending ? 'جاري الحفظ...' : 'إضافة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedExpense && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
                تعديل مصروف
              </h2>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
              >
                <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  اسم المصروف *
                </label>
                <input
                  type="text"
                  value={editFormData.name ?? ''}
                  onChange={(e) =>
                    setEditFormData((p) => ({ ...p, name: e.target.value }))
                  }
                  required
                  maxLength={500}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    المبلغ (د.ع) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={editFormData.amount ?? ''}
                    onChange={(e) =>
                      setEditFormData((p) => ({
                        ...p,
                        amount: Number(e.target.value) || 0,
                      }))
                    }
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    تاريخ الصرف *
                  </label>
                  <input
                    type="date"
                    value={editFormData.expenseDate ?? ''}
                    onChange={(e) =>
                      setEditFormData((p) => ({ ...p, expenseDate: e.target.value }))
                    }
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  ملاحظات
                </label>
                <textarea
                  value={editFormData.notes ?? ''}
                  onChange={(e) =>
                    setEditFormData((p) => ({ ...p, notes: e.target.value }))
                  }
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md disabled:opacity-50"
                >
                  {updateMutation.isPending ? 'جاري الحفظ...' : 'حفظ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Filter by date modal */}
      {showFilterModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
                فلترة المصاريف بالتاريخ
              </h2>
              <button
                type="button"
                onClick={() => setShowFilterModal(false)}
                className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
              >
                <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                الفلترة حسب تاريخ المصروف (ExpenseDate). اترك الحقل فارغاً لعدم تحديد حد.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  من تاريخ
                </label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  إلى تاريخ
                </label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div className="flex flex-wrap justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setAppliedFromDate('');
                    setAppliedToDate('');
                    setFromDate('');
                    setToDate('');
                    setShowFilterModal(false);
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  إزالة الفلترة
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAppliedFromDate(fromDate);
                    setAppliedToDate(toDate);
                    setShowFilterModal(false);
                  }}
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md"
                >
                  تطبيق
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OfficeExpensesPage;
