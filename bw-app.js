/* ===================== BeatWahr ===================== */
/* Alle Klänge werden per Web Audio Synthese selbst erzeugt. */
/* Keine externen Samples, keine Presets Dritter.            */
/* ======================================================= */

/* Eigene, schlichte Strich-Icons (SVG, selbst gezeichnet) statt Emojis.
   Alle nutzen currentColor, erben also die Textfarbe ihres Buttons. */
const ICONS = {
  home: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 11.5 12 4l8 7.5"/><path d="M6 10.5V20h12v-9.5"/><path d="M10 20v-5h4v5"/></svg>',
  play: '<svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor"><path d="M7 5v14l12-7z"/></svg>',
  pause:'<svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>',
  undo: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10h9a5 5 0 0 1 0 10h-3"/><path d="M8 5 3 10l5 5"/></svg>',
  tabSeq: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18"/><path d="M8 10v10"/><path d="M13 10v10"/><path d="M18 10v10"/></svg>',
  tabMore:'<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path fill="currentColor" fill-rule="evenodd" stroke="currentColor" stroke-width=".9" stroke-linejoin="round" d="M10.12 4.33L10.37 1.93A10.20 10.20 0 0 1 13.63 1.93L13.88 4.33A7.90 7.90 0 0 1 16.10 5.25L17.97 3.73A10.20 10.20 0 0 1 20.27 6.03L18.75 7.90A7.90 7.90 0 0 1 19.67 10.12L22.07 10.37A10.20 10.20 0 0 1 22.07 13.63L19.67 13.88A7.90 7.90 0 0 1 18.75 16.10L20.27 17.97A10.20 10.20 0 0 1 17.97 20.27L16.10 18.75A7.90 7.90 0 0 1 13.88 19.67L13.63 22.07A10.20 10.20 0 0 1 10.37 22.07L10.12 19.67A7.90 7.90 0 0 1 7.90 18.75L6.03 20.27A10.20 10.20 0 0 1 3.73 17.97L5.25 16.10A7.90 7.90 0 0 1 4.33 13.88L1.93 13.63A10.20 10.20 0 0 1 1.93 10.37L4.33 10.12A7.90 7.90 0 0 1 5.25 7.90L3.73 6.03A10.20 10.20 0 0 1 6.03 3.73L7.90 5.25A7.90 7.90 0 0 1 10.12 4.33ZM8.40 12a3.60 3.60 0 1 0 7.20 0a3.60 3.60 0 1 0 -7.20 0Z"/></svg>',
  book: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H12v18H6.5A2.5 2.5 0 0 1 4 18.5z"/><path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H12v18h5.5a2.5 2.5 0 0 0 2.5-2.5z"/></svg>',
  info: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v6"/><circle cx="12" cy="7.5" r="0.9" fill="currentColor" stroke="none"/></svg>',
  save: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4h11l3 3v13H5z"/><path d="M8 4v6h8V4"/><path d="M8 20v-6h8v6"/></svg>',
  folder:'<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/></svg>',
  export:'<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11"/><path d="M8 8l4-4 4 4"/><path d="M5 16v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3"/></svg>',
  close:'<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 5l14 14M19 5 5 19"/></svg>',
  tune:'<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 21v-7"/><path d="M4 10V3"/><circle cx="4" cy="12" r="2"/><path d="M12 21v-5"/><path d="M12 12V3"/><circle cx="12" cy="14" r="2"/><path d="M20 21v-11"/><path d="M20 6V3"/><circle cx="20" cy="8" r="2"/></svg>',
  reset:'<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/></svg>',
};
function icon(name){ return ICONS[name] || ''; }
function populateIcons(){
  document.querySelectorAll('[data-icon]').forEach(el=>{
    el.innerHTML = icon(el.dataset.icon);
  });
}

const TRACK_DEFS = [
  { id:'kick',   name:'Kick',    type:'drum',   color:'#dd8a2e' },
  { id:'snare',  name:'Snare',   type:'drum',   color:'#dd6a5a' },
  { id:'hat',    name:'Hi-Hat',  type:'drum',   color:'#d9a52e' },
  { id:'clap',   name:'Clap',    type:'drum',   color:'#c85f96' },
  { id:'perc',   name:'Perc',    type:'drum',   color:'#8a97c9' },
  { id:'bass',   name:'Bass',    type:'bass',   color:'#279e90', waveDefault:'sawtooth' },
  { id:'pad',    name:'Pad',     type:'pad',    color:'#e0a06a', waveDefault:'sine' },
  { id:'melody', name:'Melodie', type:'melody', color:'#8b7ff2', waveDefault:'triangle' },
];
const WAVE_TRACKS = ['bass','pad','melody'];
const PITCHED_TRACKS = ['melody'];
const WAVEFORMS = ['sine','triangle','sawtooth','square','pulse','organ'];
const REVERB_PRESETS = { room:{dur:1.0, decay:3.2}, hall:{dur:2.6, decay:1.7} };

/* Zwei zusätzliche, selbst berechnete Wellenformen (Fourier-Reihen) für mehr Klangvielfalt. */
function makePeriodicWave(ctx, name){
  if (name === 'pulse'){
    const N = 20;
    const real = new Float32Array(N), imag = new Float32Array(N);
    for (let k=1;k<N;k++) real[k] = (2/(k*Math.PI)) * Math.sin(k*Math.PI*0.25);
    return ctx.createPeriodicWave(real, imag);
  }
  if (name === 'organ'){
    const N = 9;
    const real = new Float32Array(N), imag = new Float32Array(N);
    const amps = [0,1,0.55,0.15,0.3,0.08,0.05,0.12,0.04]; // additive Register, orgelartig
    for (let k=1;k<N;k++) real[k] = amps[k] || 0;
    return ctx.createPeriodicWave(real, imag);
  }
  return null;
}
function setOscWave(osc, wave, fallback){
  if (wave === 'pulse' || wave === 'organ'){
    osc.setPeriodicWave(makePeriodicWave(audioCtx, wave));
  } else {
    osc.type = wave || fallback;
  }
}

const PATTERN_IDS = ['A','B','C','D','E','F','G','H'];
const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const CHORD_INTERVALS_MAJOR = [0,4,7];
const CHORD_INTERVALS_MINOR = [0,3,7];

function noteToFreq(name, octave){
  const idx = NOTE_NAMES.indexOf(name);
  const midi = (octave+1)*12 + idx;
  return 440 * Math.pow(2, (midi-69)/12);
}
function transposeNote(name, octave, semitones){
  const idx = NOTE_NAMES.indexOf(name) + semitones;
  const newOctave = octave + Math.floor(idx/12);
  const newIdx = ((idx%12)+12)%12;
  return { name: NOTE_NAMES[newIdx], octave: newOctave };
}
let chordQuality = 'major'; // 'major' | 'minor'
function buildChord(name, octave){
  const intervals = chordQuality === 'minor' ? CHORD_INTERVALS_MINOR : CHORD_INTERVALS_MAJOR;
  return intervals.map(iv => transposeNote(name, octave, iv));
}

/* -------------------- State -------------------- */
let audioCtx = null;
let masterGain = null;
let noiseBuffer = null;
let reverbSend = null, delaySend = null, delayNode = null, delayFeedback = null;
let reverbConvolver = null, delayToneFilter = null;
let mediaStreamDest = null;
let mediaRecorder = null;
let isExporting = false;

let isPlaying = false;

let nextNoteTime = 0.0;
const scheduleAheadTime = 0.1;
const lookaheadMs = 25;
let timerID = null;
let notesInQueue = [];

let selectedPitchTarget = null; // {trackId, step} | null

/* -------------------- Undo -------------------- */
let undoStack = [];
function pushUndo(){
  undoStack.push(JSON.stringify(project));
  if (undoStack.length > 20) undoStack.shift();
}
function undo(){
  if (!undoStack.length) return;
  const prev = JSON.parse(undoStack.pop());
  project = prev;
  if (!project.trackOrder) project.trackOrder = TRACK_DEFS.map(d=>d.id);
  if (!project.patterns[activePatternId]) activePatternId = 'A';
  tracks = project.patterns[activePatternId];
  selectedPitchTarget = null;
  document.getElementById('bpmVal').textContent = project.bpm;
  renderPatternTabs();
  renderTracks();
  syncSongMoreControls();
  applyReverbCharacter();
  applyDelayTone();
}
let currentOctave = 4;
let melodyMode = 'single'; // single | chord | arp

let currentProjectName = null;
let copiedPatternData = null;
let wakeLock = null;

let tapTimes = [];

function freshPatternTracks(stepCount){
  return TRACK_DEFS.map(def => ({
    id: def.id,
    steps: PITCHED_TRACKS.includes(def.id) ? new Array(stepCount).fill(null) : new Array(stepCount).fill(false),
    muted: false,
    solo: false,
    volume: 0.8,
    wave: waveDefaultFor(def.id),
    fxReverb: 100,
    fxDelay: 100,
    pan: 0,      // -1 (links) .. 1 (rechts)
    tune: 0,     // Halbtöne, nur bei Drum-Spuren genutzt
    decay: 1,    // Längen-Multiplikator, nur bei Drum-Spuren genutzt
    tone: 50,    // 0-100 Klangfarbe (dunkel..hell), nur bei Bass/Pad/Melodie genutzt
  }));
}

function freshProject(){
  const stepCount = 16;
  const patterns = {};
  PATTERN_IDS.forEach(pid => { patterns[pid] = freshPatternTracks(stepCount); });
  return {
    bpm:100, stepCount, swing:0, reverb:25, delay:15, metronome:false, patterns, chain:['A'],
    trackOrder: TRACK_DEFS.map(d=>d.id),
    reverbSize: 'room', delayTone: 'bright',
  };
}

/* Klangwelt-Variable früh deklariert, da freshProject()/freshPatternTracks()
   weiter unten schon beim Skriptstart aufgerufen werden und waveDefaultFor()
   (siehe Klangwelt-Abschnitt weiter unten) bereits darauf zugreift. */
let soundTheme = 'beat';

let project = freshProject();
let activePatternId = 'A';
let tracks = project.patterns[activePatternId];

let playPatternId = null;
let playStep = 0;
let playChainPos = 0;
let lastDrawnPattern = null;

/* -------------------- Audio setup -------------------- */
function makeReverbImpulse(ctx, duration, decay){
  const rate = ctx.sampleRate;
  const length = rate * duration;
  const impulse = ctx.createBuffer(2, length, rate);
  for (let ch=0; ch<2; ch++){
    const data = impulse.getChannelData(ch);
    for (let i=0;i<length;i++){
      data[i] = (Math.random()*2-1) * Math.pow(1 - i/length, decay);
    }
  }
  return impulse;
}

function ensureAudio(){
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  masterGain = audioCtx.createGain();
  masterGain.gain.value = 0.9;

  /* dezente Klangwärme: sanfter Tiefpass + leichte Sättigung */
  const warmFilter = audioCtx.createBiquadFilter();
  warmFilter.type = 'lowpass'; warmFilter.frequency.value = 9500; warmFilter.Q.value = 0.3;
  const shaper = audioCtx.createWaveShaper();
  const curve = new Float32Array(256);
  for (let i=0;i<256;i++){ const x=i/255*2-1; curve[i] = Math.tanh(x*1.4)/Math.tanh(1.4); }
  shaper.curve = curve;

  masterGain.connect(warmFilter); warmFilter.connect(shaper);

  /* sanfter "Glue"-Kompressor auf dem Gesamtsignal: verhindert Übersteuern bei vielen
     gleichzeitigen Spuren/Akkorden und lässt den Mix runder/wärmer klingen */
  const compressor = audioCtx.createDynamicsCompressor();
  compressor.threshold.value = -18;
  compressor.knee.value = 12;
  compressor.ratio.value = 3;
  compressor.attack.value = 0.006;
  compressor.release.value = 0.15;
  compressor.connect(audioCtx.destination);

  /* Aufnahme-Abgriff für den Audio-Export (Bounce) */
  mediaStreamDest = audioCtx.createMediaStreamDestination();
  compressor.connect(mediaStreamDest);

  shaper.connect(compressor);

  /* Reverb-Send: reine Summierbusse (gain=1), Zuspeisung erfolgt pro Spur in trackGainNode() */
  reverbConvolver = audioCtx.createConvolver();
  const revPreset = REVERB_PRESETS[project.reverbSize] || REVERB_PRESETS.room;
  reverbConvolver.buffer = makeReverbImpulse(audioCtx, revPreset.dur, revPreset.decay);
  reverbSend = audioCtx.createGain(); reverbSend.gain.value = 1;
  const reverbWet = audioCtx.createGain(); reverbWet.gain.value = 0.9;
  reverbSend.connect(reverbConvolver); reverbConvolver.connect(reverbWet); reverbWet.connect(compressor);

  /* Delay-Send (Feedback-Loop, Zeit an BPM gekoppelt). Ein Tiefpass im Feedback-Pfad
     lässt die Wiederholungen bei "dunklem" Delay zunehmend dumpfer klingen (Tape-Echo-Charakter). */
  delayNode = audioCtx.createDelay(2.0);
  delayNode.delayTime.value = secondsPerStep()*2;
  delayToneFilter = audioCtx.createBiquadFilter();
  delayToneFilter.type = 'lowpass';
  delayToneFilter.frequency.value = project.delayTone==='dark' ? 2400 : 11000;
  delayFeedback = audioCtx.createGain(); delayFeedback.gain.value = 0.32;
  const delayOut = audioCtx.createGain(); delayOut.gain.value = 0.8;
  delaySend = audioCtx.createGain(); delaySend.gain.value = 1;
  delaySend.connect(delayNode);
  delayNode.connect(delayToneFilter); delayToneFilter.connect(delayFeedback); delayFeedback.connect(delayNode);
  delayNode.connect(delayOut); delayOut.connect(compressor);

  const bufSize = audioCtx.sampleRate * 1;
  noiseBuffer = audioCtx.createBuffer(1, bufSize, audioCtx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i=0;i<bufSize;i++) data[i] = Math.random()*2-1;
}

/* Reverb-Größe (Raum/Halle) bzw. Delay-Klangfarbe (hell/dunkel) nachträglich umschalten,
   ohne die Audio-Kette neu aufzubauen. */
function applyReverbCharacter(){
  if (!audioCtx || !reverbConvolver) return;
  const preset = REVERB_PRESETS[project.reverbSize] || REVERB_PRESETS.room;
  reverbConvolver.buffer = makeReverbImpulse(audioCtx, preset.dur, preset.decay);
}
function applyDelayTone(){
  if (!audioCtx || !delayToneFilter) return;
  delayToneFilter.frequency.setTargetAtTime(project.delayTone==='dark' ? 2400 : 11000, audioCtx.currentTime, 0.05);
}

/* Hilfsfunktionen für Spur-Klangregler (Tune/Decay/Ton), siehe Sound-Editor pro Spur. */
function clamp(v, min, max){ return Math.max(min, Math.min(max, v)); }
/* Der Lautstärke-Regler pro Spur (0-100%) steht für gefühlte Lautstärke, nicht für die
   rohe Signal-Amplitude – das menschliche Gehör empfindet Lautstärke logarithmisch
   (Faustregel: -10dB = halb so laut). Diese Kurve rechnet die Regler-Position in die
   tatsächlich zu verwendende lineare Amplitude um, damit z. B. 50% auf dem Regler auch
   wirklich halb so laut klingt statt spürbar lauter. */
function perceptualGain(v){
  const t = clamp(v||0, 0, 1);
  return t<=0 ? 0 : Math.pow(t, 1.66);
}
function toneToCutoff(tone, minF, maxF){
  const t = clamp(tone==null ? 50 : tone, 0, 100) / 100;
  return minF * Math.pow(maxF/minF, t);
}
function trackSoundParams(track){
  return {
    fx: trackFx(track),
    pan: track.pan || 0,
    tune: track.tune || 0,
    decay: track.decay || 1,
    tone: track.tone!=null ? track.tone : 50,
  };
}

/* volume: Lautstärke dieser Klangkomponente. fx: {reverb,delay} 0-100 = individueller Spur-Send-Anteil,
   multipliziert mit dem globalen Reverb/Delay-Regler (project.reverb/project.delay).
   pan: -1 (links) .. 1 (rechts), 0/undefined = Mitte (kein Panner nötig). */
function trackGainNode(volume, fx, pan){
  const g = audioCtx.createGain();
  g.gain.value = volume;
  if (pan){
    const p = audioCtx.createStereoPanner();
    p.pan.value = clamp(pan, -1, 1);
    g.connect(p); p.connect(masterGain);
  } else {
    g.connect(masterGain);
  }
  if (fx){
    const rPct = ((fx.reverb!=null?fx.reverb:100)/100) * (project.reverb/100);
    const dPct = ((fx.delay!=null?fx.delay:100)/100) * (project.delay/100);
    if (rPct > 0.002 && reverbSend){
      const rg = audioCtx.createGain(); rg.gain.value = rPct*0.55;
      g.connect(rg); rg.connect(reverbSend);
    }
    if (dPct > 0.002 && delaySend){
      const dg = audioCtx.createGain(); dg.gain.value = dPct*0.45;
      g.connect(dg); dg.connect(delaySend);
    }
  }
  return g;
}

function audibleTrackFor(track){
  const patTracks = project.patterns[playPatternId] || tracks;
  const soloed = patTracks.some(t=>t.solo);
  if (soloed) return track.solo;
  return !track.muted;
}

/* -------------------- Synth voices -------------------- */
/* Kleiner Zufalls-Anteil (Lautstärke/Tonhöhe) für einen weniger maschinellen,
   organischeren Drum-Sound – Timing bleibt exakt quantisiert. */
function jitter(pct){ return 1 + (Math.random()*2-1)*pct; }

/* Jede Perkussions-Stimme existiert in zwei Klangwelten ("beat" = klassisch/punchig,
   "sanft" = weich/warm) und wird über die aktuell gewählte soundTheme-Variable
   angesprungen. Bass/Pad/Melodie bleiben klanglich dieselbe Engine, nur die
   Hüllkurven/Cutoffs unterscheiden sich leicht (siehe playBass). */

function playKick_beat(time, gain, params){
  const { fx, pan, tune, decay } = params;
  const dec = clamp(decay||1, 0.5, 2.2);
  const pitchMul = Math.pow(2, (tune||0)/12);
  const gj = jitter(0.08);
  const osc = audioCtx.createOscillator();
  const g = trackGainNode(1, fx, pan);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(150*pitchMul*jitter(0.03), time);
  osc.frequency.exponentialRampToValueAtTime(42*pitchMul, time+0.13);
  g.gain.setValueAtTime(gain*gj, time);
  g.gain.exponentialRampToValueAtTime(0.0001, time+0.32*dec);
  osc.connect(g);
  osc.start(time); osc.stop(time+0.34*dec);

  /* kurzer, hochpassgefilterter Klick im Attack für mehr Punch auf kleinen Lautsprechern */
  const click = audioCtx.createBufferSource();
  click.buffer = noiseBuffer;
  const hp = audioCtx.createBiquadFilter();
  hp.type='highpass'; hp.frequency.value = 2200;
  const cg = trackGainNode(1, fx, pan);
  cg.gain.setValueAtTime(gain*0.35*gj, time);
  cg.gain.exponentialRampToValueAtTime(0.0001, time+0.02);
  click.connect(hp); hp.connect(cg);
  click.start(time); click.stop(time+0.025);
}
/* "sanft": weicher, runder Tieftonschlag ohne harten Klick – wie ein sehr sanfter Herzschlag. */
function playKick_sanft(time, gain, params){
  const { fx, pan, tune, decay } = params;
  const dec = clamp(decay||1, 0.5, 2.2);
  const pitchMul = Math.pow(2, (tune||0)/12);
  const gj = jitter(0.05);
  const osc = audioCtx.createOscillator();
  const g = trackGainNode(1, fx, pan);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(108*pitchMul, time);
  osc.frequency.exponentialRampToValueAtTime(46*pitchMul, time+0.24);
  g.gain.setValueAtTime(0.0001, time);
  g.gain.exponentialRampToValueAtTime(gain*0.9*gj, time+0.018);
  g.gain.exponentialRampToValueAtTime(0.0001, time+0.6*dec);
  osc.connect(g);
  osc.start(time); osc.stop(time+0.65*dec);
}
function playKick(time, gain, params){
  return (soundTheme==='sanft' ? playKick_sanft : playKick_beat)(time, gain, params);
}

function playSnare_beat(time, gain, params){
  const { fx, pan, tune, decay } = params;
  const dec = clamp(decay||1, 0.5, 2.2);
  const pitchMul = Math.pow(2, (tune||0)/12);
  const gj = jitter(0.08);
  const noise = audioCtx.createBufferSource();
  noise.buffer = noiseBuffer;
  const bp = audioCtx.createBiquadFilter();
  bp.type = 'bandpass'; bp.frequency.value = 1800*pitchMul*jitter(0.06); bp.Q.value = 0.8;
  const ng = trackGainNode(1, fx, pan);
  ng.gain.setValueAtTime(gain*0.9*gj, time);
  ng.gain.exponentialRampToValueAtTime(0.001, time+0.18*dec);
  noise.connect(bp); bp.connect(ng);

  const osc = audioCtx.createOscillator();
  osc.type='triangle'; osc.frequency.value = 190*pitchMul*jitter(0.03);
  const og = trackGainNode(1, fx, pan);
  og.gain.setValueAtTime(gain*0.5*gj, time);
  og.gain.exponentialRampToValueAtTime(0.001, time+0.12*dec);
  osc.connect(og);

  noise.start(time); noise.stop(time+0.2*dec);
  osc.start(time); osc.stop(time+0.14*dec);
}
/* "sanft": kurzer, weicher Mallet-Pluck (wie eine Kalimba-Zinke) statt eines harten Snare-Knacks. */
function playSnare_sanft(time, gain, params){
  const { fx, pan, tune, decay } = params;
  const dec = clamp(decay||1, 0.5, 2.2);
  const pitchMul = Math.pow(2, (tune||0)/12);
  const gj = jitter(0.06);
  const baseFreq = 330*pitchMul;
  [ [1,0.55,0.16], [2.76,0.22,0.11], [5.4,0.09,0.08] ].forEach(([mult,pk,len])=>{
    const osc = audioCtx.createOscillator();
    osc.type='sine'; osc.frequency.value = baseFreq*mult*jitter(0.01);
    const g = trackGainNode(1, fx, pan);
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(gain*pk*gj, time+0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, time+len*dec);
    osc.connect(g);
    osc.start(time); osc.stop(time+(len+0.05)*dec);
  });
  const noise = audioCtx.createBufferSource();
  noise.buffer = noiseBuffer;
  const bp = audioCtx.createBiquadFilter();
  bp.type='bandpass'; bp.frequency.value = 900*pitchMul; bp.Q.value = 0.6;
  const ng = trackGainNode(1, fx, pan);
  ng.gain.setValueAtTime(0.0001, time);
  ng.gain.exponentialRampToValueAtTime(gain*0.12*gj, time+0.008);
  ng.gain.exponentialRampToValueAtTime(0.0001, time+0.11*dec);
  noise.connect(bp); bp.connect(ng);
  noise.start(time); noise.stop(time+0.13*dec);
}
function playSnare(time, gain, params){
  return (soundTheme==='sanft' ? playSnare_sanft : playSnare_beat)(time, gain, params);
}

/* isOpen: true = länger ausklingend, sonst kurz. */
function playHat_beat(time, gain, params, isOpen){
  const { fx, pan, tune, decay } = params;
  const dec = clamp(decay||1, 0.5, 2.2);
  const pitchMul = Math.pow(2, (tune||0)/12);
  const noise = audioCtx.createBufferSource();
  noise.buffer = noiseBuffer;
  const hp = audioCtx.createBiquadFilter();
  hp.type='highpass'; hp.frequency.value = (isOpen ? 6500 : 8000) * pitchMul * jitter(0.05);
  const g = trackGainNode(1, fx, pan);
  const dur = (isOpen ? 0.22 : 0.045) * dec;
  g.gain.setValueAtTime(gain*0.55*0.9*jitter(0.1), time);
  g.gain.exponentialRampToValueAtTime(0.001, time+dur);
  noise.connect(hp); hp.connect(g);
  noise.start(time); noise.stop(time+dur+0.02);
}
/* "sanft": weiches, tiefer gefiltertes Rauschband statt scharfem Zischen. */
function playHat_sanft(time, gain, params, isOpen){
  const { fx, pan, tune, decay } = params;
  const dec = clamp(decay||1, 0.5, 2.2);
  const pitchMul = Math.pow(2, (tune||0)/12);
  const noise = audioCtx.createBufferSource();
  noise.buffer = noiseBuffer;
  const bp = audioCtx.createBiquadFilter();
  bp.type='bandpass'; bp.frequency.value = (isOpen ? 3400 : 4200) * pitchMul * jitter(0.04); bp.Q.value = 0.9;
  const g = trackGainNode(1, fx, pan);
  const dur = (isOpen ? 0.5 : 0.1) * dec;
  g.gain.setValueAtTime(0.0001, time);
  g.gain.exponentialRampToValueAtTime(gain*0.3*jitter(0.08), time+0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, time+dur);
  noise.connect(bp); bp.connect(g);
  noise.start(time); noise.stop(time+dur+0.03);
}
function playHat(time, gain, params, isOpen){
  return (soundTheme==='sanft' ? playHat_sanft : playHat_beat)(time, gain, params, isOpen);
}

function playClap_beat(time, gain, params){
  const { fx, pan, tune, decay } = params;
  const dec = clamp(decay||1, 0.5, 2.2);
  const pitchMul = Math.pow(2, (tune||0)/12);
  [0,0.012,0.024].forEach(off=>{
    const noise = audioCtx.createBufferSource();
    noise.buffer = noiseBuffer;
    const bp = audioCtx.createBiquadFilter();
    bp.type='bandpass'; bp.frequency.value = 1500*pitchMul*jitter(0.08); bp.Q.value=1.2;
    const g = trackGainNode(1, fx, pan);
    g.gain.setValueAtTime(gain*0.6*0.8*jitter(0.1), time+off);
    g.gain.exponentialRampToValueAtTime(0.001, time+off+0.1*dec);
    noise.connect(bp); bp.connect(g);
    noise.start(time+off); noise.stop(time+off+0.12*dec);
  });
}
/* "sanft": runder, glockiger Zwei-Ton-Pluck mit weichem Anschlag statt Klatsch-Sound. */
function playClap_sanft(time, gain, params){
  const { fx, pan, tune, decay } = params;
  const dec = clamp(decay||1, 0.5, 2.2);
  const pitchMul = Math.pow(2, (tune||0)/12);
  const freq = 420*pitchMul;
  [ [1,0.5,0.55], [3.0,0.17,0.4] ].forEach(([mult,pk,len])=>{
    const osc = audioCtx.createOscillator();
    osc.type='sine'; osc.frequency.value = freq*mult*jitter(0.01);
    const g = trackGainNode(1, fx, pan);
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(gain*pk*jitter(0.08), time+0.025);
    g.gain.exponentialRampToValueAtTime(0.0001, time+len*dec);
    osc.connect(g);
    osc.start(time); osc.stop(time+(len+0.05)*dec);
  });
}
function playClap(time, gain, params){
  return (soundTheme==='sanft' ? playClap_sanft : playClap_beat)(time, gain, params);
}

function playPerc_beat(time, gain, params){
  const { fx, pan, tune, decay } = params;
  const dec = clamp(decay||1, 0.5, 2.2);
  const pitchMul = Math.pow(2, (tune||0)/12);
  const gj = jitter(0.1);
  const noise = audioCtx.createBufferSource();
  noise.buffer = noiseBuffer;
  const bp = audioCtx.createBiquadFilter();
  bp.type='bandpass'; bp.frequency.value = 3200*pitchMul*jitter(0.07); bp.Q.value = 3.5;
  const ng = trackGainNode(1, fx, pan);
  ng.gain.setValueAtTime(gain*0.5*0.8*gj, time);
  ng.gain.exponentialRampToValueAtTime(0.001, time+0.07*dec);
  noise.connect(bp); bp.connect(ng);

  const osc = audioCtx.createOscillator();
  osc.type='square'; osc.frequency.value = 900*pitchMul*jitter(0.04);
  const og = trackGainNode(1, fx, pan);
  og.gain.setValueAtTime(gain*0.25*0.6*gj, time);
  og.gain.exponentialRampToValueAtTime(0.001, time+0.04*dec);
  osc.connect(og);

  noise.start(time); noise.stop(time+0.08*dec);
  osc.start(time); osc.stop(time+0.05*dec);
}
/* "sanft": kleines, warmes Glockenspiel aus drei leicht unharmonischen Sinustönen, lang ausklingend. */
function playPerc_sanft(time, gain, params){
  const { fx, pan, tune, decay } = params;
  const dec = clamp(decay||1, 0.5, 2.2);
  const pitchMul = Math.pow(2, (tune||0)/12);
  const freq = 700*pitchMul;
  [ [1,0.4,0.55], [2.4,0.18,0.4], [4.1,0.08,0.3] ].forEach(([mult,pk,len])=>{
    const osc = audioCtx.createOscillator();
    osc.type='sine'; osc.frequency.value = freq*mult*jitter(0.015);
    const g = trackGainNode(1, fx, pan);
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(gain*pk*jitter(0.1), time+0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, time+len*dec);
    osc.connect(g);
    osc.start(time); osc.stop(time+(len+0.05)*dec);
  });
}
function playPerc(time, gain, params){
  return (soundTheme==='sanft' ? playPerc_sanft : playPerc_beat)(time, gain, params);
}

function playBass_beat(time, gain, wave, params, note){
  const { fx, pan, tone } = params;
  const rootNote = note || {name:'C', octave:2};
  const osc = audioCtx.createOscillator();
  setOscWave(osc, wave, 'sawtooth'); osc.frequency.value = noteToFreq(rootNote.name, rootNote.octave);
  const sub = audioCtx.createOscillator();
  sub.type = 'sine'; sub.frequency.value = noteToFreq(rootNote.name, rootNote.octave-1); // Sub-Oktave für Wärme
  const filt = audioCtx.createBiquadFilter();
  filt.type='lowpass'; filt.Q.value = 1.1;
  /* Filter-Hüllkurve: die Cutoff-Frequenz "blitzt" beim Anschlag kurz auf und schließt
     dann zur (über "Ton" einstellbaren) Grundfrequenz – gibt dem Bass Bewegung statt eines statischen Tons. */
  const baseCutoff = toneToCutoff(tone, 180, 1500);
  filt.frequency.setValueAtTime(baseCutoff*3.17, time);
  filt.frequency.exponentialRampToValueAtTime(baseCutoff, time+0.15);
  const g = trackGainNode(1, fx, pan);
  const sg = trackGainNode(1, fx, pan);
  g.gain.setValueAtTime(gain*0.75*0.9, time);
  g.gain.exponentialRampToValueAtTime(0.001, time+0.3);
  g.gain.linearRampToValueAtTime(0, time+0.33); // siehe playPadChord: exakte Null statt hartem Stopp bei Restpegel
  sg.gain.setValueAtTime(gain*0.4*0.8, time);
  sg.gain.exponentialRampToValueAtTime(0.001, time+0.34);
  sg.gain.linearRampToValueAtTime(0, time+0.37);
  osc.connect(filt); filt.connect(g);
  sub.connect(sg);
  osc.start(time); osc.stop(time+0.34);
  sub.start(time); sub.stop(time+0.38);
}
/* "sanft": warmer Sub-Ton mit sanftem Anschwellen statt gezupftem, hellem Attack. */
function playBass_sanft(time, gain, wave, params, note){
  const { fx, pan, tone } = params;
  const rootNote = note || {name:'C', octave:2};
  const osc = audioCtx.createOscillator();
  setOscWave(osc, wave, 'triangle'); osc.frequency.value = noteToFreq(rootNote.name, rootNote.octave);
  const sub = audioCtx.createOscillator();
  sub.type = 'sine'; sub.frequency.value = noteToFreq(rootNote.name, rootNote.octave-1);
  const filt = audioCtx.createBiquadFilter();
  filt.type='lowpass'; filt.Q.value = 0.7;
  const baseCutoff = toneToCutoff(tone, 150, 900);
  filt.frequency.setValueAtTime(baseCutoff*1.6, time);
  filt.frequency.exponentialRampToValueAtTime(baseCutoff, time+0.3);
  const g = trackGainNode(1, fx, pan);
  const sg = trackGainNode(1, fx, pan);
  g.gain.setValueAtTime(0.0001, time);
  g.gain.exponentialRampToValueAtTime(gain*0.7*0.9, time+0.045);
  g.gain.exponentialRampToValueAtTime(0.001, time+0.5);
  g.gain.linearRampToValueAtTime(0, time+0.53);
  sg.gain.setValueAtTime(0.0001, time);
  sg.gain.exponentialRampToValueAtTime(gain*0.45*0.8, time+0.06);
  sg.gain.exponentialRampToValueAtTime(0.001, time+0.55);
  sg.gain.linearRampToValueAtTime(0, time+0.58);
  osc.connect(filt); filt.connect(g);
  sub.connect(sg);
  osc.start(time); osc.stop(time+0.55);
  sub.start(time); sub.stop(time+0.6);
}
function playBass(time, gain, wave, params, note){
  return (soundTheme==='sanft' ? playBass_sanft : playBass_beat)(time, gain, wave, params, note);
}

function playPadChord(time, gain, wave, notes, holdDur, params){
  const { fx, pan, tone } = params;
  const cutoff = toneToCutoff(tone, 900, 7500);
  notes.forEach((note, i)=>{
    const freq = noteToFreq(note.name, note.octave);
    const filt = audioCtx.createBiquadFilter();
    filt.type='lowpass'; filt.frequency.value = cutoff;
    const g = trackGainNode(1, fx, pan);
    const peak = (gain*0.28*0.8)/Math.sqrt(notes.length);
    const attack = 0.35, release = holdDur;
    const endTime = time+attack+release;
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(peak, time+attack);
    g.gain.exponentialRampToValueAtTime(0.0001, endTime);
    /* Letzter linearer Schritt bis auf exakt 0: exponentialRampToValueAtTime kann rein
       rechnerisch nie 0 erreichen, daher bleibt sonst ein extrem leiser, aber hörbarer
       Rest-Pegel stehen, bis osc.stop() den Ton hart abschneidet – das erzeugt ein
       kaum wahrnehmbares "Klacken" am Tonende. Mit einer echten Null davor ist der
       Stopp lautlos. */
    g.gain.linearRampToValueAtTime(0, endTime+0.03);
    const stopAt = endTime+0.04;

    /* Unisono: zwei leicht gegeneinander verstimmte Oszillatoren pro Note statt einem
       einzelnen – macht den Pad-Klang voller/wärmer, ähnlich der Live-Tastatur. */
    [-6, 6].forEach(cents=>{
      const osc = audioCtx.createOscillator();
      setOscWave(osc, wave, 'sine');
      osc.frequency.value = freq * Math.pow(2, cents/1200);
      const og = audioCtx.createGain(); og.gain.value = 0.55;
      osc.connect(og); og.connect(filt);
      osc.start(time); osc.stop(stopAt);
    });
    filt.connect(g);
  });
}

/* Kurzer Pluck für Sequencer-Steps (feste Länge). */
function playMelodyNote(time, freq, gain, sustain, wave, params){
  const { fx, pan, tone } = params;
  const osc = audioCtx.createOscillator();
  setOscWave(osc, wave, 'triangle'); osc.frequency.value = freq;
  const osc2 = audioCtx.createOscillator();
  osc2.type='sine'; osc2.frequency.value = freq*2;
  const filt = audioCtx.createBiquadFilter();
  filt.type='lowpass'; filt.frequency.value = Math.max(toneToCutoff(tone, 900, 9000), freq*2.2);
  const g = trackGainNode(1, fx, pan);
  const g2 = trackGainNode(1, fx, pan);
  const isSanft = soundTheme==='sanft';
  const dur = sustain || (isSanft ? 0.4 : 0.28);
  const att = isSanft ? 0.03 : 0.01;
  g.gain.setValueAtTime(0.0001, time);
  g.gain.exponentialRampToValueAtTime(gain*0.55*0.9, time+att);
  g.gain.exponentialRampToValueAtTime(0.0001, time+dur);
  g.gain.linearRampToValueAtTime(0, time+dur+0.02);
  g2.gain.setValueAtTime(0.0001, time);
  g2.gain.exponentialRampToValueAtTime(gain*0.12*0.5, time+att);
  g2.gain.exponentialRampToValueAtTime(0.001, time+dur);
  g2.gain.linearRampToValueAtTime(0, time+dur+0.02);
  osc.connect(filt); filt.connect(g); osc2.connect(g2);
  osc.start(time); osc.stop(time+dur+0.03);
  osc2.start(time); osc2.stop(time+dur+0.03);
}

/* Gehaltener Ton für die Live-Tastatur: Attack -> Sustain -> Release, plus sanftes Vibrato.
   Werte hängen von der Klangwelt ab: "sanft" schwingt langsamer an/aus. */
const SUSTAIN_LEVEL = 0.55;
function envAttack(){ return soundTheme==='sanft' ? 0.05 : 0.015; }
function envDecay(){ return soundTheme==='sanft' ? 0.16 : 0.12; }
function envRelease(){ return soundTheme==='sanft' ? 0.85 : 0.55; }

function startMelodyNote(freq, gain, wave, params){
  const { fx, pan, tone } = params;
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  setOscWave(osc, wave, 'triangle'); osc.frequency.value = freq;
  const osc2 = audioCtx.createOscillator();
  osc2.type='sine'; osc2.frequency.value = freq*2.005;
  const osc3 = audioCtx.createOscillator();
  osc3.type='sawtooth'; osc3.frequency.value = freq*0.998;
  const filt = audioCtx.createBiquadFilter();
  filt.type='lowpass'; filt.frequency.value = Math.max(toneToCutoff(tone, 1200, 9000), freq*2.2); filt.Q.value = 0.4;

  /* sanftes Vibrato für einen singenderen, wärmeren Ton */
  const lfo = audioCtx.createOscillator();
  lfo.type='sine'; lfo.frequency.value = 5.2;
  const lfoGain = audioCtx.createGain();
  lfoGain.gain.setValueAtTime(0.0001, now);
  lfoGain.gain.linearRampToValueAtTime(freq*0.006, now+0.4);
  lfo.connect(lfoGain);
  lfoGain.connect(osc.frequency);
  lfoGain.connect(osc2.frequency);
  lfo.start(now);

  const g = trackGainNode(1, fx, pan);
  const g2 = trackGainNode(1, fx, pan);
  const g3 = trackGainNode(1, fx, pan);

  const peakMain = gain*0.5*0.9;
  const peakOvertone = gain*0.1*0.9*0.55;
  const peakDetune = gain*0.14*0.9*0.6;
  const att = envAttack(), dec = envDecay();
  [ [g,peakMain], [g2,peakOvertone], [g3,peakDetune] ].forEach(([node, pk])=>{
    node.gain.setValueAtTime(0.0001, now);
    node.gain.exponentialRampToValueAtTime(pk, now+att);
    node.gain.exponentialRampToValueAtTime(Math.max(pk*SUSTAIN_LEVEL,0.0001), now+att+dec);
  });

  osc.connect(filt); filt.connect(g);
  osc2.connect(g2);
  osc3.connect(g3);

  osc.start(now); osc2.start(now); osc3.start(now);

  return { osc, osc2, osc3, lfo, g, g2, g3, released:false };
}

function releaseMelodyNote(handle){
  if (!handle || handle.released) return;
  handle.released = true;
  const now = audioCtx.currentTime;
  const rel = envRelease();
  [handle.g, handle.g2, handle.g3].forEach(node=>{
    node.gain.cancelScheduledValues(now);
    node.gain.setValueAtTime(Math.max(node.gain.value, 0.0001), now);
    node.gain.exponentialRampToValueAtTime(0.0001, now+rel);
    node.gain.linearRampToValueAtTime(0, now+rel+0.03);
  });
  const stopAt = now+rel+0.05;
  handle.osc.stop(stopAt); handle.osc2.stop(stopAt); handle.osc3.stop(stopAt);
  handle.lfo.stop(stopAt);
}

function playClick(time, accent){
  const osc = audioCtx.createOscillator();
  osc.type='sine'; osc.frequency.value = accent ? 1800 : 1200;
  const g = trackGainNode(1);
  g.gain.setValueAtTime(accent ? 0.35*0.7 : 0.22*0.7, time);
  g.gain.exponentialRampToValueAtTime(0.0001, time+0.045);
  osc.connect(g);
  osc.start(time); osc.stop(time+0.05);
}

function trackFx(track){
  return { reverb: track.fxReverb!=null?track.fxReverb:100, delay: track.fxDelay!=null?track.fxDelay:100 };
}

function triggerTrackStep(track, time, stepData){
  if (!audibleTrackFor(track)) return;
  const gain = perceptualGain(track.volume);
  const params = trackSoundParams(track);
  switch(track.id){
    case 'kick': playKick(time, gain, params); break;
    case 'snare': playSnare(time, gain, params); break;
    case 'hat': playHat(time, gain, params, stepData===2); break;
    case 'clap': playClap(time, gain, params); break;
    case 'perc': playPerc(time, gain, params); break;
    case 'bass': playBass(time, gain, track.wave, params, stepData && stepData.notes ? stepData.notes[0] : null); break;
  }
}
function triggerPadStep(track, time, stepData){
  if (!audibleTrackFor(track)) return;
  const chord = (stepData && stepData.notes) ? stepData.notes : buildChord('C', 3);
  playPadChord(time, perceptualGain(track.volume), track.wave, chord, secondsPerStep()*4, trackSoundParams(track));
}
function triggerMelodyStep(track, noteData, time){
  if (!audibleTrackFor(track)) return;
  const notes = noteData.notes || [noteData];
  const wave = track.wave;
  const params = trackSoundParams(track);
  const vol = perceptualGain(track.volume);
  if (melodyMode === 'arp' && notes.length > 1){
    const gap = Math.min(secondsPerStep()*0.7, 0.09);
    notes.forEach((n,i)=>{
      playMelodyNote(time+i*gap, noteToFreq(n.name,n.octave), vol/Math.sqrt(notes.length), 0.22, wave, params);
    });
  } else {
    notes.forEach(n=>{
      playMelodyNote(time, noteToFreq(n.name,n.octave), vol/Math.sqrt(notes.length), 0.26, wave, params);
    });
  }
}

/* -------------------- Scheduler -------------------- */
function secondsPerStep(){ return (60.0/project.bpm)/4; }

function triggerPatternStep(patId, stepIdx, time){
  const patTracks = project.patterns[patId];
  patTracks.forEach(track=>{
    const def = TRACK_DEFS.find(d=>d.id===track.id);
    const stepData = track.steps[stepIdx];
    if (def.type === 'melody'){
      if (stepData) triggerMelodyStep(track, stepData, time);
    } else if (def.type === 'pad'){
      if (stepData) triggerPadStep(track, time, stepData);
    } else {
      if (stepData) triggerTrackStep(track, time, stepData);
    }
  });
  if (project.metronome && stepIdx % 4 === 0){
    playClick(time, stepIdx === 0);
  }
}

function scheduleAndAdvance(){
  const time = nextNoteTime;
  const stepIdx = playStep;
  const patId = playPatternId;
  const isOdd = stepIdx % 2 === 1;
  const swingOffset = isOdd ? (project.swing/100) * secondsPerStep() * 0.5 : 0;
  const triggerTime = time + swingOffset;

  triggerPatternStep(patId, stepIdx, triggerTime);
  notesInQueue.push({ step: stepIdx, pattern: patId, time: triggerTime });

  playStep++;
  if (playStep >= project.stepCount){
    playStep = 0;
    playChainPos = (playChainPos+1) % Math.max(project.chain.length,1);
    playPatternId = project.chain[playChainPos] || activePatternId;
  }
  nextNoteTime += secondsPerStep();
}

function schedulerTick(){
  while (nextNoteTime < audioCtx.currentTime + scheduleAheadTime){
    scheduleAndAdvance();
  }
  timerID = setTimeout(schedulerTick, lookaheadMs);
}

function startPlayback(){
  ensureAudio();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  if (delayNode) delayNode.delayTime.value = secondsPerStep()*2;
  isPlaying = true;
  playChainPos = 0;
  playPatternId = project.chain[0] || activePatternId;
  playStep = 0;
  lastDrawnPattern = null;
  nextNoteTime = audioCtx.currentTime + 0.05;
  notesInQueue = [];
  schedulerTick();
  requestAnimationFrame(drawLoop);
  document.getElementById('playBtn').innerHTML = icon('pause');
  document.getElementById('playBtn').classList.add('playing');
  requestWakeLock();
}

function stopPlayback(){
  isPlaying = false;
  clearTimeout(timerID);
  document.getElementById('playBtn').innerHTML = icon('play');
  document.getElementById('playBtn').classList.remove('playing');
  clearPlayheads();
  releaseWakeLock();
}

function drawLoop(){
  if (!isPlaying) return;
  let last = null;
  const now = audioCtx.currentTime;
  while (notesInQueue.length && notesInQueue[0].time < now){
    last = notesInQueue.shift();
  }
  if (last){
    if (last.pattern !== lastDrawnPattern){
      lastDrawnPattern = last.pattern;
      renderPatternTabs();
    }
    if (last.pattern === activePatternId) highlightStep(last.step);
    else clearPlayheads();
  }
  requestAnimationFrame(drawLoop);
}

function clearPlayheads(){
  document.querySelectorAll('.step.playhead').forEach(el=>el.classList.remove('playhead'));
}
function highlightStep(stepIndex){
  clearPlayheads();
  document.querySelectorAll(`.steps [data-step="${stepIndex}"]`).forEach(el=>el.classList.add('playhead'));
}

/* -------------------- Wake Lock -------------------- */
async function requestWakeLock(){
  if (!('wakeLock' in navigator)) return;
  try{ wakeLock = await navigator.wakeLock.request('screen'); }catch(e){ wakeLock = null; }
}
function releaseWakeLock(){
  if (wakeLock){ wakeLock.release().catch(()=>{}); wakeLock = null; }
}
document.addEventListener('visibilitychange', ()=>{
  if (document.visibilityState === 'visible'){
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    if (isPlaying){
      nextNoteTime = audioCtx.currentTime + 0.05;
      notesInQueue = [];
      if (!wakeLock) requestWakeLock();
    }
  }
});

/* -------------------- Rendering: pattern tabs -------------------- */
function renderPatternTabs(){
  const wrap = document.getElementById('patternTabs');
  wrap.innerHTML = '';
  PATTERN_IDS.forEach(pid=>{
    const btn = document.createElement('button');
    btn.className = 'pattern-tab' + (pid===activePatternId ? ' active':'');
    btn.innerHTML = pid + (isPlaying && playPatternId===pid ? ' <svg class="fw-i" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true"><circle cx="12" cy="12" r="4.5"/></svg>' : '');
    btn.addEventListener('click', ()=>{
      activePatternId = pid;
      tracks = project.patterns[pid];
      selectedPitchTarget = null;
      renderPatternTabs();
      renderTracks();
    });
    wrap.appendChild(btn);
  });
}

/* Zeigt unmissverständlich an, welche Spur/Step gerade auf einen Tastendruck wartet.
   Ohne diese Anzeige wirkt es so, als würde ein Tap "nichts tun", wenn man danach eine
   andere Spur antippt und die vorherige Auswahl dadurch (ohne jede Rückmeldung) verworfen wird. */
function updateKbTargetLabel(){
  const label = document.getElementById('kbTargetLabel');
  if (!label) return;
  if (selectedPitchTarget){
    const def = TRACK_DEFS.find(d=>d.id===selectedPitchTarget.trackId);
    label.innerHTML = `<svg class="fw-i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h4l10.5-10.5a2.8 2.8 0 0 0-4-4L4 16z"/><path d="M13.5 6.5l4 4"/></svg> schreibt in: ${String(def.name).replace(/[<>&]/g,'')} · Step ${selectedPitchTarget.step+1}`;
    label.classList.add('armed');
  } else {
    label.textContent = 'Melodie-Tastatur';
    label.classList.remove('armed');
  }
}

/* -------------------- Rendering: tracks -------------------- */
function renderTracks(){
  updateKbTargetLabel();
  const list = document.getElementById('trackList');
  list.innerHTML = '';
  const orderedTracks = project.trackOrder
    .map(id => tracks.find(t=>t.id===id))
    .filter(Boolean);
  orderedTracks.forEach((track, ti)=>{
    const def = TRACK_DEFS.find(d=>d.id===track.id);
    const el = document.createElement('div');
    el.className = 'seq-track' + (def.type==='melody' ? ' melody-track' : '');

    const waveHtml = WAVE_TRACKS.includes(track.id) ? `
      <select class="head-wave-select">
        ${WAVEFORMS.map(w=>`<option value="${w}" ${track.wave===w?'selected':''}>${({sine:'Sinus',triangle:'Dreieck',sawtooth:'Sägezahn',square:'Rechteck',pulse:'Puls',organ:'Orgel'})[w]}</option>`).join('')}
      </select>` : '';
    const head = document.createElement('div');
    head.className = 'seq-track-head';
    head.innerHTML = `
      <span class="track-color" style="background:${def.color}"></span>
      <span class="track-name">${def.name}</span>
      ${waveHtml}
      <button class="mini-btn tune-btn" title="Sound bearbeiten">${icon('tune')}</button>
      <div class="vol-mini">
        <button class="vol-down">–</button>
        <span class="vol-val">${Math.round(track.volume*100)}%</span>
        <button class="vol-up">+</button>
      </div>
      <button class="mini-btn mute-btn">M</button>
      <button class="mini-btn solo-btn">S</button>
    `;
    el.appendChild(head);

    head.querySelector('.tune-btn').addEventListener('click', ()=> openSoundEditor(track, def));

    const muteBtn = head.querySelector('.mute-btn');
    const soloBtn = head.querySelector('.solo-btn');
    function syncBtns(){
      muteBtn.classList.toggle('on', track.muted);
      soloBtn.classList.toggle('on', track.solo);
    }
    syncBtns();
    muteBtn.addEventListener('click', ()=>{ track.muted = !track.muted; syncBtns(); });
    soloBtn.addEventListener('click', ()=>{ track.solo = !track.solo; syncBtns(); });

    const volVal = head.querySelector('.vol-val');
    function setVolume(v){
      track.volume = Math.max(0, Math.min(1, v));
      volVal.textContent = Math.round(track.volume*100) + '%';
    }
    head.querySelector('.vol-down').addEventListener('click', ()=>{ pushUndo(); setVolume(track.volume - 0.05); });
    head.querySelector('.vol-up').addEventListener('click', ()=>{ pushUndo(); setVolume(track.volume + 0.05); });

    if (WAVE_TRACKS.includes(track.id)){
      head.querySelector('.head-wave-select').addEventListener('change', e=>{ pushUndo(); track.wave = e.target.value; });
    }

    const stepsWrap = document.createElement('div');
    stepsWrap.className = 'steps';
    stepsWrap.style.gridTemplateColumns = `repeat(${project.stepCount}, 1fr)`;
    for (let s=0; s<project.stepCount; s++){
      const stepEl = document.createElement('div');
      stepEl.className = 'step' + (s%4===0 ? ' beat':'');
      stepEl.dataset.step = s;
      stepEl.dataset.track = ti;
      stepEl.style.setProperty('--track-color', def.color);
      if (PITCHED_TRACKS.includes(track.id)){
        const noteData = track.steps[s];
        if (noteData){
          stepEl.classList.add('active');
          const notes = noteData.notes || [noteData];
          const label = document.createElement('span');
          label.className = 'melody-note-label';
          label.textContent = notes[0].name + notes[0].octave + (notes.length>1 ? '+' : '');
          stepEl.appendChild(label);
        }
        if (selectedPitchTarget && selectedPitchTarget.trackId===track.id && selectedPitchTarget.step===s){
          stepEl.style.outline = '2.5px solid var(--accent-text)';
          stepEl.style.outlineOffset = '-1px';
          stepEl.style.background = 'var(--accent-soft)';
        }
        addTapHandler(stepEl, ()=> onPitchStepClick(track, s));
      } else if (track.id === 'hat'){
        const v = track.steps[s];
        if (v){ stepEl.classList.add('active'); if (v===2) stepEl.classList.add('open'); }
        addTapHandler(stepEl, ()=>{
          pushUndo();
          const cur = track.steps[s];
          const next = cur===2 ? false : (cur ? 2 : true); // aus -> geschlossen -> offen -> aus
          track.steps[s] = next;
          stepEl.classList.toggle('active', !!next);
          stepEl.classList.toggle('open', next===2);
        });
      } else {
        if (track.steps[s]) stepEl.classList.add('active');
        addTapHandler(stepEl, ()=>{
          pushUndo();
          track.steps[s] = !track.steps[s];
          stepEl.classList.toggle('active');
        });
      }
      stepsWrap.appendChild(stepEl);
    }
    el.appendChild(stepsWrap);
    list.appendChild(el);
  });
}

/* Zuverlässige Tap-Erkennung für Steps: reagiert auf pointerdown/up statt auf das
   synthetische 'click'-Event, das das System in scrollbaren Listen gelegentlich verschluckt
   (Klaviatur-Tasten nutzen aus demselben Grund bereits pointerdown/up). Ein "Tap" zählt
   nur, wenn Start und Ende nah beieinander liegen und kein Scroll-Wisch war. */
function addTapHandler(el, fn){
  let startX=0, startY=0, tracking=false;
  el.addEventListener('pointerdown', (e)=>{
    startX = e.clientX; startY = e.clientY; tracking = true;
    el.classList.add('pressed');
  });
  el.addEventListener('pointerup', (e)=>{
    el.classList.remove('pressed');
    if (!tracking) return;
    tracking = false;
    const dx = Math.abs(e.clientX-startX), dy = Math.abs(e.clientY-startY);
    if (dx < 12 && dy < 12) fn(e);
  });
  el.addEventListener('pointercancel', ()=>{ tracking = false; el.classList.remove('pressed'); });
}

function onPitchStepClick(track, s){
  if (selectedPitchTarget && selectedPitchTarget.trackId===track.id && selectedPitchTarget.step===s){
    selectedPitchTarget = null;
    renderTracks();
    return;
  }
  if (track.steps[s]){
    pushUndo();
    track.steps[s] = null;
    selectedPitchTarget = null;
    renderTracks();
    return;
  }
  selectedPitchTarget = { trackId: track.id, step: s };
  renderTracks();
}

/* -------------------- Keyboard -------------------- */
const KB_LAYOUT = [
  {n:'C', black:false},{n:'C#', black:true},{n:'D', black:false},{n:'D#', black:true},
  {n:'E', black:false},{n:'F', black:false},{n:'F#', black:true},{n:'G', black:false},
  {n:'G#', black:true},{n:'A', black:false},{n:'A#', black:true},{n:'B', black:false},
];

function noteListForKey(n){
  return melodyMode === 'single' ? [{name:n, octave:currentOctave}] : buildChord(n, currentOctave);
}

function renderKeyboard(){
  const wrap = document.getElementById('keys');
  wrap.innerHTML = '';
  const melTrack = () => tracks.find(t=>t.id==='melody');

  KB_LAYOUT.forEach(k=>{
    const keyEl = document.createElement('div');
    keyEl.className = 'key' + (k.black ? ' black':'');
    keyEl.textContent = k.n;

    let handles = [];

    function pressKey(){
      ensureAudio();
      if (audioCtx.state==='suspended') audioCtx.resume();
      if (handles.length) return;
      keyEl.classList.add('pressed');

      /* Standard: Melodie live spielen (und ggf. gleichzeitig in einen Melodie-Step schreiben) */
      const notes = noteListForKey(k.n);
      const wave = melTrack().wave;
      const baseVol = perceptualGain(melTrack().volume);
      const params = trackSoundParams(melTrack());
      if (melodyMode === 'arp' && notes.length > 1){
        const gap = 0.1;
        notes.forEach((n,i)=>{
          setTimeout(()=>{
            if (!keyEl.classList.contains('pressed')) return;
            const h = startMelodyNote(noteToFreq(n.name,n.octave), baseVol, wave, params);
            handles.push(h);
          }, i*gap*1000);
        });
      } else {
        notes.forEach(n=>{
          handles.push(startMelodyNote(noteToFreq(n.name,n.octave), baseVol/Math.sqrt(notes.length), wave, params));
        });
      }
      if (selectedPitchTarget && selectedPitchTarget.trackId === 'melody'){
        pushUndo();
        melTrack().steps[selectedPitchTarget.step] = { notes };
        const written = selectedPitchTarget.step;
        selectedPitchTarget = { trackId:'melody', step:(written+1) % project.stepCount };
        renderTracks();
      }
    }
    function releaseKey(){
      keyEl.classList.remove('pressed');
      handles.forEach(h=>releaseMelodyNote(h));
      handles = [];
    }

    keyEl.addEventListener('pointerdown', (e)=>{ e.preventDefault(); pressKey(); });
    keyEl.addEventListener('pointerup', releaseKey);
    keyEl.addEventListener('pointercancel', releaseKey);
    keyEl.addEventListener('pointerleave', releaseKey);
    wrap.appendChild(keyEl);
  });
}

document.getElementById('octaveSelect').addEventListener('change', e=>{
  currentOctave = parseInt(e.target.value, 10);
});

document.querySelectorAll('#melodyModeSeg button').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    melodyMode = btn.dataset.mode;
    document.querySelectorAll('#melodyModeSeg button').forEach(b=>b.classList.toggle('active', b===btn));
  });
});
document.querySelector('#melodyModeSeg button[data-mode="single"]').classList.add('active');

document.querySelectorAll('#chordQualitySeg button').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    chordQuality = btn.dataset.quality;
    document.querySelectorAll('#chordQualitySeg button').forEach(b=>b.classList.toggle('active', b===btn));
  });
});
document.querySelector('#chordQualitySeg button[data-quality="major"]').classList.add('active');

/* das System: langes Halten darf kein Kopieren/Nachschlagen-Menü auslösen (aber echte Textfelder nicht stören) */
document.addEventListener('contextmenu', e=>{
  const tag = e.target.tagName;
  if (tag !== 'INPUT' && tag !== 'TEXTAREA') e.preventDefault();
});
document.addEventListener('selectionchange', ()=>{
  const active = document.activeElement;
  if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return;
  const sel = window.getSelection();
  if (sel && sel.rangeCount) sel.removeAllRanges();
});

/* Pinch-Zoom komplett unterbinden, auch wenn das System die Viewport-Angabe ignoriert */
document.addEventListener('gesturestart', e=>e.preventDefault());
document.addEventListener('gesturechange', e=>e.preventDefault());
document.addEventListener('gestureend', e=>e.preventDefault());
document.addEventListener('touchmove', e=>{
  if (e.touches && e.touches.length > 1) e.preventDefault();
}, { passive:false });

/* -------------------- Transport controls -------------------- */
document.getElementById('playBtn').addEventListener('click', ()=>{
  ensureAudio();
  if (audioCtx.state==='suspended') audioCtx.resume();
  if (isPlaying) stopPlayback(); else startPlayback();
});

function setBpm(v){
  project.bpm = Math.max(50, Math.min(220, v));
  document.getElementById('bpmVal').textContent = project.bpm;
  if (audioCtx && delayNode) delayNode.delayTime.value = secondsPerStep()*2;
}
document.getElementById('bpmUp').addEventListener('click', ()=> setBpm(project.bpm+2));
document.getElementById('bpmDown').addEventListener('click', ()=> setBpm(project.bpm-2));

document.getElementById('tapBtn').addEventListener('click', ()=>{
  const now = performance.now();
  if (tapTimes.length && now - tapTimes[tapTimes.length-1] > 2000) tapTimes = [];
  tapTimes.push(now);
  if (tapTimes.length > 5) tapTimes.shift();
  if (tapTimes.length >= 2){
    const intervals = [];
    for (let i=1;i<tapTimes.length;i++) intervals.push(tapTimes[i]-tapTimes[i-1]);
    const avg = intervals.reduce((a,b)=>a+b,0)/intervals.length;
    setBpm(Math.round(60000/avg));
  }
});

/* -------------------- Settings modal: step count / swing / fx / chain / copy-paste -------------------- */
function resizeAllPatterns(newCount){
  PATTERN_IDS.forEach(pid=>{
    project.patterns[pid].forEach(t=>{
      const def = TRACK_DEFS.find(d=>d.id===t.id);
      const fill = PITCHED_TRACKS.includes(t.id) ? null : false;
      const old = t.steps;
      const arr = new Array(newCount).fill(fill);
      for (let i=0;i<Math.min(old.length,newCount);i++) arr[i]=old[i];
      t.steps = arr;
    });
  });
  project.stepCount = newCount;
}

function syncSongMoreControls(){
  document.querySelectorAll('#stepCountSeg button').forEach(btn=>{
    btn.classList.toggle('active', parseInt(btn.dataset.val,10)===project.stepCount);
  });
  document.getElementById('swingRange').value = project.swing;
  document.getElementById('swingVal').textContent = project.swing + '%';
  document.getElementById('reverbRange').value = project.reverb;
  document.getElementById('reverbVal').textContent = project.reverb + '%';
  document.getElementById('delayRange').value = project.delay;
  document.getElementById('delayVal').textContent = project.delay + '%';
  document.querySelectorAll('#reverbSizeSeg button').forEach(btn=>{
    btn.classList.toggle('active', btn.dataset.val===project.reverbSize);
  });
  document.querySelectorAll('#delayToneSeg button').forEach(btn=>{
    btn.classList.toggle('active', btn.dataset.val===project.delayTone);
  });
  document.getElementById('metroToggle').classList.toggle('on', project.metronome);
  renderChain();
  renderTrackOrderList();
}

document.querySelectorAll('#stepCountSeg button').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    const val = parseInt(btn.dataset.val,10);
    resizeAllPatterns(val);
    selectedPitchTarget = null;
    syncSongMoreControls();
    renderTracks();
  });
});

document.querySelectorAll('#reverbSizeSeg button').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    project.reverbSize = btn.dataset.val;
    syncSongMoreControls();
    applyReverbCharacter();
  });
});
document.querySelectorAll('#delayToneSeg button').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    project.delayTone = btn.dataset.val;
    syncSongMoreControls();
    applyDelayTone();
  });
});

document.getElementById('swingRange').addEventListener('input', e=>{
  project.swing = parseInt(e.target.value,10);
  document.getElementById('swingVal').textContent = project.swing + '%';
});
document.getElementById('reverbRange').addEventListener('input', e=>{
  project.reverb = parseInt(e.target.value,10);
  document.getElementById('reverbVal').textContent = project.reverb + '%';
});
document.getElementById('delayRange').addEventListener('input', e=>{
  project.delay = parseInt(e.target.value,10);
  document.getElementById('delayVal').textContent = project.delay + '%';
});
document.getElementById('metroToggle').addEventListener('click', ()=>{
  project.metronome = !project.metronome;
  document.getElementById('metroToggle').classList.toggle('on', project.metronome);
});

function renderChain(){
  const chainRow = document.getElementById('chainRow');
  chainRow.innerHTML = '';
  if (project.chain.length===0){
    chainRow.innerHTML = '<span style="font-size:12px;color:var(--text-dim);">Kette leer – füge ein Pattern hinzu.</span>';
  }
  project.chain.forEach((pid, idx)=>{
    const chip = document.createElement('button');
    chip.className = 'chain-chip';
    chip.textContent = pid;
    chip.title = 'Tippen zum Entfernen';
    chip.addEventListener('click', ()=>{
      project.chain.splice(idx,1);
      renderChain();
    });
    chainRow.appendChild(chip);
  });

  const addRow = document.getElementById('chainAddRow');
  addRow.innerHTML = '';
  PATTERN_IDS.forEach(pid=>{
    const b = document.createElement('button');
    b.textContent = '+ ' + pid;
    b.addEventListener('click', ()=>{
      project.chain.push(pid);
      renderChain();
    });
    addRow.appendChild(b);
  });
}

document.getElementById('copyPatternBtn').addEventListener('click', (e)=>{
  copiedPatternData = JSON.parse(JSON.stringify(tracks));
  flashBtn(e.currentTarget, 'Kopiert');
});
document.getElementById('pastePatternBtn').addEventListener('click', (e)=>{
  if (!copiedPatternData) return;
  pushUndo();
  const pasted = JSON.parse(JSON.stringify(copiedPatternData));
  project.patterns[activePatternId] = pasted;
  tracks = project.patterns[activePatternId];
  selectedPitchTarget = null;
  renderTracks();
  flashBtn(e.currentTarget, 'Eingefügt');
});

/* -------------------- Projects (localStorage) -------------------- */
const STORAGE_KEY = 'beatwahr_projects_v3';

function loadAllProjects(){
  try{ return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }catch(e){ return {}; }
}
function saveAllProjects(all){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

function serializeState(){
  return JSON.parse(JSON.stringify(project));
}
function applyState(state){
  const merged = freshProject();
  merged.bpm = state.bpm || 100;
  merged.stepCount = [8,16].includes(state.stepCount) ? state.stepCount : 16;
  merged.swing = state.swing || 0;
  merged.reverb = (state.reverb !== undefined) ? state.reverb : 25;
  merged.delay = (state.delay !== undefined) ? state.delay : 15;
  merged.reverbSize = (state.reverbSize === 'hall') ? 'hall' : 'room';
  merged.delayTone = (state.delayTone === 'dark') ? 'dark' : 'bright';
  merged.metronome = !!state.metronome;
  merged.chain = (state.chain && state.chain.length) ? state.chain.slice() : ['A'];
  const validIds = TRACK_DEFS.map(d=>d.id);
  merged.trackOrder = (state.trackOrder && state.trackOrder.length && state.trackOrder.every(id=>validIds.includes(id)))
    ? Array.from(new Set([...state.trackOrder, ...validIds]))
    : validIds;
  PATTERN_IDS.forEach(pid=>{
    if (state.patterns && state.patterns[pid]){
      merged.patterns[pid] = TRACK_DEFS.map(def=>{
        const saved = state.patterns[pid].find(t=>t.id===def.id);
        const track = saved
          ? { ...freshPatternTracks(merged.stepCount).find(t=>t.id===def.id), ...saved }
          : freshPatternTracks(merged.stepCount).find(t=>t.id===def.id);
        /* Migration: einige Zwischen-Versionen speicherten Bass/Pad fälschlich als Tonhöhen-Objekt
           statt als reines an/aus – wandelt das zurück auf den festen Klang (wie ursprünglich). */
        if (def.id === 'bass' || def.id === 'pad'){
          track.steps = track.steps.map(s=> (s && typeof s === 'object') ? true : !!s);
        }
        return track;
      });
    }
  });
  project = merged;
  activePatternId = 'A';
  tracks = project.patterns[activePatternId];
  selectedPitchTarget = null;
  document.getElementById('bpmVal').textContent = project.bpm;
  renderPatternTabs();
  renderTracks();
  syncSongMoreControls();
  applyReverbCharacter();
  applyDelayTone();
}

function setProjectLabel(name){
  document.getElementById('projLabel').textContent = name || 'Unbenanntes Projekt';
}

document.getElementById('saveBtn').addEventListener('click', ()=>{
  if (!currentProjectName){
    openModal('projModal');
    document.getElementById('newProjName').focus();
    return;
  }
  const all = loadAllProjects();
  all[currentProjectName] = serializeState();
  saveAllProjects(all);
  markSaved();
  flashSaved();
});

function flashBtn(btn, text){
  const old = btn.innerHTML;
  btn.innerHTML = text;
  setTimeout(()=>btn.innerHTML = old, 700);
}
function flashSaved(){
  flashBtn(document.getElementById('saveBtn'), 'Gespeichert');
}

function renderProjectList(){
  const all = loadAllProjects();
  const wrap = document.getElementById('projList');
  wrap.innerHTML = '';
  const names = Object.keys(all);
  if (names.length===0){
    wrap.innerHTML = '<p style="color:var(--text-dim); font-size:13px; padding:8px 6px;">Noch keine gespeicherten Projekte.</p>';
    return;
  }
  names.forEach(name=>{
    const row = document.createElement('div');
    row.className = 'proj-row';
    row.innerHTML = `<span class="proj-name">${name}</span>
      <button class="load">Laden</button>
      <button class="exp">Export</button>
      <button class="del">Löschen</button>`;
    row.querySelector('.load').addEventListener('click', ()=>{
      applyState(all[name]);
      currentProjectName = name;
      setProjectLabel(name);
      markSaved();
      closeModal('projModal');
    });
    row.querySelector('.exp').addEventListener('click', ()=>{
      downloadProjectJson(name, all[name]);
    });
    row.querySelector('.del').addEventListener('click', ()=>{
      confirmAction(`Projekt „${name}" wirklich löschen? Das kann nicht rückgängig gemacht werden.`, ()=>{
        delete all[name];
        saveAllProjects(all);
        if (currentProjectName === name){ currentProjectName = null; setProjectLabel(null); }
        renderProjectList();
        showToast('Projekt gelöscht.');
      });
    });
    wrap.appendChild(row);
  });
}

/* -------------------- Audio-Export (Bounce als Aufnahme der Wiedergabe) -------------------- */
function pickRecordingMime(){
  if (typeof MediaRecorder === 'undefined') return null;
  const candidates = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'];
  for (const m of candidates){
    if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(m)) return m;
  }
  return '';
}

function exportAudioRecording(){
  if (isExporting) return;
  ensureAudio();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const mime = pickRecordingMime();
  if (mime === null){
    showToast('Audio-Export wird von diesem Browser nicht unterstützt.', 'error');
    return;
  }
  const chain = project.chain.length ? project.chain : [activePatternId];
  const totalSeconds = chain.length * project.stepCount * secondsPerStep() + 1.2; // +Ausklang/Reverb-Tail

  const exportBtn = document.getElementById('exportAudioBtn');
  const originalLabel = exportBtn.textContent;
  isExporting = true;
  exportBtn.textContent = 'Nimmt auf … (' + Math.ceil(totalSeconds) + 's)';
  exportBtn.disabled = true;

  const chunks = [];
  try{
    mediaRecorder = new MediaRecorder(mediaStreamDest.stream, mime ? { mimeType: mime } : undefined);
  }catch(err){
    isExporting = false;
    exportBtn.textContent = originalLabel;
    exportBtn.disabled = false;
    showToast('Aufnahme konnte nicht gestartet werden.', 'error');
    return;
  }
  mediaRecorder.ondataavailable = e=>{ if (e.data && e.data.size>0) chunks.push(e.data); };
  mediaRecorder.onerror = ()=>{
    isExporting = false;
    exportBtn.textContent = originalLabel;
    exportBtn.disabled = false;
  };
  mediaRecorder.onstop = ()=>{
    const blob = new Blob(chunks, { type: mime || 'audio/webm' });
    const ext = (mime && mime.startsWith('audio/mp4')) ? 'm4a' : 'webm';
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (currentProjectName || 'beatwahr-export') + '.' + ext;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    isExporting = false;
    exportBtn.textContent = originalLabel;
    exportBtn.disabled = false;
  };

  const wasPlaying = isPlaying;
  if (wasPlaying) stopPlayback();
  mediaRecorder.start();
  startPlayback();
  setTimeout(()=>{
    stopPlayback();
    if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
  }, totalSeconds*1000);
}

function downloadProjectJson(name, state){
  const payload = { name, ...state };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type:'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = (name || 'beatwahr-projekt').replace(/[^a-z0-9äöüß_-]+/gi,'_') + '.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

document.getElementById('createProjBtn').addEventListener('click', ()=>{
  const input = document.getElementById('newProjName');
  const name = input.value.trim();
  if (!name) return;
  const all = loadAllProjects();
  all[name] = serializeState();
  saveAllProjects(all);
  currentProjectName = name;
  setProjectLabel(name);
  markSaved();
  input.value = '';
  renderProjectList();
  closeModal('projModal');
});

document.getElementById('exportAudioBtn').addEventListener('click', exportAudioRecording);
document.getElementById('importBtn').addEventListener('click', ()=>{
  document.getElementById('importFile').click();
});
document.getElementById('importFile').addEventListener('change', (e)=>{
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try{
      const data = JSON.parse(reader.result);
      applyState(data);
      const name = data.name || file.name.replace(/\.json$/i,'');
      const all = loadAllProjects();
      all[name] = serializeState();
      saveAllProjects(all);
      currentProjectName = name;
      setProjectLabel(name);
      markSaved();
      renderProjectList();
      closeModal('projModal');
    }catch(err){
      showToast('Diese Datei konnte nicht gelesen werden.', 'error');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
});

/* -------------------- Modals -------------------- */

function openModal(id){
  if (id==='projModal') renderProjectList();
  document.getElementById(id).classList.add('show');
}
function closeModal(id){
  document.getElementById(id).classList.remove('show');
}
document.getElementById('projBtn').addEventListener('click', ()=>openModal('projModal'));
document.querySelectorAll('[data-close]').forEach(btn=>{
  btn.addEventListener('click', ()=>closeModal(btn.dataset.close));
});
document.querySelectorAll('.modal-overlay').forEach(ov=>{
  ov.addEventListener('click', e=>{ if (e.target===ov) ov.classList.remove('show'); });
});

/* -------------------- Toast (einheitliches Feedback statt alert()) -------------------- */
function showToast(message, type){
  const wrap = document.getElementById('toastWrap');
  const el = document.createElement('div');
  el.className = 'toast' + (type==='error' ? ' error' : ' success');
  el.textContent = message;
  wrap.appendChild(el);
  requestAnimationFrame(()=> el.classList.add('show'));
  setTimeout(()=>{
    el.classList.remove('show');
    setTimeout(()=> el.remove(), 250);
  }, 2600);
}

/* -------------------- Bestätigungsdialog für riskante Aktionen -------------------- */
function confirmAction(message, onConfirm, opts){
  opts = opts || {};
  const overlay = document.getElementById('confirmOverlay');
  document.getElementById('confirmText').textContent = message;
  const okBtn = document.getElementById('confirmOkBtn');
  const cancelBtn = document.getElementById('confirmCancelBtn');
  okBtn.textContent = opts.confirmLabel || 'Löschen';
  cancelBtn.textContent = opts.cancelLabel || 'Abbrechen';
  okBtn.classList.toggle('neutral', opts.danger === false);
  overlay.classList.add('show');
  function cleanup(){
    overlay.classList.remove('show');
    okBtn.removeEventListener('click', onOk);
    cancelBtn.removeEventListener('click', onCancel);
  }
  function onOk(){ cleanup(); onConfirm(); }
  function onCancel(){ cleanup(); if (opts.onCancel) opts.onCancel(); }
  okBtn.addEventListener('click', onOk);
  cancelBtn.addEventListener('click', onCancel);
}
document.getElementById('confirmOverlay').addEventListener('click', e=>{
  if (e.target.id==='confirmOverlay') e.target.classList.remove('show');
});

/* -------------------- Sound-Editor pro Spur (Pan / Tune+Decay bei Drums / Ton bei Bass-Pad-Melodie) -------------------- */
function openSoundEditor(track, def){
  document.getElementById('soundModalTitle').textContent = 'Sound: ' + def.name;
  const body = document.getElementById('soundModalBody');
  const isDrum = def.type === 'drum';
  body.innerHTML = `
    <div class="field-col">
      <label>Balance (Links/Rechts)<span class="field-val" id="sndPanVal"></span></label>
      <input type="range" id="sndPan" min="-100" max="100" value="${Math.round((track.pan||0)*100)}">
    </div>
    ${isDrum ? `
      <div class="field-col">
        <label>Tonhöhe<span class="field-val" id="sndTuneVal"></span></label>
        <input type="range" id="sndTune" min="-12" max="12" value="${track.tune||0}">
      </div>
      <div class="field-col">
        <label>Länge (Decay)<span class="field-val" id="sndDecayVal"></span></label>
        <input type="range" id="sndDecay" min="50" max="200" value="${Math.round((track.decay!=null?track.decay:1)*100)}">
      </div>
    ` : `
      <div class="field-col">
        <label>Klangfarbe (dunkel/hell)<span class="field-val" id="sndToneVal"></span></label>
        <input type="range" id="sndTone" min="0" max="100" value="${track.tone!=null?track.tone:50}">
      </div>
    `}
    <div class="field-col">
      <label>Nachhall-Anteil (Reverb)<span class="field-val" id="sndReverbVal"></span></label>
      <input type="range" id="sndReverb" min="0" max="100" value="${track.fxReverb!=null?track.fxReverb:100}">
    </div>
    <div class="field-col">
      <label>Echo-Anteil (Delay)<span class="field-val" id="sndDelayVal"></span></label>
      <input type="range" id="sndDelay" min="0" max="100" value="${track.fxDelay!=null?track.fxDelay:100}">
    </div>
    <button class="wide-btn" id="sndResetBtn" style="margin-top:8px;">Zurücksetzen</button>
  `;
  const panEl = document.getElementById('sndPan');
  const panVal = document.getElementById('sndPanVal');
  function syncPanLabel(){
    const v = parseInt(panEl.value,10);
    panVal.textContent = v===0 ? 'Mitte' : (v<0 ? `${-v}% links` : `${v}% rechts`);
  }
  syncPanLabel();
  panEl.addEventListener('input', ()=>{ track.pan = parseInt(panEl.value,10)/100; syncPanLabel(); });

  const reverbEl = document.getElementById('sndReverb');
  const reverbVal = document.getElementById('sndReverbVal');
  const delayEl = document.getElementById('sndDelay');
  const delayVal = document.getElementById('sndDelayVal');
  const syncReverb = ()=>{ reverbVal.textContent = reverbEl.value+'%'; };
  const syncDelay = ()=>{ delayVal.textContent = delayEl.value+'%'; };
  syncReverb(); syncDelay();
  reverbEl.addEventListener('input', ()=>{ track.fxReverb = parseInt(reverbEl.value,10); syncReverb(); });
  delayEl.addEventListener('input', ()=>{ track.fxDelay = parseInt(delayEl.value,10); syncDelay(); });

  if (isDrum){
    const tuneEl = document.getElementById('sndTune');
    const tuneVal = document.getElementById('sndTuneVal');
    const decayEl = document.getElementById('sndDecay');
    const decayVal = document.getElementById('sndDecayVal');
    const syncTune = ()=>{ const v=parseInt(tuneEl.value,10); tuneVal.textContent=(v>0?'+':'')+v; };
    const syncDecay = ()=>{ decayVal.textContent = decayEl.value+'%'; };
    syncTune(); syncDecay();
    tuneEl.addEventListener('input', ()=>{ track.tune = parseInt(tuneEl.value,10); syncTune(); });
    decayEl.addEventListener('input', ()=>{ track.decay = parseInt(decayEl.value,10)/100; syncDecay(); });
  } else {
    const toneEl = document.getElementById('sndTone');
    const toneVal = document.getElementById('sndToneVal');
    const syncTone = ()=>{ toneVal.textContent = toneEl.value+'%'; };
    syncTone();
    toneEl.addEventListener('input', ()=>{ track.tone = parseInt(toneEl.value,10); syncTone(); });
  }

  document.getElementById('sndResetBtn').addEventListener('click', ()=>{
    pushUndo();
    track.pan = 0; track.tune = 0; track.decay = 1; track.tone = 50;
    track.fxReverb = 100; track.fxDelay = 100;
    closeModal('soundModal');
    showToast('Zurückgesetzt.');
  });
  openModal('soundModal');
}

/* Liste im Einstellungen-Tab: Spur-Reihenfolge per Pfeil-Knöpfen ändern (wirkt sich auf Sequencer & Mixer-Reihenfolge aus). */
function renderTrackOrderList(){
  const wrap = document.getElementById('trackOrderList');
  if (!wrap) return;
  wrap.innerHTML = '';
  const orderedTracks = project.trackOrder.map(id => tracks.find(t=>t.id===id)).filter(Boolean);
  orderedTracks.forEach(track=>{
    const def = TRACK_DEFS.find(d=>d.id===track.id);
    const row = document.createElement('div');
    row.className = 'track-order-row';
    row.innerHTML = `
      <span class="track-color" style="background:${def.color}"></span>
      <span class="track-name">${def.name}</span>
      <div class="reorder-btns"><button class="move-up" aria-label="Nach oben"><svg class="fw-i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 15l6-6 6 6"/></svg></button><button class="move-down" aria-label="Nach unten"><svg class="fw-i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></button></div>
    `;
    row.querySelector('.move-up').addEventListener('click', ()=>{
      const idx = project.trackOrder.indexOf(track.id);
      if (idx > 0){
        pushUndo();
        [project.trackOrder[idx-1], project.trackOrder[idx]] = [project.trackOrder[idx], project.trackOrder[idx-1]];
        renderTrackOrderList();
        renderTracks();
      }
    });
    row.querySelector('.move-down').addEventListener('click', ()=>{
      const idx = project.trackOrder.indexOf(track.id);
      if (idx < project.trackOrder.length-1){
        pushUndo();
        [project.trackOrder[idx+1], project.trackOrder[idx]] = [project.trackOrder[idx], project.trackOrder[idx+1]];
        renderTrackOrderList();
        renderTracks();
      }
    });
    wrap.appendChild(row);
  });
}

/* -------------------- Navigation: Home <-> App-Shell, Tab-Leiste -------------------- */
function goToSequencer(){
  document.getElementById('homeView').style.display = 'none';
  document.getElementById('appShell').style.display = 'flex';
}
function goToHome(){
  document.getElementById('homeView').style.display = 'flex';
  document.getElementById('appShell').style.display = 'none';
}
document.getElementById('homeBtn').addEventListener('click', goToHome);
document.getElementById('tileSequencer').addEventListener('click', goToSequencer);
document.getElementById('tileGuide').addEventListener('click', ()=> openModal('guideModal'));
document.getElementById('tileInfo').addEventListener('click', ()=> openModal('infoModal'));
document.getElementById('undoBtn').addEventListener('click', undo);

function switchTab(name){
  document.querySelectorAll('.tab-content').forEach(el=>el.classList.toggle('active', el.id === 'tab-'+name));
  document.querySelectorAll('.tabbar button').forEach(btn=>btn.classList.toggle('active', btn.dataset.tab===name));
  if (name === 'settings') syncSongMoreControls();
}
document.querySelectorAll('.tabbar button').forEach(btn=>{
  btn.addEventListener('click', ()=> switchTab(btn.dataset.tab));
});

document.getElementById('exportAudioBtnMore').addEventListener('click', ()=> openModal('projModal'));

document.getElementById('resetProjectBtn').addEventListener('click', ()=>{
  confirmAction(
    'Projekt komplett zurücksetzen? Alle Patterns, Spur-Einstellungen und die Song-Kette werden auf den Ausgangszustand geleert. (Bereits gespeicherte Projekte bleiben davon unberührt – und du kannst direkt danach per Rückgängig-Pfeil wieder zurück.)',
    ()=>{
      pushUndo();
      project = freshProject();
      activePatternId = 'A';
      tracks = project.patterns[activePatternId];
      selectedPitchTarget = null;
      currentProjectName = null;
      setProjectLabel(null);
      document.getElementById('bpmVal').textContent = project.bpm;
      renderPatternTabs();
      renderTracks();
      syncSongMoreControls();
      applyReverbCharacter();
      applyDelayTone();
      showToast('Projekt zurückgesetzt.');
    },
    { confirmLabel: 'Zurücksetzen', cancelLabel: 'Abbrechen' }
  );
});

/* -------------------- Autosave / Datenverlust-Schutz --------------------
   Kein Speichern-Zwang nötig: der aktuelle Stand wird regelmäßig und beim
   Verlassen/Verstecken der App automatisch zwischengesichert. Ein expliziter
   "Speichern"/"Anlegen"/"Laden"/Import gilt als sauberer Speicherpunkt und
   löscht den Zwischenstand wieder (er ist dann ja im Projekt selbst sicher). */
const AUTOSAVE_KEY = 'beatwahr_autosave_v1';
let lastSavedSnapshot = null;

function markSaved(){
  lastSavedSnapshot = JSON.stringify(project);
  clearAutosave();
}
function hasUnsavedChanges(){
  return JSON.stringify(project) !== lastSavedSnapshot;
}
function clearAutosave(){
  try{ localStorage.removeItem(AUTOSAVE_KEY); }catch(e){}
}
function doAutosave(){
  if (!hasUnsavedChanges()) return;
  try{
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify({
      state: serializeState(), name: currentProjectName, ts: Date.now(),
    }));
  }catch(e){ /* z.B. Speicher voll – Autosave einfach überspringen */ }
}
setInterval(doAutosave, 12000);
/* Mobil-Browser feuert "beforeunload" beim Wegwischen der App oft nicht zuverlässig –
   "visibilitychange" (App tritt in den Hintergrund) ist der robustere Haken. */
document.addEventListener('visibilitychange', ()=>{
  if (document.visibilityState === 'hidden') doAutosave();
});
window.addEventListener('beforeunload', (e)=>{
  if (hasUnsavedChanges()){
    e.preventDefault();
    e.returnValue = '';
  }
});
function checkAutosaveRestore(){
  let saved = null;
  try{ saved = JSON.parse(localStorage.getItem(AUTOSAVE_KEY)); }catch(e){}
  if (!saved || !saved.state) return;
  confirmAction(
    'Es wurde ein nicht gespeicherter Stand von einem vorherigen Besuch gefunden. Wiederherstellen?',
    ()=>{
      applyState(saved.state);
      currentProjectName = saved.name || null;
      setProjectLabel(currentProjectName);
      if (currentProjectName) markSaved(); else clearAutosave();
      goToSequencer();
      showToast('Wiederhergestellt.');
    },
    {
      confirmLabel: 'Wiederherstellen', cancelLabel: 'Verwerfen', danger: false,
      onCancel: clearAutosave,
    }
  );
}

/* -------------------- Erscheinungsbild (Hell/Dunkel) --------------------
   Manuell in der App umschaltbar statt an die Systemeinstellung gekoppelt.
   FunWahr: Ohne gespeicherte Wahl startet die App im Dunkelmodus
   (Nachthimmel-Design der App-Familie); die Wahl wird dauerhaft gemerkt. */
const THEME_KEY = 'beatwahr_theme';
let uiTheme = 'dark';
function applyTheme(theme){
  uiTheme = theme;
  document.documentElement.setAttribute('data-theme', theme);
  document.querySelectorAll('#themeSeg button').forEach(btn=>{
    btn.classList.toggle('active', btn.dataset.val===theme);
  });
  applyPalette();
}
function initTheme(){
  let stored = null;
  try{ stored = localStorage.getItem(THEME_KEY); }catch(e){}
  applyTheme(stored==='light' ? 'light' : 'dark'); // zuletzt gewählter Modus; Standard: Nachthimmel-Design
}
document.querySelectorAll('#themeSeg button').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    applyTheme(btn.dataset.val);
    try{ localStorage.setItem(THEME_KEY, btn.dataset.val); }catch(e){}
  });
});

/* -------------------- Klangwelt (Beat / Sanft) --------------------
   Zwei komplett unabhängige Klangsätze für dieselben 8 Spuren, siehe die
   *_beat/*_sanft-Funktionspaare weiter oben. Betrifft nur, WIE ein Step klingt
   und die Farbpalette – Patterns, Noten und Projekte bleiben beim Umschalten
   unverändert erhalten. */
const SOUND_THEME_KEY = 'beatwahr_soundtheme';
const PALETTES = {
  beat: {
    light: { bg:'#F1EEFA', bgRaised:'#ffffff', bgTrack:'#DCD2F0', line:'#C4B4E6', text:'#241E3F', textDim:'#524370', accent:'#5A2FBE', accentText:'#5A2FBE', accentSoft:'#E6DDF7', amber:'#dd8a2e', violet:'#8b7ff2', teal:'#279e90', gold:'#d9a52e', coral:'#dd6a5a', pink:'#c85f96', danger:'#c1392f', dangerFill:'#c1392f', success:'#279e58', radius:'12px', shadow:'0 1px 2px rgba(26,31,51,.07), 0 1px 8px rgba(26,31,51,.04)' },
    dark:  { bg:'#1E1B2E', bgRaised:'#2A2440', bgTrack:'#362C52', line:'#4A3D6B', text:'#EEEAF8', textDim:'#C3B2F0', accent:'#7b3fe4', accentText:'#B9A6F5', accentSoft:'#2a1f55', amber:'#e6a94f', violet:'#a79bff', teal:'#3fc2b0', gold:'#e6bf55', coral:'#e8836f', pink:'#dd82ae', danger:'#e2564a', dangerFill:'#e2564a', success:'#3fbf78', radius:'12px', shadow:'0 1px 2px rgba(0,0,0,.35), 0 1px 10px rgba(0,0,0,.25)' },
  },
  sanft: {
    light: { bg:'#F1EEFA', bgRaised:'#ffffff', bgTrack:'#DCD2F0', line:'#C4B4E6', text:'#241E3F', textDim:'#524370', accent:'#7A2E6E', accentText:'#7A2E6E', accentSoft:'#F3E3F0', amber:'#dd8a2e', violet:'#8b7ff2', teal:'#279e90', gold:'#d9a52e', coral:'#dd6a5a', pink:'#c85f96', danger:'#c1392f', dangerFill:'#c1392f', success:'#279e58', radius:'12px', shadow:'0 1px 2px rgba(26,31,51,.07), 0 1px 8px rgba(26,31,51,.04)' },
    dark:  { bg:'#1E1B2E', bgRaised:'#2A2440', bgTrack:'#362C52', line:'#4A3D6B', text:'#EEEAF8', textDim:'#C3B2F0', accent:'#b3237a', accentText:'#ff7cc6', accentSoft:'#3a1a3f', amber:'#e6a94f', violet:'#a79bff', teal:'#3fc2b0', gold:'#e6bf55', coral:'#e8836f', pink:'#dd82ae', danger:'#e2564a', dangerFill:'#e2564a', success:'#3fbf78', radius:'12px', shadow:'0 1px 2px rgba(0,0,0,.35), 0 1px 10px rgba(0,0,0,.25)' },
  },
};
const PALETTE_VAR_MAP = { bg:'--bg', bgRaised:'--bg-raised', bgTrack:'--bg-track', line:'--line', text:'--text', textDim:'--text-dim', accent:'--accent', accentText:'--accent-text', accentSoft:'--accent-soft', amber:'--amber', violet:'--violet', teal:'--teal', gold:'--gold', coral:'--coral', pink:'--pink', danger:'--danger', dangerFill:'--danger-fill', success:'--success', radius:'--radius', shadow:'--shadow' };
function applyPalette(){
  const vars = (PALETTES[soundTheme] || PALETTES.beat)[uiTheme] || PALETTES.beat.dark;
  const root = document.documentElement;
  Object.keys(vars).forEach(key=> root.style.setProperty(PALETTE_VAR_MAP[key], vars[key]));
  const metaEl = document.getElementById('themeColorMeta');
  if (metaEl) metaEl.setAttribute('content', vars.bg);
}
function applySoundTheme(theme){
  soundTheme = (theme==='sanft') ? 'sanft' : 'beat';
  document.documentElement.setAttribute('data-soundtheme', soundTheme);
  document.querySelectorAll('#soundThemeSeg button').forEach(btn=>{
    btn.classList.toggle('active', btn.dataset.val===soundTheme);
  });
  applyPalette();
}
function initSoundTheme(){
  let stored = null;
  try{ stored = localStorage.getItem(SOUND_THEME_KEY); }catch(e){}
  applySoundTheme(stored==='sanft' ? 'sanft' : 'beat');
}
document.querySelectorAll('#soundThemeSeg button').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    applySoundTheme(btn.dataset.val);
    try{ localStorage.setItem(SOUND_THEME_KEY, btn.dataset.val); }catch(e){}
  });
});

/* Wellenform-Vorgabe für neu angelegte Bass/Pad/Melodie-Steps: hängt von der
   aktuell gewählten Klangwelt ab. Bereits vorhandene Spuren behalten ihre
   eigene, individuell gewählte Wellenform unverändert. */
function waveDefaultFor(trackId){
  if (trackId==='melody') return soundTheme==='sanft' ? 'sine' : 'triangle';
  if (trackId==='bass') return soundTheme==='sanft' ? 'triangle' : 'sawtooth';
  if (trackId==='pad') return 'sine';
  return null;
}

/* -------------------- Init -------------------- */
populateIcons();
initTheme();
initSoundTheme();
renderPatternTabs();
renderTracks();
renderKeyboard();
setBpm(project.bpm);
setProjectLabel(null);
lastSavedSnapshot = JSON.stringify(project); // Basislinie, OHNE einen evtl. vorhandenen Autosave zu löschen
checkAutosaveRestore();


