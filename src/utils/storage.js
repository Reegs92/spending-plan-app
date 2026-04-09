const KEY = 'spending-plan-v3';

export function loadState() {
  try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch { return null; }
}

export function saveState(state) {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
}
