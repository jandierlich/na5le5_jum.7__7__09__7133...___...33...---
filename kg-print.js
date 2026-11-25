/* =========================================================
   Keysglade — Druckansicht
   Reines CSS (@media print) + window.print() — keine
   externe Bibliothek, kein Server, keine Datenübertragung.
========================================================= */

function triggerPrint(modeClass) {
  document.body.classList.add(modeClass);
  window.print();
}

function setupPrintButtons() {
  const itineraryBtn = document.getElementById("itinerary-print-btn");
  if (itineraryBtn) {
    itineraryBtn.addEventListener("click", () => triggerPrint("print-mode-itinerary"));
  }

  const bookmarkBtn = document.getElementById("bookmark-print-btn");
  if (bookmarkBtn) {
    bookmarkBtn.addEventListener("click", () => triggerPrint("print-mode-bookmarks"));
  }

  const diaryBtn = document.getElementById("diary-print-btn");
  if (diaryBtn) {
    diaryBtn.addEventListener("click", () => {
      const fromVal = document.getElementById("diary-print-from").value;
      const toVal = document.getElementById("diary-print-to").value;
      const from = fromVal ? new Date(fromVal) : null;
      const to = toVal ? new Date(toVal) : null;

      document.querySelectorAll("#diary-list .diary-entry").forEach((entryEl) => {
        const entryDate = new Date(entryEl.dataset.date);
        const tooEarly = from && entryDate < from;
        const tooLate = to && entryDate > to;
        entryEl.classList.toggle("diary-print-excluded", !!(tooEarly || tooLate));
      });

      const heading = document.getElementById("diary-print-heading");
      if (heading) {
        const rangeLabel = (from || to)
          ? ` (${fromVal || "Anfang"} – ${toVal || "Ende"})`
          : "";
        heading.textContent = `Mein Reise-Tagebuch${rangeLabel}`;
      }

      triggerPrint("print-mode-diary");
    });
  }

  const expenseBtn = document.getElementById("expense-print-btn");
  if (expenseBtn) {
    expenseBtn.addEventListener("click", () => {
      const heading = document.getElementById("expense-print-heading");
      if (heading) {
        const currency = Storage.getExpenseDisplayCurrency() === "EUR" ? "Euro" : "US-Dollar";
        heading.textContent = `Ausgaben-Tracker (Anzeige in ${currency})`;
      }
      triggerPrint("print-mode-expenses");
    });
  }

  window.addEventListener("afterprint", () => {
    document.body.classList.remove("print-mode-itinerary", "print-mode-bookmarks", "print-mode-diary", "print-mode-expenses");
    document.querySelectorAll(".diary-print-excluded").forEach((el) => el.classList.remove("diary-print-excluded"));
  });
}
