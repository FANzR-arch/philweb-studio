/**
 * [INPUT]   : 联系方式文案、二维码资源与埋点能力
 * [OUTPUT]  : 联系方式弹窗内容，展示主联系渠道与社交平台入口
 * [POS]     : 弹窗内容层，承接站内的“继续联系”动作
 * [DECISION]: 以微信为主联系渠道，同时保留公开社交平台，兼顾私聊效率与公开验证
 */

import React, { useEffect } from 'react';
import { toast } from 'sonner';
import { useLanguage } from '../../data/i18n';
import { track } from '../../data/analytics';
import { useContactContent, useSharedContent } from '../../data/content';

export const ContactModalContent: React.FC = () => {
  const { lang } = useLanguage();
  const copy = useContactContent(lang);
  const shared = useSharedContent();
  const wechatId = shared.links.wechatId;
  const [copied, setCopied] = React.useState(false);
  const [qrError, setQrError] = React.useState(false);

  useEffect(() => {
    track('wechat_qr_view', {
      channel: 'wechat',
      lang,
      entry_section: 'contact_modal',
    });
  }, [lang]);

  const handleCopyWeChat = async () => {
    if (!navigator.clipboard) {
      track('wechat_copy', {
        channel: 'wechat',
        action: 'copy_no_clipboard',
        lang,
        entry_section: 'contact_modal',
      });
      return;
    }

    try {
      await navigator.clipboard.writeText(wechatId);
      setCopied(true);
      track('wechat_copy', {
        channel: 'wechat',
        action: 'copy_success',
        lang,
        entry_section: 'contact_modal',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (_error) {
      track('wechat_copy', {
        channel: 'wechat',
        action: 'copy_failed',
        lang,
        entry_section: 'contact_modal',
      });
      toast.error(lang === 'zh' ? '复制失败，请手动复制微信号' : 'Copy failed, please copy manually');
    }
  };

  const trackSocialOutbound = (channel: 'x' | 'xiaohongshu' | 'github' | 'email') => {
    track('social_outbound_click', {
      channel,
      lang,
      entry_section: 'contact_modal',
    });
  };

  return (
    <div data-edit="basic.contact" data-edit-label="联系方式" className="p-8 md:p-12 bg-[var(--surface-panel)]">
      <div className="space-y-8">
        <section className="theme-panel-inset rounded-xl border p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="material-symbols-outlined text-[var(--icon-primary)]">forum</span>
            <h3 className="text-base font-bold text-[var(--text-primary)]">
              {copy.wechatCardTitle}
            </h3>
          </div>
          <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-4">
            {copy.wechatDescription}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-4 items-center">
            <div className="size-36 bg-[var(--surface-panel)] p-2 border border-[var(--border-soft)] flex items-center justify-center overflow-hidden">
              {qrError ? (
                <span className="material-symbols-outlined text-5xl text-[var(--text-subtle)]">qr_code_2</span>
              ) : (
                <img
                  src={shared.assets.wechatQr || '/assets/qrcodes/wx.jpg'}
                  alt="WeChat QR Code"
                  className="w-full h-full object-contain"
                  onError={() => setQrError(true)}
                />
              )}
            </div>

            <div className="space-y-2">
              <p className="text-xs text-[var(--text-subtle)] uppercase tracking-wider font-bold">{copy.wechatIdLabel}</p>
              <p className="text-lg font-semibold text-[var(--text-primary)]">{wechatId}</p>
              <button
                onClick={handleCopyWeChat}
                className="theme-button-primary inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">content_copy</span>
                {copied
                  ? copy.copiedLabel
                  : copy.copyLabel}
              </button>
              <p className="text-xs text-[var(--text-muted)]">
                {copy.scanHint}
              </p>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {copy.channels.map((channel) => (
            <a
              key={channel.id}
              href={shared.links[channel.linkKey as keyof typeof shared.links]}
              target={channel.linkKey === 'email' ? undefined : '_blank'}
              rel={channel.linkKey === 'email' ? undefined : 'noopener noreferrer'}
              onClick={() => trackSocialOutbound(channel.id as 'x' | 'xiaohongshu' | 'github' | 'email')}
              className="theme-panel rounded-lg border p-4 hover:bg-[var(--interactive-hover-surface)] transition-colors"
            >
              <p className="text-xs uppercase tracking-wider text-[var(--text-subtle)] font-bold mb-1">{channel.label}</p>
              <p className="text-sm font-semibold text-[var(--text-primary)]">{channel.value}</p>
            </a>
          ))}
        </section>
      </div>
    </div>
  );
};
