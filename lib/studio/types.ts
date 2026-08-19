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
} from '../../types';

export const STUDIO_SCHEMA_VERSION = 1 as const;

export type MediaKind = 'image' | 'video';
export type MediaSource = 'builtin' | 'user' | 'export';

export interface MediaRecord {
  id: string;
  kind: MediaKind;
  mime: string;
  filename: string;
  source: MediaSource;
  bytes?: number;
}

export type MediaManifest = Record<string, MediaRecord>;

export interface StudioBasic {
  wechatId: string;
  x: string;
  xiaohongshu: string;
  github: string;
  email: string;
  socialText: {
    x: string;
    xiaohongshu: string;
    github: string;
  };
  avatarLight?: string;
  avatarDark?: string;
  wechatQr?: string;
  brandMark?: string;
}

export interface SiteFlags {
  attributionEnabled: boolean;
  labelZh: string;
  labelEn: string;
  url: string;
}

export interface StylePack {
  id: string;
  name: string;
  font?: string;
  accentLight: string;
  accentDark: string;
  pageLight: string;
  pageDark: string;
  radius: number;
  aurora: number;
  fontPreset: 'modern' | 'serif' | 'wenkai' | string;
  density: 'compact' | 'normal' | 'relaxed' | string;
  shadowStyle: 'soft' | 'hard' | 'none' | string;
  float: boolean;
  glass?: boolean;
  tints: Record<string, string>;
}

export interface EditorChecklistState {
  hidden: boolean;
  exported: boolean;
  themeSaved: boolean;
}

export interface StudioEditorState {
  checklist: EditorChecklistState;
  customPacks: StylePack[];
  contentLang: 'zh' | 'en';
}

export interface StudioBlogState {
  categories: BlogCategory[];
  posts: BlogArticle[];
}

export interface StudioProjectV1 {
  schemaVersion: typeof STUDIO_SCHEMA_VERSION;
  projectId: string;
  createdAt: string;
  updatedAt: string;
  basic: StudioBasic;
  siteConfig: SiteConfig;
  home: {
    zh: SiteHomeContent;
    en: SiteHomeContent;
  };
  resume: {
    zh: SiteResumeContent;
    en: SiteResumeContent;
  };
  contact: {
    zh: SiteContactContent;
    en: SiteContactContent;
  };
  shared: SiteSharedContent;
  skills: SiteSkillsContent;
  theme: Record<string, any>;
  projects: Project[];
  blog: StudioBlogState;
  siteFlags: SiteFlags;
  editor: StudioEditorState;
  mediaManifest: MediaManifest;
}

export type StudioProject = StudioProjectV1;

export interface ValidationIssue {
  code: string;
  message: string;
  field?: string;
  tab?: string;
  lang?: 'zh' | 'en';
  file?: string;
  marker?: string;
}

export interface MigrateResult {
  ok: boolean;
  project?: StudioProjectV1;
  reason?: string;
  issues?: ValidationIssue[];
}

export type SaveStatus = 'loading' | 'clean' | 'dirty' | 'saving' | 'saved' | 'error';

export type StudioTab =
  | 'basic'
  | 'home'
  | 'resume'
  | 'contact'
  | 'skills'
  | 'theme'
  | 'projects'
  | 'blog'
  | 'help';

export type PreviewMode = 'desktop' | 'mobile';
export type InteractionMode = 'edit' | 'preview';
export type ContentLang = 'zh' | 'en';
