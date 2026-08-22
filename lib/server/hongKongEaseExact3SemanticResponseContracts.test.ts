import assert from "node:assert/strict";
import test from "node:test";

import * as responseContracts from "./hongKongEaseResponseContracts";

type Exact3SemanticDecision = (baseId: string, selectedAnswer: string) => boolean | null;

const exact3SemanticDecision = (
  responseContracts as unknown as {
    hongKongEaseExact3SemanticResponseDecision?: Exact3SemanticDecision;
  }
).hongKongEaseExact3SemanticResponseDecision;

test("the exact3 semantic matcher requires complete named fraction categories", () => {
  assert.equal(typeof exact3SemanticDecision, "function", "exact3 semantic matcher must exist");
  if (!exact3SemanticDecision) return;

  const cases = [
    {
      baseId: "hk-ease-10481",
      en: "(a) proper fractions: 3/5, 11/12; (b) improper fractions: 7/4, 9/9; (c) mixed numbers: 2 1/3, 5 2/7",
      zh: "(a) 真分數：11/12, 3/5；(b) 假分數：9/9, 7/4；(c) 帶分數：5 2/7, 2 1/3",
      oldUnlabelled: "(a) 3/5, 11/12; (b) 7/4, 9/9; (c) 2 1/3, 5 2/7",
      wrongTail: "(a) proper fractions: 999, 888; (b) improper fractions: 7/4, 9/9; (c) mixed numbers: 2 1/3, 5 2/7"
    },
    {
      baseId: "hk-ease-10496",
      en: "(a) proper fractions: 4/7, 13/15; (b) improper fractions: 11/5, 8/8; (c) mixed numbers: 3 1/2, 6 4/9",
      zh: "(a) 真分數：13/15, 4/7；(b) 假分數：8/8, 11/5；(c) 帶分數：6 4/9, 3 1/2",
      oldUnlabelled: "(a) 4/7, 13/15; (b) 11/5, 8/8; (c) 3 1/2, 6 4/9",
      wrongTail: "(a) proper fractions: 999, 888; (b) improper fractions: 11/5, 8/8; (c) mixed numbers: 3 1/2, 6 4/9"
    }
  ] as const;

  for (const candidate of cases) {
    assert.equal(exact3SemanticDecision(candidate.baseId, candidate.en), true, `${candidate.baseId}: EN named categories`);
    assert.equal(exact3SemanticDecision(candidate.baseId, candidate.zh), true, `${candidate.baseId}: ZH named categories`);
    assert.equal(exact3SemanticDecision(candidate.baseId, candidate.oldUnlabelled), false, `${candidate.baseId}: old unlabelled response`);
    assert.equal(exact3SemanticDecision(candidate.baseId, candidate.wrongTail), false, `${candidate.baseId}: 999/888 tail bypass`);
    assert.equal(
      exact3SemanticDecision(
        candidate.baseId,
        candidate.en.replace("proper fractions", "真分數")
      ),
      false,
      `${candidate.baseId}: mixed-language category names`
    );
    assert.equal(
      exact3SemanticDecision(
        candidate.baseId,
        candidate.en.replace(/([^:]+): ([^;]+); \(b\) improper fractions: ([^;]+);/, "$1: $2, $2; (b) improper fractions: $3;")
      ),
      false,
      `${candidate.baseId}: duplicate original representation`
    );
    assert.equal(
      exact3SemanticDecision(
        candidate.baseId,
        candidate.en.replace(/proper fractions: ([^;]+); \(b\) improper fractions: ([^;]+)/, "proper fractions: $2; (b) improper fractions: $1")
      ),
      false,
      `${candidate.baseId}: swapped category contents`
    );
    assert.equal(
      exact3SemanticDecision(candidate.baseId, `${candidate.en}; 1/2`),
      false,
      `${candidate.baseId}: extra representation`
    );
  }
});

test("the exact3 semantic matcher requires the full labelled divisibility matrix", () => {
  assert.equal(typeof exact3SemanticDecision, "function", "exact3 semantic matcher must exist");
  if (!exact3SemanticDecision) return;

  const baseId = "hk-ease-1041";
  assert.equal(
    exact3SemanticDecision(
      baseId,
      "(a) ✗, ✓, ✗; (b) ✓, ✓, ✓; (c) ✓, ✗, ✗; (d) ✓, ✓, ✓; (e) ✗, ✓, ✗; (f) ✓, ✓, ✓"
    ),
    true
  );
  assert.equal(
    exact3SemanticDecision(
      baseId,
      "(a) No, Yes, No; (b) Yes, Yes, Yes; (c) Yes, No, No; (d) Yes, Yes, Yes; (e) No, Yes, No; (f) Yes, Yes, Yes"
    ),
    true
  );
  assert.equal(
    exact3SemanticDecision(
      baseId,
      "(a) 否, 是, 否; (b) 是, 是, 是; (c) 是, 否, 否; (d) 是, 是, 是; (e) 否, 是, 否; (f) 是, 是, 是"
    ),
    true
  );

  for (const rejected of [
    "(a) ✗, ✓, ✗; (b) ✓, ✓, ✓; (c) ✓, ✗, ✗; (d) ✓, ✓, ✓; (e) ✗, ✓, ✗",
    "(a) ✗, ✓, ✗; (b) ✓, ✓, ✓; (c) ✓, ✗, ✗; (d) ✓, ✓, ✓; (e) ✗, ✓, ✗; (f) ✓, ✓, ✗",
    "(a) ✗, ✓, ✗; (b) ✓, ✓, ✓; (c) ✓, ✗, ✗; (d) ✓, ✓, ✓; (e) ✗, ✓, ✗; (f) ✓, ✓, ✓; (f) ✓, ✓, ✓",
    "(a) arbitrary; (b) arbitrary; (c) arbitrary; (d) arbitrary; (e) arbitrary; (f) arbitrary",
    "✗, ✓, ✗; ✓, ✓, ✓; ✓, ✗, ✗; ✓, ✓, ✓; ✗, ✓, ✗; ✓, ✓, ✓",
    "(a) ✓, ✗, ✗; (b) ✓, ✓, ✓; (c) ✓, ✗, ✗; (d) ✓, ✓, ✓; (e) ✗, ✓, ✗; (f) ✓, ✓, ✓"
  ]) {
    assert.equal(exact3SemanticDecision(baseId, rejected), false, rejected);
  }
});

test("the exact3 semantic matcher does not claim unrelated EASE rows", () => {
  assert.equal(typeof exact3SemanticDecision, "function", "exact3 semantic matcher must exist");
  if (!exact3SemanticDecision) return;
  assert.equal(exact3SemanticDecision("hk-ease-10645", "1/3"), null);
});
