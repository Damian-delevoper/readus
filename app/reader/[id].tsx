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
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { XIcon, SettingsIcon, EyeIcon, EyeOffIcon } from '@/components/Icons';
import { useDocumentStore } from '@/stores/documentStore';
import { useReaderStore } from '@/stores/readerStore';
import { useHighlightStore } from '@/stores/highlightStore';
import { getDocumentById, getReadingPosition, upsertReadingPosition, updateDocument } from '@/services/database';
import { Document, HighlightType } from '@/types';
import * as FileSystem from 'expo-file-system';

export default function ReaderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const pdfRef = useRef<any>(null);

  const { setCurrentDocument } = useDocumentStore();
  const { settings, isFocusMode, toggleFocusMode, updateSettings } = useReaderStore();
  const { addHighlight, addNote } = useHighlightStore();

  const [document, setDocument] = useState<Document | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [showHighlightModal, setShowHighlightModal] = useState(false);
  const [highlightType, setHighlightType] = useState<HighlightType>('idea');
  const [noteText, setNoteText] = useState('');

  useEffect(() => {
    loadDocument();
  }, [id]);

  const loadDocument = async () => {
    if (!id) return;
    const doc = await getDocumentById(id);
    if (doc) {
      setDocument(doc);
      setCurrentDocument(doc);
      
      // Load reading position
      const position = await getReadingPosition(id);
      if (position && doc.format === 'pdf') {
        setCurrentPage(position.position);
      }
    }
  };

  const saveReadingPosition = async (page: number) => {
    if (!document) return;
    
    const progress = (page / document.pageCount) * 100;
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
  };

  const handlePageChange = (page: number, numberOfPages: number) => {
    setCurrentPage(page);
    saveReadingPosition(page);
  };

  const handleTextSelection = (text: string) => {
    setSelectedText(text);
    setShowHighlightModal(true);
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
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading document...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: themeColors.bg }]}>
      {!isFocusMode && (
        <View style={[styles.header, { borderBottomColor: themeColors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
            <XIcon size={24} color={themeColors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: themeColors.text }]} numberOfLines={1}>
            {document.title}
          </Text>
          <View style={styles.headerRight}>
            <TouchableOpacity
              onPress={toggleFocusMode}
              style={styles.headerButton}
            >
              <EyeOffIcon size={24} color={themeColors.text} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowSettings(true)}
              style={styles.headerButton}
            >
              <SettingsIcon size={24} color={themeColors.text} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {isFocusMode && (
        <TouchableOpacity
          style={styles.focusModeButton}
          onPress={toggleFocusMode}
        >
          <EyeIcon size={24} color={themeColors.text} />
        </TouchableOpacity>
      )}

      {document.format === 'pdf' ? (
        (() => {
          // react-native-pdf requires native modules - use fallback in Expo Go
          try {
            const Pdf = require('react-native-pdf').default;
            return (
              <Pdf
                ref={pdfRef}
                source={{ uri: document.filePath, cache: true }}
                page={currentPage}
                onPageChanged={handlePageChange}
                onLoadComplete={(numberOfPages: number) => {
                  // PDF loaded
                }}
                style={styles.pdf}
                enablePaging
                horizontal
                spacing={10}
              />
            );
          } catch (e) {
            // Fallback for Expo Go or when PDF library is not available
            return (
              <View style={styles.fallbackContainer}>
                <Text style={[styles.fallbackText, { color: themeColors.text }]}>
                  PDF rendering requires a development build.{'\n'}
                  This feature is not available in Expo Go.
                </Text>
                <Text style={[styles.fallbackSubtext, { color: themeColors.text }]}>
                  File: {document.title}
                </Text>
              </View>
            );
          }
        })()
      ) : (
        <ScrollView
          style={styles.textContainer}
          contentContainerStyle={[
            styles.textContent,
            {
              padding: settings.margin,
            },
          ]}
        >
          <Text
            style={[
              styles.text,
              {
                color: themeColors.text,
                fontSize: settings.fontSize,
                lineHeight: settings.fontSize * settings.lineSpacing,
              },
            ]}
            selectable
          >
            {/* Text content would be loaded here */}
            Document content will be displayed here...
          </Text>
        </ScrollView>
      )}

      {!isFocusMode && (
        <View style={[styles.footer, { borderTopColor: themeColors.border }]}>
          <Text style={[styles.pageInfo, { color: themeColors.text }]}>
            {currentPage} / {document.pageCount}
          </Text>
        </View>
      )}

      {/* Settings Modal */}
      <Modal
        visible={showSettings}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSettings(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: themeColors.bg }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: themeColors.text }]}>
                Reader Settings
              </Text>
              <TouchableOpacity onPress={() => setShowSettings(false)}>
                <XIcon size={24} color={themeColors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              {/* Settings controls would go here */}
              <Text style={[styles.settingLabel, { color: themeColors.text }]}>
                Font Size: {settings.fontSize}px
              </Text>
              <View style={styles.sliderRow}>
                <TouchableOpacity
                  onPress={() => updateSettings({ fontSize: Math.max(12, settings.fontSize - 2) })}
                  style={styles.sliderButton}
                >
                  <Text style={styles.sliderButtonText}>-</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => updateSettings({ fontSize: Math.min(24, settings.fontSize + 2) })}
                  style={styles.sliderButton}
                >
                  <Text style={styles.sliderButtonText}>+</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingText: {
    fontSize: 16,
    color: '#6f5f4d',
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
    borderTopWidth: 1,
    alignItems: 'center',
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
});
