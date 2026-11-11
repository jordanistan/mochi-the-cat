import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

const page = (p) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  // GitHub Pages serves the site from /<repo-name>/; the deploy workflow sets BASE_PATH
  base: process.env.BASE_PATH || '/',
  server: {
    host: true, // listen on all interfaces (needed inside Docker)
    port: 5173,
    strictPort: true,
    // file watching through Docker bind mounts can miss events; polling is reliable
    watch: process.env.CHOKIDAR_USEPOLLING ? { usePolling: true, interval: 300 } : undefined,
  },
  preview: { host: true, port: 4173, strictPort: true },
  build: {
    rollupOptions: {
      input: { main: page('./index.html'), game: page('./game/index.html') },
    },
  },
});
