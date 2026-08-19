import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import App from '../../App';
import '../../index.css';
import { ContentProvider } from '../../data/ContentProvider';
import { LanguageProvider } from '../../data/i18n';
import { buildMediaUrlMap } from '../../lib/studio/content-view';
import { migrateProject } from '../../lib/studio/migrate';
import type { StudioProjectV1 } from '../../lib/studio/types';

const SiteRoot: React.FC = () => {
  const [project, setProject] = useState<StudioProjectV1 | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('./project.json')
      .then((res) => {
        if (!res.ok) throw new Error('找不到 project.json');
        return res.json();
      })
      .then((json) => {
        const migrated = migrateProject(json);
        if (!migrated.ok || !migrated.project) {
          throw new Error(migrated.reason || '项目数据无法使用');
        }
        setProject(migrated.project);
      })
      .catch((err) => setError(err instanceof Error ? err.message : String(err)));
  }, []);

  if (error) {
    return <div style={{ padding: 32, fontFamily: 'sans-serif' }}>无法加载网站内容：{error}</div>;
  }
  if (!project) {
    return <div style={{ padding: 32, fontFamily: 'sans-serif', color: '#64748b' }}>加载中…</div>;
  }

  const mediaUrls = buildMediaUrlMap(project, { mode: 'site' });
  return (
    <LanguageProvider>
      <ContentProvider project={project} mediaUrls={mediaUrls}>
        <App />
      </ContentProvider>
    </LanguageProvider>
  );
};

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Could not find root element to mount to');
ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <SiteRoot />
  </React.StrictMode>,
);
