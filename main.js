// =============================================
//  BioRear v6 — Firestore 분리 구조
//  cages/{cageId}            → 케이지 메타 + currentStatus
//  cages/{cageId}/logs/{id}  → 개별 로그
// =============================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import {
  getFirestore, collection, doc, getDocs, getDoc, setDoc, addDoc,
  deleteDoc, onSnapshot, query, orderBy, writeBatch
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCZ43yOqdUWNSw7ZiG0qBXfc5rUnR-crNY",
  authDomain: "naturalenemy.firebaseapp.com",
  projectId: "naturalenemy",
  storageBucket: "naturalenemy.firebasestorage.app",
  messagingSenderId: "1011614255944",
  appId: "1:1011614255944:web:a5c6268c6d98623466017d",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const CAGES_COL = collection(db, "cages");

// --- State ---
let cages = [];       // [{ id, type, label, currentStatus, logs: [] }]
let selectedId = null;
let saving = false;
let unsubCages = null;
let unsubLogs = null;

// --- Helpers ---
function nowLocal() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}
function todayStr() { return new Date().toISOString().slice(0, 10); }
function fmtDate(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
function fmtDateShort(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}
function esc(s) { const el = document.createElement("div"); el.textContent = s; return el.innerHTML; }

function showSync(state, text) {
  const el = document.getElementById("syncStatus");
  el.innerHTML = `<span class="sync-dot ${state === "ok" ? "ok" : state === "saving" ? "saving" : "error"}"></span>${text || ""}`;
}

function findCage(id) { return cages.find(c => c.id === id); }
function bigCages() { return cages.filter(c => c.type === "big").sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true })); }
function smallCages() { return cages.filter(c => c.type === "small").sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true })); }

function nextId(prefix) {
  const list = prefix === "B" ? bigCages() : smallCages();
  const nums = list.map(c => parseInt(c.id.slice(1)));
  return prefix + (Math.max(0, ...nums) + 1);
}

// ========== FIRESTORE OPS ==========

// Save cage metadata (not logs)
async function saveCage(cage) {
  saving = true; showSync("saving", "저장 중...");
  try {
    const { logs, ...meta } = cage;
    await setDoc(doc(db, "cages", cage.id), { ...meta, updatedAt: new Date().toISOString() });
    showSync("ok", "저장됨");
  } catch (e) {
    console.error("Save cage error:", e);
    showSync("error", "저장 실패");
  }
  saving = false;
}

// Add a log to cage's subcollection
async function addLog(cageId, logData) {
  saving = true; showSync("saving", "저장 중...");
  try {
    const logsCol = collection(db, "cages", cageId, "logs");
    const docRef = await addDoc(logsCol, { ...logData, createdAt: new Date().toISOString() });
    // Also add locally
    const cage = findCage(cageId);
    if (cage) cage.logs.push({ ...logData, _id: docRef.id });
    showSync("ok", "저장됨");
  } catch (e) {
    console.error("Add log error:", e);
    showSync("error", "저장 실패");
  }
  saving = false;
}

// Delete a log
async function removeLog(cageId, logDocId) {
  saving = true; showSync("saving", "저장 중...");
  try {
    await deleteDoc(doc(db, "cages", cageId, "logs", logDocId));
    const cage = findCage(cageId);
    if (cage) cage.logs = cage.logs.filter(l => l._id !== logDocId);
    showSync("ok", "저장됨");
  } catch (e) {
    console.error("Delete log error:", e);
    showSync("error", "삭제 실패");
  }
  saving = false;
}

// Delete entire cage + its logs
async function removeCage(cageId) {
  saving = true; showSync("saving", "삭제 중...");
  try {
    // Delete all logs first
    const logsSnap = await getDocs(collection(db, "cages", cageId, "logs"));
    const batch = writeBatch(db);
    logsSnap.forEach(d => batch.delete(d.ref));
    batch.delete(doc(db, "cages", cageId));
    await batch.commit();
    cages = cages.filter(c => c.id !== cageId);
    showSync("ok", "삭제됨");
  } catch (e) {
    console.error("Delete cage error:", e);
    showSync("error", "삭제 실패");
  }
  saving = false;
}

// Load all cages + their logs
async function loadAll() {
  const cagesSnap = await getDocs(CAGES_COL);
  cages = await Promise.all(
    cagesSnap.docs.map(async (cageDoc) => {
      const data = cageDoc.data();
      const logsSnap = await getDocs(
        query(collection(db, "cages", cageDoc.id, "logs"), orderBy("date", "desc"))
      );
      const logs = logsSnap.docs.map(d => ({ ...d.data(), _id: d.id }));
      return { ...data, id: cageDoc.id, logs };
    })
  );
}

// Create default cages
async function createDefaults() {
  const batch = writeBatch(db);
  for (let i = 1; i <= 10; i++) {
    batch.set(doc(db, "cages", "B" + i), {
      type: "big", label: "사육 " + i,
      currentStatus: { damjangCount: 0, garuiCount: 0, lastChecked: null },
      updatedAt: new Date().toISOString(),
    });
  }
  for (let i = 1; i <= 5; i++) {
    batch.set(doc(db, "cages", "S" + i), {
      type: "small", label: "가루이 " + i,
      currentStatus: { garuiCount: 0, lastChecked: null },
      updatedAt: new Date().toISOString(),
    });
  }
  await batch.commit();
}

// Migrate from old single-doc structure
async function migrateIfNeeded() {
  const oldDoc = await getDoc(doc(db, "biorear", "main"));
  if (!oldDoc.exists()) return false;

  const old = oldDoc.data();
  if (!old.bigCages && !old.smallCages) return false;

  showSync("saving", "데이터 이전 중...");
  const allCages = [...(old.bigCages || []), ...(old.smallCages || [])];

  for (const cage of allCages) {
    const { logs, id, ...meta } = cage;
    if (!meta.currentStatus) {
      meta.currentStatus = meta.type === "big"
        ? { damjangCount: 0, garuiCount: 0, lastChecked: null }
        : { garuiCount: 0, lastChecked: null };
    }
    meta.updatedAt = new Date().toISOString();
    await setDoc(doc(db, "cages", id), meta);

    if (logs && logs.length) {
      for (const log of logs) {
        await addDoc(collection(db, "cages", id, "logs"), {
          ...log, createdAt: log.date || new Date().toISOString(),
        });
      }
    }
  }

  // Delete old doc
  await deleteDoc(doc(db, "biorear", "main"));
  return true;
}

// Realtime listeners
function startListeners() {
  // Listen to cage list changes
  unsubCages = onSnapshot(CAGES_COL, (snap) => {
    if (saving) return;
    snap.docChanges().forEach(change => {
      if (change.type === "added" || change.type === "modified") {
        const data = change.doc.data();
        const existing = findCage(change.doc.id);
        if (existing) {
          Object.assign(existing, data, { id: change.doc.id });
        } else {
          cages.push({ ...data, id: change.doc.id, logs: [] });
          // Load logs for new cage
          loadLogsForCage(change.doc.id);
        }
      } else if (change.type === "removed") {
        cages = cages.filter(c => c.id !== change.doc.id);
      }
    });
    render();
  }, () => showSync("error", "동기화 실패"));
}

async function loadLogsForCage(cageId) {
  try {
    const logsSnap = await getDocs(
      query(collection(db, "cages", cageId, "logs"), orderBy("date", "desc"))
    );
    const cage = findCage(cageId);
    if (cage) {
      cage.logs = logsSnap.docs.map(d => ({ ...d.data(), _id: d.id }));
      if (selectedId === cageId) renderDetail();
    }
  } catch (e) { console.error("Load logs error:", e); }
}

// Listen to logs for currently selected cage
function startLogListener(cageId) {
  if (unsubLogs) { unsubLogs(); unsubLogs = null; }
  unsubLogs = onSnapshot(
    query(collection(db, "cages", cageId, "logs"), orderBy("date", "desc")),
    (snap) => {
      if (saving) return;
      const cage = findCage(cageId);
      if (!cage) return;
      cage.logs = snap.docs.map(d => ({ ...d.data(), _id: d.id }));
      if (selectedId === cageId) renderDetail();
    },
    () => {}
  );
}

// --- Icons ---
const ico = {
  plus: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>`,
  trash: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,
  input: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12l7 7 7-7"/></svg>`,
  release: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>`,
  note: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>`,
  check: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>`,
  density: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="8"/></svg>`,
};

// ========== RENDER ==========
function render() {
  if (selectedId === null) {
    document.getElementById("dashboardView").classList.remove("hidden");
    document.getElementById("detailView").classList.add("hidden");
    if (unsubLogs) { unsubLogs(); unsubLogs = null; }
    renderAlerts(); renderStats(); renderBigGrid(); renderSmallGrid();
  } else {
    document.getElementById("dashboardView").classList.add("hidden");
    document.getElementById("detailView").classList.remove("hidden");
    renderDetail();
  }
}

// ========== ALERT ENGINE ==========
function generateAlerts() {
  const alerts = [];
  const now = Date.now();
  const HOUR = 3600000;
  const DAY = 86400000;

  const bigs = bigCages();
  const smalls = smallCages();

  // --- 1. 생산 라인 (B1~B8) ---
  bigs.forEach(c => {
    const num = parseInt(c.id.slice(1));
    if (num > 8) return; // B9, B10은 전략 비축
    const cs = c.currentStatus || {};
    const gCount = cs.garuiCount || 0;
    const dCount = cs.damjangCount || 0;

    // 동족포식 위험 (가장 위험 → 먼저 체크)
    if (gCount < 1000 && dCount > 200) {
      alerts.push({
        level: "critical",
        icon: "🚨",
        cage: c.id,
        title: "동족포식 주의",
        msg: `먹이 고갈로 인한 노린재 상호 공격 가능성 높음. 즉시 가루이 보충 요망.`,
        detail: `가루이 ${gCount} / 노린재 ${dCount}`,
      });
    }
    // 가루이 부족
    else if (gCount > 0 && gCount < 2000 && dCount > 0) {
      alerts.push({
        level: "warning",
        icon: "🌿",
        cage: c.id,
        title: "가루이 부족",
        msg: `특수 케이지(B9, B10) 혹은 작은 케이지(S)에서 가루이 정착 식물 즉시 이식 필요.`,
        detail: `가루이 ${gCount}마리`,
      });
    }

    // 노린재 증식 정체
    if (dCount > 0 && dCount < 100) {
      alerts.push({
        level: "warning",
        icon: "🦟",
        cage: c.id,
        title: "노린재 밀도 낮음",
        msg: `초기 정착 단계 확인 및 필요시 성충 추가 투입 검토.`,
        detail: `노린재 ${dCount}마리`,
      });
    }
  });

  // --- 2. 전략 비축 (B9, B10) ---
  const reserves = bigs.filter(c => {
    const n = parseInt(c.id.slice(1));
    return n === 9 || n === 10;
  });

  reserves.forEach(c => {
    const gCount = c.currentStatus?.garuiCount || 0;
    if (gCount >= 5000) {
      alerts.push({
        level: "ok",
        icon: "✅",
        cage: c.id,
        title: "보급 준비 완료",
        msg: `현재 가루이 밀도 충분. 1~8번 케이지 중 부족한 곳에 즉시 보급 가능.`,
        detail: `가루이 ${gCount}마리`,
      });
    }
  });

  // 비상: 예비 가루이 동시 고갈
  if (reserves.length >= 2) {
    const allLow = reserves.every(c => (c.currentStatus?.garuiCount || 0) < 1000);
    if (allLow) {
      alerts.push({
        level: "critical",
        icon: "🆘",
        cage: "B9/B10",
        title: "예비 가루이 고갈",
        msg: `작은 케이지(S)의 모든 자원을 B9, B10으로 집중 배치하여 종자 유지 필요.`,
        detail: reserves.map(c => `${c.id}: ${c.currentStatus?.garuiCount || 0}마리`).join(", "),
      });
    }
  }

  // --- 3. 원자재 공급망 (S) ---
  smalls.forEach(c => {
    const denLogs = c.logs.filter(l => l.kind === "density").sort((a, b) => (b.date || "").localeCompare(a.date || ""));

    // 이식 적기: 밀도 '많음' 기록
    if (denLogs.length && denLogs[0].density === "많음") {
      const logDate = new Date(denLogs[0].date).getTime();
      const daysSince = (now - logDate) / DAY;

      // 식물 고사 주의: 밀도 '많음' 7일 이상
      if (daysSince >= 7) {
        alerts.push({
          level: "warning",
          icon: "🥀",
          cage: c.id,
          title: "식물 고사 주의",
          msg: `가루이 과밀로 담배 식물 건강 악화 우려. 빠른 시일 내에 큰 케이지로 이동 권장.`,
          detail: `밀도 '많음' ${Math.floor(daysSince)}일 경과`,
        });
      } else {
        alerts.push({
          level: "ok",
          icon: "🌱",
          cage: c.id,
          title: "이식 대기",
          msg: `가루이 정착 및 발육 상태 양호. 큰 케이지(B)로 옮기기에 가장 적합한 시기.`,
          detail: `밀도 '많음'`,
        });
      }
    }
  });

  // --- 4. 시스템 무결성 (전체) ---
  [...bigs, ...smalls].forEach(c => {
    const cs = c.currentStatus || {};
    if (!cs.lastChecked) {
      alerts.push({
        level: "info",
        icon: "📋",
        cage: c.id,
        title: "미점검",
        msg: `아직 한 번도 상태를 확인하지 않음. 육안 점검 후 데이터 업데이트 필요.`,
        detail: "",
      });
    } else {
      const elapsed = (now - new Date(cs.lastChecked).getTime()) / DAY;
      if (elapsed >= 3) {
        alerts.push({
          level: "info",
          icon: "⏰",
          cage: c.id,
          title: "장기 미점검",
          msg: `생물 상태를 ${Math.floor(elapsed * 24)}시간 동안 확인하지 않음. 육안 점검 후 데이터 업데이트 필요.`,
          detail: `마지막 확인: ${fmtDate(cs.lastChecked)}`,
        });
      }
    }
  });

  // Sort: critical first, then warning, ok, info
  const order = { critical: 0, warning: 1, ok: 2, info: 3 };
  alerts.sort((a, b) => (order[a.level] ?? 9) - (order[b.level] ?? 9));

  return alerts;
}

function renderAlerts() {
  const alerts = generateAlerts();
  const panel = document.getElementById("alertsPanel");

  if (!alerts.length) {
    panel.innerHTML = `<div class="alerts-empty">✅ 모든 케이지 상태 정상</div>`;
    return;
  }

  // Group by level
  const critical = alerts.filter(a => a.level === "critical");
  const warning = alerts.filter(a => a.level === "warning");
  const ok = alerts.filter(a => a.level === "ok");
  const info = alerts.filter(a => a.level === "info");

  let html = '<div class="alerts-container">';
  html += '<div class="alerts-header">📡 행동 강령</div>';

  if (critical.length) {
    html += `<div class="alerts-group critical">`;
    critical.forEach(a => html += alertCard(a));
    html += `</div>`;
  }
  if (warning.length) {
    html += `<div class="alerts-group warning">`;
    warning.forEach(a => html += alertCard(a));
    html += `</div>`;
  }
  if (ok.length) {
    html += `<div class="alerts-group ok">`;
    ok.forEach(a => html += alertCard(a));
    html += `</div>`;
  }
  if (info.length) {
    html += `<div class="alerts-group-collapsible">`;
    html += `<button class="alerts-toggle" onclick="this.parentElement.classList.toggle('open')">⏰ 점검 알림 ${info.length}건 <span class="toggle-arrow">▼</span></button>`;
    html += `<div class="alerts-group info collapse-content">`;
    info.forEach(a => html += alertCard(a));
    html += `</div></div>`;
  }

  html += '</div>';
  panel.innerHTML = html;
}

function alertCard(a) {
  const levelClass = a.level;
  return `
    <div class="alert-card ${levelClass}" onclick="window._openCage('${a.cage.split('/')[0]}')">
      <div class="alert-left">
        <span class="alert-icon">${a.icon}</span>
        <div class="alert-body">
          <div class="alert-title-row">
            <span class="alert-cage">${a.cage}</span>
            <span class="alert-title">${a.title}</span>
          </div>
          <div class="alert-msg">${a.msg}</div>
          ${a.detail ? `<div class="alert-detail">${a.detail}</div>` : ""}
        </div>
      </div>
    </div>`;
}

function renderStats() {
  let totalD = 0, totalG = 0, inputCount = 0, releaseCount = 0;
  bigCages().forEach(c => {
    totalD += c.currentStatus?.damjangCount || 0;
    totalG += c.currentStatus?.garuiCount || 0;
    inputCount += c.logs.filter(l => l.kind === "input").length;
    releaseCount += c.logs.filter(l => l.kind === "release").length;
  });
  const stats = [
    { label: "담장 총 마릿수", value: totalD || "-", unit: totalD ? "마리" : "" },
    { label: "가루이 (사육)", value: totalG || "-", unit: totalG ? "마리" : "" },
    { label: "투입", value: inputCount, unit: "회" },
    { label: "방사", value: releaseCount, unit: "회" },
  ];
  document.getElementById("statsGrid").innerHTML = stats.map(s => `
    <div class="stat-card"><div class="stat-label">${s.label}</div>
    <div class="stat-value">${s.value}<span class="stat-unit">${s.value !== "-" ? s.unit : ""}</span></div></div>`).join("");
}

function renderBigGrid() {
  document.getElementById("bigCageGrid").innerHTML = bigCages().map(c => {
    const cs = c.currentStatus || {};
    let chips = "";
    if (cs.damjangCount) chips += `<span class="chip damjang">담장 ${cs.damjangCount}</span>`;
    if (cs.garuiCount) chips += `<span class="chip garui">가루이 ${cs.garuiCount}</span>`;
    if (!cs.damjangCount && !cs.garuiCount) chips = `<span class="chip empty-cage">비어있음</span>`;
    const checked = cs.lastChecked ? `확인 ${fmtDateShort(cs.lastChecked)}` : "";
    return `
    <button class="cage-card big" onclick="window._openCage('${c.id}')">
      <div class="cage-card-top"><span class="cage-code big">${c.id}</span></div>
      <div class="cage-label">${esc(c.label)}</div>
      <div class="cage-chips">${chips}</div>
      <div class="cage-meta">${checked}${c.logs.length ? (checked ? " · " : "") + "기록 " + c.logs.length : ""}</div>
    </button>`;
  }).join("");
}

function renderSmallGrid() {
  document.getElementById("smallCageGrid").innerHTML = smallCages().map(c => {
    const cs = c.currentStatus || {};
    const denLogs = c.logs.filter(l => l.kind === "density");
    const last = denLogs[0]; // already sorted desc
    const denMap = { "많음": "density-high", "보통": "density-mid", "적음": "density-low" };
    let chip = last
      ? `<span class="chip ${denMap[last.density] || ""}">${last.density}</span>`
      : `<span style="font-size:11px;color:var(--text-4)">기록 없음</span>`;
    if (cs.garuiCount) chip += ` <span style="font-size:11px;color:var(--text-2)">${cs.garuiCount}마리</span>`;
    return `
    <button class="cage-card small" onclick="window._openCage('${c.id}')">
      <div class="cage-card-top"><span class="cage-code small">${c.id}</span></div>
      <div class="cage-label">${esc(c.label)}</div>
      <div class="cage-chips">${chip}</div>
      <div class="cage-meta">${c.logs.length ? "기록 " + c.logs.length : ""}</div>
    </button>`;
  }).join("");
}

// ========== DETAIL ==========
function openCage(id) {
  selectedId = id;
  startLogListener(id);
  render();
}

function renderDetail() {
  const cage = findCage(selectedId);
  if (!cage) { selectedId = null; render(); return; }
  const isBig = cage.type === "big";

  document.getElementById("detailBadge").textContent = cage.id;
  document.getElementById("detailBadge").className = "cage-badge " + (isBig ? "big" : "small");

  const nameInput = document.getElementById("detailNameInput");
  nameInput.value = cage.label;
  nameInput.onchange = () => { cage.label = nameInput.value.trim() || cage.label; saveCage(cage); };

  document.getElementById("detailDeleteBtn").onclick = () => {
    const msg = cage.logs.length ? `${cage.label}에 ${cage.logs.length}개 기록 있음. 정말 삭제?` : `${cage.label} 삭제?`;
    if (!confirm(msg)) return;
    removeCage(cage.id).then(() => { selectedId = null; render(); });
  };

  const statusArea = document.getElementById("detailStatusArea");
  const logArea = document.getElementById("logArea");

  if (isBig) {
    renderBigStatus(cage, statusArea);
    renderBigLogs(cage, logArea);
  } else {
    renderSmallStatus(cage, statusArea);
    renderSmallLogs(cage, logArea);
  }
}

function renderBigStatus(cage, el) {
  const cs = cage.currentStatus || {};
  el.innerHTML = `
    <div class="status-area">
      <div class="status-title">📋 현재 상태 <span class="status-checked">마지막 확인: ${cs.lastChecked ? fmtDate(cs.lastChecked) : "없음"}</span></div>
      <div class="status-counts">
        <div class="status-count-box green"><div class="status-count-label">담장</div>
          <div class="status-count-value">${cs.damjangCount || 0}<span class="status-count-unit">마리</span></div></div>
        <div class="status-count-box blue"><div class="status-count-label">가루이</div>
          <div class="status-count-value">${cs.garuiCount || 0}<span class="status-count-unit">마리</span></div></div>
        <button class="btn-update-status" onclick="window._openStatusModal()">${ico.check} 상태 업데이트</button>
      </div>
    </div>`;
}

function renderSmallStatus(cage, el) {
  const cs = cage.currentStatus || {};
  el.innerHTML = `
    <div class="status-area">
      <div class="status-title">📋 현재 상태 <span class="status-checked">마지막 확인: ${cs.lastChecked ? fmtDate(cs.lastChecked) : "없음"}</span></div>
      <div class="status-counts">
        <div class="status-count-box blue"><div class="status-count-label">가루이</div>
          <div class="status-count-value">${cs.garuiCount || 0}<span class="status-count-unit">마리</span></div></div>
        <button class="btn-update-status" onclick="window._openSmallStatusModal()">${ico.check} 상태 업데이트</button>
      </div>
    </div>`;
}

function renderBigLogs(cage, el) {
  el.innerHTML = `
    <div class="quick-actions">
      <button class="quick-btn" onclick="window._openInputModal()">${ico.input} 투입</button>
      <button class="quick-btn" onclick="window._openReleaseModal()">${ico.release} 방사</button>
      <button class="quick-btn" onclick="window._openNoteModal()">${ico.note} 메모</button>
    </div>` + renderLogTable(cage);
}

function renderSmallLogs(cage, el) {
  el.innerHTML = `
    <div class="quick-actions">
      <button class="quick-btn" onclick="window._openDensityModal()">${ico.density} 밀도 기록</button>
      <button class="quick-btn" onclick="window._openNoteModal()">${ico.note} 메모</button>
    </div>` + renderLogTable(cage);
}

function renderLogTable(cage) {
  const logs = [...cage.logs].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  if (!logs.length) return '<div class="empty-msg">활동 기록이 없습니다.</div>';
  return `<div class="log-section">
    <div class="log-section-header"><span class="log-section-title">활동 기록</span></div>
    <div style="overflow-x:auto"><table class="log-table">
      <thead><tr><th>일시</th><th>유형</th><th>내용</th><th class="col-action"></th></tr></thead>
      <tbody>${logs.map(l => `<tr>
        <td style="white-space:nowrap">${fmtDate(l.date)}</td>
        <td>${logBadge(l.kind)}</td>
        <td>${logText(l, cage)}</td>
        <td class="col-action"><button class="btn-delete" onclick="window._deleteLog('${cage.id}','${l._id}')">${ico.trash}</button></td>
      </tr>`).join("")}</tbody></table></div></div>`;
}

function logBadge(kind) {
  const m = { input: { l: "투입", c: "damjang" }, release: { l: "방사", c: "mixed" }, density: { l: "밀도", c: "garui" }, note: { l: "메모", c: "empty-cage" } };
  const i = m[kind] || m.note;
  return `<span class="chip ${i.c}">${i.l}</span>`;
}

function logText(l, cage) {
  switch (l.kind) {
    case "input": {
      const sp = l.species === "담장" ? `<span style="color:var(--green)">담장</span>` : `<span style="color:var(--blue)">가루이</span>`;
      let s = `${sp} ${l.count}마리`;
      if (l.fromId) s += ` <span class="transfer-arrow"><span class="arr">←</span> <span class="from">${esc(l.fromId)}</span></span>`;
      if (l.memo) s += ` · ${esc(l.memo)}`;
      return s;
    }
    case "release": {
      const sp = l.species === "담장" ? `<span style="color:var(--green)">담장</span>` : `<span style="color:var(--blue)">가루이</span>`;
      return `${sp} ${l.count}마리 방사${l.memo ? " · " + esc(l.memo) : ""}`;
    }
    case "density": {
      const dm = { "많음": "density-high", "보통": "density-mid", "적음": "density-low" };
      return `<span class="chip ${dm[l.density] || ""}">${l.density}</span>${l.memo ? " " + esc(l.memo) : ""}`;
    }
    case "note": return esc(l.content?.length > 80 ? l.content.slice(0, 80) + "..." : l.content || "");
    default: return "-";
  }
}

// ========== MODALS ==========
function openModal(title, html) {
  document.getElementById("modalTitle").textContent = title;
  document.getElementById("modalBody").innerHTML = html;
  document.getElementById("modalOverlay").classList.remove("hidden");
  setTimeout(() => {
    const f = document.querySelector("#modalBody input:not([type=hidden]), #modalBody select, #modalBody textarea");
    if (f) f.focus();
  }, 50);
}
function closeModal() { document.getElementById("modalOverlay").classList.add("hidden"); }
document.addEventListener("keydown", e => { if (e.key === "Escape") closeModal(); });

// Status (Big)
function openStatusModal() {
  const cs = findCage(selectedId)?.currentStatus || {};
  openModal("현재 상태 업데이트", `
    <p style="font-size:12px;color:var(--text-3);margin-bottom:16px">지금 케이지에 실제로 있는 마릿수를 입력하세요.</p>
    <div class="form-row">
      <div class="form-field"><label class="form-label">🦟 담장</label>
        <input type="number" id="mDamjang" class="form-input" value="${cs.damjangCount || 0}" min="0" /></div>
      <div class="form-field"><label class="form-label">🌿 가루이</label>
        <input type="number" id="mGarui" class="form-input" value="${cs.garuiCount || 0}" min="0" /></div>
    </div>
    <div class="modal-actions">
      <button class="btn-secondary" onclick="closeModal()">취소</button>
      <button class="btn-primary" onclick="window._saveStatus()">업데이트</button>
    </div>`);
}
function saveStatus() {
  const cage = findCage(selectedId);
  cage.currentStatus = {
    damjangCount: Number(document.getElementById("mDamjang").value) || 0,
    garuiCount: Number(document.getElementById("mGarui").value) || 0,
    lastChecked: new Date().toISOString(),
  };
  saveCage(cage).then(() => { closeModal(); renderDetail(); });
}

// Status (Small)
function openSmallStatusModal() {
  const cs = findCage(selectedId)?.currentStatus || {};
  openModal("현재 상태 업데이트", `
    <div class="form-field"><label class="form-label">🌿 가루이</label>
      <input type="number" id="mGarui" class="form-input" value="${cs.garuiCount || 0}" min="0" /></div>
    <div class="modal-actions">
      <button class="btn-secondary" onclick="closeModal()">취소</button>
      <button class="btn-primary blue" onclick="window._saveSmallStatus()">업데이트</button>
    </div>`);
}
function saveSmallStatus() {
  const cage = findCage(selectedId);
  cage.currentStatus = { garuiCount: Number(document.getElementById("mGarui").value) || 0, lastChecked: new Date().toISOString() };
  saveCage(cage).then(() => { closeModal(); renderDetail(); });
}

// Input (투입)
function openInputModal() {
  const smOpts = smallCages().map(c => `<option value="${c.id}">${c.id} - ${esc(c.label)}</option>`).join("");
  const bgOpts = bigCages().filter(c => c.id !== selectedId).map(c => `<option value="${c.id}">${c.id} - ${esc(c.label)}</option>`).join("");
  openModal("투입 기록", `
    <div class="form-field"><label class="form-label">일시</label>
      <input type="datetime-local" id="mDate" class="form-input" value="${nowLocal()}" /></div>
    <div class="form-row">
      <div class="form-field"><label class="form-label">종류</label>
        <select id="mSpecies" class="form-input"><option value="가루이">🌿 가루이</option><option value="담장">🦟 담장</option></select></div>
      <div class="form-field"><label class="form-label">마릿수</label>
        <input type="number" id="mCount" class="form-input" placeholder="0" min="1" /></div>
    </div>
    <div class="form-field"><label class="form-label">가져온 곳 (선택)</label>
      <select id="mFrom" class="form-input"><option value="">해당 없음</option>${smOpts}${bgOpts}<option value="외부">외부</option></select></div>
    <div class="form-field"><label class="form-label">메모 (선택)</label>
      <input id="mMemo" class="form-input" placeholder="예: 밀도 높은 식물 선별 투입" /></div>
    <div class="modal-actions">
      <button class="btn-secondary" onclick="closeModal()">취소</button>
      <button class="btn-primary" onclick="window._saveInput()">저장</button>
    </div>`);
}
function saveInput() {
  const count = Number(document.getElementById("mCount").value);
  if (!count) return alert("마릿수를 입력하세요.");
  addLog(selectedId, {
    kind: "input", date: document.getElementById("mDate").value,
    species: document.getElementById("mSpecies").value, count,
    fromId: document.getElementById("mFrom").value || null,
    memo: document.getElementById("mMemo").value.trim(),
  }).then(() => { closeModal(); renderDetail(); });
}

// Release (방사)
function openReleaseModal() {
  openModal("방사 기록", `
    <div class="form-field"><label class="form-label">일시</label>
      <input type="datetime-local" id="mDate" class="form-input" value="${nowLocal()}" /></div>
    <div class="form-row">
      <div class="form-field"><label class="form-label">종류</label>
        <select id="mSpecies" class="form-input"><option value="담장">🦟 담장</option><option value="가루이">🌿 가루이</option></select></div>
      <div class="form-field"><label class="form-label">마릿수</label>
        <input type="number" id="mCount" class="form-input" placeholder="0" min="1" /></div>
    </div>
    <div class="form-field"><label class="form-label">메모 (선택)</label>
      <input id="mMemo" class="form-input" placeholder="예: 농가 출하" /></div>
    <div class="modal-actions">
      <button class="btn-secondary" onclick="closeModal()">취소</button>
      <button class="btn-primary" onclick="window._saveRelease()">저장</button>
    </div>`);
}
function saveRelease() {
  const count = Number(document.getElementById("mCount").value);
  if (!count) return alert("마릿수를 입력하세요.");
  addLog(selectedId, {
    kind: "release", date: document.getElementById("mDate").value,
    species: document.getElementById("mSpecies").value, count,
    memo: document.getElementById("mMemo").value.trim(),
  }).then(() => { closeModal(); renderDetail(); });
}

// Density (Small)
function openDensityModal() {
  openModal("가루이 밀도", `
    <div class="form-field"><label class="form-label">일시</label>
      <input type="datetime-local" id="mDate" class="form-input" value="${nowLocal()}" /></div>
    <div class="form-field"><label class="form-label">밀도</label>
      <select id="mDen" class="form-input"><option value="많음">🟢 많음</option><option value="보통" selected>🟡 보통</option><option value="적음">🔴 적음</option></select></div>
    <div class="form-field"><label class="form-label">메모 (선택)</label>
      <input id="mMemo" class="form-input" placeholder="예: 잎 뒷면 약충 밀집" /></div>
    <div class="modal-actions">
      <button class="btn-secondary" onclick="closeModal()">취소</button>
      <button class="btn-primary blue" onclick="window._saveDensity()">저장</button>
    </div>`);
}
function saveDensity() {
  addLog(selectedId, {
    kind: "density", date: document.getElementById("mDate").value,
    density: document.getElementById("mDen").value,
    memo: document.getElementById("mMemo").value.trim(),
  }).then(() => { closeModal(); renderDetail(); });
}

// Note
function openNoteModal() {
  const isBig = findCage(selectedId)?.type === "big";
  openModal("메모", `
    <div class="form-field"><label class="form-label">일시</label>
      <input type="datetime-local" id="mDate" class="form-input" value="${nowLocal()}" /></div>
    <div class="form-field"><label class="form-label">내용</label>
      <textarea id="mContent" class="form-input" rows="4" placeholder="자유롭게 기록..."></textarea></div>
    <div class="modal-actions">
      <button class="btn-secondary" onclick="closeModal()">취소</button>
      <button class="btn-primary ${isBig ? '' : 'blue'}" onclick="window._saveNote()">저장</button>
    </div>`);
}
function saveNote() {
  const content = document.getElementById("mContent").value.trim();
  if (!content) return alert("내용을 입력하세요.");
  addLog(selectedId, {
    kind: "note", date: document.getElementById("mDate").value, content,
  }).then(() => { closeModal(); renderDetail(); });
}

// ========== ADD CAGE ==========
async function addBigCage() {
  const id = nextId("B");
  const n = parseInt(id.slice(1));
  const cage = { type: "big", label: "사육 " + n, currentStatus: { damjangCount: 0, garuiCount: 0, lastChecked: null } };
  await setDoc(doc(db, "cages", id), { ...cage, updatedAt: new Date().toISOString() });
  cages.push({ ...cage, id, logs: [] });
  render();
}
async function addSmallCage() {
  const id = nextId("S");
  const n = parseInt(id.slice(1));
  const cage = { type: "small", label: "가루이 " + n, currentStatus: { garuiCount: 0, lastChecked: null } };
  await setDoc(doc(db, "cages", id), { ...cage, updatedAt: new Date().toISOString() });
  cages.push({ ...cage, id, logs: [] });
  render();
}

// ========== EXPORT ==========
function exportJSON() {
  const blob = new Blob([JSON.stringify(cages, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url;
  a.download = "biorear-" + todayStr() + ".json";
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ========== Globals ==========
window._openCage = openCage;
window._deleteLog = (cageId, logId) => { if (confirm("삭제할까요?")) removeLog(cageId, logId).then(() => renderDetail()); };
window._openStatusModal = openStatusModal;
window._saveStatus = saveStatus;
window._openSmallStatusModal = openSmallStatusModal;
window._saveSmallStatus = saveSmallStatus;
window._openInputModal = openInputModal;
window._saveInput = saveInput;
window._openReleaseModal = openReleaseModal;
window._saveRelease = saveRelease;
window._openDensityModal = openDensityModal;
window._saveDensity = saveDensity;
window._openNoteModal = openNoteModal;
window._saveNote = saveNote;
window.addBigCage = addBigCage;
window.addSmallCage = addSmallCage;
window.goBack = () => { selectedId = null; if (unsubLogs) { unsubLogs(); unsubLogs = null; } render(); };
window.closeModal = closeModal;
window.exportJSON = exportJSON;

// ========== INIT ==========
async function init() {
  showSync("saving", "연결 중...");
  try {
    // Check for old data to migrate
    const migrated = await migrateIfNeeded();
    if (migrated) console.log("Old data migrated to new structure.");

    // Check if cages exist
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
