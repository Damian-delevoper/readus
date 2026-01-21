/**
 * Library screen - main document library view
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { PlusIcon } from '@/components/Icons';
import { useDocumentStore } from '@/stores/documentStore';
import { DocumentCard } from '@/components/DocumentCard';
import { EmptyState } from '@/components/EmptyState';
import { importDocument } from '@/services/documentImport';
import { Document, DocumentStatus } from '@/types';
import { useThemeStore, lightColors, darkColors } from '@/stores/themeStore';

type LibraryView = 'all' | 'reading' | 'finished' | 'unread';

export default function LibraryScreen() {
  const router = useRouter();
  const { documents, isLoading, loadDocuments, refreshDocuments } = useDocumentStore();
  const resolvedTheme = useThemeStore((state) => state.resolvedTheme);
  const colors = resolvedTheme === 'dark' ? darkColors : lightColors;
  const [view, setView] = useState<LibraryView>('all');

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const handleImport = async () => {
    const document = await importDocument();
    if (document) {
      await refreshDocuments();
    }
  };

  const filteredDocuments = documents.filter((doc) => {
    if (view === 'all') return true;
    if (view === 'reading') return doc.status === 'reading';
    if (view === 'finished') return doc.status === 'finished';
    if (view === 'unread') return doc.status === 'unread';
    return true;
  });

  const handleDocumentPress = (document: Document) => {
    router.push(`/reader/${document.id}`);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>Library</Text>
        <TouchableOpacity onPress={handleImport} style={styles.importButton}>
          <PlusIcon size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={[styles.filters, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        {(['all', 'reading', 'finished', 'unread'] as LibraryView[]).map((v) => (
          <TouchableOpacity
            key={v}
            onPress={() => setView(v)}
            style={[
              styles.filterButton,
              { backgroundColor: view === v ? colors.primary : colors.surface },
              view === v && styles.filterButtonActive,
            ]}
          >
            <Text
              style={[
                styles.filterText,
                { color: view === v ? '#ffffff' : colors.textSecondary },
                view === v && styles.filterTextActive,
              ]}
            >
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {filteredDocuments.length === 0 ? (
        <EmptyState
          title={isLoading ? 'Loading...' : 'No documents'}
          message={
            isLoading
              ? 'Loading your library...'
              : 'Tap the + button to import your first document'
          }
        />
      ) : (
        <FlatList
          data={filteredDocuments}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <DocumentCard document={item} onPress={() => handleDocumentPress(item)} />
          )}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={refreshDocuments} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 60,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  importButton: {
    padding: 8,
  },
  filters: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
    borderBottomWidth: 1,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  filterButtonActive: {},
  filterText: {
    fontSize: 14,
    fontWeight: '500',
  },
  filterTextActive: {},
  list: {
    padding: 16,
  },
});
