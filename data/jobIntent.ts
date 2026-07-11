import { Language } from './i18n';

export interface JobIntentContent {
  title: string;
  targetRoleLabel: string;
  targetRoleValue: string;
  availabilityLabel: string;
  availabilityValue: string;
  preferredCityLabel: string;
  preferredCityValue: string;
  keywordsLabel: string;
  keywords: string[];
  summary: string;
  contactCta: string;
}

export const jobIntent: Record<Language, JobIntentContent> = {
  zh: {
    title: '求职意向',
    targetRoleLabel: '目标岗位',
    targetRoleValue: 'AI Native 产品经理',
    availabilityLabel: '可入职时间',
    availabilityValue: '随时',
    preferredCityLabel: '期望城市',
    preferredCityValue: '重庆 / 上海 / 深圳 / 杭州',
    keywordsLabel: '能力关键词',
    keywords: ['Agent 设计', '自动化流程', 'Vibe Coding & Claude Code'],
    summary: '默认与 AI 协作开发，擅长 Agent 流程设计、任务拆解和小产品交付。',
    contactCta: '联系我',
  },
  en: {
    title: 'Job Intent',
    targetRoleLabel: 'Target Role',
    targetRoleValue: 'AI Native Product Manager',
    availabilityLabel: 'Availability',
    availabilityValue: 'Immediately',
    preferredCityLabel: 'Preferred City',
    preferredCityValue: 'Chongqing / Shanghai / Shenzhen',
    keywordsLabel: 'Keywords',
    keywords: ['Agent Design & Governance', 'Workflow Orchestration', 'Vibe Coding & Claude Code'],
    summary: 'AI-native development by default. Focused on Agent design, task breakdown, and shipping small product versions.',
    contactCta: 'Contact',
  },
};
