import { normalizeRecognizedText, cleanUpRawText } from '../src/services/ocr/textNormalizer';
import type { OCRBlock } from '../src/types/ocr';

const frame = (left: number, top: number, width: number, height: number) => ({ left, top, width, height });

function block(lines: Array<{ text: string; frame?: ReturnType<typeof frame> }>, blockFrame?: ReturnType<typeof frame>): OCRBlock {
  return {
    text: lines.map((l) => l.text).join('\n'),
    ...(blockFrame ? { frame: blockFrame } : {}),
    lines: lines.map((line) => ({ text: line.text, ...(line.frame ? { frame: line.frame } : {}) })),
  };
}

describe('cleanUpRawText', () => {
  it('trims trailing whitespace per line', () => {
    expect(cleanUpRawText('hello   \nworld\t')).toBe('hello\nworld');
  });

  it('collapses excessive blank lines to one blank line', () => {
    expect(cleanUpRawText('a\n\n\n\n\nb')).toBe('a\n\nb');
  });

  it('trims outer whitespace', () => {
    expect(cleanUpRawText('  \n hello \n  ')).toBe('hello');
  });
});

describe('normalizeRecognizedText', () => {
  it('returns cleaned fallback text when there are no lines', () => {
    const result = normalizeRecognizedText({ blocks: [], fallbackText: 'raw\ntext\n\n\n' });
    expect(result).toBe('raw\ntext');
  });

  it('uses fallback when frames are missing (no geometry available)', () => {
    const blocks = [block([{ text: 'A' }, { text: 'B' }])];
    const result = normalizeRecognizedText({ blocks, fallbackText: 'A\nB' });
    expect(result).toBe('A\nB');
  });

  it('keeps separate lines as separate lines by default', () => {
    const lines = [
      { text: 'INVOICE', frame: frame(100, 100, 200, 30) },
      { text: 'Company ABC', frame: frame(100, 180, 260, 30) },
      { text: 'Total: GHS 450', frame: frame(100, 260, 300, 30) },
    ];
    const result = normalizeRecognizedText({ blocks: [block(lines)], fallbackText: '' });
    expect(result.split('\n')).toEqual(['INVOICE', 'Company ABC', 'Total: GHS 450']);
  });

  it('joins a wrapped sentence when the previous line fills the block width', () => {
    const lines = [
      { text: 'This is a long sentence that fills the', frame: frame(50, 100, 900, 30) },
      { text: 'entire width of the page', frame: frame(50, 135, 400, 30) },
    ];
    const result = normalizeRecognizedText({ blocks: [block(lines)], fallbackText: '' });
    expect(result).toBe('This is a long sentence that fills the entire width of the page');
  });

  it('dehyphenates words broken across lines', () => {
    const lines = [
      { text: 'The agreement was termi-', frame: frame(50, 100, 880, 30) },
      { text: 'nated immediately.', frame: frame(50, 135, 420, 30) },
    ];
    const result = normalizeRecognizedText({ blocks: [block(lines)], fallbackText: '' });
    expect(result).toContain('terminated immediately.');
  });

  it('does not join when the first line ends with terminal punctuation', () => {
    const lines = [
      { text: 'This ends here.', frame: frame(50, 100, 900, 30) },
      { text: 'next line starts lowercase but stays apart', frame: frame(50, 135, 800, 30) },
    ];
    const result = normalizeRecognizedText({ blocks: [block(lines)], fallbackText: '' });
    expect(result.split('\n')).toHaveLength(2);
  });

  it('never joins bullet or numbered list items into the previous line', () => {
    const lines = [
      { text: 'Shopping list includes many items that fill', frame: frame(50, 100, 900, 30) },
      { text: '- apples', frame: frame(60, 135, 200, 30) },
      { text: '2. bananas', frame: frame(60, 170, 220, 30) },
    ];
    const result = normalizeRecognizedText({ blocks: [block(lines)], fallbackText: '' });
    expect(result).not.toContain('fill - apples');
    expect(result.split('\n')).toHaveLength(3);
  });

  it('breaks paragraphs on vertical gaps', () => {
    const lines = [
      { text: 'First paragraph continues here with more', frame: frame(50, 100, 900, 30) },
      { text: 'words to wrap onto another line of text', frame: frame(50, 135, 820, 30) },
      { text: 'Second paragraph starts after a blank gap', frame: frame(50, 320, 900, 30) },
    ];
    const result = normalizeRecognizedText({ blocks: [block(lines)], fallbackText: '' });
    const output = result;
    expect(output).toContain('more words to wrap');
    expect(output).not.toContain('text Second');
  });

  it('preserves reading order across blocks', () => {
    const lines1 = [{ text: 'Header', frame: frame(100, 40, 200, 24) }];
    const lines2 = [{ text: 'Body content', frame: frame(100, 120, 300, 24) }];
    const result = normalizeRecognizedText({ blocks: [block(lines1), block(lines2)], fallbackText: '' });
    expect(result).toBe('Header\nBody content');
  });
});
