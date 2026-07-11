/**
 * [INPUT]   : Blog article content and category metadata from the content registry
 * [OUTPUT]  : Categorized article index with responsive cards and external article links
 * [POS]     : Modal content layer for the article archive
 */

import React from 'react';
import { useLanguage } from '../../data/i18n';
import { getBlogArticles, getBlogCategories } from '../../data/content';
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

export const BlogModalContent: React.FC = () => {
  const { lang } = useLanguage();
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
    if (activeCategoryId === 'all') {
      return;
    }

    const exists = categorySections.some((section) => section.category.id === activeCategoryId);
    if (!exists) {
      setActiveCategoryId('all');
    }
  }, [activeCategoryId, categorySections]);

  const visibleSections = activeCategoryId === 'all'
    ? categorySections
    : categorySections.filter((section) => section.category.id === activeCategoryId);

  const visibleArticleCount = visibleSections.reduce((count, section) => count + section.articles.length, 0);

  return (
    <div className="p-6 md:p-8">
      <div className="mb-7 border-b border-[var(--border-soft)] pb-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--site-accent)]">
              {lang === 'zh' ? '文章索引' : 'Article Index'}
            </div>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--text-muted)]">
              {lang === 'zh'
                ? '按系列、方法和个人思考重新整理的文章。'
                : 'Articles organized by series, methods, and personal notes.'}
            </p>
          </div>
          <div className="w-fit rounded-full border border-[var(--border-soft)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)]">
            {visibleArticleCount}/{articles.length}
          </div>
        </div>

        <div
          role="tablist"
          aria-label={lang === 'zh' ? '文章分类' : 'Article categories'}
          className="mt-5 flex gap-2 overflow-x-auto pb-1"
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

      <div className="space-y-8">
        {visibleSections.map((section) => (
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
              {section.articles.map((article) => (
                <article
                  key={article.id}
                  className="theme-panel group flex min-w-0 flex-col overflow-hidden rounded-xl border transition-all hover:-translate-y-0.5 hover:border-[var(--site-accent)]"
                >
                  <div className="flex aspect-[16/9] items-center justify-center overflow-hidden border-b border-[var(--border-soft)] bg-[var(--surface-muted)] p-2">
                    <img
                      src={article.cover}
                      alt={article.title}
                      className="h-full w-full object-contain"
                      loading="lazy"
                    />
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col p-4">
                    <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] font-medium">
                      <span className="rounded-full bg-[var(--surface-muted)] px-2 py-1 text-[var(--text-secondary)]">
                        {article.category.title[lang]}
                      </span>
                      {article.date && (
                        <time className="text-[var(--text-subtle)]" dateTime={article.date}>
                          {formatDate(article.date)}
                        </time>
                      )}
                    </div>

                    <h4 className="line-clamp-2 text-sm font-semibold leading-snug text-[var(--text-primary)]">
                      {article.title}
                    </h4>
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[var(--text-secondary)]">
                      {article.summary}
                    </p>

                    <div className="mt-auto flex w-full items-center gap-3 pt-4 text-xs font-semibold text-[var(--site-accent)]">
                      {article.wechat && (
                        <a
                          href={article.wechat}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex min-h-9 items-center gap-1 rounded-full border border-[var(--border-soft)] px-3 hover:border-[var(--site-accent)] hover:bg-[var(--surface-muted)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--site-accent)]"
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
                          className="ml-auto inline-flex min-h-9 items-center gap-1 rounded-full border border-[var(--border-soft)] px-3 hover:border-[var(--site-accent)] hover:bg-[var(--surface-muted)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--site-accent)]"
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
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
};
