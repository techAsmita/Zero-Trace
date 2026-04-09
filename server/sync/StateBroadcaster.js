/**
 * StateBroadcaster.js
 * Batches hand state updates and flushes at a fixed rate.
 * This decouples client frame rate (60 fps) from network rate (default 30 fps),
 * drastically reducing WebSocket message volume.
 *
 * Usage (inside a Room or server):
 *   const broadcaster = new StateBroadcaster(30);
 *   broadcaster.enqueue(userId, landmarks);
 *   broadcaster.onFlush(payload => room.broadcastRaw(payload));
 */

export class StateBroadcaster {
  #queue    = new Map(); // userId → latest landmarks
  #interval = null;
  #flushCb  = null;

  constructor(fps = 30) {
    this.#interval = setInterval(() => this.#flush(), 1000 / fps);
  }

  enqueue(userId, landmarks) {
    this.#queue.set(userId, landmarks);
  }

  onFlush(cb) {
    this.#flushCb = cb;
  }

  #flush() {
    if (!this.#flushCb || this.#queue.size === 0) return;

    const payload = JSON.stringify({
      type: 'HANDS_BATCH',
      data: Object.fromEntries(this.#queue),
    });

    this.#queue.clear();
    this.#flushCb(payload);
  }

  destroy() {
    clearInterval(this.#interval);
    this.#interval = null;
  }
}