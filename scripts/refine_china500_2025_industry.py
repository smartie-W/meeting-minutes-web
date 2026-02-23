#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
REVIEW_JSON = DATA_DIR / "china500_2025_industry_review.json"
REVIEW_MD = DATA_DIR / "china500_2025_industry_refine_round2.md"
OVERRIDES_JSON = DATA_DIR / "xlsx_customer_industry_overrides.json"
OVERRIDES_JS = DATA_DIR / "xlsx_customer_industry_overrides.js"


SEMICON_FOUNDRY = {
    "台积公司",
    "中芯国际集成电路制造有限公司",
}
SEMICON_DESIGN = {
    "联发科技股份有限公司",
}
SEMICON_OSAT = {
    "日月光投资控股股份有限公司",
}
SEMICON_EQUIPMENT = {
    "北方华创科技集团股份有限公司",
}
SEMI_ELECTRONICS_CHAIN = {
    "歌尔股份有限公司",
    "闻泰科技股份有限公司",
    "蓝思科技股份有限公司",
    "深圳传音控股股份有限公司",
    "鹏鼎控股(深圳)股份有限公司",
    "苏州东山精密制造股份有限公司",
    "广东领益智造股份有限公司",
    "华勤技术股份有限公司",
}

AUTO_OEM = {
    "比亚迪股份有限公司",
    "上海汽车集团股份有限公司",
    "浙江吉利控股集团有限公司",
    "中国第一汽车集团有限公司",
    "北京汽车集团有限公司",
    "奇瑞控股集团有限公司",
    "广州汽车工业集团有限公司",
    "东风汽车集团有限公司",
    "长城汽车股份有限公司",
    "赛力斯集团股份有限公司",
    "理想汽车",
    "蔚来集团",
    "小鹏汽车有限公司",
    "浙江零跑科技股份有限公司",
    "安徽江淮汽车集团股份有限公司",
    "江铃汽车股份有限公司",
    "中国重汽（香港）有限公司",
    "宇通客车股份有限公司",
}
AUTO_BATTERY = {
    "宁德时代新能源科技股份有限公司",
    "惠州亿纬锂能股份有限公司",
    "国轩高科股份有限公司",
    "中创新航科技集团股份有限公司",
    "欣旺达电子股份有限公司",
    "天能动力国际有限公司",
    "超威动力控股有限公司",
}
AUTO_PARTS_INTELLIGENT = {
    "宁波均胜电子股份有限公司",
    "惠州市德赛西威汽车电子股份有限公司",
    "宁波拓普集团股份有限公司",
    "宁波华翔电子股份有限公司",
    "福耀玻璃工业集团股份有限公司",
    "潍柴动力股份有限公司",
    "浙江三花智能控制股份有限公司",
}
AUTO_SALES_SERVICE = {
    "中升集团控股有限公司",
    "中国永达汽车服务控股有限公司",
}
AUTO_TIRES = {
    "赛轮集团股份有限公司",
    "双星集团有限责任公司",
}


def classify_round2(company: str, source_industry: str, level1: str, level2: str):
    name = (company or "").strip()
    src = (source_industry or "").strip()
    l1, l2 = level1, level2

    if "半导体、电子元件" in src:
        if name in SEMICON_FOUNDRY:
            return "新兴重点产业", "芯片制造"
        if name in SEMICON_EQUIPMENT:
            return "新兴重点产业", "半导体设备"
        if name in SEMICON_OSAT:
            return "新兴重点产业", "芯片封测"
        if name in SEMICON_DESIGN:
            return "新兴重点产业", "芯片设计"
        if name in SEMI_ELECTRONICS_CHAIN:
            return "消费电子", "智能终端"
        if any(k in name for k in ["科技", "电子", "控股", "股份"]):
            return "新兴重点产业", "芯片设计"
        return l1, l2

    if "车辆与零部件" in src:
        if name in AUTO_OEM:
            return "汽车", "整车"
        if name in AUTO_BATTERY:
            return "新能源", "动力电池"
        if name in AUTO_PARTS_INTELLIGENT:
            return "汽车", "智能零部件"
        if name in AUTO_SALES_SERVICE:
            return "汽车", "销售服务"
        if name in AUTO_TIRES:
            return "汽车", "轮胎与橡胶件"
        return "汽车", "零部件"

    return l1, l2


def main():
    if not REVIEW_JSON.exists():
        raise FileNotFoundError(REVIEW_JSON)
    if not OVERRIDES_JSON.exists():
        raise FileNotFoundError(OVERRIDES_JSON)

    review_data = json.loads(REVIEW_JSON.read_text(encoding="utf-8"))
    overrides = json.loads(OVERRIDES_JSON.read_text(encoding="utf-8"))

    changes = []
    for item in review_data:
        name = item["companyName"]
        old_l1 = item["industryLevel1"]
        old_l2 = item["industryLevel2"]
        new_l1, new_l2 = classify_round2(name, item.get("sourceIndustry", ""), old_l1, old_l2)

        item["industryLevel1"] = new_l1
        item["industryLevel2"] = new_l2
        overrides[name] = {"level1": new_l1, "level2": new_l2}

        if (old_l1, old_l2) != (new_l1, new_l2):
            changes.append(
                {
                    "rank": item["rank"],
                    "companyName": name,
                    "sourceIndustry": item.get("sourceIndustry", ""),
                    "oldLevel1": old_l1,
                    "oldLevel2": old_l2,
                    "newLevel1": new_l1,
                    "newLevel2": new_l2,
                }
            )

    REVIEW_JSON.write_text(json.dumps(review_data, ensure_ascii=False, indent=2), encoding="utf-8")
    OVERRIDES_JSON.write_text(json.dumps(overrides, ensure_ascii=False, indent=2), encoding="utf-8")
    OVERRIDES_JS.write_text(
        "window.XLSX_CUSTOMER_INDUSTRY_OVERRIDES = " + json.dumps(overrides, ensure_ascii=False) + ";\n",
        encoding="utf-8",
    )

    lines = []
    lines.append("# 2025中国500强行业映射二轮精细复核")
    lines.append("")
    lines.append(f"- 复核对象: {len(review_data)}")
    lines.append(f"- 精细化改动: {len(changes)}")
    lines.append("")
    lines.append("| 排名 | 企业名称 | 来源行业 | 原一级 | 原二级 | 新一级 | 新二级 |")
    lines.append("|---:|---|---|---|---|---|---|")
    for c in sorted(changes, key=lambda x: x["rank"]):
        lines.append(
            f"| {c['rank']} | {c['companyName']} | {c['sourceIndustry']} | {c['oldLevel1']} | {c['oldLevel2']} | {c['newLevel1']} | {c['newLevel2']} |"
        )
    REVIEW_MD.write_text("\n".join(lines), encoding="utf-8")

    print(f"TOTAL={len(review_data)}")
    print(f"CHANGED={len(changes)}")
    print(f"REPORT={REVIEW_MD}")


if __name__ == "__main__":
    main()

