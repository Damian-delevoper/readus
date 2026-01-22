/**
 * Zustand store for collections management
 */

import { create } from 'zustand';
import { Collection, Document } from '@/types';
import {
  getAllCollections,
  getCollectionById,
  getCollectionsByParentId,
  insertCollection,
  updateCollection,
  deleteCollection,
  addDocumentToCollection,
  removeDocumentFromCollection,
  getCollectionDocuments,
  getDocumentCollections,
  waitForDatabase,
} from '@/services/database';

interface CollectionStore {
  collections: Collection[];
  currentCollection: Collection | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadCollections: () => Promise<void>;
  createCollection: (name: string, color?: string, icon?: string, parentId?: string | null) => Promise<Collection | null>;
  updateCollectionName: (id: string, name: string) => Promise<void>;
  deleteCollectionById: (id: string) => Promise<void>;
  setCurrentCollection: (collection: Collection | null) => void;
  addDocument: (collectionId: string, documentId: string) => Promise<void>;
  removeDocument: (collectionId: string, documentId: string) => Promise<void>;
  getDocuments: (collectionId: string) => Promise<Document[]>;
  getCollectionsForDocument: (documentId: string) => Promise<Collection[]>;
  refreshCollections: () => Promise<void>;
}

export const useCollectionStore = create<CollectionStore>((set, get) => ({
  collections: [],
  currentCollection: null,
  isLoading: false,
  error: null,

  loadCollections: async () => {
    set({ isLoading: true, error: null });
    try {
      await waitForDatabase();
      const collections = await getAllCollections();
      set({ collections, isLoading: false });
    } catch (error) {
      console.error('Error loading collections:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to load collections',
        isLoading: false,
      });
    }
  },

  createCollection: async (name, color, icon, parentId) => {
    try {
      await waitForDatabase();
      const id = `collection-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const collection: Collection = {
        id,
        name,
        color: color || null,
        icon: icon || null,
        parentId: parentId || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await insertCollection(collection);
      await get().refreshCollections();
      return collection;
    } catch (error) {
      console.error('Error creating collection:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to create collection',
      });
      return null;
    }
  },

  updateCollectionName: async (id, name) => {
    try {
      await updateCollection(id, { name });
      await get().refreshCollections();
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update collection',
      });
    }
  },

  deleteCollectionById: async (id) => {
    try {
      await deleteCollection(id);
      await get().refreshCollections();
      if (get().currentCollection?.id === id) {
        set({ currentCollection: null });
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete collection',
      });
    }
  },

  setCurrentCollection: (collection) => {
    set({ currentCollection: collection });
  },

  addDocument: async (collectionId, documentId) => {
    try {
      await addDocumentToCollection(collectionId, documentId);
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to add document to collection',
      });
    }
  },

  removeDocument: async (collectionId, documentId) => {
    try {
      await removeDocumentFromCollection(collectionId, documentId);
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to remove document from collection',
      });
    }
  },

  getDocuments: async (collectionId) => {
    try {
      return await getCollectionDocuments(collectionId);
    } catch (error) {
      console.error('Error getting collection documents:', error);
      return [];
    }
  },

  getCollectionsForDocument: async (documentId) => {
    try {
      return await getDocumentCollections(documentId);
    } catch (error) {
      console.error('Error getting document collections:', error);
      return [];
    }
  },

  refreshCollections: async () => {
    await get().loadCollections();
  },
}));
