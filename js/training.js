// Progressive overload engine.
//
// Weighted lifts use DOUBLE PROGRESSION: keep the weight until every working set reaches the top of
// the exercise's rep range, then add the exercise's increment and restart at the bottom of the range.
// Rep ranges and increments depend on the exercise type (heavy compounds: low reps, big jumps;
// isolation: high reps, small jumps). Missing the bottom of the range twice in a row at the same
// weight triggers a 10% deload; three sessions without any rep gain is treated as a stall.
import { getExercise, METRICS } from './exercises.js';
import { dkey, addDays, daysBetween } from './dates.js';

const LOWER = new Set(['Quads', 'Hamstrings', 'Glutes', 'Calves', 'Adductors']);
const RANGES = { CL: [5, 8], CU: [5, 8], S: [8, 12], I: [10, 15], B: [10, 20], BH: [5, 10], A: [6, 12] };
const REST = { CL: 180, CU: 180, S: 120, I: 75, B: 75, BH: 150, A: 120, T: 60, K: 0 };
export const FAMILY_LABEL = { W: 'weight × reps', B: 'reps (+ optional added kg)', A: 'assistance kg × reps', T: 'seconds (+ optional kg)', K: 'minutes' };

// W = weight×reps, B = bodyweight reps, A = assisted, T = timed, K = cardio
export function family(ex) {
  if (ex.kind === 'K') return 'K';
  if (ex.kind === 'T') return 'T';
  if (ex.kind === 'A') return 'A';
  if (ex.kind === 'B' || ex.kind === 'BH') return 'B';
  return 'W';
}

// Smallest sensible jump for this exercise's equipment and size.
function defaultInc(ex) {
  const lower = LOWER.has(ex.group);
  switch (ex.kind) {
    case 'CL': return 5;
    case 'CU': return 2.5;
    case 'B': case 'BH': return 2.5;
    case 'A': return 5;
    case 'T': return ex.equip === 'Bodyweight' ? 0 : 2;
    case 'K': return 0;
  }
  switch (ex.equip) {
    case 'Dumbbell': return 2;
    case 'Kettlebell': return 4;
    case 'Machine': return lower || ex.kind === 'S' ? 5 : 2.5;
    case 'Barbell': case 'Smith': case 'Trap bar': return lower && ex.kind === 'S' ? 5 : 2.5;
    default: return 2.5;
  }
}

export function profile(s, ex) {
  const o = s.exSettings[ex.id] || {};
  const [lo0, hi0] = RANGES[ex.kind] || [8, 12];
  return {
    fam: family(ex),
    lo: o.lo ?? ex.lo ?? lo0,
    hi: o.hi ?? ex.hi ?? hi0,
    inc: o.inc ?? defaultInc(ex),
    sets: o.sets ?? 3,
    rest: REST[ex.kind] ?? 90,
    dream: o.dream ?? null,
    defaults: { lo: ex.lo ?? lo0, hi: ex.hi ?? hi0, inc: defaultInc(ex) },
  };
}

const order = x => x.date + String(x.start || 0).padStart(15, '0');
export const sortedSessions = s => [...s.sessions].sort((a, b) => order(a) < order(b) ? -1 : 1);

// Every performance of an exercise, oldest first: [{ date, sessionId, sets }]
export function history(s, id, sessions = sortedSessions(s)) {
  return sessions.filter(x => x.ex.some(e => e.id === id))
    .map(x => ({ date: x.date, sessionId: x.id, sets: x.ex.filter(e => e.id === id).flatMap(e => e.sets) }));
}

const round = (x, inc) => inc ? +(Math.round(x / inc) * inc).toFixed(2) : +x.toFixed(2);
const maxOf = (sets, f) => Math.max(0, ...sets.map(x => +x[f] || 0));

// Headline number of a performance (what "best", "current" and PRs compare).
export function primary(fam, sets) {
  if (!sets.length) return 0;
  switch (fam) {
    case 'W': return maxOf(sets, 'kg');
    case 'B': return maxOf(sets, 'reps');
    case 'A': return Math.min(...sets.map(x => +x.kg || 0));
    case 'T': return maxOf(sets, 'sec');
    case 'K': return sets.reduce((a, x) => a + (+x.min || 0), 0);
  }
  return 0;
}
export const higherIsBetter = fam => fam !== 'A';
export const primaryUnit = (fam, ex) => ({ W: 'kg', B: 'reps', A: 'kg assist', T: 's', K: 'min' })[fam];

export function e1rm(kg, reps) { return reps > 0 && reps <= 12 ? kg * (1 + reps / 30) : 0; }

// Double progression on a load + reps pair. For assisted, "load" is assistance (lower = harder).
function doubleProgression(p, h, { inverse = false, unit = 'kg', noun = 'weight' }) {
  const last = h[h.length - 1];
  const loadOf = sets => inverse ? Math.min(...sets.map(x => +x.kg || 0)) : maxOf(sets, 'kg');
  const top = loadOf(last.sets);
  const work = last.sets.filter(x => (+x.kg || 0) === top);
  const n = work.length >= 2 ? Math.min(work.length, 6) : p.sets;
  const reps = work.map(x => +x.reps || 0);
  const fill = (arr, v) => { const a = arr.slice(0, n); while (a.length < n) a.push(v ?? a[a.length - 1] ?? p.lo); return a; };
  const loadTxt = v => v ? `${v} ${unit}` : 'bodyweight';
  const harder = v => inverse ? Math.max(0, round(v - p.inc, p.inc)) : round(v + p.inc, p.inc);
  const easier = v => inverse ? round(v + p.inc, p.inc) : Math.max(0, Math.min(round(v * 0.9, p.inc), round(v - p.inc, p.inc)));

  if (reps.length && reps.every(r => r >= p.hi)) {
    const kg = harder(top);
    const extra = inverse && kg === 0 ? ' Assistance reaches 0: switch to the unassisted version.' : '';
    return {
      kg, reps: fill([], p.lo), type: 'up',
      why: `All ${work.length} sets reached ${p.hi} reps at ${loadTxt(top)} → ${inverse ? 'remove' : 'add'} ${p.inc} ${unit}, restart at ${p.lo} reps.${extra}`,
    };
  }

  // Sessions in a row at this load, and their total reps, to spot failures and stalls.
  const atLoad = [];
  for (let i = h.length - 1; i >= 0; i--) {
    if (loadOf(h[i].sets) !== top) break;
    atLoad.push(h[i].sets.filter(x => (+x.kg || 0) === top));
  }

  if (reps.length && reps.every(r => r >= p.lo)) {
    const totals = atLoad.slice(0, 3).map(w => w.reduce((a, x) => a + (+x.reps || 0), 0));
    if (totals.length === 3 && totals[0] <= totals[1] && totals[1] <= totals[2]) {
      const kg = easier(top);
      return {
        kg, reps: fill([], Math.min(p.hi, p.lo + 2)), type: 'deload',
        why: `No rep gain in 3 sessions at ${loadTxt(top)} → stall. Deload to ${loadTxt(kg)}, build back up with clean reps. Check sleep and protein.`,
      };
    }
    return {
      kg: top, reps: fill(reps.map(r => Math.min(p.hi, r + 1))), type: 'reps',
      why: `All sets inside ${p.lo}–${p.hi} → same ${noun}, +1 rep per set until every set hits ${p.hi}.`,
    };
  }

  const fails = atLoad.findIndex(w => !w.some(x => (+x.reps || 0) < p.lo));
  const failCount = fails === -1 ? atLoad.length : fails;
  if (failCount >= 2 && (top > 0 || inverse)) {
    const kg = easier(top);
    return {
      kg, reps: fill([], Math.min(p.hi, p.lo + 2)), type: 'deload',
      why: `Under ${p.lo} reps at ${loadTxt(top)} in ${failCount} sessions in a row → deload to ${loadTxt(kg)} and build back.`,
    };
  }
  return {
    kg: top, reps: fill([], p.lo), type: 'repeat',
    why: `Some sets under ${p.lo} reps → repeat ${loadTxt(top)}, aim for ${p.lo}+ on every set. Missing twice in a row triggers a deload.`
      + (top === 0 && !inverse ? ' If stuck, use negatives or the assisted version.' : ''),
  };
}

function timed(p, h, ex) {
  const last = h[h.length - 1].sets;
  const kg = maxOf(last, 'kg');
  const sec = maxOf(last.filter(x => (+x.kg || 0) === kg), 'sec');
  const loaded = kg > 0 || ex.equip !== 'Bodyweight';
  const cap = loaded ? 60 : 90;
  if (sec >= cap) {
    if (p.inc) return { kg: round(kg + p.inc, p.inc), sec: 30, type: 'up', why: `Reached ${cap}s → add ${p.inc} kg and restart at 30s.` };
    return { kg, sec, type: 'repeat', why: `${cap}s+ reached → hold a plate or switch to a harder variation; time beyond ${cap}s adds little.` };
  }
  return { kg, sec: sec + 5, type: 'reps', why: `Best hold ${sec}s → aim for ${sec + 5}s (+5s per session up to ${cap}s).` };
}

function cardio(p, h, ex) {
  const last = h[h.length - 1].sets;
  const min = last.reduce((a, x) => a + (+x.min || 0), 0);
  const peak = ['level', 'incline'].includes(ex.metric);
  const val = peak ? maxOf(last, 'val') : +last.reduce((a, x) => a + (+x.val || 0), 0).toFixed(2);
  const label = METRICS[ex.metric] || '';
  if (min < 30) return { min: min + 3, val, type: 'reps', why: `Build the base: +3 min per session up to 30 min (${min} → ${min + 3}).` };
  if (min < 45) return { min: min + 2, val, type: 'reps', why: `+2 min per session up to 45 min (${min} → ${min + 2}).` };
  if (!ex.metric) return { min: Math.min(60, min + 2), val, type: min >= 60 ? 'repeat' : 'reps', why: min >= 60 ? '60 min reached → add intensity with intervals instead of time.' : '+2 min per session up to 60.' };
  const next = ex.metric === 'level' || ex.metric === 'rounds' ? val + 1
    : ex.metric === 'incline' ? val + 0.5
    : +(val * 1.05).toFixed(ex.metric === 'km' ? 2 : 0);
  return { min, val: next, type: 'up', why: `45 min reached → keep time, raise ${label}: ${val || '–'} → ${next}.` };
}

function first(p, ex) {
  const why = {
    W: `First session: 3 sets with a weight you can lift for ${p.hi} reps with 2 reps left in the tank. Progression starts from there.`,
    B: `First session: 3 sets, as many clean reps as possible (stop 1–2 before failure).`,
    A: `First session: pick assistance that allows ${p.hi} reps with 2 in reserve.`,
    T: 'First session: 3 holds, stop when form breaks.',
    K: 'First session: 20 min at a pace where you can still talk.',
  }[p.fam];
  return { type: 'first', why, kg: null, reps: Array(p.sets).fill(p.hi), sec: 30, min: 20, val: null };
}

export function suggest(s, ex, sessions) {
  const p = profile(s, ex);
  const h = history(s, ex.id, sessions);
  if (!h.length) return first(p, ex);
  switch (p.fam) {
    case 'W': return doubleProgression(p, h, {});
    case 'B': return doubleProgression(p, h, { unit: 'kg', noun: 'load' });
    case 'A': return doubleProgression(p, h, { inverse: true, unit: 'kg assist', noun: 'assistance' });
    case 'T': return timed(p, h, ex);
    case 'K': return cardio(p, h, ex);
  }
}

// Short text for a target, e.g. "102.5 kg × 5, 5, 5".
export function targetText(fam, sug, ex) {
  if (sug.type === 'first') return 'First time';
  switch (fam) {
    case 'W': return `${sug.kg} kg × ${sug.reps.join(', ')}`;
    case 'B': return `${sug.reps.join(', ')} reps${sug.kg ? ` +${sug.kg} kg` : ''}`;
    case 'A': return `${sug.kg} kg assist × ${sug.reps.join(', ')}`;
    case 'T': return `${sug.sec}s${sug.kg ? ` @ ${sug.kg} kg` : ''}`;
    case 'K': return `${sug.min} min${sug.val ? ` · ${sug.val} ${METRICS[ex.metric] || ''}` : ''}`;
  }
}

// Default values for set i of a new session from the suggestion.
export function setTarget(fam, sug, i) {
  switch (fam) {
    case 'W': case 'A': return { kg: sug.kg ?? '', reps: sug.reps[i] ?? sug.reps[sug.reps.length - 1] ?? '' };
    case 'B': return { kg: sug.kg || '', reps: sug.reps[i] ?? sug.reps[sug.reps.length - 1] ?? '' };
    case 'T': return { sec: sug.sec ?? '', kg: sug.kg || '' };
    case 'K': return { min: sug.min ?? '', val: sug.val ?? '' };
  }
}

export function setFields(fam, ex) {
  switch (fam) {
    case 'W': return [['kg', 'kg'], ['reps', 'reps']];
    case 'B': return [['reps', 'reps'], ['kg', '+kg']];
    case 'A': return [['kg', 'assist'], ['reps', 'reps']];
    case 'T': return [['sec', 'sec'], ['kg', 'kg']];
    case 'K': return ex.metric ? [['min', 'min'], ['val', METRICS[ex.metric]]] : [['min', 'min']];
  }
}

export const setValid = (fam, x) => fam === 'T' ? +x.sec > 0 : fam === 'K' ? +x.min > 0 : +x.reps > 0;

export function fmtSet(fam, x, ex) {
  switch (fam) {
    case 'W': return `${+x.kg || 0}×${x.reps}`;
    case 'B': return `${x.reps}${+x.kg ? ` +${x.kg}kg` : ''}`;
    case 'A': return `−${+x.kg || 0}kg×${x.reps}`;
    case 'T': return `${x.sec}s${+x.kg ? ` @${x.kg}kg` : ''}`;
    case 'K': return `${x.min} min${+x.val ? ` · ${x.val} ${METRICS[ex.metric] || ''}` : ''}`;
  }
}

export const volume = sets => sets.reduce((a, x) => a + (+x.kg || 0) * (+x.reps || 0), 0);

// Exercises in a session that beat every earlier performance (first-ever doesn't count).
export function sessionPRs(s, sess, sessions = sortedSessions(s)) {
  const idx = sessions.findIndex(x => x.id === sess.id);
  const before = sessions.slice(0, idx);
  const out = [];
  for (const e of sess.ex) {
    const ex = getExercise(e.id, s.customExercises);
    if (!ex || !e.sets.length) continue;
    const fam = family(ex);
    const prev = before.flatMap(x => x.ex.filter(y => y.id === e.id).flatMap(y => y.sets));
    if (!prev.length) continue;
    const cur = primary(fam, e.sets), best = primary(fam, prev);
    if (higherIsBetter(fam) ? cur > best : cur < best) out.push(ex.name);
  }
  return [...new Set(out)];
}

// Start / current / best / dream summary for the exercise detail page.
export function stats(s, ex) {
  const p = profile(s, ex);
  const h = history(s, ex.id);
  if (!h.length) return { p, h, empty: true };
  const fam = p.fam;
  const better = (a, b) => higherIsBetter(fam) ? a > b : a < b;
  const vals = h.map(x => primary(fam, x.sets));
  const start = { v: vals[0], date: h[0].date };
  const current = { v: vals[vals.length - 1], date: h[h.length - 1].date };
  let best = { v: vals[0], date: h[0].date };
  vals.forEach((v, i) => { if (better(v, best.v)) best = { v, date: h[i].date }; });

  // Reps achieved at the best weight, and best estimated 1RM, for weighted lifts.
  let bestReps = null, bestE1rm = 0, bestAddedKg = 0;
  for (const x of h) for (const set of x.sets) {
    if (fam === 'W' && +set.kg === best.v) bestReps = Math.max(bestReps || 0, +set.reps || 0);
    if (fam === 'W') bestE1rm = Math.max(bestE1rm, e1rm(+set.kg || 0, +set.reps || 0));
    if (fam === 'B') bestAddedKg = Math.max(bestAddedKg, +set.kg || 0);
  }

  let progress = null, eta = null;
  if (p.dream != null && p.dream !== start.v) {
    const span = p.dream - start.v;
    progress = Math.max(0, Math.min(1, (current.v - start.v) / span));
    const left = higherIsBetter(fam) ? p.dream - current.v : current.v - p.dream;
    if (left <= 0) eta = { done: true };
    else {
      // Model: one increment per (rep-range width) sessions for double progression.
      const perSession = { W: p.inc / Math.max(1, p.hi - p.lo), A: p.inc / Math.max(1, p.hi - p.lo), B: 0.5, T: 5, K: 2 }[fam] || 1;
      // Use your real rate instead once there's enough history.
      const done = h.length - 1;
      const real = done >= 3 ? Math.abs(current.v - start.v) / done : 0;
      const rate = real > 0 && better(current.v, start.v) ? real : perSession;
      const sessionsLeft = Math.ceil(left / rate);
      const firstDate = h[0].date;
      const weeks = Math.max(1, daysBetween(firstDate, dkey()) / 7);
      const perWeek = Math.max(1, h.filter(x => x.date > addDays(dkey(), -56)).length / Math.min(8, weeks));
      eta = { sessions: sessionsLeft, weeks: Math.ceil(sessionsLeft / perWeek), model: rate === perSession ? 'plan' : 'your rate' };
    }
  }
  return { p, h, fam, start, current, best, bestReps, bestE1rm, bestAddedKg, progress, eta, unit: primaryUnit(fam, ex) };
}
