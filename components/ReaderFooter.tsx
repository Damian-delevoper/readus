/**
 * Enhanced Reader Footer Component
 * Enhanced footer with progress, navigation, and reading stats
 */

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, TextInput, Modal, Alert } from 'react-native';
import { ChevronLeftIcon, ChevronRightIcon } from './Icons';
import { useThemeStore, lightColors, darkColors } from '@/stores/themeStore';

interface ReaderFooterProps {
  isVisible: boolean;
  currentPage: number;
  totalPages: number;
  progress: number; // 0-100
  onPreviousPage: () => void;
  onNextPage: () => void;
  onJumpToPage: (page: number) => void;
  readingSpeed?: number; // WPM
  timeRemaining?: number; // in minutes
  format: 'pdf' | 'epub' | 'txt' | 'docx';
  currentChapter?: number;
  totalChapters?: number;
}

export function ReaderFooter({
  isVisible,
  currentPage,
  totalPages,
  progress,
  onPreviousPage,
  onNextPage,
  onJumpToPage,
  readingSpeed,
  timeRemaining,
  format,
  currentChapter,
  totalChapters,
}: ReaderFooterProps) {
  const resolvedTheme = useThemeStore((state) => state.resolvedTheme);
  const colors = resolvedTheme === 'dark' ? darkColors : lightColors;
  const opacity = useRef(new Animated.Value(isVisible ? 1 : 0)).current;
  const translateY = useRef(new Animated.Value(isVisible ? 0 : 100)).current;
  const [showJumpModal, setShowJumpModal] = useState(false);
  const [jumpPageInput, setJumpPageInput] = useState('');

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: isVisible ? 1 : 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: isVisible ? 0 : 100,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isVisible, opacity, translateY]);

  const handleJumpToPage = () => {
    const page = parseInt(jumpPageInput, 10);
    if (page >= 1 && page <= totalPages) {
      onJumpToPage(page);
      setShowJumpModal(false);
      setJumpPageInput('');
    } else {
      Alert.alert('Invalid Page', `Please enter a page number between 1 and ${totalPages}`);
    }
  };

  const canGoPrevious = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  // Note: We can't check opacity._value directly in TypeScript, so we'll always render
  // The Animated.View will handle the visibility

  return (
    <>
      <Animated.View
        style={[
          styles.footer,
          {
            backgroundColor: colors.background,
            borderTopColor: colors.border,
            opacity,
            transform: [{ translateY }],
          },
        ]}
      >
        {/* Progress Bar */}
        <View style={[styles.progressBarContainer, { backgroundColor: colors.border }]}>
          <View
            style={[
              styles.progressBar,
              {
                width: `${progress}%`,
                backgroundColor: colors.primary,
              },
            ]}
          />
        </View>

        {/* Main Footer Content */}
        <View style={styles.footerContent}>
          {/* Navigation Controls */}
          <View style={styles.navigationControls}>
            <TouchableOpacity
              onPress={onPreviousPage}
              disabled={!canGoPrevious}
              style={[
                styles.navButton,
                { backgroundColor: colors.surface },
                !canGoPrevious && styles.navButtonDisabled,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Previous page"
            >
              <ChevronLeftIcon
                size={20}
                color={canGoPrevious ? colors.text : colors.textSecondary}
              />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowJumpModal(true)}
              style={[styles.pageInfoContainer, { backgroundColor: colors.surface }]}
              accessibilityRole="button"
              accessibilityLabel="Jump to page"
            >
              <Text style={[styles.pageInfo, { color: colors.text }]}>
                {format === 'epub' && totalChapters
                  ? `Ch. ${currentChapter || 1}/${totalChapters}`
                  : `${currentPage}/${totalPages}`}
              </Text>
              {progress > 0 && (
                <Text style={[styles.progressPercent, { color: colors.textSecondary }]}>
                  {Math.round(progress)}%
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onNextPage}
              disabled={!canGoNext}
              style={[
                styles.navButton,
                { backgroundColor: colors.surface },
                !canGoNext && styles.navButtonDisabled,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Next page"
            >
              <ChevronRightIcon
                size={20}
                color={canGoNext ? colors.text : colors.textSecondary}
              />
            </TouchableOpacity>
          </View>

          {/* Reading Stats */}
          {(readingSpeed !== undefined || timeRemaining !== undefined) && (
            <View style={styles.statsContainer}>
              {readingSpeed !== undefined && readingSpeed > 0 && (
                <Text style={[styles.statsText, { color: colors.textSecondary }]}>
                  {readingSpeed} WPM
                </Text>
              )}
              {timeRemaining !== undefined && timeRemaining > 0 && (
                <Text style={[styles.statsText, { color: colors.textSecondary }]}>
                  ~{timeRemaining} min left
                </Text>
              )}
            </View>
          )}
        </View>
      </Animated.View>

      {/* Jump to Page Modal */}
      <Modal
        visible={showJumpModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowJumpModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Jump to Page
            </Text>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
              Enter page number (1-{totalPages})
            </Text>
            <TextInput
              style={[
                styles.jumpInput,
                { backgroundColor: colors.background, color: colors.text, borderColor: colors.border },
              ]}
              value={jumpPageInput}
              onChangeText={setJumpPageInput}
              keyboardType="numeric"
              placeholder="Page number"
              placeholderTextColor={colors.textSecondary}
              autoFocus
              onSubmitEditing={handleJumpToPage}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.surface }]}
                onPress={() => {
                  setShowJumpModal(false);
                  setJumpPageInput('');
                }}
              >
                <Text style={[styles.modalButtonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.primary }]}
                onPress={handleJumpToPage}
              >
                <Text style={[styles.modalButtonText, { color: '#ffffff' }]}>
                  Go
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    padding: 12,
    paddingBottom: 20,
    zIndex: 100,
  },
  progressBarContainer: {
    height: 4,
    borderRadius: 2,
    marginBottom: 12,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
  footerContent: {
    gap: 8,
  },
  navigationControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  pageInfoContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 100,
    alignItems: 'center',
  },
  pageInfo: {
    fontSize: 16,
    fontWeight: '600',
  },
  progressPercent: {
    fontSize: 12,
    marginTop: 2,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  statsText: {
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    borderRadius: 16,
    padding: 24,
    minWidth: 280,
    maxWidth: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    marginBottom: 16,
  },
  jumpInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
