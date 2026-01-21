/**
 * Document card component for library view
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Document, DocumentStatus } from '@/types';
import { useThemeStore, lightColors, darkColors } from '@/stores/themeStore';

interface DocumentCardProps {
  document: Document;
  onPress: () => void;
}

const statusColors: Record<DocumentStatus, string> = {
  unread: '#9d8a70',
  reading: '#88755d',
  finished: '#6f5f4d',
};

export function DocumentCard({ document, onPress }: DocumentCardProps) {
  const resolvedTheme = useThemeStore((state) => state.resolvedTheme);
  const colors = resolvedTheme === 'dark' ? darkColors : lightColors;
  const statusColor = statusColors[document.status];

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.card, { backgroundColor: colors.card }]}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
          {document.title}
        </Text>
        <View style={styles.meta}>
          <Text style={[styles.metaText, { color: colors.textSecondary }]}>
            {document.pageCount} pages • {document.estimatedReadingTime} min
          </Text>
        </View>
        <View style={styles.footer}>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>{document.status}</Text>
          </View>
          {document.lastOpenedAt && (
            <Text style={[styles.lastOpened, { color: colors.textSecondary }]}>
              {new Date(document.lastOpenedAt).toLocaleDateString()}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
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
  content: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  meta: {
    marginBottom: 12,
  },
  metaText: {
    fontSize: 14,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    color: '#ffffff',
    textTransform: 'capitalize',
  },
  lastOpened: {
    fontSize: 12,
  },
});
