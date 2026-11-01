import { store, save } from '../store.js';
import { fmtShort, daysBetween } from '../dates.js';
import { getExercise, KINDS, METRICS } from '../exercises.js';
import { stats, suggest, targetText, fmtSet, primary, volume, e1rm, FAMILY_LABEL, higherIsBetter } from '../training.js';
import { esc, toast } from '../ui.js';

let metricKey = null; // selected graph metric

const sum = (sets, f) => sets.reduce((a, x) => a + (+x[f] || 0), 0);
const max = (sets, f) => Math.max(0, ...sets.map(x => +x[f] || 0));

// Graph options per exercise type: [key, label, unit, value(sets)]
export function metricsFor(fam, ex) {
  switch (fam) {
    case 'W': return [
      ['top', 'Top weight', 'kg', sets => max(sets, 'kg')],
      ['e1rm', 'Est. 1RM', 'kg', sets => +Math.max(0, ...sets.map(x => e1rm(+x.kg || 0, +x.reps || 0))).toFixed(1)],
      ['vol', 'Volume', 'kg', volume],
      ['reps', 'Total reps', 'reps', sets => sum(sets, 'reps')],
    ];
    case 'B': return [
      ['best', 'Best set', 'reps', sets => max(sets, 'reps')],
      ['reps', 'Total reps', 'reps', sets => sum(sets, 'reps')],
      ['kg', 'Added weight', 'kg', sets => max(sets, 'kg')],
    ];
    case 'A': return [
      ['assist', 'Assistance', 'kg', sets => primary('A', sets)],
      ['reps', 'Total reps', 'reps', sets => sum(sets, 'reps')],
    ];
    case 'T': return [
      ['sec', 'Longest hold', 's', sets => max(sets, 'sec')],
      ['kg', 'Load', 'kg', sets => max(sets, 'kg')],
    ];
    case 'K': return [
      ['min', 'Minutes', 'min', sets => sum(sets, 'min')],
      ...(ex.metric ? [['val', METRICS[ex.metric], METRICS[ex.metric], sets => ['level', 'incline'].includes(ex.metric) ? max(sets, 'val') : +sum(sets, 'val').toFixed(2)]] : []),
    ];
  }
  return [];
}

// Area line chart with optional dashed goal line.
export function lineChart(points, unit, goal = null) {
  if (points.length < 2) return '<p class="xs mut center" style="padding:24px 0">The graph appears after 2 sessions with this exercise.</p>';
  const W = 340, H = 170, P = { l: 34, r: 12, t: 14, b: 20 };
  const vals = points.map(p => p.v).concat(goal != null ? [goal] : []);
  let lo = Math.min(...vals), hi = Math.max(...vals);
  if (hi - lo < 1) { lo -= 1; hi += 1; }
  const pad = (hi - lo) * 0.12; lo -= pad; hi += pad;
  const span = Math.max(1, daysBetween(points[0].date, points[points.length - 1].date));
  const x = d => P.l + (daysBetween(points[0].date, d) / span) * (W - P.l - P.r);
  const y = v => P.t + ((hi - v) / (hi - lo)) * (H - P.t - P.b);
  const pts = points.map(p => `${x(p.date).toFixed(1)},${y(p.v).toFixed(1)}`);
  const area = `M${pts[0]} L${pts.join(' L')} L${x(points[points.length - 1].date).toFixed(1)},${H - P.b} L${P.l},${H - P.b} Z`;
  const grid = [lo + pad, (lo + hi) / 2, hi - pad].map(v =>
    `<line x1="${P.l}" x2="${W - P.r}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)"/><text x="${P.l - 4}" y="${y(v) + 3}" text-anchor="end">${+v.toFixed(1)}</text>`).join('');
  const last = points[points.length - 1];
  const bestV = Math.max(...points.map(p => p.v));
  return `<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Progress in ${esc(unit)}">
    <defs><linearGradient id="gArea" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="var(--acc-hi)" stop-opacity=".35"/><stop offset="1" stop-color="var(--acc-hi)" stop-opacity="0"/>
    </linearGradient></defs>
    ${grid}
    ${goal != null ? `<line x1="${P.l}" x2="${W - P.r}" y1="${y(goal)}" y2="${y(goal)}" stroke="var(--sec)" stroke-dasharray="5 4"/>
      <text x="${W - P.r}" y="${y(goal) - 4}" text-anchor="end" style="fill:var(--sec)">dream ${goal}</text>` : ''}
    <path d="${area}" fill="url(#gArea)"/>
    <polyline points="${pts.join(' ')}" fill="none" stroke="var(--acc-hi)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
    ${points.map(p => `<circle cx="${x(p.date).toFixed(1)}" cy="${y(p.v).toFixed(1)}" r="${p.v === bestV ? 4 : 2.5}" fill="${p.v === bestV ? 'var(--sec)' : 'var(--acc-hi)'}"/>`).join('')}
    <text x="${x(last.date) - 6}" y="${y(last.v) - 8}" text-anchor="end" style="fill:var(--tx);font-weight:700">${+(+last.v).toFixed(1)}</text>
    <text x="${P.l}" y="${H - 5}">${fmtShort(points[0].date)}</text>
    <text x="${W - P.r}" y="${H - 5}" text-anchor="end">${fmtShort(last.date)}</text>
  </svg></div>`;
}

// Tiny trend line for lists.
export function sparkline(values) {
  if (values.length < 2) return '<svg class="spark" viewBox="0 0 84 30"></svg>';
  const lo = Math.min(...values), hi = Math.max(...values), r = hi - lo || 1;
  const pts = values.map((v, i) => `${(i / (values.length - 1) * 80 + 2).toFixed(1)},${(26 - (v - lo) / r * 22).toFixed(1)}`).join(' ');
  return `<svg class="spark" viewBox="0 0 84 30"><polyline points="${pts}" fill="none" stroke="var(--acc-hi)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
}

export function render(root, id) {
  const s = store.state;
  const ex = getExercise(id, s.customExercises);
  if (!ex) { root.innerHTML = '<p>Exercise not found.</p><a class="btn" href="#library">Library</a>'; return; }
  const st = stats(s, ex);
  const p = st.p;
  const fam = p.fam;
  const sug = suggest(s, ex);
  const unit = { W: 'kg', B: 'reps', A: 'kg assist', T: 's', K: 'min' }[fam];
  const metric = METRICS[ex.metric];
  const fmt = v => v == null ? '–' : `${+(+v).toFixed(2)}`;

  // Secondary cardio metric (km / floors / level ...) start, current, best.
  let sec = '';
  if (fam === 'K' && metric && !st.empty) {
    const peak = ['level', 'incline'].includes(ex.metric);
    const valOf = sets => peak ? Math.max(0, ...sets.map(x => +x.val || 0)) : sets.reduce((a, x) => a + (+x.val || 0), 0);
    const v = st.h.map(x => valOf(x.sets));
    sec = `<div class="stats" style="margin-top:8px">
      <div class="stat"><b>${fmt(v[0])}</b><span>Start ${metric}</span></div>
      <div class="stat"><b>${fmt(v[v.length - 1])}</b><span>Current ${metric}</span></div>
      <div class="stat"><b>${fmt(Math.max(...v))}</b><span>Best ${metric}</span></div>
    </div>`;
  }

  const showRange = ['W', 'B', 'A'].includes(fam);
  const metrics = metricsFor(fam, ex);
  const m = metrics.find(x => x[0] === metricKey) || metrics[0];
  root.innerHTML = `
    <div class="row between">
      <h1 style="font-size:20px">${esc(ex.name)}</h1>
      <a href="${s.activeSession ? '#train' : '#library'}" class="btn sm">‹ Back</a>
    </div>
    <div class="row wrap" style="margin-top:6px;gap:6px">
      <span class="tag">${esc(ex.group)}</span><span class="tag">${esc(ex.equip)}</span><span class="tag">${esc(KINDS[ex.kind])}</span>
      <span class="tag">logs ${FAMILY_LABEL[fam]}</span>
    </div>

    <h2>Next session</h2>
    <div class="card target">
      <div class="mid">${esc(targetText(fam, sug, ex))}</div>
      <div class="sm mut" style="margin-top:4px">${esc(sug.why)}</div>
    </div>

    ${st.empty ? '<p class="mut sm">No sessions logged yet. Stats appear after your first workout with this exercise.</p>' : `
    <h2>Progress (${unit})</h2>
    <div class="stats">
      <div class="stat"><b>${fmt(st.start.v)}</b><span>Start · ${fmtShort(st.start.date)}</span></div>
      <div class="stat"><b>${fmt(st.current.v)}</b><span>Current</span></div>
      <div class="stat"><b class="good">${fmt(st.best.v)}</b><span>${higherIsBetter(fam) ? 'Highest' : 'Lowest'}${st.bestReps ? ` × ${st.bestReps}` : ''} · ${fmtShort(st.best.date)}</span></div>
    </div>
    ${fam === 'W' && st.bestE1rm ? `<div class="gap"></div><div class="stats">
      <div class="stat"><b>${st.bestE1rm.toFixed(1)}</b><span>Best est. 1RM</span></div>
      <div class="stat"><b>${st.h.length}</b><span>Sessions</span></div>
      <div class="stat"><b>${Math.round(Math.max(...st.h.map(x => volume(x.sets)))).toLocaleString()}</b><span>Best volume</span></div>
    </div>` : ''}
    ${fam === 'B' ? `<div class="gap"></div><div class="stats">
      <div class="stat"><b>${st.bestAddedKg}</b><span>Best added kg</span></div>
      <div class="stat"><b>${st.h.length}</b><span>Sessions</span></div>
      <div class="stat"><b>${Math.max(...st.h.map(x => x.sets.reduce((a, z) => a + (+z.reps || 0), 0)))}</b><span>Best total reps</span></div>
    </div>` : ''}
    ${sec}`}

    <h2>Progress graph</h2>
    <div class="card" id="graph">
      <div class="chips scrollx" style="margin-bottom:10px">${metrics.map(([k, l]) =>
        `<button class="chip ${k === m[0] ? 'on' : ''}" data-metric="${k}">${esc(l)}</button>`).join('')}</div>
      ${lineChart(st.empty ? [] : st.h.map(x => ({ date: x.date, v: m[3](x.sets) })), m[2], m === metrics[0] ? p.dream : null)}
    </div>

    <h2>Dream ${fam === 'A' ? 'assistance (0 = unassisted)' : 'lift'}</h2>
    <div class="card">
      <div class="row">
        <input type="number" inputmode="decimal" step="any" id="dream" value="${p.dream ?? ''}" placeholder="Goal in ${unit}" class="grow">
        <span class="mut">${unit}</span>
      </div>
      ${p.dream != null && !st.empty ? `
        <div class="gap"></div>
        <div class="bar"><i style="width:${((st.progress ?? 0) * 100).toFixed(1)}%"></i></div>
        <div class="row between xs mut" style="margin-top:4px"><span>${fmt(st.start.v)}</span><span>${Math.round((st.progress ?? 0) * 100)}%</span><span>${fmt(p.dream)}</span></div>
        <p class="sm" style="margin-top:8px">${st.eta?.done ? '<span class="good">Dream reached. Set a new one.</span>'
          : st.eta ? `≈ ${st.eta.sessions} more sessions · ~${st.eta.weeks} weeks at your frequency <span class="xs mut">(${st.eta.model}; slower is normal in a calorie deficit)</span>` : ''}</p>` : ''}
    </div>

    ${showRange || p.inc ? `<h2>Progression rules</h2>
    <div class="card">
      <div class="grid2">
        ${showRange ? `<label class="f"><span>Rep range low</span><input type="number" data-set="lo" value="${p.lo}"></label>
        <label class="f"><span>Rep range high</span><input type="number" data-set="hi" value="${p.hi}"></label>` : ''}
        <label class="f"><span>Increment (${fam === 'B' ? 'added kg' : fam === 'A' ? 'assist kg' : 'kg'})</span><input type="number" step="any" data-set="inc" value="${p.inc}"></label>
        ${showRange ? `<label class="f"><span>Default sets</span><input type="number" data-set="sets" value="${p.sets}"></label>` : ''}
      </div>
      <p class="xs mut">Defaults for this exercise: ${showRange ? `${p.defaults.lo}–${p.defaults.hi} reps, ` : ''}+${p.defaults.inc} kg.${fam === 'W' && ex.equip === 'Dumbbell' ? ' Dumbbell weights are per hand.' : ''}</p>
      <button class="btn sm" data-a="reset">Reset to defaults</button>
    </div>` : ''}

    ${st.empty ? '' : `<h2>History</h2>
    <div class="card"><table class="t">
      <tr><th>Date</th><th>Sets</th>${fam === 'W' ? '<th class="r">Vol</th>' : ''}</tr>
      ${st.h.slice().reverse().map(x => `<tr><td class="xs">${fmtShort(x.date)}</td><td class="xs">${x.sets.map(z => fmtSet(fam, z, ex)).join(' · ')}</td>
        ${fam === 'W' ? `<td class="r xs num">${Math.round(volume(x.sets))}</td>` : ''}</tr>`).join('')}
    </table></div>`}

    ${ex.custom ? '<div class="gap"></div><button class="btn sm danger" data-a="delete">Delete custom exercise</button>' : ''}
  `;

  const conf = () => (s.exSettings[ex.id] = s.exSettings[ex.id] || {});
  root.onchange = e => {
    const t = e.target;
    if (t.id === 'dream') {
      const v = parseFloat(t.value);
      if (Number.isFinite(v)) conf().dream = v; else delete conf().dream;
    } else if (t.dataset.set) {
      const v = parseFloat(t.value);
      if (!(v >= 0)) return toast('Enter a number');
      conf()[t.dataset.set] = v;
      const c = conf();
      if (c.lo != null && c.hi != null && c.lo > c.hi) [c.lo, c.hi] = [c.hi, c.lo];
    } else return;
    save();
    toast('Saved');
    render(root, id);
  };
  root.onclick = e => {
    const mk = e.target.closest('[data-metric]');
    if (mk) {
      metricKey = mk.dataset.metric;
      const y = window.scrollY;
      render(root, id);
      window.scrollTo(0, y);
      return;
    }
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (a === 'reset') {
      const dream = s.exSettings[ex.id]?.dream;
      s.exSettings[ex.id] = dream != null ? { dream } : {};
      save(); render(root, id);
    }
    if (a === 'delete') {
      if (s.sessions.some(x => x.ex.some(y => y.id === ex.id))) return toast('Used in sessions; delete those first');
      s.customExercises = s.customExercises.filter(x => x.id !== ex.id);
      save();
      location.hash = 'library';
    }
  };
}
