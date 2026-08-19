import { describe, expect, it } from 'vitest';
import { zipFiles, unzipFiles, textToBytes } from '../../lib/studio/zip-safe';

describe('export file list', () => {
  it('website zip only contains deploy files', () => {
    const bytes = zipFiles({
      'index.html': textToBytes('<html></html>'),
      'project.json': textToBytes('{"schemaVersion":1}'),
      'assets/site.js': textToBytes('console.log(1)'),
      'media/profile/avatar.svg': textToBytes('<svg></svg>'),
    });
    const files = Object.keys(unzipFiles(bytes)).sort();
    expect(files).toEqual(['assets/site.js', 'index.html', 'media/profile/avatar.svg', 'project.json']);
    expect(files.some((name) => name.includes('studio'))).toBe(false);
    expect(files.some((name) => name.includes('node_modules'))).toBe(false);
  });
});
