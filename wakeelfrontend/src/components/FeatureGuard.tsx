import React from 'react';
import { useAuth } from '../contexts/AuthContext';

type FeatureGuardProps = {
  feature?: string;
  hiddenWhenFeature?: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
};

export function FeatureGuard({ feature, hiddenWhenFeature, children, fallback = null }: FeatureGuardProps) {
  const { hasFeature, globalAccess } = useAuth();

  if (feature && !hasFeature(feature)) return <>{fallback}</>;
  if (!globalAccess && hiddenWhenFeature && hasFeature(hiddenWhenFeature)) return <>{fallback}</>;
  return <>{children}</>;
}

