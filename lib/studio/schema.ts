import { isPlainObject } from './clone';
import { STUDIO_SCHEMA_VERSION, type StudioProjectV1, type ValidationIssue } from './types';

function issue(code: string, message: string, field?: string): ValidationIssue {
  return { code, message, field };
}

export function validateProjectShape(value: unknown): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!isPlainObject(value)) {
    return [issue('schema', '项目数据不是对象。')];
  }
  const project = value as Record<string, any>;
  if (project.schemaVersion !== STUDIO_SCHEMA_VERSION) {
    issues.push(issue('schemaVersion', `不支持的 schemaVersion：${String(project.schemaVersion)}。`));
  }
  if (typeof project.projectId !== 'string' || !project.projectId.trim()) {
    issues.push(issue('projectId', '缺少 projectId。', 'projectId'));
  }
  for (const key of ['basic', 'siteConfig', 'home', 'resume', 'contact', 'shared', 'skills', 'theme', 'blog', 'siteFlags', 'editor', 'mediaManifest'] as const) {
    if (!isPlainObject(project[key])) {
      issues.push(issue('missing', `缺少 ${key} 对象。`, key));
    }
  }
  if (!Array.isArray(project.projects)) {
    issues.push(issue('projects', 'projects 必须是数组。', 'projects'));
  }
  if (isPlainObject(project.home)) {
    if (!isPlainObject(project.home.zh) || !isPlainObject(project.home.en)) {
      issues.push(issue('home', 'home 必须包含 zh 和 en。', 'home'));
    }
  }
  if (isPlainObject(project.resume)) {
    if (!isPlainObject(project.resume.zh) || !isPlainObject(project.resume.en)) {
      issues.push(issue('resume', 'resume 必须包含 zh 和 en。', 'resume'));
    }
  }
  if (isPlainObject(project.contact)) {
    if (!isPlainObject(project.contact.zh) || !isPlainObject(project.contact.en)) {
      issues.push(issue('contact', 'contact 必须包含 zh 和 en。', 'contact'));
    }
  }
  return issues;
}

export function collectUsedMediaIds(project: StudioProjectV1): Set<string> {
  const ids = new Set<string>();
  const visit = (value: unknown) => {
    if (typeof value === 'string' && project.mediaManifest[value]) {
      ids.add(value);
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (isPlainObject(value)) {
      Object.values(value).forEach(visit);
    }
  };
  visit(project.basic);
  visit(project.shared);
  visit(project.skills);
  visit(project.projects);
  visit(project.blog);
  return ids;
}

export function findMissingMedia(project: StudioProjectV1): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const visit = (value: unknown, path: string) => {
    if (typeof value === 'string') {
      if (value && !value.includes('/') && !value.startsWith('http') && !value.startsWith('data:') && !project.mediaManifest[value] && looksLikeMediaId(value)) {
        issues.push({ code: 'missing-media', message: `找不到媒体 ${value}`, field: path });
      }
      if (project.mediaManifest[value] === undefined && looksLikeMediaId(value) && value) {
        issues.push({ code: 'missing-media', message: `媒体引用不存在：${value}`, field: path });
      }
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((item, index) => visit(item, `${path}[${index}]`));
      return;
    }
    if (isPlainObject(value)) {
      Object.entries(value).forEach(([key, item]) => visit(item, path ? `${path}.${key}` : key));
    }
  };
  const mediaFields = [
    project.basic?.avatarLight,
    project.basic?.avatarDark,
    project.basic?.wechatQr,
    project.basic?.brandMark,
    project.shared?.assets?.avatarLight,
    project.shared?.assets?.avatarDark,
    project.shared?.assets?.wechatQr,
    project.shared?.assets?.brandMark,
    project.shared?.assets?.backgroundImage,
    project.shared?.assets?.backgroundVideo,
  ];
  mediaFields.forEach((id, index) => {
    if (id && !project.mediaManifest[id]) {
      issues.push({ code: 'missing-media', message: `图片引用必须存在：${id}`, field: `assets.${index}` });
    }
  });
  for (const item of project.projects || []) {
    const cover = item.assets?.coverLight || item.cover;
    if (cover && !project.mediaManifest[cover] && looksLikeMediaId(cover)) {
      issues.push({ code: 'missing-media', message: `项目 ${item.id} 的封面不存在。`, field: `project:${item.id}`, tab: 'projects' });
    }
    for (const lang of ['zh', 'en'] as const) {
      for (const image of item.locales?.[lang]?.detailImages || item.detailImages || []) {
        if (image && !project.mediaManifest[image] && looksLikeMediaId(image)) {
          issues.push({ code: 'missing-media', message: `项目 ${item.id} 的详情图不存在。`, field: `project:${item.id}`, tab: 'projects' });
        }
      }
    }
  }
  for (const post of project.blog?.posts || []) {
    if (post.cover && !project.mediaManifest[post.cover] && looksLikeMediaId(post.cover)) {
      issues.push({ code: 'missing-media', message: `文章 ${post.id} 的封面不存在。`, field: `blog:${post.id}`, tab: 'blog' });
    }
  }
  for (const category of project.skills?.dashboard?.categories || []) {
    for (const tool of category.tools || []) {
      for (const key of ['logoColor', 'logoMono'] as const) {
        const id = tool[key];
        if (id && !project.mediaManifest[id] && looksLikeMediaId(id)) {
          issues.push({ code: 'missing-media', message: `技能图标不存在：${tool.name}`, field: 'skills', tab: 'skills' });
        }
      }
    }
  }
  return issues;
}

export function looksLikeMediaId(value: string): boolean {
  if (!value) return false;
  if (/^(https?:\/\/|data:|mailto:)/i.test(value)) return false;
  if (value.startsWith('./') || value.startsWith('../') || value.startsWith('/')) return false;
  return /^(profile|qrcodes|logos|projects|blog|background|user)\//.test(value) || value.startsWith('user/');
}

export function findDuplicateIds(project: StudioProjectV1): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const projectIds = new Set<string>();
  for (const item of project.projects || []) {
    if (!item?.id) {
      issues.push({ code: 'project-id', message: '存在没有 ID 的项目。', tab: 'projects' });
      continue;
    }
    if (projectIds.has(item.id)) {
      issues.push({ code: 'duplicate-project', message: `项目 ID 重复：${item.id}`, field: `project:${item.id}`, tab: 'projects' });
    }
    projectIds.add(item.id);
  }
  const postIds = new Set<string>();
  for (const post of project.blog?.posts || []) {
    const id = post.id || post.date || '';
    if (!id) {
      issues.push({ code: 'blog-id', message: '存在没有 ID 的文章。', tab: 'blog' });
      continue;
    }
    if (postIds.has(id)) {
      issues.push({ code: 'duplicate-blog', message: `文章 ID 重复：${id}`, field: `blog:${id}`, tab: 'blog' });
    }
    postIds.add(id);
  }
  return issues;
}

export function asProject(value: unknown): StudioProjectV1 {
  return value as StudioProjectV1;
}
