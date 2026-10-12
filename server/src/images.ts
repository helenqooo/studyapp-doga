export type ImageMime = 'image/jpeg' | 'image/png' | 'image/webp';

const EXTENSIONS: Record<ImageMime, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

/** Detects the image type from magic bytes; returns null for anything Claude can't read. */
export function sniffImage(buf: Buffer): { mime: ImageMime; ext: string } | null {
  let mime: ImageMime | null = null;
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    mime = 'image/jpeg';
  } else if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    mime = 'image/png';
  } else if (buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
    mime = 'image/webp';
  }
  return mime ? { mime, ext: EXTENSIONS[mime] } : null;
}
