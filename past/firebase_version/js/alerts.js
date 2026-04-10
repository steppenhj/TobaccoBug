import { fmtDate, bigCages, smallCages } from './helpers.js';

// ========== 알림 생성 ==========

export function generateAlerts() {
  const alerts = [];
  const now = Date.now();
  const DAY = 86400000;

  const bigs = bigCages();
  const smalls = smallCages();

  // 1. 생산 라인 (B1~B8)
  bigs.forEach(c => {
    const num = parseInt(c.id.slice(1));
    if (num > 8) return;
    const cs = c.currentStatus || {};
    const gCount = cs.garuiCount || 0;
    const dCount = cs.damjangCount || 0;

    if (gCount < 1000 && dCount > 200) {
      alerts.push({
        level: "critical", icon: "🚨", cage: c.id, title: "동족포식 주의",
        msg: `먹이 고갈로 인한 노린재 상호 공격 가능성 높음. 즉시 가루이 보충 요망.`,
        detail: `가루이 ${gCount} / 노린재 ${dCount}`,
      });
    } else if (gCount > 0 && gCount < 2000 && dCount > 0) {
      alerts.push({
        level: "warning", icon: "🌿", cage: c.id, title: "가루이 부족",
        msg: `특수 케이지(B9, B10) 혹은 작은 케이지(S)에서 가루이 정착 식물 즉시 이식 필요.`,
        detail: `가루이 ${gCount}마리`,
      });
    }

    if (dCount > 0 && dCount < 100) {
      alerts.push({
        level: "warning", icon: "🦟", cage: c.id, title: "노린재 밀도 낮음",
        msg: `초기 정착 단계 확인 및 필요시 성충 추가 투입 검토.`,
        detail: `노린재 ${dCount}마리`,
      });
    }
  });

  // 2. 전략 비축 (B9, B10)
  const reserves = bigs.filter(c => {
    const n = parseInt(c.id.slice(1));
    return n === 9 || n === 10;
  });

  reserves.forEach(c => {
    const gCount = c.currentStatus?.garuiCount || 0;
    if (gCount >= 5000) {
      alerts.push({
        level: "ok", icon: "✅", cage: c.id, title: "보급 준비 완료",
        msg: `현재 가루이 밀도 충분. 1~8번 케이지 중 부족한 곳에 즉시 보급 가능.`,
        detail: `가루이 ${gCount}마리`,
      });
    }
  });

  if (reserves.length >= 2) {
    const allLow = reserves.every(c => (c.currentStatus?.garuiCount || 0) < 1000);
    if (allLow) {
      alerts.push({
        level: "critical", icon: "🆘", cage: "B9/B10", title: "예비 가루이 고갈",
        msg: `작은 케이지(S)의 모든 자원을 B9, B10으로 집중 배치하여 종자 유지 필요.`,
        detail: reserves.map(c => `${c.id}: ${c.currentStatus?.garuiCount || 0}마리`).join(", "),
      });
    }
  }

  // 3. 원자재 공급망 (S)
  smalls.forEach(c => {
    const denLogs = c.logs
      .filter(l => l.kind === "density")
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""));

    if (!denLogs.length) return;

    const daysSince = (now - new Date(denLogs[0].date).getTime()) / DAY;

    if (denLogs[0].density === "많음") {
      if (daysSince >= 7) {
        alerts.push({
          level: "warning", icon: "🥀", cage: c.id, title: "식물 고사 주의",
          msg: `가루이 과밀로 담배 식물 건강 악화 우려. 빠른 시일 내에 큰 케이지로 이동 권장.`,
          detail: `밀도 '많음' ${Math.floor(daysSince)}일 경과`,
        });
      } else {
        alerts.push({
          level: "ok", icon: "🌱", cage: c.id, title: "이식 대기",
          msg: `가루이 정착 및 발육 상태 양호. 큰 케이지(B)로 옮기기에 가장 적합한 시기.`,
          detail: `밀도 '많음'`,
        });
      }
    }
  });

  // 4. 시스템 무결성 (전체)
  [...bigs, ...smalls].forEach(c => {
    const cs = c.currentStatus || {};
    if (!cs.lastChecked) {
      alerts.push({
        level: "info", icon: "📋", cage: c.id, title: "미점검",
        msg: `아직 한 번도 상태를 확인하지 않음. 육안 점검 후 데이터 업데이트 필요.`,
        detail: "",
      });
    } else {
      const elapsed = (now - new Date(cs.lastChecked).getTime()) / DAY;
      if (elapsed >= 3) {
        alerts.push({
          level: "info", icon: "⏰", cage: c.id, title: "장기 미점검",
          msg: `생물 상태를 ${Math.floor(elapsed * 24)}시간 동안 확인하지 않음. 육안 점검 후 데이터 업데이트 필요.`,
          detail: `마지막 확인: ${fmtDate(cs.lastChecked)}`,
        });
      }
    }
  });

  const order = { critical: 0, warning: 1, ok: 2, info: 3 };
  alerts.sort((a, b) => (order[a.level] ?? 9) - (order[b.level] ?? 9));
  return alerts;
}

// ========== 알림 렌더링 ==========

export function renderAlerts() {
  const alerts = generateAlerts();
  const panel = document.getElementById("alertsPanel");

  if (!alerts.length) {
    panel.innerHTML = `<div class="alerts-empty">✅ 모든 케이지 상태 정상</div>`;
    return;
  }

  const critical = alerts.filter(a => a.level === "critical");
  const warning  = alerts.filter(a => a.level === "warning");
  const ok       = alerts.filter(a => a.level === "ok");
  const info     = alerts.filter(a => a.level === "info");

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
  return `
    <div class="alert-card ${a.level}" onclick="window._openCage('${a.cage.split('/')[0]}')">
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
