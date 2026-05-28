#!/usr/bin/env python3
"""Build a local-only metadata manifest for Mainland HJB junior math PDFs.

The script records coarse file metadata only. It does not extract, persist, or
print PDF body text, OCR text, exercises, worked examples, keys, answers,
tables, illustrations, page images, page descriptions, source locators, or
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


DEFAULT_OUT_DIR = Path(".local/rag/mainland-hjb-junior")
SAFETY_NOTE = (
    "Metadata-only local artifact. Do not commit source PDFs, extracted PDF "
    "body text, OCR text, exercises, worked examples, keys, answers, tables, "
    "figures, page images, source locators, page-level descriptions, or "
    "embedding payloads."
)

EXPECTED_COVERAGE = [(f"S{grade}", semester) for grade in range(1, 4) for semester in ("upper", "lower")]
S2_S3_COVERAGE = [(f"S{grade}", semester) for grade in range(2, 4) for semester in ("upper", "lower")]
GRADE_MARKERS = [
    ("S1", ["七年级", "7年级", "七上", "七下", "初一", "S1", "s1", "七年級"]),
    ("S2", ["八年级", "8年级", "八上", "八下", "初二", "S2", "s2", "八年級"]),
    ("S3", ["九年级", "9年级", "九上", "九下", "初三", "S3", "s3", "九年級"]),
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


def manifest_entry(path: Path) -> dict[str, object]:
    resolved = path.expanduser().resolve()
    if not resolved.exists():
        raise FileNotFoundError(f"PDF not found: {resolved}")
    if resolved.suffix.lower() != ".pdf":
        raise ValueError(f"Expected a PDF path: {resolved}")

    digest = sha256_for_path(resolved)
    pages, page_status = count_pdf_pages(resolved)
    grade = infer_grade(resolved)
    semester = infer_semester(resolved)
    return {
        "id": f"hjb-junior-{grade.lower()}-{semester}-{digest[:10]}",
        "publisher": "MAINLAND_HJB",
        "stage": "junior-secondary",
        "grade": grade,
        "semester": semester,
        "fileName": resolved.name,
        "extension": resolved.suffix.lower(),
        "sizeBytes": resolved.stat().st_size,
        "sha256": digest,
        "pageCount": pages,
        "pageCountStatus": page_status,
        "retentionPolicy": "metadata-only-local",
        "bodyTextPersisted": False,
        "ocrTextPersisted": False,
        "pageImagesPersisted": False,
        "sourceLocatorsPersisted": False,
        "safetyNote": SAFETY_NOTE,
    }


def coverage(entries: list[dict[str, object]]) -> dict[str, object]:
    observed = {(str(entry["grade"]), str(entry["semester"])) for entry in entries}
    missing = [{"grade": grade, "semester": semester} for grade, semester in EXPECTED_COVERAGE if (grade, semester) not in observed]
    missing_s2_s3 = [{"grade": grade, "semester": semester} for grade, semester in S2_S3_COVERAGE if (grade, semester) not in observed]
    duplicates: list[dict[str, object]] = []
    for grade, semester in EXPECTED_COVERAGE:
        count = sum(1 for entry in entries if entry["grade"] == grade and entry["semester"] == semester)
        if count > 1:
            duplicates.append({"grade": grade, "semester": semester, "count": count})
    return {
        "expectedFiles": len(EXPECTED_COVERAGE),
        "observedFiles": len(entries),
        "completeS1UpperLower": all(slot in observed for slot in [("S1", "upper"), ("S1", "lower")]),
        "completeS2S3UpperLower": len(missing_s2_s3) == 0,
        "completeS1ToS3UpperLower": len(missing) == 0 and len(entries) == len(EXPECTED_COVERAGE),
        "missing": missing,
        "missingS2S3": missing_s2_s3,
        "duplicates": duplicates,
    }


def build_manifest(pdf_paths: list[Path]) -> dict[str, object]:
    entries = [manifest_entry(path) for path in pdf_paths]
    return {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "publisher": "MAINLAND_HJB",
        "stage": "junior-secondary",
        "artifactKind": "metadata-only-pdf-manifest",
        "safetyNote": SAFETY_NOTE,
        "coverage": coverage(entries),
        "totals": {
            "files": len(entries),
            "bytes": sum(int(entry["sizeBytes"]) for entry in entries),
            "pagesKnown": sum(1 for entry in entries if entry["pageCountStatus"] == "available"),
            "pagesMissing": sum(1 for entry in entries if entry["pageCountStatus"] != "available"),
        },
        "entries": entries,
    }


def qa_report(manifest: dict[str, object]) -> str:
    coverage_info = manifest["coverage"]  # type: ignore[index]
    totals = manifest["totals"]  # type: ignore[index]
    return "\n".join([
        "# Mainland HJB Junior PDF Manifest QA",
        "",
        f"- Generated at: {manifest['generatedAt']}",
        f"- Publisher: {manifest['publisher']}",
        f"- Stage: {manifest['stage']}",
        f"- Files inspected: {totals['files']}",
        f"- Total bytes: {totals['bytes']}",
        f"- Page counts available: {totals['pagesKnown']}",
        f"- Page counts missing: {totals['pagesMissing']}",
        f"- Complete S1 upper/lower coverage: {coverage_info['completeS1UpperLower']}",
        f"- Complete S2-S3 upper/lower coverage: {coverage_info['completeS2S3UpperLower']}",
        f"- Complete S1-S3 upper/lower coverage: {coverage_info['completeS1ToS3UpperLower']}",
        f"- Missing grade-semester slots: {json.dumps(coverage_info['missing'], ensure_ascii=False)}",
        f"- Missing S2-S3 grade-semester slots: {json.dumps(coverage_info['missingS2S3'], ensure_ascii=False)}",
        f"- Duplicate grade-semester slots: {json.dumps(coverage_info['duplicates'], ensure_ascii=False)}",
        f"- Safety note: {SAFETY_NOTE}",
        "",
        "## Safety Gate",
        "",
        "- Passed: manifest entries contain file metadata, hashes, grade, semester, size, and page-count status only.",
        "- Passed: source paths, PDF body text, OCR text, exercises, keys, answers, tables, figure descriptions, page images, source locators, page-level descriptions, and embedding payloads are not extracted or persisted.",
        "- Required before production use: S18 manual sampling of safe cards and any future generated student-facing output.",
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
        for grade_name in ["七年级", "八年级", "九年级"]:
            for semester_name in ["上册", "下册"]:
                path = tmp_dir / f"沪教版五四制数学{grade_name}{semester_name}2024.pdf"
                path.write_bytes(fake_pdf_bytes(page_count=12))
                paths.append(path)
        manifest = build_manifest(paths)
        manifest_json = json.dumps(manifest, ensure_ascii=False)
        assert manifest["coverage"]["completeS1UpperLower"] is True  # type: ignore[index]
        assert manifest["coverage"]["completeS2S3UpperLower"] is True  # type: ignore[index]
        assert manifest["coverage"]["completeS1ToS3UpperLower"] is True  # type: ignore[index]
        assert manifest["totals"]["files"] == 6  # type: ignore[index]
        assert all(entry["publisher"] == "MAINLAND_HJB" for entry in manifest["entries"])  # type: ignore[index]
        assert all(entry["stage"] == "junior-secondary" for entry in manifest["entries"])  # type: ignore[index]
        assert all("sourcePath" not in entry for entry in manifest["entries"])  # type: ignore[index]
        assert "body text sample" not in manifest_json
        assert "/Type /Page" not in manifest_json
    print("Self-test passed: metadata-only manifest covers S1-S3 upper/lower HJB junior PDFs.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Build a local-only Mainland HJB junior PDF metadata manifest.")
    parser.add_argument("pdf_paths", nargs="*", help="Paths to private S1-S3 upper/lower HJB junior math PDFs.")
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
