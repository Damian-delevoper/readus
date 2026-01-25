/**
 * Reader Options Menu
 * Bottom sheet with: View info, Generate summary, Export highlights, Share, Delete
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
} from 'react-native';
import {
  InfoIcon,
  ShareIcon,
  TrashIcon,
  BookmarkIcon,
} from './Icons';
import { useThemeStore, lightColors, darkColors } from '@/stores/themeStore';

interface ReaderOptionsMenuProps {
  visible: boolean;
  onClose: () => void;
  onViewInfo: () => void;
  onGenerateSummary: () => void;
  onExportHighlights: () => void;
  onShare: () => void;
  onDelete: () => void;
}

export function ReaderOptionsMenu({
  visible,
  onClose,
  onViewInfo,
  onGenerateSummary,
  onExportHighlights,
  onShare,
  onDelete,
}: ReaderOptionsMenuProps) {
  const resolvedTheme = useThemeStore((state) => state.resolvedTheme);
  const colors = resolvedTheme === 'dark' ? darkColors : lightColors;

  const menuItems = [
    {
      label: 'Document Info',
      icon: InfoIcon,
      onPress: onViewInfo,
      color: colors.text,
    },
    {
      label: 'Generate Summary (AI)',
      icon: BookmarkIcon,
      onPress: onGenerateSummary,
      color: colors.primary,
    },
    {
      label: 'Export Highlights & Notes',
      icon: BookmarkIcon,
      onPress: onExportHighlights,
      color: colors.text,
    },
    {
      label: 'Share (Read-only)',
      icon: ShareIcon,
      onPress: onShare,
      color: colors.text,
    },
    {
      label: 'Delete Document',
      icon: TrashIcon,
      onPress: onDelete,
      color: '#ef4444',
      destructive: true,
    },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View
          style={[
            styles.container,
            { backgroundColor: colors.background },
          ]}
          onStartShouldSetResponder={() => true}
        >
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          <ScrollView style={styles.content}>
            {menuItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.menuItem,
                    { borderBottomColor: colors.border },
                    index === menuItems.length - 1 && styles.lastMenuItem,
                  ]}
                  onPress={() => {
                    item.onPress();
                    onClose();
                  }}
                >
                  <Icon size={24} color={item.color} />
                  <Text
                    style={[
                      styles.menuItemText,
                      { color: item.color },
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    paddingBottom: 32,
    maxHeight: '80%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  content: {
    paddingHorizontal: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 16,
  },
  lastMenuItem: {
    borderBottomWidth: 0,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
});
