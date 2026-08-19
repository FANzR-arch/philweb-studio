import { nowIso } from './clone';
import { migrateProject } from './migrate';
import { bytesToText, textToBytes, unzipFiles, zipFiles } from './zip-safe';
import type { MediaRecord, StudioProjectV1, ValidationIssue } from './types';
import type { StoredMedia } from './storage';

export const BACKUP_FORMAT = 'philweb-project-v1';

export interface BackupManifest {
  format: typeof BACKUP_FORMAT;
  schemaVersion: 1;
  projectId: string;
  exportedAt: string;
  files: string[];
}

export function backupMediaPath(record: MediaRecord): string {
  return `media/${String(record.filename || record.id).replace(/^media\//, '')}`;
}

async function blobToUint8(blob: Blob): Promise<Uint8Array> {
  if (typeof blob.arrayBuffer === 'function') {
    return new Uint8Array(await blob.arrayBuffer());
  }
  if (typeof Response !== 'undefined') {
    return new Uint8Array(await new Response(blob).arrayBuffer());
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
    reader.onerror = () => reject(reader.error || new Error('无法读取媒体文件。'));
    reader.readAsArrayBuffer(blob);
  });
}

async function resolveBackupBlob(
  record: MediaRecord,
  getBlob: (id: string) => Promise<Blob | undefined>,
  builtinLoader?: (filename: string) => Promise<Blob | undefined>,
): Promise<Blob | undefined> {
  const fromStore = await getBlob(record.id);
  if (fromStore) return fromStore;
  if (!builtinLoader) return undefined;
  return (await builtinLoader(record.filename)) || (await builtinLoader(record.id));
}

export async function exportProjectBackup(
  project: StudioProjectV1,
  getBlob: (id: string) => Promise<Blob | undefined>,
  builtinLoader?: (filename: string) => Promise<Blob | undefined>,
): Promise<{ filename: string; bytes: Uint8Array }> {
  const files: Record<string, Uint8Array> = {};
  const fileList = ['manifest.json', 'project.json'];
  const missing: string[] = [];

  for (const record of Object.values(project.mediaManifest || {})) {
    const blob = await resolveBackupBlob(record, getBlob, builtinLoader);
    if (!blob) {
      missing.push(record.id);
      continue;
    }
    const path = backupMediaPath(record);
    files[path] = await blobToUint8(blob);
    fileList.push(path);
  }

  if (missing.length > 0) {
    throw new Error(`无法写入完整工程备份，缺少媒体：${missing.join('、')}。`);
  }

  files['project.json'] = textToBytes(`${JSON.stringify(project, null, 2)}\n`);
  const manifest: BackupManifest = {
    format: BACKUP_FORMAT,
    schemaVersion: 1,
    projectId: project.projectId,
    exportedAt: nowIso(),
    files: fileList,
  };
  files['manifest.json'] = textToBytes(`${JSON.stringify(manifest, null, 2)}\n`);
  return {
    filename: 'philweb-project-v1.zip',
    bytes: zipFiles(files),
  };
}

export interface ImportedBackup {
  project: StudioProjectV1;
  media: Array<{ record: StudioProjectV1['mediaManifest'][string]; bytes: Uint8Array }>;
}

function matchManifestRecord(project: StudioProjectV1, filename: string, zipPath: string): MediaRecord | undefined {
  return Object.values(project.mediaManifest).find((item) => (
    item.filename === filename
    || item.filename === zipPath
    || item.id === filename
    || backupMediaPath(item) === zipPath
  ));
}

export function importProjectBackup(bytes: Uint8Array): ImportedBackup {
  const files = unzipFiles(bytes);
  const manifestRaw = files['manifest.json'];
  const projectRaw = files['project.json'];
  if (!manifestRaw || !projectRaw) {
    throw new Error('备份缺少 manifest.json 或 project.json。');
  }
  let manifest: BackupManifest;
  try {
    manifest = JSON.parse(bytesToText(manifestRaw));
  } catch {
    throw new Error('manifest.json 不是合法 JSON。');
  }
  if (manifest.format !== BACKUP_FORMAT) {
    throw new Error(`不支持的备份格式：${String(manifest.format)}`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(bytesToText(projectRaw));
  } catch {
    throw new Error('project.json 不是合法 JSON。');
  }
  const migrated = migrateProject(parsed);
  if (!migrated.ok || !migrated.project) {
    throw new Error(migrated.reason || '无法迁移备份中的项目。');
  }

  const media: ImportedBackup['media'] = [];
  const restoredIds = new Set<string>();
  for (const [path, data] of Object.entries(files)) {
    if (path === 'manifest.json' || path === 'project.json') continue;
    if (!path.startsWith('media/')) {
      throw new Error(`备份包含未知文件：${path}`);
    }
    const filename = path.slice('media/'.length);
    let record = matchManifestRecord(migrated.project, filename, path);
    if (!record) {
      record = {
        id: filename,
        kind: (/\.(mp4|webm)$/i.test(filename) ? 'video' : 'image'),
        mime: 'application/octet-stream',
        filename,
        source: 'user',
        bytes: data.byteLength,
      };
      migrated.project.mediaManifest[record.id] = record;
    }
    const localRecord: MediaRecord = {
      ...record,
      source: 'user',
      bytes: data.byteLength,
    };
    migrated.project.mediaManifest[localRecord.id] = localRecord;
    media.push({ record: localRecord, bytes: data });
    restoredIds.add(localRecord.id);
  }

  const missing = Object.keys(migrated.project.mediaManifest).filter((id) => !restoredIds.has(id));
  if (missing.length > 0) {
    throw new Error(`备份缺少媒体文件：${missing.join('、')}。无法完整恢复，请重新导出工程备份。`);
  }

  for (const id of Object.keys(migrated.project.mediaManifest)) {
    migrated.project.mediaManifest[id] = {
      ...migrated.project.mediaManifest[id],
      source: 'user',
    };
  }

  return { project: migrated.project, media };
}

export function backupIssuesFromError(error: unknown): ValidationIssue[] {
  return [{ code: 'backup', message: error instanceof Error ? error.message : String(error) }];
}

export function storedMediaFromBytes(id: string, bytes: Uint8Array, mime: string, filename: string, kind: 'image' | 'video'): StoredMedia {
  return {
    id,
    blob: new Blob([bytes], { type: mime }),
    mime,
    filename,
    kind,
  };
}
