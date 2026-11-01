import { store, save, uid } from '../store.js';
import { putPhoto, getPhoto, deletePhoto } from '../db.js';
import { dkey, fmtShort, parseKey } from '../dates.js';
import { icon } from '../icons.js';
import { esc, toast, chips, onLeave, progressTabs } from '../ui.js';
import { avg7 } from './weight.js';

const POSES = ['Front', 'Side', 'Back', 'Other'];
let pending = null;   // { blob, url, date, pose, note } while adding
let compare = false;
let picked = [];
const urls = new Map(); // photo id -> object URL (kept for the session)

// Downscale to keep storage small: longest side 1400px, JPEG 85%.
async function shrink(file) {
  const img = await createImageBitmap(file);
  const scale = Math.min(1, 1400 / Math.max(img.width, img.height));
  const c = Object.assign(document.createElement('canvas'), { width: Math.round(img.width * scale), height: Math.round(img.height * scale) });
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return new Promise(r => c.toBlob(r, 'image/jpeg', 0.85));
}

async function urlFor(id) {
  if (urls.has(id)) return urls.get(id);
  const blob = await getPhoto(id);
  if (!blob) return '';
  const u = URL.createObjectURL(blob);
  urls.set(id, u);
  return u;
}

const weightAt = (s, k) => { const v = avg7(s, k); return v == null ? null : +v.toFixed(1); };

function viewer(s, ids) {
  const photos = ids.map(id => s.photos.find(p => p.id === id)).filter(Boolean).sort((a, b) => a.date < b.date ? -1 : 1);
  const el = document.createElement('div');
  el.className = 'viewer';
  const w = photos.map(p => weightAt(s, p.date));
  const diff = photos.length === 2 && w[0] != null && w[1] != null ? +(w[1] - w[0]).toFixed(1) : null;
  el.innerHTML = `
    <div class="row between" style="margin-bottom:10px">
      <b>${photos.length === 2 ? `Compare${diff != null ? ` · ${diff > 0 ? '+' : ''}${diff} kg` : ''}` : esc(fmtShort(photos[0].date))}</b>
      <button class="btn sm" data-v="close">Close</button>
    </div>
    <div class="imgs">${photos.map((p, i) => `<div>
      <img data-id="${p.id}" alt="Progress photo ${esc(p.date)}">
      <div class="xs mut center" style="padding:6px 0">${esc(fmtShort(p.date))} ${parseKey(p.date).getFullYear()} · ${esc(p.pose || '')}${w[i] != null ? ` · ${w[i]} kg avg` : ''}${p.note ? `<br>${esc(p.note)}` : ''}</div>
    </div>`).join('')}</div>
    ${photos.length === 1 ? `<div class="row" style="margin-top:8px">
      <input type="date" value="${photos[0].date}" max="${dkey()}" data-v="date" class="grow">
      <button class="btn sm" data-v="save">Download</button>
      <button class="btn sm danger" data-v="del">Delete</button>
    </div>` : ''}
  `;
  document.body.appendChild(el);
  el.querySelectorAll('img').forEach(async img => { img.src = await urlFor(img.dataset.id); });
  const close = () => { el.remove(); render(document.getElementById('view')); };
  onLeave(() => el.remove());
  el.onchange = e => {
    if (e.target.dataset.v === 'date' && e.target.value) { photos[0].date = e.target.value; save(); toast('Date updated'); }
  };
  el.onclick = async e => {
    const v = e.target.closest('[data-v]')?.dataset.v;
    if (v === 'close') close();
    if (v === 'save') {
      const blob = await getPhoto(photos[0].id);
      const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `rebuild-${photos[0].date}-${photos[0].pose || 'photo'}.jpg` });
      a.click();
    }
    if (v === 'del' && confirm('Delete this photo?')) {
      await deletePhoto(photos[0].id);
      s.photos = s.photos.filter(p => p.id !== photos[0].id);
      save();
      close();
    }
  };
}

export function render(root) {
  const s = store.state;
  const sorted = s.photos.slice().sort((a, b) => a.date < b.date ? 1 : -1);
  const months = [];
  for (const p of sorted) {
    const m = parseKey(p.date).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
    if (!months.length || months[months.length - 1][0] !== m) months.push([m, []]);
    months[months.length - 1][1].push(p);
  }

  root.innerHTML = `
    <h1>Progress</h1>
    <div class="gap"></div>
    ${progressTabs('photos')}

    ${pending ? `<div class="card">
      <img src="${pending.url}" alt="New photo" style="width:100%;max-height:50vh;object-fit:contain;border-radius:12px;background:#000">
      <div class="gap"></div>
      <label class="f"><span>Photo date</span><input type="date" id="pd" value="${pending.date}" max="${dkey()}"></label>
      ${chips('pose', POSES, pending.pose)}
      <div class="gap"></div>
      <label class="f"><span>Note (optional)</span><input id="pn" value="${esc(pending.note)}" placeholder="e.g. morning, fasted"></label>
      <div class="row"><button class="btn grow" data-a="cancel">Cancel</button><button class="btn pri grow" data-a="save">Save photo</button></div>
    </div>` : `
    <div class="row">
      <label class="btn pri grow" style="cursor:pointer">${icon('camera')} Add photo<input type="file" id="file" accept="image/*" hidden></label>
      <button class="btn ${compare ? 'on' : ''}" data-a="compare">${icon('compare')} ${compare ? 'Cancel' : 'Compare'}</button>
    </div>
    ${compare ? `<p class="note blue" style="margin-top:10px">Pick 2 photos to compare (${picked.length}/2).</p>` : ''}
    <p class="xs mut" style="margin-top:8px">Same spot, same light, same time of day (morning, before food). Photos stay on this device only and are not in the JSON backup: use Download to keep copies.</p>`}

    ${months.map(([m, list]) => `<h2>${esc(m)}</h2>
      <div class="photos">${list.map(p => `<div class="photo ${picked.includes(p.id) ? 'sel' : ''}" data-id="${p.id}">
        <img data-src="${p.id}" alt="">
        <div class="cap">${esc(fmtShort(p.date))}${p.pose ? ` · ${esc(p.pose)}` : ''}</div>
      </div>`).join('')}</div>`).join('')}
    ${!sorted.length && !pending ? `<div class="card center" style="padding:30px 14px">
      <div class="tile sec" style="margin:0 auto 10px">${icon('camera')}</div>
      <div class="sm mut">No photos yet. Take a "before" set: front, side, back.</div></div>` : ''}
  `;

  root.querySelectorAll('img[data-src]').forEach(async img => { img.src = await urlFor(img.dataset.src); });

  root.onchange = async e => {
    if (e.target.id === 'file' && e.target.files[0]) {
      try {
        const blob = await shrink(e.target.files[0]);
        pending = { blob, url: URL.createObjectURL(blob), date: dkey(), pose: 'Front', note: '' };
      } catch { toast('Could not read that image'); }
      render(root);
    }
    if (e.target.id === 'pd') pending.date = e.target.value || dkey();
  };
  root.oninput = e => { if (e.target.id === 'pn') pending.note = e.target.value; };
  root.onclick = async e => {
    const chip = e.target.closest('[data-chip]');
    if (chip) { pending.pose = chip.dataset.val; return render(root); }
    const ph = e.target.closest('.photo');
    if (ph) {
      if (!compare) return viewer(s, [ph.dataset.id]);
      picked = picked.includes(ph.dataset.id) ? picked.filter(x => x !== ph.dataset.id) : [...picked, ph.dataset.id].slice(-2);
      if (picked.length === 2) { const ids = picked; compare = false; picked = []; render(root); return viewer(s, ids); }
      return render(root);
    }
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (a === 'compare') { compare = !compare; picked = []; render(root); }
    if (a === 'cancel') { URL.revokeObjectURL(pending.url); pending = null; render(root); }
    if (a === 'save') {
      const id = uid();
      try {
        await putPhoto(id, pending.blob);
      } catch { return toast('Storage full or unavailable'); }
      urls.set(id, pending.url);
      s.photos.push({ id, date: pending.date, pose: pending.pose, note: pending.note.trim(), ts: Date.now() });
      pending = null;
      save();
      toast('Photo saved');
      render(root);
    }
  };
}
