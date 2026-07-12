/**
 * [INPUT]   : 国际化文案、品牌方法论数据与通用 Card 组件
 * [OUTPUT]  : 仪表盘中列的工作经历时间轴展示区
 * [POS]     : Dashboard 组件层，负责承接成长路径的纵向叙事
 * [DECISION]: 移除顶部指标卡，保持工作经历区只服务时间线阅读，不再插入摘要卡片打断节奏
 */

import React from 'react';
import { getHomeContent } from '../../data/content';
import { useLanguage } from '../../data/i18n';
import { Card } from '../ui/Card';

export const TimelineSection: React.FC = () => {
  const { lang } = useLanguage();
  const homeContent = getHomeContent(lang);
  const timeline = homeContent.timeline.items;
  const skillTags = homeContent.sidebar.skillTags;
  const [expandedItemId, setExpandedItemId] = React.useState<string | null>(null);

  const toggleTimelineItem = (itemId: string) => {
    setExpandedItemId((currentItemId) => (currentItemId === itemId ? null : itemId));
  };

  return (
    <Card
      variant="liquid"
      className="card-slot-timeline liquid-float-c flex-1 h-full min-h-0 flex flex-col pt-5 pb-4 !pl-4 sm:!pl-6 pr-4 sm:pr-5 animate-fade-in-up delay-1"
    >
      {/* 标题区先交代模块主题，再用一句短说明帮助用户理解这一列的阅读重点。 */}
      <div className="mb-3 text-left shrink-0 pl-1">
        <h3
          data-edit="home.timelineTitle"
          data-edit-label="时间线标题"
          className="text-xl sm:text-2xl font-bold mb-1.5 text-[var(--text-primary)] tracking-tight"
        >
          {homeContent.timeline.title}
        </h3>
        {homeContent.timeline.subtitle && (
          <p className="text-[13px] sm:text-sm text-[var(--text-subtle)]">
            {homeContent.timeline.subtitle}
          </p>
        )}
      </div>

      {/* 时间轴主体承接经历叙事，用纵向阅读顺序强化"阶段变化"的感知。 */}
      <div className="relative flex-1 min-h-0 overflow-y-auto pl-4 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
        {/* 删除摘要卡后同步收回轴线起始位置，避免视觉线条侵入标题区。 */}
        <div
          className="absolute left-[28px] sm:left-[27px] top-[-14px] sm:top-[-18px] bottom-0 w-[1.5px] -translate-x-1/2 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at center, currentColor 1px, transparent 1px)`,
            backgroundSize: '100% 8px',
            maskImage: 'linear-gradient(to bottom, transparent, black 8%, black 92%, transparent)',
            color: 'var(--site-accent)',
            opacity: lang === 'zh' ? 0.22 : 0.18
          }}
        ></div>

        <div data-edit="hint:timeline" data-edit-label="时间线内容" className="flex flex-col gap-4 sm:gap-5">
          {timeline.map((item, index) => {
            const isExpanded = expandedItemId === item.id;
            const collapsedTextClass = isExpanded
              ? ''
              : 'line-clamp-2 group-hover:line-clamp-none group-focus-within:line-clamp-none';

            return (
              <div
                key={item.id}
                className="relative flex items-start group rounded-xl outline-none cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--site-accent)]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-panel)]"
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
              {/* 图标节点：使用绝对定位配合 translate 确保中心点与轴线 100% 重合。 */}
              <div className="absolute left-[12px] sm:left-[11px] -translate-x-1/2 flex items-center justify-center mt-0.5">
                <div className="relative p-[2px] rounded-full border border-[var(--border-soft)] bg-[var(--interactive-soft-hover)] shadow-[0_0_10px_rgba(0,0,0,0.02)]">
                  <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full border-[2.5px] border-[var(--surface-panel)] bg-[var(--surface-panel)] flex items-center justify-center shadow-sm relative z-10 transition-colors duration-300 group-hover:border-[var(--site-accent)]/20 group-hover:bg-[var(--interactive-soft-hover)]">
                    <span className="material-symbols-outlined text-[var(--icon-muted)] group-hover:text-[var(--site-accent)] transition-colors text-sm sm:text-base">
                      {item.icon}
                    </span>
                  </div>
                </div>
              </div>

              {/* 内容区：相应调整左侧间距，预留出轴线区域。 */}
              <div className="w-full pl-[44px] sm:pl-[48px]">
                <div className="transition-all duration-300 group-hover:translate-x-1">
                  <div className="flex items-center w-full mb-1.5 pr-0">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md border text-[10px] sm:text-[11px] font-bold uppercase tracking-wider min-h-[20px] sm:min-h-[22px] flex items-center justify-center shadow-sm bg-[var(--site-accent)]/10 text-[var(--site-accent)] border-[var(--site-accent)]/20">
                        P0{index + 1}
                      </span>
                      <p className="text-[12px] sm:text-[14px] font-bold text-[var(--site-accent)]/80 tracking-tight">
                        {item.period}
                      </p>
                    </div>
                    <div className="flex gap-1.5 ml-auto shrink-0 item-tags">
                      {item.keywords?.map((kw) => (
                        <span
                          key={kw}
                          className="theme-pill text-[10px] sm:text-[11px] font-medium px-2 py-0.5 rounded-md border uppercase tracking-wider transition-all duration-300 min-h-[22px] flex items-center justify-center"
                        >
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                  <h4 className={`text-[16px] sm:text-[18px] font-bold text-[var(--text-primary)] mb-1 tracking-tight ${collapsedTextClass}`}>
                    {item.title}
                  </h4>
                  <p className={`text-[13px] sm:text-[14.5px] text-[var(--text-muted)] leading-relaxed max-w-[96%] transition-all duration-200 ${collapsedTextClass}`}>
                    {item.detail}
                  </p>
                </div>
              </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="pt-3 mt-3 border-t border-[var(--border-soft)] shrink-0">
        <div className="flex flex-wrap gap-1.5">
          {skillTags.map((tag) => (
            <span
              key={tag}
              className="theme-pill px-2 sm:px-2.5 py-1 rounded-full border text-[10px] sm:text-[11px] font-black tracking-tight transition-all cursor-default whitespace-nowrap"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

    </Card>
  );
};
