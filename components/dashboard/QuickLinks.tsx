/**
 * [INPUT]   : 国际化文案与通用 Card 组件
 * [OUTPUT]  : 首页右下角的快捷入口（联系我 / 经历与思考）
 * [POS]     : Dashboard 组件层，承接"看完文章和作品后继续行动"的动作
 * [DECISION]: 文章直接显示在主卡，快捷入口改为联系方式与经历弹窗
 */

import React from 'react';
import { useLanguage } from '../../data/i18n';
import { getHomeContent } from '../../data/content';
import { Card } from '../ui/Card';

interface QuickLinksProps {
  onOpenContact: () => void;
  onOpenTimeline: () => void;
}

export const QuickLinks: React.FC<QuickLinksProps> = ({ onOpenContact, onOpenTimeline }) => {
  const { lang } = useLanguage();
  const homeContent = getHomeContent(lang);

  return (
    <div className="flex flex-col gap-3 animate-fade-in-up delay-4 shrink-0">
      <div data-edit="hint:quicklinks" data-edit-label="快捷入口" className="grid grid-cols-2 gap-3 h-[78px] sm:h-[82px]">
        <Card
          variant="secondary"
          onClick={onOpenContact}
          className="card-slot-quicklinks !p-0 group"
        >
          <div className="flex flex-row items-center justify-start gap-4 w-full h-full pl-6 sm:pl-8">
            <svg
              width="26"
              height="26"
              viewBox="0 0 48 48"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="text-[var(--icon-muted)] group-hover:text-[var(--site-accent)] transition-colors flex-shrink-0"
            >
              <path d="M44.0001 24C44.0001 35.0457 35.0458 44 24.0001 44C18.0266 44 4.00006 44 4.00006 44C4.00006 44 4.00006 29.0722 4.00006 24C4.00006 12.9543 12.9544 4 24.0001 4C35.0458 4 44.0001 12.9543 44.0001 24Z" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M14 18L32 18" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M14 26H32" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M14 34H24" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-[14px] font-bold text-[var(--text-secondary)] group-hover:text-[var(--site-accent)] transition-colors tracking-tight line-clamp-2">
              {homeContent.quickLinks.contact}
            </span>
          </div>
        </Card>

        <Card
          variant="secondary"
          onClick={onOpenTimeline}
          className="card-slot-quicklinks !p-0 group"
        >
          <div className="flex flex-row items-center justify-start gap-4 w-full h-full pl-6 sm:pl-8">
            <span className="material-symbols-outlined text-[var(--icon-muted)] group-hover:text-[var(--site-accent)] transition-colors flex-shrink-0 text-[26px]">
              timeline
            </span>
            <span className="text-[14px] font-bold text-[var(--text-secondary)] group-hover:text-[var(--site-accent)] transition-colors tracking-tight line-clamp-2">
              {homeContent.timeline.title}
            </span>
          </div>
        </Card>
      </div>
    </div>
  );
};
