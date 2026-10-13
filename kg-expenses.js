/* =========================================================
   Keysglade — Ausgaben-Tracker
   Beträge in US-Dollar (wie vor Ort tatsächlich bezahlt),
   mit optionalem Aufschlag für die in den USA übliche, an
   der Kasse zusätzlich berechnete Verkaufssteuer (Sales Tax).
========================================================= */

const EXPENSE_CATEGORIES = ["Unterkunft", "Verpflegung", "Themenparks", "Mietwagen", "Sonstiges"];
const EXPENSE_DEFAULT_TAX_RATE = 7; // typischer kombinierter Sales-Tax-Satz in Florida (Bundesstaat + County)

function addExpense(expense) {
  const expenses = Storage.getExpenses();
  expenses.push({ id: Date.now(), ...expense });
  Storage.setExpenses(expenses);
}

function removeExpense(id) {
  const expenses = Storage.getExpenses().filter((e) => e.id !== id);
  Storage.setExpenses(expenses);
}

function renderExpenses() {
  const list = document.getElementById("expenses-list");
  const summary = document.getElementById("expenses-summary");
  if (!list) return;

  const displayCurrency = Storage.getExpenseDisplayCurrency();
  const showEur = displayCurrency === "EUR" && typeof cachedRate === "number" && cachedRate > 0;
  const suffix = showEur ? "€" : "$";
  const toDisplay = (usdAmount) => (showEur ? usdAmount / cachedRate : usdAmount);

  const expenses = Storage.getExpenses().sort((a, b) => b.id - a.id);

  list.innerHTML = expenses.length === 0
    ? `<div class="empty-state"><div class="empty-state-icon">${rwi("money")}</div><p class="empty-state-text">Noch keine Ausgaben erfasst</p></div>`
    : expenses.map((e) => `
        <div class="expense-row">
          <span class="expense-cat">${e.category}</span>
          <span class="expense-note">${e.note ? escapeHtml(e.note) : ""}${e.taxIncluded ? ` <span class="expense-tax-badge">inkl. Tax</span>` : ""}</span>
          <span class="expense-amount">${toDisplay(e.amount).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${suffix}</span>
          <button class="expense-delete-btn print-hide" data-id="${e.id}" aria-label="Löschen">${rwi("close")}</button>
        </div>
      `).join("");

  list.querySelectorAll(".expense-delete-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      removeExpense(Number(btn.dataset.id));
      renderExpenses();
    });
  });

  const total = expenses.reduce((s, e) => s + e.amount, 0);

  const lastBudget = Storage.getLastBudgetEstimate();
  let comparisonHtml = "";
  if (lastBudget && typeof cachedRate === "number" && cachedRate > 0) {
    const budgetInUsd = lastBudget.total * cachedRate;
    const diff = total - budgetInUsd;
    const diffLabel = diff > 0
      ? `${toDisplay(diff).toLocaleString("de-DE", { maximumFractionDigits: 0 })} ${suffix} über der Schätzung`
      : `${toDisplay(Math.abs(diff)).toLocaleString("de-DE", { maximumFractionDigits: 0 })} ${suffix} unter der Schätzung`;
    comparisonHtml = `<p class="expenses-vs-budget">Im Vergleich zur Budget-Schätzung (${lastBudget.total.toLocaleString("de-DE")} € ≈ ${budgetInUsd.toLocaleString("de-DE", { maximumFractionDigits: 0 })} $ zum aktuellen Kurs): <strong>${diffLabel}</strong></p>`;
  } else if (lastBudget) {
    comparisonHtml = `<p class="expenses-vs-budget">Ein Vergleich zur Euro-Budget-Schätzung erscheint hier, sobald der Wechselkurs geladen ist (Währungsrechner im Reiter "Rechner" einmal öffnen).</p>`;
  }

  summary.innerHTML = `
    <div class="budget-range">
      <span class="budget-range-label">Bisher ausgegeben</span>
      <span class="budget-range-value">${toDisplay(total).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${suffix}</span>
    </div>
    ${comparisonHtml}
  `;
}

function setupExpenseTracker() {
  const form = document.getElementById("expense-form");
  if (!form) return;

  const catSelect = document.getElementById("expense-category");
  catSelect.innerHTML = EXPENSE_CATEGORIES.map((c) => `<option value="${c}">${c}</option>`).join("");

  const currencySelect = document.getElementById("expense-currency-select");
  if (currencySelect) {
    currencySelect.value = Storage.getExpenseDisplayCurrency();
    currencySelect.addEventListener("change", async () => {
      Storage.setExpenseDisplayCurrency(currencySelect.value);
      if (currencySelect.value === "EUR" && !(typeof cachedRate === "number" && cachedRate > 0)) {
        try {
          cachedRate = await fetchEurUsdRate();
        } catch (e) {
          /* Kein Kurs verfügbar — Anzeige bleibt vorerst in Dollar */
        }
      }
      renderExpenses();
    });
  }

  const amountInput = document.getElementById("expense-amount");
  const taxCheckbox = document.getElementById("expense-add-tax");
  const taxRateInput = document.getElementById("expense-tax-rate");
  const taxPreview = document.getElementById("expense-tax-preview");

  function updateTaxPreview() {
    if (!taxCheckbox.checked) { taxPreview.textContent = ""; return; }
    const base = parseFloat(amountInput.value.replace(",", ".")) || 0;
    const rate = parseFloat(taxRateInput.value.replace(",", ".")) || 0;
    const withTax = base * (1 + rate / 100);
    taxPreview.textContent = base > 0 ? `= ${withTax.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $ inkl. ${rate}% Tax` : "";
  }
  amountInput.addEventListener("input", updateTaxPreview);
  taxRateInput.addEventListener("input", updateTaxPreview);
  taxCheckbox.addEventListener("change", updateTaxPreview);

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const base = parseFloat(amountInput.value.replace(",", "."));
    if (isNaN(base) || base <= 0) return;

    const taxIncluded = taxCheckbox.checked;
    const rate = parseFloat(taxRateInput.value.replace(",", ".")) || 0;
    const finalAmount = taxIncluded ? base * (1 + rate / 100) : base;

    addExpense({
      category: catSelect.value,
      amount: Math.round(finalAmount * 100) / 100,
      note: document.getElementById("expense-note").value.trim(),
      taxIncluded,
    });
    form.reset();
    taxRateInput.value = EXPENSE_DEFAULT_TAX_RATE;
    taxPreview.textContent = "";
    renderExpenses();
  });

  renderExpenses();
}
