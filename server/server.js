const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');

const PORT = Number(process.env.PORT || 8091);
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'meeting_minutes.db');
const API_KEY = String(process.env.API_KEY || '').trim();
const BACKUP_DIR = process.env.BACKUP_DIR || path.join(path.dirname(path.resolve(DB_PATH)), 'backups');
const BACKUP_RETENTION_DAYS = Number(process.env.BACKUP_RETENTION_DAYS || 30);
const BACKUP_DAILY_HOUR = Number(process.env.BACKUP_DAILY_HOUR || 3);
const BACKUP_DAILY_MINUTE = Number(process.env.BACKUP_DAILY_MINUTE || 15);
const BACKUP_ON_START = String(process.env.BACKUP_ON_START || 'false').toLowerCase() === 'true';
const ALLOWED_ORIGINS = String(process.env.ALLOWED_ORIGINS || '*')
  .split(',')
  .map((x) => x.trim())
  .filter(Boolean);

fs.mkdirSync(path.dirname(path.resolve(DB_PATH)), { recursive: true });
fs.mkdirSync(path.resolve(BACKUP_DIR), { recursive: true });
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

let lastBackupMeta = null;
let backupTimer = null;

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

function two(n) {
  return String(n).padStart(2, '0');
}

function formatLocalDateTime(date) {
  const y = date.getFullYear();
  const m = two(date.getMonth() + 1);
  const d = two(date.getDate());
  const hh = two(date.getHours());
  const mm = two(date.getMinutes());
  const ss = two(date.getSeconds());
  return `${y}${m}${d}_${hh}${mm}${ss}`;
}

function getBackupFilePath(date = new Date()) {
  const stamp = formatLocalDateTime(date);
  return path.join(path.resolve(BACKUP_DIR), `meeting_minutes_${stamp}.db`);
}

function cleanupOldBackups() {
  const retentionDays = Number.isFinite(BACKUP_RETENTION_DAYS) && BACKUP_RETENTION_DAYS > 0
    ? BACKUP_RETENTION_DAYS
    : 30;
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  const files = fs.readdirSync(path.resolve(BACKUP_DIR));
  let removed = 0;
  files.forEach((name) => {
    if (!name.endsWith('.db')) return;
    const full = path.join(path.resolve(BACKUP_DIR), name);
    try {
      const stat = fs.statSync(full);
      if (stat.mtimeMs < cutoff) {
        fs.unlinkSync(full);
        removed += 1;
      }
    } catch {
      // ignore cleanup failure for single file
    }
  });
  return removed;
}

function performBackup(reason = 'scheduled') {
  db.pragma('wal_checkpoint(TRUNCATE)');
  const dest = getBackupFilePath(new Date());
  fs.copyFileSync(path.resolve(DB_PATH), dest);
  const stat = fs.statSync(dest);
  const removed = cleanupOldBackups();
  lastBackupMeta = {
    ok: true,
    reason,
    file: dest,
    size: stat.size,
    removed,
    at: nowIso(),
  };
  return lastBackupMeta;
}

function scheduleDailyBackup() {
  if (backupTimer) {
    clearTimeout(backupTimer);
    backupTimer = null;
  }
  const now = new Date();
  const next = new Date(now);
  next.setHours(BACKUP_DAILY_HOUR, BACKUP_DAILY_MINUTE, 0, 0);
  if (next.getTime() <= now.getTime()) {
    next.setDate(next.getDate() + 1);
  }
  const delay = Math.max(1000, next.getTime() - now.getTime());
  backupTimer = setTimeout(() => {
    try {
      const meta = performBackup('scheduled');
      console.log(`[meeting-api] backup ok (${meta.reason}) => ${meta.file}`);
    } catch (error) {
      console.error('[meeting-api] backup failed:', error);
      lastBackupMeta = {
        ok: false,
        reason: 'scheduled',
        error: String(error?.message || error),
        at: nowIso(),
      };
    } finally {
      scheduleDailyBackup();
    }
  }, delay);
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
    backup: {
      dir: path.resolve(BACKUP_DIR),
      retentionDays: BACKUP_RETENTION_DAYS,
      dailyAt: `${two(BACKUP_DAILY_HOUR)}:${two(BACKUP_DAILY_MINUTE)}`,
      last: lastBackupMeta,
    },
  });
});

app.post('/api/admin/backup', authMiddleware, (_req, res) => {
  try {
    const meta = performBackup('manual');
    res.json({ ok: true, backup: meta });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: 'backup_failed',
      message: String(error?.message || error),
    });
  }
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
  console.log(`[meeting-api] backup dir: ${path.resolve(BACKUP_DIR)} | daily ${two(BACKUP_DAILY_HOUR)}:${two(BACKUP_DAILY_MINUTE)} | retention ${BACKUP_RETENTION_DAYS}d`);
  if (BACKUP_ON_START) {
    try {
      const meta = performBackup('startup');
      console.log(`[meeting-api] backup ok (${meta.reason}) => ${meta.file}`);
    } catch (error) {
      console.error('[meeting-api] startup backup failed:', error);
    }
  }
  scheduleDailyBackup();
});
