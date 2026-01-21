/**
 * Document import service
 * Handles importing documents from various sources and formats
 */

import { Platform, Alert } from 'react-native';
import * as FileSystemLegacy from 'expo-file-system/legacy';
import { Document, DocumentFormat } from '@/types';
import { insertDocument } from './database';

// Conditional import for expo-document-picker
let DocumentPicker: any = null;
try {
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    DocumentPicker = require('expo-document-picker');
  }
} catch (e) {
  console.warn('expo-document-picker not available:', e);
}

// Use legacy API for compatibility
const DOCUMENTS_DIR = `${FileSystemLegacy.documentDirectory || ''}documents/`;

/**
 * Initialize documents directory
 */
export async function initDocumentsDirectory(): Promise<void> {
  if (!FileSystemLegacy.documentDirectory) {
    throw new Error('Document directory not available');
  }
  const dirInfo = await FileSystemLegacy.getInfoAsync(DOCUMENTS_DIR);
  if (!dirInfo.exists) {
    await FileSystemLegacy.makeDirectoryAsync(DOCUMENTS_DIR, { intermediates: true });
  }
}

/**
 * Calculate estimated reading time (words per minute = 200)
 */
function calculateReadingTime(wordCount: number): number {
  const wordsPerMinute = 200;
  return Math.ceil(wordCount / wordsPerMinute);
}

/**
 * Extract text from file based on format
 */
async function extractText(filePath: string, format: DocumentFormat): Promise<string> {
  switch (format) {
    case 'txt':
      return await FileSystemLegacy.readAsStringAsync(filePath);
    case 'pdf':
      // PDF text extraction would require additional library
      // For now, return placeholder
      return '';
    case 'epub':
      // EPUB parsing would require additional library
      // For now, return placeholder
      return '';
    case 'docx':
      // DOCX parsing would require additional library
      // For now, return placeholder
      return '';
    default:
      return '';
  }
}

/**
 * Count words in text
 */
function countWords(text: string): number {
  if (!text || text.trim().length === 0) return 0;
  return text.trim().split(/\s+/).length;
}

/**
 * Generate document metadata
 */
async function generateMetadata(
  filePath: string,
  format: DocumentFormat,
  text: string
): Promise<{
  wordCount: number;
  estimatedReadingTime: number;
  pageCount: number;
}> {
  const wordCount = countWords(text);
  const estimatedReadingTime = calculateReadingTime(wordCount);
  
  // Estimate page count (assuming ~250 words per page)
  const pageCount = Math.max(1, Math.ceil(wordCount / 250));

  return {
    wordCount,
    estimatedReadingTime,
    pageCount,
  };
}

/**
 * Import document from file picker
 */
export async function importDocument(): Promise<Document | null> {
  if (!DocumentPicker) {
    console.error('expo-document-picker is not available. Please use a development build.');
    Alert.alert(
      'Feature Not Available',
      'Document picker requires a development build. Please build the app using EAS Build or run locally.'
    );
    return null;
  }

  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'application/epub+zip', 'text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return null;
    }

    const asset = result.assets[0];
    const fileName = asset.name || 'Untitled';
    const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';

    // Determine format
    let format: DocumentFormat = 'txt';
    if (fileExtension === 'pdf') format = 'pdf';
    else if (fileExtension === 'epub') format = 'epub';
    else if (fileExtension === 'docx') format = 'docx';
    else if (fileExtension === 'txt') format = 'txt';

    // Generate unique ID
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Copy file to documents directory
    await initDocumentsDirectory();
    const newFilePath = `${DOCUMENTS_DIR}${id}.${fileExtension}`;
    await FileSystemLegacy.copyAsync({
      from: asset.uri,
      to: newFilePath,
    });

    // Extract text and generate metadata
    const text = await extractText(newFilePath, format);
    const metadata = await generateMetadata(newFilePath, format, text);

    // Create document object
    const document: Document = {
      id,
      title: fileName.replace(/\.[^/.]+$/, ''), // Remove extension
      filePath: newFilePath,
      format,
      status: 'unread',
      pageCount: metadata.pageCount,
      wordCount: metadata.wordCount,
      estimatedReadingTime: metadata.estimatedReadingTime,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastOpenedAt: null,
      coverImagePath: null,
    };

    // Save to database
    await insertDocument(document);

    return document;
  } catch (error) {
    console.error('Error importing document:', error);
    return null;
  }
}

/**
 * Import document from share menu (deep link)
 */
export async function importDocumentFromUri(uri: string, fileName?: string): Promise<Document | null> {
  try {
    await initDocumentsDirectory();

    const fileExtension = uri.split('.').pop()?.toLowerCase() || 'txt';
    let format: DocumentFormat = 'txt';
    if (fileExtension === 'pdf') format = 'pdf';
    else if (fileExtension === 'epub') format = 'epub';
    else if (fileExtension === 'docx') format = 'docx';
    else if (fileExtension === 'txt') format = 'txt';

    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newFilePath = `${DOCUMENTS_DIR}${id}.${fileExtension}`;

    await FileSystemLegacy.copyAsync({
      from: uri,
      to: newFilePath,
    });

    const text = await extractText(newFilePath, format);
    const metadata = await generateMetadata(newFilePath, format, text);

    const document: Document = {
      id,
      title: fileName || `Document ${id}`,
      filePath: newFilePath,
      format,
      status: 'unread',
      pageCount: metadata.pageCount,
      wordCount: metadata.wordCount,
      estimatedReadingTime: metadata.estimatedReadingTime,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastOpenedAt: null,
      coverImagePath: null,
    };

    await insertDocument(document);
    return document;
  } catch (error) {
    console.error('Error importing document from URI:', error);
    return null;
  }
}

/**
 * Delete document file
 */
export async function deleteDocumentFile(filePath: string): Promise<void> {
  try {
    const fileInfo = await FileSystemLegacy.getInfoAsync(filePath);
    if (fileInfo.exists) {
      await FileSystemLegacy.deleteAsync(filePath);
    }
  } catch (error) {
    console.error('Error deleting document file:', error);
  }
}
