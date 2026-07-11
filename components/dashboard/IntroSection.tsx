/**
 * [INPUT]   : 国际化文案、主题切换能力与品牌信息
 * [OUTPUT]  : 顶部问候区与语言 / 主题切换入口
 * [POS]     : Dashboard 组件层，位于右侧面板顶部
 * [DECISION]: 首屏顶部尽量克制，只保留问候与切换能力，避免压缩主内容可视空间
 */

import React from 'react';
import { Card } from '../ui/Card';
import { useLanguage } from '../../data/i18n';
import { useTheme } from '../../data/useTheme';
import { getHomeContent, getSharedContent } from '../../data/content';

export const IntroSection: React.FC = () => {
  const { lang, setLang } = useLanguage();
  const { isDark, toggleTheme } = useTheme();
  const homeContent = getHomeContent(lang);
  const brandMark = getSharedContent().assets.brandMark;

  const toggleLanguage = () => {
    setLang(lang === 'zh' ? 'en' : 'zh');
  };

  return (
    <div className="flex flex-row gap-4 md:gap-5 shrink-0 animate-fade-in-up delay-2 h-[120px] md:h-[140px]">
      <Card variant="liquid" className="liquid-float-b flex-1 relative h-full !p-0">
        <div className="flex-1 flex items-center justify-between gap-5 text-left w-full px-6 md:px-10">
          <div className="min-w-0">
            <h2
              data-edit="home.greeting"
              data-edit-label="首屏大标题"
              className="text-[20px] md:text-2xl font-bold text-[var(--text-primary)] mb-2.5 tracking-tight leading-tight"
            >
              {homeContent.hero.greeting}
            </h2>
            <p
              data-edit="home.description"
              data-edit-label="首屏一句话介绍"
              className="text-[14px] md:text-base leading-snug text-[var(--text-muted)] opacity-90 font-medium max-w-none whitespace-nowrap"
            >
              {homeContent.hero.description}
            </p>
          </div>

          {/* 个人 Logo：来自 shared.yml 的 assets.brandMark，未设置时整块隐藏。建议单色图形（深色模式自动反色）。 */}
          {brandMark && (
            <div
              data-edit="basic.brandMark"
              data-edit-label="个人 Logo"
              className="hidden sm:flex shrink-0 size-16 md:size-18 items-center justify-center"
              aria-hidden="true"
            >
              <img
                src={brandMark}
                alt=""
                className="max-h-9 md:max-h-11 max-w-full object-contain opacity-45 dark:invert"
              />
            </div>
          )}
        </div>
      </Card>

      <div className="flex flex-col justify-between shrink-0 w-14 md:w-16 h-full">
        <Card
          variant="secondary"
          className="w-full h-[56px] md:h-[64px] shrink-0 flex items-center justify-center p-0 cursor-pointer hover:bg-[var(--interactive-hover-surface)] hover:border-[var(--interactive-hover-border)] transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            toggleLanguage();
          }}
        >
          <div className="flex items-center justify-center w-full h-full">
            <span className="text-xs md:text-sm font-bold text-[var(--text-secondary)] tracking-tighter">
              {lang === 'zh' ? 'EN' : 'ZH'}
            </span>
          </div>
        </Card>

        <Card
          variant="secondary"
          className="w-full h-[56px] md:h-[64px] shrink-0 flex items-center justify-center p-0 group cursor-pointer hover:bg-[var(--interactive-hover-surface)] hover:border-[var(--interactive-hover-border)] transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            toggleTheme();
          }}
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          <div className="flex items-center justify-center w-full h-full">
            <span className="material-symbols-outlined text-lg md:text-xl text-[var(--icon-muted)] group-hover:text-[var(--text-primary)] transition-colors">
              {isDark ? 'light_mode' : 'dark_mode'}
            </span>
          </div>
        </Card>
      </div>
    </div>
  );
};
