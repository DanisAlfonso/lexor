import { pgTable, uuid, varchar, timestamp, text, integer } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { users } from './user';
import { documents } from './document';

export const annotations = pgTable('annotations', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  documentId: uuid('document_id').notNull().references(() => documents.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 20 }).notNull(),
  content: text('content'),
  location: text('location').notNull(),
  color: varchar('color', { length: 7 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  version: integer('version').default(1).notNull(),
});

// Zod schemas
export const insertAnnotationSchema = createInsertSchema(annotations, {
  type: z.enum(['bookmark', 'highlight', 'note']),
  content: z.string().optional(),
  location: z.string().min(1),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

export const selectAnnotationSchema = createSelectSchema(annotations);

export const updateAnnotationSchema = insertAnnotationSchema.partial().omit({
  id: true,
  userId: true,
  documentId: true,
  createdAt: true,
  updatedAt: true,
  version: true,
});

// Type exports
export type Annotation = typeof annotations.$inferSelect;
export type InsertAnnotation = typeof annotations.$inferInsert;
export type UpdateAnnotation = z.infer<typeof updateAnnotationSchema>;