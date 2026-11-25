/* =========================================================
   Keysglade — Trinkgeld-Rechner
========================================================= */

function setupTipCalculator() {
  const billInput = document.getElementById("tip-bill");
  const percentButtons = document.querySelectorAll(".tip-percent-btn");
  const customPercent = document.getElementById("tip-custom-percent");
  const peopleInput = document.getElementById("tip-people");
  const resultEl = document.getElementById("tip-result");

  if (!billInput) return;

  let selectedPercent = 18;

  function update() {
    const bill = parseFloat(billInput.value.replace(",", ".")) || 0;
    const people = parseInt(peopleInput.value, 10) || 1;
    const tipAmount = bill * (selectedPercent / 100);
    const total = bill + tipAmount;

    resultEl.innerHTML = `
      <div class="budget-range">
        <span class="budget-range-label">Trinkgeld (${selectedPercent}%)</span>
        <span class="budget-range-value">${tipAmount.toFixed(2)} $</span>
      </div>
      <ul class="budget-breakdown">
        <li><span>Gesamtbetrag inkl. Trinkgeld</span><span>${total.toFixed(2)} $</span></li>
        <li><span>Pro Person (${people} ${people === 1 ? "Person" : "Personen"})</span><span>${(total / people).toFixed(2)} $</span></li>
      </ul>
    `;
  }

  percentButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      percentButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      selectedPercent = parseInt(btn.dataset.percent, 10);
      customPercent.value = "";
      update();
    });
  });

  customPercent.addEventListener("input", () => {
    const val = parseFloat(customPercent.value);
    if (!isNaN(val)) {
      percentButtons.forEach((b) => b.classList.remove("active"));
      selectedPercent = val;
      update();
    }
  });

  billInput.addEventListener("input", update);
  peopleInput.addEventListener("input", update);
  update();
}
