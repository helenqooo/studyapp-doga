import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { UPLOAD_JPEG_QUALITY, UPLOAD_MAX_SIDE } from '../config';

export interface LocalImage {
  uri: string;
  width: number;
  height: number;
}

export interface CropRect {
  originX: number;
  originY: number;
  width: number;
  height: number;
}

/** Working copy for the crop screen: big enough to crop from, small enough to stay snappy. */
const WORKING_MAX_SIDE = 2400;

/**
 * Re-encodes a camera/gallery image so pixel orientation is baked in (crop math then
 * matches what's on screen) and caps its size.
 */
export async function normalizeImage(uri: string): Promise<LocalImage> {
  let ref = await ImageManipulator.manipulate(uri).renderAsync();
  const longSide = Math.max(ref.width, ref.height);
  if (longSide > WORKING_MAX_SIDE) {
    const scale = WORKING_MAX_SIDE / longSide;
    ref = await ImageManipulator.manipulate(ref).resize({ width: Math.round(ref.width * scale) }).renderAsync();
  }
  const saved = await ref.saveAsync({ format: SaveFormat.JPEG, compress: 0.92 });
  return { uri: saved.uri, width: saved.width, height: saved.height };
}

/** Crops, scales the long side down to UPLOAD_MAX_SIDE and saves as JPEG for upload. */
export async function prepareUpload(image: LocalImage, crop: CropRect): Promise<LocalImage> {
  const originX = Math.max(0, Math.min(image.width - 1, Math.round(crop.originX)));
  const originY = Math.max(0, Math.min(image.height - 1, Math.round(crop.originY)));
  const width = Math.max(1, Math.min(image.width - originX, Math.round(crop.width)));
  const height = Math.max(1, Math.min(image.height - originY, Math.round(crop.height)));

  let ctx = ImageManipulator.manipulate(image.uri).crop({ originX, originY, width, height });
  if (Math.max(width, height) > UPLOAD_MAX_SIDE) {
    ctx = ctx.resize(width >= height ? { width: UPLOAD_MAX_SIDE } : { height: UPLOAD_MAX_SIDE });
  }
  const ref = await ctx.renderAsync();
  const saved = await ref.saveAsync({ format: SaveFormat.JPEG, compress: UPLOAD_JPEG_QUALITY });
  return { uri: saved.uri, width: saved.width, height: saved.height };
}
