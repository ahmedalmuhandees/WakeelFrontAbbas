import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/api';
import { UserRole } from '../types';
import { MessageSquare, X } from 'lucide-react';
import { useDigits } from '../contexts/DigitsContext';

const Layout: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user } = useAuth();
  const [systemMessage, setSystemMessage] = useState<{ message: string; expiresAt: string } | null>(null);
  const [systemMessageModalOpen, setSystemMessageModalOpen] = useState(false);
  const { digitsMode, setDigitsMode } = useDigits();

  useEffect(() => {
    if (!user || (user.role !== UserRole.Agent && user.role !== UserRole.Employee)) return;
    let mounted = true;
    apiService.getSystemMessage().then((data) => {
      if (mounted && data) {
        setSystemMessage(data);
        setSystemMessageModalOpen(true);
      }
    }).catch(() => {});
    return () => { mounted = false; };
  }, [user]);

  const handleToggleDigits = () => {
    setDigitsMode(digitsMode === 'ar' ? 'en' : 'ar');
  };

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* System message modal for agents */}
      {systemMessageModalOpen && systemMessage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="system-message-title"
          onClick={() => setSystemMessageModalOpen(false)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-3xl w-full border border-gray-200 dark:border-gray-700 overflow-hidden max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-primary-50 dark:bg-primary-900/20">
              <h2 id="system-message-title" className="flex items-center gap-2 text-xl font-bold text-gray-900 dark:text-white">
                <MessageSquare className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                رسالة من الإدارة
              </h2>
              <button
                type="button"
                onClick={() => setSystemMessageModalOpen(false)}
                className="p-2 rounded-md text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                aria-label="إغلاق"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 p-5">
                <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap leading-relaxed text-base sm:text-lg font-semibold">
                  {systemMessage.message}
                </p>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end flex-shrink-0">
              <button
                type="button"
                onClick={() => setSystemMessageModalOpen(false)}
                className="px-5 py-2.5 rounded-lg text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                فهمت
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile backdrop when sidebar open */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar - Desktop: inline | Mobile: fixed overlay */}
      <div className="hidden lg:block flex-shrink-0">
        <Sidebar
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={toggleSidebar}
          onClose={undefined}
          isMobileOverlay={false}
        />
      </div>
      <div className="lg:hidden fixed top-0 right-0 z-50 h-full w-[85vw] max-w-[320px] transform transition-transform duration-300 ease-out"
        style={{ transform: mobileMenuOpen ? 'translateX(0)' : 'translateX(100%)' }}
      >
        <Sidebar
          isCollapsed={false}
          onToggleCollapse={() => {}}
          onClose={() => setMobileMenuOpen(false)}
          isMobileOverlay={true}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Bar */}
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 px-3 sm:px-6 py-3 sm:py-4 flex-shrink-0 safe-area-top">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-4">
              {/* Mobile menu button */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden p-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="فتح القائمة"
              >
                <svg className="h-6 w-6 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              {/* Digits toggle: ١٢٣ / 123 */}
              <button
                type="button"
                onClick={handleToggleDigits}
                className="w-7 h-7 sm:w-8 sm:h-8 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center hover:bg-primary-200 dark:hover:bg-primary-800 transition-colors"
                aria-label={digitsMode === 'ar' ? 'تغيير لغة الأرقام إلى 123' : 'تغيير لغة الأرقام إلى ١٢٣'}
                title={digitsMode === 'ar' ? 'الأرقام: ١٢٣ (اضغط للتبديل إلى 123)' : 'الأرقام: 123 (اضغط للتبديل إلى ١٢٣)'}
              >
                <span className="text-primary-600 dark:text-primary-400 text-xs sm:text-sm font-semibold select-none">
                  {digitsMode === 'ar' ? '١٢٣' : '123'}
                </span>
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto overflow-x-hidden min-h-0">
          <div className="p-3 sm:p-4 lg:p-6 pb-safe">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
