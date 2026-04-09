/**
 * AudioEngine.js
 * Web Audio API — continuous hum + zap sounds.
 * Handles suspended AudioContext state (common on mobile).
 */

export class AudioEngine {
  #ctx     = null;
  #humOsc  = null;
  #humGain = null;
  #ready   = false;

  async init() {
    try {
      this.#ctx = new (window.AudioContext || window.webkitAudioContext)();

      // Some browsers start suspended — resume on first call
      if (this.#ctx.state === 'suspended') {
        await this.#ctx.resume();
      }

      this.#humOsc  = this.#ctx.createOscillator();
      this.#humGain = this.#ctx.createGain();

      this.#humOsc.type          = 'sine';
      this.#humOsc.frequency.value = 100;
      this.#humGain.gain.value   = 0; // silent until hands detected

      this.#humOsc.connect(this.#humGain);
      this.#humGain.connect(this.#ctx.destination);
      this.#humOsc.start();

      this.#ready = true;
    } catch (err) {
      console.error('[AudioEngine] init failed:', err);
      throw err;
    }
  }

  /** Short zap sound on pinch gesture */
  triggerZap() {
    if (!this.#ready) return;
    const now = this.#ctx.currentTime;
    const osc  = this.#ctx.createOscillator();
    const gain = this.#ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.12);

    gain.gain.setValueAtTime(0.45, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(this.#ctx.destination);
    osc.start();
    osc.stop(now + 0.15);
  }

  /**
   * Modulate hum based on distance between both hands' index fingers.
   * @param {Array} hands - array of hand landmark arrays
   */
  updateHum(hands) {
    if (!this.#ready || hands.length < 2) {
      this.#humGain?.gain.setTargetAtTime(0, this.#ctx.currentTime, 0.1);
      return;
    }

    const p1   = hands[0][8];
    const p2   = hands[1][8];
    const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
    const clamped = Math.min(dist, 1);

    const targetFreq   = 100 + (1 - clamped) * 320;
    const targetVolume = 0.04 + (1 - clamped) * 0.14;

    const now = this.#ctx.currentTime;
    this.#humOsc.frequency.setTargetAtTime(targetFreq,   now, 0.08);
    this.#humGain.gain.setTargetAtTime(targetVolume, now, 0.08);
  }

  /** Ensure AudioContext is running (call on any user interaction) */
  async ensureRunning() {
    if (this.#ctx?.state === 'suspended') {
      await this.#ctx.resume();
    }
  }
}