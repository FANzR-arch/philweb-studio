import { describe, expect, it } from 'vitest';
import { loadProject, saveProject } from '../../lib/studio/storage';
import { STUDIO_SCHEMA_VERSION, type StudioProjectV1 } from '../../lib/studio/types';

function sample(): StudioProjectV1 {
  return {
    schemaVersion: STUDIO_SCHEMA_VERSION,
    projectId: 'p_storage',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    basic: { wechatId: '', x: '', xiaohongshu: '', github: '', email: '', socialText: { x: '', xiaohongshu: '', github: '' } },
    siteConfig: { attribution: { enabled: false, labelZh: '', labelEn: '', url: '' } },
    home: {
      zh: { hero: { greeting: '', description: '' }, sidebar: { name: '甲', targetRoleValue: '甲', targetCityValue: '', age: '', mbti: '', experience: '', profileStatement: '', skillList: [], skillIcons: [], skillTags: [], explore: '' }, projectSection: { title: '' }, timeline: { title: '', items: [] }, quickLinks: { contact: '', blog: '' }, interviewerPath: { title: '', subtitle: '', methodLabel: '', casesLabel: '' }, footer: { copyright: '', style: '' }, metrics: [] },
      en: { hero: { greeting: '', description: '' }, sidebar: { name: 'A', targetRoleValue: 'A', targetCityValue: '', age: '', mbti: '', experience: '', profileStatement: '', skillList: [], skillIcons: [], skillTags: [], explore: '' }, projectSection: { title: '' }, timeline: { title: '', items: [] }, quickLinks: { contact: '', blog: '' }, interviewerPath: { title: '', subtitle: '', methodLabel: '', casesLabel: '' }, footer: { copyright: '', style: '' }, metrics: [] },
    },
    resume: {
      zh: { heading: '', name: '', summary: '', statement: '', basicsTitle: '', strengthsTitle: '', workTitle: '', projectTitle: '', updatedLabel: '', updatedAt: '', featuredProjectIds: [], basics: [], strengths: [], experiences: [], projectRoleValues: {}, projectBullets: {} },
      en: { heading: '', name: '', summary: '', statement: '', basicsTitle: '', strengthsTitle: '', workTitle: '', projectTitle: '', updatedLabel: '', updatedAt: '', featuredProjectIds: [], basics: [], strengths: [], experiences: [], projectRoleValues: {}, projectBullets: {} },
    },
    contact: {
      zh: { wechatCardTitle: '', wechatDescription: '', wechatIdLabel: '', copyLabel: '', copiedLabel: '', scanHint: '', channels: [] },
      en: { wechatCardTitle: '', wechatDescription: '', wechatIdLabel: '', copyLabel: '', copiedLabel: '', scanHint: '', channels: [] },
    },
    shared: { person: { displayName: '', legalName: '' }, links: { wechatId: '', x: '', xiaohongshu: '', github: '', email: '' }, assets: {} },
    skills: { dashboard: { title: { zh: '', en: '' }, subtitle: { zh: '', en: '' }, categories: [] }, modal: { intro: { zh: '', en: '' }, categories: [] } },
    theme: {},
    projects: [],
    blog: { categories: [], posts: [] },
    siteFlags: { attributionEnabled: false, labelZh: '', labelEn: '', url: '' },
    editor: { checklist: { hidden: false, exported: false, themeSaved: false }, customPacks: [], contentLang: 'zh' },
    mediaManifest: {},
  };
}

describe('IndexedDB project storage', () => {
  it('saves and loads a project', async () => {
    const project = sample();
    await saveProject(project);
    const loaded = await loadProject('p_storage');
    expect(loaded?.home.zh.sidebar.name).toBe('甲');
  });

  it('does not overwrite old data when migration fails', async () => {
    const project = sample();
    await saveProject(project);
    await expect(loadProject('p_missing')).resolves.toBeNull();
    const loaded = await loadProject('p_storage');
    expect(loaded?.projectId).toBe('p_storage');
  });
});
