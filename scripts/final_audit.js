const puppeteer = require('puppeteer');
/* Screenshots are diagnostics, not artefacts of the repository. They go to
   QC_SHOT_DIR when set (CI points it at an upload path), otherwise to .qc-shots/,
   which is gitignored. Previously they landed in the working directory and had to
   be swept up by hand after every run. */
const shotDir = process.env.QC_SHOT_DIR || '.qc-shots';
require('node:fs').mkdirSync(shotDir, { recursive: true });
const shot = (name) => require('node:path').join(shotDir, name);

const sleep = ms => new Promise(r => setTimeout(r, ms));
const B = process.argv[2] || 'http://127.0.0.1:1313';

// Assertion helper. Every check() that fails adds one line to `failures`;
// the process exits 1 at the end if there is anything in it.
const failures = [];
const check = (label, cond, detail = '') => { if (!cond) failures.push(`${label}${detail ? ': ' + detail : ''}`); };

// Live third-party panels and the analytics beacon may fail without keys or network.
const EXTERNAL = /(api\.simkl\.com|ws\.audioscrobbler\.com|api\.unsplash\.com|images\.unsplash\.com|graphql\.anilist\.co|api\.openalex\.org|openalex\.org|doi\.org|gc\.zgo\.at|goatcounter|stats\.htunteza\.com)/i;
const ORIGIN = new URL(B).origin;
const sameOrigin = u => { try { return new URL(u).origin === ORIGIN; } catch (e) { return false; } };
// The palette row is a menuitemcheckbox, so match every menu-item role.
const ROW_SEL = '#balloon-menu [role=menuitem], #balloon-menu [role=menuitemcheckbox], #balloon-menu [role=menuitemradio]';

(async () => {
  const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || undefined, headless: 'new', args: ['--no-sandbox','--disable-gpu','--hide-scrollbars'] });
  const out = []; const errors = [];
  try {
  async function open(w, h, url, opts = {}) {
    const page = await browser.newPage();
    page.on('console', m => { if (m.type()==='error' && !EXTERNAL.test(m.text())) errors.push(`${w} ${url} ${m.text()}`); });
    page.on('pageerror', e => errors.push(`${w} ${url} pageerror ${e.message}`));
    page.on('requestfailed', r => { if (sameOrigin(r.url()) && !EXTERNAL.test(r.url())) errors.push(`${w} ${url} reqfail ${r.url()} ${r.failure()?.errorText}`); });
    await page.setViewport({ width: w, height: h });
    if (opts.dark) await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }]);
    else await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
    if (opts.cb) await page.evaluateOnNewDocument(() => { try { localStorage.setItem('palette', 'colorblind'); } catch (e) {} });
    const res = await page.goto(url, { waitUntil: 'networkidle2' }); await sleep(600);
    // 304 is fine: the browser cache is warm across pages in one run.
    check(`[${w}] ${url} did not load`, res && res.status() < 400, res ? String(res.status()) : 'no response');
    return page;
  }
  // overflow audit + phone shots
  for (const w of [375, 390, 430]) {
    const p = await open(w, 844, B + '/');
    const r = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth,
      writesW: document.querySelector('#writes .voice-l').getBoundingClientRect().width, latelyW: document.querySelector('#writes .voice-r').getBoundingClientRect().width,
      cols: getComputedStyle(document.querySelector('#writes')).gridTemplateColumns, coverW: document.querySelector('.lately-item .cover img')?.getBoundingClientRect().width|0, coverH: document.querySelector('.lately-item .cover img')?.getBoundingClientRect().height|0,
      hasCover: !!document.querySelector('.lately-item .cover img'),
      firstSection: document.querySelector('#places .voice-l .kicker').textContent }));
    out.push(`[${w}] overflow ok=${r.sw <= r.cw} (${r.sw}/${r.cw}) writes=${Math.round(r.writesW)} lately=${Math.round(r.latelyW)} cols="${r.cols}" cover=${r.coverW}x${r.coverH} places-first="${r.firstSection}"`);
    check(`[${w}] horizontal overflow on the home page`, r.sw <= r.cw, `${r.sw}/${r.cw}`);
    check(`[${w}] #writes columns have no width`, r.writesW > 0 && r.latelyW > 0, `${r.writesW}/${r.latelyW}`);
    check(`[${w}] #writes column wider than the viewport`, r.writesW <= w && r.latelyW <= w, `${Math.round(r.writesW)}/${Math.round(r.latelyW)} > ${w}`);
    check(`[${w}] #writes is not a single column at phone width`, r.cols.trim().split(/\s+/).length === 1, r.cols);
    check(`[${w}] #places first kicker is empty`, r.firstSection.trim().length > 0);
    // Cover art comes from third-party APIs; assert size only when one rendered.
    if (r.hasCover) check(`[${w}] lately cover has no box`, r.coverW > 0 && r.coverH > 0, `${r.coverW}x${r.coverH}`);
    await p.screenshot({ path: shot(`f-home-${w}.png`), fullPage: true });
    if (w === 390) {
      await p.evaluate(() => document.querySelector('#writes').scrollIntoView()); await sleep(400);
      await p.screenshot({ path: shot('f-writes-390.png') });
    }
    await p.close();
  }
  // desktop/tablet
  for (const w of [1440, 820]) { const p = await open(w, 900, B + '/');
    const r = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
    check(`[${w}] horizontal overflow on the home page`, r.sw <= r.cw, `${r.sw}/${r.cw}`);
    await p.screenshot({ path: shot(`f-home-${w}.png`), fullPage: true }); await p.close(); }
  // mm
  { const p = await open(1440, 900, B + '/mm/');
    check('[mm 1440] /mm/ is not lang=my', await p.$eval('html', e => e.lang) === 'my');
    await p.screenshot({ path: shot('f-mm-1440.png'), fullPage: true }); await p.close(); }
  { const p = await open(390, 844, B + '/mm/'); const r = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth })); out.push(`[mm 390] overflow ok=${r.sw <= r.cw}`);
    check('[mm 390] horizontal overflow on /mm/', r.sw <= r.cw, `${r.sw}/${r.cw}`);
    await p.screenshot({ path: shot('f-mm-390.png'), fullPage: true }); await p.close(); }
  // colorblind light + dark, blood
  let cbLight = '', cbDark = '';
  { const p = await open(1440, 900, B + '/', { cb: true }); cbLight = await p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--accent').trim());
    const pressed = await p.$eval('[data-palette-toggle]', e => e.getAttribute('aria-pressed'));
    out.push('cb light accent=' + cbLight + ' pressed=' + pressed);
    check('cb light: --accent is unset', cbLight.length > 0);
    check('cb light: stored palette not applied to <html>', await p.evaluate(() => document.documentElement.dataset.palette) === 'colorblind');
    check('cb light: palette toggle not aria-pressed', pressed === 'true', String(pressed));
    await p.screenshot({ path: shot('f-cb-light-1440.png') }); await p.close(); }
  { const p = await open(390, 844, B + '/', { cb: true, dark: true }); cbDark = await p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--accent').trim());
    out.push('cb dark accent=' + cbDark);
    check('cb dark: --accent is unset', cbDark.length > 0);
    check('cb dark: --accent identical to the light one', cbDark !== cbLight, `${cbLight} vs ${cbDark}`);
    check('cb dark: theme is not dark', await p.evaluate(() => document.documentElement.dataset.theme) === 'dark');
    await p.evaluate(() => window.scrollTo(0, 2200)); await sleep(300); await p.$eval('#balloon-button', e => e.click()); await sleep(300);
    check('cb dark: balloon menu did not open', await p.$eval('#balloon-menu', e => e.hidden) === false);
    await p.screenshot({ path: shot('f-cb-dark-balloon-390.png') }); await p.close(); }
  { const p = await open(1024, 900, B + '/blood/', { cb: true }); const bloodVar = await p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--blood').trim());
    out.push('blood cb blood-var=' + bloodVar);
    check('blood: --blood is unset under the colour-blind palette', bloodVar.length > 0);
    await p.screenshot({ path: shot('f-blood-cb.png') }); await p.close(); }
  { const p = await open(1024, 900, B + '/blood/', { cb: true, dark: true }); await p.screenshot({ path: shot('f-blood-cb-dark.png') }); await p.close(); }
  // toggle from footer persists
  { const p = await open(1440, 900, B + '/');
    const before = await p.evaluate(() => document.documentElement.dataset.palette || 'default');
    await p.$eval('.colophon [data-palette-toggle]', e => e.click()); await sleep(200);
    const after = await p.evaluate(() => document.documentElement.dataset.palette || 'default');
    const stored = await p.evaluate(() => localStorage.getItem('palette'));
    out.push('footer toggle → palette=' + await p.evaluate(() => document.documentElement.dataset.palette + ' stored=' + localStorage.getItem('palette')));
    check('footer palette toggle did not flip the palette', after !== before, `${before} → ${after}`);
    check('footer palette toggle did not persist its state', after === 'colorblind' ? stored === 'colorblind' : stored === null, `${after}/${stored}`);
    check('footer toggle left aria-pressed out of sync', await p.$eval('.colophon [data-palette-toggle]', e => e.getAttribute('aria-pressed')) === String(after === 'colorblind'));
    await p.reload({ waitUntil: 'networkidle2' });
    const reloaded = await p.evaluate(() => document.documentElement.dataset.palette || 'default');
    out.push('after reload palette=' + await p.evaluate(() => document.documentElement.dataset.palette));
    check('palette choice did not survive a reload', reloaded === after, `${after} → ${reloaded}`);
    await p.close(); }
  // balloon open at top / middle / bottom (light)
  { const p = await open(390, 844, B + '/');
    await p.$eval('#balloon-button', e => e.click()); await sleep(300); await p.screenshot({ path: shot('f-balloon-top.png') });
    const rows = await p.$$eval(ROW_SEL, l => l.filter(e => !e.closest('[hidden]')).map(e => e.textContent.trim().replace(/\s+/g,' ')));
    out.push('balloon rows: ' + rows.join(' | '));
    check('balloon menu did not open at the top of the page', await p.$eval('#balloon-menu', e => e.hidden) === false);
    check('balloon menu has no rows', rows.length > 0, String(rows.length));
    check('a balloon row has no label', rows.every(t => t.length > 0));
    await p.keyboard.press('Escape'); await sleep(250);
    check('Escape did not close the menu (top)', await p.$eval('#balloon-menu', e => e.hidden) === true);
    await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight/2));
    /* Scrolling mid-page starts the lazy images that were below the fold. While they
       decode, sections move, and which one is "current" legitimately changes under the
       menu. Wait for the page to stop moving so the next assertions measure a settled
       layout rather than a race. */
    await p.evaluate(async () => {
      const pending = Array.from(document.images).filter(i => !i.complete);
      await Promise.race([
        Promise.all(pending.map(i => new Promise(r => { i.addEventListener('load', r, { once: true }); i.addEventListener('error', r, { once: true }); }))),
        new Promise(r => setTimeout(r, 4000)),
      ]);
      let last = -1, stable = 0;
      while (stable < 3) {
        await new Promise(r => requestAnimationFrame(() => setTimeout(r, 100)));
        const h = document.body.scrollHeight;
        stable = h === last ? stable + 1 : 0;
        last = h;
      }
    });
    await sleep(300); await p.$eval('#balloon-button', e => e.click()); await sleep(300); await p.screenshot({ path: shot('f-balloon-mid.png') });
    const midActive = await p.evaluate(() => document.activeElement.textContent.trim());
    out.push('mid active=' + midActive);
    check('reopening mid-page did not focus a menu row', (await p.$$eval(ROW_SEL, l => l.map(e => e.textContent.trim().replace(/\s+/g,' ')))).includes(midActive), midActive);
    check('reopening mid-page did not focus the current section', await p.evaluate(() => document.activeElement.classList.contains('is-active')) === true, midActive);
    await p.keyboard.press('Escape'); await sleep(250);
    await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await sleep(300); await p.$eval('#balloon-button', e => e.click()); await sleep(300); await p.screenshot({ path: shot('f-balloon-bottom.png') });
    check('balloon menu did not open at the bottom of the page', await p.$eval('#balloon-menu', e => e.hidden) === false);
    await p.keyboard.press('End'); await p.keyboard.press('ArrowUp');
    const penultimate = await p.evaluate(() => document.activeElement.textContent.trim());
    const visible = await p.$$eval(ROW_SEL, l => l.filter(e => !e.closest('[hidden]')).map(e => e.textContent.trim().replace(/\s+/g,' ')));
    out.push('End-1 → ' + penultimate);
    check('End then ArrowUp did not land on the second-to-last row', penultimate === visible[visible.length-2], `${penultimate} vs ${visible[visible.length-2]}`);
    await p.keyboard.press('Escape'); await sleep(250);
    const escFocus = await p.evaluate(() => document.activeElement.id);
    out.push('Escape focus=' + escFocus);
    check('Escape did not return focus to the balloon button', escFocus === 'balloon-button', escFocus);
    check('Escape did not close the menu (bottom)', await p.$eval('#balloon-menu', e => e.hidden) === true);
    await p.close(); }
  console.log(out.join('\n')); console.log('errors:', errors.length ? errors.join('\n') : 'none');
  check('same-origin console/page/request errors', errors.length === 0, errors.slice(0,10).join(' | '));
  } finally {
    await browser.close();
  }
  if (failures.length) { console.log(`\nFAILURES (${failures.length}):\n  ` + failures.join('\n  ')); process.exitCode = 1; }
  else console.log('\nPASS');
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
