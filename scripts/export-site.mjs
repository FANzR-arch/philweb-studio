import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { deflateRawSync } from 'node:zlib';
import { fileURLToPath, pathToFileURL } from 'node:url';

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

function getSiteName(projectRoot) {
  const homePath = path.join(projectRoot, 'content', 'text', 'site', 'home.zh.md');
  const raw = fs.existsSync(homePath) ? fs.readFileSync(homePath, 'utf8') : '';
  const match = raw.match(/^\s{2}name:\s*["']([^"']*)["']/m);
  return String(match?.[1] || '').trim();
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

function collectContentIssues(projectRoot) {
  const issues = [];
  const scanRoots = [
    path.join(projectRoot, 'content'),
    path.join(projectRoot, 'index.html'),
    path.join(projectRoot, 'public'),
  ];
  const files = scanRoots.flatMap((entry) => fs.existsSync(entry) && fs.statSync(entry).isDirectory()
    ? walkFiles(entry)
    : fs.existsSync(entry) ? [entry] : []);

  const names = [
    path.join(projectRoot, 'content', 'text', 'site', 'home.zh.md'),
    path.join(projectRoot, 'content', 'text', 'site', 'home.en.md'),
  ];
  for (const filePath of names) {
    const raw = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
    const match = raw.match(/^\s{2}name:\s*["']([^"']*)["']/m);
    if (!match?.[1]?.trim()) {
      issues.push({ code: 'missing-name', file: path.relative(projectRoot, filePath), message: '首页侧边栏名字不能为空。' });
    }
  }

  for (const filePath of files) {
    const text = readTextIfSupported(filePath);
    if (text === null) continue;
    const lower = text.toLowerCase();
    for (const [marker, label] of BLOCKED_MARKERS) {
      if (lower.includes(marker.toLowerCase())) {
        issues.push({
          code: 'placeholder',
          file: path.relative(projectRoot, filePath),
          marker,
          message: `${label}仍存在：${marker}`,
        });
      }
    }
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

async function buildToDirectory(projectRoot, outputDirectory) {
  const runNodeScript = async (relativePath, args = []) => {
    await runCommand(process.execPath, [path.join(projectRoot, relativePath), ...args], projectRoot);
  };
  await runNodeScript('scripts/sync-content-registry.mjs');
  await runNodeScript('scripts/sync-image-manifest.mjs');
  await runNodeScript('scripts/check-content.mjs');
  const tscBin = path.join(projectRoot, 'node_modules', 'typescript', 'bin', 'tsc');
  if (!fs.existsSync(tscBin)) throw new Error('找不到 TypeScript，请先运行 npm install。');
  await runCommand(process.execPath, [tscBin, '--noEmit'], projectRoot);
  await runNodeScript('scripts/check-asset-budget.mjs');
  const viteBin = path.join(projectRoot, 'node_modules', 'vite', 'bin', 'vite.js');
  if (!fs.existsSync(viteBin)) throw new Error('找不到 Vite，请先运行 npm install。');
  await runCommand(process.execPath, [viteBin, 'build', '--outDir', outputDirectory, '--emptyOutDir'], projectRoot);
}

/** @param {{projectRoot?: string, archivePath?: string}} [options] */
export async function exportSite({ projectRoot = ROOT, archivePath: requestedArchivePath } = {}) {
  const absoluteRoot = path.resolve(projectRoot);
  const issues = collectContentIssues(absoluteRoot);
  if (issues.length > 0) throw new ExportValidationError(issues);

  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'philweb-export-'));
  const buildDirectory = path.join(temporaryRoot, 'site');
  const resolvedArchivePath = requestedArchivePath
    ? path.resolve(requestedArchivePath)
    : getDefaultArchivePath(absoluteRoot, getSiteName(absoluteRoot));

  try {
    fs.mkdirSync(buildDirectory, { recursive: true });
    await buildToDirectory(absoluteRoot, buildDirectory);

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
      siteName: getSiteName(absoluteRoot) || 'My Website',
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
