/**
 * Text Selection Toolbar Component
 * Provides actions for selected text (highlight, note, copy, share, lookup)
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { BookmarkIcon, ShareIcon } from './Icons';
import { useThemeStore, lightColors, darkColors } from '@/stores/themeStore';

interface TextSelectionToolbarProps {
  visible: boolean;
  selectedText: string;
  position: { x: number; y: number };
  onHighlight: () => void;
  onNote: () => void;
  onCopy: () => void;
  onShare: () => void;
  onLookup?: () => void;
  onDismiss: () => void;
}

export function TextSelectionToolbar({
  visible,
  selectedText,
  position,
  onHighlight,
  onNote,
  onCopy,
  onShare,
  onLookup,
  onDismiss,
}: TextSelectionToolbarProps) {
  const resolvedTheme = useThemeStore((state) => state.resolvedTheme);
  const colors = resolvedTheme === 'dark' ? darkColors : lightColors;
  const opacity = React.useRef(new Animated.Value(0)).current;
  const translateY = React.useRef(new Animated.Value(10)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 10,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, opacity, translateY]);

  if (!visible || !selectedText.trim()) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          borderColor: colors.border,
          opacity,
          transform: [{ translateY }],
          top: position.y - 60,
          left: Math.max(10, Math.min(position.x - 100, 200)),
        },
      ]}
    >
      <View style={styles.toolbar}>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.surface }]}
          onPress={onHighlight}
          accessibilityRole="button"
          accessibilityLabel="Highlight text"
        >
          <Text style={[styles.buttonLabel, { color: colors.text }]}>Highlight</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.surface }]}
          onPress={onNote}
          accessibilityRole="button"
          accessibilityLabel="Add note"
        >
          <BookmarkIcon size={20} color={colors.primary} />
          <Text style={[styles.buttonLabel, { color: colors.text }]}>Note</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.surface }]}
          onPress={onCopy}
          accessibilityRole="button"
          accessibilityLabel="Copy text"
        >
          <Text style={[styles.buttonLabel, { color: colors.text }]}>Copy</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.surface }]}
          onPress={onShare}
          accessibilityRole="button"
          accessibilityLabel="Share text"
        >
          <ShareIcon size={20} color={colors.primary} />
          <Text style={[styles.buttonLabel, { color: colors.text }]}>Share</Text>
        </TouchableOpacity>

        {onLookup && (
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.surface }]}
            onPress={onLookup}
            accessibilityRole="button"
            accessibilityLabel="Lookup word"
          >
            <Text style={[styles.buttonLabel, { color: colors.text }]}>Lookup</Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    borderRadius: 12,
    borderWidth: 1,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1000,
  },
  toolbar: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  buttonLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
});
