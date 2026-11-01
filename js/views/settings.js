import { store, save, replaceState, uid } from '../store.js';
import { dkey, nextMonday } from '../dates.js';
import { buildICS } from '../ics.js';
import { SECONDARY_PRESETS, REMINDER_LINKS } from '../defaults.js';
import { applyTheme } from '../theme.js';
import { esc, toast, download } from '../ui.js';
import { goalDate } from './weight.js';

const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function render(root) {
  const s = store.state;
  const st = s.settings;
  const field = (key, label, type = 'text', extra = '') =>
    `<label class="f"><span>${label}</span><input type="${type}" data-s="${key}" value="${esc(st[key])}" ${extra}></label>`;

  root.innerHTML = `
    <div class="row between"><h1>Settings</h1><a href="#more" class="btn sm">‹ More</a></div>

    <h2>Look</h2>
    <div class="card">
      <div class="sm mut" style="margin-bottom:8px">Secondary color (highlights, XP, prices, charts). The main color stays dark red.</div>
      <div class="chips">${SECONDARY_PRESETS.map(([n, c]) =>
        `<button class="chip ${st.secondary.toLowerCase() === c ? 'on' : ''}" data-color="${c}"><span class="swatch" style="background:${c}"></span>${n}</button>`).join('')}</div>
      <div class="row" style="margin-top:12px">
        <input type="color" id="color" value="${esc(st.secondary)}">
        <span class="sm mut">Custom color</span>
      </div>
    </div>

    <h2>Goals</h2>
    <div class="card">
      <div class="grid2">
        ${field('startDate', 'Start date (always a Monday)', 'date')}
        ${field('startWeight', 'Start weight (kg)', 'number', 'step="0.1" inputmode="decimal"')}
        ${field('weeklyRatePct', 'Loss rate (% / week)', 'number', 'step="0.1" min="0.3" max="1.2" inputmode="decimal"')}
        ${field('finalGoal', 'Final goal (kg)', 'number', 'step="0.5" inputmode="decimal"')}
      </div>
      <div class="xs mut">Plan reaches ${st.finalGoal} kg around ${goalDate(s, st.finalGoal)}. 0.5–1% / week preserves muscle.</div>
      <div class="gap"></div>
      <div class="sm mut" style="margin-bottom:6px">Stretch goals (shown as markers)</div>
      ${st.stretchGoals.map((g, i) => `<div class="grid2">
        <label class="f"><span>Date</span><input type="date" data-g="${i}" data-k="date" value="${esc(g.date)}"></label>
        <label class="f"><span>kg</span><input type="number" step="0.5" data-g="${i}" data-k="kg" value="${esc(g.kg)}"></label>
      </div>`).join('')}
    </div>

    <h2>Training days</h2>
    <div class="card">
      <div class="sm mut" style="margin-bottom:8px">The Training task and "training day" reminders only appear on these days.</div>
      <div class="chips">${WD.map((d, i) => `<button class="chip ${st.gymDays.includes(i) ? 'on' : ''}" data-wd="${i}">${d}</button>`).join('')}</div>
    </div>

    <h2>Phone reminders</h2>
    ${s.reminders.slice().sort((a, b) => a.time < b.time ? -1 : 1).map(r => {
      const mode = r.days === 'gym' ? 'gym' : r.days ? 'custom' : 'daily';
      return `<div class="card rem ${r.off ? 'excused' : ''}">
        <div class="row">
          <input type="time" value="${esc(r.time)}" data-r="${r.id}" data-k="time" style="width:110px">
          <input value="${esc(r.text)}" data-r="${r.id}" data-k="text" class="grow" placeholder="Reminder text">
        </div>
        <div class="row" style="margin-top:8px">
          <select data-r="${r.id}" data-k="mode" class="grow">
            <option value="daily" ${mode === 'daily' ? 'selected' : ''}>Every day</option>
            <option value="gym" ${mode === 'gym' ? 'selected' : ''}>Training days</option>
            <option value="custom" ${mode === 'custom' ? 'selected' : ''}>Pick days</option>
          </select>
          <select data-r="${r.id}" data-k="link" class="grow">${REMINDER_LINKS.map(([v, l]) =>
            `<option value="${v}" ${r.link === v ? 'selected' : ''}>Opens ${l}</option>`).join('')}</select>
        </div>
        ${mode === 'custom' ? `<div class="chips" style="margin-top:8px">${WD.map((d, i) =>
          `<button class="chip ${r.days.includes(i) ? 'on' : ''}" data-rday="${r.id}:${i}">${d}</button>`).join('')}</div>` : ''}
        <div class="row between" style="margin-top:8px">
          <label class="row sm mut"><input type="checkbox" data-r="${r.id}" data-k="on" ${r.off ? '' : 'checked'}> On</label>
          <button class="btn sm danger" data-rdel="${r.id}">Delete</button>
        </div>
      </div>`;
    }).join('')}
    <button class="btn block" data-a="addrem">+ Add reminder</button>
    <div class="gap"></div>
    <div class="card">
      ${field('appUrl', 'App link inside reminders (your GitHub Pages address)', 'url', 'placeholder="https://yourname.github.io/rebuild/"')}
      <button class="btn pri block" data-a="ics">Download reminders (.ics)</button>
      <p class="xs mut" style="margin-top:10px">Import the file into Google Calendar (calendar.google.com → Settings → Import &amp; export), into a calendar named "Rebuild" whose default notification is "0 minutes before". After changing reminders, download and import again: the same events get updated.</p>
    </div>

    <h2>Built-in task wording</h2>
    <p class="xs mut" style="margin-bottom:8px">Add your own tasks, set their XP and turn tasks on/off in <a href="#tasks" style="color:var(--sec)">Tasks</a>.</p>
    ${s.habits.map((h, i) => h.custom || h.retired ? '' : `<div class="card">
      <div class="row between" style="margin-bottom:8px">
        <b>${esc(h.name)}</b>${h.auto ? '<span class="tag">auto</span>' : ''}
        <label class="row sm mut"><input type="checkbox" data-off="${i}" ${h.off ? '' : 'checked'}> On</label>
      </div>
      <label class="f"><span>Name</span><input data-h="${i}" data-k="name" value="${esc(h.name)}"></label>
      <label class="f"><span>Full version</span><input data-h="${i}" data-k="full" value="${esc(h.full)}"></label>
      ${h.min !== null ? `<label class="f"><span>Minimum version</span><input data-h="${i}" data-k="min" value="${esc(h.min)}"></label>` : ''}
    </div>`).join('')}

    <h2>Backup</h2>
    <div class="card">
      <p class="sm mut">All data lives only on this device. Export weekly and keep the file on your PC / Drive.</p>
      <div class="row">
        <button class="btn grow" data-a="export">Export</button>
        <button class="btn grow" data-a="import">Import</button>
      </div>
      <input type="file" id="file" accept="application/json,.json" hidden>
      <div class="gap"></div>
      <button class="btn danger block" data-a="reset">Erase all data</button>
    </div>
  `;

  root.onchange = e => {
    const t = e.target;
    if (t.id === 'color') {
      st.secondary = t.value;
      applyTheme(s);
      save();
      return render(root);
    }
    if (t.dataset.s === 'startDate') {
      if (!t.value) return;
      st.startDate = nextMonday(t.value); // weeks and chains run Monday → Sunday
      save();
      toast(`Start date: ${st.startDate} (Monday)`);
      return render(root);
    }
    if (t.dataset.r) {
      const r = s.reminders.find(x => x.id === t.dataset.r);
      const k = t.dataset.k;
      if (k === 'on') r.off = !t.checked;
      else if (k === 'mode') r.days = t.value === 'gym' ? 'gym' : t.value === 'custom' ? [1, 2, 3, 4, 5] : null;
      else r[k] = t.value;
      save();
      toast('Saved');
      if (k === 'mode' || k === 'time' || k === 'on') render(root);
      return;
    }
    if (t.dataset.s) {
      st[t.dataset.s] = t.type === 'number' ? (parseFloat(t.value) || st[t.dataset.s]) : t.value;
    } else if (t.dataset.g != null) st.stretchGoals[+t.dataset.g][t.dataset.k] = t.dataset.k === 'kg' ? +t.value : t.value;
    else if (t.dataset.h != null) s.habits[+t.dataset.h][t.dataset.k] = t.value;
    else if (t.dataset.off != null) s.habits[+t.dataset.off].off = !t.checked;
    else if (t.id === 'file') return importFile(t.files[0], root);
    else return;
    save();
    toast('Saved');
  };

  root.onclick = e => {
    const col = e.target.closest('[data-color]');
    if (col) {
      st.secondary = col.dataset.color;
      applyTheme(s);
      save();
      return render(root);
    }
    const rday = e.target.closest('[data-rday]');
    if (rday) {
      const [id, d] = rday.dataset.rday.split(':');
      const r = s.reminders.find(x => x.id === id);
      r.days = r.days.includes(+d) ? r.days.filter(x => x !== +d) : [...r.days, +d].sort();
      save();
      return render(root);
    }
    const rdel = e.target.closest('[data-rdel]');
    if (rdel) {
      if (!confirm('Delete this reminder?')) return;
      s.reminders = s.reminders.filter(x => x.id !== rdel.dataset.rdel);
      save();
      return render(root);
    }
    if (e.target.closest('[data-a="addrem"]')) {
      s.reminders.push({ id: 'r' + uid(), time: '12:00', text: 'New reminder', days: null, link: 'today' });
      save();
      return render(root);
    }
    const wd = e.target.closest('[data-wd]');
    if (wd) {
      const i = +wd.dataset.wd;
      st.gymDays = st.gymDays.includes(i) ? st.gymDays.filter(x => x !== i) : [...st.gymDays, i].sort();
      save();
      return render(root);
    }
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (a === 'ics') download('rebuild-reminders.ics', buildICS(s), 'text/calendar');
    if (a === 'export') download(`rebuild-backup-${dkey()}.json`, JSON.stringify(s, null, 1), 'application/json');
    if (a === 'import') root.querySelector('#file').click();
    if (a === 'reset' && confirm('Erase ALL data on this device? Export first if unsure.') && confirm('Really erase everything?')) {
      indexedDB.deleteDatabase('rebuild');
      try { localStorage.removeItem('rebuild'); } catch { /* ignore */ }
      location.reload();
    }
  };
}

async function importFile(file, root) {
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (!data.settings || !Array.isArray(data.habits) || !data.days) throw new Error('not a Rebuild backup');
    if (!confirm('Replace all current data with this backup?')) return;
    await replaceState(data);
    toast('Backup restored');
    render(root);
  } catch (err) {
    toast('Import failed: ' + err.message);
  }
}
