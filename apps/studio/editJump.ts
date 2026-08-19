import type { ContentLang, StudioTab } from '../../lib/studio/types';

export interface EditJump {
  tab: StudioTab;
  fieldId?: string;
  lang?: boolean;
  projectId?: string;
  blogId?: string;
  identityIndex?: number;
}

export function resolveEditTarget(field: string): EditJump {
  if (field.startsWith('home.skillList:')) {
    return { tab: 'home', fieldId: 'identity-list', lang: true, identityIndex: Number(field.slice('home.skillList:'.length)) };
  }
  if (field.startsWith('project-cover:') || field.startsWith('project:')) {
    const id = field.replace(/^project(-cover)?:/, '');
    return { tab: 'projects', fieldId: field.startsWith('project-cover:') ? 'img-coverLight' : 'project-form', projectId: id };
  }
  if (field.startsWith('blog:')) {
    return { tab: 'blog', fieldId: 'bl-title', blogId: field.slice('blog:'.length) };
  }
  const table: Record<string, EditJump> = {
    'home.overview': { tab: 'home', fieldId: 'h-greeting', lang: true },
    'home.greeting': { tab: 'home', fieldId: 'h-greeting', lang: true },
    'home.description': { tab: 'home', fieldId: 'h-description', lang: true },
    'home.name': { tab: 'home', fieldId: 'h-name', lang: true },
    'home.city': { tab: 'home', fieldId: 'h-city', lang: true },
    'home.mbti': { tab: 'home', fieldId: 'h-mbti', lang: true },
    'home.experience': { tab: 'home', fieldId: 'h-experience', lang: true },
    'home.profileStatement': { tab: 'home', fieldId: 'h-profileStatement', lang: true },
    'home.skillList': { tab: 'home', fieldId: 'identity-list', lang: true },
    'home.skillTags': { tab: 'home', fieldId: 'h-skillTags', lang: true },
    'home.blogTitle': { tab: 'home', fieldId: 'h-blogTitle', lang: true },
    'home.projectTitle': { tab: 'home', fieldId: 'h-projectTitle', lang: true },
    'home.timelineTitle': { tab: 'home', fieldId: 'h-timelineTitle', lang: true },
    'home.footerStyle': { tab: 'home', fieldId: 'h-footerStyle', lang: true },
    'home.metrics': { tab: 'home', fieldId: 'metrics-editor', lang: true },
    'home.timeline': { tab: 'home', fieldId: 'timeline-editor', lang: true },
    'basic.contact': { tab: 'contact', fieldId: 'b-wechatId' },
    'basic.avatar': { tab: 'basic', fieldId: 'img-avatarLight' },
    'basic.brandMark': { tab: 'basic', fieldId: 'img-brandMark' },
    theme: { tab: 'theme', fieldId: 'tab-theme' },
    'theme.background': { tab: 'theme', fieldId: 'theme-background-editor' },
    projects: { tab: 'projects', fieldId: 'project-form' },
    blog: { tab: 'blog', fieldId: 'post-list' },
    skills: { tab: 'skills', fieldId: 'tab-skills' },
    resume: { tab: 'resume', fieldId: 'tab-resume' },
  };
  return table[field] || { tab: 'theme', fieldId: 'tab-theme' };
}

export function flashField(id?: string) {
  if (!id) return;
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  el.classList.remove('flash-target');
  void el.offsetWidth;
  el.classList.add('flash-target');
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    el.focus({ preventScroll: true });
  }
}

export function applyContentLang(lang: ContentLang, jumpLang?: boolean): ContentLang | null {
  return jumpLang ? lang : null;
}
