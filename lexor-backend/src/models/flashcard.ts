import { pgTable, uuid, varchar, timestamp, text, integer } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { users } from './user';
import { documents } from './document';

export const flashcards = pgTable('flashcards', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  documentId: uuid('document_id').references(() => documents.id, { onDelete: 'cascade' }),
  frontText: text('front_text').notNull(),
  backText: text('back_text').notNull(),
  context: text('context'),
  sourceLocation: text('source_location'),
  difficulty: integer('difficulty').default(0).notNull(),
  nextReview: timestamp('next_review'),
  reviewCount: integer('review_count').default(0).notNull(),
  correctCount: integer('correct_count').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  version: integer('version').default(1).notNull(),
});

// Zod schemas
export const insertFlashcardSchema = createInsertSchema(flashcards, {
  frontText: z.string().min(1),
  backText: z.string().min(1),
  context: z.string().optional(),
  sourceLocation: z.string().optional(),
  difficulty: z.number().int().min(0).max(10).optional(),
  reviewCount: z.number().int().min(0).optional(),
  correctCount: z.number().int().min(0).optional(),
});

export const selectFlashcardSchema = createSelectSchema(flashcards);

export const updateFlashcardSchema = insertFlashcardSchema.partial().omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
  version: true,
});

export const reviewFlashcardSchema = z.object({
  correct: z.boolean(),
  difficulty: z.number().int().min(0).max(10).optional(),
});

// Type exports
export type Flashcard = typeof flashcards.$inferSelect;
export type InsertFlashcard = typeof flashcards.$inferInsert;
export type UpdateFlashcard = z.infer<typeof updateFlashcardSchema>;
export type ReviewFlashcard = z.infer<typeof reviewFlashcardSchema>;