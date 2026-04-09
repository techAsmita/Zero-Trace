/**
 * ThemeManager.js
 * Color themes — each is a function of (time, index, total).
 */

const THEMES = {
  Rainbow:   (t, i, n) => `hsl(${(t * 80 + i * (360 / Math.max(n,1))) % 360}, 100%, 60%)`,
  Cyberpunk: (t, i, n) => i % 2 === 0 ? '#ff003c' : '#00f0ff',
  Lava:      (t, i, n) => `hsl(${(10 + i * 10) % 40}, 100%, ${50 + Math.sin(t) * 10}%)`,
  Ocean:     (t, i, n) => `hsl(${180 + i * 20}, 100%, 60%)`,
  Galaxy:    (t, i, n) => `hsl(${260 + Math.sin(t * 2 + i) * 40}, 100%, 65%)`,
};

const ACCENT_COLORS = {
  Rainbow:   '#00ffcc',
  Cyberpunk: '#00f0ff',
  Lava:      '#ff4400',
  Ocean:     '#00bfff',
  Galaxy:    '#a855f7',
};

export class ThemeManager {
  #name = 'Rainbow';

  setTheme(name) {
    if (!THEMES[name]) return;
    this.#name = name;
    // Update CSS variable for UI accents
    document.documentElement.style.setProperty('--accent', ACCENT_COLORS[name]);
  }

  current() {
    return ACCENT_COLORS[this.#name];
  }

  getColor(time, index, total) {
    return THEMES[this.#name](time, index, total);
  }
}