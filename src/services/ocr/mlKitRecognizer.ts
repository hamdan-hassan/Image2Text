import NativeTextRecognition, { TextRecognitionScript } from '@react-native-ml-kit/text-recognition';
import { AppError } from '../../types/errors';
import { logger } from '../../utils/logger';
import { mapRawResult, type TextRecognizer } from './recognizerPort';

/**
 * ML Kit on-device adapter. Recognition models ship bundled inside the binary
 * (Latin, Chinese, Devanagari, Japanese, Korean) so recognition works with no
 * network connection whatsoever. This is the ONLY module aware of the engine —
 * swap it here to replace the OCR backend.
 */
export const mlKitRecognizer: TextRecognizer = {
  async recognize(imagePath, script) {
    try {
      // Our script names intentionally match ML Kit's TextRecognitionScript values.
      const nativeScript = script as unknown as TextRecognitionScript;
      const raw = await NativeTextRecognition.recognize(imagePath, nativeScript);
      return mapRawResult(raw);
    } catch (error) {
      logger.error(error, 'mlkit recognition failed');
      throw new AppError('OCR_FAILED', undefined, error);
    }
  },
};
