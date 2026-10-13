/* ============================================================
   wz-shared.js — Gemeinsame, reine Hilfsfunktionen für die
   Wahr-Apps mit OCR-Scan (aktuell: ProduktWahr, VorratsWahr).

   Zweck: ProduktWahr und VorratsWahr enthielten identischen bzw.
   fast identischen Code für Tesseract-Laden, HTML-Escaping und
   Dark/Light-Mode. Diese Datei bündelt die Teile, die wortgleich
   waren (wzEscapeHtml, wzLoadTesseract). Das Hell-/Dunkel-Handling
   liegt inzwischen app-übergreifend in wz-theme.js.

   Bewusst NICHT hier enthalten: Kamera-Start/-Stop, Live-Scan-Pass,
   Frame-Erfassung. Diese Funktionen unterscheiden sich zwischen den
   Apps in Detailverhalten (unterschiedliche View-IDs, unterschiedliche
   Nachbearbeitung der erkannten Treffer) und sind ohne Kamera-Test auf
   einem echten Gerät zu riskant für eine automatische Zusammenlegung.
   Empfehlung: das kann in einem zweiten, für sich testbaren Schritt
   passieren, wenn du auf einem echten Smartphone gegentesten kannst.
   ============================================================ */
(function (global) {
  "use strict";

  /** HTML-Escaping für alles, was per innerHTML/Text in die Seite
   *  eingefügt wird (OCR-Text, Nutzereingaben, externe Produktdaten). */
  function wzEscapeHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /** Lädt die Texterkennung der WahrZentrale (wz-ocr.js, alles lokal) bei Bedarf, Promise-basiert.
   *  Bei erneutem Aufruf, während Tesseract schon vorhanden ist,
   *  löst das Promise sofort auf. */
  function wzLoadTesseract() {
    return new Promise(function (resolve, reject) {
      if (window.Tesseract) { resolve(); return; }
      var s = document.createElement("script");
      s.src = "./wz-ocr.js";
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  global.wzEscapeHtml = wzEscapeHtml;
  global.wzLoadTesseract = wzLoadTesseract;
})(window);
