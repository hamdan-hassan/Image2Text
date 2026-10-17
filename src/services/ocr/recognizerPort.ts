import type { OCRBlock, OCRFrame, OCRLine, RecognitionScript } from '../../types/ocr';

export interface RecognizerOutput {
  text: string;
  blocks: OCRBlock[];
}

export interface TextRecognizer {
  recognize(imagePath: string, script: RecognitionScript): Promise<RecognizerOutput>;
}

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null;
}

function toNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

/** Tolerant frame parser — Android/iOS bridges emit {width,height,top,left}. */
export function parseFrame(raw: unknown): OCRFrame | undefined {
  if (!isRecord(raw)) return undefined;
  const width = toNumber(raw.width);
  const height = toNumber(raw.height);
  const top = toNumber(raw.top);
  const left = toNumber(raw.left);
  if (width === undefined || height === undefined || top === undefined || left === undefined) return undefined;
  return { width, height, top, left };
}

/** Normalizes untyped native output into our OCR block model. */
export function mapRawResult(raw: unknown): RecognizerOutput {
  const root = isRecord(raw) ? raw : {};
  const rawBlocks = Array.isArray(root.blocks) ? root.blocks : [];
  const blocks: OCRBlock[] = [];

  for (const entry of rawBlocks) {
    if (!isRecord(entry)) continue;
    const rawLines = Array.isArray(entry.lines) ? entry.lines : [];
    const lines = rawLines
      .map((line) => {
        if (!isRecord(line)) return null;
        const text = typeof line.text === 'string' ? line.text.trim() : '';
        if (!text) return null;
        const frame = parseFrame(line.frame);
        return frame ? { text, frame } : { text };
      })
      .filter((line): line is OCRLine => line !== null);

    const frame = parseFrame(entry.frame);
    blocks.push({
      text: typeof entry.text === 'string' ? entry.text : '',
      ...(frame ? { frame } : {}),
      lines,
    });
  }

  return { text: typeof root.text === 'string' ? root.text : '', blocks };
}
