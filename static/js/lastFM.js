/**
 * lastFM.js — "Meanwhile" now-playing sentence (Last.fm).
 *
 * Root: #now-playing. Fetches the single most recent scrobble (never cached;
 * it changes too often), renders one sentence and polls every 30 s. Playlists
 * are rendered by Hugo, not here.
 */

const element = document.getElementById("now-playing");
if (element) {
  const API_KEY = window.CONFIG?.lastfmKey || "";
  const USER = window.CONFIG?.lastfmUser || "fibrili";
  const POLL_INTERVAL = 30000;

  const url =
    "https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks" +
    `&user=${encodeURIComponent(USER)}` +
    `&api_key=${encodeURIComponent(API_KEY)}` +
    "&limit=1&format=json";

  function whenText(track, nowPlaying) {
    if (nowPlaying) return ", now";
    const uts = Number(track.date?.uts);
    if (!Number.isFinite(uts)) return "";
    const diffMin = Math.max(0, Math.round((Date.now() / 1000 - uts) / 60));
    if (diffMin < 1) return ", just now";
    if (diffMin < 60) return `, ${diffMin} ${diffMin === 1 ? "minute" : "minutes"} ago`;
    const diffH = Math.round(diffMin / 60);
    if (diffH < 24) return `, ${diffH} ${diffH === 1 ? "hour" : "hours"} ago`;
    const played = new Date(uts * 1000);
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const dayDiff = Math.floor((startOfToday - played) / 86400000) + 1;
    if (dayDiff <= 1) return ", yesterday";
    if (dayDiff < 7) return `, ${dayDiff} days ago`;
    return `, on ${played.toLocaleDateString("en", { day: "numeric", month: "long" })}`;
  }

  function render(data) {
    const track = data?.recenttracks?.track?.[0];
    if (!track) {
      if (element.dataset.fallback) element.textContent = element.dataset.fallback;
      return;
    }

    const nowPlaying = track["@attr"]?.nowplaying === "true";
    const artist = track.artist?.["#text"] || track.artist?.name || "";
    const name = track.name || "";

    const link = document.createElement("a");
    link.href = track.url || "#";
    link.target = "_blank";
    link.rel = "noreferrer noopener";
    link.textContent = name;

    const when = document.createElement("span");
    when.className = "np-when";
    when.textContent = whenText(track, nowPlaying);

    element.replaceChildren("Listening to ", link);
    if (artist) element.append(` by ${artist}`);
    element.append(when);
    element.dataset.state = nowPlaying ? "playing" : "recent";
  }

  async function update() {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Last.fm ${response.status}`);
      render(await response.json());
    } catch (err) {
      console.debug("lastFM: request failed", err);
    }
  }

  if (API_KEY) {
    update();
    setInterval(update, POLL_INTERVAL);
  } else {
    console.debug("lastFM: no API key configured");
  }
}
