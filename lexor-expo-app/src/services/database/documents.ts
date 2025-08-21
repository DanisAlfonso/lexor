import { eq, desc, sql, isNotNull } from 'drizzle-orm';
import { getDrizzleDb } from './client';
import { documents, type Document, type InsertDocument, type SyncStatus } from '../../../database/schema';

class DocumentRepository {
  private db = getDrizzleDb();

  async create(document: InsertDocument): Promise<Document> {
    const now = new Date();
    const documentWithDefaults = {
      ...document,
      syncStatus: document.syncStatus || 'pending' as SyncStatus,
      lastModified: now,
      version: document.version || 1,
    };

    const [created] = await this.db.insert(documents).values(documentWithDefaults).returning();
    return created;
  }

  async getById(id: string): Promise<Document | null> {
    const [document] = await this.db.select().from(documents).where(eq(documents.id, id));
    return document || null;
  }

  async getAll(): Promise<Document[]> {
    return await this.db
      .select()
      .from(documents)
      .orderBy(desc(documents.lastOpened));
  }

  async update(id: string, updates: Partial<Document>): Promise<Document | null> {
    const updatesWithSync = {
      ...updates,
      lastModified: new Date(),
      syncStatus: 'pending' as SyncStatus,
      version: sql`${documents.version} + 1`,
    };

    const [updated] = await this.db
      .update(documents)
      .set(updatesWithSync)
      .where(eq(documents.id, id))
      .returning();

    return updated || null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db.delete(documents).where(eq(documents.id, id));
    return result.changes > 0;
  }

  async updateReadingProgress(id: string, progress: number, currentPage: number): Promise<Document | null> {
    return await this.update(id, {
      readingProgress: progress,
      currentPage,
      lastOpened: new Date(),
    });
  }

  async markAsSynced(id: string): Promise<void> {
    await this.db
      .update(documents)
      .set({ syncStatus: 'synced' })
      .where(eq(documents.id, id));
  }

  async getPendingSync(): Promise<Document[]> {
    return await this.db
      .select()
      .from(documents)
      .where(eq(documents.syncStatus, 'pending'));
  }

  async getConflicts(): Promise<Document[]> {
    return await this.db
      .select()
      .from(documents)
      .where(eq(documents.syncStatus, 'conflict'));
  }

  async resolveConflict(id: string, resolvedEntity: Partial<Document>): Promise<Document | null> {
    const updatesWithSync = {
      ...resolvedEntity,
      lastModified: new Date(),
      syncStatus: 'synced' as SyncStatus,
      version: sql`${documents.version} + 1`,
    };

    const [updated] = await this.db
      .update(documents)
      .set(updatesWithSync)
      .where(eq(documents.id, id))
      .returning();

    return updated || null;
  }

  async getRecentlyOpened(limit = 5): Promise<Document[]> {
    return await this.db
      .select()
      .from(documents)
      .where(isNotNull(documents.lastOpened))
      .orderBy(desc(documents.lastOpened))
      .limit(limit);
  }

  async getByLanguage(language: string): Promise<Document[]> {
    return await this.db
      .select()
      .from(documents)
      .where(eq(documents.language, language))
      .orderBy(desc(documents.lastOpened));
  }

  async getByFileType(fileType: 'epub' | 'md' | 'pdf'): Promise<Document[]> {
    return await this.db
      .select()
      .from(documents)
      .where(eq(documents.fileType, fileType))
      .orderBy(desc(documents.lastOpened));
  }

  async search(query: string): Promise<Document[]> {
    return await this.db
      .select()
      .from(documents)
      .where(sql`${documents.title} LIKE ${'%' + query + '%'}`)
      .orderBy(desc(documents.lastOpened));
  }

  async getReadingStats(): Promise<{
    totalDocuments: number;
    documentsInProgress: number;
    documentsCompleted: number;
    totalReadingTime: number;
  }> {
    const total = await this.db.select({ count: sql<number>`count(*)` }).from(documents);
    const inProgress = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(documents)
      .where(sql`${documents.readingProgress} > 0 AND ${documents.readingProgress} < 1`);
    
    const completed = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(documents)
      .where(sql`${documents.readingProgress} >= 1`);

    return {
      totalDocuments: total[0]?.count || 0,
      documentsInProgress: inProgress[0]?.count || 0,
      documentsCompleted: completed[0]?.count || 0,
      totalReadingTime: 0, // This would come from reading_sessions
    };
  }
}

export const documentService = new DocumentRepository();