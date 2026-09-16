/**
 * privacy.js — "Clear cached data" button on the privacy page.
 *
 * Root: [data-cache-flush]. Flushes every cache.js entry plus any stray
 * `bibtex-*` keys; the `theme` preference is left untouched. The sibling
 * [data-cache-status] reads "Cleared." for three seconds.
 */
import { clearSiteStorage } from "./cache.js";

const button = document.querySelector("[data-cache-flush]");
if (button) {
  const status = document.querySelector("[data-cache-status]");
  let timer = null;

  button.addEventListener("click", () => {
    try {
      clearSiteStorage();
    } catch (err) {
      console.debug("privacy: flush failed", err);
      return;
    }
    if (!status) return;
    status.textContent = "Cleared.";
    clearTimeout(timer);
    timer = setTimeout(() => {
      status.textContent = "";
    }, 3000);
  });
}
