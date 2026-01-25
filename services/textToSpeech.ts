/**
 * Text-to-Speech Service
 * Provides TTS functionality for reading documents
 */

import { Platform } from 'react-native';

export interface TTSOptions {
  rate?: number; // 0.0 to 1.0
  pitch?: number; // 0.0 to 2.0
  volume?: number; // 0.0 to 1.0
  language?: string; // Language code (e.g., 'en-US')
}

export interface TTSVoice {
  id: string;
  name: string;
  language: string;
  quality?: number;
}

class TTSService {
  private isInitialized = false;
  private isSpeaking = false;
  private currentUtterance: any = null;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const Speech = await import('expo-speech');
      const M = Speech?.default ?? Speech;
      if (M?.speak) {
        this.isInitialized = true;
        console.log('TTS initialized with expo-speech');
      }
    } catch (e) {
      console.warn('TTS disabled (expo-speech not available):', e);
    }
  }

  async speak(text: string, options?: TTSOptions): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.isInitialized) {
      console.warn('TTS not available. expo-speech may not be installed or linked.');
      return;
    }

    try {
      const Speech = await import('expo-speech');
      const M = Speech?.default ?? Speech;

      if (!M?.speak) {
        console.warn('TTS: Speech.speak not available.');
        return;
      }

      if (this.isSpeaking) {
        await this.stop();
      }

      this.isSpeaking = true;
      M.speak(text, {
        rate: options?.rate ?? 1.0,
        pitch: options?.pitch ?? 1.0,
        volume: options?.volume ?? 1.0,
        language: options?.language ?? 'en',
        onDone: () => {
          this.isSpeaking = false;
        },
        onStopped: () => {
          this.isSpeaking = false;
        },
        onError: (err: unknown) => {
          console.warn('TTS error:', err);
          this.isSpeaking = false;
        },
      });
    } catch (error) {
      console.warn('TTS speak failed:', error);
      this.isSpeaking = false;
    }
  }

  async stop(): Promise<void> {
    if (!this.isInitialized) return;

    try {
      const Speech = await import('expo-speech');
      Speech.stop();
      this.isSpeaking = false;
    } catch (error) {
      console.error('Error stopping TTS:', error);
    }
  }

  async pause(): Promise<void> {
    // expo-speech doesn't support pause, so we stop
    await this.stop();
  }

  async resume(): Promise<void> {
    // expo-speech doesn't support resume
    // Would need to track position and re-speak from that point
    console.warn('Resume not supported by expo-speech');
  }

  isCurrentlySpeaking(): boolean {
    return this.isSpeaking;
  }

  async getAvailableVoices(): Promise<TTSVoice[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.isInitialized) {
      return [];
    }

    try {
      // expo-speech doesn't provide voice list directly
      // Return default voices based on platform
      if (Platform.OS === 'ios') {
        return [
          { id: 'en-US', name: 'English (US)', language: 'en-US' },
          { id: 'en-GB', name: 'English (UK)', language: 'en-GB' },
        ];
      } else {
        return [
          { id: 'en-US', name: 'English (US)', language: 'en-US' },
        ];
      }
    } catch (error) {
      console.error('Error getting voices:', error);
      return [];
    }
  }
}

export const ttsService = new TTSService();
