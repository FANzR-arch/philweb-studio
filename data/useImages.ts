/**
 * [INPUT]   : imageManifest 图片清单与当前主题状态
 * [OUTPUT]  : useImages、useProjectImages、useAvatar 等图片读取 hook
 * [POS]     : 数据层中的图片访问接口
 * [DECISION]: 将路径选择与明暗模式切换收敛到 hook，避免组件里重复拼接资源地址
 */

import { getProjectById, getSharedContent } from './content';
import { imageManifest } from './imageManifest';

/**
 * 检测当前是否为暗色模式
 * 通过检查 <html> 元素的 class 是否包含 'dark' 来判断
 * @returns 当前是否暗色模式
 */
function isDarkMode(): boolean {
    if (typeof document === 'undefined') return false;
    return document.documentElement.classList.contains('dark');
}

/**
 * 获取头像路径（支持明暗模式）
 *
 * @returns { light, dark, current } 三种路径
 * - light: 亮色模式头像
 * - dark: 暗色模式头像（如果没有单独的暗色版，回退到亮色）
 * - current: 根据当前主题自动选择的路径
 *
 * 常见错误：如果返回 null，说明 public/images/profile/ 下没有 avatar 文件
 */
export function getAvatarImages() {
    const shared = getSharedContent();
    const avatar = shared.assets.avatarLight || imageManifest.profile.avatar;
    const avatarDark = shared.assets.avatarDark || imageManifest.profile.avatarDark || avatar;
    return {
        light: avatar,
        dark: avatarDark,
        current: isDarkMode() ? avatarDark : avatar,
    };
}

/**
 * 获取指定项目的封面路径（支持明暗模式）
 *
 * @param projectId - 项目 id（如 'flowcard'）
 * @returns { light, dark, current } 或 null（项目无封面时）
 *
 * 常见错误：projectId 拼写错误，或 public/images/covers/ 下没有对应文件
 */
export function getCoverImages(projectId: string) {
    const project = getProjectById(projectId);
    const contentCoverLight = project?.assets?.coverLight || project?.cover;
    const contentCoverDark = project?.assets?.coverDark || contentCoverLight;

    if (contentCoverLight) {
        return {
            light: contentCoverLight,
            dark: contentCoverDark || contentCoverLight,
            current: isDarkMode() ? (contentCoverDark || contentCoverLight) : contentCoverLight,
        };
    }

    // 空清单时 keyof 会推断为 never，这里放宽为字符串索引以兼容无 public/images 的仓库。
    const covers = imageManifest.covers as Record<string, { light: string; dark: string | null }>;
    const cover = covers[projectId];
    if (!cover) return null;
    return {
        light: cover.light,
        dark: cover.dark || cover.light,
        current: isDarkMode() ? (cover.dark || cover.light) : cover.light,
    };
}

/**
 * 获取指定项目的详情图列表（已按编号排序）
 *
 * @param projectId - 项目 id
 * @returns 图片路径数组，无详情图时返回空数组
 */
export function getDetailImages(projectId: string): readonly string[] {
    const project = getProjectById(projectId);
    if (project?.locales?.zh?.detailImages && project.locales.zh.detailImages.length > 0) {
        return project.locales.zh.detailImages;
    }

    const details = imageManifest.details as Record<string, readonly string[]>;
    return details[projectId] || [];
}

/**
 * 获取完整的图片清单（只读）
 * 适用于需要一次性获取全部数据的场景
 */
export function getImageManifest() {
    return imageManifest;
}
