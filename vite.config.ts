/**
 * [INPUT]   : 环境变量、Vite 官方配置能力与 imageScanner 插件
 * [OUTPUT]  : Vite 开发与构建配置
 * [POS]     : 工程配置层，定义本地开发、构建与插件装配方式
 * [DECISION]: 使用 Vite 提升迭代速度，并在构建链路里接入 imageScanner 自动维护图片清单
 */

import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { contentRegistryPlugin } from './plugins/contentRegistry';
import { imageScannerPlugin } from './plugins/imageScanner';
import { studioPlugin } from './plugins/studio';

export default defineConfig(() => {
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [contentRegistryPlugin(), imageScannerPlugin(), studioPlugin(), react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
