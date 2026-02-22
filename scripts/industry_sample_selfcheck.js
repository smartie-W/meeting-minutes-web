#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const appJsPath = path.join(__dirname, "..", "app.js");
const source = fs.readFileSync(appJsPath, "utf8");

function readConstObject(name) {
  const pattern = new RegExp(`const\\s+${name}\\s*=\\s*([\\s\\S]*?);\\n`);
  const match = source.match(pattern);
  if (!match) {
    throw new Error(`Cannot find constant: ${name}`);
  }
  return eval(`(${match[1]})`);
}

const customerIndustryMap = readConstObject("CUSTOMER_INDUSTRY_MAP");
const aliasMap = readConstObject("COMPANY_ALIAS_FULLNAME_MAP");

const SAMPLE_CASES = [
  { industry: "消费电子", input: "荣耀", expected: "消费电子/智能终端" },
  { industry: "消费电子", input: "星纪魅族", expected: "消费电子/智能终端" },
  { industry: "消费电子", input: "魅族", expected: "消费电子/智能终端" },
  { industry: "消费电子", input: "小米", expected: "消费电子/智能终端" },
  { industry: "消费电子", input: "OPPO", expected: "消费电子/智能终端" },
  { industry: "消费电子", input: "vivo", expected: "消费电子/智能终端" },
  { industry: "医疗健康", input: "华大基因", expected: "医疗健康/基因科技/测序" },
  { industry: "医疗健康", input: "深圳华大基因股份有限公司", expected: "医疗健康/基因科技/测序" },
  { industry: "医疗健康", input: "华大智造", expected: "医疗健康/基因科技/测序" },

  { industry: "智能制造", input: "汇川技术", expected: "第二产业/电子与高端制造" },
  { industry: "智能制造", input: "埃斯顿", expected: "第二产业/电子与高端制造" },
  { industry: "智能制造", input: "拓斯达", expected: "第二产业/电子与高端制造" },

  { industry: "芯片", input: "中芯国际", expected: "新兴重点产业/半导体与芯片" },
  { industry: "芯片", input: "北方华创", expected: "新兴重点产业/半导体与芯片" },
  { industry: "芯片", input: "中微公司", expected: "新兴重点产业/半导体与芯片" },
  { industry: "芯片", input: "拓荆科技", expected: "新兴重点产业/半导体与芯片" },
  { industry: "芯片", input: "华海清科", expected: "新兴重点产业/半导体与芯片" },
  { industry: "芯片", input: "华润微", expected: "新兴重点产业/半导体与芯片" },
  { industry: "芯片", input: "士兰微", expected: "新兴重点产业/半导体与芯片" },
  { industry: "芯片", input: "长电科技", expected: "新兴重点产业/半导体与芯片" },
  { industry: "芯片", input: "通富微电", expected: "新兴重点产业/半导体与芯片" },
  { industry: "芯片", input: "华天科技", expected: "新兴重点产业/半导体与芯片" },
  { industry: "芯片设计", input: "德明利", expected: "新兴重点产业/芯片设计" },
  { industry: "芯片设计", input: "小华半导体", expected: "新兴重点产业/芯片设计" },
  { industry: "芯片设计", input: "科道芯国", expected: "新兴重点产业/芯片设计" },
  { industry: "芯片设计", input: "芯与物", expected: "新兴重点产业/芯片设计" },
  { industry: "芯片制造", input: "晶合集成", expected: "新兴重点产业/芯片制造" },
  { industry: "半导体设备", input: "高测科技", expected: "新兴重点产业/半导体设备" },
  { industry: "半导体设备", input: "精积微", expected: "新兴重点产业/半导体设备" },
  { industry: "半导体设备", input: "中科晶源微", expected: "新兴重点产业/半导体设备" },
  { industry: "EDA", input: "华大九天", expected: "电子信息/半导体EDA" },
  { industry: "EDA", input: "景立科技", expected: "电子信息/半导体EDA" },
  { industry: "EDA", input: "华芯软件", expected: "电子信息/半导体EDA" },
  { industry: "EDA", input: "芯华章", expected: "电子信息/半导体EDA" },
  { industry: "EDA", input: "芯愿景", expected: "电子信息/半导体EDA" },
  { industry: "芯片", input: "华虹", expected: "新兴重点产业/半导体与芯片" },
  { industry: "芯片", input: "韦尔股份", expected: "新兴重点产业/半导体与芯片" },
  { industry: "芯片", input: "兆易创新", expected: "新兴重点产业/半导体与芯片" },
  { industry: "芯片", input: "寒武纪", expected: "新兴重点产业/半导体与芯片" },

  { industry: "汽车供应链", input: "宁德时代", expected: "新能源/动力电池" },
  { industry: "汽车供应链", input: "均胜电子", expected: "汽车/整车/零部件" },
  { industry: "汽车供应链", input: "德赛西威", expected: "汽车/整车/零部件" },
  { industry: "汽车供应链", input: "伯特利", expected: "汽车/整车/零部件" },

  { industry: "自动驾驶", input: "地平线", expected: "新兴重点产业/自动驾驶" },
  { industry: "自动驾驶", input: "小马智行", expected: "新兴重点产业/自动驾驶" },
  { industry: "自动驾驶", input: "文远知行", expected: "新兴重点产业/自动驾驶" },
  { industry: "自动驾驶", input: "Momenta", expected: "新兴重点产业/自动驾驶" },

  { industry: "机器人机械臂", input: "新松", expected: "新兴重点产业/机器人机械臂" },
  { industry: "机器人机械臂", input: "埃夫特", expected: "新兴重点产业/机器人机械臂" },
  { industry: "机器人机械臂", input: "节卡", expected: "新兴重点产业/机器人机械臂" },
  { industry: "机器人机械臂", input: "遨博", expected: "新兴重点产业/机器人机械臂" },
  { industry: "机器人机械臂", input: "大族机器人", expected: "新兴重点产业/机器人机械臂" },
  { industry: "机器人机械臂", input: "智元创新", expected: "新兴重点产业/机器人机械臂" },
  { industry: "机器人机械臂", input: "宇树科技", expected: "新兴重点产业/机器人机械臂" },
  { industry: "机器人机械臂", input: "宇树科技股份有限公司", expected: "新兴重点产业/机器人机械臂" },
  { industry: "机器人机械臂", input: "Unitree", expected: "新兴重点产业/机器人机械臂" },
  { industry: "机器人机械臂", input: "优必选", expected: "新兴重点产业/机器人机械臂" },
  { industry: "机器人机械臂", input: "越疆", expected: "新兴重点产业/机器人机械臂" },
  { industry: "机器人机械臂", input: "傅利叶智能", expected: "新兴重点产业/机器人机械臂" },
  { industry: "机器人机械臂", input: "云深处", expected: "新兴重点产业/机器人机械臂" },
  { industry: "机器人机械臂", input: "梅卡曼德", expected: "新兴重点产业/机器人机械臂" },
];

function resolveIndustry(name) {
  const fullName = aliasMap[name] || aliasMap[String(name).toLowerCase()] || name;
  const industry = customerIndustryMap[name] || customerIndustryMap[fullName];
  if (!industry) return "UNKNOWN";
  return `${industry.level1}/${industry.level2}`;
}

const failed = [];
SAMPLE_CASES.forEach((testCase) => {
  const actual = resolveIndustry(testCase.input);
  if (actual !== testCase.expected) {
    failed.push({ ...testCase, actual });
  }
});

const passed = SAMPLE_CASES.length - failed.length;
console.log(`Industry sample self-check: ${passed}/${SAMPLE_CASES.length} passed`);

if (failed.length) {
  console.log("\nFailed cases:");
  failed.forEach((item) => {
    console.log(
      `- [${item.industry}] ${item.input} expected=${item.expected} actual=${item.actual}`,
    );
  });
  process.exit(1);
}

process.exit(0);
