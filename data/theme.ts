import { applyThemeToRoot, createThemeCssVars, ensureThemeWebfonts, type ThemeCssVars } from '../lib/studio/theme-vars';

export { applyThemeToRoot, createThemeCssVars, ensureThemeWebfonts };
export type { ThemeCssVars };
export type ThemeMode = 'light' | 'dark';
export type SiteTheme = Record<string, any>;
