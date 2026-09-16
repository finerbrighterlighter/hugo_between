#!/usr/bin/env node
// Internal link checker for the built site. No dependencies.
//
//   node scripts/links.js [dir]        (default: public)
//
// Walks every .html under dir, pulls href/src/srcset/poster/data-src values
// (plus <link href>), resolves internal URLs against the page path and checks
// that the target exists as a file, dir/index.html or path.html. Paths listed
// as `from = "..."` in netlify.toml [[redirects]] count as valid targets.
// Prints `page -> href` per broken link, a summary, exits 1 if any broken.

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(process.argv[2] || 'public');
const REPO = path.resolve(__dirname, '..');

if (!fs.existsSync(ROOT) || !fs.statSync(ROOT).isDirectory()) {
  console.error(`links: ${ROOT} is not a directory (run hugo first?)`);
  process.exit(2);
}

// --- netlify redirects -----------------------------------------------------
const redirectFroms = new Set();
try {
  const toml = fs.readFileSync(path.join(REPO, 'netlify.toml'), 'utf8');
  const re = /^\s*from\s*=\s*"([^"]+)"/gm;
  let m;
  while ((m = re.exec(toml))) redirectFroms.add(m[1].replace(/\/+$/, '') || '/');
} catch (_) { /* no netlify.toml: nothing to honour */ }

// --- walk ------------------------------------------------------------------
const htmlFiles = [];
(function walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p);
    else if (ent.isFile() && ent.name.toLowerCase().endsWith('.html')) htmlFiles.push(p);
  }
})(ROOT);

// --- attribute extraction --------------------------------------------------
// Matches href/src/poster/data-src="..." or '...' or unquoted; srcset handled separately.
const ATTR_RE = /\b(href|src|poster|data-src|srcset)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/gi;
const SKIP_RE = /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i; // scheme:, protocol-relative, fragment-only

function decodeEntities(s) {
  return s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}

function extractUrls(html) {
  const out = [];
  let m;
  ATTR_RE.lastIndex = 0;
  while ((m = ATTR_RE.exec(html))) {
    const attr = m[1].toLowerCase();
    const raw = decodeEntities(m[2] ?? m[3] ?? m[4] ?? '').trim();
    if (!raw) continue;
    if (attr === 'srcset') {
      for (const part of raw.split(',')) {
        const url = part.trim().split(/\s+/)[0];
        if (url) out.push(url);
      }
    } else {
      out.push(raw);
    }
  }
  return out;
}

// --- resolution ------------------------------------------------------------
const existsCache = new Map();
function fileExists(p) {
  let v = existsCache.get(p);
  if (v === undefined) {
    try { v = fs.statSync(p).isFile(); } catch (_) { v = false; }
    existsCache.set(p, v);
  }
  return v;
}

function targetExists(urlPath) {
  // urlPath: absolute site path, already stripped of query/fragment, decoded.
  const clean = urlPath.replace(/\/+$/, '') || '/';
  if (redirectFroms.has(clean)) return true;
  const fsPath = path.join(ROOT, ...clean.split('/').filter(Boolean));
  if (!fsPath.startsWith(ROOT)) return false; // escaped root via ../
  if (clean === '/') return fileExists(path.join(ROOT, 'index.html'));
  return fileExists(fsPath)
    || fileExists(path.join(fsPath, 'index.html'))
    || fileExists(fsPath + '.html');
}

function pageUrlPath(file) {
  // /public/a/b/index.html -> /a/b/ ; /public/a/b.html -> /a/b.html
  const rel = '/' + path.relative(ROOT, file).split(path.sep).join('/');
  return rel.endsWith('/index.html') ? rel.slice(0, -'index.html'.length) : rel;
}

const broken = [];
let checked = 0;

for (const file of htmlFiles) {
  const html = fs.readFileSync(file, 'utf8');
  const page = pageUrlPath(file);
  const seen = new Set();
  for (const href of extractUrls(html)) {
    if (SKIP_RE.test(href)) continue;
    if (seen.has(href)) continue;
    seen.add(href);
    let target;
    try {
      const u = new URL(href, 'http://links.local' + page);
      target = decodeURIComponent(u.pathname);
    } catch (_) {
      broken.push(`${page} -> ${href}`);
      continue;
    }
    checked++;
    if (!targetExists(target)) broken.push(`${page} -> ${href}`);
  }
}

for (const line of broken) console.log(line);
console.log(`\nlinks: ${htmlFiles.length} pages, ${checked} internal links checked, ${broken.length} broken`);
process.exit(broken.length ? 1 : 0);
