import { expect, test, type Locator, type Page } from "@playwright/test";
import {
  exerciseHkVisualizationInteractionMicrofixture,
  installHkVisualizationEffectiveVisibilityInspector
} from "./hk-visualization-machine-acceptance-helpers";

type FixtureOptions = {
  blankModeLabel?: boolean;
  clampAmountWhenExtraChanges?: boolean;
  conditionalMinutes?: boolean;
  dependentMinutes?: boolean;
  evidenceMode?: "complete" | "state-only" | "visual-only";
  extraRangeCount?: number;
  lowContrastAtEveryState?: boolean;
  lowContrastAtRangeMaximum?: boolean;
  lowContrastOnTime?: boolean;
  modelChangesMinutes?: boolean;
  noModes?: boolean;
  twoActiveModelModes?: boolean;
  undersizedMode?: boolean;
  untabbableMode?: boolean;
  includeOpacityEvidenceMarks?: boolean;
};

const modeIds = ["measure", "time", "whole", "half"] as const;

test.describe("HK visualization grouped interaction microfixtures", () => {
  test.beforeEach(async ({ page }) => {
    await installHkVisualizationEffectiveVisibilityInspector(page);
    await page.goto("data:text/html,<html><body></body></html>");
  });

  test("traverses two independent visible groups without requiring cross-group deactivation", async ({ page }) => {
    const workspace = await mountGroupedFixture(page, {
      includeOpacityEvidenceMarks: true
    });
    const result = await runFixture(workspace);

    expect(result.failures).toEqual([]);
    expect(result.groups).toEqual({ minutes: "whole", model: "measure" });
    expect(new Set(result.interactions.filter((item) => item.action.startsWith("keyboard-mode-")).map((item) => item.activationKey)))
      .toEqual(new Set(["Enter", "Space"]));
    expect(result.interactions.filter((item) => item.action.startsWith("keyboard-mode-")).every((item) => (
      item.contractStateChanged === true && item.meaningfulEvidenceChanged === true
    ))).toBe(true);

    const firstSnapshot = result.interactions.find(
      (interaction) => interaction.before !== undefined
    )?.before;
    expect(firstSnapshot).toBeDefined();
    const snapshot = JSON.parse(firstSnapshot!) as { meaningfulEvidence: string };
    const meaningfulEvidence = JSON.parse(snapshot.meaningfulEvidence) as {
      visualMarks: Array<{ paintedSubtree: unknown[] }>;
    };
    expect(meaningfulEvidence.visualMarks).toHaveLength(1);
    expect(meaningfulEvidence.visualMarks[0]?.paintedSubtree.length).toBeGreaterThan(0);
  });

  test("reveals and traverses a conditional subgroup through its owning model group", async ({ page }) => {
    const workspace = await mountGroupedFixture(page, { conditionalMinutes: true });
    const reorderedModeIds = ["time", "measure", "whole", "half"] as const;
    const result = await runFixture(workspace, 0, {
      modeIds: reorderedModeIds,
      modeTopology: [
        { groupId: "model", modeIds: ["measure", "time"] },
        {
          groupId: "minutes",
          modeIds: ["whole", "half"],
          parentMode: { groupId: "model", modeId: "time" }
        }
      ]
    });

    expect(result.failures).toEqual([]);
    const modeActions = result.interactions
      .filter((item) => item.action.startsWith("keyboard-mode-"))
      .map((item) => item.action);
    const measureIndex = modeActions.indexOf("keyboard-mode-measure");
    const parentReplayIndex = modeActions.indexOf("keyboard-mode-time", measureIndex + 1);
    const halfIndex = modeActions.indexOf("keyboard-mode-half");
    expect(measureIndex).toBeGreaterThanOrEqual(0);
    expect(parentReplayIndex).toBeGreaterThan(measureIndex);
    expect(halfIndex).toBeGreaterThan(parentReplayIndex);
    expect(result.interactions.some((item) => item.action === "keyboard-mode-half")).toBe(true);
    expect(new Set(stateScanLedger(result).entries
      .filter((entry) => entry.modeId !== "reset")
      .map((entry) => entry.modeId)))
      .toEqual(new Set(reorderedModeIds));
    expect(result.groups).toEqual({ model: "measure" });
  });

  test("allows an explicitly declared visible dependent group to update with its owner", async ({ page }) => {
    const workspace = await mountGroupedFixture(page, { dependentMinutes: true, modelChangesMinutes: true });
    const result = await runFixture(workspace);

    expect(result.failures).toEqual([]);
    expect(result.groups).toEqual({ minutes: "whole", model: "measure" });
  });

  test("rejects an undeclared visible cross-group mutation", async ({ page }) => {
    const workspace = await mountGroupedFixture(page, { modelChangesMinutes: true });
    const result = await runFixture(workspace);

    expect(result.failures.some((failure) => (
      failure.code === "MANIFEST_MODE_INTERACTION"
      && failure.message.includes("independent mode group minutes")
    ))).toBe(true);
  });

  test("reruns contrast after a mode transition instead of checking only the initial state", async ({ page }) => {
    const workspace = await mountGroupedFixture(page, { lowContrastOnTime: true });
    const result = await runFixture(workspace);

    expect(result.failures.some((failure) => failure.code === "STATE_THEME_CONTRAST")).toBe(true);
  });

  test("executes a duplicate-free min midpoint max and endpoint ledger in every declared mode state", async ({ page }) => {
    const result = await runFixture(await mountGroupedFixture(page));
    const ledger = stateScanLedger(result);
    const rangeEntries = ledger.entries.filter((entry) => entry.modeId !== "reset");

    expect(result.failures).toEqual([]);
    expect(ledger.executedStateIds).toEqual(ledger.plannedStateIds);
    expect(ledger.entries.every((entry) => entry.observedSignature === entry.requestedSignature)).toBe(true);
    expect(new Set(ledger.plannedStateIds).size).toBe(ledger.plannedStateIds.length);
    expect(ledger.entries).toHaveLength(13);
    expect(rangeEntries).toHaveLength(modeIds.length * 3);
    for (const modeId of modeIds) {
      const reasons = rangeEntries.filter((entry) => entry.modeId === modeId)
        .flatMap((entry) => entry.reasons)
        .filter((reason) => reason !== "default");
      expect(new Set(reasons)).toEqual(new Set([
        `mode:${modeId}:base`,
        "control:amount:minimum",
        "control:amount:midpoint",
        "control:amount:maximum",
        "endpoint-combination:0",
        "endpoint-combination:1"
      ]));
    }
    expect(rangeEntries[0].reasons).toContain("default");
    expect(ledger.entries.at(-1)).toMatchObject({ modeId: "reset", reasons: ["reset"] });
    expect(ledger.entries.every((entry) => result.layout.some((snapshot) => snapshot.phase === entry.phase))).toBe(true);
    expect(ledger.entries.every((entry) => result.collisions.some((snapshot) => snapshot.phase === entry.phase))).toBe(true);
  });

  test("scans a real no-mode slider through every range state and reset", async ({ page }) => {
    const workspace = await mountGroupedFixture(page, { noModes: true });
    await expect(workspace.locator("[data-viz-mode-button]")).toHaveCount(0);

    const result = await runNoModeFixture(workspace);
    const ledger = stateScanLedger(result);
    const rangeEntries = ledger.entries.filter((entry) => entry.modeId !== "reset");

    expect(result.failures).toEqual([]);
    expect(result.groups).toEqual({});
    expect(result.interactions.some((item) => item.action.startsWith("keyboard-mode-"))).toBe(false);
    expect(ledger.executedStateIds).toEqual(ledger.plannedStateIds);
    expect(ledger.entries.every((entry) => entry.observedSignature === entry.requestedSignature)).toBe(true);
    expect(ledger.entries).toHaveLength(4);
    expect(rangeEntries).toHaveLength(3);
    expect(new Set(rangeEntries.map((entry) => entry.modeId))).toEqual(new Set(["__default__"]));
    expect(new Set(rangeEntries.flatMap((entry) => entry.reasons))).toEqual(new Set([
      "default",
      "mode:__default__:base",
      "control:amount:minimum",
      "control:amount:midpoint",
      "control:amount:maximum",
      "endpoint-combination:0",
      "endpoint-combination:1"
    ]));
    expect(ledger.entries.at(-1)).toMatchObject({ modeId: "reset", reasons: ["reset"] });
    expect(ledger.entries.every((entry) => result.layout.some((snapshot) => snapshot.phase === entry.phase))).toBe(true);
    expect(ledger.entries.every((entry) => result.collisions.some((snapshot) => snapshot.phase === entry.phase))).toBe(true);
    const resetEvidence = result.interactions.filter((item) => item.action.startsWith("keyboard-reset-"));
    expect(resetEvidence.map((item) => item.activationKey)).toEqual(["Enter", "Space"]);

    const contrastProbe = await runNoModeFixture(await mountGroupedFixture(page, {
      lowContrastAtEveryState: true,
      noModes: true
    }));
    const contrastLedger = stateScanLedger(contrastProbe);
    const contrastFailurePhases = new Set(contrastProbe.failures
      .filter((failure) => failure.code === "STATE_THEME_CONTRAST")
      .map((failure) => failure.phase));
    expect(contrastLedger.entries.every((entry) => contrastFailurePhases.has(entry.phase))).toBe(true);
    expect(contrastLedger.entries.every((entry) => contrastProbe.layout.some((snapshot) => snapshot.phase === entry.phase))).toBe(true);
    expect(contrastLedger.entries.every((entry) => contrastProbe.collisions.some((snapshot) => snapshot.phase === entry.phase))).toBe(true);
  });

  test("executes every two-slider endpoint combination once per mode without plan or execution drift", async ({ page }) => {
    const options = { extraRangeCount: 1 };
    const result = await runFixture(await mountGroupedFixture(page, options), options.extraRangeCount);
    const ledger = stateScanLedger(result);
    const entries = ledger.entries.filter((entry) => entry.modeId !== "reset");

    expect(result.failures).toEqual([]);
    expect(ledger.executedStateIds).toEqual(ledger.plannedStateIds);
    expect(ledger.entries.every((entry) => entry.observedSignature === entry.requestedSignature)).toBe(true);
    expect(new Set(ledger.plannedStateIds).size).toBe(ledger.plannedStateIds.length);
    expect(ledger.entries).toHaveLength(28);
    expect(entries).toHaveLength(27);
    for (const modeId of modeIds) {
      const modeEntries = entries.filter((entry) => entry.modeId === modeId);
      expect(new Set(modeEntries.map((entry) => entry.requestedSignature)).size).toBe(modeEntries.length);
      const reasons = modeEntries.flatMap((entry) => entry.reasons);
      for (const controlId of ["amount", "extra-0"]) {
        for (const reason of [
          `control:${controlId}:minimum`,
          `control:${controlId}:midpoint`,
          `control:${controlId}:maximum`
        ]) expect(reasons).toContain(reason);
      }
      const endpointReasons = modeEntries
        .flatMap((entry) => entry.reasons)
        .filter((reason) => reason.startsWith("endpoint-combination:"));
      expect(new Set(endpointReasons)).toEqual(new Set([
        "endpoint-combination:0",
        "endpoint-combination:1",
        "endpoint-combination:2",
        "endpoint-combination:3"
      ]));
    }

    const interdependentOptions = { clampAmountWhenExtraChanges: true, extraRangeCount: 1 };
    const interdependent = await runFixture(
      await mountGroupedFixture(page, interdependentOptions),
      interdependentOptions.extraRangeCount
    );
    expect(interdependent.failures.some((failure) => (
      failure.code === "RANGE_STATE_EXECUTION"
      && failure.message.includes("requested signature")
      && failure.message.includes("observed")
    ))).toBe(true);
    const interdependentLedger = stateScanLedger(interdependent);
    const mismatchedEntry = interdependentLedger.entries.find((entry) => (
      entry.observedSignature !== null
      && entry.observedSignature !== entry.requestedSignature
    ));
    expect(mismatchedEntry).toBeDefined();
    expect(interdependentLedger.executedStateIds).not.toContain(mismatchedEntry?.id);
    expect(interdependentLedger.entries
      .filter((entry) => entry.observedSignature === null)
      .map((entry) => entry.id).length).toBeGreaterThan(0);
  });

  test("fails closed instead of truncating thirteen visible sliders", async ({ page }) => {
    const options = { extraRangeCount: 12 };
    const result = await runFixture(await mountGroupedFixture(page, options), options.extraRangeCount);

    expect(result.failures.some((failure) => (
      failure.code === "RANGE_STATE_PLAN"
      && failure.message.includes("must not be silently truncated")
    ))).toBe(true);
    expect(stateScanLedger(result).executedStateIds).toEqual([]);
  });

  test("runs contrast inside a range-ledger endpoint state", async ({ page }) => {
    const result = await runFixture(await mountGroupedFixture(page, { lowContrastAtRangeMaximum: true }));

    expect(result.failures.some((failure) => (
      failure.code === "STATE_THEME_CONTRAST"
      && failure.phase?.includes("range-state")
    ))).toBe(true);
  });

  test("proves reset is Tab-reachable and activates it with both Enter and Space", async ({ page }) => {
    const workspace = await mountGroupedFixture(page);
    const result = await runFixture(workspace);
    const resetEvidence = result.interactions.filter((item) => item.action.startsWith("keyboard-reset-"));

    expect(result.failures).toEqual([]);
    expect(resetEvidence.map((item) => item.activationKey)).toEqual(["Enter", "Space"]);
    expect(resetEvidence.every((item) => item.tabFocused && item.contractStateChanged && item.meaningfulEvidenceChanged)).toBe(true);
  });

  test("rejects a mode that changes serialized state but no formula summary or visual mark", async ({ page }) => {
    const workspace = await mountGroupedFixture(page, { evidenceMode: "state-only" });
    const result = await runFixture(workspace);

    expect(result.failures.some((failure) => (
      failure.code === "MANIFEST_MODE_INTERACTION" && failure.message.includes("meaningful formula/summary or visual-mark evidence")
    ))).toBe(true);
  });

  test("rejects a mode that changes visual evidence but not serialized contract state", async ({ page }) => {
    const workspace = await mountGroupedFixture(page, { evidenceMode: "visual-only" });
    const result = await runFixture(workspace);

    expect(result.failures.some((failure) => (
      failure.code === "MANIFEST_MODE_INTERACTION" && failure.message.includes("serialized contract state")
    ))).toBe(true);
  });

  test("rejects a pointer-clickable mode that cannot be reached with Tab", async ({ page }) => {
    const workspace = await mountGroupedFixture(page, { untabbableMode: true });
    const result = await runFixture(workspace);

    expect(result.failures.some((failure) => (
      failure.code === "MANIFEST_MODE_INTERACTION" && failure.message.includes("Tab")
    ))).toBe(true);
  });

  test("rejects a visible group with two active modes", async ({ page }) => {
    const workspace = await mountGroupedFixture(page, { twoActiveModelModes: true });
    const result = await runFixture(workspace);

    expect(result.failures.some((failure) => (
      ["MANIFEST_MODE_GROUP", "MANIFEST_MODE_INTERACTION"].includes(failure.code)
      && failure.message.includes("exactly one")
    ))).toBe(true);
  });

  test("retains the 44px target and localized accessible-name gates", async ({ page }) => {
    const undersized = await runFixture(await mountGroupedFixture(page, { undersizedMode: true }));
    expect(undersized.failures.some((failure) => failure.code === "CONTROL_TARGET_44")).toBe(true);

    const unnamed = await runFixture(await mountGroupedFixture(page, { blankModeLabel: true }));
    expect(unnamed.failures.some((failure) => (
      failure.code === "MANIFEST_MODE_INTERACTION" && failure.message.includes("accessible localized text")
    ))).toBe(true);
  });
});

async function runFixture(
  workspace: Locator,
  extraRangeCount = 0,
  modeOptions: {
    modeIds?: readonly string[];
    modeTopology?: readonly {
      groupId: string;
      modeIds: readonly string[];
      parentMode?: { groupId: string; modeId: string };
    }[];
  } = {}
) {
  const extraRangeIds = Array.from({ length: extraRangeCount }, (_, index) => `extra-${index}`);
  const selectedModeIds = modeOptions.modeIds ?? modeIds;
  return exerciseHkVisualizationInteractionMicrofixture({
    language: "en",
    modeIds: selectedModeIds,
    modeSelectors: selectedModeIds.map((modeId) => `[data-viz-mode-button][data-viz-mode="${modeId}"]`),
    modeTopology: modeOptions.modeTopology,
    controlIds: ["amount", ...extraRangeIds],
    controlSelectors: [
      '[data-viz-parameter="amount"]',
      ...extraRangeIds.map((controlId) => `[data-viz-parameter="${controlId}"]`)
    ],
    resetSelector: "[data-viz-reset-model]",
    workspace
  });
}

async function runNoModeFixture(workspace: Locator) {
  return exerciseHkVisualizationInteractionMicrofixture({
    language: "en",
    modeIds: [],
    modeSelectors: [],
    controlIds: ["amount"],
    controlSelectors: ['[data-viz-parameter="amount"]'],
    resetSelector: "[data-viz-reset-model]",
    workspace
  });
}

async function mountGroupedFixture(page: Page, options: FixtureOptions = {}) {
  const extraRanges = Array.from({ length: options.extraRangeCount ?? 0 }, (_, index) => `
          <label class="range-target" data-viz-pointer-target>
            Extra ${index}
            <input type="range" min="0" max="2" step="1" value="1" data-viz-control="range" data-viz-parameter="extra-${index}" aria-label="Extra ${index}" />
          </label>`).join("");
  const modeGroups = options.noModes ? "" : `
          <div role="group" aria-label="Model" data-viz-mode-group="model">
            ${modeButton("measure", "model", true, false)}
            ${modeButton(
              "time",
              "model",
              options.twoActiveModelModes === true,
              options.untabbableMode === true,
              options.blankModeLabel ? "" : "time",
              options.undersizedMode === true
            )}
          </div>
          <div id="minutes-group" role="group" aria-label="Minutes" data-viz-mode-group="minutes"${options.dependentMinutes ? ' data-viz-mode-depends-on="model"' : ""}${options.conditionalMinutes ? ' style="display:none"' : ""}>
            ${modeButton("whole", "minutes", true, false, "whole", false, options.dependentMinutes ? "model" : undefined)}
            ${modeButton("half", "minutes", false, false, "half", false, options.dependentMinutes ? "model" : undefined)}
          </div>`;
  await page.setContent(`<!doctype html>
    <html lang="en">
      <head>
        <style>
          body { margin: 0; font: 16px sans-serif; }
          main { padding: 24px; width: 340px; }
          [role="group"] { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px; }
          button { min-width: 110px; min-height: 44px; }
          .range-target { align-items: center; display: flex; gap: 8px; min-height: 44px; }
          svg { display: block; width: 300px; height: 80px; }
        </style>
      </head>
      <body>
        <main
          id="workspace"
          data-hk-viz-model="primary-dedicated-v1"
          data-hk-viz-topic="fixture"
          data-hk-viz-state='{"amount":1,"model":"measure","minutes":"whole","revision":0}'
        >
          ${modeGroups}
          <p data-viz-state-summary>measure · whole · revision 0</p>
          <p data-hk-viz-formula>measure + whole = revision 0</p>
          <p id="dynamic-contrast-label" style="background:#fff;color:#000">Dynamic contrast label</p>
          <label class="range-target" data-viz-pointer-target>Amount <input type="range" min="0" max="2" step="1" value="1" data-viz-control="range" data-viz-parameter="amount" aria-label="Amount" /></label>
          ${extraRanges}
          <svg data-viz-surface viewBox="0 0 300 80" aria-label="Visualization evidence">
            <rect data-viz-mark data-mode="measure" data-minutes="whole" data-revision="0" x="10" y="10" width="80" height="40" fill="#2563eb" />
            ${options.includeOpacityEvidenceMarks ? `
              <g style="opacity: 0">
                <rect data-viz-mark data-opacity-hidden-mark="true" x="160" y="10" width="80" height="40" fill="#dc2626" />
              </g>
            ` : ""}
          </svg>
          <button
            type="button"
            data-viz-reset-model
            data-viz-reset-module-id="configured-visualization-lab"
            data-viz-reset-topic-id="fixture"
          >Reset model</button>
        </main>
      </body>
    </html>`);

  await page.locator("#workspace").evaluate((root, fixtureOptions) => {
    type State = { amount: number; extras: Record<string, number>; minutes: string; model: string; revision: number };
    const extras = Object.fromEntries(
      Array.from(root.querySelectorAll<HTMLInputElement>('input[data-viz-parameter^="extra-"]'))
        .map((input) => [input.dataset.vizParameter!, Number(input.value)])
    );
    const initial: State = { amount: 1, extras, model: "measure", minutes: "whole", revision: 0 };
    let state = { ...initial };
    let mutationKind: "initial" | "mode" | "range" | "reset" = "initial";
    const stateRoot = root as HTMLElement;
    const minutesGroup = root.querySelector<HTMLElement>("#minutes-group")!;
    const summary = root.querySelector<HTMLElement>("[data-viz-state-summary]")!;
    const formula = root.querySelector<HTMLElement>("[data-hk-viz-formula]")!;
    const dynamicContrastLabel = root.querySelector<HTMLElement>("#dynamic-contrast-label")!;
    const mark = root.querySelector<SVGElement>("[data-viz-mark]")!;
    const ranges = Array.from(root.querySelectorAll<HTMLInputElement>('input[type="range"]'));

    const render = () => {
      root.querySelectorAll<HTMLElement>("[data-viz-mode-button]").forEach((button) => {
        const group = button.dataset.vizModeGroup!;
        const active = state[group as "model" | "minutes"] === button.dataset.vizMode;
        button.dataset.vizModeActive = String(active);
        button.setAttribute("aria-pressed", String(active));
      });
      if (fixtureOptions.conditionalMinutes) minutesGroup.style.display = state.model === "time" ? "grid" : "none";
      if (fixtureOptions.evidenceMode !== "state-only" || mutationKind !== "mode") {
        const extraTotal = Object.values(state.extras).reduce((total, value) => total + value, 0);
        summary.textContent = `${state.model} · ${state.minutes} · amount ${state.amount} · extras ${extraTotal} · revision ${state.revision}`;
        formula.textContent = `${state.model} + ${state.minutes} + ${state.amount} + ${extraTotal} = revision ${state.revision}`;
        mark.setAttribute("data-mode", state.model);
        mark.setAttribute("data-minutes", state.minutes);
        mark.setAttribute("data-revision", String(state.revision));
        mark.setAttribute("width", String(80 + state.amount * 20));
      }
      if (fixtureOptions.evidenceMode !== "visual-only" || mutationKind !== "mode") {
        stateRoot.dataset.hkVizState = JSON.stringify(state);
      }
      dynamicContrastLabel.style.color = (
        fixtureOptions.lowContrastAtEveryState
      ) || (
        fixtureOptions.lowContrastOnTime && state.model === "time"
      ) || (
        fixtureOptions.lowContrastAtRangeMaximum && state.amount === 2
      ) ? "#fff" : "#000";
      ranges.forEach((input) => {
        const controlId = input.dataset.vizParameter!;
        input.value = String(controlId === "amount" ? state.amount : state.extras[controlId]);
      });
    };

    root.querySelectorAll<HTMLButtonElement>("[data-viz-mode-button]").forEach((button) => {
      button.addEventListener("click", () => {
        const group = button.dataset.vizModeGroup as "model" | "minutes";
        const nextMode = button.dataset.vizMode!;
        state = {
          ...state,
          [group]: nextMode,
          ...(fixtureOptions.modelChangesMinutes && group === "model" ? { minutes: nextMode === "time" ? "half" : "whole" } : {}),
          revision: state.revision + 1
        };
        mutationKind = "mode";
        render();
      });
    });
    ranges.forEach((input) => input.addEventListener("input", () => {
      const controlId = input.dataset.vizParameter!;
      state = controlId === "amount"
        ? { ...state, amount: Number(input.value), revision: state.revision + 1 }
        : {
            ...state,
            amount: fixtureOptions.clampAmountWhenExtraChanges ? 0 : state.amount,
            extras: { ...state.extras, [controlId]: Number(input.value) },
            revision: state.revision + 1
          };
      mutationKind = "range";
      render();
    }));
    root.querySelector<HTMLButtonElement>("[data-viz-reset-model]")!.addEventListener("click", () => {
      state = { ...initial };
      mutationKind = "reset";
      render();
    });
    render();
    if (fixtureOptions.twoActiveModelModes) {
      const time = root.querySelector<HTMLElement>('[data-viz-mode="time"]')!;
      time.dataset.vizModeActive = "true";
      time.setAttribute("aria-pressed", "true");
    }
  }, options);

  const workspace = page.locator("#workspace");
  await expect(workspace).toBeVisible();
  return workspace;
}

type StateScanLedgerView = {
  entries: Array<{
    id: string;
    modeId: string;
    observedSignature: string | null;
    phase: string;
    reasons: string[];
    requestedSignature: string;
  }>;
  executedStateIds: string[];
  plannedStateIds: string[];
};

function stateScanLedger(result: unknown) {
  return (result as { stateScanLedger?: StateScanLedgerView }).stateScanLedger as StateScanLedgerView;
}

function modeButton(
  mode: string,
  group: string,
  active: boolean,
  untabbable: boolean,
  label = mode,
  undersized = false,
  dependsOnGroupId?: string
) {
  return `<button
    type="button"
    data-viz-mode-button
    data-viz-mode="${mode}"
    data-viz-mode-group="${group}"
    ${dependsOnGroupId ? `data-viz-mode-depends-on="${dependsOnGroupId}"` : ""}
    data-viz-mode-active="${String(active)}"
    aria-pressed="${String(active)}"
    ${untabbable ? 'tabindex="-1"' : ""}
    ${undersized ? 'style="min-width:30px;min-height:30px;width:30px;height:30px;padding:0"' : ""}
  >${label}</button>`;
}
