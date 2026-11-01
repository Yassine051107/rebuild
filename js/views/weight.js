import { store, save } from '../store.js';
import { dkey, addDays, daysBetween, fmtShort, parseKey } from '../dates.js';
import { esc, toast, progressTabs } from '../ui.js';

let range = 'start';

// Expected weight on date k at a constant % loss per week.
export function projected(s, k) {
  const weeks = daysBetween(s.settings.startDate, k) / 7;
  return s.settings.startWeight * (1 - s.settings.weeklyRatePct / 100) ** weeks;
}

export function goalDate(s, kg) {
  const r = 1 - s.settings.weeklyRatePct / 100;
  const weeks = Math.log(kg / s.settings.startWeight) / Math.log(r);
  return addDays(s.settings.startDate, Math.ceil(weeks * 7));
}

// 7-day moving average of logged weights ending on k (null if no entries in window).
export function avg7(s, k) {
  const vals = [];
  for (let i = 0; i < 7; i++) {
    const v = s.weights[addDays(k, -i)];
    if (v != null) vals.push(v);
  }
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
}

function chart(s) {
  const W = 340, H = 210, P = { l: 30, r: 10, t: 12, b: 22 };
  const today = dkey();
  const entries = Object.entries(s.weights).sort(([a], [b]) => a < b ? -1 : 1);
  const start = s.settings.startDate;
  let end;
  if (range === 'plan') end = goalDate(s, s.settings.finalGoal);
  else {
    const last = entries.length ? entries[entries.length - 1][0] : today;
    end = [addDays(today, 14), addDays(start, 28), last].sort().pop();
  }
  const from = range === '8w' ? [addDays(today, -56), start].sort().pop() : start;
  const span = Math.max(1, daysBetween(from, end));

  const inRange = k => k >= from && k <= end;
  const vis = entries.filter(([k]) => inRange(k));
  const stretch = s.settings.stretchGoals.filter(g => g.date && inRange(g.date));
  const ys = [projected(s, from), projected(s, end), ...vis.map(([, v]) => v), ...stretch.map(g => g.kg)];
  let lo = Math.floor(Math.min(...ys) - 1), hi = Math.ceil(Math.max(...ys) + 1);
  if (hi - lo < 6) { lo -= 3; hi += 3; }

  const x = k => P.l + (daysBetween(from, k) / span) * (W - P.l - P.r);
  const y = v => P.t + ((hi - v) / (hi - lo)) * (H - P.t - P.b);

  const step = hi - lo > 30 ? 10 : 5;
  let grid = '';
  for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) {
    grid += `<line x1="${P.l}" x2="${W - P.r}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)" stroke-width="1"/>
      <text x="${P.l - 4}" y="${y(v) + 3}" text-anchor="end">${v}</text>`;
  }
  // x labels: start, middle, end
  const mid = addDays(from, Math.round(span / 2));
  const xl = [from, mid, end].map((k, i) =>
    `<text x="${x(k)}" y="${H - 6}" text-anchor="${['start', 'middle', 'end'][i]}">${fmtShort(k)}</text>`).join('');

  const projPts = [];
  for (let d = 0; d <= span; d += Math.max(1, Math.round(span / 40))) projPts.push(addDays(from, d));
  projPts.push(end);
  const proj = projPts.map(k => `${x(k).toFixed(1)},${y(projected(s, k)).toFixed(1)}`).join(' ');

  const avgPts = vis.map(([k]) => `${x(k).toFixed(1)},${y(avg7(s, k)).toFixed(1)}`).join(' ');
  const dots = vis.map(([k, v]) => `<circle cx="${x(k).toFixed(1)}" cy="${y(v).toFixed(1)}" r="2.2" fill="var(--mut)"/>`).join('');
  const marks = stretch.map(g => {
    const cx = x(g.date), cy = y(g.kg);
    return `<path d="M${cx} ${cy - 5}L${cx + 5} ${cy}L${cx} ${cy + 5}L${cx - 5} ${cy}Z" fill="none" stroke="var(--warn)" stroke-width="1.5"/>
      <text x="${cx - 7}" y="${cy - 7}" text-anchor="end" style="fill:var(--warn)">${g.kg}</text>`;
  }).join('');
  const tx = inRange(today) ? `<line x1="${x(today)}" x2="${x(today)}" y1="${P.t}" y2="${H - P.b}" stroke="var(--sec)" stroke-dasharray="3 3" stroke-width="1"/>` : '';

  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Weight chart">
    ${grid}${xl}${tx}
    <polyline points="${proj}" fill="none" stroke="var(--sec)" stroke-width="1.5" stroke-dasharray="5 4" opacity=".8"/>
    ${dots}
    ${vis.length > 1 ? `<polyline points="${avgPts}" fill="none" stroke="var(--acc-hi)" stroke-width="2.5" stroke-linejoin="round"/>` : ''}
    ${marks}
  </svg>`;
}

export function render(root) {
  const s = store.state;
  const today = dkey();
  const entries = Object.entries(s.weights).sort(([a], [b]) => a < b ? -1 : 1);
  const lastK = entries.length ? entries[entries.length - 1][0] : null;
  const curAvg = lastK ? avg7(s, lastK) : null;
  const prevAvg = lastK ? avg7(s, addDays(lastK, -7)) : null;
  const weekDelta = curAvg != null && prevAvg != null ? curAvg - prevAvg : null;
  const lost = curAvg != null ? s.settings.startWeight - curAvg : null;
  const vsPlan = curAvg != null ? curAvg - projected(s, lastK) : null;

  // ETA from actual 14-day trend.
  let eta = '–';
  const prev14 = lastK ? avg7(s, addDays(lastK, -14)) : null;
  if (curAvg != null && prev14 != null && prev14 > curAvg) {
    const perDay = (prev14 - curAvg) / 14;
    eta = fmtShort(addDays(lastK, Math.ceil((curAvg - s.settings.finalGoal) / perDay))) + ' ' + parseKey(addDays(lastK, Math.ceil((curAvg - s.settings.finalGoal) / perDay))).getFullYear();
  }
  const planGoal = goalDate(s, s.settings.finalGoal);
  const f = (v, d = 1) => v == null ? '–' : (v > 0 ? '+' : '') + v.toFixed(d);

  const history = entries.slice(-14).reverse();

  root.innerHTML = `
    <h1>Progress</h1>
    <div class="gap"></div>
    ${progressTabs('weight')}
    <div class="stats">
      <div class="stat"><b>${curAvg != null ? curAvg.toFixed(1) : '–'}</b><span>7-day avg</span></div>
      <div class="stat"><b class="${weekDelta != null && weekDelta < 0 ? 'good' : ''}">${f(weekDelta)}</b><span>vs last week</span></div>
      <div class="stat"><b>${lost != null ? lost.toFixed(1) : '–'}</b><span>Lost (kg)</span></div>
    </div>
    <div class="gap"></div>
    <div class="stats">
      <div class="stat"><b class="${vsPlan != null && vsPlan <= 0 ? 'good' : vsPlan != null ? 'warn' : ''}">${f(vsPlan)}</b><span>vs projection</span></div>
      <div class="stat"><b class="sm" style="font-size:15px">${eta}</b><span>ETA ${s.settings.finalGoal} kg (trend)</span></div>
      <div class="stat"><b class="sm" style="font-size:15px">${fmtShort(planGoal)} ${parseKey(planGoal).getFullYear()}</b><span>ETA (plan)</span></div>
    </div>

    <h2>Trend</h2>
    <div class="card chart">
      <div class="seg" style="margin-bottom:10px">
        ${[['8w', '8 weeks'], ['start', 'Since start'], ['plan', 'Full plan']].map(([v, l]) =>
          `<button class="btn ${range === v ? 'on-min' : ''}" data-range="${v}">${l}</button>`).join('')}
      </div>
      ${chart(s)}
      <div class="legend">
        <span><i style="background:var(--acc-hi)"></i>7-day avg</span>
        <span><i style="background:var(--mut)"></i>daily</span>
        <span><i style="background:var(--sec)"></i>projection ${s.settings.weeklyRatePct}%/wk</span>
        <span><i style="background:var(--warn)"></i>stretch goals</span>
      </div>
    </div>

    <h2>Log</h2>
    <div class="card">
      <div class="grid2">
        <label class="f"><span>Date</span><input type="date" id="wd" value="${today}" max="${today}"></label>
        <label class="f"><span>Weight (kg)</span><input type="number" inputmode="decimal" step="0.1" id="wk" value="${s.weights[today] ?? ''}"></label>
      </div>
      <label class="f"><span>Waist at navel (cm, weekly, optional)</span><input type="number" inputmode="decimal" step="0.5" id="ww" value="${s.waist[today] ?? ''}"></label>
      <button class="btn pri block" data-a="save">Save</button>
    </div>
    <p class="xs mut">Weigh after waking, after the toilet, before food or water. Daily numbers swing ±1–2 kg from water and salt; only the green line matters.</p>

    ${history.length ? `<h2>History</h2><div class="card"><table class="t">
      <tr><th>Date</th><th class="r">kg</th><th class="r">7d avg</th><th class="r">Waist</th><th></th></tr>
      ${history.map(([k, v]) => `<tr><td>${esc(fmtShort(k))}</td><td class="r num">${v.toFixed(1)}</td>
        <td class="r num">${avg7(s, k).toFixed(1)}</td><td class="r num">${s.waist[k] ?? ''}</td>
        <td class="r"><button class="btn sm" data-del="${k}">✕</button></td></tr>`).join('')}
    </table></div>` : ''}
  `;

  root.onclick = e => {
    const r = e.target.closest('[data-range]');
    if (r) { range = r.dataset.range; return render(root); }
    const del = e.target.closest('[data-del]');
    if (del) {
      if (!confirm(`Delete entry for ${del.dataset.del}?`)) return;
      delete s.weights[del.dataset.del];
      delete s.waist[del.dataset.del];
      save();
      return render(root);
    }
    if (e.target.closest('[data-a="save"]')) {
      const k = root.querySelector('#wd').value || today;
      const kg = parseFloat(root.querySelector('#wk').value.replace(',', '.'));
      const waist = parseFloat(root.querySelector('#ww').value.replace(',', '.'));
      if (!(kg > 30 && kg < 300) && !(waist > 40)) return toast('Enter a weight in kg');
      if (kg > 30 && kg < 300) s.weights[k] = Math.round(kg * 10) / 10;
      if (waist > 40) s.waist[k] = Math.round(waist * 2) / 2;
      save();
      toast('Saved');
      render(root);
    }
  };
}
