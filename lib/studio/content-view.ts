import { cloneJson } from './clone';
import type { StudioProjectV1 } from './types';
import type {
  BlogArticle,
  Project,
  SiteConfig,
  SiteContactContent,
  SiteHomeContent,
  SiteResumeContent,
  SiteSharedContent,
  SiteSkillsContent,
} from '../../types';
import { createThemeCssVars } from './theme-vars';

export interface SiteView {
  project: StudioProjectV1;
  home: { zh: SiteHomeContent; en: SiteHomeContent };
  resume: { zh: SiteResumeContent; en: SiteResumeContent };
  contact: { zh: SiteContactContent; en: SiteContactContent };
  shared: SiteSharedContent;
  skills: SiteSkillsContent;
  projects: Project[];
  publishedProjects: Project[];
  blogArticles: BlogArticle[];
  blogCategories: SiteView['project']['blog']['categories'];
  siteConfig: SiteConfig;
  theme: Record<string, any>;
  themeCssVars: ReturnType<typeof createThemeCssVars>;
}

function resolveValue(value: unknown, urls: Record<string, string>): unknown {
  if (typeof value === 'string') {
    return urls[value] || value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => resolveValue(item, urls));
  }
  if (value && typeof value === 'object') {
    const next: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      next[key] = resolveValue(item, urls);
    }
    return next;
  }
  return value;
}

export function projectToSiteView(project: StudioProjectV1, mediaUrls: Record<string, string>): SiteView {
  const resolved = resolveValue(cloneJson(project), mediaUrls) as StudioProjectV1;
  const projects = (resolved.projects || []).slice().sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
  return {
    project: resolved,
    home: resolved.home,
    resume: resolved.resume,
    contact: resolved.contact,
    shared: resolved.shared,
    skills: resolved.skills,
    projects,
    publishedProjects: projects.filter((item) => item.published !== false && item.isPrimary !== false),
    blogArticles: resolved.blog.posts || [],
    blogCategories: resolved.blog.categories || [],
    siteConfig: resolved.siteConfig,
    theme: resolved.theme,
    themeCssVars: createThemeCssVars(resolved.theme),
  };
}

export function buildMediaUrlMap(
  project: StudioProjectV1,
  options: {
    mode: 'studio' | 'preview' | 'site';
    blobUrls?: Record<string, string>;
    starterBase?: string;
    siteBase?: string;
  },
): Record<string, string> {
  const map: Record<string, string> = { ...(options.blobUrls || {}) };
  const starterBase = options.starterBase ?? './starter/media/';
  const siteBase = options.siteBase ?? './';
  for (const record of Object.values(project.mediaManifest || {})) {
    if (map[record.id]) continue;
    if (options.mode === 'site' || record.source === 'export') {
      map[record.id] = `${siteBase.replace(/\/?$/, '/')}${record.filename.replace(/^\.\//, '')}`;
      continue;
    }
    if (record.source === 'builtin') {
      map[record.id] = `${starterBase.replace(/\/?$/, '/')}${record.filename}`;
    }
  }
  return map;
}
