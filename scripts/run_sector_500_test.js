#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const APP_JS = path.join(ROOT, 'app.js');
const OVERRIDES_JSON = path.join(ROOT, 'data', 'xlsx_customer_industry_overrides.json');
const EXTRA_NAMES_TXT = path.join(ROOT, 'customer_names_from_two_xlsx.txt');
const DATA_DIR = path.join(ROOT, 'data');
const OUT_JSON = path.join(DATA_DIR, 'sector_6x500_test_result.json');
const OUT_MD = path.join(DATA_DIR, 'sector_6x500_test_result.md');

const TARGETS = [
  { sector: '餐饮', desired: 500 },
  { sector: '零售', desired: 500 },
  { sector: '制造', desired: 500 },
  { sector: '汽车', desired: 500 },
  { sector: '金融', desired: 500 },
  { sector: '能源', desired: 500 },
];

const SECTOR_KEYWORDS = {
  餐饮: /(餐饮|饭店|酒店|宾馆|火锅|咖啡|茶饮|快餐|餐厅|酒楼|美食|烘焙|饮食|酒家|肯德基|麦当劳|海底捞|百胜|必胜客|汉堡|奶茶)/,
  零售: /(零售|商贸|百货|超市|便利店|电商|商城|购物|贸易|服饰|鞋服|珠宝|家居|母婴|日化|生鲜|连锁|国美|苏宁|京东|拼多多)/,
  制造: /(制造|机械|装备|工业|电子|材料|化工|玻璃|钢铁|冶金|电气|机电|工具|仪器|组件|压铸|铸造|半导体|芯片|电器|机床)/,
  汽车: /(汽车|汽配|车业|车联网|智驾|座舱|车载|轮胎|底盘|动力电池|整车|客车|重卡|电驱|电机|比亚迪|吉利|上汽|一汽|东风)/,
  金融: /(银行|证券|保险|基金|信托|金控|金融|融资租赁|资管|财险|人寿|期货|担保|支付)/,
  能源: /(能源|电力|电网|石油|天然气|煤|风电|光伏|燃气|水电|核电|热电|储能|电投|炼油|华能|华电|大唐)/,
};

function readConstObject(source, name) {
  const pattern = new RegExp(`const\\s+${name}\\s*=\\s*([\\s\\S]*?);\\n`);
  const match = source.match(pattern);
  if (!match) {
    throw new Error(`Cannot find constant: ${name}`);
  }
  return eval(`(${match[1]})`);
}

function normalizeIndustryPair(value) {
  const normalizeL1 = (level1Raw, level2Raw) => {
    const level1 = String(level1Raw || '未知').trim();
    const level2 = String(level2Raw || '未知').trim();

    if (level1 === '第二产业') {
      if (level2 === '建筑业') return '建筑基建';
      if (level2 === '电力热力燃气与水务') return '能源';
      if (level2 === '采矿业') return '采矿与资源';
      return '制造';
    }

    if (level1 === '第三产业') {
      if (level2 === '信息传输软件和信息技术服务业') return '软件服务';
      if (level2 === '金融业') return '金融';
      if (level2 === '批发和零售业') return '零售';
      if (level2 === '交通运输仓储和邮政业') return '物流';
      if (level2 === '住宿和餐饮业') return '消费服务';
      if (level2 === '房地产业') return '房地产';
      if (level2 === '租赁和商务服务业') return '企业服务';
      if (level2 === '科学研究和技术服务业') return '科研与技术服务';
      if (level2 === '教育') return '教育';
      if (level2 === '卫生和社会工作') return '医疗健康';
      if (level2 === '文化体育和娱乐业') return '文娱';
      if (level2 === '公共管理和社会组织') return '政务';
      return '服务业';
    }

    if (level1 === '新兴重点产业') {
      if (['半导体与芯片', '芯片设计', '芯片制造', '半导体设备', '新一代信息技术', '数字经济'].includes(level2)) {
        return '电子信息';
      }
      if (['自动驾驶', '新能源汽车'].includes(level2)) return '汽车';
      if (['机器人机械臂', '高端装备制造'].includes(level2)) return '制造';
      if (level2 === '新能源') return '新能源';
      if (level2 === '新材料') return '新材料';
      if (level2 === '节能环保') return '节能环保';
      if (level2 === '生物医药') return '医疗健康';
      if (level2 === '低空经济') return '低空经济';
      return '战略新兴';
    }

    return level1 || '未知';
  };

  if (value && typeof value === 'object') {
    const level2 = String(value.level2 || '未知');
    return {
      level1: normalizeL1(value.level1, level2),
      level2,
    };
  }
  return { level1: '未知', level2: '未知' };
}

function inferSectorByPair(pair) {
  const l1 = pair.level1;
  const l2 = pair.level2;
  if (l1 === '消费服务' && /(餐饮|酒店|住宿|餐厅|餐饮连锁|文旅酒店)/.test(l2)) return '餐饮';
  if (l1 === '零售' || l1 === '批发零售') return '零售';
  if (l1 === '制造' || l1 === '电子信息' || l1 === '建筑基建' || l1 === '采矿与资源') return '制造';
  if (l1 === '汽车') return '汽车';
  if (l1 === '金融') return '金融';
  if (l1 === '能源' || l1 === '新能源') return '能源';
  return null;
}

function isPlaceholderName(name) {
  return /样本企业\d+/.test(name);
}

function collectExtraNames() {
  const set = new Set();

  if (fs.existsSync(EXTRA_NAMES_TXT)) {
    const lines = fs.readFileSync(EXTRA_NAMES_TXT, 'utf8').split(/\r?\n/);
    lines.forEach((line) => {
      const text = line.trim();
      if (text && !isPlaceholderName(text)) set.add(text);
    });
  }

  fs.readdirSync(DATA_DIR).forEach((file) => {
    if (!file.endsWith('.json')) return;
    const fullPath = path.join(DATA_DIR, file);
    try {
      const raw = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
      const walk = (node) => {
        if (!node) return;
        if (Array.isArray(node)) {
          node.forEach(walk);
          return;
        }
        if (typeof node !== 'object') return;
        Object.entries(node).forEach(([k, v]) => {
          if (typeof v === 'string' && /name|company/i.test(k)) {
            const text = v.trim();
            if (text && !isPlaceholderName(text)) set.add(text);
          }
          walk(v);
        });
      };
      walk(raw);
    } catch {
      // ignore invalid json
    }
  });

  return [...set];
}

function resolveIndustry(name, aliasMap, mergedIndustryMap) {
  const fullName = aliasMap[name] || aliasMap[String(name).toLowerCase()] || name;
  const value = mergedIndustryMap[name] || mergedIndustryMap[fullName] || null;
  return normalizeIndustryPair(value);
}

function buildSamples() {
  const appSource = fs.readFileSync(APP_JS, 'utf8');
  const customerIndustryMap = readConstObject(appSource, 'CUSTOMER_INDUSTRY_MAP');
  const aliasMap = readConstObject(appSource, 'COMPANY_ALIAS_FULLNAME_MAP');
  const overrides = JSON.parse(fs.readFileSync(OVERRIDES_JSON, 'utf8'));

  const mergedIndustryMap = { ...customerIndustryMap, ...overrides };

  const allMappedNames = Object.keys(mergedIndustryMap).filter((n) => n && !isPlaceholderName(n));
  const extraNames = collectExtraNames();
  const allNames = [...new Set([...allMappedNames, ...extraNames])];

  const sectorPools = {};
  TARGETS.forEach((t) => {
    sectorPools[t.sector] = [];
  });

  const seenBySector = {};
  TARGETS.forEach((t) => {
    seenBySector[t.sector] = new Set();
  });

  allMappedNames.forEach((name) => {
    const pair = normalizeIndustryPair(mergedIndustryMap[name]);
    const sector = inferSectorByPair(pair);
    if (!sector) return;
    if (seenBySector[sector].has(name)) return;
    seenBySector[sector].add(name);
    sectorPools[sector].push({ name, expectedSector: sector, source: 'industry_map' });
  });

  for (const { sector, desired } of TARGETS) {
    const regex = SECTOR_KEYWORDS[sector];
    if (sectorPools[sector].length >= desired) continue;

    for (const name of allNames) {
      if (sectorPools[sector].length >= desired) break;
      if (!regex.test(name)) continue;
      if (seenBySector[sector].has(name)) continue;
      seenBySector[sector].add(name);
      sectorPools[sector].push({ name, expectedSector: sector, source: 'keyword_expand' });
    }
  }

  const testResult = [];

  for (const { sector, desired } of TARGETS) {
    const picked = sectorPools[sector].slice(0, desired);
    let passed = 0;
    const fails = [];

    picked.forEach((item) => {
      const pair = resolveIndustry(item.name, aliasMap, mergedIndustryMap);
      const actualSector = inferSectorByPair(pair) || '未知';
      const pass = actualSector === sector;
      if (pass) passed += 1;
      else {
        fails.push({
          name: item.name,
          expectedSector: sector,
          actualSector,
          actualIndustryLevel1: pair.level1,
          actualIndustryLevel2: pair.level2,
          source: item.source,
        });
      }
    });

    testResult.push({
      sector,
      desired,
      sampled: picked.length,
      passed,
      failed: picked.length - passed,
      passRate: picked.length ? Number(((passed / picked.length) * 100).toFixed(2)) : 0,
      sourceBreakdown: {
        industry_map: picked.filter((x) => x.source === 'industry_map').length,
        keyword_expand: picked.filter((x) => x.source === 'keyword_expand').length,
      },
      fails: fails.slice(0, 120),
      samples: picked,
    });
  }

  return { testResult, generatedAt: new Date().toISOString() };
}

function writeReport(result) {
  fs.writeFileSync(OUT_JSON, JSON.stringify(result, null, 2), 'utf8');

  const lines = [];
  lines.push('# 六行业 500 企业测试报告');
  lines.push('');
  lines.push(`- 生成时间: ${result.generatedAt}`);
  lines.push('');
  lines.push('| 行业 | 目标数 | 实测数 | 通过 | 失败 | 通过率 | map样本 | 扩展样本 |');
  lines.push('|---|---:|---:|---:|---:|---:|---:|---:|');
  result.testResult.forEach((r) => {
    lines.push(`| ${r.sector} | ${r.desired} | ${r.sampled} | ${r.passed} | ${r.failed} | ${r.passRate}% | ${r.sourceBreakdown.industry_map} | ${r.sourceBreakdown.keyword_expand} |`);
  });

  result.testResult.forEach((r) => {
    lines.push('');
    lines.push(`## ${r.sector} 失败样本（最多120条）`);
    if (!r.fails.length) {
      lines.push('- 无');
      return;
    }
    r.fails.slice(0, 120).forEach((f) => {
      lines.push(`- ${f.name} | 期望=${f.expectedSector} | 实际=${f.actualSector}(${f.actualIndustryLevel1}/${f.actualIndustryLevel2}) | 来源=${f.source}`);
    });
  });

  fs.writeFileSync(OUT_MD, lines.join('\n'), 'utf8');
}

function main() {
  const result = buildSamples();
  writeReport(result);
  result.testResult.forEach((r) => {
    console.log(`${r.sector}: sampled=${r.sampled} pass=${r.passed} fail=${r.failed} passRate=${r.passRate}%`);
  });
  console.log(`JSON=${OUT_JSON}`);
  console.log(`MD=${OUT_MD}`);
}

main();
