/**
 * Zustand store for highlights and notes
 */

import { create } from 'zustand';
import { Highlight, Note, HighlightType } from '@/types';
import {
  getHighlightsByDocumentId,
  getAllHighlights,
  insertHighlight,
  deleteHighlight as deleteHighlightFromDB,
  getNotesByDocumentId,
  getAllNotes,
  insertNote,
  updateNote as updateNoteInDB,
  deleteNote as deleteNoteFromDB,
} from '@/services/database';

interface HighlightStore {
  highlights: Highlight[];
  notes: Note[];
  isLoading: boolean;
  error: string | null;

  // Actions
  loadHighlights: (documentId?: string) => Promise<void>;
  loadNotes: (documentId?: string) => Promise<void>;
  addHighlight: (highlight: Omit<Highlight, 'id' | 'createdAt'>) => Promise<void>;
  deleteHighlight: (id: string) => Promise<void>;
  addNote: (note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateNote: (id: string, text: string) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
}

export const useHighlightStore = create<HighlightStore>((set, get) => ({
  highlights: [],
  notes: [],
  isLoading: false,
  error: null,

  loadHighlights: async (documentId) => {
    set({ isLoading: true, error: null });
    try {
      const highlights = documentId
        ? await getHighlightsByDocumentId(documentId)
        : await getAllHighlights();
      set({ highlights, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load highlights',
        isLoading: false,
      });
    }
  },

  loadNotes: async (documentId) => {
    set({ isLoading: true, error: null });
    try {
      const notes = documentId
        ? await getNotesByDocumentId(documentId)
        : await getAllNotes();
      set({ notes, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load notes',
        isLoading: false,
      });
    }
  },

  addHighlight: async (highlightData) => {
    try {
      const highlight: Highlight = {
        ...highlightData,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date().toISOString(),
      };
      await insertHighlight(highlight);
      await get().loadHighlights(highlightData.documentId);
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to add highlight',
      });
    }
  },

  deleteHighlight: async (id) => {
    try {
      await deleteHighlightFromDB(id);
      await get().loadHighlights();
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete highlight',
      });
    }
  },

  addNote: async (noteData) => {
    try {
      const note: Note = {
        ...noteData,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await insertNote(note);
      await get().loadNotes(noteData.documentId);
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to add note',
      });
    }
  },

  updateNote: async (id, text) => {
    try {
      await updateNoteInDB(id, text);
      await get().loadNotes();
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update note',
      });
    }
  },

  deleteNote: async (id) => {
    try {
      await deleteNoteFromDB(id);
      await get().loadNotes();
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete note',
      });
    }
  },
}));
