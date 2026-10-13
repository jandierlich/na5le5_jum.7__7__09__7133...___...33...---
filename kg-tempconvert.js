/* =========================================================
   Keysglade — Celsius/Fahrenheit-Umrechner
========================================================= */

function celsiusToFahrenheit(c) {
  return c * 9 / 5 + 32;
}
function fahrenheitToCelsius(f) {
  return (f - 32) * 5 / 9;
}

function setupTempConverter() {
  const celsiusInput = document.getElementById("tempconvert-celsius");
  const fahrenheitInput = document.getElementById("tempconvert-fahrenheit");
  if (!celsiusInput || !fahrenheitInput) return;

  celsiusInput.addEventListener("input", () => {
    const val = parseFloat(celsiusInput.value.replace(",", "."));
    if (!isNaN(val)) {
      fahrenheitInput.value = Math.round(celsiusToFahrenheit(val) * 10) / 10;
    }
  });

  fahrenheitInput.addEventListener("input", () => {
    const val = parseFloat(fahrenheitInput.value.replace(",", "."));
    if (!isNaN(val)) {
      celsiusInput.value = Math.round(fahrenheitToCelsius(val) * 10) / 10;
    }
  });
}
