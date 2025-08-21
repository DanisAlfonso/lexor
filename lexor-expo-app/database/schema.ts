import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

// Sync status for offline-first architecture
export const syncStatuses = ['pending', 'synced', 'conflict', 'error'] as const;
export type SyncStatus = typeof syncStatuses[number];

export const documents = sqliteTable('documents', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  filePath: text('file_path').notNull(),
  fileType: text('file_type', { enum: ['epub', 'md', 'pdf'] }).notNull(),
  fileSize: integer('file_size'),
  language: text('language'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  lastOpened: integer('last_opened', { mode: 'timestamp' }),
  readingProgress: real('reading_progress').notNull().default(0),
  totalPages: integer('total_pages'),
  currentPage: integer('current_page').notNull().default(0),
  // Sync fields for offline-first architecture
  syncStatus: text('sync_status', { enum: syncStatuses }).notNull().default('pending'),
  lastModified: integer('last_modified', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  version: integer('version').notNull().default(1),
});

export const flashcards = sqliteTable('flashcards', {
  id: text('id').primaryKey(),
  documentId: text('document_id').references(() => documents.id, { onDelete: 'cascade' }),
  frontText: text('front_text').notNull(),
  backText: text('back_text').notNull(),
  context: text('context'),
  sourceLocation: text('source_location'),
  difficulty: integer('difficulty').notNull().default(0),
  nextReview: integer('next_review', { mode: 'timestamp' }),
  reviewCount: integer('review_count').notNull().default(0),
  correctCount: integer('correct_count').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  // Sync fields
  syncStatus: text('sync_status', { enum: syncStatuses }).notNull().default('pending'),
  lastModified: integer('last_modified', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  version: integer('version').notNull().default(1),
});

export const readingSessions = sqliteTable('reading_sessions', {
  id: text('id').primaryKey(),
  documentId: text('document_id').references(() => documents.id, { onDelete: 'cascade' }),
  startTime: integer('start_time', { mode: 'timestamp' }).notNull(),
  endTime: integer('end_time', { mode: 'timestamp' }),
  pagesRead: integer('pages_read').notNull().default(0),
  wordsLearned: integer('words_learned').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  // Sync fields
  syncStatus: text('sync_status', { enum: syncStatuses }).notNull().default('pending'),
  lastModified: integer('last_modified', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  version: integer('version').notNull().default(1),
});

export const annotations = sqliteTable('annotations', {
  id: text('id').primaryKey(),
  documentId: text('document_id').references(() => documents.id, { onDelete: 'cascade' }),
  type: text('type', { enum: ['bookmark', 'highlight', 'note'] }).notNull(),
  content: text('content'),
  location: text('location').notNull(),
  color: text('color'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  // Sync fields
  syncStatus: text('sync_status', { enum: syncStatuses }).notNull().default('pending'),
  lastModified: integer('last_modified', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  version: integer('version').notNull().default(1),
});

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  lastModified: integer('last_modified', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

// Schema migrations table
export const schemaMigrations = sqliteTable('schema_migrations', {
  version: text('version').primaryKey(),
  appliedAt: integer('applied_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

export type Document = typeof documents.$inferSelect;
export type InsertDocument = typeof documents.$inferInsert;
export type Flashcard = typeof flashcards.$inferSelect;
export type InsertFlashcard = typeof flashcards.$inferInsert;
export type ReadingSession = typeof readingSessions.$inferSelect;
export type InsertReadingSession = typeof readingSessions.$inferInsert;
export type Annotation = typeof annotations.$inferSelect;
export type InsertAnnotation = typeof annotations.$inferInsert;
export type Setting = typeof settings.$inferSelect;
export type InsertSetting = typeof settings.$inferInsert;
export type SchemaMigration = typeof schemaMigrations.$inferSelect;