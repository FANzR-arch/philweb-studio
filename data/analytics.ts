/**
 * [INPUT]   : 浏览器事件、localStorage 与页面交互上下文
 * [OUTPUT]  : 站点上报函数、漏斗分析接口与会话管理能力
 * [POS]     : 数据层中的行为追踪模块
 * [DECISION]: 使用轻量客户端缓冲方案，在存储受限时静默降级而不影响页面渲染
 */

import {
  readLocalStorage,
  readSessionStorage,
  removeLocalStorage,
  writeLocalStorage,
  writeSessionStorage,
} from './safeStorage';

export type TrackEventName =
  | 'home_view'
  | 'project_open'
  | 'project_cta_click'
  | 'contact_click'
  | 'interview_pack_step_click'
  | 'wechat_copy'
  | 'wechat_qr_view'
  | 'social_outbound_click'
  | 'service_cta_click';

type TrackPayloadValue = string | number | boolean | null | undefined;
export type TrackPayload = Record<string, TrackPayloadValue>;

export interface TrackRecord {
  event: TrackEventName;
  payload: TrackPayload;
  timestamp: string;
  page: string;
  sessionId: string;
}

export interface FunnelSummary {
  sessions: number;
  stageCounts: Record<FunnelEvent, number>;
  conversion: {
    homeToProject: number;
    projectToCta: number;
    ctaToContact: number;
    homeToContact: number;
  };
}

export type FunnelEvent = 'home_view' | 'project_open' | 'project_cta_click' | 'contact_click';

const TRACK_STORAGE_KEY = 'portfolio:track-events:v1';
const SESSION_STORAGE_KEY = 'portfolio:track-session:v1';
const TRACK_BUFFER_LIMIT = 400;
const FUNNEL_EVENTS: FunnelEvent[] = ['home_view', 'project_open', 'project_cta_click', 'contact_click'];

declare global {
  interface WindowEventMap {
    'portfolio:track': CustomEvent<TrackRecord>;
  }

  interface Window {
    portfolioAnalytics?: {
      getTrackedEvents: typeof getTrackedEvents;
      clearTrackedEvents: typeof clearTrackedEvents;
      getFunnelSummary: typeof getFunnelSummary;
    };
  }
}

const safeParseRecords = (value: string | null): TrackRecord[] => {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed as TrackRecord[];
    }
    return [];
  } catch {
    return [];
  }
};

const getSessionId = (): string => {
  if (typeof window === 'undefined') {
    return 'server';
  }

  const current = readSessionStorage(SESSION_STORAGE_KEY);
  if (current) {
    return current;
  }

  const created = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  writeSessionStorage(SESSION_STORAGE_KEY, created);
  return created;
};

const writeRecords = (records: TrackRecord[]) => {
  if (typeof window === 'undefined') {
    return;
  }

  writeLocalStorage(TRACK_STORAGE_KEY, JSON.stringify(records));
};

export const getTrackedEvents = (): TrackRecord[] => {
  if (typeof window === 'undefined') {
    return [];
  }

  return safeParseRecords(readLocalStorage(TRACK_STORAGE_KEY));
};

export const clearTrackedEvents = () => {
  if (typeof window === 'undefined') {
    return;
  }

  removeLocalStorage(TRACK_STORAGE_KEY);
};

const rate = (numerator: number, denominator: number): number => {
  if (denominator <= 0) {
    return 0;
  }
  return Number((numerator / denominator).toFixed(4));
};

export const getFunnelSummary = (records: TrackRecord[] = getTrackedEvents()): FunnelSummary => {
  const sessionEventMap = new Map<string, Set<FunnelEvent>>();
  const stageCounts: Record<FunnelEvent, number> = {
    home_view: 0,
    project_open: 0,
    project_cta_click: 0,
    contact_click: 0,
  };

  for (const record of records) {
    if (!FUNNEL_EVENTS.includes(record.event as FunnelEvent)) {
      continue;
    }

    const event = record.event as FunnelEvent;
    const existing = sessionEventMap.get(record.sessionId) || new Set<FunnelEvent>();
    existing.add(event);
    sessionEventMap.set(record.sessionId, existing);
  }

  for (const eventSet of sessionEventMap.values()) {
    for (const stage of FUNNEL_EVENTS) {
      if (eventSet.has(stage)) {
        stageCounts[stage] += 1;
      }
    }
  }

  return {
    sessions: sessionEventMap.size,
    stageCounts,
    conversion: {
      homeToProject: rate(stageCounts.project_open, stageCounts.home_view),
      projectToCta: rate(stageCounts.project_cta_click, stageCounts.project_open),
      ctaToContact: rate(stageCounts.contact_click, stageCounts.project_cta_click),
      homeToContact: rate(stageCounts.contact_click, stageCounts.home_view),
    },
  };
};

export const track = (event: TrackEventName, payload: TrackPayload = {}) => {
  if (typeof window === 'undefined') {
    return;
  }

  const record: TrackRecord = {
    event,
    payload,
    timestamp: new Date().toISOString(),
    page: `${window.location.pathname}${window.location.search}`,
    sessionId: getSessionId(),
  };

  const existing = getTrackedEvents();
  const next = [...existing, record].slice(-TRACK_BUFFER_LIMIT);
  writeRecords(next);

  const isDevHost =
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname === '[::1]';

  if (isDevHost) {
    console.info('[track]', record);
  }

  window.dispatchEvent(new CustomEvent('portfolio:track', { detail: record }));
};

if (typeof window !== 'undefined') {
  window.portfolioAnalytics = {
    getTrackedEvents,
    clearTrackedEvents,
    getFunnelSummary,
  };
}
