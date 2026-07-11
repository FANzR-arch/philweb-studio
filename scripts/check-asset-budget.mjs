/**
 * [INPUT]   : public/Pictures, public/og and static references inside share pages
 * [OUTPUT]  : asset budget validation results and missing reference checks
 * [POS]     : pre-build asset audit script
 * [DECISION]: fail fast on oversized assets and broken OG references before shipping
 */

import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const PUBLIC_DIR = path.join(ROOT, 'public');
const PICTURES_DIR = path.join(PUBLIC_DIR, 'Pictures');
const OPTIMIZED_DIR = path.join(PICTURES_DIR, 'optimized');
const OG_DIR = path.join(PUBLIC_DIR, 'og');

const MAX_OPTIMIZED_SINGLE = 900 * 1024;
const MAX_OG_SINGLE = 350 * 1024;
const MAX_PICTURES_TOTAL = 14 * 1024 * 1024;

const IGNORED_FILES = new Set(['.folder.md']);

const toKB = (bytes) => `${Math.round(bytes / 1024)}KB`;
const toMB = (bytes) => `${(bytes / (1024 * 1024)).toFixed(2)}MB`;

const walkFiles = async (dir) => {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkFiles(abs)));
      continue;
    }

    files.push(abs);
  }

  return files;
};

const checkExists = async (filePath) => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

const main = async () => {
  const violations = [];
  let shareFilesChecked = 0;

  if (!(await checkExists(PICTURES_DIR))) {
    throw new Error('Missing public/Pictures directory.');
  }
  if (!(await checkExists(OPTIMIZED_DIR))) {
    throw new Error('Missing public/Pictures/optimized directory. Run `npm run assets:optimize` first.');
  }
  if (!(await checkExists(OG_DIR))) {
    throw new Error('Missing public/og directory. Run `npm run assets:share-covers` first.');
  }

  const pictureFiles = (await walkFiles(PICTURES_DIR)).filter(
    (file) => !IGNORED_FILES.has(path.basename(file))
  );
  const optimizedFiles = (await walkFiles(OPTIMIZED_DIR)).filter(
    (file) => !IGNORED_FILES.has(path.basename(file))
  );
  const ogFiles = (await walkFiles(OG_DIR)).filter((file) => !IGNORED_FILES.has(path.basename(file)));

  let totalPictures = 0;

  for (const file of pictureFiles) {
    const stat = await fs.stat(file);
    totalPictures += stat.size;

    if (file.toLowerCase().endsWith('.mp4')) {
      violations.push(`MP4 is not allowed in public/Pictures: ${path.relative(ROOT, file)}`);
    }
  }

  for (const file of optimizedFiles) {
    const stat = await fs.stat(file);
    if (stat.size > MAX_OPTIMIZED_SINGLE) {
      violations.push(
        `Optimized image exceeds ${toKB(MAX_OPTIMIZED_SINGLE)}: ${path.relative(ROOT, file)} (${toKB(
          stat.size
        )})`
      );
    }
  }

  for (const file of ogFiles) {
    const stat = await fs.stat(file);
    if (stat.size > MAX_OG_SINGLE) {
      violations.push(
        `OG image exceeds ${toKB(MAX_OG_SINGLE)}: ${path.relative(ROOT, file)} (${toKB(stat.size)})`
      );
    }
  }

  if (totalPictures > MAX_PICTURES_TOTAL) {
    violations.push(
      `public/Pictures total exceeds ${toMB(MAX_PICTURES_TOTAL)}: ${toMB(totalPictures)}`
    );
  }

  const shareDir = path.join(PUBLIC_DIR, 'share');
  if (await checkExists(shareDir)) {
    const shareFiles = (await walkFiles(shareDir)).filter((file) => file.endsWith('.html'));
    shareFilesChecked = shareFiles.length;

    for (const file of shareFiles) {
      const html = await fs.readFile(file, 'utf8');
      const ogRefs = [...html.matchAll(/\/og\/[A-Za-z0-9._-]+\.jpg/g)].map((match) => match[0]);

      for (const ref of ogRefs) {
        const filePath = path.join(PUBLIC_DIR, ref.replace(/^\//, ''));
        if (!(await checkExists(filePath))) {
          violations.push(`Missing OG image referenced by ${path.relative(ROOT, file)}: ${ref}`);
        }
      }
    }
  }

  console.log(`Pictures total: ${toMB(totalPictures)} / limit ${toMB(MAX_PICTURES_TOTAL)}`);
  console.log(`Optimized files: ${optimizedFiles.length}, OG files: ${ogFiles.length}`);
  console.log(`Share pages checked: ${shareFilesChecked}`);

  if (violations.length > 0) {
    console.error('\nAsset budget check failed:\n');
    for (const issue of violations) {
      console.error(`- ${issue}`);
    }
    process.exit(1);
  }

  console.log('Asset budget check passed.');
};

main().catch((error) => {
  console.error('check-asset-budget failed:', error);
  process.exit(1);
});
