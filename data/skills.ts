/**
 * [INPUT]   : 技能名称、分组信息与 Logo 资源路径
 * [OUTPUT]  : skillsData 数组，供技能区和弹窗统一消费
 * [POS]     : 数据层，集中管理技能工具信息
 * [DECISION]: 将技能数据与展示组件解耦，后续新增工具或调整分组时只需要修改数据源
 */

export interface SkillTool {
    id: string;
    name: string;
    logoColor: string;
    logoMono: string;
}

export type SkillCategoryTitleKey = 'analysis' | 'design' | 'implementation';

export interface SkillCategory {
    id: string;
    titleKey: SkillCategoryTitleKey;
    tools: SkillTool[];
}

export const skillsData: SkillCategory[] = [
    {
        id: 'analysis',
        titleKey: 'analysis',
        tools: [
            { id: 'processon', name: 'ProcessOn', logoColor: '/Logo/color/ProcessOn.svg', logoMono: '/Logo/nocolor/ProcessOn.svg' },
            { id: 'feishu', name: '飞书', logoColor: '/Logo/color/feishu.svg', logoMono: '/Logo/nocolor/feishu.svg' },
            { id: 'notion', name: 'Notion', logoColor: '/Logo/color/notion.svg', logoMono: '/Logo/nocolor/notion.svg' },
            { id: 'chatgpt', name: 'ChatGPT', logoColor: '/Logo/color/gpt.svg', logoMono: '/Logo/nocolor/gpt.svg' },
            { id: 'gemini', name: 'Gemini', logoColor: '/Logo/color/gemini.svg', logoMono: '/Logo/nocolor/gemini.svg' },
        ]
    },
    {
        id: 'design',
        titleKey: 'design',
        tools: [
            { id: 'figma', name: 'Figma', logoColor: '/Logo/color/figma.svg', logoMono: '/Logo/nocolor/figma.svg' },
            { id: 'dify', name: 'Dify', logoColor: '/Logo/color/dify.svg', logoMono: '/Logo/nocolor/dify.svg' },
            { id: 'n8n', name: 'N8N', logoColor: '/Logo/color/n8n.svg', logoMono: '/Logo/nocolor/n8n.svg' },
            { id: 'coze', name: 'Coze', logoColor: '/Logo/color/coze.svg', logoMono: '/Logo/nocolor/coze.svg' },
            { id: 'ps', name: 'Photoshop', logoColor: '/Logo/color/Photoshop.svg', logoMono: '/Logo/nocolor/Photoshop.svg' },
        ]
    },
    {
        id: 'implementation',
        titleKey: 'implementation',
        tools: [
            { id: 'antigravity', name: 'Antigravity', logoColor: '/Logo/color/Antigravity.svg', logoMono: '/Logo/nocolor/Antigravity.svg' },
            { id: 'github', name: 'GitHub', logoColor: '/Logo/color/github.svg', logoMono: '/Logo/nocolor/github.svg' },
            { id: 'supabase', name: 'Supabase', logoColor: '/Logo/color/supabase.svg', logoMono: '/Logo/nocolor/supabase.svg' },
            { id: 'vercel', name: 'Vercel', logoColor: '/Logo/color/Versel.svg', logoMono: '/Logo/nocolor/Versel.svg' },
        ]
    }
];

