/**
 * ZoomableScrollView - Provides pinch-to-zoom functionality for both iOS and Android
 * Uses native ScrollView zoom on iOS, and pinch gesture with transform on Android
 */

import React, { forwardRef } from 'react';
import { Platform, ScrollView, ScrollViewProps } from 'react-native';

// Conditional import for react-native-gesture-handler
let GestureScrollView: any = ScrollView;
let GestureDetector: any = null;
let Gesture: any = null;

try {
  const gestureHandler = require('react-native-gesture-handler');
  if (gestureHandler?.ScrollView) {
    GestureScrollView = gestureHandler.ScrollView;
  }
  GestureDetector = gestureHandler?.GestureDetector;
  Gesture = gestureHandler?.Gesture;
} catch (e) {
  // Fallback to regular ScrollView if gesture handler is not available
}

// Conditional import for react-native-reanimated
let useSharedValue: any = null;
let useAnimatedStyle: any = null;
let Animated: any = null;

try {
  const reanimated = require('react-native-reanimated');
  useSharedValue = reanimated?.useSharedValue;
  useAnimatedStyle = reanimated?.useAnimatedStyle;
  Animated = reanimated?.default;
} catch (e) {
  // Reanimated not available, will use regular ScrollView
}

interface ZoomableScrollViewProps extends ScrollViewProps {
  children: React.ReactNode;
  minZoom?: number;
  maxZoom?: number;
}

export const ZoomableScrollView = forwardRef<any, ZoomableScrollViewProps>(({
  children,
  minZoom = 0.5,
  maxZoom = 3.0,
  ...scrollViewProps
}, ref) => {
  // On iOS, use native ScrollView zoom (best performance and UX)
  if (Platform.OS === 'ios') {
    return (
      <ScrollView
        ref={ref}
        {...scrollViewProps}
        maximumZoomScale={maxZoom}
        minimumZoomScale={minZoom}
        zoomScale={1.0}
        bouncesZoom={true}
        decelerationRate="fast"
        scrollEventThrottle={1}
      >
        {children}
      </ScrollView>
    );
  }

  // On Android, use gesture handler ScrollView with zoom wrapper
  // The zoom is handled by wrapping children, not the ScrollView itself
  // This allows scrolling to work normally while still supporting pinch-to-zoom
  return (
    <GestureScrollView
      ref={ref}
      {...scrollViewProps}
      scrollEnabled={true}
      bounces={false}
      decelerationRate="fast"
      scrollEventThrottle={1}
    >
      {Platform.OS === 'android' && GestureDetector && Gesture && useSharedValue && useAnimatedStyle && Animated ? (
        <AndroidZoomableContent minZoom={minZoom} maxZoom={maxZoom}>
          {children}
        </AndroidZoomableContent>
      ) : (
        children
      )}
    </GestureScrollView>
  );
});

ZoomableScrollView.displayName = 'ZoomableScrollView';

// Android-specific zoomable content wrapper
// This wraps only the content, not the ScrollView, so scrolling works normally
function AndroidZoomableContent({
  children,
  minZoom = 0.5,
  maxZoom = 3.0,
}: {
  children: React.ReactNode;
  minZoom?: number;
  maxZoom?: number;
}) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const lastScale = useSharedValue(1);

  // Pinch gesture for zooming - only activates with 2 fingers
  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      lastScale.value = savedScale.value;
    })
    .onUpdate((e) => {
      const newScale = Math.max(minZoom, Math.min(maxZoom, lastScale.value * e.scale));
      scale.value = newScale;
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      // Clamp to bounds
      if (scale.value < minZoom) {
        scale.value = minZoom;
        savedScale.value = minZoom;
      } else if (scale.value > maxZoom) {
        scale.value = maxZoom;
        savedScale.value = maxZoom;
      }
    })
    .minPointers(2)
    .maxPointers(2);

  // Animated style for zoom
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  return (
    <GestureDetector gesture={pinchGesture}>
      <Animated.View 
        style={[
          animatedStyle,
          { 
            width: '100%',
            minHeight: '100%',
            // Ensure content takes full width for proper scrolling
          }
        ]} 
        collapsable={false}
      >
        {children}
      </Animated.View>
    </GestureDetector>
  );
}
