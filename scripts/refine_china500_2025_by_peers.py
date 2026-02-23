#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json
import re
import time
import urllib.parse
import urllib.request
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
REVIEW_JSON = DATA_DIR / "china500_2025_industry_review.json"
OVERRIDES_JSON = DATA_DIR / "xlsx_customer_industry_overrides.json"
OVERRIDES_JS = DATA_DIR / "xlsx_customer_industry_overrides.js"
PEER_CACHE_JSON = DATA_DIR / "china500_2025_company_peers.json"
REPORT_MD = DATA_DIR / "china500_2025_industry_refine_round3_peers.md"

COMPARE_API = "https://www.caifuzhongwen.com/500api/c_compare.do"
YEAR = "2025"


SEMICON_FAB = {"台积公司", "中芯国际集成电路制造有限公司", "华虹半导体有限公司", "晶合集成"}
SEMICON_EQUIP = {"北方华创科技集团股份有限公司", "中微公司", "拓荆科技", "芯源微", "华海清科"}
SEMICON_OSAT = {"日月光投资控股股份有限公司", "江苏长电科技股份有限公司", "通富微电", "华天科技"}
SEMICON_DESIGN = {"联发科技股份有限公司", "韦尔股份", "兆易创新", "寒武纪", "澜起科技", "瑞芯微"}

AUTO_OEM = {"比亚迪股份有限公司", "上海汽车集团股份有限公司", "浙江吉利控股集团有限公司", "中国第一汽车集团有限公司", "北京汽车集团有限公司", "奇瑞控股集团有限公司", "广州汽车工业集团有限公司", "东风汽车集团有限公司", "长城汽车股份有限公司", "赛力斯集团股份有限公司", "理想汽车", "蔚来集团", "小鹏汽车有限公司", "浙江零跑科技股份有限公司", "安徽江淮汽车集团股份有限公司", "江铃汽车股份有限公司", "中国重汽（香港）有限公司", "宇通客车股份有限公司"}
AUTO_BATTERY = {"宁德时代新能源科技股份有限公司", "惠州亿纬锂能股份有限公司", "国轩高科股份有限公司", "中创新航科技集团股份有限公司", "欣旺达电子股份有限公司", "天能动力国际有限公司", "超威动力控股有限公司"}
AUTO_PARTS = {"宁波均胜电子股份有限公司", "惠州市德赛西威汽车电子股份有限公司", "宁波拓普集团股份有限公司", "宁波华翔电子股份有限公司", "福耀玻璃工业集团股份有限公司", "潍柴动力股份有限公司", "浙江三花智能控制股份有限公司"}
AUTO_SALES = {"中升集团控股有限公司", "中国永达汽车服务控股有限公司"}


def post_compare(company_id: str):
    payload = urllib.parse.urlencode({"year": YEAR, "companys": company_id, "auto": "1"}).encode("utf-8")
    req = urllib.request.Request(
        COMPARE_API,
        data=payload,
        headers={"User-Agent": "Mozilla/5.0", "Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=4.5) as resp:
        raw = resp.read().decode("utf-8", "ignore")
    data = json.loads(raw)
    peers = [x.get("company", "").strip() for x in data.get("companys", []) if x.get("company")]
    return peers


def parse_company_id(source_link: str):
    m = re.search(r"/(\d+)\.htm", source_link or "")
    return m.group(1) if m else ""


def infer_by_peers(item, peers):
    name = item["companyName"]
    src = item.get("sourceIndustry", "")
    l1 = item.get("industryLevel1", "未知")
    l2 = item.get("industryLevel2", "未知")
    peer_set = set(peers or [])

    if "半导体、电子元件" in src or l1 == "新兴重点产业":
        if name in SEMICON_FAB or peer_set & SEMICON_FAB:
            return "新兴重点产业", "芯片制造", "peer_fab"
        if name in SEMICON_EQUIP or peer_set & SEMICON_EQUIP:
            return "新兴重点产业", "半导体设备", "peer_equipment"
        if name in SEMICON_OSAT or peer_set & SEMICON_OSAT:
            return "新兴重点产业", "芯片封测", "peer_osat"
        if name in SEMICON_DESIGN or peer_set & SEMICON_DESIGN:
            return "新兴重点产业", "芯片设计", "peer_design"

    if "车辆与零部件" in src or "汽车零售和服务" in src or l1 == "汽车" or (l1 == "新能源" and l2 == "动力电池"):
        if name in AUTO_SALES or peer_set & AUTO_SALES or "汽车零售和服务" in src:
            return "汽车", "销售服务", "peer_sales"
        if name in AUTO_BATTERY or peer_set & AUTO_BATTERY:
            return "新能源", "动力电池", "peer_battery"
        if name in AUTO_OEM or peer_set & AUTO_OEM:
            return "汽车", "整车", "peer_oem"
        if name in AUTO_PARTS or peer_set & AUTO_PARTS:
            return "汽车", "智能零部件", "peer_parts"
        return "汽车", "零部件", "peer_auto_default"

    return l1, l2, "keep"


def main():
    review = json.loads(REVIEW_JSON.read_text(encoding="utf-8"))
    overrides = json.loads(OVERRIDES_JSON.read_text(encoding="utf-8"))

    peer_cache = {}
    if PEER_CACHE_JSON.exists():
        peer_cache = json.loads(PEER_CACHE_JSON.read_text(encoding="utf-8"))

    api_hits = 0
    api_miss = 0
    changes = []

    total = len(review)
    for idx, item in enumerate(review, start=1):
        name = item["companyName"]
        cid = parse_company_id(item.get("sourceLink", ""))
        peers = peer_cache.get(cid, [])

        if cid and not peers:
            try:
                peers = post_compare(cid)
                peer_cache[cid] = peers
                api_hits += 1
            except Exception:
                api_miss += 1
                peers = []
            if api_hits % 20 == 0 and api_hits > 0:
                PEER_CACHE_JSON.write_text(json.dumps(peer_cache, ensure_ascii=False, indent=2), encoding="utf-8")
            time.sleep(0.04)

        old = (item.get("industryLevel1", "未知"), item.get("industryLevel2", "未知"))
        new_l1, new_l2, reason = infer_by_peers(item, peers)
        item["peerCompanies"] = peers[:8]
        item["peerReason"] = reason
        item["industryLevel1"] = new_l1
        item["industryLevel2"] = new_l2
        overrides[name] = {"level1": new_l1, "level2": new_l2}

        new = (new_l1, new_l2)
        if old != new:
            changes.append(
                {
                    "rank": item["rank"],
                    "companyName": name,
                    "sourceIndustry": item.get("sourceIndustry", ""),
                    "oldLevel1": old[0],
                    "oldLevel2": old[1],
                    "newLevel1": new_l1,
                    "newLevel2": new_l2,
                    "reason": reason,
                    "peerCompanies": peers[:5],
                }
            )

        if idx % 25 == 0 or idx == total:
            print(f"[{idx}/{total}] api_hits={api_hits} api_miss={api_miss} changed={len(changes)}")

    REVIEW_JSON.write_text(json.dumps(review, ensure_ascii=False, indent=2), encoding="utf-8")
    OVERRIDES_JSON.write_text(json.dumps(overrides, ensure_ascii=False, indent=2), encoding="utf-8")
    OVERRIDES_JS.write_text(
        "window.XLSX_CUSTOMER_INDUSTRY_OVERRIDES = " + json.dumps(overrides, ensure_ascii=False) + ";\n",
        encoding="utf-8",
    )
    PEER_CACHE_JSON.write_text(json.dumps(peer_cache, ensure_ascii=False, indent=2), encoding="utf-8")

    lines = []
    lines.append("# 2025中国500强行业映射三轮精细复核（关联企业）")
    lines.append("")
    lines.append(f"- 复核对象: {len(review)}")
    lines.append(f"- 关联企业API新增抓取: {api_hits}")
    lines.append(f"- 关联企业API失败: {api_miss}")
    lines.append(f"- 分类改动数: {len(changes)}")
    lines.append("")
    lines.append("| 排名 | 企业名称 | 来源行业 | 原一级 | 原二级 | 新一级 | 新二级 | 依据 | 关联企业样本 |")
    lines.append("|---:|---|---|---|---|---|---|---|---|")
    for c in sorted(changes, key=lambda x: x["rank"]):
        peers = "、".join(c["peerCompanies"]) if c["peerCompanies"] else "-"
        lines.append(
            f"| {c['rank']} | {c['companyName']} | {c['sourceIndustry']} | {c['oldLevel1']} | {c['oldLevel2']} | {c['newLevel1']} | {c['newLevel2']} | {c['reason']} | {peers} |"
        )
    REPORT_MD.write_text("\n".join(lines), encoding="utf-8")

    print(f"TOTAL={len(review)}")
    print(f"API_HITS={api_hits}")
    print(f"API_MISS={api_miss}")
    print(f"CHANGED={len(changes)}")
    print(f"REPORT={REPORT_MD}")


if __name__ == "__main__":
    main()
