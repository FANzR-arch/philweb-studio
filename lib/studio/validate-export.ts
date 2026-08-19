import { collectTextValues, findPlaceholderHits } from './placeholders';
import { findDuplicateIds, findMissingMedia } from './schema';
import type { StudioProjectV1, ValidationIssue } from './types';

function nameOf(project: StudioProjectV1, lang: 'zh' | 'en'): string {
  return String(project.home?.[lang]?.sidebar?.name || '').trim();
}

export function validateForExport(project: StudioProjectV1): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!nameOf(project, 'zh')) {
    issues.push({ code: 'missing-name', message: '中文姓名不能为空。', field: 'h-name', tab: 'home', lang: 'zh' });
  }
  if (!nameOf(project, 'en')) {
    issues.push({ code: 'missing-name', message: '英文姓名不能为空。', field: 'h-name', tab: 'home', lang: 'en' });
  }

  const texts = collectTextValues({
    home: project.home,
    resume: project.resume,
    contact: project.contact,
    shared: project.shared,
    basic: project.basic,
    blog: project.blog,
    projects: project.projects.map((item) => ({
      id: item.id,
      locales: item.locales,
      title: item.title,
      subtitle: item.subtitle,
    })),
  });
  for (const text of texts) {
    for (const hit of findPlaceholderHits(text)) {
      issues.push({
        code: 'placeholder',
        message: `${hit.label}仍存在：${hit.marker}`,
        marker: hit.marker,
        tab: 'home',
        field: 'h-name',
      });
    }
  }

  issues.push(...findMissingMedia(project));
  issues.push(...findDuplicateIds(project));

  const knownIds = new Set((project.projects || []).map((item) => item.id));
  for (const lang of ['zh', 'en'] as const) {
    for (const id of project.resume?.[lang]?.featuredProjectIds || []) {
      if (id && !knownIds.has(id)) {
        issues.push({
          code: 'broken-link',
          message: `简历精选项目不存在：${id}`,
          tab: 'resume',
          lang,
        });
      }
    }
  }

  const unique: ValidationIssue[] = [];
  const seen = new Set<string>();
  for (const item of issues) {
    const key = `${item.code}:${item.field}:${item.message}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(item);
  }
  return unique;
}

export function slugifySiteName(value: string): string {
  const slug = String(value || '')
    .normalize('NFKD')
    .replace(/[^\w\u4e00-\u9fff-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
  return slug || 'my-website';
}
