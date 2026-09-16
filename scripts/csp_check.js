#!/usr/bin/env node
/**
 * csp_check.js — serve a built site with the production Content-Security-Policy
 * from netlify.toml and report CSP violations, page errors and failed requests
 * for the key pages. `hugo server` sends no headers, so this is the only local
 * way to see what the enforced policy will block.
 *
 * Usage:
 *   hugo --gc --minify -d /tmp/pub
 *   node scripts/csp_check.js /tmp/pub            # uses pa11y's puppeteer + system chromium
 *
 * Exit code 1 when any page logs a CSP violation.
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const { execSync } = require('child_process');

const PUB = path.resolve(process.argv[2] || 'public');
const REPO = path.resolve(__dirname, '..');
const PORT = 1398;

function resolvePuppeteer() {
  try { return require('puppeteer'); } catch (_) {}
  const globalRoot = execSync('npm root -g').toString().trim();
  for (const p of [path.join(globalRoot, 'puppeteer'), path.join(globalRoot, 'pa11y/node_modules/puppeteer')]) {
    if (fs.existsSync(p)) return require(p);
  }
  throw new Error('puppeteer not found: npm i -g puppeteer (or pa11y)');
}

const toml = fs.readFileSync(path.join(REPO, 'netlify.toml'), 'utf8');
const CSP = (toml.match(/^\s*Content-Security-Policy\s*=\s*"([^"]+)"/m) || [])[1];
if (!CSP) { console.error('No Content-Security-Policy in netlify.toml'); process.exit(2); }

const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
  '.mjs': 'text/javascript', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.pdf': 'application/pdf',
  '.mp3': 'audio/mpeg', '.xml': 'application/xml', '.txt': 'text/plain', '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json' };

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p.endsWith('/')) p += 'index.html';
  let file = path.join(PUB, p);
  if (!fs.existsSync(file) && fs.existsSync(file + '/index.html')) file += '/index.html';
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end('not found'); }
  res.setHeader('Content-Type', MIME[path.extname(file)] || 'application/octet-stream');
  res.setHeader('Content-Security-Policy', CSP);
  res.end(fs.readFileSync(file));
});

// Find one page of each kind by grepping the build output.
function find(dir, re) {
  const out = [];
  (function walk(d) {
    if (!fs.existsSync(d)) return;
    for (const f of fs.readdirSync(d)) {
      const fp = path.join(d, f);
      if (fs.statSync(fp).isDirectory()) walk(fp);
      else if (f === 'index.html' && re.test(fs.readFileSync(fp, 'utf8'))) out.push('/' + path.relative(PUB, d) + '/');
    }
  })(dir);
  return out;
}

const noop = async () => ({});
const PAGES = [
  ['/', async (page) => {
    await page.click('#theme-toggle'); await page.click('#cvd-shortcut'); await page.click('.avatar-wrapper');
    return { inlineExecScripts: await page.$$eval('script:not([src]):not([type])', s => s.length) };
  }],
  ['/mm/', noop],
  ['/works/', noop],
  [find(path.join(PUB, 'works/journal'), /data-doi=/)[0], async (page) => {
    const btn = await page.$('#bibtex-btn');
    if (!btn) return { cite: 'no #bibtex-btn' };
    await btn.click(); await new Promise(r => setTimeout(r, 7000));
    return { cite: await page.evaluate(() => /@article|@misc|\[ERR\]/.exec(document.body.innerText)?.[0] || 'no result') };
  }],
  [find(path.join(PUB, 'posts'), /katex\.min\.css/)[0], async (page) => ({ katex: await page.$$eval('.katex', k => k.length) })],
  [find(path.join(PUB, 'posts'), /mermaid-init\.js/)[0], async (page) => ({ mermaidSvg: await page.$$eval('.mermaid svg', s => s.length) })],
  ['/blood/', noop],
  [find(path.join(PUB, 'general'), /data-protected-document/)[0], noop],
  ['/about/', noop],
].filter(([p]) => p);

(async () => {
  const puppeteer = resolvePuppeteer();
  await new Promise(r => server.listen(PORT, r));
  const browser = await puppeteer.launch({
    executablePath: process.env.CHROME_PATH || undefined,
    headless: 'new', args: ['--no-sandbox'],
  });
  let violations = 0;
  for (const [p, check] of PAGES) {
    const page = await browser.newPage();
    const csp = [], errors = [], failed = [];
    page.on('console', m => {
      const t = m.text();
      if (/Content Security Policy|Refused to/.test(t)) csp.push(t.slice(0, 200));
      else if (m.type() === 'error' && !/40[013]|LastFM|Unsplash|GitHub/.test(t)) errors.push(t.slice(0, 160));
    });
    page.on('pageerror', e => errors.push('PAGEERROR ' + String(e).slice(0, 160)));
    page.on('requestfailed', r => failed.push(r.url().slice(0, 100) + ' ' + (r.failure()?.errorText || '')));
    let extra = {};
    try {
      await page.goto('http://localhost:' + PORT + p, { waitUntil: 'networkidle2', timeout: 45000 });
      await new Promise(r => setTimeout(r, 1500));
      extra = await check(page);
      await new Promise(r => setTimeout(r, 1000));
    } catch (e) { extra = { error: String(e).slice(0, 200) }; }
    violations += csp.length;
    console.log(JSON.stringify({ page: p, csp, errors, failed, ...extra }));
    await page.close();
  }
  await browser.close(); server.close();
  console.log(violations ? `\n${violations} CSP violation(s)` : '\nCSP clean');
  process.exit(violations ? 1 : 0);
})();
