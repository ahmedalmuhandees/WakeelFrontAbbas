import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService, ApiService } from '../services/api';
import {
  SalaryAdvance,
  SalarySheetEntry,
  SalarySheetEntryCreateRequest,
  SalarySheetEntryUpdateRequest,
  SalaryAdvanceUpdateRequest,
  SalaryDeduction,
  SalaryDeductionCreateRequest,
  SalaryDeductionUpdateRequest,
  SalaryAdvanceCreateRequest,
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
  Users,
  MinusCircle,
  TrendingUp,
  DollarSign,
} from 'lucide-react';

const SALARY_SHEET_AGENT_KEY = 'wakeel_salary_sheet_agentId';

const SalarySheetPage: React.FC = () => {
  const { user } = useAuth();
  const { formatNumber, formatDate } = useDigits();
  const queryClient = useQueryClient();
  const isAdmin = user?.role === UserRole.Admin;

  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeductionModal, setShowDeductionModal] = useState(false);
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [editingDeduction, setEditingDeduction] = useState<SalaryDeduction | null>(null);
  const [editingAdvance, setEditingAdvance] = useState<SalaryAdvance | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<SalarySheetEntry | null>(null);
  const [entryForDeduction, setEntryForDeduction] = useState<SalarySheetEntry | null>(null);
  const [entryForAdvance, setEntryForAdvance] = useState<SalarySheetEntry | null>(null);
  const [entryForRecord, setEntryForRecord] = useState<SalarySheetEntry | null>(null);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [appliedFromDate, setAppliedFromDate] = useState('');
  const [appliedToDate, setAppliedToDate] = useState('');

  const [formData, setFormData] = useState<SalarySheetEntryCreateRequest>({
    employeeName: '',
    workType: '',
    salaryAmount: 0,
    paymentDate: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [editFormData, setEditFormData] = useState<SalarySheetEntryUpdateRequest>({
    employeeName: '',
    workType: '',
    salaryAmount: 0,
    paymentDate: '',
    notes: '',
  });
  const [deductionForm, setDeductionForm] = useState({
    amount: 0,
    reason: '',
    deductionDate: new Date().toISOString().split('T')[0],
  });
  const [advanceForm, setAdvanceForm] = useState({
    amount: 0,
    reason: '',
    withdrawalDate: new Date().toISOString().split('T')[0],
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
    const saved = localStorage.getItem(SALARY_SHEET_AGENT_KEY);
    if (saved && agents.some((a) => a.id === saved)) {
      setSelectedAgentId(saved);
    } else {
      setSelectedAgentId(agents[0]?.id ?? '');
    }
  }, [isAdmin, agents]);

  useEffect(() => {
    if (!isAdmin || !selectedAgentId) return;
    localStorage.setItem(SALARY_SHEET_AGENT_KEY, selectedAgentId);
  }, [isAdmin, selectedAgentId]);

  const { data: salarySheetResponse, error, isLoading } = useQuery({
    queryKey: ['salary-sheet', effectiveAgentId ?? null, appliedFromDate || null, appliedToDate || null],
    queryFn: () =>
      apiService.getSalarySheet(
        isAdmin ? effectiveAgentId || undefined : undefined,
        appliedFromDate || undefined,
        appliedToDate || undefined
      ),
    enabled: canLoadData,
  });

  const entries = salarySheetResponse?.data ?? [];
  const totalDeductions = salarySheetResponse?.totalDeductions ?? 0;
  const totalAdvances = salarySheetResponse?.totalAdvances ?? 0;

  const createMutation = useMutation({
    mutationFn: (data: SalarySheetEntryCreateRequest) =>
      apiService.createSalarySheetEntry(data, isAdmin ? effectiveAgentId : undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary-sheet'] });
      setShowAddModal(false);
      setFormData({
        employeeName: '',
        workType: '',
        salaryAmount: 0,
        paymentDate: new Date().toISOString().split('T')[0],
        notes: '',
      });
      showSuccess('تمت الإضافة', 'تم إضافة سجل الراتب بنجاح');
    },
    onError: (err: unknown) => {
      showError('خطأ في الإضافة', ApiService.showError(err));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: SalarySheetEntryUpdateRequest }) =>
      apiService.updateSalarySheetEntry(id, data, isAdmin ? effectiveAgentId : undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary-sheet'] });
      setShowEditModal(false);
      setSelectedEntry(null);
      showSuccess('تم التعديل', 'تم تعديل سجل الراتب بنجاح');
    },
    onError: (err: unknown) => {
      showError('خطأ في التعديل', ApiService.showError(err));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiService.deleteSalarySheetEntry(id, isAdmin ? effectiveAgentId : undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary-sheet'] });
      showSuccess('تم الحذف', 'تم حذف سجل الراتب بنجاح');
    },
    onError: (err: unknown) => {
      showError('خطأ في الحذف', ApiService.showError(err));
    },
  });

  const deductionMutation = useMutation({
    mutationFn: (data: SalaryDeductionCreateRequest) =>
      apiService.addSalaryDeduction(data, isAdmin ? effectiveAgentId : undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary-sheet'] });
      setShowDeductionModal(false);
      setEntryForDeduction(null);
      setDeductionForm({ amount: 0, reason: '', deductionDate: new Date().toISOString().split('T')[0] });
      showSuccess('تمت الإضافة', 'تم إضافة الخصم بنجاح');
    },
    onError: (err: unknown) => {
      showError('خطأ في إضافة الخصم', ApiService.showError(err));
    },
  });

  const updateDeductionMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: SalaryDeductionUpdateRequest }) =>
      apiService.updateSalaryDeduction(id, data, isAdmin ? effectiveAgentId : undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary-sheet'] });
      setShowDeductionModal(false);
      setEntryForDeduction(null);
      setEditingDeduction(null);
      setEntryForRecord(null);
      setDeductionForm({ amount: 0, reason: '', deductionDate: new Date().toISOString().split('T')[0] });
      showSuccess('تم التعديل', 'تم تعديل الخصم بنجاح');
    },
    onError: (err: unknown) => {
      showError('خطأ في تعديل الخصم', ApiService.showError(err));
    },
  });

  const advanceMutation = useMutation({
    mutationFn: (data: SalaryAdvanceCreateRequest) =>
      apiService.addSalaryAdvance(data, isAdmin ? effectiveAgentId : undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary-sheet'] });
      queryClient.invalidateQueries({ queryKey: ['daily-account'] });
      queryClient.invalidateQueries({ queryKey: ['main-agent-sub-agent-daily-account'] });
      setShowAdvanceModal(false);
      setEntryForAdvance(null);
      setAdvanceForm({ amount: 0, reason: '', withdrawalDate: new Date().toISOString().split('T')[0] });
      showSuccess('تمت الإضافة', 'تم إضافة السلفة بنجاح');
    },
    onError: (err: unknown) => {
      showError('خطأ في إضافة السلفة', ApiService.showError(err));
    },
  });

  const updateAdvanceMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: SalaryAdvanceUpdateRequest }) =>
      apiService.updateSalaryAdvance(id, data, isAdmin ? effectiveAgentId : undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary-sheet'] });
      queryClient.invalidateQueries({ queryKey: ['daily-account'] });
      queryClient.invalidateQueries({ queryKey: ['main-agent-sub-agent-daily-account'] });
      setShowAdvanceModal(false);
      setEntryForAdvance(null);
      setEditingAdvance(null);
      setEntryForRecord(null);
      setAdvanceForm({ amount: 0, reason: '', withdrawalDate: new Date().toISOString().split('T')[0] });
      showSuccess('تم التعديل', 'تم تعديل السلفة بنجاح');
    },
    onError: (err: unknown) => {
      showError('خطأ في تعديل السلفة', ApiService.showError(err));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.employeeName?.trim()) {
      showError('خطأ', 'اسم الموظف مطلوب');
      return;
    }
    if (formData.salaryAmount <= 0) {
      showError('خطأ', 'مبلغ الراتب يجب أن يكون أكبر من صفر');
      return;
    }
    if (isAdmin && !effectiveAgentId) {
      showError('خطأ', 'يرجى اختيار الوكيل');
      return;
    }
    createMutation.mutate({
      ...formData,
      employeeName: formData.employeeName.trim(),
      workType: formData.workType?.trim() ?? '',
      notes: formData.notes?.trim() || undefined,
    });
  };

  const handleEditClick = (entry: SalarySheetEntry) => {
    setSelectedEntry(entry);
    setEditFormData({
      employeeName: entry.employeeName ?? '',
      workType: entry.workType ?? '',
      salaryAmount: entry.salaryAmount ?? 0,
      paymentDate: entry.paymentDate ? entry.paymentDate.split('T')[0] : '',
      notes: entry.notes ?? '',
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEntry?.id) return;
    if (!editFormData.employeeName?.trim()) {
      showError('خطأ', 'اسم الموظف مطلوب');
      return;
    }
    if ((editFormData.salaryAmount ?? 0) <= 0) {
      showError('خطأ', 'مبلغ الراتب يجب أن يكون أكبر من صفر');
      return;
    }
    updateMutation.mutate({
      id: selectedEntry.id,
      data: {
        ...editFormData,
        employeeName: editFormData.employeeName!.trim(),
        workType: editFormData.workType?.trim() ?? '',
        notes: editFormData.notes?.trim() || undefined,
      },
    });
  };

  const handleDeleteClick = (entry: SalarySheetEntry) => {
    if (!window.confirm(`هل أنت متأكد من حذف سجل راتب «${entry.employeeName}»؟`)) return;
    deleteMutation.mutate(entry.id);
  };

  const openDeductionModal = (entry: SalarySheetEntry) => {
    setEditingDeduction(null);
    setEntryForDeduction(entry);
    setDeductionForm({
      amount: 0,
      reason: '',
      deductionDate: new Date().toISOString().split('T')[0],
    });
    setShowDeductionModal(true);
  };

  const openAdvanceModal = (entry: SalarySheetEntry) => {
    setEditingAdvance(null);
    setEntryForAdvance(entry);
    setAdvanceForm({
      amount: 0,
      reason: '',
      withdrawalDate: new Date().toISOString().split('T')[0],
    });
    setShowAdvanceModal(true);
  };

  const openEditDeductionModal = (entry: SalarySheetEntry, deduction: SalaryDeduction) => {
    setEntryForDeduction(entry);
    setEditingDeduction(deduction);
    setDeductionForm({
      amount: deduction.amount ?? 0,
      reason: deduction.reason ?? '',
      deductionDate: deduction.deductionDate ? deduction.deductionDate.split('T')[0] : new Date().toISOString().split('T')[0],
    });
    setShowDeductionModal(true);
  };

  const openEditAdvanceModal = (entry: SalarySheetEntry, advance: SalaryAdvance) => {
    setEntryForAdvance(entry);
    setEditingAdvance(advance);
    setAdvanceForm({
      amount: advance.amount ?? 0,
      reason: advance.reason ?? '',
      withdrawalDate: advance.withdrawalDate ? advance.withdrawalDate.split('T')[0] : new Date().toISOString().split('T')[0],
    });
    setShowAdvanceModal(true);
  };

  const handleDeductionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!entryForDeduction?.id) return;
    if (deductionForm.amount <= 0) {
      showError('خطأ', 'المبلغ يجب أن يكون أكبر من صفر');
      return;
    }
    if (!deductionForm.reason?.trim()) {
      showError('خطأ', 'سبب الخصم مطلوب');
      return;
    }
    const payload = {
      amount: deductionForm.amount,
      reason: deductionForm.reason.trim(),
      deductionDate: deductionForm.deductionDate,
    };
    if (editingDeduction?.id) {
      updateDeductionMutation.mutate({ id: editingDeduction.id, data: payload });
      return;
    }
    deductionMutation.mutate({
      salarySheetEntryId: entryForDeduction.id,
      ...payload,
    });
  };

  const handleAdvanceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!entryForAdvance?.id) return;
    if (advanceForm.amount <= 0) {
      showError('خطأ', 'المبلغ يجب أن يكون أكبر من صفر');
      return;
    }
    if (!advanceForm.reason?.trim()) {
      showError('خطأ', 'سبب السلفة مطلوب');
      return;
    }
    const payload = {
      amount: advanceForm.amount,
      reason: advanceForm.reason.trim(),
      withdrawalDate: advanceForm.withdrawalDate,
    };
    if (editingAdvance?.id) {
      updateAdvanceMutation.mutate({ id: editingAdvance.id, data: payload });
      return;
    }
    advanceMutation.mutate({
      salarySheetEntryId: entryForAdvance.id,
      ...payload,
    });
  };

  const totalNetSalary = entries.reduce((s, e) => s + (e.netSalary ?? 0), 0);

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-md">
          خطأ في تحميل كشف الرواتب
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
          text="تحميل كشف الرواتب..."
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
            كشوفات الموظفين
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
            إدارة سجلات الرواتب والخصومات والسلف
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && (
            <div className="min-w-[180px]">
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">الوكيل</label>
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
            <span>إضافة سجل راتب</span>
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-2">
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
              title="إجمالي صافي الرواتب"
              value={totalNetSalary}
              icon={DollarSign}
              color="blue"
              isAmount
            />
          </button>
          <StatCard
            title="إجمالي الخصومات"
            value={totalDeductions}
            icon={MinusCircle}
            color="red"
            isAmount
          />
          <StatCard
            title="إجمالي السلف"
            value={totalAdvances}
            icon={TrendingUp}
            color="orange"
            isAmount
          />
        </div>
        {(appliedFromDate || appliedToDate) && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            الفلترة: من {appliedFromDate || '—'} إلى {appliedToDate || '—'}
          </p>
        )}
      </div>

      {/* كروت الموظفين */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {entries.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-16 px-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <Users className="h-14 w-14 text-gray-400 mb-3" />
            <p className="text-gray-500 dark:text-gray-400 font-medium">لا توجد سجلات رواتب</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">أضف سجل راتب باستخدام الزر أعلاه</p>
          </div>
        ) : (
          entries.map((entry) => (
            <div
              key={entry.id}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col"
            >
              <div
                role="button"
                tabIndex={0}
                onClick={() => setEntryForRecord(entry)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setEntryForRecord(entry); } }}
                className="p-4 sm:p-5 flex-1 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors rounded-t-xl"
                aria-label={`عرض سجل ${entry.employeeName}`}
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0 flex-1 text-right">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 justify-between">
                      <span className="text-base font-bold text-primary-600 dark:text-primary-400 whitespace-nowrap order-2 sm:order-2">
                        متبقي راتب: {formatNumber(entry.netSalary ?? 0, { suffix: ' د.ع' })}
                      </span>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate order-1 sm:order-1" title={entry.employeeName}>
                        {entry.employeeName}
                      </h3>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                      {entry.workType || '—'}
                    </p>
                  </div>
                </div>
                <div className="space-y-2 mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
                  <div className="flex justify-between items-baseline gap-2">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">الراتب</span>
                    <span className="text-base font-semibold text-gray-900 dark:text-white">
                      {formatNumber(entry.salaryAmount ?? 0, { suffix: ' د.ع' })}
                    </span>
                  </div>
                  {(entry.totalDeductions > 0 || entry.totalAdvances > 0) && (
                    <div className="flex justify-between items-baseline gap-2 text-xs">
                      <span className="text-gray-500 dark:text-gray-400">صافي الراتب</span>
                      <span className="font-medium text-primary-600 dark:text-primary-400">
                        {formatNumber(entry.netSalary ?? 0, { suffix: ' د.ع' })}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-baseline gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <span>تاريخ الصرف</span>
                    <span>
                      {entry.paymentDate ? formatDate(entry.paymentDate.includes('T') ? entry.paymentDate : entry.paymentDate + 'T00:00:00') : '—'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="px-4 pb-4 pt-0 flex flex-wrap gap-1.5" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => openDeductionModal(entry)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  title="خصم"
                >
                  <MinusCircle className="h-3.5 w-3.5" />
                  خصم
                </button>
                <button
                  type="button"
                  onClick={() => openAdvanceModal(entry)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors"
                  title="سلفة"
                >
                  <TrendingUp className="h-3.5 w-3.5" />
                  سلفة
                </button>
                <button
                  type="button"
                  onClick={() => handleEditClick(entry)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                  title="تعديل"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  تعديل
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteClick(entry)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  title="حذف"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  حذف
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Entry Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">إضافة سجل راتب</h2>
              <button type="button" onClick={() => setShowAddModal(false)} className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors">
                <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">اسم الموظف *</label>
                <input
                  type="text"
                  value={formData.employeeName}
                  onChange={(e) => setFormData((p) => ({ ...p, employeeName: e.target.value }))}
                  required
                  maxLength={500}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                  placeholder="اسم الموظف"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">نوع العمل</label>
                <input
                  type="text"
                  value={formData.workType}
                  onChange={(e) => setFormData((p) => ({ ...p, workType: e.target.value }))}
                  maxLength={200}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                  placeholder="مثال: دوام كامل، جزئي"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">مبلغ الراتب (د.ع) *</label>
                  <input
                    type="number"
                    min={1}
                    value={formData.salaryAmount || ''}
                    onChange={(e) => setFormData((p) => ({ ...p, salaryAmount: Number(e.target.value) || 0 }))}
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">تاريخ الصرف *</label>
                  <input
                    type="date"
                    value={formData.paymentDate}
                    onChange={(e) => setFormData((p) => ({ ...p, paymentDate: e.target.value }))}
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">ملاحظات</label>
                <textarea
                  value={formData.notes ?? ''}
                  onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                  placeholder="اختياري"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">إلغاء</button>
                <button type="submit" disabled={createMutation.isPending} className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md disabled:opacity-50">{createMutation.isPending ? 'جاري الحفظ...' : 'إضافة'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Entry Modal */}
      {showEditModal && selectedEntry && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">تعديل سجل راتب</h2>
              <button type="button" onClick={() => setShowEditModal(false)} className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors">
                <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">اسم الموظف *</label>
                <input type="text" value={editFormData.employeeName ?? ''} onChange={(e) => setEditFormData((p) => ({ ...p, employeeName: e.target.value }))} required maxLength={500} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">نوع العمل</label>
                <input type="text" value={editFormData.workType ?? ''} onChange={(e) => setEditFormData((p) => ({ ...p, workType: e.target.value }))} maxLength={200} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">مبلغ الراتب (د.ع) *</label>
                  <input type="number" min={1} value={editFormData.salaryAmount ?? ''} onChange={(e) => setEditFormData((p) => ({ ...p, salaryAmount: Number(e.target.value) || 0 }))} required className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">تاريخ الصرف *</label>
                  <input type="date" value={editFormData.paymentDate ?? ''} onChange={(e) => setEditFormData((p) => ({ ...p, paymentDate: e.target.value }))} required className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">ملاحظات</label>
                <textarea value={editFormData.notes ?? ''} onChange={(e) => setEditFormData((p) => ({ ...p, notes: e.target.value }))} rows={2} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowEditModal(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">إلغاء</button>
                <button type="submit" disabled={updateMutation.isPending} className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md disabled:opacity-50">{updateMutation.isPending ? 'جاري الحفظ...' : 'حفظ'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Deduction Modal */}
      {showDeductionModal && entryForDeduction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">{editingDeduction ? 'تعديل خصم' : 'خصم من راتب'} — {entryForDeduction.employeeName}</h2>
              <button type="button" onClick={() => { setShowDeductionModal(false); setEntryForDeduction(null); setEditingDeduction(null); }} className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors">
                <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleDeductionSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">المبلغ (د.ع) *</label>
                <input type="number" min={1} value={deductionForm.amount || ''} onChange={(e) => setDeductionForm((p) => ({ ...p, amount: Number(e.target.value) || 0 }))} required className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white" placeholder="0" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">السبب *</label>
                <input type="text" value={deductionForm.reason} onChange={(e) => setDeductionForm((p) => ({ ...p, reason: e.target.value }))} required maxLength={500} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white" placeholder="سبب الخصم" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">تاريخ الخصم *</label>
                <input type="date" value={deductionForm.deductionDate} onChange={(e) => setDeductionForm((p) => ({ ...p, deductionDate: e.target.value }))} required className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => { setShowDeductionModal(false); setEntryForDeduction(null); setEditingDeduction(null); }} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">إلغاء</button>
                <button type="submit" disabled={deductionMutation.isPending || updateDeductionMutation.isPending} className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md disabled:opacity-50">{(deductionMutation.isPending || updateDeductionMutation.isPending) ? 'جاري الحفظ...' : (editingDeduction ? 'حفظ التعديل' : 'إضافة خصم')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Advance Modal */}
      {showAdvanceModal && entryForAdvance && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">{editingAdvance ? 'تعديل سلفة' : 'سلفة من راتب'} — {entryForAdvance.employeeName}</h2>
              <button type="button" onClick={() => { setShowAdvanceModal(false); setEntryForAdvance(null); setEditingAdvance(null); }} className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors">
                <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleAdvanceSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">المبلغ (د.ع) *</label>
                <input type="number" min={1} value={advanceForm.amount || ''} onChange={(e) => setAdvanceForm((p) => ({ ...p, amount: Number(e.target.value) || 0 }))} required className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white" placeholder="0" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">السبب *</label>
                <input type="text" value={advanceForm.reason} onChange={(e) => setAdvanceForm((p) => ({ ...p, reason: e.target.value }))} required maxLength={500} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white" placeholder="سبب السلفة" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">تاريخ السحب (يوم السلفة) *</label>
                <input type="date" value={advanceForm.withdrawalDate} onChange={(e) => setAdvanceForm((p) => ({ ...p, withdrawalDate: e.target.value }))} required className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white" />
                <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  يُحسب اليوم بنفس تقويم العراق كما في صفحة الحسابات اليومية؛ المبلغ لا يتجاوز الوارد المتاح لذلك اليوم بعد سلف سابقة.
                </p>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => { setShowAdvanceModal(false); setEntryForAdvance(null); setEditingAdvance(null); }} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">إلغاء</button>
                <button type="submit" disabled={advanceMutation.isPending || updateAdvanceMutation.isPending} className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md disabled:opacity-50">{(advanceMutation.isPending || updateAdvanceMutation.isPending) ? 'جاري الحفظ...' : (editingAdvance ? 'حفظ التعديل' : 'إضافة سلفة')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* فلترة بالتاريخ */}
      {showFilterModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
                فلترة كشف الرواتب بالتاريخ
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
                الفلترة حسب تاريخ صرف الراتب (PaymentDate). اترك الحقل فارغاً لعدم تحديد حد.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">من تاريخ</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">إلى تاريخ</label>
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

      {/* سجل الموظف — الخصومات والسلف */}
      {entryForRecord && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4" onClick={() => setEntryForRecord(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">سجل — {entryForRecord.employeeName}</h2>
              <button type="button" onClick={() => setEntryForRecord(null)} className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors">
                <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
              {/* الخصومات */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                  <MinusCircle className="h-4 w-4 text-red-500" />
                  الخصومات {entryForRecord.deductions?.length ? `(${entryForRecord.deductions.length})` : ''}
                </h3>
                {!entryForRecord.deductions?.length ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 py-2">لا يوجد خصومات</p>
                ) : (
                  <div className="wakeel-table-scroll">
                    <table className="min-w-full text-right text-sm">
                      <thead>
                        <tr>
                          <th className="px-3 py-2 font-medium text-gray-500 dark:text-gray-400">المبلغ</th>
                          <th className="px-3 py-2 font-medium text-gray-500 dark:text-gray-400">السبب</th>
                          <th className="px-3 py-2 font-medium text-gray-500 dark:text-gray-400">التاريخ</th>
                          <th className="px-3 py-2 font-medium text-gray-500 dark:text-gray-400">إجراء</th>
                        </tr>
                      </thead>
                      <tbody>
                        {entryForRecord.deductions.map((d) => (
                          <tr key={d.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <td className="px-3 py-2 font-medium text-red-600 dark:text-red-400">{formatNumber(d.amount ?? 0, { suffix: ' د.ع' })}</td>
                            <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{d.reason || '—'}</td>
                            <td className="px-3 py-2 text-gray-500 dark:text-gray-400">{d.deductionDate ? formatDate(d.deductionDate.includes('T') ? d.deductionDate : d.deductionDate + 'T00:00:00') : '—'}</td>
                            <td className="px-3 py-2">
                              <button
                                type="button"
                                onClick={() => openEditDeductionModal(entryForRecord, d)}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-md transition-colors"
                                title="تعديل الخصم"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                                تعديل
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              {/* السلف */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-amber-500" />
                  السلف {entryForRecord.advances?.length ? `(${entryForRecord.advances.length})` : ''}
                </h3>
                {!entryForRecord.advances?.length ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 py-2">لا يوجد سلف</p>
                ) : (
                  <div className="wakeel-table-scroll">
                    <table className="min-w-full text-right text-sm">
                      <thead>
                        <tr>
                          <th className="px-3 py-2 font-medium text-gray-500 dark:text-gray-400">المبلغ</th>
                          <th className="px-3 py-2 font-medium text-gray-500 dark:text-gray-400">السبب</th>
                          <th className="px-3 py-2 font-medium text-gray-500 dark:text-gray-400">التاريخ</th>
                          <th className="px-3 py-2 font-medium text-gray-500 dark:text-gray-400">إجراء</th>
                        </tr>
                      </thead>
                      <tbody>
                        {entryForRecord.advances.map((a) => (
                          <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <td className="px-3 py-2 font-medium text-amber-600 dark:text-amber-400">{formatNumber(a.amount ?? 0, { suffix: ' د.ع' })}</td>
                            <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{a.reason || '—'}</td>
                            <td className="px-3 py-2 text-gray-500 dark:text-gray-400">{a.withdrawalDate ? formatDate(a.withdrawalDate.includes('T') ? a.withdrawalDate : a.withdrawalDate + 'T00:00:00') : '—'}</td>
                            <td className="px-3 py-2">
                              <button
                                type="button"
                                onClick={() => openEditAdvanceModal(entryForRecord, a)}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-md transition-colors"
                                title="تعديل السلفة"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                                تعديل
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalarySheetPage;
