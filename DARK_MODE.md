# Dark Mode Implementation

Dark mode has been fully implemented across the entire ReadUs app.

## Features

### App-Wide Dark Mode
- **System Theme Support**: Automatically follows system theme when set to "System"
- **Manual Override**: Choose Light, Dark, or System in Settings
- **Persistent**: Theme preference is saved and restored on app launch
- **Real-time Updates**: Theme changes apply immediately across all screens

### Themed Components

All screens and components now support dark mode:

- ✅ **Library Screen** - Document cards, filters, headers
- ✅ **Highlights & Notes Screen** - Cards, tabs, content
- ✅ **Search Screen** - Search bar, results, headers
- ✅ **Settings Screen** - All controls and sections
- ✅ **Document Cards** - Background, text, borders
- ✅ **Empty States** - Text colors
- ✅ **Tab Bar** - Background and icon colors

### Theme Colors

**Light Mode:**
- Background: `#ffffff`
- Surface: `#f5f3f0`
- Text: `#1a1a1a`
- Primary: `#88755d`

**Dark Mode:**
- Background: `#1a1a1a`
- Surface: `#2a2a2a`
- Text: `#ffffff`
- Primary: `#b8a894`

## How to Use

1. **Open Settings** - Tap the Settings tab
2. **Find "App Theme"** - In the Appearance section
3. **Choose Theme**:
   - **Light** - Always light mode
   - **Dark** - Always dark mode
   - **System** - Follows device theme

## Implementation Details

- Theme state managed by `useThemeStore` (Zustand)
- Colors defined in `stores/themeStore.ts`
- All components use `useThemeStore` hook to access colors
- System theme changes are automatically detected
- Theme preference persisted in AsyncStorage

## Reader Theme vs App Theme

- **App Theme**: Controls the entire app UI (library, settings, etc.)
- **Reader Theme**: Controls only the document reader screen (separate setting)

Both can be configured independently in Settings.
