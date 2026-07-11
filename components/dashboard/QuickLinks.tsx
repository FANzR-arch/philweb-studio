import React from 'react';
import { toast } from 'sonner';
import { track } from '../../data/analytics';
import { togglePersonalAIChat } from '../../data/cozeChatbot';
import { useLanguage } from '../../data/i18n';
import { getHomeContent, getSharedContent } from '../../data/content';
import { Card } from '../ui/Card';

const UNSUPPORTED_LOCAL_PERSONAL_AI_CONTEXT_ERROR = 'UnsupportedLocalPersonalAIContextError';

interface QuickLinksProps {
  onOpenContact: () => void;
  onOpenBlog: () => void;
}

export const QuickLinks: React.FC<QuickLinksProps> = ({ onOpenContact, onOpenBlog }) => {
  const { lang } = useLanguage();
  const homeContent = getHomeContent(lang);
  const shared = getSharedContent();
  const [isStartingPersonalAI, setIsStartingPersonalAI] = React.useState(false);

  const handlePersonalAIClick = async () => {
    if (isStartingPersonalAI) {
      return;
    }

    const loadingToastId = toast.loading(
      homeContent.quickLinks.personalAI.loadingSubtitle,
      {
        description:
          lang === 'zh'
            ? '聊天窗口准备完成后会自动打开。'
            : 'The chat window will open automatically once it is ready.',
      },
    );

    setIsStartingPersonalAI(true);
    track('personal_ai_click', {
      source: 'quick_links',
      lang,
      entry_section: 'cta_area',
    });

    try {
      await togglePersonalAIChat(lang);
      toast.dismiss(loadingToastId);
    } catch (error) {
      toast.dismiss(loadingToastId);
      console.error('[coze] failed to open personal AI chat', error);

      if (error instanceof Error && error.name === UNSUPPORTED_LOCAL_PERSONAL_AI_CONTEXT_ERROR) {
        toast.error(
          lang === 'zh'
            ? '当前本地地址不支持 Personal AI，请改用 localhost 打开。'
            : 'This local address does not support Personal AI. Use localhost instead.',
          {
            description:
              lang === 'zh'
                ? '局域网 HTTP 地址会被浏览器视为非安全上下文，语音、设备能力和 token 路由都会异常。'
                : 'Browsers treat LAN HTTP URLs as insecure contexts, which breaks voice, device access, and the token route.',
          },
        );
        return;
      }

      toast.error(lang === 'zh' ? '个人 AI 暂不可用' : 'Personal AI is unavailable', {
        description: lang === 'zh' ? '请稍后重试。' : 'Please try again later.',
      });
    } finally {
      setIsStartingPersonalAI(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 animate-fade-in-up delay-4 shrink-0">
      <div data-edit="hint:quicklinks" data-edit-label="快捷入口" className="grid grid-cols-2 gap-3 h-[78px] sm:h-[82px]">
        <Card
          variant="secondary"
          onClick={onOpenContact}
          className="!p-0 group"
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
          onClick={onOpenBlog}
          className="!p-0 group"
        >
          <div className="flex flex-row items-center justify-start gap-4 w-full h-full pl-6 sm:pl-8">
            <span className="material-symbols-outlined text-[var(--icon-muted)] group-hover:text-[var(--site-accent)] transition-colors flex-shrink-0 text-[26px]">
              article
            </span>
            <span className="text-[14px] font-bold text-[var(--text-secondary)] group-hover:text-[var(--site-accent)] transition-colors tracking-tight line-clamp-2">
              {homeContent.quickLinks.blog}
            </span>
          </div>
        </Card>
      </div>

      <Card
        variant="secondary"
        className={`personal-ai-card relative overflow-hidden shrink-0 !p-0 group border border-[var(--border-soft)] h-[78px] sm:h-[82px] ${
          isStartingPersonalAI ? 'pointer-events-none cursor-progress opacity-[0.92]' : 'cursor-pointer'
        }`}
        onClick={handlePersonalAIClick}
        aria-disabled={isStartingPersonalAI}
        aria-busy={isStartingPersonalAI}
        tabIndex={isStartingPersonalAI ? -1 : 0}
      >
        <div
          aria-hidden
          className={`personal-ai-radial pointer-events-none absolute inset-0 transition-opacity duration-500 ${
            isStartingPersonalAI ? 'opacity-85' : 'opacity-60 group-hover:opacity-100'
          }`}
        />
        <div
          aria-hidden
          className={`personal-ai-flow pointer-events-none absolute -inset-[40%] transition-transform duration-1000 ${
            isStartingPersonalAI ? 'scale-100' : 'group-hover:scale-105'
          }`}
        />
        <div className="personal-ai-content relative z-10 w-full flex-1 h-full flex flex-row items-center justify-between px-6 sm:px-8">
          <div className="flex items-center gap-4">
            <img
              src={shared.assets.brandMark || '/Logo/nocolor/FZR.svg'}
              alt="Personal AI"
              className={`w-5 h-7 transition-all duration-300 drop-shadow-md ${
                isStartingPersonalAI ? 'opacity-90 scale-100' : 'opacity-80 group-hover:opacity-100 group-hover:scale-110'
              }`}
            />
            <div className="flex flex-col justify-center">
              <span className="text-[14px] font-bold text-[var(--text-primary)] transition-colors line-clamp-2">
                {homeContent.quickLinks.personalAI.title}
              </span>
              <p className="text-[11px] font-medium text-[var(--text-muted)] leading-none mt-1.5 opacity-90 transition-colors line-clamp-2">
                {isStartingPersonalAI
                  ? homeContent.quickLinks.personalAI.loadingSubtitle
                  : homeContent.quickLinks.personalAI.subtitle}
              </p>
            </div>
          </div>
          <div className="w-9 h-9 rounded-full bg-[var(--interactive-soft-hover)] flex items-center justify-center transition-colors shrink-0">
            {isStartingPersonalAI ? (
              <span
                aria-hidden
                className="inline-block w-4 h-4 rounded-full border-2 border-[var(--text-primary)] border-t-transparent animate-spin"
              />
            ) : (
              <span className="material-symbols-outlined text-[var(--text-primary)] text-[16px]">arrow_forward</span>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};
