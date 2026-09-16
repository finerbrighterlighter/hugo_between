const puppeteer = require('puppeteer');
const [,, url, out, w = '1440', h = '900', full = '', scheme = 'light'] = process.argv;
(async () => {
  const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || undefined, headless: 'new', args: ['--no-sandbox', '--disable-gpu', '--hide-scrollbars'] });
  const page = await browser.newPage();
  await page.setViewport({ width: +w, height: +h, deviceScaleFactor: 1 });
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise(r => setTimeout(r, 800));
  await page.screenshot({ path: out, fullPage: full === 'full' });
  if (errors.length) console.log(errors.join('\n'));
  await browser.close();
})().catch(e => { console.error(e.message); process.exit(1); });
