/**
 * currenttime.js — local clock for every `<time data-clock>`.
 *
 * `<time data-clock data-tz="Asia/Bangkok" data-city="Bangkok">` becomes
 * "14:32 in Bangkok", refreshed on each minute boundary. The `datetime`
 * attribute carries the ISO local time with its UTC offset.
 */

const clocks = document.querySelectorAll("[data-clock]");
if (clocks.length) {
  const formatters = new Map();

  function formatterFor(tz) {
    if (formatters.has(tz)) return formatters.get(tz);
    let entry = null;
    try {
      const options = { timeZone: tz || undefined, hourCycle: "h23" };
      entry = {
        time: new Intl.DateTimeFormat("en-GB", { ...options, hour: "2-digit", minute: "2-digit" }),
        parts: new Intl.DateTimeFormat("en-GB", {
          ...options,
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          timeZoneName: "longOffset",
        }),
      };
    } catch (err) {
      console.debug("currenttime: bad time zone", tz, err);
    }
    formatters.set(tz, entry);
    return entry;
  }

  function isoIn(formatter, now) {
    const get = (type) => formatter.formatToParts(now).find((p) => p.type === type)?.value ?? "";
    const offset = get("timeZoneName").replace(/^GMT|^UTC/, "") || "Z";
    const stamp = `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
    return offset === "Z" ? `${stamp}Z` : `${stamp}${offset}`;
  }

  function tick() {
    const now = new Date();
    for (const el of clocks) {
      const formatter = formatterFor(el.dataset.tz || "");
      if (!formatter) continue;
      const time = formatter.time.format(now);
      const city = el.dataset.city || "";
      el.textContent = city ? `${time} in ${city}` : time;
      try {
        el.setAttribute("datetime", isoIn(formatter.parts, now));
      } catch {
        el.setAttribute("datetime", now.toISOString());
      }
    }
  }

  function schedule() {
    const now = Date.now();
    const untilNextMinute = 60000 - (now % 60000) + 50;
    setTimeout(() => {
      tick();
      schedule();
    }, untilNextMinute);
  }

  tick();
  schedule();
}
