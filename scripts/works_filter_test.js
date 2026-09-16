const puppeteer = require('puppeteer');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || undefined, headless: 'new', args: ['--no-sandbox','--disable-gpu','--hide-scrollbars'] });
  const errors = [];
  for (const [w,h,tag] of [[1440,900,'desktop'],[390,844,'phone']]) {
    const page = await browser.newPage();
    await page.setViewport({ width: w, height: h });
    page.on('console', m => { if (m.type()==='error') errors.push(tag+' '+m.text()); });
    page.on('pageerror', e => errors.push(tag+' pageerror '+e.message));
    const vis = async () => page.$$eval('.bib-entry', l => l.filter(e => e.offsetParent !== null).length);
    const groups = async () => page.$$eval('.works-group', l => l.filter(e => e.offsetParent !== null).map(g => g.dataset.group).join(','));
    const count = async () => page.$eval('#works-count', e => e.textContent);
    await page.goto('' + (process.argv[2] || 'http://127.0.0.1:1313') + '/works/?search=periodontitis', { waitUntil: 'networkidle2' }); await sleep(400);
    console.log(`[${tag}] ?search=periodontitis → count "${await count()}", visible entries ${await vis()}, groups ${await groups()}`);
    await page.type('#works-search', ' 2023'); await sleep(300);
    console.log(`[${tag}] + " 2023" → "${await count()}", visible ${await vis()}`);
    await page.$eval('#works-search', e => { e.value=''; e.dispatchEvent(new Event('input',{bubbles:true})); }); await sleep(200);
    await page.type('#works-search', 'McKay'); await sleep(300);
    console.log(`[${tag}] "McKay" → "${await count()}", visible ${await vis()}`);
    await page.$eval('.filter-tag[data-tag="hypertension"]', e => e.click()); await sleep(300);
    console.log(`[${tag}] + tag hypertension → "${await count()}", visible ${await vis()}, url ${page.url().split('/works/')[1]}`);
    await page.$eval('.filter-tag[data-tag="thailand"]', e => e.click()); await sleep(300);
    console.log(`[${tag}] + tag thailand → "${await count()}", visible ${await vis()}, pressed=${await page.$$eval('.filter-tag[aria-pressed="true"]', l => l.length)}`);
    await page.$eval('#works-clear', e => e.click()); await sleep(300);
    console.log(`[${tag}] clear → "${await count()}", visible ${await vis()}, input "${await page.$eval('#works-search', e => e.value)}", url ${page.url().split('/works/')[1]||'(none)'}, clear hidden ${await page.$eval('#works-clear', e => e.hidden)}`);
    await page.keyboard.press('Enter');
    await page.$eval('.filter-group[data-group="methods"] [data-more]', e => e.click()); await sleep(200);
    console.log(`[${tag}] methods more → visible extra ${await page.$$eval('.filter-group[data-group="methods"] .filter-tag.is-extra', l => l.filter(e=>e.offsetParent!==null).length)}, label "${await page.$eval('.filter-group[data-group="methods"] [data-more]', e => e.textContent)}"`);
    if (tag==='phone') { await page.goto('' + (process.argv[2] || 'http://127.0.0.1:1313') + '/works/?search=periodontitis', { waitUntil: 'networkidle2' }); await sleep(400); await page.screenshot({ path: 'r3-works-390.png', fullPage: true }); }
    else { await page.goto('' + (process.argv[2] || 'http://127.0.0.1:1313') + '/works/?tags=hypertension,thailand', { waitUntil: 'networkidle2' }); await sleep(400); await page.screenshot({ path: 'r3-works-1440.png', fullPage: true }); }
    await page.close();
  }
  console.log('errors:', errors.length ? errors.join('\n') : 'none');
  await browser.close();
})();
