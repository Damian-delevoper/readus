/**
 * Settings screen
 */

import React, { useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Switch } from 'react-native';
import { useReaderStore } from '@/stores/readerStore';
import { useThemeStore, lightColors, darkColors } from '@/stores/themeStore';
import { ReaderTheme } from '@/types';

export default function SettingsScreen() {
  const {
    settings,
    loadSettings,
    setTheme,
    setFontSize,
    setLineSpacing,
    setMargin,
    updateSettings,
  } = useReaderStore();
  
  const { theme: appTheme, resolvedTheme, loadTheme, setTheme: setAppTheme } = useThemeStore();
  const colors = resolvedTheme === 'dark' ? darkColors : lightColors;

  useEffect(() => {
    loadSettings();
    loadTheme();
  }, [loadSettings, loadTheme]);

  const themes: ReaderTheme[] = ['light', 'dark', 'sepia'];

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.surface }]}>
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>Settings</Text>
      </View>

      <View style={[styles.section, { backgroundColor: colors.background, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Appearance</Text>

        <View style={styles.setting}>
          <Text style={[styles.settingLabel, { color: colors.text }]}>App Theme</Text>
          <View style={styles.themeOptions}>
            {(['light', 'dark', 'system'] as const).map((theme) => (
              <TouchableOpacity
                key={theme}
                onPress={() => setAppTheme(theme)}
                style={[
                  styles.themeOption,
                  { backgroundColor: appTheme === theme ? colors.primary : colors.surface },
                  appTheme === theme && styles.themeOptionActive,
                ]}
              >
                <Text
                  style={[
                    styles.themeOptionText,
                    { color: appTheme === theme ? '#ffffff' : colors.textSecondary },
                    appTheme === theme && styles.themeOptionTextActive,
                  ]}
                >
                  {theme.charAt(0).toUpperCase() + theme.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      <View style={[styles.section, { backgroundColor: colors.background, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Reader Appearance</Text>

        <View style={styles.setting}>
          <Text style={[styles.settingLabel, { color: colors.text }]}>Reader Theme</Text>
          <View style={styles.themeOptions}>
            {themes.map((theme) => (
              <TouchableOpacity
                key={theme}
                onPress={() => setTheme(theme)}
                style={[
                  styles.themeOption,
                  { backgroundColor: settings.theme === theme ? colors.primary : colors.surface },
                  settings.theme === theme && styles.themeOptionActive,
                ]}
              >
                <Text
                  style={[
                    styles.themeOptionText,
                    { color: settings.theme === theme ? '#ffffff' : colors.textSecondary },
                    settings.theme === theme && styles.themeOptionTextActive,
                  ]}
                >
                  {theme.charAt(0).toUpperCase() + theme.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.setting}>
          <Text style={[styles.settingLabel, { color: colors.text }]}>Font Size: {settings.fontSize}px</Text>
          <View style={styles.sliderContainer}>
            <TouchableOpacity
              onPress={() => setFontSize(Math.max(12, settings.fontSize - 2))}
              style={[styles.sliderButton, { backgroundColor: colors.surface }]}
            >
              <Text style={[styles.sliderButtonText, { color: colors.primary }]}>-</Text>
            </TouchableOpacity>
            <View style={[styles.sliderValue, { backgroundColor: colors.surface }]}>
              <Text style={[styles.sliderValueText, { color: colors.text }]}>{settings.fontSize}</Text>
            </View>
            <TouchableOpacity
              onPress={() => setFontSize(Math.min(24, settings.fontSize + 2))}
              style={[styles.sliderButton, { backgroundColor: colors.surface }]}
            >
              <Text style={[styles.sliderButtonText, { color: colors.primary }]}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.setting}>
          <Text style={[styles.settingLabel, { color: colors.text }]}>Line Spacing: {settings.lineSpacing.toFixed(1)}</Text>
          <View style={styles.sliderContainer}>
            <TouchableOpacity
              onPress={() => setLineSpacing(Math.max(1.0, settings.lineSpacing - 0.1))}
              style={[styles.sliderButton, { backgroundColor: colors.surface }]}
            >
              <Text style={[styles.sliderButtonText, { color: colors.primary }]}>-</Text>
            </TouchableOpacity>
            <View style={[styles.sliderValue, { backgroundColor: colors.surface }]}>
              <Text style={[styles.sliderValueText, { color: colors.text }]}>{settings.lineSpacing.toFixed(1)}</Text>
            </View>
            <TouchableOpacity
              onPress={() => setLineSpacing(Math.min(2.5, settings.lineSpacing + 0.1))}
              style={[styles.sliderButton, { backgroundColor: colors.surface }]}
            >
              <Text style={[styles.sliderButtonText, { color: colors.primary }]}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.setting}>
          <Text style={[styles.settingLabel, { color: colors.text }]}>Margin: {settings.margin}px</Text>
          <View style={styles.sliderContainer}>
            <TouchableOpacity
              onPress={() => setMargin(Math.max(10, settings.margin - 5))}
              style={[styles.sliderButton, { backgroundColor: colors.surface }]}
            >
              <Text style={[styles.sliderButtonText, { color: colors.primary }]}>-</Text>
            </TouchableOpacity>
            <View style={[styles.sliderValue, { backgroundColor: colors.surface }]}>
              <Text style={[styles.sliderValueText, { color: colors.text }]}>{settings.margin}</Text>
            </View>
            <TouchableOpacity
              onPress={() => setMargin(Math.min(40, settings.margin + 5))}
              style={[styles.sliderButton, { backgroundColor: colors.surface }]}
            >
              <Text style={[styles.sliderButtonText, { color: colors.primary }]}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={[styles.section, { backgroundColor: colors.background, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Preferences</Text>

        <View style={styles.setting}>
          <View style={styles.settingRow}>
            <Text style={[styles.settingLabel, { color: colors.text }]}>Auto Backup</Text>
            <Switch
              value={settings.autoBackup}
              onValueChange={(value: boolean) => updateSettings({ autoBackup: value })}
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>
        </View>

        <View style={styles.setting}>
          <View style={styles.settingRow}>
            <Text style={[styles.settingLabel, { color: colors.text }]}>Biometric Lock</Text>
            <Switch
              value={settings.biometricLock}
              onValueChange={(value: boolean) => updateSettings({ biometricLock: value })}
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>
        </View>
      </View>
    </ScrollView>
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
  section: {
    marginTop: 16,
    padding: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  setting: {
    marginBottom: 24,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingLabel: {
    fontSize: 16,
    marginBottom: 12,
  },
  themeOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  themeOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  themeOptionActive: {},
  themeOptionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  themeOptionTextActive: {},
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sliderButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sliderButtonText: {
    fontSize: 20,
    fontWeight: '600',
  },
  sliderValue: {
    minWidth: 60,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  sliderValueText: {
    fontSize: 16,
    fontWeight: '500',
  },
});
