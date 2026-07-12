#!/usr/bin/env python3
"""Query the local-private U.S. California raw textbook corpus.

By default this prints metadata only and does not reveal publisher body text.
Use --show-text only for local/private review with appropriate authorization.
"""

from __future__ import annotations

import argparse
import json
import re
from collections import Counter
from pathlib import Path


DEFAULT_CORPUS_DIR = Path(".local/rag/us-ca-textbooks/raw-corpus-v1")
STOPWORDS = {
    "about",
    "after",
    "again",
    "algebra",
    "also",
    "and",
    "are",
    "because",
    "before",
    "california",
    "chapter",
    "concept",
    "course",
    "edition",
    "example",
    "for",
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
    "the",
    "this",
    "through",
    "with",
    "you",
}


def tokenize(value: str) -> list[str]:
    tokens = re.findall(r"[a-zA-Z][a-zA-Z0-9]{2,}|[0-9]+(?:\.[0-9]+)?", value.lower())
    return [token for token in tokens if token not in STOPWORDS and len(token) >= 3]


def load_json(path: Path) -> object:
    return json.loads(path.read_text(encoding="utf-8"))


def load_chunks(path: Path, wanted: set[str] | None, show_text: bool) -> dict[str, dict[str, object]]:
    chunks: dict[str, dict[str, object]] = {}
    with path.open("r", encoding="utf-8") as handle:
        for line in handle:
            chunk = json.loads(line)
            chunk_id = str(chunk["chunkId"])
            if wanted is not None and chunk_id not in wanted:
                continue
            if not show_text:
                chunk.pop("text", None)
            chunks[chunk_id] = chunk
    return chunks


def search(corpus_dir: Path, query: str, limit: int, show_text: bool, text_words: int) -> dict[str, object]:
    manifest = load_json(corpus_dir / "manifest.json")
    index = load_json(corpus_dir / "keyword-index.json")
    tokens = tokenize(query)
    postings = index["postings"]  # type: ignore[index]
    scores: Counter[str] = Counter()
    for token in tokens:
        for chunk_id in postings.get(token, []):
            scores[str(chunk_id)] += 1

    wanted = {chunk_id for chunk_id, _score in scores.most_common(limit * 12)}
    chunks_path = corpus_dir / manifest["chunking"]["chunkFile"]  # type: ignore[index]
    chunks = load_chunks(chunks_path, wanted, show_text)

    results = []
    for chunk_id, score in scores.most_common(limit):
        chunk = chunks.get(chunk_id)
        if not chunk:
            continue
        result = {
            "chunkId": chunk["chunkId"],
            "score": score,
            "course": chunk["course"],
            "mappedGrades": chunk["mappedGrades"],
            "sourceName": chunk["sourceName"],
            "pageStart": chunk["pageStart"],
            "pageEnd": chunk["pageEnd"],
            "wordCount": chunk["wordCount"],
            "textSha256": chunk["textSha256"],
        }
        if show_text:
            words = str(chunk.get("text", "")).split()
            result["textPreview"] = " ".join(words[:text_words])
        results.append(result)

    return {
        "query": query,
        "tokens": tokens,
        "corpusId": manifest["corpusId"],  # type: ignore[index]
        "safetyNote": "Default output is metadata-only; --show-text reveals local-private publisher text.",
        "resultCount": len(results),
        "results": results,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Query the local-private U.S. California raw textbook corpus.")
    parser.add_argument("query", help="Search query.")
    parser.add_argument("--corpus-dir", default=str(DEFAULT_CORPUS_DIR))
    parser.add_argument("--limit", type=int, default=8)
    parser.add_argument("--show-text", action="store_true", help="Print local-private source text previews.")
    parser.add_argument("--text-words", type=int, default=120)
    args = parser.parse_args()

    if args.limit < 1:
        raise SystemExit("--limit must be at least 1.")
    if args.text_words < 1:
        raise SystemExit("--text-words must be at least 1.")

    result = search(Path(args.corpus_dir), args.query, args.limit, args.show_text, args.text_words)
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
