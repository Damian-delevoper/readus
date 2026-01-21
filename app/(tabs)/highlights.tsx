/**
 * Highlights & Notes screen
 */

import React, { useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useHighlightStore } from '@/stores/highlightStore';
import { Highlight, Note } from '@/types';
import { EmptyState } from '@/components/EmptyState';
import { useThemeStore, lightColors, darkColors } from '@/stores/themeStore';

export default function HighlightsScreen() {
  const router = useRouter();
  const { highlights, notes, loadHighlights, loadNotes } = useHighlightStore();
  const resolvedTheme = useThemeStore((state) => state.resolvedTheme);
  const colors = resolvedTheme === 'dark' ? darkColors : lightColors;
  const [activeTab, setActiveTab] = React.useState<'highlights' | 'notes'>('highlights');

  useEffect(() => {
    loadHighlights();
    loadNotes();
  }, [loadHighlights, loadNotes]);

  const handleItemPress = (item: Highlight | Note) => {
    router.push(`/reader/${item.documentId}`);
  };

  const renderHighlight = ({ item }: { item: Highlight }) => (
    <TouchableOpacity
      style={[styles.item, { backgroundColor: colors.card }]}
      onPress={() => handleItemPress(item)}
      activeOpacity={0.7}
    >
      <View style={[styles.colorBar, { backgroundColor: item.color }]} />
      <View style={styles.content}>
        <Text style={[styles.type, { color: colors.textSecondary }]}>{item.type}</Text>
        <Text style={[styles.text, { color: colors.text }]} numberOfLines={3}>
          {item.text}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderNote = ({ item }: { item: Note }) => (
    <TouchableOpacity
      style={[styles.item, { backgroundColor: colors.card }]}
      onPress={() => handleItemPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        <Text style={[styles.type, { color: colors.textSecondary }]}>Note</Text>
        <Text style={[styles.text, { color: colors.text }]} numberOfLines={4}>
          {item.text}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const data = activeTab === 'highlights' ? highlights : notes;
  const isEmpty = data.length === 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>Highlights & Notes</Text>
      </View>

      <View style={[styles.tabs, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'highlights' && { borderBottomColor: colors.primary }]}
          onPress={() => setActiveTab('highlights')}
        >
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'highlights' ? colors.primary : colors.textSecondary },
              activeTab === 'highlights' && { fontWeight: '600' },
            ]}
          >
            Highlights ({highlights.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'notes' && { borderBottomColor: colors.primary }]}
          onPress={() => setActiveTab('notes')}
        >
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'notes' ? colors.primary : colors.textSecondary },
              activeTab === 'notes' && { fontWeight: '600' },
            ]}
          >
            Notes ({notes.length})
          </Text>
        </TouchableOpacity>
      </View>

      {isEmpty ? (
        <EmptyState
          title={`No ${activeTab}`}
          message={`You haven't created any ${activeTab} yet. Start reading and highlight important passages!`}
        />
      ) : activeTab === 'highlights' ? (
        <FlatList<Highlight>
          data={highlights}
          keyExtractor={(item) => item.id}
          renderItem={renderHighlight}
          contentContainerStyle={styles.list}
        />
      ) : (
        <FlatList<Note>
          data={notes}
          keyExtractor={(item) => item.id}
          renderItem={renderNote}
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
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {},
  tabText: {
    fontSize: 16,
    fontWeight: '500',
  },
  tabTextActive: {},
  list: {
    padding: 16,
  },
  item: {
    borderRadius: 8,
    marginBottom: 12,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  colorBar: {
    width: 4,
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  type: {
    fontSize: 12,
    textTransform: 'uppercase',
    marginBottom: 8,
    fontWeight: '600',
  },
  text: {
    fontSize: 16,
    lineHeight: 24,
  },
});
