/**
 * [INPUT]   : zh.ts 的类型
 * [OUTPUT]  : 英文翻译对象
 * [POS]     : i18n 数据层
 * [DECISION]: 与中文结构完全一致
 */

import { Translations } from './zh';

export const en: Translations = {
    // 顶部导航文案
    nav: {
        work: 'Work',
        profile: 'Profile',
        contact: 'Contact',
    },

    // 侧边栏个人信息文案
    sidebar: {
        name: 'Momo Lin',
        title: 'AI Native Engineering & MVP Builder',
        subtitle: 'AI Native Product & Engineering · Agent Design · Automation Flows',
        tag1: '98 · INTP',
        tag2: 'Agent & Workflow',
        tag3: 'Vibe Coding',
        tag4: 'Systems',
        background: 'Agent Design / Automation Flows / Claude Code / Vibe Coding',
        role1: 'AI Native Engineer',
        role1Desc: 'Agent Design and Process Setup',
        role2: 'AI Product Builder',
        role2Desc: 'Vibe Coding Full-stack Delivery',
        explore: 'View Resume',
        philosophy: [
            'User Value First: Solve Real Problems',
            'Scenario-Driven: Goals Before Solutions',
            'Fast Iteration: Data and Feedback'
        ],
        motto: 'Logic Drives Vision, AI Powers Production',
        transition: '',
        // 当前侧边栏版式使用的扩展字段
        targetRoleValue: 'AI Native Product Manager',
        targetCityValue: 'Chongqing',
        age: '',
        mbti: 'INTP',
        experience: '3 yrs Design + 1 yr AI Collaboration',
        profileStatement: 'Focused on Agent architecture and daily Vibe Coding practice, from problem judgment and UI to a working product.',
        skillList: [
            'Agent Design & Governance',
            'Process Design and Task Breakdown',
            'Vibe Coding Full-stack Delivery',
        ],
        skillTags: ['Agent Design', 'Automation Flows', 'AI-assisted Dev', 'Claude Code'],
        targetDirection: 'AI Native Product & Engineering',
    },

    // 顶部问候区文案
    intro: {
        title: 'Turn Ideas into Usable AI Products',
        subtitle: 'Problem -> Prototype -> MVP.',
        description: 'Providing shippable execution support for founders and teams.',
    },

    // 项目与时间轴文案
    projects: {
        title: 'Practice Outcomes',
        subtitle: 'Requirement framing, solution design, and product building around real problems.',
        clickHint: 'Click on a project to view case studies and reviews.',
        timelineTitle: 'Exploration Journey',
        timeline: [
            {
                id: 'timeline-1',
                icon: 'hub',
                period: '2022 - 2023',
                title: 'Logic Modeling & System Thinking',
                keywords: ['Parametric', 'System Thinking'],
                detail: 'Built task breakdown and logic-modeling habits through parametric design and complex presentation work.',
            },
            {
                id: 'timeline-2',
                icon: 'auto_awesome',
                period: '2023 - 2024',
                title: 'AI Tool Application Exploration',
                keywords: ['GPT/SD', 'Creative Aide'],
                detail: 'Used LLMs and multimodal tools in creative work, writing, and daily productivity. Small tests came before bigger decisions.',
            },
            {
                id: 'timeline-3',
                icon: 'rocket_launch',
                period: '2024 - 2025 Q1',
                title: 'AI Process Practice',
                keywords: ['Process Design', 'Agent Design'],
                detail: 'Brought AI tools into real work, then wrote down prompt boundaries, task breakdowns, and checking steps.',
            },
            {
                id: 'timeline-4',
                icon: 'trending_up',
                period: '2025 Q2 - Present',
                title: 'AI Product Building',
                keywords: ['RAG/Agent', 'Solo Build'],
                detail: 'Built several small products end to end, from problem judgment and UI to launch. Vibe Coding keeps the trial cycle short.',
            },
        ],
        role: 'Role',
        outcome: 'Outcome',
        year: 'Year',
        viewLink: 'View Link',
        moreContent: 'More images and videos coming soon...',
        updated: 'Updated',
    },

    // 项目卡片与详情页数据
    projectData: {
        flowcard: {
            title: 'FlowCard',
            subtitle: 'Turn scattered inspiration into a card box',
            problemLine: 'Inspiration scatters across screenshots and notes, and is lost when needed',
            description: 'Automatically organizes saved screenshots and notes into tagged inspiration cards.',
            role: 'Solo design & development',
            outcome: 'An inspiration organizing tool',
            tags: ['AI Organizing', 'Inspiration', 'Side Project'],
        },
        'palette-lab': {
            title: 'Palette Lab',
            subtitle: 'Brand keywords in, complete color scheme out',
            problemLine: 'Building proposal palettes by trial and error wastes hours',
            description: 'Generates complete brand palettes from keywords with built-in contrast checks.',
            role: 'Solo design & development',
            outcome: 'A brand palette generator',
            tags: ['Color Systems', 'Design Tools', 'Accessibility'],
        },
    },

    // 技能区文案
    skills: {
        title: 'Action Matrix',
        subtitle: 'Use product thinking to break down tasks, then use tools to support decisions and delivery.',
        categories: {
            analysis: 'Requirement Analysis & Planning',
            design: 'Product Design & Prototyping',
            implementation: 'Technical Validation & Delivery',
        }
    },

    // 简历与个人经历文案
    profile: {
        title: 'Resume',
        tagline: 'Focused on AI tool applications and product validation',
        careerTitle: 'Exploration Journey',
        careerNow: '2025 - Present',
        careerNowRole: 'Agent Design / Automation Flows / Vibe Coding Delivery',
        careerBefore: 'Before 2025',
        careerBeforeRole: 'Complex task breakdown / coordination / solution expression',
        strengthsTitle: 'Core Strengths',
        strength1: 'Agent Governance',
        strength1Desc: 'Make Agents run reliably, not just chat',
        strength2: 'Process Design',
        strength2Desc: 'Task breakdown, tool chaining, and result checks',
        strength3: 'Vibe Coding',
        strength3Desc: 'Claude Code as primary tool, full-stack solo delivery',
    },

    // 联系方式文案
    contact: {
        title: 'Contact',
        social: 'Social Platforms',
        wechat: 'WeChat',
        wechatAction: 'Scan to add',
        xiaohongshu: 'Xiaohongshu',
        xiaohongshuAction: 'Scan to follow',
    },

    // 简历弹窗文案
    resume: {
        title: 'Resume',
        summary: 'One-line Positioning',
        summaryText: 'Focused on AI tool applications and product validation.',
        experience: 'Exploration Journey and Practice Outcomes',
        exp1Title: 'Requirement Analysis / Prototype Design / MVP Validation',
        exp1Time: 'Ongoing Practice',
        exp1Company: 'AI Product Manager',
        exp2Title: 'Resume View',
        exp2Time: 'In-app',
        skillsTitle: 'Core Capabilities',
        contactMe: 'Contact',
        updated: 'Updated',
    },

    // 快捷入口文案
    quickLinks: {
        caseStudies: 'Case Studies',
        thinking: 'Method',
        interviewPack: 'Cooperation Path',
        contact: 'Contact Me',
    },

    // 求职意向数据
    careerIntent: {
        title: 'Job Intent',
        subtitle: 'Focused on AI tool applications and product validation.',
        target: {
            label: 'Target Role',
            value: 'AI Native Product Manager',
        },
        availability: {
            label: 'Availability',
            value: 'Open to discuss',
        },
        location: {
            label: 'Target City',
            value: 'Chongqing / Shanghai / Shenzhen',
        },
        keywords: {
            label: 'Keywords',
            values: ['Agent Design', 'Automation Flows', 'Vibe Coding'],
        },
    },

    // 页脚文案
    footer: {
        copyright: 'Momo Lin',
        style: 'AI PRODUCTS · WORKFLOW SYSTEMS · DESIGN THINKING',
    },
};
