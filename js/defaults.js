import { dkey, nextMonday } from './dates.js';
import { findExerciseByName, slug } from './exercises.js';

export const VERSION = 4;

// Secondary color presets (the primary accent is dark red).
export const SECONDARY_PRESETS = [
  ['Gold', '#f2b33d'], ['Steel', '#7cb3f5'], ['Teal', '#2dd4bf'],
  ['Silver', '#cbd5e1'], ['Violet', '#a78bfa'], ['Orange', '#fb923c'],
];

// XP is weighted by difficulty for you: hard, high-impact habits pay more than easy ones.
// Every habit can have a minimum version (about half XP) that keeps the chain alive on bad days.
// days: null = every day, 'gym' = your training days, or an array of weekdays (0 = Sun).
// type: 'water' and 'steps' are counters; `auto` habits are scored from logged data.
const HABITS = [
  { id: 'phonemorning', name: 'No phone first 30 min', full: 'No phone for 30 min after waking', min: 'First 15 min', xp: 10, minXp: 5 },
  { id: 'weigh', name: 'Weigh-in', full: 'Morning weight logged', min: null, xp: 5, auto: 'weigh' },
  { id: 'skipbf', name: 'Skip breakfast', full: 'Only water, black coffee or plain tea until the first meal', min: null, xp: 10 },
  { id: 'train', name: 'Training', full: 'Planned session done (auto when logged in Train)', min: 'Showed up, 20+ min', xp: 40, minXp: 15, days: 'gym', auto: 'train' },
  { id: 'meals', name: '2 meals, protein in each', full: 'Lunch and dinner, each with a protein source', min: '2 meals, one with protein', xp: 15, minXp: 8 },
  { id: 'mealmode', name: 'Meal Mode', full: '2+ meals eaten in Meal Mode', min: '1 meal in Meal Mode', xp: 15, minXp: 8, auto: 'mealmode', target: 2 },
  { id: 'nosugar', name: 'No sugar', full: 'No sweets, soda, juice or sugar in tea/coffee', min: null, xp: 20 },
  { id: 'water', name: 'Water 4 L', full: '4 L', min: '2.5 L', xp: 12, minXp: 6, type: 'water', target: 4, minTarget: 2.5 },
  { id: 'steps', name: 'Steps', full: '10,000+ steps', min: '5,000+ steps', xp: 20, type: 'steps', target: 10000, minTarget: 5000 },
  { id: 'kitchen', name: 'Kitchen closed', full: 'Nothing eaten after kitchen-closed time', min: 'Only a planned protein snack after closing', xp: 20, minXp: 10 },
  { id: 'phone', name: 'Phone out of bed', full: 'Phone charging outside the bed at bedtime', min: 'Screen off by bedtime + 30 min', xp: 10, minXp: 5 },
];


// XP for the nth thousand steps (index 0 = 1st thousand). It grows as you go,
// with bigger jumps after 10k, 15k and 20k. Capped at 25k.
// Totals: 5k = 7, 10k = 20, 15k = 44, 20k = 83, 25k = 133.
export const STEP_XP = [1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 4, 4, 5, 5, 6, 7, 7, 8, 8, 9, 10, 10, 10, 10, 10];
export const stepXP = n => STEP_XP.slice(0, Math.min(STEP_XP.length, Math.floor((n || 0) / 1000))).reduce((a, b) => a + b, 0);

// Consistency rewards.
export const CHAIN_STEP = 0.01; // +1% XP per chain day...
export const CHAIN_CAP = 0.25;  // ...up to +25% at a 25-day chain
export const PR_XP = 15, PR_XP_SESSION_MAX = 3;

const CHEAT = ['nosugar', 'kitchen', 'meals', 'mealmode'];
// Store: prices go up 50% for each extra purchase of the same item in its period.
export const STORE_ITEMS = [
  { id: 'slowmorning', icon: 'sun', name: 'Slow morning', desc: 'Phone allowed in the first 30 min.', cost: 200, limit: 2, per: 'week', excuse: ['phonemorning'] },
  { id: 'breakfast', icon: 'egg', name: 'Breakfast', desc: 'Eat breakfast. Skip-breakfast task excused.', cost: 300, limit: 2, per: 'week', excuse: ['skipbf'] },
  { id: 'cookie', icon: 'cookie', name: 'Cookie / sweet', desc: 'One sweet treat. No-sugar task excused.', cost: 400, limit: 2, per: 'week', excuse: ['nosugar'] },
  { id: 'latesnack', icon: 'moon', name: 'Late snack', desc: 'One snack after kitchen-closed time.', cost: 400, limit: 1, per: 'week', excuse: ['kitchen'] },
  { id: 'skipsession', icon: 'bed', name: 'Skip a session', desc: 'Rest on a planned training day.', cost: 800, limit: 1, per: 'week', excuse: ['train'] },
  { id: 'cheatmeal', icon: 'burger', name: 'Cheat meal', desc: 'One free meal. Sugar, kitchen and meal tasks excused.', cost: 1100, limit: 1, per: 'week', excuse: CHEAT },
  { id: 'freeday', icon: 'calendar', name: 'Free day', desc: 'Chain protected. Tasks still earn XP if you do them.', cost: 2000, limit: 2, per: 'month', free: true },
  { id: 'stepcookie', icon: 'steps', name: 'Free cookie', desc: 'Sweet treat, no XP cost.', cost: 0, limit: 1, per: 'week', excuse: ['nosugar'], req: 'steps15k3' },
  { id: 'dessert', icon: 'cake', name: 'Dessert night', desc: 'Dessert after dinner. Sugar and kitchen excused.', cost: 250, limit: 1, per: 'week', excuse: ['nosugar', 'kitchen'], req: 'nosugar7' },
  { id: 'restaurant', icon: 'cloche', name: 'Restaurant meal', desc: 'Eat out with friends. Meal tasks excused.', cost: 500, limit: 1, per: 'week', excuse: CHEAT, req: 'allsessions' },
  { id: 'perfectcheat', icon: 'gift', name: 'Half-price cheat meal', desc: 'Same as cheat meal, half the price.', cost: 550, limit: 1, per: 'week', excuse: CHEAT, req: 'perfectweek' },
  { id: 'goldenfree', icon: 'crown', name: 'Golden free day', desc: 'Free day at a discount.', cost: 800, limit: 1, per: 'month', free: true, req: 'chain30' },
];
export const REQS = {
  steps15k3: '3 days of 15k+ steps in a week',
  nosugar7: '7 no-sugar days in a row',
  allsessions: 'Every training session of a week done',
  perfectweek: '7/7 days kept in a week',
  chain30: 'A 30-day chain',
};

const PLANS = [
  ['Food is ready but my hunger is 3/10 or less', 'I say "later" and eat at my next meal time, in Meal Mode'],
  ['I sit down to eat', 'One plate served, pot back in the kitchen, phone in another room'],
  ['I finish my plate and want more', 'I drink a glass of water and wait 20 min before deciding'],
  ['It is after kitchen-closed time and I walk to the kitchen', 'Glass of water, brush teeth, leave the kitchen'],
  ['I feel hungry in the morning', 'Water, black coffee or plain tea; first meal at my set time'],
  ['I crave something sweet', 'Fruit or lben, or buy a cookie in the Store if I have the XP'],
  ['I missed yesterday', 'Today I do at least the minimum version of every task'],
  ['I wake up', 'Phone stays on the charger; water first, then 30 min before I touch it'],
  ['I pick up my phone in bed', 'I put it on the charger outside the bed and lie back down'],
  ['I feel tired before a training day', 'Gym clothes on, go for 20 minutes; stay longer only if I want'],
  ['I have been sitting on my phone for 10 min', 'Stand up and walk 1,000 steps'],
];

// Phone reminders, exported as a calendar file. days: null = every day, 'gym' = training days, or weekdays (0 = Sun).
// link = app screen the reminder opens.
export const REMINDER_LINKS = [['today', 'Today'], ['meal', 'Meal Mode'], ['train', 'Train'], ['weight', 'Weight'], ['photos', 'Photos'], ['review', 'Weekly review']];
const REMINDERS = [
  ['08:00', 'Weigh-in, then 30 min no phone', null, 'weight'],
  ['14:00', 'Meal 1: open Meal Mode', null, 'meal'],
  ['17:00', 'Training today (minimum 20 min)', 'gym', 'train'],
  ['18:15', 'Meal 2: open Meal Mode', null, 'meal'],
  ['19:00', 'Done eating for the day', null, 'today'],
  ['21:00', 'Log steps and water', null, 'today'],
  ['00:30', 'Phone out of bed', null, 'today'],
  ['11:00', 'Weekly review + progress photo', [1], 'review'],
];

export function makeDefaultState() {
  return {
    v: VERSION,
    settings: {
      startDate: nextMonday(dkey()), // chains and weeks run Monday → Sunday
      startWeight: 120,
      heightCm: 188,
      age: 19,
      weeklyRatePct: 0.8,
      finalGoal: 80,
      stretchGoals: [
        { date: '2027-01-31', kg: 100 },
        { date: '2027-05-31', kg: 80 },
      ],
      gymDays: [0, 1, 4, 5],
      appUrl: '',
      secondary: '#f2b33d',
    },
    reminders: REMINDERS.map(([time, text, days, link], i) => ({ id: 'r' + i, time, text, days, link })),
    habits: HABITS.map(h => ({ ...h })),
    plans: PLANS.map(([cue, then], i) => ({ id: 'p' + i, cue, then, active: true })),
    days: {},
    meals: [],
    weights: {},
    waist: {},
    sessions: [],
    templates: [],
    exSettings: {},
    customExercises: [],
    purchases: [],
    photos: [],        // metadata only; image data lives in the IndexedDB 'photos' store
    customWeekly: [],  // { id, name, target, xp }
    weekCounts: {},    // { taskId: { monday: count } }
    customGoals: [],   // { id, name, desc, xp, achieved }
    reviews: {},
    activeMeal: null,
    activeSession: null,
  };
}

// Fill in fields added in later versions without touching existing data.
export function migrate(s) {
  const base = makeDefaultState();
  const oldVersion = s.v || 1;
  for (const k of Object.keys(base)) if (s[k] === undefined) s[k] = base[k];
  for (const k of Object.keys(base.settings)) if (s.settings[k] === undefined) s.settings[k] = base.settings[k];
  if (oldVersion < 2) upgradeV1(s);
  if (oldVersion < 3) upgradeV2(s);
  if (oldVersion < 4) upgradeV3(s);
  s.v = VERSION;
  return s;
}

// The Urge tab was removed (craving logs and its settings go with it), and
// fixed reminder times became an editable reminder list.
function upgradeV3(s) {
  for (const k of ['cravings', 'activeUrge', 'why', 'replacements']) delete s[k];
  for (const k of ['weighTime', 'mealTimes', 'kitchenClosed', 'bedtime', 'gymTime', 'reviewTime']) delete s.settings[k];
}

// Weeks now run Monday → Sunday: move a mid-week start to the next Monday and
// drop weights logged in the days that are now before the start (pre-start test entries).
function upgradeV2(s) {
  const old = s.settings.startDate;
  const start = nextMonday(old);
  if (start === old) return;
  for (const k of Object.keys(s.weights)) if (k >= old && k < start) delete s.weights[k];
  s.settings.startDate = start;
}

function upgradeV1(s) {
  const today = dkey();
  const old = Object.fromEntries(s.habits.map(h => [h.id, h]));
  // New habits start counting today, so past days don't turn into misses.
  s.habits = HABITS.map(h => {
    const next = { ...h };
    if (old[h.id]) { if (old[h.id].off) next.off = true; }
    else next.since = today;
    return next;
  });
  // 'Move' is replaced by Training + Steps; keep it for past days only.
  if (old.move) s.habits.push({ ...old.move, xp: 10, minXp: 5, until: today, retired: true });

  s.settings.gymDays = [0, 1, 4, 5];

  const skipped = s.plans.find(p => p.cue === 'I skipped a meal');
  if (skipped) Object.assign(skipped, { cue: 'I feel hungry in the morning', then: 'Water, black coffee or plain tea; first meal at my set time' });

  // Old single-line gym log entries become training sessions.
  for (const w of s.workouts || []) {
    const ex = [];
    for (const l of w.lifts || []) {
      let e = findExerciseByName(l.name, s.customExercises);
      if (!e) {
        e = { id: 'c_' + slug(l.name), name: l.name, group: 'Other', equip: 'Other', kind: 'S', custom: true };
        if (!s.customExercises.some(c => c.id === e.id)) s.customExercises.push(e);
      }
      ex.push({ id: e.id, sets: [{ kg: l.kg, reps: l.reps }] });
    }
    s.sessions.push({ id: w.id, date: w.date, name: w.split, start: null, end: null, ex });
  }
  delete s.workouts;
}

export const MEAL_REASONS = ['Hungry', 'Meal time', 'Food is ready', 'Bored / phone', 'Stress / mood', 'Others eating'];

// Cheap protein sources available in Morocco, roughly cheapest per gram of protein first.
export const FOODS = [
  { name: 'Lentils (3des)', protein: '~9 g per 100 g cooked', note: 'Cheapest protein. Cook a big pot for 3 days.' },
  { name: 'Eggs', protein: '~6 g each', note: '3–4 eggs = one protein serving.' },
  { name: 'Chickpeas (hommos)', protein: '~9 g per 100 g cooked', note: 'Dry is far cheaper than canned.' },
  { name: 'White beans (loubia)', protein: '~9 g per 100 g cooked', note: 'Classic loubia, go light on bread.' },
  { name: 'Sardines', protein: '~25 g per 100 g', note: 'Fresh from the market or canned. Also omega-3.' },
  { name: 'Lben / raib', protein: '~3–4 g per 100 ml', note: 'Good planned evening snack.' },
  { name: 'Milk', protein: '~3.3 g per 100 ml', note: '500 ml ≈ 16 g.' },
  { name: 'Canned tuna', protein: '~25 g per can', note: 'Drain the oil.' },
  { name: 'Chicken (thighs / whole)', protein: '~25 g per 100 g', note: 'Whole chicken is cheaper per kg than breast.' },
  { name: 'Soy chunks', protein: '~50 g per 100 g dry', note: 'Very cheap per gram if you find them.' },
  { name: 'Jben / fresh cheese', protein: '~11 g per 100 g', note: '' },
];

export const PLATE_RULES = [
  'Half the plate vegetables (tomato, carrot, zucchini, salad, khobiza).',
  'One protein serving from the list.',
  'Bread: one quarter of a khobz per meal, not half or a whole one.',
  'Tajine/couscous at family meals: one served plate, sauce and vegetables first, no eating from the shared dish after your portion.',
  'Drinks: water or unsweetened tea. Sweet tea counts as food.',
  'Oil: one spoon, not a pour.',
];
