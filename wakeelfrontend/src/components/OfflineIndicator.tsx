import React from 'react';
import { WifiOff, RefreshCw, CloudOff } from 'lucide-react';
import { useOffline } from '../contexts/OfflineContext';

/**
 * شريط يظهر عند عدم الاتصال أو عند وجود عمليات معلقة،
 * مع زر مزامنة عند العودة للاتصال.
 */
export default function OfflineIndicator() {
  const { online, checking, isSyncing, pendingCount, lastSyncError, syncNow } = useOffline();

  if (online && pendingCount === 0 && !lastSyncError) {
    return null;
  }

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-center gap-3 px-4 py-2 text-sm shadow-md"
      style={{
        backgroundColor: online
          ? pendingCount > 0
            ? 'rgb(245 158 11 / 0.95)' // amber
            : lastSyncError
            ? 'rgb(239 68 68 / 0.95)' // red
            : 'rgb(34 197 94 / 0.95)' // green
          : 'rgb(100 116 139 / 0.95)', // slate
        color: '#fff',
      }}
      role="status"
      aria-live="polite"
    >
      {!online && (
        <>
          <WifiOff className="h-5 w-5 flex-shrink-0" aria-hidden />
          <span>يوجد تحديث في النظام خلال دقائق </span>
        </>
      )}
      {online && checking && (
        <>
          <RefreshCw className="h-5 w-5 flex-shrink-0 animate-spin" aria-hidden />
          <span>التحقق من الاتصال...</span>
        </>
      )}
      {online && !checking && isSyncing && (
        <>
          <RefreshCw className="h-5 w-5 flex-shrink-0 animate-spin" aria-hidden />
          <span>جاري المزامنة...</span>
        </>
      )}
      {online && !checking && !isSyncing && pendingCount > 0 && (
        <>
          <CloudOff className="h-5 w-5 flex-shrink-0" aria-hidden />
          <span>{pendingCount} عملية معلقة للمزامنة</span>
          <button
            type="button"
            onClick={() => syncNow()}
            className="rounded bg-white/20 px-2 py-1 font-medium hover:bg-white/30 focus:outline-none focus:ring-2 focus:ring-white/50"
          >
            مزامنة الآن
          </button>
        </>
      )}
      {online && !checking && !isSyncing && lastSyncError && pendingCount === 0 && (
        <>
          <span>آخر مزامنة: {lastSyncError}</span>
          <button
            type="button"
            onClick={() => syncNow()}
            className="rounded bg-white/20 px-2 py-1 font-medium hover:bg-white/30 focus:outline-none focus:ring-2 focus:ring-white/50"
          >
            إعادة المحاولة
          </button>
        </>
      )}
    </div>
  );
}
