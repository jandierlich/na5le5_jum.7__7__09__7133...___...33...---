/* =========================================================
   Keysglade — Ambiente-Sound (Wellenrauschen)
   Wird vollständig im Browser aus gefiltertem Rauschen
   erzeugt (Web Audio API) — keine Audiodatei, keine
   externe Quelle, keine Lizenzfragen.
========================================================= */

let ambientAudioCtx = null;
let ambientNodes = null;
let ambientPlaying = false;

function createNoiseBuffer(ctx, seconds = 4) {
  const bufferSize = ctx.sampleRate * seconds;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let lastOut = 0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    // Braunsches Rauschen (tiefpassgefiltert) klingt eher nach Wellen/Wind als weißes Rauschen
    lastOut = (lastOut + 0.02 * white) / 1.02;
    data[i] = lastOut * 3.5;
  }
  return buffer;
}

function startAmbientSound() {
  if (ambientPlaying) return;
  ambientAudioCtx = ambientAudioCtx || new (window.AudioContext || window.webkitAudioContext)();
  const ctx = ambientAudioCtx;

  const noiseSource = ctx.createBufferSource();
  noiseSource.buffer = createNoiseBuffer(ctx);
  noiseSource.loop = true;

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 700;

  const gain = ctx.createGain();
  gain.gain.value = 0;

  // Langsame Lautstärke-Schwankung simuliert an- und abschwellende Wellen
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.12;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 0.05;
  lfo.connect(lfoGain);
  lfoGain.connect(gain.gain);

  noiseSource.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.09, ctx.currentTime + 1.2);

  noiseSource.start();
  lfo.start();

  ambientNodes = { noiseSource, filter, gain, lfo };
  ambientPlaying = true;
}

function stopAmbientSound() {
  if (!ambientPlaying || !ambientNodes) return;
  const ctx = ambientAudioCtx;
  const { noiseSource, gain, lfo } = ambientNodes;

  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.6);
  setTimeout(() => {
    noiseSource.stop();
    lfo.stop();
  }, 700);

  ambientPlaying = false;
  ambientNodes = null;
}

function setupAmbientSound() {
  const btn = document.getElementById("ambient-toggle-btn");
  if (!btn) return;

  btn.addEventListener("click", () => {
    if (ambientPlaying) {
      stopAmbientSound();
      btn.innerHTML = rwi("waves") + " Wellenrauschen";
      btn.setAttribute("aria-pressed", "false");
    } else {
      startAmbientSound();
      btn.innerHTML = rwi("mute") + " Wellenrauschen stoppen";
      btn.setAttribute("aria-pressed", "true");
    }
  });
}
