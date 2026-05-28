#!/usr/bin/env python3
"""Build local-only metadata artifacts for Mainland BNU high-school textbooks.

The script records technical metadata and chapter-level safe draft signals only.
It never extracts or writes body text, exercises, response keys, worked-response
wording, page images, tables, figures, page locators, or embedding payloads.
Default outputs live under `.local/`, which is ignored by the repository.
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


DEFAULT_OUT_DIR = Path(".local/rag/mainland-bnu-high")
SAFETY_NOTE = (
    "Metadata-only local artifact. Do not commit source PDFs, PDF body text, "
    "exercise wording, worked-response wording, response keys, page images, "
    "tables, figures, page locators, source paths, source filenames, checksums, "
    "or embeddings."
)

VOLUME_SLOTS = {
    "compulsory-1": {
        "volume": "必修 第一册",
        "module": "compulsory",
        "suggestedGrades": ["S4"],
        "semesters": ["upper"],
        "markers": ["必修第一册", "必修 第一册"],
        "chapters": [
            ("预备知识", ["sets", "logic-conditions", "quadratic-inequalities"]),
            ("函数", ["function-definition", "domain-range", "monotonicity", "parity"]),
            ("指数运算与指数函数", ["exponents", "exponential-functions"]),
            ("对数运算与对数函数", ["logarithmic-operations", "logarithmic-functions"]),
            ("函数应用", ["function-zero", "function-modeling"]),
            ("统计", ["sampling", "frequency-distribution", "data-distribution"]),
            ("概率", ["probability-foundations", "random-events", "independence"]),
            ("数学建模活动（一）", ["mathematical-modeling", "data-modeling"]),
        ],
    },
    "compulsory-2": {
        "volume": "必修 第二册",
        "module": "compulsory",
        "suggestedGrades": ["S4"],
        "semesters": ["lower"],
        "markers": ["必修第二册", "必修 第二册"],
        "chapters": [
            ("三角函数", ["unit-circle", "trigonometric-functions", "trigonometric-graphs"]),
            ("平面向量及其应用", ["plane-vectors", "dot-product", "vector-applications"]),
            ("数学建模活动（二）", ["mathematical-modeling", "measurement-modeling"]),
            ("三角恒等变换", ["trigonometric-identities", "sum-difference-formulas"]),
            ("复数", ["complex-numbers", "complex-plane"]),
            ("立体几何初步", ["solid-geometry", "spatial-lines-planes", "surface-volume"]),
        ],
    },
    "selective-1": {
        "volume": "选择性必修 第一册",
        "module": "selective-compulsory",
        "suggestedGrades": ["S5"],
        "semesters": ["lower"],
        "markers": ["选择性必修第一册", "选择性必修 第一册", "选修第一册", "选修 第一册"],
        "chapters": [
            ("直线与圆", ["line-equations", "circle-equations", "line-circle-position"]),
            ("圆锥曲线", ["ellipse", "hyperbola", "parabola-conic", "line-conic-intersection"]),
            ("空间向量与立体几何", ["space-vectors", "line-plane-angle", "distance-in-space"]),
            ("数学建模活动（三）", ["mathematical-modeling", "analytic-geometry-modeling"]),
            ("计数原理", ["counting-principles", "permutations-combinations", "binomial-theorem"]),
            ("概率", ["conditional-probability", "random-variables", "normal-distribution"]),
            ("统计案例", ["bivariate-data", "linear-regression", "independence-test"]),
        ],
    },
    "selective-2": {
        "volume": "选择性必修 第二册",
        "module": "selective-compulsory",
        "suggestedGrades": ["S6"],
        "semesters": ["upper", "full-year"],
        "markers": ["选择性必修第二册", "选择性必修 第二册", "选修第二册", "选修 第二册"],
        "chapters": [
            ("数列", ["sequences", "arithmetic-sequences", "geometric-sequences", "mathematical-induction"]),
            ("导数及其应用", ["derivatives", "tangent-lines", "monotonicity", "optimization"]),
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


def text_layer_status(path: Path) -> dict[str, object]:
    try:
        from pypdf import PdfReader  # type: ignore

        reader = PdfReader(str(path))
        page_count = len(reader.pages)
        if page_count == 0:
            return {"status": "missing", "sampledPages": 0, "sampledPagesWithText": 0}
        sample_indexes = sorted({0, page_count // 2, page_count - 1})
        pages_with_text = 0
        for index in sample_indexes:
            text = reader.pages[index].extract_text() or ""
            if text.strip():
                pages_with_text += 1
        if pages_with_text == 0:
            status = "missing"
        elif pages_with_text == len(sample_indexes):
            status = "present"
        else:
            status = "partial"
        return {
            "status": status,
            "sampledPages": len(sample_indexes),
            "sampledPagesWithText": pages_with_text,
        }
    except Exception:
        return {"status": "unknown", "sampledPages": 0, "sampledPagesWithText": 0}


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


def source_entry(path: Path, ordinal: int) -> dict[str, object]:
    slot_id, slot = infer_slot(path)
    digest = sha256_for(path)
    text_status = text_layer_status(path)
    return {
        "sourceId": f"bnu-high-{slot_id}-{ordinal:02d}",
        "privateChecksumSha256": digest,
        "privateFileOrdinal": ordinal,
        "extension": path.suffix.lower(),
        "volume": slot["volume"],
        "module": slot["module"],
        "suggestedGrades": slot["suggestedGrades"],
        "semesters": slot["semesters"],
        "ownerProvided": True,
        "sizeBytes": path.stat().st_size,
        "pageCount": pdf_page_count(path),
        "textLayerStatus": text_status["status"],
        "textLayerSampledPages": text_status["sampledPages"],
        "textLayerSampledPagesWithText": text_status["sampledPagesWithText"],
        "storageStatus": "local-private-owner-provided; source PDF not copied into repo",
        "licenseStatus": "owner-provided local analysis only; no public redistribution assumed",
        "safeRetentionPolicy": "commit safe abstractions and QA reports only",
    }


def draft_cards(entries: list[dict[str, object]]) -> list[dict[str, object]]:
    cards: list[dict[str, object]] = []
    for entry in entries:
        slot_id, slot = infer_slot(Path(f"{entry['volume']}.pdf"))
        for index, (chapter, concepts) in enumerate(slot["chapters"], start=1):  # type: ignore[index]
            cards.append({
                "draftId": f"bnu-high-{slot_id}-{index:02d}",
                "publisher": "MAINLAND_BNU",
                "stage": "senior-secondary",
                "curriculumTrack": "MAINLAND_PEP_HIGH",
                "volume": entry["volume"],
                "chapter": chapter,
                "suggestedGrades": entry["suggestedGrades"],
                "semesters": entry["semesters"],
                "conceptSignals": concepts,
                "sourceId": entry["sourceId"],
                "safeSummaryDraft": "Use this chapter only as Beijing Normal University Press senior-secondary sequencing and concept-coverage guidance.",
                "sourceDistanceStatus": "needs-S18-review",
            })
    return cards


def build_manifest(paths: list[Path]) -> dict[str, object]:
    entries = [source_entry(path, index + 1) for index, path in enumerate(paths)]
    observed_volumes = {str(entry["volume"]) for entry in entries}
    expected_volumes = {str(slot["volume"]) for slot in VOLUME_SLOTS.values()}
    return {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "safetyNote": SAFETY_NOTE,
        "publisher": "MAINLAND_BNU",
        "stage": "senior-secondary",
        "artifactKind": "metadata-only-pdf-manifest",
        "totals": {
            "files": len(entries),
            "pdfFiles": sum(1 for entry in entries if entry["extension"] == ".pdf"),
            "pages": sum(int(entry["pageCount"]) for entry in entries),
            "bytes": sum(int(entry["sizeBytes"]) for entry in entries),
            "textLayerPresent": sum(1 for entry in entries if entry["textLayerStatus"] == "present"),
            "textLayerPartial": sum(1 for entry in entries if entry["textLayerStatus"] == "partial"),
            "textLayerMissing": sum(1 for entry in entries if entry["textLayerStatus"] == "missing"),
            "textLayerUnknown": sum(1 for entry in entries if entry["textLayerStatus"] == "unknown"),
        },
        "coverage": {
            "expectedVolumes": sorted(expected_volumes),
            "observedVolumes": sorted(observed_volumes),
            "missingExpectedVolumes": sorted(expected_volumes - observed_volumes),
            "unknownSourceSlots": sum(1 for entry in entries if entry["volume"] == "unknown"),
            "completeFourVolumeV1Coverage": expected_volumes.issubset(observed_volumes) and len(entries) == len(expected_volumes),
        },
        "counts": {
            "volumes": dict(Counter(str(entry["volume"]) for entry in entries)),
            "modules": dict(Counter(str(entry["module"]) for entry in entries)),
            "grades": dict(Counter(grade for entry in entries for grade in entry["suggestedGrades"])),  # type: ignore[index]
            "textLayerStatus": dict(Counter(str(entry["textLayerStatus"]) for entry in entries)),
        },
        "sources": entries,
    }


def qa_report(manifest: dict[str, object], cards: list[dict[str, object]]) -> str:
    totals = manifest["totals"]  # type: ignore[index]
    coverage = manifest["coverage"]  # type: ignore[index]
    counts = manifest["counts"]  # type: ignore[index]
    return "\n".join([
        "# Mainland BNU High-School Textbook Metadata QA",
        "",
        f"- Generated at: {manifest['generatedAt']}",
        f"- Files inspected: {totals['files']}",
        f"- PDF files: {totals['pdfFiles']}",
        f"- Pages: {totals['pages']}",
        f"- Safe draft cards: {len(cards)}",
        f"- Text-layer status counts: {json.dumps(counts['textLayerStatus'], ensure_ascii=False)}",
        f"- Complete four-volume v1 coverage: {coverage['completeFourVolumeV1Coverage']}",
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
        "- Passed: output artifacts contain technical metadata, volume labels, chapter-level signals, and safe abstraction drafts only.",
        "- Passed: no body text, exercise wording, worked-response wording, response keys, page images, table bodies, figure bodies, page locators, or embedding payloads are persisted.",
        "- Local-only: private filenames, source paths, and checksum values must not be copied into committed reports or evidence packs.",
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
            "北师大数学必修第一册.pdf",
            "北师大数学必修第二册.pdf",
            "北师大数学选择性必修第一册.pdf",
            "北师大数学选择性必修第二册.pdf",
        ]:
            path = tmp_path / name
            path.write_bytes(b"%PDF-1.7\n1 0 obj << /Type /Page >> endobj\n2 0 obj << /Type /Page >> endobj\n%%EOF")
            files.append(path)
        manifest = build_manifest(files)
        cards = draft_cards(manifest["sources"])  # type: ignore[arg-type]
        assert manifest["totals"]["files"] == 4  # type: ignore[index]
        assert manifest["totals"]["pdfFiles"] == 4  # type: ignore[index]
        assert manifest["totals"]["pages"] == 8  # type: ignore[index]
        assert manifest["coverage"]["completeFourVolumeV1Coverage"] is True  # type: ignore[index]
        assert len(cards) == 23
        assert all(card["publisher"] == "MAINLAND_BNU" for card in cards)
        serialized = json.dumps(manifest, ensure_ascii=False)
        assert "sourcePath" not in serialized
        assert "fileName" not in serialized
    print("Self-test passed: metadata-only BNU high-school manifest handles four PDFs and 23 safe draft cards.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Build local-only Mainland BNU high-school textbook metadata artifacts.")
    parser.add_argument("pdf_paths", nargs="*", help="Path(s) to owner-provided BNU high-school textbook PDFs.")
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
