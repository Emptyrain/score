import os
import sqlite3
import json
from flask import Flask, request, jsonify
from flask_cors import CORS
from functools import wraps
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
app.config['SYNC_TOKEN'] = os.environ.get('SYNC_TOKEN', 'change-me')

# CORS: allow frontend origin from env, default to local dev
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:5173')
CORS(app, origins=[FRONTEND_URL])

DATABASE = os.path.join(os.path.dirname(__file__), 'instance', 'sync.db')


def get_db():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    os.makedirs(os.path.dirname(DATABASE), exist_ok=True)
    db = get_db()
    db.execute('''
        CREATE TABLE IF NOT EXISTS scores (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            aliases TEXT DEFAULT '[]',
            author TEXT DEFAULT '',
            source TEXT DEFAULT '',
            type TEXT DEFAULT 'number',
            content BLOB,
            created_at TEXT,
            updated_at TEXT
        )
    ''')
    db.commit()
    db.close()


def require_token(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth = request.headers.get('Authorization', '')
        token = auth.replace('Bearer ', '').strip()
        if token != app.config['SYNC_TOKEN']:
            return jsonify({'error': '鉴权失败'}), 401
        return f(*args, **kwargs)
    return decorated


@app.route('/api/sync/push', methods=['POST'])
@require_token
def sync_push():
    data = request.get_json()
    records = data.get('records', [])
    results = []
    db = get_db()
    try:
        for rec in records:
            existing = db.execute("SELECT * FROM scores WHERE id = ?", (rec['id'],)).fetchone()
            if existing:
                if rec['updated_at'] > existing['updated_at']:
                    db.execute(
                        "UPDATE scores SET name=?, aliases=?, author=?, source=?, type=?, content=?, updated_at=? WHERE id=?",
                        (rec['name'], rec['aliases'], rec['author'], rec['source'],
                         rec['type'], rec.get('content', ''), rec['updated_at'], rec['id'])
                    )
                    results.append({'id': rec['id'], 'action': 'updated'})
                else:
                    results.append({'id': rec['id'], 'action': 'skipped', 'reason': 'server_newer'})
            else:
                db.execute(
                    "INSERT INTO scores (id, name, aliases, author, source, type, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    (rec['id'], rec['name'], rec['aliases'], rec['author'], rec['source'],
                     rec['type'], rec.get('content', ''), rec.get('created_at', rec['updated_at']), rec['updated_at'])
                )
                results.append({'id': rec['id'], 'action': 'created'})
        db.commit()
        return jsonify({'results': results})
    finally:
        db.close()


@app.route('/api/sync/push/delete', methods=['POST'])
@require_token
def sync_push_delete():
    data = request.get_json()
    ids = data.get('ids', [])
    if not ids:
        return jsonify({'ids': []})
    db = get_db()
    try:
        placeholders = ','.join('?' for _ in ids)
        db.execute(f"DELETE FROM scores WHERE id IN ({placeholders})", ids)
        db.commit()
        return jsonify({'ids': ids})
    finally:
        db.close()


@app.route('/api/sync/pull', methods=['GET'])
@require_token
def sync_pull():
    db = get_db()
    try:
        rows = db.execute("SELECT * FROM scores").fetchall()
        records = []
        for r in rows:
            content = r['content']
            if isinstance(content, bytes):
                content = content.decode('utf-8', errors='replace')
            records.append({
                'id': r['id'],
                'name': r['name'],
                'aliases': json.loads(r['aliases']),
                'author': r['author'],
                'source': r['source'],
                'type': r['type'],
                'content': content,
                'updated_at': r['updated_at'],
            })
        return jsonify({'records': records})
    finally:
        db.close()


if __name__ == '__main__':
    init_db()
    host = os.environ.get('HOST', '127.0.0.1')
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_DEBUG', '0') == '1'
    app.run(host=host, port=port, debug=debug)
