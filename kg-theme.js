/* =========================================================
   Keysglade — Dark Mode
========================================================= */

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  const btn = document.getElementById("theme-toggle-btn");
  if (btn) {
    btn.innerHTML = rwi(theme === "dark" ? "sun" : "moon");
    btn.setAttribute("aria-pressed", String(theme === "dark"));
  }
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) metaTheme.setAttribute("content", theme === "dark" ? "#0B1330" : "#1E2A78");
}

// Gemeinsamer Schlüssel mit der Startseite der WahrZentrale, damit Hell/Dunkel
// app-übergreifend erhalten bleibt.
const THEME_KEY = "reisewahr-theme";

function setupThemeToggle() {
  let saved = "light";
  try { if (localStorage.getItem(THEME_KEY) === "dark") saved = "dark"; } catch (e) {}
  applyTheme(saved);

  const btn = document.getElementById("theme-toggle-btn");
  if (!btn) return;
  btn.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme");
    const next = current === "dark" ? "light" : "dark";
    applyTheme(next);
    try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
  });
}
