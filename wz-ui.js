/* ============================================================
   wz-ui.js — Gemeinsames Hinweis-/Bestätigungs-Modul für alle
   Wahr-Apps (WahrZentrale). Ersetzt native alert()/confirm()-
   Browser-Popups durch ein zum jeweiligen App-Design passendes
   Modal bzw. einen kurzen Toast-Hinweis.

   Nutzung (Drop-in, aber ASYNC statt synchron):
     wzAlert("Text");                 // statt alert("Text")
     var ok = await wzConfirm("Text");// statt confirm("Text")
     wzToast("Kurzer Hinweis");       // für reine Bestätigungen
                                       // ohne Aktionsbedarf
                                       // (ersetzt "beiläufige" alerts
                                       // wie "In Zwischenablage kopiert")

   Wichtig: wzAlert()/wzConfirm() geben ein Promise zurück. Aufrufende
   Funktionen müssen daher `async function` sein bzw. .then() nutzen —
   der Rückgabewert steht NICHT mehr synchron zur Verfügung wie bei
   confirm(). Siehe die Aufrufstellen in pw-app.js/vw-app.js/kw-app.js.

   Verwendet nur CSS-Variablen, die in allen Apps bereits vorhanden
   sind (--card/--text/--sub/--border/--cta-bg/--cta-text), mit
   Fallbacks auf die abweichenden Namen aus KompassWahr
   (--violett/--text-dim) und generische Werte, falls eine Variable
   fehlt. Dadurch passt sich das Modal automatisch an Hell-/Dunkelmodus
   und Farbschema der jeweiligen App an, ohne eigenes CSS pro App.
   ============================================================ */
(function (global) {
  "use strict";

  var styleInjected = false;
  function injectStyle() {
    if (styleInjected) return;
    styleInjected = true;
    var css =
      ".wzi{display:inline-block;width:1.2em;height:1.2em;vertical-align:-0.22em;fill:currentColor;flex-shrink:0}" +
      ".wzi-red{color:#DC2626}.wzi-green{color:#16A34A}.wzi-yellow{color:#EAB308}" +
      ".wzi-orange{color:#EA8C1E}.wzi-white{color:#9C9CA8}" +
      ".wzi-chev-up{transform:rotate(-90deg)}.wzi-chev-down{transform:rotate(90deg)}" +
      ".wz-modal-backdrop{position:fixed;inset:0;background:rgba(10,20,20,.45);z-index:99998;" +
      "display:flex;align-items:flex-end;justify-content:center;animation:wzFade .15s ease}" +
      "@media (min-width:640px){.wz-modal-backdrop{align-items:center}}" +
      "@keyframes wzFade{from{opacity:0}to{opacity:1}}" +
      ".wz-modal{width:100%;max-width:420px;background:var(--card,#F8F6FC);" +
      "color:var(--text,var(--ink,#241E3F));border-radius:20px 20px 0 0;" +
      "padding:22px 20px calc(env(safe-area-inset-bottom,0px) + 18px);" +
      "box-shadow:0 -8px 30px rgba(0,0,0,.25);font-family:-apple-system,sans-serif;" +
      "animation:wzUp .18s ease}" +
      "@media (min-width:640px){.wz-modal{border-radius:20px;padding:22px 20px}}" +
      "@keyframes wzUp{from{transform:translateY(24px);opacity:0}to{transform:translateY(0);opacity:1}}" +
      ".wz-modal p{margin:0 0 18px;font-size:15px;line-height:1.5;white-space:pre-line}" +
      ".wz-modal-btns{display:flex;gap:10px}" +
      ".wz-modal-btns button{flex:1;border:none;border-radius:14px;padding:13px 10px;" +
      "font-size:14.5px;font-weight:700;cursor:pointer;font-family:inherit}" +
      ".wz-btn-primary{background:var(--cta-bg,var(--violett,#5A2FBE));color:var(--cta-text,#fff)}" +
      ".wz-btn-secondary{background:var(--bg,#F1EEFA);color:var(--text,var(--ink,#241E3F));" +
      "border:1.5px solid var(--border,#DAC7F2) !important}" +
      ".wz-toast{position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom,0px) + 22px);" +
      "transform:translateX(-50%);background:var(--card,#F8F6FC);color:var(--text,var(--ink,#241E3F));" +
      "border:1.5px solid var(--border,#DAC7F2);border-radius:14px;padding:12px 18px;" +
      "font-size: 14.5px;font-weight:600;box-shadow:0 8px 24px rgba(0,0,0,.18);z-index:99999;" +
      "max-width:88vw;text-align:center;animation:wzFade .15s ease}";
    var s = document.createElement("style");
    s.textContent = css;
    document.head.appendChild(s);
  }

  function wzModal(message, buttons) {
    injectStyle();
    return new Promise(function (resolve) {
      var backdrop = document.createElement("div");
      backdrop.className = "wz-modal-backdrop";
      var modal = document.createElement("div");
      modal.className = "wz-modal";
      modal.setAttribute("role", "alertdialog");
      modal.setAttribute("aria-modal", "true");
      var p = document.createElement("p");
      p.textContent = message;
      modal.appendChild(p);
      var btnWrap = document.createElement("div");
      btnWrap.className = "wz-modal-btns";

      function close(result) {
        if (backdrop.parentNode) document.body.removeChild(backdrop);
        document.removeEventListener("keydown", onKey);
        resolve(result);
      }
      function onKey(e) {
        if (e.key === "Escape") close(buttons.length > 1 ? false : undefined);
      }
      buttons.forEach(function (btn, i) {
        var b = document.createElement("button");
        b.className = btn.primary ? "wz-btn-primary" : "wz-btn-secondary";
        b.textContent = btn.label;
        b.addEventListener("click", function () { close(btn.value); });
        btnWrap.appendChild(b);
        if (i === buttons.length - 1) setTimeout(function () { b.focus(); }, 0);
      });
      modal.appendChild(btnWrap);
      backdrop.appendChild(modal);
      backdrop.addEventListener("click", function (e) {
        if (e.target === backdrop) close(buttons.length > 1 ? false : undefined);
      });
      document.addEventListener("keydown", onKey);
      document.body.appendChild(backdrop);
    });
  }

  /** Ersetzt alert(): ein Button ("OK"), Promise<void> statt sofortigem Rückgabewert. */
  function wzAlert(message) {
    return wzModal(message, [{ label: "OK", value: undefined, primary: true }]);
  }

  /** Ersetzt confirm(): Promise<boolean> statt synchronem Rückgabewert.
   *  Aufrufstellen brauchen daher await bzw. .then(). */
  function wzConfirm(message, opts) {
    opts = opts || {};
    return wzModal(message, [
      { label: opts.cancelLabel || "Abbrechen", value: false, primary: false },
      { label: opts.okLabel || "OK", value: true, primary: true }
    ]);
  }

  /** Kurzer, selbst verschwindender Hinweis ohne nötige Nutzeraktion
   *  (z. B. "In Zwischenablage kopiert.", "Import abgeschlossen."). */
  function wzToast(message, ms) {
    injectStyle();
    var el = document.createElement("div");
    el.className = "wz-toast";
    el.textContent = message;
    document.body.appendChild(el);
    setTimeout(function () {
      el.style.transition = "opacity .25s ease";
      el.style.opacity = "0";
      setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 250);
    }, ms || 1800);
  }

  /** Baut die Markup-Zeichenkette für ein eigenes SVG-Symbol aus wz-icons.svg
   *  (Ersatz für Emojis). id = Symbol-Name, z.B. "compass", "home", "pin".
   *  extraClass = optionale zusätzliche CSS-Klasse(n). */
  function wzIcon(id, extraClass) {
    injectStyle();
    var cls = "wzi" + (extraClass ? " " + extraClass : "");
    return '<svg class="' + cls + '" aria-hidden="true"><use href="#wzi-' + id + '"></use></svg>';
  }

  global.wzAlert = wzAlert;
  global.wzConfirm = wzConfirm;
  global.wzToast = wzToast;
  global.wzIcon = wzIcon;
})(window);
