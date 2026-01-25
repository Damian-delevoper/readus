/**
 * Note Modal Component
 * Allows creating notes attached to highlights OR text positions
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
} from 'react-native';
import { XIcon } from './Icons';
import { useThemeStore, lightColors, darkColors } from '@/stores/themeStore';
import { getReaderThemeColors } from '@/utils/readerTheme';
import { useReaderStore } from '@/stores/readerStore';

interface NoteModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (text: string, highlightId?: string | null, position?: number) => Promise<void>;
  selectedText?: string;
  highlightId?: string | null;
  position?: number;
  initialText?: string;
}

export function NoteModal({
  visible,
  onClose,
  onSave,
  selectedText,
  highlightId,
  position,
  initialText = '',
}: NoteModalProps) {
  const resolvedTheme = useThemeStore((state) => state.resolvedTheme);
  const colors = resolvedTheme === 'dark' ? darkColors : lightColors;
  const { settings } = useReaderStore();
  const readerThemeColors = getReaderThemeColors(settings.theme);
  const themeColors = {
    bg: readerThemeColors.background,
    text: readerThemeColors.text,
    textSecondary: readerThemeColors.textSecondary,
    border: readerThemeColors.border,
    surface: readerThemeColors.surface,
  };

  const [noteText, setNoteText] = useState(initialText);

  useEffect(() => {
    if (visible) {
      setNoteText(initialText);
    }
  }, [visible, initialText]);

  const handleSave = async () => {
    if (noteText.trim()) {
      await onSave(noteText.trim(), highlightId, position);
      setNoteText('');
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: themeColors.bg }]}>
          <View style={[styles.header, { borderBottomColor: themeColors.border }]}>
            <Text style={[styles.title, { color: themeColors.text }]}>
              {highlightId ? 'Note on Highlight' : 'Add Note'}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <XIcon size={24} color={themeColors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body}>
            {selectedText && (
              <View style={[styles.selectedTextContainer, { backgroundColor: themeColors.surface }]}>
                <Text style={[styles.selectedTextLabel, { color: themeColors.textSecondary }]}>
                  Selected Text:
                </Text>
                <Text style={[styles.selectedText, { color: themeColors.text }]}>
                  "{selectedText}"
                </Text>
              </View>
            )}

            <Text style={[styles.label, { color: themeColors.text }]}>
              Note:
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  color: themeColors.text,
                  borderColor: themeColors.border,
                  backgroundColor: themeColors.surface,
                },
              ]}
              placeholder="Write your note..."
              placeholderTextColor={themeColors.textSecondary}
              value={noteText}
              onChangeText={setNoteText}
              multiline
              numberOfLines={6}
              autoFocus
              textAlignVertical="top"
            />

            <View style={styles.hintContainer}>
              <Text style={[styles.hint, { color: themeColors.textSecondary }]}>
                {highlightId
                  ? 'This note will be attached to the highlight.'
                  : position !== undefined
                  ? 'This note will be attached to this position in the document.'
                  : 'This note will be attached to the selected text position.'}
              </Text>
            </View>
          </ScrollView>

          <View style={[styles.footer, { borderTopColor: themeColors.border }]}>
            <TouchableOpacity
              style={[styles.cancelButton, { backgroundColor: themeColors.surface }]}
              onPress={onClose}
            >
              <Text style={[styles.cancelButtonText, { color: themeColors.text }]}>
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: colors.primary }]}
              onPress={handleSave}
              disabled={!noteText.trim()}
            >
              <Text style={[styles.saveButtonText, { color: '#ffffff' }]}>
                Save
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
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
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  body: {
    padding: 16,
    maxHeight: 400,
  },
  selectedTextContainer: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  selectedTextLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  selectedText: {
    fontSize: 14,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    minHeight: 120,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
    lineHeight: 22,
  },
  hintContainer: {
    marginTop: 12,
  },
  hint: {
    fontSize: 12,
    lineHeight: 16,
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});
