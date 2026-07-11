/**
 * [INPUT]   : 子内容、样式类名、点击回调与视觉变体配置
 * [OUTPUT]  : 统一卡片外观、交互态与可访问性行为的通用容器
 * [POS]     : UI 基础组件层，供 Dashboard 与弹窗内容复用
 * [DECISION]: 用 variant 统一主次层级，并只在可点击场景下注入交互属性，避免无意义的可访问性噪音
 */

import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  variant?: 'hero' | 'primary' | 'secondary' | 'liquid' | 'none';
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  variant = 'primary',
  onClick,
  onKeyDown,
  role,
  tabIndex,
  ...props
}) => {
  const baseClasses = [
    'flex flex-col relative overflow-hidden rounded-[var(--card-radius)]',
    'border [border-color:var(--card-border)]',
    '[background:var(--card-bg)] [box-shadow:var(--card-shadow)]',
    'backdrop-blur-md transition-all duration-300 ease-out isolate',
  ].join(' ');
  const hoverClasses =
    variant === 'liquid'
      ? ''
      : 'hover:-translate-y-[1.5px] hover:[border-color:var(--card-border-hover)] hover:[box-shadow:var(--card-shadow-hover)]';

  const variantClasses = {
    hero: 'p-6 md:p-8',
    primary: 'p-5 md:p-5',
    secondary: 'p-4 rounded-[var(--card-radius-sm)] [background:var(--card-bg-secondary)]',
    liquid: 'p-5 md:p-5 liquid-card',
    none: 'p-0 bg-transparent border-none shadow-none rounded-none overflow-visible'
  };

  const interactiveClasses = onClick
    ? 'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]'
    : '';

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(e);
    if (!onClick || e.defaultPrevented) {
      return;
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick(e as unknown as React.MouseEvent<HTMLDivElement>);
    }
  };

  // 只有组件具备交互语义时才补充 role、tabIndex 等属性，避免静态卡片被误判为可操作元素。
  const accessibilityProps: React.HTMLAttributes<HTMLDivElement> = {};
  if (role) {
    accessibilityProps.role = role as React.AriaRole;
  } else if (onClick) {
    accessibilityProps.role = 'button';
  }

  return (
    <div
      {...props}
      {...accessibilityProps}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      tabIndex={onClick ? (tabIndex ?? 0) : tabIndex}
      className={`${variant !== 'none' ? `${baseClasses} ${hoverClasses}` : ''} ${variantClasses[variant]} ${interactiveClasses} ${className}`}
    >
      {variant !== 'none' && (
        <div
          aria-hidden
          className="card-highlight-layer pointer-events-none absolute inset-0 rounded-[inherit] [background:var(--card-highlight)] opacity-80"
        />
      )}
      <div className={variant !== 'none' ? 'relative z-[1] flex-1 w-full min-h-0 flex flex-col' : ''}>{children}</div>
    </div>
  );
};
