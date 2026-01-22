/**
 * Skeleton Loader Component
 * Shows loading placeholders
 */

import React from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useThemeStore, lightColors, darkColors } from '@/stores/themeStore';

interface SkeletonLoaderProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

export function SkeletonLoader({
  width = '100%',
  height = 20,
  borderRadius = 4,
  style,
}: SkeletonLoaderProps) {
  const resolvedTheme = useThemeStore((state) => state.resolvedTheme);
  const colors = resolvedTheme === 'dark' ? darkColors : lightColors;
  const [opacity] = React.useState(new Animated.Value(0.3));

  React.useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: colors.border,
          opacity,
        },
        style,
      ]}
    />
  );
}

export function DocumentCardSkeleton({ viewMode = 'list' }: { viewMode?: 'list' | 'grid' }) {
  const resolvedTheme = useThemeStore((state) => state.resolvedTheme);
  const colors = resolvedTheme === 'dark' ? darkColors : lightColors;
  const isGrid = viewMode === 'grid';

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card },
        isGrid && styles.cardGrid,
      ]}
    >
      <SkeletonLoader width="70%" height={20} style={styles.titleSkeleton} />
      <SkeletonLoader width="50%" height={16} style={styles.metaSkeleton} />
      <View style={styles.footerSkeleton}>
        <SkeletonLoader width={60} height={20} borderRadius={4} />
        <SkeletonLoader width={80} height={14} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 8,
    marginBottom: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardGrid: {
    flex: 1,
    margin: 4,
    minHeight: 180,
  },
  titleSkeleton: {
    marginBottom: 12,
  },
  metaSkeleton: {
    marginBottom: 16,
  },
  footerSkeleton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
