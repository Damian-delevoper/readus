/**
 * Document card component for library view
 */

import React, { useRef, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Image } from 'react-native';
import { Document, DocumentStatus } from '@/types';
import { useThemeStore, lightColors, darkColors } from '@/stores/themeStore';
import { TrashIcon, StarIcon } from './Icons';
import { scale } from '@/utils/animations';
import { getDocumentThumbnail } from '@/services/imageOptimization';

interface DocumentCardProps {
  document: Document;
  onPress: () => void;
  onRemove?: () => void;
  onToggleFavorite?: () => void;
  viewMode?: 'list' | 'grid';
  currentPage?: number; // Current reading position
}

const statusColors: Record<DocumentStatus, string> = {
  unread: '#9d8a70',
  reading: '#88755d',
  finished: '#6f5f4d',
};

export function DocumentCard({ document, onPress, onRemove, onToggleFavorite, viewMode = 'list', currentPage }: DocumentCardProps) {
  const resolvedTheme = useThemeStore((state) => state.resolvedTheme);
  const colors = resolvedTheme === 'dark' ? darkColors : lightColors;
  const statusColor = statusColors[document.status];
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [thumbnailUri, setThumbnailUri] = useState<string | null>(document.coverImagePath);
  const [imageLoading, setImageLoading] = useState(false);

  const handleRemove = (e: any) => {
    e.stopPropagation();
    if (onRemove) {
      // Animate removal
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 0.95,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
      onRemove();
    }
  };

  const handleToggleFavorite = (e: any) => {
    e.stopPropagation();
    if (onToggleFavorite) {
      onToggleFavorite();
    }
  };

  const handlePress = () => {
    // Scale animation on press
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.98,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
    onPress();
  };

  const isGrid = viewMode === 'grid';

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        onPress={handlePress}
        style={[
          styles.card,
          { backgroundColor: colors.card },
          isGrid && styles.cardGrid,
        ]}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`Open ${document.title}`}
        accessibilityHint={`${document.pageCount} pages, ${document.estimatedReadingTime} minutes reading time`}
      >
      <View style={styles.content}>
        {/* Thumbnail/Icon */}
        {isGrid && (
          <View style={[styles.thumbnailContainer, { backgroundColor: colors.surface }]}>
            {thumbnailUri ? (
              <Image
                source={{ uri: thumbnailUri }}
                style={styles.thumbnail}
                resizeMode="cover"
                onError={() => setThumbnailUri(null)}
              />
            ) : (
              <View style={[styles.placeholderIcon, { backgroundColor: statusColor + '20' }]}>
                <Text style={[styles.formatText, { color: statusColor }]}>
                  {document.format.toUpperCase()}
                </Text>
              </View>
            )}
          </View>
        )}
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
            {document.title}
          </Text>
          <View style={styles.headerActions}>
            {onToggleFavorite && (
              <TouchableOpacity
                onPress={handleToggleFavorite}
                style={styles.favoriteButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <StarIcon 
                  size={20} 
                  color={document.isFavorite ? '#fbbf24' : colors.textSecondary} 
                  filled={document.isFavorite}
                />
              </TouchableOpacity>
            )}
            {onRemove && (
              <TouchableOpacity
                onPress={handleRemove}
                style={styles.removeButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <TrashIcon size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        </View>
        <View style={styles.meta}>
          <Text style={[styles.metaText, { color: colors.textSecondary }]}>
            {(() => {
              // Get total pages from document - ensure it's a valid number
              const totalPages = typeof document.pageCount === 'number' && document.pageCount > 0 
                ? document.pageCount 
                : 1;
              
              // Show X/Y format if we have a valid current page
              if (currentPage !== undefined && typeof currentPage === 'number' && currentPage > 0) {
                return `${currentPage}/${totalPages}`;
              }
              
              // Otherwise just show total pages
              return `${totalPages} page${totalPages !== 1 ? 's' : ''}`;
            })()} • {document.estimatedReadingTime} min
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
    </Animated.View>
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
  cardGrid: {
    flex: 1,
    margin: 4,
    minHeight: 180,
  },
  content: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  favoriteButton: {
    padding: 4,
  },
  removeButton: {
    padding: 4,
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
  thumbnailContainer: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    marginBottom: 12,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  placeholderIcon: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  formatText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
