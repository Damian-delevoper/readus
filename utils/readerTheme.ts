/**
 * Reader Theme Utilities
 * Provides theme colors for the reader based on ReaderTheme
 */

import { ReaderTheme } from '@/types';

export const readerThemeColors = {
  light: {
    background: '#faf8f5',
    text: '#2c2c2c',
    textSecondary: '#6f5f4d',
    border: '#e8e3dc',
    surface: '#f5f3f0',
  },
  dark: {
    background: '#1a1a1a',
    text: '#ffffff',
    textSecondary: '#b0b0b0',
    border: '#404040',
    surface: '#2a2a2a',
  },
  sepia: {
    background: '#f4e8d8',
    text: '#2c2c2c',
    textSecondary: '#6f5f4d',
    border: '#d4c4b0',
    surface: '#ede4d6',
  },
};

export function getReaderThemeColors(theme: ReaderTheme) {
  return readerThemeColors[theme];
}

export const highlightColors = {
  idea: '#ffd700', // Yellow
  definition: '#4fc3f7', // Blue
  quote: '#81c784', // Green
};
