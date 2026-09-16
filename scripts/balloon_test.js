const puppeteer = require('puppeteer');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const B = process.argv[2] || 'http://127.0.0.1:1313';
(async () => {
  const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || undefined, headless: 'new', args: ['--no-sandbox','--disable-gpu','--hide-scrollbars'] });
  const out = []; const errors = [];
  async function open(w, url, opts = {}) {
    const page = await browser.newPage();
    page.on('console', m => { if (m.type()==='error') errors.push(`${w} ${url} ${m.text()}`); });
    page.on('pageerror', e => errors.push(`${w} ${url} pageerror ${e.message}`));
    await page.setViewport({ width: w, height: 844 });
    await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: opts.dark ? 'dark' : 'light' }]);
    await page.evaluateOnNewDocument((cb) => { try { if (cb) localStorage.setItem('palette','colorblind'); else localStorage.removeItem('palette'); } catch(e){} }, !!opts.cb);
    await page.goto(url, { waitUntil: 'networkidle2' }); await sleep(500);
    return page;
  }
  const rowsInfo = (p) => p.$$eval('#balloon-menu [role=menuitem]', l => l.filter(e => !e.closest('[hidden]')).map(e => `${e.textContent.trim().replace(/\s+/g,' ')}:${Math.round(e.getBoundingClientRect().height)}`).join(' | '));
  for (const w of [375, 390, 430]) {
    const p = await open(w, B + '/');
    await p.$eval('#balloon-button', e => e.click()); await sleep(300);
    const sw = await p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
    const menuW = await p.$eval('#balloon-menu', e => Math.round(e.getBoundingClientRect().width));
    out.push(`[${w}] overflow ok=${sw} menu=${menuW}px rows: ${await rowsInfo(p)}`);
    if (w === 390) await p.screenshot({ path: 'g-top-390.png' });
    // More…
    await p.$eval('[data-more]', e => e.click()); await sleep(200);
    out.push(`[${w}] after More: ${await rowsInfo(p)} focus=${await p.evaluate(() => document.activeElement.textContent.trim())}`);
    if (w === 375) await p.screenshot({ path: 'g-more-375.png' });
    if (w === 430) await p.screenshot({ path: 'g-more-430.png' });
    await p.close();
  }
  // keyboard: jump to Research, active detection, End/Home/Escape
  { const p = await open(390, B + '/');
    await p.focus('#balloon-button'); await p.keyboard.press('Enter'); await sleep(300);
    await p.keyboard.press('ArrowDown'); await p.keyboard.press('ArrowDown'); await p.keyboard.press('ArrowDown');
    out.push('focused: ' + await p.evaluate(() => document.activeElement.textContent.trim()));
    await p.keyboard.press('Enter'); await sleep(900);
    out.push('jump → active el=' + await p.evaluate(() => document.activeElement.id) + ' scrollY=' + await p.evaluate(() => Math.round(scrollY)));
    await p.$eval('#balloon-button', e => e.click()); await sleep(300);
    out.push('reopen focus=' + await p.evaluate(() => document.activeElement.textContent.trim()) + ' active=' + await p.evaluate(() => document.activeElement.classList.contains('is-active')));
    await p.screenshot({ path: 'g-mid-390.png' });
    await p.keyboard.press('End'); out.push('End → ' + await p.evaluate(() => document.activeElement.textContent.trim()));
    await p.keyboard.press('Enter'); await sleep(200); // opens More
    await p.keyboard.press('End'); out.push('End after More → ' + await p.evaluate(() => document.activeElement.textContent.trim()));
    await p.keyboard.press('Home'); out.push('Home → ' + await p.evaluate(() => document.activeElement.textContent.trim()));
    await p.keyboard.press('Escape'); await sleep(250); out.push('Escape focus=' + await p.evaluate(() => document.activeElement.id) + ' hidden=' + await p.$eval('#balloon-menu', e => e.hidden));
    await p.evaluate(() => scrollTo(0, document.body.scrollHeight)); await sleep(300); await p.$eval('#balloon-button', e => e.click()); await sleep(300);
    await p.screenshot({ path: 'g-bottom-390.png' }); await p.close(); }
  { const p = await open(390, B + '/', { dark: true }); await p.evaluate(() => scrollTo(0, 1500)); await sleep(300); await p.$eval('#balloon-button', e => e.click()); await sleep(200); await p.$eval('[data-more]', e => e.click()); await sleep(200); await p.screenshot({ path: 'g-dark-390.png' }); await p.close(); }
  { const p = await open(390, B + '/', { cb: true }); await p.$eval('#balloon-button', e => e.click()); await sleep(200); await p.$eval('[data-more]', e => e.click()); await sleep(200); out.push('cb pressed=' + await p.$eval('[data-palette-toggle]', e => e.getAttribute('aria-pressed'))); await p.screenshot({ path: 'g-cb-390.png' }); await p.close(); }
  { const p = await open(390, B + '/works/'); await sleep(1500); await p.$eval('#balloon-button', e => e.click()); await sleep(300); out.push('works: ' + await rowsInfo(p)); await p.close(); }
  { const p = await open(390, B + '/mm/'); await p.$eval('#balloon-button', e => e.click()); await sleep(300); await p.$eval('[data-more]', e => e.click()); await sleep(200); out.push('mm: ' + await rowsInfo(p)); await p.screenshot({ path: 'g-mm-390.png' }); await p.close(); }
  console.log(out.join('\n')); console.log('errors:', errors.length ? errors.join('\n') : 'none');
  await browser.close();
})();
