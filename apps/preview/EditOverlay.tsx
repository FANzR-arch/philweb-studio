import React, { useEffect } from 'react';
import { postTo, STUDIO_MESSAGE } from '../../lib/studio/messages';
import type { InteractionMode } from '../../lib/studio/types';

interface EditOverlayProps {
  mode: InteractionMode;
}

export const EditOverlay: React.FC<EditOverlayProps> = ({ mode }) => {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('studio-edit-on', mode === 'edit');
    let hint = document.getElementById('studio-edit-hint');
    if (!hint) {
      const style = document.createElement('style');
      style.textContent = [
        '.studio-edit-on [data-edit], .studio-edit-on [data-edit-target] { cursor: pointer !important; }',
        '.studio-edit-on [data-edit]:not([data-edit-default]):hover, .studio-edit-on [data-edit-target]:not([data-edit-default]):hover { outline: 2px dashed #E0745C !important; outline-offset: -2px !important; border-radius: 4px; }',
        '#studio-edit-hint { position: fixed; z-index: 2147483647; bottom: 16px; left: 50%; transform: translateX(-50%);',
        '  background: rgba(15,23,42,.88); color: #fff; font-size: 13px; padding: 7px 16px; border-radius: 999px;',
        '  pointer-events: none; opacity: 0; transition: opacity .15s; font-family: sans-serif; white-space: nowrap; }',
        '#studio-edit-hint.show { opacity: 1; }',
      ].join('\n');
      document.head.appendChild(style);
      hint = document.createElement('div');
      hint.id = 'studio-edit-hint';
      document.body.appendChild(hint);
    }

    const findTarget = (node: EventTarget | null): HTMLElement | null => {
      const el = node instanceof Element ? node : null;
      return (el?.closest('[data-edit-target], [data-edit]') as HTMLElement | null)
        || document.querySelector('[data-edit-default]');
    };

    const onOver = (event: MouseEvent) => {
      if (mode !== 'edit') return;
      const target = findTarget(event.target);
      const label = target?.getAttribute('data-edit-label') || '这块内容';
      const field = target?.getAttribute('data-edit-target') || target?.getAttribute('data-edit') || '';
      if (target && hint) {
        hint.textContent = field.startsWith('hint:') ? `点击查看「${label}」在哪里改` : `点击编辑「${label}」`;
        hint.classList.add('show');
      } else {
        hint?.classList.remove('show');
      }
    };

    const onClick = (event: MouseEvent) => {
      if (mode !== 'edit') return;
      const target = findTarget(event.target);
      if (!target) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      const field = target.getAttribute('data-edit-target') || target.getAttribute('data-edit') || '';
      postTo(window.parent, {
        type: STUDIO_MESSAGE.EDIT_TARGET,
        field,
        label: target.getAttribute('data-edit-label') || '',
        lang: (document.documentElement.lang || 'zh').indexOf('zh') === 0 ? 'zh' : 'en',
      });
    };

    document.addEventListener('mouseover', onOver);
    document.addEventListener('click', onClick, true);
    return () => {
      document.removeEventListener('mouseover', onOver);
      document.removeEventListener('click', onClick, true);
      hint?.classList.remove('show');
    };
  }, [mode]);

  return null;
};
