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

  // Synchronize flashcards from markdown (replaces import)
  async syncFromMarkdown(
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
        'SELECT id FROM decks WHERE name = ? OR file_path = ?',
        [finalDeckName, filePath]
      );

      if (existingDecks.length > 0) {
        deckId = existingDecks[0].id;
      } else {
        // Use database's folder-aware deck creation
        try {
          // Determine the library path from file path
          let libraryPath = '/Users/danny/Documents/Lexor Library'; // default fallback
          
          if (filePath.includes('/Documents/Lexor Library/')) {
            const libraryIndex = filePath.indexOf('/Documents/Lexor Library/');
            libraryPath = filePath.substring(0, libraryIndex + '/Documents/Lexor Library'.length);
          } else if (filePath.includes('/Lexor Library/')) {
            const libraryIndex = filePath.indexOf('/Lexor Library/');
            libraryPath = filePath.substring(0, libraryIndex + '/Lexor Library'.length);
          }
          
          console.log('Creating deck from file path:', filePath, 'Library path:', libraryPath);
          const hierarchyDeckId = await this.createDeckFromFilePath(filePath, libraryPath);
          console.log('Hierarchy deck ID result:', hierarchyDeckId);
          if (hierarchyDeckId) {
            deckId = hierarchyDeckId;
          } else {
            // Fallback to simple creation
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
        } catch (error) {
          return {
            success: false,
            imported_count: 0,
            errors: [`Failed to create hierarchical deck: ${error instanceof Error ? error.message : 'Unknown error'}`]
          };
        }
      }

      // SYNCHRONIZATION LOGIC - Replace all cards from this file
      let errors: string[] = [];
      let created = 0;
      let updated = 0;
      let deleted = 0;

      // Get existing cards for this specific file
      const existingCards = await this.query(
        'SELECT id, front, back, source_line FROM flashcards WHERE deck_id = ? AND source_file = ?',
        [deckId, filePath]
      );

      // Create content-based matching (order-independent)
      const existingCardMap = new Map();
      const existingCardsByContent = new Map();
      
      existingCards.forEach(card => {
        // Primary key: content-based (for exact matches)
        const contentKey = this.createContentKey(card.front, card.back);
        existingCardsByContent.set(contentKey, card);
        
        // Secondary key: line-based (for backwards compatibility)
        const lineKey = `line:${card.source_line}`;
        existingCardMap.set(lineKey, card);
      });

      // Track which cards have been matched to avoid double-matching
      const matchedExistingCards = new Set();
      const matchedNewCards = new Set();

      // PHASE 1: Exact content matches (highest priority)
      for (let i = 0; i < parsedCards.length; i++) {
        if (matchedNewCards.has(i)) continue;
        
        const parsedCard = parsedCards[i];
        const validation = FlashcardParser.validateCard(parsedCard);
        if (!validation.valid) {
          errors.push(`Line ${parsedCard.source_line}: ${validation.errors.join(', ')}`);
          matchedNewCards.add(i);
          continue;
        }

        const contentKey = this.createContentKey(parsedCard.front, parsedCard.back);
        const exactMatch = existingCardsByContent.get(contentKey);

        if (exactMatch && !matchedExistingCards.has(exactMatch.id)) {
          // Exact match found - just update line number
          await this.updateFlashcard(exactMatch.id, {
            source_line: parsedCard.source_line,
            media_paths: parsedCard.media_paths?.join(',') // Update media paths if changed
          });
          
          matchedExistingCards.add(exactMatch.id);
          matchedNewCards.add(i);
        }
      }

      // PHASE 2: Fuzzy matching for edited content (medium priority)
      for (let i = 0; i < parsedCards.length; i++) {
        if (matchedNewCards.has(i)) continue;
        
        const parsedCard = parsedCards[i];
        const validation = FlashcardParser.validateCard(parsedCard);
        if (!validation.valid) continue;

        const bestMatch = this.findBestMatch(
          parsedCard, 
          existingCards.filter(c => !matchedExistingCards.has(c.id)),
          matchedExistingCards
        );

        if (bestMatch) {
          // Fuzzy match found - update content
          const success = await this.updateFlashcard(bestMatch.id, {
            front: parsedCard.front,
            back: parsedCard.back,
            media_paths: parsedCard.media_paths?.join(','),
            source_line: parsedCard.source_line
          });
          
          if (success) {
            updated++;
            matchedExistingCards.add(bestMatch.id);
            matchedNewCards.add(i);
          } else {
            errors.push(`Line ${parsedCard.source_line}: Failed to update flashcard`);
          }
        }
      }

      // PHASE 3: Create new cards (lowest priority)
      for (let i = 0; i < parsedCards.length; i++) {
        if (matchedNewCards.has(i)) continue;
        
        const parsedCard = parsedCards[i];
        const validation = FlashcardParser.validateCard(parsedCard);
        if (!validation.valid) continue;

        // Create new card
        const cardId = await this.createFlashcard({
          deck_id: deckId,
          front: parsedCard.front,
          back: parsedCard.back,
          media_paths: parsedCard.media_paths?.join(','),
          source_file: filePath,
          source_line: parsedCard.source_line
        });

        if (cardId) {
          created++;
          matchedNewCards.add(i);
        } else {
          errors.push(`Line ${parsedCard.source_line}: Failed to create flashcard`);
        }
      }

      // PHASE 4: Delete unmatched existing cards
      for (const existingCard of existingCards) {
        if (!matchedExistingCards.has(existingCard.id)) {
          const success = await this.deleteFlashcard(existingCard.id);
          if (success) {
            deleted++;
          } else {
            errors.push(`Failed to delete removed card: ${existingCard.front}`);
          }
        }
      }

      // Prepare result message
      const messages: string[] = [];
      if (created === 0 && updated === 0 && deleted === 0) {
        messages.push('All flashcards are already synchronized');
      } else {
        const changes = [];
        if (created > 0) changes.push(`${created} created`);
        if (updated > 0) changes.push(`${updated} updated`);
        if (deleted > 0) changes.push(`${deleted} deleted`);
        messages.push(`Synchronized: ${changes.join(', ')}`);
      }

      return {
        success: true,
        imported_count: created, // Only count newly created cards
        errors: errors.length > 0 ? errors : messages,
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

  // Keep importFromMarkdown for backward compatibility - now calls syncFromMarkdown
  async importFromMarkdown(
    filePath: string, 
    content: string, 
    deckName?: string
  ): Promise<ImportCardsResponse> {
    return this.syncFromMarkdown(filePath, content, deckName);
  }

  private extractDeckNameFromPath(filePath: string): string {
    const fileName = filePath.split('/').pop() || 'Unknown';
    return fileName.replace(/\.(md|markdown)$/i, '');
  }

  // Create a content-based key for matching cards
  private createContentKey(front: string, back: string): string {
    // Normalize content: trim, lowercase, remove extra spaces
    const normalizedFront = front.trim().toLowerCase().replace(/\s+/g, ' ');
    const normalizedBack = back.trim().toLowerCase().replace(/\s+/g, ' ');
    return `${normalizedFront}|||${normalizedBack}`;
  }

  // Calculate similarity between two strings (simple implementation)
  private calculateSimilarity(str1: string, str2: string): number {
    const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');
    const a = normalize(str1);
    const b = normalize(str2);
    
    if (a === b) return 1.0;
    
    // Simple word-based similarity
    const wordsA = a.split(' ');
    const wordsB = b.split(' ');
    
    const intersection = wordsA.filter(word => wordsB.includes(word));
    const union = [...new Set([...wordsA, ...wordsB])];
    
    return union.length > 0 ? intersection.length / union.length : 0;
  }

  // Find best matching existing card for a new card
  private findBestMatch(parsedCard: any, existingCards: any[], matchedCards: Set<number>) {
    let bestMatch = null;
    let bestScore = 0;
    const SIMILARITY_THRESHOLD = 0.7; // 70% similarity required
    
    for (const existingCard of existingCards) {
      if (matchedCards.has(existingCard.id)) continue;
      
      // Calculate similarity for front text
      const frontSimilarity = this.calculateSimilarity(parsedCard.front, existingCard.front);
      const backSimilarity = this.calculateSimilarity(parsedCard.back, existingCard.back);
      
      // Combined score (weighted towards front text which is usually more stable)
      const combinedScore = (frontSimilarity * 0.7) + (backSimilarity * 0.3);
      
      if (combinedScore > bestScore && combinedScore >= SIMILARITY_THRESHOLD) {
        bestScore = combinedScore;
        bestMatch = existingCard;
      }
    }
    
    return bestMatch;
  }

  // Wrapper for database's folder-aware deck creation
  private async createDeckFromFilePath(filePath: string, libraryPath: string): Promise<number | null> {
    try {
      // Call the database method directly via IPC
      const deckId = await window.electronAPI.database.createDeckFromFilePath(filePath, libraryPath);
      return deckId;
    } catch (error) {
      console.error('Error creating deck from file path:', error);
      
      // Manual implementation as fallback
      const relativePath = filePath.replace(libraryPath, '').replace(/^\//, '');
      const pathParts = relativePath.split('/');
      const fileName = pathParts.pop()?.replace(/\.(md|markdown)$/i, '') || 'Unknown';
      
      let parentId: number | undefined;
      let collectionPath = '';
      
      // Create parent collections if they don't exist
      for (const part of pathParts) {
        if (!part) continue;
        
        collectionPath = collectionPath ? `${collectionPath}::${part}` : part;
        
        // Check if collection already exists
        const existingCollections = await this.query(
          'SELECT id FROM decks WHERE collection_path = ? AND file_path IS NULL',
          [collectionPath]
        );
        
        if (existingCollections.length > 0) {
          parentId = existingCollections[0].id;
        } else {
          // Create collection (folder-based deck with no file_path)
          const createResult = await this.createDeck(
            part,
            `Auto-generated collection from folder: ${part}`,
            undefined, // no file_path for collections
            parentId,
            {
              tags: [],
              color: this.generateColorFromString(part),
              icon: 'FolderIcon'
            }
          );
          if (createResult.success && createResult.deck_id) {
            parentId = createResult.deck_id;
            // Update collection_path for the created collection
            await this.execute(
              'UPDATE decks SET collection_path = ? WHERE id = ?',
              [collectionPath, parentId]
            );
          }
        }
      }
      
      // Create the actual deck
      const finalCollectionPath = collectionPath ? `${collectionPath}::${fileName}` : fileName;
      const createResult = await this.createDeck(
        fileName,
        `Generated from file: ${relativePath}`,
        filePath,
        parentId,
        {
          tags: [],
          color: this.generateColorFromString(fileName),
          icon: 'DocumentTextIcon'
        }
      );
      
      if (createResult.success && createResult.deck_id) {
        // Update collection_path
        await this.execute(
          'UPDATE decks SET collection_path = ? WHERE id = ?',
          [finalCollectionPath, createResult.deck_id]
        );
        return createResult.deck_id;
      }
      
      return null;
    }
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

  // Auto-discovery system for flashcard files
  async discoverAndSyncLibrary(libraryPath: string): Promise<{
    success: boolean;
    filesProcessed: number;
    decksCreated: number;
    cardsImported: number;
    orphanedDecks: Array<{id: number, name: string, filePath: string}>;
    errors: string[];
  }> {
    try {
      console.log('Starting library discovery for:', libraryPath);
      
      // Get all markdown files in the library
      const markdownFiles = await this.scanForMarkdownFiles(libraryPath);
      console.log(`Found ${markdownFiles.length} markdown files`);
      
      let filesProcessed = 0;
      let decksCreated = 0;
      let totalCardsImported = 0;
      const errors: string[] = [];
      
      // Process each file
      for (const filePath of markdownFiles) {
        try {
          // Read file content
          const content = await this.readFile(filePath);
          
          // Check if file contains flashcards
          if (this.containsFlashcards(content)) {
            console.log(`Processing flashcard file: ${filePath}`);
            
            const result = await this.syncFromMarkdown(filePath, content);
            filesProcessed++;
            
            if (result.success) {
              if (result.imported_count > 0) {
                decksCreated++;
                totalCardsImported += result.imported_count;
              }
            } else {
              if (result.errors) {
                errors.push(`${filePath}: ${result.errors.join(', ')}`);
              }
            }
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          errors.push(`${filePath}: ${errorMsg}`);
        }
      }
      
      // Check for orphaned decks (decks with missing source files)
      const orphanedDecks = await this.findOrphanedDecks(libraryPath);
      
      console.log('Discovery complete:', {
        filesProcessed,
        decksCreated,
        totalCardsImported,
        orphaned: orphanedDecks.length,
        errors: errors.length
      });
      
      return {
        success: true,
        filesProcessed,
        decksCreated,
        cardsImported: totalCardsImported,
        orphanedDecks,
        errors
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Discovery failed';
      return {
        success: false,
        filesProcessed: 0,
        decksCreated: 0,
        cardsImported: 0,
        orphanedDecks: [],
        errors: [errorMsg]
      };
    }
  }

  // Scan directory for markdown files using IPC
  private async scanForMarkdownFiles(directoryPath: string): Promise<string[]> {
    try {
      // Use IPC to get file list from main process
      return await window.electronAPI.file.scanDirectory(directoryPath, ['.md', '.markdown']);
    } catch (error) {
      console.error('Failed to scan directory:', error);
      return [];
    }
  }

  // Read file content using IPC
  private async readFile(filePath: string): Promise<string> {
    try {
      return await window.electronAPI.file.readFile(filePath);
    } catch (error) {
      console.error(`Failed to read file ${filePath}:`, error);
      return '';
    }
  }

  // Check if content contains flashcard syntax
  private containsFlashcards(content: string): boolean {
    // Look for flashcard patterns: ## Flash: or ### Flash:
    const flashcardPattern = /^#{2,3}\s*Flash:\s*.+$/m;
    return flashcardPattern.test(content);
  }

  // Find decks whose source files no longer exist
  private async findOrphanedDecks(libraryPath: string): Promise<Array<{id: number, name: string, filePath: string}>> {
    try {
      // Get all decks that have file_path (not collections)
      const decksWithFiles = await this.query(`
        SELECT id, name, file_path FROM decks 
        WHERE file_path IS NOT NULL
      `);
      
      const orphaned: Array<{id: number, name: string, filePath: string}> = [];
      
      // Check each deck's source file
      for (const deck of decksWithFiles) {
        try {
          // Try to read the file - if it fails, it's orphaned
          await this.readFile(deck.file_path);
          
          // Also verify it's still in the library path
          if (!deck.file_path.startsWith(libraryPath)) {
            orphaned.push({
              id: deck.id,
              name: deck.name,
              filePath: deck.file_path
            });
          }
        } catch (error) {
          // File doesn't exist or can't be read
          orphaned.push({
            id: deck.id,
            name: deck.name,
            filePath: deck.file_path
          });
        }
      }
      
      return orphaned;
    } catch (error) {
      console.error('Error finding orphaned decks:', error);
      return [];
    }
  }

  // Remove orphaned decks from database
  async removeOrphanedDecks(orphanedIds: number[]): Promise<{success: boolean, removed: number, errors: string[]}> {
    try {
      const errors: string[] = [];
      let removed = 0;
      
      for (const deckId of orphanedIds) {
        try {
          await this.execute('DELETE FROM decks WHERE id = ?', [deckId]);
          removed++;
        } catch (error) {
          errors.push(`Failed to remove deck ${deckId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
      
      return { success: true, removed, errors };
    } catch (error) {
      return { 
        success: false, 
        removed: 0, 
        errors: [error instanceof Error ? error.message : 'Failed to remove orphaned decks'] 
      };
    }
  }

  // Cleanup method to remove duplicate flashcards
  async removeDuplicateCards(): Promise<{ removed: number, errors: string[] }> {
    try {
      let errors: string[] = [];
      let totalRemoved = 0;

      // Get all decks with their file paths
      const decks = await this.query('SELECT id, name, file_path FROM decks');
      
      for (const deck of decks) {
        console.log(`Cleaning deck: ${deck.name} (ID: ${deck.id})`);
        
        // Get all cards in this deck
        const allCards = await this.query(`
          SELECT id, front, back, source_line, created_at
          FROM flashcards 
          WHERE deck_id = ?
          ORDER BY created_at ASC
        `, [deck.id]);
        
        console.log(`Found ${allCards.length} cards in deck ${deck.name}`);
        
        // Group cards by content (ignore source_line differences for now)
        const cardGroups = new Map();
        
        for (const card of allCards) {
          // Create a key based on content only
          const contentKey = `${card.front.trim().toLowerCase()}|||${card.back.trim().toLowerCase()}`;
          
          if (!cardGroups.has(contentKey)) {
            cardGroups.set(contentKey, []);
          }
          cardGroups.get(contentKey).push(card);
        }
        
        // Remove duplicates - keep the oldest card (first created)
        for (const [contentKey, cards] of cardGroups) {
          if (cards.length > 1) {
            console.log(`Found ${cards.length} duplicates for content: ${contentKey.split('|||')[0]}`);
            
            // Sort by creation date and keep the first one
            cards.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
            const cardsToRemove = cards.slice(1); // Remove all except the first
            
            for (const card of cardsToRemove) {
              console.log(`Removing duplicate card ID: ${card.id}`);
              await this.execute('DELETE FROM flashcards WHERE id = ?', [card.id]);
              totalRemoved++;
            }
          }
        }
      }

      console.log(`Total removed: ${totalRemoved} duplicate cards`);
      return { removed: totalRemoved, errors };
    } catch (error) {
      console.error('Error in removeDuplicateCards:', error);
      return { 
        removed: 0, 
        errors: [error instanceof Error ? error.message : 'Failed to remove duplicates'] 
      };
    }
  }

  // Method to completely reset flashcard database and reimport from files
  async resetAndReimportFromDirectory(directoryPath: string): Promise<{ success: boolean, message: string }> {
    try {
      // Clear all flashcards and decks
      await this.execute('DELETE FROM reviews');
      await this.execute('DELETE FROM card_states');
      await this.execute('DELETE FROM flashcards');
      await this.execute('DELETE FROM decks');

      // TODO: Scan directory for markdown files and reimport
      // This would need to be implemented with file system access
      
      return { success: true, message: 'Database reset successfully' };
    } catch (error) {
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to reset database' 
      };
    }
  }
}