/* ============================================================
   wz-onboarding.js — Einheitliche Einführung (Bottom-Sheet) für
   alle Wahr-Apps. Gleiches Aussehen und gleicher Ablauf überall:
   Symbol, Titel, kurzer Text, Punkte-Anzeige, "Überspringen" und
   "Weiter" / "Los geht's". Styles: wz-common.css (.wz-onb-*).

   Nutzung:
     var onb = wzOnboarding({
       key: "vw_onboarded",            // localStorage-Schlüssel (bleibt pro App)
       slides: [
         { icon: "jar", title: "…", text: "…" },   // icon = Symbol-ID aus der Seite (#wzi-…)
         { iconHtml: "<svg…>", title: "…", html: "<b>…</b>" }  // optional eigenes Markup
       ]
     });
     onb.show();   // z. B. für "Einführung erneut anzeigen"

   Beim ersten Öffnen erscheint die Einführung automatisch; danach
   nur noch über onb.show().
   ============================================================ */
(function (global) {
  "use strict";

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  // Apps mit eigenem Symbol-Bild (*-icon-192.png)
  var APP_ICONS = { hw: 1, zh: 1, as: 1, kw: 1, wk: 1, kg: 1, wow: 1, bp: 1, aw: 1, pw: 1, vw: 1, ld: 1, qr: 1, lw: 1, zw: 1, af: 1, kv: 1, hk: 1, pk: 1, st: 1, bw: 1, hz: 1, mw: 1, kl: 1, lb: 1, sn: 1 };

  function wzOnboarding(opts) {
    var slides = opts.slides || [];
    var key = opts.key;
    var idx = 0;
    var lastFocus = null;
    var uid = "wzOnb" + Math.random().toString(36).slice(2, 7);

    var overlay = document.createElement("div");
    overlay.className = "wz-onb";
    overlay.hidden = true;
    overlay.innerHTML =
      '<div class="wz-onb-sheet" role="dialog" aria-modal="true" aria-labelledby="' + uid + '-t">' +
        '<div class="wz-onb-slide" aria-live="polite">' +
          '<div class="wz-onb-icon"></div>' +
          '<h2 class="wz-onb-title" id="' + uid + '-t"></h2>' +
          '<div class="wz-onb-text"></div>' +
        '</div>' +
        '<div class="wz-onb-dots" aria-hidden="true"></div>' +
        '<div class="wz-onb-actions">' +
          '<button type="button" class="wz-onb-skip">Überspringen</button>' +
          '<button type="button" class="wz-onb-next">Weiter</button>' +
        '</div>' +
      '</div>';

    var sheet = overlay.querySelector(".wz-onb-sheet");
    sheet.setAttribute("tabindex", "-1");
    var el = {
      slide: overlay.querySelector(".wz-onb-slide"),
      icon: overlay.querySelector(".wz-onb-icon"),
      title: overlay.querySelector(".wz-onb-title"),
      text: overlay.querySelector(".wz-onb-text"),
      dots: overlay.querySelector(".wz-onb-dots"),
      skip: overlay.querySelector(".wz-onb-skip"),
      next: overlay.querySelector(".wz-onb-next")
    };

    slides.forEach(function () { el.dots.appendChild(document.createElement("span")); });

    function render() {
      var s = slides[idx];
      var app = document.documentElement.getAttribute("data-wz-app") || "";
      if (APP_ICONS[app] && /^Willkommen bei/.test(s.title || "")) {
        // Begrüßung: das App-Symbol im feinen Stil (gleich wie auf der Startseite)
        el.icon.innerHTML = '<img src="./' + app + '-icon-192.png" alt="" style="width:100%;height:100%;border-radius:inherit;display:block">';
      } else {
        el.icon.innerHTML = s.iconHtml || (s.icon ? '<svg class="wzi" aria-hidden="true"><use href="#wzi-' + esc(s.icon) + '"></use></svg>' : "");
      }
      el.title.textContent = s.title || "";
      el.text.innerHTML = s.html != null ? s.html : "<p>" + esc(s.text || "").split("\n").join("<br>") + "</p>";
      Array.prototype.forEach.call(el.dots.children, function (d, j) { d.classList.toggle("on", j === idx); });
      var last = idx === slides.length - 1;
      el.next.textContent = last ? "Los geht's" : "Weiter";
      el.skip.style.visibility = last ? "hidden" : "";
      el.slide.classList.remove("wz-onb-anim");
      void el.slide.offsetWidth;
      el.slide.classList.add("wz-onb-anim");
    }

    function markSeen() { try { localStorage.setItem(key, "1"); } catch (e) { } }

    function close() {
      markSeen();
      overlay.classList.remove("open");
      setTimeout(function () { overlay.hidden = true; }, 220);
      document.removeEventListener("keydown", onKey);
      if (lastFocus && lastFocus.focus) { try { lastFocus.focus(); } catch (e) { } }
      if (typeof opts.onClose === "function") opts.onClose();
    }

    function onKey(e) {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight" && idx < slides.length - 1) { idx++; render(); }
      else if (e.key === "ArrowLeft" && idx > 0) { idx--; render(); }
    }

    el.next.addEventListener("click", function () {
      if (idx < slides.length - 1) { idx++; render(); } else close();
    });
    el.skip.addEventListener("click", close);

    // Wischen nach links/rechts
    var x0 = null;
    overlay.addEventListener("touchstart", function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    overlay.addEventListener("touchend", function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0; x0 = null;
      if (Math.abs(dx) < 50) return;
      if (dx < 0 && idx < slides.length - 1) { idx++; render(); }
      else if (dx > 0 && idx > 0) { idx--; render(); }
    }, { passive: true });

    function show() {
      if (!overlay.parentNode) document.body.appendChild(overlay);
      idx = 0;
      render();
      lastFocus = document.activeElement;
      overlay.hidden = false;
      requestAnimationFrame(function () { overlay.classList.add("open"); });
      document.addEventListener("keydown", onKey);
      setTimeout(function () { try { sheet.focus({ preventScroll: true }); } catch (e) { } }, 50);
    }

    function autoShow() {
      var seen = false;
      try { seen = localStorage.getItem(key) === "1"; } catch (e) { }
      if (!seen) show();
    }
    if (opts.auto !== false) {
      if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", autoShow);
      else autoShow();
    }

    return { show: show, close: close };
  }

  global.wzOnboarding = wzOnboarding;
})(window);
