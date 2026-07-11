/**
 * [INPUT]   : Project 类型、项目原始数据与国际化文案对象
 * [OUTPUT]  : 统一的项目展示字段，供 UI 组件直接消费
 * [POS]     : 数据层辅助模块，负责整理项目展示所需的最终文案
 * [DECISION]: 将 i18n fallback 逻辑集中在数据层处理，避免展示组件夹杂大量兜底判断
 */

import { Project } from '../types';
import type { Language, Translations } from './i18n';

export interface ProjectDisplay {
  title: string;
  subtitle: string;
  problemLine: string;
  description: string;
  tags: string[];
}

const getLocalizedProjectData = (projectId: Project['id'], t: Translations) => t.projectData[projectId];

export const getProjectDisplay = (project: Project, langOrTranslations: Language | Translations): ProjectDisplay => {
  if (typeof langOrTranslations === 'string' && project.locales?.[langOrTranslations]) {
    const localized = project.locales[langOrTranslations];
    return {
      title: localized.title,
      subtitle: localized.subtitle,
      problemLine: localized.problemLine || '',
      description: localized.description,
      tags: localized.keywords || [],
    };
  }

  const t = langOrTranslations as Translations;
  const localized = getLocalizedProjectData(project.id, t);

  return {
    title: localized?.title || project.title,
    subtitle: localized?.subtitle || project.subtitle,
    problemLine: localized?.problemLine || project.problemLine || '',
    description: localized?.description || project.description,
    tags: project.keywords && project.keywords.length > 0 ? project.keywords : localized?.tags || [],
  };
};
