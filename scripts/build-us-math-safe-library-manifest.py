#!/usr/bin/env python3
"""Build local-only metadata manifests for U.S. math safe-library sources.

This script deliberately records file and URL metadata only. It never extracts
or persists PDF, DOCX, textbook, assessment, OCR, item, answer, rubric, figure,
table, or page body content. Default outputs live under ignored `.local/`.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from tempfile import TemporaryDirectory
import zipfile


DEFAULT_OUT_DIR = Path(".local/rag/us-math")
DEFAULT_CA_TEXTBOOK_OUT_DIR = Path(".local/rag/us-ca-textbooks")
SAFETY_NOTE = (
    "Metadata-only local artifact. Do not commit raw standards documents, "
    "textbook body text, released assessment items, answer keys, rubrics, "
    "figures, tables, screenshots, OCR text, or page content."
)
CA_CORE_TEXTBOOK_EXCLUDE_TERMS = [
    "coreplus",
    "core plus",
    "advanced mathematical concepts",
    "precalculus",
    "data management",
    "applications and concepts",
]


def classify_source_kind(name: str) -> str:
    lower = name.lower()
    if any(term in lower for term in ["copyright", "license", "licence", "permission"]):
        return "copyright-guidance"
    if any(term in lower for term in ["glencoe", "mcgraw", "mcdougal", "california mathematics", "california algebra", "california geometry", "pre-algebra", "student edition", "noteables"]):
        return "licensed-private-material"
    if any(term in lower for term in ["blueprint", "specification", "test-spec", "test spec"]):
        return "test-specification"
    if any(term in lower for term in ["released", "eog", "eoc", "caaspp", "smarter", "staar", "fast", "milestones", "m-step", "pssa", "keystone", "regents"]):
        return "released-assessment"
    if any(term in lower for term in ["adoption", "publisher", "textbook", "toc", "scope", "sequence"]):
        return "textbook-adoption-list"
    if any(term in lower for term in ["oer", "cc-by", "creative-commons", "illustrative"]):
        return "oer-curriculum"
    if any(term in lower for term in ["framework", "support", "unpacking"]):
        return "framework"
    return "state-standard"


def infer_california_core_course(name: str) -> str | None:
    lower = name.lower()
    if any(term in lower for term in CA_CORE_TEXTBOOK_EXCLUDE_TERMS):
        return None
    if "algebra readiness" in lower:
        return "CA Algebra Readiness"
    if "pre-algebra" in lower or "prealgebra" in lower:
        return "CA Pre-Algebra"
    if "algebra 2" in lower or "algebra ii" in lower:
        return "CA Algebra 2"
    if "algebra 1" in lower or "algebra i" in lower:
        return "CA Algebra 1"
    if "geometry" in lower:
        return "CA Geometry"
    if "grade 7" in lower and "california mathematics" in lower:
        return "CA Grade 7 Mathematics"
    return None


def mapped_grades_for_california_course(course: str | None) -> list[str]:
    if course == "CA Grade 7 Mathematics":
        return ["S1"]
    if course in {"CA Pre-Algebra", "CA Algebra Readiness"}:
        return ["S2"]
    if course == "CA Algebra 1":
        return ["S3"]
    if course == "CA Geometry":
        return ["S4"]
    if course == "CA Algebra 2":
        return ["S5"]
    return []


def sha256_for_path(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def sha256_for_zip_entry(archive: zipfile.ZipFile, info: zipfile.ZipInfo) -> str:
    digest = hashlib.sha256()
    with archive.open(info, "r") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def lane_for(kind: str, name: str) -> str:
    lower = name.lower()
    if kind == "oer-curriculum":
        return "oer"
    if kind in {"textbook-adoption-list", "licensed-private-material"} or any(term in lower for term in ["textbook", "authorized", "licensed"]):
        return "licensed-private-library"
    return "public-standards"


def retention_for(kind: str, lane: str, name: str) -> str:
    lower = name.lower()
    if "noncommercial" in lower or "cc-by-nc" in lower:
        return "blocked-without-license"
    if lane == "oer" and "cc-by" in lower and "nc" not in lower:
        return "oer-attribution-required"
    if kind in {"released-assessment", "test-specification"}:
        return "local-private-analysis-only"
    if lane == "licensed-private-library":
        return "local-private-analysis-only"
    return "safe-card-only"


def entry_for_path(path: Path, base: Path) -> dict[str, object]:
    stat = path.stat()
    display_name = str(path.relative_to(base)) if path.is_relative_to(base) else path.name
    kind = classify_source_kind(display_name)
    california_course = infer_california_core_course(display_name)
    if california_course:
        kind = "licensed-private-material"
    lane = lane_for(kind, display_name)
    retention = retention_for(kind, lane, display_name)
    return {
        "name": display_name,
        "extension": path.suffix.lower() or "<none>",
        "sizeBytes": stat.st_size,
        "modifiedAt": datetime.fromtimestamp(stat.st_mtime, timezone.utc).isoformat(),
        "sha256": sha256_for_path(path),
        "sourceKind": kind,
        "libraryLane": lane,
        "repositoryRetention": retention,
        "rawCorpusAllowed": False,
        "safeCardAllowed": retention != "blocked-without-license",
        "bodyTextRead": False,
        "inferredCaliforniaCourse": california_course,
        "mappedGrades": mapped_grades_for_california_course(california_course),
    }


def should_skip_zip_entry(info: zipfile.ZipInfo) -> bool:
    if info.is_dir():
        return True
    name = info.filename
    parts = [part for part in name.split("/") if part]
    return (
        not parts
        or parts[0] == "__MACOSX"
        or any(part.startswith("._") for part in parts)
    )


def entry_for_zip_member(zip_path: Path, archive: zipfile.ZipFile, info: zipfile.ZipInfo) -> dict[str, object]:
    display_name = info.filename
    kind = classify_source_kind(display_name)
    california_course = infer_california_core_course(display_name)
    if california_course:
        kind = "licensed-private-material"
    lane = lane_for(kind, display_name)
    retention = retention_for(kind, lane, display_name)
    modified_at = datetime(*info.date_time, tzinfo=timezone.utc).isoformat()
    return {
        "name": display_name,
        "zipContainer": str(zip_path),
        "zipEntryName": display_name,
        "extension": Path(display_name).suffix.lower() or "<none>",
        "sizeBytes": info.file_size,
        "compressedSizeBytes": info.compress_size,
        "modifiedAt": modified_at,
        "sha256": sha256_for_zip_entry(archive, info),
        "compressionMethod": zipfile.compressor_names.get(info.compress_type, str(info.compress_type)),
        "sourceKind": kind,
        "libraryLane": lane,
        "repositoryRetention": retention,
        "rawCorpusAllowed": False,
        "safeCardAllowed": retention != "blocked-without-license",
        "bodyTextRead": False,
        "inferredCaliforniaCourse": california_course,
        "mappedGrades": mapped_grades_for_california_course(california_course),
    }


def entries_for_zip(path: Path, ca_core_textbooks_only: bool) -> list[dict[str, object]]:
    entries = []
    with zipfile.ZipFile(path) as archive:
        for info in sorted(archive.infolist(), key=lambda item: item.filename):
            if should_skip_zip_entry(info):
                continue
            entry = entry_for_zip_member(path, archive, info)
            if ca_core_textbooks_only and not entry["inferredCaliforniaCourse"]:
                continue
            entries.append(entry)
    return entries


def entries_for_source(source: str, ca_core_textbooks_only: bool = False) -> list[dict[str, object]]:
    if source.startswith("http://") or source.startswith("https://"):
        kind = classify_source_kind(source)
        california_course = infer_california_core_course(source)
        if california_course:
            kind = "licensed-private-material"
        lane = lane_for(kind, source)
        retention = retention_for(kind, lane, source)
        if ca_core_textbooks_only and not california_course:
            return []
        return [{
            "name": source,
            "extension": "<url>",
            "sizeBytes": None,
            "modifiedAt": None,
            "sha256": None,
            "sourceKind": kind,
            "libraryLane": lane,
            "repositoryRetention": retention,
            "rawCorpusAllowed": False,
            "safeCardAllowed": retention != "blocked-without-license",
            "bodyTextRead": False,
            "inferredCaliforniaCourse": california_course,
            "mappedGrades": mapped_grades_for_california_course(california_course),
        }]

    source_path = Path(source).expanduser().resolve()
    if not source_path.exists():
        raise SystemExit(f"Source not found: {source_path}")
    if source_path.is_file():
        if source_path.suffix.lower() == ".zip":
            return entries_for_zip(source_path, ca_core_textbooks_only)
        entry = entry_for_path(source_path, source_path.parent)
        return [] if ca_core_textbooks_only and not entry["inferredCaliforniaCourse"] else [entry]

    entries: list[dict[str, object]] = []
    for path in sorted(source_path.rglob("*")):
        if not path.is_file():
            continue
        if path.suffix.lower() == ".zip":
            entries.extend(entries_for_zip(path, ca_core_textbooks_only))
            continue
        entry = entry_for_path(path, source_path)
        if ca_core_textbooks_only and not entry["inferredCaliforniaCourse"]:
            continue
        entries.append(entry)
    return entries


def build_manifest(sources: list[str], state: str, reviewer: str, ca_core_textbooks_only: bool = False) -> dict[str, object]:
    entries = [entry for source in sources for entry in entries_for_source(source, ca_core_textbooks_only)]
    lane_counts = Counter(str(entry["libraryLane"]) for entry in entries)
    kind_counts = Counter(str(entry["sourceKind"]) for entry in entries)
    retention_counts = Counter(str(entry["repositoryRetention"]) for entry in entries)
    course_counts = Counter(str(entry["inferredCaliforniaCourse"]) for entry in entries if entry.get("inferredCaliforniaCourse"))

    return {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "state": state,
        "reviewer": reviewer,
        "safetyNote": SAFETY_NOTE,
        "caCoreTextbooksOnly": ca_core_textbooks_only,
        "totals": {
            "entries": len(entries),
            "rawCorpusAllowed": sum(1 for entry in entries if entry["rawCorpusAllowed"]),
            "safeCardAllowed": sum(1 for entry in entries if entry["safeCardAllowed"]),
            "bodyTextRead": sum(1 for entry in entries if entry["bodyTextRead"]),
        },
        "laneCounts": dict(sorted(lane_counts.items())),
        "sourceKindCounts": dict(sorted(kind_counts.items())),
        "retentionCounts": dict(sorted(retention_counts.items())),
        "californiaCourseCounts": dict(sorted(course_counts.items())),
        "entries": entries,
    }


def draft_review_cards(manifest: dict[str, object]) -> list[dict[str, object]]:
    cards = []
    for index, entry in enumerate(manifest["entries"], start=1):  # type: ignore[index]
        cards.append({
            "draftId": f"us-math-safe-library-draft-{index:03d}",
            "state": manifest["state"],
            "sourceName": entry["name"],
            "libraryLane": entry["libraryLane"],
            "sourceKind": entry["sourceKind"],
            "repositoryRetention": entry["repositoryRetention"],
            "rawCorpusAllowed": False,
            "safeCardAllowed": entry["safeCardAllowed"],
            "inferredCaliforniaCourse": entry.get("inferredCaliforniaCourse"),
            "mappedGrades": entry.get("mappedGrades", []),
            "sha256": entry.get("sha256"),
            "reviewStatus": "needs-human-review",
            "safeExtractionInstruction": (
                "Record only standard IDs, grade/domain structure, topic coverage, "
                "item-mode family, difficulty signal, misconception tags, and MAIS-authored summaries."
            ),
            "prohibitedExtractionInstruction": (
                "Do not extract body text, examples, item stems, choices, answers, rubrics, "
                "figures, tables, screenshots, OCR text, or page content."
            ),
        })
    return cards


def write_outputs(manifest: dict[str, object], out_dir: Path) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "us-math-safe-library-manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    (out_dir / "us-math-safe-library-review-drafts.json").write_text(
        json.dumps(draft_review_cards(manifest), ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Wrote {manifest['totals']['entries']} metadata-only entries to {out_dir}")


def self_test() -> None:
    with TemporaryDirectory() as tmp:
        root = Path(tmp)
        for name in [
            "CA-standards-framework-reference.pdf",
            "NC-EOG-test-specifications.pdf",
            "district-authorized-textbook-toc.csv",
            "illustrative-math-cc-by-oer-index.json",
            "illustrative-math-cc-by-nc-v360-note.txt",
        ]:
            (root / name).write_text("dummy local metadata fixture\n", encoding="utf-8")

        manifest = build_manifest([str(root)], "US", "self-test")
        assert manifest["totals"]["entries"] == 5
        assert manifest["totals"]["rawCorpusAllowed"] == 0
        assert all(entry["bodyTextRead"] is False for entry in manifest["entries"])
        assert any(entry["repositoryRetention"] == "blocked-without-license" for entry in manifest["entries"])
        assert all(entry["sha256"] for entry in manifest["entries"])

        zip_path = root / "california-core.zip"
        with zipfile.ZipFile(zip_path, "w") as archive:
            archive.writestr("CALIFORNIA ALGEBRA 1/a1-Practice.pdf", b"binary-only fixture")
            archive.writestr("Mathematics/CorePlus Math Course1-3/Core Plus Math 1/unit01.pdf", b"excluded fixture")
            archive.writestr("__MACOSX/._ignored.pdf", b"ignored")

        zip_manifest = build_manifest([str(zip_path)], "CA", "self-test", ca_core_textbooks_only=True)
        assert zip_manifest["totals"]["entries"] == 1
        assert zip_manifest["totals"]["rawCorpusAllowed"] == 0
        assert zip_manifest["totals"]["bodyTextRead"] == 0
        zip_entry = zip_manifest["entries"][0]
        assert zip_entry["inferredCaliforniaCourse"] == "CA Algebra 1"
        assert zip_entry["mappedGrades"] == ["S3"]
        assert zip_entry["sha256"]
    print("Self-test passed: U.S. math safe-library manifest remains metadata-only.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Build U.S. math metadata-only safe-library manifest.")
    parser.add_argument("sources", nargs="*", help="Local files/directories or public URLs to register as metadata-only sources.")
    parser.add_argument("--state", choices=["CA", "TX", "FL", "NY", "PA", "IL", "OH", "GA", "NC", "MI", "AR", "US"], default="US")
    parser.add_argument("--reviewer", default="S16")
    parser.add_argument("--out-dir", default=str(DEFAULT_OUT_DIR))
    parser.add_argument(
        "--ca-core-textbooks-only",
        action="store_true",
        help=(
            "For owner-provided California archives, keep only Grade 7, Pre-Algebra, "
            "Algebra Readiness, Algebra 1, Algebra 2, and Geometry metadata entries. "
            f"Recommended output directory: {DEFAULT_CA_TEXTBOOK_OUT_DIR}"
        ),
    )
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()

    if args.self_test:
        self_test()
        return
    if not args.sources:
        raise SystemExit("Provide at least one local path or URL, or run with --self-test.")

    manifest = build_manifest(args.sources, args.state, args.reviewer, args.ca_core_textbooks_only)
    write_outputs(manifest, Path(args.out_dir))


if __name__ == "__main__":
    main()
