import Database from 'better-sqlite3';
import { join } from 'path';
import { app } from 'electron';
import { mkdir } from 'fs/promises';

export interface Deck {
  id?: number;
  name: string;
  description?: string;
  file_path?: string; // Source markdown file
  parent_id?: number; // For hierarchical structure
  collection_path?: string; // Full path like "Languages::French::Vocabulary"
  tags?: string; // JSON array of tags
  color?: string; // Hex color for visual organization
  icon?: string; // Icon name for visual identification
  created_at: string;
  updated_at: string;
  card_count?: number;
  
  // Computed fields
  children?: Deck[];
  depth?: number;
  full_path?: string;
}

export interface Flashcard {
  id?: number;
  deck_id: number;
  front: string;
  back: string;
  media_paths?: string; // JSON array of media file paths
  source_file?: string; // Original markdown file
  source_line?: number; // Line number in source file
  created_at: string;
  updated_at: string;
}

export interface Review {
  id?: number;
  card_id: number;
  rating: number; // 1-4 (Again, Hard, Good, Easy)
  scheduled_days: number;
  actual_days: number;
  review_date: string;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  lapses: number;
  reps: number;
  state: number; // 0=New, 1=Learning, 2=Review, 3=Relearning
}

export class FlashcardDatabase {
  private db: Database.Database;
  private static instance: FlashcardDatabase;

  private constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.initialize();
  }

  public static async getInstance(): Promise<FlashcardDatabase> {
    if (!FlashcardDatabase.instance) {
      try {
        const appDataPath = app.getPath('userData');
        const dbDir = join(appDataPath, 'databases');
        
        console.log('Initializing database...');
        console.log('App data path:', appDataPath);
        console.log('Database directory:', dbDir);
        
        // Ensure database directory exists
        await mkdir(dbDir, { recursive: true });
        console.log('Database directory created/verified');
        
        const dbPath = join(dbDir, 'flashcards.db');
        console.log('Database path:', dbPath);
        
        // Small delay to ensure directory is fully available
        await new Promise(resolve => setTimeout(resolve, 100));
        
        FlashcardDatabase.instance = new FlashcardDatabase(dbPath);
        console.log('Database initialized successfully');
      } catch (error) {
        console.error('Failed to initialize database:', error);
        throw error;
      }
    }
    return FlashcardDatabase.instance;
  }

  private initialize(): void {
    // Enable WAL mode for better performance
    this.db.pragma('journal_mode = WAL');
    
    // Create tables if they don't exist
    this.createTables();
  }

  private createTables(): void {
    // Create decks table with hierarchical support
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS decks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        file_path TEXT,
        parent_id INTEGER,
        collection_path TEXT,
        tags TEXT, -- JSON array
        color TEXT,
        icon TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (parent_id) REFERENCES decks (id) ON DELETE SET NULL,
        UNIQUE(name, parent_id) -- Allow same name in different parents
      )
    `);

    // Create flashcards table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS flashcards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        deck_id INTEGER NOT NULL,
        front TEXT NOT NULL,
        back TEXT NOT NULL,
        media_paths TEXT, -- JSON array of media file paths
        source_file TEXT, -- Original markdown file
        source_line INTEGER, -- Line number in source file
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (deck_id) REFERENCES decks (id) ON DELETE CASCADE
      )
    `);

    // Create reviews table for FSRS data
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        card_id INTEGER NOT NULL,
        rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 4),
        scheduled_days INTEGER NOT NULL,
        actual_days INTEGER NOT NULL,
        review_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        stability REAL NOT NULL,
        difficulty REAL NOT NULL,
        elapsed_days INTEGER NOT NULL,
        lapses INTEGER NOT NULL DEFAULT 0,
        reps INTEGER NOT NULL DEFAULT 0,
        state INTEGER NOT NULL DEFAULT 0 CHECK(state BETWEEN 0 AND 3),
        FOREIGN KEY (card_id) REFERENCES flashcards (id) ON DELETE CASCADE
      )
    `);

    // Create card_state table to track current FSRS state of each card
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS card_states (
        card_id INTEGER PRIMARY KEY,
        due_date DATETIME NOT NULL,
        stability REAL NOT NULL DEFAULT 0,
        difficulty REAL NOT NULL DEFAULT 0,
        elapsed_days INTEGER NOT NULL DEFAULT 0,
        scheduled_days INTEGER NOT NULL DEFAULT 0,
        learning_steps INTEGER NOT NULL DEFAULT 0,
        reps INTEGER NOT NULL DEFAULT 0,
        lapses INTEGER NOT NULL DEFAULT 0,
        state INTEGER NOT NULL DEFAULT 0 CHECK(state BETWEEN 0 AND 3),
        last_review DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (card_id) REFERENCES flashcards (id) ON DELETE CASCADE
      )
    `);

    // Create indexes for performance
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_flashcards_deck_id ON flashcards (deck_id);
      CREATE INDEX IF NOT EXISTS idx_reviews_card_id ON reviews (card_id);
      CREATE INDEX IF NOT EXISTS idx_reviews_review_date ON reviews (review_date);
      CREATE INDEX IF NOT EXISTS idx_card_states_due_date ON card_states (due_date);
      CREATE INDEX IF NOT EXISTS idx_card_states_state ON card_states (state);
      CREATE INDEX IF NOT EXISTS idx_decks_file_path ON decks (file_path);
      CREATE INDEX IF NOT EXISTS idx_decks_parent_id ON decks (parent_id);
      CREATE INDEX IF NOT EXISTS idx_decks_collection_path ON decks (collection_path);
      CREATE INDEX IF NOT EXISTS idx_flashcards_source_file ON flashcards (source_file);
    `);

    // Create trigger to update updated_at timestamps
    this.db.exec(`
      CREATE TRIGGER IF NOT EXISTS update_decks_updated_at
        AFTER UPDATE ON decks
        FOR EACH ROW
      BEGIN
        UPDATE decks SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
      END;
    `);

    this.db.exec(`
      CREATE TRIGGER IF NOT EXISTS update_flashcards_updated_at
        AFTER UPDATE ON flashcards
        FOR EACH ROW
      BEGIN
        UPDATE flashcards SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
      END;
    `);

    this.db.exec(`
      CREATE TRIGGER IF NOT EXISTS update_card_states_updated_at
        AFTER UPDATE ON card_states
        FOR EACH ROW
      BEGIN
        UPDATE card_states SET updated_at = CURRENT_TIMESTAMP WHERE card_id = NEW.card_id;
      END;
    `);
  }

  // Deck operations
  public createDeck(deck: Omit<Deck, 'id' | 'created_at' | 'updated_at'>): number {
    const stmt = this.db.prepare(`
      INSERT INTO decks (name, description, file_path, parent_id, collection_path, tags, color, icon)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    // Auto-generate collection path if not provided
    let collectionPath = deck.collection_path;
    if (!collectionPath && deck.parent_id) {
      const parent = this.getDeck(deck.parent_id);
      if (parent) {
        collectionPath = parent.collection_path ? `${parent.collection_path}::${deck.name}` : deck.name;
      }
    } else if (!collectionPath) {
      collectionPath = deck.name;
    }
    
    const result = stmt.run(
      deck.name,
      deck.description || null,
      deck.file_path || null,
      deck.parent_id || null,
      collectionPath,
      deck.tags || null,
      deck.color || null,
      deck.icon || null
    );
    return result.lastInsertRowid as number;
  }

  public getDeck(id: number): Deck | undefined {
    const stmt = this.db.prepare(`
      SELECT d.*, COUNT(f.id) as card_count
      FROM decks d
      LEFT JOIN flashcards f ON d.id = f.deck_id
      WHERE d.id = ?
      GROUP BY d.id
    `);
    return stmt.get(id) as Deck | undefined;
  }

  public getAllDecks(): Deck[] {
    const stmt = this.db.prepare(`
      SELECT d.*, COUNT(f.id) as card_count
      FROM decks d
      LEFT JOIN flashcards f ON d.id = f.deck_id
      GROUP BY d.id
      ORDER BY d.collection_path, d.name
    `);
    return stmt.all() as Deck[];
  }

  public getDeckHierarchy(): Deck[] {
    // Get all decks with their card counts
    const allDecks = this.getAllDecks();
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

  public getChildDecks(parentId: number): Deck[] {
    const stmt = this.db.prepare(`
      SELECT d.*, COUNT(f.id) as card_count
      FROM decks d
      LEFT JOIN flashcards f ON d.id = f.deck_id
      WHERE d.parent_id = ?
      GROUP BY d.id
      ORDER BY d.name
    `);
    return stmt.all(parentId) as Deck[];
  }

  public getDecksInCollection(collectionPath: string): Deck[] {
    const stmt = this.db.prepare(`
      SELECT d.*, COUNT(f.id) as card_count
      FROM decks d
      LEFT JOIN flashcards f ON d.id = f.deck_id
      WHERE d.collection_path LIKE ?
      GROUP BY d.id
      ORDER BY d.collection_path, d.name
    `);
    return stmt.all(`${collectionPath}%`) as Deck[];
  }

  public updateDeck(id: number, updates: Partial<Omit<Deck, 'id' | 'created_at' | 'updated_at'>>): void {
    const fields = Object.keys(updates);
    const values = Object.values(updates);
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    
    const stmt = this.db.prepare(`UPDATE decks SET ${setClause} WHERE id = ?`);
    stmt.run(...values, id);
  }

  public deleteDeck(id: number): void {
    const stmt = this.db.prepare('DELETE FROM decks WHERE id = ?');
    stmt.run(id);
  }

  // Flashcard operations
  public createFlashcard(card: Omit<Flashcard, 'id' | 'created_at' | 'updated_at'>): number {
    const stmt = this.db.prepare(`
      INSERT INTO flashcards (deck_id, front, back, media_paths, source_file, source_line)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      card.deck_id,
      card.front,
      card.back,
      card.media_paths || null,
      card.source_file || null,
      card.source_line || null
    );
    const cardId = result.lastInsertRowid as number;

    // Initialize card state for FSRS
    this.initializeCardState(cardId);
    
    return cardId;
  }

  public getFlashcard(id: number): Flashcard | undefined {
    const stmt = this.db.prepare('SELECT * FROM flashcards WHERE id = ?');
    return stmt.get(id) as Flashcard | undefined;
  }

  public getFlashcardsByDeck(deckId: number): Flashcard[] {
    const stmt = this.db.prepare('SELECT * FROM flashcards WHERE deck_id = ? ORDER BY created_at ASC');
    return stmt.all(deckId) as Flashcard[];
  }

  public updateFlashcard(id: number, updates: Partial<Omit<Flashcard, 'id' | 'created_at' | 'updated_at'>>): void {
    const fields = Object.keys(updates);
    const values = Object.values(updates);
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    
    const stmt = this.db.prepare(`UPDATE flashcards SET ${setClause} WHERE id = ?`);
    stmt.run(...values, id);
  }

  public deleteFlashcard(id: number): void {
    const stmt = this.db.prepare('DELETE FROM flashcards WHERE id = ?');
    stmt.run(id);
  }

  // Card state operations for FSRS
  private initializeCardState(cardId: number): void {
    const stmt = this.db.prepare(`
      INSERT INTO card_states (card_id, due_date, stability, difficulty, elapsed_days, scheduled_days, learning_steps, reps, lapses, state)
      VALUES (?, datetime('now'), 0, 0, 0, 0, 0, 0, 0, 0)
    `);
    stmt.run(cardId);
  }

  public getCardState(cardId: number) {
    const stmt = this.db.prepare('SELECT * FROM card_states WHERE card_id = ?');
    return stmt.get(cardId);
  }

  public updateCardState(cardId: number, state: any): void {
    const stmt = this.db.prepare(`
      UPDATE card_states 
      SET due_date = ?, stability = ?, difficulty = ?, elapsed_days = ?, 
          scheduled_days = ?, learning_steps = ?, reps = ?, lapses = ?, state = ?, last_review = ?
      WHERE card_id = ?
    `);
    stmt.run(
      state.due.toISOString(),
      state.stability,
      state.difficulty,
      state.elapsed_days,
      state.scheduled_days,
      state.learning_steps,
      state.reps,
      state.lapses,
      state.state,
      new Date().toISOString(),
      cardId
    );
  }

  // Review operations
  public addReview(review: Omit<Review, 'id' | 'review_date'>): number {
    const stmt = this.db.prepare(`
      INSERT INTO reviews (card_id, rating, scheduled_days, actual_days, stability, difficulty, elapsed_days, lapses, reps, state)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      review.card_id,
      review.rating,
      review.scheduled_days,
      review.actual_days,
      review.stability,
      review.difficulty,
      review.elapsed_days,
      review.lapses,
      review.reps,
      review.state
    );
    return result.lastInsertRowid as number;
  }

  public getReviewHistory(cardId: number): Review[] {
    const stmt = this.db.prepare('SELECT * FROM reviews WHERE card_id = ? ORDER BY review_date ASC');
    return stmt.all(cardId) as Review[];
  }

  // Study session queries
  public getDueCards(limit?: number): any[] {
    const stmt = this.db.prepare(`
      SELECT f.*, cs.*, d.name as deck_name
      FROM flashcards f
      JOIN card_states cs ON f.id = cs.card_id
      JOIN decks d ON f.deck_id = d.id
      WHERE cs.due_date <= datetime('now')
      ORDER BY cs.due_date ASC
      ${limit ? 'LIMIT ?' : ''}
    `);
    return limit ? stmt.all(limit) : stmt.all();
  }

  public getNewCards(limit?: number): any[] {
    const stmt = this.db.prepare(`
      SELECT f.*, cs.*, d.name as deck_name
      FROM flashcards f
      JOIN card_states cs ON f.id = cs.card_id
      JOIN decks d ON f.deck_id = d.id
      WHERE cs.state = 0
      ORDER BY f.created_at ASC
      ${limit ? 'LIMIT ?' : ''}
    `);
    return limit ? stmt.all(limit) : stmt.all();
  }

  // Statistics
  public getDeckStats(deckId: number) {
    const stmt = this.db.prepare(`
      SELECT 
        COUNT(*) as total_cards,
        SUM(CASE WHEN cs.state = 0 THEN 1 ELSE 0 END) as new_cards,
        SUM(CASE WHEN cs.state IN (1, 3) THEN 1 ELSE 0 END) as learning_cards,
        SUM(CASE WHEN cs.state = 2 THEN 1 ELSE 0 END) as review_cards,
        SUM(CASE WHEN cs.due_date <= datetime('now') THEN 1 ELSE 0 END) as due_cards
      FROM flashcards f
      JOIN card_states cs ON f.id = cs.card_id
      WHERE f.deck_id = ?
    `);
    return stmt.get(deckId);
  }

  // Generic query methods for the IPC interface
  public query(sql: string, params?: any[]): any[] {
    const stmt = this.db.prepare(sql);
    return params ? stmt.all(...params) : stmt.all();
  }

  public execute(sql: string, params?: any[]): void {
    const stmt = this.db.prepare(sql);
    params ? stmt.run(...params) : stmt.run();
  }

  public transaction(queries: Array<{ sql: string; params?: any[] }>): void {
    const transaction = this.db.transaction(() => {
      for (const query of queries) {
        const stmt = this.db.prepare(query.sql);
        query.params ? stmt.run(...query.params) : stmt.run();
      }
    });
    transaction();
  }

  // Auto-organization from file system
  public createDeckFromFilePath(filePath: string, libraryPath: string): number | null {
    try {
      // Extract relative path from library
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
        const existingCollection = this.db.prepare(`
          SELECT id FROM decks WHERE collection_path = ? AND file_path IS NULL
        `).get(collectionPath) as { id: number } | undefined;
        
        if (existingCollection) {
          parentId = existingCollection.id;
        } else {
          // Create collection (folder-based deck with no file_path)
          parentId = this.createDeck({
            name: part,
            description: `Auto-generated collection from folder: ${part}`,
            parent_id: parentId,
            collection_path: collectionPath,
            icon: 'FolderIcon',
            color: this.generateColorFromString(part)
          });
        }
      }
      
      // Create the actual deck
      const finalCollectionPath = collectionPath ? `${collectionPath}::${fileName}` : fileName;
      const deckId = this.createDeck({
        name: fileName,
        description: `Generated from file: ${relativePath}`,
        file_path: filePath,
        parent_id: parentId,
        collection_path: finalCollectionPath,
        icon: 'DocumentTextIcon',
        color: this.generateColorFromString(fileName)
      });
      
      return deckId;
    } catch (error) {
      console.error('Failed to create deck from file path:', error);
      return null;
    }
  }
  
  private generateColorFromString(str: string): string {
    // Generate a consistent color from string hash
    const colors = [
      '#3B82F6', // Blue
      '#10B981', // Emerald
      '#F59E0B', // Amber
      '#EF4444', // Red
      '#8B5CF6', // Violet
      '#06B6D4', // Cyan
      '#84CC16', // Lime
      '#F97316', // Orange
      '#EC4899', // Pink
      '#6366F1'  // Indigo
    ];
    
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }

  // Bulk operations for hierarchical study
  public getAllCardsInHierarchy(deckId: number): any[] {
    const stmt = this.db.prepare(`
      WITH RECURSIVE deck_hierarchy AS (
        SELECT id FROM decks WHERE id = ?
        UNION ALL
        SELECT d.id FROM decks d 
        JOIN deck_hierarchy dh ON d.parent_id = dh.id
      )
      SELECT f.*, cs.*, d.name as deck_name, d.collection_path
      FROM flashcards f
      JOIN card_states cs ON f.id = cs.card_id
      JOIN decks d ON f.deck_id = d.id
      WHERE f.deck_id IN (SELECT id FROM deck_hierarchy)
      ORDER BY d.collection_path, f.created_at
    `);
    return stmt.all(deckId);
  }

  public getDueCardsInHierarchy(deckId: number): any[] {
    const stmt = this.db.prepare(`
      WITH RECURSIVE deck_hierarchy AS (
        SELECT id FROM decks WHERE id = ?
        UNION ALL
        SELECT d.id FROM decks d 
        JOIN deck_hierarchy dh ON d.parent_id = dh.id
      )
      SELECT f.*, cs.*, d.name as deck_name, d.collection_path
      FROM flashcards f
      JOIN card_states cs ON f.id = cs.card_id
      JOIN decks d ON f.deck_id = d.id
      WHERE f.deck_id IN (SELECT id FROM deck_hierarchy)
        AND cs.due_date <= datetime('now')
      ORDER BY cs.due_date ASC
    `);
    return stmt.all(deckId);
  }

  public getHierarchyStats(deckId: number) {
    const stmt = this.db.prepare(`
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
    `);
    return stmt.get(deckId);
  }

  public close(): void {
    this.db.close();
  }
}