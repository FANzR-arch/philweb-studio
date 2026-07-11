/**
 * [INPUT]   : 图片地址、alt 文案、样式类名与标准 img 属性
 * [OUTPUT]  : 内置骨架屏与错误兜底的图片展示组件
 * [POS]     : UI 基础组件层，负责统一站内图片的加载体验
 * [DECISION]: 在图片加载和失败场景都提供稳定占位，减少布局抖动并避免出现空白块
 */

import React, { useState } from 'react';

interface ImageWithSkeletonProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    containerClassName?: string;
    priority?: boolean;
}

export const ImageWithSkeleton: React.FC<ImageWithSkeletonProps> = ({
    src,
    alt,
    className = '',
    containerClassName = '',
    priority = false,
    loading = 'lazy',
    decoding = 'async',
    fetchPriority,
    ...props
}) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [hasError, setHasError] = useState(false);
    const effectiveLoading = priority ? 'eager' : loading;
    const effectiveFetchPriority = priority ? 'high' : fetchPriority ?? 'auto';

    return (
        <div className={`relative overflow-hidden ${containerClassName}`}>
            {/* 加载完成前先展示骨架屏，占住版面并提示用户内容仍在请求中。 */}
            {!isLoaded && !hasError && (
                <div className="absolute inset-0 bg-[var(--image-skeleton)] animate-pulse z-10" />
            )}

            {/* 图片加载成功后再切换到真实内容，避免首屏出现突兀闪烁。 */}
            <img
                src={src}
                alt={alt}
                loading={effectiveLoading}
                decoding={decoding}
                fetchPriority={effectiveFetchPriority}
                className={`w-full h-full object-cover transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'
                    } ${className}`}
                onLoad={() => setIsLoaded(true)}
                onError={() => {
                    setIsLoaded(true); // Stop skeleton
                    setHasError(true);
                }}
                {...props}
            />

            {/* 加载失败时用轻量错误占位兜底，至少保留区域边界和失败反馈。 */}
            {hasError && (
                <div className="absolute inset-0 bg-[var(--image-fallback)] flex items-center justify-center text-[var(--icon-muted)] z-0">
                    <span className="material-symbols-outlined text-3xl">broken_image</span>
                </div>
            )}
        </div>
    );
};
