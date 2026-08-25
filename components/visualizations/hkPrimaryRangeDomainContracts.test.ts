import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import test from "node:test";
import { hkPrimaryFactorsDivisorRangeProjectionMetadata } from "./hk/HKPrimaryVisualizationLab";
import { HK_PRIMARY_DEDICATED_LAB_IDS } from "./hk/hkVisualizationLabRegistry";

const expectedDomains = {
  "p1-counting-number-bonds": {
    domainId: "number-bond-v1",
    edges: {
      total: ["knownPart", "clamp-and-visibility", "known-part-must-not-exceed-whole"]
    }
  },
  "p1-addition-subtraction": {
    domainId: "bounded-step-v1",
    edges: {
      start: ["step", "clamp-and-visibility", "step-must-remain-on-number-line"]
    }
  },
  "p2-money-time": {
    domainId: "payment-at-least-price-v1",
    edges: {
      price: ["payment", "clamp-min", "payment-must-cover-price"]
    }
  },
  "p4-large-numbers": {
    domainId: "divisor-within-number-v1",
    edges: {
      firstNumber: ["candidateDivisor", "clamp-max", "test-divisor-must-not-exceed-tested-number"]
    }
  },
  "p5-fractions-operations": {
    domainId: "proper-fractions-v1",
    edges: {
      firstDenominator: ["firstNumerator", "clamp-max", "proper-fraction-numerator-must-be-below-denominator"],
      secondDenominator: ["secondNumerator", "clamp-max", "proper-fraction-numerator-must-be-below-denominator"],
      thirdDenominator: ["thirdNumerator", "clamp-max", "proper-fraction-numerator-must-be-below-denominator"]
    }
  },
  "p5-volume": {
    domainId: "visible-layers-v1",
    edges: {
      height: ["visibleLayers", "clamp-max", "revealed-layers-must-not-exceed-height"]
    }
  }
} as const;

const primarySource = fs.readFileSync("components/visualizations/hk/HKPrimaryVisualizationLab.tsx", "utf8");

function primaryFunctionBlock(functionName: string) {
  const signature = new RegExp(`(?:export\\s+)?function\\s+${functionName}\\s*\\(`, "m");
  const match = signature.exec(primarySource);
  assert.ok(match, `Missing ${functionName}.`);
  const nextFunction = /\n(?:export\s+)?function\s+[A-Za-z0-9_]+\s*\(/g;
  nextFunction.lastIndex = match.index + match[0].length;
  const next = nextFunction.exec(primarySource);
  return primarySource.slice(match.index, next?.index ?? primarySource.length);
}

function renderPrimaryLabsWithStandardReactJsx() {
  const labIds = JSON.stringify(HK_PRIMARY_DEDICATED_LAB_IDS);
  const script = `
    import React from "react";
    globalThis.React = React;
    import { renderToStaticMarkup } from "react-dom/server";
    import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime.js";
    import { PathnameContext } from "next/dist/shared/lib/hooks-client-context.shared-runtime.js";
    import { AppProviders } from "./components/providers/AppProviders.tsx";
    import { HKPrimaryVisualizationLab } from "./components/visualizations/hk/HKPrimaryVisualizationLab.tsx";

    const router = {
      back() {},
      forward() {},
      prefetch() { return Promise.resolve(); },
      push() {},
      refresh() {},
      replace() {}
    };
    const htmlByLab = Object.fromEntries(${labIds}.map((labId) => {
      const tree = React.createElement(
        AppRouterContext.Provider,
        { value: router },
        React.createElement(
          PathnameContext.Provider,
          { value: "/visualization-lab" },
          React.createElement(
            AppProviders,
            null,
            React.createElement(HKPrimaryVisualizationLab, { lab: { labId } })
          )
        )
      );
      return [labId, renderToStaticMarkup(tree)];
    }));
    process.stdout.write(JSON.stringify(htmlByLab));
  `;
  const result = spawnSync(process.execPath, ["--import", "tsx", "--input-type=module", "-e", script], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: { ...process.env, NODE_ENV: "test" },
    maxBuffer: 16 * 1024 * 1024
  });

  assert.equal(result.status, 0, `Standard React SSR child failed (${result.status ?? "signal"}):\n${result.stderr}`);
  return JSON.parse(result.stdout) as Record<string, string>;
}

function attribute(tag: string, name: string) {
  return tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1] ?? null;
}

const htmlByLab = renderPrimaryLabsWithStandardReactJsx();

test("only the six audited primary labs expose exact semantic dynamic-range domains", () => {
  assert.deepEqual(Object.keys(expectedDomains).sort(), [
    "p1-addition-subtraction",
    "p1-counting-number-bonds",
    "p2-money-time",
    "p4-large-numbers",
    "p5-fractions-operations",
    "p5-volume"
  ]);

  for (const labId of HK_PRIMARY_DEDICATED_LAB_IDS) {
    const html = htmlByLab[labId];
    assert.ok(html, `Missing SSR markup for ${labId}.`);
    const expected = expectedDomains[labId as keyof typeof expectedDomains];
    const domainMatches = [...html.matchAll(/data-viz-range-domain-id="([^"]+)"/g)].map((match) => match[1]);

    if (expected) {
      assert.deepEqual(domainMatches, [expected.domainId], `${labId} must own exactly its audited semantic domain.`);
    } else {
      assert.deepEqual(domainMatches, [], `${labId} is independent and must not claim a dynamic-range domain.`);
      assert.doesNotMatch(html, /data-viz-range-(?:affects|projection|projection-reason)=/);
    }
  }
});

test("each dynamic-domain controller declares only its exact affected parameter and projection", () => {
  for (const [labId, expected] of Object.entries(expectedDomains)) {
    const html = htmlByLab[labId];
    const rangeInputs = [...html.matchAll(/<input\b[^>]*\btype="range"[^>]*>/g)].map((match) => match[0]);
    const declaredEdges = new Map<string, readonly [string, string, string]>();

    for (const input of rangeInputs) {
      const controlId = attribute(input, "data-viz-parameter");
      assert.ok(controlId, `${labId} range control is missing data-viz-parameter: ${input}`);
      const affects = attribute(input, "data-viz-range-affects");
      const projection = attribute(input, "data-viz-range-projection");
      const reason = attribute(input, "data-viz-range-projection-reason");
      const metadataCount = [affects, projection, reason].filter((value) => value !== null).length;

      assert.ok(metadataCount === 0 || metadataCount === 3, `${labId}/${controlId} has partial projection metadata.`);
      if (metadataCount === 0) continue;
      assert.ok(affects && !affects.includes(" "), `${labId}/${controlId} affected ids must be comma-separated without spaces.`);
      assert.ok(reason?.trim(), `${labId}/${controlId} projection reason must be nonempty.`);
      assert.equal(declaredEdges.has(controlId), false, `${labId}/${controlId} declares a duplicate edge.`);
      declaredEdges.set(controlId, [affects!, projection!, reason!]);
    }

    assert.deepEqual(Object.fromEntries(declaredEdges), expected.edges, `${labId} must expose only its audited controller edges.`);
    for (const [controllerId, [affectedIds]] of Object.entries(expected.edges)) {
      assert.notEqual(controllerId, affectedIds, `${labId} controller must not claim a blanket self-exemption.`);
      for (const affectedId of affectedIds.split(",")) {
        assert.match(
          html,
          new RegExp(`data-viz-parameter="${affectedId}"|data-viz-fixed-parameter="${affectedId}"`),
          `${labId}/${controllerId} names an absent affected parameter ${affectedId}.`
        );
      }
    }
  }
});

test("P4 divisor edge metadata unmounts with its factor-pairs-only dependent control", () => {
  assert.deepEqual(hkPrimaryFactorsDivisorRangeProjectionMetadata("factor-pairs"), {
    rangeAffects: "candidateDivisor",
    rangeProjection: "clamp-max",
    rangeProjectionReason: "test-divisor-must-not-exceed-tested-number"
  });
  assert.deepEqual(
    hkPrimaryFactorsDivisorRangeProjectionMetadata("common-hcf-lcm"),
    {},
    "A client transition to common-hcf-lcm must leave firstNumber independent while candidateDivisor is absent."
  );

  const defaultMarkup = htmlByLab["p4-large-numbers"];
  assert.match(defaultMarkup, /data-viz-range-affects="candidateDivisor"/);
  assert.match(defaultMarkup, /data-viz-range-projection="clamp-max"/);
  assert.match(defaultMarkup, /data-viz-range-projection-reason="test-divisor-must-not-exceed-tested-number"/);
});

test("only the two clamp-and-visibility zero states expose exact machine-readable fixed values", () => {
  const fixedNodes = [...primarySource.matchAll(
    /data-viz-fixed-parameter="([^"]+)"\s+data-viz-fixed-parameter-value="([^"]+)"/g
  )].map((match) => ({ controlId: match[1], value: match[2] }));
  assert.deepEqual(fixedNodes, [
    { controlId: "knownPart", value: "0" },
    { controlId: "step", value: "0" }
  ]);

  const numberBond = primaryFunctionBlock("CountingNumberBondsModel");
  const numberBondConditional = numberBond.slice(numberBond.indexOf("{total > 0 ? ("));
  assert.match(numberBondConditional, /\{total > 0 \? \([\s\S]*?controlId="knownPart"[\s\S]*?\) : \([\s\S]*?data-viz-fixed-parameter="knownPart"\s+data-viz-fixed-parameter-value="0"/);
  assert.equal((numberBond.match(/data-viz-fixed-parameter="knownPart"/g) ?? []).length, 1);

  const boundedStep = primaryFunctionBlock("AdditionSubtractionModel");
  const boundedStepConditional = boundedStep.slice(boundedStep.indexOf("{maximumStep > 0 ? ("));
  assert.match(boundedStepConditional, /\{maximumStep > 0 \? \([\s\S]*?controlId="step"[\s\S]*?\) : \([\s\S]*?data-viz-fixed-parameter="step"\s+data-viz-fixed-parameter-value="0"/);
  assert.equal((boundedStep.match(/data-viz-fixed-parameter="step"/g) ?? []).length, 1);
});
