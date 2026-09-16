/**
 * cache.js — localStorage cache with a site-wide TTL.
 *
 * Entries live under the `cache:` prefix as `{ __cache: true, ts, data }`.
 * TTL comes from window.CONFIG.cacheTTLMinutes (default 60). Legacy entries
 * written without the prefix are migrated on read. `theme` is a site
 * preference and is never touched by any clear function here.
 */
const TTL = (window.CONFIG?.cacheTTLMinutes ?? 60) * 60 * 1000;
const CACHE_PREFIX = "cache:";
const SITE_PREFERENCE_KEYS = ["theme"];
const EXTRA_CLEAR_PREFIXES = ["bibtex-"];

function storageKey(key) {
  return `${CACHE_PREFIX}${key}`;
}

function parseEntry(raw) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.__cache === true && typeof parsed.ts === "number") return parsed;
    return null;
  } catch {
    return null;
  }
}

function parseLegacyEntry(raw) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed?.ts === "number" && "data" in parsed) {
      return { __cache: true, ts: parsed.ts, data: parsed.data };
    }
    return null;
  } catch {
    return null;
  }
}

function isExpired(ts) {
  return Date.now() - ts > TTL;
}

function isSitePreferenceKey(key) {
  return SITE_PREFERENCE_KEYS.includes(key);
}

function safeKeys() {
  const keys = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) keys.push(key);
    }
  } catch {
    /* storage unavailable */
  }
  return keys;
}

export function listCacheEntries() {
  const entries = [];
  for (const key of safeKeys()) {
    if (!key.startsWith(CACHE_PREFIX)) continue;
    const entry = parseEntry(localStorage.getItem(key));
    if (!entry) continue;
    entries.push({ key, ts: entry.ts, data: entry.data });
  }
  return entries;
}

export function clearCache() {
  for (const entry of listCacheEntries()) {
    localStorage.removeItem(entry.key);
  }
}

function clearLegacyCacheEntries() {
  for (const key of safeKeys()) {
    if (key.startsWith(CACHE_PREFIX) || isSitePreferenceKey(key)) continue;
    const isExtra = EXTRA_CLEAR_PREFIXES.some((prefix) => key.startsWith(prefix));
    if (isExtra || parseLegacyEntry(localStorage.getItem(key))) {
      localStorage.removeItem(key);
    }
  }
}

/* Flush everything this site cached. Preferences (`theme`) are kept. */
export function clearSiteStorage() {
  clearCache();
  clearLegacyCacheEntries();
}

export function getCache(key) {
  try {
    const namespacedKey = storageKey(key);
    const entry = parseEntry(localStorage.getItem(namespacedKey));
    if (entry) {
      if (isExpired(entry.ts)) {
        localStorage.removeItem(namespacedKey);
        return null;
      }
      return entry.data;
    }

    const legacyEntry = parseLegacyEntry(localStorage.getItem(key));
    if (!legacyEntry) return null;

    localStorage.removeItem(key);
    if (isExpired(legacyEntry.ts)) return null;

    localStorage.setItem(namespacedKey, JSON.stringify(legacyEntry));
    return legacyEntry.data;
  } catch {
    return null;
  }
}

export function setCache(key, data) {
  try {
    localStorage.removeItem(key);
    localStorage.setItem(storageKey(key), JSON.stringify({
      __cache: true,
      data,
      ts: Date.now(),
    }));
  } catch (err) {
    console.debug("cache: write skipped", err);
  }
}
