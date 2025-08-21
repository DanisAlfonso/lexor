-- Migration: 0001_initial
-- Description: Create initial tables for Lexor language learning app
-- Created: 2025-01-01

-- Enable foreign key constraints
PRAGMA foreign_keys = ON;

-- Documents table
CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('epub', 'md', 'pdf')),
  file_size INTEGER,
  language TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  last_opened INTEGER,
  reading_progress REAL NOT NULL DEFAULT 0 CHECK (reading_progress >= 0 AND reading_progress <= 1),
  total_pages INTEGER,
  current_page INTEGER NOT NULL DEFAULT 0,
  sync_status TEXT NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'conflict', 'error')),
  last_modified INTEGER NOT NULL DEFAULT (unixepoch()),
  version INTEGER NOT NULL DEFAULT 1
);

-- Flashcards table
CREATE TABLE IF NOT EXISTS flashcards (
  id TEXT PRIMARY KEY,
  document_id TEXT,
  front_text TEXT NOT NULL,
  back_text TEXT NOT NULL,
  context TEXT,
  source_location TEXT,
  difficulty INTEGER NOT NULL DEFAULT 0 CHECK (difficulty >= 0 AND difficulty <= 5),
  next_review INTEGER,
  review_count INTEGER NOT NULL DEFAULT 0,
  correct_count INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  sync_status TEXT NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'conflict', 'error')),
  last_modified INTEGER NOT NULL DEFAULT (unixepoch()),
  version INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

-- Reading sessions table
CREATE TABLE IF NOT EXISTS reading_sessions (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  start_time INTEGER NOT NULL,
  end_time INTEGER,
  pages_read INTEGER NOT NULL DEFAULT 0,
  words_learned INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  sync_status TEXT NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'conflict', 'error')),
  last_modified INTEGER NOT NULL DEFAULT (unixepoch()),
  version INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

-- Annotations table (bookmarks, highlights, notes)
CREATE TABLE IF NOT EXISTS annotations (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('bookmark', 'highlight', 'note')),
  content TEXT,
  location TEXT NOT NULL,
  color TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  sync_status TEXT NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'conflict', 'error')),
  last_modified INTEGER NOT NULL DEFAULT (unixepoch()),
  version INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  last_modified INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Schema version tracking
CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_documents_last_opened ON documents(last_opened);
CREATE INDEX IF NOT EXISTS idx_documents_sync_status ON documents(sync_status);
CREATE INDEX IF NOT EXISTS idx_flashcards_document_id ON flashcards(document_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_next_review ON flashcards(next_review);
CREATE INDEX IF NOT EXISTS idx_flashcards_sync_status ON flashcards(sync_status);
CREATE INDEX IF NOT EXISTS idx_reading_sessions_document_id ON reading_sessions(document_id);
CREATE INDEX IF NOT EXISTS idx_reading_sessions_start_time ON reading_sessions(start_time);
CREATE INDEX IF NOT EXISTS idx_annotations_document_id ON annotations(document_id);
CREATE INDEX IF NOT EXISTS idx_annotations_type ON annotations(type);

-- Triggers for auto-updating last_modified
CREATE TRIGGER IF NOT EXISTS documents_updated_at 
  AFTER UPDATE ON documents
  BEGIN
    UPDATE documents SET last_modified = unixepoch() WHERE id = NEW.id;
  END;

CREATE TRIGGER IF NOT EXISTS flashcards_updated_at 
  AFTER UPDATE ON flashcards
  BEGIN
    UPDATE flashcards SET last_modified = unixepoch() WHERE id = NEW.id;
  END;

CREATE TRIGGER IF NOT EXISTS reading_sessions_updated_at 
  AFTER UPDATE ON reading_sessions
  BEGIN
    UPDATE reading_sessions SET last_modified = unixepoch() WHERE id = NEW.id;
  END;

CREATE TRIGGER IF NOT EXISTS annotations_updated_at 
  AFTER UPDATE ON annotations
  BEGIN
    UPDATE annotations SET last_modified = unixepoch() WHERE id = NEW.id;
  END;

CREATE TRIGGER IF NOT EXISTS settings_updated_at 
  AFTER UPDATE ON settings
  BEGIN
    UPDATE settings SET last_modified = unixepoch() WHERE key = NEW.key;
  END;

-- Insert migration record
INSERT OR REPLACE INTO schema_migrations (version) VALUES ('0001_initial');