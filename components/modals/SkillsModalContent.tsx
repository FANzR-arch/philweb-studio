/**
 * [INPUT]   : 技能分类数据、SkillCategory 类型与全局主题徽章配色
 * [OUTPUT]  : 技能矩阵弹窗内容，用于集中展示能力结构与工具分布
 * [POS]     : 弹窗内容层，可作为独立技能弹窗或简历页的补充模块
 * [DECISION]: 使用分组网格与统一徽章色展示技能，既保留品牌辨识度，也避免组件内重复硬编码颜色
 */
import React from 'react';
import { useLanguage } from '../../data/i18n';
import { useSkillsContent } from '../../data/content';

export const SkillsModalContent: React.FC = () => {
  const { lang } = useLanguage();
  const skills = useSkillsContent();
  const copy = skills.modal;

  return (
    <div data-edit="skills" data-edit-label="技能内容" className="p-8 md:p-12">
      <div className="mb-8 p-4 bg-[var(--surface-inset)] border-l-4 border-[var(--text-primary)]">
        <p className="text-sm text-[var(--text-muted)]">
          {copy.intro[lang]}
        </p>
      </div>

      <div className="flex flex-col gap-8">
        {copy.categories.map((category, idx) => (
          <div
            key={category.title}
            className={`grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-8 ${idx !== copy.categories.length - 1 ? 'border-b border-[var(--border-soft)] pb-8' : ''}`}
          >
            <div className="font-bold text-sm uppercase tracking-wide text-[var(--text-primary)] pt-1">
              {category.title}
            </div>
            <div className="md:col-span-3 flex flex-col gap-4">
              <div className="flex flex-wrap gap-2">
                {category.items.map((item) => (
                  <div
                    key={`${category.title}-${item.name}`}
                    className="size-10 md:size-12 flex items-center justify-center text-xs md:text-sm font-bold rounded-none hover:scale-110 transition-transform cursor-default"
                    style={{ backgroundColor: item.bg, color: item.color }}
                    title={item.name}
                  >
                    {item.short.length > 2 ? (
                      <span className="material-symbols-outlined text-lg md:text-xl">{item.short}</span>
                    ) : (
                      item.short
                    )}
                  </div>
                ))}
              </div>
              <div className="text-[var(--text-muted)] text-sm leading-relaxed">
                {category.description}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
