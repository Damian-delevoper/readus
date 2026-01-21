/**
 * OCR Service Interface
 * Placeholder for future OCR integration
 */

import { OCRService } from '@/types';

/**
 * Default OCR service implementation (placeholder)
 * In production, this would connect to an actual OCR service
 */
export const ocrService: OCRService = {
  async scan(imageUri: string): Promise<string> {
    // Placeholder implementation
    return 'OCR scanning not yet implemented.';
  },
};
