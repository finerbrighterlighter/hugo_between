const puppeteer = require('puppeteer');
const BASE = process.argv[2] || 'http://127.0.0.1:1313';
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Assertion helper. Every check() that fails adds one line to `failures`;
// the process exits 1 at the end if there is anything in it.
const failures = [];
const check = (label, cond, detail = '') => { if (!cond) failures.push(`${label}${detail ? ': ' + detail : ''}`); };

// Live third-party panels (Last.fm, Simkl, Unsplash, AniList, OpenAlex, doi.org)
// and the analytics beacon are allowed to fail: no API keys in CI, no network in
// some environments. Their console noise and request failures are not site bugs.
const EXTERNAL = /(api\.simkl\.com|ws\.audioscrobbler\.com|api\.unsplash\.com|images\.unsplash\.com|graphql\.anilist\.co|api\.openalex\.org|openalex\.org|doi\.org|gc\.zgo\.at|goatcounter|stats\.htunteza\.com)/i;
const ORIGIN = new URL(BASE).origin;
const sameOrigin = u => { try { return new URL(u).origin === ORIGIN; } catch (e) { return false; } };
// "3 of 16 works" → { shown: 3, total: 16 }
const parseCount = t => { const m = /(\d+)\s+of\s+(\d+)/.exec(t || ''); return m ? { shown: +m[1], total: +m[2] } : null; };

(async () => {
  const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || undefined, headless: 'new', args: ['--no-sandbox','--disable-gpu','--hide-scrollbars'] });
  try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error' && !EXTERNAL.test(m.text())) errors.push(`${page.url()} :: ${m.text()}`); });
  page.on('pageerror', e => errors.push(`${page.url()} :: pageerror ${e.message}`));
  page.on('requestfailed', r => { if (sameOrigin(r.url()) && !EXTERNAL.test(r.url())) errors.push(`${page.url()} :: reqfail ${r.url()} ${r.failure()?.errorText}`); });
  const out = [];
  // home live data
  await page.goto(BASE + '/', { waitUntil: 'networkidle2' }); await sleep(2500);
  const nowPlaying = await page.$eval('#now-playing', e => e.textContent.trim());
  out.push('now-playing: ' + nowPlaying.slice(0,90));
  // Content depends on the Last.fm key, so only assert the module rendered something.
  check('now-playing empty', nowPlaying.length > 0);
  for (const id of ['strip-manga','strip-screen','strip-photos']) {
    const n = await page.$$eval('#'+id+' li', l => l.length);
    out.push(`${id}: ${n} items`);
    // API keys may be absent: assert the container exists, never that it has items.
    check(`#${id} container missing`, await page.$('#'+id) !== null);
  }
  const metricsHidden = await page.$eval('#metrics', e => e.hidden);
  const metricsText = await page.$eval('#metrics', e => e.textContent.replace(/\s+/g,' ').trim());
  out.push('metrics hidden? ' + metricsHidden + ' :: ' + metricsText);
  check('#metrics missing', await page.$('#metrics') !== null);
  check('#metrics shown but empty', metricsHidden || metricsText.length > 0);
  const clock = await page.$eval('[data-clock]', e => e.textContent);
  out.push('clock: ' + clock);
  check('clock not rendered', /\d{1,2}:\d{2}/.test(clock), clock);
  // duck
  await page.$eval('#portrait', e => e.click()); await sleep(300);
  const duckClass = await page.$eval('#portrait', e => e.className);
  out.push('duck class after click: ' + duckClass);
  check('portrait did not gain is-duck on click', /\bis-duck\b/.test(duckClass), duckClass);
  // theme toggle
  // Effective theme before the click: data-theme if the pre-paint script set it, else the media query.
  const themeBefore = await page.evaluate(() => document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
  await page.$eval('[data-theme-toggle]', e => e.click()); await sleep(200);
  const themeAfter = await page.$eval('html', e => e.dataset.theme || '');
  const themeLabel = await page.$eval('[data-theme-toggle]', e => e.getAttribute('aria-label'));
  out.push('theme after toggle: ' + themeAfter + ' label=' + themeLabel);
  check('theme did not change on toggle', themeAfter !== themeBefore, `${themeBefore} → ${themeAfter}`);
  check('theme value not light/dark', ['light','dark'].includes(themeAfter), themeAfter);
  check('theme toggle aria-label missing', !!themeLabel && themeLabel.length > 0);
  await page.$eval('[data-theme-toggle]', e => e.click()); await sleep(200);
  check('theme did not return on second toggle', await page.$eval('html', e => (e.dataset.theme || '')) === themeBefore);
  // cache flush
  await page.$eval('[data-cache-flush]', e => e.click()); await sleep(300);
  const cacheStatus = await page.$eval('[data-cache-status]', e => e.textContent);
  out.push('cache status: ' + cacheStatus);
  check('cache flush did not report cleared', /clear/i.test(cacheStatus), cacheStatus);
  // works filter
  await page.goto(BASE + '/works/?search=hypertension', { waitUntil: 'networkidle2' }); await sleep(500);
  const prefill = await page.$eval('#works-search', e => e.value);
  const prefillCount = await page.$eval('#works-count', e => e.textContent);
  out.push('works search prefill: ' + prefill + ' | count: ' + prefillCount);
  check('?search= not prefilled into #works-search', prefill === 'hypertension', prefill);
  const pc = parseCount(prefillCount);
  check('#works-count unparseable', pc !== null, prefillCount);
  if (pc) {
    check('search=hypertension matched nothing', pc.shown > 0, prefillCount);
    check('search=hypertension did not narrow the list', pc.shown < pc.total, prefillCount);
  }
  await page.$eval('#works-search', e => { e.value=''; e.dispatchEvent(new Event('input',{bubbles:true})); }); await sleep(300);
  const clearedCount = await page.$eval('#works-count', e => e.textContent);
  out.push('works cleared count: ' + clearedCount);
  const cc = parseCount(clearedCount);
  check('cleared search did not restore all works', cc !== null && cc.shown === cc.total, clearedCount);
  await page.$eval('.filter-tag[data-tag="dementia"]', e => e.click()); await sleep(300);
  const tagCount = await page.$eval('#works-count', e => e.textContent);
  const tagUrl = page.url();
  const clearHidden = await page.$eval('#works-clear', e => e.hidden);
  out.push('tag dementia: ' + tagCount + ' url=' + tagUrl + ' clearHidden=' + clearHidden);
  const tc = parseCount(tagCount);
  check('tag dementia matched nothing', tc !== null && tc.shown > 0, tagCount);
  check('tag dementia did not narrow the list', tc !== null && tc.shown < tc.total, tagCount);
  check('tag not synchronised into the URL', /[?&]tags=dementia\b/.test(tagUrl), tagUrl);
  check('#works-clear still hidden while a filter is active', clearHidden === false);
  await page.$eval('[data-more]', e => e.click()); await sleep(100);
  const extraTags = await page.$$eval('.filter-group[data-group="conditions"] .filter-tag.is-extra:not([hidden])', l => l.length);
  out.push('more expanded: visible extra tags=' + extraTags);
  check('More… revealed no extra condition tags', extraTags > 0, String(extraTags));
  await page.$eval('#works-clear', e => e.click()); await sleep(200);
  const afterClear = await page.$eval('#works-count', e => e.textContent);
  out.push('after clear: ' + afterClear);
  const ac = parseCount(afterClear);
  check('clear did not restore all works', ac !== null && ac.shown === ac.total, afterClear);
  check('clear did not drop the query string', !/[?&](tags|search)=/.test(page.url()), page.url());
  // work single: cite
  await page.goto(BASE + '/works/journal/2023_development_of_risk_prediction_models_for_severe_periodontitis/', { waitUntil: 'networkidle2' }); await sleep(1500);
  const citation = await page.$eval('[data-citation-count]', e => (e.hidden?'hidden ':'') + e.textContent.trim());
  out.push('citation: ' + citation);
  // Count comes from api.openalex.org; only the element itself is guaranteed.
  check('[data-citation-count] missing', await page.$('[data-citation-count]') !== null);
  await page.$eval('details.cite summary', e => e.click()); await sleep(3500);
  const citeStatus = await page.$eval('.cite-status', e => e.textContent);
  const citeLen = await page.$eval('.cite-output', e => e.textContent.length);
  const copyDisabled = await page.$eval('[data-action=copy]', e => e.disabled);
  out.push('cite status: "' + citeStatus + '" output len=' + citeLen + ' copy disabled=' + copyDisabled);
  check('cite fetch never settled', !/Fetching/i.test(citeStatus), citeStatus);
  // BibTeX comes from doi.org: on success the panel must be fully wired up,
  // on an external failure the script stays silent.
  if (citeStatus.trim() === '') {
    check('cite succeeded but output is empty', citeLen > 0, String(citeLen));
    check('cite succeeded but copy stayed disabled', copyDisabled === false);
  }
  const beforeApa = await page.$eval('.cite-output', e => e.textContent);
  await page.$eval('[data-format=apa]', e => e.click()); await sleep(200);
  const apa = await page.$eval('.cite-output', e => e.textContent);
  out.push('apa: ' + apa.slice(0,120).replace(/\n/g,' '));
  check('apa button is not aria-pressed', await page.$eval('[data-format=apa]', e => e.getAttribute('aria-pressed')) === 'true');
  if (citeStatus.trim() === '') check('apa format did not change the output', apa !== beforeApa);
  // protected doc
  await page.goto(BASE + '/general/msc-transcript/', { waitUntil: 'networkidle2' }); await sleep(500);
  await page.type('#pin', '0000'); await page.$eval('.gate-form button[type=submit]', e => e.click()); await sleep(800);
  const gate = await page.$eval('.gate-status', e => e.textContent);
  out.push('gate wrong pin: ' + gate);
  check('wrong PIN was not rejected', /reject|incorrect|try again/i.test(gate), gate);
  check('wrong PIN revealed the document', await page.$eval('.gate-form', e => !e.hidden));
  // post with math
  await page.goto(BASE + '/posts/msc_journal_club/', { waitUntil: 'networkidle2' }); await sleep(1500);
  const katex = await page.$$eval('.katex', l => l.length);
  const postToc = await page.$$eval('#toc li', l => l.length);
  out.push('katex spans: ' + katex + ' toc items: ' + postToc);
  check('KaTeX rendered no math', katex > 0, String(katex));
  check('post TOC is empty', postToc > 0, String(postToc));
  // mm
  await page.goto(BASE + '/mm/', { waitUntil: 'networkidle2' }); await sleep(800);
  const mmLang = await page.$eval('html', e => e.lang);
  const mmSwitch = await page.$eval('.masthead .lang-switch', e => e.getAttribute('href'));
  out.push('mm lang=' + mmLang + ' switch=' + mmSwitch);
  check('/mm/ is not lang=my', mmLang === 'my', mmLang);
  check('/mm/ lang switch does not point at /', mmSwitch === '/', mmSwitch);
  for (const path of ['/blood/', '/posts/']) {
    const res = await page.goto(BASE + path, { waitUntil: 'networkidle2' }); await sleep(500);
    // 304 is fine: the browser cache is warm across pages in one run.
    check(`${path} did not load`, res && res.status() < 400, res ? String(res.status()) : 'no response');
  }
  const aboutRes = await page.goto(BASE + '/about/', { waitUntil: 'networkidle2' }); await sleep(800);
  check('/about/ did not load', aboutRes && aboutRes.status() < 400, aboutRes ? String(aboutRes.status()) : 'no response');
  const aboutToc = await page.$$eval('#toc li', l => l.length);
  out.push('about toc items: ' + aboutToc);
  check('about TOC is empty', aboutToc > 0, String(aboutToc));
  console.log(out.join('\n'));
  console.log('\nERRORS (' + errors.length + '):\n' + errors.slice(0,25).join('\n'));
  check('same-origin console/page/request errors', errors.length === 0, errors.slice(0,10).join(' | '));
  } finally {
    await browser.close();
  }
  if (failures.length) { console.log(`\nFAILURES (${failures.length}):\n  ` + failures.join('\n  ')); process.exitCode = 1; }
  else console.log('\nPASS');
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
