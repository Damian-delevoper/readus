/**
 * App-wide constants
 */

export const COLORS = {
  primary: {
    50: '#f5f3f0',
    100: '#e8e3dc',
    200: '#d4c9bb',
    300: '#b8a894',
    400: '#9d8a70',
    500: '#88755d',
    600: '#6f5f4d',
    700: '#5a4d40',
    800: '#4d4237',
    900: '#433a31',
  },
  background: {
    light: '#ffffff',
    dark: '#1a1a1a',
    sepia: '#f4e8d8',
  },
} as const;

export const READING_SPEED = 200; // words per minute

export const WORDS_PER_PAGE = 250; // average words per page

export const MIN_FONT_SIZE = 12;
export const MAX_FONT_SIZE = 24;
export const DEFAULT_FONT_SIZE = 16;

export const MIN_LINE_SPACING = 1.0;
export const MAX_LINE_SPACING = 2.5;
export const DEFAULT_LINE_SPACING = 1.5;

export const MIN_MARGIN = 10;
export const MAX_MARGIN = 40;
export const DEFAULT_MARGIN = 20;
