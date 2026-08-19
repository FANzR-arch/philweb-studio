import { cloneJson } from './clone';
import { slugifySiteName, validateForExport } from './validate-export';
import { bytesToText, textToBytes, zipFiles } from './zip-safe';
import type { StudioProjectV1, ValidationIssue } from './types';

export interface SiteShellManifest {
  schemaVersion: 1;
  files: Array<{ path: string; bytes?: number }>;
}

export interface WebsiteExportResult {
  filename: string;
  bytes: Uint8Array;
  fileList: string[];
}

function rewriteForExport(project: StudioProjectV1): StudioProjectV1 {
  const next = cloneJson(project);
  const manifest: StudioProjectV1['mediaManifest'] = {};
  for (const [id, record] of Object.entries(next.mediaManifest || {})) {
    const filename = `media/${record.filename.replace(/^media\//, '')}`;
    manifest[id] = {
      ...record,
      filename,
      source: 'export',
    };
  }
  next.mediaManifest = manifest;
  return next;
}

export async function exportWebsiteZip(options: {
  project: StudioProjectV1;
  shellFiles: Record<string, Uint8Array>;
  getBlob: (id: string) => Promise<Blob | undefined>;
  builtinLoader?: (filename: string) => Promise<Blob | undefined>;
}): Promise<WebsiteExportResult> {
  const issues = validateForExport(options.project);
  if (issues.length > 0) {
    const error = new Error('导出前检查未通过。') as Error & { issues: ValidationIssue[] };
    error.issues = issues;
    throw error;
  }

  const exportedProject = rewriteForExport(options.project);
  const files: Record<string, Uint8Array> = {};

  for (const [path, data] of Object.entries(options.shellFiles)) {
    if (path === 'project.json' || path === 'manifest.json') continue;
    if (path.startsWith('starter/')) continue;
    files[path] = data;
  }
  files['project.json'] = textToBytes(`${JSON.stringify(exportedProject, null, 2)}\n`);

  for (const record of Object.values(exportedProject.mediaManifest)) {
    const original = options.project.mediaManifest[record.id];
    let blob = await options.getBlob(record.id);
    if (!blob && original?.source === 'builtin' && options.builtinLoader) {
      blob = await options.builtinLoader(original.filename);
    }
    if (!blob) {
      const error = new Error('导出前检查未通过。') as Error & { issues: ValidationIssue[] };
      error.issues = [{ code: 'missing-media', message: `缺少媒体文件：${record.id}`, field: record.id }];
      throw error;
    }
    files[record.filename] = new Uint8Array(await blob.arrayBuffer());
  }

  const name = slugifySiteName(options.project.home.zh.sidebar.name || options.project.home.en.sidebar.name);
  return {
    filename: `${name}.zip`,
    bytes: zipFiles(files),
    fileList: Object.keys(files).sort(),
  };
}

export async function fetchSiteShell(base = './site-shell/'): Promise<{ manifest: SiteShellManifest; files: Record<string, Uint8Array> }> {
  const prefix = base.endsWith('/') ? base : `${base}/`;
  const manifestRes = await fetch(`${prefix}manifest.json`);
  if (!manifestRes.ok) {
    throw new Error('找不到网站外壳 manifest.json，无法导出。');
  }
  const manifest = await manifestRes.json() as SiteShellManifest;
  const files: Record<string, Uint8Array> = {};
  for (const entry of manifest.files || []) {
    if (entry.path === 'manifest.json') continue;
    const parts = String(entry.path || '').split('/');
    if (parts.some((part) => part.startsWith('.'))) continue;
    const response = await fetch(`${prefix}${entry.path}`);
    if (!response.ok) {
      throw new Error(`无法读取外壳文件：${entry.path}`);
    }
    files[entry.path] = new Uint8Array(await response.arrayBuffer());
  }
  return { manifest, files };
}

export function htmlHasPlaceholder(files: Record<string, Uint8Array>, marker: string): boolean {
  const lower = marker.toLowerCase();
  return Object.values(files).some((bytes) => {
    try {
      return bytesToText(bytes).toLowerCase().includes(lower);
    } catch {
      return false;
    }
  });
}
