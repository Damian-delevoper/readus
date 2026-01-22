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
  toggleFavorite as toggleFavoriteInDB,
  waitForDatabase,
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
  updateDocumentPageCount: (id: string, pageCount: number) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
  removeFromLibrary: (id: string) => Promise<void>;
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
      // Ensure database is initialized before loading
      await waitForDatabase();
      const documents = await getAllDocuments();
      console.log(`Loaded ${documents.length} documents from database`);
      set({ documents, isLoading: false });
    } catch (error) {
      console.error('Error loading documents:', error);
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

  updateDocumentPageCount: async (id, pageCount) => {
    try {
      await updateDocument(id, { pageCount, updatedAt: new Date().toISOString() });
      set((state) => ({
        documents: state.documents.map((doc) =>
          doc.id === id ? { ...doc, pageCount } : doc
        ),
        currentDocument: state.currentDocument?.id === id
          ? { ...state.currentDocument, pageCount }
          : state.currentDocument,
      }));
      console.log(`Document ${id} page count updated to ${pageCount} in store and DB.`);
    } catch (error) {
      console.error('Error updating document page count:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to update document page count',
      });
    }
  },

  toggleFavorite: async (id) => {
    try {
      const newStatus = await toggleFavoriteInDB(id);
      set((state) => ({
        documents: state.documents.map((doc) =>
          doc.id === id ? { ...doc, isFavorite: newStatus } : doc
        ),
        currentDocument: state.currentDocument?.id === id
          ? { ...state.currentDocument, isFavorite: newStatus }
          : state.currentDocument,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to toggle favorite',
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

  removeFromLibrary: async (id) => {
    try {
      // Only remove from database, keep the file on device
      await deleteDocumentFromDB(id);
      await get().refreshDocuments();
      
      // Clear current document if it was removed
      if (get().currentDocument?.id === id) {
        set({ currentDocument: null });
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to remove document from library',
      });
    }
  },

  refreshDocuments: async () => {
    await get().loadDocuments();
  },
}));
