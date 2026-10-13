// bp-crop.js — Ausrichtung korrigieren (EXIF) und Beleg manuell zuschneiden

// Lädt eine Bilddatei und liefert ein Canvas mit korrekt ausgerichteten Pixeln
// (behebt das "quer/gedreht"-Problem von Fotos aus der Smartphone-Kamera).
async function loadOrientedCanvas(file) {
  let bitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch (e) {
    // Fallback für ältere Browser ohne Unterstützung dafür
    const dataUrl = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(file);
    });
    bitmap = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = dataUrl;
    });
  }
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  canvas.getContext('2d').drawImage(bitmap, 0, 0);
  return canvas;
}

// Öffnet einen Vollbild-Dialog zum manuellen Zuschneiden des Fotos.
// Gibt ein Promise zurück, das mit der zugeschnittenen Daten-URL aufgelöst wird.
function openCropTool(sourceCanvas) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(var(--wzq-141023, 20, 16, 35),0.92);z-index:1000;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px;box-sizing:border-box;';

    const title = document.createElement('div');
    title.textContent = 'Beleg zuschneiden';
    title.style.cssText = "color:#fff;font-family:ui-rounded,-apple-system,sans-serif;font-weight:700;font-size:16px;margin-bottom:14px;";
    overlay.appendChild(title);

    const hint = document.createElement('div');
    hint.textContent = 'Ecken ziehen, damit nur der Beleg im Rahmen liegt';
    hint.style.cssText = "color:#9DBEBC;font-family:-apple-system,sans-serif;font-size:12px;margin-bottom:14px;text-align:center;";
    overlay.appendChild(hint);

    const stage = document.createElement('div');
    stage.style.cssText = 'position:relative;background:#000;touch-action:none;';
    overlay.appendChild(stage);

    // Anzeigegröße berechnen (an Bildschirm angepasst, Seitenverhältnis erhalten)
    const maxW = Math.min(window.innerWidth - 40, 380);
    const maxH = window.innerHeight - 260;
    let dispW = sourceCanvas.width;
    let dispH = sourceCanvas.height;
    const scale = Math.min(maxW / dispW, maxH / dispH, 1);
    dispW = Math.round(dispW * scale);
    dispH = Math.round(dispH * scale);

    stage.style.width = dispW + 'px';
    stage.style.height = dispH + 'px';

    const img = document.createElement('canvas');
    img.width = dispW;
    img.height = dispH;
    img.style.cssText = 'display:block;width:100%;height:100%;';
    img.getContext('2d').drawImage(sourceCanvas, 0, 0, dispW, dispH);
    stage.appendChild(img);

    // Zuschnitt-Rahmen (10% Rand initial)
    const rect = { x: dispW * 0.08, y: dispH * 0.08, w: dispW * 0.84, h: dispH * 0.84 };
    const rectEl = document.createElement('div');
    rectEl.style.cssText = 'position:absolute;border:2px solid #FF9500;box-shadow:0 0 0 2000px rgba(0,0,0,0.5);box-sizing:border-box;';
    stage.appendChild(rectEl);

    const handles = {};
    ['nw', 'ne', 'sw', 'se'].forEach((pos) => {
      const h = document.createElement('div');
      h.style.cssText = `position:absolute;width:26px;height:26px;background:#FF9500;border:3px solid #fff;border-radius:50%;touch-action:none;`;
      stage.appendChild(h);
      handles[pos] = h;
    });

    function updateRectDOM() {
      rectEl.style.left = rect.x + 'px';
      rectEl.style.top = rect.y + 'px';
      rectEl.style.width = rect.w + 'px';
      rectEl.style.height = rect.h + 'px';
      const hs = 26;
      handles.nw.style.left = (rect.x - hs / 2) + 'px'; handles.nw.style.top = (rect.y - hs / 2) + 'px';
      handles.ne.style.left = (rect.x + rect.w - hs / 2) + 'px'; handles.ne.style.top = (rect.y - hs / 2) + 'px';
      handles.sw.style.left = (rect.x - hs / 2) + 'px'; handles.sw.style.top = (rect.y + rect.h - hs / 2) + 'px';
      handles.se.style.left = (rect.x + rect.w - hs / 2) + 'px'; handles.se.style.top = (rect.y + rect.h - hs / 2) + 'px';
    }
    updateRectDOM();

    const MIN_SIZE = 40;
    function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

    // Rahmen als Ganzes verschieben
    let dragMode = null, startX = 0, startY = 0, startRect = null;
    rectEl.addEventListener('pointerdown', (e) => {
      dragMode = 'move'; startX = e.clientX; startY = e.clientY; startRect = { ...rect };
      rectEl.setPointerCapture(e.pointerId);
    });

    function onMove(e) {
      if (!dragMode) return;
      const dx = e.clientX - startX, dy = e.clientY - startY;
      if (dragMode === 'move') {
        rect.x = clamp(startRect.x + dx, 0, dispW - rect.w);
        rect.y = clamp(startRect.y + dy, 0, dispH - rect.h);
      } else {
        let { x, y, w, h } = startRect;
        if (dragMode === 'nw') { x = clamp(startRect.x + dx, 0, startRect.x + startRect.w - MIN_SIZE); y = clamp(startRect.y + dy, 0, startRect.y + startRect.h - MIN_SIZE); w = startRect.x + startRect.w - x; h = startRect.y + startRect.h - y; }
        if (dragMode === 'ne') { y = clamp(startRect.y + dy, 0, startRect.y + startRect.h - MIN_SIZE); w = clamp(startRect.w + dx, MIN_SIZE, dispW - startRect.x); h = startRect.y + startRect.h - y; }
        if (dragMode === 'sw') { x = clamp(startRect.x + dx, 0, startRect.x + startRect.w - MIN_SIZE); w = startRect.x + startRect.w - x; h = clamp(startRect.h + dy, MIN_SIZE, dispH - startRect.y); }
        if (dragMode === 'se') { w = clamp(startRect.w + dx, MIN_SIZE, dispW - startRect.x); h = clamp(startRect.h + dy, MIN_SIZE, dispH - startRect.y); }
        rect.x = x; rect.y = y; rect.w = w; rect.h = h;
      }
      updateRectDOM();
    }
    function onUp() { dragMode = null; }
    stage.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);

    Object.entries(handles).forEach(([pos, h]) => {
      h.addEventListener('pointerdown', (e) => {
        dragMode = pos; startX = e.clientX; startY = e.clientY; startRect = { ...rect };
        h.setPointerCapture(e.pointerId);
        e.stopPropagation();
      });
    });

    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:10px;margin-top:18px;width:100%;max-width:380px;';
    const btnFull = document.createElement('button');
    btnFull.textContent = 'Ganzes Bild verwenden';
    btnFull.style.cssText = "flex:1;padding:13px;border-radius:14px;border:2px solid #fff;background:transparent;color:#fff;font-family:ui-rounded,-apple-system,sans-serif;font-weight:700;font-size:14px;";
    const btnConfirm = document.createElement('button');
    btnConfirm.textContent = 'Zuschnitt übernehmen';
    btnConfirm.style.cssText = "flex:1;padding:13px;border-radius:14px;border:none;background:linear-gradient(135deg,var(--wzp-5a2fbe, #5A2FBE),var(--wzp-5a2fbe, #5A2FBE));color:#fff;font-family:ui-rounded,-apple-system,sans-serif;font-weight:700;font-size:14px;";
    btnRow.appendChild(btnFull);
    btnRow.appendChild(btnConfirm);
    overlay.appendChild(btnRow);

    function finish(useFull) {
      window.removeEventListener('pointerup', onUp);
      document.body.removeChild(overlay);
      const outCanvas = document.createElement('canvas');
      if (useFull) {
        outCanvas.width = sourceCanvas.width;
        outCanvas.height = sourceCanvas.height;
        outCanvas.getContext('2d').drawImage(sourceCanvas, 0, 0);
      } else {
        const sx = (rect.x / dispW) * sourceCanvas.width;
        const sy = (rect.y / dispH) * sourceCanvas.height;
        const sw = (rect.w / dispW) * sourceCanvas.width;
        const sh = (rect.h / dispH) * sourceCanvas.height;
        outCanvas.width = sw;
        outCanvas.height = sh;
        outCanvas.getContext('2d').drawImage(sourceCanvas, sx, sy, sw, sh, 0, 0, sw, sh);
      }
      resolve(outCanvas.toDataURL('image/jpeg', 0.85));
    }
    btnFull.addEventListener('click', () => finish(true));
    btnConfirm.addEventListener('click', () => finish(false));

    document.body.appendChild(overlay);
  });
}

// Komplettablauf: Datei -> ausgerichtetes Canvas -> Zuschnitt-Dialog -> fertige Daten-URL
async function processPhotoFile(file) {
  const oriented = await loadOrientedCanvas(file);
  return openCropTool(oriented);
}
