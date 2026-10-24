// Suono breve e vibrazione per l'esito. Su iOS l'audio parte solo dopo un tocco dell'utente
// (unlockAudio al primo tocco) e Safari non supporta navigator.vibrate: resta solo il suono.
import type { Tone } from './present';

let audio: AudioContext | null = null;

export function unlockAudio() {
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    audio ??= Ctor ? new Ctor() : null;
    if (audio?.state === 'suspended') void audio.resume();
  } catch {
    audio = null;
  }
}

const TONES: Record<Tone, { notes: number[]; wave: OscillatorType; vibrate: number[] }> = {
  success: { notes: [880, 1320], wave: 'sine', vibrate: [80] },
  warning: { notes: [520, 520], wave: 'triangle', vibrate: [120, 80, 120] },
  danger: { notes: [180], wave: 'sawtooth', vibrate: [300, 100, 300] },
};

export function signal(tone: Tone, muted: boolean) {
  const t = TONES[tone];
  try {
    navigator.vibrate?.(t.vibrate);
  } catch {
    // Alcuni browser lanciano un errore se la pagina non ha ancora ricevuto un tocco.
  }
  if (muted || !audio) return;
  try {
    t.notes.forEach((freq, i) => {
      const osc = audio!.createOscillator();
      const gain = audio!.createGain();
      osc.type = t.wave;
      osc.frequency.value = freq;
      gain.gain.value = 0.12;
      osc.connect(gain).connect(audio!.destination);
      const start = audio!.currentTime + i * 0.12;
      osc.start(start);
      osc.stop(start + (tone === 'danger' ? 0.35 : 0.1));
    });
  } catch {
    // Audio non disponibile: resta l'esito a schermo.
  }
}
