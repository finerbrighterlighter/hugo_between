/**
 * lang-return.js — keep a Burmese reader in the Burmese tree on pages that
 * exist only in English (works, credits).
 *
 * A static site cannot know which language a visitor is reading, so two
 * signals stand in for it. Every page in the Burmese tree remembers "mm" in
 * localStorage `lang`; every English page that has a Burmese twin remembers
 * "en", because reading it is a choice. An English-only page then asks for
 * the memory, or for a same-origin referrer under /mm/, and if either says
 * Burmese it points the masthead, footer and balloon links at the Burmese
 * pages named in the `#lang-return-map` JSON the template rendered. Nothing
 * else changes: the page stays English, the struck-out switch stays honest.
 */

const html = document.documentElement;
const KEY = "lang";
const missing = document.querySelector(".lang-switch.is-missing");

try {
  if (html.lang === "my") localStorage.setItem(KEY, "mm");
  else if (html.lang === "en" && !missing) localStorage.setItem(KEY, "en");
} catch (err) {
  console.debug("lang-return: could not persist", err);
}

const mapEl = document.getElementById("lang-return-map");
if (mapEl && html.lang === "en" && missing) {
  let burmese = false;
  try {
    burmese = localStorage.getItem(KEY) === "mm";
  } catch (err) {
    console.debug("lang-return: could not read", err);
  }
  try {
    const ref = document.referrer ? new URL(document.referrer) : null;
    if (ref && ref.origin === location.origin && ref.pathname.startsWith("/mm/")) burmese = true;
  } catch (err) {
    console.debug("lang-return: bad referrer", err);
  }
  if (burmese) {
    try {
      const map = JSON.parse(mapEl.textContent);
      const links = document.querySelectorAll(".masthead a[href], .colophon nav a[href], .balloon a[href]");
      for (const a of links) {
        const to = map[a.getAttribute("href")];
        if (!to) continue;
        a.setAttribute("href", to);
        a.setAttribute("hreflang", "my");
      }
    } catch (err) {
      console.debug("lang-return: map unreadable", err);
    }
  }
}
