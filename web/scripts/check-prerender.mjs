import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const output = process.argv[2] ?? 'dist';
const read = file => readFileSync(path.join(output, file), 'utf8');
const home = new JSDOM(read('index.html')).window.document;
const spa = new JSDOM(read('spa.html')).window.document;
const heading = home.querySelector('main h1');
assert.ok(heading?.textContent.trim(), 'Built home must contain a readable h1');
assert.ok(home.querySelector('main')?.textContent.length > 1000, 'Built home must contain real page content');
assert.ok(home.querySelector('a[href="/dashboard"]'), 'Built home must link to the live catalog');
assert.ok(home.querySelector('a[href="#certifications"]'), 'Built home must retain public section links');
for (let element = heading; element; element = element.parentElement) {
  assert.notEqual(element.style.opacity, '0', 'Prerendered heading must be visible without JavaScript');
}
const canonical = home.querySelector('link[rel="canonical"]')?.href;
assert.equal(canonical, 'https://cloudcertify.snowye.dev/');
assert.equal(home.documentElement.lang, 'en-US');
const scripts = home.querySelectorAll('script[type="application/ld+json"]');
assert.equal(scripts.length, 1);
const schema = JSON.parse(scripts[0].textContent);
assert.equal(schema['@type'], 'WebSite');
assert.equal(schema.name, 'CloudCertify');
assert.equal(schema.url, canonical);
assert.ok(home.querySelector('#root[data-home-year]'));
assert.equal(spa.querySelector('#root')?.children.length, 0, 'SPA routes must not inherit homepage content');
assert.equal(spa.querySelector('h1, link[rel="canonical"], script[type="application/ld+json"]'), null);
assert.equal(home.querySelector('script[type="module"]')?.src, spa.querySelector('script[type="module"]')?.src);
const deployment = JSON.parse(readFileSync('vercel.json', 'utf8'));
assert.equal(deployment.rewrites.find(rule => rule.source === '/')?.destination, '/index.html');
assert.equal(deployment.rewrites.find(rule => rule.source === '/(.*)')?.destination, '/spa.html');
console.log('Prerender checks passed: readable public home, metadata, links, and separate SPA fallback.');
