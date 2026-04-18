import { state } from './js/state.js';
import { todayStr, showSync, nextId } from './js/helpers.js';
import { loadAll, removeLog } from './js/db.js';
import { render, renderDetail } from './js/render.js';
import {
  closeModal,
  openStatusModal, saveStatus,
  openSmallStatusModal, saveSmallStatus,
  openInputModal, saveInput,
  openReleaseModal, saveRelease,
  openDensityModal, saveDensity,
  openNoteModal, saveNote,
} from './js/modals.js';

// ========== 케이지 열기 / 닫기 ==========

function openCage(id) {
  state.selectedId = id;
  render();
}

function goBack() {
  state.selectedId = null;
  render();
}

// ========== 케이지 추가 ==========

async function addBigCage() {
  const id = nextId("B");
  const res = await fetch('/api/cages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id, type: 'big', label: '사육 ' + parseInt(id.slice(1)),
      currentStatus: { damjangCount: 0, garuiCount: 0, miggleCount: 0, lastChecked: null },
    }),
  });
  if (res.ok) {
    const cage = await res.json();
    state.cages.push(cage);
    render();
  }
}

async function addSmallCage() {
  const id = nextId("S");
  const res = await fetch('/api/cages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id, type: 'small', label: '가루이 ' + parseInt(id.slice(1)),
      currentStatus: { garuiCount: 0, lastChecked: null },
    }),
  });
  if (res.ok) {
    const cage = await res.json();
    state.cages.push(cage);
    render();
  }
}

async function addPetriCage() {
  const id = nextId("P");
  const res = await fetch('/api/cages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id, type: 'petri', label: '페트리 ' + parseInt(id.slice(1)),
      currentStatus: { damjangCount: 0, garuiCount: 0, miggleCount: 0, lastChecked: null },
    }),
  });
  if (res.ok) {
    const cage = await res.json();
    state.cages.push(cage);
    render();
  }
}

// ========== 내보내기 ==========

function exportJSON() {
  const blob = new Blob([JSON.stringify(state.cages, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "biorear-" + todayStr() + ".json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ========== 전역 바인딩 (HTML onclick 핸들러용) ==========

window._openCage             = openCage;
window._deleteLog            = (cageId, logId) => {
  if (confirm("삭제할까요?")) removeLog(cageId, logId).then(() => renderDetail());
};
window._openStatusModal      = openStatusModal;
window._saveStatus           = saveStatus;
window._openSmallStatusModal = openSmallStatusModal;
window._saveSmallStatus      = saveSmallStatus;
window._openInputModal       = openInputModal;
window._saveInput            = saveInput;
window._openReleaseModal     = openReleaseModal;
window._saveRelease          = saveRelease;
window._openDensityModal     = openDensityModal;
window._saveDensity          = saveDensity;
window._openNoteModal        = openNoteModal;
window._saveNote             = saveNote;
window.addBigCage            = addBigCage;
window.addSmallCage          = addSmallCage;
window.addPetriCage          = addPetriCage;
window.goBack                = goBack;
window.closeModal            = closeModal;
window.exportJSON            = exportJSON;

document.addEventListener("keydown", e => { if (e.key === "Escape") closeModal(); });

// ========== 초기화 ==========

async function init() {
  showSync("saving", "연결 중...");
  try {
    await loadAll();
    document.getElementById("loadingView").classList.add("hidden");
    document.getElementById("dashboardView").classList.remove("hidden");
    showSync("ok", "연결됨");
    render();
  } catch (e) {
    console.error("Init error:", e);
    showSync("error", "연결 실패");
    document.getElementById("loadingView").innerHTML = `
      <div style="color:var(--red);font-size:14px;text-align:center">
        연결 실패<br><span style="font-size:12px;color:var(--text-3)">서버를 확인하세요</span>
      </div>`;
  }
}

init();
