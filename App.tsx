/**
 * [INPUT]   : 类型定义、Dashboard 组件、全局数据模块与主题配置
 * [OUTPUT]  : 作品集首页的布局组装、弹窗状态与全局副作用初始化
 * [POS]     : 应用入口层，负责把展示组件、URL 状态和全局能力串联起来
 * [DECISION]: 将弹窗、深链同步与站点启动逻辑集中在 App 中，避免状态分散到多个展示组件
 */

import React, { useEffect, useState } from 'react';
import { ModalType, Project } from './types';
import { Modal } from './components/ui/Modal';
import { Sidebar } from './components/dashboard/Sidebar';
import { useAllProjects, useHomeContent, useSharedContent, useSiteConfig, useSiteContent } from './data/content';
import { ProjectsModalContent } from './components/modals/ProjectsModalContent';
import { ContactModalContent } from './components/modals/ContactModalContent';
import { TimelineModalContent } from './components/modals/TimelineModalContent';
import { SkillsModalContent } from './components/modals/SkillsModalContent';
import { useLanguage } from './data/i18n';
import { track } from './data/analytics';
import { IntroSection } from './components/dashboard/IntroSection';
import { BlogSection } from './components/dashboard/BlogSection';
import { ProjectList } from './components/dashboard/ProjectList';
import { QuickLinks } from './components/dashboard/QuickLinks';
import { Toaster } from 'sonner';
import { applyThemeToRoot } from './data/theme';

const App: React.FC = () => {
  const [activeModal, setActiveModal] = useState<ModalType>(ModalType.NONE);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const { lang } = useLanguage();
  const homeContent = useHomeContent(lang);
  const sharedContent = useSharedContent();
  const siteConfig = useSiteConfig();
  const allProjects = useAllProjects();
  const { theme } = useSiteContent();
  const backgroundMode = theme.effects?.background?.mode ?? 'default';
  const backgroundPattern = theme.effects?.background?.pattern ?? 'grid';
  const projectModalTitle = selectedProject?.locales?.[lang]?.title ?? selectedProject?.title;
  const projectModalAriaLabel =
    lang === 'zh'
      ? `项目详情${projectModalTitle ? `：${projectModalTitle}` : ''}`
      : `Project details${projectModalTitle ? `: ${projectModalTitle}` : ''}`;

  const openModal = (type: ModalType, source = 'ui') => {
    if (type === ModalType.CONTACT) {
      track('contact_click', { source, lang, entry_section: source });
    }
    setActiveModal(type);
  };

  const closeModal = () => {
    setActiveModal(ModalType.NONE);
    // 等待退出动画结束后再清理项目详情，避免弹窗关闭瞬间出现内容闪烁。
    setTimeout(() => setSelectedProject(null), 400);
  };

  const openProjectDetail = (project: Project, source = 'project_list') => {
    track('project_open', { source, projectId: project.id, lang, entry_section: source });
    setSelectedProject(project);
    setActiveModal(ModalType.PROJECTS);
  };

  const openProjectById = (projectId: Project['id'], source = 'project_lookup') => {
    const project = allProjects.find((item) => item.id === projectId);
    if (project) {
      openProjectDetail(project, source);
    }
  };

  // 首屏挂载时一次性完成主题变量注入与访问埋点，
  // 让全局启动逻辑集中在同一个入口，后续排查副作用也更直接。
  useEffect(() => {
    applyThemeToRoot(theme);
  }, [theme]);

  useEffect(() => {
    if (!selectedProject) return;
    const next = allProjects.find((item) => item.id === selectedProject.id);
    if (next && next !== selectedProject) {
      setSelectedProject(next);
    }
  }, [allProjects, selectedProject]);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const projectId = query.get('project');
    const pack = query.get('pack');

    track('home_view', {
      lang,
      entryProject: projectId || undefined,
      entryPack: pack || undefined,
      entry_section: 'home',
    });

    if (projectId) {
      const project = allProjects.find((item) => item.id === projectId);
      if (project) {
        openProjectDetail(project, 'deep_link');
      }
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.siteBackgroundMode = backgroundMode;
    root.dataset.siteBackgroundPattern = backgroundPattern;
  }, [backgroundMode, backgroundPattern]);

  useEffect(() => {
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
    document.title = homeContent.sidebar.name;
  }, [homeContent.sidebar.name, lang]);

  useEffect(() => {
    // 将语言和当前打开的项目状态同步回 URL，保证分享链接与刷新后的界面状态一致。
    const query = new URLSearchParams(window.location.search);
    query.set('lang', lang);

    if (activeModal === ModalType.PROJECTS && selectedProject) {
      query.set('project', selectedProject.id);
    } else {
      query.delete('project');
    }

    query.delete('pack');

    const queryString = query.toString();
    const nextUrl = queryString ? `${window.location.pathname}?${queryString}` : window.location.pathname;
    window.history.replaceState({}, '', nextUrl);
  }, [activeModal, selectedProject, lang]);

  useEffect(() => {
    // 极光背景不直接走 CSS keyframes，而是通过三次贝塞尔曲线动态生成移动路径，
    // 再借助 requestAnimationFrame 持续写入 CSS 变量，使光晕运动更自然且便于响应窗口尺寸变化。
    const root = document.documentElement;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    type Point = { x: number; y: number };

    let rafId = 0;
    let currentX = window.innerWidth * 0.5;
    let currentY = window.innerHeight * 0.5;

    let p0: Point = { x: currentX, y: currentY };
    let p1: Point = { x: currentX, y: currentY };
    let p2: Point = { x: currentX, y: currentY };
    let p3: Point = { x: currentX, y: currentY };

    let segmentStartAt = 0;
    let segmentDuration = 12000;

    const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

    const getBounds = () => {
      const padX = Math.max(Math.min(window.innerWidth * 0.1, 140), 56);
      const padY = Math.max(Math.min(window.innerHeight * 0.1, 120), 48);
      return {
        minX: padX,
        maxX: Math.max(padX, window.innerWidth - padX),
        minY: padY,
        maxY: Math.max(padY, window.innerHeight - padY),
      };
    };

    const randomPoint = (): Point => {
      const { minX, maxX, minY, maxY } = getBounds();
      return {
        x: minX + Math.random() * (maxX - minX),
        y: minY + Math.random() * (maxY - minY),
      };
    };

    const cubicBezierPoint = (t: number, a: Point, b: Point, c: Point, d: Point): Point => {
      const u = 1 - t;
      const tt = t * t;
      const uu = u * u;
      const uuu = uu * u;
      const ttt = tt * t;

      return {
        x: (uuu * a.x) + (3 * uu * t * b.x) + (3 * u * tt * c.x) + (ttt * d.x),
        y: (uuu * a.y) + (3 * uu * t * b.y) + (3 * u * tt * c.y) + (ttt * d.y),
      };
    };

    const beginBezierSegment = (now: number, rebase = false) => {
      // 每一段轨迹都从当前可见位置继续出发，并重新随机终点与控制点，
      // 这样光晕不会突然跳变，同时能维持缓慢漂移的观感。
      const { minX, maxX, minY, maxY } = getBounds();
      currentX = clamp(currentX, minX, maxX);
      currentY = clamp(currentY, minY, maxY);

      if (rebase) {
        const clampedNow = {
          x: clamp(currentX, minX, maxX),
          y: clamp(currentY, minY, maxY),
        };
        currentX = clampedNow.x;
        currentY = clampedNow.y;
      }

      p0 = { x: currentX, y: currentY };
      p3 = randomPoint();

      const minDistance = Math.max(Math.min(Math.min(window.innerWidth, window.innerHeight) * 0.2, 260), 120);
      let safety = 0;
      while (Math.hypot(p3.x - p0.x, p3.y - p0.y) < minDistance && safety < 6) {
        p3 = randomPoint();
        safety += 1;
      }

      const dx = p3.x - p0.x;
      const dy = p3.y - p0.y;
      const length = Math.hypot(dx, dy) || 1;
      const nx = -dy / length;
      const ny = dx / length;

      const bendBase = Math.min(Math.min(window.innerWidth, window.innerHeight) * 0.22, length * 0.45);
      const bendA = (Math.random() * 2 - 1) * bendBase;
      const bendB = (Math.random() * 2 - 1) * bendBase;

      p1 = {
        x: clamp(p0.x + dx * 0.28 + nx * bendA, minX, maxX),
        y: clamp(p0.y + dy * 0.28 + ny * bendA, minY, maxY),
      };
      p2 = {
        x: clamp(p0.x + dx * 0.72 + nx * bendB, minX, maxX),
        y: clamp(p0.y + dy * 0.72 + ny * bendB, minY, maxY),
      };

      segmentStartAt = now;
      segmentDuration = 9500 + Math.random() * 9000;
    }

    const tick = (now: number) => {
      // 每一帧都推进当前曲线进度，并把结果写回 CSS 变量，
      // 这样动画节奏能和浏览器刷新率保持一致，减少卡顿或撕裂感。
      const rawProgress = segmentDuration <= 0 ? 1 : (now - segmentStartAt) / segmentDuration;
      const progress = rawProgress < 0 ? 0 : rawProgress > 1 ? 1 : rawProgress;
      const eased = progress * progress * (3 - 2 * progress);
      const point = cubicBezierPoint(eased, p0, p1, p2, p3);
      currentX = point.x;
      currentY = point.y;

      if (rawProgress >= 1) {
        beginBezierSegment(now);
      }

      const time = now / 1000;
      const auroraScale = 1 + Math.sin(time * 0.34) * 0.018 + Math.cos(time * 0.17) * 0.012;
      const auroraSpread = 1.02 + (Math.sin(time * 0.27) + 1) * 0.1 + (Math.cos(time * 0.12) + 1) * 0.03;
      const auroraRotate = Math.sin(time * 0.24) * 1.8 + Math.cos(time * 0.11) * 1.1;
      const auroraHue = Math.sin(time * 0.3) * 8 + Math.cos(time * 0.14) * 4;
      const auroraBloom = 1.01 + (Math.sin(time * 0.2) + 1) * 0.05;
      const gridHue = Math.sin(time * 0.26) * 5 + Math.cos(time * 0.13) * 3;
      const gridSaturation = 1.01 + (Math.sin(time * 0.18) + 1) * 0.04;

      root.style.setProperty('--site-aurora-anchor-x', `${currentX.toFixed(2)}px`);
      root.style.setProperty('--site-aurora-anchor-y', `${currentY.toFixed(2)}px`);
      root.style.setProperty('--site-aurora-scale', auroraScale.toFixed(3));
      root.style.setProperty('--site-aurora-spread', auroraSpread.toFixed(3));
      root.style.setProperty('--site-aurora-rotate', `${auroraRotate.toFixed(2)}deg`);
      root.style.setProperty('--site-aurora-hue-shift', `${auroraHue.toFixed(2)}deg`);
      root.style.setProperty('--site-aurora-bloom', auroraBloom.toFixed(3));
      root.style.setProperty('--site-grid-hue-shift', `${gridHue.toFixed(2)}deg`);
      root.style.setProperty('--site-grid-sat-boost', gridSaturation.toFixed(3));

      rafId = window.requestAnimationFrame(tick);
    };

    const handleResize = () => {
      beginBezierSegment(performance.now(), true);
    };

    const initial = randomPoint();
    currentX = initial.x;
    currentY = initial.y;
    root.style.setProperty('--site-aurora-anchor-x', `${currentX.toFixed(2)}px`);
    root.style.setProperty('--site-aurora-anchor-y', `${currentY.toFixed(2)}px`);
    beginBezierSegment(performance.now(), true);
    window.addEventListener('resize', handleResize);
    rafId = window.requestAnimationFrame(tick);

    return () => {
      // 组件卸载时同时清理动画帧、监听器和动态变量，避免后续页面残留背景状态。
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleResize);
      root.style.removeProperty('--site-aurora-anchor-x');
      root.style.removeProperty('--site-aurora-anchor-y');
      root.style.removeProperty('--site-aurora-scale');
      root.style.removeProperty('--site-aurora-spread');
      root.style.removeProperty('--site-aurora-rotate');
      root.style.removeProperty('--site-aurora-hue-shift');
      root.style.removeProperty('--site-aurora-bloom');
      root.style.removeProperty('--site-grid-hue-shift');
      root.style.removeProperty('--site-grid-sat-boost');
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col font-sans text-[var(--text-primary)] antialiased">
      <div className="site-background-media" aria-hidden="true">
        {sharedContent.assets.backgroundImage && (
          <div
            className="site-background-image"
            style={{ backgroundImage: `url(${sharedContent.assets.backgroundImage})` }}
          />
        )}
        {sharedContent.assets.backgroundVideo && (
          <video
            className="site-background-video"
            src={sharedContent.assets.backgroundVideo}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
          />
        )}
        <div className="site-background-scrim" />
      </div>
      <main
        data-edit="theme.background"
        data-edit-target="theme.background"
        data-edit-label="页面背景"
        data-edit-default
        className="flex-grow flex flex-col items-center justify-center px-4 md:px-6 xl:px-10 py-3 md:py-4 min-h-screen"
      >
        <div className="w-full max-w-[1440px] grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-5 items-stretch">

          {/* 左侧列承载个人信息与品牌展示。 */}
          <div className="lg:col-span-4 flex flex-col h-full">
            <Sidebar />
          </div>

          {/* 右侧主区域集中承载问候、文章与项目证据，形成从阅读到证明的顺序。 */}
          <div className="lg:col-span-8 flex flex-col gap-4 md:gap-5 min-h-0 h-full">
            {/* 顶部区域只保留问候与切换能力，避免首屏信息密度过高。 */}
            <div className="w-full">
              <IntroSection />
            </div>

            {/* 下半区拆成“文章阅读 + 项目证据/行动入口”，让主内容先从文章开始。 */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-9 gap-4 md:gap-5 items-stretch min-h-0">
              {/* 文章列直接展示全部文章，分类筛选和卡片滚动在区域内部完成。 */}
              <div className="lg:col-span-5 flex flex-col min-h-0 h-full">
                <BlogSection />
              </div>

              {/* 项目列承接案例入口和快捷动作。 */}
              <div className="lg:col-span-4 flex flex-col gap-4 md:gap-3 h-full animate-fade-in-up delay-4">
                <ProjectList onOpenProject={(project) => openProjectDetail(project, 'project_list')} />
                <QuickLinks
                  onOpenContact={() => openModal(ModalType.CONTACT, 'quick_links')}
                  onOpenTimeline={() => openModal(ModalType.TIMELINE, 'quick_links')}
                />
              </div>
            </div>
          </div>

        </div>

        <footer className="w-full mt-10 md:mt-12 text-center text-[var(--text-subtle)] text-[10px] tracking-widest font-mono uppercase">
          <p data-edit="home.footerStyle" data-edit-label="页脚">{homeContent.footer.copyright} {homeContent.footer.style}</p>
          {siteConfig.attribution.enabled && (
            <p className="mt-1.5 normal-case tracking-normal">
              <a
                href={siteConfig.attribution.url || '#'}
                target="_blank"
                rel="noreferrer"
                className="opacity-60 hover:opacity-100 hover:text-[var(--site-accent)] transition-opacity"
              >
                {lang === 'zh' ? siteConfig.attribution.labelZh : siteConfig.attribution.labelEn}
              </a>
            </p>
          )}
        </footer>
      </main >

      <Modal
        isOpen={activeModal === ModalType.PROJECTS}
        onClose={closeModal}
        ariaLabel={projectModalAriaLabel}
        maxWidth="max-w-3xl"
        editTarget={selectedProject ? `project:${selectedProject.id}` : 'projects'}
        editLabel={selectedProject ? `项目「${projectModalTitle ?? selectedProject.id}」` : '项目作品'}
      >
        <ProjectsModalContent
          project={selectedProject}
          onOpenContact={() => openModal(ModalType.CONTACT, 'project_modal_cta')}
        />
      </Modal>

      <Modal
        isOpen={activeModal === ModalType.CONTACT}
        onClose={closeModal}
        title={lang === 'zh' ? '联系方式 / Contact' : 'Contact'}
        maxWidth="max-w-xl"
        editTarget="basic.contact"
        editLabel="联系方式"
      >
        <ContactModalContent />
      </Modal>

      <Modal
        isOpen={activeModal === ModalType.TIMELINE}
        onClose={closeModal}
        title={homeContent.timeline.title}
        maxWidth="max-w-3xl"
        contentClassName="scrollbar-hide"
        editTarget="home.timeline"
        editLabel="成长轨迹"
      >
        <TimelineModalContent />
      </Modal>

      <Modal
        isOpen={activeModal === ModalType.SKILLS}
        onClose={closeModal}
        title="Skills"
        maxWidth="max-w-2xl"
        editTarget="skills"
        editLabel="技能内容"
      >
        <SkillsModalContent />
      </Modal>

      <Toaster position="bottom-right" richColors />
    </div >
  );
};

export default App;
