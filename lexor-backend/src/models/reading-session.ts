import { pgTable, uuid, timestamp, integer } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { users } from './user';
import { documents } from './document';

export const readingSessions = pgTable('reading_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  documentId: uuid('document_id').notNull().references(() => documents.id, { onDelete: 'cascade' }),
  startTime: timestamp('start_time').notNull(),
  endTime: timestamp('end_time'),
  pagesRead: integer('pages_read').default(0).notNull(),
  wordsLearned: integer('words_learned').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  version: integer('version').default(1).notNull(),
});

// Zod schemas
export const insertReadingSessionSchema = createInsertSchema(readingSessions, {
  startTime: z.string().datetime().or(z.date()),
  endTime: z.string().datetime().or(z.date()).optional(),
  pagesRead: z.number().int().min(0).optional(),
  wordsLearned: z.number().int().min(0).optional(),
});

export const selectReadingSessionSchema = createSelectSchema(readingSessions);

export const updateReadingSessionSchema = insertReadingSessionSchema.partial().omit({
  id: true,
  userId: true,
  documentId: true,
  createdAt: true,
  version: true,
});

// Type exports
export type ReadingSession = typeof readingSessions.$inferSelect;
export type InsertReadingSession = typeof readingSessions.$inferInsert;
export type UpdateReadingSession = z.infer<typeof updateReadingSessionSchema>;