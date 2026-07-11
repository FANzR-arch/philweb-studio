import path from 'path';
import type { Plugin } from 'vite';
import { writeContentRegistryFile } from '../content-system/core.js';

export function contentRegistryPlugin(): Plugin {
  let projectRoot = '';
  let contentRoot = '';

  const regenerate = (throwOnError = false) => {
    try {
      const result = writeContentRegistryFile(projectRoot);
      const action = result.changed ? 'updated' : 'checked';
      console.log(`[contentRegistry] ${action}: ${path.relative(projectRoot, result.outputFilePath)}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[contentRegistry] ${message}`);
      if (throwOnError) {
        throw error;
      }
    }
  };

  return {
    name: 'content-registry',
    enforce: 'pre',
    configResolved(config) {
      projectRoot = config.root;
      contentRoot = path.join(config.root, 'content');
    },
    buildStart() {
      regenerate(true);
    },
    configureServer(server) {
      regenerate(true);
      server.watcher.add(contentRoot);

      const handleContentChange = (filePath: string) => {
        if (!filePath.startsWith(contentRoot)) {
          return;
        }
        regenerate(false);
      };

      server.watcher.on('add', handleContentChange);
      server.watcher.on('change', handleContentChange);
      server.watcher.on('unlink', handleContentChange);
    },
  };
}
