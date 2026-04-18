import { state } from './state.js';
import { showSync, findCage } from './helpers.js';

// ========== 데이터 작업 (Firebase → Flask REST API) ==========

export async function saveCage(cage) {
  state.saving = true;
  showSync("saving", "저장 중...");
  try {
    const { logs, ...meta } = cage;
    const res = await fetch(`/api/cages/${cage.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(meta),
    });
    if (!res.ok) throw new Error('저장 실패');
    showSync("ok", "저장됨");
  } catch (e) {
    console.error("Save cage error:", e);
    showSync("error", "저장 실패");
  }
  state.saving = false;
}

export async function addLog(cageId, logData) {
  state.saving = true;
  showSync("saving", "저장 중...");
  try {
    const res = await fetch(`/api/cages/${cageId}/logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(logData),
    });
    if (!res.ok) throw new Error('저장 실패');
    const saved = await res.json();
    const cage = findCage(cageId);
    if (cage) cage.logs.unshift(saved);
    showSync("ok", "저장됨");
  } catch (e) {
    console.error("Add log error:", e);
    showSync("error", "저장 실패");
  }
  state.saving = false;
}

export async function removeLog(cageId, logDocId) {
  state.saving = true;
  showSync("saving", "저장 중...");
  try {
    const res = await fetch(`/api/cages/${cageId}/logs/${logDocId}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('삭제 실패');
    const cage = findCage(cageId);
    if (cage) cage.logs = cage.logs.filter(l => l._id !== logDocId);
    showSync("ok", "저장됨");
  } catch (e) {
    console.error("Delete log error:", e);
    showSync("error", "삭제 실패");
  }
  state.saving = false;
}

export async function removeCage(cageId) {
  state.saving = true;
  showSync("saving", "삭제 중...");
  try {
    const res = await fetch(`/api/cages/${cageId}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('삭제 실패');
    state.cages = state.cages.filter(c => c.id !== cageId);
    showSync("ok", "삭제됨");
  } catch (e) {
    console.error("Delete cage error:", e);
    showSync("error", "삭제 실패");
  }
  state.saving = false;
}

export async function loadAll() {
  const res = await fetch('/api/cages');
  if (!res.ok) throw new Error('로드 실패');
  state.cages = await res.json();
}
