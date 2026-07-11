/**
 * [INPUT]   : Coze 嵌入配置、浏览器 DOM API 与国际化上下文
 * [OUTPUT]  : initCozeChatbot、togglePersonalAIChat 等聊天机器人辅助函数
 * [POS]     : 第三方聊天机器人集成服务层
 * [DECISION]: 延迟加载 Coze SDK，并优先通过同域 token 路由获取短期 access token，兼顾首屏性能与安全性
 */

import type { Language } from './i18n';
import { getSharedContent } from './content';

const COZE_SCRIPT_SRC = 'https://lf-cdn.coze.cn/obj/unpkg/flow-platform/chat-app-sdk/1.2.0-beta.19/libs/cn/index.js';
const COZE_SCRIPT_ID = 'coze-chatbot-embed-script';
const COZE_STYLE_ID = 'coze-chatbot-custom-styles';
const COZE_SERVER_TOKEN_ENDPOINT = '/api/coze/token';
const COZE_CHAT_SESSION_HEADER_NAME = 'x-rzc-chat-session';
const COZE_CLIENT_CONTAINER_SELECTOR = '.coze-web-chat-client-container';
const COZE_CHAT_ROOT_SELECTOR = '.coze-chat-sdk';
const COZE_LAUNCHER_SELECTOR =
  '[data-testid="cc-chat-launcher"], .coze-web-chat-client-container > div:first-child, img[alt="logo"][src*="coze"]';
const COZE_CLEAR_CHAT_SELECTOR = '[data-testid="bot-edit-debug-chat-clear-button"]';
const COZE_CHAT_TEXTAREA_SELECTOR = 'textarea[data-testid="bot.ide.chat_area.chat_input.textarea"]';
const COZE_CHAT_LOADING_SPINNER_SELECTOR = 'img[alt="spin"]';
const COZE_DEFAULT_USER_AVATAR_PREFIX = 'data:image/png;base64,';
const COZE_VISITOR_AVATAR = getSharedContent().assets.talkAvatar || '/assets/qrcodes/talklogo.jpg';
const COZE_MOBILE_MAX_WIDTH = 767;
const SDK_READY_TIMEOUT_MS = 10_000;
const SDK_POLL_INTERVAL_MS = 100;
const CHAT_OPEN_TIMEOUT_MS = 5_000;
const LAUNCHER_POLL_INTERVAL_MS = 100;
const CHAT_RESET_TIMEOUT_MS = 4_000;
const CHAT_RESET_POLL_INTERVAL_MS = 100;
const CHAT_RESET_SETTLE_DELAY_MS = 150;
const ACCESS_TOKEN_REFRESH_SKEW_MS = 60_000;
const TOKEN_RESPONSE_SNIPPET_MAX_LENGTH = 100;
const UNSUPPORTED_LOCAL_PERSONAL_AI_CONTEXT_ERROR = 'UnsupportedLocalPersonalAIContextError';
const PERSONAL_AI_UNAVAILABLE_ERROR = 'PersonalAIUnavailableError';
const PERSONAL_AI_STATE_ATTRIBUTE = 'data-rzc-personal-ai-state';

type CozeLayout = 'pc' | 'mobile';
type PersonalAIState = 'idle' | 'booting' | 'ready';

let sdkReadyPromise: Promise<CozeWebSDKGlobal> | null = null;
let cozeClient: CozeWebChatClient | null = null;
let currentCozeLayout: CozeLayout | null = null;
let currentChatSessionId: string | null = null;
let personalAIState: PersonalAIState = 'idle';
const cachedServerTokens = new Map<string, CozeServerToken>();
const serverTokenPromises = new Map<string, Promise<CozeServerTokenFetchResult>>();
let serverTokenState: 'unknown' | 'available' | 'absent' | 'unconfigured' = 'unknown';
let currentCozeLang: Language = 'zh';
let patFallbackWarned = false;
let unconfiguredServerAuthWarned = false;
let missingServerAuthWarned = false;
let cosmeticsObserver: MutationObserver | null = null;
let themeObserver: MutationObserver | null = null;
let freshChatResetPromise: Promise<void> | null = null;
let isFreshChatResetting = false;

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });

const createChatSessionId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
};

const getCozeBotId = (): string => {
  const botId = import.meta.env.VITE_COZE_BOT_ID?.trim();
  if (!botId) {
    throw new Error('Missing VITE_COZE_BOT_ID');
  }
  return botId;
};

const getCozePat = (): string | undefined => import.meta.env.VITE_COZE_PAT?.trim();

const getSiteOwnerName = (): string => getSharedContent().person.displayName;

const getChatTitle = (lang: Language): string =>
  (lang === 'zh' ? `${getSiteOwnerName()} 的AI分身` : `${getSiteOwnerName()}'s AI Twin`);

const getChatInputPlaceholder = (lang: Language): string =>
  lang === 'zh' ? '和我的 AI 分身聊聊...' : 'Chat with my AI twin...';
const getChatFooterText = (lang: Language): string =>
  lang === 'zh'
    ? `AI by ${getSiteOwnerName()} · 内容由 AI 生成，仅供参考`
    : `AI by ${getSiteOwnerName()} · AI-generated content for reference only`;
const getCozeSdk = (): CozeWebSDKGlobal | undefined => window.CozeWebSDK;
const getPreferredCozeLayout = (): CozeLayout =>
  typeof window !== 'undefined' && window.innerWidth <= COZE_MOBILE_MAX_WIDTH ? 'mobile' : 'pc';
const isDarkModeEnabled = (): boolean => document.documentElement.classList.contains('dark');
const getVisitorAvatar = (): string => COZE_VISITOR_AVATAR;

const isLocalHost = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  return ['localhost', '127.0.0.1'].includes(window.location.hostname) || window.location.hostname.endsWith('.local');
};

const isSecureBrowserContext = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.location.protocol === 'https:' || window.isSecureContext;
};

const getPersonalAIRuntimeContext = (): 'localhost' | 'secure' | 'unsupported-local-http' => {
  if (isLocalHost()) {
    return 'localhost';
  }

  if (isSecureBrowserContext()) {
    return 'secure';
  }

  return 'unsupported-local-http';
};

class UnsupportedLocalPersonalAIContextError extends Error {
  constructor(lang: Language) {
    super(
      lang === 'zh'
        ? '本地调试 Personal AI 请使用 http://localhost:3000 或 http://127.0.0.1:3000 打开。'
        : 'For local Personal AI testing, open the site via http://localhost:3000 or http://127.0.0.1:3000.',
    );
    this.name = UNSUPPORTED_LOCAL_PERSONAL_AI_CONTEXT_ERROR;
  }
}

class PersonalAIUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = PERSONAL_AI_UNAVAILABLE_ERROR;
  }
}

const getResponseSnippet = async (response: Response): Promise<string> => {
  const rawText = await response
    .clone()
    .text()
    .catch(() => '');

  return rawText.replace(/\s+/g, ' ').trim().slice(0, TOKEN_RESPONSE_SNIPPET_MAX_LENGTH);
};

const isJsonResponse = (response: Response): boolean =>
  response.headers.get('content-type')?.toLowerCase().includes('application/json') ?? false;

const getPatFallback = (): string | undefined => {
  if (!isLocalHost()) {
    return undefined;
  }

  const pat = getCozePat();
  if (!pat) {
    return undefined;
  }

  if (!patFallbackWarned) {
    console.warn(
      '[coze] Using VITE_COZE_PAT on localhost. This token remains client-visible and should only be used for local debugging.',
    );
    patFallbackWarned = true;
  }

  return pat;
};

const createStaticTokenAuth = (token: string): CozeResolvedAuthConfig => ({
  type: 'token',
  token,
  onRefreshToken: () => token,
});

const hasFreshServerToken = (token: CozeServerToken | null | undefined): token is CozeServerToken =>
  Boolean(token && token.expiresAt > Date.now() + ACCESS_TOKEN_REFRESH_SKEW_MS);

const parseServerTokenPayload = (payload: unknown): CozeServerToken => {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid Coze server token payload.');
  }

  const accessToken = Reflect.get(payload, 'accessToken');
  const expiresAt = Reflect.get(payload, 'expiresAt');

  if (typeof accessToken !== 'string' || typeof expiresAt !== 'number') {
    throw new Error('Invalid Coze server token payload.');
  }

  return { accessToken, expiresAt };
};

const fetchServerToken = async (chatSessionId: string): Promise<CozeServerTokenFetchResult> => {
  if (serverTokenState === 'absent') {
    return { kind: 'absent' };
  }

  if (serverTokenState === 'unconfigured') {
    return { kind: 'unconfigured' };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch(COZE_SERVER_TOKEN_ENDPOINT, {
      method: 'GET',
      headers: {
        accept: 'application/json',
        [COZE_CHAT_SESSION_HEADER_NAME]: chatSessionId,
      },
      credentials: 'same-origin',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (response.status === 404 || response.status === 405) {
      serverTokenState = 'absent';
      return { kind: 'absent' };
    }

    if (response.status === 501) {
      serverTokenState = 'unconfigured';
      return { kind: 'unconfigured' };
    }

    if (!response.ok) {
      throw new Error(`Coze server token endpoint returned ${response.status}.`);
    }

    if (!isJsonResponse(response)) {
      const contentType = response.headers.get('content-type') ?? '(missing)';
      const bodySnippet = await getResponseSnippet(response);
      console.warn('[coze] /api/coze/token returned a non-JSON response.', {
        status: response.status,
        contentType,
        bodySnippet,
      });

      if (import.meta.env.DEV) {
        serverTokenState = 'absent';
        return { kind: 'absent' };
      }

      throw new Error(`/api/coze/token returned non-JSON content-type: ${contentType}.`);
    }

    const token = parseServerTokenPayload(await response.json());
    serverTokenState = 'available';
    return {
      kind: 'token',
      token,
    };
  } catch (error) {
    if (isLocalHost()) {
      serverTokenState = 'absent';
      return { kind: 'absent' };
    }

    throw error;
  }
};

const clearServerTokenCaches = (): void => {
  cachedServerTokens.clear();
  serverTokenPromises.clear();
};

const getServerToken = async (chatSessionId: string): Promise<CozeServerTokenFetchResult> => {
  const cachedServerToken = cachedServerTokens.get(chatSessionId);
  if (hasFreshServerToken(cachedServerToken)) {
    return {
      kind: 'token',
      token: cachedServerToken,
    };
  }

  const inFlightTokenRequest = serverTokenPromises.get(chatSessionId);
  if (inFlightTokenRequest) {
    return inFlightTokenRequest;
  }

  const nextTokenPromise = fetchServerToken(chatSessionId)
      .then((result) => {
        if (result.kind === 'token') {
          cachedServerTokens.set(chatSessionId, result.token);
        }
        return result;
      })
      .finally(() => {
        serverTokenPromises.delete(chatSessionId);
      });

  serverTokenPromises.set(chatSessionId, nextTokenPromise);
  return nextTokenPromise;
};

const getServerAccessToken = async (chatSessionId: string): Promise<string | undefined> => {
  const result = await getServerToken(chatSessionId);
  if (result.kind === 'token') {
    return result.token.accessToken;
  }

  return undefined;
};

// 认证优先级按“本地 PAT -> 服务端短期 token -> 公开 bot”逐层回退，
// 这样既方便本地开发，也能在正式环境优先走更安全的服务端签发方案。
const resolveCozeAuth = async (chatSessionId: string): Promise<CozeResolvedAuthConfig> => {
  let serverTokenResult: CozeServerTokenFetchResult;
  try {
    serverTokenResult = await getServerToken(chatSessionId);
  } catch (error) {
    const fallbackPat = getPatFallback();
    if (fallbackPat) {
      return createStaticTokenAuth(fallbackPat);
    }

    throw new PersonalAIUnavailableError(
      error instanceof Error ? error.message : 'Failed to reach the Coze server token endpoint.',
    );
  }

  if (serverTokenResult.kind === 'token') {
    return {
      type: 'token',
      token: serverTokenResult.token.accessToken,
      onRefreshToken: async () => {
        const refreshedToken = await getServerAccessToken(chatSessionId);
        if (!refreshedToken) {
          throw new PersonalAIUnavailableError('Coze server token endpoint did not return a token during refresh.');
        }
        return refreshedToken;
      },
    };
  }

  const fallbackPat = getPatFallback();
  if (fallbackPat) {
    return createStaticTokenAuth(fallbackPat);
  }

  if (serverTokenResult.kind === 'unconfigured') {
    if (!unconfiguredServerAuthWarned) {
      console.warn(
        '[coze] /api/coze/token is present but not configured. Personal AI is disabled until the server-side Coze JWT variables are configured.',
      );
      unconfiguredServerAuthWarned = true;
    }

    throw new PersonalAIUnavailableError('Coze server token endpoint is present but not configured.');
  }

  if (!missingServerAuthWarned) {
    console.warn('[coze] No supported Coze auth configuration is available. Personal AI is disabled outside localhost without /api/coze/token.');
    missingServerAuthWarned = true;
  }

  throw new PersonalAIUnavailableError('Coze server token endpoint is unavailable and no VITE_COZE_PAT fallback is configured.');
};

const getCozeConfig = async (lang: Language, layout: CozeLayout, chatSessionId: string): Promise<CozeWebChatClientConfig> => ({
  config: {
    bot_id: getCozeBotId(),
  },
  componentProps: {
    title: getChatTitle(lang),
    layout,
  },
  auth: await resolveCozeAuth(chatSessionId),
});

const setPersonalAIState = (nextState: PersonalAIState): void => {
  personalAIState = nextState;

  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute(PERSONAL_AI_STATE_ATTRIBUTE, nextState);
  }

  syncCozeCosmetics();
};

const syncCozeCosmetics = (): void => {
  if (typeof document === 'undefined') {
    return;
  }

  document.documentElement.setAttribute(PERSONAL_AI_STATE_ATTRIBUTE, personalAIState);

  const root = document.querySelector<HTMLElement>(COZE_CHAT_ROOT_SELECTOR);
  if (!root) {
    return;
  }

  root.dataset.rzcTheme = isDarkModeEnabled() ? 'dark' : 'light';
  root.dataset.rzcFreshChat = isFreshChatResetting || personalAIState !== 'ready' ? 'pending' : 'ready';

  root.querySelectorAll<HTMLImageElement>('.coze-chat-sdk-semi-avatar img').forEach((image) => {
    const src = image.getAttribute('src')?.trim() ?? '';
    const isPatchedVisitorAvatar = typeof image.dataset.rzcAvatarSrc === 'string';
    if (!src.startsWith(COZE_DEFAULT_USER_AVATAR_PREFIX) && !isPatchedVisitorAvatar) {
      return;
    }

    const nextSrc = getVisitorAvatar();
    if (image.dataset.rzcAvatarSrc === nextSrc) {
      return;
    }

    image.src = nextSrc;
    image.alt = currentCozeLang === 'zh' ? '访客头像' : 'Visitor avatar';
    image.dataset.rzcAvatarSrc = nextSrc;
  });

  const footer = root.querySelector<HTMLElement>('footer');
  if (footer && footer.textContent?.trim() === 'web_sdk_official_banner') {
    footer.textContent = getChatFooterText(currentCozeLang);
  }

  const input = root.querySelector<HTMLTextAreaElement>(COZE_CHAT_TEXTAREA_SELECTOR);
  if (input && input.getAttribute('placeholder') === 'chatInputPlaceholder') {
    input.setAttribute('placeholder', getChatInputPlaceholder(currentCozeLang));
  }
};

const startCosmeticObservers = (): void => {
  if (typeof MutationObserver === 'undefined') {
    return;
  }

  if (!cosmeticsObserver) {
    cosmeticsObserver = new MutationObserver(() => {
      syncCozeCosmetics();
    });
    cosmeticsObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  if (!themeObserver) {
    themeObserver = new MutationObserver(() => {
      syncCozeCosmetics();
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
  }

  syncCozeCosmetics();
};

const injectScriptIfNeeded = async (): Promise<void> => {
  const existingById = document.getElementById(COZE_SCRIPT_ID) as HTMLScriptElement | null;
  const existingBySrc = document.querySelector(`script[src="${COZE_SCRIPT_SRC}"]`) as HTMLScriptElement | null;

  if (existingById || existingBySrc) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.id = COZE_SCRIPT_ID;
    script.src = COZE_SCRIPT_SRC;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load the Coze embed script'));
    document.body.appendChild(script);
  });
};

const injectStyleIfNeeded = (): void => {
  if (document.getElementById(COZE_STYLE_ID)) {
    return;
  }

  const style = document.createElement('style');
  style.id = COZE_STYLE_ID;
  style.textContent = `
    ${COZE_CLIENT_CONTAINER_SELECTOR} {
      z-index: 2147483647 !important;
    }

    .coze-chat-sdk {
      border: 1px solid rgba(15, 23, 42, 0.08) !important;
      border-radius: 28px !important;
      overflow: hidden !important;
      background: rgba(255, 255, 255, 0.96) !important;
      box-shadow: 0 28px 80px rgba(15, 23, 42, 0.16) !important;
      backdrop-filter: blur(18px);
      transition: opacity 160ms ease !important;
    }

    html[${PERSONAL_AI_STATE_ATTRIBUTE}='booting'] .coze-chat-sdk {
      opacity: 0 !important;
      pointer-events: none !important;
    }

    .coze-chat-sdk[data-rzc-fresh-chat='pending'] {
      opacity: 0 !important;
      pointer-events: none !important;
    }

    html[${PERSONAL_AI_STATE_ATTRIBUTE}='ready'] .coze-chat-sdk,
    .coze-chat-sdk[data-rzc-fresh-chat='ready'] {
      opacity: 1 !important;
    }

    .coze-chat-sdk header {
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.94)) !important;
      border-bottom: 1px solid rgba(15, 23, 42, 0.08) !important;
      backdrop-filter: blur(12px);
    }

    .coze-chat-sdk footer {
      border-top: 1px solid rgba(15, 23, 42, 0.06) !important;
      background: rgba(248, 250, 252, 0.72) !important;
      color: rgba(71, 85, 105, 0.9) !important;
    }

    .coze-chat-sdk footer * {
      color: inherit !important;
      font-size: 11px !important;
      letter-spacing: 0.02em;
    }

    .coze-chat-sdk .coze-chat-sdk-semi-avatar {
      box-shadow: 0 0 0 1px rgba(15, 23, 42, 0.08);
    }

    .coze-chat-sdk .coze-chat-sdk-semi-avatar img {
      object-fit: cover;
    }

    .coze-chat-sdk ${COZE_CHAT_TEXTAREA_SELECTOR} {
      color: #111827 !important;
      caret-color: var(--site-accent, #D7442C) !important;
    }

    .coze-chat-sdk ${COZE_CHAT_TEXTAREA_SELECTOR}::placeholder {
      color: #94a3b8 !important;
    }

    html.dark .coze-chat-sdk {
      border-color: rgba(255, 255, 255, 0.08) !important;
      background: rgba(23, 23, 23, 0.96) !important;
      box-shadow: 0 30px 90px rgba(0, 0, 0, 0.46) !important;
    }

    .coze-chat-sdk[data-rzc-theme='dark'] {
      --coz-bg-max: rgba(17, 17, 17, 0.96) !important;
      --coz-mg-primary: rgba(38, 38, 38, 0.9) !important;
      --coz-mg-secondary: rgba(28, 28, 30, 0.92) !important;
      --coz-mg-plus: rgba(38, 38, 38, 0.88) !important;
      --coz-fg-primary: rgba(229, 229, 229, 0.96) !important;
      --coz-fg-secondary: rgba(212, 212, 212, 0.82) !important;
      --coz-fg-dim: rgba(163, 163, 163, 0.78) !important;
      --coz-stroke-primary: rgba(255, 255, 255, 0.08) !important;
      --coz-stroke-plus: rgba(255, 255, 255, 0.1) !important;
    }

    .coze-chat-sdk[data-rzc-theme='dark'] > div:last-child {
      background: rgba(17, 17, 17, 0.96) !important;
    }

    .coze-chat-sdk[data-rzc-theme='dark'] .coz-bg-max,
    .coze-chat-sdk[data-rzc-theme='dark'] textarea.coz-bg-max {
      background-color: rgba(17, 17, 17, 0.96) !important;
    }

    .coze-chat-sdk[data-rzc-theme='dark'] .coz-mg-primary,
    .coze-chat-sdk[data-rzc-theme='dark'] [class*='bg-[var(--coz-mg-primary)]'] {
      background-color: rgba(38, 38, 38, 0.9) !important;
    }

    .coze-chat-sdk[data-rzc-theme='dark'] .coz-fg-primary {
      color: rgba(229, 229, 229, 0.96) !important;
    }

    .coze-chat-sdk[data-rzc-theme='dark'] .coz-fg-secondary {
      color: rgba(212, 212, 212, 0.82) !important;
    }

    .coze-chat-sdk[data-rzc-theme='dark'] .coz-fg-dim {
      color: rgba(163, 163, 163, 0.78) !important;
    }

    .coze-chat-sdk[data-rzc-theme='dark'] .chat-uikit-text-content,
    .coze-chat-sdk[data-rzc-theme='dark'] .flow-markdown-body,
    .coze-chat-sdk[data-rzc-theme='dark'] .flow-markdown-body p,
    .coze-chat-sdk[data-rzc-theme='dark'] .flow-markdown-body li,
    .coze-chat-sdk[data-rzc-theme='dark'] .flow-markdown-body strong,
    .coze-chat-sdk[data-rzc-theme='dark'] .flow-markdown-body em,
    .coze-chat-sdk[data-rzc-theme='dark'] .flow-markdown-body code,
    .coze-chat-sdk[data-rzc-theme='dark'] .flow-markdown-body blockquote,
    .coze-chat-sdk[data-rzc-theme='dark'] .flow-markdown-body a,
    .coze-chat-sdk[data-rzc-theme='dark'] .paragraph-element,
    .coze-chat-sdk[data-rzc-theme='dark'] .paragraph-element *,
    .coze-chat-sdk[data-rzc-theme='dark'] h1,
    .coze-chat-sdk[data-rzc-theme='dark'] h2,
    .coze-chat-sdk[data-rzc-theme='dark'] h3,
    .coze-chat-sdk[data-rzc-theme='dark'] h4,
    .coze-chat-sdk[data-rzc-theme='dark'] h5,
    .coze-chat-sdk[data-rzc-theme='dark'] h6,
    .coze-chat-sdk[data-rzc-theme='dark'] p,
    .coze-chat-sdk[data-rzc-theme='dark'] li {
      color: rgba(229, 229, 229, 0.96) !important;
    }

    .coze-chat-sdk[data-rzc-theme='dark'] .flow-markdown-body strong,
    .coze-chat-sdk[data-rzc-theme='dark'] .flow-markdown-body h1,
    .coze-chat-sdk[data-rzc-theme='dark'] .flow-markdown-body h2,
    .coze-chat-sdk[data-rzc-theme='dark'] .flow-markdown-body h3,
    .coze-chat-sdk[data-rzc-theme='dark'] .flow-markdown-body h4,
    .coze-chat-sdk[data-rzc-theme='dark'] .flow-markdown-body h5,
    .coze-chat-sdk[data-rzc-theme='dark'] .flow-markdown-body h6 {
      color: rgba(241, 245, 249, 0.98) !important;
    }

    .coze-chat-sdk[data-rzc-theme='dark'] .flow-markdown-body blockquote {
      color: rgba(212, 212, 212, 0.82) !important;
      border-left: 3px solid rgba(255, 255, 255, 0.12) !important;
      padding-left: 12px !important;
    }

    .coze-chat-sdk[data-rzc-theme='dark'] .flow-markdown-body code,
    .coze-chat-sdk[data-rzc-theme='dark'] .flow-markdown-body pre {
      color: rgba(229, 229, 229, 0.96) !important;
      background-color: rgba(17, 17, 17, 0.82) !important;
    }

    .coze-chat-sdk[data-rzc-theme='dark'] .flow-markdown-body a {
      color: var(--site-accent, #D7442C) !important;
    }

    .coze-chat-sdk[data-rzc-theme='dark'] .flow-markdown-body a:hover {
      color: rgba(245, 109, 84, 0.96) !important;
    }

    html.dark .coze-chat-sdk header {
      background: linear-gradient(180deg, rgba(28, 28, 30, 0.98), rgba(17, 17, 17, 0.94)) !important;
      border-bottom-color: rgba(255, 255, 255, 0.07) !important;
    }

    html.dark .coze-chat-sdk footer {
      border-top-color: rgba(255, 255, 255, 0.06) !important;
      background: rgba(23, 23, 23, 0.88) !important;
      color: rgba(163, 163, 163, 0.92) !important;
    }

    html.dark .coze-chat-sdk .coze-chat-sdk-semi-avatar {
      box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.08);
    }

    html.dark .coze-chat-sdk ${COZE_CHAT_TEXTAREA_SELECTOR} {
      color: #f3f4f6 !important;
    }

    html.dark .coze-chat-sdk ${COZE_CHAT_TEXTAREA_SELECTOR}::placeholder {
      color: #737373 !important;
    }

    @media (min-width: ${COZE_MOBILE_MAX_WIDTH + 1}px) {
      .coze-chat-sdk {
        top: auto !important;
        right: 24px !important;
        bottom: 24px !important;
        left: auto !important;
        width: min(420px, calc(100vw - 48px)) !important;
        height: min(760px, calc(100vh - 48px)) !important;
        max-width: min(420px, calc(100vw - 48px)) !important;
        max-height: min(760px, calc(100vh - 48px)) !important;
      }
    }

    @media (max-width: ${COZE_MOBILE_MAX_WIDTH}px) {
      ${COZE_CLIENT_CONTAINER_SELECTOR} {
        position: fixed !important;
        inset: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        height: 100dvh !important;
        max-width: 100vw !important;
        max-height: 100vh !important;
        max-height: 100dvh !important;
        padding: 0 !important;
        margin: 0 !important;
      }

      .coze-chat-sdk {
        width: 100vw !important;
        height: 100vh !important;
        height: 100dvh !important;
        max-width: 100vw !important;
        max-height: 100vh !important;
        max-height: 100dvh !important;
        border-radius: 0 !important;
        box-shadow: none !important;
        overflow: hidden !important;
        overscroll-behavior: contain !important;
      }

      .coze-chat-sdk header {
        padding-top: calc(env(safe-area-inset-top, 0px) + 8px) !important;
      }

      .coze-chat-sdk footer {
        padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 8px) !important;
      }
    }
  `;
  document.head.appendChild(style);
};

const teardownCozeClient = (): void => {
  if (cozeClient) {
    try {
      if (typeof cozeClient.hide === 'function') {
        cozeClient.hide();
      } else if (typeof cozeClient.close === 'function') {
        cozeClient.close();
      }
    } catch (error) {
      console.warn('[coze] failed to close chatbot during teardown', error);
    }
  }

  if (typeof document !== 'undefined') {
    document.querySelectorAll<HTMLElement>(COZE_CLIENT_CONTAINER_SELECTOR).forEach((node) => {
      node.remove();
    });
  }

  cozeClient = null;
  currentCozeLayout = null;
  currentChatSessionId = null;
  freshChatResetPromise = null;
  isFreshChatResetting = false;
};

const waitForSdkReady = async (): Promise<CozeWebSDKGlobal> => {
  const start = Date.now();

  while (true) {
    const sdk = getCozeSdk();
    if (sdk) {
      return sdk;
    }

    if (Date.now() - start > SDK_READY_TIMEOUT_MS) {
      throw new Error('Timed out waiting for CozeWebSDK initialization');
    }

    await wait(SDK_POLL_INTERVAL_MS);
  }
};

const findElement = <T extends Element>(root: ParentNode, selector: string): T | null => {
  const directMatch = root.querySelector<T>(selector);
  if (directMatch) {
    return directMatch;
  }

  const elements = root.querySelectorAll<HTMLElement>('*');
  for (const element of Array.from(elements)) {
    if (!element.shadowRoot) {
      continue;
    }

    const nestedMatch = findElement<T>(element.shadowRoot, selector);
    if (nestedMatch) {
      return nestedMatch;
    }
  }

  return null;
};

const findLauncher = (root: ParentNode): HTMLElement | null => findElement<HTMLElement>(root, COZE_LAUNCHER_SELECTOR);

const findClearChatButton = (root: ParentNode): HTMLElement | null => findElement<HTMLElement>(root, COZE_CLEAR_CHAT_SELECTOR);

const dispatchSyntheticClick = (element: HTMLElement): void => {
  element.dispatchEvent(
    new MouseEvent('click', {
      view: window,
      bubbles: true,
      cancelable: true,
    })
  );
};

const tryOpenChat = async (): Promise<boolean> => {
  const deadline = Date.now() + CHAT_OPEN_TIMEOUT_MS;

  while (Date.now() < deadline) {
    if (openWithClientApi()) {
      return true;
    }

    const launcher = findLauncher(document);
    if (launcher) {
      dispatchSyntheticClick(launcher);
      return true;
    }

    await wait(LAUNCHER_POLL_INTERVAL_MS);
  }

  return false;
};

const setFreshChatResetting = (nextValue: boolean): void => {
  if (isFreshChatResetting === nextValue) {
    return;
  }

  isFreshChatResetting = nextValue;
  syncCozeCosmetics();
};

const getLatestChatMessageText = (): string =>
  document
    .querySelector<HTMLElement>(`${COZE_CHAT_ROOT_SELECTOR} .flow-markdown-body`)
    ?.textContent?.replace(/\s+/g, ' ')
    .trim() ?? '';

const waitForClearChatButton = async (): Promise<HTMLElement | null> => {
  const deadline = Date.now() + CHAT_RESET_TIMEOUT_MS;

  while (Date.now() < deadline) {
    const clearButton = findClearChatButton(document);
    if (clearButton) {
      return clearButton;
    }

    await wait(CHAT_RESET_POLL_INTERVAL_MS);
  }

  return null;
};

const waitForFreshChatResetToSettle = async (previousTopMessage: string, previousMessageCount: number): Promise<void> => {
  const startTime = Date.now();
  const deadline = startTime + CHAT_RESET_TIMEOUT_MS;

  while (Date.now() < deadline) {
    const root = document.querySelector<HTMLElement>(COZE_CHAT_ROOT_SELECTOR);
    const hasSpinner = Boolean(root?.querySelector(COZE_CHAT_LOADING_SPINNER_SELECTOR));
    const currentTopMessage = getLatestChatMessageText();
    const currentMessageCount = document.querySelectorAll(`${COZE_CHAT_ROOT_SELECTOR} .flow-markdown-body`).length;
    const clearFinished = root?.textContent?.includes('context_clear_finish') ?? false;

    if (!hasSpinner && currentMessageCount <= 1 && (clearFinished || currentTopMessage !== previousTopMessage || previousMessageCount <= 1)) {
      return;
    }

    if (!hasSpinner && previousMessageCount <= 1 && Date.now() - startTime > 600) {
      return;
    }

    await wait(CHAT_RESET_POLL_INTERVAL_MS);
  }

  console.warn('[coze] fresh chat reset timed out before the loading state cleared.');
};

const resetChatToFreshConversation = async (): Promise<void> => {
  if (freshChatResetPromise) {
    return freshChatResetPromise;
  }

  freshChatResetPromise = (async () => {
    const clearButton = await waitForClearChatButton();
    if (!clearButton) {
      console.warn('[coze] clear-context button was not available; chat may reopen with prior context.');
      return;
    }

    const previousTopMessage = getLatestChatMessageText();
    const previousMessageCount = document.querySelectorAll(`${COZE_CHAT_ROOT_SELECTOR} .flow-markdown-body`).length;
    dispatchSyntheticClick(clearButton);
    await wait(CHAT_RESET_SETTLE_DELAY_MS);
    await waitForFreshChatResetToSettle(previousTopMessage, previousMessageCount);
  })().finally(() => {
    freshChatResetPromise = null;
  });

  return freshChatResetPromise;
};

const waitForInitialChatContent = async (): Promise<void> => {
  const deadline = Date.now() + CHAT_OPEN_TIMEOUT_MS;

  while (Date.now() < deadline) {
    const root = document.querySelector<HTMLElement>(COZE_CHAT_ROOT_SELECTOR);
    const hasSpinner = Boolean(root?.querySelector(COZE_CHAT_LOADING_SPINNER_SELECTOR));
    const hasInput = Boolean(root?.querySelector(COZE_CHAT_TEXTAREA_SELECTOR));
    const messageCount = document.querySelectorAll(`${COZE_CHAT_ROOT_SELECTOR} .flow-markdown-body`).length;

    if (root && hasInput && (!hasSpinner || messageCount > 0)) {
      return;
    }

    await wait(CHAT_RESET_POLL_INTERVAL_MS);
  }

  console.warn('[coze] timed out waiting for the initial chat content to render.');
};

const shouldResetUnexpectedHistory = (): boolean => {
  const root = document.querySelector<HTMLElement>(COZE_CHAT_ROOT_SELECTOR);
  if (!root) {
    return false;
  }

  const messageCount = document.querySelectorAll(`${COZE_CHAT_ROOT_SELECTOR} .flow-markdown-body`).length;
  const clearFinished = root.textContent?.includes('context_clear_finish') ?? false;
  return messageCount > 1 || clearFinished;
};

const ensureSdkAndStylesReady = async (): Promise<CozeWebSDKGlobal> => {
  if (!sdkReadyPromise) {
    sdkReadyPromise = (async () => {
      await injectScriptIfNeeded();
      const sdk = await waitForSdkReady();
      injectStyleIfNeeded();
      startCosmeticObservers();
      return sdk;
    })().catch((error) => {
      sdkReadyPromise = null;
      throw error;
    });
  }

  return sdkReadyPromise;
};

const createFreshCozeClient = async (lang: Language, layout: CozeLayout, chatSessionId: string): Promise<void> => {
  currentCozeLang = lang;
  const sdk = await ensureSdkAndStylesReady();
  cozeClient = new sdk.WebChatClient(await getCozeConfig(lang, layout, chatSessionId));
  currentCozeLayout = layout;
  currentChatSessionId = chatSessionId;
  syncCozeCosmetics();
};

const openWithClientApi = (): boolean => {
  if (!cozeClient) {
    return false;
  }

  if (typeof cozeClient.show === 'function') {
    cozeClient.show();
    return true;
  }

  if (typeof cozeClient.open === 'function') {
    cozeClient.open();
    return true;
  }

  return false;
};

export const initCozeChatbot = (_lang: Language = 'zh'): void => {
  // 入口函数保留为空实现，用来明确“首页阶段不主动加载 SDK，首次打开时再初始化”这一策略。
};

export const openPersonalAIChat = async (lang: Language): Promise<void> => {
  if (typeof window === 'undefined') {
    throw new Error('openPersonalAIChat can only run in the browser');
  }

  if (import.meta.env.DEV && getPersonalAIRuntimeContext() === 'unsupported-local-http') {
    throw new UnsupportedLocalPersonalAIContextError(lang);
  }

  const preferredLayout = getPreferredCozeLayout();
  const chatSessionId = createChatSessionId();

  try {
    setPersonalAIState('booting');
    clearServerTokenCaches();
    teardownCozeClient();
    await createFreshCozeClient(lang, preferredLayout, chatSessionId);

    if (!cozeClient) {
      throw new Error('Coze client did not initialize');
    }

    const opened = await tryOpenChat();
    syncCozeCosmetics();

    if (opened) {
      await waitForInitialChatContent();

      if (shouldResetUnexpectedHistory()) {
        setFreshChatResetting(true);
        await resetChatToFreshConversation();
        await waitForInitialChatContent();
      }
    }

    window.setTimeout(() => {
      syncCozeCosmetics();
    }, 250);
    if (!opened) {
      console.warn('[coze] launcher was not ready for auto-open; a manual click may still be required.');
    }

    setPersonalAIState('ready');
  } catch (error) {
    teardownCozeClient();
    setPersonalAIState('idle');
    console.error('[coze] failed to open personal AI chat', error);
    throw error;
  } finally {
    setFreshChatResetting(false);
  }
};

export const closePersonalAIChat = async (lang: Language): Promise<void> => {
  if (typeof window === 'undefined') {
    return;
  }

  currentCozeLang = lang;

  if (!cozeClient) {
    return;
  }

  try {
    if (typeof cozeClient.hide === 'function') {
      cozeClient.hide();
      setPersonalAIState('idle');
      return;
    }

    if (typeof cozeClient.close === 'function') {
      cozeClient.close();
    }

    setPersonalAIState('idle');
  } catch (error) {
    console.error('[coze] failed to close personal AI chat', error);
    throw error;
  }
};

export const togglePersonalAIChat = async (lang: Language): Promise<void> => {
  // 目前不从 Coze 内部状态反推开关结果，而是始终尝试打开，避免依赖不稳定的 SDK 私有行为。
  await openPersonalAIChat(lang);
};
