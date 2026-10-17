import {
  clampNormalizedRect,
  exifOrientationIsMirrored,
  exifOrientationToRotation,
  fitImageInContainer,
  normalizedToPixelCrop,
} from '../src/services/imaging/cropMath';

describe('clampNormalizedRect', () => {
  it('enforces minimum size and bounds', () => {
    expect(clampNormalizedRect({ x: -0.5, y: -0.5, width: 2, height: 2 })).toEqual({
      x: 0,
      y: 0,
      width: 1,
      height: 1,
    });
    const tiny = clampNormalizedRect({ x: 0.4, y: 0.4, width: 0.001, height: 0.001 });
    expect(tiny.width).toBeGreaterThan(0);
    expect(tiny.height).toBeGreaterThan(0);
  });

  it('keeps the rect inside the image when dragged out of range', () => {
    const rect = clampNormalizedRect({ x: 0.9, y: 0.9, width: 0.3, height: 0.3 });
    expect(rect.x + rect.width).toBeLessThanOrEqual(1);
    expect(rect.y + rect.height).toBeLessThanOrEqual(1);
  });
});

describe('normalizedToPixelCrop', () => {
  it('converts normalized coordinates to in-bounds integer pixels', () => {
    const crop = normalizedToPixelCrop({ x: 0.25, y: 0.5, width: 0.5, height: 0.25 }, 1000, 800);
    expect(crop).toEqual({ originX: 250, originY: 400, width: 500, height: 200 });
  });

  it('never produces a zero-sized crop at the edges', () => {
    const crop = normalizedToPixelCrop({ x: 0.98, y: 0.98, width: 0.05, height: 0.05 }, 1000, 1000);
    expect(crop.originX + crop.width).toBeLessThanOrEqual(1000);
    expect(crop.width).toBeGreaterThanOrEqual(1);
    expect(crop.height).toBeGreaterThanOrEqual(1);
  });
});

describe('fitImageInContainer', () => {
  it('letterboxes landscape images into portrait containers', () => {
    const fitted = fitImageInContainer(4000, 2000, 300, 600);
    expect(fitted.width).toBeCloseTo(300);
    expect(fitted.height).toBeCloseTo(150);
    expect(fitted.offsetY).toBeCloseTo(225);
    expect(fitted.offsetX).toBeCloseTo(0);
  });

  it('handles degenerate inputs without dividing by zero', () => {
    expect(fitImageInContainer(0, 100, 100, 100)).toEqual({
      width: 0,
      height: 0,
      offsetX: 0,
      offsetY: 0,
    });
  });
});

describe('exif orientation mapping', () => {
  it.each([
    [undefined, 0],
    [null, 0],
    [1, 0],
    [3, 180],
    [6, 90],
    [8, 270],
  ])('maps orientation %s to %s degrees', (input, expected) => {
    expect(exifOrientationToRotation(input as number | null | undefined)).toBe(expected);
  });

  it('flags mirrored orientations', () => {
    expect(exifOrientationIsMirrored(2)).toBe(true);
    expect(exifOrientationIsMirrored(6)).toBe(false);
    expect(exifOrientationIsMirrored(null)).toBe(false);
  });
});
