type StorageKind = 'local' | 'session';

const getStorage = (kind: StorageKind): Storage | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return kind === 'local' ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
};

const readStorage = (kind: StorageKind, key: string): string | null => {
  const storage = getStorage(kind);
  if (!storage) {
    return null;
  }

  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
};

const writeStorage = (kind: StorageKind, key: string, value: string): boolean => {
  const storage = getStorage(kind);
  if (!storage) {
    return false;
  }

  try {
    storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
};

const removeStorage = (kind: StorageKind, key: string): boolean => {
  const storage = getStorage(kind);
  if (!storage) {
    return false;
  }

  try {
    storage.removeItem(key);
    return true;
  } catch {
    return false;
  }
};

export const readLocalStorage = (key: string): string | null => readStorage('local', key);
export const writeLocalStorage = (key: string, value: string): boolean =>
  writeStorage('local', key, value);
export const removeLocalStorage = (key: string): boolean => removeStorage('local', key);

export const readSessionStorage = (key: string): string | null => readStorage('session', key);
export const writeSessionStorage = (key: string, value: string): boolean =>
  writeStorage('session', key, value);
export const removeSessionStorage = (key: string): boolean => removeStorage('session', key);
