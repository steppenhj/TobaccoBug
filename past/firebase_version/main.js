import { state } from './js/state.js';
import { todayStr, showSync, findCage, nextId } from './js/helpers.js';
import {
  db, CAGES_COL, collection, doc, getDocs, setDoc, onSnapshot, query, orderBy,
  loadAll, createDefaults, migrateIfNeeded, removeLog,
} from './js/db.js';
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

// ========== 실시간 리스너 ==========

function startListeners() {
  state.unsubCages = onSnapshot(
    CAGES_COL,
    (snap) => {
      if (state.saving) return;
      snap.docChanges().forEach(change => {
        if (change.type === "added" || change.type === "modified") {
          const data = change.doc.data();
          const existing = findCage(change.doc.id);
          if (existing) {
            Object.assign(existing, data, { id: change.doc.id });
          } else {
            state.cages.push({ ...data, id: change.doc.id, logs: [] });
            loadLogsForCage(change.doc.id);
          }
        } else if (change.type === "removed") {
          state.cages = state.cages.filter(c => c.id !== change.doc.id);
        }
      });
      render();
    },
    () => showSync("error", "동기화 실패")
  );
}

async function loadLogsForCage(cageId) {
  try {
    const logsSnap = await getDocs(
      query(collection(db, "cages", cageId, "logs"), orderBy("date", "desc"))
    );
    const cage = findCage(cageId);
    if (cage) {
      cage.logs = logsSnap.docs.map(d => ({ ...d.data(), _id: d.id }));
      if (state.selectedId === cageId) renderDetail();
    }
  } catch (e) {
    console.error("Load logs error:", e);
  }
}

function startLogListener(cageId) {
  if (state.unsubLogs) { state.unsubLogs(); state.unsubLogs = null; }
  state.unsubLogs = onSnapshot(
    query(collection(db, "cages", cageId, "logs"), orderBy("date", "desc")),
    (snap) => {
      if (state.saving) return;
      const cage = findCage(cageId);
      if (!cage) return;
      cage.logs = snap.docs.map(d => ({ ...d.data(), _id: d.id }));
      if (state.selectedId === cageId) renderDetail();
    },
    () => {}
  );
}

// ========== 케이지 열기 / 닫기 ==========

function openCage(id) {
  state.selectedId = id;
  startLogListener(id);
  render();
}

function goBack() {
  state.selectedId = null;
  if (state.unsubLogs) { state.unsubLogs(); state.unsubLogs = null; }
  render();
}

// ========== 케이지 추가 ==========

async function addBigCage() {
  const id = nextId("B");
  await setDoc(doc(db, "cages", id), {
    type: "big", label: "사육 " + parseInt(id.slice(1)),
    currentStatus: { damjangCount: 0, garuiCount: 0, miggleCount: 0, lastChecked: null },
    updatedAt: new Date().toISOString(),
  });
}

async function addSmallCage() {
  const id = nextId("S");
  await setDoc(doc(db, "cages", id), {
    type: "small", label: "가루이 " + parseInt(id.slice(1)),
    currentStatus: { garuiCount: 0, lastChecked: null },
    updatedAt: new Date().toISOString(),
  });
}

async function addPetriCage() {
  const id = nextId("P");
  await setDoc(doc(db, "cages", id), {
    type: "petri", label: "페트리 " + parseInt(id.slice(1)),
    currentStatus: { damjangCount: 0, garuiCount: 0, miggleCount: 0, lastChecked: null },
    updatedAt: new Date().toISOString(),
  });
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

window._openCage           = openCage;
window._deleteLog          = (cageId, logId) => {
  if (confirm("삭제할까요?")) removeLog(cageId, logId).then(() => renderDetail());
};
window._openStatusModal    = openStatusModal;
window._saveStatus         = saveStatus;
window._openSmallStatusModal = openSmallStatusModal;
window._saveSmallStatus    = saveSmallStatus;
window._openInputModal     = openInputModal;
window._saveInput          = saveInput;
window._openReleaseModal   = openReleaseModal;
window._saveRelease        = saveRelease;
window._openDensityModal   = openDensityModal;
window._saveDensity        = saveDensity;
window._openNoteModal      = openNoteModal;
window._saveNote           = saveNote;
window.addBigCage          = addBigCage;
window.addSmallCage        = addSmallCage;
window.addPetriCage        = addPetriCage;
window.goBack              = goBack;
window.closeModal          = closeModal;
window.exportJSON          = exportJSON;

document.addEventListener("keydown", e => { if (e.key === "Escape") closeModal(); });

// ========== 초기화 ==========

async function init() {
  showSync("saving", "연결 중...");
  try {
    const migrated = await migrateIfNeeded();
    if (migrated) console.log("Old data migrated to new structure.");

    const snap = await getDocs(CAGES_COL);
    if (snap.empty) await createDefaults();

    await loadAll();
    document.getElementById("loadingView").classList.add("hidden");
    document.getElementById("dashboardView").classList.remove("hidden");
    showSync("ok", "연결됨");
    render();
    startListeners();
  } catch (e) {
    console.error("Init error:", e);
    showSync("error", "연결 실패");
    document.getElementById("loadingView").innerHTML = `
      <div style="color:var(--red);font-size:14px;text-align:center">
        연결 실패<br><span style="font-size:12px;color:var(--text-3)">Firestore 규칙을 확인하세요</span>
      </div>`;
  }
}

init();
