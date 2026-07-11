/** @type {import('tailwindcss').Config} */
import typography from '@tailwindcss/typography';

// 将 Tailwind 颜色映射到 CSS 变量，变量来源由 App.tsx 从 data/theme.ts 注入。
const token = (name, fallback) => `rgb(var(${name}, ${fallback}) / <alpha-value>)`;

// 生成 gray/neutral/blue 等色阶。
const scale = (family, shades) =>
  Object.fromEntries(
    Object.entries(shades).map(([shade, fallback]) => [shade, token(`--theme-${family}-${shade}`, fallback)]),
  );

export default {
  darkMode: 'class',
  content: [
    './index.html',
    './{components,data}/**/*.{js,ts,jsx,tsx}',
    './*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        // 正文字体走 CSS 变量，由 content/theme/site-theme.json 的 typography 决定（Studio 风格包可切换）。
        sans: 'var(--theme-font-sans, Manrope, "Noto Sans SC", sans-serif)',
        body: 'var(--theme-font-sans, Manrope, "Noto Sans SC", sans-serif)',
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        primary: token('--theme-primary', '17 17 17'),
        secondary: token('--theme-secondary', '102 102 102'),
        border: token('--theme-border', '243 244 246'),
        'dark-bg': token('--theme-dark-bg', '26 26 26'),
        'dark-surface': token('--theme-dark-surface', '38 38 38'),
        'dark-border': token('--theme-dark-border', '51 51 51'),
        'dark-text': token('--theme-dark-text', '229 229 229'),
        'dark-muted': token('--theme-dark-muted', '163 163 163'),
        gray: scale('gray', {
          50: '249 250 251',
          100: '243 244 246',
          200: '229 231 235',
          300: '209 213 219',
          400: '156 163 175',
          500: '107 114 128',
          600: '75 85 99',
          700: '55 65 81',
          800: '31 41 55',
          900: '17 24 39',
        }),
        neutral: scale('neutral', {
          50: '250 250 250',
          100: '245 245 245',
          200: '229 229 229',
          300: '212 212 212',
          400: '163 163 163',
          500: '115 115 115',
          600: '82 82 82',
          700: '64 64 64',
          800: '38 38 38',
          900: '23 23 23',
        }),
        blue: scale('blue', {
          50: '239 246 255',
          100: '219 234 254',
          200: '191 219 254',
          300: '147 197 253',
          400: '96 165 250',
          500: '59 130 246',
          600: '37 99 235',
          700: '29 78 216',
          800: '30 64 175',
          900: '30 58 138',
        }),
        emerald: scale('emerald', {
          50: '236 253 245',
          100: '209 250 229',
          200: '167 243 208',
          300: '110 231 183',
          400: '52 211 153',
          500: '16 185 129',
          600: '5 150 105',
          700: '4 120 87',
          800: '6 95 70',
          900: '6 78 59',
        }),
        amber: scale('amber', {
          50: '255 251 235',
          100: '254 243 199',
          200: '253 230 138',
          300: '252 211 77',
          400: '251 191 36',
          500: '245 158 11',
          600: '217 119 6',
          700: '180 83 9',
          800: '146 64 14',
          900: '120 53 15',
        }),
        rose: scale('rose', {
          50: '255 241 242',
          100: '255 228 230',
          200: '254 205 211',
          300: '253 164 175',
          400: '251 113 133',
          500: '244 63 94',
          600: '225 29 72',
          700: '190 18 60',
          800: '159 18 57',
          900: '136 19 55',
        }),
        red: scale('red', {
          50: '254 242 242',
          100: '254 226 226',
          200: '254 202 202',
          300: '252 165 165',
          400: '248 113 113',
          500: '239 68 68',
          600: '220 38 38',
          700: '185 28 28',
          800: '153 27 27',
          900: '127 29 29',
        }),
        green: scale('green', {
          50: '240 253 244',
          100: '220 252 231',
          200: '187 247 208',
          300: '134 239 172',
          400: '74 222 128',
          500: '34 197 94',
          600: '22 163 74',
          700: '21 128 61',
          800: '22 101 52',
          900: '20 83 45',
        }),
      },
      boxShadow: {
        sharp: '0 1px 2px rgba(0,0,0,0.02), 0 4px 16px rgba(0,0,0,0.02)',
        'sharp-hover': '0 8px 30px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.02)',
        'dark-sharp': '0 1px 2px rgba(0,0,0,0.3)',
        'dark-sharp-hover': '0 10px 40px rgba(0,0,0,0.4)',
      },
    },
  },
  plugins: [typography],
};

