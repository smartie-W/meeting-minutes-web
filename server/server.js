const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');

const PORT = Number(process.env.PORT || 8091);
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'meeting_minutes.db');
const API_KEY = String(process.env.API_KEY || '').trim();
const ALLOWED_ORIGINS = String(process.env.ALLOWED_ORIGINS || '*')
  .split(',')
  .map((x) => x.trim())
  .filter(Boolean);

fs.mkdirSync(path.dirname(path.resolve(DB_PATH)), { recursive: true });
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

const createTableSql = `
CREATE TABLE IF NOT EXISTS meeting_records (
  id TEXT PRIMARY KEY,
  fingerprint TEXT NOT NULL,
  sales_name TEXT,
  meeting_time TEXT,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_meeting_time ON meeting_records(meeting_time);
CREATE INDEX IF NOT EXISTS idx_fingerprint ON meeting_records(fingerprint);
`;
db.exec(createTableSql);

const upsertStmt = db.prepare(`
INSERT INTO meeting_records (id, fingerprint, sales_name, meeting_time, payload_json, created_at, updated_at)
VALUES (@id, @fingerprint, @sales_name, @meeting_time, @payload_json, @created_at, @updated_at)
ON CONFLICT(id) DO UPDATE SET
  fingerprint=excluded.fingerprint,
  sales_name=excluded.sales_name,
  meeting_time=excluded.meeting_time,
  payload_json=excluded.payload_json,
  updated_at=excluded.updated_at
`);

const listStmt = db.prepare(`
SELECT id, payload_json FROM meeting_records
ORDER BY meeting_time DESC, updated_at DESC
`);

const deleteStmt = db.prepare('DELETE FROM meeting_records WHERE id = ?');
const getByFingerprintStmt = db.prepare(`
SELECT id, payload_json FROM meeting_records
WHERE fingerprint = ?
LIMIT 1
`);

function nowIso() {
  return new Date().toISOString();
}

function normalizeRecord(record) {
  const base = { ...(record || {}) };
  base.id = String(base.id || '').trim();
  base.salesName = String(base.salesName || '').trim();
  base.meetingMode = String(base.meetingMode || '').trim();
  base.meetingTime = String(base.meetingTime || '').trim();
  base.meetingLocation = String(base.meetingLocation || '').trim();
  base.meetingTopic = String(base.meetingTopic || '').trim();
  base.meetingContent = String(base.meetingContent || '').trim();
  base.nextActions = String(base.nextActions || '').trim();
  base.customerNames = Array.isArray(base.customerNames) ? base.customerNames.map((x) => String(x || '').trim()).filter(Boolean) : [];
  return base;
}

function fingerprintOf(record) {
  const customers = [...(record.customerNames || [])].sort().join('|');
  return [
    record.salesName,
    record.meetingMode,
    record.meetingTime,
    record.meetingLocation,
    customers,
    record.meetingTopic,
    record.meetingContent,
    record.nextActions,
  ].join('||');
}

function shouldRequireApiKey() {
  return Boolean(API_KEY);
}

function authMiddleware(req, res, next) {
  if (!shouldRequireApiKey()) return next();
  const auth = String(req.header('authorization') || '');
  if (!auth.toLowerCase().startsWith('bearer ')) {
    return res.status(401).json({ ok: false, error: 'unauthorized' });
  }
  const token = auth.slice(7).trim();
  if (token !== API_KEY) {
    return res.status(401).json({ ok: false, error: 'unauthorized' });
  }
  next();
}

const app = express();
app.set('trust proxy', true);
app.use(cors({
  origin(origin, cb) {
    if (!origin) return cb(null, true);
    if (ALLOWED_ORIGINS.includes('*') || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    return cb(new Error('CORS blocked'));
  },
}));
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    mode: 'api-server',
    now: nowIso(),
    dbPath: path.resolve(DB_PATH),
  });
});

app.get('/api/records', authMiddleware, (_req, res) => {
  const rows = listStmt.all();
  const records = rows.map((row) => {
    try {
      return JSON.parse(row.payload_json);
    } catch {
      return { id: row.id };
    }
  });
  res.json({ ok: true, records });
});

app.post('/api/records', authMiddleware, (req, res) => {
  const input = normalizeRecord(req.body?.record || {});
  if (!input.id) {
    return res.status(400).json({ ok: false, error: 'record.id required' });
  }
  if (!input.salesName || !input.meetingTime || !input.customerNames.length) {
    return res.status(400).json({ ok: false, error: 'required fields missing' });
  }

  const fingerprint = fingerprintOf(input);
  const existed = getByFingerprintStmt.get(fingerprint);
  if (existed && String(existed.id || '') !== input.id) {
    return res.json({ ok: true, deduped: true, id: existed.id });
  }

  const ts = nowIso();
  const payload = {
    ...input,
    updatedAt: input.updatedAt || ts,
  };
  upsertStmt.run({
    id: input.id,
    fingerprint,
    sales_name: input.salesName,
    meeting_time: input.meetingTime,
    payload_json: JSON.stringify(payload),
    created_at: ts,
    updated_at: ts,
  });

  res.json({ ok: true, id: input.id });
});

app.delete('/api/records/:id', authMiddleware, (req, res) => {
  const id = String(req.params.id || '').trim();
  if (!id) {
    return res.status(400).json({ ok: false, error: 'id required' });
  }
  const result = deleteStmt.run(id);
  res.json({ ok: true, deleted: result.changes > 0 });
});

app.use((err, _req, res, _next) => {
  const message = String(err?.message || 'server error');
  if (message.includes('CORS blocked')) {
    return res.status(403).json({ ok: false, error: 'forbidden_origin' });
  }
  console.error(err);
  res.status(500).json({ ok: false, error: 'server_error', message });
});

app.listen(PORT, () => {
  console.log(`[meeting-api] listening on :${PORT}`);
  console.log(`[meeting-api] db: ${path.resolve(DB_PATH)}`);
});
