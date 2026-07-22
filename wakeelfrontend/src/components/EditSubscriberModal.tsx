import React, { useState, useEffect } from 'react';
import { X, Save, Calendar, User, Phone, Package, Lock, UserCircle } from 'lucide-react';
import { Subscriber, SubscriberUpdateRequest, Profile, SubscriberNoteType } from '../types';
import { useDigits } from '../contexts/DigitsContext';
import { apiService } from '../services/api';
import { buildSubscriberNotesPatch } from '../utils/subscriberNotesPatch';

interface EditSubscriberModalProps {
  isOpen: boolean;
  onClose: () => void;
  subscriber: Subscriber;
  profiles: Profile[];
  onUpdate: (id: string, data: SubscriberUpdateRequest) => Promise<void>;
}

const EditSubscriberModal: React.FC<EditSubscriberModalProps> = ({
  isOpen,
  onClose,
  subscriber,
  profiles,
  onUpdate
}) => {
  const { formatNumber } = useDigits();
  const [formData, setFormData] = useState<SubscriberUpdateRequest>({
    secruptionId: subscriber.secruptionId ?? '',
    firstName: subscriber.firstName,
    lastName: subscriber.lastName,
    phoneNumber: subscriber.phoneNumber,
    noteType:
      subscriber.noteType ??
      (((subscriber.note || '').toString().trim().length > 0) ? SubscriberNoteType.Other : SubscriberNoteType.NoResponse),
    note: subscriber.note || '',
    profileId: profiles.find(p => p.name === subscriber.profileName)?.id || '',
    username: subscriber.username,
    password: '', // كلمة السر الجديدة (اختيارية)
    isActive: subscriber.isActive,
    activationDate: subscriber.activationDate,
    expirationDate: subscriber.expirationDate || subscriber.activationDate,
    fat: subscriber.fat ?? '',
    zone: subscriber.zone ?? '',
    agentResellerId: (subscriber.agentResellerId ?? '').trim(),
  });

  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        secruptionId: subscriber.secruptionId ?? '',
        firstName: subscriber.firstName,
        lastName: subscriber.lastName,
        phoneNumber: subscriber.phoneNumber,
        noteType:
          subscriber.noteType ??
          (((subscriber.note || '').toString().trim().length > 0) ? SubscriberNoteType.Other : SubscriberNoteType.NoResponse),
        note: subscriber.note || '',
        profileId: profiles.find(p => p.name === subscriber.profileName)?.id || '',
        username: subscriber.username,
        password: '', // كلمة السر الجديدة (اختيارية)
        isActive: subscriber.isActive,
        activationDate: subscriber.activationDate,
        expirationDate: subscriber.expirationDate || subscriber.activationDate,
        fat: subscriber.fat ?? '',
        zone: subscriber.zone ?? '',
        agentResellerId: (subscriber.agentResellerId ?? '').trim(),
      });
    }
  }, [isOpen, subscriber, profiles]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      if (name === 'noteType') {
        const nextNoteType =
          value === '' ? null : (parseInt(value, 10) as SubscriberNoteType);
        return {
          ...prev,
          noteType: nextNoteType,
          note: nextNoteType === SubscriberNoteType.Other ? prev.note : '',
        };
      }
      return {
        ...prev,
        [name]: value,
      } as any;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const resellerId = (formData.agentResellerId ?? subscriber.agentResellerId ?? '').trim();
    if (!resellerId) {
      alert('يجب تحديد المنطقة/الرسيلر (agentResellerId). يُستورد من بيانات المشترك — إن كان فارغاً اتصل بالدعم.');
      return;
    }
    setIsUpdating(true);

    try {
      const noteType = formData.noteType ?? null;
      const noteText = (formData.note ?? '').toString().trim();
      const nextNotePlain = noteType === SubscriberNoteType.Other ? noteText : '';

      const notesPatch = buildSubscriberNotesPatch(
        {
          noteType: subscriber.noteType ?? null,
          note: subscriber.note ?? '',
        },
        { noteType, note: nextNotePlain }
      );

      const putPayload: SubscriberUpdateRequest = {
        secruptionId: formData.secruptionId,
        ftthSubscriptionId: formData.ftthSubscriptionId,
        ftthCustomerId: formData.ftthCustomerId,
        username: formData.username,
        password: formData.password?.trim() ? formData.password : undefined,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phoneNumber: formData.phoneNumber,
        profileId: formData.profileId,
        isActive: formData.isActive,
        activationDate: formData.activationDate,
        expirationDate: formData.expirationDate,
        subscriptionType: formData.subscriptionType,
        fat: formData.fat,
        zone: formData.zone,
        agentResellerId: resellerId,
      };

      if (notesPatch) {
        await apiService.patchSubscriberNotes(subscriber.id, notesPatch);
      }
      await onUpdate(subscriber.id, putPayload);
      onClose();
    } catch (error) {
      console.error('Error updating subscriber:', error);
      alert('حدث خطأ أثناء تحديث المشترك');
    } finally {
      setIsUpdating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              تعديل المشترك
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {subscriber.fullName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
          >
            <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* معرف الاشتراك */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                معرف الاشتراك
              </label>
              <input
                type="text"
                name="secruptionId"
                value={formData.secruptionId ?? ''}
                onChange={handleInputChange}
                maxLength={100}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                placeholder="معرف الاشتراك (اختياري)"
              />
            </div>

            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                اسم المستخدم *
              </label>
              <div className="relative">
                <UserCircle className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  required
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                  placeholder="اسم المستخدم"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                كلمة المرور الجديدة
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                  placeholder="اتركه فارغاً للحفاظ على كلمة المرور الحالية"
                />
              </div>
            </div>

            {/* First Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                الاسم الأول *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  required
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                  placeholder="الاسم الأول"
                />
              </div>
            </div>

            {/* Last Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                اسم العائلة 
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  required
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                  placeholder="اسم العائلة"
                />
              </div>
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                رقم الهاتف *
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="tel"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleInputChange}
                  required
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                  placeholder="رقم الهاتف"
                />
              </div>
            </div>

            {/* الكابينة */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                الكابينة
              </label>
              <input
                type="text"
                name="fat"
                value={formData.fat ?? ''}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                placeholder="الكابينة (اختياري)"
              />
            </div>

            {/* المنطقة */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                المنطقة
              </label>
              <input
                type="text"
                name="zone"
                value={formData.zone ?? ''}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                placeholder="المنطقة (اختياري)"
              />
            </div>

            {/* Profile */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                الباقة *
              </label>
              <div className="relative">
                <Package className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <select
                  name="profileId"
                  value={formData.profileId}
                  onChange={handleInputChange}
                  required
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">اختر الباقة</option>
                  {profiles?.map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.name} - {formatNumber(profile.salePrice || 0, { suffix: ' د.ع' })}
                    </option>
                  ))}
                </select>
              </div>
            </div>

          </div>

          {/* Activation Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              تاريخ التفعيل *
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="date"
                name="activationDate"
                value={formData.activationDate ? formData.activationDate.split('T')[0] : ''}
                onChange={handleInputChange}
                required
                className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          {/* Expiration Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              تاريخ الانتهاء *
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="date"
                name="expirationDate"
                value={formData.expirationDate ? formData.expirationDate.split('T')[0] : ''}
                onChange={handleInputChange}
                required
                className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          {/* Note */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                نوع الملاحظة
              </label>
              <select
                name="noteType"
                value={formData.noteType ?? ''}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
              >
                <option value={SubscriberNoteType.NoResponse}>لم يتم الرد</option>
                <option value={SubscriberNoteType.WillActivateSoon}>ستتم التفعيل قريباً</option>
                <option value={SubscriberNoteType.DoesNotWantActivation}>لا يرغب في التفعيل</option>
                <option value={SubscriberNoteType.BadService}>واصل ماستر</option>
                <option value={SubscriberNoteType.NeedsMaintenance}>واصل مكتب الزهور</option>
                <option value={SubscriberNoteType.Other}>أخرى</option>
              </select>
            </div>
          </div>

          {formData.noteType === SubscriberNoteType.Other && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                نص الملاحظة
              </label>
              <textarea
                name="note"
                value={formData.note}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                placeholder="اكتب الملاحظة..."
              />
            </div>
          )}

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
              disabled={isUpdating}
              className="flex items-center space-x-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUpdating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>جاري التحديث...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>تحديث المشترك</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditSubscriberModal;
