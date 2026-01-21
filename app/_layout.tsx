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

export default function RootLayout() {
  const loadSettings = useReaderStore((state) => state.loadSettings);
  const loadTheme = useThemeStore((state) => state.loadTheme);

  useEffect(() => {
    // Initialize database and directories
    const initialize = async () => {
      try {
        await initDatabase();
        await initDocumentsDirectory();
        await loadSettings();
        await loadTheme();
      } catch (error) {
        console.error('Initialization error:', error);
      }
    };

    initialize();
  }, [loadSettings, loadTheme]);

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
