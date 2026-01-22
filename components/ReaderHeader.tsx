/**
 * Enhanced Reader Header Component
 * Collapsible header with auto-hide and enhanced controls
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { XIcon, BookmarkIcon, ListIcon, EyeOffIcon, SettingsIcon, ShareIcon, InfoIcon } from './Icons';
import { useThemeStore, lightColors, darkColors } from '@/stores/themeStore';

interface ReaderHeaderProps {
  title: string;
  isVisible: boolean;
  onClose: () => void;
  onBookmark: () => void;
  onToggleBookmark: () => void;
  isBookmarked: boolean;
  bookmarkCount: number;
  onShowBookmarks: () => void;
  onShowTOC: () => void;
  showTOC: boolean;
  onToggleFocus: () => void;
  onShowSettings: () => void;
  onShare?: () => void;
  onInfo?: () => void;
  readingTimeRemaining?: number; // in minutes
}

export function ReaderHeader({
  title,
  isVisible,
  onClose,
  onBookmark,
  onToggleBookmark,
  isBookmarked,
  bookmarkCount,
  onShowBookmarks,
  onShowTOC,
  showTOC,
  onToggleFocus,
  onShowSettings,
  onShare,
  onInfo,
  readingTimeRemaining,
}: ReaderHeaderProps) {
  const resolvedTheme = useThemeStore((state) => state.resolvedTheme);
  const colors = resolvedTheme === 'dark' ? darkColors : lightColors;
  const opacity = useRef(new Animated.Value(isVisible ? 1 : 0)).current;
  const translateY = useRef(new Animated.Value(isVisible ? 0 : -100)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: isVisible ? 1 : 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: isVisible ? 0 : -100,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isVisible, opacity, translateY]);

  // Note: We can't check opacity._value directly in TypeScript, so we'll always render
  // The Animated.View will handle the visibility

  return (
    <Animated.View
      style={[
        styles.header,
        {
          backgroundColor: colors.background,
          borderBottomColor: colors.border,
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <TouchableOpacity
        onPress={onClose}
        style={styles.headerButton}
        accessibilityRole="button"
        accessibilityLabel="Close reader"
      >
        <XIcon size={24} color={colors.text} />
      </TouchableOpacity>

      <View style={styles.titleContainer}>
        <Text
          style={[styles.title, { color: colors.text }]}
          numberOfLines={1}
          accessibilityRole="header"
        >
          {title}
        </Text>
        {readingTimeRemaining !== undefined && readingTimeRemaining > 0 && (
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            ~{readingTimeRemaining} min remaining
          </Text>
        )}
      </View>

      <View style={styles.headerRight}>
        <TouchableOpacity
          onPress={onToggleBookmark}
          style={styles.headerButton}
          accessibilityRole="button"
          accessibilityLabel={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
        >
          <BookmarkIcon
            size={24}
            color={isBookmarked ? '#f59e0b' : colors.text}
          />
        </TouchableOpacity>

        {bookmarkCount > 0 && (
          <TouchableOpacity
            onPress={onShowBookmarks}
            style={styles.headerButton}
            accessibilityRole="button"
            accessibilityLabel={`${bookmarkCount} bookmarks`}
          >
            <Text style={[styles.bookmarkCount, { color: colors.text }]}>
              {bookmarkCount}
            </Text>
          </TouchableOpacity>
        )}

        {showTOC && (
          <TouchableOpacity
            onPress={onShowTOC}
            style={styles.headerButton}
            accessibilityRole="button"
            accessibilityLabel="Table of contents"
          >
            <ListIcon size={24} color={colors.text} />
          </TouchableOpacity>
        )}

        {onShare && (
          <TouchableOpacity
            onPress={onShare}
            style={styles.headerButton}
            accessibilityRole="button"
            accessibilityLabel="Share document"
          >
            <ShareIcon size={24} color={colors.text} />
          </TouchableOpacity>
        )}

        {onInfo && (
          <TouchableOpacity
            onPress={onInfo}
            style={styles.headerButton}
            accessibilityRole="button"
            accessibilityLabel="Document information"
          >
            <InfoIcon size={24} color={colors.text} />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={onToggleFocus}
          style={styles.headerButton}
          accessibilityRole="button"
          accessibilityLabel="Toggle focus mode"
        >
          <EyeOffIcon size={24} color={colors.text} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onShowSettings}
          style={styles.headerButton}
          accessibilityRole="button"
          accessibilityLabel="Reader settings"
        >
          <SettingsIcon size={24} color={colors.text} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 60,
    borderBottomWidth: 1,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  headerButton: {
    padding: 8,
    minWidth: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleContainer: {
    flex: 1,
    marginHorizontal: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bookmarkCount: {
    fontSize: 14,
    fontWeight: '600',
  },
});
