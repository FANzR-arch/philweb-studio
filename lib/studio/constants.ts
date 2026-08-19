import type { StylePack } from './types';

export const MAX_UPLOAD_BYTES = 32 * 1024 * 1024;
export const AUTOSAVE_MS = 500;
export const STORAGE_WARN_RATIO = 0.8;
export const BACKUP_MAX_FILES = 2000;
export const BACKUP_MAX_UNCOMPRESSED = 200 * 1024 * 1024;
export const BACKUP_MAX_ZIP_BYTES = 100 * 1024 * 1024;

export const IMAGE_MIMES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']);
export const VIDEO_MIMES = new Set(['video/mp4', 'video/webm']);
export const ALLOWED_MIMES = new Set([...IMAGE_MIMES, ...VIDEO_MIMES]);

export const MIME_EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
};

export const EXT_MIME: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
};

export const UPLOAD_MAX_WIDTH: Record<string, number> = {
  avatarLight: 640,
  avatarDark: 640,
  wechatQr: 900,
  brandMark: 512,
  coverLight: 1600,
  coverDark: 1600,
  detail: 1920,
  blogCover: 1600,
  backgroundImage: 1920,
  skillLogo: 256,
};

export const AURORA_BASE_LIGHT = 0.19;
export const AURORA_BASE_DARK = 0.22;
export const DEFAULT_TINT_ALPHA = 0.4;

export const CARD_TINT_SLOTS = [
  { key: 'sidebar', label: '个人资料卡' },
  { key: 'intro', label: '首屏问候卡' },
  { key: 'timeline', label: '时间线卡' },
  { key: 'projects', label: '作品列表卡' },
  { key: 'quicklinks', label: '快捷入口卡' },
] as const;

export const FONT_PRESETS: Record<string, { label: string; fontSans: string; webfonts: string[] }> = {
  modern: {
    label: '现代无衬线（默认）',
    fontSans: "'Manrope', 'Noto Sans SC', sans-serif",
    webfonts: [],
  },
  serif: {
    label: '杂志衬线',
    fontSans: "'Source Serif 4', 'Noto Serif SC', serif",
    webfonts: [
      'https://fonts.loli.net/css2?family=Source+Serif+4:wght@400;600;700&family=Noto+Serif+SC:wght@400;500;600;700&display=swap',
    ],
  },
  wenkai: {
    label: '霞鹜文楷（手写感）',
    fontSans: "'LXGW WenKai Screen', 'Noto Sans SC', sans-serif",
    webfonts: ['https://cdn.jsdelivr.net/npm/lxgw-wenkai-screen-webfont@1.7.0/style.css'],
  },
};

export const DENSITY_ROOT_SIZE: Record<string, string> = {
  compact: '15px',
  normal: '16px',
  relaxed: '17px',
};

export const SHADOW_PRESETS: Record<string, {
  cardLight: string;
  cardDark: string;
  cardHoverLight: string;
  cardHoverDark: string;
  liquidLight: string;
  liquidLightHover: string;
  liquidDark: string;
  liquidDarkHover: string;
}> = {
  soft: {
    cardLight: '0 4px 12px -2px rgba(15, 23, 42, 0.04), 0 12px 24px -12px rgba(15, 23, 42, 0.18)',
    cardDark: '0 2px 10px rgba(0, 0, 0, 0.26), 0 16px 36px -22px rgba(0, 0, 0, 0.62)',
    cardHoverLight: '0 6px 16px -2px rgba(15, 23, 42, 0.06), 0 16px 32px -12px rgba(15, 23, 42, 0.25)',
    cardHoverDark: '0 4px 14px rgba(0, 0, 0, 0.36), 0 20px 44px -22px rgba(0, 0, 0, 0.72)',
    liquidLight: '0 22px 54px -34px rgba(15, 23, 42, 0.34), 0 8px 22px -24px rgba(15, 23, 42, 0.14), 0 1px 0 rgba(255, 255, 255, 0.58)',
    liquidLightHover: '0 24px 58px -36px rgba(15, 23, 42, 0.36), 0 9px 24px -24px rgba(15, 23, 42, 0.15), 0 1px 0 rgba(255, 255, 255, 0.62)',
    liquidDark: '0 26px 62px -34px rgba(0, 0, 0, 0.86), 0 10px 28px -26px rgba(0, 0, 0, 0.58), 0 1px 0 rgba(255, 255, 255, 0.05)',
    liquidDarkHover: '0 28px 66px -36px rgba(0, 0, 0, 0.88), 0 11px 30px -26px rgba(0, 0, 0, 0.6), 0 1px 0 rgba(255, 255, 255, 0.06)',
  },
  hard: {
    cardLight: '8px 8px 0 0 rgba(15, 23, 42, 0.9)',
    cardDark: '8px 8px 0 0 rgba(255, 255, 255, 0.22)',
    cardHoverLight: '11px 11px 0 0 rgba(15, 23, 42, 0.9)',
    cardHoverDark: '11px 11px 0 0 rgba(255, 255, 255, 0.28)',
    liquidLight: '8px 8px 0 0 rgba(15, 23, 42, 0.9)',
    liquidLightHover: '11px 11px 0 0 rgba(15, 23, 42, 0.9)',
    liquidDark: '8px 8px 0 0 rgba(255, 255, 255, 0.22)',
    liquidDarkHover: '11px 11px 0 0 rgba(255, 255, 255, 0.28)',
  },
  none: {
    cardLight: 'none',
    cardDark: 'none',
    cardHoverLight: 'none',
    cardHoverDark: 'none',
    liquidLight: 'none',
    liquidLightHover: 'none',
    liquidDark: 'none',
    liquidDarkHover: 'none',
  },
};

export const IDENTITY_ICON_OPTIONS: Array<[string, string]> = [
  ['conversion_path', '路径'],
  ['neurology', '思考'],
  ['build', '构建'],
  ['handyman', '工具'],
  ['edit_note', '创作'],
  ['auto_awesome', '探索'],
  ['lightbulb', '灵感'],
  ['rocket_launch', '行动'],
  ['psychology', '洞察'],
  ['groups', '协作'],
  ['palette', '设计'],
  ['star', '重点'],
];

export const TIMELINE_ICONS = [
  'rocket_launch', 'auto_awesome', 'palette', 'hub', 'groups', 'trending_up',
  'work', 'school', 'code', 'brush', 'edit_note', 'lightbulb',
  'psychology', 'favorite', 'star', 'public', 'flight_takeoff', 'menu_book',
  'science', 'storefront', 'fitness_center', 'music_note', 'camera_alt', 'construction',
];

export const METRIC_ICONS = [
  'palette', 'apps', 'edit_note', 'auto_awesome', 'star', 'favorite',
  'trending_up', 'work', 'code', 'brush', 'lightbulb', 'rocket_launch',
  'groups', 'public', 'camera_alt', 'science', 'storefront', 'verified',
  'emoji_events', 'school', 'menu_book', 'bolt',
];

export const STYLE_PACKS: StylePack[] = [
  { id: 'lava', name: '熔岩红', font: '现代无衬线', accentLight: '#C13B25', accentDark: '#EB5E47', pageLight: '#F8FAFC', pageDark: '#0B0B0C', radius: 24, aurora: 100, fontPreset: 'modern', density: 'normal', shadowStyle: 'soft', float: true, tints: { sidebar: '#E8734F', intro: '#C13B25', timeline: '', projects: '#F0A868', quicklinks: '' } },
  { id: 'indigo', name: '靛蓝理性', font: '现代无衬线', accentLight: '#2563EB', accentDark: '#60A5FA', pageLight: '#F7F9FC', pageDark: '#0A0E14', radius: 16, aurora: 60, fontPreset: 'modern', density: 'normal', shadowStyle: 'soft', float: true, tints: { sidebar: '#2563EB', intro: '#6366F1', timeline: '', projects: '', quicklinks: '#38BDF8' } },
  { id: 'teal', name: '松石清新', font: '现代无衬线', accentLight: '#0D9488', accentDark: '#2DD4BF', pageLight: '#F5FBFA', pageDark: '#081311', radius: 28, aurora: 120, fontPreset: 'modern', density: 'relaxed', shadowStyle: 'soft', float: true, tints: { sidebar: '#0D9488', intro: '#14B8A6', timeline: '#2DD4BF', projects: '', quicklinks: '' } },
  { id: 'magazine', name: '杂志衬线', font: '衬线字体', accentLight: '#9A3B26', accentDark: '#D98E6B', pageLight: '#FAF6EF', pageDark: '#15120E', radius: 12, aurora: 40, fontPreset: 'serif', density: 'normal', shadowStyle: 'soft', float: false, tints: { sidebar: '#A9603F', intro: '', timeline: '', projects: '#C9A27A', quicklinks: '' } },
  { id: 'brutal', name: '新粗野主义', font: '硬边阴影', accentLight: '#111111', accentDark: '#F5F5F5', pageLight: '#F4F4F0', pageDark: '#0A0A0A', radius: 0, aurora: 0, fontPreset: 'modern', density: 'compact', shadowStyle: 'hard', float: false, glass: false, tints: { sidebar: '#2563EB', intro: '#E4572E', timeline: '#F5C518', projects: '', quicklinks: '' } },
  { id: 'bauhaus', name: '包豪斯', font: '几何原色', accentLight: '#BE1E2D', accentDark: '#F5C518', pageLight: '#F3EDE2', pageDark: '#161513', radius: 4, aurora: 0, fontPreset: 'modern', density: 'normal', shadowStyle: 'hard', float: false, glass: false, tints: { sidebar: '#196EE6', intro: '#CE2222', timeline: '#F5C518', projects: '', quicklinks: '' } },
  { id: 'swiss', name: '瑞士国际主义', font: '网格与留白', accentLight: '#E30613', accentDark: '#FF4B3E', pageLight: '#FFFFFF', pageDark: '#111111', radius: 0, aurora: 0, fontPreset: 'modern', density: 'compact', shadowStyle: 'none', float: false, glass: false, tints: { sidebar: '', intro: '#E30613', timeline: '', projects: '', quicklinks: '' } },
  { id: 'soft', name: '手写温柔', font: '霞鹜文楷', accentLight: '#C2557E', accentDark: '#F191AE', pageLight: '#FDF8FA', pageDark: '#181114', radius: 32, aurora: 130, fontPreset: 'wenkai', density: 'relaxed', shadowStyle: 'soft', float: true, tints: { sidebar: '#F191AE', intro: '#C2557E', timeline: '', projects: '#E9A6C4', quicklinks: '' } },
  { id: 'forest', name: '森野绿', font: '现代无衬线', accentLight: '#2F7D4F', accentDark: '#6BD09B', pageLight: '#F4F7F2', pageDark: '#0C130E', radius: 20, aurora: 80, fontPreset: 'modern', density: 'normal', shadowStyle: 'soft', float: true, tints: { sidebar: '#2F7D4F', intro: '#6BD09B', timeline: '', projects: '#A7C957', quicklinks: '' } },
  { id: 'violet', name: '紫棠优雅', font: '现代无衬线', accentLight: '#6D42C7', accentDark: '#B79BF5', pageLight: '#F7F5FC', pageDark: '#100C18', radius: 22, aurora: 90, fontPreset: 'modern', density: 'normal', shadowStyle: 'soft', float: true, tints: { sidebar: '#6D42C7', intro: '#B79BF5', timeline: '', projects: '#8B6DD6', quicklinks: '' } },
  { id: 'amber', name: '暖阳琥珀', font: '现代无衬线', accentLight: '#C77A16', accentDark: '#F5B84B', pageLight: '#FBF6EE', pageDark: '#14100A', radius: 24, aurora: 90, fontPreset: 'modern', density: 'relaxed', shadowStyle: 'soft', float: true, tints: { sidebar: '#C77A16', intro: '#F5B84B', timeline: '', projects: '#E9A23B', quicklinks: '' } },
  { id: 'ocean', name: '深海靛蓝', font: '现代无衬线', accentLight: '#1C5D8C', accentDark: '#58B0E6', pageLight: '#F2F6FA', pageDark: '#08111A', radius: 16, aurora: 70, fontPreset: 'modern', density: 'normal', shadowStyle: 'soft', float: true, tints: { sidebar: '#1C5D8C', intro: '#58B0E6', timeline: '', projects: '#2E86C1', quicklinks: '' } },
  { id: 'mocha', name: '大地摩卡', font: '衬线字体', accentLight: '#8A5A3C', accentDark: '#D4A480', pageLight: '#F7F1EA', pageDark: '#14100C', radius: 12, aurora: 40, fontPreset: 'serif', density: 'normal', shadowStyle: 'soft', float: false, tints: { sidebar: '#8A5A3C', intro: '#D4A480', timeline: '', projects: '#B08968', quicklinks: '' } },
  { id: 'graphite', name: '石墨极简', font: '现代无衬线', accentLight: '#475569', accentDark: '#94A3B8', pageLight: '#FAFAFA', pageDark: '#0C0C0D', radius: 8, aurora: 0, fontPreset: 'modern', density: 'compact', shadowStyle: 'none', float: false, glass: false, tints: { sidebar: '#64748B', intro: '', timeline: '', projects: '#94A3B8', quicklinks: '' } },
  { id: 'sky', name: '晴空青蓝', font: '现代无衬线', accentLight: '#0EA5B5', accentDark: '#4FD8E8', pageLight: '#F3FAFB', pageDark: '#071316', radius: 28, aurora: 120, fontPreset: 'modern', density: 'relaxed', shadowStyle: 'soft', float: true, tints: { sidebar: '#0EA5B5', intro: '#4FD8E8', timeline: '', projects: '#38BDF8', quicklinks: '' } },
  { id: 'sakura', name: '樱绯书卷', font: '衬线字体', accentLight: '#C6456B', accentDark: '#F58BA8', pageLight: '#FCF4F6', pageDark: '#171113', radius: 14, aurora: 50, fontPreset: 'serif', density: 'normal', shadowStyle: 'soft', float: false, tints: { sidebar: '#C6456B', intro: '#F58BA8', timeline: '', projects: '#E48AA8', quicklinks: '' } },
];

export const PREFS_STORAGE_KEY = 'philweb.studio.prefs';
export const CURRENT_PROJECT_KEY = 'philweb.currentProjectId';
export const DB_NAME = 'philweb-studio';
export const DB_VERSION = 1;
