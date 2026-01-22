/**
 * Image Optimization Service
 * Handles thumbnail generation, compression, and caching
 */

import * as FileSystem from 'expo-file-system';
import * as FileSystemLegacy from 'expo-file-system/legacy';
import { Platform } from 'react-native';

// Use documentDirectory for thumbnails (cacheDirectory may not be available in all versions)
const THUMBNAILS_DIR = `${FileSystemLegacy.documentDirectory || ''}thumbnails/`;
const THUMBNAIL_WIDTH = 200;
const THUMBNAIL_HEIGHT = 300;
const THUMBNAIL_QUALITY = 0.8;

/**
 * Initialize thumbnails directory
 */
export async function initThumbnailsDirectory(): Promise<void> {
  try {
    const dirInfo = await FileSystemLegacy.getInfoAsync(THUMBNAILS_DIR);
    if (!dirInfo.exists) {
      await FileSystemLegacy.makeDirectoryAsync(THUMBNAILS_DIR, { intermediates: true });
    }
  } catch (error) {
    console.error('Error creating thumbnails directory:', error);
  }
}

/**
 * Generate thumbnail path for a document
 */
export function getThumbnailPath(documentId: string): string {
  return `${THUMBNAILS_DIR}${documentId}.jpg`;
}

/**
 * Check if thumbnail exists
 */
export async function thumbnailExists(documentId: string): Promise<boolean> {
  try {
    const thumbnailPath = getThumbnailPath(documentId);
    const fileInfo = await FileSystemLegacy.getInfoAsync(thumbnailPath);
    return fileInfo.exists;
  } catch (error) {
    return false;
  }
}

/**
 * Generate thumbnail from PDF first page
 */
export async function generatePDFThumbnail(
  pdfPath: string,
  documentId: string
): Promise<string | null> {
  try {
    await initThumbnailsDirectory();
    
    // For PDFs, we'll use react-native-pdf to render the first page
    // This is a placeholder - actual implementation would use the PDF library
    // to render page 1 to an image
    
    // For now, return null - this will be implemented when PDF rendering is available
    // The actual implementation would:
    // 1. Load PDF first page using react-native-pdf
    // 2. Render to image using expo-image-manipulator or similar
    // 3. Save compressed thumbnail
    
    console.log(`PDF thumbnail generation for ${documentId} - placeholder`);
    return null;
  } catch (error) {
    console.error('Error generating PDF thumbnail:', error);
    return null;
  }
}

/**
 * Extract and save cover image from EPUB
 */
export async function extractEPUBCover(
  epubPath: string,
  documentId: string
): Promise<string | null> {
  try {
    await initThumbnailsDirectory();
    
    // EPUB cover extraction would be done in epubParser
    // This is a placeholder that would:
    // 1. Parse EPUB metadata to find cover image
    // 2. Extract cover image from EPUB archive
    // 3. Resize and compress
    // 4. Save as thumbnail
    
    console.log(`EPUB cover extraction for ${documentId} - placeholder`);
    return null;
  } catch (error) {
    console.error('Error extracting EPUB cover:', error);
    return null;
  }
}

/**
 * Generate a default thumbnail based on document format
 */
export async function generateDefaultThumbnail(
  documentId: string,
  format: string,
  title: string
): Promise<string | null> {
  try {
    await initThumbnailsDirectory();
    
    // Generate a simple colored thumbnail with format icon
    // This would use react-native-svg or similar to create a placeholder
    // For now, return null - UI will handle missing thumbnails
    
    console.log(`Default thumbnail generation for ${documentId} - placeholder`);
    return null;
  } catch (error) {
    console.error('Error generating default thumbnail:', error);
    return null;
  }
}

/**
 * Get or generate thumbnail for a document
 */
export async function getDocumentThumbnail(
  documentId: string,
  filePath: string,
  format: string,
  title: string
): Promise<string | null> {
  try {
    // Check if thumbnail already exists
    if (await thumbnailExists(documentId)) {
      return getThumbnailPath(documentId);
    }
    
    // Generate thumbnail based on format
    let thumbnailPath: string | null = null;
    
    if (format === 'pdf') {
      thumbnailPath = await generatePDFThumbnail(filePath, documentId);
    } else if (format === 'epub') {
      thumbnailPath = await extractEPUBCover(filePath, documentId);
    }
    
    // Fallback to default thumbnail
    if (!thumbnailPath) {
      thumbnailPath = await generateDefaultThumbnail(documentId, format, title);
    }
    
    return thumbnailPath;
  } catch (error) {
    console.error('Error getting document thumbnail:', error);
    return null;
  }
}

/**
 * Clear thumbnail cache
 */
export async function clearThumbnailCache(): Promise<void> {
  try {
    const dirInfo = await FileSystemLegacy.getInfoAsync(THUMBNAILS_DIR);
    if (dirInfo.exists) {
      await FileSystemLegacy.deleteAsync(THUMBNAILS_DIR, { idempotent: true });
      await initThumbnailsDirectory();
    }
  } catch (error) {
    console.error('Error clearing thumbnail cache:', error);
  }
}

/**
 * Delete thumbnail for a specific document
 */
export async function deleteThumbnail(documentId: string): Promise<void> {
  try {
    const thumbnailPath = getThumbnailPath(documentId);
    const fileInfo = await FileSystemLegacy.getInfoAsync(thumbnailPath);
    if (fileInfo.exists) {
      await FileSystemLegacy.deleteAsync(thumbnailPath, { idempotent: true });
    }
  } catch (error) {
    console.error('Error deleting thumbnail:', error);
  }
}

/**
 * Get cache size
 */
export async function getThumbnailCacheSize(): Promise<number> {
  try {
    const dirInfo = await FileSystemLegacy.getInfoAsync(THUMBNAILS_DIR);
    if (!dirInfo.exists) {
      return 0;
    }
    
    // Calculate total size of thumbnails
    // This would require listing all files and summing their sizes
    // For now, return 0 as placeholder
    return 0;
  } catch (error) {
    console.error('Error getting cache size:', error);
    return 0;
  }
}
