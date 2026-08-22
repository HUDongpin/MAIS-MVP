import assert from "node:assert/strict";
import test from "node:test";

import {
  chinaVisualizationTargetStateEvidenceSha256,
  parseChinaVisualizationTargetStateId,
} from "./china-visualization-target-state";

const stateId = (labId: string, stateName: string) =>
  JSON.stringify([labId, stateName]);

test("target-state parser reconstructs every canonical default, strand, mode, range, endpoint, and reset action", () => {
  assert.deepEqual(
    parseChinaVisualizationTargetStateId(stateId("lab-a", "default")),
    {
      kind: "default",
      labId: "lab-a",
      modeId: null,
      modeIndex: null,
      rangeIndex: null,
      requestedValues: {},
      requiresInteraction: false,
      stateId: stateId("lab-a", "default"),
      stateName: "default",
      strandFamily: null,
      strandIndex: null,
      strandVariant: null,
    },
  );
  assert.deepEqual(
    parseChinaVisualizationTargetStateId(
      stateId("lab-a", "strand=2:fractions/equivalence"),
    ),
    {
      kind: "strand",
      labId: "lab-a",
      modeId: null,
      modeIndex: null,
      rangeIndex: null,
      requestedValues: {},
      requiresInteraction: true,
      stateId: stateId("lab-a", "strand=2:fractions/equivalence"),
      stateName: "strand=2:fractions/equivalence",
      strandFamily: "fractions",
      strandIndex: 2,
      strandVariant: "equivalence",
    },
  );
  assert.deepEqual(
    parseChinaVisualizationTargetStateId(
      stateId("lab-a", "strand=1/mode=2:compare/range=0:value=-1.5"),
    ),
    {
      kind: "range",
      labId: "lab-a",
      modeId: "compare",
      modeIndex: 2,
      rangeIndex: 0,
      requestedValues: { value: -1.5 },
      requiresInteraction: true,
      stateId: stateId("lab-a", "strand=1/mode=2:compare/range=0:value=-1.5"),
      stateName: "strand=1/mode=2:compare/range=0:value=-1.5",
      strandFamily: null,
      strandIndex: 1,
      strandVariant: null,
    },
  );
  assert.deepEqual(
    parseChinaVisualizationTargetStateId(
      stateId(
        "lab-a",
        "direct/mode=0:model/range-endpoints=value:1,comparison:2,height:3",
      ),
    ),
    {
      kind: "range-endpoints",
      labId: "lab-a",
      modeId: "model",
      modeIndex: 0,
      rangeIndex: null,
      requestedValues: { comparison: 2, height: 3, value: 1 },
      requiresInteraction: true,
      stateId: stateId(
        "lab-a",
        "direct/mode=0:model/range-endpoints=value:1,comparison:2,height:3",
      ),
      stateName:
        "direct/mode=0:model/range-endpoints=value:1,comparison:2,height:3",
      strandFamily: null,
      strandIndex: null,
      strandVariant: null,
    },
  );
  assert.equal(
    parseChinaVisualizationTargetStateId(stateId("lab-a", "reset")).kind,
    "reset",
  );
});

test("target-state parser rejects malformed, non-finite, duplicate, and ambiguous action plans", () => {
  assert.throws(
    () => parseChinaVisualizationTargetStateId("not-json"),
    /valid JSON/u,
  );
  assert.throws(
    () => parseChinaVisualizationTargetStateId(stateId("lab-a", "direct")),
    /unsupported target state/u,
  );
  assert.throws(
    () =>
      parseChinaVisualizationTargetStateId(
        stateId("lab-a", "direct/range=0:value=NaN"),
      ),
    /unsupported target state|finite/u,
  );
  assert.throws(
    () =>
      parseChinaVisualizationTargetStateId(
        stateId("lab-a", "direct/range-endpoints=value:1,value:2"),
      ),
    /duplicate/u,
  );
  assert.throws(
    () =>
      parseChinaVisualizationTargetStateId(
        stateId("lab-a", "strand=1:family/variant/range=0:value=1"),
      ),
    /unsupported target state/u,
  );
});

test("canonical target-state evidence hashes ignore object key order but reject non-finite evidence", () => {
  const first = chinaVisualizationTargetStateEvidenceSha256({
    ranges: [{ id: "value", value: 3 }],
    activeMode: 1,
    activeStrand: null,
  });
  const second = chinaVisualizationTargetStateEvidenceSha256({
    activeStrand: null,
    activeMode: 1,
    ranges: [{ value: 3, id: "value" }],
  });
  assert.match(first, /^[a-f0-9]{64}$/u);
  assert.equal(first, second);
  assert.throws(
    () =>
      chinaVisualizationTargetStateEvidenceSha256({
        value: Number.POSITIVE_INFINITY,
      }),
    /finite/u,
  );
});
