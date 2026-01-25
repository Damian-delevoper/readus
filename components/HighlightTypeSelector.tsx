/**
 * Highlight Type Selector Component
 * Allows user to choose highlight type: Idea, Definition, Quote
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { HighlightType } from '@/types';
import { highlightColors } from '@/utils/readerTheme';
import { useThemeStore, lightColors, darkColors } from '@/stores/themeStore';

interface HighlightTypeSelectorProps {
  selectedType: HighlightType;
  onSelect: (type: HighlightType) => void;
}

const highlightTypes: { type: HighlightType; label: string; color: string }[] = [
  { type: 'idea', label: 'Idea', color: highlightColors.idea },
  { type: 'definition', label: 'Definition', color: highlightColors.definition },
  { type: 'quote', label: 'Quote', color: highlightColors.quote },
];

export function HighlightTypeSelector({
  selectedType,
  onSelect,
}: HighlightTypeSelectorProps) {
  const resolvedTheme = useThemeStore((state) => state.resolvedTheme);
  const colors = resolvedTheme === 'dark' ? darkColors : lightColors;

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.text }]}>Highlight Type:</Text>
      <View style={styles.typesContainer}>
        {highlightTypes.map((item) => (
          <TouchableOpacity
            key={item.type}
            style={[
              styles.typeButton,
              {
                backgroundColor: selectedType === item.type ? item.color + '30' : colors.surface,
                borderColor: selectedType === item.type ? item.color : colors.border,
                borderWidth: selectedType === item.type ? 2 : 1,
              },
            ]}
            onPress={() => onSelect(item.type)}
            accessibilityRole="button"
            accessibilityLabel={`Select ${item.label} highlight type`}
          >
            <View
              style={[
                styles.colorIndicator,
                { backgroundColor: item.color },
              ]}
            />
            <Text
              style={[
                styles.typeLabel,
                {
                  color: selectedType === item.type ? colors.text : colors.textSecondary,
                  fontWeight: selectedType === item.type ? '600' : '400',
                },
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 12,
  },
  typesContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  colorIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  typeLabel: {
    fontSize: 14,
  },
});
