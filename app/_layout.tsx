/**
 * Root layout for Expo Router
 */

import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { View, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import '../global.css';
import { initDatabase } from '@/services/database';
import { initDocumentsDirectory } from '@/services/documentImport';
import { useReaderStore } from '@/stores/readerStore';
import { useThemeStore } from '@/stores/themeStore';
import { useDocumentStore } from '@/stores/documentStore';

// Conditional import for react-native-gesture-handler
// Use View as fallback if gesture handler is not available
// Wrap in IIFE to isolate any errors during module load
const GestureHandlerRootView = (() => {
  try {
    // Check platform if available - use try-catch to handle any Platform access issues
    let isWeb = false;
    try {
      // Access Platform from react-native - it should be imported above
      if (typeof Platform !== 'undefined' && Platform && Platform.OS === 'web') {
        isWeb = true;
      }
    } catch (e) {
      // Platform not available, assume native
      isWeb = false;
    }
    
    if (isWeb) {
      return View;
    }
    
    // Use a function to delay the require evaluation and catch any errors
    const loadGestureHandler = () => {
      try {
        const gestureHandler = require('react-native-gesture-handler');
        if (gestureHandler && gestureHandler.GestureHandlerRootView) {
          return gestureHandler.GestureHandlerRootView;
        }
        return null;
      } catch (e) {
        // Module not available or not linked
        return null;
      }
    };
    const Component = loadGestureHandler();
    return Component || View;
  } catch (e) {
    // Any error, fallback to View
    return View;
  }
})();

export default function RootLayout() {
  const loadSettings = useReaderStore((state) => state.loadSettings);
  const loadTheme = useThemeStore((state) => state.loadTheme);
  const loadDocuments = useDocumentStore((state) => state.loadDocuments);

  useEffect(() => {
    // Initialize database and directories, then load documents
    const initialize = async () => {
      try {
        console.log('Initializing app...');
        await initDatabase();
        await initDocumentsDirectory();
        await loadSettings();
        await loadTheme();
        // Load documents after database is ready
        await loadDocuments();
        console.log('App initialization complete');
      } catch (error) {
        console.error('Initialization error:', error);
      }
    };

    initialize();
  }, [loadSettings, loadTheme, loadDocuments]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Stack
          screenOptions={{
            headerShown: false,
          }}
        >
          <Stack.Screen name="(tabs)" />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
