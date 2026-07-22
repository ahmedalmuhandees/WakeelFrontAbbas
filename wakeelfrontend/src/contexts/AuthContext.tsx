import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { MeFeaturesResponse, User, UserRole } from '../types';
import { apiService } from '../services/api';
import { buildUserFromLoginResponse, mergeEmployeePermissionsFromLogin } from '../utils/authLogin';
import {
  clearAuthAndRedirectToLogin,
  clearAuthStorage,
  clearSessionExpiryMeta,
  getSessionExpiresAtMs,
  isAccessTokenExpired,
  parseJwtExpMs,
  resetSessionRedirectGuard,
  setSessionExpiryFromLogin,
} from '../utils/sessionManager';

interface AuthContextType {
  user: User | null;
  tenantId: string | null;
  features: string[];
  globalAccess: boolean;
  isAuthInitialized: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string, turnstileToken?: string) => Promise<void>;
  logout: () => void;
  hasRole: (role: UserRole) => boolean;
  hasAnyRole: (roles: UserRole[]) => boolean;
  hasFeature: (feature: string) => boolean;
  checkAgentSubscription: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [features, setFeatures] = useState<string[]>([]);
  const [globalAccess, setGlobalAccess] = useState(false);
  const [isAuthInitialized, setIsAuthInitialized] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      const savedUser = localStorage.getItem('user');
      const savedFeatures = localStorage.getItem('meFeatures');
      console.log('[AUTH_DEBUG][init] start', {
        hasToken: !!token,
        hasSavedUser: !!savedUser,
        hasSavedFeatures: !!savedFeatures,
      });
      
      if (token && savedUser) {
        try {
          if (isAccessTokenExpired(0)) {
            console.warn('[AUTH_DEBUG][init] token expired locally, clearing session');
            clearAuthStorage();
            resetSessionRedirectGuard();
            setUser(null);
            setTenantId(null);
            setFeatures([]);
            setGlobalAccess(false);
            setIsAuthInitialized(true);
            return;
          }
          const userData = JSON.parse(savedUser);
          console.log('[AUTH_DEBUG][init] parsed saved user', {
            id: userData?.id,
            username: userData?.username,
            role: userData?.role,
          });
          setUser(userData);
          if (savedFeatures) {
            const parsed = JSON.parse(savedFeatures) as MeFeaturesResponse;
            setTenantId(parsed.tenantId ?? null);
            setFeatures(parsed.features ?? []);
            setGlobalAccess(!!parsed.globalAccess);
            console.log('[AUTH_DEBUG][init] loaded features', {
              tenantId: parsed.tenantId ?? null,
              featureCount: (parsed.features ?? []).length,
              globalAccess: !!parsed.globalAccess,
            });
          }
        } catch (error) {
          console.error('[AUTH_DEBUG][init] error parsing saved user:', error);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          localStorage.removeItem('meFeatures');
        }
      }
      setIsAuthInitialized(true);
      console.log('[AUTH_DEBUG][init] completed');
    };

    initAuth();
  }, []);

  /** إعادة توجيه هادئة عند انتهاء التوكن دون انتظار موجة 401 من كل الـ APIs */
  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    const expMs = getSessionExpiresAtMs() ?? parseJwtExpMs(token);
    if (expMs == null) return;
    const delay = expMs - Date.now();
    if (delay <= 0) {
      clearAuthAndRedirectToLogin('expired');
      return;
    }
    const id = window.setTimeout(() => {
      clearAuthAndRedirectToLogin('expired');
    }, delay);
    return () => clearTimeout(id);
  }, [user]);

  const login = async (username: string, password: string, turnstileToken?: string) => {
    try {
      console.log('[AUTH_DEBUG][login] start', { username });
      const response = await apiService.login({ username, password, turnstileToken });
      console.log('[AUTH_DEBUG][login] api success', {
        hasToken: !!response?.token,
        role: response?.role,
        roleId: response?.roleId,
        skipAgentsMeAndSync: !!response?.skipAgentsMeAndSync,
      });

      localStorage.setItem('token', response.token);
      setSessionExpiryFromLogin(response.token, response.expiresInSeconds);
      resetSessionRedirectGuard();

      // نبني المستخدم من استجابة login مباشرة كخيار آمن، ثم نحاول تحسين البيانات من /users/me إن توفر
      const loginSnapshot = buildUserFromLoginResponse(response, username);
      let userData: User = loginSnapshot;
      let featuresData: MeFeaturesResponse = { features: [], globalAccess: false };

      try {
        if (!response.skipAgentsMeAndSync) {
          /** أثناء التمهيد لا نستخدم إعادة التوجيه العامة عند 401 — وإلا تُفرغ الجلسة */
          const me = await apiService.getCurrentUser({ skipAuthRedirect: true });
          userData = mergeEmployeePermissionsFromLogin(loginSnapshot, me);
          console.log('[AUTH_DEBUG][login] bootstrap /users/me ok');
        }
      } catch (bootstrapError) {
        // أي خطأ في تحميل البيانات الإضافية بعد login لا يجب أن يلغي تسجيل الدخول الأساسي
        console.warn('Post-login bootstrap failed, using fallback user:', bootstrapError);
      }

      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      setTenantId(featuresData.tenantId ?? null);
      setFeatures(featuresData.features ?? []);
      setGlobalAccess(!!featuresData.globalAccess);
      localStorage.setItem('meFeatures', JSON.stringify(featuresData));
      setIsAuthInitialized(true);
      console.log('[AUTH_DEBUG][login] finalized', {
        userId: userData?.id,
        username: userData?.username,
        role: userData?.role,
        tokenInStorage: !!localStorage.getItem('token'),
      });
    } catch (error) {
      console.error('[AUTH_DEBUG][login] error:', error);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('meFeatures');
      clearSessionExpiryMeta();
      setUser(null);
      setTenantId(null);
      setFeatures([]);
      setGlobalAccess(false);
      setIsAuthInitialized(true);
      throw error;
    }
  };

  const logout = () => {
    console.log('[AUTH_DEBUG][logout] clearing local session');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('meFeatures');
    clearSessionExpiryMeta();
    resetSessionRedirectGuard();
    setUser(null);
    setTenantId(null);
    setFeatures([]);
    setGlobalAccess(false);
    setIsAuthInitialized(true);
  };

  const hasRole = (role: UserRole): boolean => {
    return user?.role === role;
  };

  const hasAnyRole = (roles: UserRole[]): boolean => {
    return user ? roles.includes(user.role) : false;
  };

  const hasFeature = (feature: string): boolean => {
    if (globalAccess) return true;
    return features.includes(feature);
  };

  const checkAgentSubscription = async (): Promise<boolean> => {
    if (!user || user.role !== UserRole.Agent) {
      return true; // Not an agent, no need to check
    }

    // For agents, we need to fetch their subscription details from the API
    // This is a simplified check - in a real app, you'd fetch the agent's subscription
    // For now, we'll assume the subscription is valid if the user is logged in
    return true;
  };

  const value: AuthContextType = {
    user,
    tenantId,
    features,
    globalAccess,
    isAuthInitialized,
    isAuthenticated: !!user || !!localStorage.getItem('token'),
    login,
    logout,
    hasRole,
    hasAnyRole,
    hasFeature,
    checkAgentSubscription,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
