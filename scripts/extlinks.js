#!/usr/bin/env node
// External link and API health check for the built site. No dependencies
// (Node 22+ built-in fetch only).
//
//   node scripts/extlinks.js [dir] [--json] [--json-out=FILE] [--verbose]
//
// Walks every .html under dir (default: public), collects absolute http(s)
// URLs from href/src attributes, and adds each API origin listed in the
// netlify.toml CSP `connect-src` as a health target. Every unique URL gets a
// HEAD (retried as GET on 405/403/501) with a 15s timeout, at most 6 requests
// in flight globally, at most 1 per host with a 1s gap between same-host hits,
// and one 429 back-off of up to 30s honouring Retry-After.
//
// This is a REPORT, not a gate: the exit code is always 0 unless the script
// itself crashed (then 2). Link rot and upstream drift are things to read and
// decide about, not things that should stop a deploy.

const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..');

// --- tunables --------------------------------------------------------------
const TIMEOUT_MS = 15_000;      // per request
const GLOBAL_CONCURRENCY = 6;   // hosts checked in parallel
const PER_HOST_GAP_MS = 1_000;  // minimum spacing between hits to one host
const MAX_PER_HOST_GAP_MS = 8_000; // ceiling once a host has told us to slow down
const MAX_RETRY_AFTER_MS = 30_000; // how long we will wait out a 429, once
const USER_AGENT = 'htunteza.com link health check (+https://htunteza.com/)';
const RETRY_AS_GET = new Set([403, 405, 501]); // servers that dislike HEAD

const ALLOW_FILE = path.join(__dirname, 'extlinks-allow.txt');

// --- args ------------------------------------------------------------------
const argv = process.argv.slice(2);
const flags = argv.filter((a) => a.startsWith('--'));
const positional = argv.filter((a) => !a.startsWith('--'));
const AS_JSON = flags.includes('--json');
const VERBOSE = flags.includes('--verbose');
const jsonOutFlag = flags.find((f) => f.startsWith('--json-out='));
const JSON_OUT = jsonOutFlag ? jsonOutFlag.slice('--json-out='.length) : null;
const ROOT = path.resolve(positional[0] || 'public');

// --- html walking ----------------------------------------------------------
function htmlFilesUnder(dir) {
  const out = [];
  (function walk(d) {
    for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, ent.name);
      if (ent.isDirectory()) walk(p);
      else if (ent.isFile() && ent.name.toLowerCase().endsWith('.html')) out.push(p);
    }
  })(dir);
  return out;
}

// href/src only: srcset and poster point at site assets, and the internal
// checker (scripts/links.js) already owns those.
const ATTR_RE = /\b(?:href|src)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/gi;
const ABSOLUTE_RE = /^https?:\/\//i;

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function pageUrlPath(file) {
  const rel = '/' + path.relative(ROOT, file).split(path.sep).join('/');
  return rel.endsWith('/index.html') ? rel.slice(0, -'index.html'.length) : rel;
}

// --- netlify CSP connect-src ----------------------------------------------
// The APIs the browser modules talk to live in connect-src. Their origins are
// health targets in their own right: a dead API is invisible to a link check
// of the HTML, because nothing in the markup points at it.
function apiOriginsFromCsp() {
  const origins = new Set();
  let toml;
  try {
    toml = fs.readFileSync(path.join(REPO, 'netlify.toml'), 'utf8');
  } catch (_) {
    return origins; // no netlify.toml: nothing to derive
  }
  const csp = toml.match(/Content-Security-Policy\s*=\s*"([^"]*)"/);
  if (!csp) return origins;
  const directive = csp[1].split(';').map((d) => d.trim()).find((d) => d.startsWith('connect-src'));
  if (!directive) return origins;
  for (const token of directive.split(/\s+/).slice(1)) {
    if (!ABSOLUTE_RE.test(token)) continue; // 'self', quoted keywords, data: etc.
    try {
      origins.add(new URL(token).origin + '/');
    } catch (_) { /* unparseable token: skip */ }
  }
  return origins;
}

// --- allowlist -------------------------------------------------------------
function loadAllowlist() {
  let text;
  try {
    text = fs.readFileSync(ALLOW_FILE, 'utf8');
  } catch (_) {
    return [];
  }
  return text
    .split('\n')
    .map((l) => l.replace(/#.*$/, '').trim())
    .filter(Boolean);
}

// --- scheduling ------------------------------------------------------------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function retryAfterMs(headerValue) {
  if (!headerValue) return null;
  const secs = Number(headerValue);
  if (Number.isFinite(secs)) return Math.max(0, secs * 1000);
  const when = Date.parse(headerValue); // HTTP-date form
  if (!Number.isNaN(when)) return Math.max(0, when - Date.now());
  return null;
}

function classifyError(err) {
  // AbortSignal.timeout() rejects with a TimeoutError; undici wraps transport
  // failures in a TypeError whose `cause` carries the libuv/DNS code.
  if (err && (err.name === 'TimeoutError' || err.name === 'AbortError')) {
    return { status: 'timeout', detail: `no response within ${TIMEOUT_MS / 1000}s` };
  }
  const code = (err && err.cause && err.cause.code) || (err && err.code) || '';
  if (code === 'ENOTFOUND' || code === 'EAI_AGAIN') {
    return { status: 'dns', detail: `${code}: host does not resolve` };
  }
  const detail = code ? `${code}: ${err.message}` : (err && err.message) || String(err);
  return { status: 'network', detail };
}

async function request(url, method) {
  return fetch(url, {
    method,
    redirect: 'follow',
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: {
      'User-Agent': USER_AGENT,
      Accept: '*/*',
      // Ask for identity so a HEAD is not answered with a content-encoding the
      // server then has to negotiate; harmless if ignored.
      'Accept-Encoding': 'gzip, deflate, identity',
    },
  });
}

function sameTarget(a, b) {
  // http -> https on the same host/path, or a bare trailing slash being added,
  // is technically a redirect but is not drift anyone needs to fix in content.
  try {
    const x = new URL(a);
    const y = new URL(b);
    const norm = (u) => u.host + u.pathname.replace(/\/+$/, '') + u.search;
    return norm(x) === norm(y);
  } catch (_) {
    return a === b;
  }
}

// Whether a HEAD response is worth a second look with GET. All three cases are
// the same underlying problem - the server treats HEAD as a second-class
// request - and all three were observed on real links from this site:
// RETRY_AS_GET outright refusals, last.fm answering HEAD with a nonsense 600
// while GET returns 200, and api.crossref.org answering a bare 429 to HEAD
// while serving GET fine. A 429 that *does* carry Retry-After is a real rate
// limit and is waited out below instead.
function needsGetRetry(res) {
  if (RETRY_AS_GET.has(res.status)) return true;
  if (res.status >= 500) return true;
  if (res.status === 429 && !res.headers.get('retry-after')) return true;
  return false;
}

async function checkUrl(url, gap = PER_HOST_GAP_MS) {
  const started = Date.now();
  let waitedForRateLimit = false;
  let method = 'HEAD';

  for (;;) {
    let res;
    try {
      method = 'HEAD';
      res = await request(url, 'HEAD');
      if (needsGetRetry(res)) {
        await sleep(gap);
        method = 'GET';
        res = await request(url, 'GET');
      }
    } catch (err) {
      const { status, detail } = classifyError(err);
      return { url, status, detail, method, ms: Date.now() - started };
    }

    if (res.status === 429) {
      const advertised = retryAfterMs(res.headers.get('retry-after'));
      // doi.org answers `Retry-After: 0`, which is not a wait at all - honour
      // the header but never back off by less than this host's current gap.
      const wait = advertised === null ? null : Math.max(advertised, gap);
      if (!waitedForRateLimit && wait !== null && wait <= MAX_RETRY_AFTER_MS) {
        waitedForRateLimit = true;
        if (VERBOSE) console.error(`  429 ${url} - waiting ${Math.round(wait / 1000)}s`);
        await sleep(wait);
        continue; // one more attempt, then we give up on this URL
      }
      return {
        url,
        status: 'rate-limited',
        code: 429,
        method,
        detail: wait === null
          ? 'HTTP 429 with no usable Retry-After (GET too)'
          : `HTTP 429, Retry-After ${Math.round(wait / 1000)}s${waitedForRateLimit ? ' (already waited once)' : ' (over the 30s cap)'}`,
        ms: Date.now() - started,
      };
    }

    const finalUrl = res.url || url;
    const redirected = finalUrl && !sameTarget(url, finalUrl);
    const base = { url, code: res.status, method, ms: Date.now() - started };
    if (redirected) base.finalUrl = finalUrl;

    if (res.status >= 500) return { ...base, status: 'server-error', detail: `HTTP ${res.status}` };
    if (res.status >= 400) return { ...base, status: 'client-error', detail: `HTTP ${res.status}` };
    if (redirected) return { ...base, status: 'redirect', detail: `-> ${finalUrl}` };
    return { ...base, status: 'ok', detail: `HTTP ${res.status}` };
  }
}

// One worker per host keeps same-host requests serial and spaced; running at
// most GLOBAL_CONCURRENCY workers keeps the total load on third parties sane.
async function runChecks(byHost, onResult) {
  const hosts = [...byHost.keys()];
  let next = 0;
  async function worker() {
    for (;;) {
      const i = next++;
      if (i >= hosts.length) return;
      const host = hosts[i];
      const urls = byHost.get(host);
      // Hosts we have a lot to ask (doi.org, last.fm, orcid.org) start at twice
      // the minimum gap. Reacting to a 429 only helps the rest of the queue;
      // the first refusal has already happened by then, and a weekly report can
      // afford the extra minute.
      let gap = urls.length > 5 ? PER_HOST_GAP_MS * 2 : PER_HOST_GAP_MS;
      for (let j = 0; j < urls.length; j++) {
        if (j > 0) await sleep(gap);
        const t0 = Date.now();
        const result = await checkUrl(urls[j], gap);
        // A host that throttled us (429) or fell over (5xx) gets progressively
        // more room for the rest of its queue. doi.org and last.fm both start
        // refusing when the whole queue arrives at a steady 1/second.
        if (result.code >= 500 || result.code === 429 || result.status === 'rate-limited') {
          gap = Math.min(gap * 2, MAX_PER_HOST_GAP_MS);
          if (VERBOSE) console.error(`  [${host}] slowing to ${gap}ms between requests`);
        }
        if (VERBOSE) {
          console.error(`  [${host}] ${result.status} ${urls[j]} (${Date.now() - t0}ms)`);
        }
        onResult(result);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(GLOBAL_CONCURRENCY, hosts.length) }, worker));
}

// --- reporting -------------------------------------------------------------
const STATUS_ORDER = [
  'ok', 'redirect', 'client-error', 'server-error', 'timeout', 'dns', 'network', 'rate-limited',
];
// `ok` is fine and `redirect` is drift worth knowing about but not a failure.
const PROBLEM_STATUSES = new Set(['client-error', 'server-error', 'timeout', 'dns', 'network', 'rate-limited']);

function printReport(report) {
  const { counts, results, pagesScanned, apiTargets, allowlist } = report;
  const lines = [];
  lines.push(`external links: ${pagesScanned} pages scanned, ${results.length} unique external URLs checked`);
  lines.push(`  (${apiTargets.length} of them API origins from the netlify.toml connect-src)`);
  lines.push('');
  lines.push('status breakdown');
  for (const s of STATUS_ORDER) {
    if (counts[s]) lines.push(`  ${String(counts[s]).padStart(4)}  ${s}`);
  }

  const group = (pred) => results.filter(pred).sort((a, b) => a.url.localeCompare(b.url));
  const problems = group((r) => PROBLEM_STATUSES.has(r.status) && !r.allowlisted);
  const allowed = group((r) => PROBLEM_STATUSES.has(r.status) && r.allowlisted);
  const redirects = group((r) => r.status === 'redirect');

  const block = (title, rows, render) => {
    if (!rows.length) return;
    lines.push('');
    lines.push(`${title} (${rows.length})`);
    for (const r of rows) {
      lines.push(`  ${render(r)}`);
      const where = r.apiTarget ? ['(API health target, from CSP connect-src)'] : r.pages;
      for (const p of where.slice(0, 6)) lines.push(`      linked from ${p}`);
      if (where.length > 6) lines.push(`      ... and ${where.length - 6} more pages`);
    }
  };

  block('problems', problems, (r) => `${r.status}: ${r.url}\n      ${r.detail}`);
  block('redirects (upstream moved; update the link in content to skip the hop)', redirects,
    (r) => `${r.url}\n      -> ${r.finalUrl}`);
  block('allowlisted, not counted as problems', allowed, (r) => `${r.status}: ${r.url} (${r.detail})`);

  if (!problems.length) {
    lines.push('');
    lines.push('no problems outside the allowlist.');
  }
  lines.push('');
  lines.push(`allowlist: ${allowlist.length} pattern(s) from scripts/extlinks-allow.txt`);
  lines.push('This check only reports. It never fails a build or blocks a deploy (exit code 0).');
  return lines.join('\n');
}

// --- main ------------------------------------------------------------------
async function main() {
  if (!fs.existsSync(ROOT) || !fs.statSync(ROOT).isDirectory()) {
    // A missing build dir is a usage problem, not link rot, so say so loudly
    // but still do not pretend it is a deploy-blocking failure.
    console.error(`extlinks: ${ROOT} is not a directory (run hugo first?)`);
    console.error('extlinks: nothing checked; this check never blocks (exit 0).');
    return 0;
  }

  const allowlist = loadAllowlist();
  const isAllowed = (url) => allowlist.some((p) => url.includes(p));

  // url -> pages that link it
  const urlPages = new Map();
  const files = htmlFilesUnder(ROOT);
  for (const file of files) {
    const html = fs.readFileSync(file, 'utf8');
    const page = pageUrlPath(file);
    ATTR_RE.lastIndex = 0;
    let m;
    const seenOnPage = new Set();
    while ((m = ATTR_RE.exec(html))) {
      const raw = decodeEntities(m[1] ?? m[2] ?? m[3] ?? '').trim();
      if (!raw || !ABSOLUTE_RE.test(raw)) continue;
      let url;
      try {
        const u = new URL(raw);
        u.hash = '';
        url = u.toString();
      } catch (_) {
        continue; // unparseable: not something we can check
      }
      if (seenOnPage.has(url)) continue;
      seenOnPage.add(url);
      if (!urlPages.has(url)) urlPages.set(url, []);
      urlPages.get(url).push(page);
    }
  }

  const apiTargets = [...apiOriginsFromCsp()];
  for (const origin of apiTargets) {
    if (!urlPages.has(origin)) urlPages.set(origin, []);
  }

  const urls = [...urlPages.keys()].sort();
  const byHost = new Map();
  for (const url of urls) {
    const host = new URL(url).hostname;
    if (!byHost.has(host)) byHost.set(host, []);
    byHost.get(host).push(url);
  }

  if (!AS_JSON) {
    console.log(`extlinks: ${urls.length} unique external URLs across ${byHost.size} hosts, `
      + `concurrency ${GLOBAL_CONCURRENCY}, ${PER_HOST_GAP_MS}ms min gap per host`);
  }

  const results = [];
  const startedAt = Date.now();
  await runChecks(byHost, (r) => {
    r.pages = urlPages.get(r.url) || [];
    r.apiTarget = apiTargets.includes(r.url);
    r.allowlisted = isAllowed(r.url);
    results.push(r);
  });

  const counts = {};
  for (const r of results) counts[r.status] = (counts[r.status] || 0) + 1;

  const report = {
    generatedAt: new Date().toISOString(),
    root: ROOT,
    pagesScanned: files.length,
    hosts: byHost.size,
    durationMs: Date.now() - startedAt,
    uniqueUrls: results.length,
    apiTargets,
    allowlist,
    counts,
    problems: results.filter((r) => PROBLEM_STATUSES.has(r.status) && !r.allowlisted).map((r) => r.url),
    results: results.sort((a, b) => a.url.localeCompare(b.url)),
  };

  const human = printReport(report);
  if (AS_JSON) console.log(JSON.stringify(report, null, 2));
  else console.log('\n' + human);

  if (JSON_OUT) {
    fs.writeFileSync(JSON_OUT, JSON.stringify(report, null, 2));
    if (!AS_JSON) console.log(`\nJSON report written to ${JSON_OUT}`);
  }
  return 0;
}

main().then(
  (code) => process.exit(code),
  (err) => {
    // Only a crash in this script is an error worth a non-zero code.
    console.error('extlinks: check crashed');
    console.error(err && err.stack ? err.stack : err);
    process.exit(2);
  },
);
