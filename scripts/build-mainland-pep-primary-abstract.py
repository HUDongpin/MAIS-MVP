#!/usr/bin/env python3
"""Build safe abstraction draft cards for Mainland PEP primary math.

This script consumes the metadata-only manifest produced by
build-mainland-pep-primary-manifest.py when available. It never opens source
PDFs and never extracts or persists body text, OCR text, exercises, answers,
tables, illustrations, page images, or page-level descriptions.
"""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from tempfile import TemporaryDirectory


DEFAULT_OUT_DIR = Path(".local/rag/mainland-pep-primary")
DEFAULT_MANIFEST = DEFAULT_OUT_DIR / "manifest.json"
SAFETY_NOTE = (
    "Safe-card draft artifact only. Use source PDFs for local metadata and broad "
    "curriculum-structure calibration; do not copy, rewrite, translate, closely "
    "paraphrase, or approximate PEP source wording, worked examples, practice "
    "items, answers, tables, diagrams, activities, or visual layouts."
)
REUSE_GUARDS = [
    "Use this card only as abstract curriculum structure and pedagogy guidance for original MAIS work.",
    "Do not copy, rewrite, translate, closely paraphrase, or approximate PEP source wording, worked examples, practice items, answers, tables, diagrams, activity text, or visual layouts.",
    "Create fresh MAIS-authored numbers, contexts, representations, diagrams, explanations, and solution paths."
]

PRIMARY_BLUEPRINTS = [
    {
        "grade": "P1",
        "semester": "upper",
        "unitTitle": "20以内数感、加减启蒙、图形位置与整时",
        "conceptIds": ["p1-number-sense", "within-20-numbers", "early-addition-subtraction", "p1-shapes", "clock-whole-hour"],
        "competencyTags": ["数感", "符号意识", "空间观念", "数学表达"],
        "skillTags": ["认读20以内数", "比较大小", "组成与分解", "加减含义", "整时读法"],
        "misconceptionTags": ["counting order without quantity meaning", "left-right reversal", "hour hand and minute hand confused"]
    },
    {
        "grade": "P1",
        "semester": "lower",
        "unitTitle": "100以内数认识、20以内进退位与分类整理",
        "conceptIds": ["within-100-numbers", "within-20-regrouping-subtraction", "place-value-tens-ones", "classification"],
        "competencyTags": ["数感", "运算能力", "模型意识"],
        "skillTags": ["十位个位", "整十数", "20以内进位与退位", "简单应用表达"],
        "misconceptionTags": ["tens and ones reversed", "subtracting smaller digit from larger digit", "counting all when making ten would help"]
    },
    {
        "grade": "P2",
        "semester": "upper",
        "unitTitle": "表内乘法、长度单位与角的初步认识",
        "conceptIds": ["multiplication-meaning", "multiplication-facts", "arrays-equal-groups", "length-measurement"],
        "competencyTags": ["运算能力", "模型意识", "量感"],
        "skillTags": ["几个几", "阵列模型", "乘法口诀", "厘米米"],
        "misconceptionTags": ["treating unequal groups as multiplication facts", "factor order confusion", "unit omitted in measurement"]
    },
    {
        "grade": "P2",
        "semester": "lower",
        "unitTitle": "表内除法、混合运算、测量与数据整理",
        "conceptIds": ["division-meaning", "division-facts", "mixed-operations", "data-organization"],
        "competencyTags": ["运算能力", "量感", "数据意识"],
        "skillTags": ["平均分", "包含分", "乘除互逆", "简单统计表"],
        "misconceptionTags": ["sharing and grouping models conflated", "operation order guessed from story order", "chart count read from wrong category"]
    },
    {
        "grade": "P3",
        "semester": "upper",
        "unitTitle": "多位数运算、倍的认识、四边形与分数初步",
        "conceptIds": ["multidigit-addition-subtraction", "multiplication-division-extension", "fraction-introduction", "quadrilateral"],
        "competencyTags": ["运算能力", "数感", "几何直观"],
        "skillTags": ["估算", "竖式检查", "倍的意义", "几分之一", "几分之几"],
        "misconceptionTags": ["place value alignment error", "whole not identified before naming fraction", "times-as-many relationship reversed"]
    },
    {
        "grade": "P3",
        "semester": "lower",
        "unitTitle": "面积、小数初步、年月日与统计表达",
        "conceptIds": ["area-measurement", "perimeter-area", "decimal-introduction", "calendar-time", "data-reading"],
        "competencyTags": ["量感", "空间观念", "数据意识"],
        "skillTags": ["面积单位", "长方形正方形面积", "小数读写", "条形统计图"],
        "misconceptionTags": ["perimeter and area formula mixed", "unit square not understood", "decimal point read as separator only"]
    },
    {
        "grade": "P4",
        "semester": "upper",
        "unitTitle": "大数认识、角的度量、三位数乘法与平行垂直",
        "conceptIds": ["large-numbers", "place-value-large-numbers", "angle-measurement", "multidigit-multiplication", "parallel-perpendicular"],
        "competencyTags": ["数感", "空间观念", "运算能力"],
        "skillTags": ["亿以内数", "数位顺序", "近似数", "角的度量", "三位数乘两位数"],
        "misconceptionTags": ["zero omitted in large-number reading", "rounding place chosen incorrectly", "angle size judged by arm length"]
    },
    {
        "grade": "P4",
        "semester": "lower",
        "unitTitle": "四则运算、小数意义运算、三角形与平均数",
        "conceptIds": ["operation-order", "decimal-place-value", "decimal-operations", "triangle-properties", "average"],
        "competencyTags": ["数感", "运算能力", "数据意识", "空间观念"],
        "skillTags": ["四则混合运算", "小数大小比较", "小数加减", "单位换算", "平均数意义"],
        "misconceptionTags": ["more decimal digits assumed larger", "decimal alignment ignored", "average treated as most common value"]
    },
    {
        "grade": "P5",
        "semester": "upper",
        "unitTitle": "小数乘除、简易方程、多边形面积与可能性",
        "conceptIds": ["decimal-multiplication", "decimal-division", "simple-equations", "polygon-area", "probability-intuition"],
        "competencyTags": ["运算能力", "模型意识", "空间观念", "数据意识"],
        "skillTags": ["小数乘法", "小数除法", "用字母表示数", "等量关系", "多边形面积"],
        "misconceptionTags": ["decimal point placed by counting digits only", "equation balance not maintained", "height confused with side length"]
    },
    {
        "grade": "P5",
        "semester": "lower",
        "unitTitle": "因数倍数、分数意义运算、长方体正方体与折线统计",
        "conceptIds": ["factors-multiples", "fraction-meaning-operations", "least-common-multiple", "cuboid-cube-volume", "line-chart"],
        "competencyTags": ["数感", "运算能力", "空间观念", "数据意识"],
        "skillTags": ["质数合数", "约分通分", "分数加减", "体积单位", "长方体正方体体积"],
        "misconceptionTags": ["factor and multiple reversed", "common denominator chosen mechanically", "surface area and volume mixed"]
    },
    {
        "grade": "P6",
        "semester": "upper",
        "unitTitle": "分数乘除、百分数、位置与扇形统计",
        "conceptIds": ["fraction-multiplication-division", "percent", "ratio-introduction", "coordinate-position", "pie-chart"],
        "competencyTags": ["运算能力", "模型意识", "数据意识"],
        "skillTags": ["分数乘法", "分数除法", "百分数意义", "用数对表示位置", "扇形统计图"],
        "misconceptionTags": ["percent treated as a unitless whole number", "part-whole relationship not identified", "coordinate order reversed"]
    },
    {
        "grade": "P6",
        "semester": "lower",
        "unitTitle": "负数、比例、比例尺与小学总复习",
        "conceptIds": ["negative-numbers", "proportion", "direct-inverse-proportion", "scale", "primary-review"],
        "competencyTags": ["模型意识", "推理意识", "综合应用"],
        "skillTags": ["比和比例", "正比例反比例", "比例尺", "负数意义", "综合复习"],
        "misconceptionTags": ["ratio order reversed", "proportional relationship assumed from any two quantities", "scale numerator and denominator swapped"]
    }
]


def read_manifest(path: Path) -> dict[str, object] | None:
    if not path.exists():
        return None
    return json.loads(path.read_text(encoding="utf-8"))


def manifest_entries_for(manifest: dict[str, object] | None, grade: str, semester: str) -> list[dict[str, object]]:
    if not manifest:
        return []
    return [
        entry for entry in manifest.get("entries", [])  # type: ignore[union-attr]
        if isinstance(entry, dict) and entry.get("grade") == grade and entry.get("semester") == semester
    ]


def draft_cards(manifest: dict[str, object] | None) -> list[dict[str, object]]:
    cards = []
    for blueprint in PRIMARY_BLUEPRINTS:
        grade = str(blueprint["grade"])
        semester = str(blueprint["semester"])
        entries = manifest_entries_for(manifest, grade, semester)
        source_ids = [str(entry.get("id", "")) for entry in entries if entry.get("id")]
        cards.append({
            "draftId": f"pep-primary-{grade.lower()}-{semester}-safe-draft",
            "publisher": "MAINLAND_PEP",
            "stage": "primary",
            "grade": grade,
            "semester": semester,
            "unitTitle": blueprint["unitTitle"],
            "conceptIds": blueprint["conceptIds"],
            "competencyTags": blueprint["competencyTags"],
            "skillTags": blueprint["skillTags"],
            "misconceptionTags": blueprint["misconceptionTags"],
            "sourceManifestIds": source_ids,
            "sourceFileCount": len(entries),
            "safeSummaryDraft": (
                f"Use {grade} {semester} PEP primary mathematics only as abstract coverage, "
                "skill-demand, misconception, and teaching-language guidance for original MAIS support."
            ),
            "generationGuidanceDraft": [
                "Generate new MAIS-authored values, contexts, representations, diagrams, explanations, and solution paths.",
                "Use short Simplified Chinese classroom wording for low grades and gradually introduce formal terminology in upper grades.",
                "Do not quote, paraphrase, translate, reconstruct, or lightly modify any source stem, answer, solution, figure, table, activity, or layout."
            ],
            "prohibitedReuseNotes": REUSE_GUARDS,
            "sourceDistanceStatus": "needs-S18-review"
        })
    return cards


def qa_report(manifest: dict[str, object] | None, cards: list[dict[str, object]]) -> str:
    manifest_status = "found" if manifest else "missing"
    manifest_coverage = manifest.get("coverage", {}) if manifest else {}
    source_backed = sum(1 for card in cards if int(card["sourceFileCount"]) > 0)
    return "\n".join([
        "# Mainland PEP Primary Safe Card Draft QA",
        "",
        f"- Generated at: {datetime.now(timezone.utc).isoformat()}",
        f"- Manifest status: {manifest_status}",
        f"- Manifest coverage: {json.dumps(manifest_coverage, ensure_ascii=False)}",
        f"- Safe draft cards: {len(cards)}",
        f"- Draft cards linked to at least one manifest entry: {source_backed}",
        f"- Safety note: {SAFETY_NOTE}",
        "",
        "## Safety Gate",
        "",
        "- Passed: this script does not open source PDFs.",
        "- Passed: outputs contain abstract unit, concept, competency, skill, misconception, and generation-guidance fields only.",
        "- Passed: prohibited reuse notes are present on every draft card.",
        "- Required before production use: S18 manually samples the PDFs locally and approves the safe cards; future content generation must remain original.",
        "",
    ]) + "\n"


def write_outputs(cards: list[dict[str, object]], report: str, out_dir: Path) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "safe-card-drafts.json").write_text(json.dumps(cards, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (out_dir / "qa-report.md").write_text(report, encoding="utf-8")


def run_self_test() -> None:
    with TemporaryDirectory() as tmp:
        out_dir = Path(tmp)
        manifest = {
            "coverage": {"completeP1ToP6UpperLower": True},
            "entries": [
                {"id": f"sample-p{grade}-{semester}", "grade": f"P{grade}", "semester": semester}
                for grade in range(1, 7)
                for semester in ("upper", "lower")
            ]
        }
        cards = draft_cards(manifest)
        report = qa_report(manifest, cards)
        write_outputs(cards, report, out_dir)
        serialized = json.dumps(cards, ensure_ascii=False)
        assert len(cards) == 12
        assert all(card["publisher"] == "MAINLAND_PEP" for card in cards)
        assert all(card["sourceFileCount"] == 1 for card in cards)
        assert all(card["prohibitedReuseNotes"] for card in cards)
        assert "body text sample" not in serialized
        assert "/Type /Page" not in serialized
    print("Self-test passed: safe abstraction drafts cover P1-P6 upper/lower without PDF extraction.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Build safe abstraction draft cards for Mainland PEP primary math.")
    parser.add_argument("--manifest", default=str(DEFAULT_MANIFEST), help="Metadata-only manifest path. Defaults to ignored .local/rag/.")
    parser.add_argument("--out-dir", default=str(DEFAULT_OUT_DIR), help="Output directory. Defaults to ignored .local/rag/.")
    parser.add_argument("--self-test", action="store_true", help="Run a smoke test without reading any source PDFs.")
    args = parser.parse_args()

    if args.self_test:
        run_self_test()
        return

    manifest = read_manifest(Path(args.manifest).expanduser())
    cards = draft_cards(manifest)
    report = qa_report(manifest, cards)
    write_outputs(cards, report, Path(args.out_dir).expanduser())
    print(f"Wrote {len(cards)} safe-card drafts to {args.out_dir}")


if __name__ == "__main__":
    main()
