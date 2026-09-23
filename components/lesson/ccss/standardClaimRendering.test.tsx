import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SettingsContext } from "@/components/providers/AppProviders";
import { ccssTextbookLessons } from "@/data/ccssTextbookRegistry";
import { isCcssId, normalizeCcssId, standardIdPattern } from "../../../lib/standards/ccssId";
import { resolveStandardRefWithBinding, standardRefText } from "../../../lib/standards/standardRef";
import { CcssLessonStandardsFooter } from "./CcssLessonStandardsFooter";
import { CcssLessonAdapter } from "./CcssLessonAdapter";

// This focused tsx runner uses classic JSX output; Next uses automatic JSX.
Object.assign(globalThis, { React });

test("standard identity preserves substandard suffixes", () => {
  assert.equal(normalizeCcssId("K.CC.A.1"), normalizeCcssId("K.CC.1"));
  assert.equal(normalizeCcssId("A-REI.D.11"), normalizeCcssId("A-REI.11"));
  assert.equal(normalizeCcssId("6.NS.C.7c"), "6.NS.7c");
  assert.equal(normalizeCcssId("6.NS.7d"), "6.NS.7d");
  assert.notEqual(normalizeCcssId("6.NS.C.7c"), normalizeCcssId("6.NS.C.7d"));
  assert.notEqual(normalizeCcssId("6.NS.C.7c"), normalizeCcssId("6.NS.C.7"));
  assert.equal(normalizeCcssId("6.NS.C.7c-extra"), "6.NS.C.7c-extra");
});

test("exact crosswalk claim needs every mapped standard, including the suffix", () => {
  const binding = { kind: "crosswalk" as const, rows: [{
    stateStandardId: "XX.7",
    ccss: ["6.NS.C.7c", "6.NS.C.7d"],
    relation: "exact" as const,
    rationale: "The state statement covers both subparts."
  }] };
  assert.deepEqual(resolveStandardRefWithBinding(binding, "XX.7", ["6.NS.7c"]), {
    display: "hidden", reason: "asset-does-not-carry-standard"
  });
  assert.deepEqual(resolveStandardRefWithBinding(binding, "XX.7", ["6.NS.7c", "6.NS.7d"]), {
    display: "code", code: "XX.7", relation: "exact"
  });
});

test("California identity does not print a malformed code even if asset tags repeat it", () => {
  assert.equal(standardRefText({
    track: "US_CA_MATH",
    stateStandardId: "6.NS.C.7c-extra",
    assetStandardIds: ["6.NS.C.7c-extra"]
  }), null);
});

test("inline codes in ported California lesson bodies are supported by their asset metadata", () => {
  const lessonDirectory = join(process.cwd(), "components/lesson/ccss/lessons");
  let inspected = 0;
  for (const file of readdirSync(lessonDirectory).filter((name) => name.endsWith(".tsx"))) {
    const slug = file.slice(0, -4) as keyof typeof ccssTextbookLessons;
    const meta = ccssTextbookLessons[slug];
    assert.ok(meta, `${file}: missing CCSS lesson metadata`);
    const source = readFileSync(join(lessonDirectory, file), "utf8");
    const assetIds = new Set(meta.standardIds.map(normalizeCcssId));
    for (const code of source.match(standardIdPattern) ?? []) {
      assert.ok(isCcssId(code), `${file}: malformed inline code ${code}`);
      assert.ok(assetIds.has(normalizeCcssId(code)), `${file}: inline ${code} is absent from asset metadata`);
      inspected++;
    }
  }
  assert.ok(inspected > 0, "no inline CCSS codes were inspected");
});

test("the student lesson footer displays only supported California claims", () => {
  const supported = renderToStaticMarkup(
    <CcssLessonStandardsFooter
      track="US_CA_MATH"
      claimedStandardIds={["6.NS.C.7c", "6.NS.C.7d"]}
      assetStandardIds={["6.NS.7c"]}
    />
  );
  assert.match(supported, /6\.NS\.C\.7c/);
  assert.doesNotMatch(supported, /6\.NS\.C\.7d/);
  assert.match(supported, /data-standard-ref="exact"/);

  const untranscribed = renderToStaticMarkup(
    <CcssLessonStandardsFooter
      track="US_AR_MATH"
      claimedStandardIds={["AR.Math.G6.NS"]}
      assetStandardIds={["6.NS.C.7c"]}
    />
  );
  assert.equal(untranscribed, "");
});

test("the mounted CCSS lesson adapter uses the validated student footer", () => {
  const meta = { ...ccssTextbookLessons["negative-numbers"], standardIds: ["6.NS.C.7c"] };
  const markup = renderToStaticMarkup(
    <SettingsContext.Provider value={{ recordLearningEvent: () => undefined } as never}>
      <CcssLessonAdapter
        LessonComponent={() => <p>Student lesson body</p>}
        meta={meta}
        topicId="us-ca-math-g6-demo"
        track="US_CA_MATH"
        claimedStandardIds={["6.NS.C.7d"]}
      />
    </SettingsContext.Provider>
  );
  assert.match(markup, /Student lesson body/);
  assert.doesNotMatch(markup, /6\.NS\.C\.7d/);
  assert.doesNotMatch(markup, /Standards developed in this lesson/);

  const supported = renderToStaticMarkup(
    <SettingsContext.Provider value={{ recordLearningEvent: () => undefined } as never}>
      <CcssLessonAdapter
        LessonComponent={() => <p>Student lesson body</p>}
        meta={meta}
        topicId="us-ca-math-g6-demo"
        track="US_CA_MATH"
        claimedStandardIds={["6.NS.C.7c"]}
      />
    </SettingsContext.Provider>
  );
  assert.match(supported, /6\.NS\.C\.7c/);
  assert.match(supported, /data-standard-ref="exact"/);
});

test("the mounted adapter withholds unreviewed CCSS body prose on another curriculum track", () => {
  const markup = renderToStaticMarkup(
    <SettingsContext.Provider value={{
      recordLearningEvent: () => undefined,
      t: (value: { en: string }) => value.en
    } as never}>
      <CcssLessonAdapter
        LessonComponent={() => <p>Inline 6.NS.C.7c claim</p>}
        meta={ccssTextbookLessons["negative-numbers"]}
        topicId="us-ca-math-g6-demo"
        track="US_AR_MATH"
        claimedStandardIds={["6.NS.C.7c"]}
      />
    </SettingsContext.Provider>
  );
  assert.match(markup, /data-ccss-lesson-unavailable="true"/);
  assert.doesNotMatch(markup, /Inline 6\.NS\.C\.7c claim|data-standard-ref/);
});
