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
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Platform } from 'react-native';
import { XIcon, SettingsIcon, EyeIcon, EyeOffIcon, ListIcon, BookmarkIcon } from '@/components/Icons';
import { PlayIcon, PauseIcon } from '@/components/Icons';
import { TOCModal } from '@/components/TOCModal';
import { ReaderHeader } from '@/components/ReaderHeader';
import { ReaderFooter } from '@/components/ReaderFooter';
import { ReaderSettingsModal } from '@/components/ReaderSettings';
import { TextSelectionToolbar } from '@/components/TextSelectionToolbar';
import { useDocumentStore } from '@/stores/documentStore';
import { useReaderStore } from '@/stores/readerStore';
import { useHighlightStore } from '@/stores/highlightStore';
import { getDocumentById, getReadingPosition, upsertReadingPosition, updateDocument, insertBookmark, getBookmarksByDocumentId, deleteBookmark } from '@/services/database';
import { startReadingSession, endReadingSession } from '@/services/readingStatistics';
import { Bookmark } from '@/types';
import { Document, HighlightType } from '@/types';
import * as FileSystemLegacy from 'expo-file-system/legacy';
import { parseEPUB, getEPUBTOC, getEPUBChapterContent, EPUBChapter, EPUBContent } from '@/services/epubParser';
import { parseDOCX, DOCXContent } from '@/services/docxParser';
import RenderHTML from 'react-native-render-html';
import { useThemeStore, lightColors, darkColors } from '@/stores/themeStore';
import { HighlightedText } from '@/utils/textRenderer';

// Conditional import for react-native-pdf
let Pdf: any = null;
try {
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    Pdf = require('react-native-pdf').default;
  }
} catch (e) {
  console.warn('react-native-pdf not available:', e);
}

export default function ReaderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const pdfRef = useRef<any>(null);
  const resolvedTheme = useThemeStore((state) => state.resolvedTheme);
  const colors = resolvedTheme === 'dark' ? darkColors : lightColors;

  const { setCurrentDocument, refreshDocuments, updateDocumentPageCount } = useDocumentStore();
  const { settings, isFocusMode, toggleFocusMode, updateSettings } = useReaderStore();
  const { addHighlight, addNote } = useHighlightStore();

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
  const [selectionPosition, setSelectionPosition] = useState({ x: 0, y: 0 });
  const [showSelectionToolbar, setShowSelectionToolbar] = useState(false);
  const [highlightType, setHighlightType] = useState<HighlightType>('idea');
  const [isTTSPlaying, setIsTTSPlaying] = useState(false);
  const [ttsRate, setTTSRate] = useState(1.0);
  const [ttsPitch, setTTSPitch] = useState(1.0);
  const [noteText, setNoteText] = useState('');
  const [textContent, setTextContent] = useState<string>('');
  const [loadingContent, setLoadingContent] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
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
  const [headerFooterVisible, setHeaderFooterVisible] = useState(true);
  const [hideTimer, setHideTimer] = useState<NodeJS.Timeout | null>(null);
  const [readingSpeed, setReadingSpeed] = useState<number>(0);
  const [sessionStartTime, setSessionStartTime] = useState<number>(Date.now());
  const pageTransitionAnim = useRef(new Animated.Value(0)).current;
  const swipeX = useRef(new Animated.Value(0)).current;
  const [isTransitioning, setIsTransitioning] = useState(false);

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

  // Auto-hide header/footer after 3 seconds of inactivity
  useEffect(() => {
    if (isFocusMode) {
      setHeaderFooterVisible(false);
      return;
    }

    // Show header/footer when user interacts
    const showUI = () => {
      setHeaderFooterVisible(true);
      if (hideTimer) {
        clearTimeout(hideTimer);
      }
      const timer = setTimeout(() => {
        if (!isFocusMode) {
          setHeaderFooterVisible(false);
        }
      }, 3000);
      setHideTimer(timer);
    };

    // Initial show
    showUI();

    return () => {
      if (hideTimer) {
        clearTimeout(hideTimer);
      }
    };
  }, [isFocusMode, currentPage]);

  // Calculate reading speed (WPM)
  useEffect(() => {
    if (!document || !readingSessionId) return;

    const updateReadingSpeed = () => {
      const now = Date.now();
      const timeElapsed = (now - sessionStartTime) / 1000 / 60; // minutes
      const pagesRead = Math.max(0, currentPage - sessionStartPage);
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
    
    const currentTotalPages = totalPages !== null ? totalPages : (document.pageCount || 1);
    const pagesRemaining = Math.max(0, currentTotalPages - currentPage);
    const wordsRemaining = pagesRemaining * 250; // Estimate: 250 words per page
    const minutesRemaining = Math.ceil(wordsRemaining / readingSpeed);
    
    return minutesRemaining > 0 ? minutesRemaining : undefined;
  };

  const timeRemaining = calculateTimeRemaining();

  // Cleanup: end reading session and stop TTS when component unmounts
  useEffect(() => {
    return () => {
      if (readingSessionId && document) {
        const pagesRead = Math.max(0, currentPage - sessionStartPage);
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
  }, [readingSessionId, document, currentPage, sessionStartPage, isTTSPlaying]);

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
    if (!id) return;
    const doc = await getDocumentById(id);
    if (doc) {
      setDocument(doc);
      setCurrentDocument(doc);
      // Initialize totalPages - for PDFs, start with null so we know to update from onLoadComplete
      // For other formats, use document.pageCount
      setTotalPages(doc.format === 'pdf' ? null : (doc.pageCount || 1));
      setMaxPageSeen(doc.format === 'pdf' ? (doc.pageCount || 1) : 1);
      
      // Load reading position
      const position = await getReadingPosition(id);
      let initialPage = 1;
      if (position) {
        if (doc.format === 'pdf') {
          initialPage = position.position;
        } else {
          // For text documents, we could use position for scroll position later
          initialPage = 1;
        }
      }
      setCurrentPage(initialPage);
      setSessionStartPage(initialPage);
      
      // Start reading session
      try {
        const sessionId = await startReadingSession(doc.id);
        setReadingSessionId(sessionId);
        setSessionStartTime(Date.now());
      } catch (error) {
        console.error('Error starting reading session:', error);
      }
      
      // Load text content for non-PDF files
      if (doc.format !== 'pdf') {
        await loadTextContent(doc);
      }
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
        
        // Load first chapter content if available
        if (chapters.length > 0) {
          try {
            const firstChapter = chapters[0];
            const chapterHtml = await getEPUBChapterContent(doc.filePath, firstChapter.href);
            // Limit content size for memory management
            const maxSize = 5 * 1024 * 1024; // 5MB limit
            if (chapterHtml.length > maxSize) {
              setTextContent(chapterHtml.substring(0, maxSize) + '\n\n[... Content truncated ...]');
            } else {
              setTextContent(chapterHtml);
            }
            setCurrentChapter(0);
          } catch (error) {
            console.error('Error loading first chapter:', error);
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

  const saveReadingPosition = async (page: number) => {
    if (!document) return;
    
    const currentTotalPages = totalPages !== null ? totalPages : (document.pageCount || 1);
    const progress = (page / currentTotalPages) * 100;
    await upsertReadingPosition({
      id: `${document.id}-position`,
      documentId: document.id,
      position: page,
      progress: Math.min(100, Math.max(0, progress)),
      updatedAt: new Date().toISOString(),
    });

    // Update document last opened
    await updateDocument(document.id, {
      lastOpenedAt: new Date().toISOString(),
      status: document.status === 'unread' ? 'reading' : document.status,
    });
    
    // Update reading session periodically (every 5 pages or on significant progress)
    if (readingSessionId && Math.abs(page - sessionStartPage) >= 5) {
      try {
        const pagesRead = Math.max(0, page - sessionStartPage);
        // Estimate words read (rough estimate: 250 words per page)
        const wordsRead = pagesRead * 250;
        await endReadingSession(readingSessionId, pagesRead, wordsRead);
        // Start new session
        const newSessionId = await startReadingSession(document.id);
        setReadingSessionId(newSessionId);
        setSessionStartPage(page);
      } catch (error) {
        console.error('Error updating reading session:', error);
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
    
    saveReadingPosition(page);
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
      Alert.alert('Error', 'Failed to look up word. Please check your internet connection.');
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

    await addHighlight({
      documentId: document.id,
      type: highlightType,
      text: selectedText,
      startPosition: currentPage, // Simplified - would need actual text position
      endPosition: currentPage,
      color: settings.defaultHighlightColor,
    });

    if (noteText.trim()) {
      // Create note associated with highlight
      // This is simplified - in production, you'd need the highlight ID
    }

    setShowHighlightModal(false);
    setSelectedText('');
    setNoteText('');
  };

  const getThemeColors = () => {
    switch (settings.theme) {
      case 'dark':
        return { bg: '#1a1a1a', text: '#ffffff', border: '#333333' };
      case 'sepia':
        return { bg: '#f4e8d8', text: '#1a1a1a', border: '#d4c9bb' };
      default:
        return { bg: '#ffffff', text: '#1a1a1a', border: '#e8e3dc' };
    }
  };

  const themeColors = getThemeColors();

  if (!document) {
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
      // For EPUB, we'd need to calculate which chapter contains this page
      // For now, just update currentPage
      setCurrentPage(page);
      saveReadingPosition(page);
    } else {
      setCurrentPage(page);
      saveReadingPosition(page);
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1 && !isTransitioning) {
      handleJumpToPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    const currentTotalPages = totalPages !== null ? totalPages : (document?.pageCount || 1);
    if (currentPage < currentTotalPages && !isTransitioning) {
      handleJumpToPage(currentPage + 1);
    }
  };

  // Update handler refs so panResponder can call them
  handlePreviousPageRef.current = handlePreviousPage;
  handleNextPageRef.current = handleNextPage;

  const progress = document
    ? ((currentPage / (totalPages !== null ? totalPages : (document.pageCount || 1))) * 100)
    : 0;

  const pageTransitionOpacity = pageTransitionAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 0.3, 1],
  });

  const swipeTranslateX = swipeX;

  return (
    <View style={[styles.container, { backgroundColor: themeColors.bg }]}>
      <ReaderHeader
        title={document.title}
        isVisible={headerFooterVisible && !isFocusMode}
        onClose={() => router.back()}
        onBookmark={handleAddBookmark}
        onToggleBookmark={handleToggleBookmark}
        isBookmarked={isBookmarked}
        bookmarkCount={bookmarks.length}
        onShowBookmarks={() => setShowBookmarks(true)}
        onShowTOC={() => setShowTOC(true)}
        showTOC={document.format === 'epub' && epubChapters.length > 0}
        onToggleFocus={toggleFocusMode}
        onShowSettings={() => setShowSettings(true)}
        readingTimeRemaining={timeRemaining}
      />

      {isFocusMode && (
        <TouchableOpacity
          style={styles.focusModeButton}
          onPress={toggleFocusMode}
        >
          <EyeIcon size={24} color={themeColors.text} />
        </TouchableOpacity>
      )}

      {document.format === 'pdf' ? (
        pdfError || !Pdf ? (
          <View style={styles.fallbackContainer}>
            <Text style={[styles.fallbackText, { color: themeColors.text }]}>
              PDF rendering requires a development build with native modules.{'\n\n'}
              The development build needs to be rebuilt after adding react-native-pdf.
            </Text>
            <Text style={[styles.fallbackSubtext, { color: themeColors.text, marginTop: 16 }]}>
              To fix this:{'\n'}
              1. Run: eas build --profile development --platform android{'\n'}
              2. Install the new build{'\n'}
              3. Restart the app
            </Text>
            <Text style={[styles.fallbackSubtext, { color: themeColors.text, marginTop: 8 }]}>
              File: {document.title}
            </Text>
            {pdfError && (
              <Text style={[styles.fallbackSubtext, { color: themeColors.text, marginTop: 8, fontSize: 12 }]}>
                Error: {pdfError}
              </Text>
            )}
          </View>
        ) : (
          <Pdf
            ref={pdfRef}
            source={{ uri: document.filePath, cache: true }}
            page={currentPage}
            // Memory optimization: limit concurrent page rendering
            maxZoom={3}
            minZoom={0.5}
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
            horizontal
            spacing={10}
          />
        )
      ) : document.format === 'epub' ? (
        <Animated.View
          style={[
            styles.textContainer,
            {
              opacity: pageTransitionOpacity,
              transform: [{ translateX: swipeTranslateX }],
            },
          ]}
          {...panResponder.panHandlers}
        >
          <ScrollView
            style={styles.textContainer}
            contentContainerStyle={[
              styles.textContent,
              {
                padding: settings.margin,
              },
            ]}
            scrollEnabled={true}
          >
          {loadingContent ? (
            <Text style={[styles.loadingText, { color: themeColors.text }]}>
              Loading EPUB content...
            </Text>
          ) : textContent ? (
            <RenderHTML
              contentWidth={300}
              source={{ html: textContent }}
              baseStyle={{
                color: themeColors.text,
                fontSize: settings.fontSize,
                lineHeight: settings.fontSize * settings.lineSpacing,
                fontFamily:
                  settings.fontFamily && settings.fontFamily !== 'System'
                    ? settings.fontFamily
                    : undefined,
              }}
              tagsStyles={{
                div: { color: themeColors.text },
                p: { color: themeColors.text, marginBottom: 10 },
                h1: { color: themeColors.text, fontSize: settings.fontSize * 1.5, fontWeight: 'bold', marginBottom: 10 },
                h2: { color: themeColors.text, fontSize: settings.fontSize * 1.3, fontWeight: 'bold', marginBottom: 8 },
                h3: { color: themeColors.text, fontSize: settings.fontSize * 1.1, fontWeight: 'bold', marginBottom: 6 },
              }}
            />
          ) : epubContent && epubContent.text ? (
            <RenderHTML
              contentWidth={300}
              source={{ html: `<div style="color: ${themeColors.text}; font-size: ${settings.fontSize}px; line-height: ${settings.fontSize * settings.lineSpacing}px;">${epubContent.text.replace(/\n/g, '<br/>')}</div>` }}
              baseStyle={{
                color: themeColors.text,
                fontSize: settings.fontSize,
                lineHeight: settings.fontSize * settings.lineSpacing,
                fontFamily:
                  settings.fontFamily && settings.fontFamily !== 'System'
                    ? settings.fontFamily
                    : undefined,
              }}
              tagsStyles={{
                div: { color: themeColors.text },
                p: { color: themeColors.text, marginBottom: 10 },
                h1: { color: themeColors.text, fontSize: settings.fontSize * 1.5, fontWeight: 'bold', marginBottom: 10 },
                h2: { color: themeColors.text, fontSize: settings.fontSize * 1.3, fontWeight: 'bold', marginBottom: 8 },
                h3: { color: themeColors.text, fontSize: settings.fontSize * 1.1, fontWeight: 'bold', marginBottom: 6 },
              }}
            />
          ) : (
            <Text style={[styles.text, { color: themeColors.text }]}>
              No EPUB content available.
            </Text>
          )}
          </ScrollView>
        </Animated.View>
      ) : document.format === 'docx' ? (
        <Animated.View
          style={[
            styles.textContainer,
            {
              opacity: pageTransitionOpacity,
              transform: [{ translateX: swipeTranslateX }],
            },
          ]}
          {...panResponder.panHandlers}
        >
          <ScrollView
            style={styles.textContainer}
            contentContainerStyle={[
              styles.textContent,
              {
                padding: settings.margin,
              },
            ]}
            accessibilityLabel="DOCX content"
            accessibilityHint="Scroll to read the document"
            scrollEnabled={true}
          >
          {loadingContent ? (
            <Text style={[styles.loadingText, { color: themeColors.text }]}>
              Loading DOCX content...
            </Text>
          ) : docxContent && docxContent.html ? (
            <RenderHTML
              contentWidth={300}
              source={{ html: docxContent.html }}
              baseStyle={{
                color: themeColors.text,
                fontSize: settings.fontSize,
                lineHeight: settings.fontSize * settings.lineSpacing,
                fontFamily:
                  settings.fontFamily && settings.fontFamily !== 'System'
                    ? settings.fontFamily
                    : undefined,
              }}
              tagsStyles={{
                div: { color: themeColors.text },
                p: { color: themeColors.text, marginBottom: 10 },
                h1: { color: themeColors.text, fontSize: settings.fontSize * 1.5, fontWeight: 'bold', marginBottom: 10 },
                h2: { color: themeColors.text, fontSize: settings.fontSize * 1.3, fontWeight: 'bold', marginBottom: 8 },
                h3: { color: themeColors.text, fontSize: settings.fontSize * 1.1, fontWeight: 'bold', marginBottom: 6 },
                strong: { fontWeight: 'bold', color: themeColors.text },
                em: { fontStyle: 'italic', color: themeColors.text },
                ul: { color: themeColors.text, marginBottom: 10 },
                ol: { color: themeColors.text, marginBottom: 10 },
                li: { color: themeColors.text, marginBottom: 5 },
              }}
            />
          ) : (
            <HighlightedText
              text={textContent || 'No DOCX content available.'}
              highlights={highlights}
              onHighlightPress={(highlight) => {
                Alert.alert(
                  'Highlight',
                  highlight.text,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Delete',
                      style: 'destructive',
                      onPress: async () => {
                        try {
                          const { deleteHighlight } = await import('@/services/database');
                          await deleteHighlight(highlight.id);
                          await loadHighlights();
                        } catch (error) {
                          console.error('Error deleting highlight:', error);
                        }
                      },
                    },
                  ]
                );
              }}
              style={styles.text}
              fontSize={settings.fontSize}
              lineHeight={settings.fontSize * settings.lineSpacing}
              color={themeColors.text}
              fontFamily={
                settings.fontFamily && settings.fontFamily !== 'System'
                  ? settings.fontFamily
                  : undefined
              }
            />
          )}
          </ScrollView>
        </Animated.View>
      ) : (
        <Animated.View
          style={[
            styles.textContainer,
            {
              opacity: pageTransitionOpacity,
              transform: [{ translateX: swipeTranslateX }],
            },
          ]}
          {...panResponder.panHandlers}
        >
          <ScrollView
            style={styles.textContainer}
            contentContainerStyle={[
              styles.textContent,
              {
                padding: settings.margin,
              },
            ]}
            accessibilityLabel="Document content"
            accessibilityHint="Scroll to read the document"
            scrollEnabled={true}
          >
          {loadingContent ? (
            <Text style={[styles.loadingText, { color: themeColors.text }]}>
              Loading content...
            </Text>
          ) : (
            <HighlightedText
              text={textContent || 'No content available.'}
              highlights={highlights}
              onHighlightPress={(highlight) => {
                Alert.alert(
                  'Highlight',
                  highlight.text,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Delete',
                      style: 'destructive',
                      onPress: async () => {
                        try {
                          const { deleteHighlight } = await import('@/services/database');
                          await deleteHighlight(highlight.id);
                          await loadHighlights();
                        } catch (error) {
                          console.error('Error deleting highlight:', error);
                        }
                      },
                    },
                  ]
                );
              }}
              style={styles.text}
              fontSize={settings.fontSize}
              lineHeight={settings.fontSize * settings.lineSpacing}
              color={themeColors.text}
              fontFamily={
                settings.fontFamily && settings.fontFamily !== 'System'
                  ? settings.fontFamily
                  : undefined
              }
            />
          )}
          </ScrollView>
        </Animated.View>
      )}

      {showSelectionToolbar && selectedText && (
        <TextSelectionToolbar
          visible={showSelectionToolbar}
          selectedText={selectedText}
          position={selectionPosition}
          onHighlight={() => {
            setShowSelectionToolbar(false);
            setShowHighlightModal(true);
          }}
          onNote={() => {
            setShowSelectionToolbar(false);
            setShowHighlightModal(true);
          }}
          onCopy={handleCopyText}
          onShare={handleShareText}
          onLookup={handleLookupWord}
          onDismiss={() => setShowSelectionToolbar(false)}
        />
      )}

      <ReaderFooter
        isVisible={headerFooterVisible && !isFocusMode}
        currentPage={currentPage}
        totalPages={totalPages !== null ? totalPages : (document.pageCount || 1)}
        progress={progress}
        onPreviousPage={handlePreviousPage}
        onNextPage={handleNextPage}
        onJumpToPage={handleJumpToPage}
        readingSpeed={readingSpeed > 50 ? readingSpeed : undefined}
        timeRemaining={timeRemaining}
        format={document.format}
        currentChapter={currentChapter}
        totalChapters={epubChapters.length > 0 ? epubChapters.length : undefined}
      />

      {/* TTS Control Button */}
      {!isFocusMode && document && (document.format === 'txt' || document.format === 'epub' || document.format === 'docx') && (
        <TouchableOpacity
          style={[
            styles.ttsButton,
            {
              backgroundColor: colors.primary,
              position: 'absolute',
              bottom: 100,
              right: 20,
            },
          ]}
          onPress={handleToggleTTS}
          accessibilityRole="button"
          accessibilityLabel={isTTSPlaying ? 'Pause reading' : 'Start reading'}
        >
          {isTTSPlaying ? (
            <PauseIcon size={24} color="#ffffff" />
          ) : (
            <PlayIcon size={24} color="#ffffff" />
          )}
        </TouchableOpacity>
      )}

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

              <Text style={[styles.settingLabel, { color: themeColors.text }]}>
                Type:
              </Text>
              <View style={styles.highlightTypeRow}>
                {(['idea', 'definition', 'quote'] as HighlightType[]).map((type) => (
                  <TouchableOpacity
                    key={type}
                    onPress={() => setHighlightType(type)}
                    style={[
                      styles.highlightTypeButton,
                      highlightType === type && styles.highlightTypeButtonActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.highlightTypeText,
                        highlightType === type && styles.highlightTypeTextActive,
                      ]}
                    >
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.settingLabel, { color: themeColors.text }]}>
                Note (optional):
              </Text>
              <TextInput
                style={[
                  styles.noteInput,
                  { color: themeColors.text, borderColor: themeColors.border },
                ]}
                placeholder="Add a note..."
                placeholderTextColor="#9d8a70"
                value={noteText}
                onChangeText={setNoteText}
                multiline
              />

              <TouchableOpacity
                style={styles.createButton}
                onPress={handleCreateHighlight}
              >
                <Text style={styles.createButtonText}>Create Highlight</Text>
              </TouchableOpacity>
            </View>
          </View>
          </View>
        </Modal>

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
  ttsButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 50,
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
