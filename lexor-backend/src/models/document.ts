import { pgTable, uuid, varchar, timestamp, text, bigint, integer, decimal } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { users } from './user';

export const documents = pgTable('documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 500 }).notNull(),
  filePath: varchar('file_path', { length: 1000 }).notNull(),
  fileType: varchar('file_type', { length: 10 }).notNull(),
  fileSize: bigint('file_size', { mode: 'number' }),
  language: varchar('language', { length: 10 }),
  readingProgress: decimal('reading_progress', { precision: 5, scale: 4 }).default('0'),
  totalPages: integer('total_pages'),
  currentPage: integer('current_page').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  lastOpened: timestamp('last_opened'),
  version: integer('version').default(1).notNull(),
});

// Zod schemas
export const insertDocumentSchema = createInsertSchema(documents, {
  title: z.string().min(1).max(500),
  fileType: z.enum(['epub', 'md', 'pdf']),
  language: z.string().length(2).optional(),
  readingProgress: z.number().min(0).max(1).optional(),
  totalPages: z.number().int().positive().optional(),
  currentPage: z.number().int().min(0).optional(),
});

export const selectDocumentSchema = createSelectSchema(documents);

export const updateDocumentSchema = insertDocumentSchema.partial().omit({
  id: true,
  userId: true,
  filePath: true,
  fileSize: true,
  createdAt: true,
  updatedAt: true,
  version: true,
});

// Type exports
export type Document = typeof documents.$inferSelect;
export type InsertDocument = typeof documents.$inferInsert;
export type UpdateDocument = z.infer<typeof updateDocumentSchema>;