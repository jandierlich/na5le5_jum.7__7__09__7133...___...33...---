/* ============================================================
   AufwindWahr – Spiel
   Ein eigenes Würfel-Laufspiel mit 100 Feldern: Aufwinde tragen
   nach oben, Meteoriten werfen zurück. Eigene Regeln: Schubkarten,
   Mond, Wurmloch, Raumstation, faire Zufallsbretter mit Nummer.
   Alles läuft auf dem Gerät; gespeichert wird nur lokal
   (Präfix „aufwindwahr_“). Grafik und Töne werden im Programm
   erzeugt. © 2026 Jan Dierlich – Alle Rechte vorbehalten.
   ============================================================ */
(function (global) {
  "use strict";

  /* ================= Rechenteil ================= */
  var KINDS = ["rakete", "komet", "satellit", "faehre", "ufo", "astronaut", "planet", "rover"];
  var KIND_NAME = { rakete: "Rakete", komet: "Komet", satellit: "Satellit", faehre: "Mondfähre", ufo: "Ufo", astronaut: "Astronaut", planet: "Planet", rover: "Rover" };
  var KIND_COLOR = { rakete: "#FFC86B", komet: "#8FD8FF", satellit: "#E7A6FF", faehre: "#F2EEFF", ufo: "#FFB3C7", astronaut: "#B9C6FF", planet: "#FF9F8A", rover: "#E3CFA8" };
  var LEVELS = ["leicht", "mittel", "schwer"];
  var LEVEL_NAME = { leicht: "Leicht", mittel: "Mittel", schwer: "Schwer" };
  var CARD_NAME = { schub: "Schub", neu: "Neu würfeln", schild: "Schutzschild" };

  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function rowOf(n) { return Math.floor((n - 1) / 10); }
  /* Kein Zurückprallen: Wer über Feld 100 hinaus würfeln würde, bleibt stehen. */
  function moveTarget(pos, steps) { var t = pos + steps; if (t > 100) return pos; if (t < 1) t = 1; return t; }
  function stepPath(pos, steps) {
    var out = [];
    if (pos + steps > 100) return out;
    for (var i = 1; i <= steps; i++) out.push(pos + i);
    return out;
  }

  function indexBoard(b) {
    b.link = {}; b.spec = {};
    b.ups.forEach(function (u) { b.link[u[0]] = { type: "up", to: u[1] }; });
    b.downs.forEach(function (d) { b.link[d[0]] = { type: "down", to: d[1] }; });
    b.mond.forEach(function (n) { b.spec[n] = "mond"; });
    b.wurm.forEach(function (n) { b.spec[n] = "wurm"; });
    b.station.forEach(function (n) { b.spec[n] = "station"; });
    return b;
  }
  /* Mittlere Zahl der Würfe bis zum Ziel (ohne Karten und Sonderfelder) – Maß für ein faires Brett */
  function meanRolls(b, r, runs) {
    var total = 0;
    for (var g = 0; g < runs; g++) {
      var p = 1, n = 0;
      while (p !== 100 && n < 400) {
        n++;
        p = moveTarget(p, 1 + Math.floor(r() * 6));
        var L = b.link[p]; if (L) p = L.to;
      }
      total += n;
    }
    return total / runs;
  }
  function makeBoard(no) {
    var r = rng((no * 7919 + 17) >>> 0), best = null;
    for (var attempt = 0; attempt < 300; attempt++) {
      var used = {}, ups = [], downs = [], t;
      var free = function (n) { return n > 1 && n < 100 && !used[n]; };
      var early = 0, late = 0;
      for (t = 0; ups.length < 7 && t < 600; t++) {
        var a = 2 + Math.floor(r() * 86), b = a + 8 + Math.floor(r() * 23);
        if (b > 98 || rowOf(a) === rowOf(b) || !free(a) || !free(b)) continue;
        if (a <= 10 && early >= 2) continue;
        if (ups.some(function (u) { return Math.abs(u[0] - a) < 4; })) continue;
        if (a <= 10) early++;
        ups.push([a, b]); used[a] = used[b] = 1;
      }
      for (t = 0; downs.length < 8 && t < 600; t++) {
        var c = 12 + Math.floor(r() * 88), d = c - 8 - Math.floor(r() * 31);
        if (d < 2 || rowOf(c) === rowOf(d) || !free(c) || !free(d)) continue;
        if (c >= 91 && late >= 2) continue;
        if (downs.some(function (x) { return Math.abs(x[0] - c) < 4; })) continue;
        if (c >= 91) late++;
        downs.push([c, d]); used[c] = used[d] = 1;
      }
      if (ups.length < 7 || downs.length < 8) continue;
      var specs = { mond: [], wurm: [], station: [] }, ok = true;
      ["mond", "wurm", "station"].forEach(function (k) {
        for (var tt = 0; specs[k].length < 2 && tt < 300; tt++) {
          var n = 8 + Math.floor(r() * 85);
          if (!free(n) || used[n - 1] === 2 || used[n + 1] === 2) continue;
          if (specs[k].length && Math.abs(specs[k][0] - n) < 20) continue;
          specs[k].push(n); used[n] = 2;
        }
        if (specs[k].length < 2) ok = false;
      });
      if (!ok) continue;
      var board = indexBoard({ no: no, ups: ups, downs: downs, mond: specs.mond, wurm: specs.wurm, station: specs.station });
      var m = meanRolls(board, r, 240);
      board.mean = Math.round(m * 10) / 10;
      if (m >= 26 && m <= 44) return board;
      if (!best || Math.abs(m - 35) < Math.abs(best.mean - 35)) best = board;
    }
    return best;
  }
  function newBoardNo() { var c = typeof crypto !== "undefined" && crypto.getRandomValues ? crypto : null; if (c) { var a = new Uint32Array(1); c.getRandomValues(a); return 1000 + (a[0] % 9000); } return 1000 + Math.floor(Math.random() * 9000); }

  /* Ergebnis eines Zuges (ohne Schild): Feld nach Aufwind/Meteorit */
  function finalAfter(board, pos, steps) {
    var t = moveTarget(pos, steps), L = board.link[t];
    return L ? L.to : t;
  }
  function valueOf(board, player, pos, steps) {
    var t = moveTarget(pos, steps), L = board.link[t];
    if (!L) return t + (board.spec[t] === "mond" ? 3 : 0) + (board.spec[t] === "station" ? 1 : 0);
    if (L.type === "up") return L.to;
    return player.cards.schild ? t - 3 : L.to;
  }
  /* Entscheidung des Computers nach dem Wurf: ziehen, Schub +1/−1 oder neu würfeln */
  function aiAfterRoll(board, player, v, rnd) {
    var lvl = player.cpu || "mittel", pos = player.pos, c = player.cards;
    if (lvl === "mittel" && rnd() < 0.45) lvl = "leicht"; /* „Mittel“ entscheidet nicht immer klug */
    var opts = [{ a: "move", s: v }];
    if (c.schub) { opts.push({ a: "plus", s: v + 1 }); if (v > 1) opts.push({ a: "minus", s: v - 1 }); }
    opts.forEach(function (o) { o.val = valueOf(board, player, pos, o.s); });
    var move = opts[0], best = move;
    opts.forEach(function (o) { if (o.val > best.val) best = o; });
    if (lvl === "leicht") {
      if (rnd() < 0.25 && c.neu) return "neu";
      if (rnd() < 0.3 && opts.length > 1) return opts[1 + Math.floor(rnd() * (opts.length - 1))].a;
      return "move";
    }
    if (lvl === "mittel") {
      if (c.neu && move.val < pos - 3 && best.val <= pos) return "neu";
      if (best !== move && best.val - move.val >= 5) return best.a;
      return "move";
    }
    /* schwer: wie „mittel“, rechnet aber zusätzlich den Erwartungswert eines neuen Wurfs durch */
    var now = (best !== move && best.val - move.val >= 2) ? best : move;
    if (c.neu) {
      var ev = 0;
      for (var f = 1; f <= 6; f++) ev += valueOf(board, player, pos, f);
      ev /= 6;
      if (now.val < pos - 2 || (now.val <= pos && ev > now.val + 4)) return "neu";
    }
    return now === move ? "move" : now.a;
  }
  function aiShield(player, from, to, rnd) {
    var fall = from - to, lvl = player.cpu || "mittel";
    if (lvl === "leicht") return rnd() < 0.6;
    if (lvl === "mittel") return rnd() < 0.45 ? rnd() < 0.6 : fall >= 10;
    return fall >= 10 || (fall >= 6 && from > 70);
  }
  function aiStation(player) {
    var order = ["schild", "neu", "schub"];
    for (var i = 0; i < order.length; i++) if (!player.cards[order[i]]) return order[i];
    return null;
  }

  var ENGINE = { rng: rng, makeBoard: makeBoard, moveTarget: moveTarget, stepPath: stepPath, finalAfter: finalAfter, aiAfterRoll: aiAfterRoll, aiShield: aiShield, aiStation: aiStation, indexBoard: indexBoard, meanRolls: meanRolls };
  if (typeof module !== "undefined" && module.exports) module.exports = ENGINE;
  if (typeof document === "undefined") return;

  /* ================= Bedienung ================= */
  var $ = function (id) { return document.getElementById(id); };
  var KEY_GAME = "aufwindwahr_spiel", KEY_SETUP = "aufwindwahr_setup", KEY_STATS = "aufwindwahr_stats", KEY_SOUND = "aufwindwahr_ton", KEY_SEEN = "aufwindwahr_regeln_gesehen";
  function load(k, fb) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch (e) { return fb; } }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  var reduced = global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, reduced ? Math.min(ms, 60) : ms); }); }
  var rnd = Math.random;
  /* Würfel: echte, gleichverteilte Zufallszahlen aus dem Zufallsgenerator des Geräts (crypto.getRandomValues).
     Werte ab 252 werden verworfen, damit jede Augenzahl exakt gleich wahrscheinlich ist. Keine Steuerung, kein Ausgleich. */
  function die6() {
    var c = global.crypto;
    if (c && c.getRandomValues) { var a = new Uint8Array(1); do { c.getRandomValues(a); } while (a[0] >= 252); return 1 + (a[0] % 6); }
    return 1 + Math.floor(Math.random() * 6);
  }

  /* ---------- Figuren (eigene Zeichnungen) ---------- */
  var FIG = {
    rakete: '<path d="M13 22h6l-.9 4.2L16 29.5l-2.1-3.3z" fill="#FF8A3D"/><path d="M14.6 22h2.8l-.4 2.6-1 1.6-1-1.6z" fill="#FFE59A"/><path d="M10.4 16.5l-3.6 4.4v4.4l3.9-2.6z" fill="#E5484D" stroke="#2A1640" stroke-width="1.1" stroke-linejoin="round"/><path d="M21.6 16.5l3.6 4.4v4.4l-3.9-2.6z" fill="#E5484D" stroke="#2A1640" stroke-width="1.1" stroke-linejoin="round"/><path d="M16 2.8c4.1 3 6.2 7.6 6.2 12.6V22H9.8v-6.6c0-5 2.1-9.6 6.2-12.6z" fill="#FFFFFF" stroke="#2A1640" stroke-width="1.3" stroke-linejoin="round"/><path d="M16 2.8c1.7 1.2 3 2.7 4 4.4h-8c1-1.7 2.3-3.2 4-4.4z" fill="#E5484D"/><path d="M12.4 7.2h7.2" stroke="#2A1640" stroke-width="1.1"/><path d="M19.4 9.5c.9 1.8 1.4 3.8 1.4 5.9V21" fill="none" stroke="#D9D2EE" stroke-width="1.6" stroke-linecap="round"/><circle cx="16" cy="13.2" r="3" fill="#5DB8F0" stroke="#2A1640" stroke-width="1.2"/><circle cx="15" cy="12.2" r="0.9" fill="#FFFFFF"/><path d="M16 22v3.4" stroke="#2A1640" stroke-width="1.1"/>',
    komet: '<path d="M16.6 15.6L4.2 26.8c-.5.5.2 1.3.8.9L18.4 17.8z" fill="#1F5F9E"/><path d="M15.6 12.4L3.8 17.6c-.6.3-.3 1.2.4 1.1l12.3-3.4z" fill="#3D8BD6"/><path d="M19.4 16.8l-5.6 11.1c-.3.6.5 1.1.9.6l7-9.8z" fill="#3D8BD6"/><circle cx="20.6" cy="11.6" r="7" fill="#BFE8FF" fill-opacity="0.55"/><circle cx="20.6" cy="11.6" r="5.2" fill="#FFFFFF" stroke="#2A1640" stroke-width="1.3"/><circle cx="19" cy="10.4" r="1.3" fill="#C9D9F2"/><circle cx="22.4" cy="13.2" r="1" fill="#C9D9F2"/><circle cx="22.2" cy="9.4" r="0.6" fill="#C9D9F2"/><path d="M27 4.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z" fill="#FFFFFF"/>',
    satellit: '<g transform="rotate(-28 16 16)"><rect x="2.6" y="13" width="8" height="6.4" rx="1" fill="#3B5BDB" stroke="#2A1640" stroke-width="1.1"/><path d="M5.3 13v6.4M8 13v6.4M2.6 16.2h8" stroke="#9DB4FF" stroke-width="0.8"/><rect x="21.4" y="13" width="8" height="6.4" rx="1" fill="#3B5BDB" stroke="#2A1640" stroke-width="1.1"/><path d="M24.1 13v6.4M26.8 13v6.4M21.4 16.2h8" stroke="#9DB4FF" stroke-width="0.8"/><path d="M10.6 16.2h2M19.4 16.2h2" stroke="#2A1640" stroke-width="1.3"/><rect x="12.6" y="11.4" width="6.8" height="9.6" rx="1.8" fill="#FFC86B" stroke="#2A1640" stroke-width="1.3"/><path d="M14 14h4M14 16.4h4M14 18.8h4" stroke="#B97F1C" stroke-width="0.8"/><path d="M12.8 8.8a3.2 3.2 0 0 1 6.4 0z" fill="#FFFFFF" stroke="#2A1640" stroke-width="1.1" stroke-linejoin="round"/><path d="M16 8.8v2.6M16 5.6v-2" stroke="#2A1640" stroke-width="1.1" stroke-linecap="round"/><circle cx="16" cy="3.2" r="1" fill="#E5484D"/></g>',
    faehre: '<path d="M9.8 20.5L6 27M22.2 20.5L26 27M13 21.5l-1.4 5M19 21.5l1.4 5" stroke="#2A1640" stroke-width="1.3" stroke-linecap="round"/><path d="M4.4 27.4h3.4M24.2 27.4h3.4" stroke="#2A1640" stroke-width="1.6" stroke-linecap="round"/><path d="M8.6 16.8h14.8l-1.6 5H10.2z" fill="#FFC86B" stroke="#2A1640" stroke-width="1.2" stroke-linejoin="round"/><path d="M11 19.2h10" stroke="#B97F1C" stroke-width="0.8"/><path d="M11.4 7.4h9.2l3 3.6v5.8H8.4V11z" fill="#E6E2F2" stroke="#2A1640" stroke-width="1.3" stroke-linejoin="round"/><path d="M13.2 10.2h5.6l1.4 2.4h-8.4z" fill="#3A3F7A" stroke="#2A1640" stroke-width="0.9" stroke-linejoin="round"/><path d="M13.8 11.1l1.4-.4" stroke="#9DB4FF" stroke-width="0.8" stroke-linecap="round"/><path d="M16 7.4V4.2M14.4 4.2h3.2" stroke="#2A1640" stroke-width="1.1" stroke-linecap="round"/>',
    ufo: '<path d="M11.4 21.2l-2.6 6M20.6 21.2l2.6 6" stroke="#FFE59A" stroke-opacity=".7" stroke-width="1.2" stroke-linecap="round"/><path d="M9.6 15.6a6.4 6.4 0 0 1 12.8 0z" fill="#BFE8FF" stroke="#2A1640" stroke-width="1.3" stroke-linejoin="round"/><path d="M12.4 12.2a3.6 3.6 0 0 1 2.6-2" fill="none" stroke="#FFFFFF" stroke-width="1.2" stroke-linecap="round"/><ellipse cx="16" cy="17.6" rx="13" ry="4.4" fill="#A9B2D8" stroke="#2A1640" stroke-width="1.3"/><path d="M5.2 18.6c3 1.6 6.6 2.3 10.8 2.3s7.8-.7 10.8-2.3" fill="none" stroke="#7A84B8" stroke-width="1"/><circle cx="8.6" cy="18" r="1.2" fill="#FFD27A"/><circle cx="13.2" cy="19.2" r="1.2" fill="#FFD27A"/><circle cx="18.8" cy="19.2" r="1.2" fill="#FFD27A"/><circle cx="23.4" cy="18" r="1.2" fill="#FFD27A"/>',
    astronaut: '<path d="M8.2 29.2c0-4.4 3.5-7 7.8-7s7.8 2.6 7.8 7" fill="#E6E2F2" stroke="#2A1640" stroke-width="1.3" stroke-linejoin="round"/><rect x="13.4" y="24.4" width="5.2" height="3" rx=".8" fill="#5DB8F0" stroke="#2A1640" stroke-width=".9"/><circle cx="16" cy="13.6" r="8.6" fill="#FFFFFF" stroke="#2A1640" stroke-width="1.3"/><rect x="9.8" y="9.4" width="12.4" height="8.4" rx="4.2" fill="#3A3F7A" stroke="#2A1640" stroke-width="1.1"/><path d="M12.4 11.6c1-.9 2.2-1.2 3.4-1.2" fill="none" stroke="#9DB4FF" stroke-width="1.2" stroke-linecap="round"/><path d="M16 5V2.6" stroke="#2A1640" stroke-width="1.1" stroke-linecap="round"/><circle cx="16" cy="2.4" r="1.1" fill="#E5484D"/>',
    planet: '<g transform="rotate(-20 16 16)"><path d="M2.4 16a13.6 4.2 0 0 1 27.2 0" fill="none" stroke="#2A1640" stroke-width="3.4"/><path d="M2.4 16a13.6 4.2 0 0 1 27.2 0" fill="none" stroke="#FFE2A8" stroke-width="1.8"/></g><circle cx="16" cy="16" r="7.8" fill="#FFB061" stroke="#2A1640" stroke-width="1.3"/><path d="M9.4 13.4c3.4 1 9.4 1 13.2-.4M8.6 17.6c3.8 1.1 10.2 1 14.6-.6" fill="none" stroke="#E5703A" stroke-width="1.3" stroke-linecap="round"/><circle cx="13.2" cy="12" r="1.1" fill="#FFE2A8"/><g transform="rotate(-20 16 16)"><path d="M2.4 16a13.6 4.2 0 0 0 27.2 0" fill="none" stroke="#2A1640" stroke-width="3.4"/><path d="M2.4 16a13.6 4.2 0 0 0 27.2 0" fill="none" stroke="#FFE2A8" stroke-width="1.8"/></g>',
    rover: '<path d="M20.4 13V7.6" stroke="#2A1640" stroke-width="1.3" stroke-linecap="round"/><rect x="17.6" y="4.6" width="6" height="3.4" rx="1" fill="#FFFFFF" stroke="#2A1640" stroke-width="1.1"/><circle cx="22" cy="6.3" r=".9" fill="#5DB8F0"/><rect x="5.4" y="10.6" width="11" height="2.6" rx=".6" fill="#3B5BDB" stroke="#2A1640" stroke-width="1"/><path d="M8.2 10.6v2.6M11 10.6v2.6M13.6 10.6v2.6" stroke="#9DB4FF" stroke-width=".7"/><rect x="6" y="13.2" width="20" height="6.4" rx="1.6" fill="#FFC86B" stroke="#2A1640" stroke-width="1.3"/><path d="M8.6 16.4h14.8" stroke="#B97F1C" stroke-width=".8"/><path d="M9.2 19.6v2M16 19.6v2M22.8 19.6v2" stroke="#2A1640" stroke-width="1.2"/><circle cx="9.2" cy="24" r="2.8" fill="#3A3F7A" stroke="#2A1640" stroke-width="1.2"/><circle cx="16" cy="24" r="2.8" fill="#3A3F7A" stroke="#2A1640" stroke-width="1.2"/><circle cx="22.8" cy="24" r="2.8" fill="#3A3F7A" stroke="#2A1640" stroke-width="1.2"/><circle cx="9.2" cy="24" r=".9" fill="#C9D9F2"/><circle cx="16" cy="24" r=".9" fill="#C9D9F2"/><circle cx="22.8" cy="24" r=".9" fill="#C9D9F2"/>'
  };
  var TONE = { rakete: "#F4A83C", komet: "#5FB8EC", satellit: "#C985EC", faehre: "#D6CFF0", ufo: "#F07FA0", astronaut: "#8A9BF0", planet: "#F0705A", rover: "#C2A473" };
  function fig(kind, size, glow) {
    var bg = KIND_COLOR[kind], ring = Math.max(1.5, Math.round(size / 18 * 2) / 2);
    var sh = "0 0 0 " + ring + "px #FFFFFF"; void glow;
    return '<span class="af-fig" style="width:' + size + "px;height:" + size + "px;background:radial-gradient(circle at 35% 30%," + bg + " 0%," + bg + " 55%," + TONE[kind] + " 100%);box-shadow:" + sh + '"><svg width="' + Math.round(size * .8) + '" height="' + Math.round(size * .8) + '" viewBox="0 0 32 32" aria-hidden="true">' + FIG[kind] + "</svg></span>";
  }

  /* ---------- Töne (im Programm erzeugt) ---------- */
  var audio = null, soundOn = load(KEY_SOUND, "an") !== "aus";
  function ac() {
    if (!soundOn) return null;
    try {
      if (!audio) { var C = global.AudioContext || global.webkitAudioContext; if (!C) return null; audio = new C(); }
      if (audio.state === "suspended") audio.resume();
      return audio;
    } catch (e) { return null; }
  }
  function tone(f1, f2, dur, type, vol, delay) {
    var a = ac(); if (!a) return;
    var t = a.currentTime + (delay || 0), o = a.createOscillator(), g = a.createGain();
    o.type = type || "sine"; o.frequency.setValueAtTime(f1, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.08, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + dur + 0.02);
  }
  var SND = {
    dice: function () { for (var i = 0; i < 5; i++) tone(260 + Math.random() * 380, 0, 0.05, "square", 0.025, i * 0.07); },
    step: function () { tone(900, 0, 0.04, "sine", 0.035); },
    up: function () { tone(380, 1250, 0.65, "sine", 0.07); tone(570, 1880, 0.65, "triangle", 0.03); },
    down: function () { tone(700, 110, 0.6, "triangle", 0.08); },
    special: function () { tone(660, 0, 0.12, "sine", 0.06); tone(990, 0, 0.18, "sine", 0.05, 0.1); },
    shield: function () { tone(520, 780, 0.25, "triangle", 0.06); },
    win: function () { [523, 659, 784, 1047, 1319].forEach(function (f, i) { tone(f, 0, 0.32, "triangle", 0.07, i * 0.12); }); }
  };

  /* ---------- Brett zeichnen ---------- */
  var L = 378, O = 3, S = (L - 2 * O) / 10;
  function center(n) {
    var r = rowOf(n), k = (n - 1) % 10, c = r % 2 === 0 ? k : 9 - k;
    return { x: O + c * S + S / 2, y: O + (9 - r) * S + S / 2 };
  }
  function bow(a, b, k) {
    var A = center(a), B = center(b), mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2, dx = B.x - A.x, dy = B.y - A.y;
    return { A: A, B: B, C: { x: mx - dy * k, y: my + dx * k } };
  }
  function f1(v) { return v.toFixed(1); }
  var ICON_CELL = {
    mond: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18.5 15.2A8 8 0 1 1 10.3 4.1a6.4 6.4 0 1 0 8.2 11.1Z" fill="#FFE7A3"/></svg>',
    wurm: '<svg viewBox="0 0 24 24" fill="none" stroke="#F4B8FF" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 12m-1.5 0a1.5 1.5 0 1 0 3 0a3.5 3.5 0 1 0 -7 0a5.5 5.5 0 1 0 11 0a7.5 7.5 0 1 0 -15 0"/></svg>',
    station: '<svg viewBox="0 0 24 24" fill="none" stroke="#B5EEFF" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="6" height="6" rx="1.2" fill="#B5EEFF" fill-opacity="0.3"/><path d="M3 10h6M3 14h6M15 10h6M15 14h6M12 4v5M12 15v5"/></svg>',
    ziel: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.3l2.57 5.76 6.27.67-4.68 4.22 1.31 6.17L12 16.97l-5.47 3.15 1.31-6.17-4.68-4.22 6.27-.67Z" fill="#FFD27A" stroke="#FFF1C8" stroke-width="1"/></svg>',
    erde: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" fill="#7FC8FF"/><path d="M6 10c3 0 3 3 6 2s2-4 5-3M8 16c2-1 4 1 6 0" fill="none" stroke="#2F7FA8" stroke-width="2" stroke-linecap="round"/></svg>'
  };
  var BAND = ["#E58A9A", "#C9789F", "#9C69B0", "#7F5DB8", "#6656B8", "#5050AE", "#3F45A0", "#33398C", "#282E78", "#1F2463"];
  var cellEls = {};
  function renderBoard(board) {
    var h = "";
    for (var row = 0; row < 10; row++) {
      for (var col = 0; col < 10; col++) {
        var r = 9 - row, n = r * 10 + (r % 2 === 0 ? col + 1 : 10 - col);
        var alpha = (row + col) % 2 === 0 ? 0.62 : 0.46, hex = BAND[r];
        var bg = n === 100 ? "rgba(255,200,107,.45)" : "rgba(" + parseInt(hex.slice(1, 3), 16) + "," + parseInt(hex.slice(3, 5), 16) + "," + parseInt(hex.slice(5, 7), 16) + "," + alpha + ")";
        var ic = n === 1 ? ICON_CELL.erde : n === 100 ? ICON_CELL.ziel : (board.spec[n] ? ICON_CELL[board.spec[n]] : "");
        h += '<div class="af-cell" data-n="' + n + '" style="background:' + bg + '"><b>' + n + "</b>" + ic + "</div>";
      }
    }
    $("cells").innerHTML = h;
    cellEls = {};
    Array.prototype.forEach.call($("cells").children, function (el) { cellEls[el.getAttribute("data-n")] = el; });
    var s = "";
    board.ups.forEach(function (u, i) {
      var g = bow(u[0], u[1], i % 2 ? 0.2 : -0.2), d = "M" + f1(g.A.x) + " " + f1(g.A.y) + " Q" + f1(g.C.x) + " " + f1(g.C.y) + " " + f1(g.B.x) + " " + f1(g.B.y);
      var tx = g.B.x - g.C.x, ty = g.B.y - g.C.y, tl = Math.sqrt(tx * tx + ty * ty) || 1; tx /= tl; ty /= tl;
      var hx = g.B.x - tx * 8, hy = g.B.y - ty * 8, px = -ty * 4.6, py = tx * 4.6, sx = g.B.x + tx * 6, sy = g.B.y + ty * 6;
      s += '<path d="' + d + '" fill="none" stroke="#E6FAFF" stroke-width="2" stroke-linecap="round" stroke-dasharray="0.1 5.5"/>' +
        '<path d="M' + f1(hx + px) + " " + f1(hy + py) + " L" + f1(g.B.x) + " " + f1(g.B.y) + " L" + f1(hx - px) + " " + f1(hy - py) + '" fill="none" stroke="#E6FAFF" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>' +
        '<path d="M' + f1(sx) + " " + f1(sy - 5) + ' l1.1 2.6 2.6 1.1 -2.6 1.1 -1.1 2.6 -1.1 -2.6 -2.6 -1.1 2.6 -1.1z" fill="#FFF3B0"/>';
    });
    board.downs.forEach(function (m, i) {
      var g = bow(m[0], m[1], i % 2 ? 0.12 : -0.12), d = "M" + f1(g.A.x) + " " + f1(g.A.y) + " Q" + f1(g.C.x) + " " + f1(g.C.y) + " " + f1(g.B.x) + " " + f1(g.B.y);
      s += '<path d="' + d + '" fill="none" stroke="#FFC29E" stroke-width="1.4" stroke-linecap="round"/>' +
        '<circle cx="' + f1(g.B.x) + '" cy="' + f1(g.B.y) + '" r="5" fill="#FF7A45"/><circle cx="' + f1(g.B.x) + '" cy="' + f1(g.B.y) + '" r="2.8" fill="#FFB27E"/><circle cx="' + f1(g.B.x + 1) + '" cy="' + f1(g.B.y - 1) + '" r="1.1" fill="#7A2E1C"/>';
    });
    $("links").innerHTML = s;
  }
  function sizeBoard() {
    var w = $("boardwrap"), size = Math.floor(Math.min(w.clientWidth - 12, w.clientHeight - 4, 560));
    if (size < 200) size = Math.min(w.clientWidth - 12, 360);
    var b = $("board"); b.style.width = b.style.height = size + "px"; b.style.setProperty("--cell", (size / 10) + "px");
  }

  /* ---------- Spielzustand ---------- */
  var G = null, board = null, busy = false, waiter = null;
  function cur() { return G.players[G.turn]; }
  function persist() { if (G) save(KEY_GAME, G); }

  function placeTokens(skipIdx) {
    var groups = {};
    G.players.forEach(function (p, i) { (groups[p.pos] = groups[p.pos] || []).push(i); });
    var OFF = { 1: [[0, 0]], 2: [[-6, 2], [6, 2]], 3: [[-7, 4], [7, 4], [0, -5]], 4: [[-7, -4], [7, -4], [-7, 5], [7, 5]] };
    G.players.forEach(function (p, i) {
      if (i === skipIdx) return;
      var g = groups[p.pos], k = g.indexOf(i), off = OFF[Math.min(4, g.length)][k], c = center(p.pos);
      setTok(i, c.x + off[0], c.y + off[1]);
    });
  }
  function setTok(i, x, y) { var t = $("tok" + i); if (!t) return; t.style.left = (x / L * 100) + "%"; t.style.top = (y / L * 100) + "%"; }
  function renderTokens() {
    $("tokens").innerHTML = G.players.map(function (p, i) { return '<div class="af-token" id="tok' + i + '"><span class="af-shadow"></span>' + fig(p.kind, 30, false) + "</div>"; }).join("");
    placeTokens();
    markTurn();
  }
  function markTurn() {
    G.players.forEach(function (p, i) {
      var t = $("tok" + i); if (!t) return;
      var on = i === G.turn && !G.winner && G.winner !== 0;
      t.classList.toggle("on", on);
      t.querySelector(".af-fig").outerHTML = fig(p.kind, 30, on);
    });
  }
  function renderChips() {
    var n = G.players.length, el = $("chips");
    el.style.gridTemplateColumns = "repeat(" + n + ", minmax(0, 1fr))";
    el.classList.toggle("n4", n === 4);
    el.innerHTML = G.players.map(function (p, i) {
      var on = i === G.turn, col = KIND_COLOR[p.kind];
      var dots = ["schub", "neu", "schild"].map(function (k) { return '<span class="af-dot' + (p.cards[k] ? " full" : "") + '"></span>'; }).join("");
      return '<div class="af-chip' + (on ? " on" : "") + '" style="' + (on ? "border-color:" + col + " !important" : "") + '" aria-label="' + esc(p.name) + ", Feld " + p.pos + '"><span class="af-fig-wrap">' + fig(p.kind, n === 4 ? 24 : 28, false) + '</span><div class="af-chip-txt"><div class="af-chip-name">' + esc(p.name) + '</div><div class="af-chip-meta"><span class="af-chip-pos" style="background:' + col + '">' + p.pos + "</span>" + dots + "</div></div></div>";
    }).join("");
  }
  function setTurnText(html, kind) {
    $("turn-fig").innerHTML = fig(kind || cur().kind, 30, true);
    $("turn-txt").innerHTML = html;
  }
  var PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
  function renderDie(v) {
    var p = PIPS[v || 5], h = "";
    for (var i = 0; i < 9; i++) h += '<i class="' + (p.indexOf(i) !== -1 ? "p" : "") + '"></i>';
    $("die").innerHTML = h;
  }
  function renderCards(mode) {
    var p = cur(), human = !p.cpu && !G.winner && G.winner !== 0;
    [["schub", "c-schub"], ["neu", "c-neu"], ["schild", "c-schild"]].forEach(function (k) {
      var b = $(k[1]), has = !!p.cards[k[0]];
      b.classList.toggle("used", !has);
      var usable = human && has && mode === "choose" && k[0] !== "schild";
      b.classList.toggle("ready", usable);
      b.classList.toggle("idle", has && !usable);
      b.disabled = !human || busy && !usable;
      b.setAttribute("aria-label", CARD_NAME[k[0]] + (has ? (k[0] === "schild" ? " – schützt bei einem Meteoriten" : (usable ? " – jetzt einsetzbar" : " – nach dem Würfeln einsetzbar")) : " – verbraucht"));
    });
  }
  function setRoll(label, enabled, go) {
    $("roll-label").textContent = label;
    $("b-roll").disabled = !enabled;
    $("b-roll").classList.toggle("go", !!go);
  }
  function highlight(n) {
    Array.prototype.forEach.call(document.querySelectorAll(".af-cell.target"), function (e) { e.classList.remove("target"); });
    if (n && cellEls[n]) cellEls[n].classList.add("target");
  }
  function describe(t) {
    var Lk = board.link[t];
    if (t === 100) return "Ziel!";
    if (Lk) return Lk.type === "up" ? "Aufwind bis " + Lk.to + "!" : "Meteorit – zurück auf " + Lk.to;
    var s = board.spec[t];
    if (s === "mond") return "Mond – noch einmal würfeln";
    if (s === "wurm") return "Wurmloch – Platztausch";
    if (s === "station") return "Raumstation – Karte aufladen";
    return "";
  }
  function toast(msg) {
    var t = $("toast"); t.textContent = msg; t.hidden = false;
    clearTimeout(toast.t); toast.t = setTimeout(function () { t.hidden = true; }, 2600);
  }

  /* ---------- Fenster ---------- */
  function sheet(o) {
    return new Promise(function (resolve) {
      $("sheet-art").innerHTML = o.art || "";
      $("sheet-kicker").textContent = o.kicker || "";
      $("sheet-title").textContent = o.title || "";
      $("sheet-body").innerHTML = o.body || "";
      var acts = $("sheet-actions"); acts.innerHTML = "";
      var wrap = acts;
      if (o.row) { wrap = document.createElement("div"); wrap.className = "af-row2"; acts.appendChild(wrap); }
      (o.buttons || []).forEach(function (b) {
        var el = document.createElement("button"); el.type = "button";
        el.className = "af-btn " + (b.cls || "af-btn-main"); el.innerHTML = b.html || esc(b.label);
        if (b.disabled) el.disabled = true;
        el.addEventListener("click", function () { close(); resolve(b.value); });
        (b.row === false ? acts : wrap).appendChild(el);
      });
      var back = $("sheet");
      function close() { back.hidden = true; back.onclick = null; document.removeEventListener("keydown", onKey); }
      function onKey(e) { if (e.key === "Escape" && o.dismiss !== false) { close(); resolve(o.cancelValue); } }
      back.onclick = function (e) { if (e.target === back && o.dismiss !== false) { close(); resolve(o.cancelValue); } };
      document.addEventListener("keydown", onKey);
      back.hidden = false;
      setTimeout(function () { var f = acts.querySelector("button"); if (f) try { f.focus({ preventScroll: true }); } catch (e) { } }, 60);
    });
  }
  var RULE_ICONS = {
    up: '<svg viewBox="0 0 24 24" fill="none" stroke="#E6FAFF" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 19C8 10 13 7 19 5"/><path d="M13 4.5l6 .5-1.5 5.8"/></svg>',
    down: '<svg viewBox="0 0 24 24"><path d="M5 4 Q10 10 16 17" fill="none" stroke="#FFC29E" stroke-width="2.4" stroke-linecap="round"/><circle cx="17" cy="18" r="4" fill="#FF7A45"/></svg>',
    card: '<svg viewBox="0 0 24 24" fill="none" stroke="#BFF0FF" stroke-width="2" stroke-linejoin="round"><rect x="5" y="3.5" width="14" height="17" rx="3"/><path d="M12 15V9M9 11.5l3-3 3 3" stroke-linecap="round"/></svg>',
    ziel: ICON_CELL.ziel.replace("<svg ", '<svg width="22" height="22" ')
  };
  function showRules() {
    return sheet({
      title: "So spielst du AufwindWahr",
      body: '<div class="af-rules">' +
        "<div>" + ICON_CELL.erde + "<span>Alle starten auf der <b>Erde</b> (Feld 1). Reihum wird gewürfelt und gezogen. Wer zuerst genau auf <b>Feld 100</b> landet, erreicht die Sterne und gewinnt. Wer zu weit würfeln würde, bleibt stehen und versucht es in der nächsten Runde erneut – mit der Karte <b>±1</b> lässt sich die passende Zahl auch einstellen.</span></div>" +
        "<div>" + RULE_ICONS.up + "<span>Ein <b>Aufwind</b> trägt dich hinauf bis zu seiner Spitze.</span></div>" +
        "<div>" + RULE_ICONS.down + "<span>Ein <b>Meteorit</b> wirft dich hinunter, dorthin, wo er einschlägt.</span></div>" +
        "<div>" + RULE_ICONS.card + "<span>Jeder hat drei <b>Schubkarten</b> für das ganze Spiel: <b>±1</b> zieht ein Feld weiter oder weniger, <b>Neu</b> würfelt noch einmal, das <b>Schild</b> wehrt einen Meteoriten ab. Karten setzt du nach dem Würfeln ein.</span></div>" +
        "<div>" + ICON_CELL.mond + "<span><b>Mond:</b> noch einmal würfeln.</span></div>" +
        "<div>" + ICON_CELL.wurm + "<span><b>Wurmloch:</b> Du tauschst den Platz mit dem nächsten Mitspieler vor dir.</span></div>" +
        "<div>" + ICON_CELL.station + "<span><b>Raumstation:</b> Eine verbrauchte Karte wird wieder aufgeladen.</span></div>" +
        "<div>" + RULE_ICONS.ziel + "<span>Jedes Brett ist neu gemischt und auf Fairness geprüft. Mit seiner <b>Brett-Nummer</b> kannst du es für eine Revanche wieder aufrufen.</span></div>" +
        "</div>",
      buttons: [{ label: "Alles klar", value: true }]
    }).then(function () { save(KEY_SEEN, 1); });
  }

  /* ---------- Spielablauf ---------- */
  function newGame(setup, boardNo) {
    var players = setup.map(function (s, i) {
      var k = KIND_NAME[s.kind] ? s.kind : KINDS[i];
      return { name: (s.name || "").trim() || KIND_NAME[k], kind: k, cpu: s.cpu || null, pos: 1, cards: { schub: 1, neu: 1, schild: 1 }, rolls: 0 };
    });
    G = { v: 1, boardNo: boardNo, players: players, turn: 0, round: 1, winner: null, log: "", started: Date.now() };
    persist();
  }
  function enterGame() {
    board = makeBoard(G.boardNo);
    showScreen("game");
    sizeBoard();
    renderBoard(board);
    renderTokens();
    renderChips();
    renderDie(5);
    $("top-sub").textContent = "Brett " + G.boardNo + " · Runde " + G.round;
    if (G.winner !== null && G.winner !== undefined) { showWin(); return; }
    beginTurn(G.log);
  }
  function beginTurn(prefix) {
    var p = cur();
    busy = false;
    highlight(null);
    renderChips(); markTurn();
    $("top-sub").textContent = "Brett " + G.boardNo + " · Runde " + G.round;
    var head = "<strong>" + esc(p.name) + " ist dran!</strong>";
    setTurnText(head + (prefix ? " " + prefix : (p.cpu ? " Der Computer überlegt …" : " Tippe auf Würfeln.")));
    renderCards("roll");
    if (p.cpu) { setRoll("Würfeln", false); sleep(900).then(function () { if (G && cur() === p) doRoll(); }); }
    else setRoll("Würfeln", true);
  }
  async function rollDie() {
    var d = $("die"); d.classList.remove("rolling"); void d.offsetWidth; d.classList.add("rolling");
    SND.dice();
    var v = die6();
    for (var i = 0; i < 6; i++) { renderDie(1 + Math.floor(Math.random() * 6)); await sleep(70); }
    renderDie(v);
    return v;
  }
  async function doRoll() {
    if (busy) return; busy = true;
    var p = cur();
    setRoll("…", false); renderCards("busy");
    var v = await rollDie();
    p.rolls++;
    await choose(p, v, "");
  }
  /* Nach dem Wurf: ziehen oder Karte einsetzen */
  async function choose(p, v, mod) {
    var steps = v, note = mod;
    while (true) {
      var t = moveTarget(p.pos, steps), what = describe(t);
      highlight(t);
      var over = p.pos + steps > 100;
      var line = "<strong>" + esc(p.name) + "</strong> würfelt " + v + (note ? " " + note : "") + (over ? " → zu weit, bleibt auf Feld " + p.pos + " (genau " + (100 - p.pos) + " nötig)." : " → Feld " + t + (what ? ": " + what : "."));
      setTurnText(line);
      if (p.cpu) {
        await sleep(700);
        var a = aiAfterRoll(board, p, v, rnd);
        if (a === "neu" && p.cards.neu && note.indexOf("neu") === -1) {
          p.cards.neu = 0; renderChips(); toast(p.name + " würfelt neu."); v = await rollDie(); steps = v; note = "(neu gewürfelt)"; continue;
        }
        if ((a === "plus" || a === "minus") && p.cards.schub && note.indexOf("Schub") === -1) {
          p.cards.schub = 0; renderChips(); steps = a === "plus" ? v + 1 : v - 1; note = "(Schub " + (a === "plus" ? "+1" : "−1") + ")"; toast(p.name + " setzt Schub " + (a === "plus" ? "+1" : "−1") + " ein."); continue;
        }
        await sleep(400);
        break;
      }
      var canSchub = p.cards.schub && note.indexOf("Schub") === -1, canNeu = p.cards.neu && note.indexOf("neu gewürfelt") === -1;
      if (!canSchub && !canNeu) { await sleep(650); break; }
      busy = false;
      renderCards("choose");
      if (!canSchub) $("c-schub").classList.remove("ready");
      if (!canNeu) $("c-neu").classList.remove("ready");
      setRoll("Ziehen", true, true);
      var choice = await new Promise(function (res) { waiter = res; });
      waiter = null; busy = true; renderCards("busy"); setRoll("…", false);
      if (choice === "move") break;
      if (choice === "neu" && canNeu) { p.cards.neu = 0; renderChips(); v = await rollDie(); steps = v; note = "(neu gewürfelt)"; continue; }
      if (choice === "schub" && canSchub) {
        var t1 = moveTarget(p.pos, v + 1), t0 = v > 1 ? moveTarget(p.pos, v - 1) : null;
        var pick = await sheet({
          title: "Schub einsetzen", body: "<p>Ein Feld weiter oder eins weniger – die Karte gilt einmal im ganzen Spiel.</p>", row: true,
          buttons: [
            { label: "−1", html: "−1<small>" + (t0 === p.pos ? "zu weit" : "Feld " + (t0 || "–") + (t0 && describe(t0) ? " · " + esc(describe(t0)) : "")) + "</small>", value: "minus", cls: "af-btn-ghost", disabled: !t0 },
            { label: "+1", html: "+1<small>" + (t1 === p.pos ? "zu weit" : "Feld " + t1 + (describe(t1) ? " · " + esc(describe(t1)) : "")) + "</small>", value: "plus" },
            { label: "Abbrechen", value: null, cls: "af-btn-ghost", row: false }
          ]
        });
        if (pick) { p.cards.schub = 0; renderChips(); steps = pick === "plus" ? v + 1 : v - 1; note = "(Schub " + (pick === "plus" ? "+1" : "−1") + ")"; }
        continue;
      }
    }
    await move(p, steps, v, note);
  }
  async function move(p, steps, v, note) {
    var idx = G.turn, from = p.pos, path = stepPath(p.pos, steps);
    highlight(null);
    if (!path.length) {
      /* zu weit gewürfelt: Figur bleibt stehen, nächster Versuch in der nächsten Runde */
      var stay = esc(p.name) + " würfelte " + v + (note ? " " + note : "") + " – zu weit, bleibt auf Feld " + p.pos + " (genau " + (100 - p.pos) + " nötig)";
      G.log = stay + "."; G.turn = (G.turn + 1) % G.players.length; if (G.turn === 0) G.round++;
      persist(); await sleep(500); beginTurn(stay + "."); return;
    }
    for (var i = 0; i < path.length; i++) {
      p.pos = path[i];
      var c = center(p.pos); setTok(idx, c.x, c.y);
      var tk = $("tok" + idx); tk.classList.remove("hop"); void tk.offsetWidth; tk.classList.add("hop");
      SND.step(); await sleep(170);
    }
    var log = esc(p.name) + " würfelte " + v + (note ? " " + note : "") + " und zog auf " + p.pos;
    var extra = false;
    var Lk = board.link[p.pos];
    if (Lk && Lk.type === "up") {
      SND.up(); await fly(idx, p.pos, Lk.to); log += ", dann mit dem Aufwind auf " + Lk.to; p.pos = Lk.to;
    } else if (Lk && Lk.type === "down") {
      var useShield = false;
      if (p.cards.schild) {
        if (p.cpu) { useShield = aiShield(p, p.pos, Lk.to, rnd); await sleep(500); }
        else {
          useShield = await sheet({
            art: meteorArt(), kicker: "Feld " + p.pos + " · Meteorit", title: p.name + " stürzt auf Feld " + Lk.to,
            body: "<p>" + (p.pos - Lk.to) + " Felder zurück – es sei denn, du setzt jetzt dein Schutzschild ein.</p>",
            dismiss: false,
            buttons: [{ label: "Schild einsetzen!", value: true, cls: "af-btn-violet" }, { label: "Absturz annehmen", value: false, cls: "af-btn-ghost" }]
          });
        }
      }
      if (useShield) { p.cards.schild = 0; SND.shield(); toast(p.name + " wehrt den Meteoriten mit dem Schild ab!"); log += " – das Schild hielt den Meteoriten ab"; }
      else { SND.down(); await fly(idx, p.pos, Lk.to); log += ", ein Meteorit warf " + (p.pos > 0 ? "zurück auf " : "") + Lk.to; p.pos = Lk.to; }
    } else if (board.spec[p.pos] === "mond" && p.pos !== 100) {
      SND.special(); extra = true; log += " – Mond: noch einmal!";
    } else if (board.spec[p.pos] === "wurm") {
      SND.special();
      var ahead = null;
      G.players.forEach(function (q, j) { if (j !== idx && q.pos > p.pos && (ahead === null || q.pos < G.players[ahead].pos)) ahead = j; });
      if (ahead === null) log += " – das Wurmloch fand niemanden vor " + (p.cpu ? "sich" : "dir");
      else {
        var q = G.players[ahead], mine = p.pos; p.pos = q.pos; q.pos = mine;
        log += " – Wurmloch: Platztausch mit " + esc(q.name) + " (jetzt " + p.pos + ")";
        placeTokens();
      }
    } else if (board.spec[p.pos] === "station") {
      SND.special();
      var used = ["schild", "neu", "schub"].filter(function (k) { return !p.cards[k]; });
      if (!used.length) log += " – Raumstation, alle Karten sind voll";
      else {
        var k = used[0];
        if (!p.cpu && used.length > 1) {
          k = await sheet({
            title: "Raumstation", kicker: "Feld " + p.pos, body: "<p>Welche Karte soll wieder aufgeladen werden?</p>", dismiss: false,
            buttons: used.map(function (u) { return { label: CARD_NAME[u], value: u, cls: u === used[0] ? "af-btn-main" : "af-btn-ghost" }; })
          });
        } else if (p.cpu) k = aiStation(p) || used[0];
        p.cards[k] = 1; log += " – Raumstation: " + CARD_NAME[k] + " wieder aufgeladen";
      }
    }
    placeTokens(); renderChips();
    if (p.pos === 100) { G.winner = idx; G.log = log; persist(); await sleep(300); showWin(); return; }
    G.log = log + ".";
    if (!extra) {
      G.turn = (G.turn + 1) % G.players.length;
      if (G.turn === 0) G.round++;
    }
    persist();
    beginTurn(extra ? log + "." : log + ".");
  }
  function fly(idx, a, b) {
    var isUp = b > a, list = isUp ? board.ups : board.downs, k = 0;
    for (var i = 0; i < list.length; i++) if (list[i][0] === a) { k = i; break; }
    var g = bow(a, b, isUp ? (k % 2 ? 0.2 : -0.2) : (k % 2 ? 0.12 : -0.12)), dur = reduced ? 60 : 750;
    return new Promise(function (res) {
      var t0 = null, tk = $("tok" + idx); tk.style.transition = "none";
      function frame(ts) {
        if (t0 === null) t0 = ts;
        var t = Math.min(1, (ts - t0) / dur), e = t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        var x = (1 - e) * (1 - e) * g.A.x + 2 * (1 - e) * e * g.C.x + e * e * g.B.x;
        var y = (1 - e) * (1 - e) * g.A.y + 2 * (1 - e) * e * g.C.y + e * e * g.B.y;
        setTok(idx, x, y);
        if (t < 1) requestAnimationFrame(frame); else { tk.style.transition = ""; res(); }
      }
      requestAnimationFrame(frame);
    });
  }
  function meteorArt() {
    return '<svg width="150" height="100" viewBox="0 0 150 110" aria-hidden="true"><path d="M18 8 Q60 36 104 78" fill="none" stroke="#FF9A6A" stroke-opacity=".18" stroke-width="22" stroke-linecap="round"/><path d="M30 14 Q66 40 104 78" fill="none" stroke="#FFB48C" stroke-opacity=".45" stroke-width="9" stroke-linecap="round"/><path d="M48 26 Q74 46 104 78" fill="none" stroke="#FFE2CF" stroke-width="3" stroke-linecap="round"/><circle cx="108" cy="82" r="15" fill="#FF8A57"/><circle cx="104" cy="78" r="7" fill="#FFE2CF"/></svg>';
  }
  function confetti() {
    if (reduced) return;
    var box = document.createElement("div"); box.className = "af-confetti";
    var cols = ["#FFC86B", "#8FD8FF", "#E7A6FF", "#FFFFFF", "#FF9EC0"], h = "";
    for (var i = 0; i < 60; i++) h += '<i style="left:' + Math.round(Math.random() * 100) + "%;background:" + cols[i % 5] + ";animation-delay:" + (Math.random() * 0.9).toFixed(2) + "s;border-radius:" + (i % 3 ? "2px" : "50%") + '"></i>';
    box.innerHTML = h; document.body.appendChild(box);
    setTimeout(function () { box.remove(); }, 3800);
  }
  function showWin() {
    var w = G.players[G.winner];
    highlight(null); markTurn(); renderChips();
    setTurnText("<strong>" + esc(w.name) + " hat die Sterne erreicht!</strong>", w.kind);
    setRoll("Würfeln", false); renderCards("over");
    if (!G.counted) {
      G.counted = true;
      var st = load(KEY_STATS, { gamesPlayed: 0, wins: {} }); st.gamesPlayed = (st.gamesPlayed || 0) + 1; st.wins = st.wins || {};
      st.wins[w.name] = (st.wins[w.name] || 0) + 1; save(KEY_STATS, st); persist();
      SND.win(); confetti();
    }
    var ranking = G.players.map(function (p, i) { return { p: p, i: i }; }).sort(function (a, b) { return a.i === G.winner ? -1 : b.i === G.winner ? 1 : b.p.pos - a.p.pos; });
    var body = '<div class="af-rank">' + ranking.map(function (r, k) {
      return '<div class="af-rank-row"><b>' + (k + 1) + "</b>" + fig(r.p.kind, 28, false) + "<span class=\"af-rank-name\">" + esc(r.p.name) + "</span><em>" + (r.p.pos === 100 ? "Ziel · " + r.p.rolls + " Würfe" : "Feld " + r.p.pos) + "</em></div>";
    }).join("") + "</div>";
    sheet({
      art: fig(w.kind, 76, true), kicker: "Runde " + G.round + " · Brett " + G.boardNo, title: w.name + " erreicht die Sterne!", body: body, dismiss: false,
      buttons: [{ label: "Revanche auf diesem Brett", value: "revanche" }, { label: "Neues Spiel", value: "neu", cls: "af-btn-ghost" }]
    }).then(function (v) {
      if (v === "revanche") { var setup = G.players.map(function (p) { return { name: p.name, cpu: p.cpu, kind: p.kind }; }); newGame(setup, G.boardNo); enterGame(); }
      else { try { localStorage.removeItem(KEY_GAME); } catch (e) { } G = null; showStart(); }
    });
  }

  /* ---------- Startseite ---------- */
  var setup = load(KEY_SETUP, null);
  if (!Array.isArray(setup) || setup.length < 2) setup = [{ name: "Ich", cpu: null }, { name: "Computer", cpu: "mittel" }];
  /* jedem Mitspieler ein eigenes Symbol geben (ältere Einstellungen hatten keins) */
  (function () { var used = {}; setup.forEach(function (s) { if (KIND_NAME[s.kind] && !used[s.kind]) used[s.kind] = 1; else s.kind = null; }); setup.forEach(function (s) { if (!s.kind) { s.kind = KINDS.filter(function (k) { return !used[k]; })[0]; used[s.kind] = 1; } }); })();
  var boardMode = "new", pickFor = -1;
  function freeKind() { for (var i = 0; i < KINDS.length; i++) if (!setup.some(function (s) { return s.kind === KINDS[i]; })) return KINDS[i]; return KINDS[0]; }
  function uniqueName(base) { var n = base, k = 2; while (setup.some(function (s) { return s.name === n; })) n = base + " " + k++; return n; }
  var PEN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/></svg>';
  function renderSetup() {
    $("setup-players").innerHTML = setup.map(function (s, i) {
      var k = s.kind;
      return '<div class="af-prow-wrap"><div class="af-prow"><button type="button" class="af-figbtn" data-pick="' + i + '" aria-expanded="' + (pickFor === i) + '" aria-label="Symbol ändern, jetzt ' + KIND_NAME[k] + '">' + fig(k, 44, false) + '<span class="af-figedit">' + PEN + "</span></button>" +
        '<div class="af-prow-main"><label class="af-prow-name"><input type="text" maxlength="14" data-i="' + i + '" value="' + esc(s.name) + '" placeholder="Name" aria-label="Name von Mitspieler ' + (i + 1) + '" enterkeyhint="done" autocomplete="off" autocapitalize="words">' + PEN + "</label>" +
        '<div class="af-seg" role="group" aria-label="Wer spielt?"><button type="button" data-h="' + i + '" aria-pressed="' + (!s.cpu) + '">Mensch</button><button type="button" data-c="' + i + '" aria-pressed="' + (!!s.cpu) + '">Computer</button></div>' +
        (s.cpu ? '<div class="af-levels" role="group" aria-label="Stärke des Computers">' + LEVELS.map(function (l) { return '<button type="button" data-l="' + i + '" data-v="' + l + '" aria-pressed="' + (s.cpu === l) + '">' + LEVEL_NAME[l] + "</button>"; }).join("") + "</div>" : "") +
        "</div>" + (setup.length > 2 ? '<button type="button" class="af-x" data-x="' + i + '" aria-label="' + esc(s.name || KIND_NAME[k]) + ' entfernen"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button>' : "") + "</div>" +
        (pickFor === i ? '<div class="af-kinds" role="radiogroup" aria-label="Symbol wählen">' + KINDS.map(function (kk) {
          var other = -1; setup.forEach(function (o, j) { if (j !== i && o.kind === kk) other = j; });
          return '<button type="button" class="af-kind' + (kk === k ? " on" : "") + '" role="radio" aria-checked="' + (kk === k) + '" data-kind="' + kk + '" data-for="' + i + '">' + fig(kk, 34, false) + "<span>" + KIND_NAME[kk] + "</span>" + (other >= 0 ? '<em>tauscht mit ' + esc(setup[other].name || KIND_NAME[kk]) + "</em>" : "") + "</button>";
        }).join("") + "</div>" : "") + "</div>";
    }).join("");
    var add = $("b-add-player");
    add.hidden = setup.length >= 4;
    if (setup.length < 4) add.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>Mitspieler hinzufügen';
  }
  function saveSetup() { save(KEY_SETUP, setup); }
  function lastBoardNo() { var g = load(KEY_GAME, null); var s = load("aufwindwahr_letztes_brett", null); return (g && g.boardNo) || s || ""; }
  function renderBoardPick() {
    $("pick-new").setAttribute("aria-checked", String(boardMode === "new"));
    $("pick-same").setAttribute("aria-checked", String(boardMode === "same"));
    $("boardno-row").hidden = boardMode !== "same";
    $("board-hint").textContent = boardMode === "new" ? "jedes Spiel ein neues Brett" : "gleiche Nummer = gleiches Brett";
    var lb = lastBoardNo(); $("pick-same-sub").textContent = lb ? "zuletzt: " + lb : "für eine Revanche";
    if (boardMode === "same" && !$("boardno").value) $("boardno").value = lb;
  }
  function renderContinue() {
    var g = load(KEY_GAME, null), ok = g && g.players && (g.winner === null || g.winner === undefined);
    $("continue").hidden = !ok;
    if (ok) $("continue-sub").textContent = "Runde " + g.round + " · " + g.players.map(function (p) { return p.name; }).join(", ");
  }
  function showScreen(which) {
    $("s-start").hidden = which !== "start"; $("s-game").hidden = which !== "game";
  }
  function showStart() { showScreen("start"); renderSetup(); renderBoardPick(); renderContinue(); $("start-msg").textContent = ""; }

  function bind() {
    $("setup-players").addEventListener("input", function (e) { var i = e.target.getAttribute("data-i"); if (i !== null) { setup[+i].name = e.target.value; saveSetup(); } });
    $("setup-players").addEventListener("change", function (e) { var i = e.target.getAttribute("data-i"); if (i !== null) { setup[+i].name = e.target.value.trim(); saveSetup(); } });
    $("setup-players").addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return;
      if (b.hasAttribute("data-pick")) { var pi = +b.getAttribute("data-pick"); pickFor = pickFor === pi ? -1 : pi; renderSetup(); return; }
      if (b.hasAttribute("data-kind")) {
        var me = setup[+b.getAttribute("data-for")], nk = b.getAttribute("data-kind");
        setup.forEach(function (o) { if (o !== me && o.kind === nk) o.kind = me.kind; });
        me.kind = nk; pickFor = -1;
      }
      else if (b.hasAttribute("data-h")) { var sh = setup[+b.getAttribute("data-h")]; if (sh.cpu && (!sh.name || /^computer/i.test(sh.name))) sh.name = uniqueName("Spieler"); sh.cpu = null; }
      else if (b.hasAttribute("data-c")) { var s = setup[+b.getAttribute("data-c")]; if (!s.cpu) { s.cpu = "mittel"; if (!s.name || /^(ich|spieler)/i.test(s.name)) { s.name = ""; s.name = uniqueName("Computer"); } } }
      else if (b.hasAttribute("data-l")) { setup[+b.getAttribute("data-l")].cpu = b.getAttribute("data-v"); }
      else if (b.hasAttribute("data-x")) { setup.splice(+b.getAttribute("data-x"), 1); pickFor = -1; }
      else return;
      saveSetup(); renderSetup();
    });
    $("b-add-player").addEventListener("click", function () { if (setup.length < 4) { setup.push({ name: uniqueName("Computer"), cpu: "mittel", kind: freeKind() }); saveSetup(); renderSetup(); } });
    $("pick-new").addEventListener("click", function () { boardMode = "new"; renderBoardPick(); });
    $("pick-same").addEventListener("click", function () { boardMode = "same"; renderBoardPick(); setTimeout(function () { $("boardno").focus(); }, 50); });
    $("boardno").addEventListener("input", function () { this.value = this.value.replace(/\D/g, "").slice(0, 4); });
    $("b-rules-start").addEventListener("click", showRules);
    $("b-start").addEventListener("click", function () {
      ac();
      var no = newBoardNo();
      if (boardMode === "same") {
        no = parseInt($("boardno").value, 10);
        if (!(no >= 1000 && no <= 9999)) { $("start-msg").textContent = "Bitte eine Brett-Nummer von 1000 bis 9999 eingeben."; return; }
      }
      save("aufwindwahr_letztes_brett", no);
      newGame(setup, no);
      enterGame();
      if (!load(KEY_SEEN, 0)) setTimeout(showRules, 400);
    });
    $("b-continue").addEventListener("click", function () { ac(); G = load(KEY_GAME, null); if (G) enterGame(); });
    $("b-roll").addEventListener("click", function () {
      ac();
      if (waiter) { waiter("move"); return; }
      if (!busy && G && !cur().cpu) doRoll();
    });
    $("c-schub").addEventListener("click", function () { if (waiter && this.classList.contains("ready")) waiter("schub"); else cardInfo("schub"); });
    $("c-neu").addEventListener("click", function () { if (waiter && this.classList.contains("ready")) waiter("neu"); else cardInfo("neu"); });
    $("c-schild").addEventListener("click", function () { cardInfo("schild"); });
    $("b-back").addEventListener("click", function () { if (busy && !waiter) return; showStart(); });
    $("b-menu").addEventListener("click", openMenu);
    global.addEventListener("resize", function () { if (!$("s-game").hidden) sizeBoard(); });
  }
  function cardInfo(k) {
    var p = G && cur(); if (!p) return;
    if (!p.cards[k]) { toast(CARD_NAME[k] + " ist schon verbraucht – eine Raumstation lädt sie wieder auf."); return; }
    if (k === "schild") toast("Das Schild schützt, sobald du auf einem Meteoriten landest – du wirst dann gefragt.");
    else toast(CARD_NAME[k] + " setzt du nach dem Würfeln ein.");
  }
  function openMenu() {
    if (busy && !waiter) return;
    var icon = function (p) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + "</svg>"; };
    sheet({
      title: "Menü",
      body: '<div class="af-menu">' +
        '<button type="button" data-m="regeln">' + icon('<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.6h.01"/>') + "Spielregeln</button>" +
        '<button type="button" data-m="ton">' + icon(soundOn ? '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4 4 0 010 6M18 6.5a7.5 7.5 0 010 11"/>' : '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/>') + (soundOn ? "Töne ausschalten" : "Töne einschalten") + "</button>" +
        '<button type="button" data-m="revanche">' + icon('<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 5v6h-6"/>') + "Neu beginnen (gleiches Brett)</button>" +
        '<button type="button" data-m="start">' + icon('<path d="M15 5l-7 7 7 7"/>') + "Zur Startseite von AufwindWahr</button>" +
        "</div>",
      buttons: [{ label: "Schließen", value: null, cls: "af-btn-ghost" }]
    });
    Array.prototype.forEach.call(document.querySelectorAll("[data-m]"), function (b) {
      b.addEventListener("click", function () {
        var m = b.getAttribute("data-m");
        $("sheet").hidden = true;
        if (m === "regeln") showRules();
        else if (m === "ton") { soundOn = !soundOn; save(KEY_SOUND, soundOn ? "an" : "aus"); toast(soundOn ? "Töne an" : "Töne aus"); if (soundOn) SND.special(); }
        else if (m === "revanche") {
          if (waiter) { waiter = null; }
          var s2 = G.players.map(function (p) { return { name: p.name, cpu: p.cpu }; }); newGame(s2, G.boardNo); enterGame();
        }
        else if (m === "start") showStart();
      });
    });
  }

  function stars() {
    var h = "", r = rng(7);
    for (var i = 0; i < 70; i++) { var s = r() < 0.15 ? 2 : 1; h += '<i style="left:' + (r() * 100).toFixed(2) + "%;top:" + (r() * 100).toFixed(2) + "%;width:" + s + "px;height:" + s + "px;opacity:" + (0.2 + r() * 0.5).toFixed(2) + '"></i>'; }
    $("af-stars").innerHTML = h;
  }
  function init() {
    stars(); bind(); showStart();
    if (/[?&]spiel=weiter/.test(location.search)) { G = load(KEY_GAME, null); if (G && G.winner == null) enterGame(); }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
  global.AufwindWahr = ENGINE;
})(typeof window !== "undefined" ? window : this);
