import { describe, expect, it } from 'vitest';
import { migrateProject } from '../../lib/studio/migrate';
import { findDuplicateIds, findMissingMedia, validateProjectShape } from '../../lib/studio/schema';
import { validateForExport } from '../../lib/studio/validate-export';
import { findPlaceholderHits } from '../../lib/studio/placeholders';
import { STUDIO_SCHEMA_VERSION, type StudioProjectV1 } from '../../lib/studio/types';

function baseProject(overrides: Partial<StudioProjectV1> = {}): StudioProjectV1 {
  return {
    schemaVersion: STUDIO_SCHEMA_VERSION,
    projectId: 'p_test',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    basic: { wechatId: '', x: '', xiaohongshu: '', github: '', email: '', socialText: { x: '', xiaohongshu: '', github: '' } },
    siteConfig: { attribution: { enabled: false, labelZh: '', labelEn: '', url: '' } },
    home: {
      zh: { hero: { greeting: '你好', description: '介绍' }, sidebar: { name: '测试用户', targetRoleValue: '测试用户', targetCityValue: '远程', age: '', mbti: '', experience: '', profileStatement: '', skillList: [], skillIcons: [], skillTags: [], explore: '' }, projectSection: { title: '作品' }, timeline: { title: '经历', items: [] }, quickLinks: { contact: '', blog: '文章' }, interviewerPath: { title: '', subtitle: '', methodLabel: '', casesLabel: '' }, footer: { copyright: '测试用户', style: '' }, metrics: [] },
      en: { hero: { greeting: 'Hi', description: 'Intro' }, sidebar: { name: 'Test User', targetRoleValue: 'Test User', targetCityValue: 'Remote', age: '', mbti: '', experience: '', profileStatement: '', skillList: [], skillIcons: [], skillTags: [], explore: '' }, projectSection: { title: 'Work' }, timeline: { title: 'Timeline', items: [] }, quickLinks: { contact: '', blog: 'Blog' }, interviewerPath: { title: '', subtitle: '', methodLabel: '', casesLabel: '' }, footer: { copyright: 'Test User', style: '' }, metrics: [] },
    },
    resume: {
      zh: { heading: '', name: '测试用户', summary: '', statement: '', basicsTitle: '', strengthsTitle: '', workTitle: '', projectTitle: '', updatedLabel: '', updatedAt: '', featuredProjectIds: [], basics: [], strengths: [], experiences: [], projectRoleValues: {}, projectBullets: {} },
      en: { heading: '', name: 'Test User', summary: '', statement: '', basicsTitle: '', strengthsTitle: '', workTitle: '', projectTitle: '', updatedLabel: '', updatedAt: '', featuredProjectIds: [], basics: [], strengths: [], experiences: [], projectRoleValues: {}, projectBullets: {} },
    },
    contact: {
      zh: { wechatCardTitle: '', wechatDescription: '', wechatIdLabel: '', copyLabel: '', copiedLabel: '', scanHint: '', channels: [] },
      en: { wechatCardTitle: '', wechatDescription: '', wechatIdLabel: '', copyLabel: '', copiedLabel: '', scanHint: '', channels: [] },
    },
    shared: { person: { displayName: '测试用户', legalName: '测试用户' }, links: { wechatId: '', x: '', xiaohongshu: '', github: '', email: '' }, assets: {} },
    skills: { dashboard: { title: { zh: '', en: '' }, subtitle: { zh: '', en: '' }, categories: [] }, modal: { intro: { zh: '', en: '' }, categories: [] } },
    theme: { accent: { light: '#C13B25' }, effects: { background: { mode: 'default', pattern: 'grid' } } },
    projects: [],
    blog: { categories: [], posts: [] },
    siteFlags: { attributionEnabled: false, labelZh: '', labelEn: '', url: '' },
    editor: { checklist: { hidden: false, exported: false, themeSaved: false }, customPacks: [], contentLang: 'zh' },
    mediaManifest: {},
    ...overrides,
  };
}

describe('schema and migrate', () => {
  it('accepts a v1 project', () => {
    expect(validateProjectShape(baseProject())).toEqual([]);
    const migrated = migrateProject(baseProject());
    expect(migrated.ok).toBe(true);
  });

  it('refuses unknown schema versions without overwriting', () => {
    const result = migrateProject({ ...baseProject(), schemaVersion: 99 });
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/无法迁移/);
  });

  it('refuses missing schemaVersion', () => {
    const raw = baseProject() as any;
    delete raw.schemaVersion;
    const result = migrateProject(raw);
    expect(result.ok).toBe(false);
  });

  it('detects duplicate project and blog ids', () => {
    const project = baseProject({
      projects: [
        { id: 'a', title: 'A', subtitle: '', description: '', year: '', role: '', outcome: '', icon: '' },
        { id: 'a', title: 'B', subtitle: '', description: '', year: '', role: '', outcome: '', icon: '' },
      ],
      blog: { categories: [], posts: [{ id: '2026-01-01', title: '1', summary: '' }, { id: '2026-01-01', title: '2', summary: '' }] },
    });
    const issues = findDuplicateIds(project);
    expect(issues.some((item) => item.code === 'duplicate-project')).toBe(true);
    expect(issues.some((item) => item.code === 'duplicate-blog')).toBe(true);
  });

  it('detects missing media ids', () => {
    const project = baseProject();
    project.shared.assets.avatarLight = 'user/missing.png';
    const issues = findMissingMedia(project);
    expect(issues.some((item) => item.code === 'missing-media')).toBe(true);
  });
});

describe('placeholders and export validation', () => {
  it('flags template placeholders', () => {
    expect(findPlaceholderHits('hello 你的名字 here').length).toBeGreaterThan(0);
    expect(findPlaceholderHits('Alex Morgan').length).toBeGreaterThan(0);
  });

  it('requires names before export', () => {
    const project = baseProject();
    project.home.zh.sidebar.name = '';
    const issues = validateForExport(project);
    expect(issues.some((item) => item.code === 'missing-name')).toBe(true);
  });

  it('blocks placeholder names on export', () => {
    const project = baseProject();
    project.home.zh.sidebar.name = '你的名字';
    expect(validateForExport(project).some((item) => item.code === 'placeholder')).toBe(true);
  });
});
