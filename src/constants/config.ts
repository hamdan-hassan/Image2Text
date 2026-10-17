import type { RecognitionScript } from '../types/ocr';

export const APP_NAME = 'Image2Text';

export const OCR_MAX_DIMENSION = 2048;
export const THUMBNAIL_MAX_DIMENSION = 320;
export const PROCESSED_JPEG_QUALITY = 0.9;
export const THUMBNAIL_JPEG_QUALITY = 0.7;
export const PICKER_JPEG_QUALITY = 0.95;
export const CAMERA_CAPTURE_QUALITY = 0.95;
export const MIN_FREE_DISK_BYTES = 25 * 1024 * 1024;
export const RECENT_SCANS_LIMIT = 5;

export interface LanguageOption {
  script: RecognitionScript;
  label: string;
  /** Languages the recognizer covers for this script (bundled offline). */
  detail: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  {
    script: 'Latin',
    label: 'Latin script',
    detail: 'English · Spanish · French · German · Portuguese · Italian · Dutch + more',
  },
  { script: 'Chinese', label: 'Chinese', detail: 'Simplified · Traditional' },
  { script: 'Devanagari', label: 'Devanagari', detail: 'Hindi · Marathi · Nepali · Sanskrit' },
  { script: 'Japanese', label: 'Japanese', detail: 'Japanese' },
  { script: 'Korean', label: 'Korean', detail: 'Korean' },
];

export function languageLabel(script: RecognitionScript): string {
  return SUPPORTED_LANGUAGES.find((l) => l.script === script)?.label ?? script;
}
