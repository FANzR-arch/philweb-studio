/**
 * [INPUT]   : 国际化文案、品牌提案数据与埋点能力
 * [OUTPUT]  : 合作路径卡片，引导用户按“看方法 / 看案例 / 联系我”继续了解
 * [POS]     : Dashboard 左列底部，承接个人介绍后的下一步行动
 * [DECISION]: 用固定的 1-2-3 路径降低首次沟通门槛，让用户更容易找到合适入口
 */

import React from 'react';
import { Card } from '../ui/Card';
import { useLanguage } from '../../data/i18n';
import { track } from '../../data/analytics';
import { useHomeContent } from '../../data/content';

interface InterviewerPathCardProps {
  onOpenProject: () => void;
  onOpenContact: () => void;
}

export const InterviewerPathCard: React.FC<InterviewerPathCardProps> = ({
  onOpenProject,
  onOpenContact,
}) => {
  const { lang } = useLanguage();
  const homeContent = useHomeContent(lang);

  const handleStep = (step: 'project' | 'contact', action: () => void) => {
    track('interview_pack_step_click', {
      step,
      source: 'left_sidebar_card',
      lang,
      entry_section: 'cooperation_path',
    });
    track('service_cta_click', {
      cta: `cooperation_path_${step}`,
      source: 'left_sidebar_card',
      lang,
      entry_section: 'cooperation_path',
    });
    action();
  };

  return (
    <Card variant="primary" className="animate-fade-in-up delay-2">
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-bold tracking-tight text-[var(--text-primary)]">
            {homeContent.interviewerPath.title}
          </h3>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            {homeContent.interviewerPath.subtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => handleStep('project', onOpenProject)}
            className="theme-button-secondary flex items-center justify-center gap-2 rounded-[var(--card-radius-sm)] border py-2 text-xs font-bold transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-[18px]">rocket_launch</span>
            {homeContent.interviewerPath.casesLabel}
          </button>
          <button
            type="button"
            onClick={() => handleStep('contact', onOpenContact)}
            className="theme-button-secondary flex items-center justify-center gap-2 rounded-[var(--card-radius-sm)] border py-2 text-xs font-bold transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-[18px]">forum</span>
            {homeContent.quickLinks.contact}
          </button>
        </div>
      </div>
    </Card>
  );
};
