// The ship's bell, synthesized with Web Audio (no sound files). Created lazily
// on first use, which is always after a tap, so mobile browsers allow it.

let ctx = null;

/** Ring the bell once. Silently does nothing where audio is unavailable. */
export function ringBell(volume = 0.25) {
  try {
    const AC = window.AudioContext || /** @type {any} */ (window).webkitAudioContext;
    if (!AC) return;
    ctx = ctx || new AC();
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;
    const master = ctx.createGain();
    master.gain.value = volume;
    master.connect(ctx.destination);
    // A bell is a few inharmonic partials that decay at different rates.
    const partials = [
      [220, 1, 4.5], [440 * 1.19, 0.6, 3.2], [220 * 3.01, 0.45, 2.4], [220 * 4.17, 0.3, 1.6], [220 * 5.43, 0.18, 1.1],
    ];
    for (const [freq, amp, decay] of partials) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(amp, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + decay);
      osc.connect(gain).connect(master);
      osc.start(now);
      osc.stop(now + decay + 0.1);
    }
  } catch {
    /* audio is optional */
  }
}
