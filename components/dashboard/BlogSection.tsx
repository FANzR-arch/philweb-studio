/**
 * [INPUT]   : 博客文章内容与通用卡片
 * [OUTPUT]  : 首页直接展示的文章卡片区域
 * [POS]     : Dashboard 左侧主内容列，替代首页直接显示的经历时间轴
 */

import React from 'react';
import { Card } from '../ui/Card';
import { BlogIndex } from '../content/BlogIndex';

export const BlogSection: React.FC = () => (
  <Card
    variant="liquid"
    className="dashboard-surface-card card-slot-blog liquid-float-c flex-1 h-full min-h-0 overflow-hidden animate-fade-in-up delay-1"
  >
    <BlogIndex mode="embedded" />
  </Card>
);
