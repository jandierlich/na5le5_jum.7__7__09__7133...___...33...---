/* ============================================================
   lb-exp.js — LabWahr: Versuchsbeschreibungen und Auswertung
   18 Versuche in vier Themenbereichen. Je Versuch: Fragestellung,
   Hypothese, Theorie, Aufbau, Sicherheit, Auswertung mit
   Messunsicherheit, Fehlerquellen und Wissenstest.
   Texte, Skizzen und Aufgaben sind eigene Arbeit.
   © 2026 Jan Dierlich – Alle Rechte vorbehalten.
   ============================================================ */
(function (global) {
  "use strict";
  var C = global.LBCore, RAD = Math.PI / 180;

  function f(n, d) { return n == null || !isFinite(n) ? "–" : n.toLocaleString("de-DE", { minimumFractionDigits: d, maximumFractionDigits: d }); }
  function pm(v, u, d, unit) { return f(v, d) + " ± " + f(u, d) + (unit ? " " + unit : ""); }
  function rel(v, ref) { return (v - ref) / ref; }
  function pc(x, d) { var dd = d == null ? 1 : d; if (Math.abs(x) * 100 < 0.5 * Math.pow(10, -dd)) x = 0; return (x > 0 ? "+" : x < 0 ? "−" : "") + f(Math.abs(x) * 100, d == null ? 1 : d) + " %"; }
  function rate(absRel, good, ok) {
    if (!isFinite(absRel)) return null;
    return absRel <= good ? { cls: "g", text: "sehr gute Übereinstimmung" } : absRel <= ok ? { cls: "y", text: "brauchbare Übereinstimmung" } : { cls: "r", text: "deutliche Abweichung" };
  }
  function fail(msg) { return { ok: false, msg: msg }; }

  var THEMES = [
    { id: "mech", title: "Mechanik", sub: "Schwingungen, Kräfte und Bewegung" },
    { id: "akustik", title: "Akustik", sub: "Schallausbreitung, Frequenz und Raum" },
    { id: "astro", title: "Astronomie & Geodäsie", sub: "Sonnenstand, Erdform und Erddrehung" },
    { id: "bio", title: "Biomechanik & Wahrnehmung", sub: "Messungen am eigenen Körper" }
  ];

  var I = {
    pendel: "M4 3.5h16M12 3.5 15 13.6M13.2 16.2a2.6 2.6 0 1 0 5.2 0a2.6 2.6 0 1 0 -5.2 0M5 16.5q2.8 3.6 6.6 2.4",
    zentri: "M4 12a8 8 0 1 0 16 0a8 8 0 1 0 -16 0M9.6 12a2.4 2.4 0 1 0 4.8 0a2.4 2.4 0 1 0 -4.8 0M14.2 9.8l4.3-4.3M15.6 5.4h3v3",
    aufzug: "M6 3.5h12v17H6zM12 3.5v17M8 9.5l1.5-2 1.5 2M13 14.5l1.5 2 1.5-2",
    reibung: "M3 19.5h18M4 19.5 19.5 10M11.2 13.6l2.7-1.6 1.5 2.5-2.7 1.6zM16 19.5a4.6 4.6 0 0 0-1.1-3",
    schaukel: "M5 3.5h14M8 3.5l3 11M16 3.5l-3 11M9.5 14.5h5M4 20.5h16",
    seismo: "M3 12h3l2-5 3 10 2.5-7 2 4H21M3 20h18M3 4h18",
    echo: "M4 12h.01M7 8.5a5 5 0 0 1 0 7M10 6a8.6 8.6 0 0 1 0 12M19 3.5v17M19 7h2M19 11h2M19 15h2",
    ball: "M9 5.5a3 3 0 1 0 .01 0M3 20.5h18M6.5 19.5q1.5-6 3-6t3 6q1.2-4 2.4-4t2.4 4",
    doppler: "M3 12q1.8-4 3.6 0t3.6 0M12.5 12q1.2-2.6 2.4 0t2.4 0M19.5 8.5 22 12l-2.5 3.5",
    abstand: "M3.5 9.5h3l4-3.5v12l-4-3.5h-3zM14 18.5h7M14 16.8v3.4M21 16.8v3.4M14.5 9q1.6 1.5 0 3",
    nachhall: "M3 4h18v16H3zM6.5 12q1.4-4 2.8 0t2.8 0q.9-2.4 1.8 0t1.8 0q.4-1 .8 0",
    helmholtz: "M9.5 3h4v4.2l2.2 3.2v8.8a2 2 0 0 1-2 2h-4.4a2 2 0 0 1-2-2v-8.8l2.2-3.2zM7.3 14h8.4M18.6 6.5q1.6 2 0 4M20.8 5q2.8 3.5 0 7",
    schatten: "M11 4v14M11 18l8.5 2M5 7a1.8 1.8 0 1 0 0.01 0M3 20.5h18",
    erde: "M4 14a8 8 0 1 0 16 0a8 8 0 1 0 -16 0M4.6 14h14.8M12 6V2.5M8.6 6.8 6.4 3.6",
    mittag: "M4 17.5h16M12 17.5V9M12 9l6.5 8.5M12 4.5V3M17 6l1-1M7 6 6 5",
    reaktion: "M12 8v5l3 2M5.8 13.5a6.2 6.2 0 1 0 12.4 0a6.2 6.2 0 1 0 -12.4 0M10 3h4M12 3v4.4",
    gang: "M8.2 3.8c2 0 2.6 3 2 5.2s-3.2 2-3.6 0-.4-5.2 1.6-5.2zM7 11.6h3M15.6 10.2c2 0 2.6 3 2 5.2s-3.2 2-3.6 0-.4-5.2 1.6-5.2zM14.4 18h3",
    balance: "M12 3.4a1.7 1.7 0 1 0 .01 0M12 7.2v6.6M6.5 9.6h11M12 13.8l-3.4 6.6M12 13.8l1.4 3.6 2.6-1"
  };

  /* Skizzen: gemeinsame Klassen (Farben kommen aus lb-style.css, passend zu Hell/Dunkel) */
  function sk(inner) { return '<svg viewBox="0 0 326 180" class="lb-sketch" role="img" aria-label="Versuchsskizze"><rect class="sk-bg" x="0" y="0" width="326" height="180" rx="14"/>' + inner + "</svg>"; }
  function phone(x, y, rot, w, h) { w = w || 22; h = h || 40; return '<g transform="rotate(' + (rot || 0) + " " + (x + w / 2) + " " + (y + h / 2) + ')"><rect class="sk-ph" x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="5"/><rect class="sk-scr" x="' + (x + 3) + '" y="' + (y + 4) + '" width="' + (w - 6) + '" height="' + (h - 8) + '" rx="2"/></g>'; }
  function txt(x, y, s, anchor) { return '<text class="sk-t" x="' + x + '" y="' + y + '"' + (anchor ? ' text-anchor="' + anchor + '"' : "") + ">" + s + "</text>"; }

  var LIST = [
    /* ===================== MECHANIK ===================== */
    {
      id: "pendel", theme: "mech", icon: I.pendel, title: "Fadenpendel", q: "Bestimmung der Erdbeschleunigung g", min: 15, lvl: 1,
      frage: "Wie groß ist die Fallbeschleunigung g an deinem Ort? Ein Fadenpendel liefert sie über die Schwingungsdauer T und die Pendellänge L.",
      hypo: { q: "Hängt die Schwingungsdauer eines Fadenpendels von der Masse des Pendelkörpers ab?", opts: ["Ja, ein schwererer Körper schwingt schneller", "Nein, die Masse hat keinen Einfluss", "Ja, ein schwererer Körper schwingt langsamer"], ok: 1,
        why: "Schwere Masse (Gewichtskraft) und träge Masse sind gleich groß und kürzen sich in der Bewegungsgleichung heraus. Für kleine Ausschläge zählt nur die Länge L." },
      theorie: "Für kleine Auslenkungen (unter etwa 10°) ist die rücktreibende Kraft näherungsweise proportional zur Auslenkung – das Pendel schwingt harmonisch. Die Schwingungsdauer hängt dann nur von L und g ab.",
      formel: "T = 2π · √(L / g)   ⇒   g = 4π² · L / T²",
      formelInfo: "Unsicherheit: u(g)/g = √[(u(L)/L)² + (2·u(T)/T)²]. Der Fehler von T geht doppelt ein, deshalb über viele Schwingungen mitteln.",
      aufbau: ["Smartphone in Hülle in einen Stoffbeutel legen; Beutel doppelt an eine Schnur knoten.", "Schnur an einem stabilen Punkt (Türrahmen, Stange) befestigen; Pendellänge 0,8–1,5 m.", "Länge L vom Aufhängepunkt bis zur Mitte des Smartphones messen (das ist näherungsweise der Schwerpunkt).", "Um höchstens 10° auslenken und loslassen – ohne Kreisen oder Verdrehen."],
      skizze: sk('<rect class="sk-f2" x="40" y="14" width="246" height="10" rx="4"/>' + txt(44, 42, "Aufhängung") + '<path class="sk-a" d="M163 24 L203 132"/><path class="sk-d" d="M163 24 V132"/><path class="sk-dd" d="M126 146 Q163 162 200 146"/>' + phone(192, 128, -20) + '<path class="sk-w" d="M148 24 v104M144 24h8M144 128h8"/>' + txt(140, 82, "L", "end") + txt(230, 98, "Ausschlag") + txt(230, 111, "≤ 10°")),
      material: ["Smartphone in Hülle", "Stoffbeutel", "Schnur, ca. 1,5 m", "Maßband", "Kissen als Unterlage"],
      sicherheit: "Weiche Unterlage darunter legen, Knoten vorher mit einem kräftigen Ruck prüfen, Pendelbereich freihalten.",
      runner: "period",
      inputs: [{ id: "L", label: "Pendellänge L", hint: "Aufhängung bis Smartphone-Mitte", unit: "cm", def: 100, min: 20, max: 400, step: 0.5 }, { id: "uL", label: "Unsicherheit von L", hint: "Ablesegenauigkeit", unit: "cm", def: 1, min: 0.1, max: 10, step: 0.1 }],
      evaluate: function (d, p) {
        if (!d || d.n < 4) return fail("Zu wenige vollständige Schwingungen erkannt. Lass das Pendel mindestens 6 Schwingungen ruhig ausschwingen.");
        var L = p.L / 100, uL = p.uL / 100, T = d.T, uT = d.sd / Math.sqrt(d.n), g = C.pendulumG(L, T), ug = g * Math.sqrt(Math.pow(uL / L, 2) + Math.pow(2 * uT / T, 2)), ref = 9.81, dv = rel(g, ref);
        return {
          ok: true, main: { label: "Fallbeschleunigung", value: f(g, 2), unit: "m/s²" }, sub: "Messunsicherheit ± " + f(ug, 2) + " m/s² (" + f(ug / g * 100, 1) + " %)",
          scale: { min: 9.3, max: 10.3, ref: ref, refLabel: "Literatur 9,81", val: g, valLabel: f(g, 2), band: [g - ug, g + ug] }, rating: rate(Math.abs(dv), 0.01, 0.03),
          table: [["Schwingungsdauer T", pm(T, uT, 3, "s")], ["Ausgewertete Schwingungen", String(d.n)], ["Streuung der Einzelwerte", f(d.sd * 1000, 0) + " ms"], ["Abweichung von 9,81 m/s²", pc(dv)]],
          note: "Die Abweichung ist " + (Math.abs(dv) <= Math.abs(ug / g) + 0.002 ? "kleiner als die Messunsicherheit – das Ergebnis ist mit dem Literaturwert verträglich." : "größer als die berechnete Unsicherheit. Am häufigsten liegt es an der Länge: Der Schwerpunkt von Beutel und Smartphone liegt nicht genau in der Gerätemitte."),
          store: { v: g, unit: "m/s²", d: 2, dev: dv, text: "g = " + pm(g, ug, 2, "m/s²") + " (L = " + f(p.L, 1) + " cm, T = " + f(T, 3) + " s)" }
        };
      },
      fehler: ["Pendellänge: Der Schwerpunkt von Beutel und Smartphone ist nur geschätzt (oft ±1–2 cm).", "Großer Ausschlag: Über 10° wird T merklich länger (bei 20° um ca. 0,8 %).", "Kreisen oder Verdrehen des Beutels überlagert eine zweite Schwingung.", "Dehnung der Schnur unter Last."],
      test: [
        { q: "Die Pendellänge wird vervierfacht. Wie ändert sich die Schwingungsdauer?", opts: ["Sie vervierfacht sich", "Sie verdoppelt sich", "Sie halbiert sich", "Sie bleibt gleich"], ok: 1, why: "T ∝ √L, also √4 = 2." },
        { q: "Warum misst man die Dauer mehrerer Schwingungen statt einer einzelnen?", opts: ["Weil die erste Schwingung immer falsch ist", "Weil sich zufällige Fehler im Mittel verkleinern", "Weil das Pendel sonst stehen bleibt", "Weil g sich mit der Zeit ändert"], ok: 1, why: "Die Unsicherheit des Mittelwerts sinkt mit 1/√n." },
        { q: "Welche Schwingungsdauer hätte ein 1 m langes Pendel auf dem Mond (g = 1,62 m/s²)?", opts: ["etwa 2,0 s", "etwa 3,1 s", "etwa 4,9 s", "etwa 12 s"], ok: 2, why: "T = 2π·√(1/1,62) ≈ 4,94 s." }
      ],
      weiter: "Variiere L (z. B. 50, 100, 150 cm) und trage T² über L auf: Es ergibt sich eine Gerade mit der Steigung 4π²/g."
    },
    {
      id: "zentri", theme: "mech", icon: I.zentri, title: "Zentripetalbeschleunigung", q: "Zusammenhang von Drehrate und Beschleunigung", min: 10, lvl: 2,
      frage: "Wie hängt die Beschleunigung auf einer Kreisbahn von der Winkelgeschwindigkeit ab? Gemessen werden Drehrate ω (Gyroskop) und Beschleunigung a (Beschleunigungssensor) gleichzeitig.",
      hypo: { q: "Die Drehrate wird verdoppelt. Wie ändert sich die Zentripetalbeschleunigung?", opts: ["Sie verdoppelt sich", "Sie vervierfacht sich", "Sie bleibt gleich", "Sie halbiert sich"], ok: 1,
        why: "a = ω²·r – die Beschleunigung wächst quadratisch mit der Winkelgeschwindigkeit." },
      theorie: "Ein Körper auf einer Kreisbahn wird ständig zum Mittelpunkt hin beschleunigt, sonst würde er geradeaus weiterfliegen. Aus vielen Wertepaaren (ω, a) lässt sich der Bahnradius r als Ausgleichsparameter bestimmen und mit dem gemessenen Abstand vergleichen.",
      formel: "a = ω² · r   (ω in rad/s, a in m/s²)",
      formelInfo: "Ausgleichsgerade durch den Ursprung: r = Σ(a·ω²) / Σ(ω⁴). Sensor und Drehachse sollten möglichst genau den gemessenen Abstand haben.",
      aufbau: ["Variante Salatschleuder: Smartphone flach und in ein Geschirrtuch gepolstert an den Rand des Korbs legen.", "Variante Drehstuhl: Smartphone flach auf den Sitz legen, Abstand zur Drehachse messen.", "Abstand r von der Drehachse bis zur Smartphone-Mitte messen.", "Langsam beginnen und die Drehung allmählich steigern – höchstens etwa 2 Umdrehungen pro Sekunde."],
      skizze: sk('<ellipse class="sk-i" cx="163" cy="100" rx="110" ry="54"/><circle class="sk-f" cx="163" cy="100" r="4"/><path class="sk-d" d="M163 100 H243"/>' + phone(238, 82, 90, 22, 38) + '<path class="sk-a" d="M163 30 v40M155 38 l8-8 8 8"/>' + txt(200, 94, "r", "middle") + txt(150, 26, "Drehachse", "end") + '<path class="sk-a" d="M70 54 q-30 30 0 76"/><path class="sk-a" d="M64 124 l6 6 7-5"/>' + txt(40, 96, "ω", "middle")),
      material: ["Smartphone in Hülle", "Salatschleuder mit Handkurbel oder Drehstuhl", "Geschirrtuch", "Maßband"],
      sicherheit: "Nur mit gepolstertem Smartphone und mäßiger Drehzahl arbeiten; über ca. 8 g können die Sensoren übersteuern. Auf dem Drehstuhl nur sitzend und langsam drehen.",
      runner: "spin",
      inputs: [{ id: "r", label: "Abstand zur Drehachse r", hint: "Achse bis Smartphone-Mitte", unit: "cm", def: 10, min: 2, max: 100, step: 0.5 }],
      evaluate: function (d, p) {
        if (!d || d.pairs.length < 30 || d.wmax < 3) return fail("Zu wenige Messpunkte mit ausreichender Drehung. Steigere die Drehrate langsam auf mindestens eine halbe Umdrehung pro Sekunde.");
        var r = C.spinFit(d.pairs), r0 = p.r / 100, dv = rel(r, r0), res = 0;
        d.pairs.forEach(function (q) { res += Math.pow(q.a - r * q.w * q.w, 2); });
        var rms = Math.sqrt(res / d.pairs.length);
        return {
          ok: true, main: { label: "Bahnradius aus a = ω²·r", value: f(r * 100, 1), unit: "cm" }, sub: "gemessen mit dem Maßband: " + f(p.r, 1) + " cm",
          scale: { min: r0 * 50, max: r0 * 150, ref: r0 * 100, refLabel: "Maßband " + f(p.r, 1), val: r * 100, valLabel: f(r * 100, 1) }, rating: rate(Math.abs(dv), 0.08, 0.2),
          table: [["Höchste Drehrate", f(d.wmax, 1) + " rad/s (" + f(d.wmax * 60 / (2 * Math.PI), 0) + " U/min)"], ["Höchste Beschleunigung", f(d.amax, 1) + " m/s² (" + f(d.amax / 9.81, 1) + " g)"], ["Wertepaare", String(d.pairs.length)], ["Mittlere Abweichung von der Parabel", f(rms, 2) + " m/s²"], ["Abweichung vom Maßband", pc(dv)]],
          plot: { pairs: d.pairs, r: r },
          note: "Die Messpunkte liegen auf einer Parabel – doppelte Drehrate bedeutet vierfache Beschleunigung. Der Beschleunigungssensor sitzt nicht genau in der Gerätemitte; das erklärt Abweichungen von einigen Millimetern.",
          store: { v: r * 100, unit: "cm", d: 1, dev: dv, text: "r = " + f(r * 100, 1) + " cm aus a = ω²r (Maßband " + f(p.r, 1) + " cm), max. " + f(d.amax / 9.81, 1) + " g" }
        };
      },
      fehler: ["Lage des Sensors im Gerät (einige Millimeter neben der Mitte).", "Rutschen des Smartphones bei hoher Drehzahl.", "Tangentiale Beschleunigung beim Anschieben und Abbremsen.", "Übersteuerung der Sensoren bei sehr schneller Drehung."],
      test: [
        { q: "Wohin zeigt die Beschleunigung eines Körpers auf einer gleichförmigen Kreisbahn?", opts: ["Tangential in Bewegungsrichtung", "Zum Kreismittelpunkt", "Vom Mittelpunkt weg", "Sie ist null"], ok: 1, why: "Die Zentripetalbeschleunigung zeigt zum Mittelpunkt; die „Fliehkraft“ ist eine Scheinkraft im mitrotierenden System." },
        { q: "Eine Schleuder dreht mit 10 rad/s, r = 0,1 m. Wie groß ist a?", opts: ["1 m/s²", "10 m/s²", "100 m/s²", "0,1 m/s²"], ok: 1, why: "a = ω²r = 100 · 0,1 = 10 m/s²." },
        { q: "Warum trocknet eine Salatschleuder den Salat?", opts: ["Die Luft im Korb wird erwärmt", "Das Wasser wird nicht auf der Kreisbahn gehalten und fliegt tangential durch die Schlitze", "Das Wasser verdunstet durch Reibung", "Das Wasser wird zur Achse gezogen"], ok: 1, why: "Am Salat haftet das Wasser nicht stark genug, um die nötige Zentripetalkraft aufzubringen." }
      ],
      weiter: "Lege das Smartphone bei gleicher Drehung an verschiedene Radien: Bei gleichem ω wächst a linear mit r."
    },
    {
      id: "aufzug", theme: "mech", icon: I.aufzug, title: "Aufzugfahrt", q: "Höhe durch zweifache Integration", min: 5, lvl: 2,
      frage: "Lässt sich die Förderhöhe eines Aufzugs allein aus der gemessenen Beschleunigung bestimmen? Aus a(t) folgt durch Integration v(t) und daraus die Höhe h.",
      hypo: { q: "Was zeigt eine Personenwaage im Aufzug kurz nach dem Anfahren nach oben?", opts: ["Weniger als im Stand", "Mehr als im Stand", "Genau das Gleiche", "Null"], ok: 1,
        why: "Beim Beschleunigen nach oben muss der Boden zusätzlich die Kraft m·a aufbringen – die Waage zeigt mehr an." },
      theorie: "Der Beschleunigungssensor misst die Summe aus Schwerkraft und Bewegungsbeschleunigung. Zieht man den Ruhewert g₀ ab, bleibt die Aufzugbeschleunigung. Kleine Messfehler wachsen bei der Integration an; deshalb wird ausgenutzt, dass der Aufzug am Ende wieder stillsteht (v = 0), um die Drift zu korrigieren.",
      formel: "v(t) = ∫ (a − g₀) dt      h = ∫ v(t) dt",
      formelInfo: "Driftkorrektur: v wird linear so verschoben, dass v am Ende null ist. Ein Restfehler von nur 0,01 m/s² ergibt nach 20 s bereits 2 m Höhenfehler.",
      aufbau: ["Smartphone flach auf den Boden der Kabine legen (Display nach oben).", "Messung starten und 2 Sekunden ruhig warten – daraus wird der Ruhewert g₀ bestimmt.", "Fahrt auslösen; das Smartphone während der Fahrt nicht berühren.", "Nach dem Halt noch 2 Sekunden warten, dann die Messung beenden."],
      skizze: sk('<rect class="sk-i" x="118" y="20" width="90" height="146" rx="6"/><path class="sk-d" d="M163 20 V4"/><rect class="sk-f2" x="124" y="150" width="78" height="10" rx="3"/>' + phone(146, 138, 90, 12, 34) + '<path class="sk-a" d="M240 120 V50M232 60 l8-10 8 10"/>' + txt(252, 90, "a, v, h") + txt(60, 160, "Ruhe: g₀", "middle")),
      material: ["Smartphone", "Aufzug (mehrere Stockwerke)", "optional: Geschosshöhe aus dem Bauplan"],
      sicherheit: "Normale Aufzugfahrt; nichts weiter zu beachten. Das Smartphone nicht vor der Tür liegen lassen.",
      runner: "lift",
      inputs: [{ id: "ref", label: "Vergleichshöhe (optional)", hint: "z. B. Stockwerke × Geschosshöhe; 0 = keine", unit: "m", def: 0, min: 0, max: 500, step: 0.1 }],
      evaluate: function (d, p) {
        if (!d || !isFinite(d.h) || d.T < 6) return fail("Die Messung ist zu kurz. Bitte 2 s vor und nach der Fahrt ruhig liegen lassen.");
        var h = d.h, dir = h >= 0 ? "aufwärts" : "abwärts", uh = Math.max(0.3, Math.abs(h) * 0.05), ref = p.ref > 0 ? p.ref : null, dv = ref ? rel(Math.abs(h), ref) : NaN;
        return {
          ok: true, main: { label: "Höhenunterschied (" + dir + ")", value: f(Math.abs(h), 1), unit: "m" }, sub: "geschätzte Unsicherheit ± " + f(uh, 1) + " m · Fahrtdauer " + f(d.T, 0) + " s",
          scale: ref ? { min: ref * 0.6, max: ref * 1.4, ref: ref, refLabel: "Vergleich " + f(ref, 1), val: Math.abs(h), valLabel: f(Math.abs(h), 1), band: [Math.abs(h) - uh, Math.abs(h) + uh] } : null,
          rating: ref ? rate(Math.abs(dv), 0.07, 0.15) : null,
          table: [["Höchstgeschwindigkeit", f(Math.abs(d.vmax), 2) + " m/s (" + f(Math.abs(d.vmax) * 3.6, 1) + " km/h)"], ["Größte Beschleunigung", f(Math.abs(d.amax), 2) + " m/s² (" + f(Math.abs(d.amax) / 9.81 * 100, 1) + " % von g)"], ["Ruhewert g₀ (Sensor)", f(d.g0, 3) + " m/s²"], ["Etwa Stockwerke (à 3 m)", f(Math.abs(h) / 3, 1)]].concat(ref ? [["Abweichung vom Vergleichswert", pc(dv)]] : []),
          plot: { v: d.vs, h: d.hs, t: d.ts },
          note: "Während der Fahrt mit konstanter Geschwindigkeit misst der Sensor genau g – nur Anfahren und Bremsen sind spürbar. Die Höhe ergibt sich deshalb fast vollständig aus diesen wenigen Sekunden.",
          store: { v: Math.abs(h), unit: "m", d: 1, dev: dv, text: "Δh = " + pm(Math.abs(h), uh, 1, "m") + " " + dir + ", v_max = " + f(Math.abs(d.vmax), 2) + " m/s" }
        };
      },
      fehler: ["Sensor-Offset: Abweichungen von 0,01 m/s² summieren sich quadratisch über die Zeit.", "Bewegung des Smartphones in der Kabine.", "Schwingungen der Kabine beim Halten.", "Kurze Ruhephase am Anfang ergibt einen ungenauen Ruhewert g₀."],
      test: [
        { q: "Ein Aufzug fährt mit konstanter Geschwindigkeit nach oben. Was misst der Beschleunigungssensor?", opts: ["Mehr als g", "Weniger als g", "Genau g", "Null"], ok: 2, why: "Ohne Beschleunigung bleibt nur die Schwerkraft – wie im Stand." },
        { q: "Warum wird die Höhe bei langen Fahrten ungenauer?", opts: ["Der Luftdruck ändert sich", "Kleine Sensorfehler wachsen bei der Doppelintegration quadratisch mit der Zeit", "Das GPS fällt aus", "Die Erde dreht sich"], ok: 1, why: "Ein konstanter Fehler Δa erzeugt den Höhenfehler ½·Δa·t²." },
        { q: "Was zeigt der Sensor in einem frei fallenden Aufzug?", opts: ["2 g", "1 g", "0 g", "−1 g"], ok: 2, why: "Im freien Fall herrscht Schwerelosigkeit – der Sensor misst null." }
      ],
      weiter: "Fahre dieselbe Strecke auf- und abwärts und vergleiche: Beide Werte sollten bis auf die Messunsicherheit gleich sein."
    },
    {
      id: "reibung", theme: "mech", icon: I.reibung, title: "Haftreibung", q: "Haftreibungszahl über den Grenzwinkel", min: 10, lvl: 1,
      frage: "Wie groß ist die Haftreibungszahl μ zwischen zwei Oberflächen? Eine schiefe Ebene wird langsam steiler gestellt, bis das Objekt zu rutschen beginnt.",
      hypo: { q: "Rutscht ein schwererer Gegenstand bei gleichem Material früher, später oder beim gleichen Winkel?", opts: ["Früher", "Später", "Beim gleichen Winkel"], ok: 2,
        why: "Sowohl die Hangabtriebskraft als auch die Normalkraft sind proportional zur Masse – sie kürzt sich heraus: tan α = μ." },
      theorie: "Auf der schiefen Ebene wirkt die Hangabtriebskraft m·g·sin α. Die maximale Haftreibungskraft beträgt μ·m·g·cos α. Am Grenzwinkel sind beide gleich groß. Der Neigungssensor des Smartphones liefert den Winkel direkt.",
      formel: "μ = tan α_grenz",
      formelInfo: "u(μ) = u(α) / cos²α (α im Bogenmaß). Mehrere Wiederholungen mitteln die Streuung der Oberfläche.",
      aufbau: ["Ein Brett (oder großes Buch) flach auf den Tisch legen.", "Smartphone auf eine Pappe oder in eine flache Schachtel legen – sie ist der „Schlitten“, dessen Material gemessen wird.", "Messung starten, dann das Brett an einer Seite sehr langsam anheben.", "Sobald der Schlitten rutscht, wird der Winkel automatisch erfasst (oder „Rutscht jetzt“ tippen). Mindestens dreimal wiederholen."],
      skizze: sk('<path class="sk-f2" d="M40 160 L286 160 L286 70 Z"/><path class="sk-i" d="M40 160 L286 70"/>' + '<g transform="rotate(-20 190 112)"><rect class="sk-f" x="160" y="96" width="62" height="10" rx="2"/></g>' + phone(176, 82, -20, 34, 14) + '<path class="sk-w" d="M100 160 A60 60 0 0 0 96 140"/>' + txt(112, 152, "α") + '<path class="sk-a" d="M200 116 l-36 13M168 124 l-5 5 7 2"/>' + txt(120, 116, "rutscht")),
      material: ["Smartphone in Hülle", "Brett oder großes Buch", "Pappe oder flache Schachtel als Schlitten", "verschiedene Unterlagen (Stoff, Papier, Holz)"],
      sicherheit: "Auf dem Boden oder über einer weichen Unterlage arbeiten, damit das Smartphone nicht tief fallen kann.",
      runner: "slide",
      inputs: [],
      evaluate: function (d) {
        if (!d || d.angles.length < 1) return fail("Noch kein Rutschwinkel erfasst.");
        var a = d.angles, m = C.mean(a), s = a.length > 1 ? C.sd(a) : 1.0, um = a.length > 1 ? s / Math.sqrt(a.length) : 1.0, mu = Math.tan(m * RAD), umu = um * RAD / Math.pow(Math.cos(m * RAD), 2);
        var cls = mu < 0.25 ? "sehr glatt (z. B. Kunststoff auf Glas)" : mu < 0.45 ? "mittel (z. B. Pappe auf Holz)" : mu < 0.7 ? "griffig (z. B. Papier auf Stoff)" : "sehr griffig (z. B. Gummi)";
        return {
          ok: true, main: { label: "Haftreibungszahl", value: f(mu, 2), unit: "" }, sub: "μ = tan(" + f(m, 1) + "°) · Unsicherheit ± " + f(umu, 2),
          scale: { min: 0, max: 1.2, val: mu, valLabel: "μ " + f(mu, 2), band: [mu - umu, mu + umu], marks: [[0.2, "Kunststoff"], [0.5, "Holz"], [0.9, "Gummi"]] },
          rating: a.length >= 3 ? (s < 1.5 ? { cls: "g", text: "gut reproduzierbar" } : s < 4 ? { cls: "y", text: "mäßig reproduzierbar" } : { cls: "r", text: "stark streuend" }) : { cls: "y", text: "für eine Aussage bitte mindestens 3 Versuche" },
          table: [["Grenzwinkel (Mittel)", pm(m, um, 1, "°")], ["Einzelwerte", a.map(function (x) { return f(x, 1) + "°"; }).join(" · ")], ["Standardabweichung", f(s, 1) + "°"], ["Einordnung", cls]],
          note: "Die Haftreibung ist größer als die Gleitreibung: Ist der Schlitten erst in Bewegung, rutscht er auch bei etwas kleinerem Winkel weiter.",
          store: { v: mu, unit: "", d: 2, text: "μ = " + pm(mu, umu, 2) + " (α = " + f(m, 1) + "°, n = " + a.length + ")" }
        };
      },
      fehler: ["Zu schnelles Anheben: Der Winkel wird zu groß gemessen.", "Ungleichmäßige oder verschmutzte Oberflächen.", "Erschütterungen lösen das Rutschen vorzeitig aus.", "Das Brett biegt sich durch."],
      test: [
        { q: "Ein Körper rutscht bei 30°. Wie groß ist μ?", opts: ["0,50", "0,58", "0,87", "1,73"], ok: 1, why: "tan 30° ≈ 0,577." },
        { q: "Warum ist die Haftreibungszahl meist größer als die Gleitreibungszahl?", opts: ["Weil ruhende Körper schwerer sind", "Weil sich Oberflächen im Ruhezustand stärker verzahnen und anhaften", "Weil die Luft bremst", "Das ist nicht so"], ok: 1, why: "Im Stillstand können Mikrokontakte stärker anhaften als beim Gleiten." },
        { q: "Ab welchem Winkel rutscht ein Körper mit μ = 1?", opts: ["30°", "45°", "60°", "90°"], ok: 1, why: "tan 45° = 1." }
      ],
      weiter: "Miss dieselbe Schachtel auf drei Unterlagen und ordne sie nach μ."
    },
    {
      id: "schaukel", theme: "mech", icon: I.schaukel, title: "Belastung auf der Schaukel", q: "g-Kräfte und Amplitude einer Schaukel", min: 10, lvl: 1,
      frage: "Welche Lastvielfache (g-Kräfte) wirken auf einer Schaukel – und lässt sich daraus der Ausschlagwinkel berechnen?",
      hypo: { q: "Wo fühlst du dich auf der Schaukel am schwersten?", opts: ["An den Umkehrpunkten oben", "Im tiefsten Punkt", "Überall gleich"], ok: 1,
        why: "Im tiefsten Punkt ist die Geschwindigkeit am größten. Zusätzlich zur Schwerkraft muss das Seil die Zentripetalkraft m·v²/L aufbringen." },
      theorie: "Der Sensor misst das Lastvielfache n = |a|/g, also das, was du als Schwere spürst. Für ein ideales Pendel mit Amplitude θ₀ gilt im tiefsten Punkt n = 3 − 2·cos θ₀ und am Umkehrpunkt n = cos θ₀. Aus dem Maximum lässt sich so der Ausschlag zurückrechnen.",
      formel: "n_max = 3 − 2·cos θ₀   ⇒   θ₀ = arccos[(3 − n_max) / 2]",
      formelInfo: "Kontrolle: Am Umkehrpunkt sollte n_min ≈ cos θ₀ sein. Reale Schaukeln weichen wegen Körperbewegung und Reibung etwas ab.",
      aufbau: ["Smartphone sicher in einer geschlossenen Brust- oder Jackentasche verstauen.", "Messung starten und gleichmäßig schaukeln.", "Nach mindestens 20 Sekunden ausschwingen lassen und die Messung beenden."],
      skizze: sk('<rect class="sk-f2" x="70" y="14" width="186" height="8" rx="3"/><path class="sk-a" d="M163 22 L163 140"/><path class="sk-d" d="M163 22 L96 118M163 22 L230 118"/><rect class="sk-f" x="148" y="138" width="30" height="6" rx="2"/><path class="sk-dd" d="M92 124 Q163 168 234 124"/>' + txt(163, 172, "unten: n am größten", "middle") + txt(76, 112, "n_min", "end") + '<path class="sk-w" d="M163 60 A38 38 0 0 1 141 53"/>' + txt(150, 76, "θ₀", "end")),
      material: ["Smartphone", "Schaukel (Spielplatz) oder Karussell", "Tasche mit Reißverschluss"],
      sicherheit: "Das Smartphone nur in einer verschlossenen Tasche mitnehmen, nie in der Hand. Spielplatzgeräte sind für Erwachsene teils nicht zugelassen – Hinweisschilder beachten.",
      runner: "gforce",
      inputs: [],
      evaluate: function (d) {
        if (!d || d.T < 8) return fail("Die Messung ist zu kurz. Bitte mindestens 15–20 Sekunden schaukeln.");
        var th = C.swingAmplitude(d.gmax), nmin = isFinite(th) ? Math.cos(th * RAD) : NaN;
        return {
          ok: true, main: { label: "Größtes Lastvielfaches", value: f(d.gmax, 2), unit: "g" }, sub: "kleinstes: " + f(d.gmin, 2) + " g · Dauer " + f(d.T, 0) + " s",
          scale: { min: 0, max: 3, ref: 1, refLabel: "Ruhe 1 g", val: d.gmax, valLabel: f(d.gmax, 2) + " g", band: [d.gmin, d.gmax] },
          table: [["Ausschlag aus n_max", isFinite(th) ? f(th, 0) + "°" : "–"], ["Erwartetes n_min = cos θ₀", isFinite(nmin) ? f(nmin, 2) + " g" : "–"], ["Gemessenes n_min", f(d.gmin, 2) + " g"], ["Typische Vergleichswerte", "Achterbahn bis ca. 4–5 g kurzzeitig · Kunstflug bis ca. 6 g"]],
          note: isFinite(th) ? "Bei " + f(th, 0) + "° Ausschlag ergibt das Pendelmodell am Umkehrpunkt " + f(nmin, 2) + " g – gemessen wurden " + f(d.gmin, 2) + " g. Unterschiede entstehen durch Schwungholen mit dem Körper und weil Kopf und Tasche nicht genau im Schwerpunkt liegen." : "Das Maximum liegt außerhalb des Pendelmodells (1–3 g); der Ausschlag lässt sich nicht berechnen.",
          plot: { g: d.gs, t: d.ts },
          store: { v: d.gmax, unit: "g", d: 2, text: "n_max = " + f(d.gmax, 2) + " g, n_min = " + f(d.gmin, 2) + " g" + (isFinite(th) ? ", θ₀ ≈ " + f(th, 0) + "°" : "") }
        };
      },
      fehler: ["Körperbewegung beim Schwungholen erzeugt zusätzliche Beschleunigungen.", "Das Smartphone sitzt nicht im Schwerpunkt des Pendels.", "Ketten- und Seildehnung."],
      test: [
        { q: "Welches Lastvielfache wirkt im tiefsten Punkt bei 90° Ausschlag (ideales Pendel)?", opts: ["1 g", "2 g", "3 g", "4 g"], ok: 2, why: "n = 3 − 2·cos 90° = 3." },
        { q: "Was misst ein Beschleunigungssensor im Ruhezustand auf dem Tisch?", opts: ["0 g", "1 g nach oben gerichtet", "1 g nach unten gerichtet", "Nichts Sinnvolles"], ok: 1, why: "Er misst die Kraft, die der Tisch ausübt – 1 g nach oben. Im freien Fall wären es 0 g." },
        { q: "Warum fühlt man sich am oberen Umkehrpunkt leichter?", opts: ["Weil man dort schneller ist", "Weil das Seil dort nur einen Teil der Gewichtskraft trägt (n = cos θ₀)", "Weil die Luft trägt", "Weil die Schwerkraft dort kleiner ist"], ok: 1, why: "Im Moment der Umkehr ist v = 0; das Seil trägt nur die Komponente g·cos θ₀." }
      ],
      weiter: "Vergleiche kleine und große Ausschläge: Ab welchem Winkel steigt n_max über 2 g?"
    },
    {
      id: "seismo", theme: "mech", icon: I.seismo, title: "Seismograf", q: "Ausbreitung und Dämpfung von Erschütterungen", min: 10, lvl: 2,
      frage: "Wie stark nimmt eine Erschütterung mit der Entfernung ab? Ein gleichartiger Klopfer wird in drei Abständen auf einem Tisch erzeugt und vom Smartphone als Seismograf aufgezeichnet.",
      hypo: { q: "Der Abstand zum Klopfer wird verdoppelt. Wie ändert sich die gemessene Erschütterung?", opts: ["Sie halbiert sich ungefähr", "Sie bleibt gleich", "Sie verdoppelt sich", "Sie fällt auf null"], ok: 0,
        why: "Die Energie verteilt sich auf eine größere Fläche und wird im Material gedämpft – die Amplitude sinkt deutlich, bei Oberflächenwellen grob mit 1/√r bis 1/r plus Dämpfung." },
      theorie: "Ein Seismometer misst Bodenbewegungen. Das Smartphone erfasst Beschleunigungen ab etwa 1 mg (ein Tausendstel g). Aus dem gleitenden Mittel wird der Ruhewert entfernt; übrig bleibt die Erschütterung. Je weiter die Quelle entfernt ist, desto kleiner die Amplitude.",
      formel: "A(r) ∝ r^(−k) · e^(−α·r)",
      formelInfo: "k beschreibt die geometrische Ausbreitung, α die Materialdämpfung. Aus drei Abständen lässt sich der Abfall grob abschätzen.",
      aufbau: ["Smartphone flach auf einen Tisch legen; den Tisch nicht berühren.", "Messung starten und 3 Sekunden Ruhe abwarten (Grundrauschen).", "Einmal mit gleicher Stärke klopfen (z. B. Murmel aus 10 cm fallen lassen) – in 15 cm, 30 cm und 60 cm Entfernung, je mit 3 Sekunden Pause.", "Messung beenden; die drei stärksten Ereignisse werden zeitlich zugeordnet."],
      skizze: sk('<rect class="sk-f2" x="20" y="110" width="286" height="12" rx="3"/><path class="sk-i" d="M40 122 V168M286 122 V168"/>' + phone(40, 98, 90, 12, 34) + '<circle class="sk-f" cx="110" cy="104" r="5"/><circle class="sk-f" cx="170" cy="104" r="5"/><circle class="sk-f" cx="270" cy="104" r="5"/>' + txt(110, 92, "15 cm", "middle") + txt(170, 92, "30 cm", "middle") + txt(270, 92, "60 cm", "middle") + '<path class="sk-a" d="M30 50 h40 l6-18 8 34 7-26 6 10 h40 l4-8 4 12 4-4 h40 l2-4 2 6 2-2 h60"/>'),
      material: ["Smartphone", "stabiler Tisch", "Murmel oder kleiner Ball", "Lineal"],
      sicherheit: "Keine Gefährdung. Nicht mit Werkzeug auf den Tisch schlagen.",
      runner: "seismo",
      inputs: [],
      evaluate: function (d) {
        if (!d || d.events.length < 1) return fail("Kein deutliches Ereignis erkannt. Klopfe etwas kräftiger oder näher am Smartphone.");
        var ev = d.events.slice().sort(function (a, b) { return b.v - a.v; }).slice(0, 3).sort(function (a, b) { return a.t - b.t; });
        var dist = [15, 30, 60], rows = ev.map(function (e, i) { return [(ev.length === 3 ? dist[i] + " cm" : "Ereignis " + (i + 1)) + " · bei " + f(e.t, 1) + " s", f(e.v * 1000 / 9.81, 1) + " mg"]; });
        var ratio = ev.length >= 2 ? ev[ev.length - 1].v / ev[0].v : NaN, k = ev.length === 3 ? -Math.log(ev[2].v / ev[0].v) / Math.log(4) : NaN;
        return {
          ok: true, main: { label: "Stärkstes Ereignis", value: f(d.peak * 1000 / 9.81, 1), unit: "mg" }, sub: "Grundrauschen ca. " + f(d.noise * 1000 / 9.81, 1) + " mg · " + d.events.length + " Ereignisse erkannt",
          table: rows.concat(isFinite(k) ? [["Abfall von 15 auf 60 cm", "auf " + f(ratio * 100, 0) + " %"], ["Abfall-Exponent k (A ∝ r^−k)", f(k, 2)]] : []),
          plot: { g: d.gs, t: d.ts, marks: ev.map(function (e) { return e.t; }) },
          note: isFinite(k) ? "Ein Exponent um 0,5 entspricht Oberflächenwellen ohne Dämpfung, um 1 Raumwellen. Größere Werte zeigen eine starke Dämpfung im Tisch – Holz und Verbindungen schlucken Energie." : "Für die Entfernungsabhängigkeit bitte genau drei deutliche Klopfer in 15, 30 und 60 cm erzeugen.",
          store: { v: d.peak * 1000 / 9.81, unit: "mg", d: 1, text: "Max. " + f(d.peak * 1000 / 9.81, 1) + " mg" + (isFinite(k) ? ", Abfall-Exponent k = " + f(k, 2) : "") }
        };
      },
      fehler: ["Unterschiedlich starke Klopfer verfälschen den Vergleich.", "Berührung des Tisches während der Messung.", "Resonanzen der Tischplatte.", "Gerade bei Gebäuden: Verkehr oder Schritte im Hintergrund."],
      test: [
        { q: "Was bedeutet 1 mg?", opts: ["1 Milligramm", "ein Tausendstel der Erdbeschleunigung", "1 Meter pro Sekunde", "1 Millimeter"], ok: 1, why: "1 mg ≈ 0,0098 m/s²." },
        { q: "Welche Erdbebenwellen kommen an einer Messstation zuerst an?", opts: ["Oberflächenwellen", "S-Wellen", "P-Wellen", "Alle gleichzeitig"], ok: 2, why: "P-Wellen (Kompressionswellen) sind am schnellsten." },
        { q: "Warum nimmt die Amplitude mit der Entfernung ab?", opts: ["Nur wegen der Luft", "Geometrische Ausbreitung und Materialdämpfung", "Weil der Sensor ermüdet", "Sie nimmt gar nicht ab"], ok: 1, why: "Die Energie verteilt sich und wird zum Teil in Wärme umgewandelt." }
      ],
      weiter: "Wiederhole die Messung auf dem Fußboden: Estrich leitet Erschütterungen anders als eine Tischplatte."
    },

    /* ===================== AKUSTIK ===================== */
    {
      id: "echo", theme: "akustik", icon: I.echo, title: "Schallgeschwindigkeit", q: "Laufzeitmessung über das Echo", min: 15, lvl: 3,
      frage: "Wie schnell breitet sich Schall in Luft aus? Ein Klatschen wird an einer großen Wand reflektiert; aus der Laufzeit des Echos und dem Abstand folgt die Geschwindigkeit.",
      hypo: { q: "Wie hängt die Schallgeschwindigkeit in Luft von der Temperatur ab?", opts: ["Sie ist konstant", "Sie steigt mit der Temperatur", "Sie sinkt mit der Temperatur"], ok: 1,
        why: "Wärmere Luftmoleküle bewegen sich schneller und geben die Druckwelle schneller weiter: c ≈ 331,3 · √(1 + ϑ/273,15) m/s." },
      theorie: "Der Schall legt den Weg zur Wand und zurück zurück – also die doppelte Entfernung. Das Mikrofon zeichnet Knall und Echo auf; die Laufzeitdifferenz wird aus der Hüllkurve bestimmt. Bei 50 m Abstand beträgt sie etwa 0,29 s.",
      formel: "c = 2·d / Δt      c_theo(ϑ) = 331,3 · √(1 + ϑ / 273,15) m/s",
      formelInfo: "u(c)/c = √[(u(d)/d)² + (u(Δt)/Δt)²]. Je größer der Abstand, desto kleiner der relative Zeitfehler.",
      aufbau: ["Eine große, glatte Wand mit freiem Feld davor suchen (Turnhalle außen, Garagenwand, Felswand).", "Mindestens 30 m Abstand, besser 50–80 m; Abstand abschreiten oder aus einer Karte bestimmen.", "Abstand eintragen, Messung starten und einmal kräftig klatschen (oder zwei Bretter zusammenschlagen).", "Mehrmals wiederholen – jede Messung zählt einzeln."],
      skizze: sk('<rect class="sk-f2" x="276" y="20" width="22" height="140" rx="2"/>' + phone(36, 92, 0) + '<path class="sk-a" d="M70 100 H268M258 92 l10 8-10 8"/><path class="sk-d" d="M268 120 H70M80 112 l-10 8 10 8"/>' + txt(170, 90, "Hinweg d", "middle") + txt(170, 140, "Rückweg d", "middle") + txt(36, 160, "Klatschen")),
      material: ["Smartphone", "große Wand im Freien", "Maßband oder Karte", "zwei Holzbretter (optional)"],
      sicherheit: "Auf Verkehr achten; nur auf Fußwegen oder freien Flächen messen. Mit Brettern nicht neben dem Ohr schlagen.",
      runner: "echo",
      inputs: [{ id: "d", label: "Abstand zur Wand d", hint: "einfache Strecke", unit: "m", def: 50, min: 10, max: 300, step: 0.5 }, { id: "ud", label: "Unsicherheit von d", hint: "abgeschritten ca. 1–2 m", unit: "m", def: 1.5, min: 0.1, max: 20, step: 0.1 }, { id: "T", label: "Lufttemperatur", hint: "für den Vergleichswert", unit: "°C", def: 15, min: -20, max: 40, step: 0.5 }],
      evaluate: function (d, p) {
        if (!d || !d.dts.length) return fail("Noch kein Echo erkannt. Größerer Abstand, eine glattere Wand oder ein kräftigerer Knall helfen.");
        var dts = d.dts.length >= 3 ? C.robust(d.dts, 0.15) : d.dts, dt = C.mean(dts), udt = dts.length > 1 ? C.sd(dts) / Math.sqrt(dts.length) : 0.004;
        udt = Math.sqrt(udt * udt + 0.002 * 0.002);
        var c = 2 * p.d / dt, uc = c * Math.sqrt(Math.pow(p.ud / p.d, 2) + Math.pow(udt / dt, 2)), ref = C.soundSpeed(p.T), dv = rel(c, ref);
        return {
          ok: true, main: { label: "Schallgeschwindigkeit", value: f(c, 0), unit: "m/s" }, sub: "Unsicherheit ± " + f(uc, 0) + " m/s · " + dts.length + (dts.length === 1 ? " Echo" : " Echos"),
          scale: { min: ref * 0.8, max: ref * 1.2, ref: ref, refLabel: "bei " + f(p.T, 0) + " °C: " + f(ref, 0), val: c, valLabel: f(c, 0), band: [c - uc, c + uc] }, rating: rate(Math.abs(dv), 0.03, 0.08),
          table: [["Laufzeit Δt", pm(dt * 1000, udt * 1000, 1, "ms")], ["Einzelwerte", dts.map(function (x) { return f(x * 1000, 0); }).join(" · ") + " ms"], ["Schallweg 2·d", f(2 * p.d, 1) + " m"], ["Theorie bei " + f(p.T, 1) + " °C", f(ref, 1) + " m/s"], ["Abweichung", pc(dv)]],
          plot: d.last ? { env: d.last.env, step: d.last.step, p0: d.last.p0, p1: d.last.p1 } : null,
          note: "Der Schall braucht für einen Kilometer knapp drei Sekunden. Daher die Faustregel beim Gewitter: Sekunden zwischen Blitz und Donner geteilt durch drei ergibt die Entfernung in Kilometern.",
          store: { v: c, unit: "m/s", d: 0, dev: dv, text: "c = " + pm(c, uc, 0, "m/s") + " (d = " + f(p.d, 1) + " m, Δt = " + f(dt * 1000, 1) + " ms)" }
        };
      },
      fehler: ["Abstand ungenau abgeschritten.", "Weitere Echos von Bäumen, Autos oder Nachbarwänden.", "Wind verändert die Laufzeit (Hin- und Rückweg gleichen sich teilweise aus).", "Die Wand ist schräg oder zu klein."],
      test: [
        { q: "Das Echo kommt nach 0,40 s zurück. Wie weit ist die Wand entfernt (c = 343 m/s)?", opts: ["etwa 34 m", "etwa 69 m", "etwa 137 m", "etwa 860 m"], ok: 1, why: "d = c·Δt/2 = 343 · 0,40 / 2 ≈ 69 m." },
        { q: "In welchem Medium ist Schall am schnellsten?", opts: ["Luft", "Wasser", "Stahl", "Vakuum"], ok: 2, why: "Stahl ca. 5900 m/s, Wasser ca. 1480 m/s, Luft ca. 343 m/s, im Vakuum gar nicht." },
        { q: "Warum ist ein Echo unter etwa 17 m Abstand kaum hörbar?", opts: ["Weil der Schall dann zu leise ist", "Weil das Gehör Reflexionen unter ca. 0,1 s nicht vom Original trennt", "Weil die Wand den Schall schluckt", "Weil Schall erst ab 20 m reflektiert wird"], ok: 1, why: "Unter etwa 100 ms Verzögerung verschmelzen Original und Reflexion zu einem Höreindruck." }
      ],
      weiter: "Wiederhole die Messung an einem kalten und einem warmen Tag – der Unterschied liegt bei etwa 0,6 m/s pro Grad."
    },
    {
      id: "ball", theme: "akustik", icon: I.ball, title: "Springender Ball", q: "Stoßzahl aus akustischer Zeitmessung", min: 10, lvl: 2,
      frage: "Wie viel Energie verliert ein Ball beim Aufprall? Das Mikrofon misst die Zeitpunkte der Aufschläge; aus den Flugzeiten folgen Sprunghöhen und die Stoßzahl e.",
      hypo: { q: "Wie verhalten sich die Zeitabstände zwischen aufeinanderfolgenden Aufprallen?", opts: ["Sie bleiben gleich", "Sie werden um einen festen Faktor kürzer", "Sie werden um eine feste Zeit kürzer", "Sie werden länger"], ok: 1,
        why: "Jeder Aufprall verringert die Geschwindigkeit um den Faktor e; die Flugzeit ist proportional zur Abwurfgeschwindigkeit – also schrumpft sie geometrisch." },
      theorie: "Nach einem Aufprall steigt der Ball mit der Geschwindigkeit v auf und fällt nach der Flugzeit t = 2v/g wieder auf. Die Stoßzahl e = v_nachher / v_vorher ergibt sich daher direkt aus dem Verhältnis aufeinanderfolgender Flugzeiten. Die Sprunghöhe folgt aus h = g·t²/8.",
      formel: "e = t(n+1) / t(n)      h = g · t² / 8      Energieverlust je Stoß: 1 − e²",
      formelInfo: "Kontrolle: Die erste Sprunghöhe sollte e²·H betragen (H = Fallhöhe). Die Zeitmessung ist auf etwa 1 ms genau.",
      aufbau: ["Harter, glatter Boden (Fliesen, Parkett, Tischplatte).", "Smartphone 30–50 cm neben die Aufprallstelle legen.", "Fallhöhe H eintragen (Unterkante des Balls), Messung starten.", "Ball aus der Ruhe fallen lassen (nicht werfen) und ausspringen lassen; Umgebung ruhig halten."],
      skizze: sk('<path class="sk-i" d="M20 160 H306"/><circle class="sk-f" cx="60" cy="34" r="9"/><path class="sk-d" d="M60 44 V158"/><path class="sk-a" d="M60 158 Q100 70 140 158 Q170 96 200 158 Q222 118 244 158 Q259 134 274 158"/>' + txt(48, 100, "H", "end") + phone(286, 150, 90, 10, 30) + txt(170, 176, "t₁ > t₂ > t₃ …", "middle")),
      material: ["Smartphone", "Ball (Tischtennis-, Tennis-, Hüpf- oder Fußball)", "Maßband"],
      sicherheit: "Keine Gefährdung. Zerbrechliches aus dem Weg räumen.",
      runner: "bounce",
      inputs: [{ id: "H", label: "Fallhöhe H", hint: "Unterkante Ball bis Boden", unit: "cm", def: 100, min: 10, max: 300, step: 1 }],
      evaluate: function (d, p) {
        if (!d || !d.B) return fail("Zu wenige Aufpralle erkannt (mindestens 3). Leg das Smartphone näher an die Aufprallstelle und halte die Umgebung ruhig.");
        var B = d.B, H = p.H / 100, eH = Math.sqrt(B.h1 / H), r = B.seq.length >= 3 ? [] : null;
        if (r) for (var i = 1; i < Math.min(B.seq.length, 6); i++) r.push(B.seq[i] / B.seq[i - 1]);
        var ue = r && r.length > 1 ? C.sd(r) / Math.sqrt(r.length) : 0.02;
        return {
          ok: true, main: { label: "Stoßzahl e", value: f(B.e, 3), unit: "" }, sub: "± " + f(ue, 3) + " · Energieverlust je Aufprall " + f(B.loss * 100, 0) + " %",
          scale: { min: 0.3, max: 1, val: B.e, valLabel: "e " + f(B.e, 2), band: [B.e - ue, B.e + ue], marks: [[0.55, "Fußball, schlaff"], [0.75, "Tennisball"], [0.9, "Hüpfball, Tischtennis"]] },
          rating: Math.abs(eH - B.e) < 0.05 ? { cls: "g", text: "konsistent mit der Fallhöhe" } : Math.abs(eH - B.e) < 0.1 ? { cls: "y", text: "mäßig konsistent mit der Fallhöhe" } : { cls: "r", text: "nicht konsistent – Fallhöhe prüfen" },
          table: [["Erste Flugzeit t₁", f(B.seq[0] * 1000, 1) + " ms"], ["Erste Sprunghöhe g·t₁²/8", f(B.h1 * 100, 1) + " cm"], ["e aus Fallhöhe √(h₁/H)", f(eH, 3)], ["Erkannte Aufpralle", String(d.times.length)], ["Flugzeiten", B.seq.slice(0, 6).map(function (x) { return f(x * 1000, 0); }).join(" · ") + " ms"]],
          plot: d.last ? { env: d.last.env, step: d.last.step, marks: d.times } : null,
          note: "Die Flugzeiten bilden eine geometrische Folge – der Ball verliert bei jedem Aufprall denselben Anteil seiner Energie. Die Summe aller Flugzeiten ist endlich, deshalb kommt der Ball nach kurzer Zeit zur Ruhe.",
          store: { v: B.e, unit: "", d: 3, text: "e = " + f(B.e, 3) + " (h₁ = " + f(B.h1 * 100, 1) + " cm bei H = " + f(p.H, 0) + " cm)" }
        };
      },
      fehler: ["Hintergrundgeräusche werden als Aufprall erkannt.", "Der Ball springt schräg oder dreht sich.", "Weicher Untergrund dämpft zusätzlich.", "Luftwiderstand bei leichten Bällen (Tischtennis)."],
      test: [
        { q: "Ein Ball mit e = 0,8 fällt aus 1 m. Wie hoch springt er zurück?", opts: ["80 cm", "64 cm", "40 cm", "89 cm"], ok: 1, why: "h₁ = e²·H = 0,64 m." },
        { q: "Was bedeutet e = 1?", opts: ["Der Ball bleibt liegen", "Vollkommen elastischer Stoß ohne Energieverlust", "Der Ball springt doppelt so hoch", "Der Ball zerbricht"], ok: 1, why: "Bei e = 1 bleibt die Bewegungsenergie vollständig erhalten." },
        { q: "Wohin geht die beim Aufprall verlorene Energie?", opts: ["Sie verschwindet", "Vor allem in Wärme, Verformung und Schall", "In den Luftdruck", "In die Erdrotation"], ok: 1, why: "Energie bleibt erhalten, sie wird nur umgewandelt – das Geräusch ist ein Teil davon." }
      ],
      weiter: "Vergleiche einen kalten und einen warmen Tennis- oder Squashball – die Stoßzahl hängt stark von der Temperatur ab."
    },
    {
      id: "doppler", theme: "akustik", icon: I.doppler, title: "Doppler-Effekt", q: "Geschwindigkeit aus Frequenzverschiebung", min: 15, lvl: 3,
      frage: "Wie stark verschiebt sich die Tonhöhe einer bewegten Schallquelle – und lässt sich daraus ihre Geschwindigkeit bestimmen?",
      hypo: { q: "Eine Tonquelle fährt an dir vorbei. Was hörst du?", opts: ["Erst tiefer, dann höher", "Erst höher, dann tiefer", "Immer den gleichen Ton", "Nur einen lauteren Ton"], ok: 1,
        why: "Beim Annähern werden die Wellenberge gestaucht (höhere Frequenz), beim Entfernen gedehnt (tiefere Frequenz)." },
      theorie: "Für eine bewegte Quelle gilt f' = f₀ · c / (c ∓ v). Misst man die Frequenz beim Annähern (f₁) und beim Entfernen (f₂), lässt sich v bestimmen, ohne f₀ zu kennen. Als Tonquelle dient ein zweites Gerät mit dem Tongenerator von LabWahr („Messen“ → „Tongenerator“) oder ein kabelloser Lautsprecher.",
      formel: "v = c · (f₁ − f₂) / (f₁ + f₂)",
      formelInfo: "Bei 3000 Hz und 5 m/s beträgt die Verschiebung etwa ±44 Hz. Die Frequenzauflösung liegt nach Interpolation bei etwa 1 Hz.",
      aufbau: ["Auf einem zweiten Gerät einen Dauerton von 3000 Hz abspielen (LabWahr: Messen → Tongenerator).", "Dieses Smartphone ruhig am Rand einer Strecke halten oder ablegen.", "Messung starten. Eine zweite Person läuft, radelt oder fährt mit der Tonquelle in etwa 1 m seitlichem Abstand gleichmäßig vorbei; Anlauf von mindestens 15 m, damit die Geschwindigkeit vor und nach dem Vorbeifahren konstant ist.", "Nach dem Vorbeifahren die Messung beenden. Optional: Zeit über eine bekannte Strecke stoppen und vergleichen."],
      skizze: sk('<path class="sk-i" d="M20 150 H306"/>' + phone(150, 106, 0) + '<rect class="sk-f" x="60" y="56" width="28" height="18" rx="4"/><path class="sk-a" d="M96 65 H140M132 58 l8 7-8 7"/><path class="sk-w" d="M104 52 q4 13 0 26M112 50 q5 15 0 30M120 48 q6 17 0 34"/>' + txt(74, 46, "Quelle f₀", "middle") + txt(232, 60, "nähert: f₁ ↑") + txt(232, 76, "entfernt: f₂ ↓")),
      material: ["dieses Smartphone", "zweites Gerät oder kabelloser Lautsprecher", "Fahrrad oder Laufstrecke", "optional: Stoppuhr und Maßband"],
      sicherheit: "Nur abseits des Straßenverkehrs. Die Person mit der Tonquelle hält ausreichend Abstand zum Messenden.",
      runner: "doppler",
      inputs: [{ id: "f0", label: "Frequenz der Quelle (ungefähr)", hint: "zum Eingrenzen des Suchbereichs", unit: "Hz", def: 3000, min: 500, max: 8000, step: 10 }, { id: "T", label: "Lufttemperatur", hint: "für c", unit: "°C", def: 15, min: -20, max: 40, step: 0.5 }, { id: "vref", label: "Vergleichsgeschwindigkeit (optional)", hint: "z. B. Strecke/Zeit; 0 = keine", unit: "km/h", def: 0, min: 0, max: 100, step: 0.1 }],
      evaluate: function (d, p) {
        if (!d || !isFinite(d.f1) || !isFinite(d.f2) || d.n < 20) return fail("Der Ton wurde nicht lange genug erkannt. Lautstärke der Quelle erhöhen und näher vorbeifahren.");
        var c = C.soundSpeed(p.T), v = C.dopplerSpeed(d.f1, d.f2, c), f0 = 2 * d.f1 * d.f2 / (d.f1 + d.f2), uv = c * 2 / (d.f1 + d.f2) * 1.5, ref = p.vref > 0 ? p.vref / 3.6 : null, dv = ref ? rel(v, ref) : NaN;
        if (v < 0.3) return fail("Keine deutliche Frequenzverschiebung gefunden (" + f(d.f1, 1) + " / " + f(d.f2, 1) + " Hz). Die Quelle muss schneller oder näher vorbeikommen.");
        return {
          ok: true, main: { label: "Geschwindigkeit der Quelle", value: f(v * 3.6, 1), unit: "km/h" }, sub: f(v, 2) + " m/s · Unsicherheit ± " + f(uv * 3.6, 1) + " km/h",
          scale: ref ? { min: ref * 3.6 * 0.5, max: ref * 3.6 * 1.5, ref: ref * 3.6, refLabel: "Vergleich " + f(ref * 3.6, 1), val: v * 3.6, valLabel: f(v * 3.6, 1) } : null,
          rating: ref ? rate(Math.abs(dv), 0.08, 0.2) : null,
          table: [["Frequenz beim Annähern f₁", f(d.f1, 1) + " Hz"], ["Frequenz beim Entfernen f₂", f(d.f2, 1) + " Hz"], ["Daraus Ruhefrequenz f₀", f(f0, 1) + " Hz"], ["Schallgeschwindigkeit c", f(c, 1) + " m/s"]].concat(ref ? [["Abweichung vom Vergleich", pc(dv)]] : []),
          plot: { track: d.track },
          note: "Die Frequenz springt nicht schlagartig um, sondern gleitet: Nur die Geschwindigkeitskomponente in Richtung des Mikrofons zählt. Bei seitlichem Abstand wird der Übergang deshalb weicher – ausgewertet werden die Plateaus 0,8 bis 2,5 Sekunden vor und nach dem Vorbeifahren.",
          store: { v: v * 3.6, unit: "km/h", d: 1, dev: dv, text: "v = " + f(v * 3.6, 1) + " km/h (f₁ = " + f(d.f1, 1) + " Hz, f₂ = " + f(d.f2, 1) + " Hz)" }
        };
      },
      fehler: ["Seitlicher Abstand: Nur die radiale Geschwindigkeit wird gemessen.", "Ungleichmäßige Geschwindigkeit beim Vorbeifahren.", "Reflexionen an Wänden erzeugen zusätzliche Frequenzen.", "Wind in Richtung der Strecke."],
      test: [
        { q: "Eine Quelle von 1000 Hz nähert sich mit 34,3 m/s (c = 343 m/s). Welche Frequenz hörst du?", opts: ["900 Hz", "1000 Hz", "1100 Hz", "1111 Hz"], ok: 3, why: "f' = 1000 · 343 / (343 − 34,3) ≈ 1111 Hz." },
        { q: "Welche Anwendung beruht nicht auf dem Doppler-Effekt?", opts: ["Radarkontrolle", "Ultraschall-Blutflussmessung", "Rotverschiebung ferner Galaxien", "Echolot für die Wassertiefe"], ok: 3, why: "Das Echolot misst eine Laufzeit, keine Frequenzverschiebung." },
        { q: "Warum klingt ein vorbeifahrendes Einsatzhorn beim Wegfahren tiefer?", opts: ["Der Fahrer schaltet um", "Die Wellen werden hinter der Quelle gedehnt", "Die Luft dämpft hohe Töne", "Das Auto wird langsamer"], ok: 1, why: "Hinter der Quelle ist der Abstand der Wellenberge größer – die Frequenz kleiner." }
      ],
      weiter: "Miss die gleiche Fahrt mit Stoppuhr über 20 m und vergleiche beide Verfahren."
    },
    {
      id: "abstand", theme: "akustik", icon: I.abstand, title: "Abstandsgesetz", q: "Schallpegel in Abhängigkeit vom Abstand", min: 10, lvl: 1,
      frage: "Wie nimmt der Schallpegel mit dem Abstand zur Quelle ab? Gemessen wird der relative Pegel eines Dauertons in 0,5 m, 1 m und 2 m Entfernung.",
      hypo: { q: "Um wie viel sinkt der Pegel einer kleinen Schallquelle im Freien, wenn sich der Abstand verdoppelt?", opts: ["um 3 dB", "um 6 dB", "um 10 dB", "um die Hälfte der Dezibel"], ok: 1,
        why: "Der Schalldruck einer Punktquelle fällt mit 1/r; 20·lg(2) ≈ 6 dB." },
      theorie: "Eine kleine Quelle strahlt kugelförmig ab: Die Intensität verteilt sich auf die Kugelfläche 4πr² und sinkt mit 1/r², der Schalldruck mit 1/r. In Räumen kommt reflektierter Schall hinzu, der Pegel fällt dort langsamer. Gemessen wird ein relativer Pegel – das Smartphone-Mikrofon ist nicht kalibriert, Differenzen sind aber zuverlässig.",
      formel: "ΔL = 20 · lg(r₁ / r₂) dB   ⇒   −6,0 dB je Abstandsverdopplung",
      formelInfo: "Ausgewertet wird die Steigung der Ausgleichsgeraden des Pegels über log₂(r).",
      aufbau: ["Auf einem zweiten Gerät einen Dauerton abspielen (z. B. 1000 Hz, LabWahr: Messen → Tongenerator) oder Rauschen.", "Möglichst im Freien oder in einem großen Raum, Quelle in Kopfhöhe.", "Smartphone in 0,5 m Abstand halten und „Messen“ tippen (3 s Mittelwert).", "Wiederholen in 1 m und 2 m – Mikrofon (Unterseite) immer zur Quelle ausrichten."],
      skizze: sk('<rect class="sk-f" x="30" y="70" width="24" height="40" rx="5"/><path class="sk-w" d="M62 74 q8 16 0 32M72 66 q12 24 0 48M84 58 q16 32 0 64"/>' + phone(106, 70, 0, 18, 34) + phone(166, 70, 0, 18, 34) + phone(262, 70, 0, 18, 34) + '<path class="sk-d" d="M42 136 H272"/>' + txt(115, 154, "0,5 m", "middle") + txt(175, 154, "1 m", "middle") + txt(271, 154, "2 m", "middle")),
      material: ["dieses Smartphone", "zweites Gerät oder Lautsprecher", "Maßband"],
      sicherheit: "Lautstärke so wählen, dass sie bei 0,5 m angenehm ist. Nie mit dem Ohr direkt an den Lautsprecher.",
      runner: "level",
      inputs: [],
      evaluate: function (d) {
        var pts = (d && d.points || []).filter(function (q) { return isFinite(q.db); });
        if (pts.length < 2) return fail("Bitte mindestens zwei Abstände messen.");
        var s = C.levelSlope(pts), dv = s - (-6.02);
        return {
          ok: true, main: { label: "Pegelabnahme je Abstandsverdopplung", value: f(s, 1), unit: "dB" }, sub: "Theorie für das freie Schallfeld: −6,0 dB",
          scale: { min: -10, max: 0, ref: -6.02, refLabel: "Freifeld −6,0", val: s, valLabel: f(s, 1) + " dB", marks: [[-1.5, "halliger Raum"]] }, rating: Math.abs(dv) < 1 ? { cls: "g", text: "nahezu freies Schallfeld" } : Math.abs(dv) < 2.5 ? { cls: "y", text: "merklicher Raumeinfluss" } : { cls: "r", text: "starker Raumeinfluss oder Störgeräusche" },
          table: pts.map(function (q) { return ["Abstand " + f(q.d, 1) + " m", f(q.db, 1) + " dB (relativ)"]; }),
          note: s > -4.5 ? "Der Pegel fällt langsamer als im Freifeld. Reflexionen von Wänden, Decke und Boden tragen in größerem Abstand zunehmend zum Schall bei – ab dem Hallradius dominiert der diffuse Raumschall." : "Das Ergebnis liegt nahe am Abstandsgesetz für eine Punktquelle.",
          store: { v: s, unit: "dB", d: 1, text: "ΔL = " + f(s, 1) + " dB je Verdopplung (" + pts.length + " Abstände)" }
        };
      },
      fehler: ["Reflexionen im Raum (Hallradius).", "Hintergrundgeräusche bei großem Abstand.", "Richtwirkung von Lautsprecher und Mikrofon.", "Abschattung durch die eigene Hand oder den Körper."],
      test: [
        { q: "Um wie viel ändert sich der Pegel, wenn sich der Abstand verzehnfacht (Freifeld)?", opts: ["−6 dB", "−10 dB", "−20 dB", "−60 dB"], ok: 2, why: "20·lg(10) = 20 dB." },
        { q: "Zwei gleich laute Quellen spielen zusammen. Um wie viel steigt der Pegel?", opts: ["um 3 dB", "um 6 dB", "er verdoppelt sich in dB", "um 10 dB"], ok: 0, why: "Die Intensität verdoppelt sich: 10·lg(2) ≈ 3 dB." },
        { q: "Warum ist die Messung mit dem Smartphone nur relativ?", opts: ["Weil das Mikrofon nicht auf einen Schalldruck-Bezugswert kalibriert ist", "Weil der Hersteller es verbietet", "Weil Dezibel immer relativ sind und nichts bedeuten", "Weil der Lautsprecher stört"], ok: 0, why: "Pegeldifferenzen sind verlässlich, absolute dB(A)-Werte erfordern ein kalibriertes Messgerät." }
      ],
      weiter: "Wiederhole die Messung drinnen und draußen und vergleiche die Steigungen."
    },
    {
      id: "nachhall", theme: "akustik", icon: I.nachhall, title: "Nachhallzeit", q: "Raumakustik: Bestimmung von T60", min: 10, lvl: 2,
      frage: "Wie lange klingt ein Raum nach? Die Nachhallzeit T60 ist die Zeit, in der der Schallpegel nach einem Impuls um 60 dB abfällt – die wichtigste Kenngröße der Raumakustik.",
      hypo: { q: "Welcher Raum hat bei gleicher Größe die längere Nachhallzeit?", opts: ["Ein gefliestes Badezimmer", "Ein Schlafzimmer mit Teppich und Vorhängen", "Beide gleich"], ok: 0,
        why: "Harte Flächen reflektieren fast den gesamten Schall; Textilien absorbieren ihn." },
      theorie: "Nach einem kurzen, lauten Impuls fällt der Pegel im Raum näherungsweise linear (in dB) ab. Da 60 dB Dynamik selten erreichbar sind, wird der Abfall zwischen −5 und −25 dB gemessen (T20) und auf 60 dB hochgerechnet. Nach Sabine hängt T60 vom Volumen V und der äquivalenten Absorptionsfläche A ab.",
      formel: "T60 = 60 dB / |Steigung|      Sabine: T60 ≈ 0,161 · V / A",
      formelInfo: "Je nach erreichtem Abstand zum Grundgeräusch wird T20 (−5 bis −25 dB), T15 oder T10 verwendet.",
      aufbau: ["Für Ruhe im Raum sorgen (Fenster zu, Geräte aus).", "Smartphone in Raummitte auf etwa 1,2 m Höhe halten.", "Messung starten und einen kurzen, lauten Impuls erzeugen: Luftballon platzen lassen, kräftig klatschen oder zwei Bretter zusammenschlagen.", "Drei Impulse, jeweils nach dem Ausklingen. Der Mittelwert ist das Ergebnis."],
      skizze: sk('<rect class="sk-i" x="40" y="20" width="246" height="140" rx="4"/>' + phone(150, 76, 0) + '<circle class="sk-f" cx="90" cy="96" r="7"/><path class="sk-a" d="M98 92 L284 40M98 100 L284 150M98 96 L284 96"/><path class="sk-d" d="M284 40 L176 160M284 150 L170 20"/>' + txt(90, 120, "Impuls", "middle")),
      material: ["Smartphone", "Luftballon, Holzbretter oder Klatschen", "optional: Raummaße"],
      sicherheit: "Ballon nicht in Ohrnähe platzen lassen. Bei Ballons mit Nadel vorsichtig umgehen.",
      runner: "reverb",
      inputs: [{ id: "V", label: "Raumvolumen (optional)", hint: "Länge × Breite × Höhe; 0 = ohne", unit: "m³", def: 0, min: 0, max: 5000, step: 1 }],
      evaluate: function (d, p) {
        var rts = d && d.rts || [];
        if (!rts.length) return fail("Kein auswertbarer Abklingvorgang. Der Impuls muss mindestens 20 dB lauter als das Grundgeräusch sein.");
        var m = C.mean(rts), u = rts.length > 1 ? C.sd(rts) / Math.sqrt(rts.length) : m * 0.1, A = p.V > 0 ? 0.161 * p.V / m : NaN;
        var cls = m < 0.4 ? "stark bedämpft (Tonstudio, gut möblierter kleiner Raum)" : m < 0.8 ? "wohnlich (Wohn- oder Arbeitszimmer)" : m < 1.6 ? "hallig (Bad, Treppenhaus, leerer Raum)" : "sehr hallig (Halle, Kirche)";
        return {
          ok: true, main: { label: "Nachhallzeit T60", value: f(m, 2), unit: "s" }, sub: "Unsicherheit ± " + f(u, 2) + " s · " + rts.length + (rts.length === 1 ? " Impuls" : " Impulse"),
          scale: { min: 0, max: 3, val: m, valLabel: f(m, 2) + " s", band: [m - u, m + u], marks: [[0.5, "Wohnraum"], [1.2, "Bad"], [2.2, "Konzertsaal"]] },
          rating: rts.length >= 3 ? (u / m < 0.08 ? { cls: "g", text: "gut reproduzierbar" } : { cls: "y", text: "streuend – weitere Impulse messen" }) : { cls: "y", text: "für eine Aussage bitte 3 Impulse" },
          table: [["Einzelwerte", rts.map(function (x) { return f(x, 2); }).join(" · ") + " s"], ["Auswertebereich", d.range ? "−" + d.range[0] + " bis −" + d.range[1] + " dB" : "–"], ["Einordnung", cls]].concat(isFinite(A) ? [["Äquivalente Absorptionsfläche A", f(A, 1) + " m²"]] : []),
          plot: d.last ? { env: d.last.env, step: d.last.step, db: true } : null,
          note: "Für Sprache sind etwa 0,4–0,6 s ideal, für Orchestermusik 1,8–2,2 s. Längere Zeiten machen Sprache undeutlich, weil Silben ineinander verschwimmen.",
          store: { v: m, unit: "s", d: 2, text: "T60 = " + pm(m, u, 2, "s") + " (" + rts.length + " Impulse)" }
        };
      },
      fehler: ["Grundgeräusch zu laut: Der Auswertebereich wird kleiner.", "Klatschen ist kein idealer Impuls (zu leise im Bass).", "Position im Raum: Nahe Wänden misst man anders.", "Nachhall ist frequenzabhängig; das Ergebnis ist ein Breitband-Mittel."],
      test: [
        { q: "Ein Raum hat V = 60 m³ und A = 12 m². Wie groß ist T60 nach Sabine?", opts: ["0,2 s", "0,8 s", "1,6 s", "5 s"], ok: 1, why: "0,161 · 60 / 12 ≈ 0,8 s." },
        { q: "Was passiert mit T60, wenn man einen dicken Teppich auslegt?", opts: ["Er wird länger", "Er wird kürzer", "Er bleibt gleich"], ok: 1, why: "Mehr Absorptionsfläche A senkt T60." },
        { q: "Warum misst man oft nur den Abfall um 20 dB (T20)?", opts: ["Weil 60 dB über dem Grundgeräusch kaum erreichbar sind", "Weil der Nachhall danach stoppt", "Weil das Gehör nur 20 dB hört", "Aus Tradition"], ok: 0, why: "Bei linearem Abfall lässt sich das Ergebnis auf 60 dB hochrechnen." }
      ],
      weiter: "Vergleiche Bad, Wohnzimmer und Treppenhaus. Bestimme mit dem Volumen die Absorptionsfläche."
    },
    {
      id: "helmholtz", theme: "akustik", icon: I.helmholtz, title: "Helmholtz-Resonator", q: "Eigenfrequenz einer Flasche", min: 15, lvl: 2,
      frage: "Welchen Ton erzeugt eine angeblasene Flasche – und wie hängt er vom eingeschlossenen Luftvolumen ab? Gemessen wird die Tonhöhe bei verschiedenen Füllständen.",
      hypo: { q: "Was passiert mit dem Ton, wenn mehr Wasser in der Flasche ist?", opts: ["Er wird tiefer", "Er wird höher", "Er bleibt gleich"], ok: 1,
        why: "Weniger Luftvolumen bedeutet eine „steifere“ Luftfeder – die Eigenfrequenz steigt." },
      theorie: "Die Luft im Flaschenhals schwingt wie eine Masse auf der Feder, die von der Luft im Bauch gebildet wird. Die Eigenfrequenz ist umgekehrt proportional zur Wurzel des Volumens. Bei einer zylindrischen Flasche ist das Luftvolumen proportional zur Lufthöhe h – das Produkt f·√h sollte daher konstant sein.",
      formel: "f = (c / 2π) · √(A / (V · L_eff))   ⇒   f · √h ≈ konstant",
      formelInfo: "A: Halsquerschnitt, L_eff: wirksame Halslänge (mit Mündungskorrektur). Die Konstanz von f·√h wird als relative Streuung angegeben.",
      aufbau: ["Eine Flasche mit möglichst zylindrischem Bauch verwenden.", "Lufthöhe h messen: vom Wasserspiegel bis zum Beginn des Halses.", "Messung starten und schräg über die Öffnung blasen, bis ein klarer Ton entsteht.", "Mit drei bis fünf verschiedenen Füllständen wiederholen."],
      skizze: sk('<path class="sk-i" d="M146 20 h34 v28 l18 22 v86 a6 6 0 0 1 -6 6 h-58 a6 6 0 0 1 -6 -6 v-86 l18 -22z"/><path class="sk-f2" d="M129 118 h68 v38 a6 6 0 0 1 -6 6 h-56 a6 6 0 0 1 -6 -6z"/><path class="sk-w" d="M214 70 v48M210 70h8M210 118h8"/>' + txt(224, 98, "h") + '<path class="sk-a" d="M90 10 q40 6 64 14"/>' + txt(84, 14, "anblasen", "end") + phone(250, 70, 0)),
      material: ["Smartphone", "Glasflasche mit Hals", "Wasser", "Lineal"],
      sicherheit: "Keine Gefährdung. Glasflaschen nicht fallen lassen.",
      runner: "pitch",
      inputs: [{ id: "h", label: "Lufthöhe h (aktuelle Messung)", hint: "Wasserspiegel bis Halsansatz", unit: "cm", def: 15, min: 1, max: 60, step: 0.5 }],
      evaluate: function (d) {
        var pts = d && d.points || [];
        if (!pts.length) return fail("Noch keine Tonhöhe gespeichert. Blase einen gleichmäßigen Ton und tippe auf „Wert übernehmen“.");
        var k = pts.map(function (q) { return q.f * Math.sqrt(q.h); }), km = C.mean(k), ks = k.length > 1 ? C.sd(k) / km : NaN;
        return {
          ok: true, main: { label: pts.length > 1 ? "Konstante f·√h" : "Eigenfrequenz", value: pts.length > 1 ? f(km, 0) : f(pts[0].f, 1), unit: pts.length > 1 ? "Hz·√cm" : "Hz" }, sub: pts.length > 1 ? "relative Streuung " + f(ks * 100, 1) + " %" : "Für die Gesetzmäßigkeit bitte weitere Füllstände messen.",
          rating: pts.length >= 3 ? (ks < 0.05 ? { cls: "g", text: "Helmholtz-Gesetz gut bestätigt" } : ks < 0.12 ? { cls: "y", text: "Gesetz näherungsweise bestätigt" } : { cls: "r", text: "große Streuung – Bauch nicht zylindrisch?" }) : null,
          table: pts.map(function (q) { return ["h = " + f(q.h, 1) + " cm", f(q.f, 1) + " Hz · f·√h = " + f(q.f * Math.sqrt(q.h), 0)]; }),
          plot: { pts: pts },
          note: "Je kleiner das Luftvolumen, desto höher der Ton. Eine Halbierung des Volumens hebt die Frequenz um den Faktor √2 – also um einen Tritonus (sechs Halbtöne, +41 %).",
          store: { v: pts.length > 1 ? km : pts[0].f, unit: pts.length > 1 ? "Hz·√cm" : "Hz", d: 0, text: pts.map(function (q) { return f(q.h, 1) + " cm → " + f(q.f, 1) + " Hz"; }).join("; ") }
        };
      },
      fehler: ["Nicht zylindrischer Flaschenbauch (Schultern, Einschnürungen).", "Überblasen erzeugt höhere Teiltöne.", "Mündungskorrektur und Halsform.", "Lufthöhe ungenau abgelesen."],
      test: [
        { q: "Das Luftvolumen wird auf ein Viertel verkleinert. Wie ändert sich die Eigenfrequenz?", opts: ["Sie halbiert sich", "Sie verdoppelt sich", "Sie vervierfacht sich", "Sie bleibt gleich"], ok: 1, why: "f ∝ 1/√V, also √4 = 2." },
        { q: "Welches Bauteil nutzt das Helmholtz-Prinzip?", opts: ["Bassreflex-Öffnung einer Lautsprecherbox", "Glühbirne", "Solarzelle", "Thermometer"], ok: 0, why: "Die Reflexöffnung ist ein Helmholtz-Resonator zur Verstärkung tiefer Töne." },
        { q: "Was entspricht beim Helmholtz-Resonator der Masse?", opts: ["Die Luft im Hals", "Die Luft im Bauch", "Das Glas", "Das Wasser"], ok: 0, why: "Die Luftsäule im Hals schwingt; die Luft im Bauch wirkt als Feder." }
      ],
      weiter: "Suche Füllstände für eine Tonleiter – wie viel Wasser brauchst du für eine Oktave?"
    },

    /* ===================== ASTRONOMIE & GEODÄSIE ===================== */
    {
      id: "breite", theme: "astro", icon: I.schatten, title: "Geografische Breite", q: "Ortsbestimmung mit dem Schattenstab", min: 30, lvl: 2,
      frage: "Lässt sich die eigene geografische Breite mit einem Stab und einem Maßband bestimmen? Aus dem kürzesten Schatten des Tages folgt die Mittagshöhe der Sonne – und daraus die Breite.",
      hypo: { q: "Wann ist der Schatten eines senkrechten Stabes am kürzesten?", opts: ["Um 12:00 Uhr Ortszeit (Uhr)", "Zum wahren Mittag, wenn die Sonne im Süden steht", "Bei Sonnenaufgang"], ok: 1,
        why: "Der wahre Mittag weicht von 12:00 Uhr ab – durch die Zeitzone, die Sommerzeit und die Zeitgleichung. In Deutschland liegt er meist zwischen 12:00 und 13:45 Uhr." },
      theorie: "Zur Mittagszeit steht die Sonne im Süden und erreicht ihre größte Höhe h. Für Orte nördlich des Wendekreises gilt φ = 90° − h + δ, wobei δ die Deklination der Sonne ist (Sommer: bis +23,4°, Winter: bis −23,4°). LabWahr berechnet δ für das Messdatum.",
      formel: "h = arctan(Stablänge / Schattenlänge)      φ = 90° − h_max + δ",
      formelInfo: "Um den wahren Mittag ändert sich die Sonnenhöhe nur langsam (in ±15 min um weniger als 0,2°). Mehrere Messungen um den Mittag herum, die größte Höhe zählt.",
      aufbau: ["Einen geraden Stab (ca. 1 m) senkrecht auf ebenem Boden aufstellen – mit der Wasserwaage prüfen.", "Stablänge H über dem Boden messen.", "Rund um den Mittag (MESZ etwa 13–14 Uhr, MEZ etwa 12–13 Uhr) alle 10 Minuten die Schattenlänge L messen und eintragen.", "Der kürzeste Schatten bestimmt die Mittagshöhe."],
      skizze: sk('<circle class="sk-f" cx="270" cy="34" r="12"/><path class="sk-i" d="M20 150 H306"/><path class="sk-a" d="M100 150 V60"/><path class="sk-d" d="M262 42 L100 60"/><path class="sk-f2" d="M100 148 h-72 v4 h72z"/><path class="sk-w" d="M100 150 L28 150"/>' + txt(110, 104, "H") + txt(64, 168, "L", "middle") + '<path class="sk-w" d="M50 150 A50 50 0 0 0 49 140"/>' + txt(150, 30, "Sonne im Süden", "middle")),
      material: ["gerader Stab (ca. 1 m)", "Maßband", "Wasserwaage (oder MessWahr)", "ebener, sonniger Platz"],
      sicherheit: "Nie direkt in die Sonne schauen – auch nicht kurz zum Ausrichten.",
      runner: "shadow",
      inputs: [{ id: "H", label: "Stablänge H", hint: "Höhe über dem Boden", unit: "cm", def: 100, min: 10, max: 500, step: 0.5 }],
      evaluate: function (d, p) {
        var pts = d && d.pts || [];
        if (!pts.length) return fail("Noch keine Schattenlänge eingetragen.");
        var best = pts.reduce(function (a, b) { return b.L < a.L ? b : a; }), h = C.stickElevation(p.H, best.L), phi = C.latitudeFromNoon(h, best.ms), dec = C.solar(best.ms).dec;
        var uh = Math.atan2(p.H, best.L) - Math.atan2(p.H, best.L + 1); uh = Math.sqrt(Math.pow(uh / RAD, 2) + 0.15 * 0.15);
        var ref = d.lat, dv = isFinite(ref) ? phi - ref : NaN;
        return {
          ok: true, main: { label: "Geografische Breite", value: f(phi, 1), unit: "° N" }, sub: "Mittagshöhe " + f(h, 1) + "° · Deklination " + (dec >= 0 ? "+" : "−") + f(Math.abs(dec), 1) + "° · ± " + f(uh, 1) + "°",
          scale: { min: 46, max: 56, ref: isFinite(ref) ? ref : null, refLabel: isFinite(ref) ? "Standort " + f(ref, 1) : "", val: phi, valLabel: f(phi, 1) + "°", band: [phi - uh, phi + uh], marks: [[47.6, "München"], [50.9, "Köln"], [53.6, "Hamburg"]] },
          rating: isFinite(dv) ? (Math.abs(dv) <= 0.5 ? { cls: "g", text: "auf ca. 50 km genau" } : Math.abs(dv) <= 1.5 ? { cls: "y", text: "auf ca. 150 km genau" } : { cls: "r", text: "Abweichung über 1,5°" }) : null,
          table: [["Kürzester Schatten", f(best.L, 1) + " cm um " + new Date(best.ms).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }) + " Uhr"], ["Messungen", String(pts.length)], ["Sonnendeklination δ", f(dec, 2) + "°"]].concat(isFinite(dv) ? [["Abweichung vom Standort", (dv >= 0 ? "+" : "−") + f(Math.abs(dv), 2) + "° (≈ " + f(Math.abs(dv) * 111, 0) + " km)"]] : []),
          plot: { shadow: pts, H: p.H },
          note: "1° Breite entspricht etwa 111 km in Nord-Süd-Richtung. So haben Seefahrer bis ins 18. Jahrhundert ihre Position bestimmt – mit Sextant statt Stab.",
          store: { v: phi, unit: "° N", d: 1, text: "φ = " + f(phi, 1) + "° (h_max = " + f(h, 1) + "°, δ = " + f(dec, 1) + "°)" }
        };
      },
      fehler: ["Stab nicht senkrecht oder Boden nicht eben.", "Unscharfes Schattenende (Halbschatten).", "Messungen zu weit vom wahren Mittag entfernt.", "Ablesefehler am Maßband."],
      test: [
        { q: "Am 21. März (δ ≈ 0°) beträgt die Mittagshöhe 40°. Welche Breite hat der Ort?", opts: ["40°", "50°", "63,4°", "26,6°"], ok: 1, why: "φ = 90° − 40° + 0° = 50°." },
        { q: "Warum ist die Mittagshöhe im Sommer größer als im Winter?", opts: ["Weil die Erde der Sonne im Sommer näher ist", "Wegen der Neigung der Erdachse um 23,4°", "Wegen der Atmosphäre", "Weil die Erde schneller rotiert"], ok: 1, why: "Die Deklination schwankt im Jahreslauf zwischen +23,4° und −23,4°." },
        { q: "Wie lang ist der Schatten eines 1-m-Stabs bei 45° Sonnenhöhe?", opts: ["0,5 m", "0,71 m", "1 m", "1,41 m"], ok: 2, why: "tan 45° = 1." }
      ],
      weiter: "Wiederhole die Messung im Abstand von einigen Wochen: Die Mittagshöhe ändert sich, die berechnete Breite bleibt gleich."
    },
    {
      id: "eratos", theme: "astro", icon: I.erde, title: "Erdumfang nach Eratosthenes", q: "Erdvermessung aus zwei Schattenmessungen", min: 30, lvl: 3,
      frage: "Wie groß ist die Erde? Eratosthenes bestimmte um 240 v. Chr. den Erdumfang aus dem Unterschied der Mittagssonnenhöhe an zwei Orten. Hier wird das Verfahren mit zwei eigenen Messungen nachvollzogen.",
      hypo: { q: "Zwei Orte liegen 555 km in Nord-Süd-Richtung auseinander. Wie groß ist der Unterschied der Mittagssonnenhöhe?", opts: ["etwa 0,5°", "etwa 5°", "etwa 15°", "etwa 50°"], ok: 1,
        why: "555 km sind 1/72 des Erdumfangs von rund 40 000 km – also 360°/72 = 5°." },
      theorie: "Die Sonnenstrahlen treffen praktisch parallel auf die Erde. Der Unterschied der Mittagshöhen zweier Orte entspricht deshalb dem Winkel zwischen ihnen am Erdmittelpunkt. Mit dem Nord-Süd-Abstand ergibt sich der Umfang. Messungen an verschiedenen Tagen werden über die Sonnendeklination korrigiert.",
      formel: "Δφ = |φ_A − φ_B|      U = 360° / Δφ · d",
      formelInfo: "Ein Fehler von 0,2° bei Δφ = 5° bedeutet bereits 4 % Fehler im Umfang. Große Nord-Süd-Abstände (über 300 km) liefern genauere Ergebnisse.",
      aufbau: ["Messung A: am eigenen Ort zum wahren Mittag Stab- und Schattenlänge messen.", "Messung B: Eine zweite Person misst am selben Tag an einem anderen Ort möglichst weit nördlich oder südlich – oder du misst selbst auf einer Reise.", "Den Nord-Süd-Abstand der beiden Orte aus einer Karte bestimmen (nur die Nord-Süd-Komponente).", "Beide Messungen eintragen. Ohne Partner kannst du das Verfahren mit Beispielwerten nachvollziehen."],
      skizze: sk('<circle class="sk-i" cx="110" cy="110" r="62"/><circle class="sk-f" cx="110" cy="110" r="3"/><path class="sk-d" d="M110 110 L153 66M110 110 L168 88"/><path class="sk-a" d="M153 66 l8-8M168 88 l9-4"/><path class="sk-a" d="M300 40 H180M300 60 H190M300 80 H200"/>' + txt(306, 30, "Sonne (parallele Strahlen)", "end") + '<path class="sk-w" d="M131 88 A30 30 0 0 1 138 98"/>' + txt(142, 108, "Δφ") + txt(160, 58, "A") + txt(176, 84, "B")),
      material: ["zwei Stäbe gleicher Art", "Maßband", "eine zweite Person an einem anderen Ort (oder eine Reise)", "Karte für den Nord-Süd-Abstand"],
      sicherheit: "Nie direkt in die Sonne schauen.",
      runner: "eratos",
      inputs: [],
      evaluate: function (d) {
        if (!d || !d.A || !d.B || !(d.dist > 0)) return fail("Bitte beide Messungen und den Nord-Süd-Abstand eintragen.");
        var E = C.eratosthenes(d.A, d.B, d.dist);
        if (!isFinite(E.U)) return fail("Die beiden Orte unterscheiden sich zu wenig in der Breite (Δφ < 0,05°).");
        var uphi = 0.25, uU = E.U * Math.sqrt(Math.pow(uphi * Math.SQRT2 / E.dphi, 2) + Math.pow(0.02, 2)), ref = 40008, dv = rel(E.U, ref);
        return {
          ok: true, main: { label: "Erdumfang", value: f(E.U, 0), unit: "km" }, sub: "Unsicherheit ± " + f(uU, 0) + " km" + (d.example ? " · mit Beispielwerten" : ""),
          scale: { min: 30000, max: 50000, ref: ref, refLabel: "Meridian 40 008", val: E.U, valLabel: f(E.U / 1000, 1) + " Tsd.", band: [E.U - uU, E.U + uU] }, rating: rate(Math.abs(dv), 0.05, 0.15),
          table: [["Breite Ort A", f(E.phiA, 2) + "°"], ["Breite Ort B", f(E.phiB, 2) + "°"], ["Winkelunterschied Δφ", f(E.dphi, 2) + "°"], ["Nord-Süd-Abstand", f(d.dist, 0) + " km"], ["Erdradius U / 2π", f(E.U / (2 * Math.PI), 0) + " km"], ["Abweichung", pc(dv)]],
          note: "Eratosthenes kam auf 250 000 Stadien. Je nach angenommener Stadienlänge entspricht das etwa 39 000 bis 46 000 km – eine erstaunliche Leistung ohne jedes moderne Instrument.",
          store: { v: E.U, unit: "km", d: 0, dev: dv, example: !!d.example, text: "U = " + pm(E.U, uU, 0, "km") + " (Δφ = " + f(E.dphi, 2) + "°, d = " + f(d.dist, 0) + " km)" + (d.example ? " – Beispielwerte" : "") }
        };
      },
      fehler: ["Nord-Süd-Abstand ungenau (Ost-West-Anteil mitgezählt).", "Messungen nicht zum wahren Mittag.", "Kleine Breitenunterschiede verstärken Messfehler.", "Unterschiedliche Stäbe oder Böden."],
      test: [
        { q: "Δφ = 7,2°, Abstand 800 km. Welcher Umfang ergibt sich?", opts: ["5760 km", "40 000 km", "57 600 km", "111 km"], ok: 1, why: "360 / 7,2 · 800 = 50 · 800 = 40 000 km." },
        { q: "Welche Annahme ist für das Verfahren entscheidend?", opts: ["Die Sonne ist sehr nah", "Die Sonnenstrahlen fallen parallel ein", "Die Erde ist eine Scheibe", "Beide Orte haben dieselbe Uhrzeit"], ok: 1, why: "Wegen der großen Entfernung der Sonne sind die Strahlen praktisch parallel." },
        { q: "Warum zählt nur der Nord-Süd-Abstand?", opts: ["Weil sich die Mittagshöhe in Ost-West-Richtung nicht ändert", "Weil Ost-West-Strecken schwer zu messen sind", "Weil die Erde in Ost-West-Richtung flach ist", "Er zählt nicht"], ok: 0, why: "Die Mittagshöhe hängt nur von der Breite ab; der Ost-West-Versatz verschiebt nur die Uhrzeit des Mittags." }
      ],
      weiter: "Verabrede dich mit Bekannten in einer anderen Stadt zu einer gemeinsamen Mittagsmessung."
    },
    {
      id: "mittag", theme: "astro", icon: I.mittag, title: "Wahrer Mittag & Länge", q: "Geografische Länge über die Erddrehung", min: 120, lvl: 2,
      frage: "Wann ist an deinem Ort wirklich Mittag? Aus gleich langen Schatten vor und nach dem Mittag lässt sich der Zeitpunkt des Sonnenhöchststands bestimmen – und daraus die geografische Länge.",
      hypo: { q: "Die Erde dreht sich in 24 Stunden um 360°. Wie lange braucht der Mittag, um 1° Länge nach Westen zu wandern?", opts: ["1 Minute", "4 Minuten", "15 Minuten", "1 Stunde"], ok: 1,
        why: "1440 Minuten / 360° = 4 Minuten pro Grad." },
      theorie: "Die Schattenlänge verläuft um den Mittag symmetrisch. Eine Parabel durch die Messpunkte liefert den Zeitpunkt des kürzesten Schattens – den wahren Mittag. Er hängt von der Länge λ und der Zeitgleichung E ab (die Erdbahn ist elliptisch und die Erdachse geneigt; E schwankt zwischen etwa −14 und +16 Minuten).",
      formel: "Wahrer Mittag (UTC) = 12:00 − 4 min · λ − E   ⇒   λ = (720 min − E − t_Mittag,UTC) / 4",
      formelInfo: "1 Minute Zeitfehler entspricht 0,25° Länge (etwa 17 km in Deutschland). LabWahr berechnet E für das Messdatum.",
      aufbau: ["Stab senkrecht auf ebenem Boden aufstellen, Stablänge eintragen.", "Ab etwa 1½ Stunden vor dem erwarteten Mittag alle 10–15 Minuten die Schattenlänge messen und eintragen – die Uhrzeit wird automatisch gesetzt.", "Bis etwa 1½ Stunden nach dem Mittag weitermessen.", "Wichtig: Messpunkte auf beiden Seiten des Mittags."],
      skizze: sk('<path class="sk-i" d="M20 150 H306"/><path class="sk-a" d="M163 150 V70"/><path class="sk-w" d="M163 150 L70 120M163 150 L256 120M163 150 L120 160M163 150 L206 160"/><path class="sk-dd" d="M60 120 Q163 190 266 120"/>' + txt(70, 112, "vormittags", "middle") + txt(256, 112, "nachmittags", "middle") + txt(163, 60, "kürzester Schatten = Mittag", "middle")),
      material: ["gerader Stab", "Maßband", "Wasserwaage", "2–3 Stunden Sonnenschein"],
      sicherheit: "Nie direkt in die Sonne schauen.",
      runner: "noon",
      inputs: [{ id: "H", label: "Stablänge H", hint: "über dem Boden", unit: "cm", def: 100, min: 10, max: 500, step: 0.5 }],
      evaluate: function (d) {
        var pts = d && d.pts || [];
        if (pts.length < 4) return fail("Bitte mindestens 4 Messungen eintragen – je zwei vor und nach dem Mittag.");
        var nf = C.noonFit(pts);
        if (!nf) return fail("Aus den Messpunkten lässt sich kein Minimum bestimmen. Prüfe die Werte.");
        if (!nf.both) return fail("Alle Messungen liegen auf einer Seite des Mittags. Miss weiter, bis der Schatten wieder länger wird.");
        var lon = C.longitudeFromNoon(nf.ms), E = C.solar(nf.ms).eqt, ref = d.lon, dv = isFinite(ref) ? lon - ref : NaN, ulon = 0.6;
        var t = new Date(nf.ms);
        return {
          ok: true, main: { label: "Wahrer Mittag", value: t.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }), unit: "Uhr" }, sub: "geografische Länge daraus: " + f(lon, 1) + "° O (± " + f(ulon, 1) + "°)",
          scale: { min: 5, max: 16, ref: isFinite(ref) ? ref : null, refLabel: isFinite(ref) ? "Standort " + f(ref, 1) : "", val: lon, valLabel: f(lon, 1) + "°", band: [lon - ulon, lon + ulon], marks: [[6.9, "Köln"], [10.0, "Hamburg"], [13.4, "Berlin"]] },
          rating: isFinite(dv) ? (Math.abs(dv) <= 0.5 ? { cls: "g", text: "Mittag auf ca. 2 min genau" } : Math.abs(dv) <= 1.5 ? { cls: "y", text: "Mittag auf ca. 6 min genau" } : { cls: "r", text: "Abweichung über 6 min" }) : null,
          table: [["Wahrer Mittag (UTC)", t.toISOString().substr(11, 5) + " Uhr"], ["Zeitgleichung E", (E >= 0 ? "+" : "−") + f(Math.abs(E), 1) + " min"], ["Messungen", String(pts.length)], ["Abstand zur Zonenzeit (15° O)", f((15 - lon) * 4, 0) + " min"]].concat(isFinite(dv) ? [["Abweichung vom Standort", (dv >= 0 ? "+" : "−") + f(Math.abs(dv), 2) + "° (≈ " + f(Math.abs(dv) * 4, 1) + " min)"]] : []),
          plot: { shadow: pts, noon: nf.ms },
          note: "Die Mitteleuropäische Zeit gilt für 15° Ost (Görlitz). Westlich davon kommt der Mittag später: in Aachen rund 36 Minuten nach 12:00 MEZ – ohne Sommerzeit und Zeitgleichung.",
          store: { v: lon, unit: "° O", d: 1, text: "Wahrer Mittag " + t.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }) + " Uhr, λ = " + f(lon, 1) + "°" }
        };
      },
      fehler: ["Unregelmäßige oder zu wenige Messpunkte.", "Unscharfes Schattenende.", "Wolkenlücken – Messpunkte nur auf einer Seite.", "Zeitstempel nicht beim Ablesen gesetzt."],
      test: [
        { q: "Der wahre Mittag ist bei E = 0 um 11:20 UTC. Welche Länge hat der Ort?", opts: ["5° O", "10° O", "20° O", "40° O"], ok: 1, why: "(720 − 680) / 4 = 10°." },
        { q: "Warum gibt es die Zeitgleichung?", opts: ["Wegen der Zeitzonen", "Wegen der elliptischen Erdbahn und der Neigung der Erdachse", "Wegen der Sommerzeit", "Wegen der Mondanziehung"], ok: 1, why: "Beide Effekte lassen den wahren Sonnentag im Jahreslauf um bis zu ±30 s schwanken; aufsummiert bis zu 16 min." },
        { q: "Welches Problem löste die Erfindung genauer Schiffsuhren im 18. Jahrhundert?", opts: ["Die Bestimmung der Breite", "Die Bestimmung der Länge auf See", "Die Messung der Meerestiefe", "Die Wettervorhersage"], ok: 1, why: "Mit der Heimatzeit an Bord und dem örtlichen Mittag ergibt sich die Länge." }
      ],
      weiter: "Kombiniere mit dem Versuch „Geografische Breite“ – so bestimmst du deine Position komplett ohne GPS."
    },

    /* ===================== BIOMECHANIK & WAHRNEHMUNG ===================== */
    {
      id: "reaktion", theme: "bio", icon: I.reaktion, title: "Reaktionszeit", q: "Visuelle und akustische Einfachreaktion", min: 5, lvl: 1,
      frage: "Wie schnell reagierst du auf ein Signal – und reagierst du auf einen Ton schneller als auf einen Lichtreiz? Je 5 Durchgänge mit optischem und akustischem Signal.",
      hypo: { q: "Worauf reagieren die meisten Menschen schneller?", opts: ["Auf ein Lichtsignal", "Auf ein Tonsignal", "Gleich schnell"], ok: 1,
        why: "Akustische Reize erreichen die Hirnrinde schneller – einfache Reaktionen auf Töne sind typischerweise 30–50 ms kürzer als auf Lichtreize." },
      theorie: "Die einfache Reaktionszeit setzt sich zusammen aus Reizaufnahme, Weiterleitung, Verarbeitung im Gehirn und Muskelaktivierung. Typisch sind 180–250 ms für Licht und 140–200 ms für Töne. Bildschirm, Lautsprecher und Touchscreen fügen dem Messwert zusätzlich etwa 20–60 ms hinzu – Vergleiche innerhalb derselben Messung sind deshalb aussagekräftiger als absolute Werte.",
      formel: "t_R = t_Tipp − t_Signal      Kennwert: Median aus 5 Durchgängen",
      formelInfo: "Der Median ist robust gegenüber einzelnen Ausreißern. Frühstarts (vor dem Signal oder unter 100 ms) werden verworfen.",
      aufbau: ["Bequem sitzen, Smartphone in einer Hand, Zeigefinger der anderen Hand über dem Display.", "Ton einschalten (Stummschalter aus), Lautstärke mittel.", "Teil 1: Tippen, sobald die Fläche die Farbe wechselt.", "Teil 2: Tippen, sobald der Ton erklingt – dabei nicht auf das Display schauen."],
      skizze: sk(phone(140, 34, 0, 46, 92) + '<rect class="sk-f" x="146" y="42" width="34" height="76" rx="4"/><path class="sk-a" d="M106 134 l24 -24M124 112 h7 v7"/>' + txt(84, 150, "Finger") + '<path class="sk-w" d="M216 70 q8 10 0 20M226 64 q12 16 0 32"/>' + txt(250, 84, "Ton")),
      material: ["Smartphone", "ruhige Umgebung"],
      sicherheit: "Keine Gefährdung.",
      runner: "reaction",
      inputs: [],
      evaluate: function (d) {
        if (!d || (d.vis.length < 3 && d.aud.length < 3)) return fail("Bitte mindestens 3 gültige Durchgänge je Teil.");
        var mv = d.vis.length ? C.median(d.vis) : NaN, ma = d.aud.length ? C.median(d.aud) : NaN, diff = mv - ma;
        return {
          ok: true, main: { label: "Reaktionszeit Licht (Median)", value: f(mv, 0), unit: "ms" }, sub: isFinite(ma) ? "Ton: " + f(ma, 0) + " ms · Unterschied " + (diff >= 0 ? "" : "−") + f(Math.abs(diff), 0) + " ms" : "Ton-Teil noch nicht gemessen",
          scale: { min: 100, max: 500, val: mv, valLabel: f(mv, 0) + " ms", marks: [[220, "typisch (mit Geräteverzug)"]], band: isFinite(ma) ? [Math.min(mv, ma), Math.max(mv, ma)] : null },
          rating: isFinite(diff) ? (diff > 10 ? { cls: "g", text: "Hypothese bestätigt: Ton schneller" } : diff < -10 ? { cls: "y", text: "Licht war bei dir schneller" } : { cls: "y", text: "kein deutlicher Unterschied" }) : null,
          table: [["Licht – Einzelwerte", d.vis.map(function (x) { return f(x, 0); }).join(" · ") + " ms"], ["Licht – Streuung", f(C.sd(d.vis), 0) + " ms"], ["Ton – Einzelwerte", d.aud.length ? d.aud.map(function (x) { return f(x, 0); }).join(" · ") + " ms" : "–"], ["Ton – Streuung", d.aud.length > 1 ? f(C.sd(d.aud), 0) + " ms" : "–"], ["Frühstarts", String(d.early || 0)]],
          note: "Der Geräteverzug (Display, Audio-Ausgabe, Touch-Erkennung) ist in beiden Teilen enthalten, aber nicht gleich groß. Ein Unterschied unter etwa 20 ms ist deshalb nicht eindeutig.",
          store: { v: mv, unit: "ms", d: 0, text: "Licht " + f(mv, 0) + " ms" + (isFinite(ma) ? ", Ton " + f(ma, 0) + " ms" : ""), aud: ma }
        };
      },
      fehler: ["Geräteverzug von Display, Audio und Touchscreen.", "Vorhersehbarer Rhythmus – die Wartezeit ist deshalb zufällig.", "Müdigkeit, Ablenkung, Übung.", "Antizipation (Raten statt Reagieren)."],
      test: [
        { q: "Ein Auto fährt 50 km/h. Welchen Weg legt es während 0,25 s Reaktionszeit zurück?", opts: ["etwa 1,4 m", "etwa 3,5 m", "etwa 12,5 m", "etwa 25 m"], ok: 1, why: "50 km/h ≈ 13,9 m/s · 0,25 s ≈ 3,5 m." },
        { q: "Warum verwendet man den Median statt des Mittelwerts?", opts: ["Er ist immer kleiner", "Er ist unempfindlich gegen einzelne Ausreißer", "Er ist einfacher zu berechnen", "Aus Tradition"], ok: 1, why: "Ein einzelner unaufmerksamer Durchgang verschiebt den Median kaum." },
        { q: "Was ist bei Leichtathletik-Starts ein Fehlstart nach Regelwerk?", opts: ["Reaktion unter 100 ms nach dem Startsignal", "Reaktion über 300 ms", "Jeder Start vor 0,2 s", "Nur ein Start vor dem Schuss"], ok: 0, why: "Reaktionen unter 0,1 s gelten als nicht physiologisch möglich und damit als Fehlstart." }
      ],
      weiter: "Teste dich morgens und abends – die Reaktionszeit hängt von Tageszeit und Müdigkeit ab."
    },
    {
      id: "gang", theme: "bio", icon: I.gang, title: "Ganganalyse", q: "Schrittlänge, Kadenz und Geschwindigkeit", min: 10, lvl: 1,
      frage: "Wie lang sind deine Schritte, und wie hängt die Schrittlänge mit der Körpergröße zusammen? Der Beschleunigungssensor zählt die Schritte über eine abgemessene Strecke.",
      hypo: { q: "Wie lang ist ein normaler Gehschritt im Verhältnis zur Körpergröße?", opts: ["etwa 25 %", "etwa 40–45 %", "etwa 60 %", "etwa 75 %"], ok: 1,
        why: "Beim normalen Gehen beträgt die Schrittlänge rund 0,4–0,45 × Körpergröße; beim Laufen deutlich mehr." },
      theorie: "Jeder Fersenaufsatz erzeugt einen kurzen Beschleunigungsimpuls. Aus der Zahl der Schritte n, der Strecke s und der Zeit t ergeben sich Schrittlänge s/n, Kadenz (Schritte pro Minute) und Geschwindigkeit. Beim Gehen pendelt das Bein näherungsweise wie ein physikalisches Pendel – daraus folgt eine natürliche Kadenz von etwa 100–120 Schritten pro Minute.",
      formel: "Schrittlänge = s / n      Kadenz = 60 · n / t      v = s / t",
      formelInfo: "Die Unsicherheit der Schrittzahl beträgt etwa ±1 (Anfang und Ende); bei 30 Schritten sind das ca. 3 %.",
      aufbau: ["Eine gerade Strecke von 20–30 m abmessen (z. B. Gehwegplatten zählen).", "Smartphone in die Hosentasche oder fest in die Hand nehmen.", "Am Startpunkt Messung starten, normal gehen, am Ziel stehen bleiben und stoppen.", "Wiederhole den Versuch zügig oder laufend und vergleiche."],
      skizze: sk('<path class="sk-i" d="M20 150 H306"/><path class="sk-w" d="M40 140 v20M286 140 v20"/>' + txt(163, 172, "Strecke s", "middle") + '<path class="sk-a" d="M70 146 l10 -8 10 8M120 146 l10 -8 10 8M170 146 l10 -8 10 8M220 146 l10 -8 10 8"/><path class="sk-a" d="M40 60 h30 l4-14 6 26 5-18 h46 l4-14 6 26 5-18 h46 l4-14 6 26 5-18 h40"/>'),
      material: ["Smartphone", "abgemessene Strecke (20–30 m)", "optional: Körpergröße"],
      sicherheit: "Nur auf sicheren, ebenen Wegen ohne Verkehr.",
      runner: "steps",
      inputs: [{ id: "s", label: "Strecke s", hint: "abgemessen", unit: "m", def: 20, min: 5, max: 500, step: 0.5 }, { id: "K", label: "Körpergröße (optional)", hint: "0 = ohne Vergleich", unit: "cm", def: 0, min: 0, max: 230, step: 1 }],
      evaluate: function (d, p) {
        if (!d || d.n < 6) return fail("Zu wenige Schritte erkannt. Halte das Smartphone fest am Körper und gehe gleichmäßig.");
        var sl = p.s / d.n, usl = sl / d.n, cad = 60 * d.n / d.T, v = p.s / d.T, ratio = p.K > 0 ? sl / (p.K / 100) : NaN;
        return {
          ok: true, main: { label: "Schrittlänge", value: f(sl * 100, 0), unit: "cm" }, sub: "± " + f(usl * 100, 0) + " cm · " + d.n + " Schritte in " + f(d.T, 1) + " s",
          scale: isFinite(ratio) ? { min: 0.25, max: 0.75, ref: 0.42, refLabel: "Gehen ≈ 0,42", val: ratio, valLabel: f(ratio, 2) + " × K" } : null,
          rating: isFinite(ratio) ? (ratio < 0.5 ? { cls: "g", text: "typisch für Gehen" } : { cls: "y", text: "typisch für zügiges Gehen oder Laufen" }) : null,
          table: [["Kadenz", f(cad, 0) + " Schritte/min"], ["Geschwindigkeit", f(v, 2) + " m/s (" + f(v * 3.6, 1) + " km/h)"], ["Schrittdauer", f(d.T / d.n * 1000, 0) + " ms"]].concat(isFinite(ratio) ? [["Schrittlänge / Körpergröße", f(ratio, 2)]] : []),
          plot: d.ts ? { g: d.gs, t: d.ts, marks: d.marks } : null,
          note: "Schneller wird man auf zwei Wegen: längere Schritte oder höhere Kadenz. Beim Übergang vom Gehen zum Laufen (ca. 7 km/h) ändert sich die Mechanik grundlegend – es gibt eine Flugphase.",
          store: { v: sl * 100, unit: "cm", d: 0, text: "Schritt " + f(sl * 100, 0) + " cm, Kadenz " + f(cad, 0) + "/min, " + f(v * 3.6, 1) + " km/h" }
        };
      },
      fehler: ["Lockere Tasche erzeugt Doppelzählungen.", "Anlauf und Abbremsen am Anfang und Ende.", "Strecke ungenau abgemessen.", "Ungleichmäßiges Gehtempo."],
      test: [
        { q: "Du gehst 20 m mit 28 Schritten. Wie lang ist ein Schritt?", opts: ["56 cm", "71 cm", "1,4 m", "28 cm"], ok: 1, why: "20 / 28 ≈ 0,71 m." },
        { q: "Bei 110 Schritten/min und 70 cm Schrittlänge: Wie schnell gehst du?", opts: ["etwa 2,8 km/h", "etwa 4,6 km/h", "etwa 7,7 km/h", "etwa 11 km/h"], ok: 1, why: "110 · 0,7 = 77 m/min ≈ 4,6 km/h." },
        { q: "Was unterscheidet Laufen mechanisch vom Gehen?", opts: ["Höhere Kadenz allein", "Beim Laufen gibt es eine Flugphase ohne Bodenkontakt", "Kürzere Schritte", "Nichts"], ok: 1, why: "Beim Gehen ist immer mindestens ein Fuß am Boden." }
      ],
      weiter: "Miss Gehen, zügiges Gehen und Laufen und trage Schrittlänge über Geschwindigkeit auf."
    },
    {
      id: "balance", theme: "bio", icon: I.balance, title: "Gleichgewicht", q: "Körperschwankung mit und ohne visuelle Kontrolle", min: 5, lvl: 1,
      frage: "Wie stark trägt das Sehen zum Gleichgewicht bei? Gemessen wird die Körperschwankung im Einbeinstand – einmal mit offenen, einmal mit geschlossenen Augen (vereinfachter Romberg-Versuch).",
      hypo: { q: "Wie verändert sich die Schwankung mit geschlossenen Augen?", opts: ["Sie bleibt gleich", "Sie nimmt deutlich zu", "Sie nimmt ab"], ok: 1,
        why: "Das Gleichgewicht stützt sich auf drei Systeme: Augen, Gleichgewichtsorgan und Körperwahrnehmung. Fällt das Sehen weg, müssen die anderen mehr leisten – die Schwankung steigt typischerweise auf das 1,5- bis 3-Fache." },
      theorie: "Das Smartphone wird vor der Brust gehalten. Aus dem Beschleunigungssignal wird der langsam veränderliche Schwerkraftanteil entfernt; der verbleibende Effektivwert (RMS) ist ein Maß für die Körperschwankung. Das Verhältnis „Augen zu / Augen auf“ heißt Romberg-Quotient.",
      formel: "Schwankung = RMS(a − ā)      Romberg-Quotient Q = Schwankung_zu / Schwankung_auf",
      formelInfo: "Je 20 Sekunden Messdauer. Die Werte sind relative Kennzahlen, keine medizinische Diagnose.",
      aufbau: ["Neben einer Wand oder Stuhllehne stehen, um sich jederzeit abstützen zu können.", "Smartphone mit beiden Händen flach vor die Brust halten, Arme am Körper.", "Teil 1: auf einem Bein stehen, Augen offen – 20 Sekunden.", "Teil 2: dasselbe mit geschlossenen Augen – der Ton markiert Start und Ende."],
      skizze: sk('<circle class="sk-i" cx="163" cy="36" r="12"/><path class="sk-a" d="M163 48 V112M163 112 L150 168M163 112 L178 140 L192 132"/><path class="sk-a" d="M140 70 H186"/>' + phone(152, 62, 90, 10, 22) + '<path class="sk-f2" d="M230 20 h12 v150 h-12z"/>' + txt(236, 14, "Wand", "middle") + '<path class="sk-dd" d="M120 30 q43 -24 86 0"/>'),
      material: ["Smartphone", "Wand oder Stuhl zum Abstützen"],
      sicherheit: "Immer neben einer Abstützmöglichkeit stehen; bei Unsicherheit sofort das zweite Bein absetzen. Bei Schwindel nicht durchführen.",
      runner: "balance",
      inputs: [],
      evaluate: function (d) {
        if (!d || !isFinite(d.open)) return fail("Bitte zuerst Teil 1 (Augen offen) messen.");
        var Q = isFinite(d.closed) ? d.closed / d.open : NaN;
        return {
          ok: true, main: { label: isFinite(Q) ? "Romberg-Quotient" : "Schwankung (Augen offen)", value: isFinite(Q) ? f(Q, 2) : f(d.open * 1000 / 9.81, 1), unit: isFinite(Q) ? "" : "mg" }, sub: isFinite(Q) ? "offen " + f(d.open * 1000 / 9.81, 1) + " mg · geschlossen " + f(d.closed * 1000 / 9.81, 1) + " mg" : "Teil 2 (Augen zu) steht noch aus",
          scale: isFinite(Q) ? { min: 0.5, max: 4, ref: 1, refLabel: "kein Unterschied", val: Q, valLabel: "Q " + f(Q, 2), marks: [[2, "typisch 1,5–3"]] } : null,
          rating: isFinite(Q) ? (Q > 1.2 ? { cls: "g", text: "Hypothese bestätigt" } : { cls: "y", text: "kaum Unterschied gemessen" }) : null,
          table: [["Schwankung Augen offen (RMS)", f(d.open * 1000 / 9.81, 1) + " mg"], ["Schwankung Augen zu (RMS)", isFinite(d.closed) ? f(d.closed * 1000 / 9.81, 1) + " mg" : "–"]],
          note: "Die Messung ist ein Lernversuch und keine Gesundheitsuntersuchung. Die Werte hängen stark von Haltung, Schuhwerk und Untergrund ab.",
          store: { v: isFinite(Q) ? Q : d.open * 1000 / 9.81, unit: isFinite(Q) ? "" : "mg", d: 2, text: isFinite(Q) ? "Q = " + f(Q, 2) + " (offen " + f(d.open * 1000 / 9.81, 1) + " mg, zu " + f(d.closed * 1000 / 9.81, 1) + " mg)" : "offen " + f(d.open * 1000 / 9.81, 1) + " mg" }
        };
      },
      fehler: ["Armbewegungen statt Körperschwankung.", "Unterschiedliches Standbein in beiden Teilen.", "Weicher Untergrund (Teppich).", "Übungseffekt beim zweiten Durchgang."],
      test: [
        { q: "Welche drei Sinnessysteme tragen zum Gleichgewicht bei?", opts: ["Sehen, Hören, Riechen", "Sehen, Gleichgewichtsorgan, Körperwahrnehmung", "Tasten, Schmecken, Hören", "Nur das Innenohr"], ok: 1, why: "Visuelles, vestibuläres und propriozeptives System." },
        { q: "Wo liegt das Gleichgewichtsorgan?", opts: ["Im Kleinhirn", "Im Innenohr", "Im Auge", "In den Fußsohlen"], ok: 1, why: "Bogengänge und Vorhofsäckchen liegen im Innenohr." },
        { q: "Was bedeutet ein Romberg-Quotient von 2?", opts: ["Doppelte Schwankung mit geschlossenen Augen", "Halbe Schwankung", "Zwei Stürze", "Zwei Sekunden Standzeit"], ok: 0, why: "Q = Schwankung_zu / Schwankung_auf." }
      ],
      weiter: "Wiederhole den Versuch auf einem Kissen: Die Körperwahrnehmung über die Füße wird schlechter – wie verändert sich Q?"
    }
  ];

  var BY = {}; LIST.forEach(function (e) { BY[e.id] = e; });
  global.LBExp = { THEMES: THEMES, LIST: LIST, byId: function (id) { return BY[id] || null; }, fmt: f };
})(window);
