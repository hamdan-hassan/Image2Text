export type RecognitionScript = 'Latin' | 'Chinese' | 'Devanagari' | 'Japanese' | 'Korean';

export interface OCRFrame {
  width: number;
  height: number;
  top: number;
  left: number;
}

export interface OCRLine {
  text: string;
  frame?: OCRFrame;
}

export interface OCRBlock {
  text: string;
  frame?: OCRFrame;
  lines: OCRLine[];
}

export interface OCRResult {
  text: string;
  blocks: OCRBlock[];
  script: RecognitionScript;
  processingTimeMs?: number;
  confidence?: number;
}

export const isOcrResultEmpty = (result: OCRResult): boolean =>
  result.blocks.length === 0 && result.text.trim().length === 0;
