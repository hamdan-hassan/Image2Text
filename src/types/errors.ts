export type ErrorCode =
  | 'IMAGE_UNREADABLE'
  | 'IMAGE_UNSUPPORTED_FORMAT'
  | 'IMAGE_TOO_LARGE'
  | 'NO_TEXT_DETECTED'
  | 'OCR_FAILED'
  | 'OCR_ENGINE_MISSING'
  | 'CAMERA_UNAVAILABLE'
  | 'PERMISSION_DENIED'
  | 'PERMISSION_BLOCKED'
  | 'STORAGE_FULL'
  | 'DB_ERROR'
  | 'FILE_ERROR'
  | 'CANCELLED'
  | 'UNKNOWN';

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly cause?: unknown;

  constructor(code: ErrorCode, message?: string, cause?: unknown) {
    super(message ?? code);
    this.name = 'AppError';
    this.code = code;
    this.cause = cause;
  }
}

export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  return new AppError('UNKNOWN', error instanceof Error ? error.message : undefined, error);
}

export interface FriendlyError {
  title: string;
  hint: string;
}

const FRIENDLY_MESSAGES: Record<ErrorCode, FriendlyError> = {
  IMAGE_UNREADABLE: {
    title: 'Image could not be opened',
    hint: 'The file may be corrupted or in an unsupported format. Try a different image.',
  },
  IMAGE_UNSUPPORTED_FORMAT: {
    title: 'Unsupported image format',
    hint: 'Use a JPG, PNG or HEIC photo.',
  },
  IMAGE_TOO_LARGE: {
    title: 'Image is too large',
    hint: 'Try cropping the image or using a smaller photo.',
  },
  NO_TEXT_DETECTED: {
    title: 'No text detected',
    hint: "We couldn't find readable text in this image. Try a clearer, better-lit photo.",
  },
  OCR_FAILED: {
    title: 'Text extraction failed',
    hint: 'Something went wrong while reading the image. Please try again.',
  },
  OCR_ENGINE_MISSING: {
    title: 'Text recognition unavailable',
    hint: 'The on-device recognition engine failed to start. Restart the app and try again.',
  },
  CAMERA_UNAVAILABLE: {
    title: 'Camera unavailable',
    hint: 'The camera could not be started. Make sure no other app is using it.',
  },
  PERMISSION_DENIED: {
    title: 'Permission needed',
    hint: 'Allow access in Settings to continue.',
  },
  PERMISSION_BLOCKED: {
    title: 'Permission turned off',
    hint: 'Image2Text was denied access. Enable it in Settings to continue.',
  },
  STORAGE_FULL: {
    title: 'Not enough storage',
    hint: 'Free up some space on your device and try again.',
  },
  DB_ERROR: {
    title: 'Storage problem',
    hint: 'Your scan library could not be updated. Please try again.',
  },
  FILE_ERROR: {
    title: 'File problem',
    hint: 'The image files could not be saved. Please try again.',
  },
  CANCELLED: {
    title: 'Cancelled',
    hint: 'The operation was cancelled.',
  },
  UNKNOWN: {
    title: 'Something went wrong',
    hint: 'Please try again.',
  },
};

export function friendlyError(error: unknown): FriendlyError & { code: ErrorCode } {
  const appError = toAppError(error);
  return { ...FRIENDLY_MESSAGES[appError.code], code: appError.code };
}
