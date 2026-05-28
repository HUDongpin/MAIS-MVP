#!/usr/bin/env python3
"""Build local-only metadata manifests for U.S. math safe-library sources.

This script deliberately records file and URL metadata only. It never extracts
or persists PDF, DOCX, textbook, assessment, OCR, item, answer, rubric, figure,
table, or page body content. Default outputs live under ignored `.local/`.
"""

from __future__ import annotations

import argparse
import json
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from tempfile import TemporaryDirectory


DEFAULT_OUT_DIR = Path(".local/rag/us-math")
SAFETY_NOTE = (
    "Metadata-only local artifact. Do not commit raw standards documents, "
    "textbook body text, released assessment items, answer keys, rubrics, "
    "figures, tables, screenshots, OCR text, or page content."
)


def classify_source_kind(name: str) -> str:
    lower = name.lower()
    if any(term in lower for term in ["copyright", "license", "licence", "permission"]):
        return "copyright-guidance"
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
    lane = lane_for(kind, display_name)
    retention = retention_for(kind, lane, display_name)
    return {
        "name": display_name,
        "extension": path.suffix.lower() or "<none>",
        "sizeBytes": stat.st_size,
        "modifiedAt": datetime.fromtimestamp(stat.st_mtime, timezone.utc).isoformat(),
        "sourceKind": kind,
        "libraryLane": lane,
        "repositoryRetention": retention,
        "rawCorpusAllowed": False,
        "safeCardAllowed": retention != "blocked-without-license",
        "bodyTextRead": False,
    }


def entries_for_source(source: str) -> list[dict[str, object]]:
    if source.startswith("http://") or source.startswith("https://"):
        kind = classify_source_kind(source)
        lane = lane_for(kind, source)
        retention = retention_for(kind, lane, source)
        return [{
            "name": source,
            "extension": "<url>",
            "sizeBytes": None,
            "modifiedAt": None,
            "sourceKind": kind,
            "libraryLane": lane,
            "repositoryRetention": retention,
            "rawCorpusAllowed": False,
            "safeCardAllowed": retention != "blocked-without-license",
            "bodyTextRead": False,
        }]

    source_path = Path(source).expanduser().resolve()
    if not source_path.exists():
        raise SystemExit(f"Source not found: {source_path}")
    if source_path.is_file():
        return [entry_for_path(source_path, source_path.parent)]
    return [
        entry_for_path(path, source_path)
        for path in sorted(source_path.rglob("*"))
        if path.is_file()
    ]


def build_manifest(sources: list[str], state: str, reviewer: str) -> dict[str, object]:
    entries = [entry for source in sources for entry in entries_for_source(source)]
    lane_counts = Counter(str(entry["libraryLane"]) for entry in entries)
    kind_counts = Counter(str(entry["sourceKind"]) for entry in entries)
    retention_counts = Counter(str(entry["repositoryRetention"]) for entry in entries)

    return {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "state": state,
        "reviewer": reviewer,
        "safetyNote": SAFETY_NOTE,
        "totals": {
            "entries": len(entries),
            "rawCorpusAllowed": sum(1 for entry in entries if entry["rawCorpusAllowed"]),
            "safeCardAllowed": sum(1 for entry in entries if entry["safeCardAllowed"]),
        },
        "laneCounts": dict(sorted(lane_counts.items())),
        "sourceKindCounts": dict(sorted(kind_counts.items())),
        "retentionCounts": dict(sorted(retention_counts.items())),
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
    print("Self-test passed: U.S. math safe-library manifest remains metadata-only.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Build U.S. math metadata-only safe-library manifest.")
    parser.add_argument("sources", nargs="*", help="Local files/directories or public URLs to register as metadata-only sources.")
    parser.add_argument("--state", choices=["CA", "TX", "FL", "NY", "PA", "IL", "OH", "GA", "NC", "MI", "US"], default="US")
    parser.add_argument("--reviewer", default="S16")
    parser.add_argument("--out-dir", default=str(DEFAULT_OUT_DIR))
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()

    if args.self_test:
        self_test()
        return
    if not args.sources:
        raise SystemExit("Provide at least one local path or URL, or run with --self-test.")

    manifest = build_manifest(args.sources, args.state, args.reviewer)
    write_outputs(manifest, Path(args.out_dir))


if __name__ == "__main__":
    main()
