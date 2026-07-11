/**
 * [INPUT]   : Language 类型与品牌叙事所需的静态文案
 * [OUTPUT]  : 品牌核心文案对象，供首页与合作路径模块复用
 * [POS]     : 数据层，集中管理品牌定位、方法论及个人简介
 * [DECISION]: 抽离核心业务文案并统一多语言口径，避免不同组件各写一套品牌表达
 */

import { Language } from './i18n';
import { BrandPositioning, MethodStep, ServiceOffer } from '../types';

export interface BrandOfferContent {
  hero: {
    greeting: string;
    title: string;
    subtitle: string;
    description: string;
    primaryCta: string;
    secondaryCta: string;
    tertiaryCta: string;
  };
  brandPositioning: BrandPositioning;
  method: {
    title: string;
    subtitle: string;
    steps: MethodStep[];
  };
  service: ServiceOffer & {
    title: string;
    subtitle: string;
  };
  profile: {
    title: string;
    statement: string;
    story: string[];
    metrics: {
      label: string;
      value: string;
      icon?: string;
    }[];
    experience: {
      title: string;
      items: {
        title: string;
        content: string;
      }[];
    };
    devExperience: {
      title: string;
      items: {
        title: string;
        subtitle: string;
        link: string;
        content: string;
      }[];
    };
    closing: string;
  };
  deck: {
    title: string;
    subtitle: string;
    contactHint: string;
  };
}

export const brandOffer: Record<Language, BrandOfferContent> = {
  zh: {
    hero: {
      greeting: 'AI Native 产品构建',
      title: '把 AI 接进真实业务链路',
      subtitle: 'Agent 设计 + 自动化流程 + Vibe Coding',
      description: '把 Agent 流程、自动化和 Vibe Coding 接到真实项目里。',
      primaryCta: '与我联系',
      secondaryCta: '核心案例',
      tertiaryCta: '方法全景',
    },
    brandPositioning: {
      who_i_help: '服务对象：正在探索 AI 产品方向的创业团队、业务负责人、独立创作者。',
      core_value: '价值：在有限时间内把模糊需求做成可试用的产品版本。',
      method_statement: '方法主张：问题-方法-证据-结果，先验证价值，再扩展规模。',
      cta_primary: '先加微信，快速判断是否值得深聊。',
    },
    method: {
      title: '方法路径',
      subtitle: '洞察 -> 方案 -> MVP 验证',
      steps: [
        {
          step: '01 需求洞察',
          input: '访谈、业务现状、目标用户场景',
          output: '问题定义、机会假设、优先级清单',
          evidence: '用户反馈、竞品拆解、任务路径复盘',
        },
        {
          step: '02 方案设计',
          input: '目标指标、约束条件、可用资源',
          output: 'PRD、信息架构、关键交互原型',
          evidence: '方案评审记录、范围边界、版本计划',
        },
        {
          step: '03 MVP 验证',
          input: '可执行开发路径、测试场景',
          output: '可用原型/上线版本、迭代清单',
          evidence: '上线数据、用户反馈、下一轮迭代决策',
        },
      ],
    },
    service: {
      title: '合作对象与交付',
      subtitle: '不做泛泛咨询，只做可落地的产品推进。',
      target_user: ['0-1 产品探索团队', '希望快速验证 AI 方向的业务方', '需要把点子转为 MVP 的创始人'],
      deliverables: ['问题定义与策略路径', 'PRD + 原型 + 验证方案', 'MVP 上线与迭代决策支持'],
      workflow: ['需求对齐（30-60 分钟）', '方案共创（1-2 周）', 'MVP 验证（2-6 周）'],
      fit_or_not_fit: {
        fit: ['目标明确，愿意快速试错', '可以提供真实业务场景', '接受小步快跑迭代'],
        not_fit: ['只要 PPT 不做验证', '需求范围长期不收敛', '无业务配合资源'],
      },
    },
    profile: {
      title: '个人简历',
      statement: '聚焦 AI 工具应用与产品验证。',
      story: [
        'Agent 设计与治理',
        '流程搭建与业务拆解',
        'Vibe coding协作开发与交付'
      ],
      metrics: [
        { label: '独立开发产品', value: '3款', icon: 'apps' },
        { label: '交付周期缩短', value: '~50%', icon: 'bolt' },
        { label: '总曝光', value: '10M+', icon: 'visibility' },
        { label: 'X 平台关注者', value: '7k', icon: 'groups' }
      ],
      experience: {
        title: '探索历程',
        items: [
          {
            title: '独立AI产品实践 ｜ AINative (2025.07 - 至今)',
            content: '独立完成 3 款产品的需求定义、Agent / 流程设计、开发与上线。基于 Claude Code + Obsidian 搭建多 Agent 任务路由和内容流水线。在 X 记录 AI 产品实践、产品观察和项目复盘。'
          },
          {
            title: '山东三元建筑设计有限公司 ｜ 项目经理/产品经理 (2025.07 - 2025.11)',
            content: '把 AI 工具接入真实工程任务，主要用于方案推导、表达和执行辅助。兼任高校外聘讲师，辅导学生使用 AI 工具完成方案推导。'
          },
          {
            title: '自然营造（北京）建筑设计事务所有限公司 ｜ 建筑设计师/讲师 (2023.07 - 2025.06)',
            content: '在设计流程中，用参数化工具和系统思维拆解复杂任务，缩短建模与表达周期。也把 AI 工具引入设计和教学场景。'
          }
        ]
      },
      devExperience: {
        title: '实践成果',
        items: [
          {
            title: '画外边框 (RZFrame)',
            subtitle: '照片边框水印美化工具 ｜ AI Native Builder',
            link: 'https://rzframe.pages.dev/',
            content: '围绕一键生成、批量处理和统一版式，砍掉复杂功能。完成从本地原型到 Web 体验的方向切换，并根据反馈调整导出流程和模板策略。'
          },
          {
            title: '枋程设计 (BrianK)',
            subtitle: '建筑概念设计辅助工具 ｜ AI 产品经理',
            link: 'https://www.briank.top/',
            content: '针对概念设计阶段沟通成本高的问题，设计 Agent 多轮追问和 [ready] 就绪信号。先把场地、风格和限制条件问清楚，再触发生成。'
          },
          {
            title: '种子时间 (Seedo)',
            subtitle: 'AI 数字生活习惯记录与复盘工具 ｜ AI Native Builder',
            link: 'https://seedo-bbq.pages.dev/',
            content: '把电脑使用记录和 AI 复盘放在本地完成，连接窗口采集、结构化整理和 AI 分析。'
          }
        ]
      },
      closing: '聚焦 AI 工具应用与产品验证，持续积累从需求分析到 MVP 验证的实践经验。'
    },
    deck: {
      title: '个人简历',
      subtitle: '包含求职意向、探索历程与实践成果。',
      contactHint: '如需进一步材料，可通过联系方式继续沟通。',
    },
  },
  en: {
    hero: {
      greeting: 'AI Native Product Building',
      title: 'Bring AI into Real Work',
      subtitle: 'Agent Design + Automation Flows + Vibe Coding',
      description: 'Agent design, automation, and Vibe Coding applied to real product work.',
      primaryCta: 'Contact Me',
      secondaryCta: 'Core Cases',
      tertiaryCta: 'Methodology',
    },
    brandPositioning: {
      who_i_help: 'Service: For founders, business owners, and creators exploring AI directions.',
      core_value: 'Value: turn vague needs into a usable product version quickly.',
      method_statement: 'Methodology: Problem -> Method -> Evidence -> Result.',
      cta_primary: 'Let\'s connect on WeChat for a quick fit check.',
    },
    method: {
      title: 'Method',
      subtitle: 'Insight -> Solution -> MVP Validation',
      steps: [
        {
          step: '01 Insight',
          input: 'User context and business constraints',
          output: 'Problem definition and opportunity map',
          evidence: 'Interview notes and process reviews',
        },
        {
          step: '02 Solution',
          input: 'Goals, resources, and boundaries',
          output: 'PRD, IA, and key prototypes',
          evidence: 'Review outcomes and scope decisions',
        },
        {
          step: '03 MVP',
          input: 'Build and test plan',
          output: 'Working MVP and iteration backlog',
          evidence: 'Usage feedback and launch signals',
        },
      ],
    },
    service: {
      title: 'Offer',
      subtitle: 'Execution-focused collaboration.',
      target_user: ['0-1 product teams', 'Business owners testing AI directions', 'Founders converting ideas into MVP'],
      deliverables: ['Problem framing and strategy', 'PRD + prototype + validation plan', 'MVP launch and iteration support'],
      workflow: ['Kickoff alignment', 'Solution sprint', 'MVP test'],
      fit_or_not_fit: {
        fit: ['Clear goals', 'Real scenarios', 'Fast iterations'],
        not_fit: ['Slide-only consulting', 'No scope control', 'No collaboration resource'],
      },
    },
    profile: {
      title: 'Resume',
      statement: 'Focused on AI tool applications and product validation.',
      story: [
        'Agent Design: Wrote prompts, state rules, and readiness signals so agents ask before acting.',
        'Process Design: Broke down complex tasks, connected tool actions, and added result checks for real design work.',
        'Vibe Coding Delivery: Use Claude Code, Codex, and Gemini heavily to take small products from UI plans to working versions.'
      ],
      metrics: [
        { label: 'Products\nShipped', value: '3', icon: 'apps' },
        { label: 'Cycle\nReduction', value: '~50%', icon: 'bolt' },
        { label: 'Total\nReach', value: '10M+', icon: 'visibility' },
        { label: 'X Followers', value: '7k', icon: 'groups' }
      ],
      experience: {
        title: 'Exploration Journey',
        items: [
          {
            title: 'Independent AI Product Practice ｜ AINative (2025.07 - Present)',
            content: 'Independently shipped 3 products across requirement definition, Agent / process design, development, and launch. Built multi-Agent task routing and content pipelines with Claude Code + Obsidian. Wrote about AI product practice, product observations, and project reviews on X.'
          },
          {
            title: 'Shandong Sanyuan Architectural Design Co. ｜ Project Manager/Product Manager (2025.07 - 2025.11)',
            content: 'Brought AI tools into architecture and planning tasks for concept work, presentation, and execution support. Served as external university instructor for AI-assisted conceptual design.'
          },
          {
            title: 'Natural Creation (Beijing) Architecture Studio ｜ Architectural Designer/Instructor (2023.07 - 2025.06)',
            content: 'Used parametric tools and systems thinking to handle complex design tasks. Introduced AI tooling into both design and teaching work.'
          }
        ]
      },
      devExperience: {
        title: 'Practice Outcomes',
        items: [
          {
            title: 'RZFrame',
            subtitle: 'Photo Border & Watermark Beautification Tool ｜ AI Native Builder',
            link: 'https://rzframe.pages.dev/',
            content: 'Focused the product on one-click generation, batch processing, and consistent layouts. Moved from a local prototype to a Web experience, then adjusted export flow and templates based on feedback.'
          },
          {
            title: 'BrianK',
            subtitle: 'AI Concept Tool for Architectural Design ｜ AI Product Manager',
            link: 'https://www.briank.top/',
            content: 'Designed an agent path that asks clarifying questions and waits for a [ready] signal before generation. The point is to make site, style, and constraints clearer before any image is produced.'
          },
          {
            title: 'Seedo',
            subtitle: 'AI Digital Habit Tracker & Review Tool ｜ AI Native Builder',
            link: 'https://seedo-bbq.pages.dev/',
            content: 'Kept desktop behavior logging and AI review on device, connecting local capture, structured grouping, and exported AI analysis.'
          }
        ]
      },
      closing: 'Focused on AI tool applications and product validation, with ongoing practice from requirement analysis to MVP delivery.'
    },
    deck: {
      title: 'Resume',
      subtitle: 'Includes job intent, exploration journey, and practice outcomes.',
      contactHint: 'Additional materials are available through the listed contact details.',
    },
  },
};
