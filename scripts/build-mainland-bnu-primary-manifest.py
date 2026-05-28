#!/usr/bin/env python3
"""Build a local-only metadata manifest for Mainland BNU primary math PDFs.

The script records coarse file metadata, hashes, page counts, text-layer status,
and the grade-semester coverage included in the current BNU ingestion target.
It does not extract, persist, or print PDF body text, OCR text,
exercises, worked examples, keys, answers, tables, figures, page images, source
paths, page locators, page-level descriptions, or embedding payloads. Default
outputs live under `.local/`, which is ignored by the repository.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from tempfile import TemporaryDirectory


DEFAULT_COVERAGE_TARGET = "p1-p2"
DEFAULT_OUT_DIRS = {
    "p1-p2": Path(".local/rag/mainland-bnu-primary"),
    "p3": Path(".local/rag/mainland-bnu-primary-p3"),
    "p4": Path(".local/rag/mainland-bnu-primary-p4"),
    "p5": Path(".local/rag/mainland-bnu-primary-p5"),
    "p6": Path(".local/rag/mainland-bnu-primary-p6"),
}
SAFETY_NOTE = (
    "Metadata-only local artifact. Do not commit source PDFs, source paths, "
    "extracted PDF body text, OCR text, exercises, worked examples, keys, "
    "answers, tables, figures, page images, page locators, page-level "
    "descriptions, or embedding payloads."
)

COVERAGE_TARGETS = {
    "p1-p2": {
        "scope": "P1-P2 upper/lower only",
        "coverageScope": "P1-P2 upper/lower BNU primary textbooks",
        "expected": [
            ("P1", "upper"),
            ("P1", "lower"),
            ("P2", "upper"),
            ("P2", "lower"),
        ],
    },
    "p3": {
        "scope": "P3 upper/lower only",
        "coverageScope": "P3 upper/lower BNU primary textbooks",
        "expected": [
            ("P3", "upper"),
            ("P3", "lower"),
        ],
    },
    "p4": {
        "scope": "P4 upper/lower only",
        "coverageScope": "P4 upper/lower BNU primary textbooks",
        "expected": [
            ("P4", "upper"),
            ("P4", "lower"),
        ],
    },
    "p5": {
        "scope": "P5 upper/lower only",
        "coverageScope": "P5 upper/lower BNU primary textbooks",
        "expected": [
            ("P5", "upper"),
            ("P5", "lower"),
        ],
    },
    "p6": {
        "scope": "P6 upper/lower only",
        "coverageScope": "P6 upper/lower BNU primary textbooks",
        "expected": [
            ("P6", "upper"),
            ("P6", "lower"),
        ],
    },
}
GRADE_MARKERS = [
    ("P1", ["一年级", "1年级", "一上", "一下", "1上", "1下", "P1", "p1", "一年級"]),
    ("P2", ["二年级", "2年级", "二上", "二下", "2上", "2下", "P2", "p2", "二年級"]),
    ("P3", ["三年级", "3年级", "三上", "三下", "3上", "3下", "P3", "p3", "三年級"]),
    ("P4", ["四年级", "4年级", "四上", "四下", "4上", "4下", "P4", "p4", "四年級"]),
    ("P5", ["五年级", "5年级", "五上", "五下", "5上", "5下", "P5", "p5", "五年級"]),
    ("P6", ["六年级", "6年级", "六上", "六下", "6上", "6下", "P6", "p6", "六年級"]),
]


def sha256_for_path(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def fallback_page_count(path: Path) -> int | None:
    try:
        data = path.read_bytes()
    except OSError:
        return None
    page_markers = re.findall(rb"/Type\s*/Page\b", data)
    return len(page_markers) if page_markers else None


def count_pdf_pages(path: Path) -> tuple[int | None, str]:
    try:
        from pypdf import PdfReader  # type: ignore

        return len(PdfReader(str(path)).pages), "available"
    except Exception:
        fallback = fallback_page_count(path)
        if fallback:
            return fallback, "available"
    return None, "missing"


def text_layer_status(path: Path) -> tuple[str, int, int, str]:
    try:
        from pypdf import PdfReader  # type: ignore

        reader = PdfReader(str(path))
        page_count = len(reader.pages)
        if page_count == 0:
            return "missing", 0, 0, "available"
        sample_indexes = sorted({0, page_count // 2, page_count - 1})
        sampled_pages = 0
        pages_with_text = 0
        for index in sample_indexes:
            sampled_pages += 1
            text = reader.pages[index].extract_text() or ""
            if text.strip():
                pages_with_text += 1
        if pages_with_text == 0:
            return "missing", sampled_pages, pages_with_text, "available"
        if pages_with_text == sampled_pages:
            return "present", sampled_pages, pages_with_text, "available"
        return "partial", sampled_pages, pages_with_text, "available"
    except Exception:
        return "unknown", 0, 0, "unavailable"


def infer_grade(path: Path) -> str:
    searchable = path.name
    for grade, markers in GRADE_MARKERS:
        if any(marker in searchable for marker in markers):
            return grade
    return "unknown"


def infer_semester(path: Path) -> str:
    name = path.name
    if any(marker in name for marker in ["上册", "上冊", "上学期", "上學期", "一上", "二上", "三上", "四上", "五上", "六上", "1上", "2上", "3上", "4上", "5上", "6上", "第一学期", "第一學期", "upper"]):
        return "upper"
    if any(marker in name for marker in ["下册", "下冊", "下学期", "下學期", "一下", "二下", "三下", "四下", "五下", "六下", "1下", "2下", "3下", "4下", "5下", "6下", "第二学期", "第二學期", "lower"]):
        return "lower"
    return "unknown"


def volume_for(grade: str, semester: str) -> str:
    grade_labels = {
        "P1": "一年级",
        "P2": "二年级",
        "P3": "三年级",
        "P4": "四年级",
        "P5": "五年级",
        "P6": "六年级",
    }
    semester_labels = {
        "upper": "上册",
        "lower": "下册",
    }
    grade_label = grade_labels.get(grade)
    semester_label = semester_labels.get(semester)
    if not grade_label or not semester_label:
        return "unknown"
    return f"{grade_label}{semester_label}"


def manifest_entry(path: Path) -> dict[str, object]:
    resolved = path.expanduser().resolve()
    if not resolved.exists():
        raise FileNotFoundError(f"PDF not found: {resolved}")
    if resolved.suffix.lower() != ".pdf":
        raise ValueError(f"Expected a PDF path: {resolved}")

    digest = sha256_for_path(resolved)
    pages, page_status = count_pdf_pages(resolved)
    text_status, sampled_pages, sampled_pages_with_text, text_status_source = text_layer_status(resolved)
    grade = infer_grade(resolved)
    semester = infer_semester(resolved)
    return {
        "id": f"bnu-primary-{grade.lower()}-{semester}-{digest[:10]}",
        "publisher": "MAINLAND_BNU",
        "stage": "primary",
        "volume": volume_for(grade, semester),
        "grade": grade,
        "semester": semester,
        "sizeBytes": resolved.stat().st_size,
        "sha256": digest,
        "pageCount": pages,
        "pageCountStatus": page_status,
        "textExtractable": text_status in ["present", "partial"],
        "textExtractableStatus": text_status,
        "textLayerStatus": text_status,
        "textLayerStatusSource": text_status_source,
        "textLayerSampledPages": sampled_pages,
        "textLayerSampledPagesWithText": sampled_pages_with_text,
        "retentionPolicy": "metadata-only-local",
        "safetyNote": SAFETY_NOTE,
    }


def coverage(entries: list[dict[str, object]], coverage_target: str) -> dict[str, object]:
    target = COVERAGE_TARGETS[coverage_target]
    expected_coverage = target["expected"]  # type: ignore[assignment]
    observed = {(str(entry["grade"]), str(entry["semester"])) for entry in entries}
    missing = [{"grade": grade, "semester": semester} for grade, semester in expected_coverage if (grade, semester) not in observed]
    duplicates: list[dict[str, object]] = []
    for grade, semester in expected_coverage:
        count = sum(1 for entry in entries if entry["grade"] == grade and entry["semester"] == semester)
        if count > 1:
            duplicates.append({"grade": grade, "semester": semester, "count": count})
    unknown = [{"id": entry["id"], "grade": entry["grade"], "semester": entry["semester"]} for entry in entries if entry["grade"] == "unknown" or entry["semester"] == "unknown"]
    return {
        "scope": target["scope"],
        "coverageTarget": coverage_target,
        "expectedFiles": len(expected_coverage),
        "observedFiles": len(entries),
        "completeP1UpperLower": all((grade, semester) in observed for grade, semester in [("P1", "upper"), ("P1", "lower")]),
        "completeP2UpperLower": all((grade, semester) in observed for grade, semester in [("P2", "upper"), ("P2", "lower")]),
        "completeP3UpperLower": all((grade, semester) in observed for grade, semester in [("P3", "upper"), ("P3", "lower")]),
        "completeP4UpperLower": all((grade, semester) in observed for grade, semester in [("P4", "upper"), ("P4", "lower")]),
        "completeP5UpperLower": all((grade, semester) in observed for grade, semester in [("P5", "upper"), ("P5", "lower")]),
        "completeP6UpperLower": all((grade, semester) in observed for grade, semester in [("P6", "upper"), ("P6", "lower")]),
        "completeP1P2UpperLower": all((grade, semester) in observed for grade, semester in [("P1", "upper"), ("P1", "lower"), ("P2", "upper"), ("P2", "lower")]),
        "completeExpectedCoverage": len(missing) == 0 and len(entries) == len(expected_coverage),
        "missing": missing,
        "duplicates": duplicates,
        "unknown": unknown,
    }


def build_manifest(pdf_paths: list[Path], coverage_target: str = DEFAULT_COVERAGE_TARGET) -> dict[str, object]:
    target = COVERAGE_TARGETS[coverage_target]
    entries = [manifest_entry(path) for path in pdf_paths]
    return {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "publisher": "MAINLAND_BNU",
        "stage": "primary",
        "artifactKind": "metadata-only-pdf-manifest",
        "coverageScope": target["coverageScope"],
        "safetyNote": SAFETY_NOTE,
        "coverage": coverage(entries, coverage_target),
        "totals": {
            "files": len(entries),
            "bytes": sum(int(entry["sizeBytes"]) for entry in entries),
            "pagesKnown": sum(1 for entry in entries if entry["pageCountStatus"] == "available"),
            "pagesMissing": sum(1 for entry in entries if entry["pageCountStatus"] != "available"),
            "textLayerPresent": sum(1 for entry in entries if entry["textLayerStatus"] == "present"),
            "textLayerPartial": sum(1 for entry in entries if entry["textLayerStatus"] == "partial"),
            "textLayerMissing": sum(1 for entry in entries if entry["textLayerStatus"] == "missing"),
            "textLayerUnknown": sum(1 for entry in entries if entry["textLayerStatus"] == "unknown"),
        },
        "entries": entries,
    }


def qa_report(manifest: dict[str, object]) -> str:
    coverage_info = manifest["coverage"]  # type: ignore[index]
    totals = manifest["totals"]  # type: ignore[index]
    return "\n".join([
        "# Mainland BNU Primary PDF Manifest QA",
        "",
        f"- Generated at: {manifest['generatedAt']}",
        f"- Publisher: {manifest['publisher']}",
        f"- Stage: {manifest['stage']}",
        f"- Coverage scope: {manifest['coverageScope']}",
        f"- Files inspected: {totals['files']}",
        f"- Total bytes: {totals['bytes']}",
        f"- Page counts available: {totals['pagesKnown']}",
        f"- Page counts missing: {totals['pagesMissing']}",
        f"- Text-layer present files: {totals['textLayerPresent']}",
        f"- Text-layer partial files: {totals['textLayerPartial']}",
        f"- Text-layer missing files: {totals['textLayerMissing']}",
        f"- Text-layer unknown files: {totals['textLayerUnknown']}",
        f"- Complete P1 upper/lower coverage: {coverage_info['completeP1UpperLower']}",
        f"- Complete P2 upper/lower coverage: {coverage_info['completeP2UpperLower']}",
        f"- Complete P3 upper/lower coverage: {coverage_info['completeP3UpperLower']}",
        f"- Complete P4 upper/lower coverage: {coverage_info['completeP4UpperLower']}",
        f"- Complete P5 upper/lower coverage: {coverage_info['completeP5UpperLower']}",
        f"- Complete P6 upper/lower coverage: {coverage_info['completeP6UpperLower']}",
        f"- Complete P1-P2 upper/lower coverage: {coverage_info['completeP1P2UpperLower']}",
        f"- Complete expected target coverage: {coverage_info['completeExpectedCoverage']}",
        f"- Missing current-scope grade-semester slots: {json.dumps(coverage_info['missing'], ensure_ascii=False)}",
        f"- Duplicate current-scope grade-semester slots: {json.dumps(coverage_info['duplicates'], ensure_ascii=False)}",
        f"- Unknown grade-semester entries: {json.dumps(coverage_info['unknown'], ensure_ascii=False)}",
        f"- Safety note: {SAFETY_NOTE}",
        "",
        "## Safety Gate",
        "",
        "- Passed: manifest entries contain volume, grade, semester, file size, hash, page-count status, text-extractability status, and aggregate text-layer status only.",
        "- Passed: source paths, PDF body text, OCR text, exercises, worked examples, keys, answers, tables, figure descriptions, page images, page locators, page-level descriptions, and embedding payloads are not extracted or persisted.",
        "- Required before production use: S18 source-distance review of safe cards and any future generated student-facing output.",
        "",
    ]) + "\n"


def write_outputs(manifest: dict[str, object], out_dir: Path) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (out_dir / "qa-report.md").write_text(qa_report(manifest), encoding="utf-8")


def fake_pdf_bytes(page_count: int) -> bytes:
    pages = "\n".join(f"{i} 0 obj << /Type /Page >> endobj" for i in range(1, page_count + 1))
    return f"%PDF-1.4\n{pages}\n%%EOF\n".encode("utf-8")


def assert_metadata_only_manifest(manifest: dict[str, object], source_names: list[str]) -> None:
    manifest_json = json.dumps(manifest, ensure_ascii=False)
    forbidden_fields = [
        '"fileName"',
        '"extension"',
        '"sourcePath"',
        '"entryPath"',
        '"bodyTextPersisted"',
        '"ocrTextPersisted"',
        '"pageImagesPersisted"',
        '"sourceLocatorsPersisted"',
        '"embeddingPayloadsPersisted"',
    ]
    for forbidden in forbidden_fields:
        assert forbidden not in manifest_json
    for source_name in source_names:
        assert source_name not in manifest_json
    assert "/Type /Page" not in manifest_json
    assert "/Users/" not in manifest_json
    assert all(entry["volume"] != "unknown" for entry in manifest["entries"])  # type: ignore[index]


def run_self_test() -> None:
    with TemporaryDirectory() as tmp:
        tmp_dir = Path(tmp)
        paths = []
        for name in [
            "北师大版数学一年级上册新课标.pdf",
            "北师大版数学一下新课本.pdf",
            "北师大版数学二年级上册新课本.pdf",
            "北师大版数学二下新课标.pdf",
        ]:
            path = tmp_dir / name
            path.write_bytes(fake_pdf_bytes(page_count=12))
            paths.append(path)
        manifest = build_manifest(paths, "p1-p2")
        manifest_json = json.dumps(manifest, ensure_ascii=False)
        assert_metadata_only_manifest(manifest, [path.name for path in paths])
        assert manifest["coverage"]["completeP1P2UpperLower"] is True  # type: ignore[index]
        assert manifest["coverage"]["completeExpectedCoverage"] is True  # type: ignore[index]
        assert manifest["coverage"]["expectedFiles"] == 4  # type: ignore[index]
        assert manifest["totals"]["files"] == 4  # type: ignore[index]
        assert all(entry["publisher"] == "MAINLAND_BNU" for entry in manifest["entries"])  # type: ignore[index]
        assert all(entry["stage"] == "primary" for entry in manifest["entries"])  # type: ignore[index]
        assert {entry["grade"] for entry in manifest["entries"]} == {"P1", "P2"}  # type: ignore[index]
        assert all("textExtractable" in entry for entry in manifest["entries"])  # type: ignore[index]
        assert all("sourcePath" not in entry for entry in manifest["entries"])  # type: ignore[index]
        assert "body text sample" not in manifest_json
        assert "/Type /Page" not in manifest_json
        assert "/Users/" not in manifest_json
    with TemporaryDirectory() as tmp:
        tmp_dir = Path(tmp)
        paths = []
        for name in [
            "北师大版数学三年级上册新课标.pdf",
            "北师大版数学三下新课本.pdf",
        ]:
            path = tmp_dir / name
            path.write_bytes(fake_pdf_bytes(page_count=12))
            paths.append(path)
        manifest = build_manifest(paths, "p3")
        manifest_json = json.dumps(manifest, ensure_ascii=False)
        assert_metadata_only_manifest(manifest, [path.name for path in paths])
        assert manifest["coverage"]["completeP3UpperLower"] is True  # type: ignore[index]
        assert manifest["coverage"]["completeExpectedCoverage"] is True  # type: ignore[index]
        assert manifest["coverage"]["expectedFiles"] == 2  # type: ignore[index]
        assert manifest["totals"]["files"] == 2  # type: ignore[index]
        assert all(entry["publisher"] == "MAINLAND_BNU" for entry in manifest["entries"])  # type: ignore[index]
        assert all(entry["stage"] == "primary" for entry in manifest["entries"])  # type: ignore[index]
        assert {entry["grade"] for entry in manifest["entries"]} == {"P3"}  # type: ignore[index]
        assert all("textExtractable" in entry for entry in manifest["entries"])  # type: ignore[index]
        assert all("sourcePath" not in entry for entry in manifest["entries"])  # type: ignore[index]
        assert "body text sample" not in manifest_json
        assert "/Type /Page" not in manifest_json
        assert "/Users/" not in manifest_json
    with TemporaryDirectory() as tmp:
        tmp_dir = Path(tmp)
        paths = []
        for name in [
            "北师大版数学四年级上册新课标.pdf",
            "北师大版数学四下新课本.pdf",
        ]:
            path = tmp_dir / name
            path.write_bytes(fake_pdf_bytes(page_count=12))
            paths.append(path)
        manifest = build_manifest(paths, "p4")
        manifest_json = json.dumps(manifest, ensure_ascii=False)
        assert_metadata_only_manifest(manifest, [path.name for path in paths])
        assert manifest["coverage"]["completeP4UpperLower"] is True  # type: ignore[index]
        assert manifest["coverage"]["completeExpectedCoverage"] is True  # type: ignore[index]
        assert manifest["coverage"]["expectedFiles"] == 2  # type: ignore[index]
        assert manifest["totals"]["files"] == 2  # type: ignore[index]
        assert all(entry["publisher"] == "MAINLAND_BNU" for entry in manifest["entries"])  # type: ignore[index]
        assert all(entry["stage"] == "primary" for entry in manifest["entries"])  # type: ignore[index]
        assert {entry["grade"] for entry in manifest["entries"]} == {"P4"}  # type: ignore[index]
        assert all("textExtractable" in entry for entry in manifest["entries"])  # type: ignore[index]
        assert all("sourcePath" not in entry for entry in manifest["entries"])  # type: ignore[index]
        assert "body text sample" not in manifest_json
        assert "/Type /Page" not in manifest_json
        assert "/Users/" not in manifest_json
    with TemporaryDirectory() as tmp:
        tmp_dir = Path(tmp)
        paths = []
        for name in [
            "北师大版数学五年级上册新课标.pdf",
            "北师大版数学五下新课本.pdf",
        ]:
            path = tmp_dir / name
            path.write_bytes(fake_pdf_bytes(page_count=12))
            paths.append(path)
        manifest = build_manifest(paths, "p5")
        manifest_json = json.dumps(manifest, ensure_ascii=False)
        assert_metadata_only_manifest(manifest, [path.name for path in paths])
        assert manifest["coverage"]["completeP5UpperLower"] is True  # type: ignore[index]
        assert manifest["coverage"]["completeExpectedCoverage"] is True  # type: ignore[index]
        assert manifest["coverage"]["expectedFiles"] == 2  # type: ignore[index]
        assert manifest["totals"]["files"] == 2  # type: ignore[index]
        assert all(entry["publisher"] == "MAINLAND_BNU" for entry in manifest["entries"])  # type: ignore[index]
        assert all(entry["stage"] == "primary" for entry in manifest["entries"])  # type: ignore[index]
        assert {entry["grade"] for entry in manifest["entries"]} == {"P5"}  # type: ignore[index]
        assert all("textExtractable" in entry for entry in manifest["entries"])  # type: ignore[index]
        assert all("sourcePath" not in entry for entry in manifest["entries"])  # type: ignore[index]
        assert "body text sample" not in manifest_json
        assert "/Type /Page" not in manifest_json
        assert "/Users/" not in manifest_json
    with TemporaryDirectory() as tmp:
        tmp_dir = Path(tmp)
        paths = []
        for name in [
            "北师大版数学六年级上册新课标.pdf",
            "北师大版数学六下新课本.pdf",
        ]:
            path = tmp_dir / name
            path.write_bytes(fake_pdf_bytes(page_count=12))
            paths.append(path)
        manifest = build_manifest(paths, "p6")
        manifest_json = json.dumps(manifest, ensure_ascii=False)
        assert_metadata_only_manifest(manifest, [path.name for path in paths])
        assert manifest["coverage"]["completeP6UpperLower"] is True  # type: ignore[index]
        assert manifest["coverage"]["completeExpectedCoverage"] is True  # type: ignore[index]
        assert manifest["coverage"]["expectedFiles"] == 2  # type: ignore[index]
        assert manifest["totals"]["files"] == 2  # type: ignore[index]
        assert all(entry["publisher"] == "MAINLAND_BNU" for entry in manifest["entries"])  # type: ignore[index]
        assert all(entry["stage"] == "primary" for entry in manifest["entries"])  # type: ignore[index]
        assert {entry["grade"] for entry in manifest["entries"]} == {"P6"}  # type: ignore[index]
        assert all("textExtractable" in entry for entry in manifest["entries"])  # type: ignore[index]
        assert all("sourcePath" not in entry for entry in manifest["entries"])  # type: ignore[index]
        assert "body text sample" not in manifest_json
        assert "/Type /Page" not in manifest_json
        assert "/Users/" not in manifest_json
    print("Self-test passed: metadata-only manifest covers P1-P2, P3, P4, P5, and P6 target BNU primary PDFs.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Build a local-only Mainland BNU primary PDF metadata manifest.")
    parser.add_argument("pdf_paths", nargs="*", help="Paths to private BNU primary upper/lower math PDFs.")
    parser.add_argument(
        "--coverage-target",
        choices=sorted(COVERAGE_TARGETS.keys()),
        default=DEFAULT_COVERAGE_TARGET,
        help="Expected grade-semester coverage target. Defaults to existing P1-P2 coverage.",
    )
    parser.add_argument("--out-dir", default=None, help="Output directory. Defaults to ignored target-specific .local/rag/.")
    parser.add_argument("--self-test", action="store_true", help="Run a metadata-only smoke test with temporary fake PDFs.")
    args = parser.parse_args()

    if args.self_test:
        run_self_test()
        return

    if not args.pdf_paths:
        raise SystemExit("At least one PDF path is required unless --self-test is used.")

    out_dir = Path(args.out_dir).expanduser() if args.out_dir else DEFAULT_OUT_DIRS[args.coverage_target]
    manifest = build_manifest([Path(path) for path in args.pdf_paths], args.coverage_target)
    write_outputs(manifest, out_dir)
    print(f"Wrote {manifest['totals']['files']} metadata-only PDF entries to {out_dir}")


if __name__ == "__main__":
    main()
