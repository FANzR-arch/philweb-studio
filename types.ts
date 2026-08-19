/**
 * [INPUT]   : 无外部运行时依赖，仅维护共享类型声明
 * [OUTPUT]  : 全局类型定义，如 ModalType 与 Project
 * [POS]     : 类型层，供组件、数据模块与脚本共用
 * [DECISION]: 将跨模块类型集中管理，减少重复声明和潜在的循环依赖
 */

export enum ModalType {
  NONE = 'NONE',
  PROJECTS = 'PROJECTS',
  PROFILE = 'PROFILE',
  CONTACT = 'CONTACT',
  TIMELINE = 'TIMELINE',
  SKILLS = 'SKILLS',
}

export type ProjectId = string;

export interface ProjectMetric {
  key: 'views' | 'engagement' | 'comments';
  value: string;
  asOf?: string;
}

export interface ProjectStatus {
  zh: string;
  en: string;
  tone: 'live' | 'beta' | 'stable' | 'progress';
}

export interface ProjectCta {
  web?: string;
  desktopMode?: 'public' | 'coming_soon';
  desktopUrl?: string;
}

export interface CaseStudySection {
  context?: string;
  problem: string[];
  responsibilities?: string[];
  goal?: string;
  solution: string;
  design?: string[];
  workflow?: string;
  mvp?: string;
  impact?: string[];
  reflection?: {
    pros: string[];
    cons: string[];
  };
}

export interface ProjectProofLink {
  label: string;
  url: string;
}

export interface ProjectExperiment {
  title: string;
  tag?: string;
  image?: string;
  description: string;
  linkLabel?: string;
  url?: string;
}

export interface ProjectLocaleContent {
  title: string;
  subtitle: string;
  problemLine?: string;
  description: string;
  keywords?: string[];
  detailImages?: string[];
  experiments?: ProjectExperiment[];
  caseStudy?: CaseStudySection;
  body?: string;
}

export interface ProjectDocs {
  prd?: string;
  userGuide?: string;
  techSpec?: string;
}

export interface ProjectAssets {
  coverLight?: string;
  coverDark?: string;
}

export interface Project {
  id: ProjectId;
  title: string;
  subtitle: string;
  problemLine?: string;
  year: string;
  role: string;
  outcome: string;
  description: string;
  icon: string;
  themeColor?: string;
  link?: string;
  webLink?: string;
  prd?: string;
  userGuide?: string;
  cover?: string;
  detailImages?: string[];
  techSpec?: string;
  version?: string;
  status?: ProjectStatus;
  positioningLine?: string;
  keywords?: string[];
  proofLink?: ProjectProofLink;
  nextStep?: string;
  validationStatus?: string;
  cta?: ProjectCta;
  isPrimary?: boolean;
  order?: number;
  published?: boolean;
  assets?: ProjectAssets;
  docs?: ProjectDocs;
  locales?: {
    zh: ProjectLocaleContent;
    en: ProjectLocaleContent;
  };
  caseStudy?: {
    zh: CaseStudySection;
    en: CaseStudySection;
  };
}

export interface BrandPositioning {
  who_i_help: string;
  core_value: string;
  method_statement: string;
  cta_primary: string;
}

export interface ServiceOffer {
  target_user: string[];
  deliverables: string[];
  workflow: string[];
  fit_or_not_fit: {
    fit: string[];
    not_fit: string[];
  };
}

export interface MethodStep {
  step: string;
  input: string;
  output: string;
  evidence: string;
}

export interface SkillItem {
  name: string;
  bg: string;
  color: string;
  short: string;
}

export interface SkillCategory {
  title: string;
  items: SkillItem[];
  description?: string;
}

export interface SiteHomeMetric {
  label: string;
  value: string;
  icon?: string;
}

export interface SiteTimelineItem {
  id: string;
  icon: string;
  period: string;
  title: string;
  keywords: string[];
  detail: string;
}

export interface SiteHomeContent {
  hero: {
    greeting: string;
    description: string;
  };
  sidebar: {
    name: string;
    targetRoleValue: string;
    targetCityValue: string;
    age: string;
    mbti: string;
    experience: string;
    profileStatement: string;
    skillList: string[];
    skillIcons: string[];
    skillTags: string[];
    explore: string;
  };
  projectSection: {
    title: string;
    subtitle?: string;
  };
  timeline: {
    title: string;
    subtitle?: string;
    items: SiteTimelineItem[];
  };
  quickLinks: {
    contact: string;
    blog: string;
  };
  interviewerPath: {
    title: string;
    subtitle: string;
    methodLabel: string;
    casesLabel: string;
  };
  footer: {
    copyright: string;
    style: string;
  };
  metrics: SiteHomeMetric[];
}

export interface SiteResumeBasicItem {
  label: string;
  value: string;
}

export interface SiteResumeExperience {
  company: string;
  role: string;
  period: string;
  bullets: string[];
}

export interface SiteResumeContent {
  heading: string;
  name: string;
  summary: string;
  statement: string;
  basicsTitle: string;
  strengthsTitle: string;
  workTitle: string;
  projectTitle: string;
  updatedLabel: string;
  updatedAt: string;
  featuredProjectIds: string[];
  basics: SiteResumeBasicItem[];
  strengths: string[];
  experiences: SiteResumeExperience[];
  projectRoleValues: Record<string, string>;
  projectBullets: Record<string, string[]>;
}

export interface SiteContactChannel {
  id: string;
  label: string;
  value: string;
  linkKey: string;
}

export interface BlogCategory {
  id: string;
  title: {
    zh: string;
    en: string;
  };
  description?: {
    zh: string;
    en: string;
  };
}

export interface BlogArticle {
  id: string;
  title: string;
  summary: string;
  cover?: string;
  wechat?: string;
  twitter?: string;
  categoryId?: string;
  date?: string;
  order?: number;
}

export interface SiteContactContent {
  wechatCardTitle: string;
  wechatDescription: string;
  wechatIdLabel: string;
  copyLabel: string;
  copiedLabel: string;
  scanHint: string;
  channels: SiteContactChannel[];
}

export interface SkillLogoTool {
  id: string;
  name: string;
  logoColor?: string;
  logoMono?: string;
}

export interface SkillDashboardCategory {
  id: string;
  title: {
    zh: string;
    en: string;
  };
  tools: SkillLogoTool[];
}

export interface SiteSkillsContent {
  dashboard: {
    title: {
      zh: string;
      en: string;
    };
    subtitle: {
      zh: string;
      en: string;
    };
    categories: SkillDashboardCategory[];
  };
  modal: {
    intro: {
      zh: string;
      en: string;
    };
    categories: SkillCategory[];
  };
}

export interface SiteSharedContent {
  person: {
    displayName: string;
    legalName: string;
  };
  links: {
    wechatId: string;
    x: string;
    xiaohongshu: string;
    github: string;
    email: string;
  };
  assets: {
    avatarLight?: string;
    avatarDark?: string;
    wechatQr?: string;
    brandMark?: string;
    backgroundImage?: string;
    backgroundVideo?: string;
  };
}

export interface SiteContent {
  shared: SiteSharedContent;
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
  skills: SiteSkillsContent;
}

export interface SiteAttributionConfig {
  enabled: boolean;
  labelZh: string;
  labelEn: string;
  url: string;
}

export interface SiteConfig {
  attribution: SiteAttributionConfig;
}

export interface ContentRegistry {
  site: SiteContent;
  siteConfig: SiteConfig;
  projects: Project[];
  blogCategories: BlogCategory[];
  blog: BlogArticle[];
}
