/**
 * Library screen - main document library view
 */

import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
  LayoutAnimation,
  Platform,
  UIManager,
  ScrollView,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { PlusIcon, ListIcon } from '@/components/Icons';
import { useDocumentStore } from '@/stores/documentStore';
import { DocumentCard } from '@/components/DocumentCard';
import { EmptyState } from '@/components/EmptyState';
import { DocumentCardSkeleton } from '@/components/SkeletonLoader';
import { importDocument } from '@/services/documentImport';
import { Document, DocumentStatus } from '@/types';
import { useThemeStore, lightColors, darkColors } from '@/stores/themeStore';
import { getReadingPosition } from '@/services/database';

type LibraryView = 'all' | 'reading' | 'finished' | 'unread' | 'favorites';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function LibraryScreen() {
  const router = useRouter();
  const documentStore = useDocumentStore();
  const { documents, isLoading, loadDocuments, refreshDocuments, removeFromLibrary, toggleFavorite } = documentStore;
  const resolvedTheme = useThemeStore((state) => state.resolvedTheme);
  const colors = resolvedTheme === 'dark' ? darkColors : lightColors;
  const [view, setView] = useState<LibraryView>('all');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [readingPositions, setReadingPositions] = useState<Record<string, number>>({});

  const handleViewModeToggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setViewMode(viewMode === 'list' ? 'grid' : 'list');
  };

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  // Memoize document IDs string to prevent unnecessary re-renders
  const documentIdsString = useMemo(() => {
    return documents.map(d => d.id).sort().join(',');
  }, [documents]);
  
  // Load reading positions for all documents
  useEffect(() => {
    if (documents.length === 0) {
      setReadingPositions({});
      return;
    }
    
    const loadReadingPositions = async () => {
      const positions: Record<string, number> = {};
      
      for (const doc of documents) {
        try {
          const position = await getReadingPosition(doc.id);
          if (position) {
            positions[doc.id] = position.position;
          }
        } catch (error) {
          console.error(`Error loading reading position for ${doc.id}:`, error);
        }
      }
      setReadingPositions(positions);
    };
    
    loadReadingPositions();
  }, [documentIdsString, documents.length]);

  // Refresh documents when screen comes into focus (e.g., returning from reader)
  // This ensures pageCount updates from the reader are reflected
  const refreshDocumentsRef = useRef(refreshDocuments);
  refreshDocumentsRef.current = refreshDocuments;
  
  useFocusEffect(
    React.useCallback(() => {
      let isMounted = true;
      
      const refresh = async () => {
        await refreshDocumentsRef.current();
        if (!isMounted) return;
        
        // Reload reading positions after documents are refreshed to ensure consistency
        // Use a small delay to ensure store is updated, then get fresh documents
        setTimeout(() => {
          if (!isMounted) return;
          const loadReadingPositions = async () => {
            if (!isMounted) return;
            const positions: Record<string, number> = {};
            // Get fresh documents from store using getState to avoid dependency issues
            const { documents: currentDocs } = useDocumentStore.getState();
            for (const doc of currentDocs) {
              try {
                const position = await getReadingPosition(doc.id);
                if (position) {
                  positions[doc.id] = position.position;
                }
              } catch (error) {
                console.error(`Error loading reading position for ${doc.id}:`, error);
              }
            }
            if (isMounted) {
              setReadingPositions(positions);
            }
          };
          loadReadingPositions();
        }, 100);
      };
      
      refresh();
      
      return () => {
        isMounted = false;
      };
    }, []) // Empty dependency array - only run on focus
  );

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
    if (view === 'favorites') return doc.isFavorite === true;
    return true;
  });

  const handleDocumentPress = (document: Document) => {
    router.push(`/reader/${document.id}`);
  };

  const handleRemoveDocument = (document: Document) => {
    Alert.alert(
      'Remove from Library',
      `Remove "${document.title}" from your library? The file will remain on your device.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeFromLibrary(document.id);
            } catch (error) {
              Alert.alert('Error', 'Failed to remove document from library');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>Library</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            onPress={handleViewModeToggle}
            style={styles.viewToggleButton}
          >
            <ListIcon size={24} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleImport} style={styles.importButton}>
            <PlusIcon size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.filtersContainer, { backgroundColor: colors.background, borderBottomColor: colors.border }]}
        contentContainerStyle={styles.filters}
      >
        {(['all', 'favorites', 'reading', 'finished', 'unread'] as LibraryView[]).map((v) => (
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
      </ScrollView>

      {isLoading && filteredDocuments.length === 0 ? (
        <FlatList
          key={`skeleton-${viewMode}`}
          data={[1, 2, 3, 4, 5]}
          keyExtractor={(item) => item.toString()}
          numColumns={viewMode === 'grid' ? 2 : 1}
          renderItem={() => <DocumentCardSkeleton viewMode={viewMode} />}
          contentContainerStyle={[
            styles.list,
            viewMode === 'grid' && styles.gridList,
          ]}
        />
      ) : filteredDocuments.length === 0 ? (
        <EmptyState
          title="No documents"
          message="Tap the + button to import your first document"
        />
      ) : (
        <FlatList
          key={`documents-${viewMode}`}
          data={filteredDocuments}
          keyExtractor={(item) => item.id}
          numColumns={viewMode === 'grid' ? 2 : 1}
          renderItem={({ item }) => (
            <DocumentCard
              document={item}
              onPress={() => handleDocumentPress(item)}
              onRemove={() => handleRemoveDocument(item)}
              onToggleFavorite={() => toggleFavorite(item.id)}
              viewMode={viewMode}
              currentPage={readingPositions[item.id]}
            />
          )}
          contentContainerStyle={[
            styles.list,
            viewMode === 'grid' && styles.gridList,
          ]}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={refreshDocuments} />
          }
          // Memory optimization: removeClippedSubviews and windowSize
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          updateCellsBatchingPeriod={50}
          initialNumToRender={10}
          windowSize={10}
          getItemLayout={viewMode === 'list' ? (data, index) => ({
            length: 100, // Approximate item height
            offset: 100 * index,
            index,
          }) : undefined}
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
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  viewToggleButton: {
    padding: 8,
  },
  importButton: {
    padding: 8,
  },
  gridList: {
    padding: 8,
  },
  filtersContainer: {
    borderBottomWidth: 1,
    maxHeight: 48,
  },
  filters: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    alignItems: 'center',
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
