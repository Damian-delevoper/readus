/**
 * Table of Contents Modal Component
 */

import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  FlatList,
  StyleSheet,
} from 'react-native';
import { XIcon } from './Icons';
import { EPUBChapter } from '@/services/epubParser';
import { useThemeStore, lightColors, darkColors } from '@/stores/themeStore';

interface TOCModalProps {
  visible: boolean;
  onClose: () => void;
  chapters: EPUBChapter[];
  currentChapter: number;
  onChapterSelect: (chapterIndex: number) => void;
  title?: string;
}

export function TOCModal({
  visible,
  onClose,
  chapters,
  currentChapter,
  onChapterSelect,
  title = 'Table of Contents',
}: TOCModalProps) {
  const resolvedTheme = useThemeStore((state) => state.resolvedTheme);
  const colors = resolvedTheme === 'dark' ? darkColors : lightColors;

  const handleChapterPress = (index: number) => {
    onChapterSelect(index);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.surface }]}>
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <XIcon size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {chapters.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No table of contents available
              </Text>
            </View>
          ) : (
            <FlatList
              data={chapters}
              keyExtractor={(item) => item.id}
              renderItem={({ item, index }) => (
                <TouchableOpacity
                  style={[
                    styles.chapterItem,
                    { backgroundColor: index === currentChapter ? colors.primary + '20' : 'transparent' },
                    index === currentChapter && { borderLeftColor: colors.primary, borderLeftWidth: 3 },
                  ]}
                  onPress={() => handleChapterPress(index)}
                >
                  <Text
                    style={[
                      styles.chapterTitle,
                      { color: index === currentChapter ? colors.primary : colors.text },
                    ]}
                  >
                    {item.title}
                  </Text>
                </TouchableOpacity>
              )}
              contentContainerStyle={styles.listContent}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    maxHeight: '80%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  closeButton: {
    padding: 8,
  },
  listContent: {
    padding: 16,
  },
  chapterItem: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  chapterTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
  },
});
