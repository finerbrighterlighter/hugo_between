/**
 * covers.js — shared renderer for the home page cover strips
 * (#strip-manga, #strip-screen, #strip-photos).
 *
 * Each strip is a `<ul class="covers">`; items are appended as
 * `<li class="cover"><a><img><span.cover-title><span.cover-meta></a></li>`.
 * On zero items the list is hidden and the sibling `.covers-empty`
 * placeholder inside the parent section is revealed.
 */

export function limitFor(element, fallback) {
  const raw = Number.parseInt(element.dataset.limit ?? "", 10);
  return Number.isFinite(raw) && raw > 0 ? raw : fallback;
}

export function showEmpty(list) {
  list.hidden = true;
  const section = list.closest("section") ?? list.parentElement;
  const placeholder = section?.querySelector(".covers-empty");
  if (placeholder) placeholder.hidden = false;
}

/**
 * @param {HTMLElement} list  the <ul>
 * @param {Array<{href:string,image:string,alt?:string,title:string,meta?:string,width?:number,height?:number}>} items
 */
export function renderCovers(list, items) {
  const usable = (items || []).filter((it) => it && it.href && it.image);
  if (!usable.length) {
    showEmpty(list);
    return;
  }

  const frag = document.createDocumentFragment();
  for (const item of usable) {
    const li = document.createElement("li");
    li.className = "cover";

    const link = document.createElement("a");
    link.href = item.href;
    link.target = "_blank";
    link.rel = "noreferrer noopener";

    const img = document.createElement("img");
    img.src = item.image;
    img.alt = item.alt || "";
    if (item.width) img.width = item.width;
    if (item.height) img.height = item.height;
    img.loading = "lazy";
    img.decoding = "async";

    const title = document.createElement("span");
    title.className = "cover-title";
    title.textContent = item.title || "";

    link.append(img, title);

    if (item.meta) {
      const meta = document.createElement("span");
      meta.className = "cover-meta";
      meta.textContent = item.meta;
      link.append(meta);
    }

    li.append(link);
    frag.append(li);
  }

  list.replaceChildren(frag);
  list.hidden = false;
}
