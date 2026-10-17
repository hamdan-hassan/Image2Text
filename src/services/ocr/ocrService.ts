import { isOcrResultEmpty, type OCRResult, type RecognitionScript } from '../../types/ocr';
import { normalizeRecognizedText } from './textNormalizer';
import type { TextRecognizer } from './recognizerPort';

export interface OCRServiceOptions {
  script?: RecognitionScript;
}

export interface OCRService {
  /** Runs offline text recognition on a local image and returns a normalized result. */
  recognize(imagePath: string, options?: OCRServiceOptions): Promise<OCRResult>;
}

export function createOcrService(dependencies: { recognizer: TextRecognizer }): OCRService {
  const { recognizer } = dependencies;
  return {
    async recognize(imagePath, options) {
      const script: RecognitionScript = options?.script ?? 'Latin';
      const startedAt = Date.now();
      const raw = await recognizer.recognize(imagePath, script);
      const processingTimeMs = Date.now() - startedAt;
      const text = normalizeRecognizedText({ blocks: raw.blocks, fallbackText: raw.text });
      return { text, blocks: raw.blocks, script, processingTimeMs };
    },
  };
}

export { isOcrResultEmpty };
