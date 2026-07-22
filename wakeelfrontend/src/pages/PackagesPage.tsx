import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../services/api';
import {
  Profile,
  ProfileCreateRequest,
  ProfileUpdateRequest,
  PaginatedResponse,
  AgentReseller,
  ProfilePackageType,
  Material,
  UserRole,
} from '../types';
import { showSuccess, showError } from '../utils/notifications';
import { useConfirmation } from '../contexts/ConfirmationContext';
import { useDigits } from '../contexts/DigitsContext';
import { useOffline } from '../contexts/OfflineContext';
import { useAuth } from '../contexts/AuthContext';
import { fetchProfilesWithCache } from '../services/offlineSync';
import WifiLoaderComponent from '../components/WifiLoaderComponent';
import Pagination from '../components/Pagination';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Eye, 
  Package,
  DollarSign,
  Calendar,
  X,
  Save
} from 'lucide-react';

const PAGE_SIZE_OPTIONS = [6, 12, 24, 48];

const PackagesPage: React.FC = () => {
  const { user } = useAuth();
  const { confirmDelete } = useConfirmation();
  const { formatNumber, formatDate } = useDigits();
  const { online } = useOffline();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [searchTerm, setSearchTerm] = useState('');
  const [appliedSearchTerm, setAppliedSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<number | ''>(''); // '' = الكل، 1 = نشط، 0 = غير نشط
  const [selectedResellerId, setSelectedResellerId] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPackage, setEditingPackage] = useState<Profile | null>(null);
  const queryClient = useQueryClient();
  // Form state for adding new package
  const [formData, setFormData] = useState<ProfileCreateRequest>({
    name: '',
    originalPrice: 0,
    salePrice: 0,
    renewalPeriod: 30, // فترة التجديد بالأيام
    packageType: ProfilePackageType.Subscription,
    includedMaterialIds: [],
    isActive: true,
  });

  // Form state for editing package
  const [editFormData, setEditFormData] = useState<ProfileUpdateRequest>({
    name: '',
    originalPrice: 0,
    salePrice: 0,
    renewalPeriod: 30, // فترة التجديد بالأيام
    packageType: ProfilePackageType.Subscription,
    includedMaterialIds: [],
    isActive: true
  });

  const { data: profilesResponse, error, isLoading } = useQuery<PaginatedResponse<Profile>>({
    queryKey: ['profiles', currentPage, pageSize, appliedSearchTerm, statusFilter, selectedResellerId, online],
    queryFn: () => fetchProfilesWithCache(online, {
      page: currentPage,
      pageSize,
      searchTerm: appliedSearchTerm.trim() || undefined,
      status: statusFilter === '' ? undefined : statusFilter,
      resellerId: selectedResellerId || undefined,
    }),
  });

  const { data: myResellers = [] } = useQuery<AgentReseller[]>({
    queryKey: ['myResellers', 'packages'],
    queryFn: () => apiService.getMyResellers(),
    enabled: user?.role !== undefined,
  });

  const packages = profilesResponse?.data ?? [];

  const showMaterialsPickerAdd =
    showAddModal && formData.packageType === ProfilePackageType.SpecialOffer;
  const showMaterialsPickerEdit =
    showEditModal && editFormData.packageType === ProfilePackageType.SpecialOffer;

  const { data: materialsResponse, isPending: materialsLoading, isError: materialsError } = useQuery<PaginatedResponse<Material>>({
    queryKey: ['materials', 'packages-form'],
    queryFn: () => apiService.getMaterials(undefined, { page: 1, pageSize: 500 }),
    enabled:
      (showMaterialsPickerAdd || showMaterialsPickerEdit) &&
      (user?.role !== UserRole.Employee ||
        !!user?.canManageMaterialsAndSales ||
        !!user?.canActivateSubscriber),
  });
  const materialsList = materialsResponse?.data ?? [];

  const packageTypeBadge = (t?: ProfilePackageType) => {
    if (t === ProfilePackageType.Extension) return 'تمديد';
    if (t === ProfilePackageType.SpecialOffer) return 'عرض خاص';
    return 'اشتراك';
  };

  const deletePackageMutation = useMutation({
    mutationFn: (id: string) => apiService.deleteProfile(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      showSuccess('تم الحذف بنجاح', 'تم حذف الباقة بنجاح');
    },
    onError: (error: any) => {
      showError('خطأ في الحذف', 'حدث خطأ أثناء حذف الباقة');
    },
  });

  const createPackageMutation = useMutation({
    mutationFn: (profileData: ProfileCreateRequest) =>
      apiService.createProfile({ ...profileData, agentResellerId: selectedResellerId || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      setShowAddModal(false);
      showSuccess('تم الإضافة بنجاح', 'تم إضافة الباقة الجديدة بنجاح');
      // Reset form
      setFormData({
        name: '',
        originalPrice: 0,
        salePrice: 0,
        renewalPeriod: 30,
        packageType: ProfilePackageType.Subscription,
        includedMaterialIds: [],
        isActive: true,
      });
    },
    onError: (error: any) => {
      showError('خطأ في الإضافة', 'حدث خطأ أثناء إضافة الباقة');
    },
  });

  const updatePackageMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ProfileUpdateRequest }) => 
      apiService.updateProfile(id, { ...data, agentResellerId: selectedResellerId || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      setShowEditModal(false);
      setEditingPackage(null);
      showSuccess('تم التحديث بنجاح', 'تم تحديث الباقة بنجاح');
      // Reset edit form
      setEditFormData({
        name: '',
        originalPrice: 0,
        salePrice: 0,
        renewalPeriod: 30,
        packageType: ProfilePackageType.Subscription,
        includedMaterialIds: [],
        isActive: true
      });
    },
    onError: (error: any) => {
      showError('خطأ في التحديث', 'حدث خطأ أثناء تحديث الباقة');
    },
  });

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAppliedSearchTerm(searchTerm.trim());
    setCurrentPage(1);
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setAppliedSearchTerm('');
    setSelectedResellerId('');
    setCurrentPage(1);
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirmDelete('باقة');
    if (confirmed) {
      deletePackageMutation.mutate(id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: ProfileCreateRequest = {
      ...formData,
      includedMaterialIds:
        formData.packageType === ProfilePackageType.SpecialOffer
          ? formData.includedMaterialIds?.filter(Boolean) ?? []
          : undefined,
    };
    createPackageMutation.mutate(payload);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'name' ? value : Number(value)
    }));
  };

  const handlePackageTypeChange = (type: ProfilePackageType) => {
    setFormData((prev) => ({
      ...prev,
      packageType: type,
      includedMaterialIds: type === ProfilePackageType.SpecialOffer ? prev.includedMaterialIds ?? [] : [],
    }));
  };

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditFormData((prev: ProfileUpdateRequest) => ({
      ...prev,
      [name]: name === 'name' ? value : name === 'isActive' ? e.target.checked : Number(value)
    }));
  };

  const handleEditPackageTypeChange = (type: ProfilePackageType) => {
    setEditFormData((prev) => ({
      ...prev,
      packageType: type,
      includedMaterialIds: type === ProfilePackageType.SpecialOffer ? prev.includedMaterialIds ?? [] : [],
    }));
  };

  const handleEdit = (pkg: Profile) => {
    setEditingPackage(pkg);
    setEditFormData({
      name: pkg.name,
      originalPrice: pkg.originalPrice,
      salePrice: pkg.salePrice,
      renewalPeriod: pkg.renewalPeriod || 30,
      packageType: pkg.packageType ?? ProfilePackageType.Subscription,
      includedMaterialIds: [...(pkg.includedMaterialIds ?? [])],
      isActive: pkg.isActive
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingPackage) {
      const data: ProfileUpdateRequest = {
        ...editFormData,
        includedMaterialIds:
          editFormData.packageType === ProfilePackageType.SpecialOffer
            ? editFormData.includedMaterialIds?.filter(Boolean) ?? []
            : undefined,
      };
      updatePackageMutation.mutate({
        id: editingPackage.id,
        data,
      });
  }
  };


  if (error && online) {
    return (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-md">
          خطأ في تحميل بيانات الباقات
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
          text="تحميل الباقات..."
          backColor="#E8F2FC"
          frontColor="#4645F6"
        />
      </div>
    );
  }

  return (
    <div className="p-6">
      {!online && (
        <div className="mb-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 px-4 py-2 rounded-md">
          بدون اتصال — عرض آخر بيانات محفوظة. التعديلات (إضافة/تعديل/حذف) ستُرفع عند عودة الاتصال.
        </div>
      )}
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            إدارة الباقات
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            عرض وإدارة جميع الباقات المتاحة
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>إضافة باقة</span>
        </button>
      </div>

      {/* Search & Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <form onSubmit={handleSearchSubmit} className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">البحث</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="البحث في الباقات..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">المنطقة</label>
              <select
                value={selectedResellerId}
                onChange={(e) => { setSelectedResellerId(e.target.value); setCurrentPage(1); }}
                className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              >
                <option value="">كل المناطق</option>
                {myResellers.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الحالة</label>
              <select
                value={statusFilter === '' ? 'all' : String(statusFilter)}
                onChange={(e) => { setStatusFilter(e.target.value === 'all' ? '' : Number(e.target.value)); setCurrentPage(1); }}
                className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              >
                <option value="all">الكل</option>
                <option value="1">نشط</option>
                <option value="0">غير نشط</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">عدد الصفحة</label>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              >
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="inline-flex items-center gap-1 px-3 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md text-sm"
            >
              <Search className="h-4 w-4" />
              بحث
            </button>
            <button
              type="button"
              onClick={handleClearSearch}
              className="inline-flex items-center gap-1 px-3 py-2 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 rounded-md text-sm"
            >
              تفريغ
            </button>
          </div>
        </form>
      </div>

      {/* Packages Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {packages.map((pkg) => (
          <div key={pkg.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-primary-100 dark:bg-primary-900/20 rounded-lg">
                    <Package className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {pkg.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {pkg.agentResellerName ? `${pkg.agentCompanyName} - ${pkg.agentResellerName}` : (pkg.agentCompanyName || 'غير محدد')} - {packageTypeBadge(pkg.packageType)}
                    </p>
                  </div>
                </div>
                <div className={`px-2 py-1 text-xs font-medium rounded-full ${
                  pkg.isActive 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                    : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                }`}>
                  {pkg.isActive ? 'نشط' : 'غير نشط'}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <DollarSign className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">سعر الاشتراك</span>
                  </div>
                  <span className="text-lg font-semibold text-gray-900 dark:text-white">
                    {formatNumber(pkg.salePrice || 0, { suffix: ' د.ع' })}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">فترة التجديد</span>
                  </div>
                  <span className="text-sm text-gray-900 dark:text-white">
                    {pkg.renewalPeriod || 30} يوم
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">تاريخ الإنشاء</span>
                  </div>
                  <span className="text-sm text-gray-900 dark:text-white">
                    {pkg.createdAt ? formatDate(pkg.createdAt) : 'غير محدد'}
                  </span>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => handleEdit(pkg)}
                    className="text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300">
                    <Eye className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={() => handleDelete(pkg.id)}
                    className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {packages.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <Package className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
            لا توجد باقات
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            ابدأ بإضافة باقة جديدة أو غيّر معايير البحث
          </p>
        </div>
      )}

      {/* Pagination */}
      {profilesResponse && profilesResponse.totalPages > 1 && (
        <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <Pagination
            currentPage={profilesResponse.currentPage ?? profilesResponse.pageNumber ?? currentPage}
            totalPages={profilesResponse.totalPages}
            totalItems={profilesResponse.totalItems ?? profilesResponse.totalCount ?? 0}
            pageSize={profilesResponse.pageSize ?? pageSize}
            hasNextPage={profilesResponse.hasNextPage}
            hasPreviousPage={profilesResponse.hasPreviousPage}
            onPageChange={setCurrentPage}
          />
        </div>
      )}

      {/* Add Package Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                إضافة باقة جديدة
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
              >
                <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Package Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  اسم الباقة *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                  placeholder="اسم الباقة"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  نوع الباقة *
                </label>
                <select
                  value={formData.packageType ?? ProfilePackageType.Subscription}
                  onChange={(e) => handlePackageTypeChange(Number(e.target.value) as ProfilePackageType)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value={ProfilePackageType.Subscription}>باقة اشتراك</option>
                  <option value={ProfilePackageType.Extension}>تمديد</option>
                  <option value={ProfilePackageType.SpecialOffer}>عرض خاص</option>
                </select>
              </div>

              {/* Original Price */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  السعر على الوكيل (د.ع) *
                </label>
                <input
                  type="number"
                  name="originalPrice"
                  value={formData.originalPrice}
                  onChange={handleInputChange}
                  required
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                  placeholder="السعر على الوكيل"
                />
              </div>

              {/* Sale Price */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  السعر على المشترك (د.ع) *
                </label>
                <input
                  type="number"
                  name="salePrice"
                  value={formData.salePrice}
                  onChange={handleInputChange}
                  required
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                  placeholder="سعر الاشتراك"
                />
              </div>

              {formData.packageType === ProfilePackageType.SpecialOffer && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    إضافة المواد (اختياري)
                  </label>
                  {materialsLoading ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">جاري تحميل المواد...</p>
                  ) : materialsError ? (
                    <p className="text-sm text-red-600 dark:text-red-400">تعذر تحميل قائمة المواد. تحقق من الاتصال وحاول مرة أخرى.</p>
                  ) : materialsList.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">لا توجد مواد في المخزن بعد.</p>
                  ) : (
                    <div className="max-h-44 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-md p-3 space-y-2 bg-gray-50 dark:bg-gray-900/40">
                      {materialsList.map((m) => (
                        <label key={m.id} className="flex items-center gap-2 text-sm text-gray-800 dark:text-gray-200 cursor-pointer">
                          <input
                            type="checkbox"
                            className="rounded border-gray-300 dark:border-gray-600"
                            checked={(formData.includedMaterialIds ?? []).includes(m.id)}
                            onChange={(e) => {
                              const cur = new Set(formData.includedMaterialIds ?? []);
                              if (e.target.checked) cur.add(m.id);
                              else cur.delete(m.id);
                              setFormData((prev) => ({ ...prev, includedMaterialIds: Array.from(cur) }));
                            }}
                          />
                          <span className="flex-1">{m.name}</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">{m.quantity} متوفر</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                 فترة التجديد (بالأيام) *
                </label>
                <input
                  type="number"
                  name="renewalPeriod"
                  value={formData.renewalPeriod}
                  onChange={handleInputChange}
                  required
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                  placeholder="فترة التجديد بالأيام"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.isActive !== false}
                  onChange={(e) => setFormData((prev) => ({ ...prev, isActive: e.target.checked }))}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label className="mr-2 block text-sm text-gray-900 dark:text-white">
                  حالة الباقة: نشط
                </label>
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={createPackageMutation.isPending}
                  className="flex items-center space-x-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {createPackageMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>جاري الحفظ...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      <span>حفظ الباقة</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Package Modal */}
      {showEditModal && editingPackage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                تعديل الباقة
              </h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingPackage(null);
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
              >
                <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-6">
              {/* Package Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  اسم الباقة *
                </label>
                <input
                  type="text"
                  name="name"
                  value={editFormData.name}
                  onChange={handleEditInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                  placeholder="اسم الباقة"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  نوع الباقة *
                </label>
                <select
                  value={editFormData.packageType ?? ProfilePackageType.Subscription}
                  onChange={(e) => handleEditPackageTypeChange(Number(e.target.value) as ProfilePackageType)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value={ProfilePackageType.Subscription}>باقة اشتراك</option>
                  <option value={ProfilePackageType.Extension}>تمديد</option>
                  <option value={ProfilePackageType.SpecialOffer}>عرض خاص</option>
                </select>
              </div>

              {/* Original Price */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  السعر على الوكيل (د.ع) *
                </label>
                <input
                  type="number"
                  name="originalPrice"
                  value={editFormData.originalPrice}
                  onChange={handleEditInputChange}
                  required
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                  placeholder="السعر على الوكيل"
                />
              </div>

              {/* Sale Price */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  السعر على المشترك (د.ع) *
                </label>
                <input
                  type="number"
                  name="salePrice"
                  value={editFormData.salePrice}
                  onChange={handleEditInputChange}
                  required
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                  placeholder="السعر على المشترك"
                />
              </div>

              {editFormData.packageType === ProfilePackageType.SpecialOffer && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    إضافة المواد (اختياري)
                  </label>
                  {materialsLoading ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">جاري تحميل المواد...</p>
                  ) : materialsError ? (
                    <p className="text-sm text-red-600 dark:text-red-400">تعذر تحميل قائمة المواد. تحقق من الاتصال وحاول مرة أخرى.</p>
                  ) : materialsList.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">لا توجد مواد في المخزن بعد.</p>
                  ) : (
                    <div className="max-h-44 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-md p-3 space-y-2 bg-gray-50 dark:bg-gray-900/40">
                      {materialsList.map((m) => (
                        <label key={m.id} className="flex items-center gap-2 text-sm text-gray-800 dark:text-gray-200 cursor-pointer">
                          <input
                            type="checkbox"
                            className="rounded border-gray-300 dark:border-gray-600"
                            checked={(editFormData.includedMaterialIds ?? []).includes(m.id)}
                            onChange={(e) => {
                              const cur = new Set(editFormData.includedMaterialIds ?? []);
                              if (e.target.checked) cur.add(m.id);
                              else cur.delete(m.id);
                              setEditFormData((prev) => ({ ...prev, includedMaterialIds: Array.from(cur) }));
                            }}
                          />
                          <span className="flex-1">{m.name}</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">{m.quantity} متوفر</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  فترة التجديد (بالأيام) *
                </label>
                <input
                  type="number"
                  name="renewalPeriod"
                  value={editFormData.renewalPeriod}
                  onChange={handleEditInputChange}
                  required
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                  placeholder="فترة التجديد بالأيام"
                />
              </div>

              {/* Active Status */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="isActive"
                  checked={editFormData.isActive}
                  onChange={handleEditInputChange}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label className="mr-2 block text-sm text-gray-900 dark:text-white">
                  الباقة نشطة
                </label>
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingPackage(null);
                  }}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={updatePackageMutation.isPending}
                  className="flex items-center space-x-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {updatePackageMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>جاري الحفظ...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      <span>حفظ التعديلات</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PackagesPage;
