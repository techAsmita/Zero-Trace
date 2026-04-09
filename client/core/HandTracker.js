/**
 * HandTracker.js
 * Wraps MediaPipe Hands with error handling, validation, and clean lifecycle.
 */

const MEDIAPIPE_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands/';

export class HandTracker {
  #hands       = null;
  #camera      = null;
  #onResultsCb = null;
  #isRunning   = false;
  #videoEl     = null;

  #options = {
    maxNumHands:            2,
    modelComplexity:        1,
    minDetectionConfidence: 0.7,
    minTrackingConfidence:  0.7,
  };

  constructor(videoElement, options = {}) {
    if (!videoElement) throw new Error('[HandTracker] videoElement is required');
    this.#videoEl = videoElement;
    this.#options = { ...this.#options, ...options };
  }

  /** Register a callback for hand results */
  onResults(cb) {
    this.#onResultsCb = cb;
    return this; // chainable
  }

  /** Start camera + tracking */
  async start() {
    if (this.#isRunning) return;

    // Request camera permission explicitly so we can show a friendly error
    try {
      await navigator.mediaDevices.getUserMedia({ video: true });
    } catch (err) {
      throw new Error(this.#cameraErrorMessage(err));
    }

    this.#hands = new Hands({
      locateFile: (file) => `${MEDIAPIPE_CDN}${file}`,
    });

    this.#hands.setOptions(this.#options);

    this.#hands.onResults((results) => {
      if (!this.#onResultsCb) return;
      // Validate landmarks before passing downstream
      results.multiHandLandmarks = (results.multiHandLandmarks || [])
        .filter(hand => this.#isValidHand(hand));
      this.#onResultsCb(results);
    });

    this.#camera = new Camera(this.#videoEl, {
      onFrame: async () => {
        if (this.#hands) await this.#hands.send({ image: this.#videoEl });
      },
      width:  1280,
      height: 720,
      facingMode: 'user',
    });

    await this.#camera.start();
    this.#isRunning = true;
  }

  /** Graceful teardown */
  stop() {
    this.#camera?.stop();
    this.#hands?.close();
    this.#isRunning = false;
  }

  /** Validate a single hand's landmark array */
  #isValidHand(landmarks) {
    return (
      Array.isArray(landmarks) &&
      landmarks.length === 21 &&
      landmarks.every(
        p =>
          Number.isFinite(p.x) &&
          Number.isFinite(p.y) &&
          p.x >= 0 && p.x <= 1 &&
          p.y >= 0 && p.y <= 1
      )
    );
  }

  /** Human-readable camera error messages */
  #cameraErrorMessage(err) {
    if (err.name === 'NotAllowedError')
      return 'Camera permission denied. Please allow camera access and refresh.';
    if (err.name === 'NotFoundError')
      return 'No camera found on this device.';
    if (err.name === 'NotReadableError')
      return 'Camera is in use by another application.';
    return `Camera error: ${err.message}`;
  }
}