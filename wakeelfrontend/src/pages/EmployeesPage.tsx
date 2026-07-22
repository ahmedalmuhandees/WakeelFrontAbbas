import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService, ApiService } from '../services/api';
import { showSuccess, showError } from '../utils/notifications';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';
import {
  AgentEmployeeCreateRequest,
  AgentEmployeeUpdateRequest,
  User,
  AgentReseller,
  DEFAULT_EMPLOYEE_PERMISSIONS,
  EMPLOYEE_PERMISSION_FORM_KEYS,
  EMPLOYEE_PERMISSION_LABELS,
  EmployeePermissions,
  getEmployeePermissionChecked,
} from '../types';
import WifiLoaderComponent from '../components/WifiLoaderComponent';
import { UserPlus, X, Edit, Trash2, CheckCircle2 } from 'lucide-react';

const getEmployeeRoleLabel = (role: UserRole | number | undefined): string => {
  if (role == null) return '—';
  const r = typeof role === 'number' ? role : (role as UserRole);
  if (r === UserRole.Employee) return 'موظف';
  if (r === UserRole.SubAgent) return 'مدير ثانوي';
  return '—';
};

const EmployeesPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const canAccess = user?.role === UserRole.Agent || user?.role === UserRole.SubAgent || user?.role === UserRole.Employee;
  const canManageEmployees = user?.role === UserRole.Agent || user?.role === UserRole.SubAgent;
  const canCreateSubAgent = user?.role === UserRole.Agent;
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<User | null>(null);
  const [newEmployeeData, setNewEmployeeData] = useState<AgentEmployeeCreateRequest>({
    username: '',
    fullName: '',
    password: '',
    role: UserRole.Employee,
    ...DEFAULT_EMPLOYEE_PERMISSIONS,
    allowedResellerIds: [],
  });
  const [editEmployeeData, setEditEmployeeData] = useState<AgentEmployeeUpdateRequest>({
    fullName: '',
    isActive: true,
    ...DEFAULT_EMPLOYEE_PERMISSIONS,
    allowedResellerIds: [],
  });

  const { data: employeesList, isLoading: employeesLoading } = useQuery({
    queryKey: ['my-employees'],
    queryFn: () => apiService.getMyEmployees(),
    enabled: !!user && (user.role === UserRole.Agent || user.role === UserRole.SubAgent || user.role === UserRole.Employee),
  });

  const { data: myResellers = [] } = useQuery<AgentReseller[]>({
    queryKey: ['my-resellers-for-employees'],
    queryFn: () => apiService.getMyResellers(),
    enabled: canManageEmployees,
  });

  const createEmployeeMutation = useMutation({
    mutationFn: (data: AgentEmployeeCreateRequest) => apiService.createMyEmployee(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-employees'] });
      setShowAddModal(false);
      setNewEmployeeData({ username: '', fullName: '', password: '', role: UserRole.Employee, ...DEFAULT_EMPLOYEE_PERMISSIONS, allowedResellerIds: [] });
      showSuccess('تمت الإضافة', 'تم إضافة الموظف بنجاح');
    },
    onError: (err: unknown) => {
      showError('خطأ', ApiService.showError(err));
    },
  });

  const updateEmployeeMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: AgentEmployeeUpdateRequest }) => apiService.updateMyEmployee(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-employees'] });
      setShowEditModal(false);
      setSelectedEmployee(null);
      showSuccess('تم التعديل', 'تم تحديث الموظف بنجاح');
    },
    onError: (err: unknown) => {
      showError('خطأ', ApiService.showError(err));
    },
  });

  const deleteEmployeeMutation = useMutation({
    mutationFn: (id: string) => apiService.deleteMyEmployee(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-employees'] });
      showSuccess('تم الحذف', 'تم حذف الموظف بنجاح');
    },
    onError: (err: unknown) => {
      showError('خطأ', ApiService.showError(err));
    },
  });

  const handleAddEmployee = () => {
    if (!newEmployeeData.username?.trim() || !newEmployeeData.fullName?.trim() || !newEmployeeData.password) {
      showError('خطأ', 'يرجى تعبئة جميع الحقول');
      return;
    }
    const dataToSend = newEmployeeData.role === UserRole.SubAgent
      ? { ...newEmployeeData, ...DEFAULT_EMPLOYEE_PERMISSIONS }
      : newEmployeeData;
    createEmployeeMutation.mutate(dataToSend);
  };

  const handleOpenEdit = (emp: User) => {
    setSelectedEmployee(emp);
    const permissions: EmployeePermissions = { ...DEFAULT_EMPLOYEE_PERMISSIONS };
    for (const key of EMPLOYEE_PERMISSION_FORM_KEYS) {
      permissions[key] = emp[key] ?? DEFAULT_EMPLOYEE_PERMISSIONS[key];
    }
    setEditEmployeeData({
      fullName: emp.fullName || '',
      isActive: emp.isActive ?? true,
      ...permissions,
      allowedResellerIds: emp.allowedResellerIds ?? [],
    });
    setShowEditModal(true);
  };

  const handleDelete = (emp: User) => {
    const ok = window.confirm(`هل أنت متأكد من حذف الموظف: ${emp.fullName}؟`);
    if (!ok) return;
    deleteEmployeeMutation.mutate(emp.id);
  };

  if (!canAccess) return null;

  return (
    <div className="p-3 sm:p-4 lg:p-6">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <UserPlus className="h-6 w-6 sm:h-7 sm:w-7" />
          موظفو الوكيل
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          إدارة الموظفين المرتبطين بوكالتك
        </p>
      </div>

      {employeesLoading ? (
        <div className="flex justify-center py-12">
          <WifiLoaderComponent
            background="transparent"
            desktopSize="80px"
            mobileSize="60px"
            text="تحميل البيانات..."
          />
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between flex-wrap gap-2">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              الوكيل: <span className="font-medium text-gray-900 dark:text-white">{user?.fullName}</span> — @{user?.username}
            </p>
            {canManageEmployees && (
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md text-sm"
              >
                <UserPlus className="h-4 w-4" />
                إضافة موظف
              </button>
            )}
          </div>
          <div className="p-4">
            <ul className="space-y-2">
              {employeesList?.length ? (
                employeesList.map((emp) => (
                  <li
                    key={emp.id}
                    className="flex items-center justify-between py-3 px-4 bg-gray-50 dark:bg-gray-700 rounded-md"
                  >
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{emp.fullName}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{emp.username}</p>
                      <p className="text-xs mt-1 flex items-center gap-1.5 flex-wrap">
                        <span className={emp.isActive ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}>
                          {emp.isActive ? 'نشط' : 'غير نشط'}
                        </span>
                        <span className="text-gray-500 dark:text-gray-400">·</span>
                        <span className="text-gray-600 dark:text-gray-300">{getEmployeeRoleLabel(emp.role)}</span>
                      </p>
                    </div>
                    {canManageEmployees && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(emp)}
                          className="px-3 py-2 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 text-sm flex items-center gap-2"
                        >
                          <Edit className="h-4 w-4" />
                          تعديل
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(emp)}
                          disabled={deleteEmployeeMutation.isPending}
                          className="px-3 py-2 rounded-md bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm flex items-center gap-2"
                        >
                          <Trash2 className="h-4 w-4" />
                          حذف
                        </button>
                      </div>
                    )}
                  </li>
                ))
              ) : (
                <li className="text-gray-500 dark:text-gray-400 py-8 text-center text-sm">
                  {canManageEmployees ? 'لا يوجد موظفون مسجلون. استخدم «إضافة موظف» لإضافة موظف جديد.' : 'لا يوجد موظفون مسجلون.'}
                </li>
              )}
            </ul>
          </div>
        </div>
      )}

      {/* Add Employee Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl mx-3 sm:mx-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">إضافة موظف جديد</h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewEmployeeData({ username: '', fullName: '', password: '', role: UserRole.Employee, ...DEFAULT_EMPLOYEE_PERMISSIONS, allowedResellerIds: [] });
                }}
                className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
            <div className="space-y-4 p-4 sm:p-6 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">اسم المستخدم *</label>
                  <input
                    type="text"
                    value={newEmployeeData.username}
                    onChange={(e) => setNewEmployeeData((p) => ({ ...p, username: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الاسم الكامل *</label>
                  <input
                    type="text"
                    value={newEmployeeData.fullName}
                    onChange={(e) => setNewEmployeeData((p) => ({ ...p, fullName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">كلمة المرور *</label>
                  <input
                    type="password"
                    value={newEmployeeData.password}
                    onChange={(e) => setNewEmployeeData((p) => ({ ...p, password: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الدور</label>
                  <select
                    value={newEmployeeData.role ?? UserRole.Employee}
                    onChange={(e) => setNewEmployeeData((p) => ({ ...p, role: parseInt(e.target.value, 10) as UserRole }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                  >
                    <option value={UserRole.Employee}>موظف</option>
                    {canCreateSubAgent && (
                      <option value={UserRole.SubAgent}>مدير ثانوي</option>
                    )}
                  </select>
                  {!canCreateSubAgent && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">فقط الوكيل يمكنه إنشاء مدير ثانوي</p>
                  )}
                </div>
              </div>
              <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">الصلاحيات</p>
                {newEmployeeData.role === UserRole.SubAgent ? (
                  <div className="bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg p-3">
                    <p className="text-sm font-medium text-primary-800 dark:text-primary-200 mb-1">منح جميع الصلاحيات</p>
                    <p className="text-xs text-primary-700 dark:text-primary-300">
                      المدير الثانوي يملك نفس صلاحيات الوكيل: تفعيل وتعديل وحذف مشترك، إضافة وتعديل وحذف دين، عرض تفاصيل دين، الفواتير وإيصالات التجديد، الحسابات والرصيد والتسليمات، وغيرها.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                    {EMPLOYEE_PERMISSION_FORM_KEYS.map((key) => (
                      <label key={key} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                        <input
                          type="checkbox"
                          checked={getEmployeePermissionChecked(newEmployeeData, key)}
                          onChange={(e) => setNewEmployeeData((p) => ({ ...p, [key]: e.target.checked }))}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                        {EMPLOYEE_PERMISSION_LABELS[key]}
                      </label>
                    ))}
                  </div>
                )}
              </div>
              {newEmployeeData.role !== UserRole.SubAgent && myResellers.length > 0 && (
                <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">المناطق المسموح بها</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">بدون اختيار = كل المناطق</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                    {myResellers.map((r) => {
                      const checked = (newEmployeeData.allowedResellerIds ?? []).includes(r.id);
                      return (
                        <label key={r.id} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              setNewEmployeeData((p) => {
                                const curr = p.allowedResellerIds ?? [];
                                const next = e.target.checked ? [...curr, r.id] : curr.filter((id) => id !== r.id);
                                return { ...p, allowedResellerIds: next };
                              });
                            }}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                          {r.name}
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-2 p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setNewEmployeeData({ username: '', fullName: '', password: '', role: UserRole.Employee, ...DEFAULT_EMPLOYEE_PERMISSIONS, allowedResellerIds: [] });
                  }}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-md text-gray-800 dark:text-white"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleAddEmployee}
                  disabled={createEmployeeMutation.isPending}
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md disabled:opacity-50"
                >
                  {createEmployeeMutation.isPending ? 'جاري الإضافة...' : 'إضافة'}
                </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Employee Modal */}
      {showEditModal && selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">تعديل الموظف</h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedEmployee(null);
                }}
                className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="bg-gray-50 dark:bg-gray-700 rounded-md p-3">
                <p className="text-sm text-gray-700 dark:text-gray-200">
                  @{selectedEmployee.username}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الاسم الكامل *</label>
                <input
                  type="text"
                  value={editEmployeeData.fullName}
                  onChange={(e) => setEditEmployeeData((p) => ({ ...p, fullName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">نشط</label>
                <input
                  type="checkbox"
                  checked={editEmployeeData.isActive !== false}
                  onChange={(e) => setEditEmployeeData((p) => ({ ...p, isActive: e.target.checked }))}
                  className="h-4 w-4"
                />
              </div>
              <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">الصلاحيات</p>
                <div className="grid grid-cols-1 gap-2">
                  {EMPLOYEE_PERMISSION_FORM_KEYS.map((key) => (
                    <label key={key} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <input
                        type="checkbox"
                        checked={getEmployeePermissionChecked(editEmployeeData, key)}
                        onChange={(e) => setEditEmployeeData((p) => ({ ...p, [key]: e.target.checked }))}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      {EMPLOYEE_PERMISSION_LABELS[key]}
                    </label>
                  ))}
                </div>
              </div>
              {myResellers.length > 0 && (
                <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">المناطق المسموح بها</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">بدون اختيار = كل المناطق</p>
                  <div className="grid grid-cols-1 gap-2 max-h-40 overflow-auto">
                    {myResellers.map((r) => {
                      const checked = (editEmployeeData.allowedResellerIds ?? []).includes(r.id);
                      return (
                        <label key={r.id} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              setEditEmployeeData((p) => {
                                const curr = p.allowedResellerIds ?? [];
                                const next = e.target.checked ? [...curr, r.id] : curr.filter((id) => id !== r.id);
                                return { ...p, allowedResellerIds: next };
                              });
                            }}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                          {r.name}
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedEmployee(null);
                  }}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-md text-gray-800 dark:text-white"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!editEmployeeData.fullName?.trim()) {
                      showError('خطأ', 'يرجى إدخال الاسم الكامل');
                      return;
                    }
                    updateEmployeeMutation.mutate({ id: selectedEmployee.id, data: { ...editEmployeeData, fullName: editEmployeeData.fullName.trim() } });
                  }}
                  disabled={updateEmployeeMutation.isPending}
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md disabled:opacity-50 flex items-center gap-2"
                >
                  {updateEmployeeMutation.isPending ? (
                    'جاري الحفظ...'
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      حفظ
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeesPage;
