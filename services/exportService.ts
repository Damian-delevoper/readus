/**
 * Export Service
 * Handles exporting highlights, notes, and documents
 */

import * as FileSystemLegacy from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Highlight, Note, Document } from '@/types';
import { getAllHighlights, getAllNotes, getDocumentById } from './database';

export interface ExportOptions {
  format: 'markdown' | 'pdf' | 'txt';
  includeHighlights: boolean;
  includeNotes: boolean;
  includeDocumentInfo: boolean;
}

/**
 * Export highlights and notes to Markdown
 */
export async function exportToMarkdown(
  documentId: string | null,
  options: Partial<ExportOptions> = {}
): Promise<string> {
  const opts: ExportOptions = {
    format: 'markdown',
    includeHighlights: true,
    includeNotes: true,
    includeDocumentInfo: true,
    ...options,
  };

  let markdown = '';

  // Get document info if needed
  let document: Document | null = null;
  if (documentId && opts.includeDocumentInfo) {
    document = await getDocumentById(documentId);
    if (document) {
      markdown += `# ${document.title}\n\n`;
      markdown += `**Format:** ${document.format.toUpperCase()}\n`;
      markdown += `**Pages:** ${document.pageCount}\n`;
      markdown += `**Words:** ${document.wordCount}\n`;
      markdown += `**Created:** ${new Date(document.createdAt).toLocaleDateString()}\n\n`;
      markdown += '---\n\n';
    }
  }

  // Get highlights
  if (opts.includeHighlights) {
    const highlights = documentId
      ? await getAllHighlights().then(hs => hs.filter(h => h.documentId === documentId))
      : await getAllHighlights();

    if (highlights.length > 0) {
      markdown += '## Highlights\n\n';
      for (const highlight of highlights) {
        if (documentId && highlight.documentId !== documentId) continue;
        
        const doc = document || await getDocumentById(highlight.documentId);
        markdown += `### ${highlight.type.charAt(0).toUpperCase() + highlight.type.slice(1)}\n\n`;
        if (doc && !documentId) {
          markdown += `*From: ${doc.title}*\n\n`;
        }
        markdown += `> ${highlight.text}\n\n`;
        markdown += `*Page ${highlight.startPosition}*\n\n`;
        markdown += '---\n\n';
      }
    }
  }

  // Get notes
  if (opts.includeNotes) {
    const notes = documentId
      ? await getAllNotes().then(ns => ns.filter(n => n.documentId === documentId))
      : await getAllNotes();

    if (notes.length > 0) {
      markdown += '## Notes\n\n';
      for (const note of notes) {
        if (documentId && note.documentId !== documentId) continue;
        
        const doc = document || await getDocumentById(note.documentId);
        if (doc && !documentId) {
          markdown += `### ${doc.title}\n\n`;
        }
        markdown += `${note.text}\n\n`;
        markdown += `*Created: ${new Date(note.createdAt).toLocaleDateString()}*\n\n`;
        markdown += '---\n\n';
      }
    }
  }

  return markdown;
}

/**
 * Export to file and share
 */
export async function exportAndShare(
  content: string,
  filename: string,
  mimeType: string = 'text/markdown'
): Promise<void> {
  try {
    const fileUri = `${FileSystemLegacy.cacheDirectory}${filename}`;
    await FileSystemLegacy.writeAsStringAsync(fileUri, content);

    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(fileUri, {
        mimeType,
        dialogTitle: 'Export',
      });
    } else {
      throw new Error('Sharing is not available on this device');
    }
  } catch (error) {
    console.error('Error exporting and sharing:', error);
    throw error;
  }
}

/**
 * Export highlights and notes for a document
 */
export async function exportDocumentHighlights(documentId: string): Promise<void> {
  const markdown = await exportToMarkdown(documentId, {
    includeHighlights: true,
    includeNotes: true,
    includeDocumentInfo: true,
  });

  const document = await getDocumentById(documentId);
  const filename = `${document?.title || 'export'}-highlights.md`;
  await exportAndShare(markdown, filename, 'text/markdown');
}

/**
 * Export all highlights and notes
 */
export async function exportAllHighlights(): Promise<void> {
  const markdown = await exportToMarkdown(null, {
    includeHighlights: true,
    includeNotes: true,
    includeDocumentInfo: true,
  });

  await exportAndShare(markdown, 'all-highlights-notes.md', 'text/markdown');
}

/**
 * Backup database (export as JSON)
 */
export async function backupDatabase(): Promise<string> {
  const { getAllDocuments } = await import('./database');
  const documents = await getAllDocuments();
  const highlights = await getAllHighlights();
  const notes = await getAllNotes();

  const backup = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    documents,
    highlights,
    notes,
  };

  return JSON.stringify(backup, null, 2);
}

/**
 * Share document file
 */
export async function shareDocument(document: Document): Promise<void> {
  try {
    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(document.filePath, {
        dialogTitle: `Share ${document.title}`,
      });
    } else {
      throw new Error('Sharing is not available on this device');
    }
  } catch (error) {
    console.error('Error sharing document:', error);
    throw error;
  }
}
