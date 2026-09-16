/**
 * unsplash.js — latest photo uploads cover strip (Unsplash).
 *
 * Root: #strip-photos. Latest uploads for the configured user; meta is the
 * photo location when the API gives one, else the upload month. If the list
 * carries data-profile-url it is ignored here: Hugo renders the profile link.
 */
import { getCache, setCache } from "./cache.js";
import { limitFor, renderCovers, showEmpty } from "./covers.js";

const list = document.getElementById("strip-photos");
if (list) {
  const API = "https://api.unsplash.com";
  const KEY = window.CONFIG?.unsplashKey || "";
  const USER = window.CONFIG?.unsplashUser || "finerbrighterlighter";
  const LIMIT = limitFor(list, window.CONFIG?.photoLimit ?? 6);
  const IMAGE_WIDTH = 400; // Unsplash `small` rendition is 400 px wide

  function monthOf(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en", { month: "long", year: "numeric" });
  }

  function locationOf(photo) {
    const loc = photo.location || {};
    if (loc.name) return loc.name;
    return [loc.city, loc.country].filter(Boolean).join(", ");
  }

  function toItems(data) {
    return data.slice(0, LIMIT).map((photo) => {
      const ratio = photo.width && photo.height ? photo.height / photo.width : 2 / 3;
      return {
        href: photo.links?.html,
        image: photo.urls?.small || photo.urls?.thumb,
        alt: photo.alt_description || "",
        title: photo.description || photo.alt_description || "Untitled photograph",
        meta: locationOf(photo) || monthOf(photo.created_at),
        width: IMAGE_WIDTH,
        height: Math.round(IMAGE_WIDTH * ratio),
      };
    });
  }

  async function load() {
    if (!KEY) {
      console.debug("unsplash: no access key configured");
      showEmpty(list);
      return;
    }

    const cacheKey = `unsplash-${USER}-${LIMIT}`;
    const cached = getCache(cacheKey);
    if (cached !== null) {
      renderCovers(list, cached);
      return;
    }

    try {
      const response = await fetch(
        `${API}/users/${encodeURIComponent(USER)}/photos?per_page=${LIMIT}&order_by=latest`,
        { headers: { Authorization: `Client-ID ${KEY}` } }
      );
      if (!response.ok) throw new Error(`Unsplash ${response.status}`);
      const data = await response.json();
      const items = toItems(Array.isArray(data) ? data : []);
      setCache(cacheKey, items);
      renderCovers(list, items);
    } catch (err) {
      console.debug("unsplash: request failed", err);
      showEmpty(list);
    }
  }

  load();
}
