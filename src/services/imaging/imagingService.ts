import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { AppError } from '../../types/errors';
import {
  OCR_MAX_DIMENSION,
  PROCESSED_JPEG_QUALITY,
  THUMBNAIL_JPEG_QUALITY,
  THUMBNAIL_MAX_DIMENSION,
} from '../../constants/config';

export interface PreparedImage {
  uri: string;
  width: number;
  height: number;
}

export interface CropPixels {
  originX: number;
  originY: number;
  width: number;
  height: number;
}

export interface ImageEdits {
  crop?: CropPixels | null;
  rotationDegrees?: number;
}

async function renderAndSave(
  uri: string,
  apply: (context: ReturnType<typeof ImageManipulator.manipulate>) => void,
  quality: number,
  knownSize?: { width: number; height: number }
): Promise<PreparedImage> {
  try {
    const context = ImageManipulator.manipulate(uri);
    apply(context);
    const rendered = await context.renderAsync();
    const saved = await rendered.saveAsync({ compress: quality, format: SaveFormat.JPEG });
    return { uri: saved.uri, width: saved.width, height: saved.height };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('IMAGE_UNREADABLE', undefined, error);
  }
}

const EDIT_QUALITY = 0.95;

export interface ImagingService {
  getDimensions(uri: string): Promise<{ width: number; height: number }>;
  prepareForOcr(uri: string, edits?: ImageEdits): Promise<PreparedImage>;
  makeThumbnail(uri: string): Promise<PreparedImage>;
  rotateQuarterTurn(uri: string, degrees: 90 | -90 | 180 | 270): Promise<PreparedImage>;
}

/**
 * Native image pipeline (runs off the JS thread): optional user crop/rotation
 * first, then a single downscale keeping the long edge at or below
 * OCR_MAX_DIMENSION — large enough for small print, small enough to avoid
 * out-of-memory crashes on low-end devices.
 */
export const nativeImaging: ImagingService = {
  async getDimensions(uri) {
    try {
      const rendered = await ImageManipulator.manipulate(uri).renderAsync();
      return { width: rendered.width, height: rendered.height };
    } catch (error) {
      throw new AppError('IMAGE_UNREADABLE', undefined, error);
    }
  },

  async prepareForOcr(uri, edits) {
    const dims = await this.getDimensions(uri);
    const crop = edits?.crop ?? null;
    const rotation = ((((edits?.rotationDegrees ?? 0) % 360) + 360) % 360);

    let effectiveWidth = crop ? crop.width : dims.width;
    let effectiveHeight = crop ? crop.height : dims.height;
    if (rotation % 180 === 90) [effectiveWidth, effectiveHeight] = [effectiveHeight, effectiveWidth];

    return renderAndSave(
      uri,
      (context) => {
        if (crop) {
          context.crop({
            originX: Math.max(0, Math.round(crop.originX)),
            originY: Math.max(0, Math.round(crop.originY)),
            width: Math.max(1, Math.round(crop.width)),
            height: Math.max(1, Math.round(crop.height)),
          });
        }
        if (rotation > 0 && rotation % 90 === 0) context.rotate(rotation);
        const longestEdge = Math.max(effectiveWidth, effectiveHeight);
        if (longestEdge > OCR_MAX_DIMENSION) {
          const scale = OCR_MAX_DIMENSION / longestEdge;
          context.resize({
            width: Math.max(1, Math.round(effectiveWidth * scale)),
            height: Math.max(1, Math.round(effectiveHeight * scale)),
          });
        }
      },
      PROCESSED_JPEG_QUALITY
    );
  },

  async makeThumbnail(uri) {
    const dims = await this.getDimensions(uri);
    if (Math.max(dims.width, dims.height) <= THUMBNAIL_MAX_DIMENSION) {
      return renderAndSave(uri, () => undefined, THUMBNAIL_JPEG_QUALITY);
    }
    const scale = THUMBNAIL_MAX_DIMENSION / Math.max(dims.width, dims.height);
    return renderAndSave(uri, (context) => context.resize({ width: Math.max(1, Math.round(dims.width * scale)) }), THUMBNAIL_JPEG_QUALITY);
  },

  async rotateQuarterTurn(uri, degrees) {
    const dims = await this.getDimensions(uri);
    const swapped = Math.abs(degrees) % 180 === 90;
    return renderAndSave(
      uri,
      (context) => context.rotate(((degrees % 360) + 360) % 360),
      EDIT_QUALITY,
      { width: swapped ? dims.height : dims.width, height: swapped ? dims.width : dims.height }
    );
  },
};
