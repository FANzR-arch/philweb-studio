/**
 * [INPUT]   : localStorage、window.matchMedia 与文档根节点 class
 * [OUTPUT]  : useTheme hook，提供主题状态、切换方法与暗色判断
 * [POS]     : 数据层中的主题状态管理模块
 * [DECISION]: 优先读取用户持久化偏好，存储不可用时回退到系统主题
 */

import { useCallback, useEffect, useState } from 'react';
import { readLocalStorage, writeLocalStorage } from './safeStorage';

type Theme = 'light' | 'dark';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === 'undefined') {
      return 'light';
    }

    const saved = readLocalStorage('theme') as Theme | null;
    if (saved === 'light' || saved === 'dark') {
      return saved;
    }

    if (typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }

    return 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      writeLocalStorage('theme', next);
      return next;
    });
  }, []);

  return {
    theme,
    isDark: theme === 'dark',
    toggleTheme,
  };
}
