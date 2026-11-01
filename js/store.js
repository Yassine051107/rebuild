import { load, save as persist } from './db.js';
import { makeDefaultState, migrate } from './defaults.js';

export const store = { state: null };

export async function initStore() {
  const saved = await load();
  store.state = saved ? migrate(saved) : makeDefaultState();
  if (!saved) await persist(store.state);
}

let timer;
export function save() {
  clearTimeout(timer);
  timer = setTimeout(() => persist(store.state), 150);
}
export function flush() {
  clearTimeout(timer);
  return persist(store.state);
}

export function replaceState(next) {
  store.state = migrate(next);
  return flush();
}

export function day(k) {
  const days = store.state.days;
  if (!days[k]) days[k] = { habits: {} };
  return days[k];
}

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
