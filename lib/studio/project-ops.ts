import { cloneJson, createId, nowIso } from './clone';
import type { StudioProjectV1 } from './types';

export function instantiateStarter(starter: StudioProjectV1, projectId = createId('p')): StudioProjectV1 {
  const now = nowIso();
  const next = cloneJson(starter);
  next.projectId = projectId;
  next.createdAt = now;
  next.updatedAt = now;
  next.editor = {
    checklist: { hidden: false, exported: false, themeSaved: false },
    customPacks: Array.isArray(starter.editor?.customPacks) ? cloneJson(starter.editor.customPacks) : [],
    contentLang: 'zh',
  };
  return next;
}

export function touch(project: StudioProjectV1): StudioProjectV1 {
  return { ...project, updatedAt: nowIso() };
}

export function syncBasicShared(project: StudioProjectV1): StudioProjectV1 {
  const next = cloneJson(project);
  next.shared.assets.avatarLight = next.basic.avatarLight;
  next.shared.assets.avatarDark = next.basic.avatarDark;
  next.shared.assets.wechatQr = next.basic.wechatQr;
  next.shared.assets.brandMark = next.basic.brandMark;
  next.shared.links.wechatId = next.basic.wechatId;
  next.shared.links.x = next.basic.x;
  next.shared.links.xiaohongshu = next.basic.xiaohongshu;
  next.shared.links.github = next.basic.github;
  const email = String(next.basic.email || '').replace(/^mailto:/, '').trim();
  next.shared.links.email = email ? `mailto:${email}` : '';
  next.basic.email = email;
  for (const lang of ['zh', 'en'] as const) {
    const channels = next.contact[lang].channels || [];
    next.contact[lang].channels = channels.map((channel) => {
      if (channel.linkKey === 'email') return { ...channel, value: email || channel.value };
      if (channel.linkKey === 'x') return { ...channel, value: next.basic.socialText.x || channel.value };
      if (channel.linkKey === 'xiaohongshu') return { ...channel, value: next.basic.socialText.xiaohongshu || channel.value };
      if (channel.linkKey === 'github') return { ...channel, value: next.basic.socialText.github || channel.value };
      return channel;
    });
  }
  next.siteConfig.attribution = {
    enabled: next.siteFlags.attributionEnabled,
    labelZh: next.siteFlags.labelZh,
    labelEn: next.siteFlags.labelEn,
    url: next.siteFlags.url,
  };
  return next;
}

export function computeChecklist(project: StudioProjectV1, starter: StudioProjectV1) {
  const hidden = project.editor.checklist.hidden;
  const nameChanged = project.home.zh.sidebar.name !== starter.home.zh.sidebar.name;
  const heroChanged =
    project.home.zh.hero.greeting !== starter.home.zh.hero.greeting
    || project.home.zh.hero.description !== starter.home.zh.hero.description;
  const avatarChanged = project.shared.assets.avatarLight !== starter.shared.assets.avatarLight;
  const themeChanged = project.editor.checklist.themeSaved
    || project.theme?.accent?.light !== starter.theme?.accent?.light;
  const starterIds = new Set(starter.projects.map((item) => item.id));
  const projectChanged = project.projects.some((item) => !starterIds.has(item.id))
    || project.projects.some((item) => {
      const starterProject = starter.projects.find((entry) => entry.id === item.id);
      return starterProject && item.locales?.zh?.title !== starterProject.locales?.zh?.title;
    });
  return {
    hidden,
    items: [
      { key: 'avatar', label: '换上自己的头像', done: Boolean(avatarChanged), tab: 'basic' as const },
      { key: 'name', label: '改成自己的名字', done: nameChanged, tab: 'home' as const },
      { key: 'hero', label: '写好首屏介绍', done: heroChanged, tab: 'home' as const },
      { key: 'theme', label: '挑一个喜欢的风格', done: themeChanged, tab: 'theme' as const },
      { key: 'project', label: '放上自己的项目', done: projectChanged, tab: 'projects' as const },
      { key: 'export', label: '检查并导出网站', done: project.editor.checklist.exported, tab: 'help' as const },
    ],
  };
}

export function isSafeProjectId(value: string): boolean {
  return /^[a-z0-9-]+$/.test(value);
}

export function isSafeBlogDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}
