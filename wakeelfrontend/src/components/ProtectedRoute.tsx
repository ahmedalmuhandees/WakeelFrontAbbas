import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  requireAuth?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  allowedRoles = [], 
  requireAuth = true 
}) => {
  const { isAuthInitialized, isAuthenticated, user, checkAgentSubscription } = useAuth();
  const location = useLocation();
  const [subscriptionChecked, setSubscriptionChecked] = useState(false);

  useEffect(() => {
    const checkSubscription = async () => {
      if (!isAuthInitialized) return;
      console.log('[AUTH_DEBUG][ProtectedRoute] evaluate', {
        path: location.pathname,
        isAuthInitialized,
        isAuthenticated,
        hasUser: !!user,
        userRole: user?.role,
        requireAuth,
        allowedRoles,
      });
      if (isAuthenticated && user) {
        const isValid = await checkAgentSubscription();
        setSubscriptionChecked(true);
        console.log('[AUTH_DEBUG][ProtectedRoute] subscription checked', { isValid });
        if (!isValid) {
          return; // User will be logged out by checkAgentSubscription
        }
      } else {
        setSubscriptionChecked(true);
      }
    };

    checkSubscription();
  }, [isAuthInitialized, isAuthenticated, user, checkAgentSubscription, allowedRoles, location.pathname, requireAuth]);

  if (!isAuthInitialized || !subscriptionChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (requireAuth && !isAuthenticated) {
    console.warn('[AUTH_DEBUG][ProtectedRoute] redirect -> /login', {
      path: location.pathname,
      isAuthInitialized,
      isAuthenticated,
      hasUser: !!user,
      tokenInStorage: !!localStorage.getItem('token'),
    });
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (allowedRoles.length > 0 && user && !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            غير مصرح لك بالوصول
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            ليس لديك الصلاحية للوصول إلى هذه الصفحة
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
