#!/usr/bin/env python3
"""Build a local-only manifest for Mainland PEP junior zhongkao archives.

The script records archive-entry metadata and coarse exam classification only.
It does not extract, persist, or print document body text, answer text, worked
solutions, OCR text, tables, figures, page images, page-level descriptions, or
source item wording. Default outputs live under `.local/`, which is ignored by
the repository.
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
from zipfile import ZipFile


DEFAULT_OUT_DIR = Path(".local/rag/mainland-pep-junior-exams")
SAFETY_NOTE = (
    "Metadata-only local artifact. Do not commit source archives, extracted "
    "document body text, answer text, worked solutions, OCR text, tables, "
    "figures, page images, page-level descriptions, source locators, or source "
    "item wording."
)
JUNIOR_GRADES = ["S1", "S2", "S3"]
SUPPORTED_EXTENSIONS = {".doc", ".docx", ".pdf"}
REGION_MARKERS = [
    "北京",
    "上海",
    "天津",
    "重庆",
    "河北",
    "山西",
    "内蒙古",
    "辽宁",
    "吉林",
    "黑龙江",
    "江苏",
    "浙江",
    "安徽",
    "福建",
    "江西",
    "山东",
    "河南",
    "湖北",
    "湖南",
    "广东",
    "广西",
    "海南",
    "四川",
    "贵州",
    "云南",
    "西藏",
    "陕西",
    "甘肃",
    "青海",
    "宁夏",
    "新疆",
    "广州",
    "深圳",
    "苏州",
    "南京",
    "杭州",
    "成都",
    "武汉",
    "长沙",
    "西安",
]


def decode_zip_name(name: str) -> str:
    decoded = name
    try:
        decoded = name.encode("cp437").decode("gb18030")
    except UnicodeError:
        try:
            decoded = name.encode("cp437").decode("utf-8")
        except UnicodeError:
            decoded = name

    if any(marker in decoded for marker in ["銆", "骞", "绾", "涓", "瀛"]):
        try:
            decoded = decoded.encode("gb18030").decode("utf-8")
        except UnicodeError:
            pass
    return decoded


def is_ignored_entry(decoded_name: str) -> bool:
    parts = decoded_name.split("/")
    basename = parts[-1] if parts else decoded_name
    return (
        decoded_name.startswith("__MACOSX/")
        or "/__MACOSX/" in decoded_name
        or basename == ".DS_Store"
        or basename.startswith("._")
    )


def sha256_for_path(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def sha256_for_zip_entry(archive: ZipFile, info) -> str:
    digest = hashlib.sha256()
    with archive.open(info) as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def year_for(name: str) -> str:
    match = re.search(r"20\d{2}", name)
    return match.group(0) if match else "unknown"


def region_families_for(name: str) -> list[str]:
    return [marker for marker in REGION_MARKERS if marker in name]


def source_role_for(name: str, is_dir: bool) -> str:
    if is_dir:
        return "directory"
    if any(marker in name for marker in ["答案解析", "解析答案", "答案详解", "详解答案"]):
        return "answer-solution"
    if any(marker in name for marker in ["解析", "详解", "讲评"]):
        return "solution"
    if "答案" in name:
        return "answer"
    if any(marker in name for marker in ["真题", "试卷", "试题", "数学"]):
        return "paper"
    return "document"


def classify_entry(decoded_name: str, is_dir: bool) -> dict[str, object]:
    basename = decoded_name.rstrip("/").rsplit("/", 1)[-1]
    extension = "" if is_dir else Path(basename).suffix.lower()
    return {
        "stage": "junior-secondary",
        "grades": JUNIOR_GRADES,
        "semester": "full-year",
        "sourceKind": "zhongkao-archive-entry",
        "year": year_for(decoded_name),
        "examFamilies": region_families_for(decoded_name),
        "sourceRole": source_role_for(decoded_name, is_dir),
        "extension": extension,
        "supportedDocumentExtension": bool(extension in SUPPORTED_EXTENSIONS),
    }


def manifest_entries_for_archive(zip_path: Path) -> list[dict[str, object]]:
    entries = []
    archive_hash = sha256_for_path(zip_path)
    with ZipFile(zip_path) as archive:
        for info in archive.infolist():
            decoded_name = decode_zip_name(info.filename)
            if is_ignored_entry(decoded_name):
                continue

            is_dir = decoded_name.endswith("/")
            classification = classify_entry(decoded_name, is_dir)
            entry_hash = None if is_dir else sha256_for_zip_entry(archive, info)
            entries.append({
                "id": f"pep-junior-exam-{classification['year']}-{hashlib.sha1((zip_path.name + decoded_name).encode('utf-8')).hexdigest()[:10]}",
                "publisher": "MAINLAND_PEP",
                "sourceArchive": str(zip_path),
                "sourceArchiveName": zip_path.name,
                "sourceArchiveSha256": archive_hash,
                "entryPath": decoded_name,
                "fileName": decoded_name.rstrip("/").rsplit("/", 1)[-1],
                "sizeBytes": info.file_size,
                "compressedBytes": info.compress_size,
                "sha256": entry_hash,
                "retentionPolicy": "metadata-only-local",
                "bodyTextPersisted": False,
                "answerTextPersisted": False,
                "workedSolutionTextPersisted": False,
                "ocrTextPersisted": False,
                "pageImagesPersisted": False,
                "sourceLocatorsPersisted": False,
                "safetyNote": SAFETY_NOTE,
                **classification,
            })
    return entries


def count_by(entries: list[dict[str, object]], field: str) -> dict[str, int]:
    return dict(sorted(Counter(str(entry.get(field) or "unknown") for entry in entries).items()))


def family_counts(entries: list[dict[str, object]]) -> dict[str, int]:
    counts: Counter[str] = Counter()
    for entry in entries:
        families = entry.get("examFamilies")
        if isinstance(families, list) and families:
            counts.update(str(family) for family in families)
        else:
            counts["unknown"] += 1
    return dict(sorted(counts.items()))


def coverage(entries: list[dict[str, object]]) -> dict[str, object]:
    files = [entry for entry in entries if entry["sourceRole"] != "directory"]
    year_counts = count_by(files, "year")
    extension_counts = count_by(files, "extension")
    return {
        "gradeScope": JUNIOR_GRADES,
        "semesterScope": "full-year",
        "yearCounts": year_counts,
        "yearsCovered": [year for year, count in year_counts.items() if year != "unknown" and count > 0],
        "expectedYearRange": "2021-2025",
        "expectedYearsComplete": all(str(year) in year_counts for year in range(2021, 2026)),
        "extensionCounts": extension_counts,
        "supportedExtensionComplete": all(extension in SUPPORTED_EXTENSIONS for extension in extension_counts if extension),
    }


def build_manifest(zip_paths: list[Path]) -> dict[str, object]:
    resolved_paths = [path.expanduser().resolve() for path in zip_paths]
    entries: list[dict[str, object]] = []
    for zip_path in resolved_paths:
        if not zip_path.exists():
            raise FileNotFoundError(f"Archive not found: {zip_path}")
        entries.extend(manifest_entries_for_archive(zip_path))

    files = [entry for entry in entries if entry["sourceRole"] != "directory"]
    return {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "publisher": "MAINLAND_PEP",
        "stage": "junior-secondary",
        "artifactKind": "metadata-only-junior-zhongkao-archive-manifest",
        "safetyNote": SAFETY_NOTE,
        "sourceArchives": [str(path) for path in resolved_paths],
        "coverage": coverage(entries),
        "totals": {
            "archives": len(resolved_paths),
            "entries": len(entries),
            "files": len(files),
            "directories": len(entries) - len(files),
            "uncompressedBytes": sum(int(entry["sizeBytes"]) for entry in files),
        },
        "yearCounts": count_by(files, "year"),
        "sourceRoleCounts": count_by(files, "sourceRole"),
        "extensionCounts": count_by(files, "extension"),
        "examFamilyCounts": family_counts(files),
        "entries": entries,
    }


def qa_report(manifest: dict[str, object]) -> str:
    totals = manifest["totals"]  # type: ignore[index]
    coverage_info = manifest["coverage"]  # type: ignore[index]
    return "\n".join([
        "# Mainland PEP Junior Zhongkao Archive Manifest QA",
        "",
        f"- Generated at: {manifest['generatedAt']}",
        f"- Publisher: {manifest['publisher']}",
        f"- Stage: {manifest['stage']}",
        f"- Archives inspected: {totals['archives']}",
        f"- Files inspected: {totals['files']}",
        f"- Directories inspected: {totals['directories']}",
        f"- Total uncompressed bytes: {totals['uncompressedBytes']}",
        f"- Grade scope: {json.dumps(coverage_info['gradeScope'], ensure_ascii=False)}",
        f"- Semester scope: {coverage_info['semesterScope']}",
        f"- Year counts: {json.dumps(manifest['yearCounts'], ensure_ascii=False)}",
        f"- Expected 2021-2025 coverage complete: {coverage_info['expectedYearsComplete']}",
        f"- Source role counts: {json.dumps(manifest['sourceRoleCounts'], ensure_ascii=False)}",
        f"- Extension counts: {json.dumps(manifest['extensionCounts'], ensure_ascii=False)}",
        f"- Exam family counts: {json.dumps(manifest['examFamilyCounts'], ensure_ascii=False)}",
        f"- Safety note: {SAFETY_NOTE}",
        "",
        "## Safety Gate",
        "",
        "- Passed: manifest entries contain archive-entry metadata, hashes, year, coarse role, extension, region-family signal, size, and S1-S3 cumulative scope only.",
        "- Passed: no document body text, source item wording, worked solution text, tables, figures, page content, page images, source locators, or OCR text are extracted or persisted.",
        "- Required before production use: S18 manual sampling of safe abstraction cards and any generated student-facing output for source distance, math correctness, terminology, and grade fit.",
        "",
    ]) + "\n"


def write_outputs(manifest: dict[str, object], out_dir: Path) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (out_dir / "qa-report.md").write_text(qa_report(manifest), encoding="utf-8")


def run_self_test() -> None:
    with TemporaryDirectory() as tmp:
        tmp_dir = Path(tmp)
        archive_path = tmp_dir / "中考真题样本.zip"
        with ZipFile(archive_path, "w") as archive:
            archive.writestr("__MACOSX/._ignored.docx", b"ignored")
            archive.writestr("中考真题/2021中考数学真题/2021北京/2021北京中考数学真题.docx", b"fake paper bytes")
            archive.writestr("中考真题/2022中考数学真题/2022上海/2022上海中考数学答案解析.doc", b"fake solution bytes")
            archive.writestr("中考真题/2023中考数学真题/2023广东/2023广东数学试卷.pdf", b"%PDF fake")
            archive.writestr("中考真题/2024中考数学真题/2024浙江/2024浙江数学答案详解.docx", b"fake answer bytes")
            archive.writestr("中考真题/2025中考数学真题/2025江苏/2025江苏数学真题.docx", b"fake paper bytes")
        manifest = build_manifest([archive_path])
        serialized = json.dumps(manifest, ensure_ascii=False)
        assert manifest["totals"]["files"] == 5  # type: ignore[index]
        assert manifest["coverage"]["expectedYearsComplete"] is True  # type: ignore[index]
        assert manifest["sourceRoleCounts"]["paper"] == 3  # type: ignore[index]
        assert manifest["sourceRoleCounts"]["answer-solution"] == 2  # type: ignore[index]
        assert manifest["extensionCounts"][".docx"] == 3  # type: ignore[index]
        assert "fake paper bytes" not in serialized
        assert "fake solution bytes" not in serialized
        assert "%PDF fake" not in serialized
        assert "source item wording sample" not in serialized
    print("Self-test passed: metadata-only junior zhongkao archive manifest built without content extraction.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Build a local-only Mainland PEP junior zhongkao archive metadata manifest.")
    parser.add_argument("zip_paths", nargs="*", help="Paths to private junior zhongkao ZIP archives.")
    parser.add_argument("--out-dir", default=str(DEFAULT_OUT_DIR), help="Output directory. Defaults to ignored .local/rag/.")
    parser.add_argument("--self-test", action="store_true", help="Run a metadata-only smoke test with a temporary fake ZIP archive.")
    args = parser.parse_args()

    if args.self_test:
        run_self_test()
        return

    if not args.zip_paths:
        raise SystemExit("At least one ZIP path is required unless --self-test is used.")

    manifest = build_manifest([Path(path) for path in args.zip_paths])
    write_outputs(manifest, Path(args.out_dir).expanduser())
    print(f"Wrote {manifest['totals']['files']} metadata-only junior zhongkao archive file entries to {args.out_dir}")


if __name__ == "__main__":
    main()
