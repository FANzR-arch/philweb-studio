/**
 * [INPUT]   : 国际化文案、头像资源与通用 Card 组件
 * [OUTPUT]  : 左侧个人资料卡片，集中展示身份信息、能力标签与外部链接
 * [POS]     : 布局组件层，作为首页左列的核心入口
 * [DECISION]: 通过右对齐信息与分段式内容组织，强化个人品牌感并缩短用户抓重点的时间
 */

import React from 'react';
import { useLanguage } from '../../data/i18n';
import { useHomeContent } from '../../data/content';
import { useAvatarImages } from '../../data/useImages';
import { ImageWithSkeleton } from '../ui/ImageWithSkeleton';
import { Card } from '../ui/Card';

const FALLBACK_IDENTITY_ICONS = ['conversion_path', 'neurology', 'build', 'handyman', 'auto_awesome', 'star'] as const;

export const Sidebar: React.FC = () => {
  const { lang } = useLanguage();
  const avatarImages = useAvatarImages();
  const homeContent = useHomeContent(lang);
  const sidebar = homeContent.sidebar;
  const identityItems = sidebar.skillList.map((text, index) => ({
    text,
    icon: sidebar.skillIcons[index] || FALLBACK_IDENTITY_ICONS[index % FALLBACK_IDENTITY_ICONS.length],
  }));
  const metrics = homeContent.metrics;

  return (
    <Card data-edit="home.overview" data-edit-label="首页内容" variant="liquid" className="dashboard-surface-card card-slot-sidebar liquid-float-a !p-7 md:!p-9 relative flex flex-col h-full overflow-hidden">
      {/* 头像区负责建立第一印象，并通过大图比例撑起左列的视觉重心。 */}
      <div
        data-edit="basic.avatar"
        data-edit-target="basic.avatar"
        data-edit-label="头像"
        className="w-full bg-[var(--surface-panel)] overflow-hidden relative group aspect-[3/3.3] rounded-[var(--card-radius-sm)] shrink-0 border border-[var(--border-soft)] shadow-inner"
      >
        {avatarImages.light && (
          <ImageWithSkeleton
            src={avatarImages.light}
            alt={sidebar.name}
            priority
            loading="eager"
            containerClassName="w-full h-full dark:hidden"
            className="w-full h-full object-cover object-top p-1 rounded-[var(--card-radius-sm)]"
          />
        )}
        {avatarImages.dark && (
          <ImageWithSkeleton
            src={avatarImages.dark}
            alt={sidebar.name}
            priority
            loading="eager"
            containerClassName="w-full h-full hidden dark:block"
            className="w-full h-full object-cover object-top p-1 rounded-[var(--card-radius-sm)]"
          />
        )}
      </div>

      {/* 正文区按“品牌身份 -> 基本信息 -> 四行自我介绍 -> 技能标签”展开。 */}
      <div className="flex flex-col flex-1 pt-8 px-1">

        {/* 顶部保留品牌名与定位标签，让左栏依旧维持清晰的识别结构。 */}
        <div data-edit="home.name" data-edit-label="名字与定位" className="flex items-baseline justify-between mb-6">
          <h2
            data-edit="home.name"
            data-edit-target="home.name"
            data-edit-label="名字"
            className="text-[34px] md:text-4xl font-black tracking-tighter text-[var(--text-primary)] leading-none"
          >
            {sidebar.name}
          </h2>
          {sidebar.targetRoleValue && sidebar.targetRoleValue !== sidebar.name && (
            <span className="text-[13px] md:text-[14px] font-black text-[var(--site-accent)] tracking-[0.08em] shrink-0 ml-4">
              {sidebar.targetRoleValue}
            </span>
          )}
        </div>

        {/* 基本信息拆成两组显示，让静态信息与职业背景在一眼内可被读取。 */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-7">
          <div className="flex items-center gap-2">
            {sidebar.age && (
              <span data-edit="home.mbti" data-edit-label="个人信息" className="theme-pill px-2.5 py-1 rounded-md border text-[12px] font-bold">
                {sidebar.age}
              </span>
            )}
            <span
              data-edit="home.mbti"
              data-edit-label="MBTI"
              className="theme-pill px-2.5 py-1 rounded-md border text-[12px] font-bold"
            >
              {sidebar.mbti}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-[var(--text-muted)]">
            <div data-edit="home.experience" data-edit-label="一句话经历" className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px]">cases</span>
              <span className="text-[13px] font-bold tracking-tight">
                {sidebar.experience}
              </span>
            </div>
            <div data-edit="home.city" data-edit-label="城市" className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px]">location_on</span>
              <span className="text-[13px] font-bold tracking-tight">
                {sidebar.targetCityValue}
              </span>
            </div>
          </div>
        </div>

        {/* 四行 intro block 改成统一图标行，语气更像个人主页自我介绍。 */}
        <div className="space-y-3.5 mb-6">
          <div data-edit="home.profileStatement" data-edit-label="个人签名" className="flex items-center gap-3.5">
            <span className="theme-pill size-10 rounded-[var(--card-radius-sm)] border flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[18px] text-[var(--site-accent)]">waving_hand</span>
            </span>
            <p className="leading-relaxed font-bold tracking-tight text-[15px] sm:text-[15.5px] text-[var(--text-primary)]">
              {sidebar.profileStatement}
            </p>
          </div>
          {identityItems.map((item, index) => (
            <div
              key={`${item.icon}-${item.text}-${index}`}
              data-edit={`home.skillList:${index}`}
              data-edit-label={`技能 / 身份第 ${index + 1} 项`}
              className="flex items-center gap-3.5"
            >
              <span className="theme-pill size-10 rounded-[var(--card-radius-sm)] border flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[18px] text-[var(--site-accent)]">{item.icon}</span>
              </span>
              <p className="leading-relaxed font-bold tracking-tight text-[14.5px] text-[var(--text-secondary)]">{item.text}</p>
            </div>
          ))}
        </div>

        {/* 数据卡改成单行横排，并缩小尺寸以适配左栏宽度。 */}
        <div data-edit="home.metrics" data-edit-label="数据指标" className="grid grid-cols-4 gap-1.5 pt-4 border-t border-[var(--border-soft)] mt-auto">
          {metrics.map((metric) => {
            const hasValue = metric.value.trim().length > 0;

            return (
              <div
                key={metric.label}
                className="theme-pill rounded-[var(--card-radius-sm)] border px-2 py-2.5 min-h-[68px] flex flex-col items-center justify-center text-center gap-1"
              >
                {hasValue ? (
                  <>
                    <span className="font-black text-[var(--site-accent)] text-[17px] sm:text-[18px] leading-none">
                      {metric.value}
                    </span>
                    <span className="text-[9px] sm:text-[9.5px] text-[var(--text-muted)] font-semibold tracking-tight leading-snug whitespace-pre-line">
                      {metric.label}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[var(--site-accent)] text-[18px] sm:text-[19px] leading-none">
                      {metric.icon}
                    </span>
                    <span className="text-[9px] sm:text-[9.5px] text-[var(--text-muted)] font-semibold tracking-tight leading-snug whitespace-pre-line">
                      {metric.label}
                    </span>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
};
