/**
 * post_toc.js — builds the post table of contents.
 *
 * Root: nav#toc. Collects h2/h3 headings inside .post-body into a nested
 * list of in-page links. Headings without an id get one from their text.
 * The nav is hidden when fewer than three headings exist.
 */

const nav = document.getElementById("toc");
const body = document.querySelector(".post-body");
if (nav && body) {
  const headings = Array.from(body.querySelectorAll("h2, h3")).filter((h) => h.textContent.trim());
  const MIN_HEADINGS = 3;

  function slugify(text) {
    return text
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-+|-+$/g, "") || "section";
  }

  function ensureId(heading) {
    if (heading.id) return heading.id;
    const base = slugify(heading.textContent);
    let id = base;
    let n = 2;
    while (document.getElementById(id)) id = `${base}-${n++}`;
    heading.id = id;
    return id;
  }

  if (headings.length < MIN_HEADINGS) {
    nav.hidden = true;
  } else {
    const rootList = document.createElement("ol");
    let currentH2Item = null;
    let currentSubList = null;

    for (const heading of headings) {
      const item = document.createElement("li");
      const link = document.createElement("a");
      link.href = `#${ensureId(heading)}`;
      link.textContent = heading.textContent.trim();
      item.append(link);

      if (heading.tagName === "H2" || !currentH2Item) {
        rootList.append(item);
        currentH2Item = item;
        currentSubList = null;
      } else {
        if (!currentSubList) {
          currentSubList = document.createElement("ol");
          currentH2Item.append(currentSubList);
        }
        currentSubList.append(item);
      }
    }

    nav.replaceChildren(rootList);
    nav.hidden = false;
  }
}
