#!/usr/bin/env python3
"""Build local-only metadata artifacts for Hong Kong UP junior textbook PDFs.

The script records file metadata, checksums, volume/grade signals, page-count
signals, and safe chapter abstractions only. It does not extract PDF body text,
machine-read source text, exercises, worked responses, figures, tables, page
images, page locators, or embeddings. Default outputs live under `.local/`,
which is ignored by the repository.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import tempfile
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path


DEFAULT_OUT_DIR = Path(".local/rag/hk-up-junior")
EXPECTED_VOLUMES = ["1A", "1B", "2A", "2B", "3A", "3B"]
EXPECTED_PAGE_COUNTS = {
    "1A": 407,
    "1B": 368,
    "2A": 413,
    "2B": 446,
    "3A": 383,
    "3B": 457,
}
VOLUME_TO_GRADE = {
    "1A": "S1",
    "1B": "S1",
    "2A": "S2",
    "2B": "S2",
    "3A": "S3",
    "3B": "S3",
}
VOLUME_TO_SEMESTER = {
    "1A": "upper",
    "1B": "lower",
    "2A": "upper",
    "2B": "lower",
    "3A": "upper",
    "3B": "lower",
}
SAFETY_NOTE = (
    "Local metadata-only artifact for Pearson/UP junior Chinese S1-S3 textbooks, "
    "owner-confirmed as Hong Kong Pei Jin/UP market material. Do not commit "
    "source PDFs, extracted PDF body text, machine-read source text, exercises, "
    "worked responses, figures, tables, page images, page locators, or embeddings."
)

CHAPTER_BLUEPRINTS = {
    "1A": [
        {
            "chapterSignal": "Arithmetic operations and directed-number readiness",
            "topicIds": ["integers", "algebra-basics"],
            "conceptIds": ["operation-order", "integer-sense", "number-line", "factors-multiples", "negative-numbers"],
        },
        {
            "chapterSignal": "Algebraic language, expressions, and simple relations",
            "topicIds": ["algebra-basics", "linear-equations"],
            "conceptIds": ["variables", "algebraic-expression", "substitution", "like-terms", "simple-equations"],
        },
        {
            "chapterSignal": "Geometry, measurement, and data-readiness foundations",
            "topicIds": ["angles", "statistics-s1"],
            "conceptIds": ["angle-language", "basic-measurement", "simple-charts", "data-reading"],
        },
    ],
    "1B": [
        {
            "chapterSignal": "Ratio, rate, percentage, and proportional comparison",
            "topicIds": ["ratios", "algebra-basics"],
            "conceptIds": ["ratio", "rate", "percentage", "unit-rate", "proportion", "scale"],
        },
        {
            "chapterSignal": "Lines, angles, polygons, and measurement reasoning",
            "topicIds": ["angles", "ratios"],
            "conceptIds": ["angle-relations", "parallel-lines", "polygons", "perimeter-area", "scale-drawing"],
        },
        {
            "chapterSignal": "Statistics, data displays, and S1 consolidation",
            "topicIds": ["statistics-s1", "integers", "ratios"],
            "conceptIds": ["data-representation", "average", "spread", "chart-interpretation", "multi-step-reasoning"],
        },
    ],
    "2A": [
        {
            "chapterSignal": "Linear equations, inequalities, and modelling",
            "topicIds": ["linear-equations", "algebra-basics"],
            "conceptIds": ["linear-equation", "inequality", "formula-rearrangement", "constraint", "modeling"],
        },
        {
            "chapterSignal": "Coordinates, straight-line graphs, and representation transfer",
            "topicIds": ["coordinates", "linear-equations"],
            "conceptIds": ["coordinate-plane", "ordered-pair", "straight-line-graph", "gradient", "intercept"],
        },
        {
            "chapterSignal": "Transformations, congruence, and geometric reasoning",
            "topicIds": ["transformations", "coordinates", "angles"],
            "conceptIds": ["translation", "reflection", "rotation", "symmetry", "congruence"],
        },
    ],
    "2B": [
        {
            "chapterSignal": "Probability foundations and data reasoning",
            "topicIds": ["probability-s2", "statistics-s1"],
            "conceptIds": ["sample-space", "event", "experimental-probability", "theoretical-probability", "data-interpretation"],
        },
        {
            "chapterSignal": "Geometry, mensuration, and spatial models",
            "topicIds": ["angles", "transformations", "coordinates"],
            "conceptIds": ["area-volume", "similarity-readiness", "spatial-visualization", "unit-conversion"],
        },
        {
            "chapterSignal": "Algebra, graphs, and S2 consolidation",
            "topicIds": ["linear-equations", "coordinates", "probability-s2"],
            "conceptIds": ["linear-model", "graphical-solution", "multi-step-reasoning", "strategy-selection"],
        },
    ],
    "3A": [
        {
            "chapterSignal": "Polynomials, identities, and factorization",
            "topicIds": ["polynomials", "algebra-basics"],
            "conceptIds": ["polynomial", "expansion", "factorization", "identity", "common-factor"],
        },
        {
            "chapterSignal": "Algebraic identities and square area patterns",
            "topicIds": ["identities-square-patterns"],
            "conceptIds": ["area-model", "perfect-square-identity", "difference-of-squares", "expansion", "factorisation", "identity-sign"],
        },
        {
            "chapterSignal": "Trigonometric ratios and measurement modelling",
            "topicIds": ["trigonometry-basics", "angles"],
            "conceptIds": ["right-triangle", "trigonometric-ratio", "angle-of-elevation", "similarity", "measurement-model"],
        },
    ],
    "3B": [
        {
            "chapterSignal": "Arc length and sector area",
            "topicIds": ["arc-length-sector-area"],
            "conceptIds": ["arc-length", "sector-area", "central-angle-degrees", "exact-pi", "measurement-units", "full-circle-invariant"],
        },
        {
            "chapterSignal": "Statistics, probability, and interpretation consolidation",
            "topicIds": ["statistics-s1", "probability-s2"],
            "conceptIds": ["data-interpretation", "probability", "sampling-language", "average-spread", "chart-comparison"],
        },
        {
            "chapterSignal": "Junior-to-senior transition and mixed problem solving",
            "topicIds": ["polynomials", "identities-square-patterns", "trigonometry-basics", "arc-length-sector-area"],
            "conceptIds": ["cross-topic-synthesis", "method-selection", "algebra-geometry-link", "representation-transfer"],
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


def volume_from_name(name: str) -> str:
    match = re.search(r"([123][AB])", name, flags=re.IGNORECASE)
    if not match:
        return "unknown"
    return match.group(1).upper()


def build_entry(path: Path) -> dict[str, object]:
    resolved = path.expanduser().resolve()
    if not resolved.exists():
        raise FileNotFoundError(f"PDF not found: {resolved}")
    if resolved.suffix.lower() != ".pdf":
        raise ValueError(f"Expected a PDF path: {resolved}")

    file_name = resolved.name
    volume = volume_from_name(file_name)
    page_count, page_count_status = count_pdf_pages(resolved)
    expected_pages = EXPECTED_PAGE_COUNTS.get(volume)
    review_flags = []
    if volume == "unknown":
        review_flags.append("unknown-volume")
    if expected_pages and page_count and page_count != expected_pages:
        review_flags.append("page-count-review-needed")
    if page_count_status != "available":
        review_flags.append("page-count-missing")

    return {
        "fileName": file_name,
        "extension": resolved.suffix.lower(),
        "sizeBytes": resolved.stat().st_size,
        "sha256": sha256_file(resolved),
        "volume": volume,
        "grade": VOLUME_TO_GRADE.get(volume, "unknown"),
        "semester": VOLUME_TO_SEMESTER.get(volume, "unknown"),
        "publisher": "HK_UNITED_PRIME_MIA",
        "seriesAlias": "Pearson/UP junior Chinese; Hong Kong Pei Jin/UP market material",
        "stage": "junior-secondary",
        "pageCount": page_count,
        "pageCountStatus": page_count_status,
        "expectedPageCount": expected_pages,
        "machineTextStatus": "not-extracted",
        "retention": "local-metadata-only",
        "bodyTextPersisted": False,
        "pageImagesPersisted": False,
        "sourceLocatorsPersisted": False,
        "embeddingsPersisted": False,
        "chapterSignals": CHAPTER_BLUEPRINTS.get(volume, []),
        "reviewFlags": review_flags,
    }


def draft_cards(entries: list[dict[str, object]]) -> list[dict[str, object]]:
    cards = []
    for entry in entries:
        volume = str(entry["volume"])
        grade = str(entry["grade"])
        semester = str(entry["semester"])
        for index, chapter in enumerate(entry["chapterSignals"], start=1):  # type: ignore[index]
            cards.append({
                "draftId": f"hk-up-junior-{volume.lower()}-{index:02d}",
                "curriculumTrack": "HK",
                "publisher": "HK_UNITED_PRIME_MIA",
                "stage": "junior-secondary",
                "volume": volume,
                "grade": grade,
                "semester": semester,
                "chapterSequence": index,
                "chapter": chapter["chapterSignal"],
                "topicIds": chapter["topicIds"],
                "conceptIds": chapter["conceptIds"],
                "safeSummaryDraft": "Use this card as abstract UP junior textbook sequencing and item-design guidance only.",
                "sourceDistanceStatus": "needs-S18-review",
            })
    return cards


def build_manifest(paths: list[Path]) -> tuple[dict[str, object], list[dict[str, object]]]:
    entries = [build_entry(path) for path in paths]
    cards = draft_cards(entries)
    volume_counts = Counter(str(entry["volume"]) for entry in entries)
    grade_counts = Counter(str(entry["grade"]) for entry in entries)
    missing_volumes = sorted(set(EXPECTED_VOLUMES) - set(volume_counts))
    duplicate_volumes = [
        {"volume": volume, "count": count}
        for volume, count in sorted(volume_counts.items())
        if volume in EXPECTED_VOLUMES and count > 1
    ]

    manifest = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "safetyNote": SAFETY_NOTE,
        "sourceFamily": "Hong Kong UP/Pearson junior Chinese S1-S3 textbook PDFs",
        "totals": {
            "files": len(entries),
            "pdfFiles": sum(1 for entry in entries if entry["extension"] == ".pdf"),
            "sizeBytes": sum(int(entry["sizeBytes"]) for entry in entries),
            "pageCount": sum(int(entry["pageCount"] or 0) for entry in entries),
            "safeCardDrafts": len(cards),
        },
        "volumeCounts": dict(sorted(volume_counts.items())),
        "gradeCounts": dict(sorted(grade_counts.items())),
        "expectedVolumes": EXPECTED_VOLUMES,
        "expectedTotalPageCount": sum(EXPECTED_PAGE_COUNTS.values()),
        "missingExpectedVolumes": missing_volumes,
        "duplicateExpectedVolumes": duplicate_volumes,
        "entries": entries,
    }
    return manifest, cards


def qa_report(manifest: dict[str, object], cards: list[dict[str, object]]) -> str:
    totals = manifest["totals"]  # type: ignore[index]
    return "\n".join([
        "# HK UP Junior Textbook Local Manifest QA",
        "",
        f"- Generated at: {manifest['generatedAt']}",
        f"- Files inspected: {totals['files']}",
        f"- PDF files: {totals['pdfFiles']}",
        f"- Page-count signal: {totals['pageCount']} of expected {manifest['expectedTotalPageCount']}",
        f"- Safe-card drafts: {len(cards)}",
        f"- Missing expected volumes: {json.dumps(manifest['missingExpectedVolumes'], ensure_ascii=False)}",
        f"- Duplicate expected volumes: {json.dumps(manifest['duplicateExpectedVolumes'], ensure_ascii=False)}",
        f"- Safety note: {SAFETY_NOTE}",
        "",
        "## Safety Gate",
        "",
        "- Passed: output artifacts contain file metadata, checksums, volume/grade/semester signals, page-count signals, and safe chapter abstractions only.",
        "- Passed: no PDF body text, machine-read source text, exercises, worked responses, figures, tables, page images, page locators, source excerpts, or embeddings are extracted or persisted.",
        "- Required before student-facing production use: S18 review of committed safe cards and any generated MAIS output.",
        "",
    ]) + "\n"


def write_outputs(manifest: dict[str, object], cards: list[dict[str, object]], out_dir: Path) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (out_dir / "safe-card-drafts.json").write_text(json.dumps(cards, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (out_dir / "qa-report.md").write_text(qa_report(manifest, cards), encoding="utf-8")


def fake_pdf_bytes(page_count: int) -> bytes:
    pages = "\n".join(f"{index} 0 obj << /Type /Page >> endobj" for index in range(1, page_count + 1))
    return f"%PDF-1.4\n{pages}\n%%EOF\n".encode("utf-8")


def run_self_test() -> None:
    with tempfile.TemporaryDirectory() as temp_dir:
        root = Path(temp_dir)
        paths = []
        for volume in EXPECTED_VOLUMES:
            pages = EXPECTED_PAGE_COUNTS[volume]
            path = root / f"Pearson UP junior Chinese {volume}.pdf"
            path.write_bytes(fake_pdf_bytes(pages))
            paths.append(path)
        manifest, cards = build_manifest(paths)

    assert manifest["totals"]["files"] == 6, manifest["totals"]
    assert manifest["totals"]["pdfFiles"] == 6, manifest["totals"]
    assert manifest["totals"]["pageCount"] == 2474, manifest["totals"]
    assert manifest["missingExpectedVolumes"] == [], manifest["missingExpectedVolumes"]
    assert manifest["duplicateExpectedVolumes"] == [], manifest["duplicateExpectedVolumes"]
    assert len(cards) == 18, len(cards)
    s3_topics = {
        topic_id
        for card in cards
        if card["grade"] == "S3"
        for topic_id in card["topicIds"]
    }
    assert "quadratic-patterns" not in s3_topics, s3_topics
    assert "circles" not in s3_topics, s3_topics
    assert "identities-square-patterns" in s3_topics, s3_topics
    assert "arc-length-sector-area" in s3_topics, s3_topics
    serialized = json.dumps(manifest, ensure_ascii=False)
    for forbidden in ["body text sample", "sourcePage", "page image bytes", "embeddingPayload"]:
        assert forbidden not in serialized
    print("Self-test passed: HK UP junior manifest builder recognized 6 volumes, 2474 pages, and 18 safe-card drafts.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Build local-only Hong Kong UP junior textbook metadata artifacts.")
    parser.add_argument("pdf_paths", nargs="*", help="Paths to the six local UP/Pearson junior textbook PDFs.")
    parser.add_argument("--out-dir", default=str(DEFAULT_OUT_DIR), help="Output directory. Defaults to ignored .local/rag/hk-up-junior/.")
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
        "Wrote local HK UP junior manifest with "
        f"{totals['pdfFiles']} PDFs, {totals['pageCount']} page-count signal, "
        f"and {len(cards)} safe-card drafts to {args.out_dir}"
    )


if __name__ == "__main__":
    main()
