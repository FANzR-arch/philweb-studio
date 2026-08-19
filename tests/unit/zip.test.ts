import { describe, expect, it } from 'vitest';
import { assertSafeZipPath, textToBytes, unzipFiles, zipFiles } from '../../lib/studio/zip-safe';
import { importProjectBackup } from '../../lib/studio/backup';
import { STUDIO_SCHEMA_VERSION } from '../../lib/studio/types';

describe('zip safety', () => {
  it('rejects path traversal', () => {
    expect(() => assertSafeZipPath('../secret.json')).toThrow(/路径穿越/);
    expect(() => assertSafeZipPath('/etc/passwd')).toThrow();
    expect(() => assertSafeZipPath('C:/windows/system32')).toThrow();
  });

  it('roundtrips safe files', () => {
    const bytes = zipFiles({ 'hello.txt': textToBytes('ok') });
    const files = unzipFiles(bytes);
    expect(Object.keys(files)).toEqual(['hello.txt']);
  });
});

describe('backup import', () => {
  it('rejects zip without project.json', () => {
    const bytes = zipFiles({ 'manifest.json': textToBytes(JSON.stringify({ format: 'philweb-project-v1' })) });
    expect(() => importProjectBackup(bytes)).toThrow(/缺少/);
  });

  it('rejects unknown format', () => {
    const bytes = zipFiles({
      'manifest.json': textToBytes(JSON.stringify({ format: 'other' })),
      'project.json': textToBytes(JSON.stringify({ schemaVersion: STUDIO_SCHEMA_VERSION })),
    });
    expect(() => importProjectBackup(bytes)).toThrow(/不支持的备份格式/);
  });
});
