import { createOcrService, isOcrResultEmpty } from '../src/services/ocr/ocrService';
import { mapRawResult, parseFrame } from '../src/services/ocr/recognizerPort';
import type { TextRecognizer } from '../src/services/ocr/recognizerPort';
import { AppError } from '../src/types/errors';

const okRecognizer: TextRecognizer = {
  recognize: jest.fn(async (path, script) => {
    expect(path).toBe('file:///img.jpg');
    expect(script).toBe('Latin');
    return {
      text: 'Hello\nWorld',
      blocks: [
        {
          text: 'Hello\nWorld',
          frame: { left: 0, top: 0, width: 100, height: 60 },
          lines: [
            { text: 'Hello', frame: { left: 0, top: 0, width: 100, height: 25 } },
            { text: 'World', frame: { left: 0, top: 30, width: 90, height: 25 } },
          ],
        },
      ],
    };
  }),
};

describe('createOcrService', () => {
  it('runs recognition and returns a normalized result with timing and script', async () => {
    const service = createOcrService({ recognizer: okRecognizer });
    const result = await service.recognize('file:///img.jpg');
    expect(result.script).toBe('Latin');
    expect(result.text.length).toBeGreaterThan(0);
    expect(result.blocks).toHaveLength(1);
    expect(typeof result.processingTimeMs).toBe('number');
  });

  it('defaults to the Latin script when none is provided', async () => {
    const spy: TextRecognizer = { recognize: jest.fn(async () => ({ text: 'x', blocks: [] })) };
    const service = createOcrService({ recognizer: spy });
    await service.recognize('/a.png');
    expect(spy.recognize).toHaveBeenCalledWith('/a.png', 'Latin');
  });

  it('propagates the requested script to the recognizer', async () => {
    const spy: TextRecognizer = { recognize: jest.fn(async () => ({ text: '', blocks: [] })) };
    const service = createOcrService({ recognizer: spy });
    await service.recognize('/a.png', { script: 'Japanese' });
    expect(spy.recognize).toHaveBeenCalledWith('/a.png', 'Japanese');
  });

  it('bubbles engine errors untouched', async () => {
    const failing: TextRecognizer = {
      recognize: jest.fn(async () => {
        throw new AppError('OCR_FAILED');
      }),
    };
    const service = createOcrService({ recognizer: failing });
    await expect(service.recognize('/a.png')).rejects.toMatchObject({ code: 'OCR_FAILED' });
  });
});

describe('isOcrResultEmpty', () => {
  it('detects empty results', () => {
    expect(isOcrResultEmpty({ text: '', blocks: [], script: 'Latin' })).toBe(true);
    expect(isOcrResultEmpty({ text: '   \n ', blocks: [], script: 'Latin' })).toBe(true);
    expect(isOcrResultEmpty({ text: 'word', blocks: [], script: 'Latin' })).toBe(false);
    expect(
      isOcrResultEmpty({
        text: '',
        blocks: [{ text: 't', lines: [{ text: 't' }] }],
        script: 'Latin',
      })
    ).toBe(false);
  });
});

describe('mapRawResult', () => {
  it('maps well-formed native output', () => {
    const output = mapRawResult({
      text: 'Hi',
      blocks: [
        {
          text: 'Hi',
          frame: { left: 1, top: 2, width: 3, height: 4 },
          lines: [{ text: ' Hi ', frame: { left: 1, top: 2, width: 3, height: 4 } }],
        },
      ],
    });
    expect(output.text).toBe('Hi');
    expect(output.blocks[0].lines[0].text).toBe('Hi');
    expect(output.blocks[0].lines[0].frame).toEqual({ left: 1, top: 2, width: 3, height: 4 });
  });

  it('tolerates malformed native output without throwing', () => {
    expect(() => mapRawResult(undefined)).not.toThrow();
    expect(() => mapRawResult(null)).not.toThrow();
    expect(() => mapRawResult(42)).not.toThrow();
    const output = mapRawResult({ blocks: [null, {}, { lines: [[1, 2]] }] });
    expect(output.text).toBe('');
    expect(output.blocks.every((block) => Array.isArray(block.lines))).toBe(true);
  });

  it('drops frames that are not fully numeric', () => {
    expect(parseFrame({ left: 1, top: 'x', width: 3, height: 4 })).toBeUndefined();
    expect(parseFrame('nope')).toBeUndefined();
    expect(parseFrame(undefined)).toBeUndefined();
  });
});
