import { state } from './state.js';
import { fmtDate, fmtDateShort, esc, bigCages, smallCages, petriCages, findCage, ico } from './helpers.js';
import { renderAlerts } from './alerts.js';
import { saveCage, removeCage } from './db.js';

// ========== 메인 렌더 ==========

export function render() {
  if (state.selectedId === null) {
    document.getElementById("dashboardView").classList.remove("hidden");
    document.getElementById("detailView").classList.add("hidden");
    if (state.unsubLogs) { state.unsubLogs(); state.unsubLogs = null; }
    renderAlerts();
    renderStats();
    renderBigGrid();
    renderSmallGrid();
    renderPetriGrid();
    renderChart();
  } else {
    document.getElementById("dashboardView").classList.add("hidden");
    document.getElementById("detailView").classList.remove("hidden");
    renderDetail();
  }
}

// ========== 차트 ==========

export function renderChart() {
  const ctx = document.getElementById('populationChart');
  if (!ctx) return;

  const bigs = bigCages();
  const labels = bigs.map(c => c.id);
  const damjangData = bigs.map(c => c.currentStatus?.damjangCount || 0);
  const garuiData   = bigs.map(c => c.currentStatus?.garuiCount   || 0);

  if (state.popChart) { state.popChart.destroy(); }

  Chart.defaults.color = '#94a3b8';
  Chart.defaults.font.family = "'Noto Sans KR', sans-serif";

  state.popChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: '가루이 (마리)', data: garuiData,
          backgroundColor: 'rgba(59, 130, 246, 0.7)', borderColor: 'rgba(59, 130, 246, 1)',
          borderWidth: 1, borderRadius: 4, yAxisID: 'y',
        },
        {
          label: '담장 (마리)', data: damjangData,
          backgroundColor: 'rgba(34, 197, 94, 0.7)', borderColor: 'rgba(34, 197, 94, 1)',
          borderWidth: 1, borderRadius: 4, yAxisID: 'y1',
        },
      ],
    },
    options: {
      responsive: true,
      interaction: { mode: 'index', intersect: false },
      scales: {
        x: { grid: { display: false } },
        y: {
          type: 'linear', position: 'left',
          title: { display: true, text: '가루이 (좌측)', color: 'rgba(59, 130, 246, 0.8)', font: { size: 11 } },
          grid: { color: 'rgba(148, 163, 184, 0.1)' },
        },
        y1: {
          type: 'linear', position: 'right',
          title: { display: true, text: '담장 (우측)', color: 'rgba(34, 197, 94, 0.8)', font: { size: 11 } },
          grid: { drawOnChartArea: false },
        },
      },
      plugins: {
        legend: { labels: { color: '#e2e8f0', usePointStyle: true, boxWidth: 8 } },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.9)', titleColor: '#e2e8f0',
          bodyColor: '#e2e8f0', borderColor: 'rgba(148, 163, 184, 0.2)', borderWidth: 1,
        },
      },
    },
  });
}

// ========== 통계 ==========

export function renderStats() {
  let totalD = 0, totalG = 0, inputCount = 0, releaseCount = 0;
  bigCages().forEach(c => {
    totalD += c.currentStatus?.damjangCount || 0;
    totalG += c.currentStatus?.garuiCount   || 0;
    inputCount   += c.logs.filter(l => l.kind === "input").length;
    releaseCount += c.logs.filter(l => l.kind === "release").length;
  });
  const stats = [
    { label: "담장 총 마릿수", value: totalD || "-", unit: totalD ? "마리" : "" },
    { label: "가루이 (사육)",   value: totalG || "-", unit: totalG ? "마리" : "" },
    { label: "투입",            value: inputCount,    unit: "회" },
    { label: "방사",            value: releaseCount,  unit: "회" },
  ];
  document.getElementById("statsGrid").innerHTML = stats.map(s => `
    <div class="stat-card">
      <div class="stat-label">${s.label}</div>
      <div class="stat-value">${s.value}<span class="stat-unit">${s.value !== "-" ? s.unit : ""}</span></div>
    </div>`).join("");
}

// ========== 그리드 ==========

export function renderBigGrid() {
  document.getElementById("bigCageGrid").innerHTML = bigCages().map(c => {
    const cs = c.currentStatus || {};
    let chips = "";
    if (cs.damjangCount) chips += `<span class="chip damjang">담장 ${cs.damjangCount}</span>`;
    if (cs.garuiCount)   chips += `<span class="chip garui">가루이 ${cs.garuiCount}</span>`;
    if (cs.miggleCount)  chips += `<span class="chip miggle">미끌 ${cs.miggleCount}</span>`;
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

export function renderSmallGrid() {
  document.getElementById("smallCageGrid").innerHTML = smallCages().map(c => {
    const cs = c.currentStatus || {};
    const denLogs = c.logs.filter(l => l.kind === "density");
    const last = denLogs[0];
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

export function renderPetriGrid() {
  document.getElementById("petriCageGrid").innerHTML = petriCages().map(c => {
    const cs = c.currentStatus || {};
    let chips = "";
    if (cs.damjangCount) chips += `<span class="chip damjang">담장 ${cs.damjangCount}</span>`;
    if (cs.garuiCount)   chips += `<span class="chip garui">가루이 ${cs.garuiCount}</span>`;
    if (cs.miggleCount)  chips += `<span class="chip miggle">미끌 ${cs.miggleCount}</span>`;
    if (!cs.damjangCount && !cs.garuiCount && !cs.miggleCount) chips = `<span class="chip empty-cage">비어있음</span>`;
    const checked = cs.lastChecked ? `확인 ${fmtDateShort(cs.lastChecked)}` : "";
    return `
    <button class="cage-card petri" onclick="window._openCage('${c.id}')" style="border-color: rgba(245,158,11,0.2);">
      <div class="cage-card-top"><span class="cage-code petri" style="color:var(--amber); background:var(--amber-dim);">${c.id}</span></div>
      <div class="cage-label">${esc(c.label)}</div>
      <div class="cage-chips">${chips}</div>
      <div class="cage-meta">${checked}${c.logs.length ? (checked ? " · " : "") + "기록 " + c.logs.length : ""}</div>
    </button>`;
  }).join("");
}

// ========== 상세 뷰 ==========

export function renderDetail() {
  const cage = findCage(state.selectedId);
  if (!cage) { state.selectedId = null; render(); return; }

  const isBig   = cage.type === "big";
  const isSmall  = cage.type === "small";

  const badgeClass = isBig ? "big" : isSmall ? "small" : "petri";
  const badge = document.getElementById("detailBadge");
  badge.className   = "cage-badge " + badgeClass;
  badge.textContent = cage.id;

  const nameInput = document.getElementById("detailNameInput");
  nameInput.value = cage.label;
  nameInput.onchange = () => {
    cage.label = nameInput.value.trim() || cage.label;
    saveCage(cage);
  };

  document.getElementById("detailDeleteBtn").onclick = () => {
    if (!confirm(`"${cage.label}" 케이지를 삭제할까요? 모든 기록이 사라집니다.`)) return;
    removeCage(state.selectedId).then(() => {
      state.selectedId = null;
      if (state.unsubLogs) { state.unsubLogs(); state.unsubLogs = null; }
      render();
    });
  };

  const statusArea = document.getElementById("detailStatusArea");
  const logArea    = document.getElementById("logArea");

  if (isSmall) {
    renderSmallStatus(cage, statusArea);
    renderSmallLogs(cage, logArea);
  } else {
    // big, petri 모두 같은 형식
    renderBigStatus(cage, statusArea);
    renderBigLogs(cage, logArea);
  }
}

function renderBigStatus(cage, el) {
  const cs = cage.currentStatus || {};
  el.innerHTML = `
    <div class="status-area">
      <div class="status-title">📋 현재 상태 <span class="status-checked">마지막 확인: ${cs.lastChecked ? fmtDate(cs.lastChecked) : "없음"}</span></div>
      <div class="status-counts">
        <div class="status-count-box green">
          <div class="status-count-label">담장</div>
          <div class="status-count-value">${cs.damjangCount || 0}<span class="status-count-unit">마리</span></div>
        </div>
        <div class="status-count-box blue">
          <div class="status-count-label">가루이</div>
          <div class="status-count-value">${cs.garuiCount || 0}<span class="status-count-unit">마리</span></div>
        </div>
        <div class="status-count-box purple">
          <div class="status-count-label">미끌</div>
          <div class="status-count-value">${cs.miggleCount || 0}<span class="status-count-unit">마리</span></div>
        </div>
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
        <div class="status-count-box blue">
          <div class="status-count-label">가루이</div>
          <div class="status-count-value">${cs.garuiCount || 0}<span class="status-count-unit">마리</span></div>
        </div>
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

// ========== 로그 테이블 ==========

function renderLogTable(cage) {
  const logs = [...cage.logs].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  if (!logs.length) return '<div class="empty-msg">활동 기록이 없습니다.</div>';
  return `
    <div class="log-section">
      <div class="log-section-header"><span class="log-section-title">활동 기록</span></div>
      <div style="overflow-x:auto">
        <table class="log-table">
          <thead><tr><th>일시</th><th>유형</th><th>내용</th><th class="col-action"></th></tr></thead>
          <tbody>${logs.map(l => `<tr>
            <td style="white-space:nowrap">${fmtDate(l.date)}</td>
            <td>${logBadge(l.kind)}</td>
            <td>${logText(l)}</td>
            <td class="col-action"><button class="btn-delete" onclick="window._deleteLog('${cage.id}','${l._id}')">${ico.trash}</button></td>
          </tr>`).join("")}</tbody>
        </table>
      </div>
    </div>`;
}

function logBadge(kind) {
  const map = {
    input:   { l: "투입", c: "damjang" },
    release: { l: "방사", c: "mixed"   },
    density: { l: "밀도", c: "garui"   },
    note:    { l: "메모", c: "empty-cage" },
  };
  const i = map[kind] || map.note;
  return `<span class="chip ${i.c}">${i.l}</span>`;
}

function speciesSpan(species) {
  if (species === "담장") return `<span style="color:var(--green)">담장</span>`;
  if (species === "미끌") return `<span style="color:var(--purple)">미끌</span>`;
  return `<span style="color:var(--blue)">가루이</span>`;
}

function logText(l) {
  switch (l.kind) {
    case "input": {
      let s = `${speciesSpan(l.species)} ${l.count}마리`;
      if (l.fromId) s += ` <span class="transfer-arrow"><span class="arr">←</span> <span class="from">${esc(l.fromId)}</span></span>`;
      if (l.memo)   s += ` · ${esc(l.memo)}`;
      return s;
    }
    case "release": {
      const sp = speciesSpan(l.species);
      return `${sp} ${l.count}마리 방사${l.memo ? " · " + esc(l.memo) : ""}`;
    }
    case "density": {
      const dm = { "많음": "density-high", "보통": "density-mid", "적음": "density-low" };
      return `<span class="chip ${dm[l.density] || ""}">${l.density}</span>${l.memo ? " " + esc(l.memo) : ""}`;
    }
    case "note":
      return esc(l.content?.length > 80 ? l.content.slice(0, 80) + "..." : l.content || "");
    default:
      return "-";
  }
}
