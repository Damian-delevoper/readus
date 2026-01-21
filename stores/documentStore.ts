/**
 * Zustand store for document management
 */

import { create } from 'zustand';
import { Document, DocumentStatus } from '@/types';
import {
  getAllDocuments,
  getDocumentById,
  updateDocument,
  deleteDocument as deleteDocumentFromDB,
} from '@/services/database';
import { deleteDocumentFile } from '@/services/documentImport';

interface DocumentStore {
  documents: Document[];
  currentDocument: Document | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadDocuments: () => Promise<void>;
  setCurrentDocument: (document: Document | null) => void;
  updateDocumentStatus: (id: string, status: DocumentStatus) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
  refreshDocuments: () => Promise<void>;
}

export const useDocumentStore = create<DocumentStore>((set, get) => ({
  documents: [],
  currentDocument: null,
  isLoading: false,
  error: null,

  loadDocuments: async () => {
    set({ isLoading: true, error: null });
    try {
      const documents = await getAllDocuments();
      set({ documents, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load documents',
        isLoading: false,
      });
    }
  },

  setCurrentDocument: (document) => {
    set({ currentDocument: document });
  },

  updateDocumentStatus: async (id, status) => {
    try {
      await updateDocument(id, { status, updatedAt: new Date().toISOString() });
      await get().refreshDocuments();
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update document status',
      });
    }
  },

  deleteDocument: async (id) => {
    try {
      const document = await getDocumentById(id);
      if (document) {
        await deleteDocumentFile(document.filePath);
        await deleteDocumentFromDB(id);
        await get().refreshDocuments();
        
        // Clear current document if it was deleted
        if (get().currentDocument?.id === id) {
          set({ currentDocument: null });
        }
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete document',
      });
    }
  },

  refreshDocuments: async () => {
    await get().loadDocuments();
  },
}));
