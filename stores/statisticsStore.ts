/**
 * Zustand store for reading statistics
 */

import { create } from 'zustand';
import { ReadingStats, ReadingSession, getReadingStats, getDocumentSessions, getDailyReadingTime } from '@/services/readingStatistics';

interface StatisticsStore {
  stats: ReadingStats | null;
  isLoading: boolean;
  error: string | null;
  dailyReadingTime: Array<{ date: string; seconds: number }>;
  
  // Actions
  loadStats: () => Promise<void>;
  loadDailyReadingTime: (days?: number) => Promise<void>;
  getDocumentSessions: (documentId: string) => Promise<ReadingSession[]>;
  refreshStats: () => Promise<void>;
}

export const useStatisticsStore = create<StatisticsStore>((set, get) => ({
  stats: null,
  isLoading: false,
  error: null,
  dailyReadingTime: [],

  loadStats: async () => {
    set({ isLoading: true, error: null });
    try {
      const stats = await getReadingStats();
      set({ stats, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load statistics',
        isLoading: false,
      });
    }
  },

  loadDailyReadingTime: async (days = 30) => {
    try {
      const data = await getDailyReadingTime(days);
      set({ dailyReadingTime: data });
    } catch (error) {
      console.error('Error loading daily reading time:', error);
    }
  },

  getDocumentSessions: async (documentId: string) => {
    try {
      return await getDocumentSessions(documentId);
    } catch (error) {
      console.error('Error getting document sessions:', error);
      return [];
    }
  },

  refreshStats: async () => {
    await get().loadStats();
    await get().loadDailyReadingTime();
  },
}));
