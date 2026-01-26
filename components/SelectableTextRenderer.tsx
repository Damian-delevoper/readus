/**
 * Custom Text Renderer for react-native-render-html
 * Captures text selection events and triggers callbacks
 */

import React, { useRef, useEffect, useCallback } from 'react';
import { Text, Platform } from 'react-native';

// Conditional import for clipboard - use lazy loading to avoid native module errors
let Clipboard: any = null;
try {
  // Only try to load clipboard if we're on a native platform
  if (typeof Platform !== 'undefined' && Platform && Platform.OS !== 'web') {
    const clipboardModule = require('@react-native-clipboard/clipboard');
    if (clipboardModule && clipboardModule.default) {
      Clipboard = clipboardModule;
    }
  }
} catch (e) {
  // Clipboard not available or not linked - this is fine, we'll just skip clipboard monitoring
  Clipboard = null;
}

interface SelectableTextRendererProps {
  children: React.ReactNode;
  onTextSelection?: (text: string, position: { x: number; y: number }) => void;
  selectionColor?: string;
  [key: string]: any;
}

export function SelectableTextRenderer({
  children,
  onTextSelection,
  selectionColor,
  ...props
}: SelectableTextRendererProps) {
  const textRef = useRef<Text>(null);
  const lastClipboardCheck = useRef<string>('');
  const selectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSelectionRef = useRef<string>('');

  // Handle text selection on Android using a combination of onSelectionChange and clipboard monitoring
  const handleSelectionChange = useCallback((event: any) => {
    if (!onTextSelection || !textRef.current) return;

    const { selection } = event.nativeEvent;
    if (selection && selection.start !== undefined && selection.end !== undefined && selection.start !== selection.end) {
      // Get the text content - handle both string and nested Text components
      let textContent = '';
      if (typeof children === 'string') {
        textContent = children;
      } else if (React.isValidElement(children) && typeof children.props.children === 'string') {
        textContent = children.props.children;
      } else if (typeof children === 'object' && children !== null && 'props' in children) {
        // Try to extract text from nested structure
        const extractText = (node: any): string => {
          if (typeof node === 'string') return node;
          if (Array.isArray(node)) return node.map(extractText).join('');
          if (node?.props?.children) return extractText(node.props.children);
          return '';
        };
        textContent = extractText(children);
      }
      
      if (textContent && selection.start >= 0 && selection.end <= textContent.length) {
        const selectedText = textContent.substring(selection.start, selection.end);
        if (selectedText.trim() && selectedText.trim() !== lastSelectionRef.current) {
          lastSelectionRef.current = selectedText.trim();
          
          // Clear any existing timeout
          if (selectionTimeoutRef.current) {
            clearTimeout(selectionTimeoutRef.current);
          }
          
          // Delay to allow Android selection UI to appear first, then show our custom menu
          // Use a longer delay on Android to ensure native selection UI appears first
          selectionTimeoutRef.current = setTimeout(() => {
            if (textRef.current) {
              textRef.current.measure((x, y, width, height, pageX, pageY) => {
                onTextSelection(selectedText.trim(), {
                  x: pageX + width / 2,
                  y: pageY + height / 2,
                });
              });
            }
          }, Platform.OS === 'android' ? 800 : 200);
        }
      }
    }
  }, [children, onTextSelection]);

  // Check clipboard periodically to detect text selection (Android workaround)
  useEffect(() => {
    if (Platform.OS === 'android' && onTextSelection && Clipboard) {
      const interval = setInterval(async () => {
        try {
          const clipboardText = await Clipboard.default.getString();
          if (clipboardText && clipboardText !== lastClipboardCheck.current && clipboardText.trim()) {
            // Only trigger if we have a reasonable amount of text (not just a single character)
            // And it's different from the last selection we detected
            if (clipboardText.length > 1 && clipboardText.trim() !== lastSelectionRef.current) {
              lastClipboardCheck.current = clipboardText;
              lastSelectionRef.current = clipboardText.trim();
              if (textRef.current) {
                textRef.current.measure((x, y, width, height, pageX, pageY) => {
                  onTextSelection(clipboardText.trim(), {
                    x: pageX + width / 2,
                    y: pageY + height / 2,
                  });
                });
              }
            }
          }
        } catch (e) {
          // Clipboard access failed, ignore
        }
      }, 1000); // Check every second
      return () => clearInterval(interval);
    }
  }, [onTextSelection]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (selectionTimeoutRef.current) {
        clearTimeout(selectionTimeoutRef.current);
      }
    };
  }, []);

  return (
    <Text
      ref={textRef}
      {...props}
      selectable={true}
      selectionColor={selectionColor}
      onSelectionChange={handleSelectionChange}
      // Android-specific props for better text selection
      {...(Platform.OS === 'android' && {
        suppressHighlighting: false,
        textBreakStrategy: 'simple',
      })}
    >
      {children}
    </Text>
  );
}
