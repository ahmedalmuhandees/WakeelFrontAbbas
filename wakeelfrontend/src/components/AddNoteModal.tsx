import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { Subscriber, SubscriberNoteType } from '../types';

interface AddNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  subscriber: Subscriber;
  onSave: (id: string, noteType: SubscriberNoteType | null, note: string) => Promise<void>;
}

const AddNoteModal: React.FC<AddNoteModalProps> = ({
  isOpen,
  onClose,
  subscriber,
  onSave
}) => {
  const [noteType, setNoteType] = useState<SubscriberNoteType | null>(
    subscriber.noteType ??
    (((subscriber.note || '').toString().trim().length > 0) ? SubscriberNoteType.Other : SubscriberNoteType.NoResponse)
  );
  const [note, setNote] = useState(subscriber.note || '');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setNoteType(
        subscriber.noteType ??
        (((subscriber.note || '').toString().trim().length > 0) ? SubscriberNoteType.Other : SubscriberNoteType.NoResponse)
      );
      setNote(subscriber.note || '');
    }
  }, [isOpen, subscriber]);

  const handleNoteTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    const next = val === '' ? null : (parseInt(val, 10) as SubscriberNoteType);
    setNoteType(next);
    if (next !== SubscriberNoteType.Other) setNote('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (noteType === SubscriberNoteType.Other) {
      const trimmed = (note || '').toString().trim();
      if (!trimmed) return;
    }
    setIsSaving(true);
    try {
      await onSave(subscriber.id, noteType, noteType === SubscriberNoteType.Other ? (note || '').trim() : '');
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              ادخال ملاحظة
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {subscriber.fullName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
          >
            <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              نوع الملاحظة
            </label>
            <select
              value={noteType ?? ''}
              onChange={handleNoteTypeChange}
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

          {noteType === SubscriberNoteType.Other && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                نص الملاحظة
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                maxLength={1000}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                placeholder="اكتب الملاحظة..."
              />
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSaving || (noteType === SubscriberNoteType.Other && !(note || '').trim())}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  <span>جاري الحفظ...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>حفظ</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddNoteModal;
