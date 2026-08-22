import assert from "node:assert/strict";
import test from "node:test";
import { visualizationLabCatalog } from "./visualizationLabs";

const mainlandPublishers = new Set(["MAINLAND_PEP", "MAINLAND_BNU", "MAINLAND_HJB"]);
const mainlandLabs = visualizationLabCatalog.filter((lab) => mainlandPublishers.has(lab.publisher ?? ""));

function titleFor(lab: (typeof mainlandLabs)[number], language: "en" | "zhHans") {
  return language === "en" ? lab.title.en : lab.title.zhHans ?? lab.title.zh;
}

function disambiguatorFor(lab: (typeof mainlandLabs)[number], language: "en" | "zhHans") {
  if (!lab.displayDisambiguator) return "";
  return language === "en"
    ? lab.displayDisambiguator.en
    : lab.displayDisambiguator.zhHans ?? lab.displayDisambiguator.zh;
}

function duplicateGroups(language: "en" | "zhHans") {
  const groups = new Map<string, typeof mainlandLabs>();
  mainlandLabs.forEach((lab) => {
    const key = [lab.publisher, lab.grade, titleFor(lab, language)].join("\u0000");
    groups.set(key, [...(groups.get(key) ?? []), lab]);
  });
  return Array.from(groups.values()).filter((labs) => labs.length > 1);
}

test("Mainland duplicate lab titles receive catalog-built localized disambiguators", () => {
  const englishGroups = duplicateGroups("en");
  const simplifiedGroups = duplicateGroups("zhHans");
  assert.equal(englishGroups.length, 14);
  assert.equal(simplifiedGroups.length, 11);

  for (const [language, groups] of [
    ["en", englishGroups],
    ["zhHans", simplifiedGroups]
  ] as const) {
    groups.forEach((labs) => {
      const displayLabels = labs.map((lab) => {
        const disambiguator = disambiguatorFor(lab, language);
        assert.ok(disambiguator, `${lab.labId} needs a ${language} display disambiguator`);
        return `${titleFor(lab, language)} — ${disambiguator}`;
      });
      assert.equal(new Set(displayLabels).size, labs.length, `${language} duplicate display labels must become unique`);
    });
  }
});

test("Mainland semester placement is machine readable without widening Topic", () => {
  const semesterLabs = mainlandLabs.filter((lab) => /-(?:upper|lower)-/.test(lab.labId));
  assert.ok(semesterLabs.length > 0);
  semesterLabs.forEach((lab) => {
    const expectedSemester = lab.labId.includes("-upper-") ? "upper" : "lower";
    assert.equal(lab.textbookPlacement?.semester, expectedSemester, lab.labId);
  });

  const disambiguatedLabs = mainlandLabs.filter((lab) => lab.displayDisambiguator);
  assert.equal(disambiguatedLabs.length, 28);
  assert.equal(
    disambiguatedLabs.filter((lab) => lab.textbookPlacement?.semester).length,
    26,
    "the only non-semester duplicate pair is the HJB S6 English sequence review pair"
  );
});

test("HJB S6 English-only duplicate sequence titles keep meaningful distinctions", () => {
  const synthesis = mainlandLabs.find((lab) => lab.labId === "hjb-high-s6-数列与计数综合");
  const review = mainlandLabs.find((lab) => lab.labId === "hjb-high-s6-数列综合复习");
  assert.equal(synthesis?.displayDisambiguator?.en, "With counting");
  assert.equal(review?.displayDisambiguator?.en, "Review");
});
