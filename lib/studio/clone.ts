export function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function createId(prefix = 'p'): string {
  const random = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}_${random}`;
}

export function isPlainObject(value: unknown): value is Record<string, any> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
