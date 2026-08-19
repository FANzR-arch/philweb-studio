/** @vitest-environment node */

import { describe, expect, it } from 'vitest';
import { exportProjectBackup, importProjectBackup } from '../../lib/studio/backup';
import { unzipFiles, zipFiles } from '../../lib/studio/zip-safe';
import { STUDIO_SCHEMA_VERSION, type StudioProjectV1 } from '../../lib/studio/types';

function projectWithMedia(): StudioProjectV1 {
  return {
    schemaVersion: STUDIO_SCHEMA_VERSION,
    projectId: 'p_backup',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    basic: {
      wechatId: '', x: '', xiaohongshu: '', github: '', email: '',
      socialText: { x: '', xiaohongshu: '', github: '' },
      avatarLight: 'profile/avatar.svg',
    },
    siteConfig: { attribution: { enabled: false, labelZh: '', labelEn: '', url: '' } },
    home: {
      zh: { hero: { greeting: '', description: '' }, sidebar: { name: '测试用户', targetRoleValue: '测试用户', targetCityValue: '', age: '', mbti: '', experience: '', profileStatement: '', skillList: [], skillIcons: [], skillTags: [], explore: '' }, projectSection: { title: '' }, timeline: { title: '', items: [] }, quickLinks: { contact: '', blog: '' }, interviewerPath: { title: '', subtitle: '', methodLabel: '', casesLabel: '' }, footer: { copyright: '', style: '' }, metrics: [] },
      en: { hero: { greeting: '', description: '' }, sidebar: { name: 'Test User', targetRoleValue: 'Test User', targetCityValue: '', age: '', mbti: '', experience: '', profileStatement: '', skillList: [], skillIcons: [], skillTags: [], explore: '' }, projectSection: { title: '' }, timeline: { title: '', items: [] }, quickLinks: { contact: '', blog: '' }, interviewerPath: { title: '', subtitle: '', methodLabel: '', casesLabel: '' }, footer: { copyright: '', style: '' }, metrics: [] },
    },
    resume: {
      zh: { heading: '', name: '', summary: '', statement: '', basicsTitle: '', strengthsTitle: '', workTitle: '', projectTitle: '', updatedLabel: '', updatedAt: '', featuredProjectIds: [], basics: [], strengths: [], experiences: [], projectRoleValues: {}, projectBullets: {} },
      en: { heading: '', name: '', summary: '', statement: '', basicsTitle: '', strengthsTitle: '', workTitle: '', projectTitle: '', updatedLabel: '', updatedAt: '', featuredProjectIds: [], basics: [], strengths: [], experiences: [], projectRoleValues: {}, projectBullets: {} },
    },
    contact: {
      zh: { wechatCardTitle: '', wechatDescription: '', wechatIdLabel: '', copyLabel: '', copiedLabel: '', scanHint: '', channels: [] },
      en: { wechatCardTitle: '', wechatDescription: '', wechatIdLabel: '', copyLabel: '', copiedLabel: '', scanHint: '', channels: [] },
    },
    shared: {
      person: { displayName: '', legalName: '' },
      links: { wechatId: '', x: '', xiaohongshu: '', github: '', email: '' },
      assets: { avatarLight: 'profile/avatar.svg' },
    },
    skills: { dashboard: { title: { zh: '', en: '' }, subtitle: { zh: '', en: '' }, categories: [] }, modal: { intro: { zh: '', en: '' }, categories: [] } },
    theme: {},
    projects: [],
    blog: { categories: [], posts: [] },
    siteFlags: { attributionEnabled: false, labelZh: '', labelEn: '', url: '' },
    editor: { checklist: { hidden: false, exported: false, themeSaved: false }, customPacks: [], contentLang: 'zh' },
    mediaManifest: {
      'profile/avatar.svg': {
        id: 'profile/avatar.svg',
        kind: 'image',
        mime: 'image/svg+xml',
        filename: 'profile/avatar.svg',
        source: 'builtin',
      },
    },
  };
}

describe('project backup completeness', () => {
  it('does not succeed when referenced media cannot be packed', async () => {
    await expect(exportProjectBackup(projectWithMedia(), async () => undefined)).rejects.toThrow(/缺少媒体/);
  });

  it('packs builtin bytes into the backup zip', async () => {
    const payload = new Uint8Array([1, 2, 3, 9]);
    const result = await exportProjectBackup(
      projectWithMedia(),
      async () => undefined,
      async () => new Blob([payload], { type: 'image/svg+xml' }),
    );
    const files = unzipFiles(result.bytes);
    expect(Object.keys(files)).toContain('media/profile/avatar.svg');
    expect(Array.from(files['media/profile/avatar.svg'])).toEqual([1, 2, 3, 9]);
  });

  it('restores packed media as local copies instead of live starter files', async () => {
    const payload = new Uint8Array([7, 7, 7]);
    const result = await exportProjectBackup(
      projectWithMedia(),
      async () => undefined,
      async () => new Blob([payload], { type: 'image/svg+xml' }),
    );
    const imported = importProjectBackup(result.bytes);
    expect(imported.project.mediaManifest['profile/avatar.svg'].source).toBe('user');
    expect(imported.media).toHaveLength(1);
    expect(Array.from(imported.media[0].bytes)).toEqual([7, 7, 7]);
  });

  it('rejects a backup that still references media it did not pack', async () => {
    const packed = await exportProjectBackup(
      projectWithMedia(),
      async () => new Blob([new Uint8Array([1])], { type: 'image/svg+xml' }),
    );
    const files = unzipFiles(packed.bytes);
    delete files['media/profile/avatar.svg'];
    const incomplete = zipFiles(files);
    expect(() => importProjectBackup(incomplete)).toThrow(/缺少媒体文件/);
  });
});
