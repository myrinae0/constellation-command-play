// requestAnimationFrame loop that runs only while something is animating.
// It stops itself when the step function returns false, and pauses while the
// tab is hidden so phones don't burn battery in the background.

/**
 * @param {(dtMs: number) => boolean} step  return false to stop the loop
 * @returns {{start: () => void, stop: () => void, readonly running: boolean, dispose: () => void}}
 */
export function createLoop(step) {
  let rafId = 0;
  let last = 0;
  let running = false;
  let pausedByVisibility = false;

  const frame = (now) => {
    // Clamp dt so a long frame (or returning from a hidden tab) doesn't jump.
    const dt = last ? Math.min(100, now - last) : 16;
    last = now;
    if (!running) return;
    if (step(dt) === false) {
      running = false;
      return;
    }
    rafId = requestAnimationFrame(frame);
  };

  const start = () => {
    if (running) return;
    running = true;
    last = 0;
    rafId = requestAnimationFrame(frame);
  };

  const stop = () => {
    running = false;
    cancelAnimationFrame(rafId);
  };

  const onVisibility = () => {
    if (document.hidden && running) {
      pausedByVisibility = true;
      stop();
    } else if (!document.hidden && pausedByVisibility) {
      pausedByVisibility = false;
      start();
    }
  };
  document.addEventListener('visibilitychange', onVisibility);

  return {
    start,
    stop,
    get running() {
      return running;
    },
    dispose() {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    },
  };
}
