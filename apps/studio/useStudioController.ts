import { useCallback, useEffect, useRef, useState } from 'react';
import { exportProjectBackup, importProjectBackup } from '../../lib/studio/backup';
import { cloneJson, createId } from '../../lib/studio/clone';
import { AUTOSAVE_MS } from '../../lib/studio/constants';
import { downloadBytes } from '../../lib/studio/download';
import { prepareUpload } from '../../lib/studio/media';
import { instantiateStarter, syncBasicShared, touch } from '../../lib/studio/project-ops';
import { loadStarterProject, loadBuiltinMedia } from '../../lib/studio/starter';
import {
  estimateStorage,
  getCurrentProjectId,
  getMedia,
  loadProject,
  putMedia,
  saveProject,
  setCurrentProjectId,
} from '../../lib/studio/storage';
import type { SaveStatus, StudioProjectV1, ValidationIssue } from '../../lib/studio/types';
import { exportWebsiteZip, fetchSiteShell } from '../../lib/studio/website-export';
import { useResolvedMediaUrls } from '../shared/useResolvedMediaUrls';

export function useStudioController() {
  const [status, setStatus] = useState<SaveStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; error?: boolean } | null>(null);
  const [project, setProject] = useState<StudioProjectV1 | null>(null);
  const [starter, setStarter] = useState<StudioProjectV1 | null>(null);
  const [storageWarn, setStorageWarn] = useState(false);
  const [exportIssues, setExportIssues] = useState<ValidationIssue[]>([]);
  const sessionRef = useRef<StudioProjectV1 | null>(null);
  const historyRef = useRef<StudioProjectV1[]>([]);
  const timerRef = useRef<number | null>(null);
  const projectRef = useRef<StudioProjectV1 | null>(null);
  const dirtyRef = useRef(false);
  const mediaUrls = useResolvedMediaUrls(project, 'studio');

  const showToast = useCallback((text: string, isError = false) => {
    setToast({ text, error: isError });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), toast.error ? 4200 : 2200);
    return () => window.clearTimeout(id);
  }, [toast]);

  const persist = useCallback(async (next: StudioProjectV1) => {
    setStatus('saving');
    try {
      await saveProject(next);
      dirtyRef.current = false;
      setStatus('saved');
      const estimate = await estimateStorage();
      setStorageWarn(estimate.warn);
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : String(err));
      showToast('保存失败', true);
    }
  }, [showToast]);

  const scheduleSave = useCallback((next: StudioProjectV1) => {
    dirtyRef.current = true;
    setStatus('dirty');
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      void persist(next);
    }, AUTOSAVE_MS);
  }, [persist]);

  const updateProject = useCallback((mutator: (current: StudioProjectV1) => StudioProjectV1, options?: { history?: boolean }) => {
    setProject((current) => {
      if (!current) return current;
      if (options?.history) {
        historyRef.current = [...historyRef.current.slice(-19), cloneJson(current)];
      }
      const next = touch(syncBasicShared(mutator(current)));
      projectRef.current = next;
      scheduleSave(next);
      return next;
    });
  }, [scheduleSave]);

  const flushSave = useCallback(async () => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const next = projectRef.current;
    if (!next) return;
    await persist(next);
  }, [persist]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const starterProject = await loadStarterProject();
        if (cancelled) return;
        setStarter(starterProject);
        const existingId = await getCurrentProjectId();
        const existing = existingId ? await loadProject(existingId) : await loadProject();
        if (cancelled) return;
        if (existing) {
          setProject(existing);
          projectRef.current = existing;
          sessionRef.current = cloneJson(existing);
          setStatus('saved');
        } else {
          const created = instantiateStarter(starterProject);
          await saveProject(created);
          await setCurrentProjectId(created.projectId);
          setProject(created);
          projectRef.current = created;
          sessionRef.current = cloneJson(created);
          setStatus('saved');
        }
        const estimate = await estimateStorage();
        setStorageWarn(estimate.warn);
      } catch (err) {
        setStatus('error');
        setError(err instanceof Error ? err.message : String(err));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        void flushSave();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [flushSave]);

  useEffect(() => {
    const onLeave = (event: BeforeUnloadEvent) => {
      if (dirtyRef.current || status === 'dirty' || status === 'saving') {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', onLeave);
    return () => window.removeEventListener('beforeunload', onLeave);
  }, [status]);

  const uploadFile = useCallback(async (role: string, file: File) => {
    if (!projectRef.current) return;
    const { blob, record } = await prepareUpload(file, role);
    await putMedia(record, blob);
    updateProject((current) => {
      const next = cloneJson(current);
      next.mediaManifest[record.id] = record;
      const assign = (id: string) => {
        if (role === 'avatarLight') { next.basic.avatarLight = id; next.shared.assets.avatarLight = id; }
        if (role === 'avatarDark') { next.basic.avatarDark = id; next.shared.assets.avatarDark = id; }
        if (role === 'wechatQr') { next.basic.wechatQr = id; next.shared.assets.wechatQr = id; }
        if (role === 'brandMark') { next.basic.brandMark = id; next.shared.assets.brandMark = id; }
        if (role === 'backgroundImage') {
          next.shared.assets.backgroundImage = id;
          next.theme.effects = next.theme.effects ?? {};
          next.theme.effects.background = { ...(next.theme.effects.background ?? {}), mode: 'image' };
        }
        if (role === 'backgroundVideo') {
          next.shared.assets.backgroundVideo = id;
          next.theme.effects = next.theme.effects ?? {};
          next.theme.effects.background = { ...(next.theme.effects.background ?? {}), mode: 'video' };
        }
      };
      assign(record.id);
      return next;
    });
    showToast('文件已更新');
    return record.id;
  }, [showToast, updateProject]);

  const resetToStarter = useCallback(async () => {
    if (!starter) return;
    const created = instantiateStarter(starter, projectRef.current?.projectId || createId('p'));
    created.projectId = projectRef.current?.projectId || created.projectId;
    setProject(created);
    projectRef.current = created;
    await persist(created);
    showToast('已恢复为示例内容');
  }, [persist, showToast, starter]);

  const restoreSession = useCallback(async () => {
    if (!sessionRef.current) return;
    const restored = cloneJson(sessionRef.current);
    setProject(restored);
    projectRef.current = restored;
    await persist(restored);
    showToast('已撤销本次修改');
  }, [persist, showToast]);

  const undo = useCallback(() => {
    const prev = historyRef.current.pop();
    if (!prev) {
      showToast('没有可撤销的操作');
      return;
    }
    setProject(prev);
    projectRef.current = prev;
    scheduleSave(prev);
    showToast('已撤销');
  }, [scheduleSave, showToast]);

  const doExportWebsite = useCallback(async () => {
    const current = projectRef.current;
    if (!current) return;
    await flushSave();
    try {
      const { files } = await fetchSiteShell();
      const result = await exportWebsiteZip({
        project: current,
        shellFiles: files,
        getBlob: async (id) => (await getMedia(id))?.blob,
        builtinLoader: loadBuiltinMedia,
      });
      downloadBytes(result.filename, result.bytes);
      updateProject((item) => ({
        ...item,
        editor: { ...item.editor, checklist: { ...item.editor.checklist, exported: true } },
      }));
      setExportIssues([]);
      showToast(`已导出 ${result.filename}，解压后即可部署`);
    } catch (err) {
      const issues = (err as { issues?: ValidationIssue[] }).issues;
      if (issues) setExportIssues(issues);
      showToast(err instanceof Error ? err.message : '导出失败', true);
    }
  }, [flushSave, showToast, updateProject]);

  const doExportBackup = useCallback(async () => {
    const current = projectRef.current;
    if (!current) return;
    await flushSave();
    try {
      const result = await exportProjectBackup(
        current,
        async (id) => (await getMedia(id))?.blob,
        loadBuiltinMedia,
      );
      downloadBytes(result.filename, result.bytes);
      showToast('工程备份已下载');
    } catch (err) {
      showToast(err instanceof Error ? err.message : '工程备份导出失败', true);
    }
  }, [flushSave, showToast]);

  const doImportBackup = useCallback(async (file: File, mode: 'new' | 'overwrite') => {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const imported = importProjectBackup(bytes);
    let next = imported.project;
    if (mode === 'new') {
      next = { ...next, projectId: createId('p'), createdAt: new Date().toISOString() };
    } else if (projectRef.current) {
      next = { ...next, projectId: projectRef.current.projectId };
    }
    for (const item of imported.media) {
      await putMedia(item.record, new Blob([item.bytes], { type: item.record.mime }));
    }
    setProject(next);
    projectRef.current = next;
    await persist(next);
    showToast(mode === 'new' ? '已导入为新项目' : '已覆盖当前项目');
  }, [persist, showToast]);

  return {
    status,
    error,
    toast,
    project,
    starter,
    mediaUrls,
    storageWarn,
    exportIssues,
    setExportIssues,
    updateProject,
    flushSave,
    uploadFile,
    resetToStarter,
    restoreSession,
    undo,
    canUndo: historyRef.current.length > 0,
    doExportWebsite,
    doExportBackup,
    doImportBackup,
    showToast,
  };
}
