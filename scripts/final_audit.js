const puppeteer = require('puppeteer');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const B = process.argv[2] || 'http://127.0.0.1:1313';
(async () => {
  const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || undefined, headless: 'new', args: ['--no-sandbox','--disable-gpu','--hide-scrollbars'] });
  const out = []; const errors = [];
  async function open(w, h, url, opts = {}) {
    const page = await browser.newPage();
    page.on('console', m => { if (m.type()==='error') errors.push(`${w} ${url} ${m.text()}`); });
    page.on('pageerror', e => errors.push(`${w} ${url} pageerror ${e.message}`));
    await page.setViewport({ width: w, height: h });
    if (opts.dark) await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }]);
    else await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
    if (opts.cb) await page.evaluateOnNewDocument(() => { try { localStorage.setItem('palette', 'colorblind'); } catch (e) {} });
    await page.goto(url, { waitUntil: 'networkidle2' }); await sleep(600);
    return page;
  }
  // overflow audit + phone shots
  for (const w of [375, 390, 430]) {
    const p = await open(w, 844, B + '/');
    const r = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth,
      writesW: document.querySelector('#writes .voice-l').getBoundingClientRect().width, latelyW: document.querySelector('#writes .voice-r').getBoundingClientRect().width,
      cols: getComputedStyle(document.querySelector('#writes')).gridTemplateColumns, coverW: document.querySelector('.lately-item .cover img')?.getBoundingClientRect().width|0, coverH: document.querySelector('.lately-item .cover img')?.getBoundingClientRect().height|0,
      firstSection: document.querySelector('#places .voice-l .kicker').textContent }));
    out.push(`[${w}] overflow ok=${r.sw <= r.cw} (${r.sw}/${r.cw}) writes=${Math.round(r.writesW)} lately=${Math.round(r.latelyW)} cols="${r.cols}" cover=${r.coverW}x${r.coverH} places-first="${r.firstSection}"`);
    await p.screenshot({ path: `f-home-${w}.png`, fullPage: true });
    if (w === 390) {
      await p.evaluate(() => document.querySelector('#writes').scrollIntoView()); await sleep(400);
      await p.screenshot({ path: 'f-writes-390.png' });
    }
    await p.close();
  }
  // desktop/tablet
  for (const w of [1440, 820]) { const p = await open(w, 900, B + '/'); await p.screenshot({ path: `f-home-${w}.png`, fullPage: true }); await p.close(); }
  // mm
  { const p = await open(1440, 900, B + '/mm/'); await p.screenshot({ path: 'f-mm-1440.png', fullPage: true }); await p.close(); }
  { const p = await open(390, 844, B + '/mm/'); const r = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth })); out.push(`[mm 390] overflow ok=${r.sw <= r.cw}`); await p.screenshot({ path: 'f-mm-390.png', fullPage: true }); await p.close(); }
  // colorblind light + dark, blood
  { const p = await open(1440, 900, B + '/', { cb: true }); out.push('cb light accent=' + await p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()) + ' pressed=' + await p.$eval('[data-palette-toggle]', e => e.getAttribute('aria-pressed'))); await p.screenshot({ path: 'f-cb-light-1440.png' }); await p.close(); }
  { const p = await open(390, 844, B + '/', { cb: true, dark: true }); out.push('cb dark accent=' + await p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()));
    await p.evaluate(() => window.scrollTo(0, 2200)); await sleep(300); await p.$eval('#balloon-button', e => e.click()); await sleep(300); await p.screenshot({ path: 'f-cb-dark-balloon-390.png' }); await p.close(); }
  { const p = await open(1024, 900, B + '/blood/', { cb: true }); out.push('blood cb blood-var=' + await p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--blood').trim())); await p.screenshot({ path: 'f-blood-cb.png' }); await p.close(); }
  { const p = await open(1024, 900, B + '/blood/', { cb: true, dark: true }); await p.screenshot({ path: 'f-blood-cb-dark.png' }); await p.close(); }
  // toggle from footer persists
  { const p = await open(1440, 900, B + '/'); await p.$eval('.colophon [data-palette-toggle]', e => e.click()); await sleep(200);
    out.push('footer toggle → palette=' + await p.evaluate(() => document.documentElement.dataset.palette + ' stored=' + localStorage.getItem('palette')));
    await p.reload({ waitUntil: 'networkidle2' }); out.push('after reload palette=' + await p.evaluate(() => document.documentElement.dataset.palette)); await p.close(); }
  // balloon open at top / middle / bottom (light)
  { const p = await open(390, 844, B + '/');
    await p.$eval('#balloon-button', e => e.click()); await sleep(300); await p.screenshot({ path: 'f-balloon-top.png' });
    out.push('balloon rows: ' + await p.$$eval('#balloon-menu [role=menuitem]', l => l.map(e => e.textContent.trim().replace(/\s+/g,' ')).join(' | ')));
    await p.keyboard.press('Escape'); await sleep(250);
    await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight/2)); await sleep(300); await p.$eval('#balloon-button', e => e.click()); await sleep(300); await p.screenshot({ path: 'f-balloon-mid.png' });
    out.push('mid active=' + await p.evaluate(() => document.activeElement.textContent.trim()));
    await p.keyboard.press('Escape'); await sleep(250);
    await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await sleep(300); await p.$eval('#balloon-button', e => e.click()); await sleep(300); await p.screenshot({ path: 'f-balloon-bottom.png' });
    await p.keyboard.press('End'); await p.keyboard.press('ArrowUp'); out.push('End-1 → ' + await p.evaluate(() => document.activeElement.textContent.trim()));
    await p.keyboard.press('Escape'); out.push('Escape focus=' + await p.evaluate(() => document.activeElement.id)); await p.close(); }
  console.log(out.join('\n')); console.log('errors:', errors.length ? errors.join('\n') : 'none');
  await browser.close();
})();
