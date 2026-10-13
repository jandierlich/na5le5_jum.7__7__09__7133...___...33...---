(function(){
  "use strict";

  // Hell-/Dunkelmodus: zentral über wz-theme.js (Standard hell, Wahl gilt für alle Wahr-Apps)

  var escapeHtml = wzEscapeHtml;

  // ---------- Speicher (rein lokal, localStorage) ----------
  var STORE_KEY = "vw_inventar";
  var KATEGORIEN_KEY = "vw_kategorien";
  function ladeInventar(){ try{ return JSON.parse(localStorage.getItem(STORE_KEY) || "[]"); }catch(e){ return []; } }
  function speichereInventar(liste){
    try{ localStorage.setItem(STORE_KEY, JSON.stringify(liste)); }
    catch(e){ wzAlert("Speichern fehlgeschlagen — evtl. ist der lokale Speicher voll."); }
  }
  // Vom Nutzer selbst angelegte Kategorien: frei eingebbar, werden beim ersten
  // Verwenden gemerkt und danach als Vorschlag/Filter angeboten. Keine feste
  // Vorgabe-Liste.
  function ladeKategorien(){ try{ return JSON.parse(localStorage.getItem(KATEGORIEN_KEY) || "[]"); }catch(e){ return []; } }
  function registriereKategorie(name){
    if(!name) return;
    var liste = ladeKategorien();
    if(liste.indexOf(name) === -1){
      liste.push(name);
      try{ localStorage.setItem(KATEGORIEN_KEY, JSON.stringify(liste)); }catch(e){}
    }
  }
  function entferneKategorie(name){
    var liste = ladeKategorien().filter(function(k){ return k !== name; });
    try{ localStorage.setItem(KATEGORIEN_KEY, JSON.stringify(liste)); }catch(e){}
  }

  // ---------- Navigation ----------
  var homeEl = document.getElementById("home");
  var scannerViewEl = document.getElementById("scannerView");
  var liveScanViewEl = document.getElementById("liveScanView");
  var formViewEl = document.getElementById("formView");
  var loadingOverlay = document.getElementById("loadingOverlay");

  function hideAllScreens(){
    homeEl.classList.add("hidden");
    scannerViewEl.classList.add("hidden");
    liveScanViewEl.classList.add("hidden");
    formViewEl.classList.add("hidden");
    stopCamera();
    stopLiveScan();
  }
  function showHome(){ hideAllScreens(); homeEl.classList.remove("hidden"); renderKategorieFilter(); renderListe(); }
  showHome();

  document.getElementById("btnScanEinzel").addEventListener("click", openScanner);
  document.getElementById("btnManuellNeu").addEventListener("click", function(){ oeffneFormular(null, ""); });
  document.getElementById("btnScanLive").addEventListener("click", openLiveScan);

  // ---------- Kamera & OCR (gleiche Technik wie ProduktWahr, 100% lokal) ----------
  // Fotos werden ausschließlich zur Texterkennung verwendet und danach sofort
  // verworfen — es wird zu keinem Zeitpunkt ein Foto gespeichert, weder lokal
  // im Eintrag noch sonst irgendwo.
  var stream = null;
  var video = document.getElementById("video");
  var canvas = document.getElementById("canvas");

  var loadTesseract = wzLoadTesseract;
  function openScanner(){
    hideAllScreens();
    scannerViewEl.classList.remove("hidden");
    navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"environment"}, width:{ideal:1280}, height:{ideal:720}}})
      .then(function(s){ stream = s; video.srcObject = s; })
      .catch(function(){ wzAlert("Kein Kamerazugriff möglich. Du kannst den Eintrag stattdessen manuell anlegen."); showHome(); });
  }
  function stopCamera(){ if(stream){ stream.getTracks().forEach(function(t){ t.stop(); }); stream = null; } }

  document.getElementById("btnCloseScanner").addEventListener("click", showHome);
  document.getElementById("btnManualInsteadInScanner").addEventListener("click", function(){ oeffneFormular(null, ""); });

  document.getElementById("btnCapture").addEventListener("click", function(){
    if(!video.videoWidth) return;
    var vw = video.videoWidth, vh = video.videoHeight;
    var cw = video.clientWidth, ch = video.clientHeight;
    var scale = Math.max(cw / vw, ch / vh);
    var offsetX = (vw * scale - cw) / 2, offsetY = (vh * scale - ch) / 2;
    var frameLeft = cw * 0.08, frameTop = ch * 0.32, frameW = cw * 0.84, frameH = ch * 0.36;
    var sx = (frameLeft + offsetX) / scale, sy = (frameTop + offsetY) / scale;
    var sw = frameW / scale, sh = frameH / scale;
    canvas.width = sw; canvas.height = sh;
    canvas.getContext("2d").drawImage(video, sx, sy, sw, sh, 0, 0, sw, sh);
    var dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    scannerViewEl.classList.add("hidden");

    loadingOverlay.classList.remove("hidden");
    document.getElementById("loadingText").textContent = "Texterkennung läuft ...";
    loadTesseract().then(function(){ return Tesseract.recognize(dataUrl, "deu+eng"); })
      .then(function(result){
        loadingOverlay.classList.add("hidden");
        var text = (result.data.text || "").trim();
        // dataUrl wird ab hier nicht mehr benötigt und bewusst verworfen.
        oeffneFormular(null, text);
      }).catch(function(err){
        loadingOverlay.classList.add("hidden");
        oeffneFormular(null, "");
        wzAlert("Texterkennung fehlgeschlagen. Bitte Name/Notiz manuell ergänzen.");
      });
  });

  // ---------- Live-Scan (fortlaufende Texterkennung, kein Auslöser nötig) ----------
  var liveStream = null;
  var liveVideo = document.getElementById("liveVideo");
  var liveWorker = null, liveTimer = null, liveBusy = false;
  var lastLiveText = "", lastLiveSignature = "";

  function setLiveStatus(text){
    var el = document.getElementById("liveStatus");
    if(el) el.innerHTML = text;
  }
  function openLiveScan(){
    hideAllScreens();
    document.getElementById("liveCard").classList.remove("visible");
    setLiveStatus("Kamera wird gestartet …");
    liveScanViewEl.classList.remove("hidden");
    navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"environment"}, width:{ideal:1280}, height:{ideal:720}}})
      .then(function(s){
        liveStream = s; liveVideo.srcObject = s;
        setLiveStatus("Texterkennung wird geladen …");
        return loadTesseract().then(function(){
          if(window.__vwLiveWorker) return window.__vwLiveWorker;
          return Tesseract.createWorker(["deu","eng"]).then(function(w){ window.__vwLiveWorker = w; return w; });
        });
      })
      .then(function(worker){
        liveWorker = worker;
        setLiveStatus("Label ins Bild halten …");
        if(liveTimer) clearInterval(liveTimer);
        liveTimer = setInterval(runLivePass, 2200);
      })
      .catch(function(){
        wzAlert('Live-Texterkennung konnte nicht gestartet werden. Nutze stattdessen "Einzelfoto aufnehmen".');
        showHome();
      });
  }
  function stopLiveScan(){
    if(liveTimer){ clearInterval(liveTimer); liveTimer = null; }
    if(liveStream){ liveStream.getTracks().forEach(function(t){ t.stop(); }); liveStream = null; }
    liveBusy = false;
    lastLiveSignature = "";
    var card = document.getElementById("liveCard");
    if(card) card.classList.remove("visible");
  }
  function captureLiveFrame(){
    if(!liveVideo.videoWidth) return null;
    var vw = liveVideo.videoWidth, vh = liveVideo.videoHeight;
    var cw = liveVideo.clientWidth, ch = liveVideo.clientHeight;
    var scale = Math.max(cw / vw, ch / vh);
    var offsetX = (vw * scale - cw) / 2, offsetY = (vh * scale - ch) / 2;
    var frameLeft = cw * 0.08, frameTop = ch * 0.32, frameW = cw * 0.84, frameH = ch * 0.36;
    var sx = (frameLeft + offsetX) / scale, sy = (frameTop + offsetY) / scale;
    var sw = frameW / scale, sh = frameH / scale;
    var c = document.createElement("canvas");
    c.width = sw; c.height = sh;
    c.getContext("2d").drawImage(liveVideo, sx, sy, sw, sh, 0, 0, sw, sh);
    return c.toDataURL("image/jpeg", 0.85);
  }
  function runLivePass(){
    if(liveBusy || !liveWorker) return;
    var dataUrl = captureLiveFrame();
    if(!dataUrl) return;
    liveBusy = true;
    setLiveStatus(wzIcon("search") + " Analysiere …");
    liveWorker.recognize(dataUrl).then(function(result){
      liveBusy = false;
      var text = ((result.data && result.data.text) || "").trim();
      // dataUrl wird nur für diesen einen Erkennungsdurchlauf gebraucht und
      // danach nicht weiter aufbewahrt (kein Speichern von Kamerabildern).
      if(text.length < 4){
        setLiveStatus("Label ins Bild halten …");
        return;
      }
      setLiveStatus("Label ins Bild halten …");
      if(text !== lastLiveSignature){
        lastLiveSignature = text;
        lastLiveText = text;
        playBeep();
        showLiveOverlay(text);
      }
    }).catch(function(){
      liveBusy = false;
      setLiveStatus("Erkennung fehlgeschlagen, versuche es weiter …");
    });
  }
  function showLiveOverlay(text){
    var zeile = text.split("\n").map(function(s){ return s.trim(); }).filter(Boolean)[0] || "Text erkannt";
    document.getElementById("liveName").textContent = zeile.slice(0, 60);
    document.getElementById("liveMeta").textContent = text.length + " Zeichen erkannt";
    document.getElementById("liveCard").classList.add("visible");
  }
  document.getElementById("liveExpand").addEventListener("click", function(){
    if(!lastLiveText) return;
    var text = lastLiveText;
    stopLiveScan();
    oeffneFormular(null, text);
  });
  document.getElementById("btnCloseLiveScan").addEventListener("click", showHome);
  document.getElementById("btnLiveTorch").addEventListener("click", function(){
    if(!liveStream) return;
    var track = liveStream.getVideoTracks()[0];
    if(!track) return;
    var caps = track.getCapabilities ? track.getCapabilities() : {};
    if(!caps.torch){ return; }
    var aktuell = track.getSettings().torch;
    track.applyConstraints({advanced:[{torch: !aktuell}]}).catch(function(){});
  });
  function playBeep(){
    try{
      var ctx = new (window.AudioContext || window.webkitAudioContext)();
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = 1100; o.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(0.08, ctx.currentTime);
      o.start(); o.stop(ctx.currentTime + 0.08);
    }catch(e){}
  }

  // ---------- Eintrag-Formular (Neu & Bearbeiten in einem) ----------
  var bearbeiteId = null;

  function ersteZeile(text){
    var z = String(text || "").split("\n").map(function(s){ return s.trim(); }).filter(Boolean);
    return z.length ? z[0].slice(0, 60) : "";
  }

  function fuelleKategorieVorschlaege(){
    var box = document.getElementById("kategorieVorschlaege");
    var kategorien = ladeKategorien();
    if(kategorien.length === 0){ box.innerHTML = ""; return; }
    box.innerHTML = kategorien.map(function(k){
      return '<span class="kategorie-chip" style="display:inline-flex;align-items:center;gap:5px;padding:3px 6px 3px 9px">'
        + '<button type="button" data-waehle-kat="' + escapeHtml(k) + '" style="cursor:pointer;border:none;background:none;padding:0;font:inherit;color:inherit">' + escapeHtml(k) + '</button>'
        + '<button type="button" class="kategorie-chip-del" data-loesche-kat="' + escapeHtml(k) + '" aria-label="Kategorie ' + escapeHtml(k) + ' löschen" style="cursor:pointer;border:none;background:none;padding:0;font:inherit;color:inherit;opacity:.6;font-size: 14px;line-height:1"><svg class="wzi" aria-hidden="true"><use href="#wzi-close"></use></svg></button>'
        + '</span>';
    }).join("");
    box.querySelectorAll("[data-waehle-kat]").forEach(function(btn){
      btn.addEventListener("click", function(){
        document.getElementById("formKategorie").value = btn.getAttribute("data-waehle-kat");
      });
    });
    box.querySelectorAll("[data-loesche-kat]").forEach(function(btn){
      btn.addEventListener("click", function(e){
        e.stopPropagation();
        entferneKategorie(btn.getAttribute("data-loesche-kat"));
        fuelleKategorieVorschlaege();
      });
    });
  }

  function normalisiereAnzahl(v){
    var n = parseInt(v, 10);
    if(isNaN(n) || n < 1) n = 1;
    return n;
  }

  function oeffneFormular(id, ocrText){
    hideAllScreens();
    formViewEl.classList.remove("hidden");
    bearbeiteId = id;
    fuelleKategorieVorschlaege();

    if(id){
      var liste = ladeInventar();
      var eintrag = liste.find(function(e){ return e.id === id; });
      if(!eintrag){ showHome(); return; }
      document.getElementById("formTitel").textContent = "Eintrag bearbeiten";
      document.getElementById("formName").value = eintrag.name || "";
      document.getElementById("formAnzahl").value = normalisiereAnzahl(eintrag.anzahl);
      document.getElementById("formKategorie").value = eintrag.kategorie || "";
      document.getElementById("formDatum").value = eintrag.datum || "";
      document.getElementById("formNotiz").value = eintrag.notiz || "";
      document.getElementById("btnFormLoeschen").hidden = false;
    } else {
      document.getElementById("formTitel").textContent = "Neuer Eintrag";
      document.getElementById("formName").value = ersteZeile(ocrText);
      document.getElementById("formAnzahl").value = 1;
      document.getElementById("formKategorie").value = "";
      document.getElementById("formDatum").value = "";
      document.getElementById("formNotiz").value = ocrText || "";
      document.getElementById("btnFormLoeschen").hidden = true;
    }
  }

  document.getElementById("btnFormBack").addEventListener("click", showHome);

  document.getElementById("btnAnzahlMinus").addEventListener("click", function(){
    var el = document.getElementById("formAnzahl");
    el.value = normalisiereAnzahl(normalisiereAnzahl(el.value) - 1);
  });
  document.getElementById("btnAnzahlPlus").addEventListener("click", function(){
    var el = document.getElementById("formAnzahl");
    el.value = normalisiereAnzahl(normalisiereAnzahl(el.value) + 1);
  });
  document.getElementById("formAnzahl").addEventListener("change", function(){
    this.value = normalisiereAnzahl(this.value);
  });

  document.getElementById("btnFormSpeichern").addEventListener("click", function(){
    var name = document.getElementById("formName").value.trim();
    if(!name){ wzAlert("Bitte einen Namen eintragen."); return; }
    var kategorie = document.getElementById("formKategorie").value.trim();
    if(kategorie) registriereKategorie(kategorie);
    var liste = ladeInventar();
    var eintrag = {
      id: bearbeiteId || ("v" + Date.now() + Math.random().toString(36).slice(2,7)),
      name: name,
      anzahl: normalisiereAnzahl(document.getElementById("formAnzahl").value),
      kategorie: kategorie,
      datum: document.getElementById("formDatum").value || null,
      notiz: document.getElementById("formNotiz").value.trim(),
      erstellt: bearbeiteId ? (liste.find(function(e){return e.id===bearbeiteId;})||{}).erstellt || Date.now() : Date.now()
    };
    if(bearbeiteId){
      var idx = liste.findIndex(function(e){ return e.id === bearbeiteId; });
      if(idx >= 0) liste[idx] = eintrag; else liste.unshift(eintrag);
    } else {
      liste.unshift(eintrag);
    }
    speichereInventar(liste);
    showHome();
  });

  document.getElementById("btnFormLeeren").addEventListener("click", function(){
    document.getElementById("formName").value = "";
    document.getElementById("formAnzahl").value = 1;
    document.getElementById("formKategorie").value = "";
    document.getElementById("formDatum").value = "";
    document.getElementById("formNotiz").value = "";
    document.getElementById("formName").focus();
  });

  document.getElementById("btnFormLoeschen").addEventListener("click", async function(){
    if(!bearbeiteId) return;
    if(!await wzConfirm("Diesen Eintrag wirklich löschen?", {okLabel:"Löschen"})) return;
    var liste = ladeInventar().filter(function(e){ return e.id !== bearbeiteId; });
    speichereInventar(liste);
    showHome();
  });

  // ---------- Überblick / Liste / Filter / Anzahl ----------
  var aktiverKategorieFilter = "";

  function renderKategorieFilter(){
    var liste = ladeInventar();
    var vorhandeneKategorien = [];
    liste.forEach(function(e){
      var k = e.kategorie || "";
      if(k && vorhandeneKategorien.indexOf(k) === -1) vorhandeneKategorien.push(k);
    });
    vorhandeneKategorien.sort(function(a,b){ return a.localeCompare(b, "de"); });
    if(aktiverKategorieFilter && vorhandeneKategorien.indexOf(aktiverKategorieFilter) === -1){
      aktiverKategorieFilter = "";
    }
    var box = document.getElementById("kategorieFilter");
    if(vorhandeneKategorien.length === 0){ box.innerHTML = ""; return; }
    var html = '<button class="mode-btn' + (aktiverKategorieFilter === "" ? " active" : "") + '" data-kat="">Alle</button>';
    html += vorhandeneKategorien.map(function(k){
      return '<button class="mode-btn' + (aktiverKategorieFilter === k ? " active" : "") + '" data-kat="' + escapeHtml(k) + '">' + escapeHtml(k) + '</button>';
    }).join("");
    box.innerHTML = html;
    box.querySelectorAll(".mode-btn").forEach(function(btn){
      btn.addEventListener("click", function(){
        aktiverKategorieFilter = btn.getAttribute("data-kat") || "";
        renderKategorieFilter();
        renderListe();
      });
    });
  }

  function formatDatum(iso){
    if(!iso) return "";
    var d = new Date(iso + "T00:00:00");
    if(isNaN(d)) return "";
    return d.toLocaleDateString("de-DE", {day:"2-digit", month:"2-digit", year:"numeric"});
  }

  var HALTBARKEIT_BALD_TAGE = 7;
  function haltbarkeitsStatus(iso){
    if(!iso) return null;
    var d = new Date(iso + "T00:00:00");
    if(isNaN(d)) return null;
    var heute = new Date(); heute.setHours(0,0,0,0);
    var diffTage = Math.round((d - heute) / 86400000);
    if(diffTage < 0) return "abgelaufen";
    if(diffTage <= HALTBARKEIT_BALD_TAGE) return "bald";
    return null;
  }
  function haltbarkeitsRang(status){
    if(status === "abgelaufen") return 0;
    if(status === "bald") return 1;
    return 2;
  }

  var ANZAHL_STANDARD = 8;
  var listeAufgeklappt = false;

  function sortiereAlphabetisch(arr){
    return arr.slice().sort(function(a,b){
      var rangA = haltbarkeitsRang(haltbarkeitsStatus(a.datum));
      var rangB = haltbarkeitsRang(haltbarkeitsStatus(b.datum));
      if(rangA !== rangB) return rangA - rangB;
      return (a.name||"").localeCompare(b.name||"", "de", {sensitivity:"base"});
    });
  }

  function renderListe(){
    var suchbegriff = (document.getElementById("searchInput").value || "").toLowerCase().trim();
    var liste = ladeInventar();
    document.getElementById("ueberblickTitel").textContent = "Überblick (" + liste.length + (liste.length === 1 ? " Eintrag" : " Einträge") + ")";

    var gefiltert = liste;
    if(aktiverKategorieFilter){ gefiltert = gefiltert.filter(function(e){ return (e.kategorie||"") === aktiverKategorieFilter; }); }
    if(suchbegriff){
      gefiltert = gefiltert.filter(function(e){
        return (e.name||"").toLowerCase().indexOf(suchbegriff) !== -1 ||
               (e.kategorie||"").toLowerCase().indexOf(suchbegriff) !== -1 ||
               (e.notiz||"").toLowerCase().indexOf(suchbegriff) !== -1;
      });
    }
    gefiltert = sortiereAlphabetisch(gefiltert);

    var box = document.getElementById("vorratListe");
    if(liste.length === 0){
      box.innerHTML = '<p class="empty">Noch nichts erfasst. Tippe oben auf "Label live scannen" oder "Manuell eintragen".</p>';
      return;
    }
    if(gefiltert.length === 0){
      box.innerHTML = '<p class="empty">Keine Treffer für diese Suche/Kategorie.</p>';
      return;
    }

    var sichtbar = (!listeAufgeklappt && gefiltert.length > ANZAHL_STANDARD) ? gefiltert.slice(0, ANZAHL_STANDARD) : gefiltert;
    var html = sichtbar.map(function(e){
      var metaTeile = [];
      var status = haltbarkeitsStatus(e.datum);
      if(e.datum){
        var datumLabel = "haltbar bis " + formatDatum(e.datum);
        if(status === "abgelaufen") datumLabel += " (abgelaufen)";
        else if(status === "bald") datumLabel += " (läuft bald ab)";
        metaTeile.push(datumLabel);
      }
      var dot = status ? '<span class="ampel-dot" style="background:' + (status === "abgelaufen" ? "var(--rot)" : "var(--gelb)") + '" aria-hidden="true"></span>' : "";
      var anzahlPrefix = (normalisiereAnzahl(e.anzahl) > 1) ? (normalisiereAnzahl(e.anzahl) + "× ") : "";
      return '<div class="vorrat-item" data-id="' + escapeHtml(e.id) + '">' +
        '<div class="vorrat-info">' +
          '<div class="vorrat-name">' + dot + escapeHtml(anzahlPrefix) + escapeHtml(e.name) + '</div>' +
          '<div class="vorrat-meta">' + escapeHtml(metaTeile.join(" · ")) + '</div>' +
        '</div>' +
        (e.kategorie ? '<span class="kategorie-chip">' + escapeHtml(e.kategorie) + '</span>' : '') +
      '</div>';
    }).join("");
    if(gefiltert.length > ANZAHL_STANDARD){
      if(!listeAufgeklappt){
        html += '<button class="btn btn-secondary" id="btnListeAufklappen" style="margin-top:4px">Alle anzeigen (' + (gefiltert.length - ANZAHL_STANDARD) + ' weitere)</button>';
      } else {
        html += '<button class="btn btn-secondary" id="btnListeEinklappen" style="margin-top:4px">Weniger anzeigen</button>';
      }
    }
    box.innerHTML = html;
    box.querySelectorAll("[data-id]").forEach(function(el){
      el.addEventListener("click", function(){ oeffneFormular(el.getAttribute("data-id"), ""); });
    });
    var btnAuf = document.getElementById("btnListeAufklappen");
    if(btnAuf) btnAuf.addEventListener("click", function(){ listeAufgeklappt = true; renderListe(); });
    var btnEin = document.getElementById("btnListeEinklappen");
    if(btnEin) btnEin.addEventListener("click", function(){ listeAufgeklappt = false; renderListe(); });
    box.querySelectorAll("[data-id]").forEach(function(el){
      el.addEventListener("click", function(){ oeffneFormular(el.getAttribute("data-id"), ""); });
    });
  }
  document.getElementById("searchInput").addEventListener("input", renderListe);

  // ---------- Export / Import (Backup, keine Fotos) ----------
  function pwExportBackup(){
    var liste = ladeInventar();
    if(!liste.length){ wzAlert("Es gibt noch nichts zum Sichern."); return; }
    var payload = { app: "VorratsWahr", format: "vorratswahr-backup", version: 2, exportedAt: new Date().toISOString(), eintraege: liste, kategorien: ladeKategorien() };
    var json = JSON.stringify(payload);
    var filename = "vorratswahr-" + new Date().toISOString().slice(0,10) + ".json";
    try{
      var file = new File([json], filename, {type:"application/json"});
      if(navigator.canShare && navigator.canShare({files:[file]})){
        navigator.share({files:[file], title:"VorratsWahr Sicherung"}).catch(function(){});
        return;
      }
    }catch(e){}
    var blob = new Blob([json], {type:"application/json"});
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function(){ URL.revokeObjectURL(url); }, 4000);
  }
  function pwImportBackupFile(file){
    var reader = new FileReader();
    reader.onload = async function(){
      var payload;
      try{ payload = JSON.parse(String(reader.result)); }
      catch(e){ wzAlert('Diese Datei konnte nicht gelesen werden. Bitte eine Datei auswählen, die zuvor über "Sichern" in VorratsWahr erzeugt wurde.'); return; }
      var neue = Array.isArray(payload.eintraege) ? payload.eintraege : [];
      if(!neue.length){ wzAlert("In dieser Datei wurden keine gültigen Einträge gefunden."); return; }
      var vorhandene = ladeInventar();
      var addToExisting = await wzConfirm("Gefunden: " + neue.length + " Einträge.\n\nOK = zu bestehenden Einträgen hinzufügen\nAbbrechen = bestehende Einträge ersetzen", {okLabel:"Hinzufügen", cancelLabel:"Ersetzen"});
      var ergebnis;
      if(addToExisting){
        var ids = {}; vorhandene.forEach(function(e){ ids[e.id] = true; });
        ergebnis = vorhandene.concat(neue.filter(function(e){ return e && !ids[e.id]; }));
      } else {
        ergebnis = neue;
      }
      speichereInventar(ergebnis);
      (Array.isArray(payload.kategorien) ? payload.kategorien : []).forEach(registriereKategorie);
      renderKategorieFilter();
      renderListe();
      wzToast("Import abgeschlossen.");
    };
    reader.onerror = function(){ wzAlert("Die Datei konnte nicht gelesen werden."); };
    reader.readAsText(file);
  }
  document.getElementById("btnExportBackup").addEventListener("click", pwExportBackup);
  document.getElementById("btnImportBackup").addEventListener("click", function(){ document.getElementById("importBackupFile").click(); });
  document.getElementById("importBackupFile").addEventListener("change", function(e){
    if(e.target.files && e.target.files[0]) pwImportBackupFile(e.target.files[0]);
    e.target.value = "";
  });

  // ---------- PDF-Export (alphabetisch, platzoptimiert, berücksichtigt aktive Suche/Filter) ----------
  function loadJsPDF(){
    return new Promise(function(resolve, reject){
      if(window.jspdf && window.jspdf.jsPDF){ resolve(); return; }
      var s = document.createElement("script");
      s.src = "./lib-jspdf.umd.min.js";
      s.onload = resolve; s.onerror = reject;
      document.head.appendChild(s);
    });
  }
  var aktuellePdfUrl = null;
  function baueUndZeigePdf(){
    var suchbegriff = (document.getElementById("searchInput").value || "").toLowerCase().trim();
    var liste = ladeInventar();
    var gefiltert = liste;
    if(aktiverKategorieFilter){ gefiltert = gefiltert.filter(function(e){ return (e.kategorie||"") === aktiverKategorieFilter; }); }
    if(suchbegriff){
      gefiltert = gefiltert.filter(function(e){
        return (e.name||"").toLowerCase().indexOf(suchbegriff) !== -1 ||
               (e.kategorie||"").toLowerCase().indexOf(suchbegriff) !== -1 ||
               (e.notiz||"").toLowerCase().indexOf(suchbegriff) !== -1;
      });
    }
    if(!gefiltert.length){ wzAlert("Keine Einträge für die aktuelle Ansicht (Suche/Filter) vorhanden."); return; }
    gefiltert = sortiereAlphabetisch(gefiltert);

    loadJsPDF().then(function(){
      var jsPDF = window.jspdf.jsPDF;
      var doc = new jsPDF({unit:"mm", format:"a4"});
      var pageW = doc.internal.pageSize.getWidth();
      var pageH = doc.internal.pageSize.getHeight();
      var marge = 14, y = marge;

      doc.setFont("helvetica", "bold"); doc.setFontSize(15);
      doc.text("VorratsWahr – Vorratsliste", marge, y); y += 6;
      doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(120);
      var kontext = [];
      if(aktiverKategorieFilter) kontext.push('Kategorie: "' + aktiverKategorieFilter + '"');
      if(suchbegriff) kontext.push('Suche: "' + suchbegriff + '"');
      var gesamtAnzahl = gefiltert.reduce(function(sum, e){ return sum + normalisiereAnzahl(e.anzahl); }, 0);
      var mengenTeil = gesamtAnzahl + (gesamtAnzahl === 1 ? " Artikel" : " Artikel gesamt");
      if(gesamtAnzahl !== gefiltert.length){
        mengenTeil = gefiltert.length + (gefiltert.length === 1 ? " Eintrag" : " Einträge") + " · " + mengenTeil;
      }
      var kopfzeile = new Date().toLocaleDateString("de-DE") + " · " + mengenTeil + (kontext.length ? " · " + kontext.join(", ") : "");
      doc.text(kopfzeile, marge, y); y += 7;
      doc.setDrawColor(210); doc.line(marge, y, pageW - marge, y); y += 6;
      doc.setTextColor(30);

      gefiltert.forEach(function(e){
        var zeilen = [];
        var metaTeile = [];
        if(e.kategorie) metaTeile.push(e.kategorie);
        if(e.datum){
          var pdfStatus = haltbarkeitsStatus(e.datum);
          var pdfDatumLabel = "haltbar bis " + formatDatum(e.datum);
          if(pdfStatus === "abgelaufen") pdfDatumLabel += " (abgelaufen)";
          else if(pdfStatus === "bald") pdfDatumLabel += " (läuft bald ab)";
          metaTeile.push(pdfDatumLabel);
        }
        var notizZeilen = e.notiz ? doc.splitTextToSize(e.notiz, pageW - 2*marge) : [];
        var blockHoehe = 5 + (metaTeile.length ? 4.2 : 0) + (notizZeilen.length * 3.8) + 6.5;
        if(y + blockHoehe > pageH - marge){ doc.addPage(); y = marge; }

        doc.setFont("helvetica", "bold"); doc.setFontSize(10.5); doc.setTextColor(20);
        var pdfAnzahl = normalisiereAnzahl(e.anzahl);
        doc.text((pdfAnzahl > 1 ? pdfAnzahl + "× " : "") + e.name, marge, y); y += 4.4;
        if(metaTeile.length){
          doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(130);
          doc.text(metaTeile.join(" · "), marge, y); y += 4;
        }
        if(notizZeilen.length){
          doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(70);
          notizZeilen.forEach(function(zeile){ doc.text(zeile, marge, y); y += 3.8; });
        }
        y += 2;
        doc.setDrawColor(235); doc.line(marge, y, pageW - marge, y);
        y += 4.5;
      });

      if(aktuellePdfUrl){ URL.revokeObjectURL(aktuellePdfUrl); }
      var blob = doc.output("blob");
      aktuellePdfUrl = URL.createObjectURL(blob);
      document.getElementById("pdfFrame").src = aktuellePdfUrl;
      document.getElementById("pdfModal").classList.remove("hidden");
    }).catch(function(){
      wzAlert("PDF-Erstellung fehlgeschlagen. Bitte Internetverbindung prüfen (die PDF-Bibliothek muss beim ersten Mal einmalig geladen werden).");
    });
  }
  document.getElementById("btnExportPdf").addEventListener("click", baueUndZeigePdf);
  function schliessePdf(){ document.getElementById("pdfModal").classList.add("hidden"); }
  document.getElementById("btnPdfClose").addEventListener("click", schliessePdf);
  document.getElementById("btnPdfClose2").addEventListener("click", schliessePdf);
  document.getElementById("btnPdfSave").addEventListener("click", function(){
    if(!aktuellePdfUrl) return;
    var filename = "vorratswahr-liste-" + new Date().toISOString().slice(0,10) + ".pdf";
    fetch(aktuellePdfUrl).then(function(r){ return r.blob(); }).then(function(blob){
      try{
        var file = new File([blob], filename, {type:"application/pdf"});
        if(navigator.canShare && navigator.canShare({files:[file]})){
          navigator.share({files:[file], title:"VorratsWahr Vorratsliste"}).catch(function(){});
          return;
        }
      }catch(e){}
      var a = document.createElement("a");
      a.href = aktuellePdfUrl; a.download = filename;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    });
  });

  // ---------- Einführung (einheitlich über wz-onboarding.js) ----------
  var onb = wzOnboarding({
    key: "vw_onboarded",
    slides: [
      {icon:"jar", title:"Willkommen bei VorratsWahr", text:"Fotografiere ein Glas mit Klebelabel – die Texterkennung liest automatisch, was draufsteht, und legt daraus einen durchsuchbaren Eintrag an. Das Foto selbst wird nicht gespeichert."},
      {icon:"signal", title:"Einfach live scannen", text:"Halte die Kamera auf das Label – die Erkennung läuft automatisch alle paar Sekunden. Tippe auf „Übernehmen“, sobald der Text passt."},
      {icon:"search", title:"Alles im Überblick", text:"Auf der Startseite findest du alle Einträge – durchsuchbar und nach deinen eigenen Kategorien filterbar."}
    ]
  });
  document.getElementById("btnShowOnboarding").addEventListener("click", function(e){ e.preventDefault(); onb.show(); });

  // ---------- Service Worker (Offline-Fähigkeit, PWA) ----------


  // ---------- Übergabe aus dem Scanner der Startseite ----------
  var wzH = window.wzScanHandoff && wzScanHandoff(["vorrat"]);
  if(wzH){
    oeffneFormular(null, String(wzH.text || ""));
    // getippte Kurzeingabe: Name steht schon im Namensfeld, die Notiz bleibt leer
    if(wzH.kurz) document.getElementById("formNotiz").value = "";
    if(wzH.anzahl > 1) document.getElementById("formAnzahl").value = normalisiereAnzahl(wzH.anzahl);
  }

})();
