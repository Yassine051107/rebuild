// Line icons (24×24, stroke = currentColor).
const P = {
  dumbbell: '<path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  scale: '<rect x="3" y="4" width="18" height="16" rx="4"/><path d="M8 10a4 4 0 0 1 8 0M12 10l1.6-2"/>',
  coffee: '<path d="M17 8h1a3 3 0 0 1 0 6h-1M3 8h14v6a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5zM7 2v3M11 2v3M15 2v3"/>',
  egg: '<path d="M12 3c-3.5 0-6.5 5-6.5 9.5a6.5 6.5 0 0 0 13 0C18.5 8 15.5 3 12 3z"/>',
  utensils: '<path d="M5 3v7a2 2 0 0 0 4 0V3M7 10v11M17 21V3c-2 1.5-3 4-3 7 0 2 1 3 3 3"/>',
  timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M10 2h4"/>',
  nosugar: '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9zM4 4l16 16"/>',
  droplet: '<path d="M12 3s6.5 6.6 6.5 11.2a6.5 6.5 0 0 1-13 0C5.5 9.6 12 3 12 3z"/>',
  steps: '<path d="M8 3c1.6 0 2.6 2.2 2.6 4.6S9.6 12 8 12 5.4 10 5.4 7.6 6.4 3 8 3zM6 15h4v1.5a2 2 0 0 1-4 0zM16 7c1.6 0 2.6 2.2 2.6 4.6S17.6 16 16 16s-2.6-2-2.6-4.4S14.4 7 16 7zM14 19h4v.5a2 2 0 0 1-4 0z"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
  bed: '<path d="M3 19V7M3 15h18v4M21 15v-3a3 3 0 0 0-3-3h-7v6"/><circle cx="7" cy="11.5" r="2"/>',
  cookie: '<path d="M12 3a9 9 0 1 0 9 9 3 3 0 0 1-3.5-3A3 3 0 0 1 14 5.5 3 3 0 0 1 12 3z"/><path d="M8.5 9.5h.01M8 14h.01M12 12.5h.01M15.5 15.5h.01M11.5 17h.01" stroke-width="2.6"/>',
  burger: '<path d="M4 11a8 6 0 0 1 16 0zM3 14.5h18M4.5 17.5h15a0 0 0 0 1 0 0 2.5 2.5 0 0 1-2.5 2.5h-10a2.5 2.5 0 0 1-2.5-2.5z"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4M9 15.5l2 2 4-4"/>',
  cake: '<path d="M4 21h16v-7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2zM4 16.5c2 1 4 1 5.3 0s4.1-1 5.4 0 3.3 1 5.3 0M12 8v4M12 4.5c.8.8.8 2 0 2.5-.8-.5-.8-1.7 0-2.5z"/>',
  cloche: '<path d="M3 18h18M5 18a7 7 0 0 1 14 0M12 8v3M10 7h4"/>',
  crown: '<path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z"/>',
  camera: '<path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13.5" r="3.5"/>',
  flame: '<path d="M12 3c1 3.2 5 5.2 5 10a5 5 0 0 1-10 0c0-2.2 1-3.8 2.2-4.8.1 2 1.1 3.1 2.3 3.1 0-3-1.4-5.2.5-8.3z"/>',
  trophy: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM17 6h3v1a3 3 0 0 1-3 3M7 6H4v1a3 3 0 0 0 3 3"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  star: '<path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3l-5.5 2.9 1-6.2L3 9.6l6.2-.9z"/>',
  chart: '<path d="M3 3v18h18M7 15l4-4 3 3 6-6"/>',
  book: '<path d="M4 4h6a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H4zM20 4h-6a2 2 0 0 0-2 2v14a2 2 0 0 1 2-2h6z"/>',
  heart: '<path d="M12 20s-7.5-4.6-7.5-10A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 7.5 3c0 5.4-7.5 10-7.5 10z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
  gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M5 12v9h14v-9M12 8v13M12 8c-1.5-3-5-4-5-1.5S10 8 12 8zM12 8c1.5-3 5-4 5-1.5S14 8 12 8z"/>',
  compare: '<rect x="3" y="4" width="8" height="16" rx="1.5"/><rect x="13" y="4" width="8" height="16" rx="1.5"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
};

export const icon = (name, cls = '') =>
  `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || P.star}</svg>`;

export const HABIT_ICONS = {
  phonemorning: 'sun', weigh: 'scale', skipbf: 'coffee', train: 'dumbbell', meals: 'utensils', mealmode: 'timer',
  nosugar: 'nosugar', water: 'droplet', steps: 'steps', kitchen: 'lock', phone: 'moon', move: 'steps',
};
export const habitIcon = h => HABIT_ICONS[h.id] || 'star';
