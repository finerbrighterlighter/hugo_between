/**
 * openalex.js — OpenAlex data as text, never as chrome.
 *
 * Roots:
 *   #metrics                  author sentence with [data-metric] spans (home)
 *   #works-filter[data-openalex-author]  works list: fills each `.bib-entry[data-doi] [data-cites]`
 *                             with "Cited n times" from one /works request for the author.
 * Responses are cached via cache.js.
 */
import { getCache, setCache } from "./cache.js";

const sentence = document.getElementById("metrics");
const worksList = document.querySelector("#works-filter[data-openalex-author]");

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
    };
  }

  function render(metrics) {
    for (const span of sentence.querySelectorAll("[data-metric]")) {
      const key = span.dataset.metric;
      if (key in metrics) span.textContent = Number(metrics[key]).toLocaleString();
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
  const tN = worksList.dataset.citedN || "Cited N times";
  const tOne = worksList.dataset.citedOne || "Cited once";
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
