import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildContentRegistry } from '../content-system/core.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MEDIA_ROOT = path.join(ROOT, 'content', 'media');
const OUT_DIR = path.join(ROOT, 'generated', 'starter');
const OUT_MEDIA = path.join(OUT_DIR, 'media');
const VIDEO_EXT = new Set(['.mp4', '.webm']);
const MIME = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.gif': 'image/gif',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
};

function posix(value) {
  return value.replaceAll('\\', '/');
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(from, to);
    else fs.copyFileSync(from, to);
  }
}

function convertAssets(value, manifest) {
  if (Array.isArray(value)) return value.map((item) => convertAssets(item, manifest));
  if (value && typeof value === 'object') {
    if (value.__assetImportPath) {
      const abs = value.__assetImportPath;
      const rel = posix(path.relative(MEDIA_ROOT, abs));
      const ext = path.extname(abs).toLowerCase();
      manifest[rel] = {
        id: rel,
        kind: VIDEO_EXT.has(ext) ? 'video' : 'image',
        mime: MIME[ext] || 'application/octet-stream',
        filename: rel,
        source: 'builtin',
      };
      return rel;
    }
    const next = {};
    for (const [key, item] of Object.entries(value)) next[key] = convertAssets(item, manifest);
    return next;
  }
  return value;
}

export function generateStarterProject(projectRoot = ROOT) {
  const registry = buildContentRegistry(projectRoot);
  const mediaManifest = {};
  const site = convertAssets(registry.site, mediaManifest);
  const projects = convertAssets(registry.projects, mediaManifest);
  const blogPosts = convertAssets(registry.blog, mediaManifest);
  const theme = JSON.parse(fs.readFileSync(path.join(projectRoot, 'content', 'theme', 'site-theme.json'), 'utf8'));
  const now = new Date().toISOString();
  const attribution = registry.siteConfig?.attribution || {};
  const project = {
    schemaVersion: 1,
    projectId: 'starter',
    createdAt: now,
    updatedAt: now,
    basic: {
      wechatId: site.shared.links.wechatId || '',
      x: site.shared.links.x || '',
      xiaohongshu: site.shared.links.xiaohongshu || '',
      github: site.shared.links.github || '',
      email: String(site.shared.links.email || '').replace(/^mailto:/, ''),
      socialText: {
        x: site.contact?.zh?.channels?.find((item) => item.linkKey === 'x')?.value || '',
        xiaohongshu: site.contact?.zh?.channels?.find((item) => item.linkKey === 'xiaohongshu')?.value || '',
        github: site.contact?.zh?.channels?.find((item) => item.linkKey === 'github')?.value || '',
      },
      avatarLight: site.shared.assets.avatarLight,
      avatarDark: site.shared.assets.avatarDark,
      wechatQr: site.shared.assets.wechatQr,
      brandMark: site.shared.assets.brandMark,
    },
    siteConfig: registry.siteConfig,
    home: site.home,
    resume: site.resume,
    contact: site.contact,
    shared: site.shared,
    skills: site.skills,
    theme,
    projects,
    blog: {
      categories: registry.blogCategories || [],
      posts: blogPosts || [],
    },
    siteFlags: {
      attributionEnabled: attribution.enabled === true,
      labelZh: attribution.labelZh || '',
      labelEn: attribution.labelEn || '',
      url: attribution.url || '',
    },
    editor: {
      checklist: { hidden: false, exported: false, themeSaved: false },
      customPacks: [],
      contentLang: 'zh',
    },
    mediaManifest,
  };

  fs.rmSync(OUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });
  copyDir(path.join(projectRoot, 'content', 'media'), OUT_MEDIA);
  fs.writeFileSync(path.join(OUT_DIR, 'project.json'), `${JSON.stringify(project, null, 2)}\n`);
  return { outputDir: OUT_DIR, mediaCount: Object.keys(mediaManifest).length };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = generateStarterProject();
  console.log(`[starter] wrote ${path.relative(ROOT, result.outputDir)} with ${result.mediaCount} media records`);
}
