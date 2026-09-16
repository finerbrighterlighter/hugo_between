const puppeteer = require('puppeteer');
const BASE = process.argv[2] || 'http://127.0.0.1:1313';
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || undefined, headless: 'new', args: ['--no-sandbox','--disable-gpu','--hide-scrollbars'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(`${page.url()} :: ${m.text()}`); });
  page.on('pageerror', e => errors.push(`${page.url()} :: pageerror ${e.message}`));
  page.on('requestfailed', r => { if (!/gc\.zgo\.at|goatcounter/.test(r.url())) errors.push(`${page.url()} :: reqfail ${r.url()} ${r.failure()?.errorText}`); });
  const out = [];
  // home live data
  await page.goto(BASE + '/', { waitUntil: 'networkidle2' }); await sleep(2500);
  out.push('now-playing: ' + await page.$eval('#now-playing', e => e.textContent.trim().slice(0,90)));
  for (const id of ['strip-manga','strip-screen','strip-photos']) out.push(`${id}: ${await page.$$eval('#'+id+' li', l => l.length)} items`);
  out.push('metrics hidden? ' + await page.$eval('#metrics', e => e.hidden) + ' :: ' + await page.$eval('#metrics', e => e.textContent.replace(/\s+/g,' ').trim()));
  out.push('clock: ' + await page.$eval('[data-clock]', e => e.textContent));
  // duck
  await page.$eval('#portrait', e => e.click()); await sleep(300);
  out.push('duck class after click: ' + await page.$eval('#portrait', e => e.className));
  // theme toggle
  await page.$eval('[data-theme-toggle]', e => e.click()); await sleep(200);
  out.push('theme after toggle: ' + await page.$eval('html', e => e.dataset.theme) + ' label=' + await page.$eval('[data-theme-toggle]', e => e.getAttribute('aria-label')));
  await page.$eval('[data-theme-toggle]', e => e.click()); await sleep(200);
  // cache flush
  await page.$eval('[data-cache-flush]', e => e.click()); await sleep(300);
  out.push('cache status: ' + await page.$eval('[data-cache-status]', e => e.textContent));
  // works filter
  await page.goto(BASE + '/works/?search=hypertension', { waitUntil: 'networkidle2' }); await sleep(500);
  out.push('works search prefill: ' + await page.$eval('#works-search', e => e.value) + ' | count: ' + await page.$eval('#works-count', e => e.textContent));
  await page.$eval('#works-search', e => { e.value=''; e.dispatchEvent(new Event('input',{bubbles:true})); }); await sleep(300);
  out.push('works cleared count: ' + await page.$eval('#works-count', e => e.textContent));
  await page.$eval('.filter-tag[data-tag="dementia"]', e => e.click()); await sleep(300);
  out.push('tag dementia: ' + await page.$eval('#works-count', e => e.textContent) + ' url=' + page.url() + ' clearHidden=' + await page.$eval('#works-clear', e => e.hidden));
  await page.$eval('[data-more]', e => e.click()); await sleep(100);
  out.push('more expanded: visible extra tags=' + await page.$$eval('.filter-group[data-group="conditions"] .filter-tag.is-extra:not([hidden])', l => l.length));
  await page.$eval('#works-clear', e => e.click()); await sleep(200);
  out.push('after clear: ' + await page.$eval('#works-count', e => e.textContent));
  // work single: cite
  await page.goto(BASE + '/works/journal/2023_development_of_risk_prediction_models_for_severe_periodontitis/', { waitUntil: 'networkidle2' }); await sleep(1500);
  out.push('citation: ' + await page.$eval('[data-citation-count]', e => (e.hidden?'hidden ':'') + e.textContent.trim()));
  await page.$eval('details.cite summary', e => e.click()); await sleep(3500);
  out.push('cite status: "' + await page.$eval('.cite-status', e => e.textContent) + '" output len=' + await page.$eval('.cite-output', e => e.textContent.length) + ' copy disabled=' + await page.$eval('[data-action=copy]', e => e.disabled));
  await page.$eval('[data-format=apa]', e => e.click()); await sleep(200);
  out.push('apa: ' + await page.$eval('.cite-output', e => e.textContent.slice(0,120).replace(/\n/g,' ')));
  // protected doc
  await page.goto(BASE + '/general/msc-transcript/', { waitUntil: 'networkidle2' }); await sleep(500);
  await page.type('#pin', '0000'); await page.$eval('.gate-form button[type=submit]', e => e.click()); await sleep(800);
  out.push('gate wrong pin: ' + await page.$eval('.gate-status', e => e.textContent));
  // post with math
  await page.goto(BASE + '/posts/msc_journal_club/', { waitUntil: 'networkidle2' }); await sleep(1500);
  out.push('katex spans: ' + await page.$$eval('.katex', l => l.length) + ' toc items: ' + await page.$$eval('#toc li', l => l.length));
  // mm
  await page.goto(BASE + '/mm/', { waitUntil: 'networkidle2' }); await sleep(800);
  out.push('mm lang=' + await page.$eval('html', e => e.lang) + ' switch=' + await page.$eval('.masthead .lang-switch', e => e.getAttribute('href')));
  await page.goto(BASE + '/blood/', { waitUntil: 'networkidle2' }); await sleep(500);
  await page.goto(BASE + '/posts/', { waitUntil: 'networkidle2' }); await sleep(500);
  await page.goto(BASE + '/about/', { waitUntil: 'networkidle2' }); await sleep(800);
  out.push('about toc items: ' + await page.$$eval('#toc li', l => l.length));
  console.log(out.join('\n'));
  console.log('\nERRORS (' + errors.length + '):\n' + errors.slice(0,25).join('\n'));
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
