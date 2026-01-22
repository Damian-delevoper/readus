/**
 * Enhanced Reader Settings Component
 * Comprehensive settings with sliders, previews, and better organization
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  Animated,
} from 'react-native';
import { XIcon } from './Icons';
import { ReaderSettings, ReaderTheme } from '@/types';
import { useThemeStore, lightColors, darkColors } from '@/stores/themeStore';

interface ReaderSettingsProps {
  visible: boolean;
  settings: ReaderSettings;
  onClose: () => void;
  onUpdate: (updates: Partial<ReaderSettings>) => Promise<void>;
  previewText?: string;
}

// Custom Slider Component
function Slider({
  value,
  min,
  max,
  step,
  onValueChange,
  label,
  formatValue,
  color,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  onValueChange: (value: number) => void;
  label: string;
  formatValue?: (value: number) => string;
  color: string;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const percentage = ((value - min) / (max - min)) * 100;

  const handlePress = (event: any) => {
    const { locationX, target } = event.nativeEvent;
    const sliderWidth = (target as any)?.layout?.width || 200;
    const newPercentage = Math.max(0, Math.min(100, (locationX / sliderWidth) * 100));
    const newValue = min + (newPercentage / 100) * (max - min);
    const steppedValue = Math.round(newValue / step) * step;
    onValueChange(Math.max(min, Math.min(max, steppedValue)));
  };

  return (
    <View style={styles.sliderContainer}>
      <View style={styles.sliderLabelRow}>
        <Text style={[styles.sliderLabel, { color }]}>{label}</Text>
        <Text style={[styles.sliderValue, { color }]}>
          {formatValue ? formatValue(value) : value}
        </Text>
      </View>
      <TouchableOpacity
        style={[styles.sliderTrack, { backgroundColor: color + '20' }]}
        onPress={handlePress}
        activeOpacity={1}
      >
        <View
          style={[
            styles.sliderFill,
            {
              width: `${percentage}%`,
              backgroundColor: color,
            },
          ]}
        />
        <View
          style={[
            styles.sliderThumb,
            {
              left: `${percentage}%`,
              backgroundColor: color,
            },
          ]}
        />
      </TouchableOpacity>
    </View>
  );
}

// Theme Selector
function ThemeSelector({
  selectedTheme,
  onSelect,
  colors,
}: {
  selectedTheme: ReaderTheme;
  onSelect: (theme: ReaderTheme) => void;
  colors: typeof lightColors;
}) {
  const themes: { value: ReaderTheme; label: string; bg: string; text: string }[] = [
    { value: 'light', label: 'Light', bg: '#ffffff', text: '#1a1a1a' },
    { value: 'dark', label: 'Dark', bg: '#1a1a1a', text: '#ffffff' },
    { value: 'sepia', label: 'Sepia', bg: '#f4e8d8', text: '#1a1a1a' },
  ];

  return (
    <View style={styles.themeContainer}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Theme</Text>
      <View style={styles.themeRow}>
        {themes.map((theme) => (
          <TouchableOpacity
            key={theme.value}
            onPress={() => onSelect(theme.value)}
            style={[
              styles.themeOption,
              {
                backgroundColor: theme.bg,
                borderColor: selectedTheme === theme.value ? colors.primary : colors.border,
                borderWidth: selectedTheme === theme.value ? 2 : 1,
              },
            ]}
          >
            <View
              style={[
                styles.themePreview,
                {
                  backgroundColor: theme.bg,
                },
              ]}
            >
              <Text
                style={[
                  styles.themePreviewText,
                  {
                    color: theme.text,
                    fontSize: 12,
                  },
                ]}
              >
                Aa
              </Text>
            </View>
            <Text
              style={[
                styles.themeLabel,
                {
                  color: selectedTheme === theme.value ? colors.primary : colors.text,
                },
              ]}
            >
              {theme.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

export function ReaderSettingsModal({
  visible,
  settings,
  onClose,
  onUpdate,
  previewText = 'The quick brown fox jumps over the lazy dog. This is a preview of how your text will look with the current settings.',
}: ReaderSettingsProps) {
  const resolvedTheme = useThemeStore((state) => state.resolvedTheme);
  const colors = resolvedTheme === 'dark' ? darkColors : lightColors;

  const getThemeColors = () => {
    switch (settings.theme) {
      case 'dark':
        return { bg: '#1a1a1a', text: '#ffffff', border: '#333333' };
      case 'sepia':
        return { bg: '#f4e8d8', text: '#1a1a1a', border: '#d4c9bb' };
      default:
        return { bg: '#ffffff', text: '#1a1a1a', border: '#e8e3dc' };
    }
  };

  const themeColors = getThemeColors();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Reader Settings</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <XIcon size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {/* Preview Section */}
            <View style={[styles.previewSection, { backgroundColor: themeColors.bg, borderColor: colors.border }]}>
              <Text style={[styles.previewLabel, { color: colors.textSecondary }]}>Preview</Text>
              <Text
                style={[
                  styles.previewText,
                  {
                    color: themeColors.text,
                    fontSize: settings.fontSize,
                    lineHeight: settings.fontSize * settings.lineSpacing,
                    padding: settings.margin,
                    fontFamily:
                      settings.fontFamily && settings.fontFamily !== 'System'
                        ? settings.fontFamily
                        : undefined,
                  },
                ]}
              >
                {previewText}
              </Text>
            </View>

            {/* Typography Section */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Typography</Text>

              <Slider
                value={settings.fontSize}
                min={12}
                max={24}
                step={1}
                onValueChange={(value) => onUpdate({ fontSize: value })}
                label="Font Size"
                formatValue={(v) => `${v}px`}
                color={colors.primary}
              />

              <Slider
                value={settings.lineSpacing}
                min={1.0}
                max={2.5}
                step={0.1}
                onValueChange={(value) => onUpdate({ lineSpacing: value })}
                label="Line Spacing"
                formatValue={(v) => v.toFixed(1)}
                color={colors.primary}
              />

              <Slider
                value={settings.margin}
                min={10}
                max={40}
                step={2}
                onValueChange={(value) => onUpdate({ margin: value })}
                label="Margins"
                formatValue={(v) => `${v}px`}
                color={colors.primary}
              />
            </View>

            {/* Theme Section */}
            <ThemeSelector
              selectedTheme={settings.theme}
              onSelect={(theme) => onUpdate({ theme })}
              colors={colors}
            />

            {/* Highlight Color Section */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Highlight Color</Text>
              <View style={styles.colorRow}>
                {['#ffd700', '#ff6b6b', '#4ecdc4', '#95e1d3', '#f38181'].map((color) => (
                  <TouchableOpacity
                    key={color}
                    onPress={() => onUpdate({ defaultHighlightColor: color })}
                    style={[
                      styles.colorOption,
                      {
                        backgroundColor: color,
                        borderColor:
                          settings.defaultHighlightColor === color ? colors.primary : colors.border,
                        borderWidth: settings.defaultHighlightColor === color ? 3 : 1,
                      },
                    ]}
                  />
                ))}
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
  },
  previewSection: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    minHeight: 120,
  },
  previewLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  previewText: {
    fontSize: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  sliderContainer: {
    marginBottom: 20,
  },
  sliderLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sliderLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  sliderValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  sliderTrack: {
    height: 6,
    borderRadius: 3,
    position: 'relative',
  },
  sliderFill: {
    height: '100%',
    borderRadius: 3,
  },
  sliderThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    position: 'absolute',
    top: -7,
    marginLeft: -10,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  themeContainer: {
    marginBottom: 24,
  },
  themeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  themeOption: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  themePreview: {
    width: 60,
    height: 60,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  themePreviewText: {
    fontSize: 24,
    fontWeight: '600',
  },
  themeLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  colorRow: {
    flexDirection: 'row',
    gap: 12,
  },
  colorOption: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
  },
  fontFamilyContainer: {
    marginBottom: 20,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 12,
  },
  fontFamilyRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  fontOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 80,
    alignItems: 'center',
  },
  fontOptionText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
