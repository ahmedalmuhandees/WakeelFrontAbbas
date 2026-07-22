import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService, ApiService } from '../services/api';
import {
  Dealer,
  DealerCreateRequest,
  IraqGovernorates,
  formatIraqGovernorateAr,
  formatServiceTypeLabelAr,
} from '../types';
import { showSuccess, showError } from '../utils/notifications';
import { useConfirmation } from '../contexts/ConfirmationContext';
import WifiLoaderComponent from '../components/WifiLoaderComponent';
import Pagination from '../components/Pagination';
import { UsersRound, Plus, Pencil, Trash2, Search } from 'lucide-react';

const emptyForm: DealerCreateRequest = {
  fullName: '',
  userName: '',
  iraqGovernorates: IraqGovernorates.Baghdad,
  address: '',
  phone: '',
  agentResellerId: '',
};

const DealersPage: React.FC = () => {
  const { confirmDelete } = useConfirmation();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Dealer | null>(null);
  const [form, setForm] = useState<DealerCreateRequest>(emptyForm);

  const [fullNameDraft, setFullNameDraft] = useState('');
  const [appliedFullName, setAppliedFullName] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);

  const applySearch = () => {
    setAppliedFullName(fullNameDraft.trim());
    setCurrentPage(1);
  };

  const { data: dealersPage, isLoading, error } = useQuery({
    queryKey: ['dealers', appliedFullName, currentPage, pageSize],
    queryFn: () =>
      apiService.getDealers({
        fullName: appliedFullName || undefined,
        page: currentPage,
        pageSize,
      }),
  });

  const dealers = dealersPage?.data ?? [];
  const pg = dealersPage;

  const { data: myResellers = [] } = useQuery({
    queryKey: ['agents-me-resellers', 'dealers-dropdown'],
    queryFn: () => apiService.getMyResellers(),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editing) {
        return apiService.updateDealer(editing.id, form);
      }
      return apiService.createDealer(form);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dealers'], exact: false });
      setShowModal(false);
      setEditing(null);
      setForm(emptyForm);
      showSuccess('تم الحفظ', editing ? 'تم تحديث الوكيل.' : 'تم إضافة الوكيل.');
    },
    onError: (err: unknown) => showError('خطأ', ApiService.showError(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiService.deleteDealer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dealers'], exact: false });
      showSuccess('تم الحذف', 'تم حذف الوكيل.');
    },
    onError: (err: unknown) => showError('خطأ', ApiService.showError(err)),
  });

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (d: Dealer) => {
    setEditing(d);
    setForm({
      fullName: d.fullName,
      userName: d.userName,
      iraqGovernorates: Number(d.iraqGovernorates) || IraqGovernorates.Baghdad,
      address: d.address,
      phone: d.phone,
      agentResellerId: d.agentResellerId,
    });
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName.trim() || !form.userName.trim() || !form.agentResellerId.trim()) {
      showError('بيانات ناقصة', 'الاسم الكامل واسم المستخدم ومعرّف المنطقة (الرسيلر) مطلوبة.');
      return;
    }
    saveMutation.mutate();
  };

  const handleDelete = async (d: Dealer) => {
    const ok = await confirmDelete(`حذف الوكيل «${d.fullName || d.userName}»؟`);
    if (ok) deleteMutation.mutate(d.id);
  };

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4 text-red-700 dark:text-red-300">
          تعذر تحميل قائمة الوكلاء. تأكد من صلاحيات الأدمن وتوفر واجهة /Dealers.
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2">
          <UsersRound className="h-7 w-7 text-primary-600 dark:text-primary-400" />
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">عرض الوكلاء</h1>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium"
        >
          <Plus className="h-4 w-4" />
          إضافة وكيل
        </button>
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        إدارة الوكلاء او التجار .
      </p>

      <div className="mb-4 flex flex-col sm:flex-row flex-wrap items-stretch sm:items-end gap-2">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">بحث بالاسم الكامل (جزئي)</label>
          <input
            value={fullNameDraft}
            onChange={(e) => setFullNameDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                applySearch();
              }
            }}
            placeholder="FullName..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm"
          />
        </div>
        <button
          type="button"
          onClick={applySearch}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium shrink-0"
        >
          <Search className="h-4 w-4" />
          بحث
        </button>
      </div>

      {dealers.length === 0 && !isLoading ? (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-8 text-center text-gray-600 dark:text-gray-400">
          لا يوجد وكلاء مطابقون للبحث.
        </div>
      ) : isLoading ? (
        <WifiLoaderComponent />
      ) : (
        <div className="wakeel-table-scroll rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="min-w-full text-right">
            <thead className="bg-gray-50 dark:bg-gray-800/80">
              <tr>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">الاسم الكامل</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">اسم المستخدم</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">المحافظة</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">العنوان</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">الهاتف</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">المنطقة (رسيلر)</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase w-28">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {dealers.map((row) => {
                const resellerLabel =
                  myResellers.find((r) => r.id === row.agentResellerId)?.name ||
                  row.agentResellerId ||
                  '—';
                return (
                  <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white font-medium">{row.fullName || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{row.userName || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {formatIraqGovernorateAr(row.iraqGovernorates)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 max-w-xs truncate" title={row.address}>
                      {row.address || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">{row.phone || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 max-w-[200px] truncate" title={resellerLabel}>
                      {resellerLabel}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(row)}
                          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-primary-600 dark:text-primary-400"
                          title="تعديل"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(row)}
                          className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400"
                          title="حذف"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!isLoading && pg && pg.totalItems > 0 && (
        <Pagination
          currentPage={pg.currentPage}
          totalPages={pg.totalPages}
          totalItems={pg.totalItems}
          pageSize={pg.pageSize}
          hasNextPage={pg.hasNextPage}
          hasPreviousPage={pg.hasPreviousPage}
          onPageChange={setCurrentPage}
          className="rounded-b-lg"
        />
      )}

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50" role="dialog" aria-modal="true">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{editing ? 'تعديل وكيل' : 'إضافة وكيل'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الاسم الكامل</label>
                <input
                  required
                  value={form.fullName}
                  onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">اسم المستخدم</label>
                <input
                  required
                  value={form.userName}
                  onChange={(e) => setForm((f) => ({ ...f, userName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">المحافظة</label>
                <select
                  value={form.iraqGovernorates}
                  onChange={(e) => setForm((f) => ({ ...f, iraqGovernorates: Number(e.target.value) as IraqGovernorates }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                >
                  {(Object.values(IraqGovernorates).filter((v): v is number => typeof v === 'number').map((v) => (
                    <option key={v} value={v}>
                      {formatIraqGovernorateAr(v)}
                    </option>
                  )))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">العنوان</label>
                <input
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الهاتف</label>
                <input
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">المنطقة (رسيلر)</label>
                <select
                  required
                  value={form.agentResellerId}
                  onChange={(e) => setForm((f) => ({ ...f, agentResellerId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                >
                  <option value="">— اختر المنطقة —</option>
                  {myResellers.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} — {formatServiceTypeLabelAr(r.serviceType)}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  تُجلب المناطق من رسيلرز الوكيل الحالي (Agents/me/resellers). قيمة الحقل = معرّف الرسيلر.
                </p>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditing(null);
                  }}
                  className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white disabled:opacity-50"
                >
                  {saveMutation.isPending ? 'جاري الحفظ...' : 'حفظ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DealersPage;
