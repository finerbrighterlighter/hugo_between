/**
 * anilist.js — manga cover strip (AniList).
 *
 * Root: #strip-manga. "Recent" means the user's list entries sorted by
 * UPDATED_TIME_DESC across every status except PLANNING, so a title that
 * was just finished or dropped still appears. Cached via cache.js.
 */
import { getCache, setCache } from "./cache.js";
import { limitFor, renderCovers, showEmpty } from "./covers.js";

const list = document.getElementById("strip-manga");
if (list) {
  const ANILIST_URL = "https://graphql.anilist.co";
  const USER = window.CONFIG?.anilistUser || "finer";
  const LIMIT = limitFor(list, window.CONFIG?.mangaLimit ?? 6);

  const STATUS_LABEL = {
    CURRENT: "Reading",
    REPEATING: "Rereading",
    COMPLETED: "Finished",
    DROPPED: "Dropped",
    PAUSED: "Paused",
  };

  const QUERY = `
query ($name: String, $perPage: Int) {
  manga: Page(perPage: $perPage) {
    mediaList(userName: $name, type: MANGA, status_not: PLANNING, sort: UPDATED_TIME_DESC) {
      status
      progress
      media {
        siteUrl
        chapters
        coverImage { large medium }
        title { romaji english }
      }
    }
  }
}`;

  function metaFor(entry, total) {
    if (entry.progress) {
      return total ? `Chapter ${entry.progress} of ${total}` : `Chapter ${entry.progress}`;
    }
    return STATUS_LABEL[entry.status] || "";
  }

  function toItems(data) {
    const entries = data?.data?.manga?.mediaList || [];
    return entries.slice(0, LIMIT).map((entry) => {
      const work = entry.media || {};
      const title = work.title?.english || work.title?.romaji || "";
      return {
        href: work.siteUrl,
        image: work.coverImage?.large || work.coverImage?.medium,
        alt: "",
        title,
        meta: metaFor(entry, work.chapters),
        width: 230,
        height: 326,
      };
    });
  }

  async function load() {
    const cacheKey = `anilist-${USER}-manga-${LIMIT}`;
    const cached = getCache(cacheKey);
    if (cached) {
      renderCovers(list, cached);
      return;
    }

    try {
      const response = await fetch(ANILIST_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ query: QUERY, variables: { name: USER, perPage: LIMIT } }),
      });
      if (!response.ok) throw new Error(`AniList ${response.status}`);
      const data = await response.json();
      if (data.errors?.length) throw new Error(data.errors[0].message);
      const items = toItems(data);
      setCache(cacheKey, items);
      renderCovers(list, items);
    } catch (err) {
      console.debug("anilist: request failed", err);
      showEmpty(list);
    }
  }

  load();
}
