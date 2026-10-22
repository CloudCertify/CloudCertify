import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

const readPublic = (path: string) => readFileSync(resolve('public', path.replace(/^\//, '')));

describe('install assets', () => {
  it('links the manifest and Apple icon in the app head', () => {
    const page = new DOMParser().parseFromString(readFileSync(resolve('index.html'), 'utf8'), 'text/html');
    expect(page.head.querySelector('link[rel="manifest"]')?.getAttribute('href')).toBe('/manifest.webmanifest');
    expect(page.head.querySelector('link[rel="apple-touch-icon"]')?.getAttribute('href')).toBe('/icons/apple-touch-icon.png');
  });

  it('declares an app identity, standalone root scope, and valid PNG install icons', () => {
    const manifest: {
      id: string; name: string; start_url: string; scope: string; display: string;
      icons: { src: string; type: string; sizes: string; purpose: string }[];
    } = JSON.parse(readPublic('manifest.webmanifest').toString());
    expect(manifest).toMatchObject({ id: '/', name: 'CloudCertify', start_url: '/', scope: '/', display: 'standalone' });
    expect(manifest.icons.map(({ sizes }) => sizes)).toEqual(expect.arrayContaining(['192x192', '512x512']));
    expect(manifest.icons.some(({ purpose }) => purpose === 'maskable')).toBe(true);
    for (const icon of [...manifest.icons, { src: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }]) {
      const bytes = readPublic(icon.src);
      expect(icon.type).toBe('image/png');
      expect([...bytes.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
      expect(`${bytes.readUInt32BE(16)}x${bytes.readUInt32BE(20)}`).toBe(icon.sizes);
    }
  });
});

function offlinePage(stored: string | null = null, languages = ['en-US'], blockedStorage = false) {
  const page = new DOMParser().parseFromString(readPublic('offline.html').toString(), 'text/html');
  const getItem = vi.fn(() => {
    if (blockedStorage) throw new Error('storage blocked');
    return stored;
  });
  runInNewContext(page.querySelector('script')!.textContent!, {
    document: page,
    localStorage: { getItem },
    navigator: { languages, language: languages[0] }
  });
  return page;
}

describe('self-contained offline page', () => {
  it('has an honest attempt warning, same-page retry link, and no network dependencies', () => {
    const page = offlinePage();
    expect(page.documentElement.lang).toBe('en-US');
    expect(page.querySelector('h1')?.textContent).toBe('Connection unavailable');
    expect(page.querySelector('#attempt')?.textContent).toContain('cannot confirm whether an answer was saved');
    expect(page.querySelector('#retry')?.getAttribute('href')).toBe('');
    expect(page.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex');
    expect(page.querySelectorAll('script[src], link[href], img[src], iframe')).toHaveLength(0);
    expect(page.querySelector('style')?.textContent).toContain('font-family: ui-sans-serif, system-ui, sans-serif');
    expect(page.querySelector('style')?.textContent).not.toMatch(/JetBrains|Archivo|@import|url\(/);
  });

  it('uses the stored Portuguese choice and translates the document title and retry action', () => {
    const page = offlinePage('pt-BR');
    expect(page.documentElement.lang).toBe('pt-BR');
    expect(page.title).toBe('Conexão indisponível | CloudCertify');
    expect(page.querySelector('#retry')?.textContent).toBe('Tentar esta página novamente');
    expect(page.querySelector('#attempt')?.textContent).toContain('não pode confirmar se uma resposta foi salva');
  });

  it('respects a stored English choice over browser Portuguese', () => {
    expect(offlinePage('en-US', ['pt-BR']).documentElement.lang).toBe('en-US');
  });

  it('uses the first supported browser language when storage is unavailable or unsupported', () => {
    expect(offlinePage(null, ['fr', 'pt'], true).documentElement.lang).toBe('pt-BR');
    expect(offlinePage('fr', ['pt-BR']).documentElement.lang).toBe('pt-BR');
    expect(offlinePage(null, ['fr']).documentElement.lang).toBe('en-US');
  });
});
