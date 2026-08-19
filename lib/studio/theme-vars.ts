type ThemePrimitive = string | number;
interface ThemeTree {
  [key: string]: ThemePrimitive | ThemeTree;
}

export type ThemeCssVars = Record<`--${string}`, string>;

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
  if (!value || typeof value !== 'object') return;
  Object.entries(value).forEach(([key, nestedValue]) => {
    flattenThemeVars(`${prefix}-${toKebab(key)}`, nestedValue as ThemeTree | ThemePrimitive, vars);
  });
};

export function createThemeCssVars(siteTheme: Record<string, any>): ThemeCssVars {
  const vars = {} as Record<`--${string}`, string>;
  if (!siteTheme) return vars;

  flattenThemeVars('theme-mode', (siteTheme.modes ?? {}) as ThemeTree, vars);
  flattenThemeVars('theme-status', (siteTheme.status ?? {}) as ThemeTree, vars);
  flattenThemeVars('theme-accent', (siteTheme.accent ?? {}) as ThemeTree, vars);
  flattenThemeVars('theme-effects', (siteTheme.effects ?? {}) as ThemeTree, vars);

  const typography = siteTheme.typography ?? {};
  vars['--theme-font-sans'] = typography.fontSans ?? "'Manrope', 'Noto Sans SC', sans-serif";
  vars['--theme-root-font-size'] = typography.rootFontSize ?? '16px';

  if (siteTheme.palette) {
    Object.entries(siteTheme.palette).forEach(([family, shades]) => {
      Object.entries((shades as Record<string, string>) || {}).forEach(([shade, value]) => {
        vars[`--theme-${family}-${shade}`] = String(value);
      });
    });
  }
  if (siteTheme.semantic) {
    Object.entries(siteTheme.semantic).forEach(([key, value]) => {
      vars[`--theme-${toKebab(String(key))}`] = String(value);
    });
  }
  if (siteTheme.projects) {
    Object.entries(siteTheme.projects).forEach(([key, value]) => {
      vars[`--theme-projects-${key}`] = String(value);
    });
  }

  vars['--site-accent-light'] = siteTheme.accent?.light ?? '#C13B25';
  vars['--site-accent-dark'] = siteTheme.accent?.dark ?? '#EB5E47';
  vars['--site-accent-glow'] = siteTheme.accent?.glow ?? 'rgba(193, 59, 37, 0.35)';

  return vars;
}

export function ensureThemeWebfonts(siteTheme: Record<string, any>): void {
  if (typeof document === 'undefined') return;
  const webfonts: string[] = siteTheme?.typography?.webfonts ?? [];
  webfonts.forEach((href) => {
    if (document.querySelector(`link[data-theme-webfont="${href}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.dataset.themeWebfont = href;
    document.head.appendChild(link);
  });
}

export function applyThemeToRoot(siteTheme: Record<string, any>): ThemeCssVars {
  const vars = createThemeCssVars(siteTheme);
  if (typeof document === 'undefined') return vars;
  const root = document.documentElement;
  Object.entries(vars).forEach(([key, value]) => {
    root.style.setProperty(key, String(value));
  });
  root.classList.toggle('no-glass', String(vars['--theme-effects-cards-glass-state'] ?? 'on').trim() === 'off');
  const background = siteTheme?.effects?.background ?? {};
  root.dataset.siteBackgroundMode = background.mode ?? 'default';
  root.dataset.siteBackgroundPattern = background.pattern ?? 'grid';
  ensureThemeWebfonts(siteTheme);
  return vars;
}
