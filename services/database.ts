/**
 * SQLite database service
 * Handles all database operations for local-first storage
 */

import * as SQLite from 'expo-sqlite';
import { Document, Tag, DocumentTag, ReadingPosition, Highlight, Note } from '@/types';

const DB_NAME = 'readus.db';

let db: SQLite.SQLiteDatabase | null = null;

/**
 * Initialize database connection and create tables
 */
export async function initDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) {
    return db;
  }

  db = await SQLite.openDatabaseAsync(DB_NAME);

  // Enable foreign keys
  await db.execAsync('PRAGMA foreign_keys = ON;');

  // Create tables
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      filePath TEXT NOT NULL UNIQUE,
      format TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'unread',
      pageCount INTEGER DEFAULT 0,
      wordCount INTEGER DEFAULT 0,
      estimatedReadingTime INTEGER DEFAULT 0,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      lastOpenedAt TEXT,
      coverImagePath TEXT
    );

    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      color TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS document_tags (
      documentId TEXT NOT NULL,
      tagId TEXT NOT NULL,
      PRIMARY KEY (documentId, tagId),
      FOREIGN KEY (documentId) REFERENCES documents(id) ON DELETE CASCADE,
      FOREIGN KEY (tagId) REFERENCES tags(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS reading_positions (
      id TEXT PRIMARY KEY,
      documentId TEXT NOT NULL,
      position INTEGER NOT NULL DEFAULT 0,
      progress REAL NOT NULL DEFAULT 0,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (documentId) REFERENCES documents(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS highlights (
      id TEXT PRIMARY KEY,
      documentId TEXT NOT NULL,
      type TEXT NOT NULL,
      text TEXT NOT NULL,
      startPosition INTEGER NOT NULL,
      endPosition INTEGER NOT NULL,
      color TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (documentId) REFERENCES documents(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      documentId TEXT NOT NULL,
      highlightId TEXT,
      text TEXT NOT NULL,
      position INTEGER NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (documentId) REFERENCES documents(id) ON DELETE CASCADE,
      FOREIGN KEY (highlightId) REFERENCES highlights(id) ON DELETE CASCADE
    );

    -- Create indexes for search performance
    CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
    CREATE INDEX IF NOT EXISTS idx_documents_title ON documents(title);
    CREATE INDEX IF NOT EXISTS idx_reading_positions_documentId ON reading_positions(documentId);
    CREATE INDEX IF NOT EXISTS idx_highlights_documentId ON highlights(documentId);
    CREATE INDEX IF NOT EXISTS idx_notes_documentId ON notes(documentId);
    CREATE INDEX IF NOT EXISTS idx_document_tags_documentId ON document_tags(documentId);
    CREATE INDEX IF NOT EXISTS idx_document_tags_tagId ON document_tags(tagId);
  `);

  return db;
}

/**
 * Get database instance
 */
export function getDatabase(): SQLite.SQLiteDatabase {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

// Document operations
export async function insertDocument(document: Document): Promise<void> {
  const database = getDatabase();
  await database.runAsync(
    `INSERT INTO documents (id, title, filePath, format, status, pageCount, wordCount, estimatedReadingTime, createdAt, updatedAt, lastOpenedAt, coverImagePath)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      document.id,
      document.title,
      document.filePath,
      document.format,
      document.status,
      document.pageCount,
      document.wordCount,
      document.estimatedReadingTime,
      document.createdAt,
      document.updatedAt,
      document.lastOpenedAt,
      document.coverImagePath,
    ]
  );
}

export async function getAllDocuments(): Promise<Document[]> {
  const database = getDatabase();
  const result = await database.getAllAsync<Document>(
    'SELECT * FROM documents ORDER BY lastOpenedAt DESC, createdAt DESC'
  );
  return result;
}

export async function getDocumentById(id: string): Promise<Document | null> {
  const database = getDatabase();
  const result = await database.getFirstAsync<Document>(
    'SELECT * FROM documents WHERE id = ?',
    [id]
  );
  return result || null;
}

export async function updateDocument(id: string, updates: Partial<Document>): Promise<void> {
  const database = getDatabase();
  const fields: string[] = [];
  const values: any[] = [];

  Object.entries(updates).forEach(([key, value]) => {
    if (value !== undefined && key !== 'id') {
      fields.push(`${key} = ?`);
      values.push(value);
    }
  });

  if (fields.length === 0) return;

  values.push(id);
  await database.runAsync(
    `UPDATE documents SET ${fields.join(', ')} WHERE id = ?`,
    values
  );
}

export async function deleteDocument(id: string): Promise<void> {
  const database = getDatabase();
  await database.runAsync('DELETE FROM documents WHERE id = ?', [id]);
}

// Tag operations
export async function insertTag(tag: Tag): Promise<void> {
  const database = getDatabase();
  await database.runAsync(
    'INSERT INTO tags (id, name, color, createdAt) VALUES (?, ?, ?, ?)',
    [tag.id, tag.name, tag.color, tag.createdAt]
  );
}

export async function getAllTags(): Promise<Tag[]> {
  const database = getDatabase();
  return await database.getAllAsync<Tag>('SELECT * FROM tags ORDER BY name');
}

export async function getTagsByDocumentId(documentId: string): Promise<Tag[]> {
  const database = getDatabase();
  return await database.getAllAsync<Tag>(
    `SELECT t.* FROM tags t
     INNER JOIN document_tags dt ON t.id = dt.tagId
     WHERE dt.documentId = ?`,
    [documentId]
  );
}

export async function addTagToDocument(documentId: string, tagId: string): Promise<void> {
  const database = getDatabase();
  await database.runAsync(
    'INSERT OR IGNORE INTO document_tags (documentId, tagId) VALUES (?, ?)',
    [documentId, tagId]
  );
}

export async function removeTagFromDocument(documentId: string, tagId: string): Promise<void> {
  const database = getDatabase();
  await database.runAsync(
    'DELETE FROM document_tags WHERE documentId = ? AND tagId = ?',
    [documentId, tagId]
  );
}

// Reading position operations
export async function upsertReadingPosition(position: ReadingPosition): Promise<void> {
  const database = getDatabase();
  await database.runAsync(
    `INSERT INTO reading_positions (id, documentId, position, progress, updatedAt)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       position = excluded.position,
       progress = excluded.progress,
       updatedAt = excluded.updatedAt`,
    [position.id, position.documentId, position.position, position.progress, position.updatedAt]
  );
}

export async function getReadingPosition(documentId: string): Promise<ReadingPosition | null> {
  const database = getDatabase();
  const result = await database.getFirstAsync<ReadingPosition>(
    'SELECT * FROM reading_positions WHERE documentId = ?',
    [documentId]
  );
  return result || null;
}

// Highlight operations
export async function insertHighlight(highlight: Highlight): Promise<void> {
  const database = getDatabase();
  await database.runAsync(
    `INSERT INTO highlights (id, documentId, type, text, startPosition, endPosition, color, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      highlight.id,
      highlight.documentId,
      highlight.type,
      highlight.text,
      highlight.startPosition,
      highlight.endPosition,
      highlight.color,
      highlight.createdAt,
    ]
  );
}

export async function getHighlightsByDocumentId(documentId: string): Promise<Highlight[]> {
  const database = getDatabase();
  return await database.getAllAsync<Highlight>(
    'SELECT * FROM highlights WHERE documentId = ? ORDER BY startPosition',
    [documentId]
  );
}

export async function getAllHighlights(): Promise<Highlight[]> {
  const database = getDatabase();
  return await database.getAllAsync<Highlight>(
    'SELECT * FROM highlights ORDER BY createdAt DESC'
  );
}

export async function deleteHighlight(id: string): Promise<void> {
  const database = getDatabase();
  await database.runAsync('DELETE FROM highlights WHERE id = ?', [id]);
}

// Note operations
export async function insertNote(note: Note): Promise<void> {
  const database = getDatabase();
  await database.runAsync(
    `INSERT INTO notes (id, documentId, highlightId, text, position, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      note.id,
      note.documentId,
      note.highlightId,
      note.text,
      note.position,
      note.createdAt,
      note.updatedAt,
    ]
  );
}

export async function getNotesByDocumentId(documentId: string): Promise<Note[]> {
  const database = getDatabase();
  return await database.getAllAsync<Note>(
    'SELECT * FROM notes WHERE documentId = ? ORDER BY position',
    [documentId]
  );
}

export async function getNotesByHighlightId(highlightId: string): Promise<Note[]> {
  const database = getDatabase();
  return await database.getAllAsync<Note>(
    'SELECT * FROM notes WHERE highlightId = ? ORDER BY createdAt',
    [highlightId]
  );
}

export async function getAllNotes(): Promise<Note[]> {
  const database = getDatabase();
  return await database.getAllAsync<Note>('SELECT * FROM notes ORDER BY updatedAt DESC');
}

export async function updateNote(id: string, text: string): Promise<void> {
  const database = getDatabase();
  await database.runAsync(
    'UPDATE notes SET text = ?, updatedAt = ? WHERE id = ?',
    [text, new Date().toISOString(), id]
  );
}

export async function deleteNote(id: string): Promise<void> {
  const database = getDatabase();
  await database.runAsync('DELETE FROM notes WHERE id = ?', [id]);
}

// Search operations
export async function searchDocuments(query: string): Promise<any[]> {
  const database = getDatabase();
  const searchTerm = `%${query}%`;
  return await database.getAllAsync(
    `SELECT * FROM documents 
     WHERE title LIKE ? OR filePath LIKE ?
     ORDER BY 
       CASE 
         WHEN title LIKE ? THEN 1
         ELSE 2
       END`,
    [searchTerm, searchTerm, searchTerm]
  );
}

export async function searchHighlights(query: string): Promise<Highlight[]> {
  const database = getDatabase();
  const searchTerm = `%${query}%`;
  return await database.getAllAsync(
    'SELECT * FROM highlights WHERE text LIKE ? ORDER BY createdAt DESC',
    [searchTerm]
  );
}

export async function searchNotes(query: string): Promise<Note[]> {
  const database = getDatabase();
  const searchTerm = `%${query}%`;
  return await database.getAllAsync(
    'SELECT * FROM notes WHERE text LIKE ? ORDER BY updatedAt DESC',
    [searchTerm]
  );
}
