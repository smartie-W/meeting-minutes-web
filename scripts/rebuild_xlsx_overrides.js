#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const appJsPath = path.join(ROOT, "app.js");
const namesPath = path.join(ROOT, "customer_names_from_two_xlsx.txt");
const jsonOut = path.join(ROOT, "data", "xlsx_customer_industry_overrides.json");
const jsOut = path.join(ROOT, "data", "xlsx_customer_industry_overrides.js");
const unknownOut = path.join(ROOT, "data", "xlsx_customer_unknown_for_manual_review.txt");

const appSource = fs.readFileSync(appJsPath, "utf8");

function readConst(name) {
  const re = new RegExp(`const\\s+${name}\\s*=\\s*([\\s\\S]*?);\\n`);
  const match = appSource.match(re);
  if (!match) throw new Error(`Missing constant: ${name}`);
  return eval(`(${match[1]})`);
}

const CUSTOMER_INDUSTRY_MAP = readConst("CUSTOMER_INDUSTRY_MAP");
const COMPANY_ALIAS_FULLNAME_MAP = readConst("COMPANY_ALIAS_FULLNAME_MAP");
const INDUSTRY_KEYWORD_RULES = readConst("INDUSTRY_KEYWORD_RULES");
const INDUSTRY_CLASSIFICATION_RULES = readConst("INDUSTRY_CLASSIFICATION_RULES");
const INDUSTRY_BRAND_RULES = readConst("INDUSTRY_BRAND_RULES");

const INVALID_CUSTOMER_NAMES = new Set([
  "A类",
  "B类",
  "C类",
  "D类",
  "S类",
  "作废",
  "导入期",
  "成长期",
  "运营期",
  "续约期",
  "流失",
  "公有云版",
  "私有部署按年订阅版",
  "私有部署一次性授权版",
  "客户数据",
  "hidden0",
]);

function normalizeCompanyName(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[()（）·\-\s]/g, "")
    .replaceAll("股份有限公司", "")
    .replaceAll("有限责任公司", "")
    .replaceAll("集团股份有限公司", "")
    .replaceAll("集团有限公司", "")
    .replaceAll("有限公司", "")
    .replaceAll("集团", "");
}

function isLikelyCompanyName(name) {
  const text = String(name || "").trim();
  if (!text || INVALID_CUSTOMER_NAMES.has(text)) return false;
  if (/^[0-9\-_/\s]+$/.test(text)) return false;
  return text.length > 1;
}

function inferIndustry(name) {
  const text = String(name || "").trim();
  if (!text) return null;

  if (CUSTOMER_INDUSTRY_MAP[text]) return CUSTOMER_INDUSTRY_MAP[text];

  const alias = COMPANY_ALIAS_FULLNAME_MAP[text] || COMPANY_ALIAS_FULLNAME_MAP[text.toLowerCase()];
  if (alias && CUSTOMER_INDUSTRY_MAP[alias]) return CUSTOMER_INDUSTRY_MAP[alias];

  const normalized = normalizeCompanyName(text);
  for (const [key, value] of Object.entries(CUSTOMER_INDUSTRY_MAP)) {
    const keyNorm = normalizeCompanyName(key);
    if (!keyNorm) continue;
    if (normalized.includes(keyNorm) || keyNorm.includes(normalized)) return value;
  }

  const lower = text.toLowerCase();
  for (const rule of INDUSTRY_CLASSIFICATION_RULES) {
    if ((rule.keys || []).some((k) => lower.includes(String(k).toLowerCase()))) {
      return { level1: rule.level1, level2: rule.level2 };
    }
  }

  for (const rule of INDUSTRY_BRAND_RULES) {
    if ((rule.keys || []).some((k) => normalized.includes(normalizeCompanyName(k)))) {
      return { level1: rule.level1, level2: rule.level2 };
    }
  }

  for (const rule of INDUSTRY_KEYWORD_RULES) {
    if ((rule.keys || []).some((k) => text.includes(String(k)))) {
      return { level1: rule.level1, level2: rule.level2 };
    }
  }

  return null;
}

const names = fs
  .readFileSync(namesPath, "utf8")
  .split(/\n+/)
  .map((x) => x.trim())
  .filter(Boolean)
  .filter(isLikelyCompanyName);

const overrides = {};
const unknown = [];

for (const name of names) {
  const industry = inferIndustry(name);
  if (!industry) {
    unknown.push(name);
    continue;
  }
  overrides[name] = {
    level1: String(industry.level1 || "未知"),
    level2: String(industry.level2 || "未知"),
  };
}

fs.mkdirSync(path.join(ROOT, "data"), { recursive: true });
fs.writeFileSync(jsonOut, JSON.stringify(overrides, null, 2), "utf8");
fs.writeFileSync(jsOut, `window.XLSX_CUSTOMER_INDUSTRY_OVERRIDES = ${JSON.stringify(overrides)};\n`, "utf8");
fs.writeFileSync(unknownOut, unknown.join("\n"), "utf8");

console.log(`TOTAL_NAMES=${names.length}`);
console.log(`OVERRIDES=${Object.keys(overrides).length}`);
console.log(`UNKNOWN=${unknown.length}`);
