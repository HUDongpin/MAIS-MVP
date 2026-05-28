#!/usr/bin/env python3
"""Build a local-only redacted manifest for Mainland PEP high-school exam archives.

This script records file metadata and coarse classification only. It does not
extract, persist, or print document body text, answer text, worked solutions,
images, tables, or page content. The default output path is inside `.local/`,
which is ignored by the repository.
"""

from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from zipfile import ZipFile


DEFAULT_OUTPUT = Path(".local/rag/mainland-pep-high-exam-manifest.json")


def decode_zip_name(name: str) -> str:
    try:
        return name.encode("cp437").decode("gb18030")
    except UnicodeError:
        return name


def classify_entry(name: str) -> dict[str, object]:
    basename = name.rsplit("/", 1)[-1]
    extension = Path(basename).suffix.lower()
    year_match = re.search(r"20[0-9]{2}", name)
    year = year_match.group(0) if year_match else None
    role = "directory" if name.endswith("/") else "paper"
    if "解析" in name:
        role = "solution"
    elif "答案" in name:
        role = "answer"
    elif "空白" in name:
        role = "blank-paper"

    family_terms = [
        "全国Ⅰ卷",
        "全国Ⅱ卷",
        "全国甲卷",
        "全国乙卷",
        "新课标Ⅰ卷",
        "新课标Ⅱ卷",
        "新高考Ⅰ卷",
        "新高考Ⅱ卷",
        "北京",
        "天津",
        "上海",
        "浙江"
    ]
    families = [term for term in family_terms if term in name]
    legacy = any(term in name for term in ["文）", "文科", "理）", "理科"])

    return {
        "year": year,
        "role": role,
        "extension": extension,
        "families": families,
        "legacyStream": legacy
    }


def build_manifest(zip_path: Path) -> dict[str, object]:
    entries = []
    with ZipFile(zip_path) as archive:
        for info in archive.infolist():
            decoded_name = decode_zip_name(info.filename)
            classification = classify_entry(decoded_name)
            entries.append({
                "name": decoded_name,
                "sizeBytes": info.file_size,
                "compressedBytes": info.compress_size,
                **classification
            })

    files = [entry for entry in entries if entry["role"] != "directory"]
    year_counts: dict[str, int] = {}
    role_counts: dict[str, int] = {}
    extension_counts: dict[str, int] = {}
    family_counts: dict[str, int] = {}
    for entry in files:
        year = entry.get("year") or "unknown"
        role = str(entry["role"])
        extension = str(entry["extension"] or "<none>")
        year_counts[year] = year_counts.get(year, 0) + 1
        role_counts[role] = role_counts.get(role, 0) + 1
        extension_counts[extension] = extension_counts.get(extension, 0) + 1
        for family in entry["families"]:
            family_counts[family] = family_counts.get(family, 0) + 1

    return {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "sourceArchive": str(zip_path),
        "safetyNote": "Local-only manifest. Do not commit source documents or extracted document body text.",
        "totals": {
            "entries": len(entries),
            "files": len(files),
            "uncompressedBytes": sum(int(entry["sizeBytes"]) for entry in files)
        },
        "yearCounts": dict(sorted(year_counts.items())),
        "roleCounts": dict(sorted(role_counts.items())),
        "extensionCounts": dict(sorted(extension_counts.items())),
        "familyCounts": dict(sorted(family_counts.items())),
        "entries": entries
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Build a local-only high-school exam archive manifest.")
    parser.add_argument("zip_path", help="Path to the private exam archive zip.")
    parser.add_argument("--out", default=str(DEFAULT_OUTPUT), help="Output JSON path. Defaults to ignored .local/rag/.")
    args = parser.parse_args()

    zip_path = Path(args.zip_path).expanduser().resolve()
    output_path = Path(args.out).expanduser()
    if not zip_path.exists():
        raise SystemExit(f"Archive not found: {zip_path}")
    manifest = build_manifest(zip_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote local manifest with {manifest['totals']['files']} files to {output_path}")


if __name__ == "__main__":
    main()
