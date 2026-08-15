/**
 * [INPUT]   : 博客文章与分类数据、当前语言
 * [OUTPUT]  : 可嵌入首页或弹窗的文章索引与卡片列表
 * [POS]     : 内容展示层，统一文章筛选和卡片渲染
 */

import React from 'react';
import { useLanguage } from '../../data/i18n';
import { getBlogArticles, getBlogCategories, getHomeContent } from '../../data/content';
import type { BlogArticle, BlogCategory } from '../../types';

interface ArticleViewModel {
  id: string;
  title: string;
  summary: string;
  cover: string;
  wechat?: string;
  twitter?: string;
  category: BlogCategory;
  categoryId: string;
  date?: string;
}

interface CategorySection {
  category: BlogCategory;
  articles: ArticleViewModel[];
}

interface BlogIndexProps {
  mode?: 'embedded' | 'modal';
}

const FALLBACK_COVER = 'https://picsum.photos/id/1015/600/340';

const UNCATEGORIZED_CATEGORY: BlogCategory = {
  id: 'uncategorized',
  title: {
    zh: '未分类',
    en: 'Uncategorized',
  },
  description: {
    zh: '还没有归入固定栏目。',
    en: 'Not assigned to a fixed column yet.',
  },
};

function getArticleCategory(article: BlogArticle, categoryById: Map<string, BlogCategory>): BlogCategory {
  if (article.categoryId) {
    return categoryById.get(article.categoryId) ?? UNCATEGORIZED_CATEGORY;
  }

  return UNCATEGORIZED_CATEGORY;
}

function formatDate(date?: string): string {
  return date ? date.replace(/-/g, '.') : '';
}

export const BlogIndex: React.FC<BlogIndexProps> = ({ mode = 'modal' }) => {
  const { lang } = useLanguage();
  const homeContent = getHomeContent(lang);
  const rawArticles = getBlogArticles();
  const rawCategories = getBlogCategories();
  const [activeCategoryId, setActiveCategoryId] = React.useState('all');

  const articles = React.useMemo<ArticleViewModel[]>(() => {
    const categoryById = new Map(rawCategories.map((category) => [category.id, category]));

    return rawArticles.map((article) => {
      const category = getArticleCategory(article, categoryById);

      return {
        id: article.id,
        title: article.title,
        summary: article.summary,
        cover: article.cover || FALLBACK_COVER,
        wechat: article.wechat,
        twitter: article.twitter,
        category,
        categoryId: category.id,
        date: article.date,
      };
    });
  }, [rawArticles, rawCategories]);

  const categorySections = React.useMemo<CategorySection[]>(() => {
    const categoriesWithFallback = [
      ...rawCategories,
      ...(articles.some((article) => article.categoryId === UNCATEGORIZED_CATEGORY.id) ? [UNCATEGORIZED_CATEGORY] : []),
    ];

    return categoriesWithFallback
      .map((category) => ({
        category,
        articles: articles.filter((article) => article.categoryId === category.id),
      }))
      .filter((section) => section.articles.length > 0);
  }, [articles, rawCategories]);

  React.useEffect(() => {
    if (activeCategoryId === 'all') return;

    const exists = categorySections.some((section) => section.category.id === activeCategoryId);
    if (!exists) setActiveCategoryId('all');
  }, [activeCategoryId, categorySections]);

  const visibleSections = activeCategoryId === 'all'
    ? categorySections
    : categorySections.filter((section) => section.category.id === activeCategoryId);
  const visibleArticles = visibleSections.flatMap((section) => section.articles);
  const visibleArticleCount = visibleSections.reduce((count, section) => count + section.articles.length, 0);
  const isEmbedded = mode === 'embedded';

  const emptyState = (
    <div className="flex min-h-[220px] items-center justify-center rounded-xl border border-dashed border-[var(--border-soft)] px-6 text-center text-sm text-[var(--text-muted)]">
      {lang === 'zh' ? '还没有文章，之后可以在 Studio 中添加。' : 'No articles yet. Add one later in Studio.'}
    </div>
  );

  const renderArticleCard = (article: ArticleViewModel) => (
    <article
      key={article.id}
      className={`theme-panel group flex min-w-0 flex-col overflow-hidden border transition-all hover:-translate-y-0.5 hover:border-[var(--site-accent)] ${isEmbedded ? 'rounded-lg' : 'rounded-xl'}`}
    >
      <div className={`flex items-center justify-center overflow-hidden border-b border-[var(--border-soft)] bg-[var(--surface-muted)] ${isEmbedded ? 'aspect-[16/8] p-1.5' : 'aspect-[16/9] p-2'}`}>
        <img
          src={article.cover}
          alt={article.title}
          className="h-full w-full object-contain"
          loading="lazy"
        />
      </div>

      <div className={`flex min-w-0 flex-1 flex-col ${isEmbedded ? 'p-3' : 'p-4'}`}>
        <div className={`flex flex-wrap items-center font-medium ${isEmbedded ? 'mb-1.5 gap-1.5 text-[10px]' : 'mb-2 gap-2 text-[11px]'}`}>
          <span className={`rounded-full bg-[var(--surface-muted)] text-[var(--text-secondary)] ${isEmbedded ? 'px-1.5 py-0.5' : 'px-2 py-1'}`}>
            {article.category.title[lang]}
          </span>
          {article.date && (
            <time className="text-[var(--text-subtle)]" dateTime={article.date}>
              {formatDate(article.date)}
            </time>
          )}
        </div>

        <h4 className={`line-clamp-2 font-semibold leading-snug text-[var(--text-primary)] ${isEmbedded ? 'text-xs' : 'text-sm'}`}>
          {article.title}
        </h4>
        <p className={`line-clamp-2 leading-relaxed text-[var(--text-secondary)] ${isEmbedded ? 'mt-0.5 text-[11px]' : 'mt-1 text-xs'}`}>
          {article.summary}
        </p>

        <div className={`mt-auto flex w-full items-center font-semibold text-[var(--site-accent)] ${isEmbedded ? 'gap-2 pt-3 text-[11px]' : 'gap-3 pt-4 text-xs'}`}>
          {article.wechat && (
            <a
              href={article.wechat}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-1 rounded-full border border-[var(--border-soft)] hover:border-[var(--site-accent)] hover:bg-[var(--surface-muted)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--site-accent)] ${isEmbedded ? 'min-h-8 px-2' : 'min-h-9 px-3'}`}
            >
              {lang === 'zh' ? '公众号' : 'WeChat'}
              <span className="material-symbols-outlined text-sm">arrow_outward</span>
            </a>
          )}
          {article.twitter && (
            <a
              href={article.twitter}
              target="_blank"
              rel="noopener noreferrer"
              className={`ml-auto inline-flex items-center gap-1 rounded-full border border-[var(--border-soft)] hover:border-[var(--site-accent)] hover:bg-[var(--surface-muted)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--site-accent)] ${isEmbedded ? 'min-h-8 px-2' : 'min-h-9 px-3'}`}
            >
              X
              <span className="material-symbols-outlined text-sm">arrow_outward</span>
            </a>
          )}
          {!article.wechat && !article.twitter && (
            <span className="text-[var(--text-subtle)]">
              {lang === 'zh' ? '暂无链接' : 'No link yet'}
            </span>
          )}
        </div>
      </div>
    </article>
  );

  return (
    <div className={isEmbedded ? 'flex h-full min-h-0 flex-col p-4 sm:p-5' : 'p-6 md:p-8'}>
      <div className={`shrink-0 border-b border-[var(--border-soft)] ${isEmbedded ? 'mb-4 pb-4' : 'mb-6 pb-5'}`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--site-accent)]">
              {isEmbedded ? homeContent.quickLinks.blog : (lang === 'zh' ? '文章索引' : 'Article Index')}
            </div>
            <p className={`${isEmbedded ? 'mt-1 text-xs' : 'mt-2 text-sm'} max-w-2xl leading-relaxed text-[var(--text-muted)]`}>
              {lang === 'zh'
                ? '按系列、方法和个人思考重新整理的文章。'
                : 'Articles organized by series, methods, and personal notes.'}
            </p>
          </div>
          <div className={`w-fit rounded-full border border-[var(--border-soft)] font-medium text-[var(--text-secondary)] ${isEmbedded ? 'px-2.5 py-1 text-[10px]' : 'px-3 py-1.5 text-xs'}`}>
            {visibleArticleCount}/{articles.length}
          </div>
        </div>

        <div
          role="tablist"
          aria-label={lang === 'zh' ? '文章分类' : 'Article categories'}
          className={`${isEmbedded ? 'mt-3' : 'mt-5'} flex gap-2 overflow-x-auto pb-1`}
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeCategoryId === 'all'}
            onClick={() => setActiveCategoryId('all')}
            className={`shrink-0 rounded-full border px-3.5 py-2 text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--site-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-base)] ${
              activeCategoryId === 'all'
                ? 'border-[var(--site-accent)] bg-[var(--site-accent)] text-white shadow-sm'
                : 'border-[var(--border-soft)] text-[var(--text-secondary)] hover:border-[var(--site-accent)] hover:text-[var(--text-primary)]'
            }`}
          >
            <span>{lang === 'zh' ? '全部' : 'All'}</span>
            <span className="ml-2 opacity-70">{articles.length}</span>
          </button>

          {categorySections.map((section) => (
            <button
              key={section.category.id}
              type="button"
              role="tab"
              aria-selected={activeCategoryId === section.category.id}
              onClick={() => setActiveCategoryId(section.category.id)}
              className={`shrink-0 rounded-full border px-3.5 py-2 text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--site-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-base)] ${
                activeCategoryId === section.category.id
                  ? 'border-[var(--site-accent)] bg-[var(--site-accent)] text-white shadow-sm'
                  : 'border-[var(--border-soft)] text-[var(--text-secondary)] hover:border-[var(--site-accent)] hover:text-[var(--text-primary)]'
              }`}
            >
              <span>{section.category.title[lang]}</span>
              <span className="ml-2 opacity-70">{section.articles.length}</span>
            </button>
          ))}
        </div>
      </div>

      <div className={isEmbedded ? 'min-h-0 flex-1 overflow-y-auto pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden' : 'space-y-8'}>
        {visibleSections.length === 0
          ? emptyState
          : isEmbedded
            ? <div className="grid grid-cols-2 gap-3">{visibleArticles.map(renderArticleCard)}</div>
            : visibleSections.map((section) => (
            <section key={section.category.id} className="space-y-3">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h3 className="text-base font-semibold text-[var(--text-primary)]">
                    {section.category.title[lang]}
                  </h3>
                  {section.category.description && (
                    <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
                      {section.category.description[lang]}
                    </p>
                  )}
                </div>
                <span className="text-xs font-medium text-[var(--text-subtle)]">
                  {section.articles.length} {lang === 'zh' ? '篇' : section.articles.length === 1 ? 'article' : 'articles'}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {section.articles.map(renderArticleCard)}
              </div>
            </section>
          ))}
      </div>
    </div>
  );
};
