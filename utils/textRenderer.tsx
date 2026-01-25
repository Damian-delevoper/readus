/**
 * Text Renderer with Inline Highlights
 * Renders text with highlighted segments inline
 */

import React from 'react';
import { Text } from 'react-native';
import { Highlight } from '@/types';

interface HighlightedTextProps {
  text: string;
  highlights: Highlight[];
  onHighlightPress?: (highlight: Highlight, event?: any) => void;
  style?: any;
  fontSize?: number;
  lineHeight?: number;
  color?: string;
  fontFamily?: string;
  /** Android: selection highlight color. Improves selection visibility. */
  selectionColor?: string;
}

export function HighlightedText({
  text,
  highlights,
  onHighlightPress,
  style,
  fontSize = 16,
  lineHeight = 24,
  color = '#1a1a1a',
  fontFamily,
  selectionColor,
}: HighlightedTextProps) {
  const textProps = { selectable: true as const, ...(selectionColor != null && { selectionColor }) };

  if (!highlights || highlights.length === 0) {
    return (
      <Text
        {...textProps}
        style={[
          {
            fontSize,
            lineHeight,
            color,
            fontFamily,
          },
          style,
        ]}
      >
        {text}
      </Text>
    );
  }

  // Sort highlights by start position
  const sortedHighlights = [...highlights].sort((a, b) => a.startPosition - b.startPosition);
  
  // Build segments with highlights
  const segments: Array<{ text: string; highlight?: Highlight; start: number; end: number }> = [];
  let lastIndex = 0;

  sortedHighlights.forEach((highlight) => {
    // Find highlight text in the main text (case-insensitive search)
    const highlightTextLower = highlight.text.toLowerCase();
    const textLower = text.toLowerCase();
    const startIndex = textLower.indexOf(highlightTextLower, lastIndex);
    
    if (startIndex !== -1 && startIndex >= lastIndex) {
      const endIndex = startIndex + highlight.text.length;
      
      // Add text before highlight
      if (startIndex > lastIndex) {
        segments.push({
          text: text.substring(lastIndex, startIndex),
          start: lastIndex,
          end: startIndex,
        });
      }
      
      // Add highlighted text
      segments.push({
        text: text.substring(startIndex, endIndex),
        highlight,
        start: startIndex,
        end: endIndex,
      });
      
      lastIndex = endIndex;
    }
  });

  // Add remaining text
  if (lastIndex < text.length) {
    segments.push({
      text: text.substring(lastIndex),
      start: lastIndex,
      end: text.length,
    });
  }

  return (
    <Text
      {...textProps}
      style={[
        {
          fontSize,
          lineHeight,
          color,
          fontFamily,
        },
        style,
      ]}
    >
      {segments.map((segment, index) => {
        if (segment.highlight) {
          return (
            <Text
              key={index}
              {...textProps}
              style={{
                backgroundColor: segment.highlight.color + '40',
                color: color,
              }}
              onPress={(e) => onHighlightPress?.(segment.highlight!, e)}
            >
              {segment.text}
            </Text>
          );
        }
        return segment.text;
      })}
    </Text>
  );
}
