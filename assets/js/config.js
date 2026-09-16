/* config.js — build-time constants, templated by Hugo (js.Build with template=true).
   Keys read by the modules in static/js/. The Simkl token is visible in the page
   source and is treated as public by design; see docs/accepted-risks.md before
   adding any key here that guards something that matters. */
window.CONFIG = {
  unsplashKey: "{{ getenv "HUGO_UNSPLASH_KEY" }}",
  lastfmKey: "{{ getenv "HUGO_LASTFM_KEY" }}",
  simklClientId: "{{ getenv "HUGO_SIMKL_CLIENT_ID" }}",
  simklToken: "{{ getenv "HUGO_SIMKL_TOKEN" }}",
  cacheTTLMinutes: {{ site.Params.cacheTTLMinutes | default 60 }},
  screenLimit: {{ site.Params.screenLimit | default 10 }},
  mangaLimit: {{ site.Params.mangaLimit | default 6 }},
  photoLimit: {{ site.Params.photoLimit | default 6 }},
  lastfmUser: "{{ site.Params.lastfmUser | default "fibrili" }}",
  anilistUser: "{{ site.Params.anilistUser | default "finer" }}",
  unsplashUser: "{{ site.Params.unsplashUser | default "finerbrighterlighter" }}"
};
