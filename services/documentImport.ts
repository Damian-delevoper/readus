/**
 * Document import service
 * Handles importing documents from various sources and formats
 */

import { Platform, Alert } from 'react-native';
import * as FileSystemLegacy from 'expo-file-system/legacy';
import { Document, DocumentFormat } from '@/types';
import { insertDocument, waitForDatabase } from './database';
import { extractEPUBText, getEPUBMetadata } from './epubParser';
import { extractDOCXText, getDOCXMetadata } from './docxParser';
// PDF text extraction is optional - import only when needed to avoid bundling issues
// import { extractPDFText } from './pdfTextExtractor';

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
  try {
    switch (format) {
      case 'txt':
        try {
          return await FileSystemLegacy.readAsStringAsync(filePath);
        } catch (error) {
          console.error('Error reading TXT file:', error);
          return '';
        }
      case 'pdf':
        // PDF text extraction requires pdf-parse which doesn't work in React Native
        // For now, return empty - PDFs can still be viewed natively
        // Text extraction can be added later with a React Native-compatible solution
        // or server-side processing
        return '';
      case 'epub':
        // Use EPUB parser to extract text
        try {
          return await extractEPUBText(filePath);
        } catch (error) {
          console.error('Error extracting EPUB text:', error);
          return 'EPUB format is not yet fully supported. The file has been imported but text extraction is not available.';
        }
      case 'docx':
        // Use DOCX parser to extract text
        try {
          return await extractDOCXText(filePath);
        } catch (error) {
          console.error('Error extracting DOCX text:', error);
          return 'DOCX format is not yet fully supported. The file has been imported but text extraction is not available.';
        }
      default:
        return '';
    }
  } catch (error) {
    console.error('Error extracting text:', error);
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
  
  // Estimate page count based on format
  let pageCount = 1;
  if (format === 'pdf') {
    // For PDFs, we'll estimate based on file size if text extraction isn't available
    // Default to 10 pages if no text extracted
    pageCount = wordCount > 0 ? Math.max(1, Math.ceil(wordCount / 250)) : 10;
  } else if (format === 'epub' || format === 'docx') {
    // For EPUB/DOCX, estimate based on text if available, otherwise default
    pageCount = wordCount > 0 ? Math.max(1, Math.ceil(wordCount / 250)) : 5;
  } else {
    // For TXT and other text formats
    pageCount = Math.max(1, Math.ceil(wordCount / 250));
  }

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

    // Generate thumbnail/cover image (async, non-blocking)
    const { getDocumentThumbnail } = await import('./imageOptimization');
    const { updateDocument } = await import('./database');
    getDocumentThumbnail(id, newFilePath, format, fileName.replace(/\.[^/.]+$/, ''))
      .then((thumbnailPath) => {
        if (thumbnailPath) {
          // Update document with thumbnail path
          updateDocument(id, { coverImagePath: thumbnailPath }).catch(console.error);
        }
      })
      .catch((error) => {
        console.warn('Error generating thumbnail:', error);
      });

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
      coverImagePath: null, // Will be updated when thumbnail is generated
      extractedText: text || undefined, // Store extracted text for FTS5 search
    };

    // Ensure database is initialized before inserting
    await waitForDatabase();
    
    // Save to database
    await insertDocument(document);
    console.log(`Document saved to database: ${document.title} (${document.id})`);

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
      extractedText: text || undefined, // Store extracted text for FTS5 search
    };

    // Ensure database is initialized before inserting
    await waitForDatabase();
    
    await insertDocument(document);
    console.log(`Document saved to database: ${document.title} (${document.id})`);
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
