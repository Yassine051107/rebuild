export const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Views register teardown (timers, wake locks) that runs on navigation.
let cleanups = [];
export const onLeave = fn => cleanups.push(fn);
export function leave() {
  cleanups.forEach(fn => { try { fn(); } catch { /* ignore */ } });
  cleanups = [];
}

let toastTimer;
export function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 1800);
}

export const mmss = sec => {
  sec = Math.max(0, Math.floor(sec));
  return `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
};

export const vibrate = pattern => { if (navigator.vibrate) navigator.vibrate(pattern); };

export function download(name, text, mime) {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function keepAwake() {
  try {
    const lock = await navigator.wakeLock?.request('screen');
    if (lock) onLeave(() => lock.release());
  } catch { /* not supported */ }
}

// Circular progress ring for timers.
export function ring(fraction, label, sub = '') {
  const r = 88, c = 2 * Math.PI * r;
  const off = c * (1 - Math.min(1, Math.max(0, fraction)));
  return `<div class="ring">
    <svg viewBox="0 0 200 200"><circle cx="100" cy="100" r="${r}" class="ring-bg"/>
    <circle cx="100" cy="100" r="${r}" class="ring-fg" stroke-dasharray="${c}" stroke-dashoffset="${off}"/></svg>
    <div class="ring-txt"><div class="big num">${label}</div><div class="mut sm">${sub}</div></div>
  </div>`;
}

// Sub-tabs shared by the Progress screens.
export const progressTabs = active => `<div class="seg tabs" style="margin-bottom:14px">${[['weight', 'Weight'], ['photos', 'Photos'], ['lifts', 'Lifts']].map(([r, l]) =>
  `<a class="btn ${active === r ? 'on-full' : ''}" href="#${r}">${l}</a>`).join('')}</div>`;

export const chips =(name, options, selected) => `<div class="chips">${options.map(o =>
  `<button class="chip ${selected === o ? 'on' : ''}" data-chip="${esc(name)}" data-val="${esc(o)}">${esc(o)}</button>`).join('')}</div>`;
