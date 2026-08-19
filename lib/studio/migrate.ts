import { cloneJson, isPlainObject, nowIso } from './clone';
import { STUDIO_SCHEMA_VERSION, type MigrateResult, type StudioProjectV1 } from './types';
import { validateProjectShape } from './schema';

function fillDefaults(input: Record<string, any>): StudioProjectV1 {
  const project = cloneJson(input);
  project.schemaVersion = STUDIO_SCHEMA_VERSION;
  project.projectId = String(project.projectId || '').trim();
  project.createdAt = project.createdAt || nowIso();
  project.updatedAt = project.updatedAt || nowIso();
  const basic = project.basic || {};
  project.basic = {
    wechatId: '',
    x: '',
    xiaohongshu: '',
    github: '',
    email: '',
    ...basic,
    socialText: {
      x: '',
      xiaohongshu: '',
      github: '',
      ...(basic.socialText || {}),
    },
  };
  project.siteConfig = project.siteConfig || { attribution: { enabled: false, labelZh: '', labelEn: '', url: '' } };
  project.siteFlags = {
    attributionEnabled: false,
    labelZh: '',
    labelEn: '',
    url: '',
    ...(project.siteFlags || {}),
  };
  project.editor = {
    checklist: { hidden: false, exported: false, themeSaved: false, ...(project.editor?.checklist || {}) },
    customPacks: Array.isArray(project.editor?.customPacks) ? project.editor.customPacks : [],
    contentLang: project.editor?.contentLang === 'en' ? 'en' : 'zh',
  };
  project.mediaManifest = isPlainObject(project.mediaManifest) ? project.mediaManifest : {};
  project.projects = Array.isArray(project.projects) ? project.projects : [];
  project.blog = {
    categories: Array.isArray(project.blog?.categories) ? project.blog.categories : [],
    posts: Array.isArray(project.blog?.posts) ? project.blog.posts : [],
  };
  if (project.siteConfig?.attribution) {
    project.siteFlags.attributionEnabled = project.siteConfig.attribution.enabled === true;
    project.siteFlags.labelZh = project.siteConfig.attribution.labelZh || project.siteFlags.labelZh;
    project.siteFlags.labelEn = project.siteConfig.attribution.labelEn || project.siteFlags.labelEn;
    project.siteFlags.url = project.siteConfig.attribution.url || project.siteFlags.url;
  }
  return project as StudioProjectV1;
}

export function migrateProject(value: unknown): MigrateResult {
  if (!isPlainObject(value)) {
    return { ok: false, reason: '项目数据不是对象，无法迁移。' };
  }
  const version = value.schemaVersion;
  if (version == null) {
    return { ok: false, reason: '缺少 schemaVersion，拒绝覆盖旧数据。' };
  }
  if (typeof version !== 'number' || version > STUDIO_SCHEMA_VERSION) {
    return { ok: false, reason: `无法迁移 schemaVersion ${String(version)}。` };
  }
  if (version < 1) {
    return { ok: false, reason: `无法迁移 schemaVersion ${String(version)}。` };
  }
  const filled = fillDefaults(value);
  const issues = validateProjectShape(filled);
  if (issues.length > 0) {
    return { ok: false, reason: issues[0].message, issues };
  }
  return { ok: true, project: filled };
}
