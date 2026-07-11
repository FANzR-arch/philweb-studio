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
import { getHomeContent } from '../../data/content';

export const IntroSection: React.FC = () => {
  const { lang, setLang } = useLanguage();
  const { isDark, toggleTheme } = useTheme();
  const homeContent = getHomeContent(lang);

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

          <div
            className="hidden sm:flex shrink-0 size-16 md:size-18 items-center justify-center"
            aria-hidden="true"
          >
            <svg
              viewBox="0 0 474.58 450.54"
              className="size-9 md:size-11 text-[var(--text-subtle)] opacity-45"
              fill="currentColor"
            >
              <path d="M363.48,29.18c19.12-.5,42.12,8.18,57.95,24.01s24.51,38.84,24,57.96c.51,19.12-8.17,42.12-24,57.96-15.83,15.84-38.83,24.52-57.95,24.02l-156.58.03c-11.39-1.15-24.29,11.75-23.14,23.14v211.01c-1.15,11.39,11.75,24.29,23.14,23.14,11.39,1.15,24.29-11.75,23.14-23.14v-152.31c-.15-5.15,3.38-10.3,8.22-12.3,4.84-2,10.98-.86,14.51,2.89l180.66,180.66c2.56,2.63,6.48,4.26,10.15,4.21h8.41c4.35.44,9.29-4.49,8.85-8.85v-111.21c.43-4.23-4.36-9.02-8.59-8.59-4.23-.43-9.02,4.36-8.59,8.59v52.77c.15,5.15-3.38,10.3-8.22,12.3-4.84,2-10.98.86-14.51-2.89l-147.59-147.59c-3.75-3.53-4.89-9.67-2.89-14.51,2-4.84,7.15-8.37,12.3-8.22l80.73-.02c25.91.68,57.07-11.08,78.53-32.55,21.46-21.46,33.21-52.63,32.53-78.54.69-25.91-11.07-57.08-32.53-78.54C420.56,11.14,389.4-.62,363.49.06L32.49,0C24.09-.07,15.6,3.47,9.59,9.48,3.57,15.5.03,23.98.1,32.39v385.67c-1.62,15.94,16.45,34,32.38,32.38,15.94,1.62,34-16.45,32.38-32.38v-181.24c-.73-7.16,7.39-15.28,14.55-14.55h60.13c7.16.73,15.28-7.39,14.55-14.55.73-7.16-7.39-15.28-14.55-14.55h-60.13c-7.16.73-15.28-7.39-14.55-14.55V43.66c-.03-3.78,1.56-7.59,4.26-10.29,2.7-2.7,6.52-4.29,10.29-4.26l284.06.06" />
            </svg>
          </div>
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
