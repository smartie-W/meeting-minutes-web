const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');
const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');

const PORT = Number(process.env.PORT || 8091);
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'meeting_minutes.db');
const API_KEY = String(process.env.API_KEY || '').trim();
const OPEN_API_KEY = String(process.env.OPEN_API_KEY || '').trim();
const OPEN_API_RATE_LIMIT_PER_MIN = Number(process.env.OPEN_API_RATE_LIMIT_PER_MIN || 120);
const OPEN_API_DEFAULT_PAGE_SIZE = Number(process.env.OPEN_API_DEFAULT_PAGE_SIZE || 50);
const OPEN_API_MAX_PAGE_SIZE = Number(process.env.OPEN_API_MAX_PAGE_SIZE || 200);
const OPEN_API_AUDIT_EXPORT_MAX = Number(process.env.OPEN_API_AUDIT_EXPORT_MAX || 5000);
const BACKUP_DIR = process.env.BACKUP_DIR || path.join(path.dirname(path.resolve(DB_PATH)), 'backups');
const BACKUP_RETENTION_DAYS = Number(process.env.BACKUP_RETENTION_DAYS || 30);
const BACKUP_DAILY_HOUR = Number(process.env.BACKUP_DAILY_HOUR || 3);
const BACKUP_DAILY_MINUTE = Number(process.env.BACKUP_DAILY_MINUTE || 15);
const BACKUP_ON_START = String(process.env.BACKUP_ON_START || 'false').toLowerCase() === 'true';
const INDUSTRY_REFRESH_DAILY_HOUR = Number(process.env.INDUSTRY_REFRESH_DAILY_HOUR || 4);
const INDUSTRY_REFRESH_DAILY_MINUTE = Number(process.env.INDUSTRY_REFRESH_DAILY_MINUTE || 10);
const INDUSTRY_REFRESH_ON_START = String(process.env.INDUSTRY_REFRESH_ON_START || 'false').toLowerCase() === 'true';
const MAIL_NOTIFY_ENABLED = String(process.env.MAIL_NOTIFY_ENABLED || 'false').toLowerCase() === 'true';
const MAIL_PROVIDER = String(process.env.MAIL_PROVIDER || 'resend').trim().toLowerCase();
const RESEND_API_KEY = String(process.env.RESEND_API_KEY || '').trim();
const MAIL_FROM = String(process.env.MAIL_FROM || '').trim();
const NOTIFY_TO_EMAIL = String(process.env.NOTIFY_TO_EMAIL || 'wangqiming@ones.cn').trim();
const BUILD_REPO = String(process.env.BUILD_REPO || 'smartie-W/meeting-minutes-web').trim();
const BUILD_BRANCH = String(process.env.BUILD_BRANCH || 'main').trim();
const BUILD_INFO_CACHE_MS = Number(process.env.BUILD_INFO_CACHE_MS || 300000);
const GITHUB_TOKEN = String(process.env.GITHUB_TOKEN || '').trim();
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
let lastIndustryRefreshMeta = null;
let industryRefreshTimer = null;
let buildInfoCache = { at: 0, data: null };
const openApiRateBucket = new Map();
const OPEN_API_SCHEMA_VERSION = 'open-api-v1';
const OPEN_API_FOCUS_RULES = {
  jira: ['jira'],
  cf: ['cf'],
  confluence: ['confluence'],
};

function getServerCommitHash() {
  const byEnv = String(process.env.APP_BUILD_COMMIT || '').trim();
  if (byEnv) return byEnv.slice(0, 40);
  try {
    const stdout = execSync('git rev-parse HEAD', {
      cwd: path.resolve(__dirname, '..'),
      stdio: ['ignore', 'pipe', 'ignore'],
    }).toString().trim();
    if (stdout) return stdout.slice(0, 40);
  } catch {
    // ignore
  }
  return '';
}

const COMPANY_INDUSTRY_HINTS = [
  { key: '金拱门', level1: '消费服务', level2: '餐饮连锁' },
  { key: '麦当劳', level1: '消费服务', level2: '餐饮连锁' },
  { key: '招商银行', level1: '金融', level2: '银行' },
  { key: '中国银行', level1: '金融', level2: '银行' },
  { key: '工商银行', level1: '金融', level2: '银行' },
  { key: '农业银行', level1: '金融', level2: '银行' },
  { key: '建设银行', level1: '金融', level2: '银行' },
  { key: '平安', level1: '金融', level2: '保险' },
  { key: '中国人寿', level1: '金融', level2: '保险' },
  { key: '宁德时代', level1: '新能源', level2: '动力电池' },
  { key: '中芯国际', level1: '电子信息', level2: '半导体与芯片' },
  { key: '华大基因', level1: '医疗健康', level2: '基因科技/测序' },
  { key: '前程无忧', level1: '企业服务', level2: '人力资源服务' },
  { key: '智联招聘', level1: '企业服务', level2: '人力资源服务' },
  { key: 'boss直聘', level1: '企业服务', level2: '人力资源服务' },
  { key: '导远', level1: '汽车', level2: '智能零部件' },
  { key: '远峰', level1: '汽车', level2: '智能零部件' },
];

const INDUSTRY_PATTERN_HINTS = [
  { re: /(银行|农商银行|商业银行)/i, level1: '金融', level2: '银行' },
  { re: /(证券|基金|信托)/i, level1: '金融', level2: '证券与基金' },
  { re: /(保险)/i, level1: '金融', level2: '保险' },
  { re: /(电力|电网|发电|燃气|石油|石化|煤业|能源)/i, level1: '能源', level2: '综合能源' },
  { re: /(汽车电子|汽车技术|汽车科技|汽车零部件|座舱|智驾)/i, level1: '汽车', level2: '智能零部件' },
  { re: /(汽车|新能源车|主机厂)/i, level1: '汽车', level2: '整车/零部件' },
  { re: /(芯片|半导体|集成电路|EDA)/i, level1: '电子信息', level2: '半导体与芯片' },
  { re: /(机器人|机械臂|自动化设备)/i, level1: '制造', level2: '智能制造' },
  { re: /(电子|电气|精密|仪器|装备|机电|制造|工业)/i, level1: '制造', level2: '工业制造' },
  { re: /(软件|信息技术|信息科技|网络科技|互联网|SaaS|数字)/i, level1: '软件服务', level2: '企业软件/SaaS' },
  { re: /(医药|医疗|医院|生物|基因|器械)/i, level1: '医疗健康', level2: '医疗服务/生物医药' },
  { re: /(零售|商贸|商超|百货|电商|便利店|超市)/i, level1: '零售', level2: '综合零售/电商' },
  { re: /(餐饮|食品|奶茶|咖啡|酒店|酒楼|火锅|快餐)/i, level1: '消费服务', level2: '餐饮连锁' },
  { re: /(物流|供应链|仓储|快递|运输)/i, level1: '物流', level2: '物流与供应链' },
  { re: /(地产|置业|物业|房地产)/i, level1: '房地产', level2: '房地产开发/运营' },
  { re: /(建筑|建工|工程|城建|路桥|隧道|基建)/i, level1: '建筑基建', level2: '工程建设' },
  { re: /(人力资源|人才|猎聘|招聘|劳务)/i, level1: '企业服务', level2: '人力资源服务' },
];

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
CREATE TABLE IF NOT EXISTS open_api_audit_logs (
  id TEXT PRIMARY KEY,
  at TEXT NOT NULL,
  token_hash TEXT,
  ip TEXT,
  method TEXT,
  path TEXT,
  company_query TEXT,
  time_from TEXT,
  time_to TEXT,
  focus TEXT,
  focus_mode TEXT,
  page INTEGER,
  page_size INTEGER,
  status_code INTEGER,
  result_count INTEGER,
  latency_ms INTEGER,
  error TEXT,
  user_agent TEXT
);
CREATE INDEX IF NOT EXISTS idx_open_audit_at ON open_api_audit_logs(at);
CREATE INDEX IF NOT EXISTS idx_open_audit_path ON open_api_audit_logs(path);
CREATE INDEX IF NOT EXISTS idx_open_audit_company ON open_api_audit_logs(company_query);
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
const listWithMetaStmt = db.prepare(`
SELECT id, fingerprint, meeting_time, updated_at, payload_json
FROM meeting_records
`);

const deleteStmt = db.prepare('DELETE FROM meeting_records WHERE id = ?');
const getByFingerprintStmt = db.prepare(`
SELECT id, payload_json FROM meeting_records
WHERE fingerprint = ?
LIMIT 1
`);
const insertOpenAuditStmt = db.prepare(`
INSERT INTO open_api_audit_logs (
  id, at, token_hash, ip, method, path, company_query, time_from, time_to,
  focus, focus_mode, page, page_size, status_code, result_count, latency_ms, error, user_agent
) VALUES (
  @id, @at, @token_hash, @ip, @method, @path, @company_query, @time_from, @time_to,
  @focus, @focus_mode, @page, @page_size, @status_code, @result_count, @latency_ms, @error, @user_agent
)
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

function normalizeIndustryValue(value) {
  return String(value || '').trim();
}

function isUnknownIndustryValue(value) {
  const text = normalizeIndustryValue(value);
  if (!text) return true;
  return text.includes('未知') || text === '-' || text.toLowerCase() === 'unknown';
}

function shouldRefreshIndustry(record) {
  if (!record || typeof record !== 'object') return false;
  if (isUnknownIndustryValue(record.industryLevel1) || isUnknownIndustryValue(record.industryLevel2)) return true;
  if (isUnknownIndustryValue(record.meetingIndustry)) return true;
  const map = record.customerIndustries;
  if (map && typeof map === 'object') {
    const values = Object.values(map);
    if (values.some((x) => isUnknownIndustryValue(x?.level1) || isUnknownIndustryValue(x?.level2))) return true;
  }
  return false;
}

function inferIndustryByName(companyName) {
  const name = String(companyName || '').trim();
  if (!name) return null;
  const lowerName = name.toLowerCase();
  const direct = COMPANY_INDUSTRY_HINTS.find((item) => lowerName.includes(item.key.toLowerCase()));
  if (direct) {
    return { level1: direct.level1, level2: direct.level2, confidence: 'high' };
  }
  const pattern = INDUSTRY_PATTERN_HINTS.find((item) => item.re.test(name));
  if (pattern) {
    return { level1: pattern.level1, level2: pattern.level2, confidence: 'medium' };
  }
  return null;
}

function inferIndustryForRecord(record) {
  const customers = Array.isArray(record?.customerNames) ? record.customerNames : [];
  for (const name of customers) {
    const inferred = inferIndustryByName(name);
    if (inferred) return inferred;
  }
  return null;
}

function applyIndustryToRecord(record, inferred) {
  const level1 = String(inferred?.level1 || '').trim();
  const level2 = String(inferred?.level2 || '').trim();
  if (!level1 || !level2) return null;

  const next = { ...(record || {}) };
  next.industryLevel1 = level1;
  next.industryLevel2 = level2;
  next.meetingIndustry = `${level1}/${level2}`;

  const map = (next.customerIndustries && typeof next.customerIndustries === 'object')
    ? { ...next.customerIndustries }
    : {};
  const customers = Array.isArray(next.customerNames) ? next.customerNames : [];
  customers.forEach((name) => {
    const key = String(name || '').trim();
    if (!key) return;
    map[key] = { level1, level2 };
  });
  next.customerIndustries = map;

  return next;
}

function performIndustryRefresh(reason = 'scheduled') {
  const rows = listStmt.all();
  let scanned = 0;
  let refreshed = 0;
  let skipped = 0;
  let unchanged = 0;
  const ts = nowIso();

  rows.forEach((row) => {
    scanned += 1;
    let payload;
    try {
      payload = JSON.parse(row.payload_json);
    } catch {
      skipped += 1;
      return;
    }
    if (!shouldRefreshIndustry(payload)) {
      unchanged += 1;
      return;
    }
    const inferred = inferIndustryForRecord(payload);
    if (!inferred) {
      skipped += 1;
      return;
    }
    const updated = applyIndustryToRecord(payload, inferred);
    if (!updated) {
      skipped += 1;
      return;
    }

    const normalized = normalizeRecord(updated);
    if (!normalized.id) {
      skipped += 1;
      return;
    }

    const fingerprint = fingerprintOf(normalized);
    upsertStmt.run({
      id: normalized.id,
      fingerprint,
      sales_name: normalized.salesName,
      meeting_time: normalized.meetingTime,
      payload_json: JSON.stringify({ ...updated, updatedAt: ts }),
      created_at: ts,
      updated_at: ts,
    });
    refreshed += 1;
  });

  lastIndustryRefreshMeta = {
    ok: true,
    reason,
    scanned,
    refreshed,
    unchanged,
    skipped,
    at: nowIso(),
  };
  return lastIndustryRefreshMeta;
}

function getRowSortTimestamp(row) {
  try {
    const payload = JSON.parse(String(row?.payload_json || '{}'));
    const payloadUpdatedAt = Date.parse(String(payload?.updatedAt || ''));
    if (!Number.isNaN(payloadUpdatedAt)) return payloadUpdatedAt;
  } catch {
    // ignore json parse error
  }
  const rowUpdatedAt = Date.parse(String(row?.updated_at || ''));
  if (!Number.isNaN(rowUpdatedAt)) return rowUpdatedAt;
  const meetingAt = Date.parse(String(row?.meeting_time || ''));
  if (!Number.isNaN(meetingAt)) return meetingAt;
  return 0;
}

function compareRowsForLatest(a, b) {
  const ta = getRowSortTimestamp(a);
  const tb = getRowSortTimestamp(b);
  if (tb !== ta) return tb - ta;
  return String(b.id || '').localeCompare(String(a.id || ''));
}

function performDeduplicateByFingerprint(reason = 'manual') {
  const rows = listWithMetaStmt.all();
  const grouped = new Map();
  rows.forEach((row) => {
    const fp = String(row?.fingerprint || '').trim();
    if (!fp) return;
    if (!grouped.has(fp)) grouped.set(fp, []);
    grouped.get(fp).push(row);
  });

  const toDelete = [];
  grouped.forEach((items) => {
    if (!Array.isArray(items) || items.length <= 1) return;
    const sorted = [...items].sort(compareRowsForLatest);
    const duplicates = sorted.slice(1);
    duplicates.forEach((row) => {
      if (row?.id) toDelete.push(String(row.id));
    });
  });

  const tx = db.transaction((ids) => {
    let removed = 0;
    ids.forEach((id) => {
      const r = deleteStmt.run(id);
      removed += Number(r?.changes || 0);
    });
    return removed;
  });
  const removed = tx(toDelete);

  return {
    ok: true,
    reason,
    scanned: rows.length,
    duplicateGroups: [...grouped.values()].filter((x) => x.length > 1).length,
    removed,
    remained: rows.length - removed,
    at: nowIso(),
  };
}

function scheduleDailyIndustryRefresh() {
  if (industryRefreshTimer) {
    clearTimeout(industryRefreshTimer);
    industryRefreshTimer = null;
  }
  const now = new Date();
  const next = new Date(now);
  next.setHours(INDUSTRY_REFRESH_DAILY_HOUR, INDUSTRY_REFRESH_DAILY_MINUTE, 0, 0);
  if (next.getTime() <= now.getTime()) {
    next.setDate(next.getDate() + 1);
  }
  const delay = Math.max(1000, next.getTime() - now.getTime());
  industryRefreshTimer = setTimeout(() => {
    try {
      const meta = performIndustryRefresh('scheduled');
      console.log(`[meeting-api] industry refresh ok (${meta.reason}) scanned=${meta.scanned} refreshed=${meta.refreshed}`);
    } catch (error) {
      console.error('[meeting-api] industry refresh failed:', error);
      lastIndustryRefreshMeta = {
        ok: false,
        reason: 'scheduled',
        error: String(error?.message || error),
        at: nowIso(),
      };
    } finally {
      scheduleDailyIndustryRefresh();
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
  base.attachments = Array.isArray(base.attachments)
    ? base.attachments
      .map((item) => ({
        id: String(item?.id || '').trim(),
        name: String(item?.name || '').trim(),
        type: String(item?.type || '').trim(),
        size: Number(item?.size || 0),
        dataUrl: String(item?.dataUrl || '').trim(),
        uploadedAt: String(item?.uploadedAt || '').trim(),
      }))
      .filter((item) => item.name && item.dataUrl && item.size > 0 && item.size <= 5 * 1024 * 1024)
    : [];
  return base;
}

function parseTimeMs(value) {
  const text = String(value || '').trim();
  if (!text) return NaN;
  const ms = Date.parse(text);
  return Number.isNaN(ms) ? NaN : ms;
}

function normalizeCompanyKey(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/（.*?）|\(.*?\)/g, '')
    .replace(/[\s·\-.、，,]/g, '')
    .replace(/(股份)?有限(责任)?公司|集团|控股|科技|技术|信息|电子|工业|实业|有限公司|公司$/g, '');
}

function matchCustomerName(customerName, queryName) {
  const customerRaw = String(customerName || '').trim().toLowerCase();
  const queryRaw = String(queryName || '').trim().toLowerCase();
  if (!customerRaw || !queryRaw) return false;
  if (customerRaw.includes(queryRaw) || queryRaw.includes(customerRaw)) return true;
  const a = normalizeCompanyKey(customerRaw);
  const b = normalizeCompanyKey(queryRaw);
  if (!a || !b) return false;
  return a.includes(b) || b.includes(a);
}

function pickRecordsSearchParams(req) {
  const source = req.method === 'POST' ? (req.body || {}) : (req.query || {});
  const company = String(source.company || source.customer || source.customerName || '').trim();
  const startTime = String(source.start || source.startTime || source.from || '').trim();
  const endTime = String(source.end || source.endTime || source.to || '').trim();
  const ar = String(source.ar || source.salesName || '').trim();
  const sr = String(source.sr || '').trim();
  const keyword = String(source.keyword || source.q || '').trim();
  const page = Math.max(1, Number(source.page || 1) || 1);
  const pageSizeRaw = Number(source.pageSize || source.limit || 50) || 50;
  const pageSize = Math.min(500, Math.max(1, pageSizeRaw));
  const includeContent = String(source.includeContent || 'true').toLowerCase() !== 'false';
  return {
    company,
    startTime,
    endTime,
    ar,
    sr,
    keyword,
    page,
    pageSize,
    includeContent,
  };
}

function filterRecordsBySearch(records, params) {
  const startMs = parseTimeMs(params.startTime);
  const endMs = parseTimeMs(params.endTime);
  const arLower = params.ar.toLowerCase();
  const srLower = params.sr.toLowerCase();
  const keywordLower = params.keyword.toLowerCase();

  const filtered = records.filter((record) => {
    const timeMs = parseTimeMs(record.meetingTime);
    if (!Number.isNaN(startMs) && (Number.isNaN(timeMs) || timeMs < startMs)) return false;
    if (!Number.isNaN(endMs) && (Number.isNaN(timeMs) || timeMs > endMs)) return false;

    if (params.company) {
      const names = Array.isArray(record.customerNames) ? record.customerNames : [];
      const matched = names.some((name) => matchCustomerName(name, params.company));
      if (!matched) return false;
    }

    if (arLower && !String(record.salesName || '').toLowerCase().includes(arLower)) return false;

    if (srLower) {
      const hasSr = (record.ourParticipants || []).some((item) => {
        const role = String(item?.role || '').toUpperCase();
        const name = String(item?.name || '').toLowerCase();
        return role === 'SR' && name.includes(srLower);
      });
      if (!hasSr) return false;
    }

    if (keywordLower) {
      const text = [
        record.meetingTopic,
        record.meetingContent,
        record.nextActions,
        ...(record.customerNames || []),
      ].map((x) => String(x || '').toLowerCase()).join(' ');
      if (!text.includes(keywordLower)) return false;
    }

    return true;
  });

  filtered.sort((a, b) => {
    const ta = parseTimeMs(a.meetingTime);
    const tb = parseTimeMs(b.meetingTime);
    return (Number.isNaN(tb) ? 0 : tb) - (Number.isNaN(ta) ? 0 : ta);
  });

  return filtered;
}

function deriveCompanyAlias(name) {
  const raw = String(name || '').trim();
  if (!raw) return '';
  return raw
    .replace(/（.*?）|\(.*?\)/g, '')
    .replace(/(股份)?有限(责任)?公司|集团|控股|科技|技术|信息|电子|工业|实业|有限公司|公司$/g, '')
    .trim();
}

function toCompanyTokens(input) {
  const raw = String(input || '').trim().toLowerCase();
  if (!raw) return [];
  const alias = deriveCompanyAlias(raw).toLowerCase();
  const normalized = normalizeCompanyKey(raw);
  return [raw, alias, normalized].filter(Boolean);
}

function recordCompanyMatched(record, query) {
  const queryTokens = toCompanyTokens(query);
  if (!queryTokens.length) return false;
  const names = Array.isArray(record?.customerNames) ? record.customerNames : [];
  if (!names.length) return false;
  for (const name of names) {
    const nameTokens = toCompanyTokens(name);
    for (const q of queryTokens) {
      for (const n of nameTokens) {
        if (!q || !n) continue;
        if (n.includes(q) || q.includes(n)) return true;
      }
    }
    if (matchCustomerName(name, query)) return true;
  }
  return false;
}

function collectSummaryKeywords(records, limit = 20) {
  const stopWords = new Set([
    '我们', '客户', '会议', '纪要', '需求', '产品', '项目', '系统', '功能', '模块', '推进', '当前',
    '后续', '安排', '这个', '那个', '以及', '进行', '支持', '沟通', '讨论', '方案', '使用', '实现',
    '对接', '问题', '方面', '相关', '通过', '可以', '需要', '已经', '一个', '几个', '一些',
  ]);
  const freq = new Map();
  const text = records.map((r) => [r.meetingTopic, r.meetingContent, r.nextActions].join(' ')).join('\n');
  const tokens = String(text || '')
    .replace(/[^\u4e00-\u9fa5a-zA-Z0-9+#]/g, ' ')
    .split(/\s+/)
    .map((x) => x.trim().toLowerCase())
    .filter((x) => x && x.length >= 2);
  for (const token of tokens) {
    if (stopWords.has(token)) continue;
    freq.set(token, (freq.get(token) || 0) + 1);
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, Math.max(1, limit))
    .map(([word, count]) => ({ word, count }));
}

function summarizeToolMentions(records) {
  const byTool = {};
  Object.keys(OPEN_API_FOCUS_RULES).forEach((toolKey) => {
    byTool[toolKey] = { meetings: 0, customers: new Set() };
  });
  for (const record of records) {
    const text = [record.meetingTopic, record.meetingContent, record.nextActions]
      .map((x) => String(x || ''))
      .join(' ');
    const customer = String((record.customerNames || [])[0] || '').trim();
    Object.keys(OPEN_API_FOCUS_RULES).forEach((toolKey) => {
      if (toolPatternMatched(text, toolKey)) {
        byTool[toolKey].meetings += 1;
        if (customer) byTool[toolKey].customers.add(customer);
      }
    });
  }
  const output = {};
  Object.entries(byTool).forEach(([tool, stats]) => {
    output[tool] = {
      meetingCount: stats.meetings,
      customerCount: stats.customers.size,
      customers: [...stats.customers].sort(),
    };
  });
  return output;
}

function summarizeCustomerActivity(records, benchmarkMs = Date.now()) {
  const byCustomer = new Map();
  for (const record of records) {
    const customer = String((record.customerNames || [])[0] || '').trim();
    if (!customer) continue;
    const t = parseTimeMs(record.meetingTime);
    if (Number.isNaN(t)) continue;
    if (!byCustomer.has(customer)) byCustomer.set(customer, []);
    byCustomer.get(customer).push(t);
  }
  const noFollowUp3Weeks = [];
  const frequentRecent = [];
  const threeWeeksMs = 21 * 24 * 60 * 60 * 1000;
  const recentStart = benchmarkMs - threeWeeksMs;

  byCustomer.forEach((times, customer) => {
    const sorted = [...times].sort((a, b) => a - b);
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const recentCount = sorted.filter((x) => x >= recentStart && x <= benchmarkMs).length;
    if (sorted.length === 1 && benchmarkMs - first > threeWeeksMs) {
      noFollowUp3Weeks.push({
        customer,
        firstMeetingTime: new Date(first).toISOString(),
        gapDays: Math.floor((benchmarkMs - first) / (24 * 60 * 60 * 1000)),
      });
    }
    if (recentCount >= 2) {
      frequentRecent.push({
        customer,
        recentMeetingCount: recentCount,
        lastMeetingTime: new Date(last).toISOString(),
      });
    }
  });
  noFollowUp3Weeks.sort((a, b) => b.gapDays - a.gapDays);
  frequentRecent.sort((a, b) => b.recentMeetingCount - a.recentMeetingCount);
  return { noFollowUp3Weeks, frequentRecent };
}

function normalizeFocusList(rawFocus) {
  const values = Array.isArray(rawFocus)
    ? rawFocus
    : String(rawFocus || '')
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);
  const allowed = new Set(Object.keys(OPEN_API_FOCUS_RULES));
  const normalized = [...new Set(values.map((x) => String(x || '').trim().toLowerCase()))]
    .filter((x) => allowed.has(x));
  return normalized;
}

function toolPatternMatched(text, toolKey) {
  const lower = String(text || '').toLowerCase();
  if (!lower) return false;
  if (toolKey === 'cf') {
    return /(^|[^a-z])cf([^a-z]|$)/i.test(lower);
  }
  const aliases = OPEN_API_FOCUS_RULES[toolKey] || [];
  return aliases.some((alias) => lower.includes(alias));
}

function recordMatchedFocus(record, focusList, focusMode = 'any') {
  if (!focusList.length) return true;
  const text = [record.meetingTopic, record.meetingContent, record.nextActions]
    .map((x) => String(x || ''))
    .join(' ');
  if (String(focusMode || '').toLowerCase() === 'all') {
    return focusList.every((toolKey) => toolPatternMatched(text, toolKey));
  }
  return focusList.some((toolKey) => toolPatternMatched(text, toolKey));
}

function pickOpenQueryParams(req) {
  const source = req.method === 'POST' ? (req.body || {}) : (req.query || {});
  const q = String(source.q || source.company || source.customer || '').trim();
  const from = String(source.from || source.start || source.startTime || '').trim();
  const to = String(source.to || source.end || source.endTime || '').trim();
  const focus = normalizeFocusList(source.focus || source.tools || source.tool);
  const focusMode = String(source.focusMode || 'any').toLowerCase() === 'all' ? 'all' : 'any';
  const page = Math.max(1, Number(source.page || 1) || 1);
  const pageSize = Math.min(
    Math.max(1, OPEN_API_MAX_PAGE_SIZE || 200),
    Math.max(1, Number(source.pageSize || OPEN_API_DEFAULT_PAGE_SIZE || 50) || 50),
  );
  return { q, from, to, focus, focusMode, page, pageSize };
}

function filterRecordsForOpen(records, params) {
  const startMs = parseTimeMs(params.from);
  const endMs = parseTimeMs(params.to);
  return records
    .filter((record) => {
      const timeMs = parseTimeMs(record.meetingTime);
      if (!Number.isNaN(startMs) && (Number.isNaN(timeMs) || timeMs < startMs)) return false;
      if (!Number.isNaN(endMs) && (Number.isNaN(timeMs) || timeMs > endMs)) return false;
      if (params.q && !recordCompanyMatched(record, params.q)) return false;
      if (!recordMatchedFocus(record, params.focus || [], params.focusMode || 'any')) return false;
      return true;
    })
    .sort((a, b) => {
      const ta = parseTimeMs(a.meetingTime);
      const tb = parseTimeMs(b.meetingTime);
      return (Number.isNaN(tb) ? 0 : tb) - (Number.isNaN(ta) ? 0 : ta);
    });
}

function hashTokenForAudit(token) {
  const raw = String(token || '').trim();
  if (!raw) return '';
  return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 16);
}

function logOpenApiAudit(req, detail = {}) {
  try {
    insertOpenAuditStmt.run({
      id: crypto.randomUUID(),
      at: nowIso(),
      token_hash: hashTokenForAudit(req.openApiToken),
      ip: String(req.ip || req.socket?.remoteAddress || ''),
      method: String(req.method || ''),
      path: String(req.path || ''),
      company_query: String(detail.companyQuery || ''),
      time_from: String(detail.timeFrom || ''),
      time_to: String(detail.timeTo || ''),
      focus: String(detail.focus || ''),
      focus_mode: String(detail.focusMode || ''),
      page: Number(detail.page || 0),
      page_size: Number(detail.pageSize || 0),
      status_code: Number(detail.statusCode || 0),
      result_count: Number(detail.resultCount || 0),
      latency_ms: Number(detail.latencyMs || 0),
      error: String(detail.error || ''),
      user_agent: String(req.header('user-agent') || ''),
    });
  } catch (error) {
    console.error('[meeting-api] open-api audit write failed:', error);
  }
}

function toCsvValue(value) {
  const text = String(value ?? '');
  if (text.includes(',') || text.includes('"') || text.includes('\n')) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

function pickOpenApiToken(req) {
  const fromHeader = String(req.header('x-api-key') || '').trim();
  if (fromHeader) return fromHeader;
  const auth = String(req.header('authorization') || '');
  if (auth.toLowerCase().startsWith('bearer ')) return auth.slice(7).trim();
  return '';
}

function openApiAuthMiddleware(req, res, next) {
  const expected = OPEN_API_KEY || API_KEY;
  if (!expected) {
    return res.status(503).json({ ok: false, schemaVersion: OPEN_API_SCHEMA_VERSION, error: 'open_api_not_configured' });
  }
  const token = pickOpenApiToken(req);
  if (!token || token !== expected) {
    return res.status(401).json({ ok: false, schemaVersion: OPEN_API_SCHEMA_VERSION, error: 'unauthorized' });
  }
  req.openApiToken = token;
  next();
}

function openApiRateLimitMiddleware(req, res, next) {
  const maxPerMin = Math.max(10, OPEN_API_RATE_LIMIT_PER_MIN || 120);
  const now = Date.now();
  const token = String(req.openApiToken || '');
  const ip = String(req.ip || req.socket?.remoteAddress || '-');
  const bucketKey = `${token}|${ip}`;
  const prev = openApiRateBucket.get(bucketKey);
  if (!prev || now >= prev.resetAt) {
    openApiRateBucket.set(bucketKey, { count: 1, resetAt: now + 60 * 1000 });
    return next();
  }
  if (prev.count >= maxPerMin) {
    const retryAfter = Math.max(1, Math.ceil((prev.resetAt - now) / 1000));
    res.setHeader('Retry-After', String(retryAfter));
    return res.status(429).json({
      ok: false,
      schemaVersion: OPEN_API_SCHEMA_VERSION,
      error: 'rate_limited',
      retryAfterSec: retryAfter,
    });
  }
  prev.count += 1;
  openApiRateBucket.set(bucketKey, prev);
  next();
}

function escapeHtml(input) {
  return String(input || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function buildNotifySubject(payload) {
  const ar = String(payload?.ar || '').trim() || '-';
  const customer = String(payload?.customerName || '').trim() || '-';
  const meetingTime = String(payload?.meetingTime || '').trim() || '-';
  return `[销售会议纪要] AR:${ar} | 客户:${customer} | 会议时间:${meetingTime}`;
}

function buildNotifyText(payload, detailUrl) {
  return [
    '新的会议纪要已保存',
    `AR: ${String(payload?.ar || '').trim() || '-'}`,
    `客户: ${String(payload?.customerName || '').trim() || '-'}`,
    `会议时间: ${String(payload?.meetingTime || '').trim() || '-'}`,
    `纪要详情链接: ${detailUrl}`,
  ].join('\n');
}

function buildNotifyHtml(payload, detailUrl) {
  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'PingFang SC','Noto Sans SC',sans-serif;line-height:1.6;color:#111827;">
      <h2 style="margin:0 0 12px;">新的会议纪要已保存</h2>
      <p style="margin:6px 0;"><strong>AR：</strong>${escapeHtml(String(payload?.ar || '').trim() || '-')}</p>
      <p style="margin:6px 0;"><strong>客户：</strong>${escapeHtml(String(payload?.customerName || '').trim() || '-')}</p>
      <p style="margin:6px 0;"><strong>会议时间：</strong>${escapeHtml(String(payload?.meetingTime || '').trim() || '-')}</p>
      <p style="margin:14px 0 8px;">纪要详情链接：</p>
      <a href="${escapeHtml(detailUrl)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:9px 14px;background:#0b6a88;color:#fff;text-decoration:none;border-radius:8px;">打开纪要详情</a>
      <div style="margin-top:10px;color:#4b5563;word-break:break-all;">${escapeHtml(detailUrl)}</div>
    </div>
  `;
}

async function sendByResend(payload, detailUrl) {
  if (!RESEND_API_KEY) throw new Error('missing RESEND_API_KEY');
  if (!MAIL_FROM) throw new Error('missing MAIL_FROM');
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: MAIL_FROM,
      to: [NOTIFY_TO_EMAIL],
      subject: buildNotifySubject(payload),
      html: buildNotifyHtml(payload, detailUrl),
      text: buildNotifyText(payload, detailUrl),
    }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(String(result?.message || result?.error || `resend http ${response.status}`));
  }
  return { id: String(result?.id || '') };
}

async function sendMeetingNotify(payload) {
  if (!MAIL_NOTIFY_ENABLED) return { ok: false, skipped: true, reason: 'disabled' };
  if (MAIL_PROVIDER !== 'resend') return { ok: false, skipped: true, reason: 'unsupported_provider' };
  const detailUrl = String(payload?.detailUrl || '').trim();
  if (!detailUrl) return { ok: false, skipped: true, reason: 'missing_detail_url' };
  const sent = await sendByResend(payload, detailUrl);
  return { ok: true, provider: 'resend', messageId: sent.id };
}

function buildNotifyPayloadFromRecord(record) {
  const customerName = Array.isArray(record?.customerNames) && record.customerNames.length
    ? String(record.customerNames[0] || '').trim()
    : '';
  const recordId = String(record?.id || '').trim();
  return {
    recordId,
    ar: String(record?.salesName || '').trim(),
    customerName,
    meetingTime: String(record?.meetingTime || '').trim(),
    detailUrl: `https://hyjy.online/?view=history&recordId=${encodeURIComponent(recordId)}`,
  };
}

async function sendMeetingNotifyWithRetry(payload, maxAttempts = 3) {
  let lastError = '';
  for (let i = 1; i <= maxAttempts; i += 1) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const sent = await sendMeetingNotify(payload);
      if (sent.ok || sent.skipped) return { ...sent, attempt: i };
      lastError = String(sent.reason || 'notify_failed');
    } catch (error) {
      lastError = String(error?.message || error || 'notify_failed');
    }
    if (i < maxAttempts) {
      // eslint-disable-next-line no-await-in-loop
      await new Promise((resolve) => setTimeout(resolve, i * 500));
    }
  }
  return { ok: false, reason: lastError || 'notify_failed', attempt: maxAttempts };
}

async function fetchLatestMainCommit() {
  const repoPath = encodeURIComponent(BUILD_REPO).replace('%2F', '/');
  const branchPath = encodeURIComponent(BUILD_BRANCH);
  const url = `https://api.github.com/repos/${repoPath}/commits/${branchPath}`;
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'meeting-minutes-api',
  };
  if (GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${GITHUB_TOKEN}`;
  }
  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`github_http_${response.status}`);
  }
  const data = await response.json();
  const sha = String(data?.sha || '').trim();
  if (!sha) throw new Error('github_empty_sha');
  return sha;
}

async function getBuildInfo() {
  const now = Date.now();
  if (buildInfoCache.data && now - buildInfoCache.at < Math.max(10000, BUILD_INFO_CACHE_MS)) {
    return buildInfoCache.data;
  }
  const deployedCommit = getServerCommitHash();
  let latestMainCommit = '';
  let latestError = '';
  try {
    latestMainCommit = await fetchLatestMainCommit();
  } catch (error) {
    latestError = String(error?.message || error);
  }
  const payload = {
    ok: true,
    source: 'api-server',
    repo: BUILD_REPO,
    branch: BUILD_BRANCH,
    deployedCommit,
    latestMainCommit,
    latestError,
    now: nowIso(),
    cacheMs: Math.max(10000, BUILD_INFO_CACHE_MS),
  };
  buildInfoCache = { at: now, data: payload };
  return payload;
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
app.use(express.json({ limit: '12mb' }));

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
    industryRefresh: {
      dailyAt: `${two(INDUSTRY_REFRESH_DAILY_HOUR)}:${two(INDUSTRY_REFRESH_DAILY_MINUTE)}`,
      last: lastIndustryRefreshMeta,
    },
  });
});

app.get('/api/build-info', async (_req, res) => {
  try {
    const info = await getBuildInfo();
    res.json(info);
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: 'build_info_failed',
      message: String(error?.message || error),
    });
  }
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

app.post('/api/admin/industry-refresh', authMiddleware, (_req, res) => {
  try {
    const meta = performIndustryRefresh('manual');
    res.json({ ok: true, industryRefresh: meta });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: 'industry_refresh_failed',
      message: String(error?.message || error),
    });
  }
});

app.post('/api/admin/dedupe', authMiddleware, (_req, res) => {
  try {
    const meta = performDeduplicateByFingerprint('manual');
    res.json({ ok: true, dedupe: meta });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: 'dedupe_failed',
      message: String(error?.message || error),
    });
  }
});

app.post('/api/notify', authMiddleware, async (req, res) => {
  const payload = req.body && typeof req.body === 'object' ? req.body : {};
  try {
    const result = await sendMeetingNotify(payload);
    if (!result.ok) {
      return res.status(200).json({ ok: false, error: result.reason || 'notify_skipped' });
    }
    return res.status(200).json({ ok: true, provider: result.provider, messageId: result.messageId || '' });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: String(error?.message || error),
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

function handleSearchRecords(req, res) {
  const params = pickRecordsSearchParams(req);
  const rows = listStmt.all();
  const records = rows.map((row) => {
    try {
      return JSON.parse(row.payload_json);
    } catch {
      return { id: row.id };
    }
  });

  const filtered = filterRecordsBySearch(records, params);
  const total = filtered.length;
  const start = (params.page - 1) * params.pageSize;
  const pageRows = filtered.slice(start, start + params.pageSize);
  const items = pageRows.map((record) => {
    const base = {
      id: String(record.id || ''),
      salesName: String(record.salesName || ''),
      meetingTime: String(record.meetingTime || ''),
      meetingMode: String(record.meetingMode || ''),
      meetingLocation: String(record.meetingLocation || ''),
      customerNames: Array.isArray(record.customerNames) ? record.customerNames : [],
      industryLevel1: String(record.industryLevel1 || ''),
      industryLevel2: String(record.industryLevel2 || ''),
      meetingIndustry: String(record.meetingIndustry || ''),
      meetingTopic: String(record.meetingTopic || ''),
      nextActions: String(record.nextActions || ''),
      updatedAt: String(record.updatedAt || ''),
      ourParticipants: Array.isArray(record.ourParticipants) ? record.ourParticipants : [],
      customerParticipants: Array.isArray(record.customerParticipants) ? record.customerParticipants : [],
    };
    if (params.includeContent) {
      base.meetingContent = String(record.meetingContent || '');
    }
    return base;
  });

  res.json({
    ok: true,
    query: params,
    total,
    page: params.page,
    pageSize: params.pageSize,
    hasMore: start + items.length < total,
    items,
  });
}

app.get('/api/records/search', authMiddleware, (req, res) => {
  handleSearchRecords(req, res);
});

app.post('/api/records/search', authMiddleware, (req, res) => {
  handleSearchRecords(req, res);
});

function listAllRecordsParsed() {
  return listStmt.all().map((row) => {
    try {
      return JSON.parse(row.payload_json);
    } catch {
      return { id: row.id };
    }
  });
}

app.get('/api/open/records', openApiAuthMiddleware, openApiRateLimitMiddleware, (req, res) => {
  const startedAt = Date.now();
  const params = pickOpenQueryParams(req);
  if (!params.q) {
    logOpenApiAudit(req, {
      companyQuery: params.q,
      timeFrom: params.from,
      timeTo: params.to,
      focus: (params.focus || []).join(','),
      focusMode: params.focusMode,
      page: params.page,
      pageSize: params.pageSize,
      statusCode: 400,
      resultCount: 0,
      latencyMs: Date.now() - startedAt,
      error: 'q_required',
    });
    return res.status(400).json({ ok: false, error: 'q_required' });
  }
  const filtered = filterRecordsForOpen(listAllRecordsParsed(), params);
  const total = filtered.length;
  const start = (params.page - 1) * params.pageSize;
  const items = filtered.slice(start, start + params.pageSize).map((record) => ({
    id: String(record.id || ''),
    salesName: String(record.salesName || ''),
    meetingTime: String(record.meetingTime || ''),
    meetingMode: String(record.meetingMode || ''),
    meetingLocation: String(record.meetingLocation || ''),
    customerNames: Array.isArray(record.customerNames) ? record.customerNames : [],
    meetingTopic: String(record.meetingTopic || ''),
    meetingContent: String(record.meetingContent || ''),
    nextActions: String(record.nextActions || ''),
    industryLevel1: String(record.industryLevel1 || ''),
    industryLevel2: String(record.industryLevel2 || ''),
    meetingIndustry: String(record.meetingIndustry || ''),
    ourParticipants: Array.isArray(record.ourParticipants) ? record.ourParticipants : [],
    customerParticipants: Array.isArray(record.customerParticipants) ? record.customerParticipants : [],
    updatedAt: String(record.updatedAt || ''),
    attachments: Array.isArray(record.attachments)
      ? record.attachments.map((item) => ({
        id: String(item?.id || ''),
        name: String(item?.name || ''),
        type: String(item?.type || ''),
        size: Number(item?.size || 0),
      }))
      : [],
  }));

  const response = {
    ok: true,
    schemaVersion: OPEN_API_SCHEMA_VERSION,
    query: params,
    total,
    page: params.page,
    pageSize: params.pageSize,
    hasMore: start + items.length < total,
    items,
  };
  logOpenApiAudit(req, {
    companyQuery: params.q,
    timeFrom: params.from,
    timeTo: params.to,
    focus: (params.focus || []).join(','),
    focusMode: params.focusMode,
    page: params.page,
    pageSize: params.pageSize,
    statusCode: 200,
    resultCount: items.length,
    latencyMs: Date.now() - startedAt,
  });
  return res.json(response);
});

app.post('/api/open/summary', openApiAuthMiddleware, openApiRateLimitMiddleware, (req, res) => {
  const startedAt = Date.now();
  const params = pickOpenQueryParams(req);
  if (!params.q) {
    logOpenApiAudit(req, {
      companyQuery: params.q,
      timeFrom: params.from,
      timeTo: params.to,
      focus: (params.focus || []).join(','),
      focusMode: params.focusMode,
      page: params.page,
      pageSize: params.pageSize,
      statusCode: 400,
      resultCount: 0,
      latencyMs: Date.now() - startedAt,
      error: 'q_required',
    });
    return res.status(400).json({ ok: false, error: 'q_required' });
  }
  const benchmarkMs = Number.isNaN(parseTimeMs(params.to)) ? Date.now() : parseTimeMs(params.to);
  const filtered = filterRecordsForOpen(listAllRecordsParsed(), params);
  const firstMeeting = filtered.length ? filtered[filtered.length - 1].meetingTime : '';
  const lastMeeting = filtered.length ? filtered[0].meetingTime : '';
  const customers = new Set();
  const arStats = new Map();
  filtered.forEach((record) => {
    const customer = String((record.customerNames || [])[0] || '').trim();
    if (customer) customers.add(customer);
    const ar = String(record.salesName || '').trim() || '未知';
    arStats.set(ar, (arStats.get(ar) || 0) + 1);
  });

  const toolMentions = summarizeToolMentions(filtered);
  const activity = summarizeCustomerActivity(filtered, benchmarkMs);
  const topKeywords = collectSummaryKeywords(filtered, 20);
  const arRanking = [...arStats.entries()]
    .map(([ar, meetingCount]) => ({ ar, meetingCount }))
    .sort((a, b) => b.meetingCount - a.meetingCount);

  const response = {
    ok: true,
    schemaVersion: OPEN_API_SCHEMA_VERSION,
    query: params,
    summary: {
      companyQuery: params.q,
      meetingCount: filtered.length,
      customerCount: customers.size,
      firstMeetingTime: firstMeeting,
      lastMeetingTime: lastMeeting,
      arRanking,
      toolMentions,
      noFollowUp3Weeks: activity.noFollowUp3Weeks,
      frequentRecentMeetings: activity.frequentRecent,
      topKeywords,
    },
  };
  logOpenApiAudit(req, {
    companyQuery: params.q,
    timeFrom: params.from,
    timeTo: params.to,
    focus: (params.focus || []).join(','),
    focusMode: params.focusMode,
    page: params.page,
    pageSize: params.pageSize,
    statusCode: 200,
    resultCount: filtered.length,
    latencyMs: Date.now() - startedAt,
  });
  return res.json(response);
});

app.get('/api/admin/open-audit/export', authMiddleware, (req, res) => {
  const from = String(req.query.from || '').trim();
  const to = String(req.query.to || '').trim();
  const format = String(req.query.format || 'json').trim().toLowerCase();
  const pathFilter = String(req.query.path || '').trim();
  const company = String(req.query.company || '').trim();
  const tokenHash = String(req.query.tokenHash || '').trim();
  const limit = Math.min(
    Math.max(1, OPEN_API_AUDIT_EXPORT_MAX || 5000),
    Math.max(1, Number(req.query.limit || 1000) || 1000),
  );

  const where = [];
  const params = { limit };
  if (from) {
    where.push('at >= @from');
    params.from = from;
  }
  if (to) {
    where.push('at <= @to');
    params.to = to;
  }
  if (pathFilter) {
    where.push('path = @path');
    params.path = pathFilter;
  }
  if (company) {
    where.push('company_query LIKE @company');
    params.company = `%${company}%`;
  }
  if (tokenHash) {
    where.push('token_hash = @token_hash');
    params.token_hash = tokenHash;
  }
  const sql = `
    SELECT id, at, token_hash, ip, method, path, company_query, time_from, time_to, focus, focus_mode,
           page, page_size, status_code, result_count, latency_ms, error, user_agent
    FROM open_api_audit_logs
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    ORDER BY at DESC
    LIMIT @limit
  `;
  const rows = db.prepare(sql).all(params);
  if (format === 'csv') {
    const headers = [
      'id', 'at', 'token_hash', 'ip', 'method', 'path', 'company_query', 'time_from', 'time_to',
      'focus', 'focus_mode', 'page', 'page_size', 'status_code', 'result_count', 'latency_ms', 'error', 'user_agent',
    ];
    const lines = [
      headers.join(','),
      ...rows.map((row) => headers.map((h) => toCsvValue(row[h])).join(',')),
    ];
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="open_api_audit_${Date.now()}.csv"`);
    return res.send(lines.join('\n'));
  }
  return res.json({
    ok: true,
    schemaVersion: OPEN_API_SCHEMA_VERSION,
    total: rows.length,
    items: rows,
  });
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
    return res.json({
      ok: true,
      deduped: true,
      id: existed.id,
      notify: { ok: false, skipped: true, reason: 'deduped_existing' },
    });
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
  const notifyPayload = buildNotifyPayloadFromRecord(payload);
  sendMeetingNotifyWithRetry(notifyPayload)
    .then((notifyResult) => {
      res.json({
        ok: true,
        id: input.id,
        notify: {
          ok: Boolean(notifyResult?.ok),
          skipped: Boolean(notifyResult?.skipped),
          reason: String(notifyResult?.reason || ''),
          provider: String(notifyResult?.provider || ''),
          messageId: String(notifyResult?.messageId || ''),
          attempt: Number(notifyResult?.attempt || 0),
        },
      });
    })
    .catch((error) => {
      res.json({
        ok: true,
        id: input.id,
        notify: {
          ok: false,
          skipped: false,
          reason: String(error?.message || error || 'notify_failed'),
          provider: '',
          messageId: '',
          attempt: 0,
        },
      });
    });
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
  console.log(`[meeting-api] industry refresh daily ${two(INDUSTRY_REFRESH_DAILY_HOUR)}:${two(INDUSTRY_REFRESH_DAILY_MINUTE)}`);
  console.log(`[meeting-api] notify: ${MAIL_NOTIFY_ENABLED ? `on (${MAIL_PROVIDER}) => ${NOTIFY_TO_EMAIL}` : 'off'}`);
  console.log(`[meeting-api] open-api: ${OPEN_API_KEY || API_KEY ? 'enabled' : 'disabled'} | rate ${Math.max(10, OPEN_API_RATE_LIMIT_PER_MIN || 120)}/min`);
  if (BACKUP_ON_START) {
    try {
      const meta = performBackup('startup');
      console.log(`[meeting-api] backup ok (${meta.reason}) => ${meta.file}`);
    } catch (error) {
      console.error('[meeting-api] startup backup failed:', error);
    }
  }
  if (INDUSTRY_REFRESH_ON_START) {
    try {
      const meta = performIndustryRefresh('startup');
      console.log(`[meeting-api] industry refresh ok (${meta.reason}) scanned=${meta.scanned} refreshed=${meta.refreshed}`);
    } catch (error) {
      console.error('[meeting-api] startup industry refresh failed:', error);
    }
  }
  scheduleDailyBackup();
  scheduleDailyIndustryRefresh();
});
