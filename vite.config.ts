import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';

function starterStaticPlugin() {
  const starterDir = path.resolve(__dirname, 'generated/starter');
  return {
    name: 'starter-static',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = (req.url ?? '').split('?')[0];
        if (url === '/studio' || url === '/studio/') {
          res.statusCode = 302;
          res.setHeader('Location', '/');
          res.end();
          return;
        }
        if (!url.startsWith('/starter/')) {
          next();
          return;
        }
        const relative = decodeURIComponent(url.slice('/starter/'.length));
        const absolute = path.normalize(path.join(starterDir, relative));
        if (!absolute.startsWith(starterDir) || !fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) {
          res.statusCode = 404;
          res.end('Not found');
          return;
        }
        const ext = path.extname(absolute).toLowerCase();
        const mime = {
          '.json': 'application/json',
          '.svg': 'image/svg+xml',
          '.png': 'image/png',
          '.jpg': 'image/jpeg',
          '.webp': 'image/webp',
          '.mp4': 'video/mp4',
          '.webm': 'video/webm',
        }[ext] || 'application/octet-stream';
        res.statusCode = 200;
        res.setHeader('Content-Type', mime);
        fs.createReadStream(absolute).pipe(res);
      });
    },
    closeBundle() {
      const outDir = path.resolve(__dirname, 'dist/starter');
      if (!fs.existsSync(starterDir)) return;
      fs.mkdirSync(path.dirname(outDir), { recursive: true });
      fs.cpSync(starterDir, outDir, { recursive: true });
    },
  };
}

export default defineConfig(() => {
  return {
    base: './',
    server: {
      port: Number(process.env.PORT) || 3000,
      host: '0.0.0.0',
    },
    plugins: [starterStaticPlugin(), react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html'),
          preview: path.resolve(__dirname, 'preview.html'),
        },
      },
    },
  };
});
