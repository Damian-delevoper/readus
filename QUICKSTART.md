# Quick Start Guide

## Installation

1. **Install dependencies:**
```bash
npm install
```

2. **Start Expo development server:**
```bash
npm start
```

3. **Run on your device/simulator:**
   - Press `i` for iOS simulator
   - Press `a` for Android emulator
   - Scan QR code with Expo Go app on physical device

## First Run

1. The app will automatically:
   - Initialize SQLite database
   - Create documents directory
   - Load default settings

2. **Import your first document:**
   - Tap the `+` button in the Library screen
   - Select a PDF, EPUB, TXT, or DOCX file
   - The document will be imported and appear in your library

## Using the App

### Library Screen
- View all your documents
- Filter by status: All, Reading, Finished, Unread
- Tap a document to open it

### Reader Screen
- Swipe to navigate pages (PDF) or scroll (text)
- Tap settings icon to customize appearance
- Tap eye icon to enter focus mode
- Long-press text to create highlights (basic implementation)

### Highlights & Notes
- View all your highlights and notes
- Filter by type
- Tap to jump to document location

### Search
- Search across all documents, highlights, and notes
- Results show context snippets
- Tap to navigate to location

### Settings
- Customize reader appearance
- Adjust font size, spacing, margins
- Change theme (Light, Dark, Sepia)
- Toggle preferences

## Development

### Project Structure
- `app/` - Screens (Expo Router)
- `components/` - Reusable UI components
- `services/` - Business logic
- `stores/` - State management (Zustand)
- `types/` - TypeScript definitions

### Key Files
- `services/database.ts` - All database operations
- `services/documentImport.ts` - Document import logic
- `stores/` - State management stores
- `app/(tabs)/index.tsx` - Main library screen
- `app/reader/[id].tsx` - Document reader

### Adding Features

**To add a new screen:**
1. Create file in `app/` directory
2. Add route in navigation if needed

**To add a new service:**
1. Create file in `services/` directory
2. Export functions/types
3. Import where needed

**To add a new store:**
1. Create file in `stores/` directory
2. Use Zustand `create()` function
3. Export hook for components

## Troubleshooting

### Database Errors
- Database initializes on first app launch
- If issues occur, delete app and reinstall (development only)

### PDF Not Rendering
- Ensure `react-native-pdf` native modules are properly linked
- May require rebuilding native code: `npx expo prebuild`

### Import Fails
- Check file permissions
- Ensure file format is supported
- Check available storage space

### TypeScript Errors
- Run `npx expo install --fix` to ensure compatible versions
- Clear cache: `npx expo start -c`

## Next Steps

1. **Add Assets**: Add `icon.png`, `splash.png`, etc. to `assets/` directory
2. **Enhance Text Extraction**: Integrate EPUB/DOCX parsers
3. **Improve Search**: Implement SQLite FTS5 for better search
4. **Add AI Features**: Integrate AI service for summarization
5. **Add OCR**: Integrate OCR service for scanned documents

## Production Build

```bash
# iOS
eas build --platform ios

# Android
eas build --platform android
```

See [Expo documentation](https://docs.expo.dev) for detailed build instructions.
