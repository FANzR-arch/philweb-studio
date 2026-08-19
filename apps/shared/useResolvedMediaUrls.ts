import { useEffect, useRef, useState } from 'react';
import { getMedia } from '../../lib/studio/storage';
import type { StudioProjectV1 } from '../../lib/studio/types';

export function useResolvedMediaUrls(
  project: StudioProjectV1 | null,
  mode: 'studio' | 'preview' | 'site',
): Record<string, string> {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const cacheRef = useRef(new Map<string, string>());

  useEffect(() => {
    if (!project) return;
    let cancelled = false;
    const run = async () => {
      const next: Record<string, string> = {};
      const keep = new Set<string>();
      for (const record of Object.values(project.mediaManifest || {})) {
        keep.add(record.id);
        if (mode === 'site' || record.source === 'export') {
          next[record.id] = `./${record.filename.replace(/^\.\//, '')}`;
          continue;
        }
        const cached = cacheRef.current.get(record.id);
        if (cached) {
          next[record.id] = cached;
          continue;
        }
        try {
          const stored = await getMedia(record.id);
          if (stored?.blob) {
            const url = URL.createObjectURL(stored.blob);
            cacheRef.current.set(record.id, url);
            next[record.id] = url;
            continue;
          }
        } catch {
          /* fall through to starter assets only when this id was never restored locally */
        }
        if (record.source === 'builtin') {
          next[record.id] = `./starter/media/${record.filename}`;
        }
      }
      for (const [id, url] of cacheRef.current.entries()) {
        if (!keep.has(id)) {
          URL.revokeObjectURL(url);
          cacheRef.current.delete(id);
        }
      }
      if (!cancelled) setUrls(next);
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [project, mode]);

  useEffect(() => () => {
    cacheRef.current.forEach((url) => URL.revokeObjectURL(url));
    cacheRef.current.clear();
  }, []);

  return urls;
}
