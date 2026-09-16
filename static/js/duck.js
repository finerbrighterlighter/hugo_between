/**
 * duck.js — portrait surprise.
 *
 * Root: button#portrait. On press the button gets `.is-duck` for about
 * 1.2 s (CSS does the crossfade between .portrait-photo and .portrait-duck)
 * and a quack plays from a three-voice pool so rapid presses overlap.
 * Under prefers-reduced-motion the swap still happens, without animation.
 */

const button = document.getElementById("portrait");
if (button) {
  const duck = button.querySelector(".portrait-duck");
  const source = document.getElementById("quack");
  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)");
  const HOLD_MS = 1200;
  const POOL_SIZE = 3;

  const pool = [];
  if (source?.getAttribute("src")) {
    for (let i = 0; i < POOL_SIZE; i += 1) {
      const audio = new Audio(source.getAttribute("src"));
      audio.preload = "none";
      pool.push(audio);
    }
  }
  let cursor = 0;
  let timer = null;

  function quack() {
    if (!pool.length) return;
    const audio = pool[cursor];
    cursor = (cursor + 1) % pool.length;
    try {
      audio.currentTime = 0;
    } catch {
      /* not yet loaded */
    }
    audio.play().catch(() => {});
  }

  button.addEventListener("click", () => {
    if (duck) duck.hidden = false;
    if (reducedMotion?.matches) button.classList.add("no-motion");
    else button.classList.remove("no-motion");

    button.classList.add("is-duck");
    clearTimeout(timer);
    timer = setTimeout(() => button.classList.remove("is-duck"), HOLD_MS);

    quack();
  });
}
