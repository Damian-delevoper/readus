/**
 * Animation utilities
 * Provides reusable animation configurations
 */

import { Animated } from 'react-native';

/**
 * Fade in animation
 */
export function fadeIn(duration: number = 300): Animated.CompositeAnimation {
  const opacity = new Animated.Value(0);
  return {
    start: (callback?: () => void) => {
      Animated.timing(opacity, {
        toValue: 1,
        duration,
        useNativeDriver: true,
      }).start(callback);
    },
    opacity,
  } as any;
}

/**
 * Slide in from bottom animation
 */
export function slideInFromBottom(duration: number = 300): Animated.CompositeAnimation {
  const translateY = new Animated.Value(100);
  return {
    start: (callback?: () => void) => {
      Animated.timing(translateY, {
        toValue: 0,
        duration,
        useNativeDriver: true,
      }).start(callback);
    },
    translateY,
  } as any;
}

/**
 * Scale animation
 */
export function scale(duration: number = 200): Animated.CompositeAnimation {
  const scale = new Animated.Value(1);
  return {
    start: (callback?: () => void) => {
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 0.95,
          duration: duration / 2,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: duration / 2,
          useNativeDriver: true,
        }),
      ]).start(callback);
    },
    scale,
  } as any;
}

/**
 * Shake animation
 */
export function shake(duration: number = 200): Animated.CompositeAnimation {
  const translateX = new Animated.Value(0);
  return {
    start: (callback?: () => void) => {
      Animated.sequence([
        Animated.timing(translateX, { toValue: -10, duration: duration / 4, useNativeDriver: true }),
        Animated.timing(translateX, { toValue: 10, duration: duration / 4, useNativeDriver: true }),
        Animated.timing(translateX, { toValue: -10, duration: duration / 4, useNativeDriver: true }),
        Animated.timing(translateX, { toValue: 0, duration: duration / 4, useNativeDriver: true }),
      ]).start(callback);
    },
    translateX,
  } as any;
}
