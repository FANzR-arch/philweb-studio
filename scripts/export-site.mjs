import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { deflateRawSync } from 'node:zlib';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { generateStarterProject } from './generate-starter-project.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const BLOCKED_MARKERS = [
  ['yourname', '社交账号占位符'],
  ['your-wechat-id', '微信号占位符'],
  ['hello@example.com', '邮箱占位符'],
  ['你的名字', '姓名占位符'],
  ['your name', '姓名占位符'],
  ['你的职业', '职业占位符'],
  ['your role', '职业占位符'],
  ['你的城市', '城市占位符'],
  ['your city', '城市占位符'],
  ['林小满', '模板示例姓名'],
  ['momo lin', '模板示例姓名'],
  ['阿哲phil', '个人示例姓名'],
  ['formulasearch', '模板作者品牌'],
  ['folio-studio', '旧模板品牌'],
  ['alex morgan', '模板示例姓名'],
];

const TEXT_EXTENSIONS = new Set([
  '.css', '.html', '.js', '.json', '.map', '.md', '.svg', '.txt', '.xml', '.yml', '.yaml',
]);

export class ExportValidationError extends Error {
  constructor(issues) {
    super('导出前检查未通过。');
    this.name = 'ExportValidationError';
    this.issues = issues;
  }
}

function walkFiles(directory) {
  const files = [];
  if (!fs.existsSync(directory)) return files;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walkFiles(absolute));
    else if (entry.isFile()) files.push(absolute);
  }
  return files;
}

function readTextIfSupported(filePath) {
  if (!TEXT_EXTENSIONS.has(path.extname(filePath).toLowerCase())) return null;
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }
}

function slugify(value) {
  const slug = String(value || '')
    .normalize('NFKD')
    .replace(/[^\w\u4e00-\u9fff-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
  return slug || 'my-website';
}

function getDefaultArchivePath(projectRoot, siteName) {
  const exportDirectory = path.join(projectRoot, 'exports');
  const baseName = slugify(siteName);
  let attempt = 1;
  let archivePath = path.join(exportDirectory, `${baseName}.zip`);
  while (fs.existsSync(archivePath)) {
    attempt += 1;
    archivePath = path.join(exportDirectory, `${baseName}-${attempt}.zip`);
  }
  return archivePath;
}

function collectContentIssues(projectRoot, project) {
  const issues = [];
  const zhName = project?.home?.zh?.sidebar?.name?.trim();
  const enName = project?.home?.en?.sidebar?.name?.trim();
  if (!zhName) issues.push({ code: 'missing-name', file: 'home.zh', message: '首页侧边栏名字不能为空。' });
  if (!enName) issues.push({ code: 'missing-name', file: 'home.en', message: '首页侧边栏名字不能为空。' });

  const texts = JSON.stringify(project || {});
  const lower = texts.toLowerCase();
  for (const [marker, label] of BLOCKED_MARKERS) {
    if (lower.includes(marker.toLowerCase())) {
      issues.push({ code: 'placeholder', file: 'project.json', marker, message: `${label}仍存在：${marker}` });
    }
  }

  const ids = new Set();
  for (const item of project?.projects || []) {
    if (ids.has(item.id)) issues.push({ code: 'duplicate-project', file: item.id, message: `项目 ID 重复：${item.id}` });
    ids.add(item.id);
  }
  const postIds = new Set();
  for (const post of project?.blog?.posts || []) {
    if (postIds.has(post.id)) issues.push({ code: 'duplicate-blog', file: post.id, message: `文章 ID 重复：${post.id}` });
    postIds.add(post.id);
  }
  return issues;
}

function runCommand(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const isWindowsBatch = process.platform === 'win32' && command.toLowerCase().endsWith('.cmd');
    const spawnCommand = isWindowsBatch ? (process.env.ComSpec || 'cmd.exe') : command;
    const spawnArgs = isWindowsBatch
      ? ['/d', '/s', '/c', [command, ...args].map((value) => `"${String(value).replaceAll('"', '\\"')}"`).join(' ')]
      : args;
    const child = spawn(spawnCommand, spawnArgs, {
      cwd,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '';
    child.stdout.on('data', (chunk) => { output += chunk.toString(); });
    child.stderr.on('data', (chunk) => { output += chunk.toString(); });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve(output);
      else reject(new Error(output.trim() || `${command} 退出码为 ${code}`));
    });
  });
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function u16(value) {
  const buffer = Buffer.allocUnsafe(2);
  buffer.writeUInt16LE(value, 0);
  return buffer;
}

function u32(value) {
  const buffer = Buffer.allocUnsafe(4);
  buffer.writeUInt32LE(value >>> 0, 0);
  return buffer;
}

function createZipFromDirectory(directory) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  const files = walkFiles(directory).filter((filePath) => path.basename(filePath) !== '.gitkeep').sort();

  for (const filePath of files) {
    const relative = path.relative(directory, filePath).split(path.sep).join('/');
    const name = Buffer.from(relative, 'utf8');
    const source = fs.readFileSync(filePath);
    const checksum = crc32(source);
    const compressed = deflateRawSync(source, { level: 9 });
    const method = compressed.length < source.length ? 8 : 0;
    const payload = method === 8 ? compressed : source;
    const local = Buffer.concat([
      u32(0x04034b50), u16(20), u16(0x0800), u16(method), u16(0), u16(0),
      u32(checksum), u32(payload.length), u32(source.length), u16(name.length), u16(0), name, payload,
    ]);
    localParts.push(local);
    const central = Buffer.concat([
      u32(0x02014b50), u16(20), u16(20), u16(0x0800), u16(method), u16(0), u16(0),
      u32(checksum), u32(payload.length), u32(source.length), u16(name.length), u16(0), u16(0),
      u16(0), u16(0), u32(0), u32(offset), name,
    ]);
    centralParts.push(central);
    offset += local.length;
  }

  const central = Buffer.concat(centralParts);
  const local = Buffer.concat(localParts);
  const end = Buffer.concat([
    u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length),
    u32(central.length), u32(local.length), u16(0),
  ]);
  return Buffer.concat([local, central, end]);
}

async function ensureSiteShell(projectRoot) {
  const viteBin = path.join(projectRoot, 'node_modules', 'vite', 'bin', 'vite.js');
  if (!fs.existsSync(viteBin)) throw new Error('找不到 Vite，请先运行 npm install。');
  await runCommand(process.execPath, [viteBin, 'build', '--config', 'vite.site.config.ts'], projectRoot);
}

function writeExportTree(projectRoot, outputDirectory, project) {
  const shellSrc = path.join(projectRoot, 'dist-site-shell');
  fs.cpSync(shellSrc, outputDirectory, { recursive: true });
  const siteHtml = path.join(outputDirectory, 'site.html');
  if (fs.existsSync(siteHtml)) fs.renameSync(siteHtml, path.join(outputDirectory, 'index.html'));
  const exported = structuredClone(project);
  exported.mediaManifest = Object.fromEntries(Object.entries(project.mediaManifest || {}).map(([id, record]) => [
    id,
    { ...record, filename: `media/${record.filename.replace(/^media\//, '')}`, source: 'export' },
  ]));
  fs.writeFileSync(path.join(outputDirectory, 'project.json'), `${JSON.stringify(exported, null, 2)}\n`);
  const mediaSrc = path.join(projectRoot, 'generated', 'starter', 'media');
  const mediaDest = path.join(outputDirectory, 'media');
  if (fs.existsSync(mediaSrc)) fs.cpSync(mediaSrc, mediaDest, { recursive: true });
}

/** @param {{projectRoot?: string, archivePath?: string}} [options] */
export async function exportSite({ projectRoot = ROOT, archivePath: requestedArchivePath } = {}) {
  const absoluteRoot = path.resolve(projectRoot);
  const { outputDir } = generateStarterProject(absoluteRoot);
  const project = JSON.parse(fs.readFileSync(path.join(outputDir, 'project.json'), 'utf8'));
  const issues = collectContentIssues(absoluteRoot, project);
  if (issues.length > 0) throw new ExportValidationError(issues);

  await ensureSiteShell(absoluteRoot);
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'philweb-export-'));
  const buildDirectory = path.join(temporaryRoot, 'site');
  const resolvedArchivePath = requestedArchivePath
    ? path.resolve(requestedArchivePath)
    : getDefaultArchivePath(absoluteRoot, project.home?.zh?.sidebar?.name || 'My Website');

  try {
    fs.mkdirSync(buildDirectory, { recursive: true });
    writeExportTree(absoluteRoot, buildDirectory, project);

    const buildIssues = [];
    for (const filePath of walkFiles(buildDirectory)) {
      const text = readTextIfSupported(filePath);
      if (text === null) continue;
      const lower = text.toLowerCase();
      for (const [marker, label] of BLOCKED_MARKERS) {
        if (lower.includes(marker.toLowerCase())) {
          buildIssues.push({ code: 'built-placeholder', file: path.relative(buildDirectory, filePath), marker, message: `${label}进入了导出产物：${marker}` });
        }
      }
    }
    if (buildIssues.length > 0) throw new ExportValidationError(buildIssues);

    fs.mkdirSync(path.dirname(resolvedArchivePath), { recursive: true });
    const zip = createZipFromDirectory(buildDirectory);
    fs.writeFileSync(resolvedArchivePath, zip);
    return {
      archivePath: resolvedArchivePath,
      filename: path.basename(resolvedArchivePath),
      siteName: project.home?.zh?.sidebar?.name || 'My Website',
      fileCount: walkFiles(buildDirectory).filter((filePath) => path.basename(filePath) !== '.gitkeep').length,
      bytes: zip.length,
      warnings: [],
    };
  } finally {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
}

async function main() {
  try {
    const outputIndex = process.argv.indexOf('--output');
    const output = outputIndex >= 0 ? process.argv[outputIndex + 1] : null;
    const result = await exportSite({ archivePath: output || undefined });
    console.log(`[export] ${result.filename} 已生成：${result.fileCount} 个文件，${result.bytes} bytes`);
    console.log(result.archivePath);
  } catch (error) {
    if (error instanceof ExportValidationError) {
      console.error('[export] 导出前检查未通过：');
      for (const issue of error.issues) console.error(`- ${issue.file}: ${issue.message}`);
    } else {
      console.error(`[export] ${error instanceof Error ? error.message : String(error)}`);
    }
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
