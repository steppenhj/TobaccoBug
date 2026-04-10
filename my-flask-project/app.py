"""
TobaccoBug Flask Application
=============================

담배장님노린재(*Nesidiocoris tenuis*) 사육 관리 시스템의 Flask 백엔드.
SQLite 데이터베이스를 사용하며 케이지 및 활동 로그에 대한 REST API를 제공합니다.

Swagger UI:  http://localhost:5000/apidocs
GitHub Pages: https://steppenhj.github.io/TobaccoBug/
"""

import sqlite3
import json
import uuid
from flask import Flask, render_template, jsonify, request, g
from datetime import datetime
from flasgger import Swagger

DATABASE = 'tobaccobug.db'

app = Flask(__name__)

# ========== Swagger 설정 ==========

swagger_template = {
    "info": {
        "title": "TobaccoBug 사육 관리 API",
        "description": (
            "담배장님노린재(*Nesidiocoris tenuis*) 사육 관리 시스템 REST API.\n\n"
            "케이지(Cage) 및 활동 로그(Log) CRUD 엔드포인트를 제공합니다."
        ),
        "version": "1.0.0",
        "contact": {"name": "Park Haejin", "url": "https://github.com/steppenhj/TobaccoBug"},
    },
    "tags": [
        {"name": "Cages", "description": "사육 케이지 관리"},
        {"name": "Logs",  "description": "케이지별 활동 로그 관리"},
    ],
}

swagger_config = {
    "headers": [],
    "specs": [{"endpoint": "apispec", "route": "/apispec.json"}],
    "swagger_ui": True,
    "specs_route": "/apidocs",
}

swagger = Swagger(app, config=swagger_config, template=swagger_template)

# ========== DB 연결 ==========

def get_db():
    """현재 요청 컨텍스트에서 SQLite 연결을 반환합니다."""
    db = getattr(g, '_database', None)
    if db is None:
        db = g._database = sqlite3.connect(DATABASE)
        db.row_factory = sqlite3.Row
        db.execute("PRAGMA foreign_keys = ON")
    return db

@app.teardown_appcontext
def close_connection(_exception):
    """요청 종료 시 DB 연결을 닫습니다."""
    db = getattr(g, '_database', None)
    if db is not None:
        db.close()

def init_db():
    """
    DB를 초기화하고, 케이지가 없으면 기본값(B1~B10, S1~S5)을 생성합니다.

    테이블 구조:

    - **cages**: id, type, label, current_status(JSON), updated_at
    - **logs**: id, cage_id, kind, date, data(JSON), created_at
    """
    db = sqlite3.connect(DATABASE)
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
    count = db.execute("SELECT COUNT(*) FROM cages").fetchone()[0]
    if count == 0:
        now = datetime.now().isoformat()
        for i in range(1, 11):
            db.execute(
                "INSERT INTO cages VALUES (?, ?, ?, ?, ?)",
                (f"B{i}", "big", f"사육 {i}",
                 json.dumps({"damjangCount": 0, "garuiCount": 0, "miggleCount": 0, "lastChecked": None}),
                 now)
            )
        for i in range(1, 6):
            db.execute(
                "INSERT INTO cages VALUES (?, ?, ?, ?, ?)",
                (f"S{i}", "small", f"가루이 {i}",
                 json.dumps({"garuiCount": 0, "lastChecked": None}),
                 now)
            )
    db.commit()
    db.close()

# ========== 변환 헬퍼 ==========

def cage_row_to_dict(row, logs=None):
    """SQLite Row를 케이지 딕셔너리로 변환합니다."""
    return {
        'id':            row['id'],
        'type':          row['type'],
        'label':         row['label'],
        'currentStatus': json.loads(row['current_status'] or '{}'),
        'updatedAt':     row['updated_at'],
        'logs':          logs or [],
    }

def log_row_to_dict(row):
    """SQLite Row를 로그 딕셔너리로 변환합니다."""
    data = json.loads(row['data'] or '{}')
    return {
        '_id':       row['id'],
        'kind':      row['kind'],
        'date':      row['date'],
        'createdAt': row['created_at'],
        **data,
    }

# ========== 화면 라우트 ==========

@app.route('/')
def index():
    """메인 대시보드 HTML 페이지를 렌더링합니다."""
    return render_template('index.html')

@app.route('/measure')
def measure():
    """잎 크기 측정 HTML 페이지를 렌더링합니다."""
    return render_template('measure.html')

# ========== REST API — 케이지 ==========

@app.route('/api/cages', methods=['GET'])
def get_cages():
    """모든 케이지와 로그를 조회합니다.
    ---
    tags:
      - Cages
    summary: 모든 케이지 조회
    description: 등록된 모든 케이지(big/small/petri)와 각 케이지의 활동 로그를 함께 반환합니다.
    responses:
      200:
        description: 케이지 목록 (로그 포함)
        schema:
          type: array
          items:
            type: object
            properties:
              id:
                type: string
                example: "B1"
              type:
                type: string
                enum: [big, small, petri]
                example: "big"
              label:
                type: string
                example: "사육 1"
              currentStatus:
                type: object
                example: {"damjangCount": 10, "garuiCount": 500, "lastChecked": "2026-04-10T09:00:00"}
              updatedAt:
                type: string
                example: "2026-04-10T09:00:00"
              logs:
                type: array
                items:
                  type: object
    """
    db = get_db()
    cages = db.execute("SELECT * FROM cages ORDER BY type, id").fetchall()
    result = []
    for cage in cages:
        logs = db.execute(
            "SELECT * FROM logs WHERE cage_id = ? ORDER BY date DESC",
            (cage['id'],)
        ).fetchall()
        result.append(cage_row_to_dict(cage, [log_row_to_dict(l) for l in logs]))
    return jsonify(result)


@app.route('/api/cages', methods=['POST'])
def create_cage():
    """새 케이지를 생성합니다.
    ---
    tags:
      - Cages
    summary: 케이지 생성
    description: 새로운 사육 케이지(big/small/petri)를 DB에 저장합니다.
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required: [id, type, label]
          properties:
            id:
              type: string
              example: "B11"
            type:
              type: string
              enum: [big, small, petri]
              example: "big"
            label:
              type: string
              example: "사육 11"
            currentStatus:
              type: object
              example: {"damjangCount": 0, "garuiCount": 0, "miggleCount": 0, "lastChecked": null}
    responses:
      201:
        description: 생성된 케이지
      400:
        description: id 필드 누락
    """
    data = request.get_json()
    if not data or 'id' not in data:
        return jsonify({'error': 'id is required'}), 400
    db = get_db()
    db.execute(
        "INSERT INTO cages (id, type, label, current_status, updated_at) VALUES (?, ?, ?, ?, ?)",
        (
            data['id'],
            data.get('type', 'big'),
            data.get('label', data['id']),
            json.dumps(data.get('currentStatus', {})),
            datetime.now().isoformat(),
        )
    )
    db.commit()
    cage = db.execute("SELECT * FROM cages WHERE id = ?", (data['id'],)).fetchone()
    return jsonify(cage_row_to_dict(cage)), 201


@app.route('/api/cages/<cage_id>', methods=['PUT'])
def update_cage(cage_id):
    """케이지 이름 또는 현재 상태를 수정합니다.
    ---
    tags:
      - Cages
    summary: 케이지 수정
    description: 케이지의 label(이름)이나 currentStatus(담장/가루이 수 등)를 업데이트합니다.
    parameters:
      - in: path
        name: cage_id
        required: true
        type: string
        example: "B1"
      - in: body
        name: body
        required: true
        schema:
          type: object
          properties:
            label:
              type: string
              example: "사육 1 (수정)"
            currentStatus:
              type: object
              example: {"damjangCount": 50, "garuiCount": 1200, "miggleCount": 0, "lastChecked": "2026-04-10T09:00:00"}
    responses:
      200:
        description: 수정된 케이지
      404:
        description: 케이지 없음
    """
    data = request.get_json()
    if not data:
        return jsonify({'error': 'body required'}), 400
    db = get_db()
    cage = db.execute("SELECT * FROM cages WHERE id = ?", (cage_id,)).fetchone()
    if cage is None:
        return jsonify({'error': 'not found'}), 404
    db.execute(
        "UPDATE cages SET label = ?, current_status = ?, updated_at = ? WHERE id = ?",
        (
            data.get('label', cage['label']),
            json.dumps(data.get('currentStatus', json.loads(cage['current_status']))),
            datetime.now().isoformat(),
            cage_id,
        )
    )
    db.commit()
    cage = db.execute("SELECT * FROM cages WHERE id = ?", (cage_id,)).fetchone()
    return jsonify(cage_row_to_dict(cage))


@app.route('/api/cages/<cage_id>', methods=['DELETE'])
def delete_cage(cage_id):
    """케이지와 모든 로그를 삭제합니다.
    ---
    tags:
      - Cages
    summary: 케이지 삭제
    description: 케이지와 해당 케이지의 모든 활동 로그를 함께 삭제합니다.
    parameters:
      - in: path
        name: cage_id
        required: true
        type: string
        example: "B1"
    responses:
      200:
        description: 삭제 성공
        schema:
          type: object
          properties:
            ok:
              type: boolean
              example: true
    """
    db = get_db()
    db.execute("DELETE FROM logs WHERE cage_id = ?", (cage_id,))
    db.execute("DELETE FROM cages WHERE id = ?", (cage_id,))
    db.commit()
    return jsonify({'ok': True})


# ========== REST API — 로그 ==========

@app.route('/api/cages/<cage_id>/logs', methods=['POST'])
def add_log(cage_id):
    """케이지에 활동 로그를 추가합니다.
    ---
    tags:
      - Logs
    summary: 로그 추가
    description: |
      케이지에 활동 기록(투입/방사/밀도/메모)을 추가합니다.

      **kind 값에 따른 추가 필드:**
      - `input`: species, count, fromId(선택), memo(선택)
      - `release`: species, count, memo(선택)
      - `density`: density(많음/보통/적음), memo(선택)
      - `note`: content
    parameters:
      - in: path
        name: cage_id
        required: true
        type: string
        example: "B1"
      - in: body
        name: body
        required: true
        schema:
          type: object
          required: [kind, date]
          properties:
            kind:
              type: string
              enum: [input, release, density, note]
              example: "input"
            date:
              type: string
              example: "2026-04-10T09:00"
            species:
              type: string
              example: "담장"
            count:
              type: integer
              example: 100
            memo:
              type: string
              example: "S3에서 이식"
    responses:
      201:
        description: 추가된 로그
      400:
        description: body 누락
    """
    data = request.get_json()
    if not data:
        return jsonify({'error': 'body required'}), 400
    log_id = str(uuid.uuid4())
    kind = data.get('kind', 'note')
    date = data.get('date')
    extra = {k: v for k, v in data.items() if k not in ('kind', 'date')}
    now = datetime.now().isoformat()
    db = get_db()
    db.execute(
        "INSERT INTO logs (id, cage_id, kind, date, data, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        (log_id, cage_id, kind, date, json.dumps(extra), now)
    )
    db.commit()
    log = db.execute("SELECT * FROM logs WHERE id = ?", (log_id,)).fetchone()
    return jsonify(log_row_to_dict(log)), 201


@app.route('/api/cages/<cage_id>/logs/<log_id>', methods=['DELETE'])
def delete_log(cage_id, log_id):
    """로그 항목을 삭제합니다.
    ---
    tags:
      - Logs
    summary: 로그 삭제
    description: 특정 케이지의 활동 로그 항목을 삭제합니다.
    parameters:
      - in: path
        name: cage_id
        required: true
        type: string
        example: "B1"
      - in: path
        name: log_id
        required: true
        type: string
        example: "a1b2c3d4-..."
    responses:
      200:
        description: 삭제 성공
        schema:
          type: object
          properties:
            ok:
              type: boolean
              example: true
    """
    db = get_db()
    db.execute("DELETE FROM logs WHERE id = ? AND cage_id = ?", (log_id, cage_id))
    db.commit()
    return jsonify({'ok': True})


# ========== 앱 시작 ==========

with app.app_context():
    init_db()

if __name__ == '__main__':
    app.run(debug=True)
