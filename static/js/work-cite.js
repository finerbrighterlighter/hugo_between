/**
 * work-cite.js — "Cite this paper" disclosure on a work page.
 *
 * Root: details.cite[data-doi]. On the first open it fetches BibTeX from
 * doi.org (Accept: application/x-bibtex), caches it as `bibtex-<doi>` via
 * cache.js, and renders it in the chosen format: BibTeX (prettified with
 * highlight spans), NLM, APA or AMA. Copy uses the visible text; the .bib
 * download is the raw doi.org string; .ris is derived from the parsed fields.
 */
import { getCache, setCache } from "./cache.js";

const details = document.querySelector("details.cite[data-doi]");
if (details && details.dataset.doi) {
  const doi = details.dataset.doi.trim();
  const status = details.querySelector(".cite-status");
  const output = details.querySelector(".cite-output");
  const formatButtons = Array.from(details.querySelectorAll(".cite-formats [data-format]"));
  const copyButton = details.querySelector('[data-action="copy"]');
  const bibButton = details.querySelector('[data-action="bib"]');
  const risButton = details.querySelector('[data-action="ris"]');

  const STATUS_FETCHING = "Fetching from doi.org…";
  const STATUS_ERROR = "doi.org did not return a citation for this entry.";

  let currentFormat = formatButtons.find((b) => b.getAttribute("aria-pressed") === "true")?.dataset.format || "bibtex";
  let rawBibTeX = "";
  let parsedFields = null;
  let fetched = false;
  let fetching = false;

  /* ── Helpers ──────────────────────────────────────────────────── */

  /* Remove LaTeX brace groups: {COVID-19} → COVID-19 */
  function clean(s) {
    return (s || "").replace(/\{([^{}]*)\}/g, "$1").trim();
  }

  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  const tok = (cls, s) => `<span class="${cls}">${s}</span>`;
  const KEY = (s) => tok("tok-key", s);
  const PUNCT = (s) => tok("tok-punct", s);
  const TITLE = (s) => tok("tok-title", s);
  const JOURNAL = (s) => tok("tok-journal", s);
  const AUTHOR = (s) => tok("tok-author", s);

  function parseAuthor(raw) {
    const trimmed = clean(raw).trim();
    if (trimmed.includes(",")) {
      const [last, rest = ""] = trimmed.split(",");
      const firsts = rest.trim().split(/\s+/).filter(Boolean);
      return { last: last.trim(), firsts };
    }
    const wordsList = trimmed.split(/\s+/);
    return { last: wordsList.at(-1), firsts: wordsList.slice(0, -1) };
  }

  /* Last FM  (NLM / AMA) */
  function fmtNLM({ last, firsts }) {
    return last + (firsts.length ? " " + firsts.map((f) => f[0].toUpperCase()).join("") : "");
  }

  /* Last, F. M.  (APA) */
  function fmtAPA({ last, firsts }) {
    return last + (firsts.length ? ", " + firsts.map((f) => f[0].toUpperCase() + ".").join(" ") : "");
  }

  function authorList(field, fmt, limit, etAl = "et al.") {
    const raw = (field || "").split(/\s+and\s+/i).map((a) => parseAuthor(a));
    const kept = raw.length > limit ? raw.slice(0, limit) : raw;
    const names = kept.map(fmt);
    if (raw.length > limit) names.push(etAl);
    return names;
  }

  /* ── Citation formatters ───────────────────────────────────────── */

  function fmtCiteNLM(f) {
    const authors = authorList(f.author, fmtNLM, Infinity).join(", ");
    const pages = (f.pages || "").replace(/--?/, "-");
    let s = "";
    if (authors) s += AUTHOR(esc(authors) + ". ");
    s += TITLE(esc(clean(f.title))) + ". ";
    s += JOURNAL(esc(clean(f.journal))) + ". ";
    s += PUNCT(esc(f.year || ""));
    if (f.volume) s += PUNCT(";" + esc(f.volume));
    if (f.number) s += PUNCT("(" + esc(f.number) + ")");
    if (pages) s += PUNCT(":" + esc(pages));
    s += PUNCT(".");
    if (f.doi) s += " " + PUNCT("doi: " + esc(f.doi));
    return s;
  }

  function fmtCiteAMA(f) {
    const raw = (f.author || "").split(/\s+and\s+/i).map((a) => parseAuthor(a));
    const names = raw.length > 6
      ? raw.slice(0, 3).map(fmtNLM).join(", ") + ", et al."
      : raw.map(fmtNLM).join(", ");
    const pages = (f.pages || "").replace(/--?/, "-");
    let s = "";
    if (names) s += AUTHOR(esc(names) + ". ");
    s += TITLE(esc(clean(f.title))) + ". ";
    s += JOURNAL(esc(clean(f.journal))) + ". ";
    s += PUNCT(esc(f.year || ""));
    if (f.volume) s += PUNCT(";" + esc(f.volume));
    if (f.number) s += PUNCT("(" + esc(f.number) + ")");
    if (pages) s += PUNCT(":" + esc(pages));
    s += PUNCT(".");
    if (f.doi) s += " " + PUNCT("doi:" + esc(f.doi));
    return s;
  }

  function fmtCiteAPA(f) {
    const raw = (f.author || "").split(/\s+and\s+/i).map((a) => parseAuthor(a));
    let authorStr;
    if (raw.length > 20) {
      authorStr = raw.slice(0, 19).map(fmtAPA).join(", ") + ", … " + fmtAPA(raw.at(-1));
    } else if (raw.length > 1) {
      authorStr = raw.slice(0, -1).map(fmtAPA).join(", ") + ", & " + fmtAPA(raw.at(-1));
    } else {
      authorStr = raw.map(fmtAPA).join("");
    }
    const pages = (f.pages || "").replace(/--?/, "–");
    let s = "";
    if (authorStr) s += AUTHOR(esc(authorStr) + " ");
    s += PUNCT("(" + esc(f.year || "") + "). ");
    s += TITLE(esc(clean(f.title))) + ". ";
    s += JOURNAL(esc(clean(f.journal)));
    if (f.volume) s += PUNCT(", " + esc(f.volume));
    if (f.number) s += PUNCT("(" + esc(f.number) + ")");
    if (pages) s += PUNCT(", " + esc(pages));
    s += PUNCT(".");
    if (f.doi) s += " " + PUNCT("https://doi.org/" + esc(f.doi));
    return s;
  }

  /* ── BibTeX parser (for RIS + citation formatters) ─────────────── */

  function parseBibTeX(src) {
    const m = src.match(/@(\w+)\s*\{([^,]+),/);
    if (!m) return null;
    const type = m[1].toLowerCase();
    const key = m[2].trim();
    const fields = {};
    const body = src.slice(src.indexOf(",") + 1);
    let i = 0;
    while (i < body.length) {
      while (i < body.length && /[\s,]/.test(body[i])) i++;
      if (i >= body.length) break;
      const eq = body.indexOf("=", i);
      if (eq === -1) break;
      const name = body.slice(i, eq).trim().toLowerCase();
      i = eq + 1;
      while (i < body.length && /\s/.test(body[i])) i++;
      let value = "";
      if (body[i] === "{") {
        let depth = 0;
        const start = i + 1;
        while (i < body.length) {
          if (body[i] === "{") depth++;
          else if (body[i] === "}") {
            depth--;
            if (depth === 0) {
              value = body.slice(start, i);
              i++;
              break;
            }
          }
          i++;
        }
      } else if (body[i] === '"') {
        const start = ++i;
        while (i < body.length && body[i] !== '"') i++;
        value = body.slice(start, i++);
      } else {
        const start = i;
        while (i < body.length && body[i] !== "," && body[i] !== "}") i++;
        value = body.slice(start, i).trim();
      }
      if (name) fields[name] = value;
    }
    return { type, key, fields };
  }

  /* ── BibTeX prettifier (display only; copy uses the visible text) ── */

  const BIBTEX_FIELD_ORDER = [
    "title", "author", "journal", "booktitle", "year", "month",
    "volume", "number", "pages", "doi", "url", "publisher", "issn",
    "abstract", "keywords", "editor", "note",
  ];
  const VALUE_TOKEN = { title: TITLE, journal: JOURNAL, booktitle: JOURNAL, author: AUTHOR, editor: AUTHOR };

  function prettifyBibTeX(src) {
    const p = parseBibTeX(src);
    if (!p) return esc(src);
    const { type, key, fields: f } = p;
    const known = BIBTEX_FIELD_ORDER.filter((k) => f[k] !== undefined);
    const rest = Object.keys(f).filter((k) => !BIBTEX_FIELD_ORDER.includes(k));
    const ordered = [...known, ...rest];
    const pad = Math.max(...ordered.map((k) => k.length));
    const lines = [`${PUNCT("@")}${KEY(esc(type))}${PUNCT("{" + esc(key) + ",")}`];
    ordered.forEach((k) => {
      const wrap = VALUE_TOKEN[k] || ((s) => s);
      lines.push(`  ${KEY(esc(k.padEnd(pad)))} ${PUNCT("=")} ${PUNCT("{")}${wrap(esc(f[k]))}${PUNCT("},")}`);
    });
    lines.push(PUNCT("}"));
    return lines.join("\n");
  }

  /* ── BibTeX → RIS (for download) ───────────────────────────────── */

  function bibtexToRIS(src) {
    const p = parseBibTeX(src);
    if (!p) return null;
    const { type, key, fields: f } = p;
    const typeMap = {
      article: "JOUR", inproceedings: "CONF", conference: "CONF",
      book: "BOOK", incollection: "CHAP", phdthesis: "THES",
      mastersthesis: "THES", techreport: "RPRT", misc: "GEN",
      unpublished: "UNPB", preprint: "UNPB",
    };
    const lines = [`TY  - ${typeMap[type] ?? "GEN"}`];
    if (f.title) lines.push(`TI  - ${clean(f.title)}`);
    if (f.author) f.author.split(/\s+and\s+/i).forEach((a) => lines.push(`AU  - ${clean(a)}`));
    if (f.editor) f.editor.split(/\s+and\s+/i).forEach((e) => lines.push(`ED  - ${clean(e)}`));
    if (f.journal) lines.push(`JO  - ${clean(f.journal)}`);
    if (f.booktitle) lines.push(`T2  - ${clean(f.booktitle)}`);
    if (f.year) lines.push(`PY  - ${f.year}`);
    if (f.volume) lines.push(`VL  - ${f.volume}`);
    if (f.number) lines.push(`IS  - ${f.number}`);
    if (f.pages) {
      const [sp, ep] = f.pages.split(/--?/);
      lines.push(`SP  - ${sp.trim()}`);
      if (ep) lines.push(`EP  - ${ep.trim()}`);
    }
    if (f.doi) lines.push(`DO  - ${f.doi}`);
    if (f.url) lines.push(`UR  - ${f.url}`);
    if (f.abstract) lines.push(`AB  - ${clean(f.abstract)}`);
    if (f.publisher) lines.push(`PB  - ${clean(f.publisher)}`);
    if (f.issn) lines.push(`SN  - ${f.issn}`);
    if (f.keywords) f.keywords.split(/[;,]/).forEach((kw) => { if (kw.trim()) lines.push(`KW  - ${clean(kw)}`); });
    lines.push("ER  - ");
    return { ris: lines.join("\r\n"), key };
  }

  /* ── Rendering ─────────────────────────────────────────────────── */

  function setStatus(text) {
    if (status) status.textContent = text;
  }

  function setFormat(format) {
    currentFormat = format;
    for (const button of formatButtons) {
      button.setAttribute("aria-pressed", String(button.dataset.format === format));
    }
    if (!output || !rawBibTeX) return;

    if (format === "bibtex" || !parsedFields) {
      output.innerHTML = prettifyBibTeX(rawBibTeX);
      return;
    }
    switch (format) {
      case "nlm": output.innerHTML = fmtCiteNLM(parsedFields); break;
      case "ama": output.innerHTML = fmtCiteAMA(parsedFields); break;
      case "apa": output.innerHTML = fmtCiteAPA(parsedFields); break;
      default: output.innerHTML = prettifyBibTeX(rawBibTeX);
    }
  }

  function setActionsEnabled(enabled) {
    for (const button of [copyButton, bibButton, risButton]) {
      if (button) button.disabled = !enabled;
    }
  }

  function download(text, type, filename) {
    const blob = new Blob([text], { type });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement("a"), { href: url, download: filename });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /* ── Fetch on first open ───────────────────────────────────────── */

  async function ensureFetched() {
    if (fetched || fetching) return;
    fetching = true;
    setStatus(STATUS_FETCHING);
    try {
      const cached = getCache(`bibtex-${doi}`);
      if (typeof cached === "string" && cached) {
        rawBibTeX = cached;
      } else {
        const response = await fetch(`https://doi.org/${doi}`, { headers: { Accept: "application/x-bibtex" } });
        if (!response.ok) throw new Error(`doi.org ${response.status}`);
        rawBibTeX = (await response.text()).trim();
        if (!rawBibTeX) throw new Error("doi.org returned an empty body");
        setCache(`bibtex-${doi}`, rawBibTeX);
      }
      parsedFields = parseBibTeX(rawBibTeX)?.fields ?? null;
      fetched = true;
      setStatus("");
      setActionsEnabled(true);
      setFormat(currentFormat);
    } catch (err) {
      console.debug("work-cite: fetch failed", err);
      setStatus(STATUS_ERROR);
    } finally {
      fetching = false;
    }
  }

  details.addEventListener("toggle", () => {
    if (details.open) ensureFetched();
  });
  if (details.open) ensureFetched();

  for (const button of formatButtons) {
    button.addEventListener("click", () => setFormat(button.dataset.format));
  }

  copyButton?.addEventListener("click", async () => {
    if (!output) return;
    const text = output.textContent;
    try {
      await navigator.clipboard.writeText(text);
      const label = copyButton.textContent;
      copyButton.textContent = "Copied";
      setTimeout(() => { copyButton.textContent = label; }, 2000);
    } catch (err) {
      console.debug("work-cite: copy failed", err);
    }
  });

  bibButton?.addEventListener("click", () => {
    if (!rawBibTeX) return;
    const key = parseBibTeX(rawBibTeX)?.key || doi.replace(/[^\w.-]+/g, "_");
    download(rawBibTeX, "application/x-bibtex", `${key}.bib`);
  });

  risButton?.addEventListener("click", () => {
    if (!rawBibTeX) return;
    const result = bibtexToRIS(rawBibTeX);
    if (!result) return;
    download(result.ris, "application/x-research-info-systems", `${result.key}.ris`);
  });

  setFormat(currentFormat);
}
