/**
 * nav_balloon.js — mobile balloon, adapted from hugo_console's nav_bubble.js.
 *
 * Primary function: jump between the sections of the current page. Rows are
 * built from `[data-section]` elements (home) or, failing that, from h2/h3 in
 * `.post-body` / `.works-group` (inner pages). Hidden sections at the current
 * breakpoint are skipped. A small site list (server-rendered) sits below.
 * Behaviour kept from the original: button + role="menu", fade in, click-outside
 * and Escape (returns focus), first row focused on open, active-section
 * highlight via IntersectionObserver. Added: Arrow/Home/End traversal and focus
 * moved to the target after a jump.
 */
const root = document.querySelector("[data-balloon]");
if (root) {
  const bubble = root.querySelector("#balloon-button");
  const menu = root.querySelector("#balloon-menu");
  const sectionsBox = menu.querySelector(".balloon-sections");
  const mobileMQ = window.matchMedia("(max-width: 959px)");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const glyph = bubble.querySelector("span");
  const GLYPH_CLOSED = "≡";
  const GLYPH_OPEN = "×";
  let rows = [];
  let closeTimer = null;
  let observer = null;
  const sectionRows = new Map();

  const visible = (el) => !!(el && el.offsetParent !== null);

  function targets() {
    const marked = Array.from(document.querySelectorAll("main [data-section]")).filter(visible);
    if (marked.length >= 2) return marked.map((el) => ({ el, label: el.dataset.section }));
    const heads = Array.from(document.querySelectorAll(".post-body h2, .works-group h2")).filter(visible);
    if (heads.length >= 2) return heads.map((el) => ({ el, label: (el.firstChild?.textContent || el.textContent).trim().replace(/\s+/g, " ") }));
    return [];
  }

  function makeRow(label, marker, small) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "balloon-row" + (small ? " balloon-small" : "");
    btn.setAttribute("role", "menuitem");
    const text = document.createElement("span");
    text.textContent = label;
    const mark = document.createElement("span");
    mark.className = "balloon-marker";
    mark.setAttribute("aria-hidden", "true");
    mark.textContent = marker;
    btn.append(text, mark);
    return btn;
  }

  function scrollTo(top, then) {
    window.scrollTo({ top, behavior: reducedMotion ? "auto" : "smooth" });
    if (then) setTimeout(then, reducedMotion ? 0 : 450);
  }

  function build() {
    sectionsBox.replaceChildren();
    sectionRows.clear();
    if (observer) observer.disconnect();
    const list = targets();

    const topRow = makeRow(root.dataset.labelTop || "Top", "↑");
    topRow.addEventListener("click", () => {
      closeMenu(true);
      scrollTo(0);
    });
    sectionsBox.appendChild(topRow);

    for (const { el, label } of list) {
      if (!el.id) el.id = "s-" + label.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-");
      const row = makeRow(label, "•");
      row.addEventListener("click", () => {
        closeMenu(false);
        const y = el.getBoundingClientRect().top + window.scrollY - 12;
        scrollTo(Math.max(0, y), () => {
          if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1");
          el.focus({ preventScroll: true });
        });
      });
      sectionsBox.appendChild(row);
      sectionRows.set(el, row);
    }

    /* One rule decides which row is current: the last section whose top has passed
       a line a quarter of the way down the viewport. It runs synchronously when the
       menu is built, so the first focus lands on the current section, and again from
       the observer. Letting the observer pick its own winner from whichever entries
       happened to fire meant the highlight could move off the row that had just been
       focused, so the observer now only says "recompute", never what the answer is. */
    if (list.length) {
      const markCurrent = () => {
        const line = window.scrollY + window.innerHeight * 0.25;
        let active = list[0].el;
        for (const { el } of list) if (el.getBoundingClientRect().top + window.scrollY <= line) active = el;
        for (const [el, row] of sectionRows) row.classList.toggle("is-active", el === active);
      };
      markCurrent();
      observer = new IntersectionObserver(markCurrent, { rootMargin: "0px 0px -60% 0px", threshold: 0 });
      for (const { el } of list) observer.observe(el);
    }

    refreshRows();
  }

  function refreshRows() {
    rows = Array.from(menu.querySelectorAll('[role="menuitem"],[role="menuitemcheckbox"]')).filter((el) => !el.closest(".balloon-more[hidden]"));
  }

  const more = menu.querySelector("[data-more]");
  const moreBox = menu.querySelector("#balloon-more");
  if (more && moreBox) {
    more.addEventListener("click", () => {
      const open = more.getAttribute("aria-expanded") === "true";
      more.setAttribute("aria-expanded", String(!open));
      moreBox.hidden = open;
      refreshRows();
      if (!open) moreBox.querySelector('[role="menuitem"],[role="menuitemcheckbox"]')?.focus();
    });
  }

  function gate() {
    root.hidden = !mobileMQ.matches;
    if (root.hidden && !menu.hidden) closeMenu(false);
  }

  function openMenu() {
    clearTimeout(closeTimer);
    build();
    menu.classList.remove("is-open");
    menu.hidden = false;
    requestAnimationFrame(() => menu.classList.add("is-open"));
    glyph.textContent = GLYPH_OPEN;
    bubble.setAttribute("aria-expanded", "true");
    (menu.querySelector(".balloon-row.is-active") || rows[0])?.focus();
  }

  function closeMenu(returnFocus) {
    clearTimeout(closeTimer);
    menu.classList.remove("is-open");
    glyph.textContent = GLYPH_CLOSED;
    bubble.setAttribute("aria-expanded", "false");
    if (returnFocus) bubble.focus();
    closeTimer = setTimeout(() => { menu.hidden = true; }, reducedMotion ? 0 : 170);
  }

  bubble.addEventListener("click", () => (menu.hidden ? openMenu() : closeMenu(false)));

  document.addEventListener("click", (e) => {
    if (menu.hidden) return;
    if (!bubble.contains(e.target) && !menu.contains(e.target)) closeMenu(false);
  });

  document.addEventListener("keydown", (e) => {
    if (menu.hidden) return;
    if (e.key === "Escape") { e.preventDefault(); closeMenu(true); return; }
    const i = rows.indexOf(document.activeElement);
    if (i === -1) return;
    if (e.key === "ArrowDown") { e.preventDefault(); rows[(i + 1) % rows.length].focus(); }
    if (e.key === "ArrowUp") { e.preventDefault(); rows[(i - 1 + rows.length) % rows.length].focus(); }
    if (e.key === "Home") { e.preventDefault(); rows[0].focus(); }
    if (e.key === "End") { e.preventDefault(); rows[rows.length - 1].focus(); }
    if (e.key === "Tab") closeMenu(false);
  });

  menu.addEventListener("click", (e) => {
    const link = e.target.closest("a.balloon-row");
    if (link) closeMenu(false);
  });

  build();
  gate();
  mobileMQ.addEventListener("change", gate);
}
