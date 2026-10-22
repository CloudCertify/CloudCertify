import { mkdtemp, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build, type Plugin, type ResolvedConfig } from 'vite';

/** Runs before PWA closeBundle/precache generation; emits both HTML assets. */
export function prerenderHome(): Plugin {
  let config: ResolvedConfig;
  return {
    name: 'cloudcertify-public-home',
    apply: (_config, environment) => environment.command === 'build' || Boolean(environment.isPreview),
    enforce: 'post',
    configResolved(resolved) { config = resolved; },
    configurePreviewServer(server) {
      server.middlewares.use((request, _response, next) => {
        const pathname = new URL(request.url ?? '/', 'http://preview.local').pathname;
        if (request.headers.accept?.includes('text/html') && pathname !== '/' &&
            !existsSync(path.join(path.resolve(config.root, config.build.outDir), pathname))) {
          request.url = '/spa.html';
        }
        next();
      });
    },
    generateBundle: {
      order: 'post',
      async handler(_options, bundle) {
        const html = bundle['index.html'];
        if (html?.type !== 'asset' || typeof html.source !== 'string') {
          throw new Error('Prerender requires the generated index.html asset');
        }
        // Keep the renderer outside dist and disable config/plugins recursively.
        const directory = await mkdtemp(path.join(config.root, 'node_modules/.prerender-'));
        try {
          await build({
            configFile: false,
            root: config.root,
            logLevel: 'warn',
            resolve: { alias: config.resolve.alias },
            esbuild: { jsx: 'automatic' },
            build: {
              ssr: path.join(config.root, 'src/seo/render-home.tsx'),
              outDir: directory,
              copyPublicDir: false,
              rollupOptions: { output: { entryFileNames: 'render-home.mjs' } }
            }
          });
          const { renderHome } = await import(pathToFileURL(path.join(directory, 'render-home.mjs')).href) as {
            renderHome: () => { body: string; head: string; year: number }
          };
          const { body, head, year } = renderHome();
          const shell = html.source;
          const outlet = '<div id="root"></div>';
          if (!shell.includes(outlet) || !body.includes('<h1')) {
            throw new Error('Prerender requires an empty root and a readable homepage heading');
          }
          this.emitFile({ type: 'asset', fileName: 'spa.html', source: shell });
          html.source = shell.replace('</head>', `${head}</head>`).replace(
            outlet, `<div id="root" data-home-year="${year}">${body}</div>`
          );
        } finally {
          await rm(directory, { recursive: true, force: true });
        }
      }
    }
  };
}
