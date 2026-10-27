import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

// Run against `pnpm start`. No JavaScript executes in these parsed documents.
const origin = process.argv[2] ?? 'http://localhost:4173';
const checks = [];
for (const language of ['en-US', 'pt-BR']) {
  for (const path of ['/', '/dashboard', '/quiz/1']) {
    const response = await fetch(origin + path, { headers: { Cookie: `cloudcertify-language=${language}` } });
    assert.equal(response.status, 200, path);
    const document = new JSDOM(await response.text()).window.document;
    document.querySelectorAll('script').forEach(script => script.remove());
    assert.equal(document.documentElement.lang, language);
    assert.ok(document.querySelector('h1')?.textContent?.trim());
    assert.ok(document.querySelector('main')?.textContent.includes('AWS'));
    assert.equal(document.querySelector('link[rel="canonical"]')?.href, 'https://cloudcertify.snowye.dev' + path);
    assert.ok(document.title.includes('CloudCertify'));
    assert.ok(!document.querySelector('meta[name="robots"]')?.content.includes('noindex'));
    checks.push(`${language} ${path}: raw HTML and metadata`);
  }
}
for (const path of ['/unknown-route', '/quiz/0', '/quiz/2147483647', '/prototype/quiz-motion']) {
  const response = await fetch(origin + path);
  assert.equal(response.status, 404, path);
  checks.push(`${path}: HTTP 404`);
}
for (const path of ['/progress', '/auth/callback', '/quiz', '/quiz/1/session', '/quiz/1/drill/1/session']) {
  const response = await fetch(origin + path);
  assert.equal(response.status, 200, path);
  assert.match(response.headers.get('x-robots-tag'), /noindex/);
  const document = new JSDOM(await response.text()).window.document;
  assert.ok(document.querySelector('meta[name="robots"]')?.content.includes('noindex'));
  assert.ok(document.title.includes('CloudCertify'));
  assert.equal(document.querySelector('link[rel="canonical"]'), null);
  checks.push(`${path}: utility noindex`);
}
for (const [path, type] of [['/robots.txt', 'text/plain'], ['/sitemap.xml', 'xml']]) {
  const response = await fetch(origin + path);
  assert.equal(response.status, 200, path);
  assert.ok(response.headers.get('content-type')?.includes(type), path);
  if (path === '/sitemap.xml') {
    const text = await response.text();
    assert.ok(text.includes('/quiz/1</loc>'));
    assert.ok(!/session|progress|callback/.test(text));
  }
  checks.push(`${path}: content type and cache/discovery policy`);
}
console.log(JSON.stringify({ passed: checks.length, checks }, null, 2));
