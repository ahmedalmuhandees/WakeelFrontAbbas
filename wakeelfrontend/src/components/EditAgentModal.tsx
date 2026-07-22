import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../services/api';
import { showSuccess, showError } from '../utils/notifications';
import { Agent, IraqGovernorates } from '../types';
import { 
  X, 
  Save,
  User,
  Building,
  Phone,
  MapPin
} from 'lucide-react';

interface EditAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  agent: Agent | null;
}

interface BasicAgentUpdate {
  fullName: string;
  phone: string;
  companyName: string;
  address: string;
  governorate: IraqGovernorates;
  isActive: boolean;
}

const EditAgentModal: React.FC<EditAgentModalProps> = ({
  isOpen,
  onClose,
  agent
}) => {
  const [formData, setFormData] = useState<BasicAgentUpdate>({
    fullName: '',
    phone: '',
    companyName: '',
    address: '',
    governorate: IraqGovernorates.Baghdad,
    isActive: true
  });

  const queryClient = useQueryClient();

  // تحديث البيانات عند تغيير الوكيل
  useEffect(() => {
    if (agent) {
      setFormData({
        fullName: agent.fullName || '',
        phone: agent.phone || '',
        companyName: agent.companyName || '',
        address: agent.address || '',
        governorate: agent.governorate || IraqGovernorates.Baghdad,
        isActive: agent.isActive
      });
    }
  }, [agent]);

  const updateAgentMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: BasicAgentUpdate }) => 
      apiService.updateAgentBasicInfo(id, {
        fullName: data.fullName,
        phone: data.phone,
        companyName: data.companyName,
        address: data.address,
        governorate: data.governorate.toString(),
        isActive: data.isActive
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      showSuccess('تم التحديث بنجاح', 'تم تحديث بيانات الوكيل بنجاح');
      onClose();
    },
    onError: (error: any) => {
      console.error('Error updating agent:', error);
      showError('خطأ في التحديث', 'حدث خطأ أثناء تحديث بيانات الوكيل');
    },
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!agent) return;

    // التحقق من صحة البيانات
    if (!formData.fullName.trim()) {
      showError('خطأ في البيانات', 'يرجى إدخال الاسم الكامل');
      return;
    }

    if (!formData.phone.trim()) {
      showError('خطأ في البيانات', 'يرجى إدخال رقم الهاتف');
      return;
    }

    updateAgentMutation.mutate({
      id: agent.id,
      data: formData
    });
  };

  if (!isOpen || !agent) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                تعديل بيانات الوكيل
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                تحديث المعلومات الشخصية
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
          >
            <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              الاسم الكامل *
            </label>
            <div className="relative">
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 pl-10 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="الاسم الكامل للوكيل"
              />
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              رقم الهاتف *
            </label>
            <div className="relative">
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 pl-10 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="رقم الهاتف"
              />
              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>
          </div>

          {/* Company Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              اسم الشركة
            </label>
            <div className="relative">
              <input
                type="text"
                name="companyName"
                value={formData.companyName}
                onChange={handleInputChange}
                className="w-full px-3 py-2 pl-10 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="اسم الشركة"
              />
              <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              العنوان
            </label>
            <div className="relative">
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                className="w-full px-3 py-2 pl-10 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="العنوان"
              />
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>
          </div>

          {/* Governorate */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              المحافظة
            </label>
            <select
              name="governorate"
              value={formData.governorate}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="Baghdad">بغداد</option>
              <option value="Basra">البصرة</option>
              <option value="Mosul">الموصل</option>
              <option value="Erbil">أربيل</option>
              <option value="Najaf">النجف</option>
              <option value="Karbala">كربلاء</option>
              <option value="Sulaymaniyah">السليمانية</option>
              <option value="Kirkuk">كركوك</option>
              <option value="Diyala">ديالى</option>
              <option value="Anbar">الأنبار</option>
              <option value="Babylon">بابل</option>
              <option value="Wasit">واسط</option>
              <option value="Qadisiyyah">القادسية</option>
              <option value="Maysan">ميسان</option>
              <option value="Dhi Qar">ذي قار</option>
              <option value="Muthanna">المثنى</option>
              <option value="Dohuk">دهوك</option>
            </select>
          </div>

          {/* Active Status */}
          <div className="flex items-center">
            <input
              type="checkbox"
              name="isActive"
              checked={formData.isActive}
              onChange={handleInputChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label className="mr-2 block text-sm text-gray-900 dark:text-white">
              الوكيل نشط
            </label>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={updateAgentMutation.isPending}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {updateAgentMutation.isPending ? (
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
  );
};

export default EditAgentModal;
