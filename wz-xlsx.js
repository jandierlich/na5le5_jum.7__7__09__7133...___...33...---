/* ============================================================
   wz-xlsx.js — Schlanker, eigener Tabellen-Schreiber (.xlsx) für die
   WahrZentrale. Ersetzt die zuvor von cdn.sheetjs.com nachgeladene
   Bibliothek: keine Verbindung zu Dritten, funktioniert offline.

   Bietet genau die Teilmenge der bekannten SheetJS-Schnittstelle, die
   BelegParkWahr nutzt:
     XLSX.utils.book_new()
     XLSX.utils.aoa_to_sheet(zeilen)
     XLSX.utils.encode_cell({ r, c })
     XLSX.utils.book_append_sheet(buch, blatt, name)
     XLSX.write(buch, { type: 'array' })   -> Uint8Array
   Unterstützt: Text, Zahlen, Spaltenbreiten (ws['!cols'] = [{wch}]),
   fette Kopfzeile mit Hintergrundfarbe (cell.s = {font:{bold}, fill:{fgColor:{rgb}}}).
   Die Datei wird als unkomprimiertes ZIP ("stored") erzeugt – das ist
   gültiges Office-Open-XML und wird von gängigen Tabellenprogrammen
   geöffnet.
   © Jan Dierlich – Alle Rechte vorbehalten.
   ============================================================ */
(function (global) {
  "use strict";

  var CRC = (function () {
    var t = new Uint32Array(256);
    for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
    return t;
  })();
  function crc32(b) { var c = 0xFFFFFFFF; for (var i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
  var enc = new TextEncoder();

  function zip(files) { // files: [{name, data:string}]
    var parts = [], central = [], offset = 0;
    var d = new Date();
    var time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
    var date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    files.forEach(function (f) {
      var name = enc.encode(f.name), data = enc.encode(f.data), crc = crc32(data);
      var lh = new DataView(new ArrayBuffer(30));
      lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(8, 0, true);
      lh.setUint16(10, time, true); lh.setUint16(12, date, true); lh.setUint32(14, crc, true);
      lh.setUint32(18, data.length, true); lh.setUint32(22, data.length, true); lh.setUint16(26, name.length, true); lh.setUint16(28, 0, true);
      var ch = new DataView(new ArrayBuffer(46));
      ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true); ch.setUint16(10, 0, true);
      ch.setUint16(12, time, true); ch.setUint16(14, date, true); ch.setUint32(16, crc, true);
      ch.setUint32(20, data.length, true); ch.setUint32(24, data.length, true); ch.setUint16(28, name.length, true);
      ch.setUint16(30, 0, true); ch.setUint16(32, 0, true); ch.setUint16(34, 0, true); ch.setUint16(36, 0, true);
      ch.setUint32(38, 0, true); ch.setUint32(42, offset, true);
      parts.push(new Uint8Array(lh.buffer), name, data);
      central.push(new Uint8Array(ch.buffer), name);
      offset += 30 + name.length + data.length;
    });
    var cdSize = central.reduce(function (s, p) { return s + p.length; }, 0);
    var end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
    end.setUint32(12, cdSize, true); end.setUint32(16, offset, true); end.setUint16(20, 0, true);
    var all = parts.concat(central, [new Uint8Array(end.buffer)]);
    var total = all.reduce(function (s, p) { return s + p.length; }, 0);
    var out = new Uint8Array(total), pos = 0;
    all.forEach(function (p) { out.set(p, pos); pos += p.length; });
    return out;
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; })
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
  }
  function colName(c) { var s = ""; c++; while (c > 0) { var m = (c - 1) % 26; s = String.fromCharCode(65 + m) + s; c = Math.floor((c - 1) / 26); } return s; }
  function encode_cell(rc) { return colName(rc.c) + (rc.r + 1); }

  function aoa_to_sheet(rows) {
    var ws = { "!rows": rows.length, "!colsCount": 0 };
    rows.forEach(function (row, r) {
      ws["!colsCount"] = Math.max(ws["!colsCount"], row.length);
      row.forEach(function (v, c) {
        if (v === null || v === undefined || v === "") return;
        var isNum = typeof v === "number" && isFinite(v);
        ws[encode_cell({ r: r, c: c })] = { t: isNum ? "n" : "s", v: v };
      });
    });
    return ws;
  }

  function book_new() { return { SheetNames: [], Sheets: {} }; }
  function book_append_sheet(wb, ws, name) {
    name = String(name || ("Blatt" + (wb.SheetNames.length + 1))).replace(/[\\\/\?\*\[\]:]/g, " ").slice(0, 31);
    wb.SheetNames.push(name); wb.Sheets[name] = ws;
  }

  // Stile: 0 = Standard, 1 = fette Kopfzeile mit Hintergrund (Farbe je Buch aus erster Kopfzelle)
  function sheetXml(ws, headerStyleUsed) {
    var rows = [];
    for (var r = 0; r < ws["!rows"]; r++) {
      var cells = [];
      for (var c = 0; c < ws["!colsCount"]; c++) {
        var ref = encode_cell({ r: r, c: c }), cell = ws[ref];
        if (!cell) continue;
        var s = cell.s && cell.s.font && cell.s.font.bold ? ' s="1"' : "";
        if (s) headerStyleUsed.push(cell.s);
        if (cell.t === "n") cells.push('<c r="' + ref + '"' + s + '><v>' + cell.v + '</v></c>');
        else cells.push('<c r="' + ref + '"' + s + ' t="inlineStr"><is><t xml:space="preserve">' + esc(cell.v) + '</t></is></c>');
      }
      rows.push('<row r="' + (r + 1) + '">' + cells.join("") + '</row>');
    }
    var cols = "";
    if (ws["!cols"] && ws["!cols"].length) {
      cols = "<cols>" + ws["!cols"].map(function (w, i) {
        var wch = (w && (w.wch || w.width)) || 12;
        return '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + (wch + 0.7) + '" customWidth="1"/>';
      }).join("") + "</cols>";
    }
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      cols + '<sheetData>' + rows.join("") + '</sheetData></worksheet>';
  }

  function write(wb) {
    var used = [];
    var sheets = wb.SheetNames.map(function (n) { return sheetXml(wb.Sheets[n], used); });
    var rgb = "E9E4FB";
    if (used.length && used[0].fill && used[0].fill.fgColor && /^[0-9A-Fa-f]{6}$/.test(used[0].fill.fgColor.rgb || "")) rgb = used[0].fill.fgColor.rgb.toUpperCase();
    var files = [];
    files.push({ name: "[Content_Types].xml", data:
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
      '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
      sheets.map(function (_, i) { return '<Override PartName="/xl/worksheets/sheet' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'; }).join("") +
      '</Types>' });
    files.push({ name: "_rels/.rels", data:
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
      '</Relationships>' });
    files.push({ name: "xl/workbook.xml", data:
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>' +
      wb.SheetNames.map(function (n, i) { return '<sheet name="' + esc(n) + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>'; }).join("") +
      '</sheets></workbook>' });
    files.push({ name: "xl/_rels/workbook.xml.rels", data:
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      sheets.map(function (_, i) { return '<Relationship Id="rId' + (i + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + (i + 1) + '.xml"/>'; }).join("") +
      '<Relationship Id="rId' + (sheets.length + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
      '</Relationships>' });
    files.push({ name: "xl/styles.xml", data:
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>' +
      '<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>' +
      '<fill><patternFill patternType="solid"><fgColor rgb="FF' + rgb + '"/><bgColor indexed="64"/></patternFill></fill></fills>' +
      '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
      '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
      '<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
      '<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs>' +
      '<cellStyles count="1"><cellStyle name="Standard" xfId="0" builtinId="0"/></cellStyles>' +
      '</styleSheet>' });
    sheets.forEach(function (x, i) { files.push({ name: "xl/worksheets/sheet" + (i + 1) + ".xml", data: x }); });
    return zip(files);
  }

  global.XLSX = {
    utils: { book_new: book_new, aoa_to_sheet: aoa_to_sheet, encode_cell: encode_cell, book_append_sheet: book_append_sheet },
    write: function (wb) { return write(wb); }
  };
})(window);
