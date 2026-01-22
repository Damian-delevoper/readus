/**
 * Root layout for Expo Router
 */

import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import '../global.css';
import { initDatabase } from '@/services/database';
import { initDocumentsDirectory } from '@/services/documentImport';
import { useReaderStore } from '@/stores/readerStore';
import { useThemeStore } from '@/stores/themeStore';
import { useDocumentStore } from '@/stores/documentStore';

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
    <SafeAreaProvider>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="(tabs)" />
      </Stack>
    </SafeAreaProvider>
  );
}
