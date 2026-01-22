/**
 * SQLite database service
 * Handles all database operations for local-first storage
 */

import { Platform } from 'react-native';
import { Document, Tag, DocumentTag, ReadingPosition, Highlight, Note, Collection, Bookmark } from '@/types';
import { dbCache, cacheKeys } from './databaseCache';

// Conditional import for expo-sqlite
let SQLite: any = null;
try {
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    SQLite = require('expo-sqlite');
  }
} catch (e) {
  console.warn('expo-sqlite not available:', e);
}

const DB_NAME = 'readus.db';

let db: any = null;
let dbInitialized = false;
let initPromise: Promise<any> | null = null;

/**
 * Initialize database connection and create tables
 */
export async function initDatabase(): Promise<any> {
  if (!SQLite) {
    console.error('expo-sqlite is not available. Database operations will not work.');
    throw new Error('expo-sqlite is not available. Please use a development build.');
  }

  // If already initialized, return existing db
  if (db && dbInitialized) {
    return db;
  }

  // If initialization is in progress, wait for it
  if (initPromise) {
    return await initPromise;
  }

  // Start initialization
  initPromise = (async () => {
    try {
      db = await SQLite.openDatabaseAsync(DB_NAME);
      console.log('Database opened:', DB_NAME);

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
      coverImagePath TEXT,
      extractedText TEXT
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

    CREATE TABLE IF NOT EXISTS reading_sessions (
      id TEXT PRIMARY KEY,
      documentId TEXT NOT NULL,
      startTime TEXT NOT NULL,
      endTime TEXT,
      pagesRead INTEGER DEFAULT 0,
      wordsRead INTEGER DEFAULT 0,
      durationSeconds INTEGER DEFAULT 0,
      FOREIGN KEY (documentId) REFERENCES documents(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS collections (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      color TEXT,
      icon TEXT,
      parentId TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (parentId) REFERENCES collections(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS collection_documents (
      collectionId TEXT NOT NULL,
      documentId TEXT NOT NULL,
      orderIndex INTEGER DEFAULT 0,
      addedAt TEXT NOT NULL,
      PRIMARY KEY (collectionId, documentId),
      FOREIGN KEY (collectionId) REFERENCES collections(id) ON DELETE CASCADE,
      FOREIGN KEY (documentId) REFERENCES documents(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS bookmarks (
      id TEXT PRIMARY KEY,
      documentId TEXT NOT NULL,
      page INTEGER NOT NULL,
      note TEXT,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (documentId) REFERENCES documents(id) ON DELETE CASCADE
    );

    -- Create indexes for search performance
    CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
    CREATE INDEX IF NOT EXISTS idx_documents_title ON documents(title);
    CREATE INDEX IF NOT EXISTS idx_reading_positions_documentId ON reading_positions(documentId);
    CREATE INDEX IF NOT EXISTS idx_highlights_documentId ON highlights(documentId);
    CREATE INDEX IF NOT EXISTS idx_notes_documentId ON notes(documentId);
    CREATE INDEX IF NOT EXISTS idx_document_tags_documentId ON document_tags(documentId);
    CREATE INDEX IF NOT EXISTS idx_document_tags_tagId ON document_tags(tagId);
    CREATE INDEX IF NOT EXISTS idx_collections_parentId ON collections(parentId);
    CREATE INDEX IF NOT EXISTS idx_collection_documents_collectionId ON collection_documents(collectionId);
    CREATE INDEX IF NOT EXISTS idx_collection_documents_documentId ON collection_documents(documentId);
    CREATE INDEX IF NOT EXISTS idx_bookmarks_documentId ON bookmarks(documentId);
      `);

      // Migration: Add extractedText column if it doesn't exist
      try {
        const alterTableSql = 'ALTER TABLE documents ADD COLUMN extractedText TEXT;';
        await db.execAsync(alterTableSql);
        console.log('Migration: Added extractedText column to documents table');
      } catch (error: any) {
        // Column already exists or other error - ignore
        if (!error?.message?.includes('duplicate column')) {
          console.log('Migration: extractedText column may already exist or error:', error?.message);
        }
      }

      // Migration: Add isFavorite column if it doesn't exist
      try {
        const alterTableSql = 'ALTER TABLE documents ADD COLUMN isFavorite INTEGER DEFAULT 0;';
        await db.execAsync(alterTableSql);
        console.log('Migration: Added isFavorite column to documents table');
      } catch (error: any) {
        // Column already exists or other error - ignore
        if (!error?.message?.includes('duplicate column')) {
          console.log('Migration: isFavorite column may already exist or error:', error?.message);
        }
      }
    
      // Create FTS5 virtual tables for full-text search
      await db.execAsync(`
    CREATE VIRTUAL TABLE IF NOT EXISTS documents_fts USING fts5(
      id UNINDEXED,
      title,
      extractedText,
      content='documents',
      content_rowid='rowid'
    );
    
    CREATE VIRTUAL TABLE IF NOT EXISTS highlights_fts USING fts5(
      id UNINDEXED,
      documentId UNINDEXED,
      text,
      content='highlights',
      content_rowid='rowid'
    );
    
    CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
      id UNINDEXED,
      documentId UNINDEXED,
      text,
      content='notes',
      content_rowid='rowid'
    );
    
    -- Create triggers to keep FTS5 tables in sync
    CREATE TRIGGER IF NOT EXISTS documents_fts_insert AFTER INSERT ON documents BEGIN
      INSERT INTO documents_fts(rowid, id, title, extractedText)
      VALUES (new.rowid, new.id, new.title, new.extractedText);
    END;
    
    CREATE TRIGGER IF NOT EXISTS documents_fts_delete AFTER DELETE ON documents BEGIN
      DELETE FROM documents_fts WHERE rowid = old.rowid;
    END;
    
    CREATE TRIGGER IF NOT EXISTS documents_fts_update AFTER UPDATE ON documents BEGIN
      DELETE FROM documents_fts WHERE rowid = old.rowid;
      INSERT INTO documents_fts(rowid, id, title, extractedText)
      VALUES (new.rowid, new.id, new.title, new.extractedText);
    END;
    
    CREATE TRIGGER IF NOT EXISTS highlights_fts_insert AFTER INSERT ON highlights BEGIN
      INSERT INTO highlights_fts(rowid, id, documentId, text)
      VALUES (new.rowid, new.id, new.documentId, new.text);
    END;
    
    CREATE TRIGGER IF NOT EXISTS highlights_fts_delete AFTER DELETE ON highlights BEGIN
      DELETE FROM highlights_fts WHERE rowid = old.rowid;
    END;
    
    CREATE TRIGGER IF NOT EXISTS highlights_fts_update AFTER UPDATE ON highlights BEGIN
      DELETE FROM highlights_fts WHERE rowid = old.rowid;
      INSERT INTO highlights_fts(rowid, id, documentId, text)
      VALUES (new.rowid, new.id, new.documentId, new.text);
    END;
    
    CREATE TRIGGER IF NOT EXISTS notes_fts_insert AFTER INSERT ON notes BEGIN
      INSERT INTO notes_fts(rowid, id, documentId, text)
      VALUES (new.rowid, new.id, new.documentId, new.text);
    END;
    
    CREATE TRIGGER IF NOT EXISTS notes_fts_delete AFTER DELETE ON notes BEGIN
      DELETE FROM notes_fts WHERE rowid = old.rowid;
    END;
    
    CREATE TRIGGER IF NOT EXISTS notes_fts_update AFTER UPDATE ON notes BEGIN
      DELETE FROM notes_fts WHERE rowid = old.rowid;
      INSERT INTO notes_fts(rowid, id, documentId, text)
      VALUES (new.rowid, new.id, new.documentId, new.text);
    END;
    `);

      dbInitialized = true;
      console.log('Database initialized successfully');
      return db;
    } catch (error) {
      console.error('Database initialization error:', error);
      db = null;
      dbInitialized = false;
      initPromise = null;
      throw error;
    }
  })();

  return await initPromise;
}

/**
 * Get database instance
 */
export function getDatabase(): any {
  if (!SQLite) {
    throw new Error('expo-sqlite is not available. Please use a development build.');
  }
  if (!db || !dbInitialized) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

/**
 * Wait for database to be initialized
 */
export async function waitForDatabase(): Promise<void> {
  if (dbInitialized) {
    return;
  }
  if (initPromise) {
    await initPromise;
    return;
  }
  // If not initialized and no promise, initialize now
  await initDatabase();
}

// Document operations
export async function insertDocument(document: Document): Promise<void> {
  await waitForDatabase();
  const database = getDatabase();
  try {
    await database.runAsync(
      `INSERT INTO documents (id, title, filePath, format, status, pageCount, wordCount, estimatedReadingTime, createdAt, updatedAt, lastOpenedAt, coverImagePath, extractedText, isFavorite)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        document.extractedText || null,
        document.isFavorite ? 1 : 0,
      ]
    );
    console.log(`Document inserted successfully: ${document.title} (${document.id})`);
    
    // Invalidate cache
    dbCache.invalidate('documents:*');
  } catch (error) {
    console.error('Error inserting document:', error);
    throw error;
  }
}

export async function getAllDocuments(): Promise<Document[]> {
  // Check cache first
  const cached = dbCache.get<Document[]>(cacheKeys.documents());
  if (cached) {
    return cached;
  }

  const database = getDatabase();
  try {
    const result = await database.getAllAsync(
      'SELECT * FROM documents ORDER BY lastOpenedAt DESC, createdAt DESC'
    ) as any[];
    // Convert isFavorite from integer to boolean
    const documents = result.map((doc: any) => ({
      ...doc,
      isFavorite: doc.isFavorite === 1 || doc.isFavorite === true,
    })) as Document[];
    console.log(`Retrieved ${documents.length} documents from database`);
    
    // Cache the result
    dbCache.set(cacheKeys.documents(), documents);
    return documents;
  } catch (error) {
    console.error('Error getting all documents:', error);
    throw error;
  }
}

export async function getDocumentById(id: string): Promise<Document | null> {
  // Check cache first
  const cached = dbCache.get<Document>(cacheKeys.document(id));
  if (cached) {
    return cached;
  }

  const database = getDatabase();
  const result = await database.getFirstAsync(
    'SELECT * FROM documents WHERE id = ?',
    [id]
  ) as any;
  const document = result ? {
    ...result,
    isFavorite: result.isFavorite === 1 || result.isFavorite === true,
  } as Document : null;
  
  // Cache the result
  if (document) {
    dbCache.set(cacheKeys.document(id), document);
  }
  
  return document;
}

export async function updateDocument(id: string, updates: Partial<Document>): Promise<void> {
  const database = getDatabase();
  const fields: string[] = [];
  const values: any[] = [];

  Object.entries(updates).forEach(([key, value]) => {
    if (value !== undefined && key !== 'id') {
      fields.push(`${key} = ?`);
      // Convert boolean isFavorite to integer for SQLite
      if (key === 'isFavorite') {
        values.push(value ? 1 : 0);
      } else {
        values.push(value);
      }
    }
  });

  if (fields.length === 0) return;

  values.push(id);
  await database.runAsync(
    `UPDATE documents SET ${fields.join(', ')} WHERE id = ?`,
    values
  );
  
  // Invalidate cache
  dbCache.invalidate(`document:${id}`);
  dbCache.invalidate('documents:*');
}

export async function toggleFavorite(documentId: string): Promise<boolean> {
  const database = getDatabase();
  const document = await getDocumentById(documentId);
  if (!document) {
    throw new Error('Document not found');
  }
  
  const newFavoriteStatus = !document.isFavorite;
  await updateDocument(documentId, { isFavorite: newFavoriteStatus });
  return newFavoriteStatus;
}

export async function deleteDocument(id: string): Promise<void> {
  const database = getDatabase();
  await database.runAsync('DELETE FROM documents WHERE id = ?', [id]);
  
  // Invalidate cache
  dbCache.invalidate(`document:${id}`);
  dbCache.invalidate('documents:*');
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
  return (await database.getAllAsync('SELECT * FROM tags ORDER BY name')) as Tag[];
}

export async function getTagsByDocumentId(documentId: string): Promise<Tag[]> {
  const database = getDatabase();
  return (await database.getAllAsync(
    `SELECT t.* FROM tags t
     INNER JOIN document_tags dt ON t.id = dt.tagId
     WHERE dt.documentId = ?`,
    [documentId]
  )) as Tag[];
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

// Collection operations
export async function insertCollection(collection: Collection): Promise<void> {
  await waitForDatabase();
  const database = getDatabase();
  await database.runAsync(
    'INSERT INTO collections (id, name, color, icon, parentId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [
      collection.id,
      collection.name,
      collection.color,
      collection.icon,
      collection.parentId,
      collection.createdAt,
      collection.updatedAt,
    ]
  );
}

export async function getAllCollections(): Promise<Collection[]> {
  await waitForDatabase();
  const database = getDatabase();
  return (await database.getAllAsync('SELECT * FROM collections ORDER BY name')) as Collection[];
}

export async function getCollectionById(id: string): Promise<Collection | null> {
  await waitForDatabase();
  const database = getDatabase();
  const result = await database.getFirstAsync('SELECT * FROM collections WHERE id = ?', [id]);
  return result as Collection | null;
}

export async function getCollectionsByParentId(parentId: string | null): Promise<Collection[]> {
  await waitForDatabase();
  const database = getDatabase();
  if (parentId === null) {
    return (await database.getAllAsync('SELECT * FROM collections WHERE parentId IS NULL ORDER BY name')) as Collection[];
  }
  return (await database.getAllAsync('SELECT * FROM collections WHERE parentId = ? ORDER BY name', [parentId])) as Collection[];
}

export async function updateCollection(id: string, updates: Partial<Omit<Collection, 'id' | 'createdAt'>>): Promise<void> {
  await waitForDatabase();
  const database = getDatabase();
  const keys = Object.keys(updates);
  const values = Object.values(updates);
  if (keys.length === 0) return;

  const setClause = keys.map((key) => `${key} = ?`).join(', ');
  await database.runAsync(`UPDATE collections SET ${setClause}, updatedAt = ? WHERE id = ?`, [
    ...values,
    new Date().toISOString(),
    id,
  ]);
}

export async function deleteCollection(id: string): Promise<void> {
  await waitForDatabase();
  const database = getDatabase();
  await database.runAsync('DELETE FROM collections WHERE id = ?', [id]);
}

export async function addDocumentToCollection(collectionId: string, documentId: string): Promise<void> {
  await waitForDatabase();
  const database = getDatabase();
  // Get current max orderIndex for this collection
  const maxOrder = await database.getFirstAsync(
    'SELECT MAX(orderIndex) as maxOrder FROM collection_documents WHERE collectionId = ?',
    [collectionId]
  ) as { maxOrder: number } | null;
  const nextOrder = (maxOrder?.maxOrder ?? -1) + 1;
  
  await database.runAsync(
    'INSERT INTO collection_documents (collectionId, documentId, orderIndex, addedAt) VALUES (?, ?, ?, ?)',
    [collectionId, documentId, nextOrder, new Date().toISOString()]
  );
}

export async function removeDocumentFromCollection(collectionId: string, documentId: string): Promise<void> {
  await waitForDatabase();
  const database = getDatabase();
  await database.runAsync('DELETE FROM collection_documents WHERE collectionId = ? AND documentId = ?', [
    collectionId,
    documentId,
  ]);
}

export async function getCollectionDocuments(collectionId: string): Promise<Document[]> {
  await waitForDatabase();
  const database = getDatabase();
  return (await database.getAllAsync(
    `SELECT d.* FROM documents d
     JOIN collection_documents cd ON d.id = cd.documentId
     WHERE cd.collectionId = ?
     ORDER BY cd.orderIndex, cd.addedAt`,
    [collectionId]
  )) as Document[];
}

export async function getDocumentCollections(documentId: string): Promise<Collection[]> {
  await waitForDatabase();
  const database = getDatabase();
  return (await database.getAllAsync(
    `SELECT c.* FROM collections c
     JOIN collection_documents cd ON c.id = cd.collectionId
     WHERE cd.documentId = ?
     ORDER BY c.name`,
    [documentId]
  )) as Collection[];
}

// Bookmark operations
export async function insertBookmark(bookmark: Bookmark): Promise<void> {
  await waitForDatabase();
  const database = getDatabase();
  await database.runAsync(
    'INSERT INTO bookmarks (id, documentId, page, note, createdAt) VALUES (?, ?, ?, ?, ?)',
    [bookmark.id, bookmark.documentId, bookmark.page, bookmark.note, bookmark.createdAt]
  );
}

export async function getBookmarksByDocumentId(documentId: string): Promise<Bookmark[]> {
  await waitForDatabase();
  const database = getDatabase();
  return (await database.getAllAsync(
    'SELECT * FROM bookmarks WHERE documentId = ? ORDER BY page',
    [documentId]
  )) as Bookmark[];
}

export async function getAllBookmarks(): Promise<Bookmark[]> {
  await waitForDatabase();
  const database = getDatabase();
  return (await database.getAllAsync('SELECT * FROM bookmarks ORDER BY createdAt DESC')) as Bookmark[];
}

export async function deleteBookmark(id: string): Promise<void> {
  await waitForDatabase();
  const database = getDatabase();
  await database.runAsync('DELETE FROM bookmarks WHERE id = ?', [id]);
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
  const result = await database.getFirstAsync(
    'SELECT * FROM reading_positions WHERE documentId = ?',
    [documentId]
  );
  return (result as ReadingPosition) || null;
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
  return (await database.getAllAsync(
    'SELECT * FROM highlights WHERE documentId = ? ORDER BY startPosition',
    [documentId]
  )) as Highlight[];
}

export async function getAllHighlights(): Promise<Highlight[]> {
  // Check cache first
  const cached = dbCache.get<Highlight[]>(cacheKeys.highlights());
  if (cached) {
    return cached;
  }

  const database = getDatabase();
  const result = (await database.getAllAsync(
    'SELECT * FROM highlights ORDER BY createdAt DESC'
  )) as Highlight[];
  
  // Cache the result
  dbCache.set(cacheKeys.highlights(), result);
  return result;
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
  return (await database.getAllAsync(
    'SELECT * FROM notes WHERE documentId = ? ORDER BY position',
    [documentId]
  )) as Note[];
}

export async function getNotesByHighlightId(highlightId: string): Promise<Note[]> {
  const database = getDatabase();
  return (await database.getAllAsync(
    'SELECT * FROM notes WHERE highlightId = ? ORDER BY createdAt',
    [highlightId]
  )) as Note[];
}

export async function getAllNotes(): Promise<Note[]> {
  // Check cache first
  const cached = dbCache.get<Note[]>(cacheKeys.notes());
  if (cached) {
    return cached;
  }

  const database = getDatabase();
  const result = (await database.getAllAsync('SELECT * FROM notes ORDER BY updatedAt DESC')) as Note[];
  
  // Cache the result
  dbCache.set(cacheKeys.notes(), result);
  return result;
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
  await waitForDatabase();
  const database = getDatabase();
  // Use FTS5 for full-text search with ranking
  // FTS5 query syntax: use * for prefix matching
  const ftsQuery = `${query}*`;
  try {
    return await database.getAllAsync(
      `SELECT d.*, 
              CASE WHEN fts.rank IS NOT NULL THEN fts.rank ELSE 0 END AS rank
       FROM documents_fts AS fts
       JOIN documents AS d ON fts.id = d.id
       WHERE fts.title MATCH ? OR fts.extractedText MATCH ?
       ORDER BY rank DESC, d.title
       LIMIT 50`,
      [ftsQuery, ftsQuery]
    );
  } catch (error) {
    console.warn('FTS5 bm25() not available or query error, falling back to simple match:', error);
    // Fallback if bm25() is not available
    return await database.getAllAsync(
      `SELECT d.*
       FROM documents_fts AS fts
       JOIN documents AS d ON fts.id = d.id
       WHERE fts.title MATCH ? OR fts.extractedText MATCH ?
       ORDER BY d.title
       LIMIT 50`,
      [ftsQuery, ftsQuery]
    );
  }
}

export async function searchHighlights(query: string): Promise<Highlight[]> {
  await waitForDatabase();
  const database = getDatabase();
  const ftsQuery = `${query}*`;
  try {
    return await database.getAllAsync(
      `SELECT h.*, 
              CASE WHEN fts.rank IS NOT NULL THEN fts.rank ELSE 0 END AS rank
       FROM highlights_fts AS fts
       JOIN highlights AS h ON fts.id = h.id
       WHERE fts.text MATCH ?
       ORDER BY rank DESC, h.createdAt DESC
       LIMIT 50`,
      [ftsQuery]
    ) as Highlight[];
  } catch (error) {
    console.warn('FTS5 bm25() not available or query error for highlights, falling back to simple match:', error);
    // Fallback if bm25() is not available
    return await database.getAllAsync(
      `SELECT h.*
       FROM highlights_fts AS fts
       JOIN highlights AS h ON fts.id = h.id
       WHERE fts.text MATCH ?
       ORDER BY h.createdAt DESC
       LIMIT 50`,
      [ftsQuery]
    ) as Highlight[];
  }
}

export async function searchNotes(query: string): Promise<Note[]> {
  await waitForDatabase();
  const database = getDatabase();
  const ftsQuery = `${query}*`;
  try {
    return await database.getAllAsync(
      `SELECT n.*, 
              CASE WHEN fts.rank IS NOT NULL THEN fts.rank ELSE 0 END AS rank
       FROM notes_fts AS fts
       JOIN notes AS n ON fts.id = n.id
       WHERE fts.text MATCH ?
       ORDER BY rank DESC, n.updatedAt DESC
       LIMIT 50`,
      [ftsQuery]
    ) as Note[];
  } catch (error) {
    console.warn('FTS5 bm25() not available or query error for notes, falling back to simple match:', error);
    // Fallback if bm25() is not available
    return await database.getAllAsync(
      `SELECT n.*
       FROM notes_fts AS fts
       JOIN notes AS n ON fts.id = n.id
       WHERE fts.text MATCH ?
       ORDER BY n.updatedAt DESC
       LIMIT 50`,
      [ftsQuery]
    ) as Note[];
  }
}
