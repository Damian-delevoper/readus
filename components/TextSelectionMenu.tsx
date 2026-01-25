/**
 * Text Selection Context Menu
 * Pill-shaped menu above selected text: Highlight, Add Note, Explain, Simplify, Copy.
 * No icons. Light background, dark text, soft shadow.
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  useWindowDimensions,
} from 'react-native';

interface TextSelectionMenuProps {
  visible: boolean;
  selectedText: string;
  position: { x: number; y: number };
  onHighlight: () => void;
  onNote: () => void;
  onExplain: () => void;
  onSimplify: () => void;
  onCopy: () => void;
  onDismiss: () => void;
  /** Reader theme background (blend) */
  backgroundColor?: string;
  /** Reader theme text color */
  textColor?: string;
}

const PILL_HEIGHT = 44;
const PILL_MIN_WIDTH = 280;
const PILL_MAX_WIDTH = 340;

export function TextSelectionMenu({
  visible,
  position,
  onHighlight,
  onNote,
  onExplain,
  onSimplify,
  onCopy,
  onDismiss,
  backgroundColor = '#f5f3f0',
  textColor = '#1a1a1a',
}: TextSelectionMenuProps) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          tension: 120,
          friction: 10,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 160,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 0.92,
          duration: 160,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, opacity, scale]);

  // Position directly above selected text. position.y = top or center of selection.
  const gap = 10;
  const top = Math.max(60, Math.min(position.y - PILL_HEIGHT - gap, screenHeight - PILL_HEIGHT - 80));
  const pillWidth = Math.min(PILL_MAX_WIDTH, Math.max(PILL_MIN_WIDTH, screenWidth - 32));
  const left = Math.max(16, Math.min(position.x - pillWidth / 2, screenWidth - pillWidth - 16));

  return (
    <View style={styles.overlay} onTouchStart={onDismiss}>
      <Animated.View
        style={[
          styles.pill,
          {
            backgroundColor,
            opacity,
            transform: [{ scale }],
            top,
            left,
            width: pillWidth,
          },
        ]}
        onTouchStart={(e) => e.stopPropagation()}
      >
        <TouchableOpacity style={[styles.segment, styles.segmentFirst, styles.highlightSegment]} onPress={onHighlight}>
          <Text style={[styles.segmentText, { color: textColor }, styles.highlightSegmentText]}>Highlight</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.segment} onPress={onNote}>
          <Text style={[styles.segmentText, { color: textColor }]}>Add Note</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.segment} onPress={onExplain}>
          <Text style={[styles.segmentText, { color: textColor }]}>Explain</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.segment} onPress={onSimplify}>
          <Text style={[styles.segmentText, { color: textColor }]}>Simplify</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.segment, styles.segmentLast]} onPress={onCopy}>
          <Text style={[styles.segmentText, { color: textColor }]}>Copy</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2000,
  },
  pill: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: PILL_HEIGHT,
    borderRadius: 22,
    paddingHorizontal: 4,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  segment: {
    flex: 1,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  segmentFirst: {
    borderTopLeftRadius: 18,
    borderBottomLeftRadius: 18,
  },
  segmentLast: {
    borderTopRightRadius: 18,
    borderBottomRightRadius: 18,
  },
  highlightSegment: {
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '500',
  },
  highlightSegmentText: {
    fontWeight: '600',
  },
});
