(function(){
  "use strict";

  // Hell-/Dunkelmodus: zentral über wz-theme.js (Standard hell, Wahl gilt für alle Wahr-Apps)

  // ---------- Navigation ----------
  var homeEl = document.getElementById("home");
  var resultViewEl = document.getElementById("resultView");
  var scannerViewEl = document.getElementById("scannerView");
  var liveTextViewEl = document.getElementById("liveTextView");
  var liveScanViewEl = document.getElementById("liveScanView");
  var profilViewEl = document.getElementById("profilView");
  var loadingOverlay = document.getElementById("loadingOverlay");
  var loadingText = document.getElementById("loadingText");

  function hideAllScreens(){
    homeEl.classList.add("hidden");
    resultViewEl.classList.add("hidden");
    scannerViewEl.classList.add("hidden");
    liveTextViewEl.classList.add("hidden");
    liveScanViewEl.classList.add("hidden");
    profilViewEl.classList.add("hidden");
    stopCamera();
    stopLiveTextScan();
    stopLiveScan();
  }
  function showHome(){ hideAllScreens(); homeEl.classList.remove("hidden"); }
  function showResult(){ hideAllScreens(); resultViewEl.classList.remove("hidden"); }
  function showProfil(){ hideAllScreens(); profilViewEl.classList.remove("hidden"); renderProfil(); }

  var escapeHtml = wzEscapeHtml;
  function ampelColor(g){
    return {rot:"#FF3B30", gelb:"#FFCC02", gruen:"#34C759", info:"#5AC8FA"}[g] || "#5AC8FA";
  }
  function badgeText(g){
    return {rot:"Achtung", gelb:"Hinweis", gruen:"Unbedenklich", info:"Info"}[g] || "Info";
  }
  function shareText(text){
    if(navigator.share){ navigator.share({text:text}).catch(function(){}); }
    else if(navigator.clipboard){ navigator.clipboard.writeText(text); wzToast("In Zwischenablage kopiert."); }
  }

  // ---------- Modus-Umschalter (Automatisch / Lebensmittel / Kosmetik) ----------
  var aktuellerModus = "auto";
  var MODE_HINTS = {
    auto: "Prüft automatisch gegen beide Datenbanken und zeigt die passende Quelle. Bei bekannter Produktart hilft die gezielte Auswahl, Fehltreffer durch Namensüberschneidungen zu vermeiden.",
    lebensmittel: "Prüft nur gegen die Zusatzstoff-Datenbank (E-Nummern) – ideal bei Lebensmitteletiketten.",
    kosmetik: "Prüft nur gegen die INCI-Datenbank – ideal bei Kosmetik-/Pflegeprodukten."
  };
  document.querySelectorAll("#modeSwitch .mode-btn").forEach(function(btn){
    btn.addEventListener("click", function(){
      aktuellerModus = btn.getAttribute("data-mode");
      document.querySelectorAll("#modeSwitch .mode-btn").forEach(function(b){ b.classList.toggle("active", b === btn); });
      document.getElementById("modeHint").textContent = MODE_HINTS[aktuellerModus];
    });
  });

  // ---------- Kombinierte Prüfung (E-Nummern + INCI + Allergene) ----------
  var lastResult = { treffer: [], allergene: [] };

  function renderResultGroup(list, treffer, heading, icon){
    if(!treffer.length) return;
    var head = document.createElement("div");
    head.className = "group-head";
    head.innerHTML = wzIcon(icon) + " " + escapeHtml(heading) + " (" + treffer.length + ")";
    list.appendChild(head);
    treffer.forEach(function(entry){
      var div = document.createElement("div");
      div.className = "result-item";
      div.style.borderLeft = "4px solid " + ampelColor(entry.g);
      div.innerHTML =
        '<div class="top">' +
          '<div><div class="name"><span class="ampel-dot" style="background:'+ampelColor(entry.g)+'"></span>'+escapeHtml(entry.name)+'</div>' +
            '<div class="cat">'+escapeHtml(entry.kategorie)+'</div></div>' +
          '<button class="fav-star" data-fav="'+entry.id+'" aria-label="Favorit"><svg class="wzi" aria-hidden="true"><use href="#wzi-star-outline"></use></svg></button>' +
          '<div class="badge badge-'+entry.g+'">'+badgeText(entry.g)+'</div>' +
        '</div>' +
        '<div class="detail">'+escapeHtml(entry.detailtext) +
          (entry.hinweis ? '<br><br><em>'+escapeHtml(entry.hinweis)+'</em>' : '') +
          (entry.efsanote ? '<br><br><span style="font-size: 12.5px">'+escapeHtml(entry.efsanote)+'</span>' : '') +
          '<br><br><span style="font-size: 12.5px">'+escapeHtml(entry.quellennote)+'</span>' +
          '<div class="share-row"><button class="share-btn" data-share="'+entry.id+'">Teilen</button></div>' +
        '</div>';
      div.addEventListener("click", function(e){
        if(e.target.closest(".share-btn")||e.target.closest(".fav-star")) return;
        div.classList.toggle("open");
      });
      list.appendChild(div);
    });
  }

  function renderResults(res){
    var list = document.getElementById("resultList");
    list.innerHTML = "";
    var profilBox = document.getElementById("resultProfilWarnung");
    var profilTreffer = pruefeProfilTreffer_Text(res.allergene);
    if(profilTreffer.length){
      profilBox.classList.remove("hidden");
      profilBox.innerHTML = '<div class="legal-box profil-warn-box"><svg class="wzi" aria-hidden="true"><use href="#wzi-warning"></use></svg> Laut deinem Profil relevant: <strong>' + profilTreffer.map(escapeHtml).join(", ") + '</strong></div>';
    } else {
      profilBox.classList.add("hidden");
      profilBox.innerHTML = "";
    }
    var allergBox = document.getElementById("resultAllergene");
    if(res.allergene && res.allergene.length){
      allergBox.classList.remove("hidden");
      allergBox.innerHTML = '<div class="legal-box"><svg class="wzi" aria-hidden="true"><use href="#wzi-warning"></use></svg> Erkannte Allergene (Anhang II LMIV): <strong>' + res.allergene.map(escapeHtml).join(", ") + '</strong></div>';
    } else {
      allergBox.classList.add("hidden");
      allergBox.innerHTML = "";
    }
    if(res.treffer.length === 0){
      list.innerHTML = '<div class="empty">Keine der geprüften Kategorien gefunden. Das heißt nicht automatisch, dass alle Stoffe unbedenklich sind – nur, dass sie nicht in unserer Liste stehen.</div>';
      return;
    }
    // Getrennte Abschnitte statt Mischliste, damit auf einen Blick klar ist,
    // welche Treffer aus welcher Datenbank stammen.
    var zusatzstoffe = res.treffer.filter(function(t){ return t.quelle === "zusatzstoff"; });
    var kosmetik = res.treffer.filter(function(t){ return t.quelle === "kosmetik"; });
    renderResultGroup(list, zusatzstoffe, "Zusatzstoffe", "obst");
    renderResultGroup(list, kosmetik, "Kosmetik-Inhaltsstoffe", "lipstick");
    wireItemInteractions(list, res.treffer);
  }

  // Verknüpft Teilen-/Favoriten-Buttons innerhalb eines Ergebnis-Containers mit
  // der passenden Trefferliste. Wird sowohl vom normalen Prüfungsergebnis als
  // auch von der Nachschlage-Suche verwendet.
  function wireItemInteractions(list, treffer){
    list.querySelectorAll("[data-share]").forEach(function(btn){
      btn.addEventListener("click", function(ev){
        ev.stopPropagation();
        var entry = treffer.find(function(m){ return m.id === btn.getAttribute("data-share"); });
        shareText(entry.name + " (" + entry.quelleLabel + ", " + entry.kategorie + "): " + entry.kurztext);
      });
    });
    list.querySelectorAll("[data-fav]").forEach(function(btn){
      btn.innerHTML = isFavorite(btn.getAttribute("data-fav")) ? wzIcon("star-filled") : wzIcon("star-outline");
      btn.addEventListener("click", function(ev){
        ev.stopPropagation();
        var entry = treffer.find(function(m){ return m.id === btn.getAttribute("data-fav"); });
        toggleFavorite(entry);
        btn.innerHTML = isFavorite(entry.id) ? wzIcon("star-filled") : wzIcon("star-outline");
      });
    });
  }

  // ---------- Nachschlagen ohne Scan (durchsucht beide Datenbanken direkt) ----------
  var SW_LOOKUP_ITEMS = (function(){
    var items = [];
    SW_ADDITIV_DB.forEach(function(e){
      items.push({
        id: "e_" + e.code, name: e.name + " (" + e.code + ")", g: e.ampel,
        quelle: "zusatzstoff", quelleLabel: "Zusatzstoff", kategorie: e.klasse,
        kurztext: e.kurztext, detailtext: e.details, hinweis: e.hinweisGruppen,
        efsanote: e.efsanote, quellennote: e.quellennote, matchKey: SW_normalize(e.name + " " + e.code)
      });
    });
    (typeof INCI_DB !== "undefined" ? INCI_DB : []).forEach(function(e){
      var kontext = (typeof SW_CAT_KONTEXT_INCI !== "undefined") ? SW_CAT_KONTEXT_INCI[e.k] : null;
      items.push({
        id: "i_" + e.n, name: e.n, g: e.g,
        quelle: "kosmetik", quelleLabel: "Kosmetik-Inhaltsstoff",
        kategorie: SW_CAT_LABELS_INCI[e.k] || e.k, kurztext: e.t,
        detailtext: kontext ? (e.t + " " + kontext) : e.t, hinweis: null,
        quellennote: "Quelle: eigene INCI-Einstufung auf Basis öffentlich zugänglicher Datenbanken (z. B. CosIng).",
        matchKey: SW_normalize([e.n].concat(e.a || []).join(" "))
      });
    });
    return items;
  })();

  var lookupTimer = null;
  document.getElementById("lookupInput").addEventListener("input", function(){
    var val = this.value;
    clearTimeout(lookupTimer);
    lookupTimer = setTimeout(function(){ renderLookupResults(val); }, 150);
  });

  function renderLookupResults(query){
    var box = document.getElementById("lookupResults");
    var q = SW_normalize(query || "");
    if(q.length < 2){
      box.innerHTML = '<p style="font-size: 13.5px;color:var(--sub);margin:8px 2px 0">Mindestens 2 Zeichen eingeben, um in beiden Datenbanken nachzuschlagen – ganz ohne Foto oder Barcode.</p>';
      return;
    }
    var treffer = SW_LOOKUP_ITEMS.filter(function(it){ return it.matchKey.indexOf(q) !== -1; }).slice(0, 25);
    if(treffer.length === 0){
      box.innerHTML = '<div class="empty" style="padding:14px 4px">Keine Treffer in Zusatzstoff- oder INCI-Datenbank.</div>';
      return;
    }
    box.innerHTML = "";
    var zusatzstoffe = treffer.filter(function(t){ return t.quelle === "zusatzstoff"; });
    var kosmetik = treffer.filter(function(t){ return t.quelle === "kosmetik"; });
    renderResultGroup(box, zusatzstoffe, "Zusatzstoffe", "obst");
    renderResultGroup(box, kosmetik, "Kosmetik-Inhaltsstoffe", "lipstick");
    wireItemInteractions(box, treffer);
  }

  var currentSourceInfo = null;
  function runCheck(text, opts){
    lastResult = SW_pruefeText(text, aktuellerModus);
    renderResults(lastResult);
    showResult();
    var srcEl = document.getElementById("resultSource");
    if(opts && opts.source){
      srcEl.classList.remove("hidden");
      var quelleName = opts.source === "openfoodfacts" ? "Open Food Facts" : "Open Beauty Facts";
      var quelleUrl = opts.source === "openfoodfacts" ? "https://de.openfoodfacts.org" : "https://de.openbeautyfacts.org";
      var nameLine = opts.productName ? "„" + escapeHtml(opts.productName) + "“" + (opts.brands ? " (" + escapeHtml(opts.brands) + ")" : "") + " – " : "";
      var linkHtml = opts.url ? ' <a href="' + opts.url + '" target="_blank" rel="noopener noreferrer" style="color:inherit;text-decoration:underline">Auf ' + quelleName + ' ansehen <svg class="wzi" aria-hidden="true"><use href="#wzi-arrow-up-right"></use></svg></a>' : "";
      srcEl.innerHTML = nameLine + 'Zutatenliste enthält Informationen von <a href="'+quelleUrl+'" target="_blank" rel="noopener noreferrer" style="color:inherit">' + quelleName + '</a>, verfügbar unter der <a href="https://opendatacommons.org/licenses/odbl/1-0/" target="_blank" rel="noopener noreferrer" style="color:inherit">Open Database License (ODbL)</a>.' + linkHtml;
    } else {
      srcEl.classList.add("hidden");
    }
  }

  // ---------- Favoriten (immer aktiv, lokal gespeichert, jederzeit editierbar) ----------
  var FAV_KEY = "sw_favorites";
  function readList(key){ try { return JSON.parse(localStorage.getItem(key) || "[]"); } catch(e){ return []; } }
  function writeList(key, arr){ try { localStorage.setItem(key, JSON.stringify(arr)); } catch(e){} }

  function isFavorite(id){ return readList(FAV_KEY).some(function(f){ return f.id === id; }); }
  function toggleFavorite(entry){
    var favs = readList(FAV_KEY);
    var idx = favs.findIndex(function(f){ return f.id === entry.id; });
    if(idx >= 0){ favs.splice(idx, 1); } else { favs.unshift({id:entry.id, name:entry.name, kategorie:entry.kategorie, g:entry.g, quelleLabel:entry.quelleLabel}); }
    writeList(FAV_KEY, favs);
    renderFavorites();
  }
  function renderFavorites(){
    var favs = readList(FAV_KEY);
    var box = document.getElementById("swFavList");
    var clearBtn = document.getElementById("btnClearFav");
    clearBtn.style.display = favs.length ? "inline-block" : "none";
    if(favs.length === 0){
      box.innerHTML = '<p style="font-size: 13.5px;color:var(--sub);margin:0">Noch keine Favoriten. Tippe im Ergebnis auf den Stern <svg class="wzi" aria-hidden="true"><use href="#wzi-star-outline"></use></svg>.</p>';
      return;
    }
    box.innerHTML = favs.map(function(f){
      return '<div class="result-item" style="margin-bottom:8px;border-left:4px solid '+ampelColor(f.g)+'">' +
        '<div class="top">' +
          '<div><div class="name"><span class="ampel-dot" style="background:'+ampelColor(f.g)+'"></span>'+escapeHtml(f.name)+'</div><div class="cat">'+escapeHtml(f.kategorie)+'</div></div>' +
          '<button class="fav-star" data-unfav="'+f.id+'" aria-label="Favorit entfernen"><svg class="wzi" aria-hidden="true"><use href="#wzi-star-filled"></use></svg></button>' +
          '<div class="badge badge-'+f.g+'">'+badgeText(f.g)+'</div>' +
        '</div></div>';
    }).join("");
    box.querySelectorAll("[data-unfav]").forEach(function(btn){
      btn.addEventListener("click", function(){ toggleFavorite({id: btn.getAttribute("data-unfav")}); });
    });
  }
  document.getElementById("btnClearFav").addEventListener("click", async function(){
    if(await wzConfirm("Alle Favoriten löschen?")){ writeList(FAV_KEY, []); renderFavorites(); }
  });
  renderFavorites();

  // ---------- Export / Import (Backup für Favoriten) ----------
  function pwExportBackup(){
    var favs = readList(FAV_KEY);
    if(!favs.length){
      wzAlert('Es gibt noch nichts zum Sichern. Markiere zuerst ein paar Favoriten mit dem Stern-Symbol.');
      return;
    }
    var payload = {
      app: "ProduktWahr", format: "produktwahr-backup", version: 2,
      exportedAt: new Date().toISOString(), favorites: favs
    };
    var json = JSON.stringify(payload, null, 2);
    var filename = "produktwahr-favoriten-" + new Date().toISOString().slice(0,10) + ".json";
    try{
      var file = new File([json], filename, {type:"application/json"});
      if(navigator.canShare && navigator.canShare({files:[file]})){
        navigator.share({files:[file], title:"ProduktWahr Favoriten"}).catch(function(){});
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
      catch(e){
        wzAlert('Diese Datei konnte nicht gelesen werden. Bitte eine Datei auswählen, die zuvor über "Sichern" in ProduktWahr erzeugt wurde.');
        return;
      }
      var newFavs = Array.isArray(payload.favorites) ? payload.favorites : [];
      if(!newFavs.length){
        wzAlert("In dieser Datei wurden keine gültigen Favoriten gefunden.");
        return;
      }
      var addToExisting = await wzConfirm(
        "Gefunden: " + newFavs.length + " Favoriten.\n\n" +
        "OK = zu bestehenden Favoriten hinzufügen\nAbbrechen = bestehende Favoriten ersetzen",
        { okLabel: "Hinzufügen", cancelLabel: "Ersetzen" }
      );
      var curFavs = readList(FAV_KEY);
      var mergedFavs;
      if(addToExisting){
        var favIds = {}; curFavs.forEach(function(f){ favIds[f.id] = true; });
        mergedFavs = curFavs.concat(newFavs.filter(function(f){ return f && !favIds[f.id]; }));
      } else {
        mergedFavs = newFavs;
      }
      writeList(FAV_KEY, mergedFavs);
      renderFavorites();
      wzToast("Import abgeschlossen.");
    };
    reader.onerror = function(){ wzAlert("Die Datei konnte nicht gelesen werden."); };
    reader.readAsText(file);
  }
  document.getElementById("btnExportBackup").addEventListener("click", pwExportBackup);
  document.getElementById("btnImportBackup").addEventListener("click", function(){
    document.getElementById("importBackupFile").click();
  });
  document.getElementById("importBackupFile").addEventListener("change", function(e){
    var file = e.target.files && e.target.files[0];
    if(file) pwImportBackupFile(file);
    e.target.value = "";
  });

  // ---------- Einführung (einheitlich über wz-onboarding.js) ----------
  var onb = wzOnboarding({
    key: "sw_onboarded",
    slides: [
      {icon:"search", title:"Willkommen bei ProduktWahr", text:"Ein Scan für alles: Zusatzstoffe (E-Nummern), Kosmetik-Inhaltsstoffe (INCI) und Barcode-Produkte – jeder Treffer zeigt, aus welcher Datenbank er stammt."},
      {icon:"traffic-light", title:"Die Ampel auf einen Blick", html:
        '<div class="wz-onb-row">'+wzIcon("dot","wzi-green")+'<span><b>Unbedenklich</b></span></div>'+
        '<div class="wz-onb-row">'+wzIcon("dot","wzi-yellow")+'<span><b>Hinweis</b>, z. B. Allergen</span></div>'+
        '<div class="wz-onb-row">'+wzIcon("dot","wzi-red")+'<span><b>Achtung</b>, z. B. Mikroplastik oder eingeschränkter Zusatzstoff</span></div>'},
      {icon:"camera", title:"Einfach live scannen", text:"Halte die Kamera auf die Zutatenliste oder den Barcode – die Erkennung läuft automatisch. Barcodes werden bei Open Food, Beauty bzw. Products Facts abgefragt; Foto- und Textprüfung bleiben 100% lokal."},
      {icon:"chart", title:"Details & Scores", text:"Tippe auf ein Ergebnis für die volle Auswertung – bei Barcode-Produkten inkl. Nährwerten, Nutri-Score, NOVA-Gruppe und Öko-Score. Mit dem Umschalter oben prüfst du bei Bedarf gezielt nur Lebensmittel oder Kosmetik."}
    ]
  });
  document.getElementById("btnShowOnboarding").addEventListener("click", function(e){ e.preventDefault(); onb.show(); });

  document.getElementById("btnCheckManual").addEventListener("click", function(){
    var text = document.getElementById("manualInput").value;
    if(!text.trim()) return;
    runCheck(text);
  });
  document.getElementById("btnBack").addEventListener("click", showHome);
  document.getElementById("btnShareAll").addEventListener("click", function(){
    if(lastResult.treffer.length === 0){ shareText("ProduktWahr: Keine der geprüften Kategorien gefunden."); return; }
    var lines = lastResult.treffer.map(function(m){ return "- " + m.name + " (" + m.quelleLabel + ", " + badgeText(m.g) + ")"; });
    shareText("ProduktWahr-Ergebnis:\n" + lines.join("\n"));
  });

  // ---------- Signalton ----------
  var audioCtx = null;
  function ensureAudio(){
    try{
      if(!audioCtx){ var AC = window.AudioContext || window.webkitAudioContext; audioCtx = new AC(); }
      if(audioCtx.state === "suspended") audioCtx.resume();
    }catch(e){}
  }
  function playBeep(freq, duration){
    if(!audioCtx) return;
    try{
      var osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
      osc.type = "sine"; osc.frequency.value = freq || 880;
      var t0 = audioCtx.currentTime, d = duration || 0.1;
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.25, t0 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
      osc.connect(gain); gain.connect(audioCtx.destination);
      osc.start(); osc.stop(t0 + d + 0.02);
    }catch(e){}
  }

  // ---------- Foto-/Etikett-Scanner (OCR, 100% lokal) ----------
  var stream = null;
  var video = document.getElementById("video");
  var canvas = document.getElementById("canvas");

  var loadTesseract = wzLoadTesseract;
  function openScanner(){
    ensureAudio();
    document.getElementById("manualInput").value = "";
    hideAllScreens();
    scannerViewEl.classList.remove("hidden");
    navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"environment"}, width:{ideal:1280}, height:{ideal:720}}})
      .then(function(s){ stream = s; video.srcObject = s; })
      .catch(function(){ wzAlert("Kein Kamerazugriff möglich. Du kannst die Zutatenliste stattdessen manuell eingeben."); showHome(); });
  }
  function stopCamera(){ if(stream){ stream.getTracks().forEach(function(t){ t.stop(); }); stream = null; } }

  document.getElementById("btnScan").addEventListener("click", openScanner);
  document.getElementById("btnCloseScanner").addEventListener("click", showHome);
  document.getElementById("btnManualInsteadInScanner").addEventListener("click", function(){ showHome(); document.getElementById("manualInput").focus(); });

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
    playBeep(1200, 0.08);
    var dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    scannerViewEl.classList.add("hidden");
    loadingOverlay.classList.remove("hidden");
    loadingText.textContent = "Texterkennung läuft ...";
    loadTesseract().then(function(){ return Tesseract.recognize(dataUrl, "deu+eng"); })
      .then(function(result){
        loadingOverlay.classList.add("hidden");
        var text = result.data.text || "";
        document.getElementById("manualInput").value = text.trim();
        showHome();
        if(text.trim()) runCheck(text);
      }).catch(function(err){
        loadingOverlay.classList.add("hidden"); showHome();
        wzAlert("Texterkennung fehlgeschlagen. Bitte versuche es erneut oder gib die Liste manuell ein.");
        console.error(err);
      });
  });

  // ---------- Live-Text-Scan (fortlaufende Erkennung, kein Auslöser nötig) ----------
  var liveTextStream = null;
  var liveTextVideo = document.getElementById("liveTextVideo");
  var liveTextWorker = null, liveTextTimer = null, liveTextBusy = false;
  var lastLiveText = "", lastLiveSignature = "";

  function setLiveTextStatus(text){
    var el = document.getElementById("liveTextStatus");
    if(el) el.innerHTML = text;
  }
  function openLiveTextScan(){
    ensureAudio();
    hideAllScreens();
    document.getElementById("liveTextCard").classList.remove("visible");
    setLiveTextStatus("Kamera wird gestartet …");
    liveTextViewEl.classList.remove("hidden");
    navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"environment"}, width:{ideal:1280}, height:{ideal:720}}})
      .then(function(s){
        liveTextStream = s; liveTextVideo.srcObject = s;
        setLiveTextStatus("Texterkennung wird geladen …");
        return loadTesseract().then(function(){
          if(window.__pwLiveWorker) return window.__pwLiveWorker;
          return Tesseract.createWorker(["deu","eng"]).then(function(w){ window.__pwLiveWorker = w; return w; });
        });
      })
      .then(function(worker){
        liveTextWorker = worker;
        setLiveTextStatus("Zutatenliste ins Bild halten …");
        if(liveTextTimer) clearInterval(liveTextTimer);
        liveTextTimer = setInterval(runLiveTextPass, 2200);
      })
      .catch(function(){
        wzAlert("Live-Texterkennung konnte nicht gestartet werden. Nutze stattdessen \"Zutaten/ Inhaltsstoffe scannen\".");
        showHome();
      });
  }
  function stopLiveTextScan(){
    if(liveTextTimer){ clearInterval(liveTextTimer); liveTextTimer = null; }
    if(liveTextStream){ liveTextStream.getTracks().forEach(function(t){ t.stop(); }); liveTextStream = null; }
    liveTextBusy = false;
    lastLiveSignature = "";
    var card = document.getElementById("liveTextCard");
    if(card) card.classList.remove("visible");
  }
  function captureLiveTextFrame(){
    if(!liveTextVideo.videoWidth) return null;
    var vw = liveTextVideo.videoWidth, vh = liveTextVideo.videoHeight;
    var cw = liveTextVideo.clientWidth, ch = liveTextVideo.clientHeight;
    var scale = Math.max(cw / vw, ch / vh);
    var offsetX = (vw * scale - cw) / 2, offsetY = (vh * scale - ch) / 2;
    var frameLeft = cw * 0.08, frameTop = ch * 0.32, frameW = cw * 0.84, frameH = ch * 0.36;
    var sx = (frameLeft + offsetX) / scale, sy = (frameTop + offsetY) / scale;
    var sw = frameW / scale, sh = frameH / scale;
    var c = document.createElement("canvas");
    c.width = sw; c.height = sh;
    c.getContext("2d").drawImage(liveTextVideo, sx, sy, sw, sh, 0, 0, sw, sh);
    return c.toDataURL("image/jpeg", 0.85);
  }
  function runLiveTextPass(){
    if(liveTextBusy || !liveTextWorker) return;
    var dataUrl = captureLiveTextFrame();
    if(!dataUrl) return;
    liveTextBusy = true;
    setLiveTextStatus(wzIcon("search") + " Analysiere …");
    liveTextWorker.recognize(dataUrl).then(function(result){
      liveTextBusy = false;
      var text = ((result.data && result.data.text) || "").trim();
      if(text.length < 4){
        // Kein ausreichender Text im aktuellen Bildausschnitt erkannt — das ist
        // normal (z. B. kurzer Wackler, Kamera kurz woanders). Das zuletzt
        // angezeigte Popup bleibt bewusst stehen (analog zum Barcode-Live-Scan)
        // und wird nur bei einem neuen, abweichenden Treffer aktualisiert.
        setLiveTextStatus("Zutatenliste ins Bild halten …");
        return;
      }
      var res = SW_pruefeText(text, aktuellerModus);
      if(res.treffer.length === 0){
        setLiveTextStatus(lastLiveSignature ? "Zutatenliste ins Bild halten …" : "Kein bekannter Stoff erkannt – Bereich anpassen");
        return;
      }
      lastLiveText = text;
      setLiveTextStatus("Zutatenliste ins Bild halten …");
      var signature = res.treffer.map(function(t){ return t.id; }).sort().join(",");
      if(signature !== lastLiveSignature){
        lastLiveSignature = signature;
        playBeep(1100, 0.08);
        showLiveTextOverlay(res);
      }
    }).catch(function(){
      liveTextBusy = false;
      setLiveTextStatus("Erkennung fehlgeschlagen, versuche es weiter …");
    });
  }
  function showLiveTextOverlay(res){
    var worst = res.treffer.some(function(t){return t.g==="rot";}) ? "rot" : res.treffer.some(function(t){return t.g==="gelb";}) ? "gelb" : "gruen";
    var zusatz = res.treffer.filter(function(t){ return t.quelle === "zusatzstoff"; }).length;
    var kosmetik = res.treffer.filter(function(t){ return t.quelle === "kosmetik"; }).length;
    document.getElementById("liveTextAmpel").className = "overlay-ampel " + (worst==="rot"?"red":worst==="gelb"?"amber":"green");
    document.getElementById("liveTextName").textContent = res.treffer.length + " Treffer erkannt";
    document.getElementById("liveTextMeta").innerHTML = wzIcon("obst") + " " + zusatz + " Zusatzstoff(e) · " + wzIcon("lipstick") + " " + kosmetik + " Kosmetik-Inhaltsstoff(e)";
    document.getElementById("liveTextCard").classList.add("visible");
  }
  document.getElementById("liveTextExpand").addEventListener("click", function(){
    if(!lastLiveText) return;
    stopLiveTextScan();
    runCheck(lastLiveText);
  });
  document.getElementById("btnLiveTextScan").addEventListener("click", openLiveTextScan);
  document.getElementById("btnCloseLiveTextScan").addEventListener("click", showHome);
  document.getElementById("btnLiveTextTorch").addEventListener("click", function(){
    if(!liveTextStream) return;
    var track = liveTextStream.getVideoTracks()[0];
    var caps = track.getCapabilities ? track.getCapabilities() : {};
    if(caps.torch){
      var aktuell = track.getSettings().torch || false;
      track.applyConstraints({advanced:[{torch: !aktuell}]}).catch(function(){});
    }
  });

  // ---------- Bild-/Datei-Upload (gleiche OCR wie Kamera) ----------
  document.getElementById("btnUpload").addEventListener("click", function(){ document.getElementById("uploadInput").click(); });
  document.getElementById("uploadInput").addEventListener("change", function(e){
    var file = e.target.files && e.target.files[0];
    e.target.value = "";
    if(!file) return;
    var reader = new FileReader();
    reader.onload = function(){
      var dataUrl = reader.result;
      loadingOverlay.classList.remove("hidden");
      loadingText.textContent = "Texterkennung läuft ...";
      loadTesseract().then(function(){ return Tesseract.recognize(dataUrl, "deu+eng"); })
        .then(function(result){
          loadingOverlay.classList.add("hidden");
          var text = result.data.text || "";
          document.getElementById("manualInput").value = text.trim();
          showHome();
          if(text.trim()) runCheck(text);
        }).catch(function(err){
          loadingOverlay.classList.add("hidden"); showHome();
          wzAlert("Texterkennung fehlgeschlagen. Bitte versuche es erneut oder gib die Liste manuell ein.");
          console.error(err);
        });
    };
    reader.readAsDataURL(file);
  });

  // ---------- Profil (Allergien/Unverträglichkeiten) ----------
  var PROFIL_KEY = "sw_profil";
  var PROFIL_OPTIONEN = [
    { id:"gluten", label:"Gluten", tag:"gluten", allergName:"Glutenhaltiges Getreide" },
    { id:"krebstiere", label:"Krebstiere", tag:"crustaceans", allergName:"Krebstiere" },
    { id:"eier", label:"Eier", tag:"eggs", allergName:"Eier" },
    { id:"fisch", label:"Fisch", tag:"fish", allergName:"Fisch" },
    { id:"erdnuesse", label:"Erdnüsse", tag:"peanuts", allergName:"Erdnüsse" },
    { id:"soja", label:"Soja", tag:"soybeans", allergName:"Soja" },
    { id:"milch", label:"Milch/Laktose", tag:"milk", allergName:"Milch (Laktose)" },
    { id:"schalenfruechte", label:"Schalenfrüchte (Nüsse)", tag:"nuts", allergName:"Schalenfrüchte (Nüsse)" },
    { id:"sellerie", label:"Sellerie", tag:"celery", allergName:"Sellerie" },
    { id:"senf", label:"Senf", tag:"mustard", allergName:"Senf" },
    { id:"sesam", label:"Sesam", tag:"sesame-seeds", allergName:"Sesam" },
    { id:"sulfite", label:"Sulfite/Schwefeldioxid", tag:"sulphur-dioxide-and-sulphites", allergName:"Schwefeldioxid/Sulfite" },
    { id:"lupinen", label:"Lupinen", tag:"lupin", allergName:"Lupinen" },
    { id:"weichtiere", label:"Weichtiere", tag:"molluscs", allergName:"Weichtiere" }
  ];
  function ladeProfil(){ try{ return JSON.parse(localStorage.getItem(PROFIL_KEY)) || {}; }catch(e){ return {}; } }
  function speichereProfil(p){ try{ localStorage.setItem(PROFIL_KEY, JSON.stringify(p)); }catch(e){} }
  function renderProfil(){
    var profil = ladeProfil();
    var el = document.getElementById("profilListe");
    el.innerHTML = PROFIL_OPTIONEN.map(function(o){
      return '<div class="profil-item"><span>'+o.label+'</span><button class="profil-switch '+(profil[o.id]?"on":"")+'" data-id="'+o.id+'"></button></div>';
    }).join("");
    el.querySelectorAll(".profil-switch").forEach(function(btn){
      btn.addEventListener("click", function(){
        var p = ladeProfil();
        p[btn.dataset.id] = !p[btn.dataset.id];
        speichereProfil(p);
        btn.classList.toggle("on", p[btn.dataset.id]);
      });
    });
  }
  function pruefeProfilTreffer_OFF(produktRoh){
    var profil = ladeProfil();
    var aktive = PROFIL_OPTIONEN.filter(function(o){ return profil[o.id]; });
    if(aktive.length === 0 || !produktRoh) return [];
    var tagsText = ([].concat(produktRoh.allergens_tags||[], produktRoh.traces_tags||[])).join(" ").toLowerCase();
    return aktive.filter(function(o){ return tagsText.indexOf(o.tag) !== -1; }).map(function(o){ return o.label; });
  }
  function pruefeProfilTreffer_Text(allergeneNamen){
    var profil = ladeProfil();
    var aktive = PROFIL_OPTIONEN.filter(function(o){ return profil[o.id]; }).map(function(o){ return o.allergName; });
    return (allergeneNamen||[]).filter(function(a){ return aktive.indexOf(a) !== -1; });
  }
  document.getElementById("btnOpenProfil").addEventListener("click", showProfil);
  document.getElementById("btnCloseProfil").addEventListener("click", showHome);

  // ---------- Barcode-Live-Scan (BlickWahr-Prinzip) ----------
  var liveVideo = document.getElementById("liveVideo");
  var codeReader = null;
  var letzterCode = null;
  var aktuellOffenerEintragCode = null;
  var aktiverScanTimeout = null;
  var warenkorbAktiv = false;
  var warenkorb = [];
  var CACHE_KEY = "sw_barcode_cache";
  function ladeCache(){ try{ return JSON.parse(localStorage.getItem(CACHE_KEY)) || {}; }catch(e){ return {}; } }
  function speichereCache(c){ try{ localStorage.setItem(CACHE_KEY, JSON.stringify(c)); }catch(e){} }

  function loadZXing(){
    return new Promise(function(resolve, reject){
      if(window.ZXing){ resolve(); return; }
      var s = document.createElement("script");
      s.src = "./lib-zxing-0.21.3.min.js";
      s.onload = resolve; s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  function openLiveScan(){
    ensureAudio();
    hideAllScreens();
    liveScanViewEl.classList.remove("hidden");
    document.getElementById("overlayCard").classList.remove("visible");
    document.getElementById("liveHint").style.display = "block";
    letzterCode = null;
    loadZXing().then(function(){
      codeReader = new ZXing.BrowserMultiFormatReader();
      codeReader.decodeFromConstraints({video:{facingMode:{ideal:"environment"}}}, liveVideo, function(result){
        if(result) behandleErkennung(result.getText());
      }).catch(function(){
        document.getElementById("liveHint").textContent = "Kamerazugriff nicht möglich. Bitte Berechtigung erlauben.";
      });
    }).catch(function(){
      document.getElementById("liveHint").textContent = "Scanner konnte nicht geladen werden.";
    });
  }
  function stopLiveScan(){
    if(codeReader){ try{ codeReader.reset(); }catch(e){} codeReader = null; }
    clearTimeout(aktiverScanTimeout);
    // Beim Verlassen der Live-Scan-Ansicht ("das Fenster geschlossen wird") die
    // große Detailansicht ebenfalls schließen, damit sie beim nächsten Öffnen
    // nicht mit veralteten Daten des zuletzt gescannten Produkts erscheint.
    document.getElementById("overlayDetail").classList.remove("open");
    aktuellOffenerEintragCode = null;
  }
  document.getElementById("btnBarcodeScan").addEventListener("click", openLiveScan);
  document.getElementById("btnCloseLiveScan").addEventListener("click", showHome);

  function behandleErkennung(code){
    if(code === letzterCode) return;
    letzterCode = code;
    playBeep(880, 0.09);
    document.getElementById("liveHint").style.display = "none";

    // Ist die große Detailansicht gerade für ein ANDERES Produkt offen, wird sie
    // bei einem neuen Scan automatisch geschlossen – sonst würde sie mit veralteten
    // Daten des vorherigen Produkts stehen bleiben.
    var detailEl = document.getElementById("overlayDetail");
    if(detailEl.classList.contains("open") && aktuellOffenerEintragCode !== code){
      detailEl.classList.remove("open");
      aktuellOffenerEintragCode = null;
    }

    var cache = ladeCache();
    if(cache[code]){ zeigeOverlay(cache[code]); if(cache[code].gefunden) wennWarenkorbAktivHinzufuegen(cache[code]); }
    else { zeigeLadeZustand(); holeProdukt(code); }

    clearTimeout(aktiverScanTimeout);
    aktiverScanTimeout = setTimeout(function(){ letzterCode = null; }, 4000);
  }

  function holeProdukt(code){
    if(!navigator.onLine){
      zeigeOverlay({code:code, name:"Offline", ampel:null, meta:"Kein Internet — Produkt nicht im lokalen Speicher", gefunden:false});
      return;
    }
    fetch("https://world.openfoodfacts.org/api/v2/product/" + encodeURIComponent(code) + ".json")
      .then(function(r){ return r.json(); })
      .then(function(data){
        if(data && data.status === 1 && data.product){
          verarbeiteProdukt(code, data.product, "openfoodfacts", "https://de.openfoodfacts.org/product/" + encodeURIComponent(code));
        } else {
          // Nicht bei Open Food Facts gefunden — Open Beauty Facts als Kosmetik-Fallback versuchen
          fetch("https://world.openbeautyfacts.org/api/v2/product/" + encodeURIComponent(code) + ".json")
            .then(function(r2){ return r2.json(); })
            .then(function(data2){
              if(data2 && data2.status === 1 && data2.product){
                verarbeiteProdukt(code, data2.product, "openbeautyfacts", "https://de.openbeautyfacts.org/product/" + encodeURIComponent(code));
              } else {
                // Auch nicht bei Open Beauty Facts — Open Products Facts als dritter
                // Fallback für sonstige Produkte (Haushalt, Elektronik, Spielzeug u. a.).
                // Hinweis: Open Products Facts liefert bei "nicht gefunden" HTTP 404
                // statt 200 (anders als OFF/OBF) — der Statuscode wird hier bewusst
                // ignoriert und stattdessen wie bei den anderen beiden nur das Feld
                // "status" im JSON-Body ausgewertet, das ist bei allen drei Diensten
                // gleich aufgebaut.
                fetch("https://world.openproductsfacts.org/api/v2/product/" + encodeURIComponent(code) + ".json")
                  .then(function(r3){ return r3.json(); })
                  .then(function(data3){
                    if(data3 && data3.status === 1 && data3.product){
                      verarbeiteProdukt(code, data3.product, "openproductsfacts", "https://world.openproductsfacts.org/product/" + encodeURIComponent(code));
                    } else {
                      var eintrag = {code:code, name:"Nicht in der Datenbank", ampel:null, meta:"Weder bei Open Food Facts noch bei Open Beauty Facts oder Open Products Facts erfasst", gefunden:false};
                      var c = ladeCache(); c[code] = eintrag; speichereCache(c);
                      zeigeOverlay(eintrag);
                    }
                  }).catch(function(){ zeigeOverlay({code:code, name:"Server nicht erreichbar", ampel:null, meta:"Datenbanken antworten gerade nicht — später erneut versuchen", gefunden:false}); });
              }
            }).catch(function(){ zeigeOverlay({code:code, name:"Server nicht erreichbar", ampel:null, meta:"Datenbanken antworten gerade nicht — später erneut versuchen", gefunden:false}); });
        }
      }).catch(function(){ zeigeOverlay({code:code, name:"Server nicht erreichbar", ampel:null, meta:"Open Food Facts antwortet gerade nicht — später erneut versuchen", gefunden:false}); });
  }

  function verarbeiteProdukt(code, p, quelle, url){
    var zutatenText = p.ingredients_text_de || p.ingredients_text || p.ingredients_text_en || "";
    // Die Produktquelle (OFF/OBF/OPF) verrät bereits die Produktart – deshalb hier
    // gezielt nur die passende Datenbank prüfen, das schließt Fehltreffer aus.
    // Open Products Facts (sonstige Produkte) wird bewusst gegen KEINE der beiden
    // Stoff-Datenbanken geprüft, da weder E-Nummern- noch INCI-Liste dafür gedacht sind.
    var barcodeModus = quelle === "openfoodfacts" ? "lebensmittel" : quelle === "openbeautyfacts" ? "kosmetik" : null;
    var textCheck = (zutatenText && barcodeModus) ? SW_pruefeText(zutatenText, barcodeModus) : {treffer:[], allergene:[]};
    var profilTrefferOFF = quelle === "openfoodfacts" ? pruefeProfilTreffer_OFF(p) : [];
    var profilTrefferText = pruefeProfilTreffer_Text(textCheck.allergene);
    var alleWarnungen = Array.from(new Set(profilTrefferOFF.concat(profilTrefferText)));
    var schlechtesterFund = textCheck.treffer.some(function(t){return t.g==="rot";}) ? "red" : textCheck.treffer.some(function(t){return t.g==="gelb";}) ? "amber" : null;

    var eintrag = {
      code: code,
      name: p.product_name || (quelle === "openfoodfacts" ? "Unbekanntes Lebensmittel" : quelle === "openbeautyfacts" ? "Unbekanntes Kosmetikprodukt" : "Unbekanntes Produkt"),
      ampel: alleWarnungen.length ? "red" : (schlechtesterFund || nutriscoreZuAmpel(p.nutriscore_grade)),
      meta: metaText(p, quelle),
      warnung: alleWarnungen.length ? "Enthält: " + alleWarnungen.join(", ") : null,
      zucker: p.nutriments ? p.nutriments.sugars_100g : null,
      zutaten: zutatenText || null,
      stoffTreffer: textCheck.treffer,
      quelle: quelle,
      url: url,
      brands: p.brands || null,
      gefunden: true,
      // Nährwerte/Scores stammen aus derselben Open-Food-Facts-Antwort wie die
      // übrigen Produktdaten – kein zusätzlicher API-Aufruf nötig.
      nutriscoreGrade: p.nutriscore_grade || null,
      novaGroup: p.nova_group || null,
      ecoscoreGrade: p.ecoscore_grade || null,
      nutriments: (quelle === "openfoodfacts" && p.nutriments) ? p.nutriments : null,
      servingSize: p.serving_size || null
    };
    var cache = ladeCache(); cache[code] = eintrag; speichereCache(cache);
    wennWarenkorbAktivHinzufuegen(eintrag);
    zeigeOverlay(eintrag);
  }

  function nutriscoreZuAmpel(grade){
    if(!grade) return null;
    if(["a","b"].indexOf(grade) !== -1) return "green";
    if(grade === "c") return "amber";
    if(["d","e"].indexOf(grade) !== -1) return "red";
    return null;
  }
  function quelleName(quelle){
    return quelle === "openfoodfacts" ? "Open Food Facts" : quelle === "openbeautyfacts" ? "Open Beauty Facts" : "Open Products Facts";
  }
  function metaText(p, quelle){
    var teile = [];
    teile.push(quelle === "openfoodfacts" ? "Lebensmittel-Datenbank" : quelle === "openbeautyfacts" ? "Kosmetik-Datenbank" : "Produkt-Datenbank (sonstige Produkte)");
    if(p.nutriscore_grade) teile.push("Nutri-Score " + p.nutriscore_grade.toUpperCase());
    if(p.nutriments && p.nutriments.sugars_100g != null) teile.push(p.nutriments.sugars_100g + " g Zucker/100g");
    return teile.join(" · ");
  }
  function ampelFarbeCss(ampel){
    return ampel === "green" ? "green" : ampel === "amber" ? "amber" : ampel === "red" ? "red" : "";
  }

  // ---------- Nährwerte, Nutri-Score, NOVA-Gruppe, Öko-Score (aus OFF-Antwort) ----------
  var NAEHRWERT_ROWS = [
    {key:"energy-kcal", label:"Energie", unit:"kcal"},
    {key:"fat", label:"Fett", unit:"g"},
    {key:"saturated-fat", label:"davon gesättigte Fettsäuren", unit:"g"},
    {key:"carbohydrates", label:"Kohlenhydrate", unit:"g"},
    {key:"sugars", label:"davon Zucker", unit:"g"},
    {key:"fiber", label:"Ballaststoffe", unit:"g"},
    {key:"proteins", label:"Eiweiß", unit:"g"},
    {key:"salt", label:"Salz", unit:"g"}
  ];
  function naehrwert(nutriments, key, basis){
    if(!nutriments) return null;
    var val = nutriments[key + (basis === "serving" ? "_serving" : "_100g")];
    if(val == null || val === "") return null;
    var num = Number(val);
    if(isNaN(num)) return null;
    return Math.round(num * 10) / 10;
  }
  var naehrwertBasis = "100g";
  function baueScoreBadges(eintrag){
    var teile = [];
    if(eintrag.nutriscoreGrade){
      var g = String(eintrag.nutriscoreGrade).toLowerCase();
      teile.push('<span class="score-badge score-nutri-'+g+'">Nutri-Score '+g.toUpperCase()+'</span>');
    }
    if(eintrag.novaGroup){
      teile.push('<span class="score-badge score-nova">NOVA-Gruppe '+escapeHtml(String(eintrag.novaGroup))+'</span>');
    }
    if(eintrag.ecoscoreGrade){
      var eg = String(eintrag.ecoscoreGrade).toLowerCase();
      teile.push('<span class="score-badge score-eco-'+eg+'">Öko-Score '+eg.toUpperCase()+'</span>');
    }
    return teile.length ? '<div class="score-row">'+teile.join("")+'</div>' : "";
  }
  function baueNaehrwertTabelle(eintrag){
    if(!eintrag.nutriments) return "";
    var hatPortion = !!eintrag.servingSize;
    var rows = NAEHRWERT_ROWS.map(function(r){
      var v100 = naehrwert(eintrag.nutriments, r.key, "100g");
      var vServ = hatPortion ? naehrwert(eintrag.nutriments, r.key, "serving") : null;
      var wert = (naehrwertBasis === "serving" && vServ != null) ? vServ : v100;
      if(wert == null) return "";
      return '<div class="naehr-row"><span>'+r.label+'</span><strong>'+wert+' '+r.unit+'</strong></div>';
    }).join("");
    if(!rows) return "";
    var toggle = hatPortion ? ' <button class="share-btn" id="btnNaehrToggle">' +
      (naehrwertBasis === "serving" ? "pro 100 g anzeigen" : "pro Portion (" + escapeHtml(eintrag.servingSize) + ") anzeigen") +
      '</button>' : "";
    return '<h3 style="font-size:14px;margin-top:18px"><svg class="wzi" aria-hidden="true"><use href="#wzi-chart"></use></svg> Nährwerte' + toggle + '</h3>' +
      '<div class="naehr-table">' + rows + '</div>' +
      '<p style="font-size: 12.5px;color:var(--sub);margin-top:6px">Nährwerte, Nutri-Score, NOVA-Gruppe und Öko-Score stammen aus den bei Open Food Facts hinterlegten Herstellerangaben bzw. deren automatischer Berechnung – ohne Gewähr auf Vollständigkeit oder Aktualität, keine amtliche Kennzeichnung und kein Ersatz für das Etikett auf der Verpackung.</p>';
  }

  function zeigeLadeZustand(){
    var card = document.getElementById("overlayCard");
    document.getElementById("overlayAmpel").className = "overlay-ampel";
    document.getElementById("overlayName").textContent = "Wird geladen …";
    document.getElementById("overlayMeta").textContent = "";
    card.classList.add("visible");
  }
  function zeigeOverlay(eintrag){
    var card = document.getElementById("overlayCard");
    document.getElementById("overlayAmpel").className = "overlay-ampel " + ampelFarbeCss(eintrag.ampel);
    document.getElementById("overlayName").textContent = eintrag.name;
    var metaEl = document.getElementById("overlayMeta");
    metaEl.innerHTML = escapeHtml(eintrag.meta || "") + (eintrag.warnung ? '<span class="overlay-warntext"><svg class="wzi" aria-hidden="true"><use href="#wzi-warning"></use></svg> '+escapeHtml(eintrag.warnung)+'</span>' : "");
    card.classList.toggle("warnung", !!eintrag.warnung);
    card.classList.add("visible");
    document.getElementById("overlayExpand").onclick = function(){ zeigeDetail(eintrag); };
  }
  function zeigeDetail(eintrag){
    aktuellOffenerEintragCode = eintrag.code;
    var el = document.getElementById("detailContent");
    var hatStoffe = (eintrag.stoffTreffer || []).length > 0;
    el.innerHTML =
      '<h2 style="margin-top:0;margin-bottom:10px">'+escapeHtml(eintrag.name)+'</h2>' +
      (eintrag.gefunden && eintrag.url ?
        '<a class="share-btn" href="'+eintrag.url+'" target="_blank" rel="noopener noreferrer" style="text-decoration:none;display:inline-block;margin-bottom:4px"><svg class="wzi" aria-hidden="true"><use href="#wzi-link"></use></svg> Vollständige Produktseite bei '+quelleName(eintrag.quelle)+' ansehen</a>' +
        '<p style="font-size: 12.5px;color:var(--sub);margin:6px 2px 14px">Öffnet in neuem Tab und verlässt die App – dort gelten die Datenschutzbestimmungen von '+quelleName(eintrag.quelle)+'.</p>'
      : '') +
      (eintrag.warnung ? '<p style="color:#DC2626;font-weight:700"><svg class="wzi" aria-hidden="true"><use href="#wzi-warning"></use></svg> '+escapeHtml(eintrag.warnung)+'</p>' : '') +
      '<p style="color:var(--sub)">'+escapeHtml(eintrag.meta||'')+'</p>' +
      baueScoreBadges(eintrag) +
      (hatStoffe ? '<h3 style="font-size:14px">Erkannte Stoffe in der Zutatenliste</h3><div id="detailStoffeList"></div>' : '') +
      baueNaehrwertTabelle(eintrag) +
      (eintrag.zutaten ? '<p style="margin-top:14px"><strong>Zutaten:</strong><br>'+escapeHtml(eintrag.zutaten)+'</p>' : (eintrag.gefunden ? '<p>Keine Zutatenliste verfügbar.</p>' : '')) +
      (eintrag.gefunden ?
        '<p style="font-size: 13.5px;color:var(--sub);margin-top:20px">Nur Information – keine medizinische Beratung.<br>Quelle: '+quelleName(eintrag.quelle)+' (ODbL-Lizenz)</p>'
      : '<p style="font-size: 13.5px;color:var(--sub);margin-top:20px">Nur Information – keine medizinische Beratung.</p>');
    // Erkannte Stoffe wie beim Foto-/Textscan als voll aufklappbare Liste mit
    // Detailtext, Hinweis, Quellenangabe, Stern (Favorit) und Teilen-Button –
    // dieselbe Komponente wie renderResults(), statt einer flachen Übersicht.
    if(hatStoffe){
      var stoffeList = document.getElementById("detailStoffeList");
      var zusatzstoffe = eintrag.stoffTreffer.filter(function(t){ return t.quelle === "zusatzstoff"; });
      var kosmetik = eintrag.stoffTreffer.filter(function(t){ return t.quelle === "kosmetik"; });
      renderResultGroup(stoffeList, zusatzstoffe, "Zusatzstoffe", "obst");
      renderResultGroup(stoffeList, kosmetik, "Kosmetik-Inhaltsstoffe", "lipstick");
      wireItemInteractions(stoffeList, eintrag.stoffTreffer);
    }
    var naehrToggle = document.getElementById("btnNaehrToggle");
    if(naehrToggle){
      naehrToggle.addEventListener("click", function(){
        naehrwertBasis = naehrwertBasis === "serving" ? "100g" : "serving";
        zeigeDetail(eintrag);
      });
    }
    document.getElementById("overlayDetail").classList.add("open");
  }
  document.getElementById("detailClose").addEventListener("click", function(){ document.getElementById("overlayDetail").classList.remove("open"); aktuellOffenerEintragCode = null; });

  document.getElementById("korbToggle").addEventListener("click", function(){
    warenkorbAktiv = !warenkorbAktiv;
    if(warenkorbAktiv) warenkorb = [];
    this.classList.toggle("active", warenkorbAktiv);
    document.getElementById("korbToggleLabel").textContent = warenkorbAktiv ? "Warenkorb läuft" : "Warenkorb-Modus";
    document.getElementById("korbCount").hidden = !warenkorbAktiv;
    document.getElementById("korbFertig").classList.toggle("hidden", !warenkorbAktiv);
    aktualisiereKorbZaehler();
  });
  function wennWarenkorbAktivHinzufuegen(eintrag){
    if(!warenkorbAktiv || !eintrag.gefunden) return;
    if(warenkorb.some(function(e){ return e.code === eintrag.code; })) return;
    warenkorb.push(eintrag);
    aktualisiereKorbZaehler();
  }
  function aktualisiereKorbZaehler(){
    document.getElementById("korbCount").textContent = warenkorb.length;
    document.getElementById("korbFertigCount").textContent = warenkorb.length;
  }
  document.getElementById("korbFertig").addEventListener("click", function(){
    var gruen = warenkorb.filter(function(e){return e.ampel==="green";}).length;
    var gelb = warenkorb.filter(function(e){return e.ampel==="amber";}).length;
    var rot = warenkorb.filter(function(e){return e.ampel==="red";}).length;
    var zuckerGesamt = warenkorb.reduce(function(sum,e){return sum + (Number(e.zucker)||0);}, 0);
    var warnungen = warenkorb.filter(function(e){return e.warnung;});
    document.getElementById("korbSummaryContent").innerHTML =
      '<h2 style="margin-top:0">Warenkorb-Übersicht</h2>' +
      '<div class="korb-stat-row"><span>Produkte gescannt</span><strong>'+warenkorb.length+'</strong></div>' +
      '<div class="korb-stat-row"><span><svg class="wzi wzi-green" aria-hidden="true"><use href="#wzi-dot"></use></svg> Grün / <svg class="wzi wzi-yellow" aria-hidden="true"><use href="#wzi-dot"></use></svg> Gelb / <svg class="wzi wzi-red" aria-hidden="true"><use href="#wzi-dot"></use></svg> Rot</span><strong>'+gruen+' / '+gelb+' / '+rot+'</strong></div>' +
      '<div class="korb-stat-row"><span>Zucker gesamt (Näherung)</span><strong>'+zuckerGesamt.toFixed(1)+' g</strong></div>' +
      (warnungen.length ? '<div class="legal-box"><strong><svg class="wzi" aria-hidden="true"><use href="#wzi-warning"></use></svg> '+warnungen.length+' Produkt(e) mit Profil-Warnung:</strong><br>'+warnungen.map(function(w){return escapeHtml(w.name);}).join(", ")+'</div>' : '') +
      '<h3>Produkte</h3>' +
      (warenkorb.map(function(e){ return '<div class="korb-produkt-row"><span class="overlay-ampel '+ampelFarbeCss(e.ampel)+'"></span><span>'+escapeHtml(e.name)+'</span></div>'; }).join("") || '<p>Noch keine Produkte im Warenkorb.</p>');
    document.getElementById("korbSummary").classList.add("open");
  });
  document.getElementById("korbSummaryClose").addEventListener("click", function(){ document.getElementById("korbSummary").classList.remove("open"); });

  document.getElementById("btnTorch").addEventListener("click", function(){
    var s = liveVideo.srcObject;
    if(!s) return;
    var track = s.getVideoTracks()[0];
    var caps = track.getCapabilities ? track.getCapabilities() : {};
    if(caps.torch){
      var aktuell = track.getSettings().torch || false;
      track.applyConstraints({advanced:[{torch: !aktuell}]}).catch(function(){});
    }
  });


  // ---------- Übergabe aus dem Scanner der Startseite ----------
  var wzH = window.wzScanHandoff && wzScanHandoff(["barcode", "zutaten"]);
  if(wzH && wzH.text){
    if(wzH.t === "barcode"){ openLiveScan(); behandleErkennung(String(wzH.text)); }
    else runCheck(String(wzH.text));
  }

})();
