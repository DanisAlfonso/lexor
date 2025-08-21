import { APP_CONFIG } from '@/config';
import { documentService } from '../database/documents';
import { flashcardService } from '../database/flashcards';
import { SyncableEntity } from '../database/base-repository';

export interface SyncResult {
  success: boolean;
  syncedCount: number;
  conflictCount: number;
  errorCount: number;
  errors: string[];
}

export interface SyncService {
  syncAll(): Promise<SyncResult>;
  syncDocuments(): Promise<SyncResult>;
  syncFlashcards(): Promise<SyncResult>;
  resolveConflicts(): Promise<void>;
  getLastSyncTime(): Promise<Date | null>;
  setLastSyncTime(time: Date): Promise<void>;
}

class LocalSyncService implements SyncService {
  async syncAll(): Promise<SyncResult> {
    if (!APP_CONFIG.sync.enabled) {
      return {
        success: true,
        syncedCount: 0,
        conflictCount: 0,
        errorCount: 0,
        errors: ['Sync is disabled'],
      };
    }

    const documentResult = await this.syncDocuments();
    const flashcardResult = await this.syncFlashcards();

    return {
      success: documentResult.success && flashcardResult.success,
      syncedCount: documentResult.syncedCount + flashcardResult.syncedCount,
      conflictCount: documentResult.conflictCount + flashcardResult.conflictCount,
      errorCount: documentResult.errorCount + flashcardResult.errorCount,
      errors: [...documentResult.errors, ...flashcardResult.errors],
    };
  }

  async syncDocuments(): Promise<SyncResult> {
    // In a real implementation, this would sync with a remote server
    // For now, we'll just mark all pending items as synced
    const pendingDocuments = await documentService.getPendingSync();
    
    for (const doc of pendingDocuments) {
      await documentService.markAsSynced(doc.id);
    }

    return {
      success: true,
      syncedCount: pendingDocuments.length,
      conflictCount: 0,
      errorCount: 0,
      errors: [],
    };
  }

  async syncFlashcards(): Promise<SyncResult> {
    const pendingFlashcards = await flashcardService.getPendingSync();
    
    for (const card of pendingFlashcards) {
      await flashcardService.markAsSynced(card.id);
    }

    return {
      success: true,
      syncedCount: pendingFlashcards.length,
      conflictCount: 0,
      errorCount: 0,
      errors: [],
    };
  }

  async resolveConflicts(): Promise<void> {
    // Get all conflicts
    const documentConflicts = await documentService.getConflicts();
    const flashcardConflicts = await flashcardService.getConflicts();

    // For now, use local version (last write wins)
    for (const doc of documentConflicts) {
      await documentService.resolveConflict(doc.id, doc);
    }

    for (const card of flashcardConflicts) {
      await flashcardService.resolveConflict(card.id, card);
    }
  }

  async getLastSyncTime(): Promise<Date | null> {
    // This would be stored in settings or AsyncStorage
    return null;
  }

  async setLastSyncTime(time: Date): Promise<void> {
    // Store in settings
  }
}

class CloudSyncService implements SyncService {
  private apiUrl = APP_CONFIG.api.baseUrl;

  async syncAll(): Promise<SyncResult> {
    // Implementation for cloud sync
    // This would make HTTP requests to your backend API
    throw new Error('Cloud sync not implemented yet');
  }

  async syncDocuments(): Promise<SyncResult> {
    throw new Error('Cloud sync not implemented yet');
  }

  async syncFlashcards(): Promise<SyncResult> {
    throw new Error('Cloud sync not implemented yet');
  }

  async resolveConflicts(): Promise<void> {
    throw new Error('Cloud sync not implemented yet');
  }

  async getLastSyncTime(): Promise<Date | null> {
    throw new Error('Cloud sync not implemented yet');
  }

  async setLastSyncTime(time: Date): Promise<void> {
    throw new Error('Cloud sync not implemented yet');
  }
}

// Factory function to get the appropriate sync service
export const getSyncService = (): SyncService => {
  if (APP_CONFIG.sync.enabled) {
    return new CloudSyncService();
  }
  return new LocalSyncService();
};

export const syncService = getSyncService();