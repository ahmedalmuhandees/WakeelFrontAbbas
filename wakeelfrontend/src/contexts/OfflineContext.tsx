import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { useAuth } from './AuthContext';
import { UserRole } from '../types';
import { runFullSync, getPendingCount } from '../services/offlineSync';
import type { SyncUploadResponseDto, SyncChangesResponseDto } from '../types';

type SyncState = 'idle' | 'syncing' | 'success' | 'error';

interface OfflineContextType {
  online: boolean;
  checking: boolean;
  isSyncing: boolean;
  syncState: SyncState;
  pendingCount: number;
  lastSyncError: string | null;
  syncNow: (agentId?: string) => Promise<{ upload: SyncUploadResponseDto; changes: SyncChangesResponseDto } | null>;
  refreshPendingCount: () => Promise<void>;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

export function useOffline() {
  const ctx = useContext(OfflineContext);
  if (ctx === undefined) {
    throw new Error('useOffline must be used within an OfflineProvider');
  }
  return ctx;
}

interface OfflineProviderProps {
  children: ReactNode;
}

export function OfflineProvider({ children }: OfflineProviderProps) {
  const { online, checking } = useNetworkStatus();
  const { user } = useAuth();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncState, setSyncState] = useState<SyncState>('idle');
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncError, setLastSyncError] = useState<string | null>(null);

  const isSubAgent = user?.role === UserRole.SubAgent;

  const refreshPendingCount = useCallback(async () => {
    const n = await getPendingCount();
    setPendingCount(n);
  }, []);

  const syncNow = useCallback(
    async (agentId?: string): Promise<{ upload: SyncUploadResponseDto; changes: SyncChangesResponseDto } | null> => {
      if (isSubAgent) return null;
      if (!online) {
        setLastSyncError('لا يوجد اتصال');
        return null;
      }
      setIsSyncing(true);
      setSyncState('syncing');
      setLastSyncError(null);
      try {
        const { uploadResult, changesResult } = await runFullSync(agentId);
        setSyncState('success');
        await refreshPendingCount();
        return { upload: uploadResult, changes: changesResult };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'فشل المزامنة';
        setLastSyncError(message);
        setSyncState('error');
        return null;
      } finally {
        setIsSyncing(false);
      }
    },
    [online, isSubAgent, refreshPendingCount]
  );

  useEffect(() => {
    refreshPendingCount();
  }, [refreshPendingCount]);

  useEffect(() => {
    if (!isSubAgent && online && !checking && localStorage.getItem('token')) {
      syncNow().catch(() => {});
    }
  }, [online, isSubAgent]); // eslint-disable-line react-hooks/exhaustive-deps -- run sync when coming back online once

  const value: OfflineContextType = {
    online,
    checking,
    isSyncing,
    syncState,
    pendingCount,
    lastSyncError,
    syncNow,
    refreshPendingCount,
  };

  return <OfflineContext.Provider value={value}>{children}</OfflineContext.Provider>;
}
