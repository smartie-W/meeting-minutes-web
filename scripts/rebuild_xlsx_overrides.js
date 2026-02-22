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

const FALLBACK_HEURISTIC_RULES = [
  { keys: ["公安局", "人民法院", "税务局", "政府", "委员会"], level1: "第三产业", level2: "公共管理和社会组织" },
  { keys: ["大学", "学院", "研究院", "研究所", "实验室"], level1: "第三产业", level2: "科学研究和技术服务业" },
  { keys: ["银行", "证券", "基金", "保险", "融资租赁", "金融"], level1: "第三产业", level2: "金融业" },
  { keys: ["自动驾驶", "智驾", "小马智行", "文远知行", "momenta", "地平线"], level1: "新兴重点产业", level2: "自动驾驶" },
  { keys: ["机器人", "机械臂", "协作机器人", "自动化"], level1: "新兴重点产业", level2: "机器人机械臂" },
  { keys: ["半导体", "芯", "集成电路", "微电子", "晶圆"], level1: "新兴重点产业", level2: "半导体与芯片" },
  { keys: ["汽车", "汽配", "汽车电子"], level1: "汽车", level2: "整车/零部件" },
  { keys: ["城建", "建筑", "工程", "基建", "路桥", "市政"], level1: "第二产业", level2: "建筑业" },
  { keys: ["软件", "信息", "网络", "数字", "云", "互联网", "科技"], level1: "第三产业", level2: "信息传输软件和信息技术服务业" },
  { keys: ["电力", "电气", "能源", "光伏", "储能"], level1: "第二产业", level2: "电力热力燃气与水务" },
  { keys: ["医药", "医疗", "生物"], level1: "第三产业", level2: "卫生和社会工作" },
  { keys: ["物流", "供应链", "快递", "仓储"], level1: "第三产业", level2: "交通运输仓储和邮政业" },
  { keys: ["食品", "饮料", "茶", "餐饮", "乳业", "酒", "咖啡"], level1: "第三产业", level2: "住宿和餐饮业" },
  { keys: ["传媒", "文化", "影视", "娱乐", "演艺"], level1: "第三产业", level2: "文化体育和娱乐业" },
  { keys: ["咨询", "顾问", "征信", "企业管理"], level1: "第三产业", level2: "租赁和商务服务业" },
  { keys: ["制造", "机电", "精密", "仪器", "设备", "电子"], level1: "第二产业", level2: "电子与高端制造" },
];

function inferIndustryByFallback(name) {
  const text = String(name || "").trim();
  if (!text) return null;
  const lower = text.toLowerCase();
  for (const rule of FALLBACK_HEURISTIC_RULES) {
    if (rule.keys.some((k) => lower.includes(String(k).toLowerCase()))) {
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
  const industry = inferIndustry(name) || inferIndustryByFallback(name);
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
