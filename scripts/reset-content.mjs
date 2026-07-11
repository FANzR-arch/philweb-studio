/**
 * [INPUT]   : templates/starter-content 示例内容包与当前 content/ 目录
 * [OUTPUT]  : content/ 被替换为示例人设内容，原内容备份到 .studio-snapshots/
 * [POS]     : 内容工作流脚本层，供"把模板重置为干净示例"使用（分发前或复刻后）
 * [DECISION]: 重置前强制快照备份，且必须显式传 --yes，避免误触丢内容
 */

import fs from 'fs';
import path from 'path';
import process from 'process';

const ROOT = process.cwd();
const CONTENT_DIR = path.join(ROOT, 'content');
const STARTER_DIR = path.join(ROOT, 'templates', 'starter-content');
const SNAPSHOT_ROOT = path.join(ROOT, '.studio-snapshots');

if (!process.argv.includes('--yes')) {
  console.log('[reset] 这个命令会把 content/ 整体替换为示例人设内容（原内容会先备份到 .studio-snapshots/）。');
  console.log('[reset] 确认执行请运行：npm run content:reset -- --yes');
  process.exit(1);
}

if (!fs.existsSync(STARTER_DIR)) {
  console.error('[reset] 找不到 templates/starter-content，无法重置。');
  process.exit(1);
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = path.join(SNAPSHOT_ROOT, `pre-reset-${stamp}`);
fs.mkdirSync(SNAPSHOT_ROOT, { recursive: true });
fs.cpSync(CONTENT_DIR, backupDir, { recursive: true });
console.log(`[reset] 已备份当前内容到 ${path.relative(ROOT, backupDir)}`);

fs.rmSync(CONTENT_DIR, { recursive: true, force: true });
fs.cpSync(STARTER_DIR, CONTENT_DIR, { recursive: true });
console.log('[reset] content/ 已重置为示例人设内容。');
console.log('[reset] 运行 npm run studio 开始定制你自己的网站。');
