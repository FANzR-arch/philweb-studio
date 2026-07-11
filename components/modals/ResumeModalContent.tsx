/**
 * [INPUT]   : 项目数据、项目展示文案与国际化内容
 * [OUTPUT]  : 简历弹窗内容，提供站内预览
 * [POS]     : 弹窗内容层，负责组织完整的简历阅读信息
 */

import React, { useMemo } from 'react';
import { useLanguage } from '../../data/i18n';
import { allProjects, getResumeContent } from '../../data/content';
import { getProjectDisplay } from '../../data/projectDisplay';

export const ResumeModalContent: React.FC = () => {
  const { lang } = useLanguage();
  const copy = getResumeContent(lang);

  const coreProjects = useMemo(
    () =>
      copy.featuredProjectIds
        .map((id) => allProjects.find((project) => project.id === id))
        .filter(Boolean)
        .map((project) => ({
          project: project!,
          display: getProjectDisplay(project!, lang),
        })),
    [copy.featuredProjectIds, lang]
  );

  return (
    <div className="flex flex-col h-full bg-[var(--surface-panel)] relative">
      <div className="p-8 md:p-12 overflow-y-auto custom-scrollbar flex-1 space-y-10 bg-[var(--surface-panel)]">
        <header className="border-b border-[var(--border-soft)] pb-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[var(--site-accent)] mb-3">
                {copy.heading}
              </p>
              <h1 className="text-4xl font-bold tracking-tight text-[var(--text-primary)]">
                {copy.name}
              </h1>
            </div>
          </div>
          <div className="mt-6 space-y-2">
            <p className="text-lg font-bold text-[var(--site-accent)]/90">{copy.summary}</p>
            <p className="text-sm leading-relaxed text-[var(--text-muted)] max-w-3xl">
              {copy.statement}
            </p>
          </div>
        </header>

        <section>
          <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--text-subtle)] mb-4">
            {copy.basicsTitle}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {copy.basics.map(({ label, value }) => (
              <div
                key={label}
                className="theme-panel-inset rounded-lg border p-4"
              >
                <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-subtle)] mb-2">
                  {label}
                </p>
                {value.startsWith('http') ? (
                  <a
                    href={value}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-semibold text-[var(--site-accent)] break-all hover:underline"
                  >
                    {value.replace('https://', '')}
                  </a>
                ) : (
                  <p className="text-sm font-semibold text-[var(--text-primary)] break-all">{value}</p>
                )}
              </div>
            ))}
          </div>
        </section>

        <section>
          <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--text-subtle)] mb-4">
            {copy.strengthsTitle}
          </h3>
          <div className="space-y-3">
            {copy.strengths.map((item, index) => (
              <div
                key={item}
                className="theme-panel-inset flex gap-4 rounded-lg border p-4"
              >
                <span className="text-[var(--site-accent)] font-mono text-sm font-black pt-0.5">{`0${index + 1}`}</span>
                <p className="text-sm leading-relaxed text-[var(--text-secondary)]">{item}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--text-subtle)] mb-4">
            {copy.workTitle}
          </h3>
          <div className="space-y-4">
            {copy.experiences.map((item) => (
              <article
                key={item.company}
                className="theme-panel rounded-lg border p-5"
              >
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between mb-4">
                  <div>
                    <h4 className="text-base font-bold text-[var(--text-primary)]">{item.company}</h4>
                    <p className="text-sm text-[var(--site-accent)] font-semibold mt-1">{item.role}</p>
                  </div>
                  <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--text-subtle)]">
                    {item.period}
                  </span>
                </div>
                <ul className="space-y-2.5">
                  {item.bullets.map((bullet) => (
                    <li key={bullet} className="flex gap-3 text-sm text-[var(--text-secondary)] leading-relaxed">
                      <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[var(--site-accent)]" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section>
          <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--text-subtle)] mb-4">
            {copy.projectTitle}
          </h3>
          <div className="space-y-4">
            {coreProjects.map(({ project, display }) => {
              const projectId = project.id as keyof typeof copy.projectRoleValues;

              return (
                <article
                  key={project.id}
                  className="theme-panel rounded-lg border p-5"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between mb-4">
                    <div className="space-y-1">
                      <h4 className="text-base font-bold text-[var(--text-primary)]">{display.title}</h4>
                      <p className="text-sm text-[var(--text-muted)]">{display.subtitle}</p>
                      <p className="text-[12px] text-[var(--site-accent)] font-medium">
                        {copy.projectRoleValues[projectId]}
                      </p>
                    </div>
                    {project.webLink && (
                      <a
                        href={project.webLink}
                        target="_blank"
                        rel="noreferrer"
                        className="theme-button-secondary inline-flex items-center gap-2 text-[12px] font-bold border rounded-full px-4 py-2 transition-colors"
                      >
                        <span>{lang === 'zh' ? '查看产品' : 'View Product'}</span>
                        <span className="material-symbols-outlined text-[16px]">arrow_outward</span>
                      </a>
                    )}
                  </div>
                  <ul className="space-y-2.5">
                    {copy.projectBullets[projectId].map((bullet) => (
                      <li key={bullet} className="flex gap-3 text-sm text-[var(--text-secondary)] leading-relaxed">
                        <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[var(--site-accent)]" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              );
            })}
          </div>
        </section>
      </div>

      <footer className="p-6 border-t border-[var(--border-soft)] bg-[var(--surface-panel-muted)] shrink-0 flex justify-end">
        <span className="text-xs text-[var(--text-subtle)] font-mono">
          {copy.updatedLabel}: {copy.updatedAt}
        </span>
      </footer>
    </div>
  );
};
