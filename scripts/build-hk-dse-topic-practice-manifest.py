#!/usr/bin/env python3
"""Build a local-only metadata manifest for HK DSE topic-practice PDFs.

The script reads ZIP directory metadata and streamed entry bytes for checksums.
It does not extract PDFs, parse PDF text, machine-read scans, persist source
content, or create embeddings.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import tempfile
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile


DEFAULT_OUTPUT = Path(".local/rag/hk-dse-topic-practice/manifest.json")
EXPECTED_PAPER_1_TOPICS = list(range(1, 19))
EXPECTED_PAPER_2_TOPICS = list(range(0, 17))
SAFETY_NOTE = (
    "Local metadata and checksums only; no PDF text, OCR text, source items, "
    "option sets, diagrams, tables, answers, solutions, worked responses, "
    "page locators, or embeddings are extracted or persisted."
)


def iso_modified_at(date_time: tuple[int, int, int, int, int, int]) -> str:
    year, month, day, hour, minute, second = date_time
    return datetime(year, month, day, hour, minute, second, tzinfo=timezone.utc).isoformat()


def is_junk_path(path: str) -> bool:
    parts = path.split("/")
    file_name = parts[-1]
    return parts[0] == "__MACOSX" or file_name == ".DS_Store" or file_name.startswith("._")


def sha256_entry(archive: ZipFile, path: str) -> str:
    digest = hashlib.sha256()
    with archive.open(path) as handle:
        while True:
            chunk = handle.read(1024 * 1024)
            if not chunk:
                break
            digest.update(chunk)
    return digest.hexdigest()


def paper_component_from_path(path: str) -> str:
    normalized_parts = [part.strip().lower() for part in path.split("/")]
    if "paper 1" in normalized_parts:
        return "paper-1"
    if "paper 2" in normalized_parts:
        return "paper-2"
    return "unknown"


def classify_file(file_name: str) -> tuple[str, int | None, str | None, str | None]:
    stem = Path(file_name).stem
    topic_match = re.match(r"Topic\s+([0-9]+)\s+(.+)$", stem, flags=re.IGNORECASE)
    if topic_match:
        return ("topic-practice", int(topic_match.group(1)), topic_match.group(2).strip(), None)

    book_match = re.match(r"Book\s+([0-9]+)\s+Topic\s+([0-9]+)-([0-9]+)(?:\s+(.+))?$", stem, flags=re.IGNORECASE)
    if book_match:
        suffix = (book_match.group(4) or "").strip().lower()
        aggregate_kind = "answer-aggregate" if "answer" in suffix else "topic-book-aggregate"
        topic_range = f"{book_match.group(2)}-{book_match.group(3)}"
        return (aggregate_kind, None, None, topic_range)

    return ("unknown", None, None, None)


def build_archive_entries(zip_path: Path) -> tuple[list[dict[str, object]], list[dict[str, object]]]:
    entries: list[dict[str, object]] = []
    ignored: list[dict[str, object]] = []
    with ZipFile(zip_path) as archive:
        for info in archive.infolist():
            if info.is_dir():
                continue

            file_name = Path(info.filename).name
            if is_junk_path(info.filename):
                ignored.append({
                    "pathFingerprint": hashlib.sha256(info.filename.encode("utf-8", errors="replace")).hexdigest(),
                    "fileName": file_name,
                    "sizeBytes": info.file_size,
                    "reason": "macos-or-hidden-metadata",
                })
                continue

            extension = Path(file_name).suffix.lower() or "<none>"
            paper_component = paper_component_from_path(info.filename)
            entry_kind, topic_number, topic_title, topic_range = classify_file(file_name)
            review_flags = []
            if extension != ".pdf":
                review_flags.append("non-pdf")
            if paper_component == "unknown":
                review_flags.append("unknown-paper-component")
            if entry_kind == "unknown":
                review_flags.append("unknown-topic-practice-kind")

            entries.append({
                "sourceArchive": zip_path.name,
                "sourceFamily": "hk-dse-topic-practice-pack-en",
                "languageVariant": "en",
                "pathFingerprint": hashlib.sha256(info.filename.encode("utf-8", errors="replace")).hexdigest(),
                "fileName": file_name,
                "paperComponent": paper_component,
                "entryKind": entry_kind,
                "topicNumber": topic_number,
                "topicTitle": topic_title,
                "topicRange": topic_range,
                "extension": extension,
                "sizeBytes": info.file_size,
                "zipCrc32": f"{info.CRC:08x}",
                "sha256": sha256_entry(archive, info.filename),
                "modifiedAt": iso_modified_at(info.date_time),
                "retention": "local-metadata-only",
                "machineTextStatus": "not-attempted",
                "reviewFlags": review_flags,
            })

    return entries, ignored


def group_duplicate_hashes(entries: list[dict[str, object]]) -> list[dict[str, object]]:
    grouped: dict[str, list[dict[str, str]]] = defaultdict(list)
    for entry in entries:
        grouped[str(entry["sha256"])].append({
            "languageVariant": str(entry["languageVariant"]),
            "paperComponent": str(entry["paperComponent"]),
            "entryKind": str(entry["entryKind"]),
            "fileName": str(entry["fileName"]),
        })
    return [
        {"sha256": digest, "entries": items}
        for digest, items in sorted(grouped.items())
        if len(items) > 1
    ]


def summarize_entries(entries: list[dict[str, object]], ignored: list[dict[str, object]]) -> dict[str, object]:
    paper_1_topics = sorted(
        int(entry["topicNumber"])
        for entry in entries
        if entry["paperComponent"] == "paper-1" and entry["entryKind"] == "topic-practice" and entry["topicNumber"] is not None
    )
    paper_2_topics = sorted(
        int(entry["topicNumber"])
        for entry in entries
        if entry["paperComponent"] == "paper-2" and entry["entryKind"] == "topic-practice" and entry["topicNumber"] is not None
    )
    aggregate_entries = [
        {
            "paperComponent": str(entry["paperComponent"]),
            "entryKind": str(entry["entryKind"]),
            "topicRange": str(entry["topicRange"]),
            "fileName": str(entry["fileName"]),
        }
        for entry in entries
        if entry["entryKind"] in {"topic-book-aggregate", "answer-aggregate"}
    ]

    return {
        "totals": {
            "entries": len(entries),
            "ignoredEntries": len(ignored),
            "pdfFiles": sum(1 for entry in entries if entry["extension"] == ".pdf"),
            "uncompressedBytes": sum(int(entry["sizeBytes"]) for entry in entries),
        },
        "languageCounts": dict(sorted(Counter(str(entry["languageVariant"]) for entry in entries).items())),
        "componentCounts": dict(sorted(Counter(str(entry["paperComponent"]) for entry in entries).items())),
        "entryKindCounts": dict(sorted(Counter(str(entry["entryKind"]) for entry in entries).items())),
        "extensionCounts": dict(sorted(Counter(str(entry["extension"]) for entry in entries).items())),
        "topicCoverage": {
            "paper1TopicNumbers": paper_1_topics,
            "paper2TopicNumbers": paper_2_topics,
            "expectedPaper1TopicNumbers": EXPECTED_PAPER_1_TOPICS,
            "expectedPaper2TopicNumbers": EXPECTED_PAPER_2_TOPICS,
            "missingPaper1TopicNumbers": sorted(set(EXPECTED_PAPER_1_TOPICS) - set(paper_1_topics)),
            "missingPaper2TopicNumbers": sorted(set(EXPECTED_PAPER_2_TOPICS) - set(paper_2_topics)),
        },
        "anomalies": {
            "unknownEntries": [
                {
                    "fileName": str(entry["fileName"]),
                    "paperComponent": str(entry["paperComponent"]),
                    "reviewFlags": entry["reviewFlags"],
                }
                for entry in entries
                if entry["reviewFlags"]
            ],
            "aggregateEntries": aggregate_entries,
            "duplicateHashes": group_duplicate_hashes(entries),
        },
    }


def build_manifest(zip_path: Path) -> dict[str, object]:
    entries, ignored = build_archive_entries(zip_path)
    summary = summarize_entries(entries, ignored)
    return {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "sourceArchive": {"languageVariant": "en", "name": zip_path.name},
        "sourceFamily": "Hong Kong DSE Mathematics topic-practice pack, English",
        "safetyNote": SAFETY_NOTE,
        **summary,
        "entries": entries,
        "ignoredEntries": ignored,
    }


def write_manifest(manifest: dict[str, object], output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def create_self_test_zip(path: Path) -> None:
    with ZipFile(path, "w", compression=ZIP_DEFLATED) as archive:
        archive.writestr("__MACOSX/root/._junk", "ignored")
        archive.writestr("root/.DS_Store", "ignored")
        for topic_number in EXPECTED_PAPER_1_TOPICS:
            archive.writestr(
                f"root/BY TOPIC (EN)/Paper 1/Topic {topic_number} Sample Paper 1 Area.pdf",
                f"%PDF-1.4\nself-test paper 1 topic {topic_number}\n",
            )
        archive.writestr(
            "root/BY TOPIC (EN)/Paper 1/Book 1 Topic 1-18.pdf",
            "%PDF-1.4\nself-test paper 1 aggregate\n",
        )
        for topic_number in EXPECTED_PAPER_2_TOPICS:
            archive.writestr(
                f"root/BY TOPIC (EN)/Paper 2/Topic {topic_number} Sample Paper 2 Area.pdf",
                f"%PDF-1.4\nself-test paper 2 topic {topic_number}\n",
            )
        archive.writestr(
            "root/BY TOPIC (EN)/Paper 2/Book 1 Topic 0-16 All Answers.pdf",
            "%PDF-1.4\nself-test paper 2 aggregate\n",
        )


def run_self_test() -> None:
    with tempfile.TemporaryDirectory() as temp_dir:
        test_zip = Path(temp_dir) / "hk-dse-topic-practice.zip"
        create_self_test_zip(test_zip)
        manifest = build_manifest(test_zip)

    assert manifest["totals"]["pdfFiles"] == 37, manifest["totals"]
    assert manifest["languageCounts"] == {"en": 37}, manifest["languageCounts"]
    assert manifest["componentCounts"] == {"paper-1": 19, "paper-2": 18}, manifest["componentCounts"]
    assert manifest["entryKindCounts"] == {"answer-aggregate": 1, "topic-book-aggregate": 1, "topic-practice": 35}, manifest["entryKindCounts"]
    coverage = manifest["topicCoverage"]
    assert coverage["paper1TopicNumbers"] == EXPECTED_PAPER_1_TOPICS, coverage
    assert coverage["paper2TopicNumbers"] == EXPECTED_PAPER_2_TOPICS, coverage
    assert not coverage["missingPaper1TopicNumbers"], coverage
    assert not coverage["missingPaper2TopicNumbers"], coverage
    assert len(manifest["anomalies"]["aggregateEntries"]) == 2, manifest["anomalies"]
    assert manifest["totals"]["ignoredEntries"] == 2, manifest["totals"]
    print("Self-test passed: HK DSE topic-practice manifest recognized 37 English PDFs.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Build a local-only HK DSE topic-practice metadata manifest.")
    parser.add_argument("zip_path", nargs="?", help="Path to the English DSE topic-practice ZIP archive.")
    parser.add_argument("--output", default=str(DEFAULT_OUTPUT), help="Output path for the local manifest JSON.")
    parser.add_argument("--self-test", action="store_true", help="Run the self-test with an in-memory ZIP fixture.")
    args = parser.parse_args()

    if args.self_test:
        run_self_test()
        return

    if not args.zip_path:
        parser.error("zip_path is required unless --self-test is used")

    zip_path = Path(args.zip_path).expanduser().resolve()
    manifest = build_manifest(zip_path)
    output_path = Path(args.output)
    write_manifest(manifest, output_path)
    print(json.dumps({
        "sourceArchive": manifest["sourceArchive"],
        "outputPath": str(output_path),
        "totals": manifest["totals"],
        "topicCoverage": manifest["topicCoverage"],
        "entryKindCounts": manifest["entryKindCounts"],
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
