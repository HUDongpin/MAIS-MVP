from __future__ import annotations

import importlib.util
import sys
import tempfile
import unittest
import zipfile
from collections import Counter
from pathlib import Path

from docx import Document
from lxml import etree


HERE = Path(__file__).resolve().parent
PROJECT_ROOT = HERE.parents[2]
BUILDER_PATH = HERE / "build_california_k5_content_qa_template.py"
HANDOFF_PATH = HERE / "MAIS_CA-Math_K-5_Content_QA_Template.docx"


class HandoffArtifactTests(unittest.TestCase):
    def test_handoff_artifact_has_scanner_safe_ooxml_metadata(self):
        word_namespace = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
        story_parts = {
            "word/document.xml",
            "word/footnotes.xml",
            "word/endnotes.xml",
            "word/comments.xml",
        }

        with zipfile.ZipFile(HANDOFF_PATH) as archive:
            names = set(archive.namelist())
            self.assertNotIn("docProps/thumbnail.emf", names)
            jpeg_names = names & {
                "docProps/thumbnail.jpeg",
                "docProps/thumbnail.jpg",
            }
            self.assertEqual(1, len(jpeg_names))
            jpeg_payload = archive.read(jpeg_names.pop())
            self.assertTrue(jpeg_payload.startswith(b"\xff\xd8\xff"))
            self.assertNotIn("docProps/custom.xml", names)

            core = etree.fromstring(archive.read("docProps/core.xml"))
            core_namespaces = {
                "cp": "http://schemas.openxmlformats.org/package/2006/metadata/core-properties",
                "dc": "http://purl.org/dc/elements/1.1/",
            }
            creator = core.xpath("string(dc:creator)", namespaces=core_namespaces).strip()
            last_modified_by = core.xpath(
                "string(cp:lastModifiedBy)", namespaces=core_namespaces
            ).strip()
            self.assertTrue(creator in ("", "MAIS"), "Core creator must be blank or MAIS")
            self.assertTrue(
                last_modified_by in ("", "MAIS"),
                "Core lastModifiedBy must be blank or MAIS",
            )

            story_parts.update(
                name
                for name in names
                if name.startswith("word/header") or name.startswith("word/footer")
            )
            for story_part in sorted(story_parts & names):
                root = etree.fromstring(archive.read(story_part))
                has_revision_attribute = any(
                    etree.QName(attribute_name).namespace == word_namespace
                    and etree.QName(attribute_name).localname.startswith("rsid")
                    for element in root.iter()
                    for attribute_name in element.attrib
                )
                self.assertFalse(
                    has_revision_attribute,
                    f"Word story part contains revision-session attributes: {story_part}",
                )


def load_builder():
    spec = importlib.util.spec_from_file_location("california_k5_qa_builder", BUILDER_PATH)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Unable to load builder from {BUILDER_PATH}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


class InventoryTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.builder = load_builder()
        cls.inventory = cls.builder.load_lesson_inventory(PROJECT_ROOT)
        cls.catalog = cls.builder.load_standard_catalog(PROJECT_ROOT)

    def test_inventory_has_exact_live_k5_scope(self):
        self.assertEqual(41, len(self.inventory))
        self.assertEqual(
            {"K": 6, "P1": 16, "P2": 4, "P3": 5, "P4": 5, "P5": 5},
            dict(Counter(row.grade_id for row in self.inventory)),
        )
        self.assertEqual(29, sum(row.lesson_type == "Core" for row in self.inventory))
        self.assertEqual(12, sum(row.lesson_type == "Micro" for row in self.inventory))
        self.assertEqual(41, len({row.topic_id for row in self.inventory}))

    def test_standard_catalog_has_148_unique_fine_grained_ids(self):
        all_ids = [standard_id for row in self.catalog for standard_id in row.standard_ids]
        self.assertEqual(148, len(all_ids))
        self.assertEqual(148, len(set(all_ids)))
        self.assertEqual(
            {"K": 22, "P1": 21, "P2": 26, "P3": 25, "P4": 28, "P5": 26},
            dict(Counter(row.grade_id for row in self.catalog for _ in row.standard_ids)),
        )

    def test_practice_pack_reconciles_all_148_canonical_and_mais_ids(self):
        mappings = self.builder.load_practice_standard_mappings(PROJECT_ROOT)
        self.assertEqual(148, len(mappings))
        self.assertEqual(
            {canonical: f"CA.CCSS.Math.{canonical}" for canonical in mappings},
            mappings,
        )
        catalog_ids = {
            standard_id for row in self.catalog for standard_id in row.standard_ids
        }
        self.assertEqual(catalog_ids, set(mappings))

    def test_target_calibration_metadata_matches_current_sources(self):
        target = next(
            row for row in self.inventory if row.topic_id == "us-ca-math-p1-1-oa-add-subtract"
        )
        self.assertEqual("P1", target.grade_id)
        self.assertEqual("Core", target.lesson_type)
        self.assertEqual("1.OA", target.domain_id)
        self.assertEqual("1.OA.add-subtract", target.cluster_id)
        self.assertEqual(tuple(f"1.OA.{index}" for index in range(1, 9)), target.standard_ids)
        self.assertEqual(35, target.estimated_minutes)
        self.assertEqual(8, target.source_practice_count)
        self.assertEqual("us-ca-k-g5-tx-v1-p1-1-oa-add-subtract", target.source_lesson_id)
        self.assertEqual("Low", target.difficulty)
        self.assertEqual("en-primary", target.language_variant)
        self.assertEqual("approved-for-review", target.approval_status)
        self.assertEqual(
            "MAIS-authored-original-from-public-standards-structure",
            target.source_safety_status,
        )
        self.assertEqual(
            ("concept", "worked-example", "checklist", "visualization", "extension", "teacher-guide"),
            target.runtime_block_types,
        )


class DocumentBuildTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.builder = load_builder()
        cls.temp_dir = tempfile.TemporaryDirectory(prefix="california_k5_qa_test_")
        cls.output = Path(cls.temp_dir.name) / "template.docx"
        cls.summary = cls.builder.build_document(PROJECT_ROOT, cls.output)
        cls.document = Document(cls.output)
        with zipfile.ZipFile(cls.output) as archive:
            cls.document_xml = archive.read("word/document.xml")
            cls.styles_xml = archive.read("word/styles.xml")
            cls.relationships_xml = archive.read("word/_rels/document.xml.rels")

    @classmethod
    def tearDownClass(cls):
        cls.temp_dir.cleanup()

    def test_build_summary_and_core_document_contract(self):
        self.assertTrue(self.output.exists())
        self.assertEqual(41, self.summary.lesson_count)
        self.assertEqual(148, self.summary.standard_count)
        self.assertGreaterEqual(self.summary.content_control_count, 140)

        all_text = " ".join(etree.fromstring(self.document_xml).xpath("string(.)").split())
        for required in (
            "California K-Grade 5 Lesson Content QA Template",
            "41-lesson master coverage register",
            "Calibration Record - Grade 1 Add/Subtract",
            "Reusable Detailed Lesson Review Form",
            "Student-Visible Practice Item Worksheet",
            "Consolidated Issue Register",
            "Retest History",
            "Standards Metadata Appendix - 148 Identifiers",
            "Content approval does not equal production release approval",
            "Traditional Chinese",
            "Simplified Chinese",
            "Opening the lesson may record a lesson-start event",
            "Never submit an answer or invoke lesson completion on Student Jon",
            "authored extension and exit evidence are not assumed visible",
            "Primary standard(s) for this item",
            "<record-id>-E###",
            "BLOCKED / NEEDS REPAIR / CONDITIONAL PASS / CONTENT PASS",
        ):
            self.assertIn(required, all_text)

        for forbidden in (
            "12345",
            "DEF-001",
            "DEF-002",
            "2026-07-09",
            "July 9",
            "complete California curriculum",
            "{{",
            "}}",
        ):
            self.assertNotIn(forbidden, all_text)

    def test_target_calibration_record_is_prefilled_without_a_pass_verdict(self):
        all_text = etree.fromstring(self.document_xml).xpath(
            "string(.)"
        )
        self.assertIn("us-ca-math-p1-1-oa-add-subtract", all_text)
        self.assertIn("1.OA.1, 1.OA.2, 1.OA.3, 1.OA.4, 1.OA.5, 1.OA.6, 1.OA.7, 1.OA.8", all_text)
        self.assertIn("Source-linked practice IDs: 8; rendered pager observed during calibration: 5", all_text)
        self.assertIn("us-ca-k-g5-tx-v1-p1-1-oa-add-subtract", all_text)
        self.assertIn("source approval=approved-for-review", all_text)
        self.assertIn("36.192-second worktree asset", all_text)
        self.assertIn("15 - 5 = 10", all_text)
        self.assertIn("NOT TESTED", all_text)
        self.assertNotIn("Calibration result: PASS", all_text)

    def test_plain_text_content_controls_are_unique_and_cover_the_workflow(self):
        root = etree.fromstring(self.document_xml)
        ns = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
        tags = root.xpath(".//w:sdtPr/w:tag/@w:val", namespaces=ns)
        self.assertEqual(len(tags), len(set(tags)))
        self.assertGreaterEqual(len(tags), 140)
        for required_tag in (
            "DOC_VERSION",
            "CAMPAIGN_ID",
            "REVIEW_LEAD",
            "TRACK_STATUS_01",
            "TRACK_REVIEWER_DATE_41",
            "CAL_STATUS_01",
            "FORM_REVIEW_RECORD_ID",
            "FORM_OVERALL_DISPOSITION",
            "PRACTICE_01_STATUS",
            "ISSUE_01_ID",
            "RETEST_01_RESULT",
            "SIGNOFF_A18_NAME",
        ):
            self.assertIn(required_tag, tags)
        self.assertTrue(root.xpath(".//w:sdtPr/w:text", namespaces=ns))

    def test_page_styles_tables_and_links_follow_the_compact_reference_contract(self):
        root = etree.fromstring(self.document_xml)
        ns = {
            "w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
            "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
        }
        section = root.xpath(".//w:sectPr", namespaces=ns)[-1]
        self.assertEqual("12240", section.xpath("string(w:pgSz/@w:w)", namespaces=ns))
        self.assertEqual("15840", section.xpath("string(w:pgSz/@w:h)", namespaces=ns))
        self.assertEqual(
            ["1440", "1440", "1440", "1440"],
            [
                section.xpath(f"string(w:pgMar/@w:{side})", namespaces=ns)
                for side in ("top", "right", "bottom", "left")
            ],
        )
        tables = root.xpath(".//w:tbl", namespaces=ns)
        self.assertGreaterEqual(len(tables), 12)
        for table in tables:
            self.assertEqual("9360", table.xpath("string(w:tblPr/w:tblW/@w:w)", namespaces=ns))
            self.assertEqual("120", table.xpath("string(w:tblPr/w:tblInd/@w:w)", namespaces=ns))
            self.assertTrue(table.xpath("w:tr[1]/w:trPr/w:tblHeader", namespaces=ns))
        self.assertGreaterEqual(len(root.xpath(".//w:hyperlink", namespaces=ns)), 5)
        self.assertIn(b"https://www.cde.ca.gov/", self.relationships_xml)
        self.assertFalse(root.xpath(".//w:br[@w:type='page']", namespaces=ns))
        self.assertTrue(
            root.xpath(
                ".//w:p[.//w:t[contains(., 'Appendix B. K-Grade 5 Progression Prompts')]]"
                "/w:pPr/w:pageBreakBefore",
                namespaces=ns,
            )
        )

    def test_register_text_does_not_duplicate_knowledge_point_codes(self):
        all_text = etree.fromstring(self.document_xml).xpath("string(.)")
        for duplicated in ("K-A.1 K-A.1", "1-A.1 1-A.1", "1-H.1 1-H.1"):
            self.assertNotIn(duplicated, all_text)

    def test_document_metadata_contains_no_personal_author(self):
        props = self.document.core_properties
        self.assertIn(props.author or "", ("", "MAIS"))
        self.assertIn(props.last_modified_by or "", ("", "MAIS"))
        self.assertNotRegex(self.document_xml.decode("utf-8"), r"\bw:rsid")


if __name__ == "__main__":
    unittest.main()
