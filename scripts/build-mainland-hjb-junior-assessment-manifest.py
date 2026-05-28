#!/usr/bin/env python3
"""Build local-only metadata artifacts for Mainland HJB junior assessments.

The script records archive and member metadata, hashes, coarse assessment
families, unit signals, and safe draft-card signals only. It never extracts or
writes document body text, prompt wording, worked-response wording, scoring
wording, page images, table bodies, figure bodies, page locators, or embedding
payloads.
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


DEFAULT_OUT_DIR = Path(".local/rag/mainland-hjb-junior-assessments")
SAFETY_NOTE = (
    "Metadata-only local artifact. Do not commit source archives, extracted "
    "document text, prompt wording, worked-response wording, scoring wording, "
    "page images, table bodies, figure bodies, page locators, or embeddings."
)
BODY_SENTINEL = "MAIS_BODY_SENTINEL_SHOULD_NOT_APPEAR"

S1_UPPER_UNIT_BY_NUMBER = {
    10: "整式的加减",
    11: "整式的乘除",
    12: "因式分解",
    13: "分式",
    14: "图形的运动",
}

UNIT_MARKERS = [
    ("整式的加减", ["整式的加减", "整式加减", "代数式", "同类项"]),
    ("整式的乘除", ["整式的乘除", "整式乘除", "幂的运算", "乘法公式"]),
    ("因式分解", ["因式分解", "提公因式", "公式法"]),
    ("分式", ["分式", "分式方程"]),
    ("图形的运动", ["图形的运动", "图形运动", "平移", "旋转", "翻折", "轴对称"]),
]

SAFE_PATTERN_SLOTS = [
    {
        "draftId": "hjb-junior-s1-upper-assessment-polynomial-add-subtract-unit",
        "assessmentFamilies": ["unit-test"],
        "materialKinds": ["unit-test", "topic-practice"],
        "unitTitles": ["整式的加减"],
        "conceptSignals": ["algebraic-expressions", "polynomials", "like-terms", "polynomial-addition-subtraction"],
        "difficultyBand": "core",
    },
    {
        "draftId": "hjb-junior-s1-upper-assessment-polynomial-multiply-divide-unit",
        "assessmentFamilies": ["unit-test"],
        "materialKinds": ["unit-test", "topic-practice"],
        "unitTitles": ["整式的乘除"],
        "conceptSignals": ["exponent-laws", "monomial-multiplication", "polynomial-multiplication", "multiplication-formulas"],
        "difficultyBand": "core",
    },
    {
        "draftId": "hjb-junior-s1-upper-assessment-factorization-unit",
        "assessmentFamilies": ["unit-test"],
        "materialKinds": ["unit-test", "topic-practice"],
        "unitTitles": ["因式分解"],
        "conceptSignals": ["factorization", "common-factor", "formula-factorization", "polynomial-structure"],
        "difficultyBand": "core",
    },
    {
        "draftId": "hjb-junior-s1-upper-assessment-algebraic-fractions-unit",
        "assessmentFamilies": ["unit-test"],
        "materialKinds": ["unit-test", "topic-practice"],
        "unitTitles": ["分式"],
        "conceptSignals": ["algebraic-fractions", "fraction-domain", "equivalent-fractions", "fraction-operations"],
        "difficultyBand": "core",
    },
    {
        "draftId": "hjb-junior-s1-upper-assessment-figure-transformations-unit",
        "assessmentFamilies": ["unit-test"],
        "materialKinds": ["unit-test", "topic-practice"],
        "unitTitles": ["图形的运动"],
        "conceptSignals": ["geometric-transformations", "translation", "rotation", "reflection", "symmetry"],
        "difficultyBand": "foundation",
    },
    {
        "draftId": "hjb-junior-s1-upper-assessment-midterm-final-integrated",
        "assessmentFamilies": ["midterm", "final", "comprehensive"],
        "materialKinds": ["midterm-final", "review", "paper"],
        "unitTitles": list(S1_UPPER_UNIT_BY_NUMBER.values()),
        "conceptSignals": [
            "s1-upper-integrated-review",
            "polynomial-addition-subtraction",
            "polynomial-multiplication",
            "factorization",
            "algebraic-fractions",
            "geometric-transformations",
        ],
        "difficultyBand": "exam",
    },
]


def compact_name(value: str) -> str:
    return re.sub(r"[\s\-_/，、。,.()[\]（）:：;；·+]+", "", value.lower())


def unique_ordered(values: list[str]) -> list[str]:
    seen: set[str] = set()
    unique: list[str] = []
    for value in values:
        if value and value not in seen:
            seen.add(value)
            unique.append(value)
    return unique


def sha256_for_path(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def decode_zip_name(name: str) -> str:
    try:
        raw = name.encode("cp437")
    except UnicodeEncodeError:
        return name
    for encoding in ("gb18030", "utf-8"):
        try:
            return raw.decode(encoding)
        except UnicodeError:
            continue
    return name


def should_skip_entry(decoded_name: str) -> bool:
    parts = decoded_name.split("/")
    return decoded_name.endswith("/") or "__MACOSX" in parts or any(part.startswith("._") for part in parts)


def sha256_for_member(archive: ZipFile, member_name: str) -> str:
    digest = hashlib.sha256()
    with archive.open(member_name) as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def unit_numbers_from_name(name: str) -> list[int]:
    numbers: list[int] = []
    for lower, upper in re.findall(r"第\s*(\d+)\s*[~～\-—至到]\s*(\d+)\s*章", name):
        start = int(lower)
        end = int(upper)
        if start <= end:
            numbers.extend(range(start, end + 1))
    for value in re.findall(r"第\s*(\d+)\s*章", name):
        numbers.append(int(value))
    return [int(value) for value in unique_ordered([str(number) for number in numbers])]


def infer_unit_titles(name: str) -> list[str]:
    units: list[str] = []
    numbers = [int(value) for value in unit_numbers_from_name(name)]
    units.extend(S1_UPPER_UNIT_BY_NUMBER[number] for number in numbers if number in S1_UPPER_UNIT_BY_NUMBER)
    normalized = compact_name(name)
    for unit_title, markers in UNIT_MARKERS:
        if any(compact_name(marker) in normalized for marker in markers):
            units.append(unit_title)
    if "期末" in name and not units:
        units.extend(S1_UPPER_UNIT_BY_NUMBER.values())
    if "期中" in name and not units:
        units.extend([S1_UPPER_UNIT_BY_NUMBER[number] for number in (10, 11, 12)])
    return unique_ordered(units)


def needs_mapping_review(name: str, unit_titles: list[str]) -> bool:
    numbers = [int(value) for value in unit_numbers_from_name(name)]
    has_unmapped_number = any(number not in S1_UPPER_UNIT_BY_NUMBER for number in numbers)
    return has_unmapped_number or not unit_titles


def infer_assessment_families(name: str) -> list[str]:
    families: list[str] = []
    if "单元" in name:
        families.append("unit-test")
    if "期中" in name:
        families.append("midterm")
    if "期末" in name:
        families.append("final")
    if any(term in name for term in ["专题", "专项", "复习", "模拟", "培优", "压轴"]):
        families.append("topic-review")
    if any(term in name for term in ["综合", "期中", "期末", "模拟"]):
        families.append("comprehensive")
    return sorted(set(families)) or ["topic-review"]


def infer_material_kinds(name: str, families: list[str]) -> list[str]:
    kinds: list[str] = []
    if "unit-test" in families:
        kinds.append("unit-test")
    if "midterm" in families or "final" in families:
        kinds.append("midterm-final")
    if "topic-review" in families or any(term in name for term in ["专题", "专项", "同步", "复习"]):
        kinds.append("topic-practice")
    if any(term in name for term in ["复习", "模拟", "综合", "压轴"]):
        kinds.append("review")
    kinds.append("paper")
    return unique_ordered(kinds)


def infer_role(name: str, extension: str) -> str:
    if extension == ".pdf":
        if any(term in name for term in ["答题卡", "试题版", "考试版", "学生版"]):
            return "student-assessment-form"
        return "portable-document"
    if any(term in name for term in ["教师版", "全解", "解析", "参考"]):
        return "worked-response-support"
    if any(term in name for term in ["学生版", "原卷", "考试版", "答题卡"]):
        return "student-assessment-form"
    return "assessment-resource"


def infer_difficulty(name: str) -> str:
    if any(term in name for term in ["压轴", "提高", "提升", "培优", "能力", "难点"]):
        return "challenge"
    if any(term in name for term in ["基础", "同步", "A卷", "知识"]):
        return "foundation"
    if any(term in name for term in ["期中", "期末", "模拟", "综合"]):
        return "exam"
    return "core"


def archive_record(path: Path) -> dict[str, object]:
    resolved = path.expanduser().resolve()
    if not resolved.exists():
        raise FileNotFoundError(f"Archive not found: {resolved}")
    if resolved.suffix.lower() != ".zip":
        raise ValueError(f"Expected a ZIP archive: {resolved}")
    digest = sha256_for_path(resolved)
    return {
        "archiveId": f"hjb-junior-assessment-archive-{digest[:12]}",
        "archiveName": resolved.name,
        "archiveSha256": digest,
        "sizeBytes": resolved.stat().st_size,
    }


def source_entries(zip_paths: list[Path]) -> list[dict[str, object]]:
    entries: list[dict[str, object]] = []
    archive_records = {path.expanduser().resolve(): archive_record(path) for path in zip_paths}
    for zip_path in zip_paths:
        resolved = zip_path.expanduser().resolve()
        archive_meta = archive_records[resolved]
        with ZipFile(resolved) as archive:
            for info in archive.infolist():
                decoded_name = decode_zip_name(info.filename)
                if should_skip_entry(decoded_name):
                    continue
                extension = Path(decoded_name).suffix.lower()
                if extension not in {".doc", ".docx", ".pdf"}:
                    continue
                unit_titles = infer_unit_titles(decoded_name)
                assessment_families = infer_assessment_families(decoded_name)
                material_kinds = infer_material_kinds(decoded_name, assessment_families)
                digest = sha256_for_member(archive, info.filename)
                entries.append(
                    {
                        "entryId": f"hjb-junior-assessment-{digest[:12]}",
                        "archiveId": archive_meta["archiveId"],
                        "archiveName": archive_meta["archiveName"],
                        "entryName": decoded_name,
                        "fileName": decoded_name.rsplit("/", 1)[-1],
                        "extension": extension,
                        "sizeBytes": info.file_size,
                        "compressedBytes": info.compress_size,
                        "sha256": digest,
                        "duplicateGroupId": f"sha256-{digest[:12]}",
                        "publisher": "MAINLAND_HJB",
                        "stage": "junior-secondary",
                        "grade": "S1",
                        "semester": "upper",
                        "role": infer_role(decoded_name, extension),
                        "assessmentFamilies": assessment_families,
                        "materialKinds": material_kinds,
                        "unitTitles": unit_titles,
                        "difficultyBand": infer_difficulty(decoded_name),
                        "needsS18MappingReview": needs_mapping_review(decoded_name, unit_titles),
                        "ownerProvided": True,
                        "storageStatus": "local-private-owner-provided; source archive entries not copied into repo",
                        "licenseStatus": "owner-provided local analysis only; no public redistribution assumed",
                        "safeRetentionPolicy": "commit safe pattern cards, manifest tooling, and QA notes only",
                    }
                )
    return entries


def build_manifest(zip_paths: list[Path]) -> dict[str, object]:
    archives = [archive_record(path) for path in zip_paths]
    entries = source_entries(zip_paths)
    return {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "publisher": "MAINLAND_HJB",
        "stage": "junior-secondary",
        "grade": "S1",
        "semester": "upper",
        "artifactKind": "metadata-only-assessment-archive-manifest",
        "safetyNote": SAFETY_NOTE,
        "archives": archives,
        "totals": {
            "archives": len(archives),
            "files": len(entries),
            "uncompressedBytes": sum(int(entry["sizeBytes"]) for entry in entries),
            "compressedBytes": sum(int(entry["compressedBytes"]) for entry in entries),
            "needsS18MappingReview": sum(1 for entry in entries if entry["needsS18MappingReview"]),
        },
        "counts": {
            "extensions": dict(sorted(Counter(str(entry["extension"]) for entry in entries).items())),
            "roles": dict(sorted(Counter(str(entry["role"]) for entry in entries).items())),
            "assessmentFamilies": dict(
                sorted(Counter(family for entry in entries for family in entry["assessmentFamilies"]).items())  # type: ignore[index]
            ),
            "materialKinds": dict(
                sorted(Counter(kind for entry in entries for kind in entry["materialKinds"]).items())  # type: ignore[index]
            ),
            "unitTitles": dict(sorted(Counter(unit for entry in entries for unit in entry["unitTitles"]).items())),  # type: ignore[index]
            "difficultyBands": dict(sorted(Counter(str(entry["difficultyBand"]) for entry in entries).items())),
        },
        "sources": entries,
    }


def draft_cards(manifest: dict[str, object]) -> list[dict[str, object]]:
    counts = manifest["counts"]  # type: ignore[index]
    family_counts = counts["assessmentFamilies"]  # type: ignore[index]
    material_counts = counts["materialKinds"]  # type: ignore[index]
    unit_counts = counts["unitTitles"]  # type: ignore[index]
    return [
        {
            "draftId": slot["draftId"],
            "curriculumTrack": "MAINLAND_PEP_HIGH",
            "publisher": "MAINLAND_HJB",
            "stage": "junior-secondary",
            "grade": "S1",
            "semester": "upper",
            "sourceKind": "school-assessment-pattern",
            "assessmentFamilies": slot["assessmentFamilies"],
            "materialKinds": slot["materialKinds"],
            "unitTitles": slot["unitTitles"],
            "conceptSignals": slot["conceptSignals"],
            "difficultyBand": slot["difficultyBand"],
            "supportingFamilyCounts": {
                family: family_counts.get(family, 0) for family in slot["assessmentFamilies"]  # type: ignore[index]
            },
            "supportingMaterialCounts": {kind: material_counts.get(kind, 0) for kind in slot["materialKinds"]},  # type: ignore[index]
            "supportingUnitCounts": {unit: unit_counts.get(unit, 0) for unit in slot["unitTitles"]},  # type: ignore[index]
            "safeSummaryDraft": "Use this assessment slot only as aggregated pattern guidance for original MAIS content.",
            "sourceDistanceStatus": "safe-card-only; needs S18 review before student-facing generation claims",
        }
        for slot in SAFE_PATTERN_SLOTS
    ]


def qa_report(manifest: dict[str, object], cards: list[dict[str, object]]) -> str:
    totals = manifest["totals"]  # type: ignore[index]
    counts = manifest["counts"]  # type: ignore[index]
    return "\n".join(
        [
            "# Mainland HJB Junior Assessment Metadata QA",
            "",
            f"- Generated at: {manifest['generatedAt']}",
            f"- Archives inspected: {totals['archives']}",
            f"- Files classified: {totals['files']}",
            f"- Safe draft cards: {len(cards)}",
            f"- Entries needing S18 mapping review: {totals['needsS18MappingReview']}",
            f"- Safety note: {SAFETY_NOTE}",
            "",
            "## Classification Counts",
            "",
            f"- Extensions: {json.dumps(counts['extensions'], ensure_ascii=False)}",
            f"- Roles: {json.dumps(counts['roles'], ensure_ascii=False)}",
            f"- Assessment families: {json.dumps(counts['assessmentFamilies'], ensure_ascii=False)}",
            f"- Material kinds: {json.dumps(counts['materialKinds'], ensure_ascii=False)}",
            f"- Unit titles: {json.dumps(counts['unitTitles'], ensure_ascii=False)}",
            f"- Difficulty bands: {json.dumps(counts['difficultyBands'], ensure_ascii=False)}",
            "",
            "## Safety Gate",
            "",
            "- Passed: output artifacts contain archive-entry metadata, hashes, coarse classification, and safe abstraction drafts only.",
            "- Passed: no document body text, prompt wording, worked-response wording, scoring wording, page images, table bodies, figure bodies, page locators, or embedding payloads are persisted.",
            "- Required before production use: S18 review of safe cards and any future student-facing content.",
            "",
        ]
    ) + "\n"


def write_outputs(manifest: dict[str, object], cards: list[dict[str, object]], out_dir: Path) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (out_dir / "source-register.json").write_text(json.dumps(manifest["sources"], ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (out_dir / "safe-card-drafts.json").write_text(json.dumps(cards, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (out_dir / "qa-report.md").write_text(qa_report(manifest, cards), encoding="utf-8")


def run_self_test() -> None:
    with TemporaryDirectory() as tmp:
        tmp_path = Path(tmp)
        unit_zip = tmp_path / "单元测试.zip"
        period_zip = tmp_path / "期中期末.zip"
        with ZipFile(unit_zip, "w") as archive:
            archive.writestr("单元测试/第10章 整式的加减 单元测试卷.docx", BODY_SENTINEL)
            archive.writestr("单元测试/第14章 图形的运动 单元测试卷.pdf", BODY_SENTINEL)
            archive.writestr("单元测试/同步资料/第9章 待复核材料.doc", BODY_SENTINEL)
            archive.writestr("__MACOSX/._ignored", BODY_SENTINEL)
        with ZipFile(period_zip, "w") as archive:
            archive.writestr("期中期末/七年级上册期中模拟卷 第10~12章.docx", BODY_SENTINEL)
            archive.writestr("期中期末/七年级上册期末模拟卷 第10~14章 参考材料.docx", BODY_SENTINEL)

        manifest = build_manifest([unit_zip, period_zip])
        cards = draft_cards(manifest)
        report = qa_report(manifest, cards)
        manifest_json = json.dumps(manifest, ensure_ascii=False)
        cards_json = json.dumps(cards, ensure_ascii=False)

        assert manifest["totals"]["archives"] == 2  # type: ignore[index]
        assert manifest["totals"]["files"] == 5  # type: ignore[index]
        assert manifest["counts"]["extensions"] == {".doc": 1, ".docx": 3, ".pdf": 1}  # type: ignore[index]
        assert manifest["totals"]["needsS18MappingReview"] == 1  # type: ignore[index]
        assert len(cards) == 6
        assert "sourcePath" not in manifest_json
        assert BODY_SENTINEL not in manifest_json
        assert BODY_SENTINEL not in cards_json
        assert BODY_SENTINEL not in report
        assert any(entry["role"] == "worked-response-support" for entry in manifest["sources"])  # type: ignore[index]
        assert any("midterm" in entry["assessmentFamilies"] for entry in manifest["sources"])  # type: ignore[index]
        assert any("final" in entry["assessmentFamilies"] for entry in manifest["sources"])  # type: ignore[index]
    print("Self-test passed: metadata-only HJB junior assessment manifest handles Chinese archives and safe draft cards.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Build local-only Mainland HJB junior assessment metadata artifacts.")
    parser.add_argument("zip_paths", nargs="*", help="Path(s) to owner-provided HJB junior assessment archives.")
    parser.add_argument("--out-dir", default=str(DEFAULT_OUT_DIR), help="Output directory. Defaults to ignored .local/rag/.")
    parser.add_argument("--self-test", action="store_true", help="Run a metadata-only smoke test with temporary fake archives.")
    args = parser.parse_args()

    if args.self_test:
        run_self_test()
        return

    if not args.zip_paths:
        raise SystemExit("At least one ZIP path is required unless --self-test is used.")

    manifest = build_manifest([Path(path) for path in args.zip_paths])
    cards = draft_cards(manifest)
    out_dir = Path(args.out_dir).expanduser()
    write_outputs(manifest, cards, out_dir)
    print(f"Wrote {manifest['totals']['files']} metadata-only HJB junior assessment entries to {out_dir}")


if __name__ == "__main__":
    main()
