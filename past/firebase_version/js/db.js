import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import {
  getFirestore, collection, doc, getDocs, getDoc, setDoc, addDoc,
  deleteDoc, onSnapshot, query, orderBy, writeBatch,
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";
import { state } from './state.js';
import { showSync, findCage } from './helpers.js';

// re-export firebase primitives needed by main.js (listeners, addCage 등)
export { collection, doc, getDocs, setDoc, onSnapshot, query, orderBy };

const firebaseConfig = {
  apiKey: "AIzaSyCZ43yOqdUWNSw7ZiG0qBXfc5rUnR-crNY",
  authDomain: "naturalenemy.firebaseapp.com",
  projectId: "naturalenemy",
  storageBucket: "naturalenemy.firebasestorage.app",
  messagingSenderId: "1011614255944",
  appId: "1:1011614255944:web:a5c6268c6d98623466017d",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const CAGES_COL = collection(db, "cages");

// ========== 데이터 작업 ==========

export async function saveCage(cage) {
  state.saving = true;
  showSync("saving", "저장 중...");
  try {
    const { logs, ...meta } = cage;
    await setDoc(doc(db, "cages", cage.id), { ...meta, updatedAt: new Date().toISOString() });
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
    const logsCol = collection(db, "cages", cageId, "logs");
    const docRef = await addDoc(logsCol, { ...logData, createdAt: new Date().toISOString() });
    const cage = findCage(cageId);
    if (cage) cage.logs.push({ ...logData, _id: docRef.id });
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
    await deleteDoc(doc(db, "cages", cageId, "logs", logDocId));
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
    const logsSnap = await getDocs(collection(db, "cages", cageId, "logs"));
    const batch = writeBatch(db);
    logsSnap.forEach(d => batch.delete(d.ref));
    batch.delete(doc(db, "cages", cageId));
    await batch.commit();
    state.cages = state.cages.filter(c => c.id !== cageId);
    showSync("ok", "삭제됨");
  } catch (e) {
    console.error("Delete cage error:", e);
    showSync("error", "삭제 실패");
  }
  state.saving = false;
}

export async function loadAll() {
  const cagesSnap = await getDocs(CAGES_COL);
  state.cages = await Promise.all(
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

export async function createDefaults() {
  const batch = writeBatch(db);
  for (let i = 1; i <= 10; i++) {
    batch.set(doc(db, "cages", "B" + i), {
      type: "big", label: "사육 " + i,
      currentStatus: { damjangCount: 0, garuiCount: 0, miggleCount: 0, lastChecked: null },
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

export async function migrateIfNeeded() {
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

    if (logs?.length) {
      for (const log of logs) {
        await addDoc(collection(db, "cages", id, "logs"), {
          ...log, createdAt: log.date || new Date().toISOString(),
        });
      }
    }
  }

  await deleteDoc(doc(db, "biorear", "main"));
  return true;
}
