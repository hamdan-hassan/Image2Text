export interface CropRectPixels {
  originX: number;
  originY: number;
  width: number;
  height: number;
}

export interface NormalizedRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const MIN_NORMALIZED_SIZE = 0.05;

export function clampNormalizedRect(rect: NormalizedRect): NormalizedRect {
  const width = Math.min(Math.max(rect.width, MIN_NORMALIZED_SIZE), 1);
  const height = Math.min(Math.max(rect.height, MIN_NORMALIZED_SIZE), 1);
  const x = Math.min(Math.max(rect.x, 0), 1 - width);
  const y = Math.min(Math.max(rect.y, 0), 1 - height);
  return { x, y, width, height };
}

/**
 * Converts a crop rectangle from normalized [0..1] image space into pixel
 * space used by the image manipulator, guaranteeing a non-empty in-bounds rect.
 */
export function normalizedToPixelCrop(rect: NormalizedRect, imageWidth: number, imageHeight: number): CropRectPixels {
  const clamped = clampNormalizedRect(rect);
  const originX = Math.round(clamped.x * imageWidth);
  const originY = Math.round(clamped.y * imageHeight);
  let width = Math.round(clamped.width * imageWidth);
  let height = Math.round(clamped.height * imageHeight);
  width = Math.min(Math.max(width, 1), imageWidth - originX);
  height = Math.min(Math.max(height, 1), imageHeight - originY);
  return { originX, originY, width, height };
}

/** Fits an image inside a container while preserving aspect ratio (letterbox math). */
export function fitImageInContainer(
  imageWidth: number,
  imageHeight: number,
  containerWidth: number,
  containerHeight: number
): { width: number; height: number; offsetX: number; offsetY: number } {
  if (imageWidth <= 0 || imageHeight <= 0 || containerWidth <= 0 || containerHeight <= 0) {
    return { width: 0, height: 0, offsetX: 0, offsetY: 0 };
  }
  const scale = Math.min(containerWidth / imageWidth, containerHeight / imageHeight);
  const width = imageWidth * scale;
  const height = imageHeight * scale;
  return {
    width,
    height,
    offsetX: (containerWidth - width) / 2,
    offsetY: (containerHeight - height) / 2,
  };
}

const EXIF_ROTATIONS: Record<number, number> = { 3: 180, 6: 90, 8: 270 };

/** Maps an EXIF orientation tag to the clockwise rotation (degrees) needed to upright the image. */
export function exifOrientationToRotation(orientation?: number | null): number {
  if (!orientation) return 0;
  return EXIF_ROTATIONS[orientation] ?? 0;
}

/** True for EXIF orientations that also involve mirroring (2, 4, 5, 7). */
export function exifOrientationIsMirrored(orientation?: number | null): boolean {
  return !!orientation && [2, 4, 5, 7].includes(orientation);
}
