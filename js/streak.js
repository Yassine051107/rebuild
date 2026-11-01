import { dkey, addDays, weekday, monday, weekOf } from './dates.js';
import { stepXP, STORE_ITEMS, CHAIN_STEP, CHAIN_CAP, PR_XP, PR_XP_SESSION_MAX } from './defaults.js';
import { sessionPRs, sortedSessions } from './training.js';
import { weeklyTasks, goals } from './quests.js';

export const HIT_RATIO = 0.5; // a day with >= 50% of its possible XP counts as kept
export const KEPT = new Set(['hit', 'perfect', 'free']);

export function applicable(s, h, k) {
  if (h.off) return false;
  if (h.since && k < h.since) return false;
  if (h.until && k >= h.until) return false;
  if (h.date) return h.date === k;
  const days = h.days === 'gym' ? s.settings.gymDays : h.days;
  return !days || days.includes(weekday(k));
}

export const habitsFor = (s, k) => s.habits.filter(h => applicable(s, h, k));

// Store purchases applied to day k: excused habit ids (-> reward name) and free-day name.
export function excusedOn(s, k) {
  const set = new Map();
  let free = null;
  for (const p of s.purchases) {
    if (p.date !== k) continue;
    const it = STORE_ITEMS.find(i => i.id === p.item);
    if (!it) continue;
    if (it.free) free = it.name;
    (it.excuse || []).forEach(x => set.set(x, it.name));
  }
  return { set, free };
}

// -> { v: 'full' | 'min' | null, xp, amount? }
export function habitVal(s, h, k) {
  const d = s.days[k] || {};
  const pay = v => v === 'full' ? h.xp : v === 'min' ? (h.minXp || 0) : 0;
  if (h.type === 'steps') {
    const n = d.steps || 0;
    return { v: n >= h.target ? 'full' : n >= h.minTarget ? 'min' : null, xp: stepXP(n), amount: n };
  }
  if (h.type === 'water') {
    const l = d.water || 0;
    const v = l >= h.target ? 'full' : l >= h.minTarget ? 'min' : null;
    return { v, xp: pay(v), amount: l };
  }
  let v = d.habits?.[h.id] || null;
  if (h.auto === 'weigh') v = s.weights[k] != null ? 'full' : null;
  if (h.auto === 'mealmode') {
    const n = s.meals.filter(m => m.date === k && m.eaten).length;
    v = n >= (h.target || 2) ? 'full' : n >= 1 ? 'min' : null;
  }
  if (h.auto === 'train' && v !== 'full' && s.sessions.some(x => x.date === k)) v = 'full';
  return { v, xp: pay(v) };
}

export function dayScore(s, k) {
  const ex = excusedOn(s, k);
  let xp = 0, base = 0, max = 0, full = 0, n = 0;
  for (const h of habitsFor(s, k)) {
    if (ex.set.has(h.id)) continue;
    n++;
    const r = habitVal(s, h, k);
    xp += r.xp;
    base += Math.min(r.xp, h.xp); // steps beyond 10k are bonus, not part of the ratio
    max += h.xp;
    if (r.v === 'full') full++;
  }
  return { xp, max, ratio: max ? base / max : 0, perfect: n > 0 && full === n, free: ex.free, excused: ex.set };
}

// 'none' (outside range), 'perfect', 'hit', 'free', 'miss', or 'pending' (today, not yet hit)
export function dayStatus(s, k, sc = dayScore(s, k)) {
  const today = dkey();
  if (k < s.settings.startDate || k > today) return 'none';
  if (sc.perfect) return 'perfect';
  if (sc.ratio >= HIT_RATIO) return 'hit';
  if (sc.free) return 'free';
  return k === today ? 'pending' : 'miss';
}

// Walks every day from the start date and totals all XP sources.
export function ledger(s) {
  const today = dkey();
  const start = s.settings.startDate;
  const L = {
    habits: 0, chainBonus: 0, weeklyXp: 0, goalsXp: 0, prs: 0,
    perfect: 0, kept: 0, days: 0, chain: 0, chainMisses: 0, best: 0,
    statuses: {}, scores: {}, weeks: {}, goals: [], started: today >= start,
  };
  let cur = 0, misses = 0, prevMiss = false;
  const chainFirst = {}; // chain length -> first date it was reached
  for (let k = start; k <= today; k = addDays(k, 1)) {
    const sc = dayScore(s, k);
    const st = dayStatus(s, k, sc);
    L.statuses[k] = st;
    L.scores[k] = sc;
    L.habits += sc.xp;
    if (st !== 'pending') {
      L.days++;
      if (st === 'miss') {
        if (prevMiss || cur === 0) { cur = 0; misses = 0; }
        else { cur++; misses++; }
        prevMiss = true;
      } else {
        cur++;
        prevMiss = false;
        L.kept++;
        if (st === 'perfect') L.perfect++;
        L.chainBonus += Math.round(sc.xp * Math.min(CHAIN_CAP, cur * CHAIN_STEP));
      }
      if (cur && !chainFirst[cur]) chainFirst[cur] = k;
      L.best = Math.max(L.best, cur);
    }
  }
  const sessions = sortedSessions(s);
  for (const sess of sessions) {
    if (sess.date < start) continue;
    L.prs += Math.min(sessionPRs(s, sess, sessions).length, PR_XP_SESSION_MAX) * PR_XP;
  }

  // Context shared by weekly tasks and goals.
  const perfectWeeks = [];
  const c = {
    s, chainFirst, perfectWeeks, applicable, habitVal,
    excused: k => excusedOn(s, k).set,
    inRange: k => k >= start && k <= today,
    kept: k => KEPT.has(L.statuses[k]),
  };
  if (L.started) {
    for (let mon = monday(start); mon <= today; mon = addDays(mon, 7)) {
      const days = weekOf(mon);
      if (days.every(k => L.statuses[k] === 'perfect')) perfectWeeks.push(days[6]);
      const tasks = weeklyTasks(c, mon);
      L.weeks[mon] = tasks;
      L.weeklyXp += tasks.filter(t => t.done).reduce((a, t) => a + t.xp, 0);
    }
  }
  L.goals = goals(c);
  L.goalsXp = L.started ? L.goals.filter(g => g.date).reduce((a, g) => a + g.xp, 0) : 0;
  L.thisWeek = L.weeks[monday(today)] || [];
  L.lastWeek = L.weeks[addDays(monday(today), -7)] || null;

  L.chain = cur;
  L.chainMisses = misses;
  L.total = L.habits + L.chainBonus + L.weeklyXp + L.goalsXp + L.prs;
  L.spent = s.purchases.reduce((a, p) => a + p.cost, 0);
  L.balance = L.total - L.spent;
  L.chainPct = Math.round(Math.min(CHAIN_CAP, cur * CHAIN_STEP) * 100);
  return L;
}

// Level n starts at 250 * (n-1)^2 lifetime XP (spending never lowers your level).
export function levelInfo(xp) {
  const level = Math.floor(Math.sqrt(xp / 250)) + 1;
  const cur = 250 * (level - 1) ** 2, next = 250 * level ** 2;
  return { level, into: xp - cur, need: next - cur, frac: (xp - cur) / (next - cur) };
}
