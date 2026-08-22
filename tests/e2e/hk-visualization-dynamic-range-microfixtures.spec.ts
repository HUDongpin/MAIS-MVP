import { expect, test, type Locator, type Page } from "@playwright/test";
import {
  exerciseHkVisualizationDynamicRangeMicrofixture,
  exerciseHkVisualizationDynamicRangeMicrofixtureInFreshPageChunks,
  installHkVisualizationEffectiveVisibilityInspector,
} from "./hk-visualization-machine-acceptance-helpers";
import {
  HK_VISUALIZATION_DYNAMIC_RANGE_DEFAULT_TIMEOUT_MS,
  HK_VISUALIZATION_DYNAMIC_RANGE_TRIANGLE_TIMEOUT_CAP_MS,
} from "./hk-visualization-release-title-manifest.mjs";
import type { HKVisualizationRangeDomainId } from "../../components/visualizations/hk/hkVisualizationLessonContracts";

type RangeDefinition = Readonly<{
  id: string;
  initial: number;
  max: number;
  min: number;
  step: number;
}>;

type DynamicFixture = Readonly<{
  controls: readonly RangeDefinition[];
  domainId: HKVisualizationRangeDomainId;
  expectedStateCount?: number;
  labId: string;
  modeId?: string;
}>;

type Defect =
  | "edge-mismatch"
  | "empty-edge-reason"
  | "blank-range-bound"
  | "duplicate-fixed"
  | "interactive-fixed"
  | "malformed-state"
  | "missing-reset"
  | "missing-fixed"
  | "no-op-reset"
  | "noop-evidence"
  | "root-decoy"
  | "sibling-control"
  | "stale-descriptor"
  | "stale-visible-state"
  | "unrelated-mutation"
  | "wrong-fixed-state"
  | "wrong-projection";

const paymentFixture: DynamicFixture = {
  labId: "p2-money-time",
  domainId: "payment-at-least-price-v1",
  modeId: "money",
  controls: [
    { id: "price", min: 1, max: 50, step: 1, initial: 10 },
    { id: "payment", min: 1, max: 100, step: 1, initial: 20 },
  ],
};

const numberBondFixture: DynamicFixture = {
  labId: "p1-counting-number-bonds",
  domainId: "number-bond-v1",
  controls: [
    { id: "total", min: 0, max: 10, step: 1, initial: 5 },
    { id: "knownPart", min: 0, max: 10, step: 1, initial: 2 },
  ],
};

const quadraticFixture: DynamicFixture = {
  labId: "quadratic-patterns",
  domainId: "nonzero-quadratic-a-v1",
  modeId: "graph",
  controls: [
    { id: "a", min: -3, max: 3, step: 1, initial: 1 },
    { id: "b", min: -5, max: 5, step: 1, initial: 0 },
    { id: "c", min: -5, max: 5, step: 1, initial: 0 },
  ],
};

const identityFixture: DynamicFixture = {
  labId: "identities-square-patterns",
  domainId: "identity-positive-a-gt-b-v1",
  modeId: "square-sum",
  controls: [
    { id: "a", min: 2, max: 10, step: 1, initial: 6 },
    { id: "b", min: 1, max: 9, step: 1, initial: 2 },
  ],
};

const triangleFixture: DynamicFixture = {
  labId: "angles",
  domainId: "triangle-validity-v1",
  expectedStateCount: 97,
  modeId: "triangle",
  controls: [
    { id: "ax", min: -8, max: 8, step: 0.25, initial: -4 },
    { id: "ay", min: -5, max: 5, step: 0.25, initial: -2 },
    { id: "bx", min: -8, max: 8, step: 0.25, initial: 4 },
    { id: "by", min: -5, max: 5, step: 0.25, initial: -2 },
    { id: "cx", min: -8, max: 8, step: 0.25, initial: 1 },
    { id: "cy", min: -5, max: 5, step: 0.25, initial: 3 },
  ],
};

test.describe.configure({
  mode: "serial",
  timeout: HK_VISUALIZATION_DYNAMIC_RANGE_DEFAULT_TIMEOUT_MS,
});

test.describe("HK visualization dynamic range-domain browser microfixtures", () => {
  test.beforeEach(async ({ page }) => {
    await installHkVisualizationEffectiveVisibilityInspector(page);
    await page.goto("data:text/html,<html><body></body></html>");
  });

  test("runs the exact payment minimum/maximum dynamic domain in its money mode", async ({
    page,
  }) => {
    const workspace = await mountDynamicFixture(page, paymentFixture);
    const result = await runDynamicFixture(workspace, paymentFixture);

    expect(result.failures).toEqual([]);
    expect(result.stateScanLedger.executedStateIds).toEqual(
      result.stateScanLedger.plannedStateIds,
    );
    expect(
      result.stateScanLedger.entries.every(
        (entry) =>
          entry.observedSignature === entry.expectedSignature &&
          entry.startingObservedSignature === entry.startingSignature,
      ),
    ).toBe(true);
    expect(
      result.stateScanLedger.entries.some(
        (entry) => entry.requestedSignature !== entry.expectedSignature,
      ),
    ).toBe(true);
    expect(
      result.stateScanLedger.entries.every(
        (entry) =>
          result.layout.some((receipt) => receipt.phase === entry.phase) &&
          result.collisions.some((receipt) => receipt.phase === entry.phase),
      ),
    ).toBe(true);
    expect(
      result.interactions.some(
        (interaction) =>
          interaction.action.startsWith("range-state:") &&
          interaction.contractStateChanged === false &&
          interaction.meaningfulEvidenceChanged === false &&
          interaction.stateChanged === false,
      ),
    ).toBe(true);
    await expect(
      workspace.locator('[data-viz-parameter="payment"]'),
    ).toHaveAttribute("min", /\d+/);
  });

  test("uses an exact noninteractive fixed known-part node when the whole is zero", async ({
    page,
  }) => {
    const workspace = await mountDynamicFixture(page, numberBondFixture);
    const result = await runDynamicFixture(workspace, numberBondFixture);

    expect(result.failures).toEqual([]);
    expect(
      result.stateScanLedger.entries.some(
        (entry) =>
          entry.expectedSignature === "total=0|knownPart=0" &&
          entry.reasons.includes("domain-boundary:whole-zero-fixed-part"),
      ),
    ).toBe(true);
    await expect(
      workspace.locator("[data-viz-fixed-parameter='knownPart']"),
    ).toHaveCount(0);
  });

  test("excludes zero for both positive and negative quadratic leading-coefficient replay starts", async ({
    page,
  }) => {
    const workspace = await mountDynamicFixture(page, quadraticFixture);
    const result = await runDynamicFixture(workspace, quadraticFixture);
    const zeroStarts = result.stateScanLedger.entries.filter((entry) =>
      entry.reasons.some(
        (reason) =>
          reason === "domain-boundary:zero-request-from-positive" ||
          reason === "domain-boundary:zero-request-from-negative",
      ),
    );

    expect(result.failures).toEqual([]);
    expect(zeroStarts).toHaveLength(2);
    expect(zeroStarts.map((entry) => entry.expectedSignature)).toEqual(
      expect.arrayContaining(["a=-1|b=0|c=0", "a=1|b=0|c=0"]),
    );
    expect(
      zeroStarts.every(
        (entry) => entry.expectedSignature?.includes("a=0") === false,
      ),
    ).toBe(true);
  });

  test("preserves strict positive a-greater-than-b order for every identity transition", async ({
    page,
  }) => {
    const workspace = await mountDynamicFixture(page, identityFixture);
    const result = await runDynamicFixture(workspace, identityFixture);

    expect(result.failures).toEqual([]);
    expect(
      result.stateScanLedger.entries.some((entry) =>
        entry.reasons.includes("domain-boundary:a-request-projects-b"),
      ),
    ).toBe(true);
    expect(
      result.stateScanLedger.entries.some((entry) =>
        entry.reasons.includes("domain-boundary:b-request-projects-a"),
      ),
    ).toBe(true);
    expect(
      result.stateScanLedger.entries.every((entry) => {
        const values = Object.fromEntries(
          (entry.expectedSignature ?? "")
            .split("|")
            .map((part) => part.split("=")),
        );
        return Number(values.a) > Number(values.b);
      }),
    ).toBe(true);
  });

  test("projects every triangle endpoint request in exact fresh-page v2 chunks with six-owner metadata", async ({
    browser,
  }, testInfo) => {
    testInfo.setTimeout(
      HK_VISUALIZATION_DYNAMIC_RANGE_TRIANGLE_TIMEOUT_CAP_MS,
    );
    const result =
      await exerciseHkVisualizationDynamicRangeMicrofixtureInFreshPageChunks({
        ...dynamicFixtureContractArgs(triangleFixture),
        browser,
        expectedStateCount: triangleFixture.expectedStateCount!,
        mountWorkspace: (page) => mountDynamicFixture(page, triangleFixture),
        runtimePaths: {
          artifactRoot: process.env.PLAYWRIGHT_E2E_ROOT ?? "",
          browserProfileRoot:
            process.env.PLAYWRIGHT_BROWSER_PROFILE_ROOT ?? "",
        },
        setTestTimeout: (timeoutMs) => {
          expect(timeoutMs).toBeGreaterThan(
            HK_VISUALIZATION_DYNAMIC_RANGE_DEFAULT_TIMEOUT_MS,
          );
          expect(timeoutMs).toBeLessThanOrEqual(
            HK_VISUALIZATION_DYNAMIC_RANGE_TRIANGLE_TIMEOUT_CAP_MS,
          );
        },
      });

    expect(result.failures).toEqual([]);
    expect(result.runtimePaths.artifactRoot).toMatch(
      /^\/Volumes\/Starship\//,
    );
    expect(
      result.runtimePaths.browserProfileRoot.startsWith(
        `${result.runtimePaths.artifactRoot}/`,
      ),
    ).toBe(true);
    expect(
      result.browserChunkReceipts.map(
        ({ budgetTotalMs, end, start, stateReceipts }) => ({
          budgetPositive: budgetTotalMs > 0,
          end,
          start,
          stateCount: stateReceipts.length,
        }),
      ),
    ).toEqual([
      { budgetPositive: true, end: 32, start: 0, stateCount: 32 },
      { budgetPositive: true, end: 64, start: 32, stateCount: 32 },
      { budgetPositive: true, end: 96, start: 64, stateCount: 32 },
      { budgetPositive: true, end: 97, start: 96, stateCount: 1 },
    ]);
    expect(
      new Set(
        result.browserChunkReceipts.map(({ pageInstanceId }) => pageInstanceId),
      ).size,
    ).toBe(4);
    expect(
      result.browserChunkReceipts.every(
        (receipt) =>
          receipt.planHash === result.browserChunkAggregate.planHash &&
          receipt.recomputedPlanHash === result.browserChunkAggregate.planHash &&
          receipt.cellExecutionHash ===
            result.browserChunkAggregate.cellExecutionHash &&
          receipt.recomputedCellExecutionHash ===
            result.browserChunkAggregate.cellExecutionHash,
      ),
    ).toBe(true);
    expect(result.browserChunkAggregate.stateCount).toBe(97);
    expect(result.browserChunkAggregate.freshPageCount).toBe(4);
    expect(result.planBudgetMs).toBe(
      result.browserChunkReceipts.reduce(
        (total, { budgetTotalMs }) => total + budgetTotalMs,
        0,
      ),
    );
    expect(result.stateScanLedger.executedStateIds).toEqual(
      result.stateScanLedger.plannedStateIds,
    );
    expect(
      result.stateScanLedger.entries.some((entry) =>
        entry.reasons.includes("domain-boundary:coincident-a-b-request"),
      ),
    ).toBe(true);
    expect(
      result.stateScanLedger.entries.some(
        (entry) =>
          entry.startingSignature ===
            "ax=-8|ay=-2|bx=-8|by=0.5|cx=1|cy=0" &&
          entry.actionSignature === "cx=-8" &&
          entry.reasons.includes(
            "domain-boundary:chained-collinear-endpoint-regression",
          ),
      ),
    ).toBe(true);
  });

  test("fails closed when only a sibling/descendant decoy owns the declared range-domain id", async ({
    page,
  }) => {
    const result = await runDynamicFixture(
      await mountDynamicFixture(page, paymentFixture, "root-decoy"),
      paymentFixture,
    );
    expectFailure(
      result,
      "RANGE_STATE_PLAN",
      /exact model root must own|DOM root must be exactly/i,
    );

    const siblingControl = await runDynamicFixture(
      await mountDynamicFixture(page, paymentFixture, "sibling-control"),
      paymentFixture,
    );
    expectFailure(
      siblingControl,
      "RANGE_STATE_PLAN",
      /missing required control|payment/i,
    );
  });

  test("fails closed for projection-edge mismatch and blank projection reason", async ({
    page,
  }) => {
    const edgeMismatch = await runDynamicFixture(
      await mountDynamicFixture(page, paymentFixture, "edge-mismatch"),
      paymentFixture,
    );
    expectFailure(edgeMismatch, "RANGE_STATE_PLAN", /metadata mismatch/i);

    const emptyReason = await runDynamicFixture(
      await mountDynamicFixture(page, paymentFixture, "empty-edge-reason"),
      paymentFixture,
    );
    expectFailure(emptyReason, "RANGE_STATE_PLAN", /metadata mismatch/i);
  });

  test("fails closed for stale descriptors, stale serialized normal ranges, unrelated changes, and wrong projection", async ({
    page,
  }) => {
    const staleDescriptor = await runDynamicFixture(
      await mountDynamicFixture(page, paymentFixture, "stale-descriptor"),
      paymentFixture,
    );
    expectFailure(
      staleDescriptor,
      "RANGE_STATE_EXECUTION",
      /descriptor payment|expected.*minimum/i,
    );

    const malformedState = await runDynamicFixture(
      await mountDynamicFixture(page, paymentFixture, "malformed-state"),
      paymentFixture,
    );
    expectFailure(malformedState, "RANGE_STATE_EXECUTION", /malformed JSON/i);

    const staleVisibleState = await runDynamicFixture(
      await mountDynamicFixture(page, paymentFixture, "stale-visible-state"),
      paymentFixture,
    );
    expectFailure(
      staleVisibleState,
      "RANGE_STATE_EXECUTION",
      /serialized state payment/i,
    );

    const unrelated = await runDynamicFixture(
      await mountDynamicFixture(page, quadraticFixture, "unrelated-mutation"),
      quadraticFixture,
    );
    expectFailure(
      unrelated,
      "RANGE_STATE_EXECUTION",
      /mutated unrelated controls|did not reach exact a=1\|b=0\|c=0/i,
    );

    const wrongProjection = await runDynamicFixture(
      await mountDynamicFixture(page, paymentFixture, "wrong-projection"),
      paymentFixture,
    );
    expectFailure(
      wrongProjection,
      "RANGE_STATE_EXECUTION",
      /serialized state payment=20 does not match live 26|outside payment-at-least-price-v1/i,
    );
  });

  test("fails closed for missing or wrongly serialized fixed visibility and a no-op reset/replay", async ({
    page,
  }) => {
    const interactiveFixed = await runDynamicFixture(
      await mountDynamicFixture(page, numberBondFixture, "interactive-fixed"),
      numberBondFixture,
    );
    expectFailure(
      interactiveFixed,
      "RANGE_STATE_EXECUTION",
      /noninteractive and non-tabbable/i,
    );

    const missingFixed = await runDynamicFixture(
      await mountDynamicFixture(page, numberBondFixture, "missing-fixed"),
      numberBondFixture,
    );
    expectFailure(
      missingFixed,
      "RANGE_STATE_EXECUTION",
      /fixed node|fixed visibility/i,
    );

    const wrongFixedState = await runDynamicFixture(
      await mountDynamicFixture(page, numberBondFixture, "wrong-fixed-state"),
      numberBondFixture,
    );
    expectFailure(
      wrongFixedState,
      "RANGE_STATE_EXECUTION",
      /outside number-bond-v1|serialized state knownPart|fixed value/i,
    );

    const duplicateFixed = await runDynamicFixture(
      await mountDynamicFixture(page, numberBondFixture, "duplicate-fixed"),
      numberBondFixture,
    );
    expectFailure(
      duplicateFixed,
      "RANGE_STATE_EXECUTION",
      /exactly one learner-visible fixed node/i,
    );

    const missingReset = await runDynamicFixture(
      await mountDynamicFixture(page, paymentFixture, "missing-reset"),
      paymentFixture,
    );
    expectFailure(
      missingReset,
      "RANGE_STATE_EXECUTION",
      /requires exactly one freshly interactive Reset control/i,
    );

    const noOpReset = await runDynamicFixture(
      await mountDynamicFixture(page, paymentFixture, "no-op-reset"),
      paymentFixture,
    );
    expectFailure(
      noOpReset,
      "RANGE_STATE_EXECUTION",
      /Dynamic Reset did not restore.*canonical fingerprint/i,
    );

    const blankRangeBound = await runDynamicFixture(
      await mountDynamicFixture(page, quadraticFixture, "blank-range-bound"),
      quadraticFixture,
    );
    expectFailure(
      blankRangeBound,
      "RANGE_STATE_EXECUTION",
      /missing nonblank min/i,
    );

    const noOpEvidence = await runDynamicFixture(
      await mountDynamicFixture(page, quadraticFixture, "noop-evidence"),
      quadraticFixture,
    );
    expectFailure(
      noOpEvidence,
      "RANGE_STATE_EXECUTION",
      /numeric no-op|no-op.*mutated/i,
    );
  });

  test("keeps undeclared clamps RED and executes 27 chained fraction-bar numerator transitions", async ({
    page,
  }) => {
    const staticWorkspace = await mountUndeclaredClampFixture(page);
    const staticResult = await exerciseHkVisualizationDynamicRangeMicrofixture({
      labId: "undeclared-clamp-fixture",
      rangeDomainId: null,
      modelSelector: "#dynamic-model",
      controlIds: ["amount"],
      controlSelectors: ['[data-viz-parameter="amount"]'],
      resetSelector: "[data-viz-reset-model]",
      workspace: staticWorkspace,
    });
    expectFailure(
      staticResult,
      "RANGE_STATE_EXECUTION",
      /requested signature|observed/i,
    );

    const fractionWorkspace = await mountFractionBarFixture(page);
    const fractionResult =
      await exerciseHkVisualizationDynamicRangeMicrofixture({
        controlIds: ["value", "comparison"],
        controlSelectors: [
          '[data-viz-parameter="value"]',
          '[data-viz-parameter="comparison"]',
        ],
        expectedStateCount: 27,
        labId: "p3-fractions-intro",
        modeIds: ["fraction", "equivalent", "compare"],
        modeSelectors: [
          '[data-viz-mode-button][data-viz-mode="fraction"]',
          '[data-viz-mode-button][data-viz-mode="equivalent"]',
          '[data-viz-mode-button][data-viz-mode="compare"]',
        ],
        rangeDomainId: "fraction-bar-numerator-v1",
        modelSelector: "#dynamic-model",
        resetSelector: "[data-viz-reset-model]",
        stateSelector: "#dynamic-model",
        workspace: fractionWorkspace,
      });
    expect(fractionResult.failures).toEqual([]);
    expect(fractionResult.stateScanLedger.plannedStateIds).toHaveLength(27);
    expect(fractionResult.stateScanLedger.executedStateIds).toEqual(
      fractionResult.stateScanLedger.plannedStateIds,
    );
    for (const modeId of ["fraction", "equivalent", "compare"]) {
      expect(
        fractionResult.stateScanLedger.entries.filter(
          (entry) => entry.modeId === modeId,
        ),
      ).toHaveLength(9);
    }
    expect(
      fractionResult.stateScanLedger.entries.find((entry) =>
        entry.reasons.includes("domain-boundary:denominator-decrease-clamp"),
      ),
    ).toMatchObject({
      actionSignature: "value=5",
      expectedSignature: "value=5|comparison=6",
      requestedSignature: "value=5|comparison=10",
      startingSignature: "value=9|comparison=10",
    });
    expect(
      fractionResult.stateScanLedger.entries.find((entry) =>
        entry.reasons.includes(
          "domain-boundary:denominator-increase-no-resurrection",
        ),
      ),
    ).toMatchObject({
      actionSignature: "value=9",
      expectedSignature: "value=9|comparison=6",
      requestedSignature: "value=9|comparison=6",
      startingSignature: "value=5|comparison=6",
    });
  });

  test("rejects invalid dynamic state-count bounds and a valid-but-wrong planner count", async ({
    page,
  }) => {
    const workspace = await mountDynamicFixture(page, paymentFixture);
    const base = dynamicFixtureArgs(workspace, paymentFixture);

    await expect(
      exerciseHkVisualizationDynamicRangeMicrofixture({
        ...base,
        expectedStateCount: 0,
      }),
    ).rejects.toThrow(
      /expectedStateCount must be an integer from 1 through 150/i,
    );
    await expect(
      exerciseHkVisualizationDynamicRangeMicrofixture({
        ...base,
        expectedStateCount: 12,
      }),
    ).rejects.toThrow(/declared 12 states but the exact planner produced 13/i);
  });
});

async function runDynamicFixture(workspace: Locator, fixture: DynamicFixture) {
  return exerciseHkVisualizationDynamicRangeMicrofixture(
    dynamicFixtureArgs(workspace, fixture),
  );
}

function dynamicFixtureArgs(workspace: Locator, fixture: DynamicFixture) {
  return {
    ...dynamicFixtureContractArgs(fixture),
    workspace,
  };
}

function dynamicFixtureContractArgs(fixture: DynamicFixture) {
  return {
    labId: fixture.labId,
    rangeDomainId: fixture.domainId,
    modelSelector: "#dynamic-model",
    controlIds: fixture.controls.map(({ id }) => id),
    controlSelectors: fixture.controls.map(
      ({ id }) => `[data-viz-parameter="${id}"]`,
    ),
    expectedStateCount: fixture.expectedStateCount,
    modeIds: fixture.modeId ? [fixture.modeId] : [],
    modeSelectors: fixture.modeId
      ? [`[data-viz-mode="${fixture.modeId}"]`]
      : [],
    resetSelector: "[data-viz-reset-model]",
  };
}

function expectFailure(
  result: Awaited<
    ReturnType<typeof exerciseHkVisualizationDynamicRangeMicrofixture>
  >,
  code: string,
  pattern: RegExp,
) {
  expect(result.failures.length).toBeGreaterThan(0);
  expect(result.failures.map((failure) => failure.code)).toContain(code);
  expect(result.failures.map(({ message }) => message).join("\n")).toMatch(
    pattern,
  );
}

async function mountDynamicFixture(
  page: Page,
  fixture: DynamicFixture,
  defect?: Defect,
) {
  const controls = fixture.controls
    .filter(
      (control) =>
        defect !== "sibling-control" ||
        control.id !== fixture.controls.at(-1)?.id,
    )
    .map((control) => controlMarkup(fixture.domainId, control))
    .join("");
  const mode = fixture.modeId
    ? `
    <div role="group" aria-label="Model" data-viz-mode-group="model">
      <button type="button" data-viz-mode-button data-viz-mode="${fixture.modeId}" data-viz-mode-group="model" data-viz-mode-active="true" aria-pressed="true">${fixture.modeId}</button>
    </div>`
    : "";
  const rootDomain =
    defect === "root-decoy" ? "wrong-domain-v1" : fixture.domainId;
  const decoy =
    defect === "root-decoy"
      ? `<span data-viz-range-domain-id="${fixture.domainId}" aria-hidden="true">decoy</span>`
      : "";
  const siblingControl =
    defect === "sibling-control"
      ? controlMarkup(fixture.domainId, fixture.controls.at(-1)!).replace(
          " data-viz-pointer-target",
          "",
        )
      : "";
  await page.setContent(`<!doctype html>
    <html lang="en"><head><style>
      body { background:#ffffff; color:#111827; font:16px/1.4 system-ui,sans-serif; margin:0; }
      #workspace { max-width:460px; padding:24px; }
      #dynamic-model { background:#ffffff; border:1px solid #94a3b8; border-radius:12px; padding:16px; }
      button, input { min-height:44px; min-width:44px; }
      button { color:#0f172a; background:#e2e8f0; border:1px solid #475569; border-radius:8px; padding:8px 12px; }
      label { align-items:center; display:flex; gap:10px; min-height:44px; margin:8px 0; }
      input[type=range] { flex:1; }
      [data-viz-fixed-parameter] { align-items:center; background:#dbeafe; border-radius:6px; display:inline-flex; min-height:44px; padding:0 12px; }
      svg { display:block; height:96px; margin-top:12px; overflow:visible; width:100%; }
    </style></head><body>
      <main id="workspace">
        <section id="dynamic-model" data-hk-viz-model="${fixture.domainId}" data-hk-viz-topic="${fixture.labId}" data-viz-range-domain-id="${rootDomain}">
          ${decoy}${mode}
          <p data-viz-state-summary>Loading dynamic state</p>
          <p data-hk-viz-formula>Loading formula</p>
          <div data-viz-controls>${controls}</div>
          <svg data-viz-surface viewBox="0 0 400 96" aria-label="Dynamic mathematical model"><rect data-viz-mark x="12" y="22" width="80" height="42" rx="4" fill="#2563eb" /></svg>
          ${defect === "missing-reset" ? "" : `<button type="button" data-viz-reset-model data-viz-reset-module-id="configured-visualization-lab" data-viz-reset-topic-id="${fixture.labId}">Reset model</button>`}
        </section>${siblingControl}
      </main>
    </body></html>`);
  await page.locator("#dynamic-model").evaluate(
    (root, options) => {
      type InputDefinition = {
        id: string;
        initial: number;
        max: number;
        min: number;
        step: number;
      };
      type Options = {
        defect?: string;
        domainId: string;
        inputs: InputDefinition[];
      };
      const { defect, domainId, inputs } = options as Options;
      const initial = Object.fromEntries(
        inputs.map(({ id, initial: value }) => [id, value]),
      ) as Record<string, number>;
      let state = { ...initial };
      let noOpEvidenceRevision = 0;
      const round = (value: number, precision = 12) =>
        Number(value.toFixed(precision));
      const clamp = (value: number, min: number, max: number) =>
        Math.min(max, Math.max(min, value));
      const rangesById = new Map(inputs.map((input) => [input.id, input]));
      const controls = root.querySelector<HTMLElement>("[data-viz-controls]")!;
      const summary = root.querySelector<HTMLElement>(
        "[data-viz-state-summary]",
      )!;
      const formula = root.querySelector<HTMLElement>("[data-hk-viz-formula]")!;
      const mark = root.querySelector<SVGRectElement>("[data-viz-mark]")!;

      const edgeFor = (id: string) => {
        const all = (ids: string[], projection: string, reason: string) => ({
          affects: ids.join(","),
          projection,
          reason,
        });
        if (domainId === "number-bond-v1" && id === "total")
          return all(
            ["knownPart"],
            "clamp-and-visibility",
            "known-part-must-not-exceed-whole",
          );
        if (domainId === "payment-at-least-price-v1" && id === "price")
          return all(["payment"], "clamp-min", "payment-must-cover-price");
        if (domainId === "nonzero-quadratic-a-v1" && id === "a")
          return all(
            ["a"],
            "exclude-zero",
            "quadratic-leading-coefficient-must-be-nonzero",
          );
        if (domainId === "identity-positive-a-gt-b-v1" && id === "a")
          return all(
            ["b"],
            "preserve-positive-order",
            "identity-lengths-must-remain-positive-with-a-greater-than-b",
          );
        if (domainId === "identity-positive-a-gt-b-v1" && id === "b")
          return all(
            ["a"],
            "preserve-positive-order",
            "identity-lengths-must-remain-positive-with-a-greater-than-b",
          );
        if (domainId === "triangle-validity-v1")
          return all(
            inputs.filter((input) => input.id !== id).map((input) => input.id),
            "project-valid-triangle",
            "triangle-must-remain-nondegenerate",
          );
        return null;
      };
      const triangleArea = (next: Record<string, number>) =>
        Math.abs(
          (next.bx - next.ax) * (next.cy - next.ay) -
            (next.by - next.ay) * (next.cx - next.ax),
        ) / 2;
      const triangleMinimumSide = (next: Record<string, number>) =>
        Math.min(
          Math.hypot(next.ax - next.bx, next.ay - next.by),
          Math.hypot(next.bx - next.cx, next.by - next.cy),
          Math.hypot(next.cx - next.ax, next.cy - next.ay),
        );
      const triangleValid = (next: Record<string, number>) =>
        triangleArea(next) >= 0.25 && triangleMinimumSide(next) >= 2.5;
      const projectTriangle = (
        current: Record<string, number>,
        id: string,
        requested: number,
      ) => {
        const next = { ...current, [id]: requested };
        if (triangleValid(next)) return next;
        const companionId = `${id.slice(0, 1)}${id.endsWith("x") ? "y" : "x"}`;
        const controlIds = inputs.map((input) => input.id);
        const companions = [
          companionId,
          ...controlIds.filter(
            (candidate) => candidate !== id && candidate !== companionId,
          ),
        ];
        for (const candidateId of companions) {
          const candidateRange = rangesById.get(candidateId)!;
          const startingValue = next[candidateId];
          const checked = new Set<number>();
          for (
            let offset = 0.25;
            offset <= candidateRange.max - candidateRange.min + 0.25;
            offset += 0.25
          ) {
            for (const direction of [1, -1]) {
              const candidateValue = clamp(
                round(startingValue + direction * offset, 2),
                candidateRange.min,
                candidateRange.max,
              );
              if (checked.has(candidateValue)) continue;
              checked.add(candidateValue);
              const candidate = { ...next, [candidateId]: candidateValue };
              if (triangleValid(candidate)) return candidate;
            }
          }
        }
        const changedVertex = id.slice(0, 1);
        for (const vertex of ["a", "b", "c"].filter(
          (candidate) => candidate !== changedVertex,
        )) {
          for (let x = -8; x <= 8; x += 0.25)
            for (let y = -5; y <= 5; y += 0.25) {
              const candidate = {
                ...next,
                [`${vertex}x`]: x,
                [`${vertex}y`]: y,
              };
              if (triangleValid(candidate)) return candidate;
            }
        }
        return next;
      };
      const apply = (id: string, requested: number) => {
        const range = rangesById.get(id)!;
        const next = { ...state };
        if (domainId === "number-bond-v1") {
          if (id === "total") {
            next.total = clamp(requested, 0, 10);
            next.knownPart = Math.min(next.knownPart, next.total);
          } else next.knownPart = clamp(requested, 0, next.total);
        } else if (domainId === "payment-at-least-price-v1") {
          if (id === "price") {
            next.price = clamp(requested, range.min, range.max);
            next.payment =
              defect === "wrong-projection"
                ? next.payment
                : Math.max(next.payment, next.price);
          } else next.payment = clamp(requested, next.price, range.max);
        } else if (domainId === "nonzero-quadratic-a-v1") {
          next[id] = clamp(requested, range.min, range.max);
          if (id === "a" && Math.abs(next.a) < range.step)
            next.a =
              next.a < 0 || (next.a === 0 && state.a > 0)
                ? -range.step
                : range.step;
          if (id === "a" && defect === "unrelated-mutation")
            next.b = clamp(next.b + 1, -5, 5);
        } else if (domainId === "identity-positive-a-gt-b-v1") {
          next[id] = clamp(requested, range.min, range.max);
          if (id === "a" && next.b >= next.a) next.b = Math.max(1, next.a - 1);
          if (id === "b" && next.b >= next.a) next.a = Math.min(10, next.b + 1);
        } else if (domainId === "triangle-validity-v1") {
          Object.assign(
            next,
            projectTriangle(state, id, clamp(requested, range.min, range.max)),
          );
        } else next[id] = clamp(requested, range.min, range.max);
        state = next;
      };
      const inputMarkup = (
        input: InputDefinition,
        descriptor: { min: number; max: number },
      ) => {
        const edge = edgeFor(input.id);
        const brokenEdge =
          defect === "edge-mismatch" && edge
            ? { ...edge, affects: "wrong" }
            : edge;
        const reason =
          defect === "empty-edge-reason" && edge ? "" : brokenEdge?.reason;
        const attributes = brokenEdge
          ? ` data-viz-range-affects="${brokenEdge.affects}" data-viz-range-projection="${brokenEdge.projection}" data-viz-range-projection-reason="${reason}"`
          : "";
        const blankMin =
          defect === "blank-range-bound" && input.id === "a"
            ? ""
            : ` min="${descriptor.min}"`;
        return `<label data-viz-pointer-target>${input.id}<input type="range"${blankMin} max="${descriptor.max}" step="${input.step}" value="${state[input.id]}" data-viz-control="range" data-viz-parameter="${input.id}" aria-label="${input.id}"${attributes}></label>`;
      };
      const render = () => {
        controls.innerHTML = inputs
          .filter(
            (input) =>
              defect !== "sibling-control" || input.id !== inputs.at(-1)?.id,
          )
          .map((input) => {
            if (
              domainId === "number-bond-v1" &&
              input.id === "knownPart" &&
              state.total === 0
            ) {
              if (defect === "missing-fixed") return "";
              const fixedValue =
                defect === "wrong-fixed-state" ? 1 : state.knownPart;
              const tabIndex = defect === "interactive-fixed" ? "0" : "-1";
              const node = `<span data-viz-fixed-parameter="knownPart" data-viz-fixed-parameter-value="${fixedValue}" tabindex="${tabIndex}">Known part: ${fixedValue}</span>`;
              return defect === "duplicate-fixed" ? `${node}${node}` : node;
            }
            let descriptor = { min: input.min, max: input.max };
            if (domainId === "number-bond-v1" && input.id === "knownPart")
              descriptor.max = state.total;
            if (
              domainId === "payment-at-least-price-v1" &&
              input.id === "payment" &&
              defect !== "stale-descriptor"
            )
              descriptor.min = state.price;
            return inputMarkup(input, descriptor);
          })
          .join("");
        const serialized =
          defect === "malformed-state"
            ? "{"
            : JSON.stringify(
                defect === "wrong-fixed-state" && state.total === 0
                  ? { ...state, knownPart: 1 }
                  : defect === "stale-visible-state"
                    ? { ...state, payment: state.payment + 1 }
                    : { ...state, noOpEvidenceRevision },
              );
        (root as HTMLElement).dataset.hkVizState = serialized;
        summary.textContent = `${domainId}: ${Object.entries(state)
          .map(([id, value]) => `${id}=${value}`)
          .join(", ")}`;
        formula.textContent = `Invariant: ${Object.entries(state)
          .map(([id, value]) => `${id}=${value}`)
          .join("; ")} · proof ${noOpEvidenceRevision}`;
        mark.setAttribute(
          "width",
          String(
            60 +
              (Math.abs(Object.values(state)[0] ?? 0) % 10) * 18 +
              noOpEvidenceRevision,
          ),
        );
        mark.setAttribute("data-viz-state", JSON.stringify(state));
        controls
          .querySelectorAll<HTMLInputElement>("input[type='range']")
          .forEach((input) =>
            input.addEventListener("input", () => {
              const controlId = input.dataset.vizParameter!;
              const prior = state[controlId];
              apply(controlId, Number(input.value));
              if (
                defect === "noop-evidence" &&
                Object.is(prior, state[controlId])
              )
                noOpEvidenceRevision += 1;
              window.setTimeout(render, 0);
            }),
          );
      };
      root
        .querySelector<HTMLButtonElement>("[data-viz-reset-model]")
        ?.addEventListener("click", () => {
          if (defect === "no-op-reset") return;
          state = { ...initial };
          noOpEvidenceRevision = 0;
          window.setTimeout(render, 0);
        });
      render();
    },
    { defect, domainId: fixture.domainId, inputs: fixture.controls },
  );
  const workspace = page.locator("#workspace");
  await expect(workspace).toBeVisible();
  return workspace;
}

function controlMarkup(domainId: string, control: RangeDefinition) {
  return `<label data-viz-pointer-target>${control.id}<input type="range" min="${control.min}" max="${control.max}" step="${control.step}" value="${control.initial}" data-viz-control="range" data-viz-parameter="${control.id}" aria-label="${control.id}"></label>`;
}

async function mountFractionBarFixture(page: Page) {
  await page.setContent(`<!doctype html>
    <html lang="en"><head><style>
      body { background:#ffffff; color:#111827; font:16px/1.4 system-ui,sans-serif; margin:0; }
      #workspace { max-width:500px; padding:24px; }
      #dynamic-model { background:#ffffff; border:1px solid #64748b; border-radius:12px; padding:16px; }
      [data-viz-mode-group] { display:grid; gap:8px; grid-template-columns:repeat(3,minmax(0,1fr)); }
      button, input { min-height:44px; min-width:44px; }
      button { background:#e2e8f0; border:1px solid #475569; border-radius:8px; color:#0f172a; padding:8px 12px; }
      button[aria-pressed="true"] { background:#1d4ed8; color:#ffffff; }
      label { align-items:center; display:flex; gap:10px; margin:8px 0; min-height:44px; }
      input[type=range] { flex:1; }
      svg { display:block; height:112px; margin-top:12px; overflow:visible; width:100%; }
    </style></head><body>
      <main id="workspace">
        <section id="dynamic-model" data-viz-configured-model="fraction-bar" data-viz-range-domain-id="fraction-bar-numerator-v1">
          <div role="group" aria-label="Fraction model" data-viz-mode-group="model">
            <button type="button" data-viz-mode-button data-viz-mode="fraction" data-viz-mode-group="model" data-viz-mode-active="true" aria-pressed="true">Fraction</button>
            <button type="button" data-viz-mode-button data-viz-mode="equivalent" data-viz-mode-group="model" data-viz-mode-active="false" aria-pressed="false">Equivalent</button>
            <button type="button" data-viz-mode-button data-viz-mode="compare" data-viz-mode-group="model" data-viz-mode-active="false" aria-pressed="false">Compare</button>
          </div>
          <p data-viz-state-summary>Loading fraction state</p>
          <p data-hk-viz-formula>Loading fraction formula</p>
          <div data-viz-controls></div>
          <svg data-viz-surface viewBox="0 0 420 112" aria-label="Fraction and exact equivalent fraction bars">
            <rect data-viz-mark data-viz-name="whole bar" x="20" y="18" width="40" height="30" rx="4" fill="#1d4ed8" />
            <rect data-viz-mark data-viz-name="equivalent bar" x="20" y="66" width="40" height="30" rx="4" fill="#7c3aed" />
          </svg>
          <button type="button" data-viz-reset-model data-viz-reset-module-id="configured-visualization-lab" data-viz-reset-topic-id="p3-fractions-intro">Reset model</button>
        </section>
      </main>
    </body></html>`);

  await page.locator("#dynamic-model").evaluate((root) => {
    type ModeId = "fraction" | "equivalent" | "compare";
    let value = 5;
    let comparison = 4;
    let activeMode: ModeId = "fraction";
    const controls = root.querySelector<HTMLElement>("[data-viz-controls]")!;
    const summary = root.querySelector<HTMLElement>(
      "[data-viz-state-summary]",
    )!;
    const formula = root.querySelector<HTMLElement>("[data-hk-viz-formula]")!;
    const whole = root.querySelector<SVGRectElement>(
      '[data-viz-name="whole bar"]',
    )!;
    const equivalent = root.querySelector<SVGRectElement>(
      '[data-viz-name="equivalent bar"]',
    )!;

    const render = () => {
      const denominator = value + 1;
      const numerator = comparison;
      const equivalentNumerator = numerator * 2;
      const equivalentDenominator = denominator * 2;
      root.setAttribute(
        "data-viz-configured-state",
        JSON.stringify({
          denominator,
          equivalentDenominator,
          equivalentNumerator,
          numerator,
          value: numerator / denominator,
        }),
      );
      root.setAttribute("data-viz-configured-mode", activeMode);
      root
        .querySelectorAll<HTMLButtonElement>("[data-viz-mode-button]")
        .forEach((button) => {
          const active = button.dataset.vizMode === activeMode;
          button.dataset.vizModeActive = String(active);
          button.setAttribute("aria-pressed", String(active));
        });
      controls.innerHTML = `
        <label data-viz-pointer-target>Denominator
          <input type="range" min="1" max="9" step="1" value="${value}" data-viz-control="range" data-viz-parameter="value" data-viz-range-affects="comparison" data-viz-range-projection="clamp-max" data-viz-range-projection-reason="raw-numerator-must-remain-between-zero-and-current-denominator-inclusive" aria-label="Denominator">
        </label>
        <label data-viz-pointer-target>Numerator
          <input type="range" min="0" max="${denominator}" step="1" value="${comparison}" data-viz-control="range" data-viz-parameter="comparison" aria-label="Numerator">
        </label>`;
      summary.textContent = `${activeMode}: ${numerator}/${denominator} = ${equivalentNumerator}/${equivalentDenominator}`;
      formula.textContent = `${activeMode} invariant: ${numerator}/${denominator} = ${equivalentNumerator}/${equivalentDenominator}; value=${numerator / denominator}`;
      whole.setAttribute("width", String(40 + numerator * 12));
      whole.setAttribute("data-viz-numerator", String(numerator));
      whole.setAttribute("data-viz-denominator", String(denominator));
      whole.setAttribute("data-viz-value", String(numerator / denominator));
      equivalent.setAttribute("width", String(40 + equivalentNumerator * 6));
      equivalent.setAttribute(
        "data-viz-numerator",
        String(equivalentNumerator),
      );
      equivalent.setAttribute(
        "data-viz-denominator",
        String(equivalentDenominator),
      );
      controls
        .querySelectorAll<HTMLInputElement>('input[type="range"]')
        .forEach((input) =>
          input.addEventListener("input", () => {
            if (input.dataset.vizParameter === "value") {
              value = Math.min(9, Math.max(1, Number(input.value)));
              comparison = Math.min(comparison, value + 1);
            } else {
              comparison = Math.min(
                value + 1,
                Math.max(0, Number(input.value)),
              );
            }
            window.setTimeout(render, 0);
          }),
        );
    };

    root
      .querySelectorAll<HTMLButtonElement>("[data-viz-mode-button]")
      .forEach((button) =>
        button.addEventListener("click", () => {
          activeMode = button.dataset.vizMode as ModeId;
          render();
        }),
      );
    root
      .querySelector<HTMLButtonElement>("[data-viz-reset-model]")!
      .addEventListener("click", () => {
        value = 5;
        comparison = 4;
        activeMode = "fraction";
        render();
      });
    render();
  });

  const workspace = page.locator("#workspace");
  await expect(workspace).toBeVisible();
  return workspace;
}

async function mountUndeclaredClampFixture(page: Page) {
  await page.setContent(`<!doctype html><html lang="en"><body style="margin:0;color:#111827;background:#fff;font:16px system-ui">
    <main id="workspace" style="padding:24px"><section id="dynamic-model" data-hk-viz-state='{"amount":1}'>
      <p data-viz-state-summary>amount=1</p><p data-hk-viz-formula>amount = 1</p>
      <label style="display:flex;min-height:44px">amount<input type="range" min="0" max="2" step="1" value="1" data-viz-control="range" data-viz-parameter="amount" aria-label="amount" style="min-height:44px"></label>
      <svg data-viz-surface viewBox="0 0 200 80" style="width:200px;height:80px"><rect data-viz-mark x="10" y="10" width="50" height="40" fill="#2563eb" /></svg>
      <button type="button" data-viz-reset-model style="min-height:44px">Reset</button>
    </section></main>
  </body></html>`);
  await page.locator("#dynamic-model").evaluate((root) => {
    const range = root.querySelector<HTMLInputElement>("input")!;
    const summary = root.querySelector<HTMLElement>(
      "[data-viz-state-summary]",
    )!;
    const formula = root.querySelector<HTMLElement>("[data-hk-viz-formula]")!;
    const mark = root.querySelector<SVGRectElement>("[data-viz-mark]")!;
    let value = 1;
    const render = () => {
      range.value = String(value);
      root.setAttribute("data-hk-viz-state", JSON.stringify({ amount: value }));
      summary.textContent = `amount=${value}`;
      formula.textContent = `amount = ${value}`;
      mark.setAttribute("width", String(50 + value * 10));
    };
    range.addEventListener("input", () => {
      value = Math.min(1, Number(range.value));
      render();
    });
    root
      .querySelector<HTMLButtonElement>("button")!
      .addEventListener("click", () => {
        value = 1;
        render();
      });
    render();
  });
  return page.locator("#workspace");
}
