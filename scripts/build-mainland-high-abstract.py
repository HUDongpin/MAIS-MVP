#!/usr/bin/env python3
"""Build local-only abstraction artifacts for Mainland high-school math archives.

This script deliberately records metadata and coarse instructional signals only.
It never extracts or persists document body text, answer text, worked solutions,
images, tables, diagrams, or page content. Default outputs live under `.local/`,
which is ignored by the repository.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from tempfile import TemporaryDirectory
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo


DEFAULT_OUT_DIR = Path(".local/rag/mainland-high-abstract")
SAFETY_NOTE = (
    "Metadata-only local artifact. Do not commit source documents, document body "
    "text, original question stems, answer text, worked solutions, images, tables, "
    "or page content."
)

MODULE_MAP = {
    "必修一": ("compulsory", "必修 第一册 A版", "S4"),
    "必修二": ("compulsory", "必修 第二册 A版", "S4"),
    "选修1": ("selective-compulsory", "选择性必修 第一册 A版", "S5"),
    "选修2": ("selective-compulsory", "选择性必修 第二册 A版", "S5"),
    "选修3": ("selective-compulsory", "选择性必修 第三册 A版", "S6"),
}

TOPIC_HINTS = [
    ("集合", "sets", "集合与常用逻辑用语"),
    ("充分条件", "logic-conditions", "常用逻辑用语"),
    ("必要条件", "logic-conditions", "常用逻辑用语"),
    ("量词", "quantifiers", "常用逻辑用语"),
    ("不等式", "basic-inequality", "等式性质与不等式"),
    ("二次函数", "quadratic-functions", "一元二次函数、方程和不等式"),
    ("函数", "function-definition", "函数的概念与性质"),
    ("零点", "function-zero", "函数模型与零点"),
    ("指数", "exponential-functions", "指数函数与对数函数"),
    ("对数", "logarithmic-functions", "指数函数与对数函数"),
    ("三角", "trigonometric-functions", "三角函数"),
    ("正弦", "sine-cosine-theorem", "解三角形"),
    ("余弦", "sine-cosine-theorem", "解三角形"),
    ("平面向量", "plane-vectors", "平面向量及其应用"),
    ("复数", "complex-numbers", "复数"),
    ("立体", "solid-geometry", "立体几何初步"),
    ("空间", "space-vectors", "空间向量与立体几何"),
    ("统计", "statistics", "统计与成对数据分析"),
    ("概率", "probability-foundations", "概率"),
    ("直线", "line-equations", "直线和圆的方程"),
    ("圆", "circle-equations", "直线和圆的方程"),
    ("圆锥", "conic-geometry", "圆锥曲线的方程"),
    ("数列", "sequences", "数列"),
    ("数学归纳法", "mathematical-induction", "数列与数学归纳法"),
    ("导数", "derivatives", "一元函数的导数及其应用"),
    ("计数", "counting-principles", "计数原理"),
    ("排列", "permutations-combinations", "计数原理"),
    ("组合", "permutations-combinations", "计数原理"),
    ("二项式", "binomial-theorem", "计数原理"),
    ("随机变量", "random-variables", "随机变量及其分布"),
    ("二项分布", "binomial-distribution", "随机变量及其分布"),
    ("超几何", "hypergeometric-distribution", "随机变量及其分布"),
    ("正态分布", "normal-distribution", "随机变量及其分布"),
    ("回归", "linear-regression", "成对数据的统计分析"),
    ("独立性", "independence-test", "成对数据的统计分析"),
]


def decode_zip_name(name: str) -> str:
    try:
        return name.encode("cp437").decode("gb18030")
    except UnicodeError:
        return name


def sha256_for_entry(archive: ZipFile, info: ZipInfo) -> str:
    digest = hashlib.sha256()
    with archive.open(info) as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def classify_module(name: str) -> dict[str, str]:
    for marker, (module, volume, grade) in MODULE_MAP.items():
        if marker in name:
            return {"module": module, "volume": volume, "suggestedGrade": grade}
    return {"module": "unknown", "volume": "unknown", "suggestedGrade": "unknown"}


def classify_document_kind(name: str) -> str:
    if "真题" in name:
        return "exam-compilation"
    if "拓展" in name:
        return "pattern-expansion"
    if any(term in name for term in ["测试卷", "检测卷", "章末检测", "期末测试"]):
        return "chapter-test"
    if any(term in name for term in ["讲义", "第"]):
        return "lecture"
    return "support"


def classify_audience(name: str) -> str:
    if "教师版" in name:
        return "teacher"
    if "学生版" in name:
        return "student"
    if "解析版" in name:
        return "solution-key"
    return "unspecified"


def topic_signals(name: str) -> tuple[str, list[str]]:
    concepts: list[str] = []
    chapter = "综合复习与跨章节建模"
    for marker, concept, inferred_chapter in TOPIC_HINTS:
        if marker in name and concept not in concepts:
            concepts.append(concept)
            chapter = inferred_chapter
    return chapter, concepts or ["mixed-review"]


def safe_title(name: str) -> str:
    basename = name.rsplit("/", 1)[-1]
    return re.sub(r"\.(docx?|DOCX?)$", "", basename).strip()


def manifest_entry(archive: ZipFile, info: ZipInfo) -> dict[str, object]:
    name = decode_zip_name(info.filename)
    module_info = classify_module(name)
    chapter, concepts = topic_signals(name)
    return {
        "name": name,
        "safeTitle": safe_title(name),
        "extension": Path(name).suffix.lower(),
        "sizeBytes": info.file_size,
        "compressedBytes": info.compress_size,
        "sha256": sha256_for_entry(archive, info),
        "documentKind": classify_document_kind(name),
        "audience": classify_audience(name),
        "chapterSignal": chapter,
        "conceptSignals": concepts,
        **module_info,
    }


def build_manifest(zip_path: Path) -> dict[str, object]:
    with ZipFile(zip_path) as archive:
        entries = [manifest_entry(archive, info) for info in archive.infolist() if not info.is_dir()]

    counts = {
        "extensions": Counter(str(entry["extension"]) for entry in entries),
        "modules": Counter(str(entry["volume"]) for entry in entries),
        "documentKinds": Counter(str(entry["documentKind"]) for entry in entries),
        "audiences": Counter(str(entry["audience"]) for entry in entries),
        "chapters": Counter(str(entry["chapterSignal"]) for entry in entries),
    }

    return {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "sourceArchive": str(zip_path),
        "safetyNote": SAFETY_NOTE,
        "totals": {
            "files": len(entries),
            "uncompressedBytes": sum(int(entry["sizeBytes"]) for entry in entries),
            "docFiles": sum(1 for entry in entries if entry["extension"] == ".doc"),
            "docxFiles": sum(1 for entry in entries if entry["extension"] == ".docx"),
        },
        "counts": {key: dict(sorted(value.items())) for key, value in counts.items()},
        "entries": entries,
    }


def draft_cards(manifest: dict[str, object]) -> list[dict[str, object]]:
    grouped: dict[tuple[str, str], list[dict[str, object]]] = defaultdict(list)
    for entry in manifest["entries"]:  # type: ignore[index]
        grouped[(str(entry["volume"]), str(entry["chapterSignal"]))].append(entry)

    cards = []
    for index, ((volume, chapter), entries) in enumerate(sorted(grouped.items()), start=1):
        concepts = sorted({concept for entry in entries for concept in entry["conceptSignals"]})
        kinds = sorted({str(entry["documentKind"]) for entry in entries})
        grades = sorted({str(entry["suggestedGrade"]) for entry in entries})
        cards.append({
            "draftId": f"mainland-high-abstract-{index:03d}",
            "curriculumTrack": "MAINLAND_PEP_HIGH",
            "volume": volume,
            "chapter": chapter,
            "suggestedGrades": grades,
            "conceptIds": concepts,
            "documentKinds": kinds,
            "sourceFileCount": len(entries),
            "safeSummaryDraft": (
                f"Use {chapter} only as structured Mainland high-school mathematics "
                "coverage and item-design guidance."
            ),
            "generationGuidanceDraft": [
                "Generate new MAIS-authored mathematical objects, values, contexts, diagrams, and explanations.",
                "Use source files only to calibrate coverage, difficulty, skill demand, and common misconception patterns.",
                "Do not quote, paraphrase, translate, reconstruct, or lightly modify any source stem, answer, solution, figure, table, or scoring wording.",
            ],
            "sourceDistanceStatus": "needs-review",
        })
    return cards


def qa_report(manifest: dict[str, object], cards: list[dict[str, object]]) -> str:
    totals = manifest["totals"]  # type: ignore[index]
    counts = manifest["counts"]  # type: ignore[index]
    return "\n".join([
        "# Mainland High-School Abstract RAG QA",
        "",
        f"- Generated at: {manifest['generatedAt']}",
        f"- Files inspected: {totals['files']}",
        f"- DOC files: {totals['docFiles']}",
        f"- DOCX files: {totals['docxFiles']}",
        f"- Safe draft cards: {len(cards)}",
        f"- Safety note: {SAFETY_NOTE}",
        "",
        "## Classification Counts",
        "",
        f"- Modules: {json.dumps(counts['modules'], ensure_ascii=False)}",
        f"- Document kinds: {json.dumps(counts['documentKinds'], ensure_ascii=False)}",
        f"- Audiences: {json.dumps(counts['audiences'], ensure_ascii=False)}",
        f"- Chapter signals: {json.dumps(counts['chapters'], ensure_ascii=False)}",
        "",
        "## Safety Gate",
        "",
        "- Passed: output artifacts contain file metadata, hashes, title-level classification, and safe abstraction drafts only.",
        "- Passed: no document body text, answer text, worked solution text, source tables, source figures, or page images are extracted or persisted.",
        "- Required before production use: S18 review of safe cards and any generated questions.",
        "",
    ]) + "\n"


def write_outputs(manifest: dict[str, object], cards: list[dict[str, object]], out_dir: Path) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (out_dir / "safe-card-drafts.json").write_text(json.dumps(cards, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (out_dir / "qa-report.md").write_text(qa_report(manifest, cards), encoding="utf-8")


def run_self_test() -> None:
    with TemporaryDirectory() as tmp:
        zip_path = Path(tmp) / "sample.zip"
        with ZipFile(zip_path, "w", ZIP_DEFLATED) as archive:
            for i in range(1, 194):
                module = ["必修一", "必修二", "选修1", "选修2", "选修3"][i % 5]
                suffix = "docx" if i <= 151 else "doc"
                name = f"高中数学/高中数学讲义（{module}）/第{i:02d}讲 导数与函数模型（教师版）.{suffix}"
                archive.writestr(name, b"placeholder")
        manifest = build_manifest(zip_path)
        cards = draft_cards(manifest)
        assert manifest["totals"]["files"] == 193
        assert manifest["totals"]["docxFiles"] == 151
        assert manifest["totals"]["docFiles"] == 42
        assert cards
    print("Self-test passed: metadata-only abstraction handles 193 doc/docx entries.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Build local-only Mainland high-school safe abstraction artifacts.")
    parser.add_argument("zip_path", nargs="?", help="Path to the private high-school math archive zip.")
    parser.add_argument("--out-dir", default=str(DEFAULT_OUT_DIR), help="Output directory. Defaults to ignored .local/rag/.")
    parser.add_argument("--self-test", action="store_true", help="Run a metadata-only smoke test with a temporary archive.")
    args = parser.parse_args()

    if args.self_test:
        run_self_test()
        return

    if not args.zip_path:
        raise SystemExit("zip_path is required unless --self-test is used.")

    zip_path = Path(args.zip_path).expanduser().resolve()
    if not zip_path.exists():
        raise SystemExit(f"Archive not found: {zip_path}")

    manifest = build_manifest(zip_path)
    cards = draft_cards(manifest)
    write_outputs(manifest, cards, Path(args.out_dir).expanduser())
    print(f"Wrote {manifest['totals']['files']} metadata-only entries and {len(cards)} safe-card drafts to {args.out_dir}")


if __name__ == "__main__":
    main()
