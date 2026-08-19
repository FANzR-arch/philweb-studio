/**
 * [INPUT]   : 技能数据、国际化文案与通用 Card 组件
 * [OUTPUT]  : 技能展示卡片，用于概览当前方法栈与工具分布
 * [POS]     : Dashboard 组件层，位于右侧面板中部
 * [DECISION]: 按类别分组展示工具图标，并用悬浮换色强化工具品牌识别
 */

import React from 'react';
import { Card } from '../ui/Card';
import { useLanguage } from '../../data/i18n';
import { useSkillsContent } from '../../data/content';

interface SkillsSectionProps {
    onOpenSkills: () => void;
}

export const SkillsSection: React.FC<SkillsSectionProps> = ({ onOpenSkills }) => {
    const { lang } = useLanguage();
    const skills = useSkillsContent();
    const dashboard = skills.dashboard;

    return (
        <Card variant="primary" onClick={onOpenSkills}>
            <h3 className="text-lg font-bold mb-0.5 text-[var(--text-primary)] tracking-tight">{dashboard.title[lang]}</h3>
            <p className="text-xs text-[var(--text-muted)] mb-3 leading-relaxed">{dashboard.subtitle[lang]}</p>

            {dashboard.categories.map(category => (
                <div key={category.id} className="mb-3 last:mb-0">
                    <h4 className="text-xs font-medium text-[var(--text-subtle)] mb-3 uppercase tracking-wider">
                        {category.title[lang]}
                    </h4>

                    <div className="grid grid-cols-5 gap-3">
                        {category.tools.map(tool => (
                            <div
                                key={tool.id}
                                className="w-12 h-12 bg-[var(--surface-inset)] rounded-[var(--card-radius-sm)] border border-[var(--border-soft)] flex items-center justify-center group transition-all hover:bg-[var(--interactive-hover-surface)]"
                                title={tool.name}
                            >
                                {/* 默认先展示黑白 Logo，保证静止状态下的视觉节制与信息整洁。 */}
                                <img
                                    src={tool.logoMono}
                                    alt={tool.name}
                                    className="w-8 h-8 object-contain group-hover:hidden"
                                />
                                {/* 悬浮时切换彩色 Logo，用颜色反馈强调工具品牌和交互响应。 */}
                                <img
                                    src={tool.logoColor}
                                    alt={tool.name}
                                    className="w-8 h-8 object-contain hidden group-hover:block"
                                />
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </Card>
    );
};
