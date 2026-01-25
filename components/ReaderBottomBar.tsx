/**
 * Minimal Reader Bottom Bar
 * Appears on single tap, auto-hides after inactivity
 */

import React, { useEffect, useRef } from 'react';
import { View, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { PenIcon, DocumentIcon, LightbulbIcon, BellIcon, TypographyIcon } from './Icons';
import { useThemeStore, lightColors, darkColors } from '@/stores/themeStore';

interface ReaderBottomBarProps {
  isVisible: boolean;
  onHighlight: () => void;
  onNote: () => void;
  onUnderstand: () => void;
  onBell?: () => void;
  onSettings: () => void;
  backgroundColor?: string;
  iconColor?: string;
}

export function ReaderBottomBar({
  isVisible,
  onHighlight,
  onNote,
  onUnderstand,
  onBell,
  onSettings,
  backgroundColor,
  iconColor,
}: ReaderBottomBarProps) {
  const resolvedTheme = useThemeStore((state) => state.resolvedTheme);
  const colors = resolvedTheme === 'dark' ? darkColors : lightColors;
  const bg = backgroundColor ?? colors.background;
  const fg = iconColor ?? colors.text;
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(100)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: isVisible ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: isVisible ? 0 : 100,
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
      <TouchableOpacity onPress={onHighlight} style={styles.button} accessibilityRole="button" accessibilityLabel="Highlight">
        <PenIcon size={22} color={fg} />
      </TouchableOpacity>
      <TouchableOpacity onPress={onNote} style={styles.button} accessibilityRole="button" accessibilityLabel="Add note">
        <DocumentIcon size={22} color={fg} />
      </TouchableOpacity>
      <TouchableOpacity onPress={onUnderstand} style={styles.button} accessibilityRole="button" accessibilityLabel="Understand with AI">
        <LightbulbIcon size={22} color={fg} />
      </TouchableOpacity>
      {onBell && (
        <TouchableOpacity onPress={onBell} style={styles.button} accessibilityRole="button" accessibilityLabel="Notifications">
          <BellIcon size={22} color={fg} />
        </TouchableOpacity>
      )}
      <TouchableOpacity onPress={onSettings} style={styles.button} accessibilityRole="button" accessibilityLabel="Reader settings">
        <TypographyIcon size={22} color={fg} />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    zIndex: 1000,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.08)',
  },
  button: {
    flex: 1,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
