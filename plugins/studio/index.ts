/**
 * [INPUT]   : content/ 内容目录、plugins/studio/panel.html 编辑器页面、浏览器上传的表单与图片
 * [OUTPUT]  : dev 模式下的可视化定制器（http://localhost:3000/studio）与配套读写 API
 * [POS]     : Vite 插件层，仅在开发服务器生效，产物构建完全不受影响
 * [DECISION]: 复用 contentRegistry 插件的"改 content/ 即热更新"机制，Studio 只负责把表单
 *             安全地写回 content/ 文件，让小白不碰代码就能定制文字、图片、配色与圆角
 */

import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import type { IncomingMessage, ServerResponse } from 'http';
import type { Plugin, ViteDevServer } from 'vite';
// @ts-ignore content-system 是 JS 模块，无类型声明
import { scaffoldProject, ensureContentIsValid } from '../../content-system/core.js';
import {
  mustPatchScalar,
  mustPatchStringArray,
  patchFrontmatterFile,
  patchYamlObjectArray,
  quoteScalar,
  readTextFile,
  readYamlObjectArray,
  readYamlScalars,
  readYamlStringArray,
  writeTextFile,
} from './contentStore';

const MAX_BODY_BYTES = 32 * 1024 * 1024;
const IMAGE_MIME_EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
  'image/avif': 'avif',
};
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.avif']);
const EXT_MIME: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.avif': 'image/avif',
};

/** 各类图片的最大宽度，上传时自动压缩，避免小白传原图导致资源超预算。 */
const UPLOAD_MAX_WIDTH: Record<string, number> = {
  avatarLight: 640,
  avatarDark: 640,
  wechatQr: 900,
  brandMark: 512,
  coverLight: 1600,
  coverDark: 1600,
  detail: 1920,
  blogCover: 1600,
};

interface UploadPayload {
  target: string;
  dataUrl: string;
  projectId?: string;
  blogDate?: string;
}

const isSafeProjectId = (value: unknown): value is string =>
  typeof value === 'string' && /^[a-z0-9-]+$/.test(value);
const isSafeBlogDate = (value: unknown): value is string =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);

const hexToRgb = (hex: string): [number, number, number] | null => {
  const match = hex.trim().match(/^#([0-9a-f]{6})$/i);
  if (!match) return null;
  const value = parseInt(match[1], 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
};

const rgba = (hex: string, alpha: number): string => {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
};

function sendJson(res: ServerResponse, status: number, payload: unknown): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
}

function readJsonBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error('上传内容过大（超过 32MB），请压缩后再试。'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        const text = Buffer.concat(chunks).toString('utf8');
        resolve(text ? JSON.parse(text) : {});
      } catch (error) {
        reject(new Error('请求内容不是合法的 JSON。'));
      }
    });
    req.on('error', reject);
  });
}

/** 尽量用 sharp 压缩图片；环境不支持时退回原图，保证上传功能始终可用。 */
async function optimizeImage(buffer: Buffer, ext: string, maxWidth: number): Promise<Buffer> {
  if (ext === 'svg' || ext === 'gif') {
    return buffer;
  }
  try {
    const sharp = (await import('sharp')).default;
    let pipeline = sharp(buffer).rotate().resize({ width: maxWidth, withoutEnlargement: true });
    if (ext === 'jpg') pipeline = pipeline.jpeg({ quality: 82 });
    else if (ext === 'webp') pipeline = pipeline.webp({ quality: 82 });
    else if (ext === 'avif') pipeline = pipeline.avif({ quality: 60 });
    else if (ext === 'png') pipeline = pipeline.png({ compressionLevel: 9 });
    return await pipeline.toBuffer();
  } catch {
    return buffer;
  }
}

function parseDataUrl(dataUrl: string): { buffer: Buffer; ext: string } {
  const match = /^data:([a-z0-9+/.-]+);base64,(.+)$/i.exec(dataUrl || '');
  if (!match) {
    throw new Error('图片数据格式不正确，请重新选择文件。');
  }
  const ext = IMAGE_MIME_EXT[match[1].toLowerCase()];
  if (!ext) {
    throw new Error(`暂不支持该图片格式（${match[1]}），请使用 PNG / JPG / WebP。`);
  }
  return { buffer: Buffer.from(match[2], 'base64'), ext };
}

/** 删除同目录下同基础名但不同扩展名的旧文件，避免新旧两张图并存。 */
function removeSiblingVariants(dir: string, baseName: string, keepFile: string): void {
  if (!fs.existsSync(dir)) return;
  for (const file of fs.readdirSync(dir)) {
    if (file === keepFile) continue;
    if (path.parse(file).name.toLowerCase() === baseName.toLowerCase() && IMAGE_EXTENSIONS.has(path.extname(file).toLowerCase())) {
      fs.rmSync(path.join(dir, file));
    }
  }
}

const naturalImageSort = (a: string, b: string): number => {
  const numA = parseInt(path.parse(a).name, 10);
  const numB = parseInt(path.parse(b).name, 10);
  if (!Number.isNaN(numA) && !Number.isNaN(numB)) return numA - numB;
  return a.localeCompare(b);
};

export function studioPlugin(): Plugin {
  let projectRoot = '';

  const contentRoot = () => path.join(projectRoot, 'content');
  const mediaRoot = () => path.join(contentRoot(), 'media');
  const sitePath = (...parts: string[]) => path.join(contentRoot(), 'text', 'site', ...parts);
  const projectTextDir = (id: string) => path.join(contentRoot(), 'text', 'projects', id);
  const projectMediaDir = (id: string) => path.join(mediaRoot(), 'projects', id);
  const blogTextDir = (date: string) => path.join(contentRoot(), 'text', 'blog', date);
  const blogMediaDir = (date: string) => path.join(mediaRoot(), 'blog', date);
  const themePath = () => path.join(contentRoot(), 'theme', 'site-theme.json');
  const snapshotRoot = () => path.join(projectRoot, '.studio-snapshots');
  const sessionSnapshotDir = () => path.join(snapshotRoot(), 'last-session');
  const starterDir = () => path.join(projectRoot, 'templates', 'starter-content');

  // ── 快照：撤销与重置的安全网。 ──
  const takeSnapshot = (name: string) => {
    const target = path.join(snapshotRoot(), name);
    fs.rmSync(target, { recursive: true, force: true });
    fs.mkdirSync(snapshotRoot(), { recursive: true });
    fs.cpSync(contentRoot(), target, { recursive: true });
  };

  const replaceContentWith = (sourceDir: string, backupName: string) => {
    if (!fs.existsSync(sourceDir)) {
      throw new Error(`找不到 ${path.relative(projectRoot, sourceDir)}，无法执行。`);
    }
    takeSnapshot(backupName);
    fs.rmSync(contentRoot(), { recursive: true, force: true });
    fs.cpSync(sourceDir, contentRoot(), { recursive: true });
  };

  /** 把 content 文本文件里的相对图片路径转成 /studio/media/ 预览 URL。 */
  const toMediaUrl = (relativeRef: string | undefined): string | null => {
    if (!relativeRef) return null;
    const marker = 'media/';
    const index = relativeRef.lastIndexOf(marker);
    if (index === -1) return null;
    return `/studio/media/${relativeRef.slice(index + marker.length)}`;
  };

  // ── shared.yml：结构固定，整体重渲染最稳。 ──
  const renderSharedYml = (d: Record<string, string>) => `person:
  displayName: ${quoteScalar(d['person.displayName'] ?? '')}
  legalName: ${quoteScalar(d['person.legalName'] ?? '')}
assets:
  avatarLight: ${quoteScalar(d['assets.avatarLight'] ?? '')}
  avatarDark: ${quoteScalar(d['assets.avatarDark'] ?? '')}
  wechatQr: ${quoteScalar(d['assets.wechatQr'] ?? '')}
  talkAvatar: ${quoteScalar(d['assets.talkAvatar'] ?? '')}
  brandMark: ${quoteScalar(d['assets.brandMark'] ?? '')}
links:
  wechatId: ${quoteScalar(d['links.wechatId'] ?? '')}
  x: ${quoteScalar(d['links.x'] ?? '')}
  xiaohongshu: ${quoteScalar(d['links.xiaohongshu'] ?? '')}
  github: ${quoteScalar(d['links.github'] ?? '')}
  email: ${quoteScalar(d['links.email'] ?? '')}
`;

  const readShared = () => readYamlScalars(readTextFile(sitePath('shared.yml')));

  const updateShared = (mutate: (data: Record<string, string>) => void) => {
    const data = readShared();
    mutate(data);
    writeTextFile(sitePath('shared.yml'), renderSharedYml(data));
  };

  // ── 首页文案：Studio 只编辑 zh/en 两个文件里的固定字段。 ──
  const HOME_SCALARS = [
    ['hero', 'greeting'],
    ['hero', 'description'],
    ['sidebar', 'name'],
    ['sidebar', 'targetRoleValue'],
    ['sidebar', 'targetCityValue'],
    ['sidebar', 'mbti'],
    ['sidebar', 'experience'],
    ['sidebar', 'profileStatement'],
    ['sidebar', 'explore'],
    ['projectSection', 'title'],
    ['timeline', 'title'],
    ['footer', 'copyright'],
    ['footer', 'style'],
  ] as const;

  /** Studio 时间线编辑用的精选 Material Symbols 图标（站点字体已加载，无需新库）。 */
  const TIMELINE_ICONS = [
    'rocket_launch', 'auto_awesome', 'palette', 'hub', 'groups', 'trending_up',
    'work', 'school', 'code', 'brush', 'edit_note', 'lightbulb',
    'psychology', 'favorite', 'star', 'public', 'flight_takeoff', 'menu_book',
    'science', 'storefront', 'fitness_center', 'music_note', 'camera_alt', 'construction',
  ];

  const readHomeFields = (language: 'zh' | 'en') => {
    const raw = readTextFile(sitePath(`home.${language}.md`));
    const scalars = readYamlScalars(raw);
    const timelineItems = readYamlObjectArray(raw, ['timeline', 'items']).map((item) => ({
      icon: typeof item.icon === 'string' ? item.icon : 'star',
      period: typeof item.period === 'string' ? item.period : '',
      title: typeof item.title === 'string' ? item.title : '',
      keywords: Array.isArray(item.keywords) ? item.keywords : [],
      detail: typeof item.detail === 'string' ? item.detail : '',
    }));
    return {
      timelineItems,
      timelineIcons: TIMELINE_ICONS,
      greeting: scalars['hero.greeting'] ?? '',
      description: scalars['hero.description'] ?? '',
      name: scalars['sidebar.name'] ?? '',
      city: scalars['sidebar.targetCityValue'] ?? '',
      mbti: scalars['sidebar.mbti'] ?? '',
      experience: scalars['sidebar.experience'] ?? '',
      profileStatement: scalars['sidebar.profileStatement'] ?? '',
      explore: scalars['sidebar.explore'] ?? '',
      projectTitle: scalars['projectSection.title'] ?? '',
      timelineTitle: scalars['timeline.title'] ?? '',
      footerStyle: scalars['footer.style'] ?? '',
      skillList: readYamlStringArray(raw, ['sidebar', 'skillList']),
      skillTags: readYamlStringArray(raw, ['sidebar', 'skillTags']),
    };
  };

  const saveHomeFields = (language: 'zh' | 'en', fields: any) => {
    const filePath = sitePath(`home.${language}.md`);
    patchFrontmatterFile(filePath, (frontmatter) => {
      let next = frontmatter;
      const label = `home.${language}.md`;
      const scalarValues: Record<string, string> = {
        'hero.greeting': fields.greeting,
        'hero.description': fields.description,
        'sidebar.name': fields.name,
        'sidebar.targetRoleValue': fields.name,
        'sidebar.targetCityValue': fields.city,
        'sidebar.mbti': fields.mbti,
        'sidebar.experience': fields.experience,
        'sidebar.profileStatement': fields.profileStatement,
        'sidebar.explore': fields.explore,
        'projectSection.title': fields.projectTitle,
        'timeline.title': fields.timelineTitle,
        'footer.copyright': fields.name,
        'footer.style': fields.footerStyle,
      };
      for (const keyPath of HOME_SCALARS) {
        const dotted = keyPath.join('.');
        const value = scalarValues[dotted];
        if (typeof value === 'string') {
          next = mustPatchScalar(next, [...keyPath], value, label);
        }
      }
      if (Array.isArray(fields.skillList)) {
        next = mustPatchStringArray(next, ['sidebar', 'skillList'], fields.skillList, label);
      }
      if (Array.isArray(fields.skillTags)) {
        next = mustPatchStringArray(next, ['sidebar', 'skillTags'], fields.skillTags, label);
      }
      if (Array.isArray(fields.timelineItems)) {
        const items = fields.timelineItems.map((item: any, index: number) => {
          const title = String(item?.title ?? '').trim();
          const period = String(item?.period ?? '').trim();
          const detail = String(item?.detail ?? '').trim();
          if (!title || !period || !detail) {
            throw new Error(`时间线第 ${index + 1} 条的"时期 / 标题 / 描述"都不能为空。`);
          }
          return {
            id: `timeline-${fields.timelineItems.length - index}`,
            icon: String(item?.icon ?? 'star').trim() || 'star',
            period,
            title,
            keywords: Array.isArray(item?.keywords) ? item.keywords.map(String).filter(Boolean) : [],
            detail,
          };
        });
        const patched = patchYamlObjectArray(next, ['timeline', 'items'], items, ['id', 'icon', 'period', 'title', 'keywords', 'detail']);
        if (patched === null) {
          throw new Error(`在 ${label} 中找不到 timeline.items`);
        }
        next = patched;
      }
      return next;
    });
  };

  // ── 主题：解析 JSON，改完整体写回。 ──
  const AURORA_BASE_LIGHT = 0.19;
  const AURORA_BASE_DARK = 0.22;

  /** 精选字体预设：中文字体全部使用开源字体，通过国内可达的镜像/CDN 加载。 */
  const FONT_PRESETS: Record<string, { label: string; fontSans: string; webfonts: string[] }> = {
    modern: {
      label: '现代无衬线（默认）',
      fontSans: "'Manrope', 'Noto Sans SC', sans-serif",
      webfonts: [],
    },
    serif: {
      label: '杂志衬线',
      fontSans: "'Source Serif 4', 'Noto Serif SC', serif",
      webfonts: ['https://fonts.loli.net/css2?family=Source+Serif+4:wght@400;600;700&family=Noto+Serif+SC:wght@400;500;600;700&display=swap'],
    },
    wenkai: {
      label: '霞鹜文楷（手写感）',
      fontSans: "'LXGW WenKai Screen', 'Noto Sans SC', sans-serif",
      webfonts: ['https://cdn.jsdelivr.net/npm/lxgw-wenkai-screen-webfont@1.7.0/style.css'],
    },
  };

  const DENSITY_ROOT_SIZE: Record<string, string> = {
    compact: '15px',
    normal: '16px',
    relaxed: '17px',
  };

  const readThemeState = () => {
    const theme = JSON.parse(readTextFile(themePath()));
    const radius = parseInt(String(theme.effects?.cards?.radius ?? '24'), 10) || 24;
    const auroraOpacity = Number(theme.effects?.aurora?.light?.opacity ?? AURORA_BASE_LIGHT);
    const rootSize = theme.typography?.rootFontSize ?? '16px';
    return {
      accentLight: theme.accent?.light ?? '#C13B25',
      accentDark: theme.accent?.dark ?? '#EB5E47',
      pageLight: theme.modes?.light?.surface?.page ?? '#F8FAFC',
      pageDark: theme.modes?.dark?.surface?.page ?? '#0B0B0C',
      radius,
      aurora: Math.round((auroraOpacity / AURORA_BASE_LIGHT) * 100),
      fontPreset: theme.typography?.fontPreset ?? 'modern',
      density: Object.entries(DENSITY_ROOT_SIZE).find(([, size]) => size === rootSize)?.[0] ?? 'normal',
      fontPresets: Object.entries(FONT_PRESETS).map(([id, preset]) => ({ id, label: preset.label })),
    };
  };

  const saveThemeState = (input: any) => {
    const { accentLight, accentDark, pageLight, pageDark } = input;
    for (const [label, value] of Object.entries({ 主色浅色: accentLight, 主色深色: accentDark, 浅色底色: pageLight, 深色底色: pageDark })) {
      if (!hexToRgb(String(value ?? ''))) {
        throw new Error(`${label} 不是合法的十六进制颜色（例如 #C13B25）。`);
      }
    }
    const radius = Math.min(48, Math.max(0, Math.round(Number(input.radius ?? 24))));
    const auroraLevel = Math.min(200, Math.max(0, Math.round(Number(input.aurora ?? 100))));

    const theme = JSON.parse(readTextFile(themePath()));
    theme.accent.light = accentLight;
    theme.accent.dark = accentDark;
    theme.accent.glow = rgba(accentLight, 0.35);
    theme.modes.light.text.accent = accentLight;
    theme.modes.dark.text.accent = accentDark;
    theme.modes.light.pill.hoverBorder = rgba(accentLight, 0.22);
    theme.modes.dark.pill.hoverBorder = rgba(accentDark, 0.3);
    theme.modes.light.surface.page = pageLight;
    theme.modes.dark.surface.page = pageDark;
    theme.effects.cards.radius = `${radius}px`;
    theme.effects.cards.radiusSmall = `${Math.max(4, Math.round(radius * 0.75))}px`;
    theme.effects.aurora.light.opacity = Number(((auroraLevel / 100) * AURORA_BASE_LIGHT).toFixed(3));
    theme.effects.aurora.dark.opacity = Number(((auroraLevel / 100) * AURORA_BASE_DARK).toFixed(3));

    const fontPreset = FONT_PRESETS[input.fontPreset] ? input.fontPreset : 'modern';
    const rootFontSize = DENSITY_ROOT_SIZE[input.density] ?? '16px';
    theme.typography = {
      fontPreset,
      fontSans: FONT_PRESETS[fontPreset].fontSans,
      webfonts: FONT_PRESETS[fontPreset].webfonts,
      rootFontSize,
    };

    writeTextFile(themePath(), `${JSON.stringify(theme, null, 2)}`);
  };

  // ── 项目。 ──
  const listProjectIds = (): string[] => {
    const root = path.join(contentRoot(), 'text', 'projects');
    if (!fs.existsSync(root)) return [];
    return fs
      .readdirSync(root, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && fs.existsSync(path.join(root, entry.name, 'meta.yml')))
      .map((entry) => entry.name)
      .sort();
  };

  const listDetailImages = (id: string): string[] => {
    const dir = projectMediaDir(id);
    if (!fs.existsSync(dir)) return [];
    return fs
      .readdirSync(dir)
      .filter((file) => {
        const ext = path.extname(file).toLowerCase();
        const base = path.parse(file).name.toLowerCase();
        return IMAGE_EXTENSIONS.has(ext) && !base.startsWith('cover');
      })
      .sort(naturalImageSort);
  };

  const readProjectState = (id: string) => {
    const metaScalars = readYamlScalars(readTextFile(path.join(projectTextDir(id), 'meta.yml')));
    const readOverview = (language: 'zh' | 'en') => {
      const raw = readTextFile(path.join(projectTextDir(id), `overview.${language}.md`));
      const scalars = readYamlScalars(raw);
      return {
        title: scalars['title'] ?? '',
        subtitle: scalars['subtitle'] ?? '',
        description: scalars['description'] ?? '',
        keywords: readYamlStringArray(raw, ['keywords']),
      };
    };
    return {
      id,
      order: Number(metaScalars['order'] ?? 999),
      published: metaScalars['published'] === 'true',
      year: metaScalars['year'] ?? '',
      role: metaScalars['role'] ?? '',
      outcome: metaScalars['outcome'] ?? '',
      themeColor: metaScalars['themeColor'] ?? '#94A3B8',
      webLink: metaScalars['webLink'] ?? '',
      version: metaScalars['version'] ?? '',
      coverLight: toMediaUrl(metaScalars['coverLight']),
      coverDark: toMediaUrl(metaScalars['coverDark']),
      detailImages: listDetailImages(id).map((file) => ({
        file,
        url: `/studio/media/projects/${id}/${file}`,
      })),
      zh: readOverview('zh'),
      en: readOverview('en'),
    };
  };

  const saveProject = (input: any) => {
    if (!isSafeProjectId(input.id)) {
      throw new Error('项目 id 不合法。');
    }
    const id = input.id;
    const metaPath = path.join(projectTextDir(id), 'meta.yml');
    let meta = readTextFile(metaPath);
    const metaLabel = `${id}/meta.yml`;
    const scalarFields: Array<[string, unknown]> = [
      ['year', input.year],
      ['role', input.role],
      ['outcome', input.outcome],
      ['themeColor', input.themeColor],
      ['webLink', input.webLink],
      ['version', input.version],
    ];
    for (const [key, value] of scalarFields) {
      if (typeof value === 'string') {
        meta = mustPatchScalar(meta, [key], value, metaLabel);
      }
    }
    if (typeof input.published === 'boolean') {
      meta = mustPatchScalar(meta, ['published'], input.published, metaLabel);
    }
    writeTextFile(metaPath, meta);

    for (const language of ['zh', 'en'] as const) {
      const fields = input[language];
      if (!fields) continue;
      const label = `${id}/overview.${language}.md`;
      patchFrontmatterFile(path.join(projectTextDir(id), `overview.${language}.md`), (frontmatter) => {
        let next = frontmatter;
        for (const key of ['title', 'subtitle', 'description'] as const) {
          if (typeof fields[key] === 'string') {
            next = mustPatchScalar(next, [key], fields[key], label);
          }
        }
        if (Array.isArray(fields.keywords)) {
          next = mustPatchStringArray(next, ['keywords'], fields.keywords, label);
        }
        return next;
      });
    }
  };

  /** 详情图以 media 文件夹为准：上传/删除后重扫文件夹并回写两份 overview 的 detailImages。 */
  const syncDetailImages = (id: string) => {
    const refs = listDetailImages(id).map((file) => `../../../media/projects/${id}/${file}`);
    for (const language of ['zh', 'en'] as const) {
      patchFrontmatterFile(path.join(projectTextDir(id), `overview.${language}.md`), (frontmatter) =>
        mustPatchStringArray(frontmatter, ['detailImages'], refs, `${id}/overview.${language}.md`));
    }
  };

  // ── 博客。 ──
  const readBlogCategories = (): Array<{ id: string; title: string }> => {
    const filePath = path.join(contentRoot(), 'text', 'blog', 'categories.yml');
    if (!fs.existsSync(filePath)) return [];
    const raw = readTextFile(filePath);
    const categories: Array<{ id: string; title: string }> = [];
    const pattern = /-\s+id:\s*(\S+)[\s\S]*?zh:\s*"([^"]*)"/g;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(raw)) !== null) {
      categories.push({ id: match[1], title: match[2] });
    }
    return categories;
  };

  const readBlogPosts = () => {
    const root = path.join(contentRoot(), 'text', 'blog');
    if (!fs.existsSync(root)) return [];
    const readOptional = (filePath: string) => (fs.existsSync(filePath) ? readTextFile(filePath).trim() : '');
    return fs
      .readdirSync(root, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && /^\d{4}-\d{2}-\d{2}$/.test(entry.name))
      .map((entry) => {
        const dir = path.join(root, entry.name);
        const mediaDir = blogMediaDir(entry.name);
        const coverFile = fs.existsSync(mediaDir)
          ? fs.readdirSync(mediaDir).find((file) => IMAGE_EXTENSIONS.has(path.extname(file).toLowerCase()))
          : undefined;
        const links = readOptional(path.join(dir, '链接.txt')).split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
        return {
          date: entry.name,
          title: readOptional(path.join(dir, '标题.txt')),
          summary: readOptional(path.join(dir, '摘要.txt')),
          category: readOptional(path.join(dir, '分类.txt')),
          linkWechat: links[0] ?? '',
          linkX: links[1] ?? '',
          cover: coverFile ? `/studio/media/blog/${entry.name}/${coverFile}` : null,
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  };

  const saveBlogPost = (input: any) => {
    if (!isSafeBlogDate(input.date)) {
      throw new Error('日期格式应为 YYYY-MM-DD，例如 2026-07-11。');
    }
    const title = String(input.title ?? '').trim();
    if (!title) {
      throw new Error('文章标题不能为空。');
    }
    const dir = blogTextDir(input.date);
    fs.mkdirSync(dir, { recursive: true });
    fs.mkdirSync(blogMediaDir(input.date), { recursive: true });
    writeTextFile(path.join(dir, '标题.txt'), title);
    writeTextFile(path.join(dir, '摘要.txt'), String(input.summary ?? '').trim() || title);
    const links = [String(input.linkWechat ?? '').trim(), String(input.linkX ?? '').trim()].filter(Boolean);
    writeTextFile(path.join(dir, '链接.txt'), links.join('\n'));
    if (typeof input.category === 'string' && input.category.trim()) {
      writeTextFile(path.join(dir, '分类.txt'), input.category.trim());
    }
  };

  // ── 图片上传。 ──
  const handleUpload = async (payload: UploadPayload) => {
    const { buffer, ext } = parseDataUrl(payload.dataUrl);
    const maxWidth = UPLOAD_MAX_WIDTH[payload.target] ?? 1600;
    const optimized = await optimizeImage(buffer, ext, maxWidth);

    const writeAsset = (dir: string, baseName: string): string => {
      const fileName = `${baseName}.${ext}`;
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, fileName), optimized);
      removeSiblingVariants(dir, baseName, fileName);
      return fileName;
    };

    switch (payload.target) {
      case 'avatarLight':
      case 'avatarDark':
      case 'wechatQr':
      case 'brandMark': {
        const config = {
          avatarLight: { dir: path.join(mediaRoot(), 'profile'), base: 'avatar', sharedKey: 'assets.avatarLight', prefix: '../../media/profile/' },
          avatarDark: { dir: path.join(mediaRoot(), 'profile'), base: 'avatar-dark', sharedKey: 'assets.avatarDark', prefix: '../../media/profile/' },
          wechatQr: { dir: path.join(mediaRoot(), 'qrcodes'), base: 'wx', sharedKey: 'assets.wechatQr', prefix: '../../media/qrcodes/' },
          brandMark: { dir: path.join(mediaRoot(), 'logos'), base: 'brand', sharedKey: 'assets.brandMark', prefix: '../../media/logos/' },
        }[payload.target];
        const fileName = writeAsset(config.dir, config.base);
        updateShared((data) => {
          data[config.sharedKey] = `${config.prefix}${fileName}`;
        });
        return {};
      }
      case 'coverLight':
      case 'coverDark': {
        if (!isSafeProjectId(payload.projectId)) throw new Error('项目 id 不合法。');
        const base = payload.target === 'coverLight' ? 'cover-light' : 'cover-dark';
        const fileName = writeAsset(projectMediaDir(payload.projectId), base);
        const metaPath = path.join(projectTextDir(payload.projectId), 'meta.yml');
        const metaLabel = `${payload.projectId}/meta.yml`;
        const assetRef = `../../../media/projects/${payload.projectId}/${fileName}`;
        const metaKey = payload.target === 'coverLight' ? 'coverLight' : 'coverDark';
        let meta = mustPatchScalar(readTextFile(metaPath), [metaKey], assetRef, metaLabel);
        // 没有专门的深色封面时，深色模式共用浅色封面，保证 meta 引用始终有效。
        if (payload.target === 'coverLight') {
          const hasDarkCover = fs.existsSync(projectMediaDir(payload.projectId)) &&
            fs.readdirSync(projectMediaDir(payload.projectId)).some((file) =>
              path.parse(file).name.toLowerCase() === 'cover-dark' && IMAGE_EXTENSIONS.has(path.extname(file).toLowerCase()));
          if (!hasDarkCover) {
            meta = mustPatchScalar(meta, ['coverDark'], assetRef, metaLabel);
          }
        }
        writeTextFile(metaPath, meta);
        return {};
      }
      case 'detail': {
        if (!isSafeProjectId(payload.projectId)) throw new Error('项目 id 不合法。');
        const existing = listDetailImages(payload.projectId);
        const nextIndex = existing.reduce((max, file) => {
          const num = parseInt(path.parse(file).name, 10);
          return Number.isNaN(num) ? max : Math.max(max, num);
        }, 0) + 1;
        writeAsset(projectMediaDir(payload.projectId), String(nextIndex).padStart(2, '0'));
        syncDetailImages(payload.projectId);
        return {};
      }
      case 'blogCover': {
        if (!isSafeBlogDate(payload.blogDate)) throw new Error('博客日期不合法。');
        const dir = blogMediaDir(payload.blogDate);
        // 博客封面取"文件夹里的第一张图"，先清掉旧图避免新旧封面并存。
        if (fs.existsSync(dir)) {
          for (const file of fs.readdirSync(dir)) {
            if (IMAGE_EXTENSIONS.has(path.extname(file).toLowerCase())) {
              fs.rmSync(path.join(dir, file));
            }
          }
        }
        writeAsset(dir, 'cover');
        return {};
      }
      default:
        throw new Error(`未知的上传目标：${payload.target}`);
    }
  };

  const removeDetailImage = (input: any) => {
    if (!isSafeProjectId(input.projectId)) throw new Error('项目 id 不合法。');
    const file = String(input.file ?? '');
    if (!/^[\w.-]+$/.test(file) || file.includes('..')) {
      throw new Error('文件名不合法。');
    }
    const filePath = path.join(projectMediaDir(input.projectId), file);
    if (fs.existsSync(filePath)) {
      fs.rmSync(filePath);
    }
    syncDetailImages(input.projectId);
  };

  // ── 完成度清单：对比 starter 示例默认值 + 记录一次性动作。 ──
  const uiStatePath = () => path.join(snapshotRoot(), 'ui-state.json');

  const readUiState = (): Record<string, boolean> => {
    try {
      return JSON.parse(fs.readFileSync(uiStatePath(), 'utf8'));
    } catch {
      return {};
    }
  };

  const writeUiState = (patch: Record<string, boolean>) => {
    fs.mkdirSync(snapshotRoot(), { recursive: true });
    fs.writeFileSync(uiStatePath(), JSON.stringify({ ...readUiState(), ...patch }, null, 2), 'utf8');
  };

  const readStarterScalars = (relPath: string): Record<string, string> => {
    const filePath = path.join(starterDir(), relPath);
    if (!fs.existsSync(filePath)) return {};
    return readYamlScalars(readTextFile(filePath));
  };

  const collectChecklist = () => {
    if (!fs.existsSync(starterDir())) return null;
    const uiState = readUiState();
    const shared = readShared();
    const starterShared = readStarterScalars('text/site/shared.yml');
    const homeZh = readYamlScalars(readTextFile(sitePath('home.zh.md')));
    const starterHomeZh = readStarterScalars('text/site/home.zh.md');

    const avatarChanged = shared['assets.avatarLight'] !== starterShared['assets.avatarLight'] || (() => {
      try {
        const current = fs.readFileSync(path.join(mediaRoot(), 'profile', path.basename(shared['assets.avatarLight'] ?? '')));
        const starter = fs.readFileSync(path.join(starterDir(), 'media', 'profile', path.basename(starterShared['assets.avatarLight'] ?? '')));
        return !current.equals(starter);
      } catch {
        return true; // 文件对不上说明结构已被用户改过，视为完成
      }
    })();

    let themeChanged = uiState.themeSaved === true;
    try {
      const currentAccent = JSON.parse(readTextFile(themePath())).accent?.light;
      const starterAccent = JSON.parse(readTextFile(path.join(starterDir(), 'theme', 'site-theme.json'))).accent?.light;
      themeChanged = themeChanged || currentAccent !== starterAccent;
    } catch { /* 主题文件异常时不阻塞清单 */ }

    const starterProjectIds = ['flowcard', 'palette-lab'];
    const projects = listProjectIds();
    const projectChanged = projects.some((id) => !starterProjectIds.includes(id)) ||
      projects.some((id) => {
        if (!starterProjectIds.includes(id)) return true;
        const currentTitle = readYamlScalars(readTextFile(path.join(projectTextDir(id), 'overview.zh.md')))['title'];
        const starterTitle = readStarterScalars(`text/projects/${id}/overview.zh.md`)['title'];
        return currentTitle !== starterTitle;
      });

    return {
      hidden: uiState.checklistHidden === true,
      items: [
        { key: 'avatar', label: '换上自己的头像', done: avatarChanged, tab: 'basic' },
        { key: 'name', label: '改成自己的名字', done: shared['person.displayName'] !== starterShared['person.displayName'], tab: 'basic' },
        { key: 'hero', label: '写好首屏介绍', done: homeZh['hero.greeting'] !== starterHomeZh['hero.greeting'] || homeZh['hero.description'] !== starterHomeZh['hero.description'], tab: 'home' },
        { key: 'theme', label: '挑一个喜欢的风格', done: themeChanged, tab: 'theme' },
        { key: 'project', label: '放上自己的项目', done: projectChanged, tab: 'projects' },
        { key: 'publish', label: '发布上线', done: uiState.publishMarked === true, tab: 'deploy' },
      ],
    };
  };

  // ── 发布：体检 / 打包 / 署名。 ──
  let buildStatus: 'idle' | 'running' | 'ok' | 'fail' = 'idle';
  let buildLog: string[] = [];

  const startBuild = () => {
    if (buildStatus === 'running') {
      throw new Error('打包正在进行中，请稍候。');
    }
    buildStatus = 'running';
    buildLog = ['开始打包（npm run build）…'];
    const child = spawn('npm', ['run', 'build'], { cwd: projectRoot, shell: true });
    const append = (chunk: Buffer) => {
      buildLog.push(...chunk.toString('utf8').split(/\r?\n/).filter(Boolean));
      if (buildLog.length > 400) buildLog = buildLog.slice(-400);
    };
    child.stdout.on('data', append);
    child.stderr.on('data', append);
    child.on('close', (code) => {
      buildStatus = code === 0 ? 'ok' : 'fail';
      buildLog.push(code === 0 ? '✅ 打包完成，产物在 dist/ 文件夹。' : `❌ 打包失败（退出码 ${code}），看上方日志排查。`);
    });
    child.on('error', (error) => {
      buildStatus = 'fail';
      buildLog.push(`❌ 无法启动打包：${error.message}`);
    });
  };

  const openDistFolder = () => {
    const dist = path.join(projectRoot, 'dist');
    if (!fs.existsSync(dist)) {
      throw new Error('还没有 dist/ 文件夹，请先点"打包"。');
    }
    const opener = process.platform === 'win32' ? 'explorer' : process.platform === 'darwin' ? 'open' : 'xdg-open';
    spawn(opener, [dist], { shell: false, detached: true, stdio: 'ignore' }).on('error', () => {});
  };

  const readSiteFlags = () => {
    const configPath = path.join(contentRoot(), 'config', 'site.yml');
    const scalars = fs.existsSync(configPath) ? readYamlScalars(readTextFile(configPath)) : {};
    return {
      attributionEnabled: scalars['attribution.enabled'] === 'true',
      labelZh: scalars['attribution.labelZh'] ?? '本站基于 folio-studio 开源模板搭建',
      labelEn: scalars['attribution.labelEn'] ?? 'Built with the folio-studio open-source template',
      url: scalars['attribution.url'] ?? 'https://github.com/FANzR-arch/folio-studio',
      personalAI: scalars['features.personalAI'] !== 'false',
    };
  };

  const saveSiteFlags = (patch: { attributionEnabled?: boolean; personalAI?: boolean }) => {
    const current = readSiteFlags();
    const merged = { ...current, ...patch };
    writeTextFile(path.join(contentRoot(), 'config', 'site.yml'), `attribution:
  enabled: ${merged.attributionEnabled ? 'true' : 'false'}
  labelZh: ${quoteScalar(merged.labelZh)}
  labelEn: ${quoteScalar(merged.labelEn)}
  url: ${quoteScalar(merged.url)}
features:
  personalAI: ${merged.personalAI ? 'true' : 'false'}
`);
  };

  const collectState = () => {
    const shared = readShared();
    return {
      basic: {
        displayName: shared['person.displayName'] ?? '',
        legalName: shared['person.legalName'] ?? '',
        wechatId: shared['links.wechatId'] ?? '',
        x: shared['links.x'] ?? '',
        xiaohongshu: shared['links.xiaohongshu'] ?? '',
        github: shared['links.github'] ?? '',
        email: (shared['links.email'] ?? '').replace(/^mailto:/, ''),
        avatarLight: toMediaUrl(shared['assets.avatarLight']),
        avatarDark: toMediaUrl(shared['assets.avatarDark']),
        wechatQr: toMediaUrl(shared['assets.wechatQr']),
        brandMark: toMediaUrl(shared['assets.brandMark']),
      },
      home: {
        zh: readHomeFields('zh'),
        en: readHomeFields('en'),
      },
      theme: readThemeState(),
      projects: listProjectIds().map(readProjectState),
      blog: {
        categories: readBlogCategories(),
        posts: readBlogPosts(),
      },
      checklist: collectChecklist(),
      siteFlags: readSiteFlags(),
    };
  };

  const saveBasic = (input: any) => {
    const email = String(input.email ?? '').trim();
    updateShared((data) => {
      data['person.displayName'] = String(input.displayName ?? '').trim();
      data['person.legalName'] = String(input.legalName ?? '').trim();
      data['links.wechatId'] = String(input.wechatId ?? '').trim();
      data['links.x'] = String(input.x ?? '').trim();
      data['links.xiaohongshu'] = String(input.xiaohongshu ?? '').trim();
      data['links.github'] = String(input.github ?? '').trim();
      data['links.email'] = email && !email.startsWith('mailto:') ? `mailto:${email}` : email;
    });
  };

  const serveMedia = (relPath: string, res: ServerResponse): void => {
    const decoded = decodeURIComponent(relPath);
    const absolute = path.normalize(path.join(mediaRoot(), decoded));
    if (!absolute.startsWith(mediaRoot() + path.sep) || !fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) {
      res.statusCode = 404;
      res.end('Not found');
      return;
    }
    res.statusCode = 200;
    res.setHeader('Content-Type', EXT_MIME[path.extname(absolute).toLowerCase()] ?? 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-store');
    fs.createReadStream(absolute).pipe(res);
  };

  const servePanel = (res: ServerResponse): void => {
    const panelPath = path.join(projectRoot, 'plugins', 'studio', 'panel.html');
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end(fs.readFileSync(panelPath, 'utf8'));
  };

  return {
    name: 'studio',
    apply: 'serve',
    configResolved(config) {
      projectRoot = config.root;
    },
    // dev 模式给站点页面注入"点哪改哪"覆盖层（脚本自身只在 Studio 预览 iframe 里激活）。
    transformIndexHtml() {
      return [{ tag: 'script', attrs: { src: '/studio/edit-overlay.js' }, injectTo: 'body' as const }];
    },
    configureServer(server: ViteDevServer) {
      // 每次启动 Studio 前快照一次内容，"撤销本次修改"以此为还原点。
      try {
        takeSnapshot('last-session');
        console.log('[studio] 已备份当前内容（可在 Studio 中一键撤销本次修改）');
      } catch (error) {
        console.warn('[studio] 内容快照失败：', error instanceof Error ? error.message : error);
      }

      server.middlewares.use((req, res, next) => {
        const url = (req.url ?? '').split('?')[0];
        if (!url.startsWith('/studio')) {
          next();
          return;
        }

        const handle = async () => {
          if (req.method === 'GET' && (url === '/studio' || url === '/studio/')) {
            servePanel(res);
            return;
          }
          if (req.method === 'GET' && url === '/studio/edit-overlay.js') {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'text/javascript; charset=utf-8');
            res.setHeader('Cache-Control', 'no-store');
            res.end(fs.readFileSync(path.join(projectRoot, 'plugins', 'studio', 'edit-overlay.js'), 'utf8'));
            return;
          }
          if (req.method === 'GET' && url.startsWith('/studio/media/')) {
            serveMedia(url.slice('/studio/media/'.length), res);
            return;
          }
          if (req.method === 'GET' && url === '/studio/api/state') {
            sendJson(res, 200, collectState());
            return;
          }
          if (req.method === 'GET' && url === '/studio/api/deploy/status') {
            sendJson(res, 200, { status: buildStatus, log: buildLog.slice(-30) });
            return;
          }
          if (req.method === 'POST') {
            const body = await readJsonBody(req);
            switch (url) {
              case '/studio/api/basic':
                saveBasic(body);
                break;
              case '/studio/api/home':
                if (body.zh) saveHomeFields('zh', body.zh);
                if (body.en) saveHomeFields('en', body.en);
                break;
              case '/studio/api/theme':
                saveThemeState(body);
                writeUiState({ themeSaved: true });
                break;
              case '/studio/api/checklist':
                writeUiState(body ?? {});
                break;
              case '/studio/api/project/save':
                saveProject(body);
                break;
              case '/studio/api/project/create': {
                if (!isSafeProjectId(body.id)) {
                  throw new Error('项目 id 只能使用小写字母、数字和连字符，例如 my-project。');
                }
                scaffoldProject(projectRoot, body.id);
                // 立即写入占位封面并修正 meta 引用，让新项目从创建起就能通过 content:check，
                // 用户之后上传真实封面时占位图会被自动替换。
                const placeholder = [
                  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 750">',
                  '<rect width="1200" height="750" fill="#E2E8F0"/>',
                  `<text x="600" y="390" font-family="sans-serif" font-size="44" fill="#94A3B8" text-anchor="middle">${body.id}</text>`,
                  '</svg>',
                ].join('');
                fs.writeFileSync(path.join(projectMediaDir(body.id), 'cover-light.svg'), placeholder, 'utf8');
                const metaPath = path.join(projectTextDir(body.id), 'meta.yml');
                const ref = `../../../media/projects/${body.id}/cover-light.svg`;
                let meta = mustPatchScalar(readTextFile(metaPath), ['coverLight'], ref, `${body.id}/meta.yml`);
                meta = mustPatchScalar(meta, ['coverDark'], ref, `${body.id}/meta.yml`);
                writeTextFile(metaPath, meta);
                break;
              }
              case '/studio/api/project/detail-remove':
                removeDetailImage(body);
                break;
              case '/studio/api/blog/save':
                saveBlogPost(body);
                break;
              case '/studio/api/upload':
                await handleUpload(body);
                break;
              case '/studio/api/site-config': {
                const patch: { attributionEnabled?: boolean; personalAI?: boolean } = {};
                if (typeof body.attributionEnabled === 'boolean') patch.attributionEnabled = body.attributionEnabled;
                if (typeof body.personalAI === 'boolean') patch.personalAI = body.personalAI;
                saveSiteFlags(patch);
                break;
              }
              case '/studio/api/brandmark/remove':
                updateShared((data) => {
                  data['assets.brandMark'] = '';
                });
                break;
              case '/studio/api/deploy/check':
                try {
                  ensureContentIsValid(projectRoot);
                } catch (error) {
                  throw new Error(`内容体检未通过：${error instanceof Error ? error.message : error}`);
                }
                break;
              case '/studio/api/deploy/build':
                startBuild();
                break;
              case '/studio/api/deploy/open-dist':
                openDistFolder();
                break;
              case '/studio/api/restore':
                replaceContentWith(sessionSnapshotDir(), 'pre-restore');
                break;
              case '/studio/api/reset':
                replaceContentWith(starterDir(), 'pre-reset');
                break;
              default:
                sendJson(res, 404, { ok: false, message: `未知接口：${url}` });
                return;
            }
            sendJson(res, 200, { ok: true, state: collectState() });
            return;
          }
          sendJson(res, 404, { ok: false, message: `未知接口：${url}` });
        };

        handle().catch((error) => {
          sendJson(res, 400, { ok: false, message: error instanceof Error ? error.message : String(error) });
        });
      });
    },
  };
}
