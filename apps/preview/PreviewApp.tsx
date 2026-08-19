import React, { useEffect, useState } from 'react';
import App from '../../App';
import { ContentProvider } from '../../data/ContentProvider';
import { LanguageProvider } from '../../data/i18n';
import { postTo, readStudioMessage, STUDIO_MESSAGE } from '../../lib/studio/messages';
import { migrateProject } from '../../lib/studio/migrate';
import type { InteractionMode, StudioProjectV1 } from '../../lib/studio/types';
import { useResolvedMediaUrls } from '../shared/useResolvedMediaUrls';
import { EditOverlay } from './EditOverlay';

export const PreviewApp: React.FC = () => {
  const [project, setProject] = useState<StudioProjectV1 | null>(null);
  const [mode, setMode] = useState<InteractionMode>('edit');
  const [lang, setLang] = useState<'zh' | 'en'>('zh');
  const mediaUrls = useResolvedMediaUrls(project, 'preview');

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const message = readStudioMessage(event, window.parent);
      if (!message) return;
      if (message.type === STUDIO_MESSAGE.PROJECT_UPDATE) {
        const migrated = migrateProject(message.project);
        if (migrated.ok && migrated.project) {
          setProject(migrated.project);
        }
        if (message.lang === 'zh' || message.lang === 'en') setLang(message.lang);
      }
      if (message.type === STUDIO_MESSAGE.SET_EDIT_MODE) {
        setMode(message.mode);
      }
    };
    window.addEventListener('message', onMessage);
    postTo(window.parent, { type: STUDIO_MESSAGE.PREVIEW_READY });
    return () => window.removeEventListener('message', onMessage);
  }, []);

  if (!project) {
    return <div style={{ padding: 24, color: '#64748b', fontFamily: 'sans-serif' }}>正在连接编辑器…</div>;
  }

  return (
    <LanguageProvider lang={lang} persist={false} onLangChange={(next) => {
      setLang(next);
      postTo(window.parent, { type: STUDIO_MESSAGE.LANG_CHANGE, lang: next });
    }}>
      <ContentProvider project={project} mediaUrls={mediaUrls}>
        <EditOverlay mode={mode} />
        <App />
      </ContentProvider>
    </LanguageProvider>
  );
};

export default PreviewApp;
