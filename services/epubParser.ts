/**
 * EPUB Parser Service
 * Handles EPUB file parsing and content extraction
 */

import * as FileSystemLegacy from 'expo-file-system/legacy';
import { DocumentFormat } from '@/types';
import JSZip from 'jszip';

export interface EPUBMetadata {
  title: string;
  author: string;
  description: string;
  language: string;
  publisher: string;
  date: string;
  coverImage?: string;
}

export interface EPUBChapter {
  id: string;
  title: string;
  href: string;
  order: number;
}

export interface EPUBContent {
  metadata: EPUBMetadata;
  chapters: EPUBChapter[];
  text: string;
  toc: EPUBChapter[];
}

/**
 * Parse EPUB file and extract content
 * EPUB files are ZIP archives containing HTML/CSS/XML files
 */
export async function parseEPUB(filePath: string): Promise<EPUBContent> {
  try {
    // Read EPUB file as binary
    // Handle both file:// URIs and regular paths
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
    
    // Convert base64 to binary (React Native compatible)
    // Use Buffer if available, otherwise manual conversion
    let bytes: Uint8Array;
    if (typeof Buffer !== 'undefined' && (Buffer as any).from) {
      bytes = new Uint8Array((Buffer as any).from(base64Data, 'base64'));
    } else {
      // Manual base64 decoding for React Native
      let binaryString: string;
      if (typeof global !== 'undefined' && (global as any).atob) {
        binaryString = (global as any).atob(base64Data);
      } else if (typeof Buffer !== 'undefined') {
        binaryString = (Buffer as any).from(base64Data, 'base64').toString('binary');
      } else {
        // Fallback: simple base64 decode (may not work for all cases)
        throw new Error('Base64 decoding not available. Please ensure Buffer or atob is available.');
      }
      bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
    }
    
    // Load ZIP file
    const zip = await JSZip.loadAsync(bytes);
    
    // Find and parse OPF file (package document)
    let opfFile: string | null = null;
    const containerXml = await zip.file('META-INF/container.xml')?.async('string');
    
    if (containerXml) {
      // Parse container.xml to find OPF file path
      const opfMatch = containerXml.match(/full-path="([^"]+)"/);
      if (opfMatch) {
        opfFile = opfMatch[1];
      }
    }
    
    // Default OPF location if not found in container
    if (!opfFile) {
      opfFile = 'OEBPS/content.opf';
      if (!zip.file(opfFile)) {
        // Try common alternatives
        const possiblePaths = ['content.opf', 'package.opf', 'book.opf'];
        for (const path of possiblePaths) {
          if (zip.file(path)) {
            opfFile = path;
            break;
          }
        }
      }
    }
    
    // Parse OPF for metadata and manifest
    let metadata: EPUBMetadata = {
      title: 'Unknown EPUB',
      author: 'Unknown',
      description: '',
      language: 'en',
      publisher: '',
      date: new Date().toISOString(),
    };
    
    let chapters: EPUBChapter[] = [];
    let textContent = '';
    
    if (opfFile && zip.file(opfFile)) {
      const opfContent = await zip.file(opfFile)?.async('string');
      if (opfContent) {
        // Parse metadata from OPF
        const titleMatch = opfContent.match(/<dc:title[^>]*>([^<]+)<\/dc:title>/i);
        if (titleMatch) metadata.title = titleMatch[1].trim();
        
        const authorMatch = opfContent.match(/<dc:creator[^>]*>([^<]+)<\/dc:creator>/i);
        if (authorMatch) metadata.author = authorMatch[1].trim();
        
        const descMatch = opfContent.match(/<dc:description[^>]*>([^<]+)<\/dc:description>/i);
        if (descMatch) metadata.description = descMatch[1].trim();
        
        const langMatch = opfContent.match(/<dc:language[^>]*>([^<]+)<\/dc:language>/i);
        if (langMatch) metadata.language = langMatch[1].trim();
        
        const pubMatch = opfContent.match(/<dc:publisher[^>]*>([^<]+)<\/dc:publisher>/i);
        if (pubMatch) metadata.publisher = pubMatch[1].trim();
        
        const dateMatch = opfContent.match(/<dc:date[^>]*>([^<]+)<\/dc:date>/i);
        if (dateMatch) metadata.date = dateMatch[1].trim();
        
        // Extract cover image
        const coverMatch = opfContent.match(/<meta[^>]*name=["']cover["'][^>]*content=["']([^"']+)["']/i);
        if (coverMatch) {
          const coverId = coverMatch[1];
          const coverItemMatch = opfContent.match(new RegExp(`<item[^>]*id=["']${coverId}["'][^>]*href=["']([^"']+)["']`, 'i'));
          if (coverItemMatch) {
            metadata.coverImage = coverItemMatch[1];
          }
        }
        
        // Extract manifest items (chapters/content files)
        const itemMatches = opfContent.matchAll(/<item[^>]*id=["']([^"']+)["'][^>]*href=["']([^"']+)["'][^>]*media-type=["']([^"']+)["']/gi);
        const opfDir = opfFile.substring(0, opfFile.lastIndexOf('/') + 1);
        
        let order = 1;
        for (const match of itemMatches) {
          const [, id, href, mediaType] = match;
          if (mediaType === 'application/xhtml+xml' || mediaType === 'text/html') {
            const fullPath = href.startsWith('/') ? href.substring(1) : `${opfDir}${href}`;
            chapters.push({
              id,
              title: `Chapter ${order}`,
              href: fullPath,
              order: order++,
            });
          }
        }
        
        // Extract text from HTML content files
        const textParts: string[] = [];
        for (const chapter of chapters) {
          try {
            const htmlFile = zip.file(chapter.href);
            if (htmlFile) {
              const htmlContent = await htmlFile.async('string');
              // Basic HTML to text extraction (remove tags)
              const text = htmlContent
                .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                .replace(/<[^>]+>/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
              textParts.push(text);
            }
          } catch (error) {
            console.warn(`Error extracting text from ${chapter.href}:`, error);
          }
        }
        textContent = textParts.join('\n\n');
      }
    }
    
    // Parse NCX for better TOC if available
    let toc: EPUBChapter[] = chapters;
    const ncxFiles = Object.keys(zip.files).filter(name => name.endsWith('.ncx'));
    if (ncxFiles.length > 0) {
      try {
        const ncxContent = await zip.file(ncxFiles[0])?.async('string');
        if (ncxContent) {
          const navPointMatches = ncxContent.matchAll(/<navPoint[^>]*id=["']([^"']+)["'][^>]*>[\s\S]*?<navLabel>[\s\S]*?<text>([^<]+)<\/text>[\s\S]*?<\/navLabel>[\s\S]*?<content[^>]*src=["']([^"']+)["']/gi);
          toc = [];
          let tocOrder = 1;
          for (const match of navPointMatches) {
            const [, id, title, src] = match;
            toc.push({
              id,
              title: title.trim(),
              href: src,
              order: tocOrder++,
            });
          }
        }
      } catch (error) {
        console.warn('Error parsing NCX:', error);
      }
    }
    
    return {
      metadata,
      chapters,
      text: textContent || 'No text content extracted from EPUB.',
      toc: toc.length > 0 ? toc : chapters,
    };
  } catch (error) {
    console.error('Error parsing EPUB:', error);
    // Return default structure on error
    return {
      metadata: {
        title: 'Unknown EPUB',
        author: 'Unknown',
        description: '',
        language: 'en',
        publisher: '',
        date: new Date().toISOString(),
      },
      chapters: [],
      text: 'Error parsing EPUB file. The file may be corrupted or in an unsupported format.',
      toc: [],
    };
  }
}

/**
 * Extract text content from EPUB
 */
export async function extractEPUBText(filePath: string): Promise<string> {
  try {
    const content = await parseEPUB(filePath);
    return content.text;
  } catch (error) {
    console.error('Error extracting EPUB text:', error);
    return '';
  }
}

/**
 * Get EPUB metadata
 */
export async function getEPUBMetadata(filePath: string): Promise<EPUBMetadata> {
  try {
    const content = await parseEPUB(filePath);
    return content.metadata;
  } catch (error) {
    console.error('Error getting EPUB metadata:', error);
    return {
      title: 'Unknown EPUB',
      author: 'Unknown',
      description: '',
      language: 'en',
      publisher: '',
      date: new Date().toISOString(),
    };
  }
}

/**
 * Get EPUB table of contents
 */
export async function getEPUBTOC(filePath: string): Promise<EPUBChapter[]> {
  try {
    const content = await parseEPUB(filePath);
    return content.toc;
  } catch (error) {
    console.error('Error getting EPUB TOC:', error);
    return [];
  }
}

/**
 * Get HTML content for a specific EPUB chapter
 */
export async function getEPUBChapterContent(filePath: string, chapterHref: string): Promise<string> {
  try {
    // Read EPUB file as binary
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
    
    // Convert base64 to binary
    let bytes: Uint8Array;
    if (typeof Buffer !== 'undefined' && (Buffer as any).from) {
      bytes = new Uint8Array((Buffer as any).from(base64Data, 'base64'));
    } else {
      let binaryString: string;
      if (typeof global !== 'undefined' && (global as any).atob) {
        binaryString = (global as any).atob(base64Data);
      } else if (typeof Buffer !== 'undefined') {
        binaryString = (Buffer as any).from(base64Data, 'base64').toString('binary');
      } else {
        throw new Error('Base64 decoding not available.');
      }
      bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
    }
    
    // Load ZIP file
    const zip = await JSZip.loadAsync(bytes);
    
    // Find OPF file to resolve relative paths
    let opfFile: string | null = null;
    const containerXml = await zip.file('META-INF/container.xml')?.async('string');
    
    if (containerXml) {
      const opfMatch = containerXml.match(/full-path="([^"]+)"/);
      if (opfMatch) {
        opfFile = opfMatch[1];
      }
    }
    
    if (!opfFile) {
      opfFile = 'OEBPS/content.opf';
      if (!zip.file(opfFile)) {
        const possiblePaths = ['content.opf', 'package.opf', 'book.opf'];
        for (const path of possiblePaths) {
          if (zip.file(path)) {
            opfFile = path;
            break;
          }
        }
      }
    }
    
    // Resolve chapter path relative to OPF directory
    const opfDir = opfFile ? opfFile.substring(0, opfFile.lastIndexOf('/') + 1) : '';
    const chapterPath = chapterHref.startsWith('/') 
      ? chapterHref.substring(1) 
      : `${opfDir}${chapterHref}`;
    
    // Get chapter HTML content
    const htmlFile = zip.file(chapterPath);
    if (!htmlFile) {
      // Try alternative paths
      const altPaths = [
        chapterHref,
        chapterHref.replace(/^\.\.\//, ''),
        chapterHref.replace(/^\.\//, ''),
      ];
      for (const altPath of altPaths) {
        const altFile = zip.file(altPath);
        if (altFile) {
          return await altFile.async('string');
        }
      }
      throw new Error(`Chapter file not found: ${chapterHref}`);
    }
    
    return await htmlFile.async('string');
  } catch (error) {
    console.error(`Error getting EPUB chapter content for ${chapterHref}:`, error);
    throw error;
  }
}
