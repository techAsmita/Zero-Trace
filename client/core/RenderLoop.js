/**
 * RenderLoop.js
 * Orchestrates all visual effects using bgCanvas + mainCanvas.
 * Adaptive quality automatically reduces effects when FPS drops.
 */

import { ParticleSystem }    from '../effects/ParticleSystem.js';
import { RippleSystem }      from '../effects/RippleSystem.js';
import { MatrixBackground }  from '../effects/MatrixBackground.js';

const FINGER_TIPS = [4, 8, 12, 16, 20];

// HAND_CONNECTIONS from MediaPipe (global via CDN script)
// We reference the global HAND_CONNECTIONS provided by mediapipe/hands CDN

export class RenderLoop {
  #bgCanvas;  #bgCtx;
  #canvas;    #ctx;
  #themes;

  #particles;
  #ripples;
  #matrix;

  #localHands  = [];
  #remoteHands = new Map(); // userId → landmarks[]

  #time        = 0;
  #lastTime    = 0;
  #raf         = null;
  #running     = false;
  #velocity    = 0;

  // Adaptive quality
  #fpsHistory  = [];
  #quality     = 'high'; // 'high' | 'medium' | 'low'
  #fpsCb       = null;

  // FPS counter
  #fpsFrames   = 0;
  #fpsLastTime = 0;
  #currentFps  = 0;

  constructor(bgCanvas, canvas, themes) {
    this.#bgCanvas = bgCanvas;
    this.#canvas   = canvas;
    this.#bgCtx    = bgCanvas.getContext('2d');
    this.#ctx      = canvas.getContext('2d');
    this.#themes   = themes;

    this.#particles = new ParticleSystem();
    this.#ripples   = new RippleSystem();
    this.#matrix    = new MatrixBackground(bgCanvas);

    this.#handleResize();
    window.addEventListener('resize', () => this.#handleResize());
  }

  onFps(cb) { this.#fpsCb = cb; }

  start() {
    if (this.#running) return;
    this.#running  = true;
    this.#lastTime = performance.now();
    this.#raf = requestAnimationFrame(ts => this.#loop(ts));
  }

  stop() {
    this.#running = false;
    if (this.#raf) cancelAnimationFrame(this.#raf);
  }

  setHands(localHands, remoteHandsMap) {
    this.#localHands  = localHands  || [];
    this.#remoteHands = remoteHandsMap || new Map();
  }

  triggerShockwave(normPos, color) {
    const w = this.#canvas.width;
    const h = this.#canvas.height;
    this.#ripples.add({
      x: normPos.x * w,
      y: normPos.y * h,
      color,
    });
  }

  shootBullet(normPos, hand) {
  const w = this.#canvas.width;
  const h = this.#canvas.height;
  const indexTip  = { x: hand[8].x * w, y: hand[8].y * h };
  const indexBase = { x: hand[5].x * w, y: hand[5].y * h };
  const dirX = indexTip.x - indexBase.x;
  const dirY = indexTip.y - indexBase.y;
  const len  = Math.hypot(dirX, dirY) || 1;

  this.#particles.shoot(
    indexTip,
    dirX / len,
    dirY / len,
    '#ff0050'
  );
}

  // ──────────────────────────────────────────────
  #loop(timestamp) {
    if (!this.#running) return;
    this.#raf = requestAnimationFrame(ts => this.#loop(ts));

    const dt = Math.min((timestamp - this.#lastTime) / 1000, 0.05); // cap delta
    this.#lastTime = timestamp;
    this.#time += dt;

    this.#updateFps(timestamp);
    this.#adaptQuality();

    const w = this.#canvas.width;
    const h = this.#canvas.height;
    const ctx = this.#ctx;

    // Background: matrix rain reacts to velocity
    this.#matrix.draw(this.#themes, this.#time, this.#velocity, this.#quality);

    // Fade main canvas (motion trail)
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(0, 0, w, h);

    // Additive blend for neon glow
    ctx.globalCompositeOperation = 'screen';

    // Physics
    this.#particles.update(ctx, this.#quality);
    this.#ripples.update(ctx);

    // Draw all hands (local + remote)
    const allHands = [
      ...this.#localHands.map(l => ({ landmarks: l, remote: false })),
      ...[...this.#remoteHands.values()].flatMap(lmArr =>
        lmArr.map(l => ({ landmarks: l, remote: true }))
      ),
    ];

    let velSum = 0;
    allHands.forEach(({ landmarks, remote }, handIndex) => {
      this.#drawHand(landmarks, handIndex, allHands.length, remote);

      // Velocity estimate on local hand 0
      if (!remote && this.#localHands[0] && handIndex === 0) {
        velSum += Math.hypot(
          this.#localHands[0][8].x - landmarks[8].x,
          this.#localHands[0][8].y - landmarks[8].y
        );
      }
    });
    this.#velocity = velSum;

    // Cross-hand interactions (local hands only)
    if (this.#localHands.length >= 2) {
      this.#drawCrossHandEffects(this.#localHands[0], this.#localHands[1]);
    }

    ctx.globalCompositeOperation = 'source-over';
  }

  #drawHand(hand, handIndex, total, isRemote) {
    const ctx = this.#ctx;
    const w   = this.#canvas.width;
    const h   = this.#canvas.height;
    const map = p => ({ x: p.x * w, y: p.y * h });
    const col = this.#themes.getColor(this.#time, handIndex, total);

    // Skeleton
    if (typeof drawConnectors !== 'undefined') {
      drawConnectors(ctx, hand, HAND_CONNECTIONS, {
        color: isRemote ? 'rgba(255,255,255,0.3)' : col,
        lineWidth: isRemote ? 1 : 2,
      });
    }

    ctx.shadowBlur  = 14;
    ctx.shadowColor = col;

    FINGER_TIPS.forEach((tipIdx, i) => {
      // Aim laser — red beam from index fingertip in pointing direction
if (!isRemote) {
  const indexTip  = map(hand[8]);
  const indexBase = map(hand[5]);
  const dirX = indexTip.x - indexBase.x;
  const dirY = indexTip.y - indexBase.y;
  const len  = Math.hypot(dirX, dirY) || 1;
  const endX = indexTip.x + (dirX / len) * 300;
  const endY = indexTip.y + (dirY / len) * 300;

  const laserGrad = ctx.createLinearGradient(indexTip.x, indexTip.y, endX, endY);
  laserGrad.addColorStop(0, 'rgba(255, 0, 80, 0.9)');
  laserGrad.addColorStop(1, 'rgba(255, 0, 80, 0)');

  ctx.beginPath();
  ctx.moveTo(indexTip.x, indexTip.y);
  ctx.lineTo(endX, endY);
  ctx.strokeStyle = laserGrad;
  ctx.lineWidth   = 2;
  ctx.shadowBlur  = 10;
  ctx.shadowColor = '#ff0050';
  ctx.stroke();
  ctx.shadowBlur  = 0;
}  
      const pt     = map(hand[tipIdx]);
      const tipCol = this.#themes.getColor(this.#time, i, FINGER_TIPS.length);

      ctx.beginPath();
      ctx.arc(pt.x, pt.y, isRemote ? 3 : 4, 0, Math.PI * 2);
      ctx.fillStyle = isRemote ? 'rgba(255,255,255,0.5)' : '#fff';
      ctx.fill();

      // Emit particles at finger tips (quality-gated)
      if (!isRemote && this.#quality !== 'low' && Math.random() > 0.6) {
        this.#particles.emit(pt, tipCol, 1);
      }
    });

    ctx.shadowBlur = 0;
  }

  #drawCrossHandEffects(h1, h2) {
    const ctx = this.#ctx;
    const w   = this.#canvas.width;
    const hh  = this.#canvas.height;
    const map = p => ({ x: p.x * w, y: p.y * hh });

    FINGER_TIPS.forEach((tipIdx, i) => {
      const pt1  = map(h1[tipIdx]);
      const pt2  = map(h2[tipIdx]);
      const dist = Math.hypot(pt1.x - pt2.x, pt1.y - pt2.y);
      const col  = this.#themes.getColor(this.#time, i, FINGER_TIPS.length);

      // Lightning arc when close
      if (dist < 160 && Math.random() > 0.45) {
        const mx = (pt1.x + pt2.x) / 2 + (Math.random() - 0.5) * 55;
        const my = (pt1.y + pt2.y) / 2 + (Math.random() - 0.5) * 55;
        ctx.beginPath();
        ctx.moveTo(pt1.x, pt1.y);
        ctx.lineTo(mx, my);
        ctx.lineTo(pt2.x, pt2.y);
        ctx.strokeStyle   = '#ffffff';
        ctx.shadowBlur    = 18;
        ctx.shadowColor   = col;
        ctx.lineWidth     = 2.5;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // Gradient connecting line
      const grad = ctx.createLinearGradient(pt1.x, pt1.y, pt2.x, pt2.y);
      grad.addColorStop(0,   this.#themes.getColor(this.#time, i,   5));
      grad.addColorStop(0.5, this.#themes.getColor(this.#time, i+1, 5));
      grad.addColorStop(1,   this.#themes.getColor(this.#time, i+2, 5));

      ctx.beginPath();
      ctx.moveTo(pt1.x, pt1.y);
      ctx.lineTo(pt2.x, pt2.y);
      ctx.strokeStyle = grad;
      ctx.lineWidth   = 4;
      ctx.shadowBlur  = 10;
      ctx.shadowColor = col;
      ctx.stroke();
      ctx.shadowBlur = 0;
    });

    // Rotating mandala
    if (this.#quality !== 'low') {
      const allTips = [
        ...FINGER_TIPS.map(t => map(h1[t])),
        ...FINGER_TIPS.map(t => map(h2[t])),
      ];
      const cx = allTips.reduce((s, p) => s + p.x, 0) / allTips.length;
      const cy = allTips.reduce((s, p) => s + p.y, 0) / allTips.length;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(this.#time * 0.5);
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const t1 = { x: allTips[i].x - cx,         y: allTips[i].y - cy };
        const t2 = { x: allTips[(i+3)%10].x - cx,  y: allTips[(i+3)%10].y - cy };
        ctx.moveTo(t1.x, t1.y);
        ctx.lineTo(t2.x, t2.y);
      }
      ctx.strokeStyle = 'rgba(255,255,255,0.18)';
      ctx.lineWidth   = 1;
      ctx.stroke();
      ctx.restore();
    }
  }

  // ── Adaptive quality ──────────────────────────
  #adaptQuality() {
    this.#fpsHistory.push(this.#currentFps);
    if (this.#fpsHistory.length > 60) this.#fpsHistory.shift();
    if (this.#fpsHistory.length < 10) return;

    const avg = this.#fpsHistory.reduce((a, b) => a + b, 0) / this.#fpsHistory.length;

    if (avg < 22 && this.#quality !== 'low') {
      this.#quality = 'low';
      console.info('[RenderLoop] Quality → LOW');
    } else if (avg >= 22 && avg < 45 && this.#quality === 'high') {
      this.#quality = 'medium';
    } else if (avg >= 50 && this.#quality !== 'high') {
      this.#quality = 'high';
    }
  }

  #updateFps(timestamp) {
    this.#fpsFrames++;
    if (timestamp - this.#fpsLastTime >= 1000) {
      this.#currentFps  = this.#fpsFrames;
      this.#fpsFrames   = 0;
      this.#fpsLastTime = timestamp;
      this.#fpsCb?.(this.#currentFps);
    }
  }

  #handleResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.#bgCanvas.width  = w;
    this.#bgCanvas.height = h;
    this.#canvas.width    = w;
    this.#canvas.height   = h;
    this.#matrix.resize(w, h);
  }
}