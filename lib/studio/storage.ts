import { CURRENT_PROJECT_KEY, DB_NAME, DB_VERSION, PREFS_STORAGE_KEY, STORAGE_WARN_RATIO } from './constants';
import { cloneJson } from './clone';
import { migrateProject } from './migrate';
import type { MediaRecord, StudioProjectV1 } from './types';

const PROJECT_STORE = 'projects';
const MEDIA_STORE = 'media';
const META_STORE = 'meta';

export interface StoredMedia {
  id: string;
  blob: Blob;
  mime: string;
  filename: string;
  kind: 'image' | 'video';
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('当前浏览器不支持 IndexedDB。'));
  }
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(PROJECT_STORE)) {
        db.createObjectStore(PROJECT_STORE, { keyPath: 'projectId' });
      }
      if (!db.objectStoreNames.contains(MEDIA_STORE)) {
        db.createObjectStore(MEDIA_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, { keyPath: 'key' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      dbPromise = null;
      reject(request.error || new Error('无法打开本地数据库。'));
    };
  });
  return dbPromise;
}

function tx<T>(store: string, mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then((db) => new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(store, mode);
    const request = run(transaction.objectStore(store));
    request.onsuccess = () => resolve(request.result as T);
    request.onerror = () => reject(request.error);
  }));
}

export async function loadProject(projectId?: string): Promise<StudioProjectV1 | null> {
  const id = projectId || (await getCurrentProjectId());
  if (!id) return null;
  const record = await tx<StudioProjectV1 | undefined>(PROJECT_STORE, 'readonly', (store) => store.get(id));
  if (!record) return null;
  const migrated = migrateProject(record);
  if (!migrated.ok || !migrated.project) {
    throw new Error(migrated.reason || '已保存的项目无法迁移，未覆盖原数据。');
  }
  return migrated.project;
}

export async function saveProject(project: StudioProjectV1): Promise<void> {
  const payload = cloneJson(project);
  payload.updatedAt = new Date().toISOString();
  await tx(PROJECT_STORE, 'readwrite', (store) => store.put(payload));
  await setCurrentProjectId(payload.projectId);
}

export async function deleteProjectRecord(projectId: string): Promise<void> {
  await tx(PROJECT_STORE, 'readwrite', (store) => store.delete(projectId));
}

export async function listProjectIds(): Promise<string[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction(PROJECT_STORE, 'readonly').objectStore(PROJECT_STORE).getAllKeys();
    request.onsuccess = () => resolve((request.result as IDBValidKey[]).map(String));
    request.onerror = () => reject(request.error);
  });
}

export async function putMedia(record: MediaRecord, blob: Blob): Promise<void> {
  const stored: StoredMedia = {
    id: record.id,
    blob,
    mime: record.mime,
    filename: record.filename,
    kind: record.kind,
  };
  await tx(MEDIA_STORE, 'readwrite', (store) => store.put(stored));
}

export async function getMedia(id: string): Promise<StoredMedia | undefined> {
  return tx<StoredMedia | undefined>(MEDIA_STORE, 'readonly', (store) => store.get(id));
}

export async function removeMedia(id: string): Promise<void> {
  await tx(MEDIA_STORE, 'readwrite', (store) => store.delete(id));
}

export async function getCurrentProjectId(): Promise<string | null> {
  try {
    const row = await tx<{ key: string; value: string } | undefined>(META_STORE, 'readonly', (store) => store.get('currentProjectId'));
    if (row?.value) return row.value;
  } catch {
    /* ignore */
  }
  try {
    return localStorage.getItem(CURRENT_PROJECT_KEY);
  } catch {
    return null;
  }
}

export async function setCurrentProjectId(projectId: string): Promise<void> {
  await tx(META_STORE, 'readwrite', (store) => store.put({ key: 'currentProjectId', value: projectId }));
  try {
    localStorage.setItem(CURRENT_PROJECT_KEY, projectId);
  } catch {
    /* ignore */
  }
}

export function readPrefs(): Record<string, unknown> {
  try {
    const raw = localStorage.getItem(PREFS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function writePrefs(patch: Record<string, unknown>): void {
  try {
    localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify({ ...readPrefs(), ...patch }));
  } catch {
    /* ignore */
  }
}

export async function estimateStorage(): Promise<{ usage: number; quota: number; ratio: number; warn: boolean }> {
  if (!navigator.storage?.estimate) {
    return { usage: 0, quota: 0, ratio: 0, warn: false };
  }
  const { usage = 0, quota = 0 } = await navigator.storage.estimate();
  const ratio = quota > 0 ? usage / quota : 0;
  return { usage, quota, ratio, warn: ratio >= STORAGE_WARN_RATIO };
}

export { CURRENT_PROJECT_KEY };
