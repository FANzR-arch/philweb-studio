import { IMAGE_MIMES, MAX_UPLOAD_BYTES, MIME_EXT, UPLOAD_MAX_WIDTH, VIDEO_MIMES } from './constants';
import { createId } from './clone';
import type { MediaKind, MediaRecord } from './types';

export function inferKind(mime: string): MediaKind {
  if (VIDEO_MIMES.has(mime)) return 'video';
  return 'image';
}

export function assertUploadFile(file: File): void {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error('文件超过 32MB，请压缩后再试。');
  }
  if (![...IMAGE_MIMES, ...VIDEO_MIMES].includes(file.type)) {
    throw new Error(`暂不支持该文件格式（${file.type || file.name}），图片请使用 PNG / JPG / WebP / SVG，视频请使用 MP4 / WebM。`);
  }
}

export function mediaIdFor(role: string, ext: string): string {
  return `user/${role}-${createId('m')}.${ext}`;
}

export async function compressImage(file: File, role: string): Promise<Blob> {
  if (file.type === 'image/svg+xml') return file;
  if (!IMAGE_MIMES.has(file.type)) return file;
  const maxWidth = UPLOAD_MAX_WIDTH[role] ?? 1600;
  if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') {
    return file;
  }
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, maxWidth / Math.max(1, bitmap.width));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);
    const mime = file.type === 'image/png' || file.type === 'image/webp' ? file.type : 'image/jpeg';
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, mime, 0.82));
    return blob && blob.size > 0 ? blob : file;
  } finally {
    bitmap.close();
  }
}

export async function prepareUpload(file: File, role: string): Promise<{ blob: Blob; record: MediaRecord }> {
  assertUploadFile(file);
  const kind = inferKind(file.type);
  const processed = kind === 'image' ? await compressImage(file, role) : file;
  const ext = MIME_EXT[file.type] || 'bin';
  const id = mediaIdFor(role, ext);
  const filename = id;
  return {
    blob: processed,
    record: {
      id,
      kind,
      mime: file.type,
      filename,
      source: 'user',
      bytes: processed.size,
    },
  };
}

export function starterMediaUrl(filename: string, base = './starter/media/'): string {
  const prefix = base.endsWith('/') ? base : `${base}/`;
  return `${prefix}${filename.replace(/^\/+/, '')}`;
}

export function siteMediaUrl(filename: string, base = './'): string {
  const prefix = base.endsWith('/') ? base : `${base}/`;
  return `${prefix}${filename.replace(/^\/+/, '')}`;
}
