/**
 * RippleSystem.js
 * Expanding shockwave rings triggered by pinch gestures.
 */

export class RippleSystem {
  #ripples = [];

  add({ x, y, color }) {
    this.#ripples.push({
      x,
      y,
      radius:    0,
      maxRadius: 150 + Math.random() * 120,
      life:      1.0,
      color,
    });
  }

  update(ctx) {
    for (let i = this.#ripples.length - 1; i >= 0; i--) {
      const r   = this.#ripples[i];
      r.radius += (r.maxRadius - r.radius) * 0.1; // ease out
      r.life   -= 0.03;

      if (r.life <= 0) {
        this.#ripples.splice(i, 1);
        continue;
      }

      ctx.beginPath();
      ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
      ctx.strokeStyle  = r.color;
      ctx.lineWidth    = 4 * r.life;
      ctx.globalAlpha  = r.life;
      ctx.stroke();
    }
    ctx.globalAlpha = 1.0;
  }
}