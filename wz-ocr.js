/* ============================================================
   wz-ocr.js — Texterkennung der WahrZentrale, vollständig auf dem Gerät.

   Stellt die bisher genutzte Schnittstelle bereit:
     Tesseract.recognize(bild, "deu+eng")      -> Promise<{ data: { text } }>
     Tesseract.createWorker(["deu","eng"])     -> Promise<worker>
       worker.recognize(bild)                  -> Promise<{ data: { text } }>
       worker.terminate()
   "bild" darf eine data:-URL, eine Adresse auf derselben Seite, ein Blob/File,
   ein Canvas oder ein <img> sein.

   Die eigentliche Erkennung übernimmt der offizielle Tesseract-Kern
   (tesseract.js-core 5.1.1, Apache-2.0) mit den Sprachdaten „deu“ und „eng“
   (tessdata 4.0.0_best_int, Apache-2.0). Alle Dateien liegen in der
   WahrZentrale selbst – es wird nichts von fremden Servern geladen und kein
   Bild oder Text verlässt das Gerät. Lizenzen: lizenzen.html#texterkennung
   ============================================================ */
(function (global) {
  "use strict";
  if (global.Tesseract && global.Tesseract.__wz) return;
  var WORKER_URL = "./wz-ocr-worker.js";

  function toBytes(img) {
    return new Promise(function (resolve, reject) {
      try {
        if (img == null) throw new Error("Kein Bild übergeben");
        if (typeof img === "string") {
          if (img.indexOf("data:") === 0) {
            var b64 = img.slice(img.indexOf(",") + 1), bin = atob(b64), out = new Uint8Array(bin.length);
            for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
            return resolve(out);
          }
          return fetch(img).then(function (r) { return r.arrayBuffer(); }).then(function (b) { resolve(new Uint8Array(b)); }, reject);
        }
        if (typeof Blob !== "undefined" && img instanceof Blob) {
          return img.arrayBuffer().then(function (b) { resolve(new Uint8Array(b)); }, reject);
        }
        if (img instanceof ArrayBuffer) return resolve(new Uint8Array(img));
        if (ArrayBuffer.isView(img)) return resolve(new Uint8Array(img.buffer, img.byteOffset, img.byteLength));
        var canvas = img;
        if (typeof HTMLImageElement !== "undefined" && img instanceof HTMLImageElement) {
          canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth || img.width; canvas.height = img.naturalHeight || img.height;
          canvas.getContext("2d").drawImage(img, 0, 0);
        }
        if (canvas && typeof canvas.toBlob === "function") {
          return canvas.toBlob(function (bl) { if (!bl) return reject(new Error("Bild nicht lesbar")); bl.arrayBuffer().then(function (b) { resolve(new Uint8Array(b)); }, reject); }, "image/png");
        }
        throw new Error("Bildformat nicht unterstützt");
      } catch (e) { reject(e); }
    });
  }

  function langList(langs) {
    if (!langs) return ["eng"];
    if (typeof langs === "string") return langs.split("+").filter(Boolean);
    return langs.slice();
  }

  function createWorker(langs) {
    var w = new Worker(WORKER_URL);
    var seq = 0, pending = {};
    w.onmessage = function (e) {
      var m = e.data || {}, p = pending[m.id];
      if (!p) return;
      delete pending[m.id];
      if (m.error) p.reject(new Error(m.error)); else p.resolve(m.result);
    };
    w.onerror = function (e) {
      var msg = (e && e.message) || "Texterkennung konnte nicht gestartet werden";
      Object.keys(pending).forEach(function (k) { pending[k].reject(new Error(msg)); delete pending[k]; });
    };
    function call(type, payload, transfer) {
      return new Promise(function (resolve, reject) {
        var id = ++seq;
        pending[id] = { resolve: resolve, reject: reject };
        w.postMessage({ id: id, type: type, payload: payload }, transfer || []);
      });
    }
    var api = {
      recognize: function (img) {
        return toBytes(img).then(function (bytes) {
          var copy = new Uint8Array(bytes); // eigene Kopie, damit sie übertragen werden kann
          return call("recognize", { image: copy }, [copy.buffer]);
        }).then(function (text) { return { data: { text: text || "" } }; });
      },
      terminate: function () {
        try { w.terminate(); } catch (e) { }
        Object.keys(pending).forEach(function (k) { pending[k].reject(new Error("beendet")); delete pending[k]; });
        return Promise.resolve();
      }
    };
    return call("init", { langs: langList(langs) }).then(function () { return api; }, function (err) { api.terminate(); throw err; });
  }

  function recognize(img, langs) {
    return createWorker(langs).then(function (w) {
      return w.recognize(img).then(function (r) { w.terminate(); return r; }, function (err) { w.terminate(); throw err; });
    });
  }

  global.Tesseract = { __wz: true, createWorker: createWorker, recognize: recognize };
})(window);
