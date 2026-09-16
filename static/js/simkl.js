/**
 * simkl.js — screen cover strip: recently watched movies, shows and anime (Simkl).
 *
 * Root: #strip-screen. Fetch strategy: `/sync/all-items?date_from=<14 days ago>`
 * (a few KB) first; only when that yields fewer than LIMIT watched titles fall
 * back to the full library. Anime titles come back romaji, so one
 * `/anime/{id}` detail call per anime item adds the English title. Posters use
 * the simkl.in `_c` size. Result cached via cache.js.
 */
import { getCache, setCache } from "./cache.js";
import { limitFor, renderCovers, showEmpty } from "./covers.js";

const list = document.getElementById("strip-screen");
if (list) {
  const API = "https://api.simkl.com";
  const CLIENT_ID = window.CONFIG?.simklClientId || "";
  const TOKEN = window.CONFIG?.simklToken || "";
  const LIMIT = limitFor(list, window.CONFIG?.screenLimit ?? 10);
  const RECENT_WINDOW_DAYS = 14;
  const APP = "app-name=htunteza-site&app-version=1.0";
  const PATHS = { movies: "movies", shows: "tv", anime: "anime" };

  async function simkl(path, auth = true) {
    const url = `${API}${path}${path.includes("?") ? "&" : "?"}client_id=${CLIENT_ID}&${APP}`;
    const headers = { "Content-Type": "application/json" };
    if (auth) headers.Authorization = `Bearer ${TOKEN}`;
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`Simkl ${res.status} on ${path}`);
    return res.json();
  }

  /* Flatten the three library buckets into one list of watched titles, newest first. */
  function flatten(library) {
    const out = [];
    for (const kind of Object.keys(PATHS)) {
      for (const it of library?.[kind] || []) {
        if (!it.last_watched_at) continue;
        const m = kind === "movies" ? it.movie : it.show;
        if (!m?.ids?.simkl) continue;
        out.push({
          at: it.last_watched_at,
          kind,
          title: m.title,
          year: m.year,
          poster: m.poster,
          simkl: m.ids.simkl,
          slug: m.ids.slug,
          last: it.last_watched || "",
          watched: it.watched_episodes_count,
          total: it.total_episodes_count,
        });
      }
    }
    return out.sort((a, b) => (a.at < b.at ? 1 : -1));
  }

  /* "S05E06" → Season 5, episode 6; anime "S2026E818" → Episode 818. */
  function metaFor(item) {
    if (item.kind === "movies") return item.year ? String(item.year) : "";
    const m = /^S(\d+)E(\d+)$/i.exec(item.last);
    if (item.kind === "anime") {
      if (m) return `Episode ${Number(m[2])}`;
      return item.watched ? `Episode ${item.watched}` : "";
    }
    if (m) return `Season ${Number(m[1])}, episode ${Number(m[2])}`;
    return item.watched ? `${item.watched} ${item.watched === 1 ? "episode" : "episodes"}` : "";
  }

  async function fetchRecent(limit) {
    const since = new Date(Date.now() - RECENT_WINDOW_DAYS * 86400000)
      .toISOString()
      .replace(/\.\d{3}Z$/, "Z");
    let items = flatten(await simkl(`/sync/all-items?date_from=${since}`));
    if (items.length < limit) items = flatten(await simkl("/sync/all-items"));
    const top = items.slice(0, limit);

    /* English titles for anime only; a failed lookup just leaves romaji. */
    const english = await Promise.all(
      top.map((it) =>
        it.kind === "anime"
          ? simkl(`/anime/${it.simkl}?extended=full`, false).then((d) => d?.en_title || "").catch(() => "")
          : Promise.resolve("")
      )
    );

    return top.map((it, i) => ({
      href: `https://simkl.com/${PATHS[it.kind]}/${it.simkl}${it.slug ? `/${it.slug}` : ""}`,
      image: it.poster ? `https://simkl.in/posters/${it.poster}_c.webp` : "",
      alt: "",
      title: english[i] || it.title || "",
      meta: metaFor(it),
      width: 170,
      height: 250,
    }));
  }

  async function load() {
    if (!CLIENT_ID || !TOKEN) {
      console.debug("simkl: HUGO_SIMKL_CLIENT_ID / HUGO_SIMKL_TOKEN not set");
      showEmpty(list);
      return;
    }

    const cacheKey = `simkl-recent-${LIMIT}`;
    const cached = getCache(cacheKey);
    if (cached) {
      renderCovers(list, cached);
      return;
    }

    try {
      const items = await fetchRecent(LIMIT);
      setCache(cacheKey, items);
      renderCovers(list, items);
    } catch (err) {
      console.debug("simkl: request failed", err);
      showEmpty(list);
    }
  }

  load();
}
