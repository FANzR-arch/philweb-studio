import { nowIso } from './clone';
import { migrateProject } from './migrate';
import { bytesToText, textToBytes, unzipFiles, zipFiles } from './zip-safe';
import type { StudioProjectV1, ValidationIssue } from './types';
import type { StoredMedia } from './storage';

export const BACKUP_FORMAT = 'philweb-project-v1';

export interface BackupManifest {
  format: typeof BACKUP_FORMAT;
  schemaVersion: 1;
  projectId: string;
  exportedAt: string;
  files: string[];
}

export async function exportProjectBackup(
  project: StudioProjectV1,
  getBlob: (id: string) => Promise<Blob | undefined>,
  builtinLoader?: (filename: string) => Promise<Blob | undefined>,
): Promise<{ filename: string; bytes: Uint8Array }> {
  const files: Record<string, Uint8Array> = {};
  const fileList = ['manifest.json', 'project.json'];
  files['project.json'] = textToBytes(`${JSON.stringify(project, null, 2)}\n`);

  for (const record of Object.values(project.mediaManifest || {})) {
    let blob = await getBlob(record.id);
    if (!blob && record.source === 'builtin' && builtinLoader) {
      blob = await builtinLoader(record.filename);
    }
    if (!blob) continue;
    const path = `media/${record.filename.replace(/^media\//, '')}`;
    files[path] = new Uint8Array(await blob.arrayBuffer());
    fileList.push(path);
  }

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
  for (const [path, data] of Object.entries(files)) {
    if (path === 'manifest.json' || path === 'project.json') continue;
    if (!path.startsWith('media/')) {
      throw new Error(`备份包含未知文件：${path}`);
    }
    const filename = path.slice('media/'.length);
    const record = Object.values(migrated.project.mediaManifest).find((item) => item.filename === filename || item.filename === path || item.id === filename);
    if (!record) {
      const inferred = {
        id: filename,
        kind: (/\.(mp4|webm)$/i.test(filename) ? 'video' : 'image') as 'image' | 'video',
        mime: 'application/octet-stream',
        filename,
        source: 'user' as const,
        bytes: data.byteLength,
      };
      migrated.project.mediaManifest[inferred.id] = inferred;
      media.push({ record: inferred, bytes: data });
      continue;
    }
    media.push({ record, bytes: data });
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
