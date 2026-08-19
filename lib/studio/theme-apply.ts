import {
  AURORA_BASE_DARK,
  AURORA_BASE_LIGHT,
  CARD_TINT_SLOTS,
  DEFAULT_TINT_ALPHA,
  DENSITY_ROOT_SIZE,
  FONT_PRESETS,
  SHADOW_PRESETS,
} from './constants';
import { hexToRgb, isHexColor, rgba, tintToHex } from './color';
import { cloneJson } from './clone';
import type { StylePack, StudioProjectV1 } from './types';

export interface AppearanceInput {
  accentLight: string;
  accentDark: string;
  pageLight: string;
  pageDark: string;
  radius: number;
  aurora: number;
  fontPreset: string;
  density: string;
  float: boolean;
  glass: boolean;
  shadowStyle: string;
  backgroundMode: string;
  backgroundPattern: string;
  backgroundGridSize: number;
  backgroundDotSize: number;
  backgroundColor: string;
  backgroundOpacity: number;
  cardTints: Record<string, string>;
  tintOpacity: number;
}

export function readAppearance(theme: Record<string, any>): AppearanceInput {
  const radius = parseInt(String(theme.effects?.cards?.radius ?? '24'), 10) || 24;
  const auroraOpacity = Number(theme.effects?.aurora?.light?.opacity ?? AURORA_BASE_LIGHT);
  const rootSize = theme.typography?.rootFontSize ?? '16px';
  return {
    accentLight: theme.accent?.light ?? '#C13B25',
    accentDark: theme.accent?.dark ?? '#EB5E47',
    pageLight: theme.modes?.light?.surface?.page ?? '#F8FAFC',
    pageDark: theme.modes?.dark?.surface?.page ?? '#0B0B0C',
    radius,
    aurora: Math.round((auroraOpacity / AURORA_BASE_LIGHT) * 100),
    fontPreset: theme.typography?.fontPreset ?? 'modern',
    density: Object.entries(DENSITY_ROOT_SIZE).find(([, size]) => size === rootSize)?.[0] ?? 'normal',
    float: theme.effects?.cards?.floatState !== 'paused',
    glass: theme.effects?.cards?.glassState !== 'off',
    shadowStyle: SHADOW_PRESETS[theme.effects?.cards?.shadowStyle] ? theme.effects.cards.shadowStyle : 'soft',
    backgroundMode: ['default', 'image', 'video'].includes(theme.effects?.background?.mode)
      ? theme.effects.background.mode
      : 'default',
    backgroundPattern: ['grid', 'dots', 'none'].includes(theme.effects?.background?.pattern)
      ? theme.effects.background.pattern
      : 'grid',
    backgroundGridSize: Math.min(100, Math.max(20, parseInt(String(theme.effects?.background?.gridSize ?? '40'), 10) || 40)),
    backgroundDotSize: Math.min(48, Math.max(10, parseInt(String(theme.effects?.background?.dotSize ?? '20'), 10) || 20)),
    backgroundColor: hexToRgb(String(theme.effects?.background?.color ?? '')) ? theme.effects.background.color : '#E0745C',
    backgroundOpacity: Math.min(0.8, Math.max(0.05, Number(theme.effects?.background?.opacity ?? 0.42))),
    cardTints: Object.fromEntries(
      CARD_TINT_SLOTS.map((slot) => [slot.key, tintToHex(theme.effects?.cardTints?.[slot.key])]),
    ),
    tintOpacity: typeof theme.effects?.cardTintOpacity === 'number' ? theme.effects.cardTintOpacity : DEFAULT_TINT_ALPHA,
  };
}

export function applyAppearance(theme: Record<string, any>, input: AppearanceInput): Record<string, any> {
  const next = cloneJson(theme);
  const required = {
    主色浅色: input.accentLight,
    主色深色: input.accentDark,
    浅色底色: input.pageLight,
    深色底色: input.pageDark,
  };
  for (const [label, value] of Object.entries(required)) {
    if (!isHexColor(String(value ?? ''))) {
      throw new Error(`${label} 不是合法的十六进制颜色（例如 #C13B25）。`);
    }
  }
  if (!isHexColor(input.backgroundColor)) {
    throw new Error('图案颜色不是合法的十六进制颜色（例如 #E0745C）。');
  }

  const radius = Math.min(48, Math.max(0, Math.round(Number(input.radius ?? 24))));
  const auroraLevel = Math.min(200, Math.max(0, Math.round(Number(input.aurora ?? 100))));

  next.accent = next.accent ?? {};
  next.modes = next.modes ?? { light: { text: {}, pill: {}, surface: {} }, dark: { text: {}, pill: {}, surface: {} } };
  next.effects = next.effects ?? { cards: {}, aurora: { light: {}, dark: {} }, liquid: { light: {}, dark: {} } };
  next.effects.cards = next.effects.cards ?? {};
  next.effects.aurora = next.effects.aurora ?? { light: {}, dark: {} };
  next.effects.aurora.light = next.effects.aurora.light ?? {};
  next.effects.aurora.dark = next.effects.aurora.dark ?? {};
  next.effects.liquid = next.effects.liquid ?? { light: {}, dark: {} };
  next.effects.liquid.light = next.effects.liquid.light ?? {};
  next.effects.liquid.dark = next.effects.liquid.dark ?? {};
  next.modes.light = next.modes.light ?? {};
  next.modes.dark = next.modes.dark ?? {};
  next.modes.light.text = next.modes.light.text ?? {};
  next.modes.dark.text = next.modes.dark.text ?? {};
  next.modes.light.pill = next.modes.light.pill ?? {};
  next.modes.dark.pill = next.modes.dark.pill ?? {};
  next.modes.light.surface = next.modes.light.surface ?? {};
  next.modes.dark.surface = next.modes.dark.surface ?? {};

  next.accent.light = input.accentLight;
  next.accent.dark = input.accentDark;
  next.accent.glow = rgba(input.accentLight, 0.35);
  next.modes.light.text.accent = input.accentLight;
  next.modes.dark.text.accent = input.accentDark;
  next.modes.light.pill.hoverBorder = rgba(input.accentLight, 0.22);
  next.modes.dark.pill.hoverBorder = rgba(input.accentDark, 0.3);
  next.modes.light.surface.page = input.pageLight;
  next.modes.dark.surface.page = input.pageDark;
  next.effects.cards.radius = `${radius}px`;
  next.effects.cards.radiusSmall = `${Math.max(4, Math.round(radius * 0.75))}px`;
  next.effects.aurora.light.opacity = Number(((auroraLevel / 100) * AURORA_BASE_LIGHT).toFixed(3));
  next.effects.aurora.dark.opacity = Number(((auroraLevel / 100) * AURORA_BASE_DARK).toFixed(3));

  const backgroundMode = ['default', 'image', 'video'].includes(input.backgroundMode) ? input.backgroundMode : 'default';
  const backgroundPattern = ['grid', 'dots', 'none'].includes(input.backgroundPattern) ? input.backgroundPattern : 'grid';
  const backgroundGridSize = Math.min(100, Math.max(20, Math.round(Number(input.backgroundGridSize ?? 40))));
  const backgroundDotSize = Math.min(48, Math.max(10, Math.round(Number(input.backgroundDotSize ?? 20))));
  const backgroundOpacity = Math.min(0.8, Math.max(0.05, Number(input.backgroundOpacity ?? 0.42)));

  next.effects.background = {
    mode: backgroundMode,
    pattern: backgroundPattern,
    gridSize: `${backgroundGridSize}px`,
    dotSize: `${backgroundDotSize}px`,
    color: input.backgroundColor,
    opacity: Number(backgroundOpacity.toFixed(2)),
    lineColor: rgba(input.backgroundColor, Number((backgroundOpacity * 0.2).toFixed(3))),
    dotColor: rgba(input.backgroundColor, Number(backgroundOpacity.toFixed(3))),
    dotAccentColor: rgba(input.backgroundColor, Number(Math.min(0.9, backgroundOpacity * 1.38).toFixed(3))),
  };

  const fontPreset = FONT_PRESETS[input.fontPreset] ? input.fontPreset : 'modern';
  next.typography = {
    fontPreset,
    fontSans: FONT_PRESETS[fontPreset].fontSans,
    webfonts: FONT_PRESETS[fontPreset].webfonts,
    rootFontSize: DENSITY_ROOT_SIZE[input.density] ?? '16px',
  };

  next.effects.cards.floatState = input.float === false ? 'paused' : 'running';
  next.effects.cards.glassState = input.glass === false ? 'off' : 'on';
  const shadowStyle = SHADOW_PRESETS[input.shadowStyle] ? input.shadowStyle : 'soft';
  const shadows = SHADOW_PRESETS[shadowStyle];
  next.effects.cards.shadowStyle = shadowStyle;
  next.effects.cards.shadow = { light: shadows.cardLight, dark: shadows.cardDark };
  next.effects.cards.shadowHover = { light: shadows.cardHoverLight, dark: shadows.cardHoverDark };
  next.effects.liquid.light.shadow = shadows.liquidLight;
  next.effects.liquid.light.shadowHover = shadows.liquidLightHover;
  next.effects.liquid.dark.shadow = shadows.liquidDark;
  next.effects.liquid.dark.shadowHover = shadows.liquidDarkHover;

  const tintAlpha = Math.min(0.9, Math.max(0.1, Number(input.tintOpacity ?? DEFAULT_TINT_ALPHA)));
  next.effects.cardTintOpacity = tintAlpha;
  next.effects.cardTints = Object.fromEntries(
    CARD_TINT_SLOTS.map((slot) => {
      const hex = String(input.cardTints?.[slot.key] ?? '').trim();
      return [slot.key, hexToRgb(hex) ? rgba(hex, tintAlpha) : 'transparent'];
    }),
  );

  return next;
}

export function applyStylePack(project: StudioProjectV1, pack: StylePack): StudioProjectV1 {
  const current = readAppearance(project.theme);
  const nextTheme = applyAppearance(project.theme, {
    ...current,
    accentLight: pack.accentLight,
    accentDark: pack.accentDark,
    pageLight: pack.pageLight,
    pageDark: pack.pageDark,
    radius: pack.radius,
    aurora: pack.aurora,
    fontPreset: pack.fontPreset,
    density: pack.density,
    shadowStyle: pack.shadowStyle,
    float: pack.float !== false,
    glass: pack.glass !== false,
    cardTints: pack.tints || {},
  });
  return { ...project, theme: nextTheme, updatedAt: new Date().toISOString() };
}
