#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json
import re
import urllib.request
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
RANKING_URL = "https://www.caifuzhongwen.com/fortune500/paiming/china500/2025_%E4%B8%AD%E5%9B%BD500%E5%BC%BA.htm"
OVERRIDES_JSON = DATA_DIR / "xlsx_customer_industry_overrides.json"
OVERRIDES_JS = DATA_DIR / "xlsx_customer_industry_overrides.js"
REVIEW_JSON = DATA_DIR / "china500_2025_industry_review.json"
REVIEW_MD = DATA_DIR / "china500_2025_industry_review.md"


MAPPING_RULES = [
    (["银行：商业储蓄"], ("金融", "银行")),
    (["人寿与健康保险", "财产与意外保险"], ("金融", "保险")),
    (["证券"], ("金融", "证券")),
    (["多元化金融"], ("金融", "基金资管")),
    (["电信"], ("ICT", "运营商/通信")),
    (["互联网服务和零售"], ("零售", "电商/零售")),
    (["信息技术服务"], ("软件服务", "企业软件/SaaS")),
    (["网络、通讯设备"], ("ICT", "通信技术服务")),
    (["半导体、电子元件"], ("新兴重点产业", "半导体与芯片")),
    (["电子、电气设备", "计算机、办公设备"], ("第二产业", "电子与高端制造")),
    (["工程与建筑"], ("第二产业", "建筑业")),
    (["建筑和农业机械", "工业机械"], ("制造", "工业制造")),
    (["车辆与零部件", "汽车零售和服务"], ("汽车", "整车/零部件")),
    (["运输及物流"], ("物流", "供应链/仓储")),
    (["邮件、包裹及货物包装运输"], ("物流", "快递物流")),
    (["铁路运输", "航空", "船务"], ("交通运输", "交通基础设施")),
    (["公用设施", "能源"], ("能源", "电力")),
    (["炼油"], ("能源", "油气化工")),
    (["采矿、原油生产"], ("第二产业", "采矿业")),
    (["金属产品", "航天与防务"], ("第二产业", "金属与装备制造")),
    (["化学品", "建材、玻璃"], ("第二产业", "化工与材料制造")),
    (["食品生产", "饮料", "食品：消费产品"], ("消费品", "食品饮料")),
    (["食品：饮食服务业"], ("第三产业", "住宿和餐饮业")),
    (["服装", "纺织"], ("消费品", "服装纺织")),
    (["专业零售"], ("零售", "连锁零售")),
    (["批发：食品", "批发：电子、办公设备", "贸易", "综合商业"], ("批发零售", "贸易")),
    (["批发：保健", "医疗器材和设备"], ("医疗健康", "医疗服务/器械")),
    (["制药"], ("医疗健康", "生物医药")),
    (["房地产"], ("房地产", "房地产开发")),
    (["广告及市场营销", "设备租赁", "多元化外包服务"], ("第三产业", "租赁和商务服务业")),
    (["酒店、赌场、度假村"], ("服务业", "文旅酒店")),
    (["林产品与纸制品"], ("第二产业", "食品与轻工制造")),
]


def fetch_html(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read().decode("utf-8", "ignore")


def normalize_text(value: str) -> str:
    return re.sub(r"\s+", " ", (value or "")).strip()


def parse_rows(html: str):
    pattern = re.compile(
        r"<tr><td><span class=\"hide\" cid=\"(?P<cid>\d+)\">(?P<hidden>.*?)</span><i class=\"rank\">(?P<rank>\d+)</i></td>"
        r"<td><a href='(?P<link>[^']+)'>"
        r"(?P<name>[^<]+)</a></td><td align=\"right\">(?P<revenue>[^<]+)</td>",
        re.S,
    )
    rows = []
    for m in pattern.finditer(html):
        hidden = normalize_text(re.sub(r"<[^>]+>", "", m.group("hidden")))
        name = normalize_text(m.group("name"))
        rank = int(m.group("rank"))
        revenue = normalize_text(m.group("revenue"))

        # hidden text format sample: "-ý行业中文公司名ENGLISH_NAME"
        hidden_clean = hidden.replace("-ý", "").strip()
        industry = "未知"
        if hidden_clean:
            idx = hidden_clean.find(name)
            if idx > 0:
                industry = hidden_clean[:idx].strip()
            else:
                # fallback: remove trailing latin text
                industry = re.sub(r"[A-Za-z].*$", "", hidden_clean).strip() or "未知"

        rows.append(
            {
                "rank": rank,
                "companyName": name,
                "sourceIndustry": industry,
                "revenue": revenue,
                "sourceLink": m.group("link"),
            }
        )
    rows.sort(key=lambda x: x["rank"])
    return rows


def map_industry(src_industry: str):
    text = src_industry.strip()
    for keys, target in MAPPING_RULES:
        if any(k in text for k in keys):
            return target
    return ("未知", "未知")


def main():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    html = fetch_html(RANKING_URL)
    rows = parse_rows(html)
    if len(rows) < 480:
        raise RuntimeError(f"Parsed rows too few: {len(rows)}")

    mapped = []
    unknown = []
    for row in rows:
        level1, level2 = map_industry(row["sourceIndustry"])
        item = {
            **row,
            "industryLevel1": level1,
            "industryLevel2": level2,
        }
        mapped.append(item)
        if level1 == "未知" and level2 == "未知":
            unknown.append(item)

    # Merge into overrides
    existing = {}
    if OVERRIDES_JSON.exists():
        existing = json.loads(OVERRIDES_JSON.read_text(encoding="utf-8"))
    for item in mapped:
        existing[item["companyName"]] = {
            "level1": item["industryLevel1"],
            "level2": item["industryLevel2"],
        }

    OVERRIDES_JSON.write_text(json.dumps(existing, ensure_ascii=False, indent=2), encoding="utf-8")
    OVERRIDES_JS.write_text(
        "window.XLSX_CUSTOMER_INDUSTRY_OVERRIDES = "
        + json.dumps(existing, ensure_ascii=False)
        + ";\n",
        encoding="utf-8",
    )

    REVIEW_JSON.write_text(json.dumps(mapped, ensure_ascii=False, indent=2), encoding="utf-8")

    lines = []
    lines.append("# 2025中国500强行业映射复核")
    lines.append("")
    lines.append(f"- 来源: {RANKING_URL}")
    lines.append(f"- 抓取公司数: {len(mapped)}")
    lines.append(f"- 未映射数: {len(unknown)}")
    lines.append("")
    lines.append("| 排名 | 企业名称 | 来源行业 | 一级行业 | 二级行业 |")
    lines.append("|---:|---|---|---|---|")
    for item in mapped:
        lines.append(
            f"| {item['rank']} | {item['companyName']} | {item['sourceIndustry']} | {item['industryLevel1']} | {item['industryLevel2']} |"
        )
    if unknown:
        lines.append("")
        lines.append("## 未映射来源行业")
        for item in unknown[:60]:
            lines.append(f"- {item['rank']}. {item['companyName']}：{item['sourceIndustry']}")
    REVIEW_MD.write_text("\n".join(lines), encoding="utf-8")

    print(f"ROWS={len(mapped)}")
    print(f"UNKNOWN={len(unknown)}")
    print(f"UPDATED_OVERRIDES={len(existing)}")
    print(f"JSON={REVIEW_JSON}")
    print(f"MD={REVIEW_MD}")


if __name__ == "__main__":
    main()

