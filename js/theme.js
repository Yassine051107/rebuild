// Applies the user's secondary color (the primary dark red is fixed in CSS).
const hex = c => {
  const m = /^#?([0-9a-f]{6})$/i.exec(c || '');
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [n >> 16, (n >> 8) & 255, n & 255];
};

export function applyTheme(s) {
  const rgb = hex(s.settings.secondary) || [242, 179, 61];
  const bg = [19, 21, 26];
  const dim = rgb.map((v, i) => Math.round(bg[i] + (v - bg[i]) * 0.16));
  const root = document.documentElement.style;
  root.setProperty('--sec', `rgb(${rgb.join(',')})`);
  root.setProperty('--sec-dim', `rgb(${dim.join(',')})`);
  root.setProperty('--sec-glow', `rgba(${rgb.join(',')}, .08)`);
}
