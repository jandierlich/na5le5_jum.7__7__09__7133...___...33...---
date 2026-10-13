/* ============================================================
   wz-ocr-worker.js — Hintergrund-Rechenteil der Texterkennung (Web Worker).
   Lädt den Tesseract-Kern und die Sprachdaten ausschließlich aus der
   WahrZentrale selbst (gleiche Adresse), erkennt Text und gibt ihn zurück.
   Siehe wz-ocr.js und lizenzen.html#texterkennung.
   ============================================================ */
/* global TesseractCore */
"use strict";

var CORE_SIMD = "./lib-ocr-core-5.1.1-simd-lstm.wasm.js";
var CORE_PLAIN = "./lib-ocr-core-5.1.1-lstm.wasm.js";
var LANG_FILES = {
  deu: "./lib-ocr-deu-4.0.0-best-int.traineddata.gz",
  eng: "./lib-ocr-eng-4.0.0-best-int.traineddata.gz"
};
var PSM_SINGLE_BLOCK = "6";
var OEM_LSTM_ONLY = 1;

var Tess = null, api = null;

// Prüfmodul für WebAssembly-SIMD (i32x4-Befehl); ohne SIMD wird der langsamere Kern genutzt
function hasSimd() {
  try {
    return WebAssembly.validate(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253, 15, 253, 98, 11]));
  } catch (e) { return false; }
}

function gunzip(bytes) {
  // schon entpackt (z. B. wenn der Server die Datei selbst entpackt ausliefert)
  if (!(bytes[0] === 0x1f && bytes[1] === 0x8b)) return Promise.resolve(bytes);
  if (typeof DecompressionStream === "undefined") return Promise.reject(new Error("Dieses Gerät kann die Sprachdaten nicht entpacken (eine aktuellere Systemversion ist nötig)."));
  var stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
  return new Response(stream).arrayBuffer().then(function (b) { return new Uint8Array(b); });
}

function loadLang(lang) {
  var url = LANG_FILES[lang];
  if (!url) return Promise.reject(new Error("Sprache nicht verfügbar: " + lang));
  return fetch(url).then(function (r) {
    if (!r.ok) throw new Error("Sprachdaten konnten nicht geladen werden (" + r.status + ")");
    return r.arrayBuffer();
  }).then(function (b) { return gunzip(new Uint8Array(b)); }).then(function (data) {
    Tess.FS.writeFile("./" + lang + ".traineddata", data);
  });
}

function init(langs) {
  var start = Tess ? Promise.resolve(Tess) : new Promise(function (resolve, reject) {
    try { importScripts(hasSimd() ? CORE_SIMD : CORE_PLAIN); } catch (e) { reject(new Error("Texterkennung konnte nicht geladen werden")); return; }
    if (typeof TesseractCore !== "function") { reject(new Error("Texterkennung konnte nicht geladen werden")); return; }
    TesseractCore({ TesseractProgress: function () { } }).then(resolve, reject);
  }).then(function (m) { Tess = m; return m; });
  return start.then(function () { return Promise.all(langs.map(loadLang)); }).then(function () {
    if (api) { try { api.End(); } catch (e) { } }
    api = new Tess.TessBaseAPI();
    var status = api.Init(null, langs.join("+"), OEM_LSTM_ONLY);
    if (status !== 0) throw new Error("Texterkennung konnte nicht vorbereitet werden");
    api.SetVariable("tessedit_pageseg_mode", PSM_SINGLE_BLOCK);
    return true;
  });
}

// Ausrichtung aus den EXIF-Daten eines Fotos (wie tesseract.js), 1 = normal
function exifOrientation(bytes) {
  var head = Array.prototype.slice.call(bytes.subarray(0, 500)).join(" ");
  var m = head.match(/1 18 0 3 0 0 0 1 0 (\d)/);
  return (m && parseInt(m[1], 10)) || 1;
}

function recognize(image) {
  if (!api) throw new Error("Texterkennung ist nicht vorbereitet");
  Tess.FS.writeFile("/input", image);
  var res = api.SetImageFile(exifOrientation(image), 0);
  if (res === 1) throw new Error("Das Bild konnte nicht gelesen werden");
  api.Recognize(null);
  var text = api.GetUTF8Text();
  try { Tess.FS.unlink("/input"); } catch (e) { }
  return text;
}

self.onmessage = function (e) {
  var m = e.data || {};
  Promise.resolve().then(function () {
    if (m.type === "init") return init(m.payload.langs);
    if (m.type === "recognize") return recognize(m.payload.image);
    throw new Error("Unbekannter Auftrag");
  }).then(function (result) {
    self.postMessage({ id: m.id, result: result });
  }, function (err) {
    self.postMessage({ id: m.id, error: String((err && err.message) || err) });
  });
};
