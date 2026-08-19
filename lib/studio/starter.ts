import { migrateProject } from './migrate';
import type { StudioProjectV1 } from './types';

export async function loadStarterProject(url = './starter/project.json'): Promise<StudioProjectV1> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('无法加载默认示例项目。');
  }
  const json = await response.json();
  const migrated = migrateProject(json);
  if (!migrated.ok || !migrated.project) {
    throw new Error(migrated.reason || '默认示例项目无法使用。');
  }
  return migrated.project;
}

export async function loadBuiltinMedia(filename: string, base = './starter/media/'): Promise<Blob | undefined> {
  const prefix = base.endsWith('/') ? base : `${base}/`;
  const response = await fetch(`${prefix}${filename}`);
  if (!response.ok) return undefined;
  return response.blob();
}
