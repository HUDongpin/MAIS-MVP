#!/usr/bin/env python3
"""Build a local-only metadata manifest for Hong Kong EDB math materials.

The script reads ZIP directory metadata only. It does not extract, parse, or
persist PDF body content.
"""

from __future__ import annotations

import argparse
import json
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from zipfile import ZipFile


DEFAULT_OUTPUT = Path(".local/rag/hong-kong-math-edb-manifest.json")

CLASSIFICATION_BY_FILE = {
    "数学教育-学习领域课程指引（小一至中六）ME_KLACG_chi_2017_12_08.pdf": {
        "stage": "whole-curriculum",
        "documentPurposes": ["curriculum-guide"],
    },
    "数学教育学习领域课程指引补充文件-小学数学科学习内容pmc2017_tc.pdf": {
        "stage": "primary",
        "documentPurposes": ["learning-content-supplement"],
    },
    "小学数学课程阐释（第一学习阶段）EN_KS1_tc.pdf": {
        "stage": "primary",
        "documentPurposes": ["curriculum-interpretation"],
    },
    "小学数学课程阐释（第二学习阶段）EN_KS1_tc.pdf": {
        "stage": "primary",
        "documentPurposes": ["curriculum-interpretation"],
    },
    "小学数学修订课程（2017）内容与小学数学课程（2000）内容比较CT_Pri_tc.pdf": {
        "stage": "primary",
        "documentPurposes": ["revision-comparison"],
    },
    "数学教育学习领域课程指引补充文件-初中数学科学习内容jsmc2017_tc.pdf": {
        "stage": "junior-secondary",
        "documentPurposes": ["learning-content-supplement"],
    },
    "初中数学课程阐释EN_KS3_tc.pdf": {
        "stage": "junior-secondary",
        "documentPurposes": ["curriculum-interpretation"],
    },
    "初中数学修订课程内容与初中数学现行课程内容的比较CT_JS_tc.pdf": {
        "stage": "junior-secondary",
        "documentPurposes": ["revision-comparison"],
    },
    "数学教育学习领域课程指引补充文件-高中数学科学习内容jsmc2017_tc.pdf": {
        "stage": "senior-secondary-compulsory",
        "documentPurposes": ["learning-content-supplement"],
    },
    "高中数学课程阐释-必修部分EN_CP_tc_1.pdf": {
        "stage": "senior-secondary-compulsory",
        "documentPurposes": ["curriculum-interpretation"],
    },
    "高中数学（必修部分）修订课程内容与高中数学（必修部分）现行课程内容的比较CT_CP_tc.pdf": {
        "stage": "senior-secondary-compulsory",
        "documentPurposes": ["revision-comparison"],
    },
    "数学课程及评估指引（中四至中六）CA_2017_tc.pdf": {
        "stage": "senior-secondary-compulsory",
        "documentPurposes": ["curriculum-assessment-guide"],
    },
    "数学教育学习领域 数学课程及评估指引（中四至中六）Math_CAGuide_c_2015.pdf": {
        "stage": "senior-secondary-compulsory",
        "documentPurposes": ["curriculum-assessment-guide"],
    },
    "高中数学课程阐释-单元一（微积分与统计）.pdf": {
        "stage": "senior-secondary-m1",
        "documentPurposes": ["curriculum-interpretation"],
    },
    "高中数学（单元一）修订课程内容与高中数学（单元一）现行课程内容的比较CT_M1_tc.pdf": {
        "stage": "senior-secondary-m1",
        "documentPurposes": ["revision-comparison"],
    },
    "高中数学课程阐释-单元二（代数与微积分）EN_M2_tc.pdf": {
        "stage": "senior-secondary-m2",
        "documentPurposes": ["curriculum-interpretation"],
    },
    "高中数学（单元二）修订课程内容与高中数学（单元二）现行课程内容的比较CT_M2_tc.pdf": {
        "stage": "senior-secondary-m2",
        "documentPurposes": ["revision-comparison"],
    },
    "高中数学科照顾学生多样性及创造空间指引Guidelines on Catering for LD in SS Math (C).pdf": {
        "stage": "senior-secondary-support",
        "documentPurposes": ["learning-diversity-support"],
    },
    "数学科修订课程的推行时间表timeline_tc.pdf": {
        "stage": "implementation",
        "documentPurposes": ["implementation-timeline"],
    },
    "高中数学课程建议推行时间表CA_timeline_tc.pdf": {
        "stage": "implementation",
        "documentPurposes": ["implementation-timeline"],
    },
}


def iso_modified_at(date_time: tuple[int, int, int, int, int, int]) -> str:
    year, month, day, hour, minute, second = date_time
    return datetime(year, month, day, hour, minute, second, tzinfo=timezone.utc).isoformat()


def classify(file_name: str) -> dict[str, object]:
    return CLASSIFICATION_BY_FILE.get(
        file_name,
        {
            "stage": "unknown",
            "documentPurposes": ["unknown"],
        },
    )


def build_manifest(zip_path: Path) -> dict[str, object]:
    entries = []
    with ZipFile(zip_path) as archive:
        for info in archive.infolist():
            if info.is_dir():
                continue

            file_name = Path(info.filename).name
            classification = classify(file_name)
            entries.append({
                "path": info.filename,
                "fileName": file_name,
                "extension": Path(file_name).suffix.lower() or "<none>",
                "sizeBytes": info.file_size,
                "modifiedAt": iso_modified_at(info.date_time),
                "stage": classification["stage"],
                "documentPurposes": classification["documentPurposes"],
                "retention": "metadata-only",
            })

    stage_counts = Counter(entry["stage"] for entry in entries)
    purpose_counts = Counter(purpose for entry in entries for purpose in entry["documentPurposes"])
    extension_counts = Counter(entry["extension"] for entry in entries)

    return {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "sourceArchive": zip_path.name,
        "safetyNote": "Directory metadata only; no PDF body text, figures, tables, worked examples, scoring language, or page content is extracted or persisted.",
        "totals": {
            "entries": len(entries),
            "files": len(entries),
            "uncompressedBytes": sum(entry["sizeBytes"] for entry in entries),
        },
        "stageCounts": dict(sorted(stage_counts.items())),
        "purposeCounts": dict(sorted(purpose_counts.items())),
        "extensionCounts": dict(sorted(extension_counts.items())),
        "entries": entries,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Build a local-only Hong Kong EDB math materials manifest.")
    parser.add_argument("zip_path", help="Path to the Hong Kong EDB math materials ZIP archive.")
    parser.add_argument("--output", default=str(DEFAULT_OUTPUT), help="Output JSON path. Defaults to ignored .local/rag/.")
    args = parser.parse_args()

    zip_path = Path(args.zip_path).expanduser().resolve()
    output_path = Path(args.output).expanduser()
    if not zip_path.exists():
        raise SystemExit(f"ZIP archive not found: {zip_path}")

    manifest = build_manifest(zip_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote local Hong Kong EDB manifest with {manifest['totals']['files']} files to {output_path}")


if __name__ == "__main__":
    main()
