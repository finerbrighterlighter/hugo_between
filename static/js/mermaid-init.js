/**
 * mermaid-init.js — renders ```mermaid fences on posts with `mermaid: true`.
 *
 * Self-gates on `pre code.language-mermaid`; Mermaid is only imported from
 * jsDelivr (pinned major) when a diagram exists. Colours are read from the
 * page's computed styles (body background and text, link colour) so the
 * diagrams follow the active theme, and re-render on `theme-changed`.
 */

const fences = document.querySelectorAll("pre code.language-mermaid");
if (fences.length) {
  const MERMAID_URL = "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs";
  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

  fences.forEach((code, i) => {
    const div = document.createElement("div");
    div.id = `mermaid-${i}`;
    div.className = "mermaid";
    div.dataset.mermaidSrc = code.textContent;
    code.parentElement.replaceWith(div);
  });

  function palette() {
    const bodyStyle = getComputedStyle(document.body);
    const link = document.querySelector(".post-body a, main a, a");
    const accent = link ? getComputedStyle(link).color : bodyStyle.color;
    return {
      background: bodyStyle.backgroundColor,
      primaryColor: bodyStyle.backgroundColor,
      primaryBorderColor: bodyStyle.color,
      primaryTextColor: bodyStyle.color,
      lineColor: accent,
      edgeLabelBackground: bodyStyle.backgroundColor,
      fontFamily: bodyStyle.fontFamily,
      fontSize: bodyStyle.fontSize,
    };
  }

  async function renderAll(mermaid) {
    mermaid.initialize({ startOnLoad: false, theme: "base", themeVariables: palette() });
    for (const el of document.querySelectorAll("[data-mermaid-src]")) {
      try {
        const { svg } = await mermaid.render(`${el.id}-svg`, el.dataset.mermaidSrc);
        el.innerHTML = svg;
      } catch (err) {
        console.debug("mermaid-init: render failed", el.id, err);
      }
    }
  }

  import(MERMAID_URL)
    .then((mod) => {
      const mermaid = mod.default;
      renderAll(mermaid);
      document.addEventListener("theme-changed", () => renderAll(mermaid));
    })
    .catch((err) => console.debug("mermaid-init: import failed", err));
}
