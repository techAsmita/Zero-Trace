/**
 * MatrixBackground.js
 * Katakana matrix rain on the background canvas.
 * Speed and density react to hand velocity.
 */

const FONT_SIZE = 16;

export class MatrixBackground {
  #canvas;
  #ctx;
  #columns = [];
  #maxCols = 0;

  constructor(canvas) {
    this.#canvas = canvas;
    this.#ctx    = canvas.getContext('2d');
    this.resize(canvas.width, canvas.height);
  }

  resize(w, h) {
    this.#maxCols = Math.floor(w / FONT_SIZE);
    this.#columns = Array.from(
      { length: this.#maxCols },
      () => Math.random() * (h / FONT_SIZE)
    );
  }

  draw(themes, time, velocity, quality) {
    const ctx  = this.#ctx;
    const w    = this.#canvas.width;
    const h    = this.#canvas.height;

    // Fade previous frame — faster fade when hands move fast
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = `rgba(0,0,0,${0.14 + Math.min(velocity * 10, 0.5)})`;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';

    ctx.fillStyle = themes.getColor(time, 1, 1);
    ctx.font      = `${FONT_SIZE}px monospace`;

    // In low quality mode, skip every other column
    const step  = quality === 'low' ? 2 : 1;
    const speed = 1 + velocity * 80;

    for (let i = 0; i < this.#maxCols; i += step) {
      // Sparse — only draw ~5% of columns per frame
      if (Math.random() > 0.95) {
        const char = String.fromCharCode(0x30A0 + Math.random() * 96);
        ctx.fillText(char, i * FONT_SIZE, this.#columns[i] * FONT_SIZE);
      }

      this.#columns[i] += Math.random() * speed;

      if (this.#columns[i] * FONT_SIZE > h && Math.random() > 0.9) {
        this.#columns[i] = 0;
      }
    }
  }
}