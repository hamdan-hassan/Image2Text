import type { OCRBlock, OCRFrame } from '../../types/ocr';

const TERMINAL_PUNCTUATION = /[.:;!?\u2026)\]}»"'`,~\-]$/u;
const BULLET_PATTERN = /^(\s*)([-\u2013\u2014*\u2022\u00b7\u2023o]|\d{1,3}[.)]|[a-zA-Z][.)])\s+\S/;
const LOWERCASE_START = /^[a-z\u00e0-\u00ff]/;

interface FlatLine {
  text: string;
  frame?: OCRFrame;
  blockIdx: number;
}

function flattenLines(blocks: OCRBlock[]): FlatLine[] {
  const lines: FlatLine[] = [];
  blocks.forEach((block, blockIdx) => {
    for (const line of block.lines ?? []) {
      const text = line.text?.trim();
      if (text) lines.push({ text, frame: line.frame, blockIdx });
    }
  });
  return lines;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function rightEdge(frame: OCRFrame): number {
  return frame.left + frame.width;
}

function verticalGap(prev: FlatLine, next: FlatLine): number | null {
  if (!prev.frame || !next.frame) return null;
  return next.frame.top - (prev.frame.top + prev.frame.height);
}

/**
 * Decides whether `next` is a pure line-wrap continuation of `prev` inside the
 * same paragraph. Deliberately conservative: we only JOIN strong evidence of a
 * wrapped sentence, everything else keeps its own line so we never destroy or
 * invent document structure.
 */
function isWrapContinuation(prev: FlatLine, next: FlatLine, blockMaxRight: Map<number, number>, medianHeight: number): boolean {
  if (prev.text.endsWith('-') && LOWERCASE_START.test(next.text)) return true;
  if (TERMINAL_PUNCTUATION.test(prev.text)) return false;
  if (BULLET_PATTERN.test(next.text) || BULLET_PATTERN.test(prev.text)) return false;
  if (!LOWERCASE_START.test(next.text)) return false;
  if (!prev.frame || !next.frame || prev.blockIdx !== next.blockIdx) return false;
  const gap = verticalGap(prev, next);
  if (gap === null || gap < -medianHeight * 0.25 || gap > medianHeight * 0.6) return false;
  const maxRight = blockMaxRight.get(prev.blockIdx);
  if (maxRight === undefined || maxRight <= 0) return false;
  const fillRatio = rightEdge(prev.frame) / maxRight;
  return fillRatio >= 0.8;
}

export function cleanUpRawText(text: string): string {
  return text
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/g, ''))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export interface NormalizeInput {
  blocks: OCRBlock[];
  fallbackText: string;
}

/** Rebuilds readable text: preserves native line breaks, merges proven line-wraps. */
export function normalizeRecognizedText({ blocks, fallbackText }: NormalizeInput): string {
  const lines = flattenLines(blocks);
  if (lines.length === 0) return cleanUpRawText(fallbackText);

  const allHaveFrames = lines.every((l) => l.frame);
  if (!allHaveFrames) return cleanUpRawText(fallbackText);

  const heights = lines.map((l) => l.frame!.height).filter((h) => h > 0);
  const medianHeight = median(heights) || 1;

  const blockMaxRight = new Map<number, number>();
  for (const line of lines) {
    const edge = rightEdge(line.frame!);
    const current = blockMaxRight.get(line.blockIdx);
    blockMaxRight.set(line.blockIdx, Math.max(current ?? 0, edge));
  }

  let output = '';
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (i > 0) {
      const prev = lines[i - 1];
      const join = isWrapContinuation(prev, line, blockMaxRight, medianHeight);
      if (join) {
        if (output.endsWith('-') && LOWERCASE_START.test(line.text)) output = output.slice(0, -1);
        else output += ' ';
        output += line.text;
        continue;
      }
      output += '\n';
    }
    output += line.text;
  }

  return cleanUpRawText(output);
}
