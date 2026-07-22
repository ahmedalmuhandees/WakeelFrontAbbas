import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService, ApiService } from '../services/api';
import {
  User,
  UserRole,
  UserCreateRequest,
  PaginatedResponse,
  PaginationParams,
  SubscriptionSystemType,
  DEFAULT_EMPLOYEE_PERMISSIONS,
  EMPLOYEE_PERMISSION_FORM_KEYS,
  EMPLOYEE_PERMISSION_LABELS,
  getEmployeePermissionChecked,
  type EmployeePermissions,
} from '../types';
import Pagination from '../components/Pagination';
import WifiLoaderComponent from '../components/WifiLoaderComponent';
import { showSuccess, showError } from '../utils/notifications';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  UserCog,
  Shield,
  UserCheck,
  X,
} from 'lucide-react';

const initialAddForm: UserCreateRequest = {
  username: '',
  fullName: '',
  password: '',
  role: UserRole.Employee,
  ...DEFAULT_EMPLOYEE_PERMISSIONS,
};

const UsersPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [appliedSearchTerm, setAppliedSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState<UserCreateRequest>(() => ({ ...initialAddForm }));
  const queryClient = useQueryClient();
  const { data: usersResponse, error, isLoading } = useQuery<PaginatedResponse<User>>({
    queryKey: ['users', currentPage, pageSize, appliedSearchTerm, roleFilter, statusFilter],
    queryFn: () => {
      const params: PaginationParams = {
        page: currentPage,
        pageSize: pageSize,
        search: appliedSearchTerm || undefined,
        role: roleFilter !== 'all' ? roleFilter.toString() : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      };
      return apiService.getAllUsers(params);
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: (id: string) => apiService.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const createUserMutation = useMutation({
    mutationFn: (data: UserCreateRequest) => apiService.createUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowAddModal(false);
      setAddForm({ ...initialAddForm });
      showSuccess('تمت الإضافة', 'تم إنشاء المستخدم بنجاح.');
    },
    onError: (err: unknown) => {
      showError('خطأ', ApiService.showError(err));
    },
  });

  const users = usersResponse?.data || [];

  const openAddModal = () => {
    setAddForm({
      ...initialAddForm,
      role: UserRole.Employee,
      ...DEFAULT_EMPLOYEE_PERMISSIONS,
    });
    setShowAddModal(true);
  };

  const handleAddRoleChange = (role: UserRole) => {
    setAddForm((prev) => {
      const next: UserCreateRequest = { ...prev, role };
      if (role === UserRole.Employee) {
        Object.assign(next, DEFAULT_EMPLOYEE_PERMISSIONS);
      }
      if (role === UserRole.MainAgent) {
        next.subscriptionType = SubscriptionSystemType.Yearly;
        next.subscriptionStartDate = '';
        next.subscriptionEndDate = '';
      }
      return next;
    });
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.username?.trim() || !addForm.fullName?.trim() || !addForm.password) {
      showError('خطأ', 'اسم المستخدم والاسم الكامل وكلمة المرور مطلوبة.');
      return;
    }
    const payload: UserCreateRequest = {
      username: addForm.username.trim(),
      fullName: addForm.fullName.trim(),
      password: addForm.password,
      role: addForm.role,
    };
    if (addForm.role === UserRole.MainAgent) {
      payload.subscriptionType = addForm.subscriptionType ?? SubscriptionSystemType.Yearly;
      if (addForm.subscriptionStartDate) payload.subscriptionStartDate = addForm.subscriptionStartDate.slice(0, 10);
      if (addForm.subscriptionEndDate) payload.subscriptionEndDate = addForm.subscriptionEndDate.slice(0, 10);
    }
    if (addForm.role === UserRole.Employee) {
      payload.canActivateSubscriber = addForm.canActivateSubscriber ?? true;
      payload.canEditSubscriber = addForm.canEditSubscriber ?? true;
      payload.canDeleteSubscriber = addForm.canDeleteSubscriber ?? true;
      payload.canPayDebt = addForm.canPayDebt ?? true;
      payload.canAccessAccounts = addForm.canAccessAccounts ?? true;
      payload.canEditAccountsLedger = addForm.canEditAccountsLedger ?? false;
      payload.canAccessDealers = addForm.canAccessDealers ?? false;
      payload.canAccessInvoices = addForm.canAccessInvoices ?? true;
      payload.canAccessExpensesAndSalarySheet = addForm.canAccessExpensesAndSalarySheet ?? true;
      payload.canAccessSubscriberDashboard = addForm.canAccessSubscriberDashboard ?? false;
      payload.canViewAllSubscribers = addForm.canViewAllSubscribers ?? false;
      payload.canReceiveTaskRequests = addForm.canReceiveTaskRequests ?? false;
      payload.canManageEmployeeTasks = addForm.canManageEmployeeTasks ?? false;
      payload.canManageMaterialsAndSales = addForm.canManageMaterialsAndSales ?? false;
    }
    createUserMutation.mutate(payload);
  };
  
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAppliedSearchTerm(searchTerm.trim());
    setCurrentPage(1);
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setAppliedSearchTerm('');
    setCurrentPage(1);
  };

  const handleRoleFilterChange = (role: UserRole | 'all') => {
    setRoleFilter(role);
    setCurrentPage(1); // Reset to first page when filtering
  };

  const handleStatusFilterChange = (status: 'all' | 'active' | 'inactive') => {
    setStatusFilter(status);
    setCurrentPage(1); // Reset to first page when filtering
  };

  const getRoleBadge = (role: UserRole) => {
    const roleConfig = {
      [UserRole.Admin]: {
        text: 'مدير',
        class: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
        icon: Shield
      },
      [UserRole.Agent]: {
        text: 'وكيل',
        class: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
        icon: UserCheck
      },
      [UserRole.Subscriber]: {
        text: 'مشترك',
        class: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
        icon: UserCog
      },
      [UserRole.Employee]: {
        text: 'موظف',
        class: 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400',
        icon: UserCog
      },
      [UserRole.SubAgent]: {
        text: 'مدير ثانوي',
        class: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400',
        icon: UserCheck
      },
      [UserRole.MainAgent]: {
        text: 'وكيل رئيسي',
        class: 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400',
        icon: UserCheck
      },
    };

    const config = roleConfig[role];
    const Icon = config.icon;
    
    return (
      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${config.class}`}>
        <Icon className="h-3 w-3 mr-1" />
        {config.text}
      </span>
    );
  };

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
        نشط
      </span>
    ) : (
      <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
        غير نشط
      </span>
    );
  };

  const handleDelete = (id: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا المستخدم؟')) {
      deleteUserMutation.mutate(id);
    }
  };


  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-md">
          خطأ في تحميل بيانات المستخدمين
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center h-screen">
        <WifiLoaderComponent
          background="transparent"
          desktopSize="150px"
          mobileSize="150px"
          text="تحميل المستخدمين..."
          backColor="#E8F2FC"
          frontColor="#4645F6"
        />
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            إدارة المستخدمين
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            عرض وإدارة جميع المستخدمين في النظام
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center space-x-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>إضافة مستخدم</span>
        </button>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" role="dialog" aria-modal="true">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">إضافة مستخدم</h2>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
                aria-label="إغلاق"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">اسم المستخدم *</label>
                <input
                  type="text"
                  value={addForm.username}
                  onChange={(e) => setAddForm((f) => ({ ...f, username: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الاسم الكامل *</label>
                <input
                  type="text"
                  value={addForm.fullName}
                  onChange={(e) => setAddForm((f) => ({ ...f, fullName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">كلمة المرور *</label>
                <input
                  type="password"
                  value={addForm.password}
                  onChange={(e) => setAddForm((f) => ({ ...f, password: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الدور *</label>
                <select
                  value={addForm.role}
                  onChange={(e) => handleAddRoleChange(Number(e.target.value) as UserRole)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                >
                  <option value={UserRole.Admin}>مدير</option>
                  <option value={UserRole.Agent}>وكيل</option>
                  <option value={UserRole.SubAgent}>مدير ثانوي</option>
                  <option value={UserRole.MainAgent}>وكيل رئيسي</option>
                  <option value={UserRole.Employee}>موظف</option>
                  <option value={UserRole.Subscriber}>مشترك</option>
                </select>
              </div>

              {/* اشتراك الوكيل الرئيسي */}
              {addForm.role === UserRole.MainAgent && (
                <div className="space-y-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">اشتراك الوكيل الرئيسي</p>
                  <div>
                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">نوع الاشتراك</label>
                    <select
                      value={addForm.subscriptionType ?? SubscriptionSystemType.Yearly}
                      onChange={(e) => setAddForm((f) => ({ ...f, subscriptionType: Number(e.target.value) as SubscriptionSystemType }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                    >
                      <option value={SubscriptionSystemType.Yearly}>سنوي</option>
                      <option value={SubscriptionSystemType.Daily}>يومي</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">بداية الاشتراك</label>
                    <input
                      type="date"
                      value={(addForm.subscriptionStartDate || '').slice(0, 10)}
                      onChange={(e) => setAddForm((f) => ({ ...f, subscriptionStartDate: e.target.value || undefined }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">نهاية الاشتراك</label>
                    <input
                      type="date"
                      value={(addForm.subscriptionEndDate || '').slice(0, 10)}
                      onChange={(e) => setAddForm((f) => ({ ...f, subscriptionEndDate: e.target.value || undefined }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                </div>
              )}

              {/* صلاحيات الموظف */}
              {addForm.role === UserRole.Employee && (
                <div className="space-y-2 p-3 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">صلاحيات الموظف</p>
                  {EMPLOYEE_PERMISSION_FORM_KEYS.map((key) => (
                    <label key={key} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <input
                        type="checkbox"
                        checked={getEmployeePermissionChecked(addForm as Partial<EmployeePermissions>, key)}
                        onChange={(e) => setAddForm((f) => ({ ...f, [key]: e.target.checked }))}
                        className="rounded border-gray-300"
                      />
                      {EMPLOYEE_PERMISSION_LABELS[key]}
                    </label>
                  ))}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={createUserMutation.isPending}
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md font-medium disabled:opacity-50"
                >
                  {createUserMutation.isPending ? 'جاري الحفظ...' : 'إنشاء المستخدم'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-white rounded-md font-medium"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="البحث بالاسم أو اسم المستخدم..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md text-sm font-medium whitespace-nowrap"
            >
              بحث
            </button>
            <button
              type="button"
              onClick={handleClearSearch}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 rounded-md text-sm font-medium whitespace-nowrap"
            >
              تفريغ
            </button>
          </div>
          <div className="sm:w-48">
            <select
              value={roleFilter}
              onChange={(e) => handleRoleFilterChange(e.target.value as UserRole | 'all')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="all">جميع الأدوار</option>
              <option value={UserRole.Admin}>مدير</option>
              <option value={UserRole.Agent}>وكيل</option>
              <option value={UserRole.SubAgent}>مدير ثانوي</option>
              <option value={UserRole.MainAgent}>وكيل رئيسي</option>
              <option value={UserRole.Employee}>موظف</option>
              <option value={UserRole.Subscriber}>مشترك</option>
            </select>
          </div>
          <div className="sm:w-48">
            <select
              value={statusFilter}
              onChange={(e) => handleStatusFilterChange(e.target.value as 'all' | 'active' | 'inactive')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="all">جميع الحالات</option>
              <option value="active">نشط</option>
              <option value="inactive">غير نشط</option>
            </select>
          </div>
        </form>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="wakeel-table-scroll">
          <table className="min-w-full text-right">
            <thead>
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  المستخدم
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  الدور
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  الحالة
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  الوكيل المسؤول
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  الإجراءات
                </th>
              </tr>
            </thead>
            <tbody>
              {users?.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                          <span className="text-primary-600 dark:text-primary-400 font-semibold">
                            {user.fullName.charAt(0)}
                          </span>
                        </div>
                      </div>
                      <div className="mr-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {user.fullName}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          @{user.username}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getRoleBadge(user.role)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(user.isActive)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {user.createdByAgentName || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button className="text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300">
                        <Eye className="h-4 w-4" />
                      </button>
                      <button className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(user.id)}
                        disabled={deleteUserMutation.isPending}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {users?.length === 0 && (
          <div className="text-center py-12">
            <UserCog className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
              لا توجد مستخدمين
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              ابدأ بإضافة مستخدم جديد
            </p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {usersResponse && (
        <Pagination
          currentPage={usersResponse.currentPage}
          totalPages={usersResponse.totalPages}
          totalItems={usersResponse.totalItems}
          pageSize={usersResponse.pageSize}
          hasNextPage={usersResponse.hasNextPage}
          hasPreviousPage={usersResponse.hasPreviousPage}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  );
};

export default UsersPage;
