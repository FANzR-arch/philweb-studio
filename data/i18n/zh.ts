/**
 * [INPUT]   : 无
 * [OUTPUT]  : 中文翻译对象
 * [POS]     : i18n 数据层
 * [DECISION]: 轻量级方案，不引入重型 i18n 库
 */

export const zh = {
    // 顶部导航文案
    nav: {
        work: '作品',
        profile: '关于',
        contact: '联系',
    },

    // 侧边栏个人信息文案
    sidebar: {
        name: '林小满 Momo',
        title: 'AI Native 产品构建',
        subtitle: 'AI Native 产品&工程 · Agent 设计 · 自动化流程',
        tag1: '98 · INTP',
        tag2: 'Agent & Workflow',
        tag3: 'Vibe Coding',
        tag4: '系统思维',
        background: 'Agent设计 / 自动化流程 / Claude Code / Vibe Coding',
        role1: 'AI Native Engineer',
        role1Desc: 'Agent 设计与流程搭建',
        role2: 'AI Product Builder',
        role2Desc: 'Vibe Coding 全栈交付',
        explore: '查看简历',
        philosophy: [
            '用户价值优先：解决真实问题',
            '需求场景化：先目标，再方案',
            '快速迭代：用数据和反馈修正方向'
        ],
        motto: '逻辑驱动视觉，AI 辅助生产',
        transition: '',
        // 当前侧边栏版式使用的扩展字段
        targetRoleValue: 'AI Native 产品经理',
        targetCityValue: '重庆',
        age: '',
        mbti: 'INTP',
        experience: '3年设计+1年AI协作经验',
        profileStatement: '专注 Agent 架构设计，也长期使用 Vibe Coding，把需求判断、界面和实现一起跑通。',
        skillList: [
            'Agent 设计与治理',
            '流程搭建与任务拆解',
            'Vibe coding协作开发与交付',
        ],
        skillTags: ['Agent 设计', '自动化流程', 'AI 辅助开发', 'Claude Code'],
        targetDirection: 'AI Native 工程&产品',
    },

    // 顶部问候区文案
    intro: {
        title: '把想法做成可访问的 AI 产品',
        subtitle: '问题 -> 原型 -> MVP。',
        description: '面向团队与合伙人，专注高质量问题定义和快速交付。',
    },

    // 项目与时间轴文案
    projects: {
        title: '实践成果',
        subtitle: '围绕真实问题做需求拆解、方案设计和产品实现',
        clickHint: '点击项目可查看案例与复盘。',
        timelineTitle: '探索历程',
        timeline: [
            {
                id: 'timeline-1',
                icon: 'hub',
                period: '2022 - 2023',
                title: '逻辑建模与系统思维',
                keywords: ['参数化建模', '系统思维'],
                detail: '拆解复杂设计任务，引入工程化工具优化产出周期，建立底层逻辑推演能力。',
            },
            {
                id: 'timeline-2',
                icon: 'auto_awesome',
                period: '2023 - 2024',
                title: 'AI工具应用探索',
                keywords: ['GPT/SD', '创意辅助'],
                detail: '把 LLM 和多模态工具用在创意、表达和日常效率场景里，先做小实验再判断方向。',
            },
            {
                id: 'timeline-3',
                icon: 'rocket_launch',
                period: '2024 - 2025 Q1',
                title: 'AI 流程实践',
                keywords: ['流程搭建', 'Agent设计'],
                detail: '把 AI 工具接到真实业务里，整理提示词边界、任务拆分和检查方式。',
            },
            {
                id: 'timeline-4',
                icon: 'trending_up',
                period: '2025 Q2 - 至今',
                title: '独立 AI 产品构建',
                keywords: ['RAG/Agent', '独立开发'],
                detail: '独立做过多款小产品，从需求判断、界面到上线都自己跑一遍，用 Vibe Coding 加快试错。',
            },
        ],
        role: '角色',
        outcome: '成果',
        year: '年份',
        viewLink: '查看链接',
        moreContent: '更多图文、视频展示内容待补充...',
        updated: '更新时间',
    },

    // 项目卡片与详情页数据
    projectData: {
        flowcard: {
            title: '灵感卡片 FlowCard',
            subtitle: '把灵感碎片整理成卡片盒',
            problemLine: '灵感散落在截图、备忘录和聊天记录里，要用的时候找不到',
            description: '把随手保存的截图和文字自动整理成带标签的灵感卡片。',
            role: '独立设计与开发',
            outcome: '灵感整理小工具',
            tags: ['AI 整理', '灵感管理', '独立产品'],
        },
        'palette-lab': {
            title: '配色实验室 Palette Lab',
            subtitle: '输入品牌关键词，生成成套配色',
            problemLine: '提案要配色方案时，反复试色浪费大量时间',
            description: '输入行业与气质关键词，自动生成完整品牌配色并做对比度检查。',
            role: '独立设计与开发',
            outcome: '品牌配色生成器',
            tags: ['配色系统', '设计工具', '无障碍'],
        },
    },

    // 技能区文案
    skills: {
        title: '实践矩阵',
        subtitle: '以产品系统思维拆任务，用工具辅助判断和交付',
        categories: {
            analysis: '需求分析 & 规划',
            design: '产品设计 & 原型',
            implementation: '技术验证 & 交付',
        }
    },

    // 简历与个人经历文案
    profile: {
        title: '个人简历',
        tagline: '聚焦 AI 工具应用与产品验证',
        careerTitle: '探索历程',
        careerNow: '2025 至今',
        careerNowRole: 'Agent设计 / 自动化流程 / Vibe Coding 交付',
        careerBefore: '2025 之前',
        careerBeforeRole: '复杂任务拆解 / 协同推进 / 方案表达',
        strengthsTitle: '核心能力',
        strength1: 'Agent 治理',
        strength1Desc: '让 Agent 稳定跑起来，不只是能聊天',
        strength2: '流程搭建',
        strength2Desc: '任务拆解、工具调用链设计、结果校验',
        strength3: 'Vibe Coding',
        strength3Desc: 'Claude Code 为主力，独立全栈交付',
    },

    // 联系方式文案
    contact: {
        title: '联系',
        social: '社交平台',
        wechat: '微信',
        wechatAction: '扫码添加',
        xiaohongshu: '小红书',
        xiaohongshuAction: '扫码关注',
    },

    // 简历弹窗文案
    resume: {
        title: '个人简历',
        summary: '一句话定位',
        summaryText: '聚焦 AI 工具应用与产品验证。',
        experience: '探索历程与实践成果',
        exp1Title: '需求分析 / 原型设计 / MVP 验证',
        exp1Time: '持续实践中',
        exp1Company: 'AI Product Manager',
        exp2Title: '简历预览',
        exp2Time: '站内查看',
        skillsTitle: '核心能力',
        contactMe: '联系方式',
        updated: '更新时间',
    },

    // 快捷入口文案
    quickLinks: {
        caseStudies: '案例',
        thinking: '方法',
        interviewPack: '合作路径',
        contact: '联系我',
    },

    // 求职意向数据
    careerIntent: {
        title: '求职意向',
        subtitle: '聚焦 AI 工具应用与产品验证。',
        target: {
            label: '目标岗位',
            value: 'AI Native 产品经理',
        },
        availability: {
            label: '到岗时间',
            value: '可沟通',
        },
        location: {
            label: '目标城市',
            value: '重庆 / 上海 / 深圳 / 杭州',
        },
        keywords: {
            label: '关键词',
            values: ['Agent 设计', '自动化流程', 'AI 辅助开发'],
        },
    },

    // 页脚文案
    footer: {
        copyright: '林小满 Momo',
        style: 'AI PRODUCTS · WORKFLOW SYSTEMS · DESIGN THINKING',
    },
};

export type Translations = typeof zh;
