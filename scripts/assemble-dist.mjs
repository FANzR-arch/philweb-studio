import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function walkFiles(directory) {
  const files = [];
  if (!fs.existsSync(directory)) return files;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walkFiles(absolute));
    else files.push(absolute);
  }
  return files;
}

function posix(from, file) {
  return path.relative(from, file).split(path.sep).join('/');
}

const shellSrc = path.join(ROOT, 'dist-site-shell');
const shellDest = path.join(ROOT, 'dist', 'site-shell');
if (!fs.existsSync(shellSrc)) {
  throw new Error('找不到 dist-site-shell，请先构建 SiteApp。');
}

fs.rmSync(shellDest, { recursive: true, force: true });
fs.mkdirSync(path.dirname(shellDest), { recursive: true });
fs.cpSync(shellSrc, shellDest, { recursive: true });

const siteHtml = path.join(shellDest, 'site.html');
const indexHtml = path.join(shellDest, 'index.html');
if (fs.existsSync(siteHtml)) {
  fs.renameSync(siteHtml, indexHtml);
}

const files = walkFiles(shellDest)
  .map((file) => posix(shellDest, file))
  .filter((name) => {
    if (name === 'manifest.json') return false;
    const parts = name.split('/');
    if (parts.some((part) => part.startsWith('.'))) return false;
    return true;
  });
const manifest = {
  schemaVersion: 1,
  files: files.map((entry) => ({
    path: entry,
    bytes: fs.statSync(path.join(shellDest, entry)).size,
  })),
};
fs.writeFileSync(path.join(shellDest, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

const starterSrc = path.join(ROOT, 'generated', 'starter');
const starterDest = path.join(ROOT, 'dist', 'starter');
if (fs.existsSync(starterSrc)) {
  fs.cpSync(starterSrc, starterDest, { recursive: true });
}

console.log(`[assemble] site-shell ${files.length} files, starter copied: ${fs.existsSync(starterDest)}`);
