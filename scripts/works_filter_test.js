const puppeteer = require('puppeteer');
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
// "3 of 16 works" → { shown: 3, total: 16 }
const parseCount = t => { const m = /(\d+)\s+of\s+(\d+)/.exec(t || ''); return m ? { shown: +m[1], total: +m[2] } : null; };

(async () => {
  const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || undefined, headless: 'new', args: ['--no-sandbox','--disable-gpu','--hide-scrollbars'] });
  const errors = [];
  try {
  for (const [w,h,tag] of [[1440,900,'desktop'],[390,844,'phone']]) {
    const page = await browser.newPage();
    await page.setViewport({ width: w, height: h });
    page.on('console', m => { if (m.type()==='error' && !EXTERNAL.test(m.text())) errors.push(tag+' '+m.text()); });
    page.on('pageerror', e => errors.push(tag+' pageerror '+e.message));
    page.on('requestfailed', r => { if (sameOrigin(r.url()) && !EXTERNAL.test(r.url())) errors.push(`${tag} reqfail ${r.url()} ${r.failure()?.errorText}`); });
    const vis = async () => page.$$eval('.bib-entry', l => l.filter(e => e.offsetParent !== null).length);
    const groups = async () => page.$$eval('.works-group', l => l.filter(e => e.offsetParent !== null).map(g => g.dataset.group).join(','));
    const count = async () => page.$eval('#works-count', e => e.textContent);
    await page.goto(B + '/works/?search=periodontitis', { waitUntil: 'networkidle2' }); await sleep(400);
    const searchText = await count(); const searchVis = await vis(); const searchGroups = await groups();
    console.log(`[${tag}] ?search=periodontitis → count "${searchText}", visible entries ${searchVis}, groups ${searchGroups}`);
    const s = parseCount(searchText);
    check(`[${tag}] #works-count unparseable`, s !== null, searchText);
    check(`[${tag}] ?search= prefill did not reach the input`, await page.$eval('#works-search', e => e.value) === 'periodontitis');
    check(`[${tag}] search=periodontitis matched nothing`, s !== null && s.shown > 0, searchText);
    check(`[${tag}] search=periodontitis did not narrow the list`, s !== null && s.shown < s.total, searchText);
    check(`[${tag}] visible entries disagree with #works-count`, s !== null && searchVis === s.shown, `${searchVis} vs ${searchText}`);
    check(`[${tag}] no group headings left visible`, searchGroups.length > 0);
    await page.type('#works-search', ' 2023'); await sleep(300);
    const yearText = await count(); const yearVis = await vis();
    console.log(`[${tag}] + " 2023" → "${yearText}", visible ${yearVis}`);
    const y = parseCount(yearText);
    check(`[${tag}] adding " 2023" did not narrow the result`, y !== null && s !== null && y.shown < s.shown, `${searchText} → ${yearText}`);
    check(`[${tag}] " 2023" visible entries disagree with count`, y !== null && yearVis === y.shown, `${yearVis} vs ${yearText}`);
    await page.$eval('#works-search', e => { e.value=''; e.dispatchEvent(new Event('input',{bubbles:true})); }); await sleep(200);
    await page.type('#works-search', 'McKay'); await sleep(300);
    const mcText = await count(); const mcVis = await vis();
    console.log(`[${tag}] "McKay" → "${mcText}", visible ${mcVis}`);
    const mc = parseCount(mcText);
    check(`[${tag}] author search "McKay" matched nothing`, mc !== null && mc.shown > 0, mcText);
    check(`[${tag}] "McKay" did not narrow the list`, mc !== null && mc.shown < mc.total, mcText);
    check(`[${tag}] "McKay" visible entries disagree with count`, mc !== null && mcVis === mc.shown, `${mcVis} vs ${mcText}`);
    await page.$eval('.filter-tag[data-tag="hypertension"]', e => e.click()); await sleep(300);
    const tagText = await count(); const tagVis = await vis(); const tagQuery = page.url().split('/works/')[1] || '';
    console.log(`[${tag}] + tag hypertension → "${tagText}", visible ${tagVis}, url ${tagQuery}`);
    const t1 = parseCount(tagText);
    check(`[${tag}] search+tag matched nothing`, t1 !== null && t1.shown > 0, tagText);
    check(`[${tag}] tag did not further narrow the search`, t1 !== null && mc !== null && t1.shown <= mc.shown, `${mcText} → ${tagText}`);
    check(`[${tag}] tag visible entries disagree with count`, t1 !== null && tagVis === t1.shown, `${tagVis} vs ${tagText}`);
    check(`[${tag}] URL did not keep the search term`, /[?&]search=McKay\b/.test(tagQuery), tagQuery);
    check(`[${tag}] URL did not gain tags=hypertension`, /[?&]tags=[^&]*hypertension/.test(tagQuery), tagQuery);
    check(`[${tag}] hypertension tag is not aria-pressed`, await page.$eval('.filter-tag[data-tag="hypertension"]', e => e.getAttribute('aria-pressed')) === 'true');
    await page.$eval('.filter-tag[data-tag="thailand"]', e => e.click()); await sleep(300);
    const twoText = await count(); const twoVis = await vis(); const pressed = await page.$$eval('.filter-tag[aria-pressed="true"]', l => l.length); const twoQuery = page.url().split('/works/')[1] || '';
    console.log(`[${tag}] + tag thailand → "${twoText}", visible ${twoVis}, pressed=${pressed}`);
    const t2 = parseCount(twoText);
    check(`[${tag}] two tags active but ${pressed} pressed`, pressed === 2, String(pressed));
    check(`[${tag}] second tag visible entries disagree with count`, t2 !== null && twoVis === t2.shown, `${twoVis} vs ${twoText}`);
    check(`[${tag}] URL did not carry both tags`, /[?&]tags=[^&]*hypertension/.test(twoQuery) && /[?&]tags=[^&]*thailand/.test(twoQuery), twoQuery);
    await page.$eval('#works-clear', e => e.click()); await sleep(300);
    const clearText = await count(); const clearVis = await vis(); const clearInput = await page.$eval('#works-search', e => e.value);
    const clearQuery = page.url().split('/works/')[1] || '';
    const clearHidden = await page.$eval('#works-clear', e => e.hidden);
    console.log(`[${tag}] clear → "${clearText}", visible ${clearVis}, input "${clearInput}", url ${clearQuery || '(none)'}, clear hidden ${clearHidden}`);
    const cl = parseCount(clearText);
    check(`[${tag}] clear did not restore all works`, cl !== null && cl.shown === cl.total, clearText);
    check(`[${tag}] clear left entries hidden`, cl !== null && clearVis === cl.total, `${clearVis} vs ${clearText}`);
    check(`[${tag}] clear did not empty the search input`, clearInput === '', clearInput);
    check(`[${tag}] clear did not drop the query string`, !/(search|tags)=/.test(clearQuery), clearQuery);
    check(`[${tag}] #works-clear stayed visible after clearing`, clearHidden === true);
    check(`[${tag}] a filter tag stayed pressed after clearing`, await page.$$eval('.filter-tag[aria-pressed="true"]', l => l.length) === 0);
    await page.keyboard.press('Enter');
    const moreLabelBefore = await page.$eval('.filter-group[data-group="methods"] [data-more]', e => e.textContent.trim());
    await page.$eval('.filter-group[data-group="methods"] [data-more]', e => e.click()); await sleep(200);
    const extra = await page.$$eval('.filter-group[data-group="methods"] .filter-tag.is-extra', l => l.filter(e=>e.offsetParent!==null).length);
    const moreLabel = await page.$eval('.filter-group[data-group="methods"] [data-more]', e => e.textContent);
    console.log(`[${tag}] methods more → visible extra ${extra}, label "${moreLabel}"`);
    check(`[${tag}] More… revealed no extra method tags`, extra > 0, String(extra));
    check(`[${tag}] More… label did not change`, moreLabel.trim() !== moreLabelBefore, `${moreLabelBefore} → ${moreLabel.trim()}`);
    check(`[${tag}] More… is not aria-expanded`, await page.$eval('.filter-group[data-group="methods"] [data-more]', e => e.getAttribute('aria-expanded')) === 'true');
    if (tag==='phone') { await page.goto(B + '/works/?search=periodontitis', { waitUntil: 'networkidle2' }); await sleep(400); await page.screenshot({ path: 'r3-works-390.png', fullPage: true }); }
    else {
      await page.goto(B + '/works/?tags=hypertension,thailand', { waitUntil: 'networkidle2' }); await sleep(400);
      const deep = parseCount(await count());
      check(`[${tag}] ?tags= deep link did not apply`, deep !== null && deep.shown > 0 && deep.shown < deep.total, JSON.stringify(deep));
      check(`[${tag}] ?tags= deep link did not press both tags`, await page.$$eval('.filter-tag[aria-pressed="true"]', l => l.length) === 2);
      await page.screenshot({ path: 'r3-works-1440.png', fullPage: true });
    }
    await page.close();
  }
  console.log('errors:', errors.length ? errors.join('\n') : 'none');
  check('same-origin console/page/request errors', errors.length === 0, errors.slice(0,10).join(' | '));
  } finally {
    await browser.close();
  }
  if (failures.length) { console.log(`\nFAILURES (${failures.length}):\n  ` + failures.join('\n  ')); process.exitCode = 1; }
  else console.log('\nPASS');
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
