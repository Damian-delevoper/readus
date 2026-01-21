# ReadUs Architecture

## Overview

ReadUs is built as a local-first, production-ready document reader app using React Native (Expo), TypeScript, and SQLite.

## Tech Stack

- **Framework**: React Native with Expo (~51.0.0)
- **Language**: TypeScript (strict mode)
- **State Management**: Zustand
- **Navigation**: Expo Router (file-based routing)
- **Storage**: 
  - SQLite (expo-sqlite) for metadata
  - File System (expo-file-system) for documents
- **Styling**: NativeWind (Tailwind CSS for React Native)
- **PDF Rendering**: react-native-pdf
- **Icons**: Custom SVG components (react-native-svg)

## Project Structure

```
readus/
├── app/                    # Expo Router screens (file-based routing)
│   ├── _layout.tsx        # Root layout with database initialization
│   ├── (tabs)/            # Bottom tab navigation group
│   │   ├── _layout.tsx   # Tab navigation configuration
│   │   ├── index.tsx     # Library screen (main)
│   │   ├── highlights.tsx # Highlights & Notes view
│   │   ├── search.tsx    # Global search
│   │   └── settings.tsx  # App settings
│   └── reader/
│       └── [id].tsx      # Dynamic route for document reader
├── components/            # Reusable UI components
│   ├── DocumentCard.tsx  # Document card for library
│   ├── EmptyState.tsx    # Empty state component
│   └── Icons.tsx         # Custom SVG icons
├── services/              # Business logic layer
│   ├── database.ts       # SQLite operations
│   ├── documentImport.ts # Document import & processing
│   ├── ai.ts             # AI service interface (placeholder)
│   └── ocr.ts            # OCR service interface (placeholder)
├── stores/                # Zustand state management
│   ├── documentStore.ts  # Document library state
│   ├── readerStore.ts    # Reader settings & preferences
│   ├── highlightStore.ts # Highlights & notes state
│   └── searchStore.ts    # Search state
├── types/                 # TypeScript type definitions
│   └── index.ts          # All app types
└── utils/                 # Utility functions
    └── constants.ts       # App constants

```

## Data Architecture

### Database Schema

**documents**
- Stores document metadata
- Fields: id, title, filePath, format, status, pageCount, wordCount, etc.
- Indexed on: status, title

**tags**
- User-created tags for organization
- Fields: id, name, color, createdAt

**document_tags**
- Many-to-many relationship between documents and tags
- Foreign keys with CASCADE delete

**reading_positions**
- Tracks last read position per document
- Fields: id, documentId, position, progress, updatedAt
- Indexed on: documentId

**highlights**
- Text highlights with types (idea, definition, quote)
- Fields: id, documentId, type, text, startPosition, endPosition, color
- Indexed on: documentId

**notes**
- Notes linked to documents or highlights
- Fields: id, documentId, highlightId, text, position, createdAt, updatedAt
- Indexed on: documentId, highlightId

### File Storage

Documents are stored in: `{FileSystem.documentDirectory}documents/`
- Each document gets a unique ID
- Original filename preserved in metadata
- Files copied from picker/share to app directory

## State Management (Zustand)

### Document Store
- Manages document library
- Handles CRUD operations
- Tracks current document
- Auto-refreshes on changes

### Reader Store
- Reader settings (font, spacing, theme, margins)
- Focus mode toggle
- Persists to AsyncStorage
- Default settings provided

### Highlight Store
- Manages highlights and notes
- Supports filtering by document
- CRUD operations for highlights/notes

### Search Store
- Global search state
- Searches across documents, highlights, notes
- Returns unified SearchResult type

## Features Implementation

### 1. Document Import
- **File Picker**: Uses expo-document-picker
- **Supported Formats**: PDF, EPUB, TXT, DOCX
- **Processing**:
  - Extracts text (basic for TXT, placeholders for others)
  - Calculates word count
  - Estimates reading time (200 WPM)
  - Estimates page count (250 words/page)
- **Storage**: Files copied to app directory, metadata in SQLite

### 2. Library System
- **Views**: All, Reading, Finished, Unread
- **Status Management**: Tracks reading progress
- **Metadata Display**: Page count, reading time, last opened
- **Sorting**: By last opened (default), with extensibility for others

### 3. Reading Experience
- **PDF Rendering**: react-native-pdf with pagination
- **Text Rendering**: ScrollView with selectable text (for TXT)
- **Customization**:
  - Font size (12-24px)
  - Line spacing (1.0-2.5)
  - Margins (10-40px)
  - Themes: Light, Dark, Sepia
- **Focus Mode**: Hides UI for distraction-free reading
- **Position Tracking**: Saves reading position automatically

### 4. Highlights & Notes
- **Highlight Types**: Idea, Definition, Quote
- **Text Selection**: Basic implementation (can be enhanced)
- **Notes**: Can be standalone or linked to highlights
- **Global View**: All highlights/notes in one place
- **Export Ready**: Structure supports Markdown export

### 5. Global Search
- **Full-Text Search**: SQL LIKE queries (can be enhanced with FTS)
- **Scope**: Documents (title), Highlights (text), Notes (text)
- **Results**: Unified SearchResult type with context snippets
- **Navigation**: Direct links to document locations

### 6. Settings
- **Reader Appearance**: All customization options
- **Preferences**: Auto-backup, biometric lock (UI only)
- **Persistence**: Settings saved to AsyncStorage

## Navigation

### Expo Router Structure
- **Root**: `app/_layout.tsx` - Initializes database
- **Tabs**: `app/(tabs)/_layout.tsx` - Bottom tab navigation
  - Library (index)
  - Highlights
  - Search
  - Settings
- **Reader**: `app/reader/[id].tsx` - Dynamic route for documents

### Navigation Flow
1. Library → Select document → Reader screen
2. Search → Select result → Reader screen
3. Highlights → Select item → Reader screen
4. Reader → Back → Previous screen

## Future Enhancements

### Ready for Implementation
1. **EPUB Parsing**: Structure ready, needs EPUB library integration
2. **DOCX Extraction**: Placeholder ready, needs DOCX parser
3. **PDF Text Extraction**: Enhanced text extraction for search
4. **Full-Text Search**: SQLite FTS5 for better search performance
5. **AI Integration**: Service interfaces defined, ready for API integration
6. **OCR**: Service interface ready for camera/document scanning
7. **Cloud Sync**: Abstracted interface ready for provider implementation
8. **Export**: Markdown/plain text export of highlights and notes

### UI/UX Improvements
- Enhanced text selection for highlights
- Better PDF text extraction
- EPUB reader with proper formatting
- Tag management UI
- Document organization (folders/collections)
- Reading statistics

## Code Quality

- **TypeScript**: Strict mode enabled
- **Modular**: Clear separation of concerns
- **Reusable**: Components and utilities are reusable
- **Type-Safe**: All operations are typed
- **Error Handling**: Try-catch blocks with user-friendly errors
- **Comments**: Key decisions and complex logic documented

## Performance Considerations

- **Local-First**: No network dependency for core features
- **Indexed Queries**: Database indexes on frequently queried fields
- **Lazy Loading**: Documents loaded on demand
- **Efficient Storage**: Files stored efficiently, metadata in SQLite
- **State Management**: Zustand provides efficient re-renders

## Security & Privacy

- **Local Storage**: All data stored locally
- **No Cloud by Default**: User data never leaves device
- **Biometric Lock**: UI ready for implementation
- **File Access**: Scoped to app directory

## Development Notes

- Icons use custom SVG components (no external icon library dependency)
- PDF rendering requires native modules (handled by expo)
- Text extraction is basic - can be enhanced with specialized libraries
- Search uses SQL LIKE - can be upgraded to FTS5 for better performance
- All async operations properly handled with error boundaries
