import { store, save, uid } from '../store.js';
import { esc, toast } from '../ui.js';

let editing = null; // plan id or 'new'

export function render(root) {
  const s = store.state;
  const form = p => `
    <div class="card">
      <label class="f"><span>If (cue / trigger)</span><textarea id="pc" style="min-height:60px">${esc(p?.cue)}</textarea></label>
      <label class="f"><span>Then I will (specific action)</span><textarea id="pt" style="min-height:60px">${esc(p?.then)}</textarea></label>
      <div class="row">
        ${p ? '<button class="btn danger" data-a="del">Delete</button>' : ''}
        <button class="btn grow" data-a="cancel">Cancel</button>
        <button class="btn pri grow" data-a="save">Save</button>
      </div>
    </div>`;

  root.innerHTML = `
    <div class="row between"><h1>If-then plans</h1><a href="#more" class="btn sm">‹ More</a></div>
    <p class="mut sm" style="margin-top:6px">One specific trigger → one specific action. Active plans rotate on the Today screen.</p>
    <div class="gap"></div>
    ${editing === 'new' ? form(null) : '<button class="btn pri block" data-a="new">+ New plan</button>'}
    <div class="gap"></div>
    ${s.plans.map(p => editing === p.id ? form(p) : `
      <div class="card">
        <div class="plan" style="padding:0 0 10px"><b>If</b> ${esc(p.cue)} <b>then</b> ${esc(p.then)}</div>
        <div class="row between">
          <label class="row sm mut"><input type="checkbox" data-toggle="${p.id}" ${p.active ? 'checked' : ''}> Active</label>
          <button class="btn sm" data-edit="${p.id}">Edit</button>
        </div>
      </div>`).join('')}
  `;

  root.onchange = e => {
    const id = e.target.dataset.toggle;
    if (!id) return;
    s.plans.find(p => p.id === id).active = e.target.checked;
    save();
  };
  root.onclick = e => {
    const ed = e.target.closest('[data-edit]');
    if (ed) { editing = ed.dataset.edit; return render(root); }
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (!a) return;
    if (a === 'new') editing = 'new';
    else if (a === 'cancel') editing = null;
    else if (a === 'del') {
      if (!confirm('Delete this plan?')) return;
      s.plans = s.plans.filter(p => p.id !== editing);
      editing = null;
      save();
    } else if (a === 'save') {
      const cue = root.querySelector('#pc').value.trim();
      const then = root.querySelector('#pt').value.trim();
      if (!cue || !then) return toast('Fill both fields');
      if (editing === 'new') s.plans.unshift({ id: uid(), cue, then, active: true });
      else Object.assign(s.plans.find(p => p.id === editing), { cue, then });
      editing = null;
      save();
    }
    render(root);
  };
}
