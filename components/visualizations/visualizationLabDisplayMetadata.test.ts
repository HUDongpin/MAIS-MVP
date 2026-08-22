import assert from "node:assert/strict";
import test from "node:test";
import { resolveVisualizationLabDisplayCopy } from "./visualizationLabDisplayMetadata";

const duplicatedLab = {
  title: {
    en: "Review Visual Lab",
    zh: "復習視覺化實驗",
    zhHans: "复习可视化实验"
  },
  displayDisambiguator: {
    en: "Lower semester",
    zh: "下冊",
    zhHans: "下册"
  }
};

test("resolves locale-aware catalog disambiguation without a title map", () => {
  assert.deepEqual(resolveVisualizationLabDisplayCopy(duplicatedLab, "en"), {
    accessibleTitle: "Review Visual Lab · Lower semester",
    disambiguator: "Lower semester",
    title: "Review Visual Lab"
  });
  assert.deepEqual(resolveVisualizationLabDisplayCopy(duplicatedLab, "zh-Hans"), {
    accessibleTitle: "复习可视化实验 · 下册",
    disambiguator: "下册",
    title: "复习可视化实验"
  });
});

test("falls back through localized text rules and omits empty disambiguators", () => {
  assert.deepEqual(
    resolveVisualizationLabDisplayCopy(
      {
        title: { en: "Measurement", zh: "度量" },
        displayDisambiguator: { en: "Upper semester", zh: "上冊" }
      },
      "zh-Hans"
    ),
    {
      accessibleTitle: "度量 · 上册",
      disambiguator: "上册",
      title: "度量"
    }
  );

  assert.deepEqual(
    resolveVisualizationLabDisplayCopy({ title: { en: "Unique lab", zh: "獨立實驗" } }, "en"),
    {
      accessibleTitle: "Unique lab",
      disambiguator: null,
      title: "Unique lab"
    }
  );
});
