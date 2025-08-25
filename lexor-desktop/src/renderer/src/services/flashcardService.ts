import { FSRS, createEmptyCard, Grade, ReviewLog, Rating as FSRSRating } from 'ts-fsrs';
import type { Card } from 'ts-fsrs';
import { 
  Deck, 
  Flashcard, 
  StudyCard, 
  DeckStats, 
  ParsedFlashcard,
  CreateDeckResponse,
  ImportCardsResponse,
  CardState,
  Rating 
} from '../../../shared/types/flashcards';
import { FlashcardParser } from '../../../shared/utils/flashcardParser';

export class FlashcardService {
  private fsrs: FSRS;

  constructor() {
    // Initialize FSRS with default parameters (can be customized)
    this.fsrs = new FSRS({
      // FSRS default parameters - can be adjusted based on user preferences
      w: [0.4072, 1.1829, 3.1262, 15.4722, 7.2102, 0.5316, 1.0651, 0.0234, 1.616, 0.1544, 1.0824, 1.9813, 0.0953, 0.2975, 2.2042, 0.2407, 2.9466, 0.5034, 0.6567],
      request_retention: 0.9, // 90% retention rate
      maximum_interval: 36500, // ~100 years
      easy_bonus: 1.3,
      hard_factor: 1.2,
    });
  }

  // Database interaction helpers
  private async query(sql: string, params?: any[]): Promise<any[]> {
    return await window.electronAPI.database.query(sql, params);
  }

  private async execute(sql: string, params?: any[]): Promise<void> {
    return await window.electronAPI.database.execute(sql, params);
  }

  private async transaction(queries: Array<{ sql: string; params?: any[] }>): Promise<void> {
    return await window.electronAPI.database.transaction(queries);
  }

  // Deck management
  async createDeck(
    name: string, 
    description?: string, 
    filePath?: string,
    parentId?: number,
    options?: { tags?: string[], color?: string, icon?: string }
  ): Promise<CreateDeckResponse> {
    try {
      const result = await this.query(
        `INSERT INTO decks (name, description, file_path, parent_id, tags, color, icon) 
         VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id`,
        [
          name, 
          description || null, 
          filePath || null,
          parentId || null,
          options?.tags ? JSON.stringify(options.tags) : null,
          options?.color || null,
          options?.icon || null
        ]
      );
      
      return {
        success: true,
        deck_id: result[0].id
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create deck'
      };
    }
  }

  async getAllDecks(): Promise<Deck[]> {
    const rows = await this.query(`
      SELECT d.*, COUNT(f.id) as card_count
      FROM decks d
      LEFT JOIN flashcards f ON d.id = f.deck_id
      GROUP BY d.id
      ORDER BY d.collection_path, d.name
    `);
    
    return rows.map(row => ({
      ...row,
      tags: row.tags ? JSON.parse(row.tags) : [],
      is_collection: !row.file_path // Collections don't have associated files
    })) as Deck[];
  }

  async getDeckHierarchy(): Promise<Deck[]> {
    const allDecks = await this.getAllDecks();
    const deckMap = new Map<number, Deck>();
    const rootDecks: Deck[] = [];

    // First pass: create lookup map and identify roots
    for (const deck of allDecks) {
      deck.children = [];
      deckMap.set(deck.id!, deck);
      
      if (!deck.parent_id) {
        rootDecks.push(deck);
      }
    }

    // Second pass: build hierarchy
    for (const deck of allDecks) {
      if (deck.parent_id) {
        const parent = deckMap.get(deck.parent_id);
        if (parent) {
          parent.children!.push(deck);
          deck.depth = (parent.depth || 0) + 1;
        }
      } else {
        deck.depth = 0;
      }
    }

    return rootDecks;
  }

  async getChildDecks(parentId: number): Promise<Deck[]> {
    const rows = await this.query(`
      SELECT d.*, COUNT(f.id) as card_count
      FROM decks d
      LEFT JOIN flashcards f ON d.id = f.deck_id
      WHERE d.parent_id = ?
      GROUP BY d.id
      ORDER BY d.name
    `, [parentId]);
    
    return rows.map(row => ({
      ...row,
      tags: row.tags ? JSON.parse(row.tags) : [],
      is_collection: !row.file_path
    })) as Deck[];
  }

  async createCollection(name: string, parentId?: number, options?: { color?: string, icon?: string }): Promise<CreateDeckResponse> {
    return this.createDeck(
      name,
      `Collection: ${name}`,
      undefined, // No file path for collections
      parentId,
      {
        color: options?.color || this.generateColorFromString(name),
        icon: options?.icon || 'FolderIcon'
      }
    );
  }

  private generateColorFromString(str: string): string {
    const colors = [
      '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', 
      '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1'
    ];
    
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }

  async getDeck(deckId: number): Promise<Deck | null> {
    const rows = await this.query(`
      SELECT d.*, COUNT(f.id) as card_count
      FROM decks d
      LEFT JOIN flashcards f ON d.id = f.deck_id
      WHERE d.id = ?
      GROUP BY d.id
    `, [deckId]);
    
    return rows.length > 0 ? rows[0] as Deck : null;
  }

  async updateDeck(deckId: number, updates: Partial<Deck>): Promise<boolean> {
    try {
      const fields = Object.keys(updates);
      const values = Object.values(updates);
      const setClause = fields.map(field => `${field} = ?`).join(', ');
      
      await this.execute(`UPDATE decks SET ${setClause} WHERE id = ?`, [...values, deckId]);
      return true;
    } catch (error) {
      console.error('Failed to update deck:', error);
      return false;
    }
  }

  async deleteDeck(deckId: number): Promise<boolean> {
    try {
      await this.execute('DELETE FROM decks WHERE id = ?', [deckId]);
      return true;
    } catch (error) {
      console.error('Failed to delete deck:', error);
      return false;
    }
  }

  // Flashcard management
  async createFlashcard(card: Omit<Flashcard, 'id' | 'created_at' | 'updated_at'>): Promise<number | null> {
    try {
      const result = await this.query(`
        INSERT INTO flashcards (deck_id, front, back, media_paths, source_file, source_line)
        VALUES (?, ?, ?, ?, ?, ?)
        RETURNING id
      `, [
        card.deck_id,
        card.front,
        card.back,
        card.media_paths ? JSON.stringify(card.media_paths) : null,
        card.source_file || null,
        card.source_line || null
      ]);

      const cardId = result[0].id;

      // Initialize FSRS state for new card
      await this.initializeCardState(cardId);

      return cardId;
    } catch (error) {
      console.error('Failed to create flashcard:', error);
      return null;
    }
  }

  private async initializeCardState(cardId: number): Promise<void> {
    const newCard = createEmptyCard();
    const dueDate = new Date();
    
    await this.execute(`
      INSERT INTO card_states (card_id, due_date, stability, difficulty, elapsed_days, scheduled_days, learning_steps, reps, lapses, state)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      cardId,
      dueDate.toISOString(),
      newCard.stability,
      newCard.difficulty,
      newCard.elapsed_days,
      newCard.scheduled_days,
      newCard.learning_steps,
      newCard.reps,
      newCard.lapses,
      newCard.state
    ]);
  }

  async getFlashcardsByDeck(deckId: number): Promise<Flashcard[]> {
    const rows = await this.query(
      'SELECT * FROM flashcards WHERE deck_id = ? ORDER BY created_at ASC',
      [deckId]
    );
    return rows as Flashcard[];
  }

  async updateFlashcard(cardId: number, updates: Partial<Flashcard>): Promise<boolean> {
    try {
      const fields = Object.keys(updates);
      const values = Object.values(updates);
      const setClause = fields.map(field => `${field} = ?`).join(', ');
      
      await this.execute(`UPDATE flashcards SET ${setClause} WHERE id = ?`, [...values, cardId]);
      return true;
    } catch (error) {
      console.error('Failed to update flashcard:', error);
      return false;
    }
  }

  async deleteFlashcard(cardId: number): Promise<boolean> {
    try {
      await this.execute('DELETE FROM flashcards WHERE id = ?', [cardId]);
      return true;
    } catch (error) {
      console.error('Failed to delete flashcard:', error);
      return false;
    }
  }

  // Import flashcards from markdown
  async importFromMarkdown(
    filePath: string, 
    content: string, 
    deckName?: string
  ): Promise<ImportCardsResponse> {
    try {
      const parsedCards = FlashcardParser.parseMarkdown(content, filePath);
      
      if (parsedCards.length === 0) {
        return {
          success: false,
          imported_count: 0,
          errors: ['No flashcards found in the markdown file']
        };
      }

      // Create or find deck
      let deckId: number;
      const finalDeckName = deckName || this.extractDeckNameFromPath(filePath);
      
      // Check if deck exists
      const existingDecks = await this.query(
        'SELECT id FROM decks WHERE name = ?',
        [finalDeckName]
      );

      if (existingDecks.length > 0) {
        deckId = existingDecks[0].id;
      } else {
        const createResult = await this.createDeck(finalDeckName, undefined, filePath);
        if (!createResult.success || !createResult.deck_id) {
          return {
            success: false,
            imported_count: 0,
            errors: ['Failed to create deck']
          };
        }
        deckId = createResult.deck_id;
      }

      // Import cards
      const errors: string[] = [];
      let imported = 0;

      for (const parsedCard of parsedCards) {
        const validation = FlashcardParser.validateCard(parsedCard);
        if (!validation.valid) {
          errors.push(`Line ${parsedCard.source_line}: ${validation.errors.join(', ')}`);
          continue;
        }

        const cardId = await this.createFlashcard({
          deck_id: deckId,
          front: parsedCard.front,
          back: parsedCard.back,
          media_paths: parsedCard.media_paths?.join(','),
          source_file: filePath,
          source_line: parsedCard.source_line
        });

        if (cardId) {
          imported++;
        } else {
          errors.push(`Line ${parsedCard.source_line}: Failed to create flashcard`);
        }
      }

      return {
        success: imported > 0,
        imported_count: imported,
        errors: errors.length > 0 ? errors : undefined,
        deck_id: deckId
      };
    } catch (error) {
      return {
        success: false,
        imported_count: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error occurred']
      };
    }
  }

  private extractDeckNameFromPath(filePath: string): string {
    const fileName = filePath.split('/').pop() || 'Unknown';
    return fileName.replace(/\.(md|markdown)$/i, '');
  }

  // Study session management
  async getDueCards(deckId?: number, limit?: number, includeChildren = false): Promise<StudyCard[]> {
    let sql: string;
    let params: any[] = [];
    
    if (deckId && includeChildren) {
      // Use recursive CTE to get cards from deck and all children
      sql = `
        WITH RECURSIVE deck_hierarchy AS (
          SELECT id FROM decks WHERE id = ?
          UNION ALL
          SELECT d.id FROM decks d 
          JOIN deck_hierarchy dh ON d.parent_id = dh.id
        )
        SELECT f.*, cs.*, d.name as deck_name, d.collection_path,
               f.id as card_id, cs.due_date, cs.stability, cs.difficulty, 
               cs.elapsed_days, cs.scheduled_days, cs.reps, cs.lapses, cs.state, cs.last_review
        FROM flashcards f
        JOIN card_states cs ON f.id = cs.card_id
        JOIN decks d ON f.deck_id = d.id
        WHERE f.deck_id IN (SELECT id FROM deck_hierarchy)
          AND cs.due_date <= datetime('now')
        ORDER BY cs.due_date ASC
      `;
      params = [deckId];
    } else {
      sql = `
        SELECT f.*, cs.*, d.name as deck_name, d.collection_path,
               f.id as card_id, cs.due_date, cs.stability, cs.difficulty, 
               cs.elapsed_days, cs.scheduled_days, cs.reps, cs.lapses, cs.state, cs.last_review
        FROM flashcards f
        JOIN card_states cs ON f.id = cs.card_id
        JOIN decks d ON f.deck_id = d.id
        WHERE cs.due_date <= datetime('now')
      `;
      
      if (deckId) {
        sql += ' AND f.deck_id = ?';
        params.push(deckId);
      }
      
      sql += ' ORDER BY cs.due_date ASC';
    }
    
    if (limit) {
      sql += ' LIMIT ?';
      params.push(limit);
    }

    const rows = await this.query(sql, params);
    return this.mapToStudyCards(rows);
  }

  async getNewCards(deckId?: number, limit?: number): Promise<StudyCard[]> {
    let sql = `
      SELECT f.*, cs.*, d.name as deck_name,
             f.id as card_id, cs.due_date, cs.stability, cs.difficulty, 
             cs.elapsed_days, cs.scheduled_days, cs.reps, cs.lapses, cs.state, cs.last_review
      FROM flashcards f
      JOIN card_states cs ON f.id = cs.card_id
      JOIN decks d ON f.deck_id = d.id
      WHERE cs.state = 0
    `;
    
    const params: any[] = [];
    
    if (deckId) {
      sql += ' AND f.deck_id = ?';
      params.push(deckId);
    }
    
    sql += ' ORDER BY f.created_at ASC';
    
    if (limit) {
      sql += ' LIMIT ?';
      params.push(limit);
    }

    const rows = await this.query(sql, params);
    return this.mapToStudyCards(rows);
  }

  private mapToStudyCards(rows: any[]): StudyCard[] {
    return rows.map(row => ({
      id: row.card_id || row.id,
      deck_id: row.deck_id,
      deck_name: row.deck_name,
      front: row.front,
      back: row.back,
      media_paths: row.media_paths ? JSON.parse(row.media_paths) : undefined,
      source_file: row.source_file,
      source_line: row.source_line,
      due: new Date(row.due_date),
      stability: row.stability,
      difficulty: row.difficulty,
      elapsed_days: row.elapsed_days,
      scheduled_days: row.scheduled_days,
      reps: row.reps,
      lapses: row.lapses,
      state: row.state,
      last_review: row.last_review ? new Date(row.last_review) : undefined,
    }));
  }

  // Review a card using FSRS
  async reviewCard(cardId: number, rating: Rating, reviewDate?: Date): Promise<boolean> {
    try {
      // Get current card state
      const cardState = await this.query(
        'SELECT * FROM card_states WHERE card_id = ?',
        [cardId]
      );

      if (cardState.length === 0) {
        throw new Error('Card state not found');
      }

      const current = cardState[0];
      
      // Create FSRS card from current state
      const fsrsCard: Card = {
        due: new Date(current.due_date),
        stability: current.stability,
        difficulty: current.difficulty,
        elapsed_days: current.elapsed_days,
        scheduled_days: current.scheduled_days,
        learning_steps: current.learning_steps || 0,
        reps: current.reps,
        lapses: current.lapses,
        state: current.state,
        last_review: current.last_review ? new Date(current.last_review) : undefined
      };

      // Convert our rating to FSRS rating
      const fsrsRating = this.convertToFSRSRating(rating);
      
      // Calculate new scheduling using FSRS
      const now = reviewDate || new Date();
      const scheduling_cards = this.fsrs.repeat(fsrsCard, now);
      
      // Get the card for the given rating
      const newCard = scheduling_cards[fsrsRating];
      const log = scheduling_cards.log;

      // Update card state
      await this.execute(`
        UPDATE card_states 
        SET due_date = ?, stability = ?, difficulty = ?, elapsed_days = ?, 
            scheduled_days = ?, learning_steps = ?, reps = ?, lapses = ?, state = ?, last_review = ?
        WHERE card_id = ?
      `, [
        newCard.due.toISOString(),
        newCard.stability,
        newCard.difficulty,
        newCard.elapsed_days,
        newCard.scheduled_days,
        newCard.learning_steps,
        newCard.reps,
        newCard.lapses,
        newCard.state,
        now.toISOString(),
        cardId
      ]);

      // Record the review
      await this.execute(`
        INSERT INTO reviews (card_id, rating, scheduled_days, actual_days, stability, difficulty, elapsed_days, lapses, reps, state)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        cardId,
        rating,
        newCard.scheduled_days,
        log.elapsed_days,
        newCard.stability,
        newCard.difficulty,
        newCard.elapsed_days,
        newCard.lapses,
        newCard.reps,
        newCard.state
      ]);

      return true;
    } catch (error) {
      console.error('Failed to review card:', error);
      return false;
    }
  }

  private convertToFSRSRating(rating: Rating): FSRSRating {
    switch (rating) {
      case Rating.Again: return Rating.Again;
      case Rating.Hard: return Rating.Hard;
      case Rating.Good: return Rating.Good;
      case Rating.Easy: return Rating.Easy;
      default: return Rating.Good;
    }
  }

  // Statistics
  async getDeckStats(deckId: number, includeChildren = false): Promise<DeckStats> {
    let sql: string;
    let params: any[] = [];
    
    if (includeChildren) {
      sql = `
        WITH RECURSIVE deck_hierarchy AS (
          SELECT id FROM decks WHERE id = ?
          UNION ALL
          SELECT d.id FROM decks d 
          JOIN deck_hierarchy dh ON d.parent_id = dh.id
        )
        SELECT 
          COUNT(*) as total_cards,
          SUM(CASE WHEN cs.state = 0 THEN 1 ELSE 0 END) as new_cards,
          SUM(CASE WHEN cs.state IN (1, 3) THEN 1 ELSE 0 END) as learning_cards,
          SUM(CASE WHEN cs.state = 2 THEN 1 ELSE 0 END) as review_cards,
          SUM(CASE WHEN cs.due_date <= datetime('now') THEN 1 ELSE 0 END) as due_cards
        FROM flashcards f
        JOIN card_states cs ON f.id = cs.card_id
        WHERE f.deck_id IN (SELECT id FROM deck_hierarchy)
      `;
      params = [deckId];
    } else {
      sql = `
        SELECT 
          COUNT(*) as total_cards,
          SUM(CASE WHEN cs.state = 0 THEN 1 ELSE 0 END) as new_cards,
          SUM(CASE WHEN cs.state IN (1, 3) THEN 1 ELSE 0 END) as learning_cards,
          SUM(CASE WHEN cs.state = 2 THEN 1 ELSE 0 END) as review_cards,
          SUM(CASE WHEN cs.due_date <= datetime('now') THEN 1 ELSE 0 END) as due_cards
        FROM flashcards f
        JOIN card_states cs ON f.id = cs.card_id
        WHERE f.deck_id = ?
      `;
      params = [deckId];
    }

    const rows = await this.query(sql, params);
    return rows[0] as DeckStats;
  }

  async getAllStats(): Promise<DeckStats> {
    const rows = await this.query(`
      SELECT 
        COUNT(*) as total_cards,
        SUM(CASE WHEN cs.state = 0 THEN 1 ELSE 0 END) as new_cards,
        SUM(CASE WHEN cs.state IN (1, 3) THEN 1 ELSE 0 END) as learning_cards,
        SUM(CASE WHEN cs.state = 2 THEN 1 ELSE 0 END) as review_cards,
        SUM(CASE WHEN cs.due_date <= datetime('now') THEN 1 ELSE 0 END) as due_cards
      FROM flashcards f
      JOIN card_states cs ON f.id = cs.card_id
    `);

    return rows[0] as DeckStats;
  }
}