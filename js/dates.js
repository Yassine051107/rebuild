// Dates are stored as local 'YYYY-MM-DD' keys so they sort as strings.
const pad = n => String(n).padStart(2, '0');

export const dkey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function parseKey(k) {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(k, n) {
  const d = parseKey(k);
  d.setDate(d.getDate() + n);
  return dkey(d);
}

export const daysBetween = (a, b) => Math.round((parseKey(b) - parseKey(a)) / 864e5);

export const weekday = k => parseKey(k).getDay();

// Weeks run Monday → Sunday.
export const monday = k => addDays(k, -((parseKey(k).getDay() + 6) % 7));
export const nextMonday = k => parseKey(k).getDay() === 1 ? k : addDays(monday(k), 7);
export const weekOf = mon => [0, 1, 2, 3, 4, 5, 6].map(i => addDays(mon, i));

export const fmtDay = k => parseKey(k).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

export const fmtShort = k => parseKey(k).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

export const hhmm = ts => {
  const d = new Date(ts);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
