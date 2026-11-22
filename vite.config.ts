import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, type Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

function appVersionManifestPlugin(buildId: string, buildTime: number): Plugin {
  const versionPayload = JSON.stringify(
    {
      buildId,
      buildTime,
      builtAt: new Date(buildTime).toISOString(),
    },
    null,
    2
  );

  return {
    name: 'livry-version-manifest',
    configureServer(server) {
      server.middlewares.use('/version.json', (_req, res) => {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.end(versionPayload);
      });
    },
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: versionPayload,
      });
    },
  };
}

export default defineConfig(() => {
  const buildTime = Date.now();
  const buildId = `v-${buildTime}`;

  return {
    define: {
      __APP_BUILD_ID__: JSON.stringify(buildId),
      __APP_BUILD_TIME__: JSON.stringify(buildTime),
    },
    plugins: [
      react(),
      tailwindcss(),
      appVersionManifestPlugin(buildId, buildTime),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: [
          'assets/aistudio/icon_03400f86.png',
          'assets/aistudio/barre_de_recherch_a0bb2929.png',
        ],
        manifest: {
          id: '/',
          name: 'Finder Livry - Code Finder Marjane',
          short_name: 'FinderLivry',
          description:
            'Outil métier ultra-rapide de recherche de produits et générateur de codes-barres GS1 pour préparateurs et livreurs Livry.',
          theme_color: '#1E1918',
          background_color: '#F6F3EC',
          display: 'standalone',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/assets/aistudio/icon_03400f86.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/assets/aistudio/icon_03400f86.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
          ],
        },
        workbox: {
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
          clientsClaim: true,
          skipWaiting: true,
          cleanupOutdatedCaches: true,
          globIgnores: ['**/version.json', '**/dist-netlify.zip', '**/_headers', '**/_redirects'],
          navigateFallbackDenylist: [/^\/version\.json/],
          runtimeCaching: [
            {
              urlPattern: /\/version\.json(\?.*)?$/i,
              handler: 'NetworkOnly',
            },
            {
              urlPattern: /\/index\.html(\?.*)?$/i,
              handler: 'NetworkOnly',
            },
          ],
        },
        devOptions: {
          enabled: true,
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve('.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
