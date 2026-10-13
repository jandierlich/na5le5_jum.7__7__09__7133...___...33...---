/* ============================================================
   wz-backup.js — Gesamtsicherung der WahrZentrale
   Sichert den kompletten lokalen Speicher aller Apps:
   - localStorage (alle Einträge)
   - alle IndexedDB-Datenbanken (inkl. Fotos und Audio als Binärdaten)
   Format: ZIP (unkomprimiert) mit "wahrzentrale.json" und den
   Binärdaten unter "blobs/…". Wiederherstellen ersetzt den Stand.
   Zusätzlich werden Sicherungen der früheren FunWahr-Sammlung
   ("FunWahr-Sicherung", JSON) angenommen und ergänzend eingespielt.
   Nichts verlässt das Gerät – die Datei gibt man selbst über das
   Teilen-Menü weiter.
   © 2026 Jan Dierlich – Alle Rechte vorbehalten.
   ============================================================ */
(function () {
  "use strict";
  var FORMAT = "WahrZentrale-Sicherung";
  var KNOWN_DBS = ["parken-und-belege", "wowarwahr", "keysglade-diary", "naviwahr"];
  var SKIP_KEYS = ["wz_today_wx", "wz_probe"]; // reine Zwischenspeicher
  var APP_OF_KEY = [
    [/^hw-/, "HimmelsWahr"], [/^astrowahr\./, "AstroWahr"], [/^zh:/, "Sternenhimmel"], [/^kw-/, "KompassWahr"], [/^wk[-_]/, "NaviWahr"],
    [/^fk_|^kg_|^zahlen(turm|fusion)-/, "Keysglade"], [/^reisewahr-/, "Keysglade"], [/^alltagwahr_/, "AlltagWahr"], [/^sw_/, "ProduktWahr"], [/^vw_/, "VorratsWahr"],
    [/^qr_/, "QRWahr"], [/^lw_/, "LautstärkeWahr"], [/^losgedacht_|^losdenkwahr_/, "LosDenkWahr"], [/^ztw-/, "ZahlenturmWahr"], [/^aufwindwahr_/, "AufwindWahr"],
    [/^korvanthiel/, "Korvanthiel"], [/^herzkarodrei_/, "HerzKaroDrei"], [/^partikelwahr-/, "PartikelWahr"], [/^stroemungswahr_/, "StrömungsWahr"],
    [/^beatwahr_/, "BeatWahr"], [/^horizontwahr_/, "HorizontWahr"], [/^staunwahr_/, "StaunWahr"], [/^messwahr_/, "MessWahr"], [/^klangwahr_/, "KlangWahr"], [/^labwahr_/, "LabWahr"], [/^funwahr-/, "Spiel & Klang"], [/^wz_/, "WahrZentrale"]
  ];
  var DB_LABEL = { "parken-und-belege": "BelegParkWahr", "wowarwahr": "WowarWahr", "keysglade-diary": "Keysglade-Tagebuch", "naviwahr": "NaviWahr-Fotos" };
  var FW_PREFIXES = ["ztw-", "aufwindwahr_", "korvanthiel", "herzkarodrei_", "partikelwahr-", "stroemungswahr_", "beatwahr_", "funwahr-"];

  var $ = function (id) { return document.getElementById(id); };
  function status(id, text, kind) { var el = $(id); el.textContent = text || ""; el.className = "bk-status" + (kind ? " " + kind : ""); }
  function progress(id, frac) { var p = $(id); if (frac == null) { p.hidden = true; return; } p.hidden = false; p.firstElementChild.style.width = Math.round(frac * 100) + "%"; }
  function stamp() { var d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function fmtBytes(n) { return n > 1e6 ? (n / 1e6).toLocaleString("de-DE", { maximumFractionDigits: 1 }) + " MB" : Math.max(1, Math.round(n / 1e3)) + " kB"; }
  function reqP(r) { return new Promise(function (res, rej) { r.onsuccess = function () { res(r.result); }; r.onerror = function () { rej(r.error); }; }); }

  /* ---------------- localStorage ---------------- */
  function readLocal() {
    var o = {};
    try { for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (k && SKIP_KEYS.indexOf(k) === -1) o[k] = localStorage.getItem(k); } } catch (e) { }
    return o;
  }
  function appOfKey(k) { for (var i = 0; i < APP_OF_KEY.length; i++) if (APP_OF_KEY[i][0].test(k)) return APP_OF_KEY[i][1]; return "Sonstiges"; }

  /* ---------------- IndexedDB lesen ---------------- */
  function dbNames() {
    var base = KNOWN_DBS.slice();
    if (indexedDB.databases) {
      return indexedDB.databases().then(function (list) {
        (list || []).forEach(function (d) { if (d && d.name && base.indexOf(d.name) === -1) base.push(d.name); });
        return base;
      }).catch(function () { return base; });
    }
    return Promise.resolve(base);
  }
  function openExisting(name) {
    return new Promise(function (resolve) {
      var r, created = false;
      try { r = indexedDB.open(name); } catch (e) { return resolve(null); }
      r.onupgradeneeded = function () { created = true; try { r.transaction.abort(); } catch (e) { } };
      r.onsuccess = function () { if (created) { r.result.close(); resolve(null); } else resolve(r.result); };
      r.onerror = function (e) { if (e && e.preventDefault) e.preventDefault(); resolve(null); };
      r.onblocked = function () { resolve(null); };
    });
  }
  function readStore(db, storeName) {
    return new Promise(function (resolve, reject) {
      var tx = db.transaction(storeName, "readonly"), st = tx.objectStore(storeName);
      var meta = { name: storeName, keyPath: st.keyPath, autoIncrement: st.autoIncrement, indexes: [] };
      for (var i = 0; i < st.indexNames.length; i++) {
        var ix = st.index(st.indexNames[i]);
        meta.indexes.push({ name: ix.name, keyPath: ix.keyPath, unique: ix.unique, multiEntry: ix.multiEntry });
      }
      var rows = [];
      var c = st.openCursor();
      c.onsuccess = function () {
        var cur = c.result;
        if (cur) { rows.push(meta.keyPath == null ? { k: cur.key, v: cur.value } : { v: cur.value }); cur.continue(); }
      };
      tx.oncomplete = function () { resolve({ meta: meta, rows: rows }); };
      tx.onerror = function () { reject(tx.error); };
    });
  }
  function readDB(name) {
    return openExisting(name).then(function (db) {
      if (!db) return null;
      var names = Array.prototype.slice.call(db.objectStoreNames);
      var out = { name: name, version: db.version, stores: [] };
      return names.reduce(function (p, s) { return p.then(function () { return readStore(db, s).then(function (r) { out.stores.push(r); }); }); }, Promise.resolve())
        .then(function () { db.close(); return out; }, function (e) { db.close(); throw e; });
    });
  }

  /* ---------------- Werte kodieren (Blobs, Datum, Binärdaten) ---------------- */
  function encoder() {
    var blobs = [];
    function enc(v) {
      if (v === null || typeof v !== "object") return v;
      if (v instanceof Blob) { var id = "blobs/" + blobs.length; blobs.push(v); return { __wz: "blob", id: id, type: v.type || "", name: v.name || undefined }; }
      if (v instanceof Date) return { __wz: "date", v: v.toISOString() };
      if (v instanceof ArrayBuffer) { var id2 = "blobs/" + blobs.length; blobs.push(new Blob([v])); return { __wz: "buf", id: id2 }; }
      if (ArrayBuffer.isView(v)) { var id3 = "blobs/" + blobs.length; blobs.push(new Blob([v])); return { __wz: "view", id: id3, t: v.constructor.name }; }
      if (Array.isArray(v)) return v.map(enc);
      var o = {}; for (var k in v) if (Object.prototype.hasOwnProperty.call(v, k)) o[k] = enc(v[k]);
      if (o.__wz !== undefined) o = { __wz: "obj", v: o }; // Kollision vermeiden
      return o;
    }
    return { enc: enc, blobs: blobs };
  }
  function decoder(getBlob) {
    function dec(v) {
      if (v === null || typeof v !== "object") return Promise.resolve(v);
      if (Array.isArray(v)) return Promise.all(v.map(dec));
      if (v.__wz === "blob") return getBlob(v.id).then(function (b) { var blob = new Blob([b], { type: v.type || "" }); if (v.name) { try { return new File([blob], v.name, { type: v.type || "" }); } catch (e) { } } return blob; });
      if (v.__wz === "date") return Promise.resolve(new Date(v.v));
      if (v.__wz === "buf") return getBlob(v.id);
      if (v.__wz === "view") return getBlob(v.id).then(function (b) { var C = window[v.t] || Uint8Array; try { return new C(b); } catch (e) { return new Uint8Array(b); } });
      if (v.__wz === "obj") { var inner = v.v, o2 = {}; return Promise.all(Object.keys(inner).map(function (k) { return dec(inner[k]).then(function (x) { o2[k] = x; }); })).then(function () { return o2; }); }
      var keys = Object.keys(v), o = {};
      return Promise.all(keys.map(function (k) { return dec(v[k]).then(function (x) { o[k] = x; }); })).then(function () { return o; });
    }
    return dec;
  }

  /* ---------------- ZIP (unkomprimiert) ---------------- */
  var CRC = (function () { var t = new Uint32Array(256); for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  function crc32(b, c) { c = c === undefined ? 0xFFFFFFFF : c; for (var i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xFF] ^ (c >>> 8); return c; }
  var te = new TextEncoder();
  function zipBuild(entries, onStep) { // entries: [{name, blob}]
    var parts = [], central = [], offset = 0, d = new Date();
    var time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
    var date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    var i = 0;
    function next() {
      if (i >= entries.length) {
        var cd = central.reduce(function (s, p) { return s + p.byteLength; }, 0);
        var end = new DataView(new ArrayBuffer(22));
        end.setUint32(0, 0x06054b50, true); end.setUint16(8, entries.length, true); end.setUint16(10, entries.length, true);
        end.setUint32(12, cd, true); end.setUint32(16, offset, true);
        return Promise.resolve(new Blob(parts.concat(central, [end.buffer]), { type: "application/zip" }));
      }
      var e = entries[i++];
      return e.blob.arrayBuffer().then(function (buf) {
        var bytes = new Uint8Array(buf), name = te.encode(e.name), crc = (crc32(bytes) ^ 0xFFFFFFFF) >>> 0;
        var lh = new DataView(new ArrayBuffer(30));
        lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(8, 0, true);
        lh.setUint16(10, time, true); lh.setUint16(12, date, true); lh.setUint32(14, crc, true);
        lh.setUint32(18, bytes.length, true); lh.setUint32(22, bytes.length, true); lh.setUint16(26, name.length, true);
        var ch = new DataView(new ArrayBuffer(46));
        ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true);
        ch.setUint16(12, time, true); ch.setUint16(14, date, true); ch.setUint32(16, crc, true);
        ch.setUint32(20, bytes.length, true); ch.setUint32(24, bytes.length, true); ch.setUint16(28, name.length, true); ch.setUint32(42, offset, true);
        parts.push(lh.buffer, name, e.blob);
        central.push(ch.buffer, name);
        offset += 30 + name.length + bytes.length;
        if (onStep) onStep(i / entries.length);
        return next();
      });
    }
    return next();
  }
  function zipRead(file) {
    // Zentralverzeichnis am Dateiende suchen (max. 64 kB Kommentar)
    var tail = Math.min(file.size, 66000);
    return file.slice(file.size - tail).arrayBuffer().then(function (buf) {
      var dv = new DataView(buf), eocd = -1;
      for (var p = buf.byteLength - 22; p >= 0; p--) if (dv.getUint32(p, true) === 0x06054b50) { eocd = p; break; }
      if (eocd < 0) throw new Error("kein ZIP");
      var count = dv.getUint16(eocd + 10, true), cdSize = dv.getUint32(eocd + 12, true), cdOff = dv.getUint32(eocd + 16, true);
      return file.slice(cdOff, cdOff + cdSize).arrayBuffer().then(function (cdb) {
        var c = new DataView(cdb), pos = 0, map = {}, td = new TextDecoder();
        for (var n = 0; n < count; n++) {
          if (c.getUint32(pos, true) !== 0x02014b50) throw new Error("ZIP beschädigt");
          var method = c.getUint16(pos + 10, true), size = c.getUint32(pos + 20, true), nlen = c.getUint16(pos + 28, true),
            xlen = c.getUint16(pos + 30, true), clen = c.getUint16(pos + 32, true), lho = c.getUint32(pos + 42, true);
          var name = td.decode(new Uint8Array(cdb, pos + 46, nlen));
          map[name] = { method: method, size: size, lho: lho };
          pos += 46 + nlen + xlen + clen;
        }
        function get(name) {
          var e = map[name]; if (!e) return Promise.reject(new Error("fehlt: " + name));
          if (e.method !== 0) return Promise.reject(new Error("komprimiert"));
          return file.slice(e.lho, e.lho + 30).arrayBuffer().then(function (h) {
            var hv = new DataView(h), start = e.lho + 30 + hv.getUint16(26, true) + hv.getUint16(28, true);
            return file.slice(start, start + e.size).arrayBuffer();
          });
        }
        return { names: Object.keys(map), get: get };
      });
    });
  }

  /* ---------------- Übersicht ---------------- */
  // reine Einstellungen/Merker zählen in der Übersicht nicht als "Daten"
  var MINOR = /(theme|onboard|intro-seen|welcomed|_seen|-seen|consent|zuletzt|tagesaufgabe|soundtheme|_sound|-sound|location-mode)/i;
  function renderSummary() {
    var local = readLocal(), groups = {};
    Object.keys(local).forEach(function (k) { if (MINOR.test(k)) return; var a = appOfKey(k); groups[a] = (groups[a] || 0) + 1; });
    return dbNames().then(function (names) {
      return Promise.all(names.map(function (n) {
        return openExisting(n).then(function (db) {
          if (!db) return null;
          var s = Array.prototype.slice.call(db.objectStoreNames);
          if (!s.length) { db.close(); return null; }
          var tx = db.transaction(s, "readonly"), total = 0;
          s.forEach(function (x) { tx.objectStore(x).count().onsuccess = function (e) { total += e.target.result; }; });
          return new Promise(function (res) { tx.oncomplete = function () { db.close(); res({ name: n, count: total }); }; tx.onerror = function () { db.close(); res(null); }; });
        });
      }));
    }).then(function (dbs) {
      var ul = $("summary"), h = "";
      Object.keys(groups).sort().forEach(function (a) { if (a === "WahrZentrale") return; h += "<li><span>" + a + "</span><span>" + groups[a] + (groups[a] === 1 ? " Eintrag" : " Einträge") + "</span></li>"; });
      dbs.filter(Boolean).forEach(function (d) { if (d.count) h += "<li><span>" + (DB_LABEL[d.name] || d.name) + "</span><span>" + d.count + " Datensätze (inkl. Fotos)</span></li>"; });
      ul.innerHTML = h || "<li><span>Noch keine Daten gespeichert</span><span></span></li>";
      var lb = parseInt(localStorage.getItem("wz_last_backup") || "0", 10);
      if (lb) status("exportStatus", "Letzte Sicherung: " + new Date(lb).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" }));
    });
  }

  /* ---------------- Sichern ---------------- */
  function doExport() {
    var btn = $("exportBtn"); btn.disabled = true;
    status("exportStatus", "Sicherung wird erstellt …"); progress("exportProg", 0.02);
    var E = encoder(), data = { format: FORMAT, version: 1, created: new Date().toISOString(), localStorage: readLocal(), indexedDB: [] };
    dbNames().then(function (names) {
      return names.reduce(function (p, n) {
        return p.then(function () { return readDB(n).then(function (d) { if (d) data.indexedDB.push(d); }); });
      }, Promise.resolve());
    }).then(function () {
      data.indexedDB.forEach(function (d) { d.stores.forEach(function (s) { s.rows = s.rows.map(function (r) { var o = { v: E.enc(r.v) }; if ("k" in r) o.k = E.enc(r.k); return o; }); }); });
      progress("exportProg", 0.15);
      var entries = [{ name: "wahrzentrale.json", blob: new Blob([JSON.stringify(data)], { type: "application/json" }) }];
      E.blobs.forEach(function (b, i) { entries.push({ name: "blobs/" + i, blob: b }); });
      return zipBuild(entries, function (f) { progress("exportProg", 0.15 + f * 0.8); });
    }).then(function (zip) {
      progress("exportProg", 1);
      var name = "WahrZentrale-Sicherung-" + stamp() + ".zip";
      var file = null; try { file = new File([zip], name, { type: "application/zip" }); } catch (e) { }
      var done = function (shared) {
        try { localStorage.setItem("wz_last_backup", String(Date.now())); } catch (e) { }
        status("exportStatus", (shared ? "Sicherung erstellt (" : "Sicherung heruntergeladen (") + fmtBytes(zip.size) + "). Bewahre die Datei gut auf – sie enthält deine persönlichen Daten.", "ok");
      };
      if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
        return navigator.share({ files: [file], title: name }).then(function () { done(true); }, function (e) {
          if (e && e.name === "AbortError") status("exportStatus", "Abgebrochen – es wurde nichts gespeichert.");
          else { download(zip, name); done(false); }
        });
      }
      download(zip, name); done(false);
    }).catch(function (e) {
      status("exportStatus", "Die Sicherung konnte nicht erstellt werden (" + (e && e.message ? e.message : "Fehler") + ").", "err");
    }).then(function () { btn.disabled = false; setTimeout(function () { progress("exportProg", null); }, 600); });
  }
  function download(blob, name) {
    var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  }

  /* ---------------- Wiederherstellen ---------------- */
  var pending = null;
  function onFile(f) {
    if (!f) return;
    status("importStatus", "Datei wird geprüft …"); $("preview").hidden = true; pending = null;
    f.slice(0, 4).arrayBuffer().then(function (h) {
      var b = new Uint8Array(h);
      if (b[0] === 0x50 && b[1] === 0x4B) {
        return zipRead(f).then(function (z) {
          if (z.names.indexOf("wahrzentrale.json") === -1) throw new Error("Diese ZIP-Datei ist keine Sicherung der WahrZentrale. Sicherungen einzelner Apps (z. B. WowarWahr) liest du in der jeweiligen App ein.");
          return z.get("wahrzentrale.json").then(function (buf) {
            var data = JSON.parse(new TextDecoder().decode(buf));
            if (!data || data.format !== FORMAT) throw new Error("Unbekanntes Format.");
            pending = { kind: "full", data: data, zip: z };
            showPreview();
          });
        });
      }
      if (f.size > 20 * 1024 * 1024) throw new Error("Die Datei ist zu groß.");
      return f.text().then(function (t) {
        var o = null; try { o = JSON.parse(t); } catch (e) { }
        if (o && o.format === "FunWahr-Sicherung" && o.data && typeof o.data === "object") {
          var keys = Object.keys(o.data).filter(function (k) { return typeof o.data[k] === "string" && FW_PREFIXES.some(function (p) { return k.indexOf(p) === 0; }); });
          if (!keys.length) throw new Error("Die FunWahr-Sicherung enthält keine Daten.");
          pending = { kind: "funwahr", data: o, keys: keys };
          showPreview();
          return;
        }
        throw new Error("Das ist keine Sicherung der WahrZentrale. Sicherungen einzelner Apps liest du in der jeweiligen App über „Importieren“ ein.");
      });
    }).catch(function (e) { status("importStatus", e.message || "Die Datei konnte nicht gelesen werden.", "err"); });
  }
  function showPreview() {
    var h = "";
    if (pending.kind === "full") {
      var d = pending.data, groups = {};
      Object.keys(d.localStorage || {}).forEach(function (k) { var a = appOfKey(k); groups[a] = (groups[a] || 0) + 1; });
      h += "<li><span>Erstellt</span><span>" + new Date(d.created).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" }) + "</span></li>";
      Object.keys(groups).sort().forEach(function (a) { if (a !== "WahrZentrale") h += "<li><span>" + a + "</span><span>" + groups[a] + " Einträge</span></li>"; });
      (d.indexedDB || []).forEach(function (db) {
        var n = db.stores.reduce(function (s, x) { return s + x.rows.length; }, 0);
        if (n) h += "<li><span>" + (DB_LABEL[db.name] || db.name) + "</span><span>" + n + " Datensätze</span></li>";
      });
      $("restoreBtn").textContent = "Alles ersetzen und wiederherstellen";
      status("importStatus", "Bitte prüfen: Die aktuellen Daten auf diesem Gerät werden vollständig ersetzt.");
    } else {
      h += "<li><span>FunWahr-Sicherung</span><span>" + pending.keys.length + " Einträge</span></li>";
      h += "<li><span>Erstellt</span><span>" + (pending.data.created ? new Date(pending.data.created).toLocaleDateString("de-DE") : "–") + "</span></li>";
      $("restoreBtn").textContent = "Spielstände übernehmen";
      status("importStatus", "Rekorde, Spielstände und Beat-Projekte werden übernommen. Alle anderen Daten bleiben unverändert.");
    }
    $("previewList").innerHTML = h;
    $("preview").hidden = false;
  }
  function deleteDB(name) {
    return new Promise(function (res, rej) {
      var r = indexedDB.deleteDatabase(name);
      r.onsuccess = function () { res(); }; r.onerror = function () { rej(r.error); };
      r.onblocked = function () { rej(new Error("Die Datenbank „" + name + "“ ist noch in einem anderen Fenster geöffnet. Bitte andere Fenster der WahrZentrale schließen.")); };
    });
  }
  function writeDB(db, dec) {
    return deleteDB(db.name).then(function () {
      return new Promise(function (res, rej) {
        var r = indexedDB.open(db.name, db.version || 1);
        r.onupgradeneeded = function () {
          var idb = r.result;
          db.stores.forEach(function (s) {
            var opts = {}; if (s.meta.keyPath != null) opts.keyPath = s.meta.keyPath; if (s.meta.autoIncrement) opts.autoIncrement = true;
            var st = idb.createObjectStore(s.meta.name, opts);
            (s.meta.indexes || []).forEach(function (ix) { st.createIndex(ix.name, ix.keyPath, { unique: !!ix.unique, multiEntry: !!ix.multiEntry }); });
          });
        };
        r.onsuccess = function () { res(r.result); };
        r.onerror = function () { rej(r.error); };
        r.onblocked = function () { rej(new Error("Datenbank blockiert")); };
      });
    }).then(function (idb) {
      // Werte zuerst vollständig dekodieren (Blobs lesen), dann in einem Rutsch schreiben
      return db.stores.reduce(function (p, s) {
        return p.then(function () {
          return Promise.all(s.rows.map(function (row) {
            return Promise.all([dec(row.v), "k" in row ? dec(row.k) : Promise.resolve(undefined)]).then(function (x) { return { v: x[0], k: x[1], hasK: "k" in row }; });
          })).then(function (rows) {
            return new Promise(function (res, rej) {
              var tx = idb.transaction(s.meta.name, "readwrite"), st = tx.objectStore(s.meta.name);
              rows.forEach(function (r) { if (r.hasK) st.put(r.v, r.k); else st.put(r.v); });
              tx.oncomplete = function () { res(); }; tx.onerror = function () { rej(tx.error); }; tx.onabort = function () { rej(tx.error || new Error("abgebrochen")); };
            });
          });
        });
      }, Promise.resolve()).then(function () { idb.close(); }, function (e) { idb.close(); throw e; });
    });
  }
  function doRestore() {
    if (!pending) return;
    var btn = $("restoreBtn"); btn.disabled = true; $("cancelBtn").disabled = true;
    progress("importProg", 0.05);
    var job;
    if (pending.kind === "funwahr") {
      var ok = 0;
      pending.keys.forEach(function (k) { try { localStorage.setItem(k, pending.data.data[k]); ok++; } catch (e) { } });
      job = Promise.resolve("Übernommen: " + ok + " von " + pending.keys.length + " Einträgen.");
    } else {
      var d = pending.data, z = pending.zip;
      var dec = decoder(function (id) { return z.get(id); });
      job = Promise.resolve().then(function () {
        // 1. localStorage ersetzen
        var keep = { wz_theme: localStorage.getItem("wz_theme") };
        localStorage.clear();
        // gemeinsame Einträge der Zentrale zuletzt, damit sie den Stand der Sicherung behalten
        var LAST = ["wz_location", "wz_map_consent", "wz_theme"], src = d.localStorage || {};
        Object.keys(src).filter(function (k) { return LAST.indexOf(k) === -1; }).concat(LAST.filter(function (k) { return k in src; }))
          .forEach(function (k) { try { localStorage.setItem(k, src[k]); } catch (e) { } });
        if (!("wz_theme" in (d.localStorage || {})) && keep.wz_theme) localStorage.setItem("wz_theme", keep.wz_theme);
        progress("importProg", 0.2);
        // 2. Datenbanken ersetzen
        var list = d.indexedDB || [], i = 0;
        return list.reduce(function (p, db) {
          return p.then(function () { return writeDB(db, dec).then(function () { i++; progress("importProg", 0.2 + 0.78 * i / list.length); }); });
        }, Promise.resolve()).then(function () {
          // Ältere Sicherungen kennen die Foto-Datenbank von NaviWahr noch nicht (die Fotos stecken
          // dort in den Touren): einen vorhandenen Stand entfernen, damit nichts Fremdes übrig bleibt.
          if (list.some(function (db) { return db && db.name === "naviwahr"; })) return;
          return deleteDB("naviwahr").catch(function () { });
        });
      }).then(function () { return "Wiederhergestellt. Die WahrZentrale startet jetzt neu."; });
    }
    job.then(function (msg) {
      progress("importProg", 1);
      status("importStatus", msg, "ok");
      $("preview").hidden = true; pending = null;
      setTimeout(function () { location.href = "./index.html"; }, 1600);
    }).catch(function (e) {
      status("importStatus", "Wiederherstellen fehlgeschlagen: " + (e && e.message ? e.message : "Fehler") + " Bitte erneut versuchen.", "err");
      btn.disabled = false; $("cancelBtn").disabled = false;
    });
  }

  /* ---------------- Start ---------------- */
  $("exportBtn").addEventListener("click", doExport);
  $("importBtn").addEventListener("click", function () { $("fileIn").value = ""; $("fileIn").click(); });
  $("fileIn").addEventListener("change", function () { onFile(this.files && this.files[0]); });
  $("restoreBtn").addEventListener("click", doRestore);
  $("cancelBtn").addEventListener("click", function () { pending = null; $("preview").hidden = true; status("importStatus", ""); });
  if (!("indexedDB" in window)) status("exportStatus", "Dieser Browser unterstützt keine Datenbank-Sicherung; es werden nur Einstellungen gesichert.");
  renderSummary().catch(function () { });

  // für automatische Tests
  window.__wzBackup = { zipRead: zipRead, zipBuild: zipBuild, encoder: encoder, decoder: decoder, readDB: readDB };
})();
