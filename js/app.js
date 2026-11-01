import { initStore, flush, store } from './store.js';
import { leave } from './ui.js';
import { applyTheme } from './theme.js';
import * as photos from './views/photos.js';
import * as lifts from './views/lifts.js';
import * as today from './views/today.js';
import * as train from './views/train.js';
import * as library from './views/library.js';
import * as exercise from './views/exercise.js';
import * as meal from './views/meal.js';
import * as weight from './views/weight.js';
import * as shop from './views/shop.js';
import * as more from './views/more.js';
import * as tasks from './views/tasks.js';
import * as plans from './views/plans.js';
import * as review from './views/review.js';
import * as food from './views/food.js';
import * as settings from './views/settings.js';

const routes = { today, train, library, ex: exercise, meal, weight, photos, lifts, store: shop, more, tasks, plans, review, food, settings };
const tabOf = {
  library: 'train', ex: 'train', photos: 'weight', lifts: 'weight',
  tasks: 'more', plans: 'more', review: 'more', food: 'more', settings: 'more',
};

// Hash routes: #name or #name/param (e.g. #ex/back-squat)
export function render() {
  leave();
  applyTheme(store.state);
  const [name, param] = (location.hash.slice(1) || 'today').split('/');
  const view = routes[name] || today;
  const root = document.getElementById('view');
  root.onclick = root.oninput = root.onchange = null;
  view.render(root, param && decodeURIComponent(param));
  const tab = tabOf[name] || (routes[name] ? name : 'today');
  document.querySelectorAll('#nav a').forEach(a => a.classList.toggle('on', a.dataset.r === tab));
}

async function main() {
  await initStore();
  window.addEventListener('hashchange', () => { render(); window.scrollTo(0, 0); });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
    else render(); // date may have rolled over while in background
  });
  render();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
}

main();
