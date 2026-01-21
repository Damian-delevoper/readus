/**
 * Global search screen
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SearchIcon } from '@/components/Icons';
import { useSearchStore } from '@/stores/searchStore';
import { SearchResult } from '@/types';
import { EmptyState } from '@/components/EmptyState';
import { useThemeStore, lightColors, darkColors } from '@/stores/themeStore';

export default function SearchScreen() {
  const router = useRouter();
  const { query, results, isLoading, search, clearSearch } = useSearchStore();
  const resolvedTheme = useThemeStore((state) => state.resolvedTheme);
  const colors = resolvedTheme === 'dark' ? darkColors : lightColors;
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    if (text.trim()) {
      search(text);
    } else {
      clearSearch();
    }
  };

  const handleResultPress = (result: SearchResult) => {
    router.push(`/reader/${result.documentId}`);
  };

  const renderResult = ({ item }: { item: SearchResult }): React.ReactElement => (
    <TouchableOpacity
      style={[styles.result, { backgroundColor: colors.card }]}
      onPress={() => handleResultPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.resultHeader}>
        <Text style={[styles.resultType, { color: colors.primary }]}>{item.type}</Text>
        <Text style={[styles.documentTitle, { color: colors.textSecondary }]}>{item.documentTitle}</Text>
      </View>
      <Text style={[styles.snippet, { color: colors.text }]}>{item.snippet}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>Search</Text>
      </View>

      <View style={[styles.searchContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
        <View style={styles.searchIcon}>
          <SearchIcon size={20} color={colors.textSecondary} />
        </View>
        <TextInput
          style={[styles.input, { color: colors.text }]}
          placeholder="Search documents, highlights, notes..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={handleSearch}
          autoFocus
        />
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Searching...</Text>
        </View>
      ) : searchQuery.trim() === '' ? (
        <EmptyState
          title="Search your library"
          message="Search across all documents, highlights, and notes"
        />
      ) : results.length === 0 ? (
        <EmptyState
          title="No results"
          message={`No matches found for "${searchQuery}"`}
        />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={renderResult}
          contentContainerStyle={styles.list}
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
    padding: 16,
    paddingTop: 60,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  searchIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
  },
  list: {
    padding: 16,
    paddingTop: 0,
  },
  result: {
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  resultType: {
    fontSize: 12,
    textTransform: 'uppercase',
    fontWeight: '600',
    marginRight: 8,
  },
  documentTitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  snippet: {
    fontSize: 16,
    lineHeight: 24,
  },
});
