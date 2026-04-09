/**
 * GestureDetector.js
 * Stateless gesture analysis on MediaPipe hand landmarks.
 * Returns structured gesture info every frame.
 */

const PINCH_THRESHOLD = 0.055; // Normalized distance

export class GestureDetector {
  #lastPinchState = [false, false];

  /**
   * Analyse landmarks and return gesture info.
   * @param {Array} hands - array of 21-landmark arrays
   * @returns {{ name: string, spread: number, pinch: boolean, pinchPos: {x,y}|null }}
   */
  detect(hands) {
    if (!hands || hands.length === 0) {
      this.#lastPinchState = [false, false];
      return { name: 'None', spread: 0, pinch: false, pinchPos: null };
    }

    let pinchTriggered = false;
    let pinchPos       = null;

    hands.forEach((hand, idx) => {
      const thumb = hand[4];
      const index = hand[8];
      const dist  = Math.hypot(thumb.x - index.x, thumb.y - index.y);
      const isPinching = dist < PINCH_THRESHOLD;

      // Only fire on the leading edge (press, not hold)
      if (isPinching && !this.#lastPinchState[idx]) {
        pinchTriggered = true;
        pinchPos = {
          x: (thumb.x + index.x) / 2,
          y: (thumb.y + index.y) / 2,
        };
      }
      this.#lastPinchState[idx] = isPinching;
    });

    // Spread from first hand: distance index ↔ pinky tip
    const firstHand = hands[0];
    const spread    = firstHand
      ? Math.min(Math.round(Math.hypot(
          firstHand[8].x - firstHand[20].x,
          firstHand[8].y - firstHand[20].y
        ) * 300), 100)
      : 0;

    let name = 'None';
    if (pinchTriggered)      name = 'PINCH ⚡';
    else if (spread > 55)    name = 'Open Hand';
    else if (spread < 20)    name = 'Fist';
    else                     name = 'Relaxed';

    return { name, spread, pinch: pinchTriggered, pinchPos };
  }
}