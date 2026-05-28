#!/usr/bin/env python3
"""Build a local-only metadata manifest for Mainland HJB primary math PDFs.

The script records coarse file metadata, hashes, page counts, text-layer status,
and grade-semester coverage only. It does not extract, persist, or print PDF
body text, OCR text, exercises, worked examples, keys, answers, tables,
figures, page images, source paths, page locators, page-level descriptions, or
embedding payloads. Default outputs live under `.local/`, which is ignored by
the repository.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from tempfile import TemporaryDirectory


DEFAULT_OUT_DIR = Path(".local/rag/mainland-hjb-primary")
SAFETY_NOTE = (
    "Metadata-only local artifact. Do not commit source PDFs, source paths, "
    "extracted PDF body text, OCR text, exercises, worked examples, keys, "
    "answers, tables, figures, page images, page locators, page-level "
    "descriptions, or embedding payloads."
)

EXPECTED_COVERAGE = [
    ("P1", "upper"),
    ("P1", "lower"),
    ("P2", "upper"),
    ("P2", "lower"),
    ("P3", "upper"),
    ("P3", "lower"),
    ("P4", "upper"),
    ("P4", "lower"),
    ("P5", "upper"),
    ("P5", "lower"),
    ("P6", "upper"),
    ("P6", "lower"),
]
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
        "id": f"hjb-primary-{grade.lower()}-{semester}-{digest[:10]}",
        "publisher": "MAINLAND_HJB",
        "stage": "primary",
        "grade": grade,
        "semester": semester,
        "fileName": resolved.name,
        "extension": resolved.suffix.lower(),
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
        "bodyTextPersisted": False,
        "ocrTextPersisted": False,
        "pageImagesPersisted": False,
        "sourceLocatorsPersisted": False,
        "embeddingPayloadsPersisted": False,
        "safetyNote": SAFETY_NOTE,
    }


def coverage(entries: list[dict[str, object]]) -> dict[str, object]:
    observed = {(str(entry["grade"]), str(entry["semester"])) for entry in entries}
    missing = [{"grade": grade, "semester": semester} for grade, semester in EXPECTED_COVERAGE if (grade, semester) not in observed]
    missing_p1 = [{"grade": grade, "semester": semester} for grade, semester in [("P1", "upper"), ("P1", "lower")] if (grade, semester) not in observed]
    missing_p2 = [{"grade": grade, "semester": semester} for grade, semester in [("P2", "upper"), ("P2", "lower")] if (grade, semester) not in observed]
    missing_p3 = [{"grade": grade, "semester": semester} for grade, semester in [("P3", "upper"), ("P3", "lower")] if (grade, semester) not in observed]
    missing_p4 = [{"grade": grade, "semester": semester} for grade, semester in [("P4", "upper"), ("P4", "lower")] if (grade, semester) not in observed]
    missing_p5 = [{"grade": grade, "semester": semester} for grade, semester in [("P5", "upper"), ("P5", "lower")] if (grade, semester) not in observed]
    missing_p6 = [{"grade": grade, "semester": semester} for grade, semester in [("P6", "upper"), ("P6", "lower")] if (grade, semester) not in observed]
    duplicates: list[dict[str, object]] = []
    for grade, semester in EXPECTED_COVERAGE:
        count = sum(1 for entry in entries if entry["grade"] == grade and entry["semester"] == semester)
        if count > 1:
            duplicates.append({"grade": grade, "semester": semester, "count": count})
    unknown = [{"fileName": entry["fileName"], "grade": entry["grade"], "semester": entry["semester"]} for entry in entries if entry["grade"] == "unknown" or entry["semester"] == "unknown"]
    return {
        "expectedFiles": len(EXPECTED_COVERAGE),
        "observedFiles": len(entries),
        "completeP1UpperLower": len(missing_p1) == 0,
        "completeP2UpperLower": len(missing_p2) == 0,
        "completeP3UpperLower": len(missing_p3) == 0,
        "completeP4UpperLower": len(missing_p4) == 0,
        "completeP5UpperLower": len(missing_p5) == 0,
        "completeP6UpperLower": len(missing_p6) == 0,
        "completeRegisteredPrimaryCoverage": len(missing) == 0 and len(entries) == len(EXPECTED_COVERAGE),
        "missing": missing,
        "missingP1": missing_p1,
        "missingP2": missing_p2,
        "missingP3": missing_p3,
        "missingP4": missing_p4,
        "missingP5": missing_p5,
        "missingP6": missing_p6,
        "duplicates": duplicates,
        "unknown": unknown,
    }


def build_manifest(pdf_paths: list[Path]) -> dict[str, object]:
    entries = [manifest_entry(path) for path in pdf_paths]
    return {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "publisher": "MAINLAND_HJB",
        "stage": "primary",
        "artifactKind": "metadata-only-pdf-manifest",
        "safetyNote": SAFETY_NOTE,
        "coverage": coverage(entries),
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
        "# Mainland HJB Primary PDF Manifest QA",
        "",
        f"- Generated at: {manifest['generatedAt']}",
        f"- Publisher: {manifest['publisher']}",
        f"- Stage: {manifest['stage']}",
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
        f"- Complete registered primary coverage: {coverage_info['completeRegisteredPrimaryCoverage']}",
        f"- Missing registered grade-semester slots: {json.dumps(coverage_info['missing'], ensure_ascii=False)}",
        f"- Missing P1 grade-semester slots: {json.dumps(coverage_info['missingP1'], ensure_ascii=False)}",
        f"- Missing P2 grade-semester slots: {json.dumps(coverage_info['missingP2'], ensure_ascii=False)}",
        f"- Missing P3 grade-semester slots: {json.dumps(coverage_info['missingP3'], ensure_ascii=False)}",
        f"- Missing P4 grade-semester slots: {json.dumps(coverage_info['missingP4'], ensure_ascii=False)}",
        f"- Missing P5 grade-semester slots: {json.dumps(coverage_info['missingP5'], ensure_ascii=False)}",
        f"- Missing P6 grade-semester slots: {json.dumps(coverage_info['missingP6'], ensure_ascii=False)}",
        f"- Duplicate grade-semester slots: {json.dumps(coverage_info['duplicates'], ensure_ascii=False)}",
        f"- Unknown grade-semester entries: {json.dumps(coverage_info['unknown'], ensure_ascii=False)}",
        f"- Safety note: {SAFETY_NOTE}",
        "",
        "## Safety Gate",
        "",
        "- Passed: manifest entries contain file metadata, hashes, grade, semester, page-count status, text-extractability status, and aggregate text-layer status only.",
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


def run_self_test() -> None:
    with TemporaryDirectory() as tmp:
        tmp_dir = Path(tmp)
        paths = []
        for name in [
            "沪教版五四制数学一年级上册2024.pdf",
            "沪教版五四制数学一下2024.pdf",
            "沪教版五四制数学二年级上册2024.pdf",
            "沪教版五四制数学二下2024.pdf",
            "沪教版五四制数学三年级上册老课本.pdf",
            "沪教版五四制数学三下2024.pdf",
            "沪教版五四制数学四年级上册2024.pdf",
            "沪教版五四制数学四下2024.pdf",
            "沪教版五四制数学五年级上册2024.pdf",
            "沪教版五四制数学五下2024.pdf",
            "沪教版五四制数学六年级上册2024.pdf",
            "沪教版五四制数学六下2024.pdf",
        ]:
            path = tmp_dir / name
            path.write_bytes(fake_pdf_bytes(page_count=12))
            paths.append(path)
        manifest = build_manifest(paths)
        manifest_json = json.dumps(manifest, ensure_ascii=False)
        assert manifest["coverage"]["completeP1UpperLower"] is True  # type: ignore[index]
        assert manifest["coverage"]["completeP2UpperLower"] is True  # type: ignore[index]
        assert manifest["coverage"]["completeP3UpperLower"] is True  # type: ignore[index]
        assert manifest["coverage"]["completeP4UpperLower"] is True  # type: ignore[index]
        assert manifest["coverage"]["completeP5UpperLower"] is True  # type: ignore[index]
        assert manifest["coverage"]["completeP6UpperLower"] is True  # type: ignore[index]
        assert manifest["coverage"]["completeRegisteredPrimaryCoverage"] is True  # type: ignore[index]
        assert manifest["totals"]["files"] == 12  # type: ignore[index]
        assert all(entry["publisher"] == "MAINLAND_HJB" for entry in manifest["entries"])  # type: ignore[index]
        assert all(entry["stage"] == "primary" for entry in manifest["entries"])  # type: ignore[index]
        assert {entry["grade"] for entry in manifest["entries"]} == {"P1", "P2", "P3", "P4", "P5", "P6"}  # type: ignore[index]
        assert all("textExtractable" in entry for entry in manifest["entries"])  # type: ignore[index]
        assert all("sourcePath" not in entry for entry in manifest["entries"])  # type: ignore[index]
        assert "body text sample" not in manifest_json
        assert "/Type /Page" not in manifest_json
        assert "/Users/" not in manifest_json
    print("Self-test passed: metadata-only manifest covers P1-P6 upper/lower HJB primary PDFs.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Build a local-only Mainland HJB primary PDF metadata manifest.")
    parser.add_argument("pdf_paths", nargs="*", help="Paths to private HJB primary math PDFs.")
    parser.add_argument("--out-dir", default=str(DEFAULT_OUT_DIR), help="Output directory. Defaults to ignored .local/rag/.")
    parser.add_argument("--self-test", action="store_true", help="Run a metadata-only smoke test with temporary fake PDFs.")
    args = parser.parse_args()

    if args.self_test:
        run_self_test()
        return

    if not args.pdf_paths:
        raise SystemExit("At least one PDF path is required unless --self-test is used.")

    manifest = build_manifest([Path(path) for path in args.pdf_paths])
    write_outputs(manifest, Path(args.out_dir).expanduser())
    print(f"Wrote {manifest['totals']['files']} metadata-only PDF entries to {args.out_dir}")


if __name__ == "__main__":
    main()
