/**
 * Zustand store for app-wide theme management
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';

export type AppTheme = 'light' | 'dark' | 'system';

const THEME_KEY = '@readus:app_theme';

interface ThemeStore {
  theme: AppTheme;
  resolvedTheme: 'light' | 'dark';
  isLoading: boolean;

  // Actions
  loadTheme: () => Promise<void>;
  setTheme: (theme: AppTheme) => Promise<void>;
  updateResolvedTheme: () => void;
}

// Get system color scheme
const getSystemColorScheme = (): 'light' | 'dark' => {
  const colorScheme = Appearance.getColorScheme();
  return colorScheme === 'dark' ? 'dark' : 'light';
};

export const useThemeStore = create<ThemeStore>((set, get) => {
  // Initialize with system theme
  const initialResolvedTheme = getSystemColorScheme();

  // Listen to system theme changes
  const appearanceListener = Appearance.addChangeListener(() => {
    const store = get();
    if (store.theme === 'system') {
      store.updateResolvedTheme();
    }
  });

  return {
    theme: 'system',
    resolvedTheme: initialResolvedTheme,
    isLoading: false,

    loadTheme: async () => {
      set({ isLoading: true });
      try {
        const stored = await AsyncStorage.getItem(THEME_KEY);
        const theme = (stored as AppTheme) || 'system';
        set({ theme, isLoading: false });
        get().updateResolvedTheme();
      } catch (error) {
        console.error('Error loading theme:', error);
        set({ isLoading: false });
      }
    },

    setTheme: async (theme) => {
      set({ theme });
      get().updateResolvedTheme();
      try {
        await AsyncStorage.setItem(THEME_KEY, theme);
      } catch (error) {
        console.error('Error saving theme:', error);
      }
    },

    updateResolvedTheme: () => {
      const { theme } = get();
      
      if (theme === 'system') {
        set({ resolvedTheme: getSystemColorScheme() });
      } else {
        set({ resolvedTheme: theme });
      }
    },
  };
});

// Theme colors
export const lightColors = {
  background: '#ffffff',
  surface: '#f5f3f0',
  text: '#1a1a1a',
  textSecondary: '#6f5f4d',
  border: '#e8e3dc',
  primary: '#88755d',
  primaryLight: '#9d8a70',
  card: '#ffffff',
  error: '#d32f2f',
};

export const darkColors = {
  background: '#1a1a1a',
  surface: '#2a2a2a',
  text: '#ffffff',
  textSecondary: '#b0b0b0',
  border: '#404040',
  primary: '#b8a894',
  primaryLight: '#d4c9bb',
  card: '#2a2a2a',
  error: '#f44336',
};
