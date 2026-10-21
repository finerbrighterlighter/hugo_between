/**
 * work-citation.js — "Cited by" block on a work page (OpenAlex).
 *
 * Root: section[data-citation-count][data-doi]. Looks the work up by DOI,
 * then fetches its newest citing works (max 5, newest first). Writes the
 * count into the heading, renders each citing work as a .bib line (date |
 * title, venue, authors; title links to its DOI) and, past 5, shows a link
 * to the full OpenAlex list. Unhides only when the count is at least one.
 * Cached in localStorage via cache.js.
 */
import { getCache, setCache } from "./cache.js";

const MAX = 5;
const MAX_AUTHORS = 6;
const API = "https://api.openalex.org";

const root = document.querySelector("[data-citation-count][data-doi]");
if (root && root.dataset.doi) {
  const doi = root.dataset.doi.trim();
  const tN = root.dataset.citedN || "Cited N times";
  const tOne = root.dataset.citedOne || "Cited once";

  /* "Htun Teza" -> "Teza H"; OpenAlex display names are given-first. */
  function vancouver(name) {
    const parts = (name || "").trim().split(/\s+/).filter((p) => !/^(dr|prof)\.?$/i.test(p));
    if (parts.length < 2) return parts[0] || "";
    const family = parts.pop();
    const initials = parts.map((p) => p.replace(/[^\p{L}]/gu, "").charAt(0).toUpperCase()).join("");
    return `${family} ${initials}`;
  }

  function pick(work) {
    const names = (work.authorships || []).map((a) => vancouver(a.author?.display_name));
    const authors = names.length > MAX_AUTHORS ? `${names.slice(0, MAX_AUTHORS).join(", ")}, et al.` : names.join(", ");
    return {
      date: work.publication_date || "",
      title: (work.title || "(untitled)").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim(),
      url: work.doi || work.id,
      venue: work.primary_location?.source?.display_name || "",
      authors,
    };
  }

  function el(tag, cls, text) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text) node.textContent = text;
    return node;
  }

  function entry(w) {
    const li = el("li", "bib-entry");
    const time = el("time", "year");
    if (w.date) {
      time.dateTime = w.date;
      time.textContent = new Date(`${w.date}T00:00:00`).toLocaleDateString("en-GB", { month: "short", year: "numeric" });
    }
    const body = el("span");
    const a = el("a", "title", w.title);
    a.href = w.url;
    a.target = "_blank";
    a.rel = "noreferrer noopener";
    body.append(a);
    if (w.venue) body.append(el("span", "venue", w.venue));
    if (w.authors) body.append(el("span", "authors", w.authors));
    li.append(time, body);
    return li;
  }

  function render({ count, workId, works }) {
    if (!(count >= 1)) return;
    const n = Number(count).toLocaleString();
    root.querySelector("h2").textContent = count === 1 ? tOne : tN.replace("N", n);
    root.querySelector("ol").replaceChildren(...works.map(entry));
    const more = root.querySelector(".cited-more");
    if (more && count > works.length) {
      const a = more.querySelector("a");
      if (workId) a.href = `https://openalex.org/works?page=1&filter=referenced_works:${workId.toLowerCase()}`;
      a.textContent = (a.dataset.moreN || "All N citing works on OpenAlex").replace("N", n);
      more.hidden = false;
    }
    root.hidden = false;
  }

  async function getJSON(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`OpenAlex ${response.status}`);
    return response.json();
  }

  async function load() {
    const cacheKey = `openalex-citedby-${doi}`;
    const cached = getCache(cacheKey);
    if (cached !== null) {
      render(cached);
      return;
    }

    try {
      const work = await getJSON(`${API}/works/doi:${encodeURIComponent(doi)}?select=id,cited_by_count`);
      const workId = (work.id ?? "").replace("https://openalex.org/", "");
      let count = work.cited_by_count ?? 0;
      let works = [];
      if (count >= 1 && workId) {
        const params = new URLSearchParams({
          filter: `cites:${workId}`,
          sort: "publication_date:desc",
          "per-page": String(MAX),
          select: "id,doi,title,publication_date,primary_location,authorships",
        });
        const citing = await getJSON(`${API}/works?${params}`);
        works = (citing.results || []).map(pick);
        // The cites filter can run ahead of the cached cited_by_count; trust the larger.
        count = Math.max(count, citing.meta?.count ?? 0);
      }
      const data = { count, workId, works };
      setCache(cacheKey, data);
      render(data);
    } catch (err) {
      console.debug("work-citation: request failed", err);
    }
  }

  load();
}
