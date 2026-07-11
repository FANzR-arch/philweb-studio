/**
 * [INPUT]   : TabConfig 配置数组与当前选中项
 * [OUTPUT]  : 通用标签导航组件
 * [POS]     : UI 基础组件层，用于切换并排内容区域
 * [DECISION]: 保持纯展示职责，不在组件内部引入复杂状态，方便上层自由控制切换逻辑
 */

import type { FC } from 'react';

interface Tab {
    id: string;
    label: string;
}

interface TabsProps {
    tabs: Tab[];
    activeTab: string;
    onChange: (id: string) => void;
}

export const Tabs: FC<TabsProps> = ({ tabs, activeTab, onChange }) => {
    return (
        <div className="flex space-x-1 bg-[var(--surface-inset)] p-1 rounded-lg w-fit mb-6 border border-[var(--border-soft)]">
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => onChange(tab.id)}
                    className={`
            px-4 py-2 rounded-md text-sm font-medium transition-all duration-200
            ${activeTab === tab.id
                            ? 'bg-[var(--surface-panel)] shadow-sm text-[var(--text-primary)] border border-[var(--border-soft)]'
                            : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--interactive-soft-hover)]'
                        }
          `}
                >
                    {tab.label}
                </button>
            ))}
        </div>
    );
};
