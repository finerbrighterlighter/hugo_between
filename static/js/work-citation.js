/**
 * work-citation.js — citation count link on a work page (OpenAlex).
 *
 * Root: [data-citation-count][data-doi]. Fills the inner <span>, points the
 * link at the OpenAlex list of citing works and removes `hidden` when the
 * count is at least one. Cached in localStorage via cache.js.
 */
import { getCache, setCache } from "./cache.js";

const link = document.querySelector("[data-citation-count][data-doi]");
if (link && link.dataset.doi) {
  const doi = link.dataset.doi.trim();

  function render(count, workId) {
    if (!(count >= 1)) return;
    const span = link.querySelector("span");
    if (span) {
      span.textContent = Number(count).toLocaleString();
      const after = span.nextSibling;
      if (count === 1 && after?.nodeType === Node.TEXT_NODE) {
        after.textContent = after.textContent.replace(/\btimes\b/, "time");
      }
    }
    if (workId) link.href = `https://openalex.org/works?filter=cites:${workId}`;
    link.hidden = false;
  }

  async function load() {
    const cacheKey = `openalex-work-${doi}`;
    const cached = getCache(cacheKey);
    if (cached !== null) {
      render(cached.count, cached.workId);
      return;
    }

    try {
      const response = await fetch(`https://api.openalex.org/works/doi:${encodeURIComponent(doi)}`);
      if (!response.ok) throw new Error(`OpenAlex ${response.status}`);
      const data = await response.json();
      const count = data.cited_by_count ?? 0;
      const workId = (data.id ?? "").replace("https://openalex.org/", "");
      setCache(cacheKey, { count, workId });
      render(count, workId);
    } catch (err) {
      console.debug("work-citation: request failed", err);
    }
  }

  load();
}
