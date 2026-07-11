import type { Language } from './i18n';
import { contentRegistry } from './content.generated';
import type {
  BlogArticle,
  BlogCategory,
  Project,
  SiteConfig,
  SiteContactContent,
  SiteHomeContent,
  SiteResumeContent,
  SiteSharedContent,
  SiteSkillsContent,
} from '../types';

export const siteContent = contentRegistry.site;

export const siteConfig: SiteConfig = contentRegistry.siteConfig ?? {
  attribution: { enabled: false, labelZh: '', labelEn: '', url: '' },
};
export const allProjects: Project[] = contentRegistry.projects;
export const publishedProjects: Project[] = allProjects.filter((project) => project.published !== false);
export const projectsById = new Map(allProjects.map((project) => [project.id, project] as const));

export const blogCategories: BlogCategory[] = contentRegistry.blogCategories || [];
export const blogArticles: BlogArticle[] = contentRegistry.blog || [];

export function getProjectById(projectId: string): Project | undefined {
  return projectsById.get(projectId);
}

export function getBlogArticles(): BlogArticle[] {
  return blogArticles;
}

export function getBlogCategories(): BlogCategory[] {
  return blogCategories;
}

export function getHomeContent(lang: Language): SiteHomeContent {
  return siteContent.home[lang];
}

export function getResumeContent(lang: Language): SiteResumeContent {
  return siteContent.resume[lang];
}

export function getContactContent(lang: Language): SiteContactContent {
  return siteContent.contact[lang];
}

export function getSharedContent(): SiteSharedContent {
  return siteContent.shared;
}

export function getSkillsContent(): SiteSkillsContent {
  return siteContent.skills;
}
