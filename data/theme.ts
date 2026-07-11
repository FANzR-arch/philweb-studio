import siteThemeData from '../content/theme/site-theme.json';

type ThemePrimitive = string | number;
interface ThemeTree {
  [key: string]: ThemePrimitive | ThemeTree;
}
type ThemeCssVars = Readonly<Record<`--${string}`, string>>;

export type ThemeMode = 'light' | 'dark';

const toKebab = (value: string) => value.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);

const flattenThemeVars = (
  prefix: string,
  value: ThemeTree | ThemePrimitive,
  vars: Record<`--${string}`, string>,
): void => {
  if (typeof value === 'string' || typeof value === 'number') {
    vars[`--${prefix}`] = String(value);
    return;
  }

  Object.entries(value).forEach(([key, nestedValue]) => {
    flattenThemeVars(`${prefix}-${toKebab(key)}`, nestedValue as ThemeTree | ThemePrimitive, vars);
  });
};

export const siteTheme = siteThemeData;

const legacyCssVars = (): Record<`--${string}`, string> => {
  const vars = {} as Record<`--${string}`, string>;

  Object.entries(siteTheme.palette).forEach(([family, shades]) => {
    Object.entries(shades).forEach(([shade, value]) => {
      vars[`--theme-${family}-${shade}`] = value;
    });
  });

  Object.entries(siteTheme.semantic).forEach(([key, value]) => {
    vars[`--theme-${toKebab(key)}`] = value;
  });

  Object.entries(siteTheme.projects).forEach(([key, value]) => {
    vars[`--theme-projects-${key}`] = value;
  });

  vars['--site-accent-light'] = siteTheme.accent.light;
  vars['--site-accent-dark'] = siteTheme.accent.dark;
  vars['--site-accent-glow'] = siteTheme.accent.glow;

  return vars;
};

interface ThemeTypography {
  fontPreset?: string;
  fontSans?: string;
  rootFontSize?: string;
  webfonts?: string[];
}

const themeTypography: ThemeTypography = (siteTheme as { typography?: ThemeTypography }).typography ?? {};

const createThemeCssVars = (): ThemeCssVars => {
  const vars = {} as Record<`--${string}`, string>;

  flattenThemeVars('theme-mode', siteTheme.modes as unknown as ThemeTree, vars);
  flattenThemeVars('theme-status', siteTheme.status as unknown as ThemeTree, vars);
  flattenThemeVars('theme-accent', siteTheme.accent as unknown as ThemeTree, vars);
  flattenThemeVars('theme-effects', siteTheme.effects as unknown as ThemeTree, vars);

  // typography 为可选段：旧主题文件没有它时回退到默认字体与字号。
  vars['--theme-font-sans'] = themeTypography.fontSans ?? "'Manrope', 'Noto Sans SC', sans-serif";
  vars['--theme-root-font-size'] = themeTypography.rootFontSize ?? '16px';

  Object.assign(vars, legacyCssVars());

  return vars;
};

export const themeCssVars = createThemeCssVars();

/** 按主题声明动态加载 webfont（预设字体切换时无需改 index.html）。 */
export const ensureThemeWebfonts = (): void => {
  const webfonts = themeTypography.webfonts ?? [];
  webfonts.forEach((href) => {
    if (document.querySelector(`link[data-theme-webfont="${href}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.dataset.themeWebfont = href;
    document.head.appendChild(link);
  });
};

export type SiteTheme = typeof siteTheme;
