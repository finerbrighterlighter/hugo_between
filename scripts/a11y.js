#!/usr/bin/env node
/**
 * a11y.js — axe-core accessibility gate for the built site.
 *
 * Why not pa11y: pa11y reports axe's "incomplete" results as errors. axe marks a
 * colour-contrast check incomplete when it cannot read the background behind an
 * element, which on this site happens for the SVG year labels in the output
 * timeline and for the OpenAlex metrics line (a pseudo element sits behind it).
 * Those eleven results are not failures; the pairings were measured by hand and
 * pass AA in both themes. Reporting them as errors trains everyone to ignore the
 * gate, so this script separates real violations from unresolved checks.
 *
 * Violations fail the run. Incomplete results are printed as notes and never fail.
 *
 * Usage:
 *   node scripts/a11y.js [baseUrl] [--schemes light,dark] [--json]
 *   BASE defaults to http://127.0.0.1:1313
 */
const puppeteer = require('puppeteer');
const AXE_PATH = require.resolve('axe-core/axe.min.js');

const args = process.argv.slice(2);
const BASE = (args.find((a) => !a.startsWith('--')) || 'http://127.0.0.1:1313').replace(/\/$/, '');
const JSON_OUT = args.includes('--json');
const schemesArg = args.find((a) => a.startsWith('--schemes='));
const SCHEMES = schemesArg ? schemesArg.split('=')[1].split(',') : ['light', 'dark'];

/* One representative page per template. Add a path here when a new layout appears. */
const PATHS = [
  '/',
  '/about/',
  '/works/',
  '/posts/',
  '/blood/',
  '/general/',
  '/general/msc-transcript/',
  '/posts/blood_2022/',
  '/posts/where_how_what/',
  '/works/journal/2023_external_validation_penn_hernia_model/',
  '/404.html',
  '/mm/',
  '/mm/about/',
  '/mm/blood/',
];

const STANDARD = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

/**
 * Documented exceptions. Each entry must say what it is and why it is allowed,
 * so that a reviewer can re-judge it instead of finding a silent suppression.
 * A violation is downgraded to a note only when page, rule id and target all match.
 */
const EXCEPTIONS = [
  {
    page: '/404.html',
    id: 'color-contrast',
    target: '.word',
    why:
      'Decorative "404" watermark, aria-hidden, drawn in the hairline rule colour. ' +
      'The same information is carried by the h1 immediately below it at full ink ' +
      'contrast, so the watermark is pure decoration under WCAG 1.4.3. Revisit if ' +
      'the h1 is ever removed or the watermark becomes the only "404" on the page.',
  },
];

function exceptionFor(page, id, target) {
  return EXCEPTIONS.find((e) => e.page === page && e.id === id && target.includes(e.target));
}

async function run() {
  const browser = await puppeteer.launch({
    executablePath: process.env.CHROME_PATH || undefined,
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu', '--hide-scrollbars'],
  });

  const violations = [];
  const incomplete = [];
  const excepted = [];
  let checked = 0;

  for (const scheme of SCHEMES) {
    for (const path of PATHS) {
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 1024 });
      await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
      let res;
      try {
        const response = await page.goto(BASE + path, { waitUntil: 'networkidle0', timeout: 45000 });
        if (response && response.status() >= 400 && !path.endsWith('404.html')) {
          violations.push({ page: path, scheme, id: 'http', impact: 'critical', help: `HTTP ${response.status()}`, nodes: [] });
          await page.close();
          continue;
        }
        await page.addScriptTag({ path: AXE_PATH });
        res = await page.evaluate(
          async (tags) => {
            const r = await window.axe.run(document, { runOnly: { type: 'tag', values: tags } });
            const pick = (arr) =>
              arr.map((v) => ({
                id: v.id,
                impact: v.impact,
                help: v.help,
                nodes: v.nodes.slice(0, 5).map((n) => ({
                  target: n.target.join(' '),
                  message: [...n.any, ...n.all, ...n.none].map((c) => c.message).join('; '),
                })),
              }));
            return { violations: pick(r.violations), incomplete: pick(r.incomplete) };
          },
          STANDARD
        );
      } catch (err) {
        violations.push({ page: path, scheme, id: 'error', impact: 'critical', help: String(err.message || err), nodes: [] });
        await page.close();
        continue;
      }
      checked += 1;
      for (const v of res.violations) {
        const allowed = v.nodes.length > 0 && v.nodes.every((n) => exceptionFor(path, v.id, n.target));
        if (allowed) {
          excepted.push({ page: path, scheme, ...v, why: exceptionFor(path, v.id, v.nodes[0].target).why });
        } else {
          violations.push({ page: path, scheme, ...v });
        }
      }
      for (const v of res.incomplete) incomplete.push({ page: path, scheme, ...v });
      await page.close();
    }
  }

  await browser.close();

  if (JSON_OUT) {
    console.log(JSON.stringify({ base: BASE, checked, violations, incomplete, excepted }, null, 2));
  } else {
    const line = (v) => {
      console.log(`  ${v.page} [${v.scheme}] ${v.id} (${v.impact || 'n/a'}): ${v.help}`);
      for (const n of v.nodes) console.log(`      ${n.target}\n        ${n.message}`);
    };
    console.log(`a11y: ${checked} page loads checked against ${STANDARD.join(', ')} at ${BASE}`);
    console.log(`\nVIOLATIONS (${violations.length}):`);
    violations.forEach(line);
    console.log(`\nINCOMPLETE — needs a human eye, does not fail the run (${incomplete.length}):`);
    const grouped = {};
    for (const v of incomplete) {
      const key = `${v.id}|${v.page}`;
      grouped[key] = grouped[key] || { ...v, count: 0 };
      grouped[key].count += v.nodes.length;
    }
    for (const v of Object.values(grouped)) {
      console.log(`  ${v.page} [${v.scheme}] ${v.id}: ${v.nodes.length} element(s) — ${v.nodes[0] ? v.nodes[0].message.slice(0, 100) : v.help}`);
    }
    const seenWhy = new Set();
    console.log(`\nDOCUMENTED EXCEPTIONS (${excepted.length}):`);
    for (const v of excepted) {
      const key = `${v.page}|${v.id}`;
      if (seenWhy.has(key)) continue;
      seenWhy.add(key);
      console.log(`  ${v.page} ${v.id} — ${v.why}`);
    }
  }

  process.exit(violations.length ? 1 : 0);
}

run().catch((err) => {
  console.error(err);
  process.exit(2);
});
