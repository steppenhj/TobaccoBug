import { state } from './state.js';
import { nowLocal, esc, bigCages, smallCages, petriCages, findCage } from './helpers.js';
import { saveCage, addLog } from './db.js';
import { renderDetail } from './render.js';

// ========== 모달 기반 ==========

export function openModal(title, html) {
  document.getElementById("modalTitle").textContent = title;
  document.getElementById("modalBody").innerHTML = html;
  document.getElementById("modalOverlay").classList.remove("hidden");
  setTimeout(() => {
    const f = document.querySelector("#modalBody input:not([type=hidden]), #modalBody select, #modalBody textarea");
    if (f) f.focus();
  }, 50);
}

export function closeModal() {
  document.getElementById("modalOverlay").classList.add("hidden");
}

// ========== 상태 업데이트 (Big / Petri) ==========

export function openStatusModal() {
  const cs = findCage(state.selectedId)?.currentStatus || {};
  openModal("현재 상태 업데이트", `
    <p style="font-size:12px;color:var(--text-3);margin-bottom:16px">지금 케이지에 실제로 있는 마릿수를 입력하세요.</p>
    <div class="form-row">
      <div class="form-field"><label class="form-label">🦟 담장</label>
        <input type="number" id="mDamjang" class="form-input" value="${cs.damjangCount || 0}" min="0" /></div>
      <div class="form-field"><label class="form-label">🌿 가루이</label>
        <input type="number" id="mGarui" class="form-input" value="${cs.garuiCount || 0}" min="0" /></div>
      <div class="form-field"><label class="form-label">🐞 미끌</label>
        <input type="number" id="mMiggle" class="form-input" value="${cs.miggleCount || 0}" min="0" /></div>
    </div>
    <div class="modal-actions">
      <button class="btn-secondary" onclick="closeModal()">취소</button>
      <button class="btn-primary" onclick="window._saveStatus()">업데이트</button>
    </div>`);
}

export function saveStatus() {
  const cage = findCage(state.selectedId);
  cage.currentStatus = {
    damjangCount: Number(document.getElementById("mDamjang").value) || 0,
    garuiCount:   Number(document.getElementById("mGarui").value)   || 0,
    miggleCount:  Number(document.getElementById("mMiggle").value)  || 0,
    lastChecked:  new Date().toISOString(),
  };
  saveCage(cage).then(() => { closeModal(); renderDetail(); });
}

// ========== 상태 업데이트 (Small) ==========

export function openSmallStatusModal() {
  const cs = findCage(state.selectedId)?.currentStatus || {};
  openModal("현재 상태 업데이트", `
    <div class="form-field"><label class="form-label">🌿 가루이</label>
      <input type="number" id="mGarui" class="form-input" value="${cs.garuiCount || 0}" min="0" /></div>
    <div class="modal-actions">
      <button class="btn-secondary" onclick="closeModal()">취소</button>
      <button class="btn-primary blue" onclick="window._saveSmallStatus()">업데이트</button>
    </div>`);
}

export function saveSmallStatus() {
  const cage = findCage(state.selectedId);
  cage.currentStatus = {
    garuiCount:  Number(document.getElementById("mGarui").value) || 0,
    lastChecked: new Date().toISOString(),
  };
  saveCage(cage).then(() => { closeModal(); renderDetail(); });
}

// ========== 투입 ==========

export function openInputModal() {
  const smOpts = smallCages().map(c => `<option value="${c.id}">${c.id} - ${esc(c.label)}</option>`).join("");
  const bgOpts = bigCages().filter(c => c.id !== state.selectedId).map(c => `<option value="${c.id}">${c.id} - ${esc(c.label)}</option>`).join("");
  const ptOpts = petriCages().filter(c => c.id !== state.selectedId).map(c => `<option value="${c.id}">${c.id} - ${esc(c.label)}</option>`).join("");
  openModal("투입 기록", `
    <div class="form-field"><label class="form-label">일시</label>
      <input type="datetime-local" id="mDate" class="form-input" value="${nowLocal()}" /></div>
    <div class="form-row">
      <div class="form-field"><label class="form-label">종류</label>
        <select id="mSpecies" class="form-input">
          <option value="가루이">🌿 가루이</option>
          <option value="담장">🦟 담장</option>
          <option value="미끌">🐞 미끌</option>
        </select></div>
      <div class="form-field"><label class="form-label">마릿수</label>
        <input type="number" id="mCount" class="form-input" placeholder="0" min="1" /></div>
    </div>
    <div class="form-field"><label class="form-label">가져온 곳 (선택)</label>
      <select id="mFrom" class="form-input"><option value="">해당 없음</option>${smOpts}${bgOpts}${ptOpts}<option value="외부">외부</option></select></div>
    <div class="form-field"><label class="form-label">메모 (선택)</label>
      <input id="mMemo" class="form-input" placeholder="예: 밀도 높은 식물 선별 투입" /></div>
    <div class="modal-actions">
      <button class="btn-secondary" onclick="closeModal()">취소</button>
      <button class="btn-primary" onclick="window._saveInput()">저장</button>
    </div>`);
}

export function saveInput() {
  const count = Number(document.getElementById("mCount").value);
  if (!count) return alert("마릿수를 입력하세요.");
  addLog(state.selectedId, {
    kind:    "input",
    date:    document.getElementById("mDate").value,
    species: document.getElementById("mSpecies").value,
    count,
    fromId:  document.getElementById("mFrom").value || null,
    memo:    document.getElementById("mMemo").value.trim(),
  }).then(() => { closeModal(); renderDetail(); });
}

// ========== 방사 ==========

export function openReleaseModal() {
  openModal("방사 기록", `
    <div class="form-field"><label class="form-label">일시</label>
      <input type="datetime-local" id="mDate" class="form-input" value="${nowLocal()}" /></div>
    <div class="form-row">
      <div class="form-field"><label class="form-label">종류</label>
        <select id="mSpecies" class="form-input">
          <option value="담장">🦟 담장</option>
          <option value="가루이">🌿 가루이</option>
        </select></div>
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

export function saveRelease() {
  const count = Number(document.getElementById("mCount").value);
  if (!count) return alert("마릿수를 입력하세요.");
  addLog(state.selectedId, {
    kind:    "release",
    date:    document.getElementById("mDate").value,
    species: document.getElementById("mSpecies").value,
    count,
    memo:    document.getElementById("mMemo").value.trim(),
  }).then(() => { closeModal(); renderDetail(); });
}

// ========== 밀도 (Small) ==========

export function openDensityModal() {
  openModal("가루이 밀도", `
    <div class="form-field"><label class="form-label">일시</label>
      <input type="datetime-local" id="mDate" class="form-input" value="${nowLocal()}" /></div>
    <div class="form-field"><label class="form-label">밀도</label>
      <select id="mDen" class="form-input">
        <option value="많음">🟢 많음</option>
        <option value="보통" selected>🟡 보통</option>
        <option value="적음">🔴 적음</option>
      </select></div>
    <div class="form-field"><label class="form-label">메모 (선택)</label>
      <input id="mMemo" class="form-input" placeholder="예: 잎 뒷면 약충 밀집" /></div>
    <div class="modal-actions">
      <button class="btn-secondary" onclick="closeModal()">취소</button>
      <button class="btn-primary blue" onclick="window._saveDensity()">저장</button>
    </div>`);
}

export function saveDensity() {
  addLog(state.selectedId, {
    kind:    "density",
    date:    document.getElementById("mDate").value,
    density: document.getElementById("mDen").value,
    memo:    document.getElementById("mMemo").value.trim(),
  }).then(() => { closeModal(); renderDetail(); });
}

// ========== 메모 ==========

export function openNoteModal() {
  const isBig = findCage(state.selectedId)?.type !== "small";
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

export function saveNote() {
  const content = document.getElementById("mContent").value.trim();
  if (!content) return alert("내용을 입력하세요.");
  addLog(state.selectedId, {
    kind:    "note",
    date:    document.getElementById("mDate").value,
    content,
  }).then(() => { closeModal(); renderDetail(); });
}
