import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  AppRouterContext,
  type AppRouterInstance
} from "next/dist/shared/lib/app-router-context.shared-runtime.js";
import { PathnameContext } from "next/dist/shared/lib/hooks-client-context.shared-runtime.js";
import { AppProviders } from "../providers/AppProviders";
import type { FeaturedLabDefinition } from "../../data/visualizationLabs";
import { HKSecondaryVisualizationLab } from "./hk/HKSecondaryVisualizationLab";
import { HK_SECONDARY_DEDICATED_LAB_IDS } from "./hk/hkVisualizationLabRegistry";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

const router: AppRouterInstance = {
  back() {},
  forward() {},
  prefetch() {},
  push() {},
  refresh() {},
  replace() {}
};

const dynamicRangeDomains = {
  angles: {
    controls: Object.fromEntries(
      ["ax", "ay", "bx", "by", "cx", "cy"].map((parameterId) => [
        parameterId,
        {
          affects: ["ax", "ay", "bx", "by", "cx", "cy"]
            .filter((candidateId) => candidateId !== parameterId)
            .join(","),
          projection: "project-valid-triangle",
          reason: "triangle-must-remain-nondegenerate"
        }
      ])
    ),
    domainId: "triangle-validity-v1"
  },
  "quadratic-patterns": {
    controls: {
      a: {
        affects: "a",
        projection: "exclude-zero",
        reason: "quadratic-leading-coefficient-must-be-nonzero"
      }
    },
    domainId: "nonzero-quadratic-a-v1"
  },
  "identities-square-patterns": {
    controls: {
      a: {
        affects: "b",
        projection: "preserve-positive-order",
        reason: "identity-lengths-must-remain-positive-with-a-greater-than-b"
      },
      b: {
        affects: "a",
        projection: "preserve-positive-order",
        reason: "identity-lengths-must-remain-positive-with-a-greater-than-b"
      }
    },
    domainId: "identity-positive-a-gt-b-v1"
  }
} as const;

function labFixture(labId: string): FeaturedLabDefinition {
  const label = { en: labId, zh: labId };
  return {
    analyticsSource: "geometry",
    category: label,
    curriculumTrack: "HK",
    description: label,
    grade: "S1",
    gradeLabel: label,
    labId,
    moduleId: "configured-visualization-lab",
    primaryForTopic: true,
    qaProfile: "geometry-heavy",
    templateConfig: { focus: label, variant: "range-domain-test" },
    templateId: "angle-geometry",
    title: label,
    topicId: labId
  };
}

function renderSecondaryLab(labId: string) {
  return renderToStaticMarkup(
    React.createElement(
      AppRouterContext.Provider,
      { value: router },
      React.createElement(
        PathnameContext.Provider,
        { value: "/visualization-lab" },
        React.createElement(
          AppProviders,
          null,
          React.createElement(HKSecondaryVisualizationLab, {
            lab: labFixture(labId)
          })
        )
      )
    )
  );
}

function attributesFromTag(tag: string) {
  return Object.fromEntries(
    Array.from(tag.matchAll(/\s([a-zA-Z0-9:-]+)(?:="([^"]*)")?/g), (match) => [
      match[1],
      match[2] ?? ""
    ])
  );
}

function rootAttributes(markup: string) {
  const tag = markup.match(/<section\b[^>]*data-hk-viz-model="secondary-dedicated-v1"[^>]*>/)?.[0];
  assert.ok(tag, "Secondary dedicated markup must expose its model root.");
  return attributesFromTag(tag);
}

function rangeControlAttributes(markup: string) {
  const controls = new Map<string, Record<string, string>>();
  for (const tag of markup.match(/<input\b[^>]*type="range"[^>]*>/g) ?? []) {
    const attributes = attributesFromTag(tag);
    const parameterId = attributes["data-viz-parameter"];
    assert.ok(parameterId, "Every secondary range input must expose data-viz-parameter.");
    assert.equal(controls.has(parameterId), false, `Duplicate range input for ${parameterId}.`);
    controls.set(parameterId, attributes);
  }
  return controls;
}

test("only three secondary dynamic range-domain labs expose exact root and controller metadata", () => {
  const dynamicIds = new Set(Object.keys(dynamicRangeDomains));

  for (const labId of HK_SECONDARY_DEDICATED_LAB_IDS) {
    const markup = renderSecondaryLab(labId);
    const root = rootAttributes(markup);
    const controls = rangeControlAttributes(markup);
    const expected = dynamicRangeDomains[labId as keyof typeof dynamicRangeDomains];

    if (!expected) {
      assert.equal(
        root["data-viz-range-domain-id"],
        undefined,
        `${labId} is independent and must not advertise a dynamic range domain.`
      );
      assert.equal(
        markup.includes("data-viz-range-affects="),
        false,
        `${labId} independent controls must not advertise projected effects.`
      );
      assert.equal(markup.includes("data-viz-range-projection="), false);
      assert.equal(markup.includes("data-viz-range-projection-reason="), false);
      continue;
    }

    assert.equal(root["data-viz-range-domain-id"], expected.domainId);
    assert.equal(
      (markup.match(/data-viz-range-domain-id=/g) ?? []).length,
      1,
      `${labId} range-domain id belongs only on the dedicated root.`
    );

    const expectedControls = expected.controls as Record<
      string,
      { affects: string; projection: string; reason: string }
    >;
    for (const [parameterId, attributes] of controls) {
      const expectedControl = expectedControls[parameterId];
      if (!expectedControl) {
        assert.equal(attributes["data-viz-range-affects"], undefined);
        assert.equal(attributes["data-viz-range-projection"], undefined);
        assert.equal(attributes["data-viz-range-projection-reason"], undefined);
        continue;
      }

      assert.equal(attributes["data-viz-range-affects"], expectedControl.affects);
      assert.equal(attributes["data-viz-range-projection"], expectedControl.projection);
      assert.equal(
        attributes["data-viz-range-projection-reason"],
        expectedControl.reason,
        `${labId}/${parameterId} projection reason must match the registry token.`
      );
      const affectedParameterIds = attributes["data-viz-range-affects"].split(",");
      if (labId === "quadratic-patterns") {
        assert.deepEqual(affectedParameterIds, [parameterId], "Only self-projected quadratic a may list itself.");
      } else {
        assert.equal(
          affectedParameterIds.includes(parameterId),
          false,
          `${labId}/${parameterId} must list side-effect controls only, not the deliberate trigger.`
        );
      }
    }
    assert.deepEqual(
      [...controls.entries()]
        .filter(([, attributes]) => attributes["data-viz-range-affects"] !== undefined)
        .map(([parameterId]) => parameterId)
        .sort(),
      Object.keys(expectedControls).sort(),
      `${labId} must tag exactly its true projection controllers.`
    );
  }

  assert.deepEqual([...dynamicIds].sort(), [
    "angles",
    "identities-square-patterns",
    "quadratic-patterns"
  ]);
});
