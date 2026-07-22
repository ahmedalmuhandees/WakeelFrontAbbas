import Dexie, { type EntityTable } from 'dexie';

/** تخزين مؤقت للبيانات المستلمة من الـ API للعمل دون اتصال */
export interface CachedSubscriber {
  id: string;
  data: string; // JSON
  updatedAt: number;
}

export interface CachedProfile {
  id: string;
  data: string;
  updatedAt: number;
}

export interface CachedDebt {
  id: string;
  data: string;
  updatedAt: number;
}

export interface CachedRenewal {
  id: string;
  data: string;
  updatedAt: number;
}

/** عنصر في طابور العمليات المعلقة (يُرفع عند عودة الاتصال) */
export interface PendingOperation {
  id?: number;
  clientId: string;
  type: 'CreateRenewal' | 'PayDebt';
  payload: string; // JSON
  createdAt: number;
  status: 'pending' | 'sent' | 'failed';
  errorMessage?: string;
}

export interface SyncMetaRecord {
  id: string;
  lastSyncAt: number; // timestamp
}

export interface CachedReceipt {
  id: string;
  data: string;
  updatedAt: number;
}

class WakeelDb extends Dexie {
  subscribers!: EntityTable<CachedSubscriber, 'id'>;
  profiles!: EntityTable<CachedProfile, 'id'>;
  debts!: EntityTable<CachedDebt, 'id'>;
  renewals!: EntityTable<CachedRenewal, 'id'>;
  receipts!: EntityTable<CachedReceipt, 'id'>;
  pendingOperations!: EntityTable<PendingOperation, 'id'>;
  syncMeta!: EntityTable<SyncMetaRecord, 'id'>;

  constructor() {
    super('WakeelOffline');
    this.version(1).stores({
      subscribers: 'id, updatedAt',
      profiles: 'id, updatedAt',
      debts: 'id, updatedAt',
      renewals: 'id, updatedAt',
      pendingOperations: '++id, clientId, createdAt, status',
      syncMeta: 'id',
    });
    this.version(2).stores({
      receipts: 'id, updatedAt',
    });
  }
}

export const wakeelDb = new WakeelDb();
