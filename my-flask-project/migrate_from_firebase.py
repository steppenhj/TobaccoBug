"""
Firebase Firestore → SQLite 마이그레이션 스크립트

사용법:
  1. Firebase Console → 프로젝트 설정 → 서비스 계정 → 새 비공개 키 생성
  2. 다운로드한 JSON 파일을 이 파일과 같은 폴더에 'serviceAccountKey.json' 이름으로 저장
  3. 실행: python migrate_from_firebase.py
"""

import os
import json
import sqlite3
from datetime import datetime

SERVICE_ACCOUNT_KEY = "serviceAccountKey.json"
DATABASE = "tobaccobug.db"


def init_db(db):
    db.execute("PRAGMA foreign_keys = ON")
    db.execute("""
        CREATE TABLE IF NOT EXISTS cages (
            id             TEXT PRIMARY KEY,
            type           TEXT NOT NULL,
            label          TEXT NOT NULL,
            current_status TEXT DEFAULT '{}',
            updated_at     TEXT
        )
    """)
    db.execute("""
        CREATE TABLE IF NOT EXISTS logs (
            id         TEXT PRIMARY KEY,
            cage_id    TEXT NOT NULL,
            kind       TEXT NOT NULL,
            date       TEXT,
            data       TEXT DEFAULT '{}',
            created_at TEXT,
            FOREIGN KEY (cage_id) REFERENCES cages(id) ON DELETE CASCADE
        )
    """)
    db.commit()


def migrate():
    if not os.path.exists(SERVICE_ACCOUNT_KEY):
        print(f"❌ '{SERVICE_ACCOUNT_KEY}' 파일을 찾을 수 없습니다.")
        print("   Firebase Console → 프로젝트 설정 → 서비스 계정 → 새 비공개 키 생성")
        return

    try:
        import firebase_admin
        from firebase_admin import credentials, firestore
    except ImportError:
        print("❌ firebase-admin 패키지가 없습니다. 먼저 설치하세요:")
        print("   pip install firebase-admin")
        return

    print("🔥 Firebase에 연결 중...")
    cred = credentials.Certificate(SERVICE_ACCOUNT_KEY)
    firebase_admin.initialize_app(cred)
    fs = firestore.client()

    db = sqlite3.connect(DATABASE)
    init_db(db)

    cage_count = 0
    log_count = 0

    print("📦 데이터 가져오는 중...")
    for cage_doc in fs.collection("cages").stream():
        cage_data = cage_doc.to_dict()
        cage_id = cage_doc.id

        db.execute(
            "INSERT OR REPLACE INTO cages (id, type, label, current_status, updated_at) VALUES (?, ?, ?, ?, ?)",
            (
                cage_id,
                cage_data.get("type", "big"),
                cage_data.get("label", cage_id),
                json.dumps(cage_data.get("currentStatus", {})),
                cage_data.get("updatedAt", datetime.now().isoformat()),
            )
        )
        cage_count += 1

        for log_doc in fs.collection("cages").document(cage_id).collection("logs").stream():
            log_data = log_doc.to_dict()
            kind = log_data.get("kind", "note")
            date = log_data.get("date")
            created_at = log_data.get("createdAt", datetime.now().isoformat())
            extra = {k: v for k, v in log_data.items() if k not in ("kind", "date", "createdAt")}

            db.execute(
                "INSERT OR REPLACE INTO logs (id, cage_id, kind, date, data, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                (log_doc.id, cage_id, kind, date, json.dumps(extra), created_at)
            )
            log_count += 1

    db.commit()
    db.close()

    print(f"✅ 완료: 케이지 {cage_count}개, 로그 {log_count}개 → {DATABASE}")


if __name__ == "__main__":
    migrate()
