/**
 * theme.js — light/dark toggle for every [data-theme-toggle] button.
 *
 * The head has an inline pre-paint script that sets data-theme on <html>
 * from localStorage `theme` or prefers-color-scheme. This module only
 * handles the buttons: cycle light → dark → light, persist, update the
 * aria-label and dispatch `theme-changed` on document.
 */

const toggles = document.querySelectorAll("[data-theme-toggle]");
if (toggles.length) {
  const root = document.documentElement;

  function current() {
    if (root.dataset.theme === "dark" || root.dataset.theme === "light") return root.dataset.theme;
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  function label(theme, button) {
    const d = button?.dataset || {};
    return theme === "dark" ? d.labelLight || "Switch to light mode" : d.labelDark || "Switch to dark mode";
  }

  function apply(theme, persist) {
    root.dataset.theme = theme;
    for (const button of toggles) {
      button.setAttribute("aria-label", label(theme, button));
      const text = button.querySelector("[data-theme-toggle-text]");
      if (text) text.textContent = label(theme, button);
    }
    if (persist) {
      try {
        localStorage.setItem("theme", theme);
      } catch (err) {
        console.debug("theme: could not persist", err);
      }
    }
    document.dispatchEvent(new CustomEvent("theme-changed", { detail: { theme } }));
  }

  for (const button of toggles) {
    button.setAttribute("aria-label", label(current(), button));
    const text = button.querySelector("[data-theme-toggle-text]");
    if (text) text.textContent = label(current(), button);
    button.addEventListener("click", () => apply(current() === "dark" ? "light" : "dark", true));
  }
}
