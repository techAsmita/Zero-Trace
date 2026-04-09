/**
 * SocketClient.js
 * WebSocket client with:
 *  - Auto-reconnect with exponential backoff
 *  - Typed message dispatch
 *  - Throttled send to control network bandwidth
 */

export class SocketClient {
  #ws               = null;
  #url              = null;
  #handlers         = new Map();
  #reconnectCount   = 0;
  #maxRetries       = 8;
  #reconnectTimer   = null;

  // Throttle state: lastSentAt per message type
  #lastSent         = new Map();

  connect(url) {
    this.#url = url;
    this.#createSocket();
  }

  #createSocket() {
    try {
      this.#ws = new WebSocket(this.#url);
    } catch (err) {
      console.error('[SocketClient] Failed to create WebSocket:', err);
      this.#scheduleReconnect();
      return;
    }

    this.#ws.onopen = () => {
      console.info('[SocketClient] Connected');
      this.#reconnectCount = 0;
      clearTimeout(this.#reconnectTimer);
      // Server will send CONNECTED with userId
    };

    this.#ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        this.#dispatch(msg.type, msg.data);
      } catch (err) {
        console.warn('[SocketClient] Bad message:', event.data);
      }
    };

    this.#ws.onclose = (event) => {
      console.warn(`[SocketClient] Closed (code ${event.code})`);
      this.#dispatch('DISCONNECTED', {});
      this.#scheduleReconnect();
    };

    this.#ws.onerror = (err) => {
      console.error('[SocketClient] Error:', err);
    };
  }

  /** Register a message handler */
  on(type, handler) {
    this.#handlers.set(type, handler);
    return this;
  }

  /** Send immediately */
  send(type, data) {
    if (this.#ws?.readyState === WebSocket.OPEN) {
      this.#ws.send(JSON.stringify({ type, data }));
    }
  }

  /**
   * Send at most `fps` times per second per message type.
   * Always sends the latest value — intermediate values are dropped.
   */
  sendThrottled(type, data, fps = 30) {
    const interval = 1000 / fps;
    const now      = Date.now();
    const last     = this.#lastSent.get(type) || 0;

    if (now - last >= interval) {
      this.send(type, data);
      this.#lastSent.set(type, now);
    }
  }

  // ── Internals ──────────────────────────────────

  #dispatch(type, data) {
    const handler = this.#handlers.get(type);
    if (handler) handler(data);
  }

  #scheduleReconnect() {
    if (this.#reconnectCount >= this.#maxRetries) {
      console.error('[SocketClient] Max retries reached. Giving up.');
      this.#dispatch('ERROR', { message: 'Connection failed after multiple retries.' });
      return;
    }

    // Exponential backoff: 1s, 2s, 4s, 8s … capped at 30s
    const delay = Math.min(1000 * 2 ** this.#reconnectCount, 30_000);
    this.#reconnectCount++;

    console.info(`[SocketClient] Reconnecting in ${delay}ms (attempt ${this.#reconnectCount})`);
    this.#reconnectTimer = setTimeout(() => this.#createSocket(), delay);
  }
}