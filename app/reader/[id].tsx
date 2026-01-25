/**
 * Document reader screen
 */

import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
  Alert,
  Animated,
  AccessibilityInfo,
  PanResponder,
  Dimensions,
  useWindowDimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable } from 'react-native-gesture-handler';
import { Platform, AppState } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { XIcon, SettingsIcon, EyeIcon, EyeOffIcon, ListIcon, BookmarkIcon } from '@/components/Icons';
import { TOCModal } from '@/components/TOCModal';
import { ReaderTopBar } from '@/components/ReaderTopBar';
import { ReaderBottomBar } from '@/components/ReaderBottomBar';
import { ReaderSettingsModal } from '@/components/ReaderSettings';
import { TextSelectionMenu } from '@/components/TextSelectionMenu';
import { ReaderOptionsMenu } from '@/components/ReaderOptionsMenu';
import { useDocumentStore } from '@/stores/documentStore';
import { useReaderStore } from '@/stores/readerStore';
import { useHighlightStore } from '@/stores/highlightStore';
import { getDocumentById, getReadingPosition, upsertReadingPosition, updateDocument, insertBookmark, getBookmarksByDocumentId, deleteBookmark } from '@/services/database';
import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system';
import * as FileSystemLegacy from 'expo-file-system/legacy';
import { startReadingSession, endReadingSession } from '@/services/readingStatistics';
import { Bookmark } from '@/types';
import { Document, HighlightType } from '@/types';
import { parseEPUB, getEPUBTOC, getEPUBChapterContent, EPUBChapter, EPUBContent } from '@/services/epubParser';
import { parseDOCX, DOCXContent } from '@/services/docxParser';
import RenderHTML from 'react-native-render-html';
import { useThemeStore, lightColors, darkColors } from '@/stores/themeStore';
import { HighlightedText } from '@/utils/textRenderer';
import { getReaderThemeColors, highlightColors } from '@/utils/readerTheme';
import { HighlightTypeSelector } from '@/components/HighlightTypeSelector';
import { NoteModal } from '@/components/NoteModal';

// Conditional import for react-native-pdf (native only, not for web)
let Pdf: any = null;
if (Platform.OS !== 'web') {
  try {
    Pdf = require('react-native-pdf').default;
    console.log('react-native-pdf loaded successfully');
  } catch (e) {
    console.warn('react-native-pdf not available:', e);
  }
} else {
  console.log('Skipping react-native-pdf import on web');
}

export default function ReaderScreen() {
  const { id, position: initialPositionParam } = useLocalSearchParams<{ id: string; position?: string }>();
  const router = useRouter();
  const pdfRef = useRef<any>(null);
  const epubScrollRef = useRef<ScrollView>(null);
  const resolvedTheme = useThemeStore((state) => state.resolvedTheme);
  const colors = resolvedTheme === 'dark' ? darkColors : lightColors;
  const { width: screenWidth } = useWindowDimensions();

  const { setCurrentDocument, refreshDocuments, updateDocumentPageCount } = useDocumentStore();
  const { settings, isFocusMode, toggleFocusMode, updateSettings } = useReaderStore();
  const { addHighlight, addNote, loadNotes } = useHighlightStore();

  // Check for accessibility settings
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((isEnabled) => {
      if (isEnabled) {
        // Disable animations if reduce motion is enabled
        console.log('Reduce motion enabled - animations disabled');
      }
    }).catch(() => {
      // AccessibilityInfo may not be available on all platforms
    });
  }, []);

  const [document, setDocument] = useState<Document | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [showHighlightModal, setShowHighlightModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [selectionPosition, setSelectionPosition] = useState({ x: 0, y: 0 });
  const [showSelectionToolbar, setShowSelectionToolbar] = useState(false);
  const [highlightType, setHighlightType] = useState<HighlightType>('idea');
  const [isTTSPlaying, setIsTTSPlaying] = useState(false);
  const [ttsRate, setTTSRate] = useState(1.0);
  const [ttsPitch, setTTSPitch] = useState(1.0);
  const [noteText, setNoteText] = useState('');
  const [showManualTextInput, setShowManualTextInput] = useState(false);
  const [manualTextInput, setManualTextInput] = useState('');
  const [textContent, setTextContent] = useState<string>('');
  const [loadingContent, setLoadingContent] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [highlightPopover, setHighlightPopover] = useState<{ highlight: any; note: any | null; position: { x: number; y: number } } | null>(null);
  const [totalPages, setTotalPages] = useState<number | null>(null);
  const [maxPageSeen, setMaxPageSeen] = useState<number>(1);
  const [epubContent, setEpubContent] = useState<EPUBContent | null>(null);
  const [currentChapter, setCurrentChapter] = useState<number>(0);
  const [epubChapters, setEpubChapters] = useState<EPUBChapter[]>([]);
  const [showTOC, setShowTOC] = useState(false);
  const [docxContent, setDocxContent] = useState<DOCXContent | null>(null);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [readingSessionId, setReadingSessionId] = useState<string | null>(null);
  const [sessionStartPage, setSessionStartPage] = useState<number>(1);
  const [uiVisible, setUiVisible] = useState(false); // Start hidden - fullscreen by default
  const [hideTimer, setHideTimer] = useState<NodeJS.Timeout | null>(null);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [aiResult, setAiResult] = useState<{ title: string; text: string } | null>(null);
  const [readingSpeed, setReadingSpeed] = useState<number>(0);
  const [sessionStartTime, setSessionStartTime] = useState<number>(Date.now());
  const pageTransitionAnim = useRef(new Animated.Value(0)).current;
  const swipeX = useRef(new Animated.Value(0)).current;
  const [isTransitioning, setIsTransitioning] = useState(false);
  const scrollDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Handler refs to be set later (after document loads)
  const handlePreviousPageRef = useRef<(() => void) | null>(null);
  const handleNextPageRef = useRef<(() => void) | null>(null);

  // Swipe gesture handler for text documents - must be defined before any early returns
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only respond to horizontal swipes
        return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 10;
      },
      onPanResponderMove: (_, gestureState) => {
        // Animate swipe
        swipeX.setValue(gestureState.dx);
      },
      onPanResponderRelease: (_, gestureState) => {
        const { dx, vx } = gestureState;
        const screenWidth = Dimensions.get('window').width;
        const swipeThreshold = screenWidth * 0.25; // 25% of screen width
        const velocityThreshold = 0.5;

        // Reset swipe animation
        Animated.spring(swipeX, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 8,
        }).start();

        // Determine if swipe was significant enough
        if (Math.abs(dx) > swipeThreshold || Math.abs(vx) > velocityThreshold) {
          if (dx > 0) {
            // Swipe right - previous page
            handlePreviousPageRef.current?.();
          } else {
            // Swipe left - next page
            handleNextPageRef.current?.();
          }
        }
      },
    })
  ).current;

  useEffect(() => {
    loadDocument();
  }, [id]);

  // Single tap to show/hide UI, auto-hide after 3-4 seconds
  const toggleUI = () => {
    const newVisible = !uiVisible;
    setUiVisible(newVisible);
    
    if (newVisible) {
      // Auto-hide after 3 seconds
      if (hideTimer) {
        clearTimeout(hideTimer);
      }
      const timer = setTimeout(() => {
        setUiVisible(false);
      }, 3000);
      setHideTimer(timer);
    } else {
      if (hideTimer) {
        clearTimeout(hideTimer);
      }
    }
  };

  // Clear timers on unmount
  useEffect(() => {
    return () => {
      if (hideTimer) {
        clearTimeout(hideTimer);
      }
      if (scrollDebounceTimerRef.current) {
        clearTimeout(scrollDebounceTimerRef.current);
      }
    };
  }, [hideTimer]);

  // Calculate reading speed (WPM)
  useEffect(() => {
    if (!document || !readingSessionId) return;

    const updateReadingSpeed = () => {
      const now = Date.now();
      const timeElapsed = (now - sessionStartTime) / 1000 / 60; // minutes
      
      // Calculate pages read based on document format
      let pagesRead = 0;
      if (document.format === 'epub' && epubChapters.length > 0) {
        pagesRead = Math.max(0, currentChapter - (sessionStartPage - 1));
      } else {
        pagesRead = Math.max(0, currentPage - sessionStartPage);
      }
      
      const wordsRead = pagesRead * 250; // Estimate: 250 words per page
      
      if (timeElapsed > 0) {
        const wpm = Math.round(wordsRead / timeElapsed);
        setReadingSpeed(wpm);
      }
    };

    const interval = setInterval(updateReadingSpeed, 5000); // Update every 5 seconds
    updateReadingSpeed(); // Initial calculation

    return () => clearInterval(interval);
  }, [document, readingSessionId, currentPage, sessionStartPage, sessionStartTime]);

  // Calculate time remaining
  const calculateTimeRemaining = (): number | undefined => {
    if (!document || readingSpeed === 0 || readingSpeed < 50) return undefined;
    
    let pagesRemaining = 0;
    if (document.format === 'epub' && epubChapters.length > 0) {
      pagesRemaining = Math.max(0, epubChapters.length - (currentChapter + 1));
    } else {
      const currentTotalPages = totalPages !== null ? totalPages : (document.pageCount || 1);
      pagesRemaining = Math.max(0, currentTotalPages - currentPage);
    }
    
    const wordsRemaining = pagesRemaining * 250; // Estimate: 250 words per page
    const minutesRemaining = Math.ceil(wordsRemaining / readingSpeed);
    
    return minutesRemaining > 0 ? minutesRemaining : undefined;
  };

  const timeRemaining = calculateTimeRemaining();

  // Save reading position on app background/close
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        // Save current reading position
        if (document) {
          if (document.format === 'epub' && epubChapters.length > 0) {
            await saveReadingPosition(currentChapter);
          } else {
            await saveReadingPosition(currentPage);
          }
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [document, currentPage, currentChapter, epubChapters.length]);

  // Cleanup: end reading session and stop TTS when component unmounts
  useEffect(() => {
    return () => {
      // Save reading position on unmount (fire and forget)
      if (document) {
        if (document.format === 'epub' && epubChapters.length > 0) {
          saveReadingPosition(currentChapter).catch(console.error);
        } else {
          saveReadingPosition(currentPage).catch(console.error);
        }
      }
      
      if (readingSessionId && document) {
        let pagesRead = 0;
        if (document.format === 'epub' && epubChapters.length > 0) {
          pagesRead = Math.max(0, currentChapter - (sessionStartPage - 1));
        } else {
          pagesRead = Math.max(0, currentPage - sessionStartPage);
        }
        const wordsRead = pagesRead * 250;
        endReadingSession(readingSessionId, pagesRead, wordsRead).catch(console.error);
      }
      // Stop TTS if playing
      if (isTTSPlaying) {
        import('@/services/textToSpeech').then(({ ttsService }) => {
          ttsService.stop().catch(console.error);
        });
      }
    };
  }, [readingSessionId, document, currentPage, currentChapter, sessionStartPage, isTTSPlaying, epubChapters.length]);

  useEffect(() => {
    if (document) {
      loadBookmarks();
      loadHighlights();
    }
  }, [document]);

  const [highlights, setHighlights] = useState<any[]>([]);

  const loadHighlights = async () => {
    if (!document) return;
    try {
      const { getHighlightsByDocumentId } = await import('@/services/database');
      const docsHighlights = await getHighlightsByDocumentId(document.id);
      setHighlights(docsHighlights);
    } catch (error) {
      console.error('Error loading highlights:', error);
    }
  };

  const loadBookmarks = async () => {
    if (!document) return;
    try {
      const docsBookmarks = await getBookmarksByDocumentId(document.id);
      setBookmarks(docsBookmarks);
    } catch (error) {
      console.error('Error loading bookmarks:', error);
    }
  };

  const handleAddBookmark = async () => {
    if (!document) return;
    const bookmarkId = `bookmark-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const bookmark: Bookmark = {
      id: bookmarkId,
      documentId: document.id,
      page: currentPage,
      note: null,
      createdAt: new Date().toISOString(),
    };
    await insertBookmark(bookmark);
    await loadBookmarks();
  };

  const handleRemoveBookmark = async (bookmarkId: string) => {
    await deleteBookmark(bookmarkId);
    await loadBookmarks();
  };

  const isBookmarked = bookmarks.some(b => b.page === currentPage);

  const loadDocument = async () => {
    if (!id) {
      console.error('No document ID provided');
      setError('No document ID provided');
      setIsLoading(false);
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      console.log('Loading document with ID:', id);
      
      const doc = await getDocumentById(id);
      console.log('Document loaded:', doc ? { id: doc.id, title: doc.title, format: doc.format, filePath: doc.filePath } : 'null');
      
      if (!doc) {
        console.error('Document not found for ID:', id);
        setError(`Document not found (ID: ${id})`);
        setIsLoading(false);
        return;
      }
      
      // Check if file exists (using legacy API to avoid deprecation warnings)
      if (doc.filePath) {
        try {
          const fileInfo = await FileSystemLegacy.getInfoAsync(doc.filePath);
          if (!fileInfo.exists) {
            console.error('Document file does not exist:', doc.filePath);
            setError(`Document file not found: ${doc.title}`);
            setIsLoading(false);
            return;
          }
          console.log('Document file exists:', doc.filePath);
        } catch (fileError) {
          console.error('Error checking file existence:', fileError);
          // Continue anyway - file might be accessible
        }
      }
      
      setDocument(doc);
      setCurrentDocument(doc);
      // Initialize totalPages - for PDFs, start with null so we know to update from onLoadComplete
      // For other formats, use document.pageCount
      setTotalPages(doc.format === 'pdf' ? null : (doc.pageCount || 1));
      setMaxPageSeen(doc.format === 'pdf' ? (doc.pageCount || 1) : 1);
      
      // Load reading position
      // Priority: 1) URL param (from highlights/search), 2) Saved position, 3) Default (page 1)
      try {
        let initialPage = 1;
        let initialChapter = 0;
        let initialScrollY = 0;
        
        // Check if position was passed via navigation (from highlights/search)
        if (initialPositionParam) {
          const navPosition = parseInt(initialPositionParam, 10);
          if (!isNaN(navPosition) && navPosition > 0) {
            if (doc.format === 'pdf') {
              initialPage = navPosition;
            } else if (doc.format === 'epub') {
              // For EPUB, position could be chapter number or character position
              // If it's a reasonable chapter number, use it; otherwise treat as character position
              if (navPosition <= 1000) {
                // Likely a chapter number
                initialChapter = Math.max(0, navPosition - 1);
                initialPage = navPosition;
              } else {
                // Character position - will be handled after content loads
                initialScrollY = navPosition;
              }
            } else {
              // For text documents, position is character offset
              initialScrollY = navPosition;
              // Estimate page from character position (rough: 2000 chars per page)
              initialPage = Math.max(1, Math.ceil(navPosition / 2000));
            }
          }
        } else {
          // No navigation param - use saved reading position
          const position = await getReadingPosition(id);
          if (position) {
            if (doc.format === 'pdf') {
              initialPage = position.position;
            } else if (doc.format === 'epub') {
              // For EPUB, position represents chapter number (1-based)
              initialChapter = Math.max(0, position.position - 1);
              initialPage = position.position; // Use chapter number as page for display
            } else {
              // For text documents, position is character offset
              initialScrollY = position.position;
              // Estimate page from character position
              initialPage = Math.max(1, Math.ceil(position.position / 2000));
            }
          }
        }
        
        setCurrentPage(initialPage);
        setCurrentChapter(initialChapter);
        setSessionStartPage(initialPage);
        
        // Store scroll position for restoration after content loads
        // This will be used after EPUB/text content is loaded
        if (initialScrollY > 0) {
          // Use a longer delay to ensure content is fully rendered
          // The scroll restoration happens after loadTextContent completes
          setTimeout(() => {
            if (epubScrollRef.current && initialScrollY > 0) {
              epubScrollRef.current.scrollTo({ y: initialScrollY, animated: false });
            }
          }, 800); // Longer delay to ensure EPUB content is fully rendered
        }
      } catch (positionError) {
        console.error('Error loading reading position:', positionError);
        // Continue with defaults
      }
      
      // Start reading session
      try {
        const sessionId = await startReadingSession(doc.id);
        setReadingSessionId(sessionId);
        setSessionStartTime(Date.now());
      } catch (error) {
        console.error('Error starting reading session:', error);
        // Continue anyway
      }
      
      // Load text content for non-PDF files
      if (doc.format !== 'pdf') {
        await loadTextContent(doc);
        
        // Scroll position restoration is already handled above in loadDocument
        // (lines 434-441) with a setTimeout after content loads
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading document:', error);
      setError(error instanceof Error ? error.message : 'Failed to load document');
      setIsLoading(false);
    }
  };

  // Fallback: Try to get page count from PDF ref after a delay
  useEffect(() => {
    if (document?.format === 'pdf' && Pdf && pdfRef.current && (totalPages === null || totalPages === document.pageCount)) {
      const timer = setTimeout(async () => {
        try {
          // Try to access page count from PDF component
          const pdfComponent = pdfRef.current as any;
          if (pdfComponent) {
            // Some PDF libraries expose numberOfPages property
            const pageCount = pdfComponent.numberOfPages || 
                            pdfComponent.props?.numberOfPages ||
                            (pdfComponent.state && pdfComponent.state.numberOfPages);
            if (pageCount && pageCount > 0 && pageCount !== totalPages) {
              console.log(`Got page count from PDF ref fallback: ${pageCount}`);
              setTotalPages(pageCount);
              if (document && document.pageCount !== pageCount) {
                await updateDocumentPageCount(document.id, pageCount);
              }
            }
          }
        } catch (e) {
          console.warn('Could not get page count from PDF ref:', e);
        }
      }, 2000); // Wait 2 seconds after PDF loads to allow it to fully initialize

      return () => clearTimeout(timer);
    }
  }, [document, totalPages, Pdf, refreshDocuments]);

  const loadTextContent = async (doc: Document) => {
    setLoadingContent(true);
    try {
      if (doc.format === 'txt') {
        // For large text files, read in chunks or limit size
        const content = await FileSystemLegacy.readAsStringAsync(doc.filePath);
        // Limit content size to prevent memory issues (10MB limit)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (content.length > maxSize) {
          setTextContent(content.substring(0, maxSize) + '\n\n[... Content truncated for performance ...]');
        } else {
          setTextContent(content);
        }
      } else if (doc.format === 'epub') {
        // Parse EPUB file - lazy load chapters
        const epubData = await parseEPUB(doc.filePath);
        setEpubContent(epubData);
        const chapters = epubData.toc.length > 0 ? epubData.toc : epubData.chapters;
        setEpubChapters(chapters);
        
        // Load chapter content based on saved position
        // currentChapter is already set in loadDocument based on saved position or navigation param
        if (chapters.length > 0) {
          try {
            // Use the chapter that was determined in loadDocument
            // currentChapter is already set correctly (0-based index)
            const chapterToLoad = Math.max(0, Math.min(currentChapter, chapters.length - 1));
            const chapter = chapters[chapterToLoad] || chapters[0];
            
            const chapterHtml = await getEPUBChapterContent(doc.filePath, chapter.href);
            // Limit content size for memory management
            const maxSize = 5 * 1024 * 1024; // 5MB limit
            if (chapterHtml.length > maxSize) {
              setTextContent(chapterHtml.substring(0, maxSize) + '\n\n[... Content truncated ...]');
            } else {
              setTextContent(chapterHtml);
            }
            setCurrentChapter(chapterToLoad);
            
            // Scroll position restoration is handled in loadDocument with a timeout
            // after content loads - this ensures the scroll ref is available
          } catch (error) {
            console.error('Error loading chapter:', error);
            // Fallback to full text if chapter loading fails
            if (epubData.text) {
              const maxTextSize = 5 * 1024 * 1024; // 5MB limit
              if (epubData.text.length > maxTextSize) {
                setTextContent(epubData.text.substring(0, maxTextSize) + '\n\n[... Content truncated ...]');
              } else {
                setTextContent(epubData.text);
              }
            } else {
              setTextContent('EPUB file loaded but no content extracted.');
            }
          }
        } else if (epubData.text) {
          // Fallback to full text if no chapters
          const maxTextSize = 5 * 1024 * 1024; // 5MB limit
          if (epubData.text.length > maxTextSize) {
            setTextContent(epubData.text.substring(0, maxTextSize) + '\n\n[... Content truncated ...]');
          } else {
            setTextContent(epubData.text);
          }
        } else {
          setTextContent('EPUB file loaded but no content extracted.');
        }
        
        // Update page count based on chapters
        const chapterCount = chapters.length || 1;
        if (doc.pageCount !== chapterCount) {
          updateDocumentPageCount(doc.id, chapterCount);
          setTotalPages(chapterCount);
        }
      } else if (doc.format === 'docx') {
        // Parse DOCX file
        const docxData = await parseDOCX(doc.filePath);
        setDocxContent(docxData);
        // Limit text size for memory management
        const maxTextSize = 5 * 1024 * 1024; // 5MB limit
        if (docxData.text.length > maxTextSize) {
          setTextContent(docxData.text.substring(0, maxTextSize) + '\n\n[... Content truncated ...]');
        } else {
          setTextContent(docxData.text);
        }
        
        // Update page count based on text length
        const estimatedPages = Math.max(1, Math.ceil(docxData.text.length / 2000));
        if (doc.pageCount !== estimatedPages) {
          updateDocumentPageCount(doc.id, estimatedPages);
          setTotalPages(estimatedPages);
        }
      } else {
        setTextContent('Unsupported document format.');
      }
    } catch (error) {
      console.error('Error loading text content:', error);
      setTextContent('Error loading document content. Please try again.');
    } finally {
      setLoadingContent(false);
    }
  };

  const saveReadingPosition = async (pageOrProgress: number) => {
    if (!document) return;
    
    // For EPUB, page represents chapter number (1-based)
    // For scroll-based formats, pageOrProgress might be a progress percentage
    let progress = 0;
    let position = pageOrProgress;
    
    if (document.format === 'epub' && epubChapters.length > 0) {
      progress = (pageOrProgress / epubChapters.length) * 100;
      position = pageOrProgress; // Chapter number
    } else if (document.format === 'pdf') {
      const currentTotalPages = totalPages !== null ? totalPages : (document.pageCount || 1);
      progress = (pageOrProgress / currentTotalPages) * 100;
      position = pageOrProgress; // Page number
    } else {
      // For text-based formats, pageOrProgress might be progress percentage
      if (pageOrProgress <= 100) {
        progress = pageOrProgress;
        position = Math.round((progress / 100) * (document.pageCount || 1));
      } else {
        const currentTotalPages = totalPages !== null ? totalPages : (document.pageCount || 1);
        progress = (pageOrProgress / currentTotalPages) * 100;
        position = pageOrProgress;
      }
    }
    
    await upsertReadingPosition({
      id: `${document.id}-position`,
      documentId: document.id,
      position: position,
      progress: Math.min(100, Math.max(0, progress)),
      updatedAt: new Date().toISOString(),
    });

    // Update document last opened
    await updateDocument(document.id, {
      lastOpenedAt: new Date().toISOString(),
      status: document.status === 'unread' ? 'reading' : document.status,
    });
    
    // Update reading session periodically (every 5 pages/chapters or on significant progress)
    if (readingSessionId && document) {
      let currentPosition = 0;
      if (document.format === 'epub' && epubChapters.length > 0) {
        currentPosition = currentChapter + 1;
      } else {
        currentPosition = currentPage;
      }
      
      if (Math.abs(currentPosition - sessionStartPage) >= 5) {
        try {
          const pagesRead = Math.max(0, currentPosition - sessionStartPage);
          // Estimate words read (rough estimate: 250 words per page/chapter)
          const wordsRead = pagesRead * 250;
          await endReadingSession(readingSessionId, pagesRead, wordsRead);
          // Start new session
          const newSessionId = await startReadingSession(document.id);
          setReadingSessionId(newSessionId);
          setSessionStartPage(currentPosition);
        } catch (error) {
          console.error('Error updating reading session:', error);
        }
      }
    }
  };

  const handlePageChange = (page: number, numberOfPages?: number) => {
    setCurrentPage(page);
    // Track maximum page seen as fallback for total pages
    if (page > maxPageSeen) {
      setMaxPageSeen(page);
    }
    
    // If numberOfPages is provided and valid, update total pages
    if (numberOfPages && numberOfPages > 0) {
      if (totalPages === null || totalPages !== numberOfPages) {
        console.log(`Updating total pages from handlePageChange: ${numberOfPages} (was ${totalPages})`);
        setTotalPages(numberOfPages);
        // Update document in database with the actual total page count
        if (document && document.pageCount !== numberOfPages) {
          updateDocumentPageCount(document.id, numberOfPages);
        }
      }
    }
    
    // Save reading position based on document format
    if (document) {
      if (document.format === 'epub' && epubChapters.length > 0) {
        saveReadingPosition(currentChapter + 1);
      } else {
        saveReadingPosition(page);
      }
    }
  };

  const handleTextSelection = (text: string, position?: { x: number; y: number }) => {
    if (text && text.trim()) {
      setSelectedText(text);
      if (position) {
        setSelectionPosition(position);
      } else {
        // Default position (center of screen)
        setSelectionPosition({ x: 200, y: 300 });
      }
      setShowSelectionToolbar(true);
      // Hide main UI when showing text selection menu
      setUiVisible(false);
    }
  };

  const handleCopyText = async () => {
    if (selectedText) {
      try {
        const Clipboard = await import('@react-native-clipboard/clipboard');
        await Clipboard.default.setString(selectedText);
        setShowSelectionToolbar(false);
        // Could show a toast here
      } catch (error) {
        console.error('Error copying text:', error);
        // Fallback: Clipboard might not be available, just log
        console.warn('Clipboard not available');
      }
    }
  };

  const handleShareText = async () => {
    if (selectedText && document) {
      try {
        const Sharing = await import('expo-sharing');
        // For now, just copy to clipboard as sharing requires file
        await handleCopyText();
      } catch (error) {
        console.error('Error sharing text:', error);
      }
    }
  };

  const [dictionaryResult, setDictionaryResult] = useState<any>(null);
  const [showDictionaryModal, setShowDictionaryModal] = useState(false);

  const handleLookupWord = async () => {
    if (!selectedText) {
      setShowSelectionToolbar(false);
      return;
    }

    // Extract word from selected text (remove punctuation, take first word)
    const word = selectedText.trim().split(/\s+/)[0].replace(/[^\w]/g, '');
    
    if (!word || word.length < 2) {
      Alert.alert('Invalid Word', 'Please select a valid word to look up.');
      return;
    }

    try {
      const { dictionaryService } = await import('@/services/dictionary');
      const result = await dictionaryService.lookupWord(word);
      
      if (result) {
        setDictionaryResult(result);
        setShowDictionaryModal(true);
        setShowSelectionToolbar(false);
      } else {
        Alert.alert('Word Not Found', `No definition found for "${word}"`);
      }
    } catch (error) {
      console.error('Dictionary lookup error:', error);
      // Offline-first: Show user-friendly message without blocking
      Alert.alert(
        'Dictionary Unavailable',
        'Dictionary lookup requires an internet connection. Please try again when online.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleToggleTTS = async () => {
    try {
      const { ttsService } = await import('@/services/textToSpeech');
      
      if (isTTSPlaying) {
        await ttsService.stop();
        setIsTTSPlaying(false);
      } else {
        // Get current text content to read
        let textToRead = '';
        if (document?.format === 'pdf') {
          // For PDF, read current page text (would need PDF text extraction)
          textToRead = `Page ${currentPage} of ${totalPages || document.pageCount || 1}`;
        } else {
          textToRead = textContent || 'No content available to read.';
        }

        if (textToRead) {
          await ttsService.speak(textToRead, {
            rate: ttsRate,
            pitch: ttsPitch,
            volume: 1.0,
          });
          setIsTTSPlaying(true);
        }
      }
    } catch (error) {
      console.error('TTS error:', error);
      Alert.alert('TTS Unavailable', 'Text-to-speech is not available. Please install expo-speech.');
    }
  };

  const handleCreateHighlight = async () => {
    if (!document || !selectedText) return;

    try {
      const color = highlightColors[highlightType];
      
      // Calculate actual position in document
      // For text-based formats, find the selected text in the full content
      let startPosition = 0;
      let endPosition = selectedText.length;
      
      if (document.format === 'pdf') {
        // For PDFs, use current page as position reference
        // In a full implementation, we'd extract text from PDF and find position
        startPosition = currentPage * 2000; // Estimate: 2000 chars per page
        endPosition = startPosition + selectedText.length;
      } else if (textContent) {
        // For text-based formats, find the actual position in the content
        const textLower = textContent.toLowerCase();
        const selectedLower = selectedText.toLowerCase();
        const foundIndex = textLower.indexOf(selectedLower);
        
        if (foundIndex !== -1) {
          startPosition = foundIndex;
          endPosition = foundIndex + selectedText.length;
        } else {
          // Fallback: use current page/chapter as position reference
          if (document.format === 'epub' && epubChapters.length > 0) {
            // Estimate position based on chapter
            startPosition = currentChapter * 5000; // Estimate: 5000 chars per chapter
            endPosition = startPosition + selectedText.length;
          } else {
            // For other formats, estimate based on current page
            startPosition = (currentPage - 1) * 2000;
            endPosition = startPosition + selectedText.length;
          }
        }
      } else {
        // Fallback if no text content available
        startPosition = (currentPage - 1) * 2000;
        endPosition = startPosition + selectedText.length;
      }
      
      await addHighlight({
        documentId: document.id,
        type: highlightType,
        text: selectedText,
        startPosition: startPosition,
        endPosition: endPosition,
        color: color,
      });

      // If note text was entered, create a note attached to the highlight
      // Note: We need to get the highlight ID after creation
      // For now, create a standalone note at the same position as the highlight
      if (noteText.trim()) {
        await addNote({
          documentId: document.id,
          highlightId: null, // In full implementation, would link to highlight ID
          text: noteText.trim(),
          position: startPosition, // Use the calculated start position
        });
      }

      // Reload highlights to show the new one
      await loadHighlights();
      
      setShowHighlightModal(false);
      setSelectedText('');
      setNoteText('');
    } catch (error) {
      console.error('Error creating highlight:', error);
      Alert.alert('Error', 'Failed to create highlight. Please try again.');
    }
  };

  if (!document) {
    // Get reader theme colors for loading state
    const readerThemeColors = getReaderThemeColors(settings.theme);
    const themeColors = {
      bg: readerThemeColors.background,
      text: readerThemeColors.text,
      textSecondary: readerThemeColors.textSecondary,
      border: readerThemeColors.border,
      surface: readerThemeColors.surface,
    };
    
    if (error) {
      return (
        <View style={[styles.container, { backgroundColor: themeColors.bg, justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
          <Text style={[styles.loadingText, { color: '#ef4444', marginBottom: 16 }]}>Error Loading Document</Text>
          <Text style={[styles.loadingText, { color: themeColors.text, fontSize: 14, textAlign: 'center' }]}>{error}</Text>
          <TouchableOpacity
            style={[styles.createButton, { backgroundColor: colors.primary, marginTop: 20, paddingHorizontal: 24 }]}
            onPress={() => {
              setError(null);
              setIsLoading(true);
              loadDocument();
            }}
          >
            <Text style={styles.createButtonText}>Retry</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ marginTop: 12 }}
            onPress={() => router.back()}
          >
            <Text style={[styles.loadingText, { color: colors.primary }]}>Go Back</Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    return (
      <View style={[styles.container, { backgroundColor: themeColors.bg }]}>
        <Text style={[styles.loadingText, { color: themeColors.text }]}>Loading document...</Text>
      </View>
    );
  }

  const handleToggleBookmark = () => {
    if (isBookmarked) {
      const bookmark = bookmarks.find(b => b.page === currentPage);
      if (bookmark) {
        handleRemoveBookmark(bookmark.id);
      }
    } else {
      handleAddBookmark();
    }
  };

  const handleJumpToPage = (page: number) => {
    if (isTransitioning) return;
    
    setIsTransitioning(true);
    
    // Animate page transition
    Animated.sequence([
      Animated.timing(pageTransitionAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(pageTransitionAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsTransitioning(false);
    });

    if (document?.format === 'pdf' && pdfRef.current) {
      pdfRef.current.setPage(page);
    } else if (document?.format === 'epub' && epubChapters.length > 0) {
      // For EPUB, page number represents chapter (1-based)
      const chapterIndex = Math.max(0, Math.min(page - 1, epubChapters.length - 1));
      
      // Only load if chapter actually changed
      if (chapterIndex !== currentChapter) {
        setCurrentChapter(chapterIndex);
        setCurrentPage(page);
        
        // Load the chapter content
        const loadChapter = async () => {
          try {
            setLoadingContent(true);
            const chapter = epubChapters[chapterIndex];
            if (!chapter) {
              throw new Error('Chapter not found');
            }
            const chapterHtml = await getEPUBChapterContent(document.filePath, chapter.href);
            const maxSize = 5 * 1024 * 1024; // 5MB limit
            if (chapterHtml.length > maxSize) {
              setTextContent(chapterHtml.substring(0, maxSize) + '\n\n[... Content truncated ...]');
            } else {
              setTextContent(chapterHtml);
            }
            // Scroll to top when changing chapters
            if (epubScrollRef.current) {
              epubScrollRef.current.scrollTo({ y: 0, animated: false });
            }
          } catch (error) {
            console.error('Error loading chapter:', error);
            Alert.alert('Error', 'Failed to load chapter content.');
          } finally {
            setLoadingContent(false);
          }
        };
        loadChapter();
      } else {
        // Same chapter, just update page number
        setCurrentPage(page);
      }
      saveReadingPosition(page);
    } else {
      setCurrentPage(page);
      saveReadingPosition(page);
    }
  };

  const handlePreviousPage = () => {
    if (document?.format === 'epub' && epubChapters.length > 0) {
      // For EPUB, navigate to previous chapter
      if (currentChapter > 0 && !isTransitioning) {
        handleJumpToPage(currentChapter); // Chapter number (1-based, so currentChapter is the index)
      }
    } else {
      if (currentPage > 1 && !isTransitioning) {
        handleJumpToPage(currentPage - 1);
      }
    }
  };

  const handleNextPage = () => {
    if (document?.format === 'epub' && epubChapters.length > 0) {
      // For EPUB, navigate to next chapter
      if (currentChapter < epubChapters.length - 1 && !isTransitioning) {
        handleJumpToPage(currentChapter + 2); // Chapter number (1-based, so +2 = next chapter)
      }
    } else {
      const currentTotalPages = totalPages !== null ? totalPages : (document?.pageCount || 1);
      if (currentPage < currentTotalPages && !isTransitioning) {
        handleJumpToPage(currentPage + 1);
      }
    }
  };

  // Update handler refs so panResponder can call them
  handlePreviousPageRef.current = handlePreviousPage;
  handleNextPageRef.current = handleNextPage;

  const progress = document
    ? document.format === 'epub' && epubChapters.length > 0
      ? ((currentChapter + 1) / epubChapters.length) * 100
      : ((currentPage / (totalPages !== null ? totalPages : (document.pageCount || 1))) * 100)
    : 0;

  const pageTransitionOpacity = pageTransitionAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 0.3, 1],
  });

  const swipeTranslateX = swipeX;

  // Get reader theme colors
  const readerThemeColors = getReaderThemeColors(settings.theme);
  const themeColors = {
    bg: readerThemeColors.background,
    text: readerThemeColors.text,
    textSecondary: readerThemeColors.textSecondary,
    border: readerThemeColors.border,
    surface: readerThemeColors.surface,
  };

  // AI handlers
  const handleExplain = async () => {
    if (!selectedText || !document) return;
    setShowSelectionToolbar(false);
    try {
      const { aiService } = await import('@/services/ai');
      const explanation = await aiService.explain(selectedText);
      setAiResult({ title: 'Explain', text: explanation });
    } catch (error) {
      Alert.alert('Error', 'Failed to get explanation. Please try again.');
    }
  };

  const handleSimplify = async () => {
    if (!selectedText || !document) return;
    setShowSelectionToolbar(false);
    try {
      const { aiService } = await import('@/services/ai');
      const simplified = await aiService.simplify(selectedText);
      setAiResult({ title: 'Simplify', text: simplified });
    } catch (error) {
      Alert.alert('Error', 'Failed to simplify text. Please try again.');
    }
  };

  const handleUnderstand = async () => {
    if (!document) return;
    setUiVisible(false);
    try {
      const { aiService } = await import('@/services/ai');
      const content = textContent || 'No content available.';
      const summary = await aiService.summarize(content.substring(0, 2000));
      setAiResult({ title: 'Understand', text: summary });
    } catch (error) {
      Alert.alert('Error', 'Failed to generate summary. Please try again.');
    }
  };

  const handleSaveAiAsNote = async () => {
    if (!document || !aiResult) return;
    try {
      await addNote({
        documentId: document.id,
        highlightId: null,
        text: `[${aiResult.title}]\n\n${aiResult.text}`,
        position: document.format === 'epub' && epubChapters.length > 0 ? currentChapter : currentPage,
      });
      await loadNotes(document.id);
      setAiResult(null);
    } catch (e) {
      Alert.alert('Error', 'Failed to save note.');
    }
  };

  // Options menu handlers
  const handleViewInfo = () => {
    if (!document) return;
    Alert.alert(
      'Document Info',
      `Title: ${document.title}\nFormat: ${document.format.toUpperCase()}\nPages: ${document.pageCount}\nWords: ${document.wordCount}\nReading Time: ${document.estimatedReadingTime} min`,
      [{ text: 'OK' }]
    );
  };

  const handleGenerateSummary = async () => {
    if (!document) return;
    try {
      const { aiService } = await import('@/services/ai');
      const content = textContent || 'No content available.';
      const summary = await aiService.summarize(content.substring(0, 5000));
      Alert.alert('Document Summary', summary, [{ text: 'OK' }]);
    } catch (error) {
      Alert.alert('Error', 'Failed to generate summary. Please try again.');
    }
  };

  const handleExportHighlights = async () => {
    try {
      const { exportAllHighlights } = await import('@/services/exportService');
      await exportAllHighlights();
      Alert.alert('Success', 'Highlights and notes exported successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to export highlights and notes');
    }
  };

  const handleShareDocument = async () => {
    if (!document) return;
    try {
      const Sharing = await import('expo-sharing');
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(document.filePath);
      } else {
        Alert.alert('Sharing not available', 'Sharing is not available on this device.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to share document');
    }
  };

  const handleDeleteDocument = () => {
    if (!document) return;
    Alert.alert(
      'Delete Document',
      `Are you sure you want to delete "${document.title}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete document from database
              const database = await SQLite.openDatabaseAsync('scriptum.db');
              
              // Delete associated data first (use parameterized queries for safety)
              await database.runAsync(
                'DELETE FROM reading_positions WHERE documentId = ?',
                [document.id]
              );
              await database.runAsync(
                'DELETE FROM highlights WHERE documentId = ?',
                [document.id]
              );
              await database.runAsync(
                'DELETE FROM notes WHERE documentId = ?',
                [document.id]
              );
              await database.runAsync(
                'DELETE FROM bookmarks WHERE documentId = ?',
                [document.id]
              );
              await database.runAsync(
                'DELETE FROM document_tags WHERE documentId = ?',
                [document.id]
              );
              await database.runAsync(
                'DELETE FROM documents WHERE id = ?',
                [document.id]
              );
              
              // Try to delete file (using legacy API)
              try {
                if (document.filePath) {
                  const fileInfo = await FileSystemLegacy.getInfoAsync(document.filePath);
                  if (fileInfo.exists) {
                    await FileSystemLegacy.deleteAsync(document.filePath, { idempotent: true });
                  }
                }
              } catch (fileError) {
                console.warn('Could not delete file:', fileError);
                // Continue even if file deletion fails
              }
              
              // Refresh documents and go back
              refreshDocuments();
              router.back();
            } catch (error) {
              console.error('Error deleting document:', error);
              Alert.alert('Error', 'Failed to delete document. Please try again.');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.bg }]}>
      <StatusBar hidden />
      <ReaderTopBar
        title={document?.title || 'Document'}
        isVisible={uiVisible}
        onClose={async () => {
          if (document) {
            if (document.format === 'epub' && epubChapters.length > 0) {
              await saveReadingPosition(currentChapter);
            } else {
              await saveReadingPosition(currentPage);
            }
          }
          router.back();
        }}
        onOptions={() => setShowOptionsMenu(true)}
        backgroundColor={themeColors.bg}
        textColor={themeColors.text}
      />

      {document.format === 'pdf' ? (
        <Pressable
          style={{ flex: 1 }}
          onPress={() => { if (!showSelectionToolbar) toggleUI(); }}
        >
        <View style={{ flex: 1 }}>
          {pdfError || !Pdf || Platform.OS === 'web' ? (
            <View style={styles.fallbackContainer}>
              <Text style={[styles.fallbackText, { color: themeColors.text }]}>
                PDF rendering requires a development build with native modules.{'\n\n'}
                The development build needs to be rebuilt after adding react-native-pdf.
              </Text>
              <Text style={[styles.fallbackSubtext, { color: themeColors.text, marginTop: 16 }]}>
                To fix this:{'\n'}
                1. Run: npx expo run:ios{'\n'}
                2. Or: eas build --profile development --platform ios{'\n'}
                3. Install the new build{'\n'}
                4. Restart the app
              </Text>
              <Text style={[styles.fallbackSubtext, { color: themeColors.text, marginTop: 8 }]}>
                File: {document.title}
              </Text>
              <Text style={[styles.fallbackSubtext, { color: themeColors.text, marginTop: 8, fontSize: 12 }]}>
                Pdf component: {Pdf ? 'Available' : 'Not available'}{'\n'}
                Platform: {Platform.OS}{'\n'}
                Error: {pdfError || 'None'}
              </Text>
            </View>
          ) : (
            <View style={{ flex: 1 }}>
              {/* PDF component - no blocking overlays to allow full interaction */}
              {Pdf ? (
                <Pdf
                  ref={pdfRef}
                  source={{ 
                    uri: document.filePath.startsWith('file://') 
                      ? document.filePath 
                      : document.filePath.startsWith('/')
                      ? `file://${document.filePath}`
                      : `file://${FileSystemLegacy.documentDirectory || ''}${document.filePath}`,
                    cache: true 
                  }}
                  page={currentPage}
                  // Zoom settings - enables pinch to zoom
                  maxZoom={5}
                  minZoom={0.5}
                  // Vertical scrolling only - no horizontal page navigation
                  horizontal={false}
                  spacing={0}
                  // Fit width for better viewing
                  fitWidth={true}
                  // Multi-page mode - allows scrolling through all pages vertically
                  singlePage={false}
                onPageChanged={(page: number, numberOfPages?: number) => {
                  // Pass numberOfPages to handlePageChange so it can update pageCount correctly
                  handlePageChange(page, numberOfPages);
                }}
                onLoadComplete={async (data: any) => {
                  // PDF loaded successfully - update total pages
                  setPdfError(null);
                  
                  // react-native-pdf onLoadComplete receives an object with numberOfPages
                  // Format: { numberOfPages: number, width: number, height: number, ... }
                  let numberOfPages = 0;
                  
                  if (typeof data === 'number') {
                    numberOfPages = data;
                  } else if (data && typeof data === 'object') {
                    // Try different possible property names
                    numberOfPages = data.numberOfPages || data.numpages || data.pages || data.pageCount || 0;
                  }
                  
                  console.log('PDF onLoadComplete - raw data:', JSON.stringify(data));
                  console.log('PDF onLoadComplete - extracted pages:', numberOfPages);
                  
                  if (numberOfPages > 0) {
                    console.log(`Setting total pages to ${numberOfPages} (was ${totalPages || document?.pageCount || 'unknown'})`);
                    setTotalPages(numberOfPages);
                    // Update document page count if it differs
                    if (document && document.pageCount !== numberOfPages) {
                      console.log(`Updating document page count from ${document.pageCount} to ${numberOfPages}`);
                      await updateDocumentPageCount(document.id, numberOfPages);
                    }
                  } else {
                    console.warn('PDF loaded but numberOfPages is 0 or invalid. Data:', data);
                    // Try to get page count from PDF ref if available
                    if (pdfRef.current) {
                      try {
                        // Some PDF libraries expose getPageCount method
                        const pageCount = (pdfRef.current as any)?.getPageCount?.() || 
                                         (pdfRef.current as any)?.numberOfPages;
                        if (pageCount && pageCount > 0) {
                          console.log(`Got page count from ref: ${pageCount}`);
                          setTotalPages(pageCount);
                          if (document && document.pageCount !== pageCount) {
                            await updateDocumentPageCount(document.id, pageCount);
                          }
                        }
                      } catch (e) {
                        console.warn('Could not get page count from ref:', e);
                      }
                    }
                  }
                }}
                onError={(error: any) => {
                  console.error('PDF render error:', error);
                  console.error('PDF file path:', document.filePath);
                  // Handle "Already closed" error gracefully
                  if (error?.message?.includes('Already closed') || error?.message?.includes('closed')) {
                    console.warn('PDF component was closed during rendering - this is normal when navigating away');
                    return;
                  }
                  setPdfError(error?.message || 'Failed to render PDF. Native module may not be linked.');
                }}
                onPageChangeFailed={(error: any) => {
                  // Handle page change failures (e.g., "Already closed" errors)
                  if (error?.message?.includes('Already closed') || error?.message?.includes('closed')) {
                    console.warn('PDF page change failed - document was closed. This is normal when navigating away.');
                    return;
                  }
                  console.error('PDF page change failed:', error);
                }}
                style={styles.pdf}
              />
              ) : (
                <View style={styles.fallbackContainer}>
                  <Text style={[styles.fallbackText, { color: themeColors.text }]}>
                    PDF component not available. Platform: {Platform.OS}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
        </Pressable>
      ) : (
        <View style={{ flex: 1 }}>
          {document.format === 'epub' ? (
            <View style={{ flex: 1 }}>
              <ScrollView
                ref={epubScrollRef}
                style={{ flex: 1 }}
                contentContainerStyle={[
                  { padding: settings.margin, flexGrow: 1 },
                ]}
                scrollEnabled={true}
                showsVerticalScrollIndicator={true}
                decelerationRate="normal"
                scrollEventThrottle={16}
                {...(Platform.OS === 'ios' ? {
                  maximumZoomScale: 3.0,
                  minimumZoomScale: 0.5,
                  zoomScale: 1.0,
                  bouncesZoom: true,
                } : {})}
                nestedScrollEnabled={true}
                removeClippedSubviews={false}
                onScroll={(event) => {
                  if (uiVisible && hideTimer) {
                    clearTimeout(hideTimer);
                    const timer = setTimeout(() => setUiVisible(false), 3000);
                    setHideTimer(timer);
                  }
                  const scrollY = event.nativeEvent.contentOffset.y;
                  const contentHeight = event.nativeEvent.contentSize.height;
                  if (document && scrollY > 0 && contentHeight > 0) {
                    if (scrollDebounceTimerRef.current) clearTimeout(scrollDebounceTimerRef.current);
                    scrollDebounceTimerRef.current = setTimeout(async () => {
                      const progress = Math.min(100, (scrollY / contentHeight) * 100);
                      await upsertReadingPosition({
                        id: `${document.id}-position`,
                        documentId: document.id,
                        position: Math.round(scrollY),
                        progress: Math.round(progress),
                        updatedAt: new Date().toISOString(),
                      });
                    }, 1000);
                  }
                }}
              >
            <Pressable
              style={{ flex: 1, minHeight: Dimensions.get('window').height - 120 }}
              onPress={() => { if (!showSelectionToolbar) toggleUI(); }}
            >
            {loadingContent ? (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <Text style={[styles.loadingText, { color: themeColors.text }]}>
                  Loading EPUB content...
                </Text>
              </View>
            ) : textContent ? (
              <RenderHTML
                contentWidth={screenWidth - (settings.margin * 2)}
                source={{ html: textContent }}
                baseStyle={{
                  color: themeColors.text,
                  fontSize: settings.fontSize,
                  lineHeight: settings.fontSize * settings.lineSpacing,
                  fontFamily: settings.fontFamily === 'serif' ? 'Georgia' : 'System',
                }}
                tagsStyles={{
                  div: { color: themeColors.text },
                  p: { color: themeColors.text, marginBottom: settings.paragraphSpacing || 12 },
                  h1: { color: themeColors.text, fontSize: settings.fontSize * 1.5, fontWeight: 'bold', marginBottom: 10 },
                  h2: { color: themeColors.text, fontSize: settings.fontSize * 1.3, fontWeight: 'bold', marginBottom: 8 },
                  h3: { color: themeColors.text, fontSize: settings.fontSize * 1.1, fontWeight: 'bold', marginBottom: 6 },
                  strong: { fontWeight: 'bold', color: themeColors.text },
                  em: { fontStyle: 'italic', color: themeColors.text },
                  ul: { color: themeColors.text, marginBottom: 10 },
                  ol: { color: themeColors.text, marginBottom: 10 },
                  li: { color: themeColors.text, marginBottom: 5 },
                }}
                // Enable text selection - use systemProps for better Android support
                systemFonts={[]}
                defaultTextProps={{ 
                  selectable: true,
                  ...(Platform.OS === 'android' ? { 
                    suppressHighlighting: false,
                    selectionColor: themeColors.surface,
                  } : {}),
                }}
                renderersProps={{
                  text: { selectable: true },
                }}
              />
            ) : epubContent && epubContent.text ? (
              <RenderHTML
                contentWidth={screenWidth - (settings.margin * 2)}
                source={{ html: `<div style="color: ${themeColors.text}; font-size: ${settings.fontSize}px; line-height: ${settings.fontSize * settings.lineSpacing}px;">${epubContent.text.replace(/\n/g, '<br/>')}</div>` }}
                baseStyle={{
                  color: themeColors.text,
                  fontSize: settings.fontSize,
                  lineHeight: settings.fontSize * settings.lineSpacing,
                  fontFamily: settings.fontFamily === 'serif' ? 'Georgia' : 'System',
                }}
                tagsStyles={{
                  div: { color: themeColors.text },
                  p: { color: themeColors.text, marginBottom: settings.paragraphSpacing || 12 },
                  h1: { color: themeColors.text, fontSize: settings.fontSize * 1.5, fontWeight: 'bold', marginBottom: 10 },
                  h2: { color: themeColors.text, fontSize: settings.fontSize * 1.3, fontWeight: 'bold', marginBottom: 8 },
                  h3: { color: themeColors.text, fontSize: settings.fontSize * 1.1, fontWeight: 'bold', marginBottom: 6 },
                  strong: { fontWeight: 'bold', color: themeColors.text },
                  em: { fontStyle: 'italic', color: themeColors.text },
                  ul: { color: themeColors.text, marginBottom: 10 },
                  ol: { color: themeColors.text, marginBottom: 10 },
                  li: { color: themeColors.text, marginBottom: 5 },
                }}
                // Enable text selection - use systemProps for better Android support
                systemFonts={[]}
                defaultTextProps={{ 
                  selectable: true,
                  ...(Platform.OS === 'android' ? { 
                    suppressHighlighting: false,
                    selectionColor: themeColors.surface,
                  } : {}),
                }}
                renderersProps={{
                  text: { selectable: true },
                }}
              />
            ) : (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <Text style={[styles.text, { color: themeColors.text }]}>
                  No EPUB content available.
                </Text>
              </View>
            )}
            </Pressable>
              </ScrollView>
            </View>
          ) : document.format === 'docx' ? (
            <View style={{ flex: 1 }}>
              <ScrollView
                ref={epubScrollRef}
                style={{ flex: 1 }}
                contentContainerStyle={[
                  { padding: settings.margin, flexGrow: 1 },
                ]}
                scrollEnabled={true}
                showsVerticalScrollIndicator={true}
                decelerationRate="normal"
                scrollEventThrottle={16}
                {...(Platform.OS === 'ios' ? {
                  maximumZoomScale: 3.0,
                  minimumZoomScale: 0.5,
                  zoomScale: 1.0,
                  bouncesZoom: true,
                } : {})}
                nestedScrollEnabled={true}
                removeClippedSubviews={false}
                onScroll={(event) => {
                  if (uiVisible && hideTimer) {
                    clearTimeout(hideTimer);
                    const timer = setTimeout(() => setUiVisible(false), 3000);
                    setHideTimer(timer);
                  }
                  const scrollY = event.nativeEvent.contentOffset.y;
                  const contentHeight = event.nativeEvent.contentSize.height;
                  if (document && scrollY > 0 && contentHeight > 0) {
                    if (scrollDebounceTimerRef.current) clearTimeout(scrollDebounceTimerRef.current);
                    scrollDebounceTimerRef.current = setTimeout(async () => {
                      const progress = Math.min(100, (scrollY / contentHeight) * 100);
                      await upsertReadingPosition({
                        id: `${document.id}-position`,
                        documentId: document.id,
                        position: Math.round(scrollY),
                        progress: Math.round(progress),
                        updatedAt: new Date().toISOString(),
                      });
                    }, 1000);
                  }
                }}
              >
            <Pressable
              style={{ flex: 1, minHeight: Dimensions.get('window').height - 120 }}
              onPress={() => { if (!showSelectionToolbar) toggleUI(); }}
            >
            {loadingContent ? (
              <Text style={[styles.loadingText, { color: themeColors.text }]}>
                Loading DOCX content...
              </Text>
            ) : docxContent && docxContent.html ? (
              <RenderHTML
                contentWidth={screenWidth - (settings.margin * 2)}
                source={{ html: docxContent.html }}
                baseStyle={{
                  color: themeColors.text,
                  fontSize: settings.fontSize,
                  lineHeight: settings.fontSize * settings.lineSpacing,
                  fontFamily: settings.fontFamily === 'serif' ? 'Georgia' : 'System',
                }}
                tagsStyles={{
                  div: { color: themeColors.text },
                  p: { color: themeColors.text, marginBottom: settings.paragraphSpacing || 12 },
                  h1: { color: themeColors.text, fontSize: settings.fontSize * 1.5, fontWeight: 'bold', marginBottom: 10 },
                  h2: { color: themeColors.text, fontSize: settings.fontSize * 1.3, fontWeight: 'bold', marginBottom: 8 },
                  h3: { color: themeColors.text, fontSize: settings.fontSize * 1.1, fontWeight: 'bold', marginBottom: 6 },
                  strong: { fontWeight: 'bold', color: themeColors.text },
                  em: { fontStyle: 'italic', color: themeColors.text },
                  ul: { color: themeColors.text, marginBottom: 10 },
                  ol: { color: themeColors.text, marginBottom: 10 },
                  li: { color: themeColors.text, marginBottom: 5 },
                }}
                systemFonts={[]}
                defaultTextProps={{
                  selectable: true,
                  ...(Platform.OS === 'android' ? {
                    suppressHighlighting: false,
                    selectionColor: themeColors.surface,
                  } : {}),
                }}
                renderersProps={{
                  text: { selectable: true },
                }}
              />
            ) : (
              <HighlightedText
                text={textContent || 'No DOCX content available.'}
                highlights={highlights}
                onHighlightPress={async (highlight, event) => {
                  const { getNotesByHighlightId } = await import('@/services/database');
                  const notes = await getNotesByHighlightId(highlight.id);
                  const note = notes.length > 0 ? notes[0] : null;
                  const position = event?.nativeEvent?.pageX && event?.nativeEvent?.pageY
                    ? { x: event.nativeEvent.pageX, y: event.nativeEvent.pageY }
                    : { x: screenWidth / 2, y: 300 };
                  setHighlightPopover({ highlight, note, position });
                }}
                style={styles.text}
                fontSize={settings.fontSize}
                lineHeight={settings.fontSize * settings.lineSpacing}
                color={themeColors.text}
                fontFamily={settings.fontFamily === 'serif' ? 'Georgia' : 'System'}
                selectionColor={themeColors.surface}
              />
            )}
            </Pressable>
              </ScrollView>
            </View>
          ) : (
            <View style={{ flex: 1 }}>
              <ScrollView
                ref={epubScrollRef}
                style={{ flex: 1 }}
                contentContainerStyle={[
                  { padding: settings.margin, flexGrow: 1 },
                ]}
                scrollEnabled={true}
                showsVerticalScrollIndicator={true}
                decelerationRate="normal"
                scrollEventThrottle={16}
                {...(Platform.OS === 'ios' ? {
                  maximumZoomScale: 3.0,
                  minimumZoomScale: 0.5,
                  zoomScale: 1.0,
                  bouncesZoom: true,
                } : {})}
                nestedScrollEnabled={true}
                removeClippedSubviews={false}
                onScroll={(event) => {
                  if (uiVisible && hideTimer) {
                    clearTimeout(hideTimer);
                    const timer = setTimeout(() => setUiVisible(false), 3000);
                    setHideTimer(timer);
                  }
                  const scrollY = event.nativeEvent.contentOffset.y;
                  const contentHeight = event.nativeEvent.contentSize.height;
                  if (document && scrollY > 0 && contentHeight > 0) {
                    if (scrollDebounceTimerRef.current) clearTimeout(scrollDebounceTimerRef.current);
                    scrollDebounceTimerRef.current = setTimeout(async () => {
                      const progress = Math.min(100, (scrollY / contentHeight) * 100);
                      await upsertReadingPosition({
                        id: `${document.id}-position`,
                        documentId: document.id,
                        position: Math.round(scrollY),
                        progress: Math.round(progress),
                        updatedAt: new Date().toISOString(),
                      });
                    }, 1000);
                  }
                }}
              >
                <Pressable
                  style={{ flex: 1, minHeight: Dimensions.get('window').height - 120 }}
                  onPress={() => { if (!showSelectionToolbar) toggleUI(); }}
                >
                {loadingContent ? (
                  <Text style={[styles.loadingText, { color: themeColors.text }]}>
                    Loading content...
                  </Text>
                ) : (
                  <HighlightedText
                    text={textContent || 'No content available.'}
                    highlights={highlights}
                    onHighlightPress={async (highlight, event) => {
                      const { getNotesByHighlightId } = await import('@/services/database');
                      const notes = await getNotesByHighlightId(highlight.id);
                      const note = notes.length > 0 ? notes[0] : null;
                      const position = event?.nativeEvent?.pageX && event?.nativeEvent?.pageY
                        ? { x: event.nativeEvent.pageX, y: event.nativeEvent.pageY }
                        : { x: screenWidth / 2, y: 300 };
                      setHighlightPopover({ highlight, note, position });
                    }}
                    style={styles.text}
                    fontSize={settings.fontSize}
                    lineHeight={settings.fontSize * settings.lineSpacing}
                    color={themeColors.text}
                    fontFamily={settings.fontFamily === 'serif' ? 'Georgia' : 'System'}
                    selectionColor={themeColors.surface}
                  />
                )}
                </Pressable>
              </ScrollView>
            </View>
          )}
        </View>
      )}

      {/* Fallback tap-to-show UI when hidden (e.g. PDF or empty area) */}
      {!uiVisible && !showSelectionToolbar && document && (
        <TouchableOpacity
          onPress={toggleUI}
          style={[styles.tapToShowUI, { backgroundColor: 'rgba(0,0,0,0.15)' }]}
          activeOpacity={0.8}
          accessibilityLabel="Show menu"
        >
          <Text style={styles.tapToShowUIIcon}>☰</Text>
        </TouchableOpacity>
      )}

      {showSelectionToolbar && selectedText && (
        <TextSelectionMenu
          visible={showSelectionToolbar}
          selectedText={selectedText}
          position={selectionPosition}
          onHighlight={() => {
            setShowSelectionToolbar(false);
            setShowHighlightModal(true);
          }}
          onNote={async () => {
            setShowSelectionToolbar(false);
            setShowNoteModal(true);
          }}
          onExplain={handleExplain}
          onSimplify={handleSimplify}
          onCopy={handleCopyText}
          onDismiss={() => setShowSelectionToolbar(false)}
          backgroundColor={themeColors.surface}
          textColor={themeColors.text}
        />
      )}

      {/* Highlight Popover */}
      {highlightPopover && (
        <View
          style={{
            position: 'absolute',
            top: Math.max(60, Math.min(highlightPopover.position.y - 100, 400)),
            left: Math.max(16, Math.min(highlightPopover.position.x - 100, screenWidth - 232)),
            zIndex: 2000,
          }}
          onTouchStart={(e) => e.stopPropagation()}
        >
          <View
            style={[
              {
                backgroundColor: themeColors.bg,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: themeColors.border,
                padding: 12,
                minWidth: 200,
                maxWidth: 280,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 8,
              },
            ]}
          >
            {highlightPopover.note && (
              <>
                <Text style={[{ color: themeColors.textSecondary, fontSize: 12, marginBottom: 4 }]}>
                  Note:
                </Text>
                <Text style={[{ color: themeColors.text, fontSize: 14, marginBottom: 12 }]}>
                  {highlightPopover.note.text}
                </Text>
                <View style={{ height: 1, backgroundColor: themeColors.border, marginVertical: 8 }} />
              </>
            )}
            <TouchableOpacity
              onPress={async () => {
                // Edit note or create new one
                setHighlightPopover(null);
                setSelectedText(highlightPopover.highlight.text);
                setShowNoteModal(true);
              }}
              style={{
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderRadius: 8,
                backgroundColor: themeColors.surface,
                marginBottom: 8,
              }}
            >
              <Text style={{ color: themeColors.text, fontSize: 14, fontWeight: '500' }}>
                {highlightPopover.note ? 'Edit Note' : 'Add Note'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={async () => {
                try {
                  const { deleteHighlight } = await import('@/services/database');
                  await deleteHighlight(highlightPopover.highlight.id);
                  await loadHighlights();
                  setHighlightPopover(null);
                } catch (error) {
                  console.error('Error deleting highlight:', error);
                  Alert.alert('Error', 'Failed to delete highlight.');
                }
              }}
              style={{
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderRadius: 8,
                backgroundColor: themeColors.surface,
              }}
            >
              <Text style={{ color: '#ef4444', fontSize: 14, fontWeight: '500' }}>
                Delete Highlight
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Overlay to dismiss popover */}
      {highlightPopover && (
        <TouchableOpacity
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1999,
          }}
          activeOpacity={1}
          onPress={() => setHighlightPopover(null)}
        />
      )}

      <ReaderBottomBar
        isVisible={uiVisible}
        backgroundColor={themeColors.bg}
        iconColor={themeColors.text}
        onHighlight={() => {
          setUiVisible(false);
          // For PDFs, text selection doesn't work on Android, so allow manual entry
          if (document?.format === 'pdf' && Platform.OS === 'android') {
            // Show manual text input modal for PDFs
            setShowManualTextInput(true);
          } else if (!selectedText) {
            // For text-based documents, guide user to select text first
            Alert.alert(
              'Highlight Text',
              Platform.OS === 'android' 
                ? 'Long-press on text to select it, then tap "Highlight" again. Or use the system selection menu that appears when you select text.'
                : 'Long-press on text to select it, then choose "Highlight" from the menu.',
              [{ text: 'OK' }]
            );
          } else {
            // If text is already selected, show highlight modal
            setShowHighlightModal(true);
          }
        }}
        onNote={() => {
          setUiVisible(false);
          // For PDFs, always allow note creation at current position
          if (document?.format === 'pdf' && Platform.OS === 'android') {
            // Open note modal directly for PDFs (position-based note)
            setShowNoteModal(true);
          } else if (!selectedText) {
            Alert.alert(
              'Add Note',
              'Long-press on text to select it, then choose "Add note" from the menu. Or you can add a note at the current position.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Add Note Here',
                  onPress: () => {
                    // Open note modal without selected text (position-based note)
                    setShowNoteModal(true);
                  },
                },
              ]
            );
          } else {
            // If text is already selected, show note modal
            setShowNoteModal(true);
          }
        }}
        onUnderstand={handleUnderstand}
        onBell={() => {
          setUiVisible(false);
          setShowBookmarks(true);
        }}
        onSettings={() => {
          setUiVisible(false);
          setShowSettings(true);
        }}
      />

      {/* Dictionary Modal */}
      <Modal
        visible={showDictionaryModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDictionaryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: themeColors.bg, maxHeight: '80%' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: themeColors.text }]}>
                {dictionaryResult?.word || 'Dictionary'}
              </Text>
              <TouchableOpacity onPress={() => setShowDictionaryModal(false)}>
                <XIcon size={24} color={themeColors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              {dictionaryResult ? (
                <>
                  {dictionaryResult.phonetic && (
                    <Text style={[styles.phonetic, { color: colors.textSecondary }]}>
                      {dictionaryResult.phonetic}
                    </Text>
                  )}
                  {dictionaryResult.meanings?.map((meaning: any, index: number) => (
                    <View key={index} style={styles.meaningContainer}>
                      <Text style={[styles.partOfSpeech, { color: colors.primary }]}>
                        {meaning.partOfSpeech}
                      </Text>
                      {meaning.definitions?.map((def: any, defIndex: number) => (
                        <View key={defIndex} style={styles.definitionContainer}>
                          <Text style={[styles.definition, { color: themeColors.text }]}>
                            {defIndex + 1}. {def.definition}
                          </Text>
                          {def.example && (
                            <Text style={[styles.example, { color: colors.textSecondary, fontStyle: 'italic' }]}>
                              Example: "{def.example}"
                            </Text>
                          )}
                          {def.synonyms && def.synonyms.length > 0 && (
                            <Text style={[styles.synonyms, { color: colors.textSecondary }]}>
                              Synonyms: {def.synonyms.slice(0, 5).join(', ')}
                            </Text>
                          )}
                        </View>
                      ))}
                    </View>
                  ))}
                  {dictionaryResult.sourceUrls && dictionaryResult.sourceUrls.length > 0 && (
                    <View style={[styles.sourceContainer, { borderTopColor: themeColors.border }]}>
                      <Text style={[styles.sourceLabel, { color: colors.textSecondary }]}>
                        Source:
                      </Text>
                      {dictionaryResult.sourceUrls.map((url: string, index: number) => (
                        <Text key={index} style={[styles.sourceUrl, { color: colors.primary }]}>
                          {url}
                        </Text>
                      ))}
                    </View>
                  )}
                </>
              ) : (
                <Text style={[styles.loadingText, { color: themeColors.text }]}>
                  Loading definition...
                </Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Settings Modal */}
      <ReaderSettingsModal
        visible={showSettings}
        settings={settings}
        onClose={() => setShowSettings(false)}
        onUpdate={updateSettings}
        previewText={textContent || 'The quick brown fox jumps over the lazy dog. This is a preview of how your text will look with the current settings.'}
      />

      {/* Highlight Modal */}
      <Modal
        visible={showHighlightModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowHighlightModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: themeColors.bg }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: themeColors.text }]}>
                Create Highlight
              </Text>
              <TouchableOpacity onPress={() => setShowHighlightModal(false)}>
                <XIcon size={24} color={themeColors.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <Text style={[styles.selectedTextLabel, { color: themeColors.text }]}>
                Selected Text:
              </Text>
              <Text style={[styles.selectedText, { color: themeColors.text }]}>
                {selectedText}
              </Text>

              <HighlightTypeSelector
                selectedType={highlightType}
                onSelect={setHighlightType}
              />

              <Text style={[styles.settingLabel, { color: themeColors.text }]}>
                Note (optional):
              </Text>
              <TextInput
                style={[
                  styles.noteInput,
                  { 
                    color: themeColors.text, 
                    borderColor: themeColors.border,
                    backgroundColor: themeColors.surface,
                  },
                ]}
                placeholder="Add a note to this highlight..."
                placeholderTextColor={themeColors.textSecondary}
                value={noteText}
                onChangeText={setNoteText}
                multiline
                numberOfLines={3}
              />

              <TouchableOpacity
                style={[styles.createButton, { backgroundColor: colors.primary }]}
                onPress={handleCreateHighlight}
              >
                <Text style={styles.createButtonText}>Create Highlight</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
        </Modal>

      {/* Note Modal */}
      <NoteModal
        visible={showNoteModal}
        onClose={() => {
          setShowNoteModal(false);
          setSelectedText(''); // Clear selection when closing
        }}
        onSave={async (text, highlightId, position) => {
          if (!document) return;
          try {
            await addNote({
              documentId: document.id,
              highlightId: highlightId || null,
              text: text,
              position: position || currentPage, // Use current page as position fallback
            });
            // Reload notes to show the new one
            await loadNotes(document.id);
            setShowNoteModal(false);
            setSelectedText('');
          } catch (error) {
            console.error('Error creating note:', error);
            Alert.alert('Error', 'Failed to create note. Please try again.');
          }
        }}
        selectedText={selectedText}
        position={currentPage} // Use current page as position
      />

      {/* AI Result Bottom Sheet */}
      <Modal
        visible={!!aiResult}
        transparent
        animationType="slide"
        onRequestClose={() => setAiResult(null)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.4)' }]}>
          <View style={[styles.aiSheet, { backgroundColor: themeColors.bg }]}>
            <View style={[styles.aiSheetHeader, { borderBottomColor: themeColors.border }]}>
              <Text style={[styles.aiSheetTitle, { color: themeColors.text }]}>
                {aiResult?.title ?? ''}
              </Text>
              <TouchableOpacity onPress={() => setAiResult(null)}>
                <XIcon size={22} color={themeColors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView
              style={styles.aiSheetBody}
              contentContainerStyle={{ paddingBottom: 24 }}
              showsVerticalScrollIndicator={false}
            >
              <Text style={[styles.aiSheetText, { color: themeColors.text }]}>
                {aiResult?.text ?? ''}
              </Text>
            </ScrollView>
            <View style={[styles.aiSheetFooter, { borderTopColor: themeColors.border }]}>
              <TouchableOpacity
                style={[styles.aiSheetButton, { backgroundColor: themeColors.surface }]}
                onPress={() => setAiResult(null)}
              >
                <Text style={[styles.aiSheetButtonText, { color: themeColors.text }]}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.aiSheetButton, { backgroundColor: colors.primary }]}
                onPress={handleSaveAiAsNote}
              >
                <Text style={[styles.aiSheetButtonText, { color: '#fff' }]}>Save as note</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Options Menu */}
      <ReaderOptionsMenu
        visible={showOptionsMenu}
        onClose={() => setShowOptionsMenu(false)}
        onViewInfo={handleViewInfo}
        onGenerateSummary={handleGenerateSummary}
        onExportHighlights={handleExportHighlights}
        onShare={handleShareDocument}
        onDelete={handleDeleteDocument}
      />

        {/* TOC Modal */}
        {document.format === 'epub' && epubChapters.length > 0 && (
          <TOCModal
            visible={showTOC}
            onClose={() => setShowTOC(false)}
            chapters={epubChapters}
            currentChapter={currentChapter}
            onChapterSelect={async (index) => {
              if (!document || !epubChapters[index]) return;
              setCurrentChapter(index);
              setLoadingContent(true);
              try {
                const chapter = epubChapters[index];
                const chapterHtml = await getEPUBChapterContent(document.filePath, chapter.href);
                // Limit content size for memory management
                const maxSize = 5 * 1024 * 1024; // 5MB limit
                if (chapterHtml.length > maxSize) {
                  setTextContent(chapterHtml.substring(0, maxSize) + '\n\n[... Content truncated ...]');
                } else {
                  setTextContent(chapterHtml);
                }
                setShowTOC(false);
                // Update reading position to reflect chapter change
                const chapterNumber = index + 1;
                setCurrentPage(chapterNumber); // Update currentPage for display
                await saveReadingPosition(chapterNumber);
              } catch (error) {
                console.error('Error loading chapter content:', error);
                Alert.alert('Error', 'Failed to load chapter content. Please try again.');
              } finally {
                setLoadingContent(false);
              }
            }}
            title="Table of Contents"
          />
        )}

        {/* Manual Text Input Modal for PDFs (Android text selection workaround) */}
        <Modal
          visible={showManualTextInput}
          transparent
          animationType="slide"
          onRequestClose={() => {
            setShowManualTextInput(false);
            setManualTextInput('');
          }}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: themeColors.bg }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: themeColors.text }]}>
                  Enter Text to Highlight
                </Text>
                <TouchableOpacity onPress={() => {
                  setShowManualTextInput(false);
                  setManualTextInput('');
                }}>
                  <XIcon size={24} color={themeColors.text} />
                </TouchableOpacity>
              </View>
              <View style={styles.modalBody}>
                <Text style={[styles.settingLabel, { color: themeColors.text }]}>
                  Text selection is not available for PDFs on Android. Please enter the text you want to highlight:
                </Text>
                <TextInput
                  style={[
                    styles.noteInput,
                    { 
                      color: themeColors.text, 
                      borderColor: themeColors.border,
                      backgroundColor: themeColors.surface,
                    },
                  ]}
                  placeholder="Enter text to highlight..."
                  placeholderTextColor={themeColors.textSecondary}
                  value={manualTextInput}
                  onChangeText={setManualTextInput}
                  multiline
                  numberOfLines={4}
                  autoFocus
                />
                <TouchableOpacity
                  style={[styles.createButton, { backgroundColor: colors.primary }]}
                  onPress={() => {
                    if (manualTextInput.trim()) {
                      setSelectedText(manualTextInput.trim());
                      setShowManualTextInput(false);
                      setManualTextInput('');
                      setShowHighlightModal(true);
                    }
                  }}
                >
                  <Text style={styles.createButtonText}>Continue to Highlight</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Bookmarks Modal */}
        <Modal
          visible={showBookmarks}
          transparent
          animationType="slide"
          onRequestClose={() => setShowBookmarks(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: themeColors.bg }]}>
              <View style={[styles.modalHeader, { borderBottomColor: themeColors.border }]}>
                <Text style={[styles.modalTitle, { color: themeColors.text }]}>
                  Bookmarks
                </Text>
                <TouchableOpacity onPress={() => setShowBookmarks(false)}>
                  <XIcon size={24} color={themeColors.text} />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.modalBody}>
                {bookmarks.length === 0 ? (
                  <Text style={[styles.emptyText, { color: themeColors.text }]}>
                    No bookmarks yet
                  </Text>
                ) : (
                  bookmarks.map((bookmark) => (
                    <TouchableOpacity
                      key={bookmark.id}
                      style={[styles.bookmarkItem, { borderBottomColor: themeColors.border }]}
                      onPress={() => {
                        setCurrentPage(bookmark.page);
                        setShowBookmarks(false);
                      }}
                    >
                      <View style={styles.bookmarkContent}>
                        <Text style={[styles.bookmarkPage, { color: colors.primary }]}>
                          Page {bookmark.page}
                        </Text>
                        {bookmark.note && (
                          <Text style={[styles.bookmarkNote, { color: themeColors.text }]}>
                            {bookmark.note}
                          </Text>
                        )}
                      </View>
                      <TouchableOpacity
                        onPress={() => handleRemoveBookmark(bookmark.id)}
                        style={styles.bookmarkDelete}
                      >
                        <XIcon size={20} color={themeColors.text} />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 60,
    borderBottomWidth: 1,
  },
  headerButton: {
    padding: 8,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    marginHorizontal: 16,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bookmarkCount: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  bookmarkItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  bookmarkContent: {
    flex: 1,
  },
  bookmarkPage: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  bookmarkNote: {
    fontSize: 14,
  },
  bookmarkDelete: {
    padding: 8,
  },
  emptyText: {
    textAlign: 'center',
    padding: 32,
    fontSize: 16,
  },
  focusModeButton: {
    position: 'absolute',
    top: 60,
    right: 16,
    zIndex: 10,
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 8,
  },
  pdf: {
    flex: 1,
  },
  textContainer: {
    flex: 1,
  },
  textContent: {
    padding: 20,
  },
  text: {
    fontSize: 16,
  },
  footer: {
    padding: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  progressBarContainer: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
  pageInfo: {
    fontSize: 14,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e8e3dc',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  modalBody: {
    padding: 16,
  },
  aiSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
  },
  aiSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  aiSheetTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  aiSheetBody: {
    padding: 16,
    maxHeight: 360,
  },
  aiSheetText: {
    fontSize: 16,
    lineHeight: 24,
  },
  aiSheetFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  aiSheetButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  aiSheetButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  settingLabel: {
    fontSize: 16,
    marginBottom: 8,
    marginTop: 16,
  },
  sliderRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  sliderButton: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: '#f5f3f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sliderButtonText: {
    fontSize: 24,
    color: '#88755d',
    fontWeight: '600',
  },
  selectedTextLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  selectedText: {
    fontSize: 16,
    padding: 12,
    backgroundColor: '#f5f3f0',
    borderRadius: 8,
    marginBottom: 16,
    fontStyle: 'italic',
  },
  highlightTypeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  highlightTypeButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f5f3f0',
    alignItems: 'center',
  },
  highlightTypeButtonActive: {
    backgroundColor: '#88755d',
  },
  highlightTypeText: {
    fontSize: 14,
    color: '#6f5f4d',
    textTransform: 'capitalize',
  },
  highlightTypeTextActive: {
    color: '#ffffff',
  },
  noteInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  createButton: {
    backgroundColor: '#88755d',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  createButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  fallbackContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  fallbackText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 24,
  },
  fallbackSubtext: {
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.7,
  },
  tapToShowUI: {
    position: 'absolute',
    top: 56,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  tapToShowUIIcon: {
    fontSize: 20,
    color: 'rgba(255,255,255,0.9)',
  },
  phonetic: {
    fontSize: 16,
    fontStyle: 'italic',
    marginBottom: 10,
  },
  meaningContainer: {
    marginBottom: 20,
  },
  partOfSpeech: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    textTransform: 'capitalize',
  },
  definitionContainer: {
    marginBottom: 12,
    paddingLeft: 10,
  },
  definition: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 6,
  },
  example: {
    fontSize: 14,
    marginTop: 4,
    marginBottom: 4,
    paddingLeft: 10,
  },
  synonyms: {
    fontSize: 14,
    marginTop: 4,
    paddingLeft: 10,
  },
  sourceContainer: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
  },
  sourceLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  sourceUrl: {
    fontSize: 12,
    marginBottom: 4,
  },
});
