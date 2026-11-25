/* =========================================================
   Keysglade — Gezeiten
   HINWEIS: NOAA CO-OPS liefert bei direkten Browser-Anfragen
   (fetch) keinen Access-Control-Allow-Origin-Header und blockt
   damit clientseitige Aufrufe per CORS-Richtlinie — unabhängig
   vom Code hier, das lässt sich ohne eigenen Proxy-Server nicht
   umgehen. Deshalb verlinkt Keysglade stattdessen direkt auf die
   offizielle, garantiert funktionierende NOAA-Stationsseite.
========================================================= */

const TIDE_STATIONS = [
  { name: "Miami Beach", id: "8723170" },
  { name: "Key West", id: "8724580" },
  { name: "Clearwater Beach", id: "8726724" },
  { name: "Naples", id: "8725110" },
  { name: "Pensacola", id: "8729840" },
  { name: "Jacksonville (Mayport)", id: "8720218" },
];

function renderTideLink(container, station) {
  const url = `https://tidesandcurrents.noaa.gov/stationhome.html?id=${station.id}`;
  container.innerHTML = `
    <div class="tide-link-card">
      <p>Live-Gezeitendaten lassen sich aus technischen Gründen nicht direkt in der App anzeigen
         (NOAA blockiert das Abrufen durch Webseiten anderer Anbieter). Die aktuelle Vorhersage
         für <strong>${station.name}</strong> gibt es aber direkt und zuverlässig bei NOAA selbst:</p>
      <a href="${url}" target="_blank" rel="noopener noreferrer" class="btn-primary tide-link-btn">
        ${rwi("waves")} Gezeiten für ${station.name} auf NOAA.gov ansehen
      </a>
    </div>
  `;
}

function setupTidesPage() {
  const select = document.getElementById("tide-station-select");
  if (!select) return;
  select.innerHTML = TIDE_STATIONS.map((s) => `<option value="${s.name}">${s.name}</option>`).join("");

  const lastStation = Storage.getLastTideStation();
  select.value = lastStation;

  const container = document.getElementById("tide-container");
  const render = () => {
    const station = TIDE_STATIONS.find((s) => s.name === select.value) || TIDE_STATIONS[0];
    renderTideLink(container, station);
  };
  render();

  select.addEventListener("change", () => {
    Storage.setLastTideStation(select.value);
    render();
  });
}
