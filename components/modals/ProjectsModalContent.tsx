/**
 * [INPUT]   : 当前项目数据、国际化文案与详情图片读取能力
 * [OUTPUT]  : 项目详情弹窗，按案例阅读顺序展示背景、方案与成果
 * [POS]     : 核心业务组件，承接项目列表后的深度阅读入口
 * [DECISION]: 取消多余标签切换，改为单一路径的 Case Study 叙事，减少用户在详情页里的决策负担
 */

import { FC, useMemo, useState } from 'react';
import { Project } from '../../types';
import { useLanguage } from '../../data/i18n';
import { getProjectDisplay } from '../../data/projectDisplay';
import { track } from '../../data/analytics';
import { useDetailImages } from '../../data/useImages';

const SectionTitle: FC<{ title: string; icon: string }> = ({ title, icon }) => (
  <div className="flex items-center gap-2 mb-4">
    <span className="material-symbols-outlined text-xl text-[var(--text-subtle)]">{icon}</span>
    <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--text-muted)]">{title}</h3>
  </div>
);

interface ProjectsModalContentProps {
  project: Project | null;
  onOpenContact?: () => void;
}

export const ProjectsModalContent: FC<ProjectsModalContentProps> = ({ project }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const { lang } = useLanguage();

  const manifestDetailImages = useDetailImages(project?.id || '');
  const detailImages = useMemo(() => {
    if (!project) return [];
    return manifestDetailImages.length > 0 ? [...manifestDetailImages] : (project.detailImages || []);
  }, [project, manifestDetailImages]);

  const display = useMemo(() => project ? getProjectDisplay(project, lang) : null, [project, lang]);
  const experiments = project?.locales?.[lang]?.experiments || [];
  const webCta = project?.cta?.web || project?.webLink;

  const copy = useMemo(
    () =>
      lang === 'zh'
        ? {
          overview: '项目概览',
          context: '背景与初衷',
          problem: '核心痛点',
          solution: '处理方式',
          goal: '目标',
          design: '产品设计',
          workflow: '技术与实现',
          reflection: '复盘与总结',
          advantages: '优势与亮点',
          limitations: '局限与不足',
          skillExperiments: 'AI Skill 实验',
          cta: '打开项目',
          ctaDesc: '可通过下方链接查看当前可访问版本。',
          contact: '联系我',
          web: '体验 Web 版本',
          desktop: '桌面版下载',
          resource: '案例文档',
          openResource: '查看仓库',
        }
        : {
          overview: 'Overview',
          context: 'Context',
          problem: 'Problems',
          solution: 'Approach',
          goal: 'Goal',
          design: 'Product Design',
          workflow: 'Build Notes',
          reflection: 'Reflection',
          advantages: 'Advantages',
          limitations: 'Limitations',
          skillExperiments: 'AI Skill Experiments',
          cta: 'Open Project',
          ctaDesc: 'Open the current version through the link below.',
          contact: 'Contact Me',
          web: 'Try Web Version',
          desktop: 'Desktop Download',
          resource: 'Case Notes',
          openResource: 'View Repo',
        },
    [lang]
  );

  const handleProjectCtaClick = (ctaType: 'web' | 'desktop' | 'resource', url: string) => {
    if (!project) return;
    track('project_cta_click', {
      projectId: project.id,
      ctaType,
      url,
      lang,
      entry_section: 'project_modal',
    });
  };

  if (!project || !display) {
    return null;
  }

  const ctaSection = (webCta || project.proofLink) ? (
    <section className="pt-2">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-8 bg-[var(--surface-panel-muted)] p-8 rounded-3xl border border-dashed border-[var(--border-strong)]">
        <div className="text-center sm:text-left">
          <h4 className="text-2xl font-bold mb-2 tracking-tight">{copy.cta}</h4>
          <p className="text-sm text-[var(--text-muted)]">{copy.ctaDesc}</p>
        </div>
        <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-4">
          {webCta && (
            <a
              href={webCta}
              target="_blank"
              rel="noreferrer"
              onClick={() => handleProjectCtaClick('web', webCta)}
              className="theme-button-primary inline-flex items-center justify-center gap-3 rounded-full px-10 py-5 text-lg font-black hover:scale-105 active:scale-95 transition-all shadow-[var(--card-shadow-hover)]"
            >
              <span>{copy.web}</span>
              <span className="material-symbols-outlined text-xl">rocket_launch</span>
            </a>
          )}
          {project.proofLink && (
            <a
              href={project.proofLink.url}
              target="_blank"
              rel="noreferrer"
              onClick={() => handleProjectCtaClick('resource', project.proofLink!.url)}
              className="theme-button-secondary inline-flex items-center justify-center gap-3 rounded-full border-2 px-8 py-5 text-base font-bold transition-all shadow-lg group"
            >
              <span>{copy.resource}</span>
              <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
            </a>
          )}
        </div>
      </div>
    </section>
  ) : null;

  return (
    <div data-edit={`project:${project.id}`} data-edit-label={`项目「${display.title}」`} className="flex flex-col h-full bg-[var(--surface-panel)] text-[var(--text-primary)] rounded-2xl overflow-hidden">
      {/* 顶部摘要区先交代年份、版本、角色与结果，帮助用户在最短时间内建立项目全貌。 */}
      <div className="sticky top-0 bg-[var(--surface-panel-muted)] backdrop-blur-sm z-10 border-b border-[var(--border-soft)] px-6 sm:px-8 py-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <span className="theme-pill text-xs font-mono px-2 py-0.5 rounded-full uppercase tracking-wider">
                {project.year}
              </span>
              {project.version && (
                <span className="theme-pill text-xs font-mono px-2 py-0.5 rounded-full border uppercase tracking-wider">
                  {project.version}
                </span>
              )}
            </div>
            <h2 className="text-3xl font-bold tracking-tight mb-2 text-[var(--text-primary)]">{display.title}</h2>
            <div className="flex items-center gap-4 text-sm text-[var(--text-muted)]">
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-base">person</span>
                {project.role}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 主内容区按“看图 -> 理解背景 -> 评估方案 -> 查看结果”的顺序组织，降低阅读跳转成本。 */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-6 sm:px-8 pb-12 pt-6">
          <div className="space-y-12">
            {/* 首屏图片区优先展示项目界面或成果图，让用户先建立视觉印象。 */}
            {detailImages.length > 0 && (
              <div className="relative group">
                <div className="aspect-[16/10] w-full bg-[var(--surface-inset)] rounded-2xl overflow-hidden border border-[var(--border-soft)]">
                  <img
                    src={detailImages[currentImageIndex]}
                    alt={`${display.title} detail ${currentImageIndex + 1}`}
                    className="w-full h-full object-contain"
                  />
                </div>

                {detailImages.length > 1 && (
                  <>
                    <button
                      onClick={() => setCurrentImageIndex((prev) => (prev === 0 ? detailImages.length - 1 : prev - 1))}
                      className="absolute left-4 top-1/2 -translate-y-1/2 bg-[var(--surface-panel-muted)] hover:bg-[var(--interactive-hover-surface)] text-[var(--text-primary)] p-2 rounded-full shadow-sm backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                    >
                      <span className="material-symbols-outlined text-sm">arrow_back</span>
                    </button>
                    <button
                      onClick={() => setCurrentImageIndex((prev) => (prev === detailImages.length - 1 ? 0 : prev + 1))}
                      className="absolute right-4 top-1/2 -translate-y-1/2 bg-[var(--surface-panel-muted)] hover:bg-[var(--interactive-hover-surface)] text-[var(--text-primary)] p-2 rounded-full shadow-sm backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                    >
                      <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </button>
                  </>
                )}
              </div>
            )}

            {project.caseStudy && (
              <div className="space-y-12">
                {/* 背景区解释项目从什么场景出发，帮助后面的痛点与方案更容易被理解。 */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                  <div className="lg:col-span-1">
                    <SectionTitle title={copy.context} icon="history_edu" />
                  </div>
                  <div className="lg:col-span-2">
                    <p className="text-lg text-[var(--text-secondary)] leading-relaxed font-serif italic opacity-90">
                      "{project.caseStudy[lang].context}"
                    </p>
                  </div>
                </div>

                {ctaSection}

                {experiments.length > 0 && (
                  <section>
                    <SectionTitle title={copy.skillExperiments} icon="extension" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {experiments.map((item, i) => (
                        <article key={`${item.title}-${i}`} className="theme-panel rounded-2xl border overflow-hidden shadow-sm">
                          {item.image && (
                            <div className="aspect-[16/9] bg-[var(--surface-inset)] border-b border-[var(--border-soft)] overflow-hidden">
                              <img
                                src={item.image}
                                alt={item.title}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          <div className="p-5">
                            <div className="flex items-start justify-between gap-4 mb-4">
                            <div>
                              {item.tag && (
                                <span className="inline-flex mb-2 text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                                  {item.tag}
                                </span>
                              )}
                              <h4 className="text-lg font-bold text-[var(--text-primary)] leading-snug">{item.title}</h4>
                            </div>
                            <span className="material-symbols-outlined text-2xl text-[var(--text-subtle)]">deployed_code</span>
                          </div>
                          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{item.description}</p>
                          {item.url && (
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noreferrer"
                              onClick={() => handleProjectCtaClick('resource', item.url!)}
                              className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[var(--text-primary)] hover:text-[var(--text-accent)] transition-colors"
                            >
                              <span>{item.linkLabel || copy.openResource}</span>
                              <span className="material-symbols-outlined text-base">open_in_new</span>
                            </a>
                          )}
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>
                )}

                {/* 痛点和解决方案并列展示，让问题与回答形成直接对照。 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <section className="theme-status-risk rounded-2xl p-6 border">
                    <SectionTitle title={copy.problem} icon="warning_amber" />
                    {display.problemLine && (
                      <p className="mb-4 text-sm font-medium leading-relaxed text-[var(--status-risk-fg)]">
                        {display.problemLine}
                      </p>
                    )}
                    <ul className="space-y-4">
                      {project.caseStudy[lang].problem.map((item: string, i: number) => (
                        <li key={i} className="flex gap-3 text-sm text-[var(--status-risk-fg)] leading-relaxed">
                          <span className="flex-shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full bg-[var(--status-risk-fg)]" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </section>

                  <section className="theme-status-success rounded-2xl p-6 border">
                    <SectionTitle title={copy.solution} icon="lightbulb" />
                    <p className="text-sm text-[var(--status-success-fg)] font-medium leading-relaxed mb-4">
                      {project.caseStudy[lang].solution}
                    </p>
                    {project.caseStudy[lang].goal && (
                      <div className="mt-4 pt-4 border-t border-[var(--status-success-border)]">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--status-success-fg)] block mb-1">{copy.goal}</span>
                        <p className="text-sm text-[var(--status-success-fg)]">{project.caseStudy[lang].goal}</p>
                      </div>
                    )}
                  </section>
                </div>

                {/* 设计与实现拆成两列，一侧讲产品组织方式，一侧讲技术或流程支撑。 */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <section>
                    <SectionTitle title={copy.design} icon="layers" />
                    <div className="space-y-4">
                      {project.caseStudy[lang].design?.map((item: string, i: number) => (
                        <div key={i} className="theme-panel p-4 rounded-xl border shadow-sm">
                          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                            {item}
                          </p>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section>
                    <SectionTitle title={copy.workflow} icon="account_tree" />
                    <div className="theme-panel-inset p-6 rounded-2xl border relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <span className="material-symbols-outlined text-6xl">terminal</span>
                      </div>
                      <p className="text-sm text-[var(--text-muted)] leading-relaxed relative z-10 font-mono">
                        {project.caseStudy[lang].workflow}
                      </p>
                    </div>
                  </section>
                </div>

                {/* 复盘区同时保留亮点与不足，避免案例只展示结果而缺少判断依据。 */}
                <section>
                  <SectionTitle title={copy.reflection} icon="psychology" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* 优势区总结已经被验证的有效做法，方便复用到后续项目。 */}
                    {project.caseStudy[lang].reflection?.pros && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-[var(--status-info-fg)] mb-2">
                          <span className="material-symbols-outlined text-lg font-bold">check_circle</span>
                          <span className="text-xs font-bold uppercase tracking-wider">{copy.advantages}</span>
                        </div>
                        <div className="space-y-3">
                          {project.caseStudy[lang].reflection.pros.map((item: string, i: number) => (
                            <div key={i} className="theme-status-info p-4 rounded-xl border shadow-sm">
                              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                                {item}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 局限区明确当前版本的边界，帮助读者理解项目仍待改进的部分。 */}
                    {project.caseStudy[lang].reflection?.cons && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-[var(--status-warning-fg)] mb-2">
                          <span className="material-symbols-outlined text-lg font-bold">report_problem</span>
                          <span className="text-xs font-bold uppercase tracking-wider">{copy.limitations}</span>
                        </div>
                        <div className="space-y-3">
                          {project.caseStudy[lang].reflection.cons.map((item: string, i: number) => (
                            <div key={i} className="theme-status-warning p-4 rounded-xl border shadow-sm">
                              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                                {item}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </section>
              </div>
            )}

            {/* 没有案例内容的项目仍保留行动入口。 */}
            {!project.caseStudy && ctaSection}
          </div>
        </div>
      </div>
    </div>
  );
};
