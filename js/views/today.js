import { store, save, day } from '../store.js';
import { dkey, addDays, fmtDay, fmtShort, weekday, daysBetween, monday, weekOf } from '../dates.js';
import { STEP_XP, stepXP } from '../defaults.js';
import { habitsFor, habitVal, ledger, levelInfo, HIT_RATIO } from '../streak.js';
import { icon, habitIcon } from '../icons.js';
import { esc, toast, ring } from '../ui.js';
import { questRow } from './tasks.js';

let viewKey = null;
const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function weekGrid(s, L, sel) {
  const mon = monday(dkey());
  const row = (label, m) => `<span class="lbl">${label}</span>` + weekOf(m).map(k =>
    `<div class="dot ${L.statuses[k] || 'none'} ${k === sel ? 'sel' : ''}" data-a="go" data-k="${k}" title="${k}"></div>`).join('');
  return `<div class="week">
    <span></span>${DAY_LETTERS.map(d => `<span class="hd">${d}</span>`).join('')}
    ${row('Last wk', addDays(mon, -7))}
    ${row('This wk', mon)}
  </div>
  <div class="legend"><span><i style="background:var(--acc-hi)"></i>perfect</span><span><i style="background:var(--acc-mid)"></i>kept ≥50%</span><span><i style="background:var(--sec)"></i>free day</span><span><i style="background:repeating-linear-gradient(45deg,#4a1d22 0 2px,#15171b 2px 4px)"></i>miss</span></div>`;
}

function preStart(root, s, L) {
  const start = s.settings.startDate;
  const days = daysBetween(dkey(), start);
  const first = habitsFor(s, start);
  const prep = [
    ['#photos', 'camera', 'Take a "before" photo', 'Front, side and back in the same light'],
    ['#library', 'dumbbell', 'Set dream lifts', 'Open an exercise → Dream lift'],
    ['#train', 'calendar', 'Build training templates', 'Start a workout, tick "Save as template"'],
    ['#weight', 'scale', 'Weigh in Monday morning', 'After the toilet, before food or water'],
    ['#settings', 'sun', 'Download reminders', 'Settings → Reminders (.ics)'],
    ['#tasks', 'target', 'Review tasks, weekly tasks and goals', 'Add your own if something is missing'],
  ];
  root.innerHTML = `
    <div class="card hero">
      <div class="xs mut upper">Prep day</div>
      <div class="big" style="margin-top:4px">Starts ${esc(fmtDay(start))}</div>
      <div class="sm mut" style="margin-top:6px">${days === 1 ? 'Tomorrow' : `In ${days} days`}. Chains, weekly tasks and XP run Monday → Sunday and begin then. Nothing you log today counts.</div>
    </div>
    <h2>Get ready</h2>
    <div class="card menu" style="padding:0">
      ${prep.map(([href, ic, t, d]) => `<a href="${href}"><div class="tile sm">${icon(ic)}</div><div class="grow">${t}<small>${d}</small></div><span class="mut">›</span></a>`).join('')}
    </div>
    <h2>Your first day · ${first.length} tasks</h2>
    <div class="card" style="padding:4px 14px">
      ${first.map(h => `<div class="row listrow"><div class="tile sm">${icon(habitIcon(h))}</div>
        <div class="grow">${esc(h.name)}<div class="xs mut">${esc(h.full)}</div></div>
        <span class="xpchip">${h.type === 'steps' ? 'scaled' : '+' + h.xp}</span></div>`).join('')}
    </div>
  `;
}

export function render(root) {
  const s = store.state;
  const today = dkey();
  const L = ledger(s);
  if (!L.started) return preStart(root, s, L);

  if (!viewKey || viewKey > today || viewKey < s.settings.startDate) viewKey = today;
  const k = viewKey;
  const isToday = k === today;
  const sc = L.scores[k];
  const lv = levelInfo(L.total);
  const yStatus = L.statuses[addDays(today, -1)];
  const gymDay = s.settings.gymDays.includes(weekday(k));
  const dayNum = daysBetween(s.settings.startDate, k) + 1;

  const plans = s.plans.filter(p => p.active);
  const start = plans.length ? daysBetween('2026-01-01', k) % plans.length : 0;
  const shown = [0, 1, 2].map(i => plans[(start + i) % plans.length]).filter((p, i, a) => p && a.indexOf(p) === i);

  const habitCard = h => {
    const r = habitVal(s, h, k);
    const excusedBy = sc.excused.get(h.id);
    const chip = excusedBy ? '<span class="tag">excused</span>'
      : `<span class="xpchip ${r.xp ? '' : 'zero'}">+${r.xp}</span>`;
    const head = `<div class="top"><div class="tile sm">${icon(r.v === 'full' ? 'check' : habitIcon(h))}</div>
      <span class="name">${esc(h.name)}${h.custom ? ' <span class="tag">custom</span>' : ''}</span>${chip}</div>`;
    const cls = `card habit ${r.v === 'full' && !excusedBy ? 'done' : ''}`;
    if (excusedBy) return `<div class="card habit excused">${head}<div class="sm mut">Excused by store reward: ${esc(excusedBy)}</div></div>`;

    if (h.type === 'water') {
      const l = r.amount;
      return `<div class="${cls}">${head}
        <div class="row between"><span class="mid num">${+l.toFixed(2)} L</span><span class="xs mut">min ${h.minTarget} L · full ${h.target} L</span></div>
        <div class="bar" style="margin:8px 0 10px"><i style="width:${Math.min(100, l / h.target * 100)}%"></i></div>
        <div class="seg">
          <button class="btn" data-water="-0.25">−</button>
          <button class="btn" data-water="0.25">+250 ml</button>
          <button class="btn" data-water="0.5">+500 ml</button>
          <button class="btn" data-water="1">+1 L</button>
        </div></div>`;
    }
    if (h.type === 'steps') {
      const n = r.amount;
      const nextXp = STEP_XP[Math.floor(n / 1000)];
      return `<div class="${cls}">${head}
        <div class="row">
          <input type="number" inputmode="numeric" id="steps" value="${n || ''}" placeholder="Steps today" class="grow">
          <button class="btn pri" data-a="steps">Save</button>
        </div>
        <div class="bar thin" style="margin-top:10px"><i style="width:${Math.min(100, n / h.target * 100)}%"></i></div>
        <div class="xs mut">${n.toLocaleString()} steps · ${stepXP(n)} XP${nextXp ? ` · next 1,000 = +${nextXp} XP` : ' · max reached'}</div>
      </div>`;
    }
    if (h.auto && h.auto !== 'train') {
      const how = h.auto === 'weigh' ? 'Log weight below or in Progress' : `${s.meals.filter(m => m.date === k && m.eaten).length} meal(s) logged in Meal Mode`;
      return `<div class="${cls}">${head}
        <div class="sm mut">Auto · ${how}</div>
        <div class="desc">Full: ${esc(h.full)}${h.min ? ` · Min: ${esc(h.min)}` : ''}</div></div>`;
    }
    const logged = h.auto === 'train' && s.sessions.some(x => x.date === k);
    return `<div class="${cls}">${head}
      ${logged ? '<div class="sm good">Workout logged in Train ✓</div>' : `
      <div class="seg">
        <button class="btn ${r.v === 'full' ? 'on-full' : ''}" data-a="set" data-h="${h.id}" data-v="full">${h.auto === 'train' ? 'Trained' : 'Done'}</button>
        ${h.min ? `<button class="btn ${r.v === 'min' ? 'on-min' : ''}" data-a="set" data-h="${h.id}" data-v="min">Minimum</button>` : ''}
      </div>`}
      <div class="desc">${esc(h.full)}${h.min ? ` · Min: ${esc(h.min)}` : ''}</div>
      ${h.auto === 'train' && !logged && isToday ? '<a class="btn sm" href="#train" style="margin-top:10px">Open Train ›</a>' : ''}
    </div>`;
  };

  let alert = '';
  if (sc.free) alert = `<div class="note blue">${esc(sc.free)}: chain protected today.</div>`;
  else if (isToday && yStatus === 'miss' && L.chain > 0 && L.statuses[today] === 'pending') {
    alert = `<div class="note">Yesterday: miss (1 of 1 allowed). Today ≥ ${Math.round(HIT_RATIO * 100)}% XP keeps the chain. Minimum versions count.</div>`;
  }
  const weekDone = L.thisWeek.filter(t => t.done).length;
  const weekNext = L.thisWeek.filter(t => !t.done).sort((a, b) => (b.n / b.target) - (a.n / a.target)).slice(0, 3);

  root.innerHTML = `
    <div class="row between">
      <div>
        <div class="xs mut upper">Day ${dayNum} · ${gymDay ? 'training day' : 'rest day'}</div>
        <h1>${isToday ? 'Today' : esc(fmtDay(k))}</h1>
      </div>
      <div class="row">
        <button class="btn sm" data-a="prev" ${k <= s.settings.startDate ? 'disabled' : ''}>‹</button>
        <button class="btn sm" data-a="next" ${isToday ? 'disabled' : ''}>›</button>
      </div>
    </div>
    <div class="gap"></div>

    <div class="card hero">
      <div class="row" style="gap:16px">
        ${ring(sc.ratio, `${Math.round(sc.ratio * 100)}%`, `${sc.xp} XP`).replace('class="ring"', 'class="ring mini"')}
        <div class="grow">
          <div class="row" style="gap:6px">${icon('flame', 'acc')}<span class="mid">${L.chain}</span><span class="xs mut">day chain${L.chainPct ? ` · +${L.chainPct}% XP` : ''}</span></div>
          <div class="row between xs mut" style="margin-top:8px"><span>Level ${lv.level}</span><span>${lv.into.toLocaleString()} / ${lv.need.toLocaleString()}</span></div>
          <div class="bar thin"><i style="width:${(lv.frac * 100).toFixed(1)}%"></i></div>
          <a href="#store" class="xs" style="text-decoration:none">${L.balance.toLocaleString()} XP to spend ›</a>
        </div>
      </div>
    </div>

    <h2>Week</h2>
    <div class="card">${weekGrid(s, L, k)}</div>

    <h2>Daily tasks <span class="num" style="margin-left:auto;letter-spacing:.04em">${sc.xp}/${sc.max} XP</span></h2>
    ${alert}
    ${habitsFor(s, k).map(habitCard).join('')}

    ${isToday && s.weights[today] == null ? `
    <div class="card">
      <div class="row">
        <div class="tile sm">${icon('scale')}</div>
        <input type="number" inputmode="decimal" step="0.1" placeholder="Weight (kg)" id="qw" class="grow">
        <button class="btn pri" data-a="weigh">Log</button>
      </div>
    </div>` : ''}

    <h2>This week · ${weekDone}/${L.thisWeek.length}</h2>
    <div class="card">
      ${weekNext.map(t => questRow(t)).join('') || '<p class="sm good">All weekly tasks done.</p>'}
      <a href="#tasks/weekly" class="btn sm" style="margin-top:8px">All weekly tasks &amp; goals ›</a>
    </div>

    ${shown.length ? `<h2>If-then of the day</h2><div class="card">${shown.map(p =>
      `<div class="plan"><b>If</b> ${esc(p.cue)} <b>then</b> ${esc(p.then)}</div>`).join('')}</div>` : ''}
    <a class="btn sm" href="#tasks">+ Add or manage tasks</a>
  `;

  root.onclick = e => {
    const el = e.target.closest('[data-a],[data-water]');
    if (!el) return;
    if (el.dataset.water) {
      const rec = day(k);
      rec.water = Math.max(0, Math.round(((rec.water || 0) + parseFloat(el.dataset.water)) * 100) / 100);
      save();
      return render(root);
    }
    const a = el.dataset.a;
    if (a === 'prev') { viewKey = addDays(k, -1); render(root); }
    else if (a === 'next') { viewKey = addDays(k, 1); render(root); }
    else if (a === 'go') {
      const t = el.dataset.k;
      if (t >= s.settings.startDate && t <= today) { viewKey = t; render(root); }
    } else if (a === 'set') {
      const rec = day(k);
      rec.habits[el.dataset.h] = rec.habits[el.dataset.h] === el.dataset.v ? null : el.dataset.v;
      save();
      render(root);
    } else if (a === 'steps') {
      const n = parseInt(root.querySelector('#steps').value, 10);
      if (!(n >= 0 && n < 100000)) return toast('Enter your step count');
      day(k).steps = n;
      save();
      toast(`${n.toLocaleString()} steps · ${stepXP(n)} XP`);
      render(root);
    } else if (a === 'weigh') {
      const v = parseFloat(root.querySelector('#qw').value.replace(',', '.'));
      if (!(v > 30 && v < 300)) return toast('Enter a weight in kg');
      s.weights[today] = Math.round(v * 10) / 10;
      save();
      toast(`${s.weights[today]} kg logged`);
      render(root);
    }
  };
}
