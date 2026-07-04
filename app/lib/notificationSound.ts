/** Plays a bright three-note ascending chime using the Web Audio API — no external audio file needed. */
export function playNotificationSound(): void {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    const now = ctx.currentTime;

    const playTone = (freq: number, start: number, duration: number, peakGain: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + start);
      gain.gain.setValueAtTime(0.0001, now + start);
      gain.gain.exponentialRampToValueAtTime(peakGain, now + start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + start + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + start);
      osc.stop(now + start + duration + 0.02);
    };

    // three ascending notes — brighter and louder than a plain two-tone beep
    playTone(740,  0,    0.18, 0.34);
    playTone(988,  0.14, 0.18, 0.36);
    playTone(1318, 0.28, 0.34, 0.4);

    setTimeout(() => ctx.close(), 900);
  } catch { /* ignore — sound is a nice-to-have, never block on it */ }
}
