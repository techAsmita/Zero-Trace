const POOL_SIZE = 500;

export class ParticleSystem {
  #pool    = [];
  #active  = [];
  #bullets = [];

  constructor() {
    for (let i = 0; i < POOL_SIZE; i++) {
      this.#pool.push(this.#createParticle());
    }
  }

  // Regular fingertip sparks
  emit(pos, color, count = 2) {
    for (let i = 0; i < count; i++) {
      const p  = this.#pool.pop() || this.#createParticle();
      p.x      = pos.x;
      p.y      = pos.y;
      p.vx     = (Math.random() - 0.5) * 8;
      p.vy     = (Math.random() - 0.5) * 8;
      p.life   = 1.0;
      p.color  = color;
      p.size   = Math.random() * 3 + 1;
      p.isBullet = false;
      this.#active.push(p);
    }
  }

  // Shoot a bullet in a direction
  shoot(pos, dirX, dirY, color) {
    const speed = 18;
    // Main bullet
    this.#bullets.push({
      x:     pos.x,
      y:     pos.y,
      vx:    dirX * speed,
      vy:    dirY * speed,
      life:  1.0,
      color: color,
      trail: [], // stores past positions for trail
    });

    // Muzzle flash particles
    for (let i = 0; i < 8; i++) {
      const p  = this.#pool.pop() || this.#createParticle();
      p.x      = pos.x;
      p.y      = pos.y;
      p.vx     = dirX * (Math.random() * 12 + 4) + (Math.random() - 0.5) * 6;
      p.vy     = dirY * (Math.random() * 12 + 4) + (Math.random() - 0.5) * 6;
      p.life   = 0.6;
      p.color  = color;
      p.size   = Math.random() * 4 + 1;
      p.isBullet = false;
      this.#active.push(p);
    }
  }

  update(ctx, quality, onHit) {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    // ── Bullets ──
    for (let i = this.#bullets.length - 1; i >= 0; i--) {
      const b = this.#bullets[i];

      // Store trail
      b.trail.push({ x: b.x, y: b.y });
      if (b.trail.length > 12) b.trail.shift();

      b.x    += b.vx;
      b.y    += b.vy;
      b.life -= 0.018;

      const hitEdge =
        b.x < 0 || b.x > W || b.y < 0 || b.y > H;

      if (b.life <= 0 || hitEdge) {
        if (hitEdge && onHit) onHit({ x: b.x, y: b.y }, b.color);
        this.#bullets.splice(i, 1);
        continue;
      }

      // Draw trail
      for (let t = 0; t < b.trail.length; t++) {
        const alpha = (t / b.trail.length) * 0.6;
        const size  = (t / b.trail.length) * 4;
        ctx.beginPath();
        ctx.arc(b.trail[t].x, b.trail[t].y, size, 0, Math.PI * 2);
        ctx.fillStyle  = b.color;
        ctx.globalAlpha = alpha;
        ctx.fill();
      }

      // Draw bullet head
      ctx.beginPath();
      ctx.arc(b.x, b.y, 5, 0, Math.PI * 2);
      ctx.fillStyle   = '#ffffff';
      ctx.globalAlpha = b.life;
      ctx.shadowBlur  = 12;
      ctx.shadowColor = b.color;
      ctx.fill();
      ctx.shadowBlur  = 0;
    }

    ctx.globalAlpha = 1.0;

    // ── Spark Particles ──
    const maxActive = quality === 'low' ? 100 : quality === 'medium' ? 250 : POOL_SIZE;

    for (let i = this.#active.length - 1; i >= 0; i--) {
      const p = this.#active[i];
      p.x    += p.vx;
      p.y    += p.vy;
      p.vy   += 0.12;
      p.life -= 0.022;

      if (p.life <= 0 || this.#active.length > maxActive) {
        this.#active.splice(i, 1);
        this.#pool.push(p);
        continue;
      }

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle   = p.color;
      ctx.globalAlpha = p.life;
      ctx.fill();
    }

    ctx.globalAlpha = 1.0;
  }

  #createParticle() {
    return { x:0, y:0, vx:0, vy:0, life:0, color:'#fff', size:1, isBullet:false };
  }
}