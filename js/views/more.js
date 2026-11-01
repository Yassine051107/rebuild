import { icon } from '../icons.js';

const ITEMS = [
  ['tasks', 'target', 'Tasks', 'Daily, weekly and goals · add your own'],
  ['photos', 'camera', 'Progress photos', 'Add photos with dates, compare side by side'],
  ['library', 'dumbbell', 'Exercise library', 'Stats, graphs, dream lifts'],
  ['plans', 'bolt', 'If-then plans', 'Cue → response for each trigger'],
  ['review', 'book', 'Weekly review', 'Completion, triggers, meal data'],
  ['food', 'utensils', 'Food on a budget', 'Cheap protein list + plate rules'],
  ['settings', 'sun', 'Settings', 'Colors, goals, times, reminders, backup'],
];

export function render(root) {
  root.innerHTML = `
    <h1>More</h1>
    <div class="gap"></div>
    <div class="card menu" style="padding:0">
      ${ITEMS.map(([r, ic, t, d]) => `<a href="#${r}"><div class="tile sm">${icon(ic)}</div><div class="grow">${t}<small>${d}</small></div><span class="mut">›</span></a>`).join('')}
    </div>
  `;
}
