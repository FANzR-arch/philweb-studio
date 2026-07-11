/**
 * [INPUT]   : 优化后的项目封面图与预设标题配置
 * [OUTPUT]  : public/og 下的 1200x630 社交分享封面图
 * [POS]     : Open Graph 资源生成脚本
 * [DECISION]: 使用 sharp 叠加 SVG 文字层，在保持自动化的同时保留较高的版式灵活性
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = process.cwd();
const OG_DIR = path.join(ROOT, 'public', 'og');

const COVER_WIDTH = 1200;
const COVER_HEIGHT = 630;

/**
 * 社交分享封面配置（可选功能）。
 * 想要自定义 OG 分享图时：把底图放进 public/Pictures/optimized/，
 * 然后按下面的示例格式添加条目，再运行 `npm run assets:share-covers`。
 * source 为 null 时使用纯色底图，开箱即用。
 */
const COVER_SPECS = [
  {
    output: 'home-1200x630.jpg',
    source: null,
    title: 'My Portfolio',
    subtitle: 'Built with folio-studio',
  },
];

const ensureDir = async (dir) => {
  await fs.mkdir(dir, { recursive: true });
};

const escapeText = (value) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

const buildOverlaySvg = (title, subtitle) => {
  const safeTitle = escapeText(title);
  const safeSubtitle = escapeText(subtitle);

  return Buffer.from(
    `<svg width="${COVER_WIDTH}" height="${COVER_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="rgba(0,0,0,0.15)"/>
          <stop offset="100%" stop-color="rgba(0,0,0,0.62)"/>
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="${COVER_WIDTH}" height="${COVER_HEIGHT}" fill="url(#bg)" />
      <rect x="48" y="472" width="6" height="110" fill="#ffffff" opacity="0.92"/>
      <text x="70" y="530" font-size="56" font-family="Inter,Segoe UI,Arial,sans-serif" font-weight="700" fill="#ffffff">${safeTitle}</text>
      <text x="70" y="574" font-size="28" font-family="Inter,Segoe UI,Arial,sans-serif" font-weight="400" fill="rgba(255,255,255,0.88)">${safeSubtitle}</text>
    </svg>`
  );
};

const generateCover = async ({ output, source, title, subtitle }) => {
  const outputPath = path.join(OG_DIR, output);
  const overlay = buildOverlaySvg(title, subtitle);

  // source 为 null 时使用纯色底图，让模板不依赖任何个人图片也能生成分享封面。
  const base = source
    ? sharp(source).resize(COVER_WIDTH, COVER_HEIGHT, { fit: 'cover', position: 'attention' })
    : sharp({ create: { width: COVER_WIDTH, height: COVER_HEIGHT, channels: 3, background: { r: 15, g: 23, b: 42 } } });

  if (source) {
    await fs.access(source);
  }

  await base
    .composite([{ input: overlay, top: 0, left: 0 }])
    .jpeg({ quality: 84, mozjpeg: true })
    .toFile(outputPath);

  return outputPath;
};

const main = async () => {
  await ensureDir(OG_DIR);
  console.log(`Generating OG covers -> ${path.relative(ROOT, OG_DIR)}`);

  for (const spec of COVER_SPECS) {
    const output = await generateCover(spec);
    console.log(`- ${path.basename(output)}`);
  }

  console.log('Done.');
};

main().catch((error) => {
  console.error('generate-share-covers failed:', error);
  process.exit(1);
});

