// Pre-paint theme: runs blocking in <head> so the first frame is already in the right mode.
(function () {
  try {
    var t = localStorage.getItem("theme");
    if (t !== "light" && t !== "dark") {
      t = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    document.documentElement.setAttribute("data-theme", t);
    if (localStorage.getItem("mmFontMode") === "clear") document.documentElement.setAttribute("data-mm-font", "clear");
    if (localStorage.getItem("palette") === "colorblind") document.documentElement.setAttribute("data-palette", "colorblind");
  } catch (e) {}
})();
