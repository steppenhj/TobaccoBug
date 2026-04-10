import sqlite3
import json
import uuid
from flask import Flask, render_template, jsonify, request, g
from datetime import datetime

DATABASE = 'tobaccobug.db'

app = Flask(__name__)

# ========== DB 연결 ==========

def get_db():
    db = getattr(g, '_database', None)
    if db is None:
        db = g._database = sqlite3.connect(DATABASE)
        db.row_factory = sqlite3.Row
        db.execute("PRAGMA foreign_keys = ON")
    return db

@app.teardown_appcontext
def close_connection(_exception):
    db = getattr(g, '_database', None)
    if db is not None:
        db.close()

def init_db():
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
    # 케이지가 하나도 없으면 기본값 생성
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
    return {
        'id':            row['id'],
        'type':          row['type'],
        'label':         row['label'],
        'currentStatus': json.loads(row['current_status'] or '{}'),
        'updatedAt':     row['updated_at'],
        'logs':          logs or [],
    }

def log_row_to_dict(row):
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
    return render_template('index.html')

@app.route('/measure')
def measure():
    return render_template('measure.html')

# ========== REST API ==========

@app.route('/api/cages', methods=['GET'])
def get_cages():
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
    db = get_db()
    db.execute("DELETE FROM logs WHERE cage_id = ?", (cage_id,))
    db.execute("DELETE FROM cages WHERE id = ?", (cage_id,))
    db.commit()
    return jsonify({'ok': True})

@app.route('/api/cages/<cage_id>/logs', methods=['POST'])
def add_log(cage_id):
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
    db = get_db()
    db.execute("DELETE FROM logs WHERE id = ? AND cage_id = ?", (log_id, cage_id))
    db.commit()
    return jsonify({'ok': True})

# ========== 앱 시작 ==========

with app.app_context():
    init_db()

if __name__ == '__main__':
    app.run(debug=True)
