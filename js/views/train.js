import { store, save, uid, day } from '../store.js';
import { dkey, addDays, fmtShort, weekday } from '../dates.js';
import { getExercise } from '../exercises.js';
import {
  family, profile, suggest, targetText, setTarget, setFields, setValid, fmtSet,
  history, sortedSessions, sessionPRs, volume,
} from '../training.js';
import { PR_XP, PR_XP_SESSION_MAX } from '../defaults.js';
import { esc, toast, mmss, vibrate, onLeave, keepAwake } from '../ui.js';
import { icon } from '../icons.js';

let openSession = null; // expanded history entry

export function render(root) {
  const s = store.state;
  if (s.activeSession) renderActive(root, s);
  else renderHome(root, s);
}

export function startSession(s, name = 'Workout', exIds = []) {
  s.activeSession = { start: Date.now(), date: dkey(), name, ex: [], restUntil: 0 };
  exIds.forEach(id => addExercise(s, id));
  save();
}

export function addExercise(s, id) {
  const ex = getExercise(id, s.customExercises);
  if (!ex || !s.activeSession) return;
  const fam = family(ex);
  const sug = suggest(s, ex);
  const n = fam === 'K' ? 1 : (sug.reps?.length || profile(s, ex).sets);
  s.activeSession.ex.push({ id, sets: Array.from({ length: n }, () => ({ done: false })) });
}

function renderHome(root, s) {
  const today = dkey();
  const sessions = sortedSessions(s).reverse();
  const week = s.sessions.filter(x => x.date > addDays(today, -7)).length;
  const isGymDay = s.settings.gymDays.includes(weekday(today));
  const doneToday = s.sessions.some(x => x.date === today);

  root.innerHTML = `
    <div class="row between">
      <h1>Train</h1>
      <span class="tag ${isGymDay ? 'g' : ''}">${isGymDay ? (doneToday ? 'training day · done' : 'training day') : 'rest day'}</span>
    </div>
    <div class="gap"></div>
    <div class="stats">
      <div class="stat"><b>${week}/${s.settings.gymDays.length}</b><span>Sessions · 7d</span></div>
      <div class="stat"><b>${s.sessions.length}</b><span>Total</span></div>
      <div class="stat"><b>${new Set(s.sessions.flatMap(x => x.ex.map(e => e.id))).size}</b><span>Exercises used</span></div>
    </div>
    <div class="gap"></div>
    <button class="btn pri block" data-a="start">Start empty workout</button>
    <div class="gap"></div>
    <div class="row">
      <a class="btn grow" href="#library">${icon('dumbbell')} Exercises</a>
      <a class="btn grow" href="#lifts">${icon('chart')} Lift graphs</a>
    </div>

    <h2>Templates</h2>
    ${s.templates.length ? s.templates.map(t => `
      <div class="card">
        <div class="row between">
          <div class="grow"><b>${esc(t.name)}</b><div class="xs mut">${t.ex.map(id => esc(getExercise(id, s.customExercises)?.name || id)).join(' · ')}</div></div>
          <button class="btn sm pri" data-tpl="${t.id}">Start</button>
        </div>
        <div class="row" style="margin-top:8px"><button class="btn sm" data-deltpl="${t.id}">Delete</button></div>
      </div>`).join('')
    : '<p class="xs mut">Finish a workout with "Save as template" ticked to reuse it.</p>'}

    <h2>History</h2>
    ${sessions.length ? sessions.slice(0, 30).map(x => {
      const prs = sessionPRs(s, x);
      const vol = x.ex.reduce((a, e) => a + volume(e.sets), 0);
      const open = openSession === x.id;
      return `<div class="card">
        <div class="row between" data-open="${x.id}" style="cursor:pointer">
          <div><b>${esc(x.name || 'Workout')}</b><div class="xs mut">${fmtShort(x.date)} · ${x.ex.length} exercises${vol ? ` · ${Math.round(vol).toLocaleString()} kg volume` : ''}</div></div>
          ${prs.length ? `<span class="tag g">${prs.length} PR</span>` : '<span class="mut">›</span>'}
        </div>
        ${open ? `<div class="gap"></div>${x.ex.map(e => {
          const ex = getExercise(e.id, s.customExercises);
          if (!ex) return '';
          const fam = family(ex);
          return `<div class="plan"><a href="#ex/${e.id}" style="color:var(--sec)">${esc(ex.name)}</a>${prs.includes(ex.name) ? ' <span class="tag g">PR</span>' : ''}
            <div class="xs mut">${e.sets.map(z => fmtSet(fam, z, ex)).join(' · ')}</div></div>`;
        }).join('')}
        <div class="row" style="margin-top:8px"><button class="btn sm danger" data-delsess="${x.id}">Delete session</button></div>` : ''}
      </div>`;
    }).join('') : '<p class="mut sm">No sessions yet.</p>'}
  `;

  root.onclick = e => {
    const t = e.target.closest('[data-tpl],[data-deltpl],[data-open],[data-delsess],[data-a]');
    if (!t) return;
    if (t.dataset.a === 'start') { startSession(s); render(root); }
    else if (t.dataset.tpl) {
      const tpl = s.templates.find(x => x.id === t.dataset.tpl);
      startSession(s, tpl.name, tpl.ex);
      render(root);
    } else if (t.dataset.deltpl) {
      if (!confirm('Delete template?')) return;
      s.templates = s.templates.filter(x => x.id !== t.dataset.deltpl);
      save(); render(root);
    } else if (t.dataset.open) {
      openSession = openSession === t.dataset.open ? null : t.dataset.open;
      render(root);
    } else if (t.dataset.delsess) {
      if (!confirm('Delete this session? Its sets and PRs are removed.')) return;
      s.sessions = s.sessions.filter(x => x.id !== t.dataset.delsess);
      save(); render(root);
    }
  };
}

function renderActive(root, s) {
  const a = s.activeSession;
  keepAwake();
  const sessions = sortedSessions(s);

  const cards = a.ex.map((e, i) => {
    const ex = getExercise(e.id, s.customExercises);
    if (!ex) return '';
    const fam = family(ex);
    const sug = suggest(s, ex, sessions);
    const fields = setFields(fam, ex);
    const cols = `grid-template-columns:22px repeat(${fields.length},1fr) 44px 40px`;
    const h = history(s, ex.id, sessions);
    const last = h[h.length - 1];
    return `<div class="card" data-exi="${i}">
      <div class="row between">
        <a href="#ex/${ex.id}" class="name" style="color:var(--tx);font-weight:700;text-decoration:none">${esc(ex.name)} ›</a>
        <div class="row" style="gap:6px">
          <a class="btn sm" href="#ex/${ex.id}" aria-label="Progress graph">${icon('chart')}</a>
          <button class="btn sm" data-up="${i}" ${i === 0 ? 'disabled' : ''}>↑</button>
          <button class="btn sm" data-rmex="${i}">✕</button>
        </div>
      </div>
      <div class="target"><b>Target:</b> ${esc(targetText(fam, sug, ex))}<div class="xs mut">${esc(sug.why)}</div></div>
      ${last ? `<div class="xs mut" style="margin-bottom:8px">Last (${fmtShort(last.date)}): ${last.sets.map(z => fmtSet(fam, z, ex)).join(' · ')}</div>` : ''}
      <div class="setrow head" style="${cols}"><span>#</span>${fields.map(([, l]) => `<span>${esc(l)}</span>`).join('')}<span></span><span></span></div>
      ${e.sets.map((set, j) => {
        const tg = setTarget(fam, sug, j);
        return `<div class="setrow ${set.done ? 'done' : ''}" style="${cols}">
          <span class="mut">${j + 1}</span>
          ${fields.map(([f]) => `<input type="number" inputmode="decimal" step="any" data-i="${i}" data-j="${j}" data-f="${f}" value="${esc(set[f] ?? '')}" placeholder="${esc(tg[f] ?? '')}">`).join('')}
          <button class="btn sm ${set.done ? 'pri' : ''}" data-done="${i}:${j}">✓</button>
          <button class="btn sm" data-rmset="${i}:${j}">−</button>
        </div>`;
      }).join('')}
      <button class="btn sm" data-addset="${i}">+ Set</button>
    </div>`;
  }).join('');

  root.innerHTML = `
    <div class="row between">
      <input id="sname" value="${esc(a.name)}" style="font-weight:700;font-size:18px;max-width:60%">
      <span class="mid num" id="elapsed"></span>
    </div>
    <div class="row" style="margin-top:8px">
      <label class="row xs mut" style="gap:6px">Date <input type="date" id="sdate" value="${a.date}" max="${dkey()}" style="width:auto;padding:6px 8px"></label>
    </div>
    <div id="rest"></div>
    <div class="gap"></div>
    ${cards || '<p class="mut sm">Add your first exercise.</p>'}
    <a class="btn block" href="#library/pick">+ Add exercise</a>
    <div class="gap"></div>
    <div class="card">
      <label class="check"><input type="checkbox" id="tplsave" ${a.saveTpl ? 'checked' : ''}><span>Save as template</span></label>
      <p class="xs mut">Tap ✓ on an empty set to log the target as done. Only completed sets are saved.</p>
    </div>
    <div class="row">
      <button class="btn danger" data-a="discard">Discard</button>
      <button class="btn pri grow" data-a="finish">Finish workout</button>
    </div>
  `;

  const elapsed = root.querySelector('#elapsed');
  const rest = root.querySelector('#rest');
  let buzzed = a.restUntil <= Date.now();
  const tick = () => {
    elapsed.textContent = mmss((Date.now() - a.start) / 1000);
    const left = (a.restUntil - Date.now()) / 1000;
    if (left > 0) {
      rest.innerHTML = `<div class="restbar"><span>Rest <b class="num">${mmss(left)}</b></span><button class="btn sm" data-a="skiprest">Skip</button></div>`;
    } else {
      rest.innerHTML = '';
      if (!buzzed) { buzzed = true; vibrate([250, 100, 250]); toast('Rest over'); }
    }
  };
  tick();
  const t = setInterval(tick, 1000);
  onLeave(() => clearInterval(t));

  root.oninput = e => {
    const el = e.target;
    if (el.id === 'sname') a.name = el.value;
    else if (el.dataset.f) a.ex[+el.dataset.i].sets[+el.dataset.j][el.dataset.f] = el.value;
    save();
  };
  root.onchange = e => {
    if (e.target.id === 'sdate') { a.date = e.target.value || dkey(); save(); }
    if (e.target.id === 'tplsave') { a.saveTpl = e.target.checked; save(); }
  };
  root.onclick = e => {
    const el = e.target.closest('button');
    if (!el) return;
    const d = el.dataset;
    if (d.done) {
      const [i, j] = d.done.split(':').map(Number);
      const ex = getExercise(a.ex[i].id, s.customExercises);
      const fam = family(ex);
      const set = a.ex[i].sets[j];
      if (!set.done) {
        const tg = setTarget(fam, suggest(s, ex, sessions), j);
        for (const [f] of setFields(fam, ex)) if (set[f] === undefined || set[f] === '') set[f] = tg[f] ?? '';
        if (!setValid(fam, set)) return toast('Enter the set first');
        set.done = true;
        const restSec = profile(s, ex).rest;
        if (restSec) { a.restUntil = Date.now() + restSec * 1000; buzzed = false; }
      } else set.done = false;
      save(); return render(root);
    }
    if (d.addset) {
      const sets = a.ex[+d.addset].sets;
      const prev = sets[sets.length - 1] || {};
      const { done, ...vals } = prev;
      sets.push({ ...vals, done: false });
      save(); return render(root);
    }
    if (d.rmset) {
      const [i, j] = d.rmset.split(':').map(Number);
      a.ex[i].sets.splice(j, 1);
      save(); return render(root);
    }
    if (d.rmex) {
      if (!confirm('Remove this exercise from the workout?')) return;
      a.ex.splice(+d.rmex, 1);
      save(); return render(root);
    }
    if (d.up) {
      const i = +d.up;
      [a.ex[i - 1], a.ex[i]] = [a.ex[i], a.ex[i - 1]];
      save(); return render(root);
    }
    if (d.a === 'skiprest') { a.restUntil = 0; buzzed = true; save(); tick(); }
    if (d.a === 'discard') {
      if (!confirm('Discard this workout?')) return;
      s.activeSession = null; save(); render(root);
    }
    if (d.a === 'finish') finish(root, s);
  };
}

function finish(root, s) {
  const a = s.activeSession;
  const ex = a.ex.map(e => {
    const def = getExercise(e.id, s.customExercises);
    const fam = family(def);
    const fields = setFields(fam, def).map(([f]) => f);
    const sets = e.sets.filter(x => x.done && setValid(fam, x))
      .map(x => Object.fromEntries(fields.map(f => [f, +x[f] || 0])));
    return { id: e.id, sets };
  }).filter(e => e.sets.length);
  if (!ex.length) return toast('No completed sets. Tick ✓ on the sets you did.');
  if (!confirm(`Save workout with ${ex.length} exercise(s)?`)) return;

  const sess = { id: uid(), date: a.date, name: a.name || 'Workout', start: a.start, end: Date.now(), ex };
  s.sessions.push(sess);
  if (a.saveTpl) s.templates.push({ id: uid(), name: sess.name, ex: a.ex.map(e => e.id) });
  const d = day(a.date);
  if (d.habits.train !== 'full') d.habits.train = 'full';
  s.activeSession = null;
  save();
  const prs = sessionPRs(s, sess);
  toast(prs.length ? `Saved · ${prs.length} PR (+${Math.min(prs.length, PR_XP_SESSION_MAX) * PR_XP} XP)` : 'Workout saved');
  render(root);
}
