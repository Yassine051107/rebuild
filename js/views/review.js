import { store, save } from '../store.js';
import { dkey, addDays, fmtShort } from '../dates.js';
import { applicable, habitVal, ledger, KEPT } from '../streak.js';
import { esc } from '../ui.js';
import { avg7 } from './weight.js';

let offset = 0; // weeks back from the current week

// Monday of the week containing k.
const monday = k => {
  const d = new Date(k + 'T00:00');
  return addDays(k, -((d.getDay() + 6) % 7));
};

function weekDays(s, mon) {
  const out = [];
  for (let i = 0; i < 7; i++) {
    const k = addDays(mon, i);
    if (k >= s.settings.startDate && k <= dkey()) out.push(k);
  }
  return out;
}

export function render(root) {
  const s = store.state;
  const mon = addDays(monday(dkey()), -7 * offset);
  const days = weekDays(s, mon);
  const prevDays = weekDays(s, addDays(mon, -7));
  const inWeek = k => k >= mon && k <= addDays(mon, 6);

  const L = ledger(s);
  const pct = (list, fn) => list.length ? Math.round(100 * list.filter(fn).length / list.length) : null;
  const xpPct = list => list.length ? Math.round(100 * list.reduce((a, k) => a + L.scores[k].ratio, 0) / list.length) : null;

  const habitRows = s.habits.filter(h => !h.retired).map(h => {
    const due = days.filter(k => applicable(s, h, k) && !L.scores[k].excused.has(h.id));
    if (!due.length) return '';
    const full = due.filter(k => habitVal(s, h, k).v === 'full').length;
    const min = due.filter(k => habitVal(s, h, k).v === 'min').length;
    const p = Math.round(100 * (full + min * 0.5) / due.length);
    return `<tr><td>${esc(h.name)}</td><td class="r num">${full}/${due.length}</td><td class="r num">${min}</td><td class="r num">${p}%</td></tr>`;
  }).join('');

  const kept = pct(days, k => KEPT.has(L.statuses[k]));
  const keptPrev = pct(prevDays, k => KEPT.has(L.statuses[k]));
  const xp = xpPct(days), xpPrev = xpPct(prevDays);

  // Weight: 7-day avg at end of this week vs end of last week.
  const endK = days[days.length - 1];
  const wNow = endK ? avg7(s, endK) : null;
  const wPrev = endK ? avg7(s, addDays(endK, -7)) : null;

  const weekTasks = L.weeks[mon] || [];
  const weekXp = weekTasks.filter(t => t.done).reduce((a, t) => a + t.xp, 0);

  const meals = s.meals.filter(m => inWeek(m.date));
  const eaten = meals.filter(m => m.eaten);
  const avgMin = eaten.length ? (eaten.reduce((a, m) => a + m.durationSec, 0) / eaten.length / 60).toFixed(1) : '–';
  const avgFull = eaten.length ? (eaten.reduce((a, m) => a + (m.fullness || 0), 0) / eaten.length).toFixed(1) : '–';
  const lowH = meals.filter(m => m.hunger <= 3).length;
  const sessions = new Set(s.sessions.filter(w => inWeek(w.date)).map(w => w.date)).size;

  const d = (a, b, unit = '') => a == null || b == null ? '' : `<span class="xs ${a >= b ? 'good' : 'warn'}"> ${a >= b ? '▲' : '▼'} ${Math.abs(a - b)}${unit}</span>`;
  const note = s.reviews[mon] || '';

  root.innerHTML = `
    <div class="row between"><h1>Weekly review</h1><a href="#more" class="btn sm">‹ More</a></div>
    <div class="row between" style="margin-top:10px">
      <button class="btn sm" data-a="prev">‹</button>
      <span class="sm">${fmtShort(mon)} – ${fmtShort(addDays(mon, 6))}${offset === 0 ? ' · this week' : ''}</span>
      <button class="btn sm" data-a="next" ${offset === 0 ? 'disabled' : ''}>›</button>
    </div>

    <h2>Overview</h2>
    <div class="stats">
      <div class="stat"><b>${kept ?? '–'}${kept != null ? '%' : ''}</b><span>Days kept${d(kept, keptPrev, '%')}</span></div>
      <div class="stat"><b>${xp ?? '–'}${xp != null ? '%' : ''}</b><span>Avg XP${d(xp, xpPrev, '%')}</span></div>
      <div class="stat"><b>${wNow != null && wPrev != null ? (wNow - wPrev > 0 ? '+' : '') + (wNow - wPrev).toFixed(1) : '–'}</b><span>Weight Δ (avg)</span></div>
    </div>
    <div class="gap"></div>
    <div class="stats">
      <div class="stat"><b>${sessions}/${s.settings.gymDays.length}</b><span>Training days</span></div>
      <div class="stat"><b>${weekTasks.filter(t => t.done).length}/${weekTasks.length}</b><span>Weekly tasks</span></div>
      <div class="stat"><b>${weekXp}</b><span>Weekly XP</span></div>
    </div>

    <h2>Habits</h2>
    <div class="card">
      <table class="t"><tr><th>Habit</th><th class="r">Full</th><th class="r">Min</th><th class="r">Score</th></tr>${habitRows}</table>
    </div>

    <h2>Meals</h2>
    <div class="stats">
      <div class="stat"><b>${avgMin}</b><span>Avg minutes</span></div>
      <div class="stat"><b>${avgFull}</b><span>Avg fullness</span></div>
      <div class="stat"><b>${lowH}</b><span>Hunger ≤3 starts</span></div>
    </div>

    <h2>One adjustment for next week</h2>
    <div class="card">
      <textarea id="note" placeholder="Which if-then plan or habit changes? Be specific.">${esc(note)}</textarea>
      <div class="gap"></div>
      <a href="#plans" class="btn sm">Edit if-then plans ›</a>
    </div>
  `;

  root.oninput = e => {
    if (e.target.id === 'note') { s.reviews[mon] = e.target.value; save(); }
  };
  root.onclick = e => {
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (a === 'prev') { offset++; render(root); }
    if (a === 'next' && offset > 0) { offset--; render(root); }
  };
}
