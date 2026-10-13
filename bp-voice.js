// bp-voice.js — Sprachnotizen aufnehmen und abspielen (MediaRecorder-API, läuft komplett offline im Browser)

function createVoiceRecorder() {
  let mediaRecorder = null;
  let chunks = [];
  let stream = null;

  return {
    async start() {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : 'audio/webm';
      mediaRecorder = new MediaRecorder(stream, { mimeType: mime });
      chunks = [];
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      mediaRecorder.start();
    },
    stop() {
      return new Promise((resolve, reject) => {
        if (!mediaRecorder) { reject(new Error('Keine Aufnahme aktiv')); return; }
        mediaRecorder.onstop = () => {
          const blob = new Blob(chunks, { type: mediaRecorder.mimeType });
          stream.getTracks().forEach((t) => t.stop());
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        };
        mediaRecorder.stop();
      });
    },
  };
}

function playVoiceNote(dataUrl) {
  const audio = new Audio(dataUrl);
  audio.play().catch(() => alert('Sprachnotiz konnte nicht abgespielt werden.'));
}
