/**
 * [INPUT]   : 共享文章索引组件
 * [OUTPUT]  : 兼容旧调用的文章弹窗内容
 * [POS]     : Modal 内容层；首页现在直接使用 BlogIndex
 */

import React from 'react';
import { BlogIndex } from '../content/BlogIndex';

export const BlogModalContent: React.FC = () => <BlogIndex mode="modal" />;
