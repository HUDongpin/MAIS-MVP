#!/usr/bin/env python3
"""Build local-only metadata artifacts for Hong Kong DSE UP textbook PDFs.

The script records file metadata, checksums, volume/grade signals, page-count
signals, and safe chapter abstractions only. It does not extract PDF text,
machine-read scans, page images, figures, tables, prompts, or worked responses.
Default outputs live under `.local/`, which is ignored by the repository.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import subprocess
import tempfile
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path


DEFAULT_OUT_DIR = Path(".local/rag/hk-dse-up")
EXPECTED_VOLUMES = ["4A", "4B", "5A", "5B", "6A", "6B"]
EXPECTED_PAGE_COUNTS = {
    "4A": 427,
    "4B": 404,
    "5A": 496,
    "5B": 402,
    "6A": 332,
    "6B": 452,
}
VOLUME_TO_GRADE = {
    "4A": "S4",
    "4B": "S4",
    "5A": "S5",
    "5B": "S5",
    "6A": "S6",
    "6B": "S6",
}
SAFETY_NOTE = (
    "Local metadata-only artifact. Do not commit textbook PDFs, extracted body "
    "text, machine-read source text, prompts, worked responses, figures, tables, "
    "page images, source locators, or embeddings."
)

CHAPTER_BLUEPRINTS = {
    "4A": [
        {
            "chapterSignal": "Algebra foundations and quadratic readiness",
            "topicIds": ["more-algebra", "linear-equations", "polynomials", "quadratic-patterns"],
            "conceptIds": ["algebraic-manipulation", "factorization", "linear-equations", "quadratic-equations", "inequalities", "indices"],
        },
        {
            "chapterSignal": "Functions, graphs, and coordinate methods",
            "topicIds": ["functions", "coordinate-geometry", "coordinates"],
            "conceptIds": ["functions", "graphs", "domain-range", "linear-functions", "quadratic-functions", "line-equations", "slope"],
        },
    ],
    "4B": [
        {
            "chapterSignal": "Geometry, measurement, and trigonometric foundations",
            "topicIds": ["trigonometry-basics", "angles", "circles", "perimeter-area", "volume"],
            "conceptIds": ["angle-relations", "similarity", "circle-geometry", "area-volume", "trigonometric-ratio", "bearings"],
        },
        {
            "chapterSignal": "Data handling and connected problem solving",
            "topicIds": ["data-handling", "statistics-s1", "exam-revision", "mixed-problem-solving"],
            "conceptIds": ["data-representation", "descriptive-statistics", "chart-interpretation", "multi-step-reasoning", "mathematical-communication"],
        },
    ],
    "5A": [
        {
            "chapterSignal": "Advanced functions and trigonometry",
            "topicIds": ["advanced-functions", "trigonometry-s5", "functions", "exam-revision"],
            "conceptIds": ["advanced-functions", "function-transformations", "trigonometric-functions", "identities", "solution-intervals", "parameters"],
        },
        {
            "chapterSignal": "Coordinate geometry and circle relations",
            "topicIds": ["coordinate-geometry", "circles", "mixed-problem-solving"],
            "conceptIds": ["circle-equations", "line-circle-intersection", "distance", "midpoint", "locus", "tangent", "geometric-conditions"],
        },
    ],
    "5B": [
        {
            "chapterSignal": "Probability, statistics, and uncertainty reasoning",
            "topicIds": ["probability-s5", "data-handling", "statistics-s1", "exam-revision"],
            "conceptIds": ["probability", "sample-space", "counting-cases", "descriptive-statistics", "data-representation", "expected-value"],
        },
        {
            "chapterSignal": "Algebraic modelling and S5 consolidation",
            "topicIds": ["more-algebra", "functions", "mixed-problem-solving", "exam-revision"],
            "conceptIds": ["modeling", "parameters", "equations", "inequalities", "functions", "strategy-selection"],
        },
    ],
    "6A": [
        {
            "chapterSignal": "Differentiation and applications",
            "topicIds": ["differentiation-intro", "advanced-functions", "exam-revision"],
            "conceptIds": ["differentiation", "rate-of-change", "tangent", "stationary-points", "optimization", "curve-sketching"],
        },
        {
            "chapterSignal": "Senior synthesis before final revision",
            "topicIds": ["advanced-functions", "probability-s5", "data-handling", "mixed-problem-solving"],
            "conceptIds": ["cross-topic-synthesis", "advanced-functions", "probability", "statistics", "case-analysis", "modeling"],
        },
    ],
    "6B": [
        {
            "chapterSignal": "Final DSE revision and mixed paper readiness",
            "topicIds": ["exam-revision", "mixed-problem-solving", "functions", "coordinate-geometry", "data-handling"],
            "conceptIds": ["exam-readiness", "multi-step-reasoning", "method-selection", "time-efficient-checking", "cross-topic-synthesis"],
        },
        {
            "chapterSignal": "Bilingual terminology and paper skills",
            "topicIds": ["exam-revision", "bilingual-math-language", "mixed-problem-solving"],
            "conceptIds": ["bilingual-terminology", "instruction-clarity", "mathematical-communication", "paper-strategy", "distractor-analysis"],
        },
    ],
}


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        while True:
            chunk = handle.read(1024 * 1024)
            if not chunk:
                break
            digest.update(chunk)
    return digest.hexdigest()


def volume_from_name(name: str) -> str:
    match = re.search(r"([456][AB])", name, flags=re.IGNORECASE)
    if not match:
        return "unknown"
    return match.group(1).upper()


def page_count_from_name(name: str, volume: str) -> int | None:
    if volume != "unknown":
        near_volume = re.search(rf"{re.escape(volume)}\s*([0-9]{{3}})", name, flags=re.IGNORECASE)
        if near_volume:
            return int(near_volume.group(1))
    generic = re.search(r"([0-9]{3})\s*[頁页]", name)
    if generic:
        return int(generic.group(1))
    return None


def spotlight_page_count(path: Path) -> int | None:
    try:
        result = subprocess.run(
            ["mdls", "-raw", "-name", "kMDItemNumberOfPages", str(path)],
            check=False,
            capture_output=True,
            text=True,
            timeout=8,
        )
    except (FileNotFoundError, subprocess.SubprocessError):
        return None
    value = result.stdout.strip()
    return int(value) if value.isdigit() else None


def edition_signal(name: str) -> str:
    if "三版" in name:
        return "third-edition-signal"
    if "二版" in name or "第二版" in name:
        return "second-edition-signal"
    if "2023" in name:
        return "2023-print-signal"
    return "unknown"


def build_entry(path: Path) -> dict[str, object]:
    file_name = path.name
    volume = volume_from_name(file_name)
    filename_pages = page_count_from_name(file_name, volume)
    spotlight_pages = spotlight_page_count(path)
    expected_pages = EXPECTED_PAGE_COUNTS.get(volume)
    page_count = spotlight_pages or filename_pages or expected_pages
    review_flags = []
    if path.suffix.lower() != ".pdf":
        review_flags.append("non-pdf")
    if volume == "unknown":
        review_flags.append("unknown-volume")
    if expected_pages and page_count and expected_pages != page_count:
        review_flags.append("page-count-review-needed")
    if spotlight_pages is None:
        review_flags.append("system-page-metadata-unavailable")

    return {
        "fileName": file_name,
        "pathFingerprint": hashlib.sha256(str(path).encode("utf-8", errors="replace")).hexdigest(),
        "extension": path.suffix.lower() or "<none>",
        "sizeBytes": path.stat().st_size,
        "sha256": sha256_file(path),
        "volume": volume,
        "grade": VOLUME_TO_GRADE.get(volume, "unknown"),
        "publisher": "HK_UNITED_PRIME_MIA",
        "textbookSeries": "Mathematics and Life",
        "editionSignal": edition_signal(file_name),
        "pageCountSignal": page_count,
        "expectedPageCount": expected_pages,
        "machineTextStatus": "not-attempted",
        "retention": "local-metadata-only",
        "chapterSignals": CHAPTER_BLUEPRINTS.get(volume, []),
        "reviewFlags": review_flags,
    }


def draft_cards(entries: list[dict[str, object]]) -> list[dict[str, object]]:
    cards = []
    for entry in entries:
        volume = str(entry["volume"])
        grade = str(entry["grade"])
        for index, chapter in enumerate(entry["chapterSignals"], start=1):  # type: ignore[index]
            cards.append({
                "draftId": f"hk-dse-up-{volume.lower()}-{index:02d}",
                "curriculumTrack": "HK",
                "publisher": "HK_UNITED_PRIME_MIA",
                "volume": volume,
                "grade": grade,
                "chapter": chapter["chapterSignal"],
                "topicIds": chapter["topicIds"],
                "conceptIds": chapter["conceptIds"],
                "safeSummaryDraft": "Use this card as abstract DSE UP textbook sequencing and item-design guidance only.",
                "sourceDistanceStatus": "needs-S18-review",
            })
    return cards


def build_manifest(paths: list[Path]) -> tuple[dict[str, object], list[dict[str, object]]]:
    entries = [build_entry(path.expanduser().resolve()) for path in paths]
    cards = draft_cards(entries)
    volume_counts = Counter(str(entry["volume"]) for entry in entries)
    grade_counts = Counter(str(entry["grade"]) for entry in entries)
    missing_volumes = sorted(set(EXPECTED_VOLUMES) - set(volume_counts))

    manifest = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "safetyNote": SAFETY_NOTE,
        "sourceFamily": "Hong Kong DSE UP Mathematics and Life textbook PDFs",
        "totals": {
            "files": len(entries),
            "pdfFiles": sum(1 for entry in entries if entry["extension"] == ".pdf"),
            "sizeBytes": sum(int(entry["sizeBytes"]) for entry in entries),
            "pageCountSignal": sum(int(entry["pageCountSignal"] or 0) for entry in entries),
            "safeCardDrafts": len(cards),
        },
        "volumeCounts": dict(sorted(volume_counts.items())),
        "gradeCounts": dict(sorted(grade_counts.items())),
        "expectedVolumes": EXPECTED_VOLUMES,
        "missingExpectedVolumes": missing_volumes,
        "entries": entries,
    }
    return manifest, cards


def qa_report(manifest: dict[str, object], cards: list[dict[str, object]]) -> str:
    totals = manifest["totals"]  # type: ignore[index]
    return "\n".join([
        "# HK DSE UP Textbook Local Manifest QA",
        "",
        f"- Generated at: {manifest['generatedAt']}",
        f"- Files inspected: {totals['files']}",
        f"- PDF files: {totals['pdfFiles']}",
        f"- Page-count signal: {totals['pageCountSignal']}",
        f"- Safe-card drafts: {len(cards)}",
        f"- Missing expected volumes: {json.dumps(manifest['missingExpectedVolumes'], ensure_ascii=False)}",
        f"- Safety note: {SAFETY_NOTE}",
        "",
        "## Safety Gate",
        "",
        "- Passed: output artifacts contain file metadata, checksums, volume/grade signals, page-count signals, and safe chapter abstractions only.",
        "- Passed: no PDF body text, machine-read source text, prompts, worked responses, figures, tables, page images, source locators, or embeddings are extracted or persisted.",
        "- Required before production use: S18 review of committed safe cards and any generated student-facing content.",
        "",
    ]) + "\n"


def write_outputs(manifest: dict[str, object], cards: list[dict[str, object]], out_dir: Path) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (out_dir / "safe-card-drafts.json").write_text(json.dumps(cards, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (out_dir / "qa-report.md").write_text(qa_report(manifest, cards), encoding="utf-8")


def run_self_test() -> None:
    with tempfile.TemporaryDirectory() as temp_dir:
        root = Path(temp_dir)
        paths = []
        for volume in EXPECTED_VOLUMES:
            pages = EXPECTED_PAGE_COUNTS[volume]
            path = root / f"Mathematics and Life {volume}{pages} pages.pdf"
            path.write_bytes(f"metadata-only fixture {volume}".encode("utf-8"))
            paths.append(path)
        manifest, cards = build_manifest(paths)

    assert manifest["totals"]["files"] == 6, manifest["totals"]
    assert manifest["totals"]["pdfFiles"] == 6, manifest["totals"]
    assert manifest["totals"]["pageCountSignal"] == 2513, manifest["totals"]
    assert manifest["missingExpectedVolumes"] == [], manifest["missingExpectedVolumes"]
    assert len(cards) == 12, len(cards)
    print("Self-test passed: HK DSE UP manifest builder recognized 6 volumes and 12 safe-card drafts.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Build local-only Hong Kong DSE UP textbook metadata artifacts.")
    parser.add_argument("pdf_paths", nargs="*", help="Paths to the six local DSE UP textbook PDFs.")
    parser.add_argument("--out-dir", default=str(DEFAULT_OUT_DIR), help="Output directory. Defaults to ignored .local/rag/hk-dse-up/.")
    parser.add_argument("--self-test", action="store_true", help="Run an in-memory metadata-only smoke test.")
    args = parser.parse_args()

    if args.self_test:
        run_self_test()
        return

    if not args.pdf_paths:
        raise SystemExit("At least one PDF path is required unless --self-test is used.")

    paths = [Path(path) for path in args.pdf_paths]
    missing = [str(path) for path in paths if not path.expanduser().exists()]
    if missing:
        raise SystemExit(f"PDF path not found: {missing[0]}")

    manifest, cards = build_manifest(paths)
    write_outputs(manifest, cards, Path(args.out_dir).expanduser())
    totals = manifest["totals"]
    print(
        "Wrote local HK DSE UP manifest with "
        f"{totals['pdfFiles']} PDFs, {totals['pageCountSignal']} page-count signal, "
        f"and {len(cards)} safe-card drafts to {args.out_dir}"
    )


if __name__ == "__main__":
    main()
