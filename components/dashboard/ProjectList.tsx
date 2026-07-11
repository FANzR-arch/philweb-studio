/**
 * [INPUT]   : 项目数据、国际化文案、Project 类型与通用 Card 组件
 * [OUTPUT]  : 紧凑版项目列表卡片，用于承接案例入口
 * [POS]     : Dashboard 组件层，位于中栏下半部分
 * [DECISION]: 取消内部时间轴并压缩为高密度列表，让用户更快从项目标题进入具体案例
 */

import React from 'react';
import { Card } from '../ui/Card';
import { Project } from '../../types';
import { getHomeContent, publishedProjects } from '../../data/content';
import { useLanguage } from '../../data/i18n';
import { getProjectDisplay } from '../../data/projectDisplay';
import { getCoverImages } from '../../data/useImages';

interface ProjectListProps {
    onOpenProject: (project: Project) => void;
}

export const ProjectList: React.FC<ProjectListProps> = ({ onOpenProject }) => {
    const { lang } = useLanguage();
    const homeContent = getHomeContent(lang);

    // 项目顺序由 content/text/projects/<id>/meta.yml 的 order 决定（registry 已按 order 排序）。
    const primaryProjects = publishedProjects.filter((project) => project.isPrimary !== false);

    return (
        <Card variant="liquid" className="liquid-float-d flex-1 h-full min-h-0 flex flex-col !pt-8 !pb-8 !px-5 sm:!px-6 animate-fade-in-up delay-1">
            <div className="mb-6 shrink-0">
                <h3 data-edit="home.projectTitle" data-edit-label="作品板块标题" className="text-xl sm:text-2xl font-bold mb-2 text-[var(--text-primary)] tracking-tight">{homeContent.projectSection.title}</h3>
                {homeContent.projectSection.subtitle && (
                  <p className="text-[13px] sm:text-sm text-[var(--text-muted)] leading-relaxed">{homeContent.projectSection.subtitle}</p>
                )}
            </div>

            <div className="flex-1 flex flex-col gap-3 sm:gap-4 min-h-0">
                {primaryProjects.map((project) => {
                    const display = getProjectDisplay(project, lang);
                    const cover = getCoverImages(project.id);

                    return (
                        <button
                            type="button"
                            key={project.id}
                            data-edit={`project:${project.id}`}
                            data-edit-label={lang === 'zh' ? `项目「${display.title}」` : `Project "${display.title}"`}
                            onClick={() => onOpenProject(project)}
                            aria-label={lang === 'zh' ? `查看项目：${display.title}` : `Open project: ${display.title}`}
                            style={{ '--project-color': project.themeColor || '#94A3B8' } as React.CSSProperties}
                            className="group project-list-item w-full flex-1 flex flex-row items-stretch text-left cursor-pointer transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] rounded-xl overflow-hidden border hover:-translate-y-1 min-h-[88px] sm:min-h-[106px] p-0"
                        >
                            {/* 顶部细光带只在悬浮时出现，用很轻的方式提示当前卡片已有交互焦点。 */}
                            <div className="absolute inset-x-0 -top-px h-[2px] bg-gradient-to-r from-transparent via-[var(--project-color)] to-transparent opacity-0 group-hover:opacity-25 transition-opacity duration-500 z-20" />

                            {/* 左侧图片区承担项目第一印象，让封面在有限高度内仍能快速传达项目气质。 */}
                            <div className="project-list-media relative w-[34%] sm:w-[38%] shrink-0 overflow-hidden border-r">
                                <div className="w-full h-full transition-transform duration-700 ease-out group-hover:scale-110">
                                    {cover && (
                                        <>
                                            <img
                                                src={cover.light}
                                                alt=""
                                                className="w-full h-full object-cover dark:hidden"
                                            />
                                            <img
                                                src={cover.dark}
                                                alt=""
                                                className="w-full h-full object-cover hidden dark:block"
                                            />
                                        </>
                                    )}
                                </div>
                                <div className="absolute inset-0 bg-gradient-to-r from-[var(--interactive-soft-hover)] to-transparent pointer-events-none" />
                            </div>

                            {/* 右侧信息区优先展示标题、状态与副标题，帮助用户先判断是否值得点开。 */}
                            <div className="flex-1 flex flex-col justify-center p-4 sm:p-5 sm:pl-6 pr-0 min-w-0">
                                <div className="flex items-center w-full mb-2 pr-0">
                                    <h4 className="font-bold text-[15px] sm:text-base tracking-tight text-[var(--text-primary)] leading-none transition-colors group-hover:project-theme-text line-clamp-2">
                                        {display.title}
                                    </h4>
                                </div>
                                <span className="project-list-subtitle text-[12px] sm:text-[13px] text-[var(--text-muted)] leading-tight font-medium pr-4">
                                    {display.subtitle}
                                </span>
                            </div>

                            {/* 箭头只在悬浮时显现，作为“可继续进入详情”的轻量提示，而不抢正文信息层级。 */}
                            <div className="flex items-center pr-2 shrink-0">
                                <span className="material-symbols-outlined text-[16px] text-[var(--text-subtle)] opacity-0 -translate-x-1 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0 group-hover:project-theme-text">
                                    arrow_forward
                                </span>
                            </div>
                        </button>
                    );
                })}
            </div>
        </Card>
    );
};
