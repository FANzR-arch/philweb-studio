/**
 * [INPUT]   : public/images 目录结构与 Vite 插件生命周期
 * [OUTPUT]  : 自动生成的 data/imageManifest.ts 图片清单
 * [POS]     : Vite 插件层，负责把静态图片目录映射为可消费的数据源
 * [DECISION]: 通过文件系统扫描生成清单，避免组件手动维护路径并降低资源引用出错率
 */

import fs from 'fs';
import path from 'path';
import type { Plugin } from 'vite';

/** 支持扫描的图片扩展名，统一作为目录遍历时的过滤条件。 */
const IMAGE_EXTENSIONS = new Set([
    '.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.avif',
]);

/**
 * 判断文件是否为图片
 * @param filename - 文件名
 * @returns 是否为支持的图片格式
 */
function isImageFile(filename: string): boolean {
    const ext = path.extname(filename).toLowerCase();
    return IMAGE_EXTENSIONS.has(ext);
}

/**
 * 扫描指定目录，返回目录内所有图片文件名（不含路径）
 * @param dirPath - 要扫描的目录绝对路径
 * @returns 图片文件名数组
 * @throws 目录不存在时返回空数组，不抛错
 */
function scanDir(dirPath: string): string[] {
    try {
        if (!fs.existsSync(dirPath)) return [];
        return fs.readdirSync(dirPath).filter(isImageFile);
    } catch {
        // 某个目录不存在时直接返回空数组，让新增或删除资源目录都不会中断开发流程。
        return [];
    }
}

/**
 * 在目录中查找匹配指定基础名的文件（不区分扩展名）
 * 例如查找 "avatar" 会匹配 "avatar.png"、"avatar.webp" 等
 * @param dirPath - 目录路径
 * @param baseName - 不含扩展名的文件基础名
 * @returns 匹配的文件完整路径（相对于 public），或 null
 */
function findFileByBaseName(
    dirPath: string,
    baseName: string,
    publicRoot: string
): string | null {
    const files = scanDir(dirPath);
    const match = files.find(
        (f) => path.parse(f).name.toLowerCase() === baseName.toLowerCase()
    );
    if (!match) return null;
    // 输出统一转成以 public 为根的绝对站内路径，方便前端组件直接消费。
    const rel = path.relative(publicRoot, path.join(dirPath, match));
    return '/' + rel.replace(/\\/g, '/');
}

/**
 * 扫描整个 public/images/ 目录，生成结构化的图片清单
 * @param publicRoot - public 目录的绝对路径
 * @returns 结构化的图片清单对象
 */
function generateManifest(publicRoot: string) {
    const imagesRoot = path.join(publicRoot, 'images');

    // ── 1. 头像资源：约定读取 avatar / avatar-dark 两个基础文件名。 ──
    const profileDir = path.join(imagesRoot, 'profile');
    const avatar = findFileByBaseName(profileDir, 'avatar', publicRoot);
    const avatarDark = findFileByBaseName(profileDir, 'avatar-dark', publicRoot);

    // ── 2. 封面资源：按项目 id 自动归档 light / dark 两套封面。 ──
    const coversDir = path.join(imagesRoot, 'covers');
    const coverFiles = scanDir(coversDir);
    const covers: Record<string, { light: string; dark: string | null }> = {};

    // 先按基础名分组，再识别 -dark 后缀，避免同一项目在不同扩展名下重复登记。
    const coverBaseNames = new Set<string>();
    for (const file of coverFiles) {
        const name = path.parse(file).name.toLowerCase();
        // 去掉 -dark 后缀后得到统一的项目 id，供 light / dark 封面共用。
        const projectId = name.replace(/-dark$/, '');
        coverBaseNames.add(projectId);
    }

    for (const projectId of coverBaseNames) {
        const light = findFileByBaseName(coversDir, projectId, publicRoot);
        const dark = findFileByBaseName(coversDir, `${projectId}-dark`, publicRoot);
        if (light) {
            covers[projectId] = { light, dark };
        }
    }

    // ── 3. 详情图资源：扫描每个项目目录并输出有序图片列表。 ──
    const detailsDir = path.join(imagesRoot, 'details');
    const details: Record<string, string[]> = {};

    try {
        if (fs.existsSync(detailsDir)) {
            const projectDirs = fs.readdirSync(detailsDir, { withFileTypes: true })
                .filter((d) => d.isDirectory());

            for (const dir of projectDirs) {
                const projectDir = path.join(detailsDir, dir.name);
                const images = scanDir(projectDir)
                    // 优先按文件名中的数字自然排序，保证详情图展示顺序稳定。
                    .sort((a, b) => {
                        const numA = parseInt(path.parse(a).name, 10);
                        const numB = parseInt(path.parse(b).name, 10);
                        // 命名不是纯数字时退回字母排序，兼容少量手工命名资源。
                        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
                        return a.localeCompare(b);
                    })
                    .map((file) => {
                        const rel = path.relative(publicRoot, path.join(projectDir, file));
                        return '/' + rel.replace(/\\/g, '/');
                    });

                details[dir.name] = images;
            }
        }
    } catch {
        // 详情图目录允许缺失，避免某个项目暂时没有补图时阻断清单生成。
    }

    return { profile: { avatar, avatarDark }, covers, details };
}

/**
 * 将清单对象写入 data/imageManifest.ts 文件
 * @param projectRoot - 项目根目录
 * @param manifest - 清单数据
 */
function writeManifestFile(projectRoot: string, manifest: ReturnType<typeof generateManifest>) {
    const outputPath = path.join(projectRoot, 'data', 'imageManifest.ts');

    const content = `/**
 * ⚠️ 本文件由 plugins/imageScanner.ts 自动生成，请勿手动编辑
 *
 * [INPUT]   : public/images/ 文件夹结构
 * [OUTPUT]  : 图片路径清单，供组件引用
 * [POS]     : 数据层，图片路径的唯一数据源
 * [DECISION]: 自动生成避免手动维护路径，减少出错概率
 *
 * 更新方式：在 public/images/ 下添加、替换或删除图片文件，开发服务器会自动重新生成本文件
 */

export const imageManifest = ${JSON.stringify(manifest, null, 2)} as const;

export type ProjectImageId = keyof typeof imageManifest.covers;
`;

    fs.writeFileSync(outputPath, content, 'utf-8');
}

/**
 * Vite 插件：自动扫描 public/images 并生成图片清单
 *
 * 功能：
 * - 启动时扫描一次
 * - 开发模式下监听文件变化，自动重新生成
 * - 构建时扫描一次确保清单最新
 *
 * @returns Vite 插件对象
 */
export function imageScannerPlugin(): Plugin {
    let projectRoot = '';
    let publicRoot = '';

    /** 执行一次完整扫描并把最新清单写回 data/imageManifest.ts。 */
    const scan = () => {
        try {
            const manifest = generateManifest(publicRoot);
            writeManifestFile(projectRoot, manifest);
            console.log('[imageScanner] ✅ 图片清单已更新');
        } catch (err) {
            console.error('[imageScanner] ❌ 扫描失败:', err);
        }
    };

    return {
        name: 'image-scanner',
        // 在其他插件之前执行，确保依赖图片清单的组件编译时已经拿到最新数据。
        enforce: 'pre',

        configResolved(config) {
            projectRoot = config.root;
            publicRoot = path.join(config.root, 'public');
        },

        // 构建开始时强制扫描一次，避免生产包沿用旧的图片索引。
        buildStart() {
            scan();
        },

        // 开发模式下持续监听资源目录变化，让图片清单能自动热更新。
        configureServer(server) {
            scan(); // 启动时先扫一次

            const imagesDir = path.join(publicRoot, 'images');
            // 直接复用 Vite 内置的 watcher，避免额外引入文件监听依赖。
            server.watcher.add(imagesDir);

            const handleChange = (filePath: string) => {
                // 非 images 目录的变动不需要重建清单。
                if (!filePath.startsWith(imagesDir)) return;
                // 只有图片文件的新增、删除和替换才会影响图片清单。
                if (!isImageFile(filePath) && !filePath.endsWith('.svg')) return;

                console.log(`[imageScanner] 🔄 检测到图片变化: ${path.relative(projectRoot, filePath)}`);
                scan();
            };

            server.watcher.on('add', handleChange);
            server.watcher.on('unlink', handleChange);
            server.watcher.on('change', handleChange);
        },
    };
}
