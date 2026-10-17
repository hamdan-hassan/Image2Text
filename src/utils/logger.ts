import { AppError, type ErrorCode } from '../types/errors';

type Level = 'debug' | 'info' | 'warn' | 'error';

function emit(level: Level, code: ErrorCode | 'LOG', message: string): void {
  if (!__DEV__) return;
  const prefix = `[Image2Text:${code}]`;
  if (level === 'error') console.error(prefix, message);
  else if (level === 'warn') console.warn(prefix, message);
  else console.log(prefix, message);
}

/**
 * Central logger. Never log recognized text or image contents —
 * only error codes and short technical messages in development builds.
 */
export const logger = {
  debug: (code: ErrorCode | 'LOG', message: string) => emit('debug', code, message),
  info: (code: ErrorCode | 'LOG', message: string) => emit('info', code, message),
  warn: (code: ErrorCode | 'LOG', message: string) => emit('warn', code, message),
  error: (error: unknown, message?: string) => {
    if (!__DEV__) return;
    const appError = error instanceof AppError ? error : null;
    const detail = appError ? `${appError.code}: ${appError.message}` : String(message ?? error);
    console.error('[Image2Text:error]', detail);
  },
};
