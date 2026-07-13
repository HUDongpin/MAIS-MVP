from __future__ import annotations

import importlib.util
import re
import sys
import tempfile
import unittest
import warnings
import zipfile
from collections import Counter
from pathlib import Path, PurePosixPath
from urllib.parse import unquote, urlsplit

from docx import Document
from lxml import etree


HERE = Path(__file__).resolve().parent
PROJECT_ROOT = HERE.parents[2]
BUILDER_PATH = HERE / "build_california_k5_content_qa_template.py"
HANDOFF_PATH = HERE / "MAIS_CA-Math_K-5_Content_QA_Template.docx"
RELATIONSHIPS_NAMESPACE = "http://schemas.openxmlformats.org/package/2006/relationships"
CONTENT_TYPES_NAMESPACE = "http://schemas.openxmlformats.org/package/2006/content-types"
THUMBNAIL_RELATIONSHIP_TYPE = (
    "http://schemas.openxmlformats.org/package/2006/relationships/metadata/thumbnail"
)
CUSTOM_PROPERTIES_RELATIONSHIP_TYPE = (
    "http://schemas.openxmlformats.org/officeDocument/2006/relationships/custom-properties"
)
CUSTOM_PROPERTIES_CONTENT_TYPE = (
    "application/vnd.openxmlformats-officedocument.custom-properties+xml"
)
WORD_NAMESPACE = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"


def _require_package_contract(condition, message):
    if not condition:
        raise AssertionError(message)


def _resolve_internal_package_target(target, target_mode):
    _require_package_contract(
        (target_mode or "Internal").casefold() == "internal",
        "Thumbnail relationship must be internal",
    )
    parsed = urlsplit(target or "")
    _require_package_contract(
        not any((parsed.scheme, parsed.netloc, parsed.query, parsed.fragment)),
        "Thumbnail relationship target must be an in-package part",
    )
    decoded_path = unquote(parsed.path)
    _require_package_contract(
        decoded_path and "\\" not in decoded_path and "\x00" not in decoded_path,
        "Thumbnail relationship target is invalid",
    )
    package_path = decoded_path[1:] if decoded_path.startswith("/") else decoded_path
    segments = package_path.split("/")
    _require_package_contract(
        all(segment not in ("", ".", "..") for segment in segments),
        "Thumbnail relationship target escapes or ambiguously names the package",
    )
    return "/".join(segments)


def _resolve_content_type(content_types_root, member_name):
    defaults = content_types_root.findall(
        f"{{{CONTENT_TYPES_NAMESPACE}}}Default"
    )
    overrides = content_types_root.findall(
        f"{{{CONTENT_TYPES_NAMESPACE}}}Override"
    )
    _require_package_contract(
        not any(
            (element.get("ContentType") or "").casefold()
            == CUSTOM_PROPERTIES_CONTENT_TYPE.casefold()
            for element in defaults + overrides
        ),
        "Custom-properties content type is not allowed",
    )

    matching_overrides = [
        element
        for element in overrides
        if element.get("PartName") == f"/{member_name}"
    ]
    _require_package_contract(
        len(matching_overrides) <= 1,
        "Thumbnail part has duplicate content-type overrides",
    )
    if matching_overrides:
        return matching_overrides[0].get("ContentType") or ""

    extension = PurePosixPath(member_name).suffix.removeprefix(".").casefold()
    matching_defaults = [
        element
        for element in defaults
        if (element.get("Extension") or "").casefold() == extension
    ]
    _require_package_contract(
        len(matching_defaults) == 1,
        "Thumbnail content type must resolve through one package default",
    )
    return matching_defaults[0].get("ContentType") or ""


def assert_scanner_safe_handoff_package(path):
    with zipfile.ZipFile(path) as archive:
        member_names = [member.filename for member in archive.infolist()]
        member_counts = Counter(member_names)
        _require_package_contract(
            all(count == 1 for count in member_counts.values()),
            "OOXML package must not contain duplicate member entries",
        )
        _require_package_contract(
            not any(PurePosixPath(name).suffix.casefold() == ".emf" for name in member_names),
            "OOXML package must not contain EMF members",
        )
        _require_package_contract(
            not any(name.casefold() == "docprops/custom.xml" for name in member_names),
            "Conventional custom-properties member is not allowed",
        )

        for required_member in (
            "[Content_Types].xml",
            "_rels/.rels",
            "docProps/core.xml",
            "word/document.xml",
        ):
            _require_package_contract(
                member_counts[required_member] == 1,
                f"Required OOXML package member is missing: {required_member}",
            )

        relationships = etree.fromstring(archive.read("_rels/.rels"))
        relationship_elements = relationships.findall(
            f"{{{RELATIONSHIPS_NAMESPACE}}}Relationship"
        )
        _require_package_contract(
            not any(
                (relationship.get("Type") or "")
                == CUSTOM_PROPERTIES_RELATIONSHIP_TYPE
                for relationship in relationship_elements
            ),
            "Custom-properties relationship is not allowed",
        )
        thumbnail_relationships = [
            relationship
            for relationship in relationship_elements
            if (relationship.get("Type") or "") == THUMBNAIL_RELATIONSHIP_TYPE
        ]
        _require_package_contract(
            len(thumbnail_relationships) == 1,
            "OOXML package must contain exactly one thumbnail relationship",
        )
        thumbnail_relationship = thumbnail_relationships[0]
        thumbnail_member = _resolve_internal_package_target(
            thumbnail_relationship.get("Target") or "",
            thumbnail_relationship.get("TargetMode"),
        )
        _require_package_contract(
            member_counts[thumbnail_member] == 1,
            "Thumbnail relationship must resolve to exactly one package member",
        )
        _require_package_contract(
            PurePosixPath(thumbnail_member).suffix.casefold() in (".jpg", ".jpeg"),
            "Thumbnail package member must use a JPEG extension",
        )

        content_types = etree.fromstring(archive.read("[Content_Types].xml"))
        resolved_content_type = _resolve_content_type(content_types, thumbnail_member)
        _require_package_contract(
            resolved_content_type.casefold() == "image/jpeg",
            "Thumbnail package member must resolve to image/jpeg",
        )
        _require_package_contract(
            archive.read(thumbnail_member).startswith(b"\xff\xd8\xff"),
            "Thumbnail package member must have JPEG magic",
        )

        core = etree.fromstring(archive.read("docProps/core.xml"))
        core_namespaces = {
            "cp": "http://schemas.openxmlformats.org/package/2006/metadata/core-properties",
            "dc": "http://purl.org/dc/elements/1.1/",
        }
        creator = core.xpath("string(dc:creator)", namespaces=core_namespaces).strip()
        last_modified_by = core.xpath(
            "string(cp:lastModifiedBy)", namespaces=core_namespaces
        ).strip()
        _require_package_contract(
            creator in ("", "MAIS"), "Core creator must be blank or MAIS"
        )
        _require_package_contract(
            last_modified_by in ("", "MAIS"),
            "Core lastModifiedBy must be blank or MAIS",
        )

        story_parts = {
            "word/document.xml",
            "word/footnotes.xml",
            "word/endnotes.xml",
            "word/comments.xml",
        }
        story_parts.update(
            name
            for name in member_names
            if re.fullmatch(r"word/(?:header|footer)\d+\.xml", name)
        )
        for story_part in sorted(story_parts & member_counts.keys()):
            root = etree.fromstring(archive.read(story_part))
            has_revision_attribute = any(
                etree.QName(attribute_name).namespace == WORD_NAMESPACE
                and etree.QName(attribute_name).localname.startswith("rsid")
                for element in root.iter()
                for attribute_name in element.attrib
            )
            _require_package_contract(
                not has_revision_attribute,
                f"Word story part contains revision-session attributes: {story_part}",
            )


class HandoffArtifactTests(unittest.TestCase):
    def test_handoff_artifact_has_scanner_safe_ooxml_metadata(self):
        assert_scanner_safe_handoff_package(HANDOFF_PATH)


class CraftedHandoffPackageTests(unittest.TestCase):
    JPEG_PAYLOAD = b"\xff\xd8\xffscanner-supported-jpeg"

    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory(prefix="california_k5_opc_gate_")

    def tearDown(self):
        self.temp_dir.cleanup()

    def _base_entries(self):
        relationships = etree.Element(
            f"{{{RELATIONSHIPS_NAMESPACE}}}Relationships",
            nsmap={None: RELATIONSHIPS_NAMESPACE},
        )
        etree.SubElement(
            relationships,
            f"{{{RELATIONSHIPS_NAMESPACE}}}Relationship",
            Id="rIdThumbnail",
            Type=THUMBNAIL_RELATIONSHIP_TYPE,
            Target="docProps/thumbnail.jpeg",
        )

        content_types = etree.Element(
            f"{{{CONTENT_TYPES_NAMESPACE}}}Types",
            nsmap={None: CONTENT_TYPES_NAMESPACE},
        )
        etree.SubElement(
            content_types,
            f"{{{CONTENT_TYPES_NAMESPACE}}}Default",
            Extension="jpeg",
            ContentType="image/jpeg",
        )
        etree.SubElement(
            content_types,
            f"{{{CONTENT_TYPES_NAMESPACE}}}Default",
            Extension="jpg",
            ContentType="image/jpeg",
        )
        etree.SubElement(
            content_types,
            f"{{{CONTENT_TYPES_NAMESPACE}}}Default",
            Extension="xml",
            ContentType="application/xml",
        )

        core = etree.fromstring(
            b'<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" '
            b'xmlns:dc="http://purl.org/dc/elements/1.1/">'
            b"<dc:creator></dc:creator><cp:lastModifiedBy></cp:lastModifiedBy>"
            b"</cp:coreProperties>"
        )
        document = etree.fromstring(
            b'<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
            b"<w:body><w:p/></w:body></w:document>"
        )
        return [
            ("[Content_Types].xml", etree.tostring(content_types)),
            ("_rels/.rels", etree.tostring(relationships)),
            ("docProps/core.xml", etree.tostring(core)),
            ("word/document.xml", etree.tostring(document)),
            ("docProps/thumbnail.jpeg", self.JPEG_PAYLOAD),
        ]

    def _write_fixture(self, name, entries):
        path = Path(self.temp_dir.name) / name
        with warnings.catch_warnings():
            warnings.simplefilter("ignore", UserWarning)
            with zipfile.ZipFile(path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
                for member_name, payload in entries:
                    archive.writestr(member_name, payload)
        return path

    def _replace_xml(self, entries, member_name, mutate):
        rewritten = []
        for name, payload in entries:
            if name == member_name:
                root = etree.fromstring(payload)
                mutate(root)
                payload = etree.tostring(root)
            rewritten.append((name, payload))
        return rewritten

    def _run_actual_gate(self, path):
        global HANDOFF_PATH
        original_path = HANDOFF_PATH
        HANDOFF_PATH = path
        try:
            HandoffArtifactTests(
                "test_handoff_artifact_has_scanner_safe_ooxml_metadata"
            ).test_handoff_artifact_has_scanner_safe_ooxml_metadata()
        finally:
            HANDOFF_PATH = original_path

    def test_rejects_case_variant_emf_member_anywhere(self):
        entries = self._base_entries() + [("metadata/previews/Preview.EMF", b"emf")]
        fixture = self._write_fixture("case-variant-emf.docx", entries)
        with self.assertRaises(AssertionError):
            self._run_actual_gate(fixture)

    def test_rejects_duplicate_thumbnail_member_entries(self):
        entries = self._base_entries() + [
            ("docProps/thumbnail.jpeg", self.JPEG_PAYLOAD)
        ]
        fixture = self._write_fixture("duplicate-thumbnail-member.docx", entries)
        with self.assertRaises(AssertionError):
            self._run_actual_gate(fixture)

    def test_rejects_duplicate_thumbnail_relationships(self):
        def add_duplicate(root):
            etree.SubElement(
                root,
                f"{{{RELATIONSHIPS_NAMESPACE}}}Relationship",
                Id="rIdThumbnailDuplicate",
                Type=THUMBNAIL_RELATIONSHIP_TYPE,
                Target="docProps/thumbnail.jpeg",
            )

        entries = self._replace_xml(self._base_entries(), "_rels/.rels", add_duplicate)
        fixture = self._write_fixture("duplicate-thumbnail-relationship.docx", entries)
        with self.assertRaises(AssertionError):
            self._run_actual_gate(fixture)

    def test_accepts_relationship_discovered_nonconventional_jpeg(self):
        target = "metadata/previews/cover.jpg"

        def point_to_nonconventional_target(root):
            relationship = root[0]
            relationship.set("Target", target)

        def add_override(root):
            etree.SubElement(
                root,
                f"{{{CONTENT_TYPES_NAMESPACE}}}Override",
                PartName=f"/{target}",
                ContentType="image/jpeg",
            )

        entries = self._replace_xml(
            self._base_entries(), "_rels/.rels", point_to_nonconventional_target
        )
        entries = self._replace_xml(entries, "[Content_Types].xml", add_override)
        entries = [
            (name, payload)
            for name, payload in entries
            if name != "docProps/thumbnail.jpeg"
        ]
        entries.append((target, self.JPEG_PAYLOAD))
        fixture = self._write_fixture("nonconventional-thumbnail.docx", entries)
        self._run_actual_gate(fixture)

    def test_rejects_missing_thumbnail_relationship(self):
        def remove_thumbnail(root):
            root.remove(root[0])

        entries = self._replace_xml(self._base_entries(), "_rels/.rels", remove_thumbnail)
        fixture = self._write_fixture("missing-thumbnail-relationship.docx", entries)
        with self.assertRaises(AssertionError):
            self._run_actual_gate(fixture)

    def test_rejects_external_thumbnail_target(self):
        def make_external(root):
            relationship = root[0]
            relationship.set("Target", "https://example.invalid/thumbnail.jpeg")
            relationship.set("TargetMode", "External")

        entries = self._replace_xml(self._base_entries(), "_rels/.rels", make_external)
        fixture = self._write_fixture("external-thumbnail.docx", entries)
        with self.assertRaises(AssertionError):
            self._run_actual_gate(fixture)

    def test_rejects_traversing_thumbnail_target(self):
        def make_traversing(root):
            root[0].set("Target", "../docProps/thumbnail.jpeg")

        entries = self._replace_xml(self._base_entries(), "_rels/.rels", make_traversing)
        fixture = self._write_fixture("traversing-thumbnail.docx", entries)
        with self.assertRaises(AssertionError):
            self._run_actual_gate(fixture)

    def test_rejects_non_jpeg_thumbnail_content_type(self):
        def add_wrong_override(root):
            etree.SubElement(
                root,
                f"{{{CONTENT_TYPES_NAMESPACE}}}Override",
                PartName="/docProps/thumbnail.jpeg",
                ContentType="image/png",
            )

        entries = self._replace_xml(
            self._base_entries(), "[Content_Types].xml", add_wrong_override
        )
        fixture = self._write_fixture("wrong-thumbnail-content-type.docx", entries)
        with self.assertRaises(AssertionError):
            self._run_actual_gate(fixture)

    def test_rejects_non_jpeg_thumbnail_extension(self):
        def point_to_png(root):
            root[0].set("Target", "metadata/thumbnail.png")

        def add_jpeg_override(root):
            etree.SubElement(
                root,
                f"{{{CONTENT_TYPES_NAMESPACE}}}Override",
                PartName="/metadata/thumbnail.png",
                ContentType="image/jpeg",
            )

        entries = self._replace_xml(self._base_entries(), "_rels/.rels", point_to_png)
        entries = self._replace_xml(entries, "[Content_Types].xml", add_jpeg_override)
        entries.append(("metadata/thumbnail.png", self.JPEG_PAYLOAD))
        fixture = self._write_fixture("wrong-thumbnail-extension.docx", entries)
        with self.assertRaises(AssertionError):
            self._run_actual_gate(fixture)

    def test_rejects_invalid_jpeg_magic(self):
        def point_to_invalid_jpeg(root):
            root[0].set("Target", "metadata/invalid.jpeg")

        entries = self._replace_xml(
            self._base_entries(), "_rels/.rels", point_to_invalid_jpeg
        )
        entries.append(("metadata/invalid.jpeg", b"not-a-jpeg"))
        fixture = self._write_fixture("invalid-thumbnail-magic.docx", entries)
        with self.assertRaises(AssertionError):
            self._run_actual_gate(fixture)

    def test_rejects_nonconventional_custom_properties_relationship(self):
        def add_custom_relationship(root):
            etree.SubElement(
                root,
                f"{{{RELATIONSHIPS_NAMESPACE}}}Relationship",
                Id="rIdCustomProperties",
                Type=CUSTOM_PROPERTIES_RELATIONSHIP_TYPE,
                Target="metadata/private-properties.xml",
            )

        entries = self._replace_xml(
            self._base_entries(), "_rels/.rels", add_custom_relationship
        )
        entries.append(("metadata/private-properties.xml", b"<properties/>"))
        fixture = self._write_fixture("custom-properties-relationship.docx", entries)
        with self.assertRaises(AssertionError):
            self._run_actual_gate(fixture)

    def test_rejects_nonconventional_custom_properties_content_type(self):
        def add_custom_content_type(root):
            etree.SubElement(
                root,
                f"{{{CONTENT_TYPES_NAMESPACE}}}Override",
                PartName="/metadata/private-properties.xml",
                ContentType=CUSTOM_PROPERTIES_CONTENT_TYPE,
            )

        entries = self._replace_xml(
            self._base_entries(), "[Content_Types].xml", add_custom_content_type
        )
        entries.append(("metadata/private-properties.xml", b"<properties/>"))
        fixture = self._write_fixture("custom-properties-content-type.docx", entries)
        with self.assertRaises(AssertionError):
            self._run_actual_gate(fixture)


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
