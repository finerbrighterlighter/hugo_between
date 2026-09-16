/**
 * works_filter.js — search and tag filtering on the works list page.
 *
 * Root: #works-filter. Text search runs over each entry's data-search
 * haystack (case-insensitive, every word must match). Tag buttons are
 * AND-combined and expose their state through aria-pressed. The current
 * query is mirrored into the URL (?search=…&tags=a,b) with replaceState.
 */

const form = document.getElementById("works-filter");
if (form) {
  const searchInput = document.getElementById("works-search");
  const clearButton = document.getElementById("works-clear");
  const countEl = document.getElementById("works-count");
  const tagButtons = Array.from(form.querySelectorAll(".filter-tag[data-tag]"));
  const entries = Array.from(document.querySelectorAll(".bib-entry"));
  const groups = Array.from(document.querySelectorAll(".works-group"));

  const state = {
    search: "",
    tags: new Set(),
  };

  function words(query) {
    return query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  }

  function readFromURL() {
    const params = new URLSearchParams(window.location.search);
    if (params.has("search")) {
      state.search = params.get("search") || "";
      if (searchInput) searchInput.value = state.search;
    }
    if (params.has("tags")) {
      const known = new Set(tagButtons.map((b) => b.dataset.tag));
      for (const tag of (params.get("tags") || "").split(",")) {
        const t = tag.trim();
        if (t && known.has(t)) state.tags.add(t);
      }
    }
  }

  function writeToURL() {
    const params = new URLSearchParams();
    const search = state.search.trim();
    if (search) params.set("search", search);
    if (state.tags.size) params.set("tags", Array.from(state.tags).join(","));
    const qs = params.toString();
    const target = `${window.location.pathname}${qs ? `?${qs}` : ""}${window.location.hash}`;
    try {
      history.replaceState(null, "", target);
    } catch (err) {
      console.debug("works_filter: replaceState failed", err);
    }
  }

  function syncButtons() {
    for (const button of tagButtons) {
      button.setAttribute("aria-pressed", String(state.tags.has(button.dataset.tag)));
    }
    if (clearButton) clearButton.hidden = !(state.tags.size || state.search.trim());
  }

  function matches(entry, terms) {
    const haystack = (entry.dataset.search || "").toLowerCase();
    if (!terms.every((term) => haystack.includes(term))) return false;
    if (!state.tags.size) return true;
    const tags = new Set((entry.dataset.tags || "").split("|").map((t) => t.trim()).filter(Boolean));
    for (const tag of state.tags) {
      if (!tags.has(tag)) return false;
    }
    return true;
  }

  function apply() {
    const terms = words(state.search);
    let visible = 0;
    for (const entry of entries) {
      const show = matches(entry, terms);
      entry.hidden = !show;
      if (show) visible += 1;
    }
    for (const group of groups) {
      group.hidden = !group.querySelector(".bib-entry:not([hidden])");
    }
    if (countEl) {
      countEl.textContent = `${visible} of ${entries.length} ${entries.length === 1 ? "work" : "works"}`;
    }
    syncButtons();
  }

  function update() {
    writeToURL();
    apply();
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    update();
  });

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      state.search = searchInput.value;
      update();
    });
  }

  for (const button of tagButtons) {
    button.addEventListener("click", () => {
      const tag = button.dataset.tag;
      if (state.tags.has(tag)) state.tags.delete(tag);
      else state.tags.add(tag);
      update();
    });
  }

  if (clearButton) {
    clearButton.addEventListener("click", () => {
      state.search = "";
      state.tags.clear();
      if (searchInput) searchInput.value = "";
      update();
      searchInput?.focus();
    });
  }

  readFromURL();
  apply();
}

// "N more" toggles reveal the long tail of tags inside one facet.
for (const more of document.querySelectorAll("#works-filter [data-more]")) {
  more.dataset.labelMore = more.textContent;
  more.addEventListener("click", () => {
    const group = more.closest(".filter-group");
    const expanded = more.getAttribute("aria-expanded") === "true";
    for (const extra of group.querySelectorAll(".filter-tag.is-extra")) extra.hidden = expanded;
    more.setAttribute("aria-expanded", String(!expanded));
    more.textContent = expanded ? more.dataset.labelMore : "fewer";
  });
}
