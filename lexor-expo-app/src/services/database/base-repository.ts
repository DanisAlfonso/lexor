import { eq, sql } from 'drizzle-orm';
import { getDrizzleDb } from './client';
import { SyncStatus } from '../../../database/schema';

export interface SyncableEntity {
  id: string;
  syncStatus: SyncStatus;
  lastModified: Date;
  version: number;
}

export interface InsertSyncableEntity {
  id: string;
  syncStatus?: SyncStatus;
  version?: number;
}

// We'll make the repository methods concrete for each service instead of using a generic base class
// This avoids the complex TypeScript typing issues with Drizzle tables