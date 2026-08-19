/**
 * [INPUT]   : 打开状态、关闭回调、标题、无标题语义标签与弹窗内容
 * [OUTPUT]  : 带动画、滚动锁定、焦点管理与键盘可访问性的通用 Modal
 * [POS]     : UI 基础组件层，统一站内弹窗交互
 * [DECISION]: 通过一致的焦点进入、圈定与恢复策略，让现有弹窗行为在不改内容的前提下满足可访问性要求
 */

import React, { useEffect, useId, useRef, useState } from 'react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  ariaLabel?: string;
  maxWidth?: string;
  contentClassName?: string;
  /** Studio 预览中的点击定位目标；线上产物不会注入对应的编辑覆盖层。 */
  editTarget?: string;
  editLabel?: string;
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

const getFocusableElements = (container: HTMLElement | null): HTMLElement[] => {
  if (!container) {
    return [];
  }

  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter((element) => {
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && style.visibility !== 'hidden' && !element.hasAttribute('disabled');
  });
};

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  children,
  title,
  ariaLabel,
  maxWidth = 'max-w-4xl',
  contentClassName = '',
  editTarget,
  editLabel,
}) => {
  const [shouldRender, setShouldRender] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const closeTimerRef = useRef<number | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const previousFocusedElementRef = useRef<HTMLElement | null>(null);
  const bodyOverflowRef = useRef<string | null>(null);
  const bodyPaddingRightRef = useRef<string | null>(null);
  const titleId = useId();

  const restoreBodyStyles = () => {
    if (bodyOverflowRef.current === null || bodyPaddingRightRef.current === null) {
      return;
    }

    document.body.style.overflow = bodyOverflowRef.current;
    document.body.style.paddingRight = bodyPaddingRightRef.current;
  };

  const restoreFocus = () => {
    const previousElement = previousFocusedElementRef.current;
    if (previousElement && document.contains(previousElement)) {
      previousElement.focus();
    }
  };

  useEffect(() => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }

    if (isOpen && !shouldRender) {
      previousFocusedElementRef.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      bodyOverflowRef.current = document.body.style.overflow;
      bodyPaddingRightRef.current = document.body.style.paddingRight;
      setShouldRender(true);

      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight =
        scrollbarWidth > 0 ? `${scrollbarWidth}px` : (bodyPaddingRightRef.current ?? '');
      return;
    }

    if (!isOpen && shouldRender) {
      setIsAnimating(false);
      closeTimerRef.current = window.setTimeout(() => {
        restoreBodyStyles();
        setShouldRender(false);
        restoreFocus();
      }, 380);
    }

    return () => {
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
      }
    };
  }, [isOpen, shouldRender]);

  useEffect(() => {
    return () => {
      restoreBodyStyles();
    };
  }, []);

  useEffect(() => {
    if (!shouldRender || !isOpen) {
      return;
    }

    let animationFrameId = 0;
    let nestedAnimationFrameId = 0;
    let focusFrameId = 0;

    animationFrameId = window.requestAnimationFrame(() => {
      nestedAnimationFrameId = window.requestAnimationFrame(() => {
        setIsAnimating(true);
      });
    });

    focusFrameId = window.requestAnimationFrame(() => {
      const focusableElements = getFocusableElements(dialogRef.current);
      const initialFocusTarget = focusableElements[0] ?? dialogRef.current;
      initialFocusTarget?.focus();
    });

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      window.cancelAnimationFrame(nestedAnimationFrameId);
      window.cancelAnimationFrame(focusFrameId);
    };
  }, [isOpen, shouldRender]);

  useEffect(() => {
    if (!shouldRender) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) {
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      const dialog = dialogRef.current;
      if (!dialog) {
        return;
      }

      const focusableElements = getFocusableElements(dialog);
      if (focusableElements.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const activeElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      if (!activeElement || !dialog.contains(activeElement)) {
        event.preventDefault();
        focusableElements[0].focus();
        return;
      }

      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, shouldRender]);

  if (!shouldRender) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 pointer-events-none">
      <div
        data-edit={editTarget}
        data-edit-label={editLabel}
        className={`absolute inset-0 bg-[var(--overlay-backdrop)] backdrop-blur-xl pointer-events-auto modal-backdrop-transition ${isAnimating ? 'opacity-100' : 'opacity-0'
          }`}
        onClick={onClose}
      />

      <div
        ref={dialogRef}
        data-edit={editTarget}
        data-edit-label={editLabel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-label={title ? undefined : ariaLabel}
        tabIndex={-1}
        className={`liquid-modal-shell relative w-full ${maxWidth} bg-[var(--surface-panel)] border border-[var(--border-soft)] shadow-[var(--card-shadow-hover)] flex flex-col max-h-[90vh] pointer-events-auto rounded-[var(--card-radius)] modal-content-transition ${isAnimating
          ? 'opacity-100 scale-100 translate-y-0'
          : 'opacity-0 scale-[0.96] translate-y-5'
          }`}
      >
        {title ? (
          <div className="flex items-center justify-between p-6 sm:px-8 sm:pt-8 border-b border-[var(--border-soft)] shrink-0">
            <h2 id={titleId} className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
              {title}
            </h2>
            <button
              onClick={onClose}
              aria-label="Close modal"
              className="theme-icon-button size-10 flex items-center justify-center transition-colors rounded-full"
            >
              <span className="material-symbols-outlined text-2xl transition-colors">
                close
              </span>
            </button>
          </div>
        ) : (
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="theme-icon-button liquid-modal-free absolute top-4 right-4 sm:top-6 sm:right-6 z-30 size-10 flex items-center justify-center transition-colors rounded-full"
          >
            <span className="material-symbols-outlined text-2xl transition-colors">
              close
            </span>
          </button>
        )}

        <div className={`flex-1 overflow-y-auto custom-scrollbar p-0 relative z-0 ${contentClassName}`}>
          {children}
        </div>
      </div>
    </div>
  );
};
