const puppeteer = require('puppeteer');
/* lang-return.js: a Burmese reader who opens an English-only page keeps Burmese
   navigation; an English reader does not. Four visits, one browser context each. */
const B = process.argv[2] || 'http://127.0.0.1:1313';
const WORK = B + '/works/journal/2023_transitions_from_hypertension_to_cvd_outcomes/';
const failures = [];
const check = (label, cond, detail = '') => { if (!cond) failures.push(`${label}${detail ? ': ' + detail : ''}`); };
const EXTERNAL = /(api\.openalex\.org|doi\.org|gc\.zgo\.at|goatcounter|stats\.htunteza\.com)/i;

(async () => {
  const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || undefined, headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
  const errors = [];
  const nav = page => page.evaluate(() => ({
    name: document.querySelector('.masthead-name').getAttribute('href'),
    works: document.querySelector('.masthead-left a').getAttribute('href'),
    posts: document.querySelector('.masthead-right a').getAttribute('href'),
    footer: Array.from(document.querySelectorAll('.colophon nav a')).map(a => a.getAttribute('href')),
    balloon: Array.from(document.querySelectorAll('.balloon a')).map(a => a.getAttribute('href')),
    stored: (() => { try { return localStorage.getItem('lang'); } catch (e) { return 'n/a'; } })(),
    struck: !!document.querySelector('.lang-switch.is-missing'),
  }));
  async function fresh() {
    const ctx = await browser.createBrowserContext();
    const page = await ctx.newPage();
    page.on('console', m => { if (m.type() === 'error' && !EXTERNAL.test(m.text())) errors.push(m.text()); });
    page.on('pageerror', e => errors.push('pageerror: ' + e.message));
    return { ctx, page };
  }
  try {
    // A. English reader, direct link: nothing changes.
    { const { ctx, page } = await fresh();
      await page.goto(WORK, { waitUntil: 'networkidle2' });
      const n = await nav(page);
      check('A struck switch present', n.struck);
      check('A masthead name stays /', n.name === '/', n.name);
      check('A works stays /works/', n.works === '/works/', n.works);
      check('A nothing stored', n.stored === null, String(n.stored));
      console.log('A direct:', JSON.stringify(n));
      await ctx.close(); }
    // B. Referrer under /mm/, no memory: Burmese navigation.
    { const { ctx, page } = await fresh();
      await page.goto(WORK, { waitUntil: 'networkidle2', referer: B + '/mm/works/' });
      const n = await nav(page);
      check('B masthead name → /mm/', n.name === '/mm/', n.name);
      check('B works → /mm/works/', n.works === '/mm/works/', n.works);
      check('B posts → /mm/posts/', n.posts === '/mm/posts/', n.posts);
      check('B footer about → /mm/about/', n.footer.includes('/mm/about/'), n.footer.join(' '));
      check('B balloon has /mm/works/', n.balloon.includes('/mm/works/'), n.balloon.join(' '));
      console.log('B referrer:', JSON.stringify(n));
      await ctx.close(); }
    // C. Memory: visited /mm/ earlier in the session, then a direct link.
    { const { ctx, page } = await fresh();
      await page.goto(B + '/mm/', { waitUntil: 'networkidle2' });
      await page.goto(WORK, { waitUntil: 'networkidle2' });
      let n = await nav(page);
      check('C stored mm', n.stored === 'mm', String(n.stored));
      check('C masthead name → /mm/', n.name === '/mm/', n.name);
      console.log('C memory:', JSON.stringify(n));
      // D. Then chooses English on a page that has Burmese: memory flips, work page is English again.
      await page.goto(B + '/works/', { waitUntil: 'networkidle2' });
      await page.goto(WORK, { waitUntil: 'networkidle2' });
      n = await nav(page);
      check('D stored en', n.stored === 'en', String(n.stored));
      check('D masthead name back to /', n.name === '/', n.name);
      console.log('D chose English:', JSON.stringify(n));
      // E. Credits page is English-only too.
      await page.goto(B + '/mm/', { waitUntil: 'networkidle2' });
      await page.goto(B + '/general/credits/', { waitUntil: 'networkidle2' });
      n = await nav(page);
      check('E credits → /mm/', n.name === '/mm/', n.name);
      console.log('E credits:', JSON.stringify(n));
      await ctx.close(); }
  } finally { await browser.close(); }
  console.log('errors:', errors.length ? errors.join('\n') : 'none');
  if (failures.length) { console.log('\nFAIL\n' + failures.join('\n')); process.exit(1); }
  console.log('\nPASS');
})().catch(e => { console.error(e); process.exit(1); });
