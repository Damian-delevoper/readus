/**
 * Core type definitions for ReadUs app
 */

export type DocumentStatus = 'unread' | 'reading' | 'finished';

export type HighlightType = 'idea' | 'definition' | 'quote';

export type ReaderTheme = 'light' | 'dark' | 'sepia';
export type ReadingMode = 'page' | 'scroll' | 'column' | 'auto-scroll';

export type DocumentFormat = 'pdf' | 'epub' | 'txt' | 'docx';

export interface Document {
  id: string;
  title: string;
  filePath: string;
  format: DocumentFormat;
  status: DocumentStatus;
  pageCount: number;
  wordCount: number;
  estimatedReadingTime: number; // in minutes
  createdAt: string;
  updatedAt: string;
  lastOpenedAt: string | null;
  coverImagePath: string | null;
  extractedText?: string; // Full text content for search indexing
  isFavorite?: boolean; // Favorite status
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  createdAt: string;
}

export interface Collection {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentTag {
  documentId: string;
  tagId: string;
}

export interface ReadingPosition {
  id: string;
  documentId: string;
  position: number; // page number or character position
  progress: number; // 0-100 percentage
  updatedAt: string;
}

export interface Bookmark {
  id: string;
  documentId: string;
  page: number;
  note: string | null;
  createdAt: string;
}

export interface Highlight {
  id: string;
  documentId: string;
  type: HighlightType;
  text: string;
  startPosition: number;
  endPosition: number;
  color: string;
  createdAt: string;
}

export interface Note {
  id: string;
  documentId: string;
  highlightId: string | null; // null if standalone note
  text: string;
  position: number; // character position in document
  createdAt: string;
  updatedAt: string;
}

export interface SearchResult {
  type: 'document' | 'highlight' | 'note';
  id: string;
  documentId: string;
  documentTitle: string;
  text: string;
  snippet: string;
  position?: number;
}

export interface ReaderSettings {
  fontSize: number;
  lineSpacing: number;
  margin: number;
  theme: ReaderTheme;
  defaultHighlightColor: string;
  autoBackup: boolean;
  biometricLock: boolean;
  fontFamily?: string; // Font family name
  readingMode?: ReadingMode; // Reading mode
  autoScrollSpeed?: number; // Words per minute for auto-scroll (default: 200)
}

export interface AIService {
  summarize(text: string): Promise<string>;
  explain(text: string): Promise<string>;
  simplify(text: string): Promise<string>;
}

export interface OCRService {
  scan(imageUri: string): Promise<string>;
}
