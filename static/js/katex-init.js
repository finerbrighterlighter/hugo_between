/**
 * katex-init.js — runs KaTeX auto-render on posts with `math: true`.
 *
 * Expects the self-hosted katex.min.js and contrib/auto-render.min.js to be
 * loaded before this module (deferred classic scripts and module scripts
 * both run after parsing, in document order). Delimiters mirror the
 * goldmark passthrough config in hugo.toml.
 */

const body = document.querySelector(".post-body") || document.body;
if (typeof window.renderMathInElement === "function") {
  try {
    window.renderMathInElement(body, {
      delimiters: [
        { left: "$$", right: "$$", display: true },
        { left: "$", right: "$", display: false },
      ],
      throwOnError: false,
    });
  } catch (err) {
    console.debug("katex-init: render failed", err);
  }
} else {
  console.debug("katex-init: renderMathInElement is not available");
}
