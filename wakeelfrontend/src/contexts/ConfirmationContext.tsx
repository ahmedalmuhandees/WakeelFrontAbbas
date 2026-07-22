import React, { createContext, useContext, useState, ReactNode } from 'react';
import ConfirmationModal from '../components/ConfirmationModal';

interface ConfirmationContextType {
  confirm: (
    title: string,
    message: string,
    confirmText?: string,
    cancelText?: string,
    type?: 'danger' | 'warning' | 'info'
  ) => Promise<boolean>;
  confirmDelete: (itemName: string, count?: number) => Promise<boolean>;
  confirmAction: (title: string, message: string) => Promise<boolean>;
  confirmInfo: (title: string, message: string) => Promise<boolean>;
}

const ConfirmationContext = createContext<ConfirmationContextType | undefined>(undefined);

interface ConfirmationProviderProps {
  children: ReactNode;
}

export const ConfirmationProvider: React.FC<ConfirmationProviderProps> = ({ children }) => {
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    cancelText: string;
    type: 'danger' | 'warning' | 'info';
    resolve: (value: boolean) => void;
  } | null>(null);

  const confirm = (
    title: string,
    message: string,
    confirmText: string = 'تأكيد',
    cancelText: string = 'إلغاء',
    type: 'danger' | 'warning' | 'info' = 'danger'
  ): Promise<boolean> => {
    return new Promise((resolve) => {
      setModalState({
        isOpen: true,
        title,
        message,
        confirmText,
        cancelText,
        type,
        resolve
      });
    });
  };

  const confirmDelete = (itemName: string, count: number = 1): Promise<boolean> => {
    const message = count > 1 
      ? `هل أنت متأكد من حذف ${count} ${itemName}؟\nهذه العملية لا يمكن التراجع عنها.`
      : `هل أنت متأكد من حذف ${itemName}؟\nهذه العملية لا يمكن التراجع عنها.`;
    
    return confirm('تأكيد الحذف', message, 'حذف', 'إلغاء', 'danger');
  };

  const confirmAction = (title: string, message: string): Promise<boolean> => {
    return confirm(title, message, 'تأكيد', 'إلغاء', 'warning');
  };

  const confirmInfo = (title: string, message: string): Promise<boolean> => {
    return confirm(title, message, 'موافق', 'إلغاء', 'info');
  };

  const handleConfirm = () => {
    if (modalState) {
      modalState.resolve(true);
      setModalState(null);
    }
  };

  const handleCancel = () => {
    if (modalState) {
      modalState.resolve(false);
      setModalState(null);
    }
  };

  return (
    <ConfirmationContext.Provider value={{ confirm, confirmDelete, confirmAction, confirmInfo }}>
      {children}
      {modalState && (
        <ConfirmationModal
          isOpen={modalState.isOpen}
          onClose={handleCancel}
          onConfirm={handleConfirm}
          title={modalState.title}
          message={modalState.message}
          confirmText={modalState.confirmText}
          cancelText={modalState.cancelText}
          type={modalState.type}
        />
      )}
    </ConfirmationContext.Provider>
  );
};

export const useConfirmation = (): ConfirmationContextType => {
  const context = useContext(ConfirmationContext);
  if (!context) {
    throw new Error('useConfirmation must be used within a ConfirmationProvider');
  }
  return context;
};

// دوال مساعدة للاستخدام المباشر
export const confirmDelete = (itemName: string, count: number = 1): Promise<boolean> => {
  const message = count > 1 
    ? `هل أنت متأكد من حذف ${count} ${itemName}؟\nهذه العملية لا يمكن التراجع عنها.`
    : `هل أنت متأكد من حذف ${itemName}؟\nهذه العملية لا يمكن التراجع عنها.`;
  
  return confirm('تأكيد الحذف', message, 'حذف', 'إلغاء', 'danger');
};

export const confirmAction = (title: string, message: string): Promise<boolean> => {
  return confirm(title, message, 'تأكيد', 'إلغاء', 'warning');
};

export const confirmInfo = (title: string, message: string): Promise<boolean> => {
  return confirm(title, message, 'موافق', 'إلغاء', 'info');
};

// دالة confirm الأساسية
export const confirm = (
  title: string,
  message: string,
  confirmText?: string,
  cancelText?: string,
  type?: 'danger' | 'warning' | 'info'
): Promise<boolean> => {
  // هذا سيتم استبداله بـ Context API في الملفات التي تستخدمه
  return Promise.resolve(false);
};
