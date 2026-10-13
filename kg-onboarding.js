/* =========================================================
   Keysglade — Onboarding-Tour
========================================================= */

const ONBOARDING_STEPS = [
  {
    title: "Willkommen bei Keysglade",
    text: "Dein Reisebegleiter für Florida — mit Katalog, Karte, Wetter, Reiseplaner, Tipps und ein paar Spielen für die Wartezeit. Eine kurze Tour in vier Schritten.",
  },
  {
    title: "Entdecken",
    text: "Über 110 Ziele und Themen — durchsuchbar, nach Kategorie und Region filterbar. Tippe auf die Florida-Karte oben, um direkt nach Regionen zu filtern.",
  },
  {
    title: "Karte",
    text: "Alle Ziele auf einer echten Karte, mit Kategorie-Filtern, Vollbild-Ansicht und einem Standort-Button. Im Reiter 'In der Nähe' findest du per Standortabfrage die nächstgelegenen Ziele — dein Standort wird nirgends gespeichert.",
  },
  {
    title: "Reiseplaner",
    text: "Stelle einen Tagesplan mit Routenberechnung zusammen (auch aus fertigen Muster-Routen), behalte Budget und Ausgaben im Blick, hake die Packliste ab und halte Notizen sowie ein kleines Reise-Tagebuch fest.",
  },
  {
    title: "Merkliste, Tipps & Spiele",
    text: "Merke dir Ziele fürs nächste Mal (Lesezeichen-Symbol) oder markiere sie als besucht (Kreis antippen). Im Menüpunkt Tipps findest du kategorisierte Praxishinweise und den Sprachführer, unter Spiele ein Quiz und zwei kleine Zahlenspiele für die Wartezeit — alles bleibt privat auf deinem Gerät. Los geht's!",
  },
];

/* Einheitliche Einführung der WahrZentrale (wz-onboarding.js) – gleiche Optik wie in allen Apps.
   Gesehen-Status bleibt in Storage (Teil der Keysglade-Sicherung). */
const KG_ONB_ICONS = [
  '<img src="kg-icon-192.png" alt="" style="width:100%;height:100%;border-radius:inherit;display:block">',
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.3"/><path d="M15.3 15.3l5.2 5.2"/></svg>',
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 4.5L3.5 6.6v13l5.5-2.1 6 2.1 5.5-2.1v-13L15 6.6z"/><path d="M9 4.5v13M15 6.6v13"/></svg>',
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15.5" rx="2.6"/><path d="M3.5 9.6h17M8 3v4M16 3v4"/></svg>',
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6.5 3.5h11v17l-5.5-4-5.5 4z"/></svg>',
];

let kgOnb = null;

function openOnboarding() {
  if (kgOnb) kgOnb.show();
}

function setupOnboarding() {
  if (typeof wzOnboarding !== "function") return;
  // eigener Schlüssel nur für die Anzeige-Steuerung; maßgeblich bleibt Storage.getOnboardingSeen()
  const key = "kg-onb-v2";
  try { if (Storage.getOnboardingSeen()) localStorage.setItem(key, "1"); } catch (e) {}
  kgOnb = wzOnboarding({
    key,
    slides: ONBOARDING_STEPS.map((st, i) => ({ iconHtml: KG_ONB_ICONS[i] || "", title: st.title, text: st.text })),
    onClose: () => Storage.setOnboardingSeen(true),
  });

  const helpBtn = document.getElementById("help-btn");
  if (helpBtn) helpBtn.addEventListener("click", openOnboarding);
}
