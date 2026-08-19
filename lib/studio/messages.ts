export const STUDIO_MESSAGE = {
  EDIT_TARGET: 'EDIT_TARGET',
  PROJECT_UPDATE: 'PROJECT_UPDATE',
  SET_EDIT_MODE: 'SET_EDIT_MODE',
  PREVIEW_READY: 'PREVIEW_READY',
  LANG_CHANGE: 'LANG_CHANGE',
} as const;

export type StudioMessageType = (typeof STUDIO_MESSAGE)[keyof typeof STUDIO_MESSAGE];

export type StudioMessage =
  | { type: 'EDIT_TARGET'; field: string; label?: string; lang?: 'zh' | 'en' }
  | { type: 'PROJECT_UPDATE'; project: unknown; lang?: 'zh' | 'en' }
  | { type: 'SET_EDIT_MODE'; mode: 'edit' | 'preview' }
  | { type: 'PREVIEW_READY' }
  | { type: 'LANG_CHANGE'; lang: 'zh' | 'en' };

export function isAllowedOrigin(origin: string, expected = window.location.origin): boolean {
  if (!origin || origin === 'null') {
    return expected === 'null' || expected === 'file://';
  }
  return origin === expected;
}

export function readStudioMessage(event: MessageEvent, expectedSource: Window | null): StudioMessage | null {
  if (expectedSource && event.source !== expectedSource) return null;
  if (!isAllowedOrigin(event.origin)) return null;
  const data = event.data;
  if (!data || typeof data !== 'object' || typeof data.type !== 'string') return null;
  if (!Object.values(STUDIO_MESSAGE).includes(data.type)) return null;
  return data as StudioMessage;
}

export function postTo(target: Window | null, message: StudioMessage, origin = window.location.origin): void {
  if (!target) return;
  target.postMessage(message, origin || '*');
}
