/* ============================================================
   ThaumoraWahr – Bildkarten, Urkunden und Kalenderdatei
   Alles entsteht auf dem Gerät (Canvas bzw. Text). Geteilt wird nur,
   wenn du selbst im Teilen-Menü ein Ziel auswählst.
   © 2026 Jan Dierlich – Alle Rechte vorbehalten.
   ============================================================ */
(function (g) {
  "use strict";
  var W = 1080, H = 1350;
  var FONT = '-apple-system, "Segoe UI", system-ui, sans-serif';
  var ROUND = 'ui-rounded, -apple-system, "Segoe UI", system-ui, sans-serif';

  function rnd(seed) { var s = seed % 2147483647; if (s <= 0) s += 2147483646; return function () { s = s * 16807 % 2147483647; return (s - 1) / 2147483646; }; }
  function hash(str) { var h = 7; for (var i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0; return Math.abs(h) + 1; }
  function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function wrap(c, text, maxW) {
    var words = String(text).split(/\s+/), lines = [], cur = "";
    words.forEach(function (w) { var t = cur ? cur + " " + w : w; if (c.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; });
    if (cur) lines.push(cur); return lines;
  }
  /* Text so setzen, dass er in die Höhe passt (Schrift wird bei Bedarf kleiner) */
  function fit(c, text, maxW, maxH, size, min, weight, family, lh) {
    var s = size, lines;
    for (; s >= min; s -= 2) { c.font = weight + " " + s + "px " + family; lines = wrap(c, text, maxW); if (lines.length * s * lh <= maxH) break; }
    return { size: s, lines: lines, lh: s * lh };
  }
  function loadImg(src) { return new Promise(function (res) { var i = new Image(); i.onload = function () { res(i); }; i.onerror = function () { res(null); }; i.src = src; }); }
  function stars(c, seed, n, x0, y0, w, h, alpha) {
    var r = rnd(seed);
    for (var i = 0; i < n; i++) { var x = x0 + r() * w, y = y0 + r() * h, s = r() * 2.2 + .4; c.fillStyle = "rgba(255,255,255," + (alpha * (.25 + r() * .75)).toFixed(3) + ")"; c.beginPath(); c.arc(x, y, s, 0, 7); c.fill(); }
  }
  function night(c, seed, gold) {
    var bg = c.createLinearGradient(0, 0, W * .4, H);
    bg.addColorStop(0, "#2E1F66"); bg.addColorStop(.55, "#1D1442"); bg.addColorStop(1, "#110C26");
    c.fillStyle = bg; c.fillRect(0, 0, W, H);
    var glow = c.createRadialGradient(W * .86, 0, 10, W * .86, 0, W * .95);
    glow.addColorStop(0, gold ? "rgba(255,200,110,.38)" : "rgba(140,104,255,.5)"); glow.addColorStop(1, "rgba(140,104,255,0)");
    c.fillStyle = glow; c.fillRect(0, 0, W, H);
    stars(c, seed, 170, 0, 0, W, H, .9);
  }
  function footer(c, logo, line1, line2, dy) {
    var y = H - 150 + (dy || 0);
    c.strokeStyle = "rgba(255,255,255,.16)"; c.lineWidth = 2; c.beginPath(); c.moveTo(90, y); c.lineTo(W - 90, y); c.stroke();
    if (logo) { c.save(); rr(c, 90, y + 34, 76, 76, 18); c.clip(); c.drawImage(logo, 90, y + 34, 76, 76); c.restore(); }
    c.fillStyle = "#fff"; c.font = "700 34px " + ROUND; c.textBaseline = "alphabetic"; c.fillText(line1, logo ? 186 : 90, y + 68);
    c.fillStyle = "rgba(255,255,255,.7)"; c.font = "500 26px " + FONT; c.fillText(line2, logo ? 186 : 90, y + 104);
  }

  /* Wunderkarte: { over, title, text, more, foot, gold } – Inhalt senkrecht zentriert */
  function wonderCard(o) {
    return loadImg("./wd-icon-192.png").then(function (logo) {
      var cv = document.createElement("canvas"); cv.width = W; cv.height = H; var c = cv.getContext("2d");
      night(c, hash(o.title || "w"), o.gold);
      var x = 96, mw = W - 192, top = o.gold ? 170 : 130, bottom = H - 190, avail = bottom - top;
      var t = fit(c, o.title, mw, avail * .34, 104, 60, "800", ROUND, 1.1);
      var b = fit(c, o.text, mw, avail * (o.more ? .34 : .5), 56, 34, "600", FONT, 1.34);
      var m = o.more ? fit(c, o.more, mw, avail * .28, 40, 26, "400", FONT, 1.42) : null;
      var gap1 = 46, gap2 = 40, overH = 52;
      var hBlock = overH + t.lines.length * t.lh + gap1 + b.lines.length * b.lh + (m ? gap2 + m.lines.length * m.lh : 0);
      var y = top + Math.max(0, (avail - hBlock) / 2);
      if (o.gold) {
        c.strokeStyle = "rgba(255,210,122,.9)"; c.lineWidth = 6; rr(c, 34, 34, W - 68, H - 68, 44); c.stroke();
        c.fillStyle = "#FFD27A"; c.font = "800 28px " + FONT; c.textBaseline = "alphabetic"; c.fillText("★  STERNSTUNDE", x, 120);
      }
      c.textBaseline = "alphabetic";
      c.fillStyle = "#C9B8FF"; c.font = "700 32px " + FONT;
      c.fillText(String(o.over || "").toUpperCase().split("").join(String.fromCharCode(8202)), x, y + 32);
      y += overH;
      c.fillStyle = "#fff"; c.font = "800 " + t.size + "px " + ROUND;
      t.lines.forEach(function (l, i) { c.fillText(l, x, y + t.lh * (i + 1) - t.lh * .2); });
      y += t.lines.length * t.lh + gap1;
      c.fillStyle = "#FFD27A"; c.fillRect(x, y - gap1 / 2 - 3, 64, 6);
      c.fillStyle = "rgba(255,255,255,.95)"; c.font = "600 " + b.size + "px " + FONT;
      b.lines.forEach(function (l, i) { c.fillText(l, x, y + b.lh * (i + 1) - b.lh * .22); });
      y += b.lines.length * b.lh;
      if (m) {
        y += gap2; c.fillStyle = "rgba(255,255,255,.74)"; c.font = "400 " + m.size + "px " + FONT;
        m.lines.forEach(function (l, i) { c.fillText(l, x, y + m.lh * (i + 1) - m.lh * .22); });
      }
      footer(c, logo, "ThaumoraWahr", o.foot || "Jeden Tag ein Grund zu staunen");
      return toBlob(cv);
    });
  }

  /* Urkunde: { kind, name, title, text, date } */
  function certificate(o) {
    return loadImg("./wd-icon-192.png").then(function (logo) {
      var cv = document.createElement("canvas"); cv.width = W; cv.height = H; var c = cv.getContext("2d");
      night(c, hash(o.title || "u"), true);
      c.strokeStyle = "rgba(255,210,122,.95)"; c.lineWidth = 5; rr(c, 30, 30, W - 60, H - 60, 40); c.stroke();
      c.strokeStyle = "rgba(255,210,122,.45)"; c.lineWidth = 2; rr(c, 48, 48, W - 96, H - 96, 30); c.stroke();
      c.textAlign = "center";
      c.fillStyle = "#FFD27A"; c.font = "800 30px " + FONT; c.fillText("U R K U N D E", W / 2, 170);
      c.fillStyle = "#C9B8FF"; c.font = "700 28px " + FONT; c.fillText(String(o.kind || "").toUpperCase(), W / 2, 220);
      // Siegel: eigener Stern mit Strahlenkranz
      var sx = W / 2, sy = 370;
      c.save(); c.translate(sx, sy);
      for (var i = 0; i < 24; i++) { c.rotate(Math.PI / 12); c.fillStyle = i % 2 ? "rgba(255,210,122,.55)" : "rgba(255,210,122,.3)"; c.fillRect(-3, -112, 6, 34); }
      var sg = c.createRadialGradient(0, -20, 10, 0, 0, 92); sg.addColorStop(0, "#FFE7B0"); sg.addColorStop(1, "#C98A1F");
      c.fillStyle = sg; c.beginPath(); c.arc(0, 0, 84, 0, 7); c.fill();
      c.fillStyle = "#2A1C5E"; c.beginPath();
      for (var k = 0; k < 10; k++) { var a = -Math.PI / 2 + k * Math.PI / 5, r = k % 2 ? 22 : 52; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
      c.closePath(); c.fill(); c.restore();
      var top2 = 520, bot2 = H - 200, mw2 = W - 240;
      var t = fit(c, o.title, mw2, 300, 80, 46, "800", ROUND, 1.14);
      var bb = o.text ? fit(c, o.text, mw2, 220, 40, 28, "500", FONT, 1.4) : null;
      var hb = (o.name ? 76 + 74 : 0) + t.lines.length * t.lh + (bb ? 46 + bb.lines.length * bb.lh : 0);
      var y = top2 + Math.max(0, (bot2 - top2 - hb) / 2);
      if (o.name) { c.fillStyle = "#fff"; c.font = "800 76px " + ROUND; c.fillText(o.name, W / 2, y + 66); y += 76; if (o.verb) { c.fillStyle = "rgba(255,255,255,.75)"; c.font = "500 36px " + FONT; c.fillText(o.verb, W / 2, y + 44); } y += 74; }
      c.fillStyle = "#FFD27A"; c.font = "800 " + t.size + "px " + ROUND;
      t.lines.forEach(function (l, i) { c.fillText(l, W / 2, y + t.lh * (i + 1) - t.lh * .2); });
      y += t.lines.length * t.lh + 46;
      if (bb) { c.fillStyle = "rgba(255,255,255,.88)"; c.font = "500 " + bb.size + "px " + FONT; bb.lines.forEach(function (l, i) { c.fillText(l, W / 2, y + bb.lh * (i + 1) - bb.lh * .22); }); }
      c.textAlign = "left";
      footer(c, logo, "ThaumoraWahr", o.date || "", -34);
      return toBlob(cv);
    });
  }

  function toBlob(cv) { return new Promise(function (res) { cv.toBlob(function (b) { res(b); }, "image/png"); }); }

  /* Teilen über das Systemmenü – sonst als Datei speichern */
  function share(blob, filename, title) {
    if (!blob) return Promise.resolve(false);
    var file = null;
    try { file = new File([blob], filename, { type: blob.type || "image/png" }); } catch (e) { }
    if (file && navigator.canShare && navigator.canShare({ files: [file] }) && navigator.share) {
      return navigator.share({ files: [file], title: title || "ThaumoraWahr" }).then(function () { return true; }, function (e) { return e && e.name === "AbortError" ? false : download(blob, filename); });
    }
    return Promise.resolve(download(blob, filename));
  }
  function download(blob, filename) {
    try {
      var u = URL.createObjectURL(blob), a = document.createElement("a");
      a.href = u; a.download = filename; document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(u); if (a.parentNode) a.parentNode.removeChild(a); }, 4000);
      if (g.wzToast) wzToast("Gespeichert: " + filename);
      return true;
    } catch (e) { if (g.wzToast) wzToast("Speichern ist hier leider nicht möglich."); return false; }
  }

  /* Kalenderdatei (.ics) mit ganztägigen Terminen: [{ date, title, text, uid }] */
  function ics(events, filename) {
    function esc(s) { return String(s || "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n"); }
    function d8(d) { return d.getFullYear() + String(d.getMonth() + 1).padStart(2, "0") + String(d.getDate()).padStart(2, "0"); }
    function fold(line) { var out = [], s = line; while (s.length > 60) { out.push(s.slice(0, 60)); s = " " + s.slice(60); } out.push(s); return out.join("\r\n"); }
    var now = new Date(), st = now.toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
    var L = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//ThaumoraWahr//Meilensteine//DE", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "X-WR-CALNAME:ThaumoraWahr – Meilensteine"];
    events.forEach(function (e) {
      var d = new Date(e.date), n = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
      L.push("BEGIN:VEVENT", "UID:" + esc(e.uid) + "@thaumorawahr", "DTSTAMP:" + st, "DTSTART;VALUE=DATE:" + d8(d), "DTEND;VALUE=DATE:" + d8(n),
        fold("SUMMARY:" + esc(e.title)), fold("DESCRIPTION:" + esc(e.text)), "TRANSP:TRANSPARENT", "END:VEVENT");
    });
    L.push("END:VCALENDAR");
    var blob = new Blob([L.join("\r\n") + "\r\n"], { type: "text/calendar;charset=utf-8" });
    var file = null; try { file = new File([blob], filename, { type: "text/calendar" }); } catch (e) { }
    if (file && navigator.canShare && navigator.canShare({ files: [file] }) && navigator.share) {
      return navigator.share({ files: [file], title: "Meilensteine" }).then(function () { return true; }, function (e) { return e && e.name === "AbortError" ? false : download(blob, filename); });
    }
    return Promise.resolve(download(blob, filename));
  }

  g.WDShare = { wonderCard: wonderCard, certificate: certificate, share: share, ics: ics };
})(window);
