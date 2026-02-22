#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import argparse
import json
import re
import time
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path

NS = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"

COMPANY_NAME_RE = re.compile(
    r"([\u4e00-\u9fa5A-Za-z0-9()（）·\-]{2,}(?:股份有限公司|有限责任公司|集团有限公司|集团股份有限公司|有限公司|集团公司|集团|公司|Co\\.,?\\s*Ltd\\.?|Inc\\.?|Corporation|Limited))"
)

AUTO_KEYWORDS = [
    "汽车", "零部件", "车载", "座舱", "底盘", "转向", "制动", "热管理", "智能驾驶", "自动驾驶", "轮胎", "线束", "电驱", "动力总成"
]

KNOWN_ALIAS_FULLNAME = {
    "博世": "博世（中国）投资有限公司",
    "大陆": "大陆投资（中国）有限公司",
    "采埃孚": "采埃孚（中国）投资有限公司",
    "安波福": "安波福（中国）投资有限公司",
    "电装": "电装（中国）投资有限公司",
    "法雷奥": "法雷奥企业管理（上海）有限公司",
    "麦格纳": "麦格纳汽车技术（上海）有限公司",
    "日立安斯泰莫": "日立安斯泰莫汽车系统（中国）有限公司",
    "伟世通": "伟世通亚太（上海）有限公司",
    "哈曼": "哈曼（中国）投资有限公司",
    "高通": "高通无线通信技术（中国）有限公司",
    "恩智浦": "恩智浦半导体（中国）有限公司",
    "英飞凌": "英飞凌科技（中国）有限公司",
    "瑞萨": "瑞萨电子（中国）有限公司",
    "德赛西威": "惠州市德赛西威汽车电子股份有限公司",
    "经纬恒润": "北京经纬恒润科技股份有限公司",
    "小马智行": "小马智行科技有限公司",
    "文远知行": "文远知行科技有限公司",
    "地平线": "地平线机器人技术研发有限公司",
    "四维图新": "北京四维图新科技股份有限公司",
    "千方科技": "北京千方科技股份有限公司",
    "禾赛": "禾赛科技有限公司",
    "速腾聚创": "深圳市速腾聚创科技有限公司",
    "华域汽车": "华域汽车系统股份有限公司",
    "联创电子": "联创电子科技股份有限公司",
    "舜宇": "宁波舜宇光学科技（集团）有限公司",
    "欧菲光": "欧菲光集团股份有限公司",
    "保隆科技": "上海保隆汽车科技股份有限公司",
    "均胜电子": "宁波均胜电子股份有限公司",
    "万集科技": "北京万集科技股份有限公司",
    "移远通信": "上海移远通信技术股份有限公司",
    "广和通": "深圳市广和通无线股份有限公司",
    "华测导航": "上海华测导航技术股份有限公司",
    "北斗星通": "北京北斗星通导航技术股份有限公司",
    "华阳": "惠州市华阳集团股份有限公司",
    "东软": "东软集团股份有限公司",
    "亿咖通": "亿咖通（上海）技术有限公司",
    "科大讯飞": "科大讯飞股份有限公司",
    "中科创达": "中科创达软件股份有限公司",
    "京东方": "京东方科技集团股份有限公司",
    "天马": "天马微电子股份有限公司",
    "维信诺": "维信诺科技股份有限公司",
    "歌尔": "歌尔股份有限公司",
    "瑞声": "瑞声科技控股有限公司",
    "水晶光电": "浙江水晶光电科技股份有限公司",
    "联发科": "联发科技股份有限公司",
    "紫光展锐": "紫光展锐（上海）科技股份有限公司",
    "绿盟科技": "北京神州绿盟科技有限公司",
    "奇安信": "奇安信科技集团股份有限公司",
    "启明星辰": "启明星辰信息技术集团股份有限公司",
    "住友电工": "住友电工管理（上海）有限公司",
    "古河电工": "古河电工（上海）有限公司",
    "安费诺": "安费诺（中国）投资有限公司",
    "莫仕": "莫仕连接器（成都）有限公司",
    "立讯精密": "立讯精密工业股份有限公司",
    "中航光电": "中航光电科技股份有限公司",
    "得润电子": "深圳市得润电子股份有限公司",
    "沪光股份": "昆山沪光汽车电器股份有限公司",
    "天海电器": "天海汽车电子集团股份有限公司",
    "长盈精密": "深圳市长盈精密技术股份有限公司",
    "亨通光电": "江苏亨通光电股份有限公司",
    "中天科技": "江苏中天科技股份有限公司",
    "长飞光纤": "长飞光纤光缆股份有限公司",
    "航天电器": "贵州航天电器股份有限公司",
    "永贵电器": "浙江永贵电器股份有限公司",
    "瑞可达": "苏州瑞可达连接系统股份有限公司",
    "电连技术": "深圳市电连技术股份有限公司",
}


def parse_xlsx_aliases(path: Path):
    aliases = []
    with zipfile.ZipFile(path) as zf:
        wb = ET.fromstring(zf.read("xl/workbook.xml"))
        sheets = wb.find(f"{NS}sheets")
        first = next(iter(sheets))
        rid = first.attrib["{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"]
        rels = ET.fromstring(zf.read("xl/_rels/workbook.xml.rels"))
        relmap = {r.attrib["Id"]: r.attrib["Target"] for r in rels}
        target = relmap[rid].lstrip("/")
        if not target.startswith("xl/"):
            target = "xl/" + target

        sst = []
        if "xl/sharedStrings.xml" in zf.namelist():
            sroot = ET.fromstring(zf.read("xl/sharedStrings.xml"))
            for si in sroot.findall(f"{NS}si"):
                sst.append("".join((t.text or "") for t in si.findall(f".//{NS}t")))

        def col_idx(ref: str):
            col = "".join(ch for ch in ref if ch.isalpha())
            n = 0
            for ch in col:
                n = n * 26 + ord(ch) - 64
            return n

        def cell_text(c):
            t = c.attrib.get("t")
            if t == "inlineStr":
                return "".join((x.text or "") for x in c.findall(f".//{NS}t")).strip()
            v = c.find(f"{NS}v")
            if v is None:
                return "".join((x.text or "") for x in c.findall(f".//{NS}t")).strip()
            if t == "s":
                idx = int(v.text) if v.text else -1
                return (sst[idx] if 0 <= idx < len(sst) else "").strip()
            return (v.text or "").strip()

        root = ET.fromstring(zf.read(target))
        rows = root.findall(f".//{NS}row")
        for row in rows[1:]:
            values = {}
            for c in row.findall(f"{NS}c"):
                values[col_idx(c.attrib.get("r", "A1"))] = cell_text(c)
            alias = values.get(2, "").strip()
            if alias:
                aliases.append(alias)

    # unique keep order
    seen = set()
    out = []
    for x in aliases:
        if x in seen:
            continue
        seen.add(x)
        out.append(x)
    return out


def normalize_text(text: str):
    return re.sub(r"\\s+", " ", text or "").strip()


def fetch_bing(alias: str):
    q = urllib.parse.quote(f"{alias} 公司 全称 工商信息 汽车")
    url = f"https://www.bing.com/search?q={q}&setlang=zh-cn"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=15) as resp:
        html = resp.read().decode("utf-8", "ignore")

    blocks = re.findall(r"<li class=\"b_algo\"[\\s\\S]*?</li>", html)
    results = []
    for b in blocks[:8]:
        title = normalize_text(re.sub(r"<[^>]+>", " ", " ".join(re.findall(r"<h2[^>]*>([\\s\\S]*?)</h2>", b))))
        snippet = normalize_text(re.sub(r"<[^>]+>", " ", " ".join(re.findall(r"<p>([\\s\\S]*?)</p>", b))))
        link = ""
        mlink = re.search(r"<a href=\"([^\"]+)\"", b)
        if mlink:
            link = mlink.group(1)
        if title or snippet:
            results.append({"title": title, "snippet": snippet, "url": link})
    return results


def extract_company_names(results):
    names = []
    for r in results:
        text = f"{r.get('title','')} {r.get('snippet','')}"
        for m in COMPANY_NAME_RE.findall(text):
            n = normalize_text(m)
            if len(n) >= 4:
                names.append(n)
    uniq = []
    seen = set()
    for n in names:
        if n in seen:
            continue
        seen.add(n)
        uniq.append(n)
    return uniq


def pick_full_name(alias: str, candidates):
    if alias in KNOWN_ALIAS_FULLNAME:
        return KNOWN_ALIAS_FULLNAME[alias], "known_map"

    def score(name: str):
        s = 0
        if alias in name:
            s += 6
        if any(k in name for k in ["有限公司", "股份有限公司", "集团"]):
            s += 2
        if any(k in name for k in ["汽车", "零部件", "电子", "科技", "系统", "投资"]):
            s += 1
        s -= max(0, len(name) - 22) * 0.05
        return s

    if not candidates:
        return "", "no_candidate"

    ranked = sorted(candidates, key=score, reverse=True)
    best = ranked[0]
    why = "match_score"
    return best, why


def pick_local_full_name(alias: str, overrides_keys):
    if alias in KNOWN_ALIAS_FULLNAME:
        return KNOWN_ALIAS_FULLNAME[alias], "known_map"

    cands = []
    for n in overrides_keys:
        if not n:
            continue
        if alias in n and len(n) <= 40:
            cands.append(n)
    if not cands:
        return "", "no_local_candidate"

    def score(name: str):
        s = 0
        if alias in name:
            s += 6
        if any(k in name for k in ["股份有限公司", "有限责任公司", "有限公司", "集团"]):
            s += 3
        if any(k in name for k in ["汽车", "电子", "科技", "系统", "连接", "电器", "通信"]):
            s += 1
        s -= max(0, len(name) - 24) * 0.1
        return s

    cands.sort(key=score, reverse=True)
    return cands[0], "local_fuzzy"


def infer_industry(alias: str, full_name: str, results):
    text = " ".join([alias, full_name] + [f"{x.get('title','')} {x.get('snippet','')}" for x in results])
    if "自动驾驶" in text or "智驾" in text:
        return {"level1": "新兴重点产业", "level2": "自动驾驶"}
    if any(k in text for k in AUTO_KEYWORDS):
        return {"level1": "汽车", "level2": "整车/零部件"}
    return {"level1": "汽车", "level2": "整车/零部件"}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--xlsx", required=True)
    ap.add_argument("--sleep", type=float, default=0.2)
    args = ap.parse_args()

    xlsx = Path(args.xlsx)
    aliases = parse_xlsx_aliases(xlsx)

    overrides_path = Path("data/xlsx_customer_industry_overrides.json")
    overrides = json.loads(overrides_path.read_text(encoding="utf-8")) if overrides_path.exists() else {}
    overrides_keys = list(overrides.keys())

    review = []
    for i, alias in enumerate(aliases, 1):
        print(f"[{i}/{len(aliases)}] {alias}")
        local_name, local_reason = pick_local_full_name(alias, overrides_keys)
        if local_name:
            industry = infer_industry(alias, local_name, [])
            confidence = "high" if local_reason == "known_map" else "medium"
            review.append({
                "alias": alias,
                "fullName": local_name,
                "reason": local_reason,
                "confidence": confidence,
                "industry": industry,
                "candidates": [local_name],
                "sources": [],
            })
            continue
        try:
            results = fetch_bing(alias)
            candidates = extract_company_names(results)
            full_name, reason = pick_full_name(alias, candidates)
            industry = infer_industry(alias, full_name, results)
            confidence = "high" if reason == "known_map" else ("medium" if full_name else "low")
            review.append({
                "alias": alias,
                "fullName": full_name,
                "reason": reason,
                "confidence": confidence,
                "industry": industry,
                "candidates": candidates[:8],
                "sources": results[:5],
            })
        except Exception as e:
            review.append({
                "alias": alias,
                "fullName": "",
                "reason": f"error:{type(e).__name__}",
                "confidence": "low",
                "industry": {"level1": "汽车", "level2": "整车/零部件"},
                "candidates": [],
                "sources": [],
            })
        time.sleep(args.sleep)

    data_dir = Path("data")
    data_dir.mkdir(exist_ok=True)
    out_json = data_dir / "auto_supplychain_alias_review.json"
    out_md = data_dir / "auto_supplychain_alias_review.md"

    out_json.write_text(json.dumps(review, ensure_ascii=False, indent=2), encoding="utf-8")

    high = sum(1 for x in review if x["confidence"] == "high")
    med = sum(1 for x in review if x["confidence"] == "medium")
    low = sum(1 for x in review if x["confidence"] == "low")
    lines = [
        "# 汽车下游供应链简称复查",
        "",
        f"- 总数: {len(review)}",
        f"- high: {high}",
        f"- medium: {med}",
        f"- low: {low}",
        "",
        "| 简称 | 工商全名(候选) | 行业 | 置信度 | 说明 |",
        "|---|---|---|---|---|",
    ]
    for r in review:
        ind = f"{r['industry']['level1']}/{r['industry']['level2']}"
        lines.append(f"| {r['alias']} | {r['fullName'] or '-'} | {ind} | {r['confidence']} | {r['reason']} |")
    out_md.write_text("\n".join(lines) + "\n", encoding="utf-8")

    # apply into overrides (alias + full name)
    add = 0
    for r in review:
        ind = {"level1": r["industry"]["level1"], "level2": r["industry"]["level2"]}
        alias = r["alias"].strip()
        if alias and overrides.get(alias) != ind:
            overrides[alias] = ind
            add += 1
        fn = (r.get("fullName") or "").strip()
        if fn and overrides.get(fn) != ind:
            overrides[fn] = ind
            add += 1

    overrides_path.write_text(json.dumps(overrides, ensure_ascii=False, indent=2), encoding="utf-8")
    (data_dir / "xlsx_customer_industry_overrides.js").write_text(
        "window.XLSX_CUSTOMER_INDUSTRY_OVERRIDES = " + json.dumps(overrides, ensure_ascii=False) + ";\n",
        encoding="utf-8",
    )

    print(f"saved: {out_json}")
    print(f"saved: {out_md}")
    print(f"overrides_total: {len(overrides)} updates: {add}")

if __name__ == "__main__":
    main()
