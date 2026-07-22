import { useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/api';

const HEALTH_CHECK_INTERVAL_MS = 30_000;
/** مهلة طلب فحص الاتصال (أقصر من مهلة axios الافتراضية 30s) */
const HEALTH_CHECK_TIMEOUT_MS = 10_000;

/**
 * حالة الاتصال: navigator.onLine + طلب دوري عبر نفس axios (GET /users/me).
 * استخدام apiService.healthCheck() يضمن نفس الـ baseURL والـ CORS والـ auth.
 */
export function useNetworkStatus() {
  const [online, setOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [checking, setChecking] = useState(false);

  const checkHealth = useCallback(async () => {
    if (!navigator.onLine) {
      setOnline(false);
      return;
    }
    if (!localStorage.getItem('token')) {
      return;
    }
    setChecking(true);
    try {
      await apiService.healthCheck(HEALTH_CHECK_TIMEOUT_MS);
      setOnline(true);
    } catch {
      setOnline(false);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!navigator.onLine) return;
    checkHealth();
    const interval = setInterval(checkHealth, HEALTH_CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [checkHealth]);

  return { online, checking, recheck: checkHealth };
}
