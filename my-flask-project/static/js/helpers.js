import { state } from './state.js';

// ========== 날짜 유틸 ==========
export function nowLocal() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}
export function todayStr() { return new Date().toISOString().slice(0, 10); }
export function fmtDate(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
export function fmtDateShort(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

// ========== DOM 유틸 ==========
export function esc(s) {
  const el = document.createElement("div");
  el.textContent = s;
  return el.innerHTML;
}

export function showSync(st, text) {
  const el = document.getElementById("syncStatus");
  const dotClass = st === "ok" ? "ok" : st === "saving" ? "saving" : "error";
  el.innerHTML = `<span class="sync-dot ${dotClass}"></span>${text || ""}`;
}

// ========== 케이지 조회 ==========
export function findCage(id) {
  return state.cages.find(c => c.id === id);
}
export function bigCages() {
  return state.cages
    .filter(c => c.type === "big")
    .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
}
export function smallCages() {
  return state.cages
    .filter(c => c.type === "small")
    .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
}
export function petriCages() {
  return state.cages
    .filter(c => c.type === "petri")
    .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
}
export function nextId(prefix) {
  const list = prefix === "B" ? bigCages() : prefix === "S" ? smallCages() : petriCages();
  const nums = list.map(c => parseInt(c.id.slice(1)));
  return prefix + (Math.max(0, ...nums) + 1);
}

// ========== 아이콘 SVG ==========
export const ico = {
  plus:    `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>`,
  trash:   `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,
  input:   `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12l7 7 7-7"/></svg>`,
  release: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>`,
  note:    `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>`,
  check:   `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>`,
  density: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="8"/></svg>`,
};
