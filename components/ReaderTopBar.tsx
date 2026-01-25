/**
 * Minimal Reader Top Bar
 * Appears on single tap, auto-hides after inactivity
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { ChevronLeftIcon, MoreVerticalIcon } from './Icons';
import { useThemeStore, lightColors, darkColors } from '@/stores/themeStore';

interface ReaderTopBarProps {
  isVisible: boolean;
  title: string;
  onClose: () => void;
  onOptions: () => void;
  /** Override to blend with reader background (reader theme) */
  backgroundColor?: string;
  textColor?: string;
}

export function ReaderTopBar({
  isVisible,
  title,
  onClose,
  onOptions,
  backgroundColor,
  textColor,
}: ReaderTopBarProps) {
  const resolvedTheme = useThemeStore((state) => state.resolvedTheme);
  const colors = resolvedTheme === 'dark' ? darkColors : lightColors;
  const bg = backgroundColor ?? colors.background;
  const fg = textColor ?? colors.text;
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: isVisible ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: isVisible ? 0 : -100,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isVisible, opacity, translateY]);

  // Always render to allow animations

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: bg,
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <TouchableOpacity
        onPress={onClose}
        style={styles.button}
        accessibilityRole="button"
        accessibilityLabel="Back"
      >
        <ChevronLeftIcon size={24} color={fg} />
      </TouchableOpacity>

      <Text
        style={[styles.title, { color: fg, fontFamily: 'Georgia' }]}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {title}
      </Text>

      <TouchableOpacity
        onPress={onOptions}
        style={styles.button}
        accessibilityRole="button"
        accessibilityLabel="Options menu"
      >
        <MoreVerticalIcon size={24} color={fg} />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    zIndex: 1000,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  button: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
    marginHorizontal: 12,
  },
});
