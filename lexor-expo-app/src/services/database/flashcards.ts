import { eq, and, lt, sql, isNotNull } from 'drizzle-orm';
import { getDrizzleDb } from './client';
import { flashcards, type Flashcard, type InsertFlashcard, type SyncStatus } from '../../../database/schema';

class FlashcardRepository {
  private db = getDrizzleDb();

  async create(flashcard: InsertFlashcard): Promise<Flashcard> {
    const now = new Date();
    const flashcardWithDefaults = {
      ...flashcard,
      syncStatus: flashcard.syncStatus || 'pending' as SyncStatus,
      lastModified: now,
      version: flashcard.version || 1,
    };

    const [created] = await this.db.insert(flashcards).values(flashcardWithDefaults).returning();
    return created;
  }

  async getById(id: string): Promise<Flashcard | null> {
    const [flashcard] = await this.db.select().from(flashcards).where(eq(flashcards.id, id));
    return flashcard || null;
  }

  async getAll(): Promise<Flashcard[]> {
    return await this.db.select().from(flashcards);
  }

  async update(id: string, updates: Partial<Flashcard>): Promise<Flashcard | null> {
    const updatesWithSync = {
      ...updates,
      lastModified: new Date(),
      syncStatus: 'pending' as SyncStatus,
      version: sql`${flashcards.version} + 1`,
    };

    const [updated] = await this.db
      .update(flashcards)
      .set(updatesWithSync)
      .where(eq(flashcards.id, id))
      .returning();

    return updated || null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db.delete(flashcards).where(eq(flashcards.id, id));
    return result.changes > 0;
  }

  async markAsSynced(id: string): Promise<void> {
    await this.db
      .update(flashcards)
      .set({ syncStatus: 'synced' })
      .where(eq(flashcards.id, id));
  }

  async getPendingSync(): Promise<Flashcard[]> {
    return await this.db
      .select()
      .from(flashcards)
      .where(eq(flashcards.syncStatus, 'pending'));
  }

  async getConflicts(): Promise<Flashcard[]> {
    return await this.db
      .select()
      .from(flashcards)
      .where(eq(flashcards.syncStatus, 'conflict'));
  }

  async resolveConflict(id: string, resolvedEntity: Partial<Flashcard>): Promise<Flashcard | null> {
    const updatesWithSync = {
      ...resolvedEntity,
      lastModified: new Date(),
      syncStatus: 'synced' as SyncStatus,
      version: sql`${flashcards.version} + 1`,
    };

    const [updated] = await this.db
      .update(flashcards)
      .set(updatesWithSync)
      .where(eq(flashcards.id, id))
      .returning();

    return updated || null;
  }

  async getByDocumentId(documentId: string): Promise<Flashcard[]> {
    return await this.db
      .select()
      .from(flashcards)
      .where(eq(flashcards.documentId, documentId));
  }

  async getDueForReview(limit = 20): Promise<Flashcard[]> {
    const now = new Date();
    return await this.db
      .select()
      .from(flashcards)
      .where(
        and(
          isNotNull(flashcards.nextReview),
          lt(flashcards.nextReview, now)
        )
      )
      .limit(limit);
  }

  async updateReview(
    id: string, 
    correct: boolean, 
    difficulty: number, 
    nextReviewDate: Date
  ): Promise<Flashcard | null> {
    const flashcard = await this.getById(id);
    if (!flashcard) return null;

    const reviewCount = flashcard.reviewCount + 1;
    const correctCount = correct ? flashcard.correctCount + 1 : flashcard.correctCount;

    return await this.update(id, {
      difficulty,
      nextReview: nextReviewDate,
      reviewCount,
      correctCount,
    });
  }

  async getNewCards(limit = 10): Promise<Flashcard[]> {
    return await this.db
      .select()
      .from(flashcards)
      .where(eq(flashcards.difficulty, 0))
      .limit(limit);
  }

  async getLearningCards(limit = 10): Promise<Flashcard[]> {
    return await this.db
      .select()
      .from(flashcards)
      .where(
        and(
          sql`${flashcards.difficulty} > 0`,
          sql`${flashcards.difficulty} < 4`
        )
      )
      .limit(limit);
  }

  async getMasteredCards(): Promise<Flashcard[]> {
    return await this.db
      .select()
      .from(flashcards)
      .where(sql`${flashcards.difficulty} >= 4`);
  }

  async getStats(documentId?: string) {
    const whereClause = documentId ? eq(flashcards.documentId, documentId) : undefined;
    const cards = await this.db.select().from(flashcards).where(whereClause);

    return {
      total: cards.length,
      mastered: cards.filter(card => card.difficulty >= 4).length,
      learning: cards.filter(card => card.difficulty > 0 && card.difficulty < 4).length,
      new: cards.filter(card => card.difficulty === 0).length,
      averageAccuracy: cards.length > 0 
        ? cards.reduce((sum, card) => sum + (card.reviewCount > 0 ? card.correctCount / card.reviewCount : 0), 0) / cards.length
        : 0,
    };
  }

  async getReviewSchedule(days = 7): Promise<{date: string, count: number}[]> {
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + days);

    const cards = await this.db
      .select()
      .from(flashcards)
      .where(
        and(
          isNotNull(flashcards.nextReview),
          sql`${flashcards.nextReview} BETWEEN ${startDate.getTime()} AND ${endDate.getTime()}`
        )
      );

    // Group by date
    const schedule: {[date: string]: number} = {};
    cards.forEach(card => {
      if (card.nextReview) {
        const dateKey = new Date(card.nextReview).toISOString().split('T')[0];
        schedule[dateKey] = (schedule[dateKey] || 0) + 1;
      }
    });

    return Object.entries(schedule).map(([date, count]) => ({ date, count }));
  }

  async searchCards(query: string, documentId?: string): Promise<Flashcard[]> {
    const conditions = [
      sql`(${flashcards.frontText} LIKE ${'%' + query + '%'} OR ${flashcards.backText} LIKE ${'%' + query + '%'})`
    ];

    if (documentId) {
      conditions.push(eq(flashcards.documentId, documentId));
    }

    return await this.db
      .select()
      .from(flashcards)
      .where(and(...conditions));
  }
}

export const flashcardService = new FlashcardRepository();