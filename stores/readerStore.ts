/**
 * Zustand store for reader settings and state
 */

import { create } from 'zustand';
import { ReaderSettings, ReaderTheme } from '@/types';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SETTINGS_KEY = '@readus:reader_settings';

const defaultSettings: ReaderSettings = {
  fontSize: 16,
  lineSpacing: 1.5,
  margin: 20,
  theme: 'light',
  defaultHighlightColor: '#ffd700',
  autoBackup: false,
  biometricLock: false,
  fontFamily: 'System', // Default to system font
  readingMode: 'page', // Default to page mode
  autoScrollSpeed: 200, // Default auto-scroll speed (WPM)
};

interface ReaderStore {
  settings: ReaderSettings;
  isFocusMode: boolean;
  isLoading: boolean;

  // Actions
  loadSettings: () => Promise<void>;
  updateSettings: (updates: Partial<ReaderSettings>) => Promise<void>;
  setTheme: (theme: ReaderTheme) => Promise<void>;
  setFontSize: (size: number) => Promise<void>;
  setLineSpacing: (spacing: number) => Promise<void>;
  setMargin: (margin: number) => Promise<void>;
  toggleFocusMode: () => void;
}

export const useReaderStore = create<ReaderStore>((set, get) => ({
  settings: defaultSettings,
  isFocusMode: false,
  isLoading: false,

  loadSettings: async () => {
    set({ isLoading: true });
    try {
      const stored = await AsyncStorage.getItem(SETTINGS_KEY);
      if (stored) {
        const settings = JSON.parse(stored) as ReaderSettings;
        set({ settings, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      set({ isLoading: false });
    }
  },

  updateSettings: async (updates) => {
    const newSettings = { ...get().settings, ...updates };
    set({ settings: newSettings });
    try {
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  },

  setTheme: async (theme) => {
    await get().updateSettings({ theme });
  },

  setFontSize: async (size) => {
    await get().updateSettings({ fontSize: size });
  },

  setLineSpacing: async (spacing) => {
    await get().updateSettings({ lineSpacing: spacing });
  },

  setMargin: async (margin) => {
    await get().updateSettings({ margin });
  },

  toggleFocusMode: () => {
    set((state) => ({ isFocusMode: !state.isFocusMode }));
  },
}));
