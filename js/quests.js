// Weekly tasks (Mon–Sun) and goal tasks (one-time achievements).
// XP tiers: daily 1–40 < weekly 50–200 < goals 250–2000.
import { addDays, weekOf } from './dates.js';
import { getExercise } from './exercises.js';
import { family, primary, higherIsBetter, sortedSessions, sessionPRs } from './training.js';

export const XP_RANGE = { daily: [1, 40], weekly: [50, 200], goal: [250, 2000] };

// "Do habit X on N of 7 days". Excused days (store rewards) count as done.
const habitDays = (id, habit, name, icon, xp, need) => ({
  id, name, icon, xp,
  evaluate(c, days) {
    const h = c.s.habits.find(x => x.id === habit);
    if (!h || h.off) return null;
    const n = days.filter(k => c.inRange(k) && c.applicable(c.s, h, k)
      && (c.excused(k).has(habit) || c.habitVal(c.s, h, k).v === 'full')).length;
    return { n, target: need };
  },
});

export const WEEKLY_TASKS = [
  {
    id: 'w_sessions', name: 'Every training session', icon: 'dumbbell', xp: 200,
    evaluate(c, days) {
      const h = c.s.habits.find(x => x.id === 'train');
      if (!h || h.off) return null;
      const due = days.filter(k => k >= c.s.settings.startDate && c.applicable(c.s, h, k) && !c.excused(k).has('train'));
      if (!due.length) return null;
      return { n: due.filter(k => c.inRange(k) && c.habitVal(c.s, h, k).v).length, target: due.length };
    },
  },
  { id: 'w_kept', name: '7/7 days kept', icon: 'flame', xp: 150, evaluate: (c, days) => ({ n: days.filter(k => c.kept(k)).length, target: 7 }) },
  habitDays('w_nosugar', 'nosugar', 'No sugar 6 of 7 days', 'nosugar', 120, 6),
  habitDays('w_kitchen', 'kitchen', 'Kitchen closed 6 of 7 days', 'lock', 120, 6),
  {
    id: 'w_steps', name: '70,000 steps this week', icon: 'steps', xp: 120, unit: 'steps',
    evaluate: (c, days) => ({ n: days.reduce((a, k) => a + (c.inRange(k) ? c.s.days[k]?.steps || 0 : 0), 0), target: 70000 }),
  },
  habitDays('w_skipbf', 'skipbf', 'Skip breakfast 6 of 7 days', 'coffee', 80, 6),
  habitDays('w_water', 'water', '4 L water 6 of 7 days', 'droplet', 80, 6),
  {
    id: 'w_mealmode', name: '10 meals in Meal Mode', icon: 'timer', xp: 80,
    evaluate: (c, days) => ({ n: c.s.meals.filter(m => m.eaten && days.includes(m.date) && c.inRange(m.date)).length, target: 10 }),
  },
  habitDays('w_weigh', 'weigh', 'Weigh in every day', 'scale', 60, 7),
  { id: 'w_photo', name: 'Progress photo', icon: 'camera', xp: 50, evaluate: (c, days) => ({ n: c.s.photos.filter(p => days.includes(p.date)).length, target: 1 }) },
  { id: 'w_review', name: 'Weekly review written', icon: 'book', xp: 50, evaluate: (c, days) => ({ n: c.s.reviews[days[0]]?.trim() ? 1 : 0, target: 1 }) },
];

export function weeklyTasks(c, mon) {
  const days = weekOf(mon);
  const out = [];
  for (const t of WEEKLY_TASKS) {
    const r = t.evaluate(c, days);
    if (r) out.push({ id: t.id, name: t.name, icon: t.icon, xp: t.xp, unit: t.unit, ...r, done: r.n >= r.target });
  }
  for (const t of c.s.customWeekly) {
    if (t.off) continue;
    const n = c.s.weekCounts[t.id]?.[mon] || 0;
    out.push({ id: t.id, name: t.name, icon: 'star', xp: t.xp, custom: true, n, target: t.target, done: n >= t.target });
  }
  return out;
}

function avg7(weights, k) {
  const vals = [];
  for (let i = 0; i < 7; i++) { const v = weights[addDays(k, -i)]; if (v != null) vals.push(v); }
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
}

// Date the count reached n, from a sorted list of dates.
const nth = (dates, n) => dates.length >= n ? dates[n - 1] : null;
const tiers = (prefix, name, icon, list, dates, unit) =>
  list.map(([n, xp]) => ({ id: `${prefix}${n}`, name: name(n), icon, xp, n: Math.min(dates.length, n), target: n, date: nth(dates, n), unit }));

export function goals(c) {
  const s = c.s;
  const st = s.settings;
  const out = [];

  // Weight: 7-day average milestones every 5 kg toward the final goal, worth more as you go.
  const wDates = Object.keys(s.weights).sort();
  const best = wDates.reduce((m, k) => Math.min(m, avg7(s.weights, k) ?? Infinity), Infinity);
  const firstBelow = target => wDates.find(k => avg7(s.weights, k) <= target) || null;
  const lost = Number.isFinite(best) ? +(st.startWeight - best).toFixed(1) : 0;
  out.push({ id: 'g_first2', name: 'Lose the first 2 kg', icon: 'scale', xp: 250, n: Math.max(0, Math.min(2, lost)), target: 2, date: firstBelow(st.startWeight - 2), unit: 'kg' });
  let i = 0;
  for (let kg = Math.ceil(st.startWeight / 5) * 5 - 5; kg >= st.finalGoal; kg -= 5, i++) {
    if (kg >= st.startWeight - 2) continue;
    out.push({
      id: `g_w${kg}`, name: `Reach ${kg} kg (7-day avg)`, icon: 'scale', xp: Math.min(2000, 400 + 150 * i),
      n: Math.max(0, Math.min(st.startWeight - kg, lost)), target: +(st.startWeight - kg).toFixed(1), date: firstBelow(kg), unit: 'kg lost',
    });
  }

  // Consistency.
  const chainDates = Object.keys(c.chainFirst).map(Number).sort((a, b) => a - b).map(n => c.chainFirst[n]);
  out.push(...tiers('g_chain', n => `${n}-day chain`, 'flame', [[7, 250], [14, 400], [30, 800], [60, 1200], [100, 1600], [365, 2000]], chainDates, 'days'));
  const perfectWeeks = c.perfectWeeks;
  out.push({ id: 'g_perfectweek', name: 'Perfect week (7 perfect days)', icon: 'crown', xp: 600, n: Math.min(1, perfectWeeks.length), target: 1, date: perfectWeeks[0] || null });

  // Training.
  const sessions = sortedSessions(s);
  out.push(...tiers('g_sess', n => `${n} workouts logged`, 'dumbbell', [[10, 300], [25, 500], [50, 800], [100, 1500]], sessions.map(x => x.date), 'workouts'));
  const prDates = sessions.flatMap(x => sessionPRs(s, x, sessions).map(() => x.date));
  out.push(...tiers('g_pr', n => `${n} personal records`, 'trophy', [[10, 300], [25, 600], [50, 1000]], prDates, 'PRs'));
  for (const [id, conf] of Object.entries(s.exSettings)) {
    if (conf.dream == null) continue;
    const ex = getExercise(id, s.customExercises);
    if (!ex) continue;
    const fam = family(ex);
    const hib = higherIsBetter(fam);
    let date = null, bestV = hib ? 0 : Infinity;
    for (const x of sessions) {
      const sets = x.ex.filter(e => e.id === id).flatMap(e => e.sets);
      if (!sets.length) continue;
      const v = primary(fam, sets);
      bestV = hib ? Math.max(bestV, v) : Math.min(bestV, v);
      if (!date && (hib ? v >= conf.dream : v <= conf.dream)) date = x.date;
    }
    out.push({ id: `g_dream_${id}`, name: `Dream lift: ${ex.name} ${conf.dream}`, icon: 'trophy', xp: 1000, n: Number.isFinite(bestV) ? bestV : 0, target: conf.dream, date, unit: '', inverse: !hib });
  }

  // Steps, photos.
  const stepDays = k => Object.keys(s.days).filter(d => (s.days[d].steps || 0) >= k).sort();
  out.push(...tiers('g_20k', () => 'A 20,000-step day', 'steps', [[1, 300]], stepDays(20000), ''));
  out.push(...tiers('g_10kx', n => `10k+ steps on ${n} days`, 'steps', [[30, 600], [100, 1200]], stepDays(10000), 'days'));
  const photos = s.photos.map(p => p.date).sort();
  out.push(...tiers('g_photo', n => `${n} progress photos`, 'camera', [[4, 250], [12, 500]], photos, 'photos'));

  for (const g of s.customGoals) {
    out.push({ id: g.id, name: g.name, icon: 'star', xp: g.xp, n: g.achieved ? 1 : 0, target: 1, date: g.achieved || null, custom: true, desc: g.desc });
  }

  // Achievements before the start date are credited on the start date.
  for (const g of out) if (g.date && g.date < st.startDate) g.date = st.startDate;
  return out;
}
