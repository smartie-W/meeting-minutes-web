#!/usr/bin/env python3
import argparse
import json
import re
import time
import urllib.parse
import urllib.request
from html.parser import HTMLParser
from pathlib import Path


class BingResultParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.results = []
        self._in_algo = False
        self._algo_depth = 0
        self._in_h2 = False
        self._in_p = False
        self._curr = None

    def handle_starttag(self, tag, attrs):
        attr = dict(attrs)
        cls = attr.get("class", "")
        if tag == "li" and "b_algo" in cls:
            self._in_algo = True
            self._algo_depth = 1
            self._curr = {"title": "", "url": "", "snippet": ""}
            return

        if not self._in_algo:
            return

        if tag == "li":
            self._algo_depth += 1
        if tag == "h2":
            self._in_h2 = True
        if tag == "p":
            self._in_p = True
        if tag == "a" and self._in_h2 and not self._curr["url"]:
            self._curr["url"] = attr.get("href", "")

    def handle_endtag(self, tag):
        if not self._in_algo:
            return

        if tag == "h2":
            self._in_h2 = False
        if tag == "p":
            self._in_p = False
        if tag == "li":
            self._algo_depth -= 1
            if self._algo_depth <= 0:
                self._in_algo = False
                if self._curr and (self._curr["title"] or self._curr["url"]):
                    self._curr["title"] = normalize_text(self._curr["title"])
                    self._curr["snippet"] = normalize_text(self._curr["snippet"])
                    self.results.append(self._curr)
                self._curr = None

    def handle_data(self, data):
        if not self._in_algo or not self._curr:
            return
        if self._in_h2:
            self._curr["title"] += data
        elif self._in_p:
            self._curr["snippet"] += data


def normalize_text(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "")).strip()


INDUSTRY_RULES = [
    (["机器人", "机械臂", "协作机器人", "自动驾驶", "智驾"], ("新兴重点产业", "机器人机械臂")),
    (["半导体", "芯片", "集成电路", "晶圆", "封测"], ("新兴重点产业", "半导体与芯片")),
    (["汽车", "汽配", "汽车电子"], ("汽车", "整车/零部件")),
    (["消费电子", "手机", "终端", "可穿戴"], ("消费电子", "智能终端")),
    (["智能制造", "工业自动化", "工控", "装备制造"], ("第二产业", "电子与高端制造")),
    (["银行", "证券", "基金", "保险", "融资租赁"], ("第三产业", "金融业")),
    (["建筑", "城建", "工程", "基建"], ("第二产业", "建筑业")),
    (["物流", "快递", "仓储", "供应链"], ("第三产业", "交通运输仓储和邮政业")),
    (["软件", "信息技术", "SaaS", "云计算", "数字化"], ("第三产业", "信息传输软件和信息技术服务业")),
    (["生物", "医疗", "医药"], ("第三产业", "卫生和社会工作")),
    (["餐饮", "食品", "饮料", "连锁"], ("第三产业", "住宿和餐饮业")),
]


def classify(name: str, results):
    text = " ".join(
        [name]
        + [r.get("title", "") for r in results]
        + [r.get("snippet", "") for r in results]
        + [r.get("url", "") for r in results]
    ).lower()

    for keys, label in INDUSTRY_RULES:
        hit = sum(1 for k in keys if k.lower() in text)
        if hit >= 2:
            return label, "high", f"keyword_hits={hit}"
        if hit == 1:
            return label, "medium", f"keyword_hits={hit}"
    return ("待人工确认", "待人工确认"), "low", "no_rule_hit"


def fetch_bing_results(company: str, timeout=15):
    q = urllib.parse.quote(f'"{company}" 官网 行业')
    url = f"https://www.bing.com/search?q={q}&setlang=zh-cn&mkt=zh-CN"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    html = urllib.request.urlopen(req, timeout=timeout).read().decode("utf-8", "ignore")
    parser = BingResultParser()
    parser.feed(html)
    cleaned = []
    for item in parser.results:
        if not item.get("url"):
            continue
        cleaned.append(
            {
                "title": item.get("title", "")[:200],
                "url": item.get("url", "")[:500],
                "snippet": item.get("snippet", "")[:400],
            },
        )
    return cleaned[:5]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", default="data/xlsx_customer_unknown_for_manual_review.txt")
    ap.add_argument("--batch-size", type=int, default=100)
    ap.add_argument("--offset", type=int, default=0)
    ap.add_argument("--sleep", type=float, default=0.35)
    ap.add_argument("--out-prefix", default="data/manual_online_review_batch")
    args = ap.parse_args()

    names = [x.strip() for x in Path(args.input).read_text(encoding="utf-8").splitlines() if x.strip()]
    batch = names[args.offset : args.offset + args.batch_size]
    reviewed = []

    for idx, name in enumerate(batch, start=1):
        try:
            results = fetch_bing_results(name)
            (l1, l2), confidence, reason = classify(name, results)
            reviewed.append(
                {
                    "name": name,
                    "industryLevel1": l1,
                    "industryLevel2": l2,
                    "confidence": confidence,
                    "reason": reason,
                    "sources": results,
                },
            )
        except Exception as e:
            reviewed.append(
                {
                    "name": name,
                    "industryLevel1": "待人工确认",
                    "industryLevel2": "待人工确认",
                    "confidence": "low",
                    "reason": f"fetch_error:{type(e).__name__}",
                    "sources": [],
                },
            )
        print(f"[{idx}/{len(batch)}] {name}")
        time.sleep(args.sleep)

    prefix = f"{args.out_prefix}_{args.offset}_{args.offset + len(batch)}"
    json_path = Path(f"{prefix}.json")
    md_path = Path(f"{prefix}.md")

    json_path.write_text(json.dumps(reviewed, ensure_ascii=False, indent=2), encoding="utf-8")

    lines = ["# Manual Online Review Batch", ""]
    lines.append(f"- offset: {args.offset}")
    lines.append(f"- batch_size: {len(batch)}")
    lines.append("")
    lines.append("| 企业名称 | 一级行业 | 二级行业 | 置信度 | 说明 |")
    lines.append("|---|---|---|---|---|")
    for item in reviewed:
        lines.append(
            f"| {item['name']} | {item['industryLevel1']} | {item['industryLevel2']} | {item['confidence']} | {item['reason']} |",
        )
    md_path.write_text("\n".join(lines), encoding="utf-8")

    high_count = sum(1 for x in reviewed if x["confidence"] == "high")
    med_count = sum(1 for x in reviewed if x["confidence"] == "medium")
    low_count = sum(1 for x in reviewed if x["confidence"] == "low")
    print(f"saved: {json_path}")
    print(f"saved: {md_path}")
    print(f"summary: high={high_count}, medium={med_count}, low={low_count}")


if __name__ == "__main__":
    main()
