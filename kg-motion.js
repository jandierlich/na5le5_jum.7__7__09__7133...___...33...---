/* =========================================================
   Keysglade — Bewegungssteuerung & Inline-SVG-Loader
   Animierte Titelbilder werden als Inline-SVG geladen statt
   per <img>, damit sich ihre Animationen global pausieren
   lassen (Barrierefreiheit, WCAG 2.2.2 "Pause, Stop, Hide").
========================================================= */

async function loadInlineSVG(containerId, path) {
  const el = document.getElementById(containerId);
  if (!el) return;
  try {
    const res = await fetch(path);
    if (!res.ok) throw new Error("SVG nicht gefunden");
    el.innerHTML = await res.text();
    const svg = el.querySelector("svg");
    if (svg) {
      svg.setAttribute("width", "100%");
      svg.setAttribute("height", "100%");
      // object-fit:cover greift nicht auf div+Inline-SVG – daher hier per
      // preserveAspectRatio nachgebildet, außer die Datei legt selbst schon
      // ein anderes Verhalten fest (z. B. wave-divider.svg mit "none").
      if (!svg.hasAttribute("preserveAspectRatio")) {
        svg.setAttribute("preserveAspectRatio", "xMidYMid slice");
      }
    }
    syncSvgMotionState(svg);
  } catch (e) {
    console.warn("Inline-SVG konnte nicht geladen werden:", path, e);
  }
}

function syncSvgMotionState(svg) {
  if (!svg) return;
  const paused = document.body.classList.contains("motion-paused");
  try {
    if (paused && typeof svg.pauseAnimations === "function") svg.pauseAnimations();
    else if (!paused && typeof svg.unpauseAnimations === "function") svg.unpauseAnimations();
  } catch (e) {
    // Manche Browser unterstützen die SMIL-Steuerung nicht vollständig – kein Abbruch nötig.
  }
}

function applyMotionState(paused) {
  document.body.classList.toggle("motion-paused", paused);
  const btn = document.getElementById("motion-toggle-btn");
  if (btn) {
    btn.innerHTML = paused ? rwi("play") + " Animationen fortsetzen" : rwi("pause") + " Animationen pausieren";
    btn.setAttribute("aria-pressed", String(paused));
  }
  // CSS-Animationen werden über die Klasse "motion-paused" im Stylesheet pausiert.
  // SMIL-Animationen (z. B. <animateMotion>) reagieren darauf nicht und werden
  // hier separat über die SVG-DOM-API gesteuert.
  document.querySelectorAll("svg").forEach((svg) => {
    try {
      if (paused && typeof svg.pauseAnimations === "function") svg.pauseAnimations();
      else if (!paused && typeof svg.unpauseAnimations === "function") svg.unpauseAnimations();
    } catch (e) {
      // Manche Browser unterstützen die SMIL-Steuerung nicht vollständig – kein Abbruch nötig.
    }
  });
}

function setupMotionToggle() {
  const btn = document.getElementById("motion-toggle-btn");
  if (!btn) return;

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const stored = Storage.getMotionPaused();
  const initialPaused = stored !== null ? stored : prefersReduced;
  applyMotionState(initialPaused);

  btn.addEventListener("click", () => {
    const newState = !document.body.classList.contains("motion-paused");
    applyMotionState(newState);
    Storage.setMotionPaused(newState);
  });
}
