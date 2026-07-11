/**
 * [INPUT]   : 原始图片目录与归档源目录中的候选素材
 * [OUTPUT]  : public/Pictures/optimized 下的 WebP 优化文件
 * [POS]     : 构建阶段的图片优化脚本
 * [DECISION]: 统一将部署图片转为 WebP，并允许多来源回退，降低人工整理资源的成本
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = process.cwd();
const INPUT_DIR = path.join(ROOT, 'public', 'Pictures');
const OUTPUT_DIR = path.join(INPUT_DIR, 'optimized');
const ARCHIVE_INPUT_DIR = path.join(
  ROOT,
  'archive',
  'non-deploy-assets',
  'source-images',
  'public',
  'Pictures'
);

const JOBS = [
  { input: 'FZRPICTURE2.png', max: 1400, quality: 82 },
  { input: 'Briank01.jpg', max: 1920, quality: 80 },
  { input: 'Briank02.jpg', max: 1920, quality: 80 },
  { input: 'Briank03.jpg', max: 1920, quality: 80 },
  { input: 'RZFrame01.jpg', max: 1920, quality: 80 },
  { input: 'RZFrame02.jpg', max: 1920, quality: 80 },
  { input: 'RZFrame03.jpg', max: 1920, quality: 80 },
  { input: 'Seedo01.jpg', max: 1920, quality: 80 },
  { input: 'Seedo02.jpg', max: 1920, quality: 80 },
  { input: 'Seedo03.jpg', max: 1920, quality: 80 },
  { input: 'Seedo04.jpg', max: 1920, quality: 80 },
  { input: 'canshugoujian01.jpg', max: 1920, quality: 80 },
  { input: 'canshugoujian02.png', max: 1920, quality: 82 },
  { input: 'canshugoujian03.png', max: 1920, quality: 82 },
];

const toKB = (bytes) => `${Math.round(bytes / 1024)}KB`;

const ensureDir = async (dir) => {
  await fs.mkdir(dir, { recursive: true });
};

const fileSize = async (filePath) => {
  const stat = await fs.stat(filePath);
  return stat.size;
};

const resolveInputPath = async (fileName) => {
  const candidates = [path.join(INPUT_DIR, fileName), path.join(ARCHIVE_INPUT_DIR, fileName)];
  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // 当前来源不可用时继续尝试下一个候选路径，避免因为单个文件缺失直接中断。
    }
  }
  throw new Error(`Source file not found for optimization: ${fileName}`);
};

const optimizeFile = async ({ input, max, quality }) => {
  const inputPath = await resolveInputPath(input);
  const outputPath = path.join(OUTPUT_DIR, `${path.parse(input).name}.webp`);

  await sharp(inputPath)
    .rotate()
    .resize({
      width: max,
      height: max,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality, effort: 6 })
    .toFile(outputPath);

  const [before, after] = await Promise.all([fileSize(inputPath), fileSize(outputPath)]);
  const reduction = before > 0 ? (((before - after) / before) * 100).toFixed(1) : '0.0';
  return { input, outputPath, before, after, reduction };
};

const main = async () => {
  await ensureDir(OUTPUT_DIR);

  let totalBefore = 0;
  let totalAfter = 0;

  console.log(`Optimizing ${JOBS.length} images -> ${path.relative(ROOT, OUTPUT_DIR)}`);
  for (const job of JOBS) {
    const result = await optimizeFile(job);
    totalBefore += result.before;
    totalAfter += result.after;
    console.log(
      `- ${job.input} => ${path.basename(result.outputPath)} (${toKB(result.before)} -> ${toKB(
        result.after
      )}, -${result.reduction}%)`
    );
  }

  const totalReduction = totalBefore > 0 ? (((totalBefore - totalAfter) / totalBefore) * 100).toFixed(1) : '0.0';
  console.log(
    `Done. Total: ${toKB(totalBefore)} -> ${toKB(totalAfter)} (-${totalReduction}%)`
  );
};

main().catch((error) => {
  console.error('optimize-images failed:', error);
  process.exit(1);
});
