/**
 * PDF Text Extractor Service
 * Extracts text content from PDF files for search indexing
 */

import * as FileSystemLegacy from 'expo-file-system/legacy';

// pdf-parse is a Node.js library that doesn't work in React Native/Metro bundler
// PDF text extraction is disabled for now
// Future implementation options:
// 1. Use react-native-pdf's text extraction API if available
// 2. Server-side processing
// 3. Native module for PDF text extraction
const pdfParse: any = null;

export interface PDFTextData {
  text: string;
  numPages: number;
  info: {
    Title?: string;
    Author?: string;
    Subject?: string;
    Creator?: string;
    Producer?: string;
    CreationDate?: string;
    ModDate?: string;
  };
  metadata: {
    [key: string]: any;
  };
}

/**
 * Extract text from PDF file
 * Note: pdf-parse requires Buffer, which may not be available in React Native
 * This implementation handles both Node.js and React Native environments
 */
export async function extractPDFText(filePath: string): Promise<string> {
  if (!pdfParse) {
    console.warn('pdf-parse is not available. PDF text extraction disabled.');
    return '';
  }
  try {
    // Read PDF file
    let fileUri = filePath;
    if (!filePath.startsWith('file://') && !filePath.startsWith('/')) {
      fileUri = `${FileSystemLegacy.documentDirectory || ''}${filePath}`;
    }
    if (!fileUri.startsWith('file://')) {
      fileUri = `file://${fileUri}`;
    }
    
    const base64Data = await FileSystemLegacy.readAsStringAsync(fileUri, {
      encoding: FileSystemLegacy.EncodingType.Base64,
    });
    
    // Convert base64 to Buffer for pdf-parse
    let buffer: Buffer;
    if (typeof Buffer !== 'undefined' && (Buffer as any).from) {
      buffer = (Buffer as any).from(base64Data, 'base64');
    } else {
      // Fallback: manual conversion
      const binaryString = typeof global !== 'undefined' && (global as any).atob 
        ? (global as any).atob(base64Data)
        : '';
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      // Convert Uint8Array to Buffer-like object
      buffer = bytes as any;
    }
    
    // Parse PDF
    const data = await (pdfParse.default || pdfParse)(buffer);
    return data.text || '';
  } catch (error) {
    console.error('Error extracting PDF text:', error);
    // Return empty string on error - PDFs can still be viewed natively
    return '';
  }
}

/**
 * Extract full PDF data including metadata
 */
export async function extractPDFData(filePath: string): Promise<PDFTextData | null> {
  if (!pdfParse) {
    console.warn('pdf-parse is not available. PDF data extraction disabled.');
    return null;
  }
  try {
    // Read PDF file
    let fileUri = filePath;
    if (!filePath.startsWith('file://') && !filePath.startsWith('/')) {
      fileUri = `${FileSystemLegacy.documentDirectory || ''}${filePath}`;
    }
    if (!fileUri.startsWith('file://')) {
      fileUri = `file://${fileUri}`;
    }
    
    const base64Data = await FileSystemLegacy.readAsStringAsync(fileUri, {
      encoding: FileSystemLegacy.EncodingType.Base64,
    });
    
    // Convert base64 to Buffer
    let buffer: Buffer;
    if (typeof Buffer !== 'undefined' && (Buffer as any).from) {
      buffer = (Buffer as any).from(base64Data, 'base64');
    } else {
      const binaryString = typeof global !== 'undefined' && (global as any).atob 
        ? (global as any).atob(base64Data)
        : '';
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      buffer = bytes as any;
    }
    
    // Parse PDF
    const data = await (pdfParse.default || pdfParse)(buffer);
    
    return {
      text: data.text || '',
      numPages: data.numpages || 0,
      info: data.info || {},
      metadata: data.metadata || {},
    };
  } catch (error) {
    console.error('Error extracting PDF data:', error);
    return null;
  }
}

/**
 * Get PDF metadata only (faster than full extraction)
 */
export async function getPDFMetadata(filePath: string): Promise<PDFTextData['info'] | null> {
  try {
    const data = await extractPDFData(filePath);
    return data?.info || null;
  } catch (error) {
    console.error('Error getting PDF metadata:', error);
    return null;
  }
}
