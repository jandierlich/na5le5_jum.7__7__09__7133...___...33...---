/* =========================================================
   Keysglade — Budget-Rechner
   Grobe Schätzung, keine verbindliche Preisauskunft.
========================================================= */

const ACCOMMODATION_RATES = {
  budget: 90,
  mittel: 180,
  luxus: 380,
};

const PARK_DAY_RATE = 145; // grober Richtwert pro Person/Tag für einen großen Themenpark
const CAR_DAY_RATE = 55;   // grober Richtwert Mietwagen inkl. Basisversicherung
const FOOD_DAY_RATE = 55;  // grober Richtwert pro Person/Tag Verpflegung

function calculateBudget({ travelers, nights, accommodation, parkDays, needsCar }) {
  const accTotal = ACCOMMODATION_RATES[accommodation] * nights;
  const foodTotal = FOOD_DAY_RATE * travelers * (nights + 1);
  const parkTotal = PARK_DAY_RATE * travelers * parkDays;
  const carTotal = needsCar ? CAR_DAY_RATE * (nights + 1) : 0;

  const total = accTotal + foodTotal + parkTotal + carTotal;
  const low = Math.round(total * 0.85);
  const high = Math.round(total * 1.2);

  return {
    accTotal: Math.round(accTotal),
    foodTotal: Math.round(foodTotal),
    parkTotal: Math.round(parkTotal),
    carTotal: Math.round(carTotal),
    total: Math.round(total),
    low,
    high,
  };
}

function renderBudgetResult(container, result) {
  const parts = [
    { label: "Unterkunft", value: result.accTotal, color: "#1E2A78" },
    { label: "Verpflegung", value: result.foodTotal, color: "#3355C8" },
    { label: "Themenparks", value: result.parkTotal, color: "#FF8C00" },
    { label: "Mietwagen", value: result.carTotal, color: "#E8267A" },
  ].filter((p) => p.value > 0);

  const sum = parts.reduce((s, p) => s + p.value, 0) || 1;
  let acc = 0;
  const gradientStops = parts.map((p) => {
    const start = (acc / sum) * 360;
    acc += p.value;
    const end = (acc / sum) * 360;
    return `${p.color} ${start}deg ${end}deg`;
  }).join(", ");

  container.innerHTML = `
    <div class="budget-result">
      <div class="budget-range">
        <span class="budget-range-label">Geschätzte Gesamtkosten</span>
        <span class="budget-range-value">${result.low.toLocaleString("de-DE")} € – ${result.high.toLocaleString("de-DE")} €</span>
      </div>
      <div class="budget-chart-row">
        <div class="budget-donut" style="background: conic-gradient(${gradientStops});">
          <div class="budget-donut-hole">${sum.toLocaleString("de-DE")} €</div>
        </div>
        <ul class="budget-breakdown budget-breakdown-chart">
          ${parts.map((p) => `
            <li><span><i class="budget-legend-dot" style="background:${p.color}"></i>${p.label}</span><span>${p.value.toLocaleString("de-DE")} €</span></li>
          `).join("")}
        </ul>
      </div>
      <p class="budget-disclaimer">Grobe, unverbindliche Schätzung auf Basis typischer Richtwerte ohne Flug – reale Preise hängen stark von Saison und Buchungszeitpunkt ab.</p>
    </div>
  `;
}
