/* =========================================================
   Keysglade — Währungsrechner
   Der Kurs wird von dir selbst festgelegt und nur auf dem Gerät
   gespeichert. Es wird kein Online-Dienst abgefragt – den aktuellen
   Referenzkurs der Europäischen Zentralbank kannst du über den Link
   nachsehen und hier übernehmen.
========================================================= */

const KG_RATE_KEY = "kg-eur-usd-rate";
const KG_RATE_EXAMPLE = 1.15; // Beispielwert, bis ein eigener Kurs eingetragen ist
let cachedRate = null;

function kgStoredRate() {
  try {
    const v = parseFloat(localStorage.getItem(KG_RATE_KEY));
    return isFinite(v) && v > 0.2 && v < 5 ? v : null;
  } catch (e) { return null; }
}

// bleibt als Schnittstelle für die Ausgabenliste erhalten – liefert den gespeicherten Kurs
async function fetchEurUsdRate() {
  return kgStoredRate() || KG_RATE_EXAMPLE;
}

function kgParse(v) { return parseFloat(String(v).replace(/\s/g, "").replace(",", ".")); }
function kgFmt(n, d) { return n.toLocaleString("de-DE", { minimumFractionDigits: d, maximumFractionDigits: d, useGrouping: false }); }

async function setupCurrencyConverter() {
  const eurInput = document.getElementById("currency-eur");
  const usdInput = document.getElementById("currency-usd");
  const rateInput = document.getElementById("currency-rate");
  const statusEl = document.getElementById("currency-status");

  cachedRate = await fetchEurUsdRate();
  const paintStatus = () => {
    const own = kgStoredRate() !== null;
    statusEl.innerHTML = (own ? "Dein Kurs: 1 € = " + kgFmt(cachedRate, 4) + " $. " : "Beispielkurs – bitte den aktuellen Kurs eintragen. ") +
      'Den Referenzkurs findest du bei der <a href="https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/eurofxref-graph-usd.de.html" target="_blank" rel="noopener noreferrer">Europäischen Zentralbank</a>. Es wird nichts automatisch abgefragt.';
  };
  paintStatus();
  if (rateInput) rateInput.value = kgFmt(cachedRate, 4);
  eurInput.disabled = false;
  usdInput.disabled = false;
  eurInput.value = "100";
  usdInput.value = kgFmt(100 * cachedRate, 2);

  if (rateInput) {
    rateInput.addEventListener("change", () => {
      const r = kgParse(rateInput.value);
      if (!(isFinite(r) && r > 0.2 && r < 5)) { rateInput.value = kgFmt(cachedRate, 4); return; }
      cachedRate = r;
      try { localStorage.setItem(KG_RATE_KEY, String(r)); } catch (e) { }
      rateInput.value = kgFmt(r, 4);
      const eur = kgParse(eurInput.value);
      if (isFinite(eur)) usdInput.value = kgFmt(eur * r, 2);
      paintStatus();
      if (typeof renderExpenses === "function") renderExpenses();
    });
  }

  eurInput.addEventListener("input", () => {
    const val = kgParse(eurInput.value);
    if (!isNaN(val) && cachedRate) usdInput.value = kgFmt(val * cachedRate, 2);
  });
  usdInput.addEventListener("input", () => {
    const val = kgParse(usdInput.value);
    if (!isNaN(val) && cachedRate) eurInput.value = kgFmt(val / cachedRate, 2);
  });
}
