import { store, save, uid } from '../store.js';
import { dkey, addDays, hhmm } from '../dates.js';
import { MEAL_REASONS } from '../defaults.js';
import { esc, toast, mmss, vibrate, ring, chips, onLeave, keepAwake } from '../ui.js';

const TARGET_SEC = 20 * 60;
const WAIT_SEC = 20 * 60;
const NOT_HUNGRY_REASONS = new Set(['Food is ready', 'Bored / phone', 'Stress / mood', 'Others eating']);
const SETUP = [
  ['plate', 'One plate served. Pot / shared dish stays away'],
  ['phone', 'Phone in another room or face down'],
  ['seated', 'Sitting at a table, no screen'],
  ['water', 'Glass of water next to the plate'],
];

export function render(root) {
  const s = store.state;
  const m = s.activeMeal;
  if (!m) return renderIdle(root, s);
  ({ check: renderCheck, nothungry: renderNotHungry, wait: renderWait, setup: renderSetup, eating: renderEating, after: renderAfter })[m.step](root, s, m);
}

function finish(s, extra) {
  const m = s.activeMeal;
  s.meals.push({
    id: uid(), date: dkey(new Date(m.start)), ts: m.start,
    hunger: m.hunger, reason: m.reason, setup: m.setup || {},
    durationSec: m.eatStart ? Math.round(((m.eatEnd || Date.now()) - m.eatStart) / 1000) : 0,
    ...extra,
  });
  s.activeMeal = null;
  save();
}

function renderIdle(root, s) {
  const today = dkey();
  const todays = s.meals.filter(m => m.date === today);
  const week = s.meals.filter(m => m.date > addDays(today, -7));
  const eaten = week.filter(m => m.eaten);
  const avgMin = eaten.length ? eaten.reduce((a, m) => a + m.durationSec, 0) / eaten.length / 60 : 0;
  const lowHunger = week.filter(m => m.hunger <= 3);
  const avgFull = eaten.filter(m => m.fullness).length ? eaten.reduce((a, m) => a + (m.fullness || 0), 0) / eaten.filter(m => m.fullness).length : 0;
  const seconds = eaten.filter(m => m.seconds).length;

  root.innerHTML = `
    <h1>Meal Mode</h1>
    <p class="mut sm">Hunger check → set up → 20-min paced eating → fullness check.</p>
    <div class="gap"></div>
    <button class="btn pri block huge" data-a="start">Start meal</button>

    <h2>Last 7 days</h2>
    <div class="stats">
      <div class="stat"><b>${avgMin ? avgMin.toFixed(1) : '–'}</b><span>Avg min / meal</span></div>
      <div class="stat"><b>${avgFull ? avgFull.toFixed(1) : '–'}</b><span>Avg fullness</span></div>
      <div class="stat"><b>${seconds}</b><span>Took seconds</span></div>
    </div>
    <div class="gap"></div>
    <div class="stats">
      <div class="stat"><b>${eaten.length}</b><span>Meals logged</span></div>
      <div class="stat"><b>${lowHunger.length}</b><span>Hunger ≤3</span></div>
      <div class="stat"><b>${week.filter(m => !m.eaten).length}</b><span>Skipped (not hungry)</span></div>
    </div>

    <h2>Today</h2>
    <div class="card">
      ${todays.length ? `<table class="t"><tr><th>Time</th><th>Hunger</th><th>Why</th><th class="r">Min</th><th class="r">Full</th></tr>
      ${todays.map(m => `<tr><td>${hhmm(m.ts)}</td><td>${m.hunger}</td><td>${esc(m.reason || '')}${m.eaten ? '' : ' · skipped'}</td>
        <td class="r">${m.eaten ? (m.durationSec / 60).toFixed(0) : '–'}</td><td class="r">${m.fullness || '–'}</td></tr>`).join('')}</table>`
      : '<span class="mut sm">No meals logged today.</span>'}
    </div>
  `;
  root.onclick = e => {
    if (e.target.closest('[data-a="start"]')) {
      s.activeMeal = { step: 'check', start: Date.now(), hunger: 5, reason: null };
      save();
      render(root);
    }
  };
}

function renderCheck(root, s, m) {
  root.innerHTML = `
    <h1>Hunger check</h1>
    <div class="gap"></div>
    <div class="card">
      <div class="row between"><span>Hunger right now</span><span class="mid num" id="hv">${m.hunger}/10</span></div>
      <input type="range" min="1" max="10" value="${m.hunger}" id="hunger">
      <div class="row between xs mut"><span>1 not hungry</span><span>10 starving</span></div>
    </div>
    <div class="card">
      <div class="sm mut" style="margin-bottom:10px">Why am I eating now?</div>
      ${chips('reason', MEAL_REASONS, m.reason)}
    </div>
    <div class="row">
      <button class="btn" data-a="cancel">Cancel</button>
      <button class="btn pri grow" data-a="next" ${m.reason ? '' : 'disabled'}>Next</button>
    </div>
  `;
  root.oninput = e => {
    if (e.target.id === 'hunger') { m.hunger = +e.target.value; root.querySelector('#hv').textContent = `${m.hunger}/10`; save(); }
  };
  root.onclick = e => {
    const chip = e.target.closest('[data-chip]');
    if (chip) { m.reason = chip.dataset.val; save(); return render(root); }
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (a === 'cancel') { s.activeMeal = null; save(); render(root); }
    if (a === 'next') {
      m.step = m.hunger <= 3 && NOT_HUNGRY_REASONS.has(m.reason) ? 'nothungry' : 'setup';
      save();
      render(root);
    }
  };
}

function renderNotHungry(root, s, m) {
  root.innerHTML = `
    <h1>Hunger ${m.hunger}/10</h1>
    <div class="gap"></div>
    <div class="card">
      <div class="mid">Reason: ${esc(m.reason)}</div>
      <p class="mut sm" style="margin-top:6px">Hunger ≤ 3 with a non-hunger reason. Food will still be there in 20 min.</p>
    </div>
    <button class="btn pri block" data-a="wait">Wait 20 min, then re-check</button>
    <div class="gap"></div>
    <button class="btn block" data-a="skip">Skip, eat at next meal time</button>
    <div class="gap"></div>
    <button class="btn block" data-a="eat">Eat anyway (logged)</button>
  `;
  root.onclick = e => {
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (a === 'wait') { m.step = 'wait'; m.waitStart = Date.now(); save(); render(root); }
    if (a === 'skip') { finish(s, { eaten: false }); toast('Logged: skipped, not hungry (+0 food)'); render(root); }
    if (a === 'eat') { m.overrode = true; m.step = 'setup'; save(); render(root); }
  };
}

function renderWait(root, s, m) {
  let t;
  const draw = () => {
    const left = WAIT_SEC - (Date.now() - m.waitStart) / 1000;
    root.innerHTML = `
      <h1>Waiting</h1>
      ${ring(1 - left / WAIT_SEC, mmss(left), 'until re-check')}
      <p class="center mut sm">Drink water. Leave the kitchen.</p>
      <div class="gap"></div>
      <button class="btn block" data-a="recheck">Re-check hunger now</button>
      <div class="gap"></div>
      <button class="btn block" data-a="skip">Not hungry anymore, skip</button>
    `;
    if (left <= 0) { clearInterval(t); vibrate([200, 100, 200]); }
  };
  t = setInterval(draw, 1000);
  draw();
  onLeave(() => clearInterval(t));
  root.onclick = e => {
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (a === 'recheck') { clearInterval(t); m.step = 'check'; m.reason = null; save(); render(root); }
    if (a === 'skip') { clearInterval(t); finish(s, { eaten: false, waited: true }); toast('Logged: skipped after waiting'); render(root); }
  };
}

function renderSetup(root, s, m) {
  m.setup = m.setup || {};
  root.innerHTML = `
    <h1>Set up</h1>
    <div class="gap"></div>
    <div class="card">
      ${SETUP.map(([id, label]) => `<label class="check"><input type="checkbox" data-s="${id}" ${m.setup[id] ? 'checked' : ''}><span>${label}</span></label>`).join('')}
    </div>
    <button class="btn pri block huge" data-a="go">Start eating · 20:00</button>
    <div class="gap"></div>
    <button class="btn block" data-a="cancel">Cancel</button>
  `;
  root.onchange = e => { if (e.target.dataset.s) { m.setup[e.target.dataset.s] = e.target.checked; save(); } };
  root.onclick = e => {
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (a === 'go') { m.step = 'eating'; m.eatStart = Date.now(); save(); render(root); }
    if (a === 'cancel') { s.activeMeal = null; save(); render(root); }
  };
}

function renderEating(root, s, m) {
  keepAwake();
  let lastMin = Math.floor((Date.now() - m.eatStart) / 60000);
  root.innerHTML = `
    <h1>Eating</h1>
    <div id="tm"></div>
    <div class="card center" id="cue"><div class="mid">Fork down between bites</div><div class="sm mut">Chew ~15 times. Pulse every minute.</div></div>
    <button class="btn pri block" data-a="done">Done eating</button>
  `;
  const tm = root.querySelector('#tm');
  const cue = root.querySelector('#cue');
  const draw = () => {
    const el = (Date.now() - m.eatStart) / 1000;
    const min = Math.floor(el / 60);
    tm.innerHTML = ring(el / TARGET_SEC, mmss(el), el < TARGET_SEC ? `target ${mmss(TARGET_SEC)}` : 'target reached');
    if (min > lastMin) {
      lastMin = min;
      vibrate(min === 20 ? [300, 120, 300] : 150);
      cue.classList.remove('pulse'); void cue.offsetWidth; cue.classList.add('pulse');
    }
  };
  draw();
  const t = setInterval(draw, 1000);
  onLeave(() => clearInterval(t));
  root.onclick = e => {
    if (e.target.closest('[data-a="done"]')) {
      clearInterval(t);
      m.eatEnd = Date.now();
      m.step = 'after';
      m.fullness = 6;
      save();
      render(root);
    }
  };
}

function renderAfter(root, s, m) {
  const mins = ((m.eatEnd - m.eatStart) / 60000).toFixed(1);
  root.innerHTML = `
    <h1>After the meal</h1>
    <p class="mut sm">Duration ${mins} min.</p>
    <div class="gap"></div>
    <div class="card">
      <div class="row between"><span>Fullness</span><span class="mid num" id="fv">${m.fullness}/10</span></div>
      <input type="range" min="1" max="10" value="${m.fullness}" id="full">
      <div class="row between xs mut"><span>1 still hungry</span><span>10 stuffed</span></div>
    </div>
    <div class="card">
      <label class="check"><input type="checkbox" id="sec" ${m.seconds ? 'checked' : ''}><span>Took a second serving</span></label>
      <label class="check"><input type="checkbox" id="left" ${m.left ? 'checked' : ''}><span>Stopped before the plate was empty (satisfied)</span></label>
    </div>
    <button class="btn pri block" data-a="save">Save meal</button>
  `;
  root.oninput = e => {
    if (e.target.id === 'full') { m.fullness = +e.target.value; root.querySelector('#fv').textContent = `${m.fullness}/10`; save(); }
  };
  root.onchange = e => {
    if (e.target.id === 'sec') m.seconds = e.target.checked;
    if (e.target.id === 'left') m.left = e.target.checked;
    save();
  };
  root.onclick = e => {
    if (e.target.closest('[data-a="save"]')) {
      finish(s, { eaten: true, fullness: m.fullness, seconds: !!m.seconds, left: !!m.left, overrode: !!m.overrode });
      toast(`Meal logged · ${mins} min`);
      render(root);
    }
  };
}
