/**
 * DOCX Parser Service
 * Handles DOCX file parsing and content extraction
 */

import * as FileSystemLegacy from 'expo-file-system/legacy';
import mammoth from 'mammoth';

export interface DOCXMetadata {
  title: string;
  author: string;
  subject: string;
  keywords: string;
  created: string;
  modified: string;
}

export interface DOCXContent {
  metadata: DOCXMetadata;
  html: string;
  text: string;
}

/**
 * Parse DOCX file and extract content
 * DOCX files are ZIP archives containing XML files
 */
export async function parseDOCX(filePath: string): Promise<DOCXContent> {
  try {
    // Read DOCX file
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
    
    // Convert base64 to ArrayBuffer for mammoth
    let arrayBuffer: ArrayBuffer;
    if (typeof Buffer !== 'undefined' && (Buffer as any).from) {
      const buffer = (Buffer as any).from(base64Data, 'base64');
      arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    } else {
      // Manual conversion
      const binaryString = typeof global !== 'undefined' && (global as any).atob 
        ? (global as any).atob(base64Data)
        : (Buffer as any).from(base64Data, 'base64').toString('binary');
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      arrayBuffer = bytes.buffer;
    }
    
    // Parse DOCX with mammoth
    const result = await mammoth.extractRawText({ arrayBuffer });
    const htmlResult = await mammoth.convertToHtml({ arrayBuffer });
    
    // Extract metadata (mammoth doesn't extract metadata by default, so we'll use defaults)
    const metadata: DOCXMetadata = {
      title: 'Unknown DOCX',
      author: 'Unknown',
      subject: '',
      keywords: '',
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
    };
    
    return {
      metadata,
      html: htmlResult.value,
      text: result.value,
    };
  } catch (error) {
    console.error('Error parsing DOCX:', error);
    // Return default structure on error
    return {
      metadata: {
        title: 'Unknown DOCX',
        author: 'Unknown',
        subject: '',
        keywords: '',
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
      },
      html: '<p>Error parsing DOCX file. The file may be corrupted or in an unsupported format.</p>',
      text: 'Error parsing DOCX file. The file may be corrupted or in an unsupported format.',
    };
  }
}

/**
 * Extract text content from DOCX
 */
export async function extractDOCXText(filePath: string): Promise<string> {
  try {
    const content = await parseDOCX(filePath);
    return content.text;
  } catch (error) {
    console.error('Error extracting DOCX text:', error);
    return '';
  }
}

/**
 * Extract HTML content from DOCX
 */
export async function extractDOCXHTML(filePath: string): Promise<string> {
  try {
    const content = await parseDOCX(filePath);
    return content.html;
  } catch (error) {
    console.error('Error extracting DOCX HTML:', error);
    return '';
  }
}

/**
 * Get DOCX metadata
 */
export async function getDOCXMetadata(filePath: string): Promise<DOCXMetadata> {
  try {
    const content = await parseDOCX(filePath);
    return content.metadata;
  } catch (error) {
    console.error('Error getting DOCX metadata:', error);
    return {
      title: 'Unknown DOCX',
      author: 'Unknown',
      subject: '',
      keywords: '',
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
    };
  }
}
