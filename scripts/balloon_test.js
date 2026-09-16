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
const MIN_ROW_H = 30; // tap-target floor for a menu row, in CSS px

(async () => {
  const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || undefined, headless: 'new', args: ['--no-sandbox','--disable-gpu','--hide-scrollbars'] });
  const out = []; const errors = [];
  try {
  async function open(w, url, opts = {}) {
    const page = await browser.newPage();
    page.on('console', m => { if (m.type()==='error' && !EXTERNAL.test(m.text())) errors.push(`${w} ${url} ${m.text()}`); });
    page.on('pageerror', e => errors.push(`${w} ${url} pageerror ${e.message}`));
    page.on('requestfailed', r => { if (sameOrigin(r.url()) && !EXTERNAL.test(r.url())) errors.push(`${w} ${url} reqfail ${r.url()} ${r.failure()?.errorText}`); });
    await page.setViewport({ width: w, height: 844 });
    await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: opts.dark ? 'dark' : 'light' }]);
    await page.evaluateOnNewDocument((cb) => { try { if (cb) localStorage.setItem('palette','colorblind'); else localStorage.removeItem('palette'); } catch(e){} }, !!opts.cb);
    await page.goto(url, { waitUntil: 'networkidle2' }); await sleep(500);
    return page;
  }
  // Visible menu rows as [{ text, h }] — everything else is derived from this.
  // The palette row is a menuitemcheckbox, so match every menu-item role.
  const ROW_SEL = '#balloon-menu [role=menuitem], #balloon-menu [role=menuitemcheckbox], #balloon-menu [role=menuitemradio]';
  const rows = (p) => p.$$eval(ROW_SEL, l => l.filter(e => !e.closest('[hidden]')).map(e => ({ text: e.textContent.trim().replace(/\s+/g,' '), h: Math.round(e.getBoundingClientRect().height) })));
  const fmt = (r) => r.map(x => `${x.text}:${x.h}`).join(' | ');
  const rowsInfo = async (p) => fmt(await rows(p));
  // Menu open state, asserted the same way everywhere.
  async function assertOpen(p, label) {
    check(`${label} menu still hidden after opening`, await p.$eval('#balloon-menu', e => e.hidden) === false);
    check(`${label} button not aria-expanded`, await p.$eval('#balloon-button', e => e.getAttribute('aria-expanded')) === 'true');
  }
  for (const w of [375, 390, 430]) {
    const p = await open(w, B + '/');
    check(`[${w}] menu open before click`, await p.$eval('#balloon-menu', e => e.hidden) === true);
    await p.$eval('#balloon-button', e => e.click()); await sleep(300);
    await assertOpen(p, `[${w}]`);
    const sw = await p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
    const menuW = await p.$eval('#balloon-menu', e => Math.round(e.getBoundingClientRect().width));
    const r = await rows(p);
    out.push(`[${w}] overflow ok=${sw} menu=${menuW}px rows: ${fmt(r)}`);
    check(`[${w}] open balloon menu causes horizontal overflow`, sw === true);
    check(`[${w}] balloon menu has no width`, menuW > 0, String(menuW));
    check(`[${w}] balloon menu wider than the viewport`, menuW <= w, `${menuW} > ${w}`);
    check(`[${w}] balloon menu has no rows`, r.length > 0, String(r.length));
    check(`[${w}] a menu row is shorter than ${MIN_ROW_H}px`, r.every(x => x.h >= MIN_ROW_H), fmt(r.filter(x => x.h < MIN_ROW_H)));
    check(`[${w}] a menu row has no label`, r.every(x => x.text.length > 0));
    if (w === 390) await p.screenshot({ path: shot('g-top-390.png') });
    // More…
    await p.$eval('[data-more]', e => e.click()); await sleep(200);
    const r2 = await rows(p);
    const moreFocus = await p.evaluate(() => document.activeElement.textContent.trim());
    out.push(`[${w}] after More: ${fmt(r2)} focus=${moreFocus}`);
    check(`[${w}] More… revealed no extra rows`, r2.length > r.length, `${r.length} → ${r2.length}`);
    check(`[${w}] More… did not move focus to a revealed row`, moreFocus.length > 0 && !r.some(x => x.text === moreFocus), moreFocus);
    check(`[${w}] a revealed row is shorter than ${MIN_ROW_H}px`, r2.every(x => x.h >= MIN_ROW_H), fmt(r2.filter(x => x.h < MIN_ROW_H)));
    if (w === 375) await p.screenshot({ path: shot('g-more-375.png') });
    if (w === 430) await p.screenshot({ path: shot('g-more-430.png') });
    await p.close();
  }
  // keyboard: jump to Research, active detection, End/Home/Escape
  { const p = await open(390, B + '/');
    await p.focus('#balloon-button'); await p.keyboard.press('Enter'); await sleep(300);
    await assertOpen(p, '[keyboard]');
    const before = await rows(p);
    await p.keyboard.press('ArrowDown'); await p.keyboard.press('ArrowDown'); await p.keyboard.press('ArrowDown');
    const focused = await p.evaluate(() => document.activeElement.textContent.trim());
    out.push('focused: ' + focused);
    check('ArrowDown did not land on a menu row', before.some(x => x.text === focused), focused);
    check('ArrowDown did not move off the first row', focused !== before[0].text, focused);
    await p.keyboard.press('Enter'); await sleep(900);
    const jumpEl = await p.evaluate(() => document.activeElement.id);
    const jumpY = await p.evaluate(() => Math.round(scrollY));
    out.push('jump → active el=' + jumpEl + ' scrollY=' + jumpY);
    check('Enter on a section row moved focus nowhere', jumpEl.length > 0, jumpEl);
    check('Enter on a section row did not scroll', jumpY > 0, String(jumpY));
    check('menu stayed open after activating a row', await p.$eval('#balloon-menu', e => e.hidden) === true);
    await p.$eval('#balloon-button', e => e.click()); await sleep(300);
    const reopenFocus = await p.evaluate(() => document.activeElement.textContent.trim());
    const reopenActive = await p.evaluate(() => document.activeElement.classList.contains('is-active'));
    out.push('reopen focus=' + reopenFocus + ' active=' + reopenActive);
    check('reopened menu did not focus the current section', reopenActive === true, reopenFocus);
    check('reopened focus is not a menu row', (await rows(p)).some(x => x.text === reopenFocus), reopenFocus);
    await p.screenshot({ path: shot('g-mid-390.png') });
    const collapsed = await rows(p);
    await p.keyboard.press('End');
    // Snapshot the rows right after each key press so a live-reload rebuild
    // mid-run cannot make the comparison compare two different DOMs.
    const endText = await p.evaluate(() => document.activeElement.textContent.trim());
    const atEnd = await rows(p);
    out.push('End → ' + endText);
    check('End did not focus the last visible row', endText === atEnd[atEnd.length-1].text, `${endText} vs ${atEnd[atEnd.length-1].text}`);
    await p.keyboard.press('Enter'); await sleep(200); // opens More
    const expanded = await rows(p);
    check('Enter on More… revealed no rows', expanded.length > collapsed.length, `${collapsed.length} → ${expanded.length}`);
    await p.keyboard.press('End');
    const endAfter = await p.evaluate(() => document.activeElement.textContent.trim());
    const atEnd2 = await rows(p);
    out.push('End after More → ' + endAfter);
    check('End after More… did not reach the new last row', endAfter === atEnd2[atEnd2.length-1].text, `${endAfter} vs ${atEnd2[atEnd2.length-1].text}`);
    await p.keyboard.press('Home');
    const homeText = await p.evaluate(() => document.activeElement.textContent.trim());
    const atHome = await rows(p);
    out.push('Home → ' + homeText);
    check('Home did not focus the first row', homeText === atHome[0].text, `${homeText} vs ${atHome[0].text}`);
    await p.keyboard.press('Escape'); await sleep(250);
    const escFocus = await p.evaluate(() => document.activeElement.id);
    const escHidden = await p.$eval('#balloon-menu', e => e.hidden);
    out.push('Escape focus=' + escFocus + ' hidden=' + escHidden);
    check('Escape did not close the menu', escHidden === true);
    check('Escape did not return focus to the balloon button', escFocus === 'balloon-button', escFocus);
    check('closed menu left the button aria-expanded', await p.$eval('#balloon-button', e => e.getAttribute('aria-expanded')) === 'false');
    await p.evaluate(() => scrollTo(0, document.body.scrollHeight)); await sleep(300); await p.$eval('#balloon-button', e => e.click()); await sleep(300);
    await assertOpen(p, '[bottom]');
    check('[bottom] menu has no rows when opened at page end', (await rows(p)).length > 0);
    await p.screenshot({ path: shot('g-bottom-390.png') }); await p.close(); }
  { const p = await open(390, B + '/', { dark: true }); await p.evaluate(() => scrollTo(0, 1500)); await sleep(300); await p.$eval('#balloon-button', e => e.click()); await sleep(200); await p.$eval('[data-more]', e => e.click()); await sleep(200);
    check('[dark] menu did not open', await p.$eval('#balloon-menu', e => e.hidden) === false);
    check('[dark] theme is not dark', await p.evaluate(() => document.documentElement.dataset.theme) === 'dark');
    await p.screenshot({ path: shot('g-dark-390.png') }); await p.close(); }
  { const p = await open(390, B + '/', { cb: true }); await p.$eval('#balloon-button', e => e.click()); await sleep(200); await p.$eval('[data-more]', e => e.click()); await sleep(200);
    const pressed = await p.$eval('[data-palette-toggle]', e => e.getAttribute('aria-pressed'));
    out.push('cb pressed=' + pressed);
    check('stored colour-blind palette not reflected in the menu toggle', pressed === 'true', String(pressed));
    check('stored colour-blind palette not applied to <html>', await p.evaluate(() => document.documentElement.dataset.palette) === 'colorblind');
    await p.screenshot({ path: shot('g-cb-390.png') }); await p.close(); }
  { const p = await open(390, B + '/works/'); await sleep(1500); await p.$eval('#balloon-button', e => e.click()); await sleep(300);
    const r = await rows(p);
    out.push('works: ' + fmt(r));
    check('[works] balloon menu has no rows', r.length > 0);
    check('[works] menu does not list the works sections', r.some(x => /journal/i.test(x.text)), fmt(r));
    await p.close(); }
  { const p = await open(390, B + '/mm/'); await p.$eval('#balloon-button', e => e.click()); await sleep(300); await p.$eval('[data-more]', e => e.click()); await sleep(200);
    const r = await rows(p);
    out.push('mm: ' + fmt(r));
    check('[mm] balloon menu has no rows', r.length > 0);
    check('[mm] menu offers no switch back to English', r.some(x => /English/i.test(x.text)), fmt(r));
    check('[mm] a menu row is shorter than ' + MIN_ROW_H + 'px', r.every(x => x.h >= MIN_ROW_H), fmt(r.filter(x => x.h < MIN_ROW_H)));
    await p.screenshot({ path: shot('g-mm-390.png') }); await p.close(); }
  console.log(out.join('\n')); console.log('errors:', errors.length ? errors.join('\n') : 'none');
  check('same-origin console/page/request errors', errors.length === 0, errors.slice(0,10).join(' | '));
  } finally {
    await browser.close();
  }
  if (failures.length) { console.log(`\nFAILURES (${failures.length}):\n  ` + failures.join('\n  ')); process.exitCode = 1; }
  else console.log('\nPASS');
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
