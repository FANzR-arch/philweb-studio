/**
 * [INPUT]   : templates/starter-content 示例内容包、templates/personas/<id> 职业人设覆盖包与当前 content/ 目录
 * [OUTPUT]  : content/ 被替换为（示例底稿 + 可选职业人设覆盖），原内容备份到 .studio-snapshots/
 * [POS]     : 内容工作流脚本层，供"把模板重置为干净示例 / 某个职业起始人设"使用（分发前或复刻后）
 * [DECISION]: 覆盖式设计——职业人设只存差异文本，先铺示例底稿再叠人设，复用同一套头像/logo，作者与用户成本都最低；重置前强制快照备份且必须显式 --yes
 */

import fs from 'fs';
import path from 'path';
import process from 'process';

const ROOT = process.cwd();
const CONTENT_DIR = path.join(ROOT, 'content');
const STARTER_DIR = path.join(ROOT, 'templates', 'starter-content');
const PERSONA_ROOT = path.join(ROOT, 'templates', 'personas');
const SNAPSHOT_ROOT = path.join(ROOT, '.studio-snapshots');

/** 解析 `--template x` 或 `--template=x` 形式的参数。 */
function readFlag(argv, name) {
  const withEq = argv.find((a) => a.startsWith(`--${name}=`));
  if (withEq) return withEq.slice(name.length + 3);
  const idx = argv.indexOf(`--${name}`);
  if (idx >= 0 && argv[idx + 1] && !argv[idx + 1].startsWith('--')) return argv[idx + 1];
  return null;
}

/** 列出 templates/personas 下所有职业人设及其说明。 */
function listPersonas() {
  if (!fs.existsSync(PERSONA_ROOT)) return [];
  return fs
    .readdirSync(PERSONA_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const manifestPath = path.join(PERSONA_ROOT, entry.name, 'persona.json');
      let meta = {};
      if (fs.existsSync(manifestPath)) {
        try {
          meta = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        } catch {
          meta = {};
        }
      }
      return { id: entry.name, ...meta };
    });
}

/** 把 personaDir 里除 persona.json 外的所有文件叠加到 content/ 对应路径（覆盖同名、保留其余）。 */
function overlayPersona(personaDir) {
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const absolute = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(absolute);
        continue;
      }
      const relative = path.relative(personaDir, absolute);
      if (relative === 'persona.json') continue;
      const target = path.join(CONTENT_DIR, relative);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.copyFileSync(absolute, target);
    }
  };
  walk(personaDir);
}

const argv = process.argv.slice(2);
const personas = listPersonas();

if (argv.includes('--list')) {
  console.log('[reset] 可选职业起始人设：');
  console.log('[reset]   （默认）中性示例内容 · Alex Morgan');
  personas.forEach((p) => {
    const label = p.label || p.id;
    const hint = p.recommendedPack ? `（推荐风格包：${p.recommendedPack}）` : '';
    console.log(`[reset]   --template ${p.id}  ·  ${label} ${hint}`);
  });
  console.log('[reset] 用法：npm run content:reset -- --template developer --yes');
  process.exit(0);
}

const templateId = readFlag(argv, 'template');

if (!argv.includes('--yes')) {
  console.log('[reset] 这个命令会把 content/ 整体替换为起始人设内容（原内容会先备份到 .studio-snapshots/）。');
  console.log('[reset] 查看可选职业人设：npm run content:reset -- --list');
  console.log('[reset] 确认执行请运行：npm run content:reset -- --yes');
  console.log('[reset] 指定职业人设：npm run content:reset -- --template developer --yes');
  process.exit(1);
}

if (!fs.existsSync(STARTER_DIR)) {
  console.error('[reset] 找不到 templates/starter-content，无法重置。');
  process.exit(1);
}

let personaDir = null;
if (templateId) {
  personaDir = path.join(PERSONA_ROOT, templateId);
  if (!fs.existsSync(personaDir)) {
    console.error(`[reset] 找不到职业人设「${templateId}」。可选：${personas.map((p) => p.id).join('、') || '（暂无）'}`);
    console.error('[reset] 列出全部：npm run content:reset -- --list');
    process.exit(1);
  }
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = path.join(SNAPSHOT_ROOT, `pre-reset-${stamp}`);
fs.mkdirSync(SNAPSHOT_ROOT, { recursive: true });
fs.cpSync(CONTENT_DIR, backupDir, { recursive: true });
console.log(`[reset] 已备份当前内容到 ${path.relative(ROOT, backupDir)}`);

fs.rmSync(CONTENT_DIR, { recursive: true, force: true });
fs.cpSync(STARTER_DIR, CONTENT_DIR, { recursive: true });

if (personaDir) {
  overlayPersona(personaDir);
  const meta = personas.find((p) => p.id === templateId) || {};
  console.log(`[reset] content/ 已重置为职业人设「${meta.label || templateId}」。`);
  if (meta.recommendedPack) {
    console.log(`[reset] 建议在 Studio 外观风格里选「${meta.recommendedPack}」风格包搭配。`);
  }
} else {
console.log('[reset] content/ 已重置为中性示例内容。');
}
console.log('[reset] 运行 npm run studio 开始定制你自己的网站。');
