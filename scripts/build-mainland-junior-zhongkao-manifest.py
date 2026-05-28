#!/usr/bin/env python3
"""Build metadata-only artifacts for shared Mainland junior zhongkao archives.

The script records archive-entry metadata, hashes, coarse classification, and
dedupe status only. It does not extract, persist, or print document body text,
answer text, worked solutions, OCR text, tables, figures, page images, page
locators, archive member paths, or source item wording. Default outputs live
under `.local/`, which is ignored by the repository.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import re
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from tempfile import TemporaryDirectory
from zipfile import ZIP_DEFLATED, ZipFile


DEFAULT_OUT_DIR = Path(".local/rag/mainland-junior-zhongkao-exams")
MANIFEST_NAME = "manifest.json"
QA_REPORT_NAME = "qa-report.md"
COVERAGE_MATRIX_NAME = "coverage-matrix.csv"
SUPPORTED_EXTENSIONS = {".doc", ".docx", ".pdf"}
RECENT_SAFE_PATTERN_YEARS = {str(year) for year in range(2021, 2026)}
HISTORICAL_REFERENCE_YEARS = {str(year) for year in range(2014, 2021)}
SAFETY_NOTE = (
    "Metadata-only local artifact. Do not commit source archives, extracted "
    "document body text, answer text, worked solutions, OCR text, tables, "
    "figures, page images, page locators, archive member paths, source item "
    "wording, or embeddings."
)

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

NON_MATH_SUBJECT_MARKERS = [
    "语文",
    "英语",
    "日语",
    "物理",
    "化学",
    "生物",
    "地理",
    "历史",
    "道德",
    "政治",
    "体育",
    "美术",
    "音乐",
]


def decode_zip_name(name: str) -> str:
    try:
        raw_name = name.encode("cp437")
    except UnicodeEncodeError:
        return name

    candidates: list[str] = []
    for encoding in ("utf-8", "gb18030"):
        try:
            candidates.append(raw_name.decode(encoding))
        except UnicodeDecodeError:
            continue

    for decoded in candidates:
        if any(marker in decoded for marker in ["中考", "真题", "数学", "试卷", "答案", "解析", "全国"]):
            return decoded

    return candidates[0] if candidates else name


def is_ignored_entry(decoded_name: str) -> bool:
    parts = [part for part in decoded_name.split("/") if part]
    if "__MACOSX" in parts:
        return True
    if any(part == ".DS_Store" for part in parts):
        return True
    return any(part.startswith("._") for part in parts)


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
    match = re.search(r"20\d{2}|201[4-9]", name)
    return match.group(0) if match else "unknown"


def exam_families_for(name: str) -> list[str]:
    return [marker for marker in REGION_MARKERS if marker in name]


def source_role_for(name: str) -> str:
    if any(marker in name for marker in ["答案解析", "解析答案", "详解答案", "答案详解"]):
        return "answer-solution"
    if any(marker in name for marker in ["解析", "详解", "讲评", "解答"]):
        return "solution"
    if "答案" in name:
        return "answer"
    if any(marker in name for marker in ["真题", "试卷", "试题", "数学"]):
        return "paper"
    return "document"


def subject_for(name: str) -> str:
    if any(marker in name for marker in NON_MATH_SUBJECT_MARKERS):
        return "non-math"
    if "数学" in name or "中考" in name:
        return "math"
    return "unknown"


def stable_short_hash(value: str) -> str:
    return hashlib.sha1(value.encode("utf-8")).hexdigest()[:12]


def variant_key_for(year: str, exam_families: list[str], source_role: str, subject: str) -> str:
    family_key = "|".join(exam_families) if exam_families else "unknown-region"
    return f"{year}:{family_key}:{subject}:{source_role}"


def iter_existing_manifests(search_roots: list[Path], out_dir: Path) -> list[Path]:
    manifests: list[Path] = []
    resolved_out_dir = out_dir.resolve()
    for root in search_roots:
        if not root.exists():
            continue
        for path in root.rglob("*.json"):
            if path.resolve().is_relative_to(resolved_out_dir):
                continue
            if path.name.endswith("manifest.json") or path.name == "manifest.json" or "manifest" in path.name:
                manifests.append(path)
    return sorted(set(manifests))


def existing_indices(search_roots: list[Path], out_dir: Path) -> tuple[set[str], set[str], list[str]]:
    hashes: set[str] = set()
    variants: set[str] = set()
    used_manifests: list[str] = []

    for manifest_path in iter_existing_manifests(search_roots, out_dir):
        try:
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            continue

        entries = manifest.get("entries")
        if not isinstance(entries, list):
            continue
        used = False
        for entry in entries:
            if not isinstance(entry, dict):
                continue
            digest = entry.get("sha256") or entry.get("memberSha256") or entry.get("entrySha256")
            if isinstance(digest, str) and digest:
                hashes.add(digest)
                used = True

            year = str(entry.get("year") or "unknown")
            role = str(entry.get("sourceRole") or "document")
            families = entry.get("examFamilies")
            if isinstance(families, list) and year != "unknown":
                for family in families or ["unknown-region"]:
                    variants.add(variant_key_for(year, [str(family)], role, "math"))
                    used = True
        if used:
            used_manifests.append(str(manifest_path))

    return hashes, variants, used_manifests


def duplicate_status_for(
    *,
    entry_sha256: str,
    year: str,
    extension: str,
    subject: str,
    variant_key: str,
    existing_hashes: set[str],
    existing_variants: set[str],
    seen_hashes: set[str],
    seen_variants: set[str],
) -> tuple[str, str]:
    if extension not in SUPPORTED_EXTENSIONS:
        return "quarantine", "unsupported-extension"
    if subject != "math":
        return "quarantine", "non-math-or-unknown-subject"
    if year == "unknown":
        return "quarantine", "unknown-year"
    if entry_sha256 in existing_hashes or entry_sha256 in seen_hashes:
        return "skip_exact_duplicate", ""
    if variant_key in existing_variants or variant_key in seen_variants:
        return "same_exam_variant", ""
    if year in HISTORICAL_REFERENCE_YEARS:
        return "historical_reference", ""
    if year in RECENT_SAFE_PATTERN_YEARS:
        return "covered_by_existing_card", ""
    return "quarantine", "outside-supported-year-range"


def manifest_entries_for_archive(
    zip_path: Path,
    existing_hashes: set[str],
    existing_variants: set[str],
) -> tuple[list[dict[str, object]], Counter[str], Counter[str]]:
    entries: list[dict[str, object]] = []
    seen_hashes: set[str] = set()
    seen_variants: set[str] = set()
    ignored_counts: Counter[str] = Counter()
    unsupported_counts: Counter[str] = Counter()
    archive_hash = sha256_for_path(zip_path)

    with ZipFile(zip_path) as archive:
        for info in archive.infolist():
            decoded_name = decode_zip_name(info.filename)
            if is_ignored_entry(decoded_name):
                ignored_counts["hidden_or_macos_metadata"] += 1
                continue
            if decoded_name.endswith("/"):
                ignored_counts["directory"] += 1
                continue

            extension = Path(decoded_name.rstrip("/").rsplit("/", 1)[-1]).suffix.lower()
            if extension not in SUPPORTED_EXTENSIONS:
                unsupported_counts[extension or "<none>"] += 1
            entry_sha256 = sha256_for_zip_entry(archive, info)
            year = year_for(decoded_name)
            exam_families = exam_families_for(decoded_name)
            source_role = source_role_for(decoded_name)
            subject = subject_for(decoded_name)
            variant_key = variant_key_for(year, exam_families, source_role, subject)
            duplicate_status, quarantine_reason = duplicate_status_for(
                entry_sha256=entry_sha256,
                year=year,
                extension=extension,
                subject=subject,
                variant_key=variant_key,
                existing_hashes=existing_hashes,
                existing_variants=existing_variants,
                seen_hashes=seen_hashes,
                seen_variants=seen_variants,
            )

            entries.append({
                "id": f"mainland-junior-zhongkao-{year}-{stable_short_hash(f'{zip_path.name}:{info.CRC}:{info.file_size}:{entry_sha256}')}",
                "stage": "junior-secondary",
                "grades": ["S1", "S2", "S3"],
                "semester": "full-year",
                "sourceKind": "zhongkao-archive-entry",
                "archiveName": zip_path.name,
                "archiveSha256": archive_hash,
                "entrySha256": entry_sha256,
                "extension": extension,
                "sizeBytes": info.file_size,
                "compressedBytes": info.compress_size,
                "crc32": f"{info.CRC:08x}",
                "year": year,
                "examFamilies": exam_families,
                "subject": subject,
                "sourceRole": source_role,
                "duplicateGroupKeyHash": stable_short_hash(variant_key),
                "duplicateStatus": duplicate_status,
                "quarantineReason": quarantine_reason,
                "retentionPolicy": "metadata-only-local",
                "bodyTextPersisted": False,
                "answerTextPersisted": False,
                "workedSolutionTextPersisted": False,
                "ocrTextPersisted": False,
                "tableContentPersisted": False,
                "imageContentPersisted": False,
                "pageImagesPersisted": False,
                "pageLocatorsPersisted": False,
                "embeddingsPersisted": False,
                "sourceMemberPathPersisted": False,
                "safetyNote": SAFETY_NOTE,
            })

            seen_hashes.add(entry_sha256)
            seen_variants.add(variant_key)

    return entries, ignored_counts, unsupported_counts


def count_by(entries: list[dict[str, object]], field: str) -> dict[str, int]:
    return dict(sorted(Counter(str(entry.get(field) or "unknown") for entry in entries).items()))


def nested_counts(entries: list[dict[str, object]], fields: tuple[str, str]) -> dict[str, dict[str, int]]:
    outer: dict[str, Counter[str]] = {}
    for entry in entries:
        first = str(entry.get(fields[0]) or "unknown")
        second = str(entry.get(fields[1]) or "unknown")
        outer.setdefault(first, Counter())[second] += 1
    return {key: dict(sorted(counter.items())) for key, counter in sorted(outer.items())}


def family_counts(entries: list[dict[str, object]]) -> dict[str, int]:
    counts: Counter[str] = Counter()
    for entry in entries:
        families = entry.get("examFamilies")
        if isinstance(families, list) and families:
            counts.update(str(family) for family in families)
        else:
            counts["unknown"] += 1
    return dict(sorted(counts.items()))


def coverage_matrix(entries: list[dict[str, object]]) -> list[dict[str, object]]:
    grouped: Counter[tuple[str, str, str, str]] = Counter()
    for entry in entries:
        year = str(entry.get("year") or "unknown")
        status = str(entry.get("duplicateStatus") or "unknown")
        role = str(entry.get("sourceRole") or "unknown")
        families = entry.get("examFamilies")
        if isinstance(families, list) and families:
            for family in families:
                grouped[(year, str(family), role, status)] += 1
        else:
            grouped[(year, "unknown", role, status)] += 1
    return [
        {"year": year, "examFamily": family, "sourceRole": role, "duplicateStatus": status, "count": count}
        for (year, family, role, status), count in sorted(grouped.items())
    ]


def write_coverage_matrix(path: Path, rows: list[dict[str, object]]) -> None:
    fieldnames = ["year", "examFamily", "sourceRole", "duplicateStatus", "count"]
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def build_manifest(zip_paths: list[Path], out_dir: Path, existing_manifest_roots: list[Path]) -> dict[str, object]:
    resolved_paths = [path.expanduser().resolve() for path in zip_paths]
    existing_hashes, existing_variants, used_manifests = existing_indices(existing_manifest_roots, out_dir)
    entries: list[dict[str, object]] = []
    ignored_counts: Counter[str] = Counter()
    unsupported_counts: Counter[str] = Counter()

    for zip_path in resolved_paths:
        if not zip_path.exists():
            raise FileNotFoundError(f"Archive not found: {zip_path}")
        archive_entries, archive_ignored, archive_unsupported = manifest_entries_for_archive(
            zip_path,
            existing_hashes,
            existing_variants,
        )
        entries.extend(archive_entries)
        ignored_counts.update(archive_ignored)
        unsupported_counts.update(archive_unsupported)

    return {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "artifactKind": "metadata-only-mainland-junior-zhongkao-manifest",
        "stage": "junior-secondary",
        "grades": ["S1", "S2", "S3"],
        "sourceKind": "shared-zhongkao-exam-pattern-intake",
        "safetyNote": SAFETY_NOTE,
        "sourceArchives": [
            {"archiveName": path.name, "archiveSha256": sha256_for_path(path)}
            for path in resolved_paths
        ],
        "comparison": {
            "existingManifestCount": len(used_manifests),
            "existingHashCount": len(existing_hashes),
            "existingVariantCount": len(existing_variants),
        },
        "totals": {
            "archives": len(resolved_paths),
            "entries": len(entries),
            "files": len(entries),
            "uncompressedBytes": sum(int(entry["sizeBytes"]) for entry in entries),
            "ignoredEntries": sum(ignored_counts.values()),
        },
        "coverage": {
            "yearCounts": count_by(entries, "year"),
            "extensionCounts": count_by(entries, "extension"),
            "sourceRoleCounts": count_by(entries, "sourceRole"),
            "duplicateStatusCounts": count_by(entries, "duplicateStatus"),
            "quarantineReasonCounts": count_by(
                [entry for entry in entries if entry.get("duplicateStatus") == "quarantine"],
                "quarantineReason",
            ),
            "yearDuplicateStatusCounts": nested_counts(entries, ("year", "duplicateStatus")),
            "examFamilyCounts": family_counts(entries),
            "ignoredCounts": dict(sorted(ignored_counts.items())),
            "unsupportedExtensionCounts": dict(sorted(unsupported_counts.items())),
        },
        "entries": entries,
    }


def write_qa_report(path: Path, manifest: dict[str, object]) -> None:
    coverage = manifest["coverage"]
    totals = manifest["totals"]
    duplicate_counts = coverage["duplicateStatusCounts"]
    lines = [
        "# Mainland Junior Zhongkao Metadata-Only Manifest QA",
        "",
        f"- Generated at: {manifest['generatedAt']}",
        f"- Archives: {totals['archives']}",
        f"- Files classified: {totals['files']}",
        f"- Ignored hidden/directory entries: {totals['ignoredEntries']}",
        "- Safety: no body text, answers, worked solutions, OCR text, images, page locators, source member paths, or embeddings persisted.",
        "",
        "## Duplicate Status",
        "",
        *[f"- {status}: {count}" for status, count in duplicate_counts.items()],
        "",
        "## Year Counts",
        "",
        *[f"- {year}: {count}" for year, count in coverage["yearCounts"].items()],
        "",
        "## Extension Counts",
        "",
        *[f"- {extension}: {count}" for extension, count in coverage["extensionCounts"].items()],
        "",
        "## QA Decision",
        "",
        "Recent 2021-2025 files that are exact duplicates or same-exam variants must not create new safe cards. Recent non-duplicate files are covered by the committed shared zhongkao safe-card layer unless S18 later identifies a truly new, source-distant pattern. Historical 2014-2020 files remain metadata-only trend references.",
    ]
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def run_self_test() -> None:
    with TemporaryDirectory() as tmp:
        tmp_path = Path(tmp)
        existing_zip = tmp_path / "existing.zip"
        with ZipFile(existing_zip, "w", ZIP_DEFLATED) as archive:
            archive.writestr("中考真题/2023年北京市中考数学真题.docx", "same body")
        with ZipFile(existing_zip) as archive:
            existing_hash = sha256_for_zip_entry(archive, archive.infolist()[0])

        existing_manifest_dir = tmp_path / "existing-manifests"
        existing_manifest_dir.mkdir()
        (existing_manifest_dir / "manifest.json").write_text(json.dumps({
            "entries": [
                {
                    "sha256": existing_hash,
                    "year": "2023",
                    "examFamilies": ["北京"],
                    "sourceRole": "paper",
                }
            ]
        }), encoding="utf-8")

        candidate_zip = tmp_path / "candidate.zip"
        with ZipFile(candidate_zip, "w", ZIP_DEFLATED) as archive:
            archive.writestr("self-test/2023年北京市中考数学真题.docx", "same body")
            archive.writestr("self-test/2023年北京市中考数学真题解析.docx", "variant body")
            archive.writestr("self-test/2025年广东省中考数学真题.docx", "new covered body")
            archive.writestr("self-test/2018年湖北省中考数学真题.doc", "historical body")
            archive.writestr("self-test/2025年江苏省中考日语试题.pdf", "non math")
            archive.writestr("__MACOSX/._ignored", "ignored")
            archive.writestr("self-test/2025年广东省中考数学资料.rar", "unsupported")

        out_dir = tmp_path / "out"
        manifest = build_manifest([candidate_zip], out_dir, [existing_manifest_dir])
        status_counts = Counter(str(entry["duplicateStatus"]) for entry in manifest["entries"])
        reason_counts = Counter(str(entry["quarantineReason"]) for entry in manifest["entries"] if entry["duplicateStatus"] == "quarantine")

        assert status_counts["skip_exact_duplicate"] == 1
        assert status_counts["covered_by_existing_card"] == 2
        assert status_counts["historical_reference"] == 1
        assert status_counts["quarantine"] == 2
        assert reason_counts["non-math-or-unknown-subject"] == 1
        assert reason_counts["unsupported-extension"] == 1
        assert manifest["totals"]["ignoredEntries"] == 1


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("archives", nargs="*", help="Zhongkao ZIP archive paths to classify.")
    parser.add_argument("--out-dir", default=str(DEFAULT_OUT_DIR), help="Output directory for local metadata artifacts.")
    parser.add_argument(
        "--existing-manifest-root",
        action="append",
        default=[],
        help="Root containing existing local manifest JSON files. Defaults to .local/rag when omitted.",
    )
    parser.add_argument("--self-test", action="store_true", help="Run self-test and exit.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if args.self_test:
        run_self_test()
        print("mainland junior zhongkao manifest self-test passed")
        return

    if not args.archives:
        raise SystemExit("At least one archive path is required unless --self-test is used.")

    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    existing_roots = [Path(root) for root in args.existing_manifest_root] or [Path(".local/rag")]
    manifest = build_manifest([Path(path) for path in args.archives], out_dir, existing_roots)
    (out_dir / MANIFEST_NAME).write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    write_qa_report(out_dir / QA_REPORT_NAME, manifest)
    write_coverage_matrix(out_dir / COVERAGE_MATRIX_NAME, coverage_matrix(manifest["entries"]))
    print(f"Wrote metadata-only manifest: {out_dir / MANIFEST_NAME}")
    print(f"Wrote QA report: {out_dir / QA_REPORT_NAME}")
    print(f"Wrote coverage matrix: {out_dir / COVERAGE_MATRIX_NAME}")


if __name__ == "__main__":
    main()
