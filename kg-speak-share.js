/* =========================================================
   Keysglade — Sprachausgabe & Teilen
   Beides nutzt ausschließlich eingebaute Browser-APIs
   (Web Speech API, Web Share API) — keine externen Dienste,
   keine Datenübertragung.
========================================================= */

function speakPhrase(text) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = 0.92;
  window.speechSynthesis.speak(utterance);
}

function canShare() {
  return "share" in navigator;
}

async function shareContent({ title, text, url }) {
  if (!canShare()) return false;
  try {
    await navigator.share({ title, text, url });
    return true;
  } catch (e) {
    // Abbruch durch Nutzer:in oder nicht unterstützt — kein Fehlerdialog nötig
    return false;
  }
}
