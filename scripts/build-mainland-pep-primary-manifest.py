#!/usr/bin/env python3
"""Build a local-only metadata manifest for Mainland PEP primary math PDFs.

The script records coarse file metadata only. It does not extract, persist, or
print PDF body text, OCR text, answers, tables, illustrations, page images, or
page-level descriptions. Default outputs live under `.local/`, which is ignored
by the repository.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from tempfile import TemporaryDirectory


DEFAULT_OUT_DIR = Path(".local/rag/mainland-pep-primary")
SAFETY_NOTE = (
    "Metadata-only local artifact. Do not commit source PDFs, extracted PDF "
    "body text, OCR text, exercises, worked examples, answers, tables, figures, "
    "page images, or page-level descriptions."
)

EXPECTED_COVERAGE = [(f"P{grade}", semester) for grade in range(1, 7) for semester in ("upper", "lower")]
GRADE_MARKERS = [
    ("P1", ["一年级", "1年级", "一上", "一下", "P1", "p1", "一年級"]),
    ("P2", ["二年级", "2年级", "二上", "二下", "P2", "p2", "二年級"]),
    ("P3", ["三年级", "3年级", "三上", "三下", "P3", "p3", "三年級"]),
    ("P4", ["四年级", "4年级", "四上", "四下", "P4", "p4", "四年級"]),
    ("P5", ["五年级", "5年级", "五上", "五下", "P5", "p5", "五年級"]),
    ("P6", ["六年级", "6年级", "六上", "六下", "P6", "p6", "六年級"]),
]


def sha256_for_path(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def count_pdf_pages(path: Path) -> tuple[int | None, str]:
    try:
        data = path.read_bytes()
    except OSError:
        return None, "unreadable"

    page_markers = re.findall(rb"/Type\s*/Page\b", data)
    if page_markers:
        return len(page_markers), "available"
    return None, "missing"


def infer_grade(path: Path) -> str:
    searchable = path.name
    for grade, markers in GRADE_MARKERS:
        if any(marker in searchable for marker in markers):
            return grade
    return "unknown"


def infer_semester(path: Path) -> str:
    name = path.name
    if any(marker in name for marker in ["上册", "上冊", "上学期", "上學期", "一上", "二上", "三上", "四上", "五上", "六上", "upper"]):
        return "upper"
    if any(marker in name for marker in ["下册", "下冊", "下学期", "下學期", "一下", "二下", "三下", "四下", "五下", "六下", "lower"]):
        return "lower"
    return "unknown"


def infer_version_season(path: Path) -> str:
    name = path.name
    year_match = re.search(r"(20\d{2})", name)
    season = None
    if any(marker in name for marker in ["春", "春季", "spring"]):
        season = "spring"
    elif any(marker in name for marker in ["秋", "秋季", "autumn", "fall"]):
        season = "autumn"
    if year_match and season:
        return f"{year_match.group(1)}-{season}"
    if year_match:
        return year_match.group(1)
    if season:
        return season
    return "unknown"


def manifest_entry(path: Path) -> dict[str, object]:
    resolved = path.expanduser().resolve()
    if not resolved.exists():
        raise FileNotFoundError(f"PDF not found: {resolved}")
    if resolved.suffix.lower() != ".pdf":
        raise ValueError(f"Expected a PDF path: {resolved}")

    pages, page_status = count_pdf_pages(resolved)
    grade = infer_grade(resolved)
    semester = infer_semester(resolved)
    return {
        "id": f"pep-primary-{grade.lower()}-{semester}-{hashlib.sha1(str(resolved).encode('utf-8')).hexdigest()[:10]}",
        "publisher": "MAINLAND_PEP",
        "stage": "primary",
        "grade": grade,
        "semester": semester,
        "versionSeason": infer_version_season(resolved),
        "sourcePath": str(resolved),
        "fileName": resolved.name,
        "extension": resolved.suffix.lower(),
        "sizeBytes": resolved.stat().st_size,
        "sha256": sha256_for_path(resolved),
        "pageCount": pages,
        "pageCountStatus": page_status,
        "retentionPolicy": "metadata-only-local",
        "bodyTextPersisted": False,
        "ocrTextPersisted": False,
        "pageImagesPersisted": False,
        "safetyNote": SAFETY_NOTE
    }


def coverage(entries: list[dict[str, object]]) -> dict[str, object]:
    observed = {(str(entry["grade"]), str(entry["semester"])) for entry in entries}
    missing = [{"grade": grade, "semester": semester} for grade, semester in EXPECTED_COVERAGE if (grade, semester) not in observed]
    duplicates: list[dict[str, object]] = []
    for grade, semester in EXPECTED_COVERAGE:
        count = sum(1 for entry in entries if entry["grade"] == grade and entry["semester"] == semester)
        if count > 1:
            duplicates.append({"grade": grade, "semester": semester, "count": count})
    return {
        "expectedFiles": 12,
        "observedFiles": len(entries),
        "completeP1ToP6UpperLower": len(missing) == 0 and len(entries) == 12,
        "missing": missing,
        "duplicates": duplicates
    }


def build_manifest(pdf_paths: list[Path]) -> dict[str, object]:
    entries = [manifest_entry(path) for path in pdf_paths]
    return {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "publisher": "MAINLAND_PEP",
        "stage": "primary",
        "artifactKind": "metadata-only-pdf-manifest",
        "safetyNote": SAFETY_NOTE,
        "coverage": coverage(entries),
        "totals": {
            "files": len(entries),
            "bytes": sum(int(entry["sizeBytes"]) for entry in entries),
            "pagesKnown": sum(1 for entry in entries if entry["pageCountStatus"] == "available"),
            "pagesMissing": sum(1 for entry in entries if entry["pageCountStatus"] != "available")
        },
        "entries": entries
    }


def qa_report(manifest: dict[str, object]) -> str:
    coverage_info = manifest["coverage"]  # type: ignore[index]
    totals = manifest["totals"]  # type: ignore[index]
    return "\n".join([
        "# Mainland PEP Primary PDF Manifest QA",
        "",
        f"- Generated at: {manifest['generatedAt']}",
        f"- Publisher: {manifest['publisher']}",
        f"- Files inspected: {totals['files']}",
        f"- Total bytes: {totals['bytes']}",
        f"- Page counts available: {totals['pagesKnown']}",
        f"- Page counts missing: {totals['pagesMissing']}",
        f"- Complete P1-P6 upper/lower coverage: {coverage_info['completeP1ToP6UpperLower']}",
        f"- Missing grade-semester slots: {json.dumps(coverage_info['missing'], ensure_ascii=False)}",
        f"- Duplicate grade-semester slots: {json.dumps(coverage_info['duplicates'], ensure_ascii=False)}",
        f"- Safety note: {SAFETY_NOTE}",
        "",
        "## Safety Gate",
        "",
        "- Passed: manifest entries contain file metadata, hashes, grade, semester, version-season signal, size, and page-count status only.",
        "- Passed: no PDF body text, OCR text, exercises, answers, tables, figure descriptions, or page images are extracted or persisted.",
        "- Required before production use: S18 manual sampling of generated safe cards and any future content-generation output.",
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
        chinese_grades = ["一年级", "二年级", "三年级", "四年级", "五年级", "六年级"]
        for index, grade_name in enumerate(chinese_grades, start=1):
            for semester_name in ["上册", "下册"]:
                path = tmp_dir / f"人教版小学数学{grade_name}{semester_name}2024秋.pdf"
                path.write_bytes(fake_pdf_bytes(page_count=index + 2))
                paths.append(path)
        manifest = build_manifest(paths)
        manifest_json = json.dumps(manifest, ensure_ascii=False)
        assert manifest["coverage"]["completeP1ToP6UpperLower"] is True  # type: ignore[index]
        assert manifest["totals"]["files"] == 12  # type: ignore[index]
        assert all(entry["sha256"] for entry in manifest["entries"])  # type: ignore[index]
        assert "body text sample" not in manifest_json
        assert "/Type /Page" not in manifest_json
    print("Self-test passed: metadata-only manifest covers 12 P1-P6 upper/lower PDFs.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Build a local-only Mainland PEP primary PDF metadata manifest.")
    parser.add_argument("pdf_paths", nargs="*", help="Paths to the 12 private P1-P6 upper/lower PEP primary math PDFs.")
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
