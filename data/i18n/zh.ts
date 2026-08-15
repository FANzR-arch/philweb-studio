/**
 * [INPUT]   : 项目内容的可选兜底结构
 * [OUTPUT]  : 轻量项目展示类型
 * [POS]     : 数据层兼容入口；正常项目优先使用 content/ 中的中英文内容
 */

export interface ProjectFallback {
    title: string;
    subtitle: string;
    problemLine?: string;
    description: string;
    tags?: string[];
}

export interface Translations {
    projectData: Record<string, ProjectFallback>;
}

export const zh: Translations = {
    projectData: {},
};

export type { Translations as TranslationDictionary };
