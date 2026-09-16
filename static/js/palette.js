/**
 * palette.js — colour-blind-safe palette toggle (Okabe & Ito hues), adapted from
 * hugo_console's Ishihara toggle. State lives on <html data-palette="colorblind">,
 * persisted in localStorage `palette` and pre-painted by theme-init.js. Works on
 * top of either light or dark mode; CSS variables do the rest.
 */
const toggles = document.querySelectorAll("[data-palette-toggle]");
if (toggles.length) {
  const root = document.documentElement;
  const on = () => root.dataset.palette === "colorblind";

  function sync() {
    for (const b of toggles) b.setAttribute("aria-pressed", String(on()));
    document.dispatchEvent(new CustomEvent("palette-changed", { detail: { palette: on() ? "colorblind" : "default" } }));
  }

  for (const b of toggles) {
    b.addEventListener("click", () => {
      if (on()) delete root.dataset.palette;
      else root.dataset.palette = "colorblind";
      try {
        if (on()) localStorage.setItem("palette", "colorblind");
        else localStorage.removeItem("palette");
      } catch (err) {
        console.debug("palette: could not persist", err);
      }
      sync();
    });
  }
  sync();
}
