# Scriptum

A production-ready personal document reader & library app for iOS and Android.

## Overview

Scriptum is a local-first, distraction-free document reader that helps you read, organize, annotate, and understand your personal documents. Think Notion × Kindle × Apple Books — but better.

## Features

### Core Features

- **Document Import**: Import PDF, EPUB, TXT, and DOCX files from file system or share menu
- **Smart Library**: Organize documents with status (unread, reading, finished), tags, and metadata
- **Premium Reader**: Customizable reading experience with themes, font size, spacing, and focus mode
- **Highlights & Notes**: Create highlights with types (idea, definition, quote) and attach notes
- **Global Search**: Full-text search across documents, highlights, and notes
- **Local-First**: All data stored locally with SQLite, no network dependency

### Technical Features

- React Native with Expo
- TypeScript with strict mode
- Zustand for state management
- Expo Router for navigation
- SQLite for local storage
- NativeWind (Tailwind) for styling
- PDF rendering with react-native-pdf

## Getting Started

### Prerequisites

- Node.js 18+
- Expo CLI
- iOS Simulator (for iOS) or Android Emulator (for Android)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm start
```

3. Run on your platform:
```bash
npm run ios     # For iOS
npm run android # For Android
```

## Project Structure

```
scriptum/
├── app/                    # Expo Router screens
│   ├── (tabs)/            # Bottom tab navigation
│   │   ├── index.tsx      # Library screen
│   │   ├── highlights.tsx # Highlights & Notes
│   │   ├── search.tsx     # Global search
│   │   └── settings.tsx   # Settings
│   ├── reader/            # Document reader
│   │   └── [id].tsx       # Reader screen
│   └── _layout.tsx        # Root layout
├── components/            # Reusable components
├── services/              # Business logic
│   ├── database.ts        # SQLite operations
│   ├── documentImport.ts  # Document import
│   ├── ai.ts              # AI service (placeholder)
│   └── ocr.ts             # OCR service (placeholder)
├── stores/                # Zustand stores
│   ├── documentStore.ts   # Document management
│   ├── readerStore.ts     # Reader settings
│   ├── highlightStore.ts # Highlights & notes
│   └── searchStore.ts     # Search state
├── types/                 # TypeScript types
└── utils/                 # Utility functions
```

## Architecture

### Local-First Design

All documents and metadata are stored locally using:
- **File System**: Documents stored in app's document directory
- **SQLite**: Metadata, highlights, notes, and reading positions

### State Management

Zustand stores manage:
- Document library and current document
- Reader settings and preferences
- Highlights and notes
- Search state

### Database Schema

- `documents`: Document metadata
- `tags`: User-created tags
- `document_tags`: Many-to-many relationship
- `reading_positions`: Last read position per document
- `highlights`: Text highlights with types
- `notes`: Notes linked to documents or highlights

## Development

### Code Quality

- Strict TypeScript
- Modular architecture
- Reusable components
- Clear separation of concerns

### Future Enhancements

- AI integration (summarization, explanation, simplification)
- OCR for scanned documents
- Cloud sync (abstracted interface ready)
- EPUB parsing
- DOCX text extraction
- Export highlights/notes to Markdown

## License

Private project - All rights reserved
