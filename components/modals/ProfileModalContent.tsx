/**
 * [INPUT]   : ResumeModalContent 导出的简历弹窗内容
 * [OUTPUT]  : 向后兼容的个人轨迹弹窗入口
 * [POS]     : 弹窗内容层的兼容别名
 * [DECISION]: 个人轨迹与简历页已合并，继续复用同一份内容以避免展示口径分叉
 */

export { ResumeModalContent as ProfileModalContent } from './ResumeModalContent';
