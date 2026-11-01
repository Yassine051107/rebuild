import { store, save } from '../store.js';
import { allExercises, GROUPS, EQUIPMENT, KINDS, METRICS, slug } from '../exercises.js';
import { addExercise } from './train.js';
import { esc, toast } from '../ui.js';

let query = '';
let group = 'All';
let adding = false;

export function render(root, mode) {
  const s = store.state;
  const pick = mode === 'pick' && s.activeSession;
  const used = new Set(s.sessions.flatMap(x => x.ex.map(e => e.id)));
  const all = allExercises(s.customExercises);

  const list = () => {
    const q = query.trim().toLowerCase();
    const rows = all
      .filter(e => (group === 'All' || (group === 'Done' ? used.has(e.id) : e.group === group)))
      .filter(e => !q || e.name.toLowerCase().includes(q) || e.equip.toLowerCase().includes(q))
      .sort((a, b) => (used.has(b.id) - used.has(a.id)) || a.name.localeCompare(b.name));
    return rows.length ? rows.map(e => `
      <div class="exrow" data-id="${e.id}">
        <div class="grow"><div>${used.has(e.id) ? '<span class="good">●</span> ' : ''}${esc(e.name)}</div>
        <div class="xs mut">${esc(e.group)} · ${esc(e.equip)} · ${esc(KINDS[e.kind])}${e.custom ? ' · custom' : ''}</div></div>
        <span class="mut">${pick ? '+' : '›'}</span>
      </div>`).join('') : '<p class="mut sm" style="padding:12px">No match. Add it as a custom exercise.</p>';
  };

  root.innerHTML = `
    <div class="row between">
      <h1>${pick ? 'Add exercise' : 'Exercises'}</h1>
      <a href="#train" class="btn sm">‹ ${pick ? 'Workout' : 'Train'}</a>
    </div>
    <div class="gap"></div>
    <input id="q" placeholder="Search ${all.length} exercises" value="${esc(query)}" autocomplete="off">
    <div class="gap"></div>
    <div class="chips scrollx">${['All', 'Done', ...GROUPS].map(g =>
      `<button class="chip ${group === g ? 'on' : ''}" data-g="${g}">${g === 'Done' ? 'Done before' : g}</button>`).join('')}</div>
    <div class="gap"></div>
    ${adding ? `<div class="card">
      <label class="f"><span>Name</span><input id="cn" value="${esc(query)}"></label>
      <div class="grid2">
        <label class="f"><span>Muscle group</span><select id="cg">${GROUPS.map(g => `<option>${g}</option>`).join('')}</select></label>
        <label class="f"><span>Equipment</span><select id="ce">${EQUIPMENT.map(g => `<option>${g}</option>`).join('')}</select></label>
      </div>
      <label class="f"><span>Type (sets the logging and progression rules)</span><select id="ck">${Object.entries(KINDS).map(([k, v]) => `<option value="${k}" ${k === 'S' ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
      <label class="f"><span>Cardio metric (cardio only)</span><select id="cm"><option value="">none</option>${Object.entries(METRICS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></label>
      <div class="row"><button class="btn grow" data-a="cancel">Cancel</button><button class="btn pri grow" data-a="create">Create</button></div>
    </div>` : '<button class="btn sm" data-a="add">+ Custom exercise</button>'}
    <div class="gap"></div>
    <div class="card" style="padding:0" id="list">${list()}</div>
  `;

  root.oninput = e => {
    if (e.target.id === 'q') { query = e.target.value; root.querySelector('#list').innerHTML = list(); }
  };
  root.onclick = e => {
    const g = e.target.closest('[data-g]');
    if (g) { group = g.dataset.g; return render(root, mode); }
    const row = e.target.closest('[data-id]');
    if (row) {
      if (pick) {
        addExercise(s, row.dataset.id);
        save();
        query = '';
        location.hash = 'train';
      } else location.hash = 'ex/' + row.dataset.id;
      return;
    }
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (a === 'add') { adding = true; render(root, mode); }
    if (a === 'cancel') { adding = false; render(root, mode); }
    if (a === 'create') {
      const name = root.querySelector('#cn').value.trim();
      if (!name) return toast('Enter a name');
      const id = 'c_' + slug(name);
      if (all.some(x => x.id === id || x.id === slug(name))) return toast('That exercise already exists');
      const kind = root.querySelector('#ck').value;
      const ex = { id, name, group: root.querySelector('#cg').value, equip: root.querySelector('#ce').value, kind, custom: true };
      const metric = root.querySelector('#cm').value;
      if (kind === 'K' && metric) ex.metric = metric;
      s.customExercises.push(ex);
      save();
      adding = false;
      query = name;
      toast('Exercise created');
      render(root, mode);
    }
  };
}
