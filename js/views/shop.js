import { store, save, uid } from '../store.js';
import { dkey, addDays, fmtShort, monday } from '../dates.js';
import { STORE_ITEMS, REQS, CHAIN_CAP, PR_XP } from '../defaults.js';
import { ledger, levelInfo, habitVal, applicable, excusedOn } from '../streak.js';
import { icon } from '../icons.js';
import { esc, toast } from '../ui.js';

let buying = null; // { id, date }
let showBreakdown = false;

const periodKey = (item, k) => item.per === 'month' ? k.slice(0, 7) : monday(k);
const priceFor = (item, n) => Math.round(item.cost * (1 + 0.5 * n));

function boughtInPeriod(s, item, k) {
  return s.purchases.filter(p => p.item === item.id && periodKey(item, p.date) === periodKey(item, k)).length;
}

// Is a locked reward unlocked? -> { met, progress }
function requirement(s, L, req) {
  const today = dkey();
  const mon = monday(today);
  const weekDays = start => [0, 1, 2, 3, 4, 5, 6].map(i => addDays(start, i));
  switch (req) {
    case 'steps15k3': {
      const count = start => weekDays(start).filter(k => (s.days[k]?.steps || 0) >= 15000).length;
      const cur = count(mon), prev = count(addDays(mon, -7));
      return { met: cur >= 3 || prev >= 3, progress: `This week ${cur}/3 days` };
    }
    case 'nosugar7': {
      const h = s.habits.find(x => x.id === 'nosugar');
      let run = 0;
      let k = habitVal(s, h, today).v === 'full' ? today : addDays(today, -1);
      for (; k >= s.settings.startDate; k = addDays(k, -1)) {
        if (excusedOn(s, k).set.has('nosugar')) break;
        if (habitVal(s, h, k).v !== 'full') break;
        run++;
      }
      return { met: run >= 7, progress: `Current run ${run}/7` };
    }
    case 'allsessions': {
      const train = s.habits.find(x => x.id === 'train');
      const days = weekDays(mon).filter(k => applicable(s, train, k) && !excusedOn(s, k).set.has('train'));
      const done = days.filter(k => k <= today && habitVal(s, train, k).v).length;
      const curMet = days.length > 0 && days.every(k => k <= today) && done === days.length;
      const lastMet = !!L.lastWeek?.some(t => t.id === 'w_sessions' && t.done);
      return { met: curMet || lastMet, progress: `This week ${done}/${days.length} sessions` };
    }
    case 'perfectweek': {
      const kept = weekDays(mon).filter(k => ['hit', 'perfect', 'free'].includes(L.statuses[k])).length;
      const lastMet = !!L.lastWeek?.some(t => t.id === 'w_kept' && t.done);
      return { met: lastMet, progress: `This week ${kept}/7 kept (unlocks next week)` };
    }
    case 'chain30':
      return { met: L.chain >= 30, progress: `Chain ${L.chain}/30` };
  }
  return { met: false, progress: '' };
}

export function render(root) {
  const s = store.state;
  const L = ledger(s);
  const lv = levelInfo(L.total);
  const today = dkey();

  const itemCard = item => {
    const req = item.req ? requirement(s, L, item.req) : null;
    const locked = req && !req.met;
    const target = buying?.id === item.id ? buying.date : today;
    const n = boughtInPeriod(s, item, target);
    const price = priceFor(item, n);
    const soldOut = n >= item.limit;
    const open = buying?.id === item.id;
    const tooPoor = L.balance < price;
    return `<div class="card shop ${locked ? 'locked' : ''}">
      <div class="row between" style="align-items:flex-start">
        <div class="tile ${locked ? 'off' : ''}">${icon(locked ? 'lock' : item.icon)}</div>
        <div class="grow">
          <b>${esc(item.name)}</b>
          <div class="xs mut">${esc(item.desc)}</div>
        </div>
        <div class="price num">${price ? price.toLocaleString() + ' XP' : 'Free'}</div>
      </div>
      <div class="row between xs mut" style="margin-top:8px">
        <span>${n}/${item.limit} this ${item.per}${n && !soldOut ? ` · next costs +50%` : ''}</span>
        ${req ? `<span class="${req.met ? 'good' : ''}">${esc(REQS[item.req])}</span>` : ''}
      </div>
      ${req && !req.met ? `<div class="xs" style="margin-top:4px">${esc(req.progress)}</div>` : ''}
      ${open ? `<div class="gap"></div>
        <div class="chips">${[[-1, 'Yesterday'], [0, 'Today'], [1, 'Tomorrow']].map(([o, l]) => {
          const k = addDays(today, o);
          return k < s.settings.startDate ? '' : `<button class="chip ${buying.date === k ? 'on' : ''}" data-date="${k}">${l}</button>`;
        }).join('')}</div>
        <div class="gap"></div>
        <div class="row"><button class="btn grow" data-a="cancel">Cancel</button>
        <button class="btn pri grow" data-a="confirm" ${tooPoor || soldOut ? 'disabled' : ''}>Buy for ${fmtShort(buying.date)}</button></div>`
      : `<div class="gap"></div><button class="btn sm block" data-buy="${item.id}" ${locked || soldOut ? 'disabled' : ''}>
          ${locked ? 'Locked' : soldOut ? `Limit reached this ${item.per}` : tooPoor ? `Need ${(price - L.balance).toLocaleString()} more XP` : 'Buy'}</button>`}
    </div>`;
  };

  const recent = s.purchases.slice().sort((a, b) => b.ts - a.ts).slice(0, 8);
  const rows = [
    ['Daily tasks', L.habits], [`Chain bonus (now +${L.chainPct}%)`, L.chainBonus],
    ['Weekly tasks', L.weeklyXp], ['Goals', L.goalsXp], ['Training PRs', L.prs],
  ];

  root.innerHTML = `
    <h1>Store</h1>
    <div class="gap"></div>
    <div class="card hero balance">
      <div class="xs mut upper">Balance</div>
      <div class="big">${L.balance.toLocaleString()} <span class="sm mut">XP</span></div>
      <div class="row between xs mut" style="margin-top:6px">
        <span>Lifetime ${L.total.toLocaleString()} · Lv ${lv.level}</span>
        <span>Spent ${L.spent.toLocaleString()}</span>
      </div>
      <div class="gap"></div>
      <div class="row sm">${icon('flame', 'acc')} <span>Chain ${L.chain} days · +${L.chainPct}% XP</span></div>
      <button class="btn sm" style="margin-top:10px" data-a="breakdown">${showBreakdown ? 'Hide' : 'Show'} XP breakdown</button>
      ${showBreakdown ? `<table class="t" style="margin-top:8px">${rows.map(([l, v]) => `<tr><td>${l}</td><td class="r num">${v.toLocaleString()}</td></tr>`).join('')}
        <tr><td>Spent</td><td class="r num">−${L.spent.toLocaleString()}</td></tr></table>
        <div class="xs mut" style="margin-top:8px">
          Chain bonus: +1% per chain day on each kept day, max +${CHAIN_CAP * 100}%.
          Daily tasks 1–40 XP, weekly tasks 50–200, goals 250–2,000 (see Tasks).
          PR +${PR_XP} (max 3/session).
        </div>` : ''}
    </div>

    <h2>Rewards</h2>
    ${STORE_ITEMS.filter(i => !i.req).map(itemCard).join('')}

    <h2>Earned rewards</h2>
    <p class="xs mut" style="margin-bottom:8px">Unlocked by achievements, not just XP.</p>
    ${STORE_ITEMS.filter(i => i.req).map(itemCard).join('')}

    ${recent.length ? `<h2>Purchases</h2><div class="card"><table class="t">
      ${recent.map(p => {
        const it = STORE_ITEMS.find(i => i.id === p.item);
        return `<tr><td>${esc(it?.name || p.item)}<div class="xs mut">for ${fmtShort(p.date)}</div></td><td class="r num">${p.cost}</td>
          <td class="r">${p.date >= today ? `<button class="btn sm" data-refund="${p.id}">Refund</button>` : ''}</td></tr>`;
      }).join('')}
    </table></div>` : ''}
  `;

  root.onclick = e => {
    const el = e.target.closest('[data-buy],[data-date],[data-refund],[data-a]');
    if (!el) return;
    if (el.dataset.buy) { buying = { id: el.dataset.buy, date: today }; return render(root); }
    if (el.dataset.date) { buying.date = el.dataset.date; return render(root); }
    if (el.dataset.refund) {
      if (!confirm('Refund this purchase?')) return;
      s.purchases = s.purchases.filter(p => p.id !== el.dataset.refund);
      save(); toast('Refunded'); return render(root);
    }
    const a = el.dataset.a;
    if (a === 'breakdown') { showBreakdown = !showBreakdown; render(root); }
    if (a === 'cancel') { buying = null; render(root); }
    if (a === 'confirm') {
      const item = STORE_ITEMS.find(i => i.id === buying.id);
      const n = boughtInPeriod(s, item, buying.date);
      const price = priceFor(item, n);
      if (s.purchases.some(p => p.item === item.id && p.date === buying.date)) return toast('Already bought for that day');
      if (n >= item.limit) return toast(`Limit reached this ${item.per}`);
      if (L.balance < price) return toast('Not enough XP');
      s.purchases.push({ id: uid(), item: item.id, date: buying.date, ts: Date.now(), cost: price });
      buying = null;
      save();
      toast(`${item.name} bought · −${price} XP`);
      render(root);
    }
  };
}
