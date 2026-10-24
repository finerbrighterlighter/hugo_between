/**
 * openalex.js — OpenAlex data as text, never as chrome.
 *
 * Roots:
 *   #metrics                  author sentence with [data-metric] spans (home)
 *   #works-filter[data-openalex-author]  works list: fills each `.bib-entry[data-doi] [data-cites]`
 *                             link in the sources row ("n citations", to the work page's
 *                             #cited-by) from one /works request for the author.
 *   #cite-years               home: citations per year as lollipops, binned by the year
 *                             the CITING work appeared (OpenAlex's counts_by_year bins by
 *                             the cited work's year). Same counting as Glance's
 *                             openalex_cache.py: a citing work adds one per work of mine
 *                             it references, so the total matches cited_by_count.
 * Responses are cached via cache.js.
 */
import { getCache, setCache } from "./cache.js";

const sentence = document.getElementById("metrics");
const worksList = document.querySelector("#works-filter[data-openalex-author]");
const citeYears = document.getElementById("cite-years");

function authorPath(raw, fallback = "A5065083669") {
  const value = (raw || "").trim();
  if (!value) return fallback;
  if (/^A\d+$/i.test(value)) return value.toUpperCase();
  if (/^https?:\/\/openalex\.org\/A\d+$/i.test(value)) return value.split("/").pop().toUpperCase();
  const orcid = value.replace(/^https?:\/\/orcid\.org\//i, "");
  if (/^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/i.test(orcid)) return `orcid:${orcid}`;
  return value;
}

if (sentence) {
  const author = authorPath(sentence.dataset.openalexAuthor);

  function pick(data) {
    return {
      cited_by_count: data.cited_by_count ?? 0,
      works_count: data.works_count ?? 0,
      h_index: data.summary_stats?.h_index ?? 0,
      i10_index: data.summary_stats?.i10_index ?? 0,
      /* Canonical author page, e.g. https://openalex.org/A5065083669. The template
         ships an orcid-prefixed fallback href; this is the one to link when we have it. */
      id: typeof data.id === "string" ? data.id : "",
    };
  }

  function render(metrics) {
    for (const span of sentence.querySelectorAll("[data-metric]")) {
      const key = span.dataset.metric;
      if (key in metrics) span.textContent = Number(metrics[key]).toLocaleString();
    }
    /* Entries cached before this field existed have no id; the fallback href stands. */
    if (metrics.id && /^https:\/\/openalex\.org\/\w+$/.test(metrics.id)) {
      const link = sentence.querySelector("[data-openalex-link]");
      if (link) link.href = metrics.id;
    }
    sentence.hidden = false;
  }

  (async () => {
    const cacheKey = `openalex-author-${author}`;
    const cached = getCache(cacheKey);
    if (cached) return render(cached);
    try {
      const response = await fetch(`https://api.openalex.org/authors/${author}`);
      if (!response.ok) throw new Error(`OpenAlex ${response.status}`);
      const metrics = pick(await response.json());
      setCache(cacheKey, metrics);
      render(metrics);
    } catch (err) {
      console.debug("openalex: author request failed", err);
    }
  })();
}

if (worksList) {
  const author = authorPath(worksList.dataset.openalexAuthor);
  const entries = Array.from(document.querySelectorAll(".bib-entry[data-doi]"));
  const tN = worksList.dataset.citedN || "N citations";
  const tOne = worksList.dataset.citedOne || "1 citation";
  const tZero = worksList.dataset.citedZero || "Not yet cited";

  function label(n) {
    if (n === 0) return tZero;
    if (n === 1) return tOne;
    return tN.replace("N", Number(n).toLocaleString());
  }

  function render(map) {
    for (const entry of entries) {
      const doi = (entry.dataset.doi || "").toLowerCase();
      if (!(doi in map) || !map[doi]) continue;
      const slot = entry.querySelector("[data-cites]");
      if (!slot) continue;
      slot.textContent = label(map[doi]);
      slot.hidden = false;
    }
  }

  (async () => {
    if (!entries.length) return;
    const cacheKey = `openalex-works-${author}`;
    const cached = getCache(cacheKey);
    if (cached) return render(cached);
    try {
      const filter = author.startsWith("orcid:") ? `author.orcid:${author.slice(6)}` : `author.id:${author}`;
      const url = `https://api.openalex.org/works?filter=${encodeURIComponent(filter)}&per-page=100&select=doi,cited_by_count`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`OpenAlex ${response.status}`);
      const data = await response.json();
      const map = {};
      for (const w of data.results || []) {
        if (!w.doi) continue;
        map[w.doi.replace(/^https?:\/\/doi\.org\//i, "").toLowerCase()] = w.cited_by_count ?? 0;
      }
      setCache(cacheKey, map);
      render(map);
    } catch (err) {
      console.debug("openalex: works request failed", err);
    }
  })();
}

if (citeYears) {
  const author = authorPath(citeYears.dataset.openalexAuthor);
  const list = citeYears.querySelector(".citeyears-years");
  const t = citeYears.dataset;
  const API = "https://api.openalex.org";
  const short = (url) => (url || "").split("/").pop();

  /* Cursor paging; OpenAlex caps per-page at 200. */
  async function allPages(params) {
    let cursor = "*";
    const out = [];
    while (cursor) {
      const q = new URLSearchParams({ ...params, "per-page": "200", cursor });
      const response = await fetch(`${API}/works?${q}`);
      if (!response.ok) throw new Error(`OpenAlex ${response.status}`);
      const page = await response.json();
      out.push(...(page.results || []));
      cursor = page.meta?.next_cursor || null;
    }
    return out;
  }

  async function build() {
    const who = author.startsWith("orcid:") ? `author.orcid:${author.slice(6)}` : `author.id:${author}`;
    const mine = await allPages({ filter: who, select: "id,title,publication_year" });
    const titles = Object.fromEntries(mine.map((w) => [short(w.id), (w.title || "").replace(/\s+/g, " ").trim()]));
    const ids = Object.keys(titles);
    const citing = new Map();
    for (let i = 0; i < ids.length; i += 50) {
      const batch = await allPages({
        filter: `cites:${ids.slice(i, i + 50).join("|")}`,
        select: "id,publication_year,referenced_works",
      });
      for (const c of batch) citing.set(c.id, c);
    }
    /* year -> { count, per: { workId: hits } } */
    const byYear = {};
    for (const c of citing.values()) {
      const y = c.publication_year;
      if (!y) continue;
      for (const r of c.referenced_works || []) {
        const id = short(r);
        if (!(id in titles)) continue;
        const slot = (byYear[y] ??= { count: 0, per: {} });
        slot.count += 1;
        slot.per[id] = (slot.per[id] || 0) + 1;
      }
    }
    const now = new Date().getFullYear();
    /* Start at the year of the earliest citation: years before it are empty by
       definition and would only push the data sideways. */
    const first = Math.min(now, ...Object.keys(byYear).map(Number));
    const years = [];
    for (let y = first; y <= now; y++) {
      const slot = byYear[y] || { count: 0, per: {} };
      const [topId, topN] = Object.entries(slot.per).sort((a, b) => b[1] - a[1])[0] || [];
      years.push({ year: y, count: slot.count, top: topId ? { title: titles[topId], n: topN } : null });
    }
    return { years, ids };
  }

  function el(tag, cls, text) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }

  function countLabel(n) {
    if (n === 0) return t.zero || "No citations";
    if (n === 1) return t.one || "1 citation";
    return (t.n || "N citations").replace("N", Number(n).toLocaleString());
  }

  function render({ years, ids }) {
    if (!years.length) return;
    const now = new Date().getFullYear();
    const peak = Math.max(1, ...years.map((y) => y.count));
    const cites = ids.map((id) => id.toLowerCase()).join("|");
    list.replaceChildren(...years.map(({ year, count, top }) => {
      const current = year === now;
      const head = `${year} · ${countLabel(count)}${current ? ` ${t.soFar || "so far"}` : ""}`;
      const li = el("li", `citeyears-year${current ? " is-now" : ""}${count ? "" : " is-zero"}`);
      li.style.setProperty("--v", (count / peak).toFixed(3));
      /* Each column opens that year's citing works on OpenAlex. */
      const a = el("a");
      a.href = `https://openalex.org/works?page=1&filter=cites:${cites},publication_year:${year}&sort=publication_date:desc`;
      a.target = "_blank";
      a.rel = "noreferrer noopener";
      const topLine = top ? (t.top || "Most cited: __T__ (__N__)").replace("__N__", top.n).replace("__T__", top.title) : "";
      a.setAttribute("aria-label", topLine ? `${head}. ${topLine}` : head);
      a.append(el("span", "citeyears-n", count ? Number(count).toLocaleString() : "0"), el("span", "citeyears-stem"));
      const tip = el("span", "citeyears-tip", head);
      tip.setAttribute("aria-hidden", "true");
      if (topLine) tip.append(el("span", "citeyears-tip-title", topLine));
      const y = el("span", "citeyears-y meta", String(year));
      li.append(a, y, tip);
      return li;
    }));
    /* The slanted labels carry only the year, as on the authorship chart; the
       caption says which mark is the unfinished year. */
    const cap = citeYears.querySelector("figcaption");
    if (years.some((y) => y.year === now)) {
      cap.textContent = `${cap.dataset.base || cap.textContent}. ${(t.soFarNote || "Open dot: __Y__ so far").replace("__Y__", now)}.`;
    }
    citeYears.hidden = false;
    /* Open at the newest year; earlier years are a scroll to the left. */
    const scroller = citeYears.querySelector(".citeyears-scroll");
    scroller.scrollLeft = scroller.scrollWidth;
  }

  (async () => {
    const cacheKey = `openalex-citeyears-${author}`;
    const cached = getCache(cacheKey);
    if (cached) return render(cached);
    try {
      const data = await build();
      setCache(cacheKey, data);
      render(data);
    } catch (err) {
      console.debug("openalex: citation years failed", err);
    }
  })();
}
