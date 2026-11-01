import { store } from '../store.js';
import { fmtShort } from '../dates.js';
import { getExercise } from '../exercises.js';
import { family, history, primary, primaryUnit, higherIsBetter, sortedSessions, profile } from '../training.js';
import { icon } from '../icons.js';
import { esc, progressTabs } from '../ui.js';
import { sparkline } from './exercise.js';

// Every exercise you've logged, with its trend, best and dream progress.
export function render(root) {
  const s = store.state;
  const sessions = sortedSessions(s);
  const ids = [...new Set(sessions.flatMap(x => x.ex.map(e => e.id)))];
  const rows = ids.map(id => {
    const ex = getExercise(id, s.customExercises);
    if (!ex) return null;
    const fam = family(ex);
    const h = history(s, id, sessions);
    const vals = h.map(x => primary(fam, x.sets));
    const hib = higherIsBetter(fam);
    const best = hib ? Math.max(...vals) : Math.min(...vals);
    const delta = +(vals[vals.length - 1] - vals[0]).toFixed(1);
    const dream = profile(s, ex).dream;
    return { ex, fam, vals, best, delta, hib, last: h[h.length - 1].date, n: h.length, dream };
  }).filter(Boolean).sort((a, b) => a.last < b.last ? 1 : -1);

  root.innerHTML = `
    <h1>Progress</h1>
    <div class="gap"></div>
    ${progressTabs('lifts')}
    ${rows.length ? `<div class="card" style="padding:0">${rows.map(r => {
      const unit = primaryUnit(r.fam, r.ex);
      const good = r.hib ? r.delta > 0 : r.delta < 0;
      return `<a class="exrow" href="#ex/${r.ex.id}" style="color:inherit;text-decoration:none">
        <div class="grow">
          <div>${esc(r.ex.name)}</div>
          <div class="xs mut">Best ${+r.best.toFixed(1)} ${esc(unit)} · ${r.n} sessions · ${fmtShort(r.last)}${r.dream != null ? ` · dream ${r.dream}` : ''}</div>
          <div class="xs ${good ? 'good' : 'mut'}">${r.delta ? `${r.delta > 0 ? '+' : ''}${r.delta} ${esc(unit)} since start` : 'No change yet'}</div>
        </div>
        ${sparkline(r.vals)}
      </a>`;
    }).join('')}</div>` : `<div class="card center" style="padding:30px 14px">
      <div class="tile sec" style="margin:0 auto 10px">${icon('chart')}</div>
      <div class="sm mut">Log workouts in Train and every exercise gets its own progress graph here.</div></div>`}
    <a class="btn sm" href="#library" style="margin-top:6px">All exercises ›</a>
  `;
}
