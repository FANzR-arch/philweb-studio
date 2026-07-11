/**
 * [INPUT]   : App 根组件与国际化 Provider
 * [OUTPUT]  : 将 React 应用挂载到浏览器 DOM
 * [POS]     : 应用入口文件
 * [DECISION]: 在根节点注入 LanguageProvider，让全站组件都能直接消费同一份语言上下文
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { LanguageProvider } from './data/i18n';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </React.StrictMode>
);
