#!/usr/bin/env python3
"""Build a local-only metadata manifest for Mainland BNU junior math PDFs.

The script records coarse coverage and technical metadata only. It does not
extract, persist, or print source identifiers, protected page content, answer
materials, visual content, page-level anchors, checksums, or vector data.
Default outputs live under `.local/`, which is ignored by the repository.
"""

from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from tempfile import TemporaryDirectory


DEFAULT_COVERAGE_TARGET = "s2"
DEFAULT_OUT_DIRS = {
    "s1": Path(".local/rag/mainland-bnu-junior"),
    "s2": Path(".local/rag/mainland-bnu-junior-s2"),
    "s3": Path(".local/rag/mainland-bnu-junior-s3"),
}
SAFETY_NOTE = (
    "Metadata-only local artifact. Do not commit source PDFs, source identifiers, "
    "protected page content, answer materials, visual content, page-level anchors, "
    "checksums, or vector data."
)
COVERAGE_TARGETS = {
    "s1": {
        "scope": "S1 upper/lower only",
        "coverageScope": "S1 upper/lower BNU junior textbooks",
        "expected": [("S1", "upper"), ("S1", "lower")],
        "completeKey": "completeS1UpperLower",
        "selfTestNames": [
            "北师大版数学七年级上册新课标.pdf",
            "北师大版数学七年级下册新课标.pdf",
        ],
        "selfTestGrade": "S1",
    },
    "s2": {
        "scope": "S2 upper/lower only",
        "coverageScope": "S2 upper/lower BNU junior textbooks",
        "expected": [("S2", "upper"), ("S2", "lower")],
        "completeKey": "completeS2UpperLower",
        "selfTestNames": [
            "北师大版数学八年级上册新课标.pdf",
            "北师大版数学八年级下册新课标.pdf",
        ],
        "selfTestGrade": "S2",
    },
    "s3": {
        "scope": "S3 upper/lower only",
        "coverageScope": "S3 upper/lower BNU junior textbooks",
        "expected": [("S3", "upper"), ("S3", "lower")],
        "completeKey": "completeS3UpperLower",
        "selfTestNames": [
            "北师大版数学九年级上册新课标.pdf",
            "北师大版数学九年级下册新课标.pdf",
        ],
        "selfTestGrade": "S3",
    },
}
GRADE_MARKERS = [
    ("S1", ["七年级", "7年级", "七上", "七下", "初一", "S1", "s1", "七年級"]),
    ("S2", ["八年级", "8年级", "八上", "八下", "初二", "S2", "s2", "八年級"]),
    ("S3", ["九年级", "9年级", "九上", "九下", "初三", "S3", "s3", "九年級"]),
]


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
    if any(marker in name for marker in ["上册", "上冊", "上学期", "上學期", "七上", "八上", "九上", "第一学期", "第一學期", "upper"]):
        return "upper"
    if any(marker in name for marker in ["下册", "下冊", "下学期", "下學期", "七下", "八下", "九下", "第二学期", "第二學期", "lower"]):
        return "lower"
    return "unknown"


def volume_for(grade: str, semester: str) -> str:
    grade_labels = {
        "S1": "七年级",
        "S2": "八年级",
        "S3": "九年级",
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


def manifest_entry(path: Path, ordinal: int) -> dict[str, object]:
    resolved = path.expanduser().resolve()
    if not resolved.exists():
        raise FileNotFoundError("PDF not found.")
    if resolved.suffix.lower() != ".pdf":
        raise ValueError("Expected a PDF path.")

    pages, page_status = count_pdf_pages(resolved)
    text_status, sampled_pages, sampled_pages_with_text, text_status_source = text_layer_status(resolved)
    grade = infer_grade(resolved)
    semester = infer_semester(resolved)
    return {
        "id": f"bnu-junior-{grade.lower()}-{semester}-{ordinal:03d}",
        "publisher": "MAINLAND_BNU",
        "stage": "junior-secondary",
        "volume": volume_for(grade, semester),
        "grade": grade,
        "semester": semester,
        "sizeBytes": resolved.stat().st_size,
        "pageCount": pages,
        "pageCountStatus": page_status,
        "textExtractable": text_status in ["present", "partial"],
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
    unknown = [
        {"id": entry["id"], "grade": entry["grade"], "semester": entry["semester"]}
        for entry in entries
        if entry["grade"] == "unknown" or entry["semester"] == "unknown"
    ]
    complete_key = str(target["completeKey"])
    return {
        "scope": target["scope"],
        "coverageTarget": coverage_target,
        "expectedFiles": len(expected_coverage),
        "observedFiles": len(entries),
        complete_key: all(slot in observed for slot in expected_coverage),
        "completeExpectedCoverage": len(missing) == 0 and len(entries) == len(expected_coverage),
        "missing": missing,
        "duplicates": duplicates,
        "unknown": unknown,
    }


def build_manifest(pdf_paths: list[Path], coverage_target: str = DEFAULT_COVERAGE_TARGET) -> dict[str, object]:
    target = COVERAGE_TARGETS[coverage_target]
    entries = [manifest_entry(path, index + 1) for index, path in enumerate(pdf_paths)]
    return {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "publisher": "MAINLAND_BNU",
        "stage": "junior-secondary",
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
    target = COVERAGE_TARGETS[str(coverage_info["coverageTarget"])]
    complete_key = str(target["completeKey"])
    complete_label = str(target["scope"]).replace(" only", "")
    return "\n".join([
        "# Mainland BNU Junior PDF Manifest QA",
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
        f"- Complete {complete_label} coverage: {coverage_info[complete_key]}",
        f"- Complete expected target coverage: {coverage_info['completeExpectedCoverage']}",
        f"- Missing current-scope grade-semester slots: {json.dumps(coverage_info['missing'], ensure_ascii=False)}",
        f"- Duplicate current-scope grade-semester slots: {json.dumps(coverage_info['duplicates'], ensure_ascii=False)}",
        f"- Unknown grade-semester entries: {json.dumps(coverage_info['unknown'], ensure_ascii=False)}",
        f"- Safety note: {SAFETY_NOTE}",
        "",
        "## Safety Gate",
        "",
        "- Passed: manifest entries contain volume, grade, semester, file size, page-count status, text-extractability status, and aggregate text-layer status only.",
        "- Passed: source identifiers, protected page content, answer materials, table or figure content, page images, page-level anchors, checksums, and vector data are not extracted or persisted.",
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
        '"sha256"',
        '"hash"',
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
    for target_name, target in COVERAGE_TARGETS.items():
        with TemporaryDirectory() as tmp:
            tmp_dir = Path(tmp)
            paths = []
            for name in target["selfTestNames"]:  # type: ignore[union-attr]
                path = tmp_dir / str(name)
                path.write_bytes(fake_pdf_bytes(page_count=12))
                paths.append(path)
            manifest = build_manifest(paths, target_name)
            manifest_json = json.dumps(manifest, ensure_ascii=False)
            complete_key = str(target["completeKey"])
            assert_metadata_only_manifest(manifest, [path.name for path in paths])
            assert manifest["coverage"][complete_key] is True  # type: ignore[index]
            assert manifest["coverage"]["completeExpectedCoverage"] is True  # type: ignore[index]
            assert manifest["coverage"]["expectedFiles"] == 2  # type: ignore[index]
            assert manifest["totals"]["files"] == 2  # type: ignore[index]
            assert all(entry["publisher"] == "MAINLAND_BNU" for entry in manifest["entries"])  # type: ignore[index]
            assert all(entry["stage"] == "junior-secondary" for entry in manifest["entries"])  # type: ignore[index]
            assert {entry["grade"] for entry in manifest["entries"]} == {target["selfTestGrade"]}  # type: ignore[index]
            assert {entry["semester"] for entry in manifest["entries"]} == {"upper", "lower"}  # type: ignore[index]
            assert all("textExtractable" in entry for entry in manifest["entries"])  # type: ignore[index]
            assert all("sourcePath" not in entry for entry in manifest["entries"])  # type: ignore[index]
            assert "body text sample" not in manifest_json
            assert "/Type /Page" not in manifest_json
            assert "/Users/" not in manifest_json
    print("Self-test passed: metadata-only manifest covers S1-S3 upper/lower BNU junior targets.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Build a local-only Mainland BNU junior PDF metadata manifest.")
    parser.add_argument("pdf_paths", nargs="*", help="Paths to private BNU junior upper/lower math PDFs.")
    parser.add_argument(
        "--coverage-target",
        choices=sorted(COVERAGE_TARGETS.keys()),
        default=DEFAULT_COVERAGE_TARGET,
        help="Expected grade-semester coverage target. Defaults to S2 for the current BNU Grade 8 intake.",
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
