import { friendlyError, AppError } from '../src/types/errors';
import { countCharacters, countWords } from '../src/utils/textStats';

describe('friendlyError', () => {
  it('maps known codes to user-friendly copy', () => {
    expect(friendlyError(new AppError('NO_TEXT_DETECTED'))).toMatchObject({
      title: 'No text detected',
      code: 'NO_TEXT_DETECTED',
    });
    expect(friendlyError(new AppError('STORAGE_FULL')).title).toBe('Not enough storage');
    expect(friendlyError(new AppError('PERMISSION_BLOCKED')).hint).toContain('Settings');
  });

  it('never leaks raw error codes to users for unknown errors', () => {
    const friendly = friendlyError(new Error('OCR_EXCEPTION_CODE_502'));
    expect(friendly.title).toBe('Something went wrong');
    expect(JSON.stringify(friendly)).not.toContain('OCR_EXCEPTION_CODE_502');
  });
});

describe('text stats', () => {
  it('counts words ignoring whitespace runs', () => {
    expect(countWords('hello world')).toBe(2);
    expect(countWords('  multiple   spaces\t between words ')).toBe(4);
    expect(countWords('')).toBe(0);
    expect(countWords('   \n\n  ')).toBe(0);
  });

  it('counts characters including whitespace exactly', () => {
    expect(countCharacters('ab c')).toBe(4);
    expect(countCharacters('')).toBe(0);
  });
});
