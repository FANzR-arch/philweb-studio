/**
 * [INPUT]   : 国际化文案、时间线数据与通用 Card 组件
 * [OUTPUT]  : 可嵌入首页卡片或经历弹窗的时间线内容
 * [POS]     : Dashboard 内容层，统一经历与思考的展开交互
 */

import React from 'react';
import { useHomeContent } from '../../data/content';
import { useLanguage } from '../../data/i18n';
import { Card } from '../ui/Card';

interface TimelineContentProps {
  mode?: 'card' | 'modal';
}

export const TimelineContent: React.FC<TimelineContentProps> = ({ mode = 'card' }) => {
  const { lang } = useLanguage();
  const homeContent = useHomeContent(lang);
  const timeline = homeContent.timeline.items;
  const skillTags = homeContent.sidebar.skillTags;
  const [expandedItemId, setExpandedItemId] = React.useState<string | null>(null);
  const isModal = mode === 'modal';

  const toggleTimelineItem = (itemId: string) => {
    setExpandedItemId((currentItemId) => (currentItemId === itemId ? null : itemId));
  };

  return (
    <>
      {!isModal && (
        <div className="mb-3 shrink-0 pl-1 text-left">
          <h3
            data-edit="home.timelineTitle"
            data-edit-label="时间线标题"
            className="mb-1.5 text-xl font-bold tracking-tight text-[var(--text-primary)] sm:text-2xl"
          >
            {homeContent.timeline.title}
          </h3>
          {homeContent.timeline.subtitle && (
            <p className="text-[13px] text-[var(--text-subtle)] sm:text-sm">
              {homeContent.timeline.subtitle}
            </p>
          )}
        </div>
      )}

      <div className={isModal ? 'relative' : 'relative min-h-0 flex-1 overflow-y-auto pl-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'}>
        <div
          className={`absolute left-[28px] w-[1.5px] -translate-x-1/2 pointer-events-none sm:left-[27px] ${isModal ? 'top-[-14px] bottom-0' : 'top-[-14px] bottom-0 sm:top-[-18px]'}`}
          style={{
            backgroundImage: 'radial-gradient(circle at center, currentColor 1px, transparent 1px)',
            backgroundSize: '100% 8px',
            maskImage: 'linear-gradient(to bottom, transparent, black 8%, black 92%, transparent)',
            color: 'var(--site-accent)',
            opacity: lang === 'zh' ? 0.22 : 0.18,
          }}
        />

        <div data-edit="home.timeline" data-edit-label="成长轨迹" className="flex flex-col gap-4 sm:gap-5">
          {timeline.map((item, index) => {
            const isExpanded = expandedItemId === item.id;
            const collapsedTextClass = isExpanded
              ? ''
              : 'line-clamp-2 group-hover:line-clamp-none group-focus-within:line-clamp-none';

            return (
              <div
                key={item.id}
                className="group relative flex cursor-pointer items-start rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-[var(--site-accent)]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-panel)]"
                role="button"
                tabIndex={0}
                aria-expanded={isExpanded}
                aria-label={`${item.title}: ${item.detail}`}
                onClick={() => toggleTimelineItem(item.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    toggleTimelineItem(item.id);
                  }

                  if (event.key === 'Escape') {
                    setExpandedItemId(null);
                  }
                }}
              >
                <div className="absolute left-[12px] mt-0.5 flex -translate-x-1/2 items-center justify-center sm:left-[11px]">
                  <div className="relative rounded-full border border-[var(--border-soft)] bg-[var(--interactive-soft-hover)] p-[2px] shadow-[0_0_10px_rgba(0,0,0,0.02)]">
                    <div className="relative z-10 flex h-9 w-9 items-center justify-center rounded-full border-[2.5px] border-[var(--surface-panel)] bg-[var(--surface-panel)] shadow-sm transition-colors duration-300 group-hover:border-[var(--site-accent)]/20 group-hover:bg-[var(--interactive-soft-hover)] sm:h-11 sm:w-11">
                      <span className="material-symbols-outlined text-sm text-[var(--icon-muted)] transition-colors group-hover:text-[var(--site-accent)] sm:text-base">
                        {item.icon}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="w-full pl-[44px] sm:pl-[48px]">
                  <div className="transition-all duration-300 group-hover:translate-x-1">
                    <div className="mb-1.5 flex w-full items-center pr-0">
                      <div className="flex items-center gap-2">
                        <span className="flex min-h-[20px] items-center justify-center rounded-md border border-[var(--site-accent)]/20 bg-[var(--site-accent)]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--site-accent)] shadow-sm sm:min-h-[22px] sm:text-[11px]">
                          P0{index + 1}
                        </span>
                        <p className="text-[12px] font-bold tracking-tight text-[var(--site-accent)]/80 sm:text-[14px]">
                          {item.period}
                        </p>
                      </div>
                      <div className="item-tags ml-auto flex shrink-0 gap-1.5">
                        {item.keywords?.map((kw) => (
                          <span
                            key={kw}
                            className="theme-pill flex min-h-[22px] items-center justify-center rounded-md border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider transition-all duration-300 sm:text-[11px]"
                          >
                            {kw}
                          </span>
                        ))}
                      </div>
                    </div>
                    <h4 className={`mb-1 text-[16px] font-bold tracking-tight text-[var(--text-primary)] sm:text-[18px] ${collapsedTextClass}`}>
                      {item.title}
                    </h4>
                    <p className={`max-w-[96%] text-[13px] leading-relaxed text-[var(--text-muted)] transition-all duration-200 sm:text-[14.5px] ${collapsedTextClass}`}>
                      {item.detail}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div data-edit="home.skillTags" data-edit-label="技能标签" className="mt-3 shrink-0 border-t border-[var(--border-soft)] pt-3">
        <div className="flex flex-wrap gap-1.5">
          {skillTags.map((tag) => (
            <span
              key={tag}
              className="theme-pill cursor-default whitespace-nowrap rounded-full border px-2 py-1 text-[10px] font-black tracking-tight transition-all sm:px-2.5 sm:text-[11px]"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </>
  );
};

export const TimelineSection: React.FC = () => (
  <Card
    variant="liquid"
    className="card-slot-timeline liquid-float-c flex h-full min-h-0 flex-1 flex-col pb-4 pl-4 pr-4 pt-5 animate-fade-in-up delay-1 sm:pl-6 sm:pr-5"
  >
    <TimelineContent mode="card" />
  </Card>
);
