/**
 * Zustand store for search functionality
 */

import { create } from 'zustand';
import { SearchResult } from '@/types';
import {
  searchDocuments,
  searchHighlights,
  searchNotes,
  getDocumentById,
} from '@/services/database';

interface SearchStore {
  query: string;
  results: SearchResult[];
  isLoading: boolean;
  error: string | null;

  // Actions
  search: (query: string) => Promise<void>;
  clearSearch: () => void;
}

export const useSearchStore = create<SearchStore>((set) => ({
  query: '',
  results: [],
  isLoading: false,
  error: null,

  search: async (query) => {
    if (!query.trim()) {
      set({ results: [], query: '' });
      return;
    }

    set({ isLoading: true, error: null, query });

    try {
      const [documents, highlights, notes] = await Promise.all([
        searchDocuments(query),
        searchHighlights(query),
        searchNotes(query),
      ]);

      const results: SearchResult[] = [];

      // Add document results
      for (const doc of documents) {
        results.push({
          type: 'document',
          id: doc.id,
          documentId: doc.id,
          documentTitle: doc.title,
          text: doc.title,
          snippet: doc.title,
        });
      }

      // Add highlight results
      for (const highlight of highlights) {
        const doc = await getDocumentById(highlight.documentId);
        const snippet = highlight.text.substring(0, 100);
        results.push({
          type: 'highlight',
          id: highlight.id,
          documentId: highlight.documentId,
          documentTitle: doc?.title || 'Unknown',
          text: highlight.text,
          snippet: snippet.length < highlight.text.length ? `${snippet}...` : snippet,
          position: highlight.startPosition,
        });
      }

      // Add note results
      for (const note of notes) {
        const doc = await getDocumentById(note.documentId);
        const snippet = note.text.substring(0, 100);
        results.push({
          type: 'note',
          id: note.id,
          documentId: note.documentId,
          documentTitle: doc?.title || 'Unknown',
          text: note.text,
          snippet: snippet.length < note.text.length ? `${snippet}...` : snippet,
          position: note.position,
        });
      }

      set({ results, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Search failed',
        isLoading: false,
      });
    }
  },

  clearSearch: () => {
    set({ query: '', results: [] });
  },
}));
