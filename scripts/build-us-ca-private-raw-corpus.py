#!/usr/bin/env python3
"""Build a local-private raw RAG corpus for owner-provided California math PDFs.

The output is intentionally local-only and defaults to ignored `.local/`.
Do not commit the generated chunks: they contain publisher textbook body text.
The committed U.S. safe-RAG layer should remain zero-verbatim unless a separate
rights-holder/district authorization and product policy are documented.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
import zipfile
from collections import Counter, defaultdict
from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path
from tempfile import TemporaryDirectory
from typing import Iterable

try:
    from pypdf import PdfReader
except Exception as exc:  # pragma: no cover - environment diagnostic
    raise SystemExit("pypdf is required for this script. Install or use the bundled workspace runtime.") from exc


DEFAULT_OUT_DIR = Path(".local/rag/us-ca-textbooks/raw-corpus-v1")
DEFAULT_TARGET_WORDS = 520
DEFAULT_OVERLAP_WORDS = 80
SAFETY_NOTE = (
    "Local-private raw textbook corpus. Generated chunks may contain publisher "
    "body text. Keep under ignored .local/ storage; do not commit, quote in "
    "reports, upload to live providers, or expose in public retrieval without "
    "documented authorization."
)

CA_CORE_TEXTBOOK_EXCLUDE_TERMS = [
    "coreplus",
    "core plus",
    "advanced mathematical concepts",
    "precalculus",
    "data management",
    "applications and concepts",
]

SOURCE_ROLE_PATTERNS = [
    ("answer-key", ["answer", "solutions", "solution key"]),
    ("teacher-guide", ["teacher", "teachers", "ens - california teachers"]),
    ("noteables", ["noteable", "notable", "notables"]),
    ("practice-workbook", ["practice", "prac", "wpp", "workbook", "enrich", "study guide", "sgin", "sp.pdf", "lg.pdf"]),
    ("chapter-file", ["chap", "chapter", "unit"]),
    ("student-edition", ["student edition", "_se", "- se", "student.edition"]),
]

STOPWORDS = {
    "about",
    "after",
    "again",
    "algebra",
    "also",
    "because",
    "before",
    "california",
    "chapter",
    "concept",
    "course",
    "edition",
    "example",
    "from",
    "geometry",
    "grade",
    "have",
    "into",
    "lesson",
    "math",
    "mathematics",
    "mcgraw",
    "page",
    "problem",
    "student",
    "teacher",
    "that",
    "this",
    "through",
    "with",
}


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def normalize_name(value: str) -> str:
    return re.sub(r"\s+", " ", value.replace("\\", "/")).strip()


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_text(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def safe_id(value: str, prefix: str = "us-ca-private") -> str:
    cleaned = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    cleaned = re.sub(r"-+", "-", cleaned)
    digest = hashlib.sha256(value.encode("utf-8")).hexdigest()[:10]
    if not cleaned:
        cleaned = "source"
    return f"{prefix}-{cleaned[:70]}-{digest}"


def infer_california_core_course(name: str, include_all_pdfs: bool = False) -> str | None:
    lower = name.lower()
    if not include_all_pdfs and any(term in lower for term in CA_CORE_TEXTBOOK_EXCLUDE_TERMS):
        return None
    if "algebra readiness" in lower:
        return "CA Algebra Readiness"
    if "pre-algebra" in lower or "prealgebra" in lower:
        return "CA Pre-Algebra"
    if "algebra 2" in lower or "algebra ii" in lower or "california algebra 2" in lower:
        return "CA Algebra 2"
    if "algebra 1" in lower or "algebra i" in lower or "california algebra 1" in lower:
        return "CA Algebra 1"
    if "geometry" in lower or "california geometry" in lower:
        return "CA Geometry"
    if "grade 7" in lower and "california mathematics" in lower:
        return "CA Grade 7 Mathematics"
    if include_all_pdfs and "california" in lower:
        return "CA Unclassified Mathematics"
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


def source_role(name: str) -> str:
    lower = name.lower()
    for role, patterns in SOURCE_ROLE_PATTERNS:
        if any(pattern in lower for pattern in patterns):
            return role
    return "textbook"


def should_skip_zip_entry(info: zipfile.ZipInfo) -> bool:
    if info.is_dir():
        return True
    parts = [part for part in info.filename.split("/") if part]
    if not parts:
        return True
    if parts[0] == "__MACOSX":
        return True
    if any(part.startswith("._") for part in parts):
        return True
    if any(part in {".DS_Store", "Thumbs.db"} for part in parts):
        return True
    return False


def clean_pdf_text(text: str) -> str:
    text = text.replace("\x00", " ")
    text = text.replace("\u00ad", "")
    text = re.sub(r"(?<=\w)-\s*\n\s*(?=\w)", "", text)
    text = re.sub(r"[ \t\r\f\v]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def extract_pdf_pages(data: bytes) -> tuple[list[dict[str, object]], dict[str, object]]:
    reader = PdfReader(BytesIO(data))
    if reader.is_encrypted:
        try:
            reader.decrypt("")
        except Exception:
            pass

    pages: list[dict[str, object]] = []
    failures = 0
    for index, page in enumerate(reader.pages, start=1):
        try:
            text = clean_pdf_text(page.extract_text() or "")
        except Exception:
            text = ""
            failures += 1
        if text:
            pages.append({
                "page": index,
                "text": text,
                "wordCount": len(text.split()),
                "charCount": len(text),
            })

    stats = {
        "pageCount": len(reader.pages),
        "pagesWithText": len(pages),
        "pageExtractionFailures": failures,
        "textCharCount": sum(int(page["charCount"]) for page in pages),
        "textWordCount": sum(int(page["wordCount"]) for page in pages),
    }
    return pages, stats


def words_for_pages(pages: list[dict[str, object]]) -> list[tuple[str, int]]:
    words: list[tuple[str, int]] = []
    for page in pages:
        page_number = int(page["page"])
        for word in str(page["text"]).split():
            words.append((word, page_number))
    return words


def chunk_pages(
    pages: list[dict[str, object]],
    source_id: str,
    source_name: str,
    course: str,
    mapped_grades: list[str],
    target_words: int,
    overlap_words: int,
) -> list[dict[str, object]]:
    words = words_for_pages(pages)
    chunks: list[dict[str, object]] = []
    start = 0
    chunk_index = 1
    while start < len(words):
        end = min(len(words), start + target_words)
        slice_words = words[start:end]
        text = " ".join(word for word, _page in slice_words).strip()
        if text:
            page_numbers = [page for _word, page in slice_words]
            chunk_id = f"{source_id}-chunk-{chunk_index:05d}"
            chunks.append({
                "chunkId": chunk_id,
                "sourceId": source_id,
                "sourceName": source_name,
                "course": course,
                "mappedGrades": mapped_grades,
                "pageStart": min(page_numbers),
                "pageEnd": max(page_numbers),
                "wordCount": len(slice_words),
                "charCount": len(text),
                "textSha256": sha256_text(text),
                "text": text,
            })
            chunk_index += 1
        if end >= len(words):
            break
        start = max(end - overlap_words, start + 1)
    return chunks


def tokenize(value: str) -> list[str]:
    tokens = re.findall(r"[a-zA-Z][a-zA-Z0-9]{2,}|[0-9]+(?:\.[0-9]+)?", value.lower())
    return [token for token in tokens if token not in STOPWORDS and len(token) >= 3]


def build_keyword_index(chunks: list[dict[str, object]], max_postings_per_token: int = 2500) -> dict[str, object]:
    postings: dict[str, set[str]] = defaultdict(set)
    document_frequency: Counter[str] = Counter()
    for chunk in chunks:
        chunk_id = str(chunk["chunkId"])
        unique_tokens = set(tokenize(str(chunk["text"])))
        document_frequency.update(unique_tokens)
        for token in unique_tokens:
            if len(postings[token]) < max_postings_per_token:
                postings[token].add(chunk_id)

    return {
        "generatedAt": utc_now(),
        "indexKind": "keyword-inverted-index",
        "chunkCount": len(chunks),
        "tokenCount": len(postings),
        "maxPostingsPerToken": max_postings_per_token,
        "topDocumentFrequency": document_frequency.most_common(200),
        "postings": {token: sorted(ids) for token, ids in sorted(postings.items())},
    }


def iter_local_pdf_sources(path: Path, include_all_pdfs: bool) -> Iterable[dict[str, object]]:
    if path.is_file() and path.suffix.lower() == ".zip":
        with zipfile.ZipFile(path) as archive:
            for info in sorted(archive.infolist(), key=lambda item: item.filename):
                if should_skip_zip_entry(info):
                    continue
                if Path(info.filename).suffix.lower() != ".pdf":
                    continue
                name = normalize_name(info.filename)
                course = infer_california_core_course(name, include_all_pdfs=include_all_pdfs)
                if not course:
                    continue
                data = archive.read(info)
                yield {
                    "sourceName": name,
                    "sourceContainer": str(path),
                    "zipEntryName": info.filename,
                    "sizeBytes": info.file_size,
                    "modifiedAt": datetime(*info.date_time, tzinfo=timezone.utc).isoformat(),
                    "sha256": sha256_bytes(data),
                    "data": data,
                    "course": course,
                    "sourceRole": source_role(name),
                }
        return

    if path.is_file():
        candidates = [path]
        base = path.parent
    else:
        candidates = sorted(candidate for candidate in path.rglob("*.pdf") if candidate.is_file())
        base = path

    for candidate in candidates:
        name = normalize_name(str(candidate.relative_to(base)) if candidate != path else candidate.name)
        course = infer_california_core_course(name, include_all_pdfs=include_all_pdfs)
        if not course:
            continue
        data = candidate.read_bytes()
        yield {
            "sourceName": name,
            "sourceContainer": str(path),
            "zipEntryName": None,
            "sizeBytes": candidate.stat().st_size,
            "modifiedAt": datetime.fromtimestamp(candidate.stat().st_mtime, timezone.utc).isoformat(),
            "sha256": sha256_bytes(data),
            "data": data,
            "course": course,
            "sourceRole": source_role(name),
        }


def build_corpus(
    sources: list[Path],
    out_dir: Path,
    reviewer: str,
    include_all_pdfs: bool,
    target_words: int,
    overlap_words: int,
) -> dict[str, object]:
    out_dir.mkdir(parents=True, exist_ok=True)
    chunks_dir = out_dir / "chunks"
    chunks_dir.mkdir(parents=True, exist_ok=True)
    chunks_path = chunks_dir / "chunks.jsonl"

    source_entries: list[dict[str, object]] = []
    all_chunks: list[dict[str, object]] = []
    issues: list[str] = []

    with chunks_path.open("w", encoding="utf-8") as chunks_file:
        for source in sources:
            for pdf in iter_local_pdf_sources(source.expanduser().resolve(), include_all_pdfs):
                source_name = str(pdf["sourceName"])
                course = str(pdf["course"])
                mapped_grades = mapped_grades_for_california_course(course)
                source_id = safe_id(f"{course}-{source_name}-{pdf['sha256']}")
                try:
                    pages, stats = extract_pdf_pages(pdf["data"])  # type: ignore[arg-type]
                    chunks = chunk_pages(
                        pages,
                        source_id=source_id,
                        source_name=source_name,
                        course=course,
                        mapped_grades=mapped_grades,
                        target_words=target_words,
                        overlap_words=overlap_words,
                    )
                except Exception as exc:
                    pages = []
                    stats = {
                        "pageCount": 0,
                        "pagesWithText": 0,
                        "pageExtractionFailures": 1,
                        "textCharCount": 0,
                        "textWordCount": 0,
                    }
                    chunks = []
                    issues.append(f"{source_name}: extraction failed ({type(exc).__name__})")

                for chunk in chunks:
                    chunks_file.write(json.dumps(chunk, ensure_ascii=False, sort_keys=True) + "\n")
                all_chunks.extend(chunks)

                source_entries.append({
                    "sourceId": source_id,
                    "sourceName": source_name,
                    "sourceContainer": pdf["sourceContainer"],
                    "zipEntryName": pdf["zipEntryName"],
                    "sha256": pdf["sha256"],
                    "sizeBytes": pdf["sizeBytes"],
                    "modifiedAt": pdf["modifiedAt"],
                    "inferredCaliforniaCourse": course,
                    "mappedGrades": mapped_grades,
                    "sourceRole": pdf["sourceRole"],
                    "libraryLane": "licensed-private-library",
                    "repositoryRetention": "local-private-analysis-only",
                    "rawCorpusAllowed": True,
                    "safeCardAllowed": True,
                    "bodyTextRead": True,
                    "chunkPath": str(chunks_path.relative_to(out_dir)),
                    "chunkCount": len(chunks),
                    **stats,
                })

    keyword_index = build_keyword_index(all_chunks)
    (out_dir / "keyword-index.json").write_text(
        json.dumps(keyword_index, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )

    course_counts = Counter(str(entry["inferredCaliforniaCourse"]) for entry in source_entries)
    role_counts = Counter(str(entry["sourceRole"]) for entry in source_entries)
    grade_counts = Counter(grade for entry in source_entries for grade in entry["mappedGrades"])  # type: ignore[index]
    manifest = {
        "corpusId": "us-ca-private-raw-textbook-corpus-v1",
        "generatedAt": utc_now(),
        "state": "CA",
        "curriculumTrack": "US_CA_MATH",
        "reviewer": reviewer,
        "safetyNote": SAFETY_NOTE,
        "storagePolicy": {
            "outputDirectory": str(out_dir),
            "repositoryRetention": "local-private-analysis-only",
            "committedSafeRagPolicy": "zero-verbatim; do not change data/rag/usMath.ts raw corpus permissions without documented authorization.",
            "rawTextStored": True,
            "rawTextStorage": str(chunks_path.relative_to(out_dir)),
            "gitIgnoreExpected": ".local/",
        },
        "chunking": {
            "targetWords": target_words,
            "overlapWords": overlap_words,
            "chunkFile": str(chunks_path.relative_to(out_dir)),
            "keywordIndexFile": "keyword-index.json",
        },
        "filters": {
            "includeAllPdfs": include_all_pdfs,
            "californiaCoreOnlyByDefault": not include_all_pdfs,
            "excludedCourseFamilies": CA_CORE_TEXTBOOK_EXCLUDE_TERMS,
        },
        "totals": {
            "sources": len(source_entries),
            "sourcesWithText": sum(1 for entry in source_entries if int(entry["pagesWithText"]) > 0),
            "chunks": len(all_chunks),
            "pages": sum(int(entry["pageCount"]) for entry in source_entries),
            "pagesWithText": sum(int(entry["pagesWithText"]) for entry in source_entries),
            "textChars": sum(int(entry["textCharCount"]) for entry in source_entries),
            "textWords": sum(int(entry["textWordCount"]) for entry in source_entries),
            "rawCorpusAllowed": sum(1 for entry in source_entries if entry["rawCorpusAllowed"]),
            "bodyTextRead": sum(1 for entry in source_entries if entry["bodyTextRead"]),
        },
        "courseCounts": dict(sorted(course_counts.items())),
        "gradeCounts": dict(sorted(grade_counts.items())),
        "sourceRoleCounts": dict(sorted(role_counts.items())),
        "issues": issues,
        "sources": source_entries,
    }
    (out_dir / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )

    report = render_report(manifest)
    (out_dir / "README.md").write_text(report, encoding="utf-8")
    return manifest


def render_report(manifest: dict[str, object]) -> str:
    totals = manifest["totals"]  # type: ignore[index]
    course_counts = manifest["courseCounts"]  # type: ignore[index]
    role_counts = manifest["sourceRoleCounts"]  # type: ignore[index]
    issues = manifest["issues"]  # type: ignore[index]
    lines = [
        "# US CA Local Private Raw Textbook Corpus v1",
        "",
        f"- Generated at: `{manifest['generatedAt']}`",
        f"- Curriculum track: `{manifest['curriculumTrack']}`",
        f"- Sources: `{totals['sources']}`",
        f"- Chunks: `{totals['chunks']}`",
        f"- Pages with text: `{totals['pagesWithText']}` / `{totals['pages']}`",
        f"- Text words: `{totals['textWords']}`",
        "",
        "## Safety",
        "",
        f"- {manifest['safetyNote']}",
        "- This README intentionally does not quote source body text.",
        "- The committed U.S. safe-RAG layer remains zero-verbatim unless separately authorized.",
        "",
        "## Course Counts",
        "",
    ]
    for course, count in course_counts.items():  # type: ignore[union-attr]
        lines.append(f"- `{course}`: {count}")
    lines.extend(["", "## Source Role Counts", ""])
    for role, count in role_counts.items():  # type: ignore[union-attr]
        lines.append(f"- `{role}`: {count}")
    lines.extend(["", "## Files", ""])
    lines.append("- `manifest.json`: source inventory and extraction counts.")
    lines.append("- `chunks/chunks.jsonl`: raw textbook text chunks; do not commit or quote.")
    lines.append("- `keyword-index.json`: local keyword inverted index.")
    if issues:
        lines.extend(["", "## Issues", ""])
        for issue in issues:  # type: ignore[union-attr]
            lines.append(f"- {issue}")
    return "\n".join(lines) + "\n"


def self_test() -> None:
    with TemporaryDirectory() as tmp:
        root = Path(tmp)
        assert infer_california_core_course("Mathematics - California Mathematics Grade 7 Noteables.pdf") == "CA Grade 7 Mathematics"
        assert infer_california_core_course("CALIFORNIA ALGEBRA 1/a1-Practice.pdf") == "CA Algebra 1"
        assert infer_california_core_course("Core Plus Math 1/unit01.pdf") is None
        assert mapped_grades_for_california_course("CA Geometry") == ["S4"]
        pages = [
            {"page": 1, "text": "Proportional relationships use a constant of proportionality.", "wordCount": 7, "charCount": 64},
            {"page": 2, "text": "Linear equations connect tables, graphs, and symbolic rules.", "wordCount": 8, "charCount": 60},
        ]
        chunks = chunk_pages(
            pages,
            source_id="fixture",
            source_name="fixture.pdf",
            course="CA Grade 7 Mathematics",
            mapped_grades=["S1"],
            target_words=6,
            overlap_words=2,
        )
        assert len(chunks) >= 2
        index = build_keyword_index(chunks)
        assert index["chunkCount"] == len(chunks)
        assert "proportional" in index["postings"]  # type: ignore[index]
        report = render_report({
            "generatedAt": "2026-06-02T00:00:00+00:00",
            "curriculumTrack": "US_CA_MATH",
            "safetyNote": SAFETY_NOTE,
            "totals": {"sources": 1, "chunks": len(chunks), "pagesWithText": 2, "pages": 2, "textWords": 15},
            "courseCounts": {"CA Grade 7 Mathematics": 1},
            "sourceRoleCounts": {"textbook": 1},
            "issues": [],
        })
        assert "does not quote" in report
        (root / "ok.txt").write_text("self-test fixture\n", encoding="utf-8")
    print("Self-test passed: local-private CA raw corpus helpers are working.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Build local-private raw RAG corpus from owner-provided California math PDFs.")
    parser.add_argument("sources", nargs="*", help="Zip, directory, or PDF paths to ingest.")
    parser.add_argument("--out-dir", default=str(DEFAULT_OUT_DIR), help=f"Output directory. Defaults to {DEFAULT_OUT_DIR}.")
    parser.add_argument("--reviewer", default="S18")
    parser.add_argument("--include-all-pdfs", action="store_true", help="Include all PDFs with California signals instead of the default core-course filter.")
    parser.add_argument("--target-words", type=int, default=DEFAULT_TARGET_WORDS)
    parser.add_argument("--overlap-words", type=int, default=DEFAULT_OVERLAP_WORDS)
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()

    if args.self_test:
        self_test()
        return

    if not args.sources:
        raise SystemExit("Provide at least one zip, directory, or PDF source path.")
    if args.target_words < 100:
        raise SystemExit("--target-words must be at least 100.")
    if args.overlap_words < 0 or args.overlap_words >= args.target_words:
        raise SystemExit("--overlap-words must be non-negative and smaller than --target-words.")

    out_dir = Path(args.out_dir)
    manifest = build_corpus(
        sources=[Path(source) for source in args.sources],
        out_dir=out_dir,
        reviewer=args.reviewer,
        include_all_pdfs=args.include_all_pdfs,
        target_words=args.target_words,
        overlap_words=args.overlap_words,
    )
    totals = manifest["totals"]  # type: ignore[index]
    print(
        "Wrote local-private raw corpus: "
        f"{totals['sources']} sources, {totals['chunks']} chunks, "
        f"{totals['pagesWithText']} text pages to {out_dir}"
    )
    if manifest["issues"]:  # type: ignore[index]
        print(f"Extraction issues: {len(manifest['issues'])}", file=sys.stderr)  # type: ignore[index]


if __name__ == "__main__":
    main()
