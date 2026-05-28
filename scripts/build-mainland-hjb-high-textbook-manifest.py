#!/usr/bin/env python3
"""Build local-only metadata artifacts for Mainland HJB high-school textbooks.

The script records file metadata, hashes, page counts, volume labels, and safe
chapter-level draft signals only. It never extracts or writes PDF body text,
exercises, response keys, worked-response wording, page images, tables,
figures, page locators, or embedding payloads.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from tempfile import TemporaryDirectory


DEFAULT_OUT_DIR = Path(".local/rag/mainland-hjb-high")
SAFETY_NOTE = (
    "Metadata-only local artifact. Do not commit source PDFs, PDF body text, "
    "exercise wording, worked-response wording, response keys, page images, "
    "tables, figures, page locators, or embeddings."
)

VOLUME_SLOTS = {
    "compulsory-1": {
        "volume": "必修 第一册",
        "module": "compulsory",
        "suggestedGrades": ["S4"],
        "semesters": ["upper"],
        "markers": ["必修第一册", "必修 第一册"],
        "chapters": [
            ("集合与逻辑", ["sets", "logic-conditions"]),
            ("等式与不等式", ["inequality-properties", "quadratic-inequalities", "basic-inequality"]),
            ("幂、指数与对数", ["exponents", "logarithmic-operations"]),
            ("幂函数、指数函数与对数函数", ["power-functions", "exponential-functions", "logarithmic-functions"]),
            ("函数的概念、性质及应用", ["function-definition", "monotonicity", "function-zero"])
        ],
    },
    "compulsory-2": {
        "volume": "必修 第二册",
        "module": "compulsory",
        "suggestedGrades": ["S4"],
        "semesters": ["lower"],
        "markers": ["必修第二册", "必修 第二册"],
        "chapters": [
            ("三角", ["unit-circle", "trigonometric-identities", "sine-theorem", "cosine-theorem"]),
            ("三角函数", ["trigonometric-functions", "trigonometric-graphs"]),
            ("平面向量", ["plane-vectors", "dot-product"]),
            ("复数", ["complex-numbers", "complex-plane"])
        ],
    },
    "compulsory-3": {
        "volume": "必修 第三册",
        "module": "compulsory",
        "suggestedGrades": ["S5"],
        "semesters": ["upper"],
        "markers": ["必修第三册", "必修 第三册"],
        "chapters": [
            ("空间直线与平面", ["solid-geometry", "spatial-lines-planes"]),
            ("简单几何体", ["surface-volume", "solid-geometry"]),
            ("概率初步", ["probability-foundations", "random-events"]),
            ("统计", ["sampling", "data-distribution", "statistical-estimation"])
        ],
    },
    "selective-1": {
        "volume": "选择性必修 第一册",
        "module": "selective-compulsory",
        "suggestedGrades": ["S5"],
        "semesters": ["lower"],
        "markers": ["选择性必修第一册", "选择性必修 第一册", "选修第一册", "选修 第一册"],
        "chapters": [
            ("平面直角坐标系中的直线", ["analytic-geometry", "line-equations"]),
            ("圆锥曲线", ["circle-equations", "ellipse", "hyperbola", "parabola-conic"]),
            ("空间向量及其应用", ["space-vectors", "line-plane-angle", "distance-in-space"]),
            ("数列", ["sequences", "recurrence", "mathematical-induction"])
        ],
    },
    "selective-2": {
        "volume": "选择性必修 第二册",
        "module": "selective-compulsory",
        "suggestedGrades": ["S6"],
        "semesters": ["upper", "full-year"],
        "markers": ["选择性必修第二册", "选择性必修 第二册", "选修第二册", "选修 第二册"],
        "chapters": [
            ("导数及其运用", ["derivatives", "optimization"]),
            ("计数原理", ["counting-principles", "permutations-combinations", "binomial-theorem"]),
            ("概率初步续", ["conditional-probability", "random-variables", "normal-distribution"]),
            ("成对数据的统计分析", ["bivariate-data", "linear-regression", "independence-test"])
        ],
    },
}


def compact_name(value: str) -> str:
    return re.sub(r"[\s_【】\\[\\]（）()]+", "", value)


def sha256_for(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
      for chunk in iter(lambda: handle.read(1024 * 1024), b""):
          digest.update(chunk)
    return digest.hexdigest()


def fallback_page_count(path: Path) -> int:
    data = path.read_bytes()
    return len(re.findall(rb"/Type\s*/Page\b", data))


def pdf_page_count(path: Path) -> int:
    try:
        from pypdf import PdfReader  # type: ignore

        return len(PdfReader(str(path)).pages)
    except Exception:
        return fallback_page_count(path)


def infer_slot(path: Path) -> tuple[str, dict[str, object]]:
    normalized = compact_name(path.name)
    matches: list[tuple[int, str, dict[str, object]]] = []
    for slot_id, slot in VOLUME_SLOTS.items():
        for marker in slot["markers"]:  # type: ignore[index]
            compact_marker = compact_name(str(marker))
            if compact_marker in normalized:
                matches.append((len(compact_marker), slot_id, slot))
    if matches:
        _, slot_id, slot = sorted(matches, reverse=True)[0]
        return slot_id, slot
    return "unknown", {
        "volume": "unknown",
        "module": "unknown",
        "suggestedGrades": [],
        "semesters": [],
        "markers": [],
        "chapters": [],
    }


def source_entry(path: Path) -> dict[str, object]:
    slot_id, slot = infer_slot(path)
    digest = sha256_for(path)
    return {
        "sourceId": f"hjb-high-{slot_id}-{digest[:12]}",
        "fileName": path.name,
        "extension": path.suffix.lower(),
        "volume": slot["volume"],
        "module": slot["module"],
        "suggestedGrades": slot["suggestedGrades"],
        "semesters": slot["semesters"],
        "ownerProvided": True,
        "sha256": digest,
        "sizeBytes": path.stat().st_size,
        "pageCount": pdf_page_count(path),
        "storageStatus": "local-private-owner-provided; source PDF not copied into repo",
        "licenseStatus": "owner-provided local analysis only; no public redistribution assumed",
        "safeRetentionPolicy": "commit metadata, safe chapter abstractions, and QA reports only"
    }


def draft_cards(entries: list[dict[str, object]]) -> list[dict[str, object]]:
    cards: list[dict[str, object]] = []
    for entry in entries:
        slot_id, slot = infer_slot(Path(str(entry["fileName"])))
        for index, (chapter, concepts) in enumerate(slot["chapters"], start=1):  # type: ignore[index]
            cards.append({
                "draftId": f"hjb-high-{slot_id}-{index:02d}",
                "publisher": "MAINLAND_HJB",
                "curriculumTrack": "MAINLAND_PEP_HIGH",
                "volume": entry["volume"],
                "chapter": chapter,
                "suggestedGrades": entry["suggestedGrades"],
                "semesters": entry["semesters"],
                "conceptSignals": concepts,
                "sourceId": entry["sourceId"],
                "safeSummaryDraft": "Use this chapter only as Shanghai Education Press sequencing and concept-coverage guidance.",
                "sourceDistanceStatus": "needs-S18-review"
            })
    return cards


def build_manifest(paths: list[Path]) -> dict[str, object]:
    entries = [source_entry(path) for path in paths]
    return {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "safetyNote": SAFETY_NOTE,
        "totals": {
            "files": len(entries),
            "pdfFiles": sum(1 for entry in entries if entry["extension"] == ".pdf"),
            "pages": sum(int(entry["pageCount"]) for entry in entries),
            "bytes": sum(int(entry["sizeBytes"]) for entry in entries)
        },
        "counts": {
            "volumes": dict(Counter(str(entry["volume"]) for entry in entries)),
            "modules": dict(Counter(str(entry["module"]) for entry in entries)),
            "grades": dict(Counter(grade for entry in entries for grade in entry["suggestedGrades"]))  # type: ignore[index]
        },
        "sources": entries
    }


def qa_report(manifest: dict[str, object], cards: list[dict[str, object]]) -> str:
    totals = manifest["totals"]  # type: ignore[index]
    counts = manifest["counts"]  # type: ignore[index]
    return "\n".join([
        "# Mainland HJB High-School Textbook Metadata QA",
        "",
        f"- Generated at: {manifest['generatedAt']}",
        f"- Files inspected: {totals['files']}",
        f"- PDF files: {totals['pdfFiles']}",
        f"- Pages: {totals['pages']}",
        f"- Safe draft cards: {len(cards)}",
        f"- Safety note: {SAFETY_NOTE}",
        "",
        "## Classification Counts",
        "",
        f"- Volumes: {json.dumps(counts['volumes'], ensure_ascii=False)}",
        f"- Modules: {json.dumps(counts['modules'], ensure_ascii=False)}",
        f"- Grades: {json.dumps(counts['grades'], ensure_ascii=False)}",
        "",
        "## Safety Gate",
        "",
        "- Passed: output artifacts contain metadata, hashes, volume labels, chapter-level signals, and safe abstraction drafts only.",
        "- Passed: no PDF body text, exercise wording, worked-response wording, response keys, page images, table bodies, figure bodies, page locators, or embedding payloads are persisted.",
        "- Required before production use: S18 review of safe cards and any future student-facing content.",
        "",
    ]) + "\n"


def write_outputs(manifest: dict[str, object], cards: list[dict[str, object]], out_dir: Path) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (out_dir / "source-register.json").write_text(json.dumps(manifest["sources"], ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (out_dir / "safe-card-drafts.json").write_text(json.dumps(cards, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (out_dir / "qa-report.md").write_text(qa_report(manifest, cards), encoding="utf-8")


def run_self_test() -> None:
    with TemporaryDirectory() as tmp:
        tmp_path = Path(tmp)
        files = []
        for name in [
            "沪教版数学必修第一册.pdf",
            "沪教版数学必修第二册.pdf",
            "沪教版数学必修第三册.pdf",
            "沪教版数学选择性必修第一册.pdf",
            "沪教版数学选择性必修第二册.pdf",
        ]:
            path = tmp_path / name
            path.write_bytes(b"%PDF-1.7\n1 0 obj << /Type /Page >> endobj\n2 0 obj << /Type /Page >> endobj\n%%EOF")
            files.append(path)
        manifest = build_manifest(files)
        cards = draft_cards(manifest["sources"])  # type: ignore[arg-type]
        assert manifest["totals"]["files"] == 5  # type: ignore[index]
        assert manifest["totals"]["pages"] == 10  # type: ignore[index]
        assert len(cards) == 21
        assert all(card["publisher"] == "MAINLAND_HJB" for card in cards)
    print("Self-test passed: metadata-only HJB high-school manifest handles five PDFs and 21 safe draft cards.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Build local-only Mainland HJB high-school textbook metadata artifacts.")
    parser.add_argument("pdf_paths", nargs="*", help="Path(s) to owner-provided HJB high-school textbook PDFs.")
    parser.add_argument("--out-dir", default=str(DEFAULT_OUT_DIR), help="Output directory. Defaults to ignored .local/rag/.")
    parser.add_argument("--self-test", action="store_true", help="Run a metadata-only smoke test.")
    args = parser.parse_args()

    if args.self_test:
        run_self_test()
        return

    if not args.pdf_paths:
        raise SystemExit("At least one PDF path is required unless --self-test is used.")

    paths = [Path(value).expanduser().resolve() for value in args.pdf_paths]
    missing = [str(path) for path in paths if not path.exists()]
    if missing:
        raise SystemExit(f"PDF not found: {', '.join(missing)}")
    non_pdfs = [str(path) for path in paths if path.suffix.lower() != ".pdf"]
    if non_pdfs:
        raise SystemExit(f"Only PDF files are supported: {', '.join(non_pdfs)}")

    manifest = build_manifest(paths)
    cards = draft_cards(manifest["sources"])  # type: ignore[arg-type]
    write_outputs(manifest, cards, Path(args.out_dir).expanduser())
    print(f"Wrote {manifest['totals']['files']} metadata-only entries and {len(cards)} safe-card drafts to {args.out_dir}")  # type: ignore[index]


if __name__ == "__main__":
    main()
