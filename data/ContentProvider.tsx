import React, { createContext, useContext, useMemo } from 'react';
import type { Language } from './i18n';
import { useLanguage } from './i18n';
import { projectToSiteView, type SiteView } from '../lib/studio/content-view';
import type { StudioProjectV1 } from '../lib/studio/types';
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

const SiteContentContext = createContext<SiteView | null>(null);

interface ContentProviderProps {
  project: StudioProjectV1;
  mediaUrls: Record<string, string>;
  children: React.ReactNode;
}

export const ContentProvider: React.FC<ContentProviderProps> = ({ project, mediaUrls, children }) => {
  const view = useMemo(() => projectToSiteView(project, mediaUrls), [project, mediaUrls]);
  return <SiteContentContext.Provider value={view}>{children}</SiteContentContext.Provider>;
};

export function useSiteContent(): SiteView {
  const ctx = useContext(SiteContentContext);
  if (!ctx) {
    throw new Error('useSiteContent 必须在 ContentProvider 内使用。');
  }
  return ctx;
}

export function useHomeContent(lang?: Language): SiteHomeContent {
  const { lang: ctxLang } = useLanguage();
  return useSiteContent().home[lang || ctxLang];
}

export function useResumeContent(lang?: Language): SiteResumeContent {
  const { lang: ctxLang } = useLanguage();
  return useSiteContent().resume[lang || ctxLang];
}

export function useContactContent(lang?: Language): SiteContactContent {
  const { lang: ctxLang } = useLanguage();
  return useSiteContent().contact[lang || ctxLang];
}

export function useSharedContent(): SiteSharedContent {
  return useSiteContent().shared;
}

export function useSkillsContent(): SiteSkillsContent {
  return useSiteContent().skills;
}

export function useAllProjects(): Project[] {
  return useSiteContent().projects;
}

export function usePublishedProjects(): Project[] {
  return useSiteContent().publishedProjects;
}

export function useBlogArticles(): BlogArticle[] {
  return useSiteContent().blogArticles;
}

export function useBlogCategories(): BlogCategory[] {
  return useSiteContent().blogCategories;
}

export function useSiteConfig(): SiteConfig {
  return useSiteContent().siteConfig;
}

export function useProjectTheme(): Record<string, any> {
  return useSiteContent().theme;
}
