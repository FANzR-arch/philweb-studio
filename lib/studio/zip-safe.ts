import { unzipSync, zipSync, strToU8, strFromU8 } from 'fflate';
import { BACKUP_MAX_FILES, BACKUP_MAX_UNCOMPRESSED, BACKUP_MAX_ZIP_BYTES } from './constants';

export function assertSafeZipPath(name: string): string {
  const raw = String(name || '');
  if (!raw || raw.trim() !== raw) {
    throw new Error(`非法压缩路径：${raw}`);
  }
  if (raw.includes('\\') || raw.includes('\0')) {
    throw new Error(`非法压缩路径：${raw}`);
  }
  if (raw.startsWith('/') || raw.startsWith('./') || /^[a-zA-Z]:/.test(raw)) {
    throw new Error(`禁止绝对路径：${raw}`);
  }
  const parts = raw.split('/');
  if (parts.some((part) => part === '' || part === '.' || part === '..')) {
    throw new Error(`路径穿越被拒绝：${raw}`);
  }
  return parts.join('/');
}

export function zipFiles(files: Record<string, Uint8Array>): Uint8Array {
  const normalized: Record<string, Uint8Array> = {};
  for (const [name, data] of Object.entries(files)) {
    normalized[assertSafeZipPath(name)] = data;
  }
  return zipSync(normalized, { level: 6 });
}

export function unzipFiles(
  data: Uint8Array,
  options: { maxFiles?: number; maxTotalBytes?: number; maxZipBytes?: number } = {},
): Record<string, Uint8Array> {
  const maxFiles = options.maxFiles ?? BACKUP_MAX_FILES;
  const maxTotalBytes = options.maxTotalBytes ?? BACKUP_MAX_UNCOMPRESSED;
  const maxZipBytes = options.maxZipBytes ?? BACKUP_MAX_ZIP_BYTES;
  if (data.byteLength > maxZipBytes) {
    throw new Error(`压缩包过大（${data.byteLength} bytes）。`);
  }
  const extracted = unzipSync(data);
  const names = Object.keys(extracted);
  if (names.length > maxFiles) {
    throw new Error(`压缩包文件数量过多（${names.length}）。`);
  }
  const out: Record<string, Uint8Array> = {};
  let total = 0;
  for (const name of names) {
    const safe = assertSafeZipPath(name);
    const bytes = extracted[name];
    total += bytes.byteLength;
    if (total > maxTotalBytes) {
      throw new Error('解压后体积超过限制。');
    }
    out[safe] = bytes;
  }
  return out;
}

export function textToBytes(text: string): Uint8Array {
  return strToU8(text);
}

export function bytesToText(bytes: Uint8Array): string {
  return strFromU8(bytes);
}

export function basenameSafe(name: string): string {
  return name.split('/').pop() || name;
}
