import type { RecognitionScript } from './ocr';

export interface ScanRecord {
  id: string;
  title: string;
  originalImagePath: string | null;
  processedImagePath: string | null;
  thumbnailPath: string | null;
  extractedText: string;
  editedText: string | null;
  script: RecognitionScript;
  wordCount: number;
  charCount: number;
  createdAt: number;
  updatedAt: number;
}
