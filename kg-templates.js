/* =========================================================
   Keysglade — Muster-Routen
========================================================= */

const ITINERARY_TEMPLATES = [
  {
    key: "south",
    label: "Süden & Keys (5 Tage)",
    description: "Miami, Everglades, Key West und die Küste bis Palm Beach — der Klassiker im Süden.",
    days: [
      { title: "Tag 1 — Miami", entryIds: ["c1", "b3"] },
      { title: "Tag 2 — Everglades & Biscayne", entryIds: ["b7", "b8"] },
      { title: "Tag 3 — Key West", entryIds: ["c5", "b5"] },
      { title: "Tag 4 — Riff & Fort Lauderdale", entryIds: ["b14", "c10"] },
      { title: "Tag 5 — Palm Beach", entryIds: ["c8"] },
    ],
  },
  {
    key: "parks",
    label: "Orlando Freizeitparks (4 Tage)",
    description: "Die großen Themenparks der Region plus Space Coast — für Familien und Achterbahn-Fans.",
    days: [
      { title: "Tag 1 — Märchenschloss-Themenpark", entryIds: ["p1"] },
      { title: "Tag 2 — Weltausstellung & Film-Themenpark", entryIds: ["p2", "p3"] },
      { title: "Tag 3 — Abenteuer- & Vulkan-Themenpark", entryIds: ["p5", "p6"] },
      { title: "Tag 4 — Space Coast", entryIds: ["p8", "b13"] },
    ],
  },
  {
    key: "gulf",
    label: "Golfküste & Natur (4 Tage)",
    description: "Tampa, St. Petersburg, Sarasota und ruhige Naturquellen an der Westküste.",
    days: [
      { title: "Tag 1 — Tampa & St. Petersburg", entryIds: ["c3", "c7"] },
      { title: "Tag 2 — Strände", entryIds: ["b1", "b2"] },
      { title: "Tag 3 — Sarasota & Anna Maria", entryIds: ["c6", "b4"] },
      { title: "Tag 4 — Crystal River & Wakulla Springs", entryIds: ["b10", "b11"] },
    ],
  },
  {
    key: "grossresort",
    label: "Vier Themenparks komplett (4 Tage)",
    description: "Vier zusammengehörige große Themenparks, ein Park pro Tag — ideal ohne Eile.",
    days: [
      { title: "Tag 1 — Märchenschloss-Themenpark", entryIds: ["p1"] },
      { title: "Tag 2 — Weltausstellungs-Themenpark", entryIds: ["p2"] },
      { title: "Tag 3 — Film-Themenpark", entryIds: ["p3"] },
      { title: "Tag 4 — Tier- und Safari-Themenpark", entryIds: ["p4"] },
    ],
  },
  {
    key: "panhandle",
    label: "Panhandle & Nordflorida (3 Tage)",
    description: "Der oft übersehene Norden: historisches St. Augustine, Pensacola und Quellen im Landesinneren.",
    days: [
      { title: "Tag 1 — St. Augustine", entryIds: ["c4"] },
      { title: "Tag 2 — Wakulla Springs & Crystal River", entryIds: ["b11", "b10"] },
      { title: "Tag 3 — Pensacola", entryIds: ["c9"] },
    ],
  },
  {
    key: "naples",
    label: "Naples & Inseln im Süden (3 Tage)",
    description: "Ruhigeres Golfküsten-Ende mit Inselflair und den Everglades-Randgebieten.",
    days: [
      { title: "Tag 1 — Naples", entryIds: ["c11"] },
      { title: "Tag 2 — Sanibel Island", entryIds: ["b15"] },
      { title: "Tag 3 — Big Cypress National Preserve", entryIds: ["b9"] },
    ],
  },
  {
    key: "spacecoast",
    label: "Space Coast & Familientag (2 Tage)",
    description: "Raumfahrt-Geschichte, Meerestiere und Strand — kompakt für einen kürzeren Abstecher.",
    days: [
      { title: "Tag 1 — Raumfahrt-Besucherzentrum", entryIds: ["p8"] },
      { title: "Tag 2 — Meerestier-Themenpark & Cocoa Beach", entryIds: ["p10", "b13"] },
    ],
  },
  {
    key: "islands",
    label: "Ruhiger Inselurlaub (3 Tage)",
    description: "Wenig Programm, viel Strand — für einen entspannten Ausklang der Reise.",
    days: [
      { title: "Tag 1 — Anna Maria Island", entryIds: ["b4"] },
      { title: "Tag 2 — Fort De Soto Park", entryIds: ["b6"] },
      { title: "Tag 3 — Sanibel Island", entryIds: ["b15"] },
    ],
  },
];

function loadItineraryTemplate(key) {
  const template = ITINERARY_TEMPLATES.find((t) => t.key === key);
  if (!template) return;

  const days = getItinerary();
  template.days.forEach((d) => {
    days.push({
      id: `day-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: d.title,
      entryIds: [...d.entryIds],
    });
  });
  saveItinerary(days);
  renderItinerary();
}

function renderTemplatePreview(key) {
  const previewEl = document.getElementById("itinerary-template-preview");
  if (!previewEl) return;
  const template = ITINERARY_TEMPLATES.find((t) => t.key === key);
  if (!template) { previewEl.innerHTML = ""; previewEl.classList.remove("active"); return; }

  const dayListHtml = template.days.map((d) => {
    const stopNames = d.entryIds
      .map((id) => ENTRIES.find((e) => e.id === id))
      .filter(Boolean)
      .map((e) => e.name)
      .join(" · ");
    return `<li><strong>${d.title}:</strong> ${stopNames}</li>`;
  }).join("");

  previewEl.innerHTML = `
    <p class="template-preview-desc">${template.description}</p>
    <ul class="template-preview-list">${dayListHtml}</ul>
    <button id="itinerary-template-confirm-btn" class="btn-primary" data-key="${template.key}">
      Ganze Route (${template.days.length} Tage) in meinen Tagesplan übernehmen
    </button>
  `;
  previewEl.classList.add("active");

  document.getElementById("itinerary-template-confirm-btn").addEventListener("click", () => {
    loadItineraryTemplate(template.key);
    previewEl.innerHTML = `<p class="template-preview-confirmed">${rwi("checkcircle")} "${template.label}" wurde in deinen Tagesplan übernommen.</p>`;
    setTimeout(() => { previewEl.innerHTML = ""; previewEl.classList.remove("active"); }, 3500);
  });
}

function setupItineraryTemplates() {
  const select = document.getElementById("itinerary-template-select");
  if (!select) return;

  select.innerHTML = `<option value="">Muster-Route wählen…</option>` +
    ITINERARY_TEMPLATES.map((t) => `<option value="${t.key}">${t.label}</option>`).join("");

  select.addEventListener("change", () => renderTemplatePreview(select.value));
}
