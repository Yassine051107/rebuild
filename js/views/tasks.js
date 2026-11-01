import { store, save, uid } from '../store.js';
import { dkey, fmtShort, monday, addDays } from '../dates.js';
import { STEP_XP } from '../defaults.js';
import { XP_RANGE } from '../quests.js';
import { ledger } from '../streak.js';
import { icon, habitIcon } from '../icons.js';
import { esc, toast } from '../ui.js';

const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
let tab = 'daily';
let editing = null; // id or 'new'
let draft = null;

const daysText = (s, h) => {
  if (h.date) return `Once · ${fmtShort(h.date)}`;
  const days = h.days === 'gym' ? s.settings.gymDays : h.days;
  if (!days || days.length === 7) return 'Every day';
  return [...days].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map(d => WD[d]).join(' ');
};

const fmtN = (n, unit) => unit === 'steps' ? Math.round(n).toLocaleString() : +(+n).toFixed(1);

export function questRow(t, extra = '') {
  const pct = Math.min(100, (t.target ? t.n / t.target : 0) * 100);
  return `<div class="quest ${t.done || t.date ? 'done' : ''}">
    <div class="tile sm">${icon(t.done || t.date ? 'check' : t.icon)}</div>
    <div class="grow">
      <div class="row between"><span class="qname">${esc(t.name)}</span><span class="xpchip">+${t.xp}</span></div>
      <div class="bar thin"><i style="width:${pct.toFixed(1)}%"></i></div>
      <div class="xs mut">${t.date ? `Achieved ${fmtShort(t.date)}` : `${fmtN(t.unit === 'steps' ? t.n : Math.min(t.n, t.target), t.unit)} / ${fmtN(t.target, t.unit)}${t.unit && t.unit !== 'steps' ? ' ' + t.unit : ''}`}</div>
      ${extra}
    </div>
  </div>`;
}

// #tasks/weekly or #tasks/goals opens that tab directly.
export function render(root, param) {
  if (['daily', 'weekly', 'goals'].includes(param) && param !== tab) { tab = param; editing = null; }
  const s = store.state;
  const L = ledger(s);
  const mon = monday(dkey());
  const [lo, hi] = XP_RANGE[tab === 'goals' ? 'goal' : tab];

  const form = () => `<div class="card">
    <label class="f"><span>Task name</span><input id="tn" value="${esc(draft.name)}"></label>
    ${tab === 'daily' ? `
      <label class="f"><span>What counts as done</span><input id="tf" value="${esc(draft.full)}"></label>
      <label class="f"><span>Minimum version (optional, earns half XP)</span><input id="tm" value="${esc(draft.min || '')}"></label>` : ''}
    ${tab === 'weekly' ? `<label class="f"><span>Times per week</span><input id="tt" type="number" min="1" max="14" value="${draft.target}"></label>` : ''}
    ${tab === 'goals' ? `<label class="f"><span>Description (optional)</span><input id="tf" value="${esc(draft.full || '')}"></label>` : ''}
    <label class="f"><span>XP reward (${lo}–${hi})</span><input id="tx" type="number" min="${lo}" max="${hi}" value="${draft.xp}"></label>
    <p class="xs mut">Tiers keep it fair: daily ${XP_RANGE.daily.join('–')}, weekly ${XP_RANGE.weekly.join('–')}, goals ${XP_RANGE.goal.join('–')} XP.</p>
    ${tab === 'daily' ? `
      <div class="sm mut" style="margin:10px 0 6px">When</div>
      <div class="chips">${[['daily', 'Every day'], ['days', 'Specific days'], ['date', 'One day']].map(([v, l]) =>
        `<button class="chip ${draft.mode === v ? 'on' : ''}" data-mode="${v}">${l}</button>`).join('')}</div>
      ${draft.mode === 'days' ? `<div class="gap"></div><div class="chips">${WD.map((d, i) =>
        `<button class="chip ${draft.days.includes(i) ? 'on' : ''}" data-wd="${i}">${d}</button>`).join('')}</div>` : ''}
      ${draft.mode === 'date' ? `<div class="gap"></div><input type="date" id="td" value="${draft.date}">` : ''}` : ''}
    <div class="gap"></div>
    <div class="row">
      ${editing !== 'new' ? '<button class="btn danger" data-a="del">Delete</button>' : ''}
      <button class="btn grow" data-a="cancel">Cancel</button>
      <button class="btn pri grow" data-a="save">Save</button>
    </div>
  </div>`;

  let body = '';
  if (tab === 'daily') {
    const builtIn = s.habits.filter(h => !h.custom && !h.retired);
    const custom = s.habits.filter(h => h.custom);
    body = `
      <p class="xs mut">Small things done every day. ${XP_RANGE.daily.join('–')} XP each, plus a chain bonus up to +25%.</p>
      <h2>Your daily tasks</h2>
      ${editing === 'new' ? form() : '<button class="btn pri block" data-a="new">+ Add daily task</button>'}
      <div class="gap"></div>
      ${custom.map(h => editing === h.id ? form() : `<div class="card row">
        <div class="tile sm">${icon('star')}</div>
        <div class="grow"><b>${esc(h.name)}</b><div class="xs mut">${esc(daysText(s, h))} · ${h.xp} XP${h.min ? ` / min ${h.minXp}` : ''}</div></div>
        <input type="checkbox" data-off="${h.id}" ${h.off ? '' : 'checked'}>
        <button class="btn sm" data-edit="${h.id}">Edit</button>
      </div>`).join('')}
      <h2>Built-in</h2>
      <div class="card" style="padding:4px 14px">
        ${builtIn.map(h => `<div class="row listrow">
          <div class="tile sm">${icon(habitIcon(h))}</div>
          <div class="grow"><div>${esc(h.name)}${h.auto ? ' <span class="tag">auto</span>' : ''}</div><div class="xs mut">${esc(daysText(s, h))}</div></div>
          <span class="xpchip">${h.type === 'steps' ? 'scaled' : h.xp + (h.min ? ` / ${h.minXp}` : '')}</span>
          <input type="checkbox" data-off="${h.id}" ${h.off ? '' : 'checked'}>
        </div>`).join('')}
      </div>
      <h2>Steps XP</h2>
      <div class="card">
        <table class="t">
          <tr><th>Steps</th><th class="r">Each 1k</th><th class="r">Total</th></tr>
          ${[[1, 5], [6, 10], [11, 15], [16, 20], [21, 25]].map(([a, b]) => {
            const per = STEP_XP.slice(a - 1, b);
            const total = STEP_XP.slice(0, b).reduce((x, y) => x + y, 0);
            return `<tr><td>${a - 1}k–${b}k</td><td class="r num">${[...new Set(per)].join('→')}</td><td class="r num">${total} at ${b}k</td></tr>`;
          }).join('')}
        </table>
      </div>`;
  } else if (tab === 'weekly') {
    const list = L.started ? L.thisWeek : [];
    body = `
      <p class="xs mut">Reset every Monday. ${XP_RANGE.weekly.join('–')} XP each, paid the moment you complete them.</p>
      <h2>This week · ${fmtShort(mon)} – ${fmtShort(addDays(mon, 6))}</h2>
      ${L.started ? '' : `<p class="note blue">Weekly tasks start on ${fmtShort(s.settings.startDate)}.</p>`}
      <div class="card">${list.map(t => questRow(t, t.custom ? `<div class="row" style="margin-top:6px;gap:6px">
          <button class="btn sm" data-cnt="${t.id}" data-d="-1">−</button><button class="btn sm" data-cnt="${t.id}" data-d="1">+1</button></div>` : '')).join('')
        || '<p class="mut sm">Nothing yet.</p>'}</div>
      <h2>Your weekly tasks</h2>
      ${editing === 'new' ? form() : '<button class="btn pri block" data-a="new">+ Add weekly task</button>'}
      <div class="gap"></div>
      ${s.customWeekly.map(t => editing === t.id ? form() : `<div class="card row">
        <div class="tile sm">${icon('star')}</div>
        <div class="grow"><b>${esc(t.name)}</b><div class="xs mut">${t.target}× per week · ${t.xp} XP</div></div>
        <button class="btn sm" data-edit="${t.id}">Edit</button>
      </div>`).join('')}`;
  } else {
    const open = L.goals.filter(g => !g.date).sort((a, b) => (b.n / b.target) - (a.n / a.target));
    const done = L.goals.filter(g => g.date).sort((a, b) => a.date < b.date ? 1 : -1);
    body = `
      <p class="xs mut">One-time achievements. ${XP_RANGE.goal.join('–')} XP each. Set dream lifts in the exercise pages to add lift goals.</p>
      <h2>In progress</h2>
      <div class="card">${open.map(g => questRow(g, g.custom ? `<div class="row" style="margin-top:6px;gap:6px">
        <button class="btn sm pri" data-achieve="${g.id}">Mark achieved</button><button class="btn sm" data-edit="${g.id}">Edit</button></div>` : '')).join('')}</div>
      <h2>Your goals</h2>
      ${editing === 'new' || (editing && s.customGoals.some(g => g.id === editing)) ? form() : '<button class="btn pri block" data-a="new">+ Add goal</button>'}
      ${done.length ? `<h2>Achieved · ${done.length}</h2><div class="card">${done.map(g => questRow(g, g.custom ? `<button class="btn sm" data-unachieve="${g.id}" style="margin-top:6px">Undo</button>` : '')).join('')}</div>` : ''}`;
  }

  root.innerHTML = `
    <div class="row between"><h1>Tasks</h1><a href="#more" class="btn sm">‹ More</a></div>
    <div class="gap"></div>
    <div class="seg tabs">
      ${[['daily', 'Daily'], ['weekly', 'Weekly'], ['goals', 'Goals']].map(([v, l]) =>
        `<button class="btn ${tab === v ? 'on-full' : ''}" data-tab="${v}">${l}</button>`).join('')}
    </div>
    <div class="gap"></div>
    ${body}
  `;

  const readForm = () => {
    if (!root.querySelector('#tn')) return;
    const v = id => root.querySelector(id)?.value;
    draft.name = v('#tn');
    draft.xp = v('#tx');
    if (v('#tf') != null) draft.full = v('#tf');
    if (v('#tm') != null) draft.min = v('#tm');
    if (v('#tt') != null) draft.target = v('#tt');
    if (v('#td') != null) draft.date = v('#td');
  };

  root.onchange = e => {
    const id = e.target.dataset.off;
    if (!id) return;
    s.habits.find(h => h.id === id).off = !e.target.checked;
    save();
    toast(e.target.checked ? 'Task on' : 'Task off');
  };
  root.onclick = e => {
    const el = e.target.closest('button');
    if (!el) return;
    const d = el.dataset;
    if (d.tab) { location.hash = 'tasks/' + d.tab; return; }
    if (d.mode) { readForm(); draft.mode = d.mode; return render(root); }
    if (d.wd != null) {
      readForm();
      const i = +d.wd;
      draft.days = draft.days.includes(i) ? draft.days.filter(x => x !== i) : [...draft.days, i];
      return render(root);
    }
    if (d.cnt) {
      const m = (s.weekCounts[d.cnt] = s.weekCounts[d.cnt] || {});
      m[mon] = Math.max(0, (m[mon] || 0) + +d.d);
      save(); return render(root);
    }
    if (d.achieve) { s.customGoals.find(g => g.id === d.achieve).achieved = dkey(); save(); toast('Goal achieved'); return render(root); }
    if (d.unachieve) { s.customGoals.find(g => g.id === d.unachieve).achieved = null; save(); return render(root); }
    if (d.edit) {
      editing = d.edit;
      if (tab === 'daily') {
        const h = s.habits.find(x => x.id === d.edit);
        draft = { name: h.name, full: h.full, min: h.min, xp: h.xp, mode: h.date ? 'date' : h.days ? 'days' : 'daily', days: h.days || [], date: h.date || dkey() };
      } else if (tab === 'weekly') {
        const t = s.customWeekly.find(x => x.id === d.edit);
        draft = { name: t.name, target: t.target, xp: t.xp };
      } else {
        const g = s.customGoals.find(x => x.id === d.edit);
        draft = { name: g.name, full: g.desc, xp: g.xp };
      }
      return render(root);
    }
    const a = d.a;
    if (a === 'new') {
      editing = 'new';
      draft = { name: '', full: '', min: '', xp: lo === 1 ? 10 : lo, target: 2, mode: 'daily', days: [], date: dkey() };
    } else if (a === 'cancel') editing = null;
    else if (a === 'del') {
      if (!confirm('Delete this task? XP earned from it is removed too.')) return;
      if (tab === 'daily') s.habits = s.habits.filter(h => h.id !== editing);
      if (tab === 'weekly') s.customWeekly = s.customWeekly.filter(h => h.id !== editing);
      if (tab === 'goals') s.customGoals = s.customGoals.filter(h => h.id !== editing);
      editing = null;
      save();
    } else if (a === 'save') {
      readForm();
      const xp = Math.round(+draft.xp);
      const name = draft.name.trim();
      if (!name) return toast('Enter a name');
      if (!(xp >= lo && xp <= hi)) return toast(`XP must be ${lo}–${hi}`);
      if (tab === 'daily') {
        if (draft.mode === 'days' && !draft.days.length) return toast('Pick at least one day');
        const fields = {
          name, full: (draft.full || '').trim() || name,
          min: (draft.min || '').trim() || null, xp, minXp: (draft.min || '').trim() ? Math.max(1, Math.round(xp / 2)) : 0,
          days: draft.mode === 'days' ? [...draft.days].sort() : null,
          date: draft.mode === 'date' ? draft.date : null,
        };
        // Repeating tasks count from today so past days don't become misses.
        if (editing === 'new') s.habits.push({ id: 't_' + uid(), custom: true, since: fields.date ? null : dkey(), ...fields });
        else Object.assign(s.habits.find(h => h.id === editing), fields);
      } else if (tab === 'weekly') {
        const target = Math.round(+draft.target);
        if (!(target >= 1)) return toast('Times per week must be 1+');
        if (editing === 'new') s.customWeekly.push({ id: 'cw_' + uid(), name, target, xp });
        else Object.assign(s.customWeekly.find(t => t.id === editing), { name, target, xp });
      } else {
        if (editing === 'new') s.customGoals.push({ id: 'cg_' + uid(), name, desc: (draft.full || '').trim(), xp, achieved: null });
        else Object.assign(s.customGoals.find(g => g.id === editing), { name, desc: (draft.full || '').trim(), xp });
      }
      editing = null;
      save();
      toast('Saved');
    }
    render(root);
  };
}
