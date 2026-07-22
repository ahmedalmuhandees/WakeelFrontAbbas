import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService, ApiService } from '../services/api';
import { Material, MaterialCreateRequest, MaterialUpdateRequest, PaginatedResponse } from '../types';
import { showSuccess, showError } from '../utils/notifications';
import { useAuth } from '../contexts/AuthContext';
import { useDigits } from '../contexts/DigitsContext';
import { UserRole } from '../types';
import WifiLoaderComponent from '../components/WifiLoaderComponent';
import Pagination from '../components/Pagination';
import { Plus, Package, X, Save, Search, Edit2, Trash2 } from 'lucide-react';

const MaterialsPage: React.FC = () => {
  const { user } = useAuth();
  const { formatNumber, formatDate } = useDigits();
  const isAdmin = user?.role === UserRole.Admin;
  const canAccessMaterialsApi = user?.role !== UserRole.Employee || !!user?.canManageMaterialsAndSales;
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [appliedSearchTerm, setAppliedSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<MaterialCreateRequest>({
    name: '',
    imagePngUrl: '',
    quantity: 0,
    agentPrice: 0,
    subscriberPrice: 0,
    dealerPrice: 0,
    notes: '',
  });
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [editFormData, setEditFormData] = useState<MaterialUpdateRequest>({
    name: '',
    imagePngUrl: '',
    quantity: 0,
    agentPrice: 0,
    subscriberPrice: 0,
    dealerPrice: 0,
    notes: '',
  });

  const { data: agentsResponse } = useQuery({
    queryKey: ['agents', 1, 100],
    queryFn: () => apiService.getAllAgents({ page: 1, pageSize: 100 }),
    enabled: isAdmin,
  });
  const agents = agentsResponse?.data ?? [];

  const { data: materialsResponse, error, isLoading } = useQuery<PaginatedResponse<Material>>({
    queryKey: ['materials', isAdmin ? selectedAgentId : undefined, currentPage, pageSize, appliedSearchTerm],
    queryFn: () =>
      apiService.getMaterials(isAdmin ? (selectedAgentId || undefined) : undefined, {
        page: currentPage,
        pageSize,
        searchTerm: appliedSearchTerm.trim() || undefined,
      }),
    enabled: canAccessMaterialsApi,
  });

  const createMaterialMutation = useMutation({
    mutationFn: (data: MaterialCreateRequest) =>
      apiService.createMaterial(data, isAdmin ? (selectedAgentId || undefined) : undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      setShowAddModal(false);
      setFormData({
        name: '',
        imagePngUrl: '',
        quantity: 0,
        agentPrice: 0,
        subscriberPrice: 0,
        dealerPrice: 0,
        notes: '',
      });
      showSuccess('تمت الإضافة', 'تم إضافة المادة بنجاح');
    },
    onError: (err: unknown) => {
      showError('خطأ في الإضافة', ApiService.showError(err));
    },
  });

  const updateMaterialMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: MaterialUpdateRequest }) =>
      apiService.updateMaterial(id, data, isAdmin ? (selectedAgentId || undefined) : undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      setShowEditModal(false);
      setSelectedMaterial(null);
      showSuccess('تم التعديل', 'تم تعديل المادة بنجاح');
    },
    onError: (err: unknown) => {
      showError('خطأ في التعديل', ApiService.showError(err));
    },
  });

  const deleteMaterialMutation = useMutation({
    mutationFn: (id: string) =>
      apiService.deleteMaterial(id, isAdmin ? (selectedAgentId || undefined) : undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      showSuccess('تم الحذف', 'تم حذف المادة بنجاح');
    },
    onError: (err: unknown) => {
      showError('خطأ في الحذف', ApiService.showError(err));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) {
      showError('خطأ', 'اسم المادة مطلوب');
      return;
    }
    if (isAdmin && !selectedAgentId) {
      showError('خطأ', 'يرجى اختيار الوكيل');
      return;
    }
    createMaterialMutation.mutate({
      ...formData,
      name: formData.name.trim(),
      imagePngUrl: formData.imagePngUrl?.trim() || undefined,
      notes: formData.notes?.trim() || undefined,
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'name' || name === 'notes' || name === 'imagePngUrl' ? value : Number(value) || 0,
    }));
  };

  const handleEditClick = (m: Material) => {
    setSelectedMaterial(m);
    setEditFormData({
      name: m.name ?? '',
      imagePngUrl: m.imagePngUrl ?? '',
      quantity: m.quantity ?? 0,
      agentPrice: m.agentPrice ?? 0,
      subscriberPrice: m.subscriberPrice ?? 0,
      dealerPrice: m.dealerPrice ?? 0,
      notes: m.notes ?? '',
    });
    setShowEditModal(true);
  };

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditFormData((prev) => ({
      ...prev,
      [name]: name === 'name' || name === 'notes' || name === 'imagePngUrl' ? value : Number(value) || 0,
    }));
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMaterial?.id) return;
    if (!editFormData.name?.trim()) {
      showError('خطأ', 'اسم المادة مطلوب');
      return;
    }
    if (isAdmin && !selectedAgentId) {
      showError('خطأ', 'يرجى اختيار الوكيل');
      return;
    }
    updateMaterialMutation.mutate({
      id: selectedMaterial.id,
      data: {
        ...editFormData,
        name: editFormData.name.trim(),
        imagePngUrl: editFormData.imagePngUrl?.trim() || undefined,
        notes: editFormData.notes?.trim() || undefined,
      },
    });
  };

  const handleDeleteClick = (m: Material) => {
    if (!window.confirm(`هل أنت متأكد من حذف المادة «${m.name}»؟`)) return;
    deleteMaterialMutation.mutate(m.id);
  };

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-md">
          خطأ في تحميل بيانات المواد
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
          text="تحميل المواد..."
          backColor="#E8F2FC"
          frontColor="#4645F6"
        />
      </div>
    );
  }

  const list = materialsResponse?.data ?? [];

  const handleSearch = () => {
    setAppliedSearchTerm(searchTerm.trim());
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <div className="p-3 sm:p-4 lg:p-6">
      <div className="flex flex-col gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
            المواد
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
            عرض وإدارة المواد  
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
            disabled={isAdmin && !selectedAgentId}
            className="flex items-center gap-2 px-3 py-2.5 sm:px-4 sm:py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm sm:text-base transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] touch-manipulation"
          >
            <Plus className="h-4 w-4" />
            <span>إضافة مادة</span>
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="بحث باسم المادة أو الملاحظات..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSearch())}
            className="w-full pr-10 pl-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white text-sm"
          />
        </div>
        <button
          type="button"
          onClick={handleSearch}
          className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md text-sm font-medium whitespace-nowrap"
        >
          بحث
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="wakeel-table-scroll">
          <table className="min-w-full text-right">
            <thead>
              <tr>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">الاسم</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"> الكمية المتاحة</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">سعر الوكيل (د.ع)</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">سعر المشترك (د.ع)</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">سعر البيع للوكيل (د.ع)</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">ملاحظات</th>
                {list.some((m) => m.createdAt) && (
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">تاريخ الإنشاء</th>
                )}
                <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr>
                  <td colSpan={list.some((m) => m.createdAt) ? 8 : 7} className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">
                    <Package className="mx-auto h-12 w-12 text-gray-400 mb-2" />
                    <p>لا توجد مواد</p>
                    <p className="text-sm mt-1">أضف مادة جديدة باستخدام الزر أعلاه</p>
                  </td>
                </tr>
              ) : (
                list.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{m.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{formatNumber(m.quantity ?? 0)}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{formatNumber(m.agentPrice ?? 0)}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{formatNumber(m.subscriberPrice ?? 0)}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{formatNumber(m.dealerPrice ?? 0)}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white max-w-[200px] truncate" title={m.notes ?? ''}>{m.notes ?? '—'}</td>
                    {list.some((x) => x.createdAt) && (
                      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                        {m.createdAt ? formatDate(m.createdAt) : '—'}
                      </td>
                    )}
                    <td className="px-4 py-3 text-sm whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleEditClick(m)}
                          className="inline-flex items-center gap-1 px-2 py-1.5 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-md transition-colors"
                          title="تعديل المادة"
                        >
                          <Edit2 className="h-4 w-4" />
                          <span className="hidden sm:inline">تعديل</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteClick(m)}
                          className="inline-flex items-center gap-1 px-2 py-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                          title="حذف المادة"
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

      {materialsResponse && (
        <Pagination
          currentPage={materialsResponse.currentPage}
          totalPages={materialsResponse.totalPages}
          totalItems={materialsResponse.totalItems}
          pageSize={materialsResponse.pageSize}
          hasNextPage={materialsResponse.hasNextPage}
          hasPreviousPage={materialsResponse.hasPreviousPage}
          onPageChange={handlePageChange}
        />
      )}

      {/* Add Material Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">إضافة مادة</h2>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
              >
                <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {isAdmin && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">الوكيل *</label>
                  <select
                    value={selectedAgentId}
                    onChange={(e) => setSelectedAgentId(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
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
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">اسم المادة *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  maxLength={500}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                  placeholder="اسم المادة"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">رابط صورة المادة (.png / .jpg / .webp)</label>
                <input
                  type="url"
                  name="imagePngUrl"
                  value={formData.imagePngUrl ?? ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                  placeholder="https://example.com/material.webp"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">الكمية *</label>
                  <input
                    type="number"
                    name="quantity"
                    value={formData.quantity || ''}
                    onChange={handleInputChange}
                    required
                    min={0}
                    max={2147483647}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">سعر الوكيل (د.ع)</label>
                  <input
                    type="number"
                    name="agentPrice"
                    value={formData.agentPrice || ''}
                    onChange={handleInputChange}
                    min={0}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                    placeholder="0"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">سعر المشترك (د.ع)</label>
                <input
                  type="number"
                  name="subscriberPrice"
                  value={formData.subscriberPrice || ''}
                  onChange={handleInputChange}
                  min={0}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">سعر البيع للوكيل (د.ع)</label>
                <input
                  type="number"
                  name="dealerPrice"
                  value={formData.dealerPrice || ''}
                  onChange={handleInputChange}
                  min={0}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">ملاحظات</label>
                <textarea
                  name="notes"
                  value={formData.notes ?? ''}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                  placeholder="ملاحظات اختيارية..."
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={createMaterialMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {createMaterialMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                      <span>جاري الحفظ...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      <span>حفظ المادة</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Material Modal */}
      {showEditModal && selectedMaterial && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">تعديل المادة</h2>
              <button
                type="button"
                onClick={() => { setShowEditModal(false); setSelectedMaterial(null); }}
                className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
              >
                <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">اسم المادة *</label>
                <input
                  type="text"
                  name="name"
                  value={editFormData.name}
                  onChange={handleEditInputChange}
                  required
                  maxLength={500}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                  placeholder="اسم المادة"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">رابط صورة المادة (.png / .jpg / .webp)</label>
                <input
                  type="url"
                  name="imagePngUrl"
                  value={editFormData.imagePngUrl ?? ''}
                  onChange={handleEditInputChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                  placeholder="https://example.com/material.webp"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">الكمية *</label>
                  <input
                    type="number"
                    name="quantity"
                    value={editFormData.quantity === 0 ? '' : editFormData.quantity}
                    onChange={handleEditInputChange}
                    required
                    min={0}
                    max={2147483647}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">سعر الوكيل (د.ع)</label>
                  <input
                    type="number"
                    name="agentPrice"
                    value={editFormData.agentPrice === 0 ? '' : editFormData.agentPrice}
                    onChange={handleEditInputChange}
                    min={0}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                    placeholder="0"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">سعر المشترك (د.ع)</label>
                <input
                  type="number"
                  name="subscriberPrice"
                  value={editFormData.subscriberPrice === 0 ? '' : editFormData.subscriberPrice}
                  onChange={handleEditInputChange}
                  min={0}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">سعر البيع للوكيل (د.ع)</label>
                <input
                  type="number"
                  name="dealerPrice"
                  value={editFormData.dealerPrice === 0 ? '' : editFormData.dealerPrice}
                  onChange={handleEditInputChange}
                  min={0}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">ملاحظات</label>
                <textarea
                  name="notes"
                  value={editFormData.notes ?? ''}
                  onChange={handleEditInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                  placeholder="ملاحظات اختيارية..."
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => { setShowEditModal(false); setSelectedMaterial(null); }}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={updateMaterialMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {updateMaterialMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
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

export default MaterialsPage;
