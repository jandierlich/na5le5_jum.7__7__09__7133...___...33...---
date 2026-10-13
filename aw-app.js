(function () {
  "use strict";

  /* ---------- Eigene Icons (kein Emoji, reine Linien-SVGs) ---------- */
  var ICON_PATHS = {
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>',
    gear: '<path fill="currentColor" fill-rule="evenodd" stroke="currentColor" stroke-width=".9" stroke-linejoin="round" d="M10.12 4.33L10.37 1.93A10.20 10.20 0 0 1 13.63 1.93L13.88 4.33A7.90 7.90 0 0 1 16.10 5.25L17.97 3.73A10.20 10.20 0 0 1 20.27 6.03L18.75 7.90A7.90 7.90 0 0 1 19.67 10.12L22.07 10.37A10.20 10.20 0 0 1 22.07 13.63L19.67 13.88A7.90 7.90 0 0 1 18.75 16.10L20.27 17.97A10.20 10.20 0 0 1 17.97 20.27L16.10 18.75A7.90 7.90 0 0 1 13.88 19.67L13.63 22.07A10.20 10.20 0 0 1 10.37 22.07L10.12 19.67A7.90 7.90 0 0 1 7.90 18.75L6.03 20.27A10.20 10.20 0 0 1 3.73 17.97L5.25 16.10A7.90 7.90 0 0 1 4.33 13.88L1.93 13.63A10.20 10.20 0 0 1 1.93 10.37L4.33 10.12A7.90 7.90 0 0 1 5.25 7.90L3.73 6.03A10.20 10.20 0 0 1 6.03 3.73L7.90 5.25A7.90 7.90 0 0 1 10.12 4.33ZM8.40 12a3.60 3.60 0 1 0 7.20 0a3.60 3.60 0 1 0 -7.20 0Z"/>',
    sun: '<circle cx="12" cy="12" r="3.9"/><path d="M12 2.6v2.3M12 19.1v2.3M2.6 12h2.3M19.1 12h2.3M5.7 5.7l1.2 1.2M17.1 17.1l1.2 1.2M18.3 5.7l-1.2 1.2M6.9 17.1l-1.2 1.2"/>',
    moon: '<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
    chevronLeft: '<path d="M15 5l-7 7 7 7"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    film: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M3 15h18M8 4v16M16 4v16"/>',
    shield: '<path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z"/>',
    home: '<path d="M4 11l8-7 8 7"/><path d="M6 10v9a1 1 0 0 0 1 1h4v-6h2v6h4a1 1 0 0 0 1-1v-9"/>',
    dumbbell: '<path d="M4 12h16M4 9v6M20 9v6M7 7v10M17 7v10"/>',
    tag: '<path d="M20 12l-8 8-9-9V4h7l10 8z"/><circle cx="7.5" cy="7.5" r="1.1"/>',
    wifi: '<path d="M2 8.5a16 16 0 0 1 20 0M5.5 12a11 11 0 0 1 13 0M9 15.5a6 6 0 0 1 6 0"/><circle cx="12" cy="19" r="1"/>',
    car: '<path d="M3 13l1.5-5A2 2 0 0 1 6.4 6.5h11.2A2 2 0 0 1 19.5 8l1.5 5"/><rect x="2" y="13" width="20" height="6" rx="2"/><circle cx="7" cy="19" r="1.5"/><circle cx="17" cy="19" r="1.5"/>',
    heart: '<path d="M12 20s-7-4.5-9.5-9A5 5 0 0 1 12 6a5 5 0 0 1 9.5 5c-2.5 4.5-9.5 9-9.5 9z"/>',
    book: '<path d="M4 5a2 2 0 0 1 2-2h6v18H6a2 2 0 0 1-2-2V5z"/><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6"/>',
    gift: '<rect x="3" y="9" width="18" height="12" rx="1"/><path d="M3 9V6a2 2 0 0 1 2-2h2M21 9V6a2 2 0 0 0-2-2h-2M12 2s-3 2-3 4 3 4 3 4 3-2 3-4-3-4-3-4zM12 9v12"/>',
    coffee: '<path d="M4 9h13v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V9z"/><path d="M17 9h1.5a2.5 2.5 0 0 1 0 5H17"/>',
    phone: '<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M11 18h2"/>',
    umbrella: '<path d="M2 12a10 10 0 0 1 20 0z"/><path d="M12 12v7a2 2 0 0 1-4 0"/><path d="M12 2v2"/>'
  };
  function ico(name, cls) {
    var body = ICON_PATHS[name] || ICON_PATHS.tag;
    return '<svg class="' + (cls || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + body + '</svg>';
  }

  var CATEGORY_ICON_CHOICES = ['film', 'shield', 'home', 'dumbbell', 'wifi', 'car', 'heart', 'book', 'gift', 'coffee', 'phone', 'umbrella', 'tag'];
  var CATEGORY_COLOR_CHOICES = ['#6C5CE7', '#3B82C4', '#E8735C', '#F5A623', '#4A90D9', '#9B9EB8', '#D6336C', '#B8892F'];

  var DEFAULT_CATEGORIES = [
    { id: 'streaming', label: 'Streaming', icon: 'film', color: '#6C5CE7' },
    { id: 'versicherung', label: 'Versicherung', icon: 'shield', color: '#3B82C4' },
    { id: 'miete', label: 'Miete/Wohnen', icon: 'home', color: '#E8735C' },
    { id: 'fitness', label: 'Fitness', icon: 'dumbbell', color: '#F5A623' },
    { id: 'sonstiges', label: 'Sonstiges', icon: 'tag', color: '#9B9EB8' }
  ];

  var STORAGE_KEY = 'alltagwahr_entries_v1';
  var CATEGORY_STORAGE_KEY = 'alltagwahr_categories_v1';
  var REMINDER_KEY = 'alltagwahr_reminders_enabled';
  var FALLBACK_CATEGORY_ID = 'sonstiges';

  var entries = [];
  var categories = [];
  var editingId = null;
  var editingCatId = null;
  var selectedIconChoice = CATEGORY_ICON_CHOICES[0];
  var selectedColorChoice = CATEGORY_COLOR_CHOICES[0];
  var sortByDate = true;
  var searchQuery = '';
  var filterCategory = null;
  var filterMode = null; // null | 'notice'

  function uid() { return 'e_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8); }

  /* ---------- Laden / Speichern ---------- */
  function loadEntries() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      entries = raw ? JSON.parse(raw) : [];
    } catch (e) { entries = []; }
  }
  function saveEntries() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(entries)); }
    catch (e) { showToast('Speichern fehlgeschlagen'); }
  }
  function loadCategories() {
    try {
      var raw = localStorage.getItem(CATEGORY_STORAGE_KEY);
      categories = raw ? JSON.parse(raw) : DEFAULT_CATEGORIES.slice();
    } catch (e) { categories = DEFAULT_CATEGORIES.slice(); }
    if (!categories.some(function (c) { return c.id === FALLBACK_CATEGORY_ID; })) {
      categories.push({ id: FALLBACK_CATEGORY_ID, label: 'Sonstiges', icon: 'tag', color: '#9B9EB8' });
    }
  }
  function saveCategories() {
    try { localStorage.setItem(CATEGORY_STORAGE_KEY, JSON.stringify(categories)); }
    catch (e) { showToast('Speichern fehlgeschlagen'); }
  }

  function monthlyEquivalent(e) {
    if (e.rhythm === 'monthly') return e.amount;
    if (e.rhythm === 'quarterly') return e.amount / 3;
    return e.amount / 12;
  }
  function fmtEUR(n) { return n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'; }
  function fmtDate(iso) { var d = new Date(iso + 'T00:00:00'); return d.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' }); }
  function daysUntil(iso) {
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var target = new Date(iso + 'T00:00:00');
    return Math.round((target - today) / 86400000);
  }
  function catInfo(id) {
    return categories.find(function (c) { return c.id === id; }) ||
      categories.find(function (c) { return c.id === FALLBACK_CATEGORY_ID; }) ||
      { id: FALLBACK_CATEGORY_ID, label: 'Sonstiges', icon: 'tag', color: '#9B9EB8' };
  }
  function escapeHtml(s) { return s.replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  /* Kündigungsfrist zählt ab dem Vertragsende, falls gesetzt – sonst ab der nächsten Fälligkeit */
  function noticeDeadline(e) {
    if (e.noticeDays == null) return null;
    var basis = e.contractEnd || e.nextDate;
    return daysUntil(basis) - e.noticeDays;
  }
  function isTicking(e) { return e.noticeDays != null && e.autoRenew !== false; }

  /* ---------- Render ---------- */
  function render() {
    renderHero();
    renderTiles();
    renderChart();
    renderList();
    checkReminders();
  }

  var SNAPSHOT_KEY = 'alltagwahr_monthly_snapshots_v1';
  function monthKey(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); }
  function prevMonthKey(d) { var p = new Date(d.getFullYear(), d.getMonth() - 1, 1); return monthKey(p); }

  function renderHero() {
    var totalMonthly = entries.reduce(function (s, e) { return s + monthlyEquivalent(e); }, 0);
    document.getElementById('monthlyTotal').textContent = fmtEUR(totalMonthly);
    document.getElementById('yearlyHint').textContent = '≈ ' + fmtEUR(totalMonthly * 12) + ' im Jahr';

    var compareEl = document.getElementById('monthCompare');
    try {
      var snapshots = JSON.parse(localStorage.getItem(SNAPSHOT_KEY) || '{}');
      var now = new Date();
      var thisKey = monthKey(now);
      var lastKey = prevMonthKey(now);
      if (snapshots[lastKey] != null) {
        var diff = totalMonthly - snapshots[lastKey];
        if (Math.abs(diff) < 0.005) {
          compareEl.textContent = '± 0 € ggü. Vormonat';
        } else {
          compareEl.textContent = (diff > 0 ? '+ ' : '− ') + fmtEUR(Math.abs(diff)) + ' ggü. Vormonat';
        }
        compareEl.style.display = 'inline-block';
      } else {
        compareEl.style.display = 'none';
      }
      snapshots[thisKey] = totalMonthly;
      localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshots));
    } catch (e) { compareEl.style.display = 'none'; }
  }

  function renderTiles() {
    var sorted = entries.slice().sort(function (a, b) { return daysUntil(a.nextDate) - daysUntil(b.nextDate); });
    var next = sorted[0];
    document.getElementById('nextPayment').textContent = next ? next.name + ' · ' + fmtDate(next.nextDate) : 'Noch keine';
    var extraPayments = Math.max(0, sorted.length - 1);
    document.getElementById('nextPaymentExtra').textContent = !next ? 'Lege deinen ersten Eintrag an'
      : extraPayments > 0 ? '+ ' + extraPayments + ' weitere' : '';

    var withNotice = entries.filter(isTicking)
      .map(function (e) { return { e: e, deadline: noticeDeadline(e) }; })
      .filter(function (x) { return x.deadline <= 21; })
      .sort(function (a, b) { return a.deadline - b.deadline; });
    var radarEl = document.getElementById('cancelRadar');
    radarEl.textContent = withNotice.length === 0
      ? (entries.length === 0 ? 'Keine Fristen' : 'Keine Fristen nah')
      : withNotice[0].e.name + ' · ' + (withNotice[0].deadline <= 0 ? 'Frist läuft!' : 'noch ' + withNotice[0].deadline + ' Tg.');
    var extraNotice = Math.max(0, withNotice.length - 1);
    document.getElementById('cancelRadarExtra').textContent = extraNotice > 0
      ? '+ ' + extraNotice + ' weitere' : '';
  }

  /* Eigener SVG-Donut-Chart – keine externe Bibliothek, kein Netzwerkzugriff */
  function renderChart() {
    var byCat = {};
    entries.forEach(function (e) { byCat[e.category] = (byCat[e.category] || 0) + monthlyEquivalent(e); });
    var labels = Object.keys(byCat);
    var wrap = document.getElementById('chartWrap');
    var legend = document.getElementById('chartLegend');

    var chartCard = document.getElementById('chartCard');
    if (labels.length === 0) {
      wrap.innerHTML = '';
      legend.innerHTML = '';
      if (chartCard) chartCard.style.display = 'none';
      return;
    }
    if (chartCard) chartCard.style.display = '';

    var total = labels.reduce(function (s, l) { return s + byCat[l]; }, 0);
    var size = 180, r = 68, cx = size / 2, cy = size / 2, circumference = 2 * Math.PI * r;
    var offset = 0;
    var segments = labels.map(function (l) {
      var value = byCat[l];
      var frac = total > 0 ? value / total : 0;
      var seg = {
        color: catInfo(l).color,
        dash: (frac * circumference) + ' ' + circumference,
        rotate: (offset / total) * 360
      };
      offset += value;
      return seg;
    });

    var circles = segments.map(function (s) {
      return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="' + s.color + '" ' +
        'stroke-width="26" stroke-dasharray="' + s.dash + '" transform="rotate(' + (s.rotate - 90) + ' ' + cx + ' ' + cy + ')" stroke-linecap="butt"/>';
    }).join('');

    wrap.innerHTML =
      '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '">' + circles + '</svg>' +
      '<div class="chart-center"><div class="chart-center-value">' + fmtEUR(total) + '</div><div class="chart-center-label">/ Monat</div></div>';

    legend.innerHTML = labels.map(function (l) {
      return '<span class="legend-item"><span class="legend-dot" style="background:' + catInfo(l).color + '"></span>' + escapeHtml(catInfo(l).label) + ' · ' + fmtEUR(byCat[l]) + '</span>';
    }).join('');
  }

  function renderList() {
    var list = document.getElementById('entryList');
    var filtered = entries.filter(function (e) {
      if (filterMode === 'notice' && !(isTicking(e) && noticeDeadline(e) <= 21)) return false;
      if (filterCategory && e.category !== filterCategory) return false;
      if (searchQuery && e.name.toLowerCase().indexOf(searchQuery) === -1) return false;
      return true;
    });
    if (entries.length === 0) {
      list.innerHTML = '<div class="empty-state nm-raised"><div class="empty-icon">' + ico('folder') + '</div><strong class="empty-title">Noch keine Einträge</strong>Erfasse Abos, Miete oder Versicherungen – AlltagWahr rechnet Monats- und Jahressumme automatisch aus.<button type="button" class="empty-cta" id="emptyAddBtn">' + ico('plus') + ' Ersten Eintrag anlegen</button></div>';
      var emptyAdd = document.getElementById('emptyAddBtn');
      if (emptyAdd) emptyAdd.addEventListener('click', function () { openSheet(null); });
      return;
    }
    if (filtered.length === 0) {
      list.innerHTML = '<div class="empty-state nm-raised"><div class="empty-icon">' + ico('folder') + '</div>Keine Einträge gefunden.</div>';
      return;
    }
    var sorted = filtered.slice().sort(function (a, b) {
      if (sortByDate) return daysUntil(a.nextDate) - daysUntil(b.nextDate);
      return monthlyEquivalent(b) - monthlyEquivalent(a);
    });
    list.innerHTML = sorted.map(function (e) {
      var c = catInfo(e.category);
      var du = daysUntil(e.nextDate);
      var dueLabel = du === 0 ? 'heute' : du < 0 ? 'überfällig' : 'in ' + du + ' Tg.';
      var rhythmLabel = { monthly: '/Monat', quarterly: '/Quartal', yearly: '/Jahr' }[e.rhythm];
      var metaExtra = '';
      if (e.contractEnd) metaExtra += ' · Vertragsende ' + fmtDate(e.contractEnd);
      if (e.contractTerm) metaExtra += ' · Laufzeit ' + e.contractTerm + ' Mon.';
      var noticeFlag = '';
      var deadline = noticeDeadline(e);
      if (deadline != null) {
        if (isTicking(e) && deadline <= 21) {
          noticeFlag = '<span class="entry-flag entry-flag-warn">Kündigungsfrist ' + (deadline <= 0 ? 'jetzt' : 'in ' + deadline + ' Tg.') + '</span>';
        } else if (!isTicking(e)) {
          noticeFlag = '<span class="entry-flag entry-flag-ok">endet automatisch' + (e.contractEnd ? ' am ' + fmtDate(e.contractEnd) : '') + '</span>';
        }
      }
      return '' +
        '<div class="entry nm-raised" data-id="' + e.id + '" data-edit="' + e.id + '">' +
        '<div class="entry-icon" style="background:' + c.color + '38;color:' + c.color + ';">' + ico(c.icon) + '</div>' +
        '<div class="entry-body">' +
        '<p class="entry-name">' + escapeHtml(e.name) + '</p>' +
        '<p class="entry-meta">' + fmtDate(e.nextDate) + ' · ' + dueLabel + metaExtra + '</p>' +
        noticeFlag +
        '</div>' +
        '<div class="entry-amount">' + fmtEUR(e.amount) + '<small>' + rhythmLabel + '</small></div>' +
        '</div>';
    }).join('');

    Array.prototype.forEach.call(list.querySelectorAll('[data-edit]'), function (node) {
      node.addEventListener('click', function () { openSheet(node.getAttribute('data-edit')); });
    });
  }

  /* ---------- Toast ---------- */
  var toastTimer = null;
  function showToast(msg) {
    var t = document.getElementById('toast');
    document.getElementById('toastMsg').textContent = msg;
    var actionBtn = document.getElementById('toastAction');
    actionBtn.style.display = 'none';
    actionBtn.onclick = null;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('show'); }, 2600);
  }
  function showUndoToast(msg, onUndo) {
    var t = document.getElementById('toast');
    document.getElementById('toastMsg').textContent = msg;
    var actionBtn = document.getElementById('toastAction');
    actionBtn.textContent = 'Rückgängig';
    actionBtn.style.display = 'inline-block';
    actionBtn.onclick = function () {
      t.classList.remove('show');
      clearTimeout(toastTimer);
      onUndo();
    };
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      t.classList.remove('show');
      actionBtn.onclick = null;
    }, 5000);
  }

  /* ---------- Reminders (lokale Benachrichtigung bei offener App) ---------- */
  function remindersEnabled() { return localStorage.getItem(REMINDER_KEY) === '1'; }
  function checkReminders() {
    if (!remindersEnabled() || !('Notification' in window) || Notification.permission !== 'granted') return;
    var already = JSON.parse(sessionStorage.getItem('alltagwahr_notified') || '[]');
    entries.forEach(function (e) {
      var du = daysUntil(e.nextDate);
      var key = e.id + ':' + e.nextDate;
      if (du <= 2 && du >= 0 && already.indexOf(key) === -1) {
        try {
          new Notification('AlltagWahr', { body: e.name + ' wird fällig: ' + fmtEUR(e.amount) + ' am ' + fmtDate(e.nextDate) });
        } catch (err) { /* das System erlaubt Notifications nur aus installierter PWA heraus */ }
        already.push(key);
      }
      if (isTicking(e)) {
        var deadline = noticeDeadline(e);
        var nkey = 'notice:' + key;
        if (deadline <= 3 && deadline >= 0 && already.indexOf(nkey) === -1) {
          try {
            new Notification('AlltagWahr – Kündigungsfrist', { body: e.name + ': Frist läuft in ' + deadline + ' Tagen ab' });
          } catch (err) { }
          already.push(nkey);
        }
      }
    });
    sessionStorage.setItem('alltagwahr_notified', JSON.stringify(already));
  }

  /* ---------- Eintrags-Sheet / Formular ---------- */
  var sheetBackdrop = document.getElementById('sheetBackdrop');
  var form = document.getElementById('entryForm');

  function buildCatPicker(selected) {
    var wrap = document.getElementById('catPicker');
    wrap.innerHTML = categories.map(function (c) {
      var sel = c.id === selected;
      return '<div class="cat-chip' + (sel ? ' selected' : '') + '" data-cat="' + c.id + '" style="' + (sel ? 'border-color:' + c.color + ';color:' + c.color + ';' : '') + '">' +
        ico(c.icon) + '<span>' + escapeHtml(c.label) + '</span></div>';
    }).join('');
    Array.prototype.forEach.call(wrap.querySelectorAll('.cat-chip'), function (chip) {
      chip.addEventListener('click', function () {
        Array.prototype.forEach.call(wrap.querySelectorAll('.cat-chip'), function (c) { c.classList.remove('selected'); c.style.borderColor = ''; c.style.color = ''; });
        chip.classList.add('selected');
        var col = catInfo(chip.getAttribute('data-cat')).color;
        chip.style.borderColor = col;
        chip.style.color = col;
      });
    });
  }

  function openSheet(id) {
    editingId = id || null;
    var deleteRow = document.getElementById('deleteRow');
    if (editingId) {
      var e = entries.find(function (x) { return x.id === editingId; });
      document.getElementById('sheetTitle').textContent = 'Eintrag bearbeiten';
      document.getElementById('fName').value = e.name;
      document.getElementById('fAmount').value = e.amount;
      document.getElementById('fRhythm').value = e.rhythm;
      document.getElementById('fDate').value = e.nextDate;
      document.getElementById('fNotice').value = e.noticeDays != null ? e.noticeDays : '';
      document.getElementById('fContractEnd').value = e.contractEnd || '';
      document.getElementById('fContractTerm').value = e.contractTerm != null ? e.contractTerm : '';
      document.getElementById('fAutoRenew').checked = e.autoRenew !== false;
      buildCatPicker(e.category);
      deleteRow.style.display = 'flex';
    } else {
      document.getElementById('sheetTitle').textContent = 'Neuer Eintrag';
      form.reset();
      buildCatPicker(null);
      deleteRow.style.display = 'none';
    }
    sheetBackdrop.classList.add('open');
  }
  function closeSheet() { sheetBackdrop.classList.remove('open'); editingId = null; }

  document.getElementById('addBtn').addEventListener('click', function () { openSheet(null); });
  document.getElementById('cancelBtn').addEventListener('click', closeSheet);
  sheetBackdrop.addEventListener('click', function (ev) { if (ev.target === sheetBackdrop) closeSheet(); });

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    var selectedChip = document.querySelector('#catPicker .cat-chip.selected');
    if (!selectedChip) { showToast('Bitte eine Kategorie wählen'); return; }
    var data = {
      name: document.getElementById('fName').value.trim(),
      amount: parseFloat(document.getElementById('fAmount').value) || 0,
      rhythm: document.getElementById('fRhythm').value,
      category: selectedChip.getAttribute('data-cat'),
      nextDate: document.getElementById('fDate').value,
      noticeDays: document.getElementById('fNotice').value ? parseInt(document.getElementById('fNotice').value, 10) : null,
      contractEnd: document.getElementById('fContractEnd').value || null,
      contractTerm: document.getElementById('fContractTerm').value ? parseInt(document.getElementById('fContractTerm').value, 10) : null,
      autoRenew: document.getElementById('fAutoRenew').checked
    };
    if (!data.name || !data.nextDate) return;
    if (editingId) {
      var idx = entries.findIndex(function (x) { return x.id === editingId; });
      entries[idx] = Object.assign({ id: editingId }, data);
    } else {
      data.id = uid();
      entries.push(data);
    }
    saveEntries();
    render();
    closeSheet();
  });

  document.getElementById('deleteBtn').addEventListener('click', function () {
    if (!editingId) return;
    var idx = entries.findIndex(function (x) { return x.id === editingId; });
    if (idx === -1) return;
    var removed = entries[idx];
    entries = entries.filter(function (x) { return x.id !== editingId; });
    saveEntries();
    render();
    closeSheet();
    showUndoToast(removed.name + ' gelöscht', function () {
      entries.splice(Math.min(idx, entries.length), 0, removed);
      saveEntries();
      render();
    });
  });

  document.getElementById('sortToggle').addEventListener('click', function () {
    sortByDate = !sortByDate;
    this.textContent = sortByDate ? 'nach Datum' : 'nach Betrag';
    renderList();
  });

  /* ---------- Suche & Kategorie-Filter ---------- */
  document.getElementById('searchInput').addEventListener('input', function (ev) {
    searchQuery = ev.target.value.trim().toLowerCase();
    renderList();
  });
  function updateFilterStatus() {
    var bar = document.getElementById('filterStatus');
    if (filterMode === 'notice') {
      document.getElementById('filterStatusText').textContent = 'Gefiltert: bald kündbar';
      bar.style.display = 'flex';
    } else {
      bar.style.display = 'none';
    }
  }
  document.getElementById('clearFilterMode').addEventListener('click', function () {
    filterMode = null;
    updateFilterStatus();
    renderList();
  });

  function renderFilterBar() {
    var wrap = document.getElementById('categoryFilterBar');
    var all = '<div class="filter-chip' + (filterCategory === null ? ' selected' : '') + '" data-filter="">Alle</div>';
    var chips = categories.map(function (c) {
      return '<div class="filter-chip' + (filterCategory === c.id ? ' selected' : '') + '" data-filter="' + c.id + '">' + ico(c.icon) + '<span>' + escapeHtml(c.label) + '</span></div>';
    }).join('');
    wrap.innerHTML = all + chips;
    Array.prototype.forEach.call(wrap.querySelectorAll('.filter-chip'), function (chip) {
      chip.addEventListener('click', function () {
        filterCategory = chip.getAttribute('data-filter') || null;
        filterMode = null;
        updateFilterStatus();
        renderFilterBar();
        renderList();
      });
    });
  }

  /* ---------- Kacheln antippbar: zur Liste springen ---------- */
  function scrollToList() {
    document.getElementById('entryList').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  document.getElementById('tileNextPayment').addEventListener('click', function () {
    filterMode = null;
    filterCategory = null;
    searchQuery = '';
    document.getElementById('searchInput').value = '';
    sortByDate = true;
    document.getElementById('sortToggle').textContent = 'nach Datum';
    updateFilterStatus();
    renderFilterBar();
    renderList();
    scrollToList();
  });
  document.getElementById('tileCancelRadar').addEventListener('click', function () {
    filterMode = 'notice';
    filterCategory = null;
    updateFilterStatus();
    renderFilterBar();
    renderList();
    scrollToList();
  });

  /* ---------- Settings-Sheet (Export/Import/Reminders/Kategorien) ---------- */
  var settingsBackdrop = document.getElementById('settingsBackdrop');
  document.getElementById('settingsBtn').addEventListener('click', function () {
    document.getElementById('reminderToggle').checked = remindersEnabled();
    renderCategoryManager();
    settingsBackdrop.classList.add('open');
  });
  document.getElementById('settingsCloseBtn').addEventListener('click', function () { settingsBackdrop.classList.remove('open'); });
  settingsBackdrop.addEventListener('click', function (ev) { if (ev.target === settingsBackdrop) settingsBackdrop.classList.remove('open'); });

  document.getElementById('exportBtn').addEventListener('click', function () {
    var blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), entries: entries, categories: categories }, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'alltagwahr-backup-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Backup wurde heruntergeladen');
  });

  document.getElementById('importInput').addEventListener('change', function (ev) {
    var file = ev.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var parsed = JSON.parse(reader.result);
        var imported = Array.isArray(parsed) ? parsed : parsed.entries;
        if (!Array.isArray(imported)) throw new Error('Ungültiges Format');
        var ok = window.confirm('Aktuelle Einträge durch ' + imported.length + ' importierte Einträge ersetzen?');
        if (!ok) return;
        entries = imported.map(function (e) { return Object.assign({}, e, { id: e.id || uid() }); });
        if (parsed.categories && Array.isArray(parsed.categories)) {
          categories = parsed.categories;
          if (!categories.some(function (c) { return c.id === FALLBACK_CATEGORY_ID; })) {
            categories.push({ id: FALLBACK_CATEGORY_ID, label: 'Sonstiges', icon: 'tag', color: '#9B9EB8' });
          }
          saveCategories();
        }
        saveEntries();
        render();
        renderCategoryManager();
        showToast('Backup importiert');
      } catch (err) {
        showToast('Import fehlgeschlagen: ungültige Datei');
      }
    };
    reader.readAsText(file);
    ev.target.value = '';
  });

  document.getElementById('reminderToggle').addEventListener('change', function (ev) {
    if (ev.target.checked) {
      if (!('Notification' in window)) { showToast('Benachrichtigungen werden hier nicht unterstützt'); ev.target.checked = false; return; }
      Notification.requestPermission().then(function (perm) {
        if (perm === 'granted') { localStorage.setItem(REMINDER_KEY, '1'); showToast('Erinnerungen aktiviert'); checkReminders(); }
        else { ev.target.checked = false; showToast('Berechtigung nicht erteilt'); }
      });
    } else {
      localStorage.setItem(REMINDER_KEY, '0');
    }
  });

  /* ---------- Kategorien-Verwaltung ---------- */
  function renderCategoryManager() {
    renderFilterBar();
    var wrap = document.getElementById('categoryManager');
    wrap.innerHTML = categories.map(function (c) {
      var canDelete = c.id !== FALLBACK_CATEGORY_ID;
      return '<div class="cat-manage-row">' +
        '<div class="cat-manage-swatch" style="background:' + c.color + ';">' + ico(c.icon) + '</div>' +
        '<div class="cat-manage-label">' + escapeHtml(c.label) + '</div>' +
        '<button class="cat-manage-del" data-edit-cat="' + c.id + '" aria-label="Bearbeiten">' + ico('gear') + '</button>' +
        (canDelete ? '<button class="cat-manage-del" data-del-cat="' + c.id + '" aria-label="Löschen">' + ico('trash') + '</button>' : '') +
        '</div>';
    }).join('');
    Array.prototype.forEach.call(wrap.querySelectorAll('[data-del-cat]'), function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-del-cat');
        var affected = entries.filter(function (e) { return e.category === id; }).length;
        var msg = affected > 0 ? 'Kategorie löschen? ' + affected + ' Eintrag/Einträge werden zu „Sonstiges" verschoben.' : 'Kategorie wirklich löschen?';
        if (!window.confirm(msg)) return;
        categories = categories.filter(function (c) { return c.id !== id; });
        entries.forEach(function (e) { if (e.category === id) e.category = FALLBACK_CATEGORY_ID; });
        saveCategories();
        saveEntries();
        renderCategoryManager();
        render();
      });
    });
    Array.prototype.forEach.call(wrap.querySelectorAll('[data-edit-cat]'), function (btn) {
      btn.addEventListener('click', function () { openCategorySheet(btn.getAttribute('data-edit-cat')); });
    });
  }

  var categoryBackdrop = document.getElementById('categoryBackdrop');
  var categoryForm = document.getElementById('categoryForm');

  function buildIconPicker(selected) {
    var wrap = document.getElementById('iconPicker');
    wrap.innerHTML = CATEGORY_ICON_CHOICES.map(function (i) {
      return '<div class="icon-choice' + (i === selected ? ' selected' : '') + '" data-icon="' + i + '">' + ico(i) + '</div>';
    }).join('');
    Array.prototype.forEach.call(wrap.querySelectorAll('.icon-choice'), function (el) {
      el.addEventListener('click', function () {
        Array.prototype.forEach.call(wrap.querySelectorAll('.icon-choice'), function (x) { x.classList.remove('selected'); });
        el.classList.add('selected');
        selectedIconChoice = el.getAttribute('data-icon');
      });
    });
    selectedIconChoice = selected;
  }
  function buildColorPicker(selected) {
    var wrap = document.getElementById('colorPicker');
    wrap.innerHTML = CATEGORY_COLOR_CHOICES.map(function (col) {
      return '<div class="color-choice' + (col === selected ? ' selected' : '') + '" data-color="' + col + '" style="background:' + col + ';"></div>';
    }).join('');
    Array.prototype.forEach.call(wrap.querySelectorAll('.color-choice'), function (el) {
      el.addEventListener('click', function () {
        Array.prototype.forEach.call(wrap.querySelectorAll('.color-choice'), function (x) { x.classList.remove('selected'); });
        el.classList.add('selected');
        selectedColorChoice = el.getAttribute('data-color');
      });
    });
    selectedColorChoice = selected;
  }

  function openCategorySheet(id) {
    editingCatId = id || null;
    var delBtn = document.getElementById('categoryDeleteBtn');
    if (editingCatId) {
      var c = categories.find(function (x) { return x.id === editingCatId; });
      document.getElementById('categorySheetTitle').textContent = 'Kategorie bearbeiten';
      document.getElementById('fCatName').value = c.label;
      buildIconPicker(c.icon);
      buildColorPicker(c.color);
      delBtn.style.display = c.id === FALLBACK_CATEGORY_ID ? 'none' : 'block';
    } else {
      document.getElementById('categorySheetTitle').textContent = 'Neue Kategorie';
      categoryForm.reset();
      buildIconPicker(CATEGORY_ICON_CHOICES[0]);
      buildColorPicker(CATEGORY_COLOR_CHOICES[0]);
      delBtn.style.display = 'none';
    }
    categoryBackdrop.classList.add('open');
  }
  function closeCategorySheet() { categoryBackdrop.classList.remove('open'); editingCatId = null; }

  document.getElementById('addCategoryBtn').addEventListener('click', function () { openCategorySheet(null); });
  document.getElementById('categoryCancelBtn').addEventListener('click', closeCategorySheet);
  categoryBackdrop.addEventListener('click', function (ev) { if (ev.target === categoryBackdrop) closeCategorySheet(); });

  categoryForm.addEventListener('submit', function (ev) {
    ev.preventDefault();
    var label = document.getElementById('fCatName').value.trim();
    if (!label) return;
    if (editingCatId) {
      var c = categories.find(function (x) { return x.id === editingCatId; });
      c.label = label; c.icon = selectedIconChoice; c.color = selectedColorChoice;
    } else {
      categories.push({ id: uid(), label: label, icon: selectedIconChoice, color: selectedColorChoice });
    }
    saveCategories();
    renderCategoryManager();
    render();
    closeCategorySheet();
  });

  document.getElementById('categoryDeleteBtn').addEventListener('click', function () {
    if (!editingCatId || editingCatId === FALLBACK_CATEGORY_ID) return;
    var affected = entries.filter(function (e) { return e.category === editingCatId; }).length;
    var msg = affected > 0 ? 'Kategorie löschen? ' + affected + ' Eintrag/Einträge werden zu „Sonstiges" verschoben.' : 'Kategorie wirklich löschen?';
    if (!window.confirm(msg)) return;
    categories = categories.filter(function (c) { return c.id !== editingCatId; });
    entries.forEach(function (e) { if (e.category === editingCatId) e.category = FALLBACK_CATEGORY_ID; });
    saveCategories();
    saveEntries();
    renderCategoryManager();
    render();
    closeCategorySheet();
  });

  /* ---------- Hell-/Dunkelmodus: zentral über wz-theme.js ---------- */

  /* ---------- Einführung (einheitlich über wz-onboarding.js) ---------- */
  var onb = wzOnboarding({
    key: 'aw_onboarded',
    slides: [
      { iconHtml: ico('calendar'), title: 'Willkommen bei AlltagWahr', text: 'Behalte Abos, Miete, Versicherungen und alle anderen wiederkehrenden Ausgaben im Blick – mit Monats- und Jahressumme auf einen Blick.' },
      { iconHtml: ico('clock'), title: 'Keine Frist verpassen', text: 'Trag bei Bedarf die Kündigungsfrist ein – der Bereich „Kündigungen“ warnt dich rechtzeitig, bevor sich ein Vertrag verlängert.' },
      { iconHtml: ico('shield'), title: '100% lokal', text: 'Alle Einträge bleiben ausschließlich auf deinem Gerät. Kein Konto, keine Cloud, kein Tracking – Sicherungen machst du selbst über die Einstellungen.' }
    ]
  });
  document.getElementById('btnShowOnboarding').addEventListener('click', function () { onb.show(); });

  /* ---------- Statische Icons einsetzen ---------- */
  document.getElementById('homeLink').innerHTML = ico('home');
  document.getElementById('settingsBtn').innerHTML = ico('gear');
  document.getElementById('tileIconCalendar').innerHTML = ico('calendar');
  document.getElementById('tileIconClock').innerHTML = ico('clock');
  document.getElementById('clearFilterMode').innerHTML = ico('close');

  /* ---------- Service Worker (Offline/PWA) ---------- */


  /* ---------- Init ---------- */
  loadCategories();
  loadEntries();
  saveEntries();
  renderFilterBar();
  render();

  /* ---------- Übergabe aus der Schnelleingabe der Startseite ---------- */
  var wzH = window.wzScanHandoff && wzScanHandoff(['abo']);
  if (wzH) {
    openSheet(null);
    document.getElementById('fName').value = String(wzH.name || '').slice(0, 80);
    if (typeof wzH.betrag === 'number' && isFinite(wzH.betrag) && wzH.betrag > 0) document.getElementById('fAmount').value = wzH.betrag.toFixed(2);
    if (['monthly', 'quarterly', 'yearly'].indexOf(wzH.rhythm) !== -1) document.getElementById('fRhythm').value = wzH.rhythm;
  }
})();
