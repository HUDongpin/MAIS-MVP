import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync
} from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  assertCaliforniaSignatureProductSourcesUninstrumented,
  CALIFORNIA_SIGNATURE_QA_DO_NOT_DEPLOY_MARKER,
  CALIFORNIA_SIGNATURE_QA_ENDPOINT_INSTANCE_ATTRIBUTE,
  CALIFORNIA_SIGNATURE_QA_ENDPOINT_KEY_ATTRIBUTE,
  CALIFORNIA_SIGNATURE_QA_INSTANCE_ATTRIBUTE,
  CALIFORNIA_SIGNATURE_QA_SITE_ATTRIBUTE,
  instrumentCaliforniaSignatureBenchSource,
  instrumentCaliforniaSignatureQaStagingCopy,
  validateInstrumentedCaliforniaSignatureBenchSource
} from "./california-signature-qa-instrumentation";

test("QA instrumentation maps every runtime control to an exact AST site without touching product bytes", (t) => {
  const projectRoot = process.cwd();
  const manifest = assertCaliforniaSignatureProductSourcesUninstrumented(projectRoot);
  const before = new Map(manifest.benches.map((bench) => [
    bench.sourcePath,
    readFileSync(path.join(projectRoot, bench.sourcePath), "utf8")
  ]));
  const stagingRoot = mkdtempSync(path.join(os.tmpdir(), "ca-signature-qa-"));
  t.after(() => rmSync(stagingRoot, { force: true, recursive: true }));

  for (const bench of manifest.benches) {
    const destination = path.join(stagingRoot, bench.sourcePath);
    mkdirSync(path.dirname(destination), { recursive: true });
    copyFileSync(path.join(projectRoot, bench.sourcePath), destination);
  }

  const provenance = instrumentCaliforniaSignatureQaStagingCopy({
    productProjectRoot: projectRoot,
    stagingProjectRoot: stagingRoot
  });
  assert.deepEqual(
    {
      components: provenance.componentCount,
      controls: provenance.controlsInstrumented,
      productBytesUnchanged: provenance.productBytesUnchanged
    },
    { components: 186, controls: 1_854, productBytesUnchanged: true }
  );
  assert.notEqual(provenance.stagingSourceSha256, provenance.productSourceSha256);
  assert.ok(existsSync(path.join(stagingRoot, CALIFORNIA_SIGNATURE_QA_DO_NOT_DEPLOY_MARKER)));
  const marker = JSON.parse(readFileSync(
    path.join(stagingRoot, CALIFORNIA_SIGNATURE_QA_DO_NOT_DEPLOY_MARKER),
    "utf8"
  ));
  assert.equal(marker.releaseEligible, false);
  assert.equal(marker.productBytesUnchanged, true);

  for (const bench of manifest.benches) {
    assert.equal(
      readFileSync(path.join(projectRoot, bench.sourcePath), "utf8"),
      before.get(bench.sourcePath),
      `${bench.sourcePath}: product bytes changed`
    );
    const instrumented = readFileSync(path.join(stagingRoot, bench.sourcePath), "utf8");
    assert.equal(
      validateInstrumentedCaliforniaSignatureBenchSource(bench, instrumented),
      bench.controlSites.length
    );
  }
});

test("instrumentation canaries reject a missing or mis-attributed AST site", () => {
  const manifest = assertCaliforniaSignatureProductSourcesUninstrumented();
  const bench = manifest.benches.find((candidate) =>
    candidate.controlSites.length >= 2 && candidate.controlSites.some((site) => site.renderCollection !== null)
  );
  assert.ok(bench, "expected a mapped-control bench");
  const productSource = readFileSync(path.join(process.cwd(), bench.sourcePath), "utf8");
  const instrumented = instrumentCaliforniaSignatureBenchSource(bench, productSource);
  const firstSite = bench.controlSites[0]!;
  const secondSite = bench.controlSites[1]!;

  const missing = instrumented.replace(
    ` ${CALIFORNIA_SIGNATURE_QA_SITE_ATTRIBUTE}=${JSON.stringify(firstSite.siteKey)}`,
    ""
  );
  assert.throws(
    () => validateInstrumentedCaliforniaSignatureBenchSource(bench, missing),
    /missing or mis-attributed QA site/
  );

  const misattributed = instrumented.replace(
    `${CALIFORNIA_SIGNATURE_QA_SITE_ATTRIBUTE}=${JSON.stringify(firstSite.siteKey)}`,
    `${CALIFORNIA_SIGNATURE_QA_SITE_ATTRIBUTE}=${JSON.stringify(secondSite.siteKey)}`
  );
  assert.throws(
    () => validateInstrumentedCaliforniaSignatureBenchSource(bench, misattributed),
    /missing or mis-attributed QA site/
  );

  const missingInstance = instrumented.replace(
    new RegExp(`\\s${CALIFORNIA_SIGNATURE_QA_INSTANCE_ATTRIBUTE}=(?:"direct"|\\{JSON\\.stringify\\([^>]+?\\)\\})`),
    ""
  );
  assert.throws(
    () => validateInstrumentedCaliforniaSignatureBenchSource(bench, missingInstance),
    /missing QA instance identity/
  );
});

test("custom component namespaces and select option source identities survive staging instrumentation", () => {
  const manifest = assertCaliforniaSignatureProductSourcesUninstrumented();
  const instrument = (benchId: string) => {
    const bench = manifest.benches.find((candidate) => candidate.benchId === benchId)!;
    return instrumentCaliforniaSignatureBenchSource(
      bench,
      readFileSync(path.join(process.cwd(), bench.sourcePath), "utf8")
    );
  };
  assert.match(instrument("ComparingLab"), /data-ca-source-instance-key=\{JSON\.stringify\(\[which, p\.name\]\)\}/);
  assert.match(instrument("TranslateLab"), /data-ca-source-instance-key=\{JSON\.stringify\(\[label, o\.v\]\)\}/);
  const boxPlot = instrument("BoxPlotLab");
  assert.match(boxPlot, new RegExp(`${CALIFORNIA_SIGNATURE_QA_ENDPOINT_KEY_ATTRIBUTE}="option:0:`));
  assert.match(boxPlot, new RegExp(`${CALIFORNIA_SIGNATURE_QA_ENDPOINT_INSTANCE_ATTRIBUTE}=\\{JSON\\.stringify`));
});

test("imperative receiver instrumentation is exact and rejects wrong, missing, duplicate refs or event targets", () => {
  const manifest = assertCaliforniaSignatureProductSourcesUninstrumented();
  const cylinder = manifest.benches.find((candidate) => candidate.benchId === "CylinderLab")!;
  const imperative = cylinder.controlSites.find((site) => site.imperativeBinding !== null)!;
  const productSource = readFileSync(path.join(process.cwd(), cylinder.sourcePath), "utf8");
  const instrumented = instrumentCaliforniaSignatureBenchSource(cylinder, productSource);
  assert.match(
    instrumented,
    new RegExp(
      `${CALIFORNIA_SIGNATURE_QA_SITE_ATTRIBUTE}=${JSON.stringify(imperative.siteKey)}[^>]+` +
      `data-ca-source-endpoints=\\{${JSON.stringify("drag")}\\}[^>]+` +
      `ref=\\{stageRef\\}`
    )
  );

  const wrongRef = instrumented.replace("ref={stageRef}", "ref={wrongStageRef}");
  assert.throws(() => validateInstrumentedCaliforniaSignatureBenchSource(cylinder, wrongRef),
    /missing imperative JSX ref|control count mismatch/);

  const duplicateRef = instrumented.replace("ref={canvasRef}", "ref={stageRef}");
  assert.throws(() => validateInstrumentedCaliforniaSignatureBenchSource(cylinder, duplicateRef),
    /duplicated|more controls|out of source order/);

  const missingTarget = instrumented.replace(
    'data-ca-source-endpoints={"drag"}',
    'data-ca-source-endpoints={""}'
  );
  assert.throws(() => validateInstrumentedCaliforniaSignatureBenchSource(cylinder, missingTarget),
    /missing source endpoint target names/);

  const misattributedTarget = instrumented.replace(
    'data-ca-source-endpoints={"drag"}',
    'data-ca-source-endpoints={"pointer-pick"}'
  );
  assert.throws(() => validateInstrumentedCaliforniaSignatureBenchSource(cylinder, misattributedTarget),
    /missing source endpoint target names/);

  const missingMiddleMoveSource = productSource.replace(
    /\n\s*stage\.addEventListener\(['"]pointermove['"],\s*move\);/,
    ""
  );
  assert.notEqual(missingMiddleMoveSource, productSource, "pointermove hard-negative fixture did not mutate source");
  const downgradedExpression = "pointerdown=down;pointerup=up";
  const downgradedKey = `drag:${createHash("sha256").update(downgradedExpression).digest("hex").slice(0, 16)}`;
  const clonedCylinder = {
    ...cylinder,
    controlSites: cylinder.controlSites.map((site) => site.siteKey === imperative.siteKey
      ? {
          ...site,
          endpointExpressions: [`drag:${downgradedExpression}`],
          endpointTargets: site.endpointTargets.map((target) => ({
            ...target,
            key: downgradedKey,
            sourceExpression: downgradedExpression
          })),
          imperativeBinding: {
            ...site.imperativeBinding!,
            eventTargets: site.imperativeBinding!.eventTargets.filter((target) =>
              target.eventName !== "pointermove"
            )
          },
          interactionSourceHandlers: site.interactionSourceHandlers!.filter((handler) =>
            handler.eventName !== "pointermove"
          )
        }
      : site),
    sourceSha256: createHash("sha256").update(missingMiddleMoveSource).digest("hex")
  };
  assert.throws(
    () => instrumentCaliforniaSignatureBenchSource(clonedCylinder, missingMiddleMoveSource),
    /imperative drag requires ordered pointerdown\/pointermove\/pointerup/,
    "a cloned source hash and cloned manifest must not hide a missing middle pointermove"
  );
});

test("staging preflight is all-or-nothing before the first product-copy write", (t) => {
  const projectRoot = process.cwd();
  const manifest = assertCaliforniaSignatureProductSourcesUninstrumented(projectRoot);
  const stagingRoot = mkdtempSync(path.join(os.tmpdir(), "ca-signature-preflight-"));
  t.after(() => rmSync(stagingRoot, { force: true, recursive: true }));
  for (const bench of manifest.benches) {
    const destination = path.join(stagingRoot, bench.sourcePath);
    mkdirSync(path.dirname(destination), { recursive: true });
    copyFileSync(path.join(projectRoot, bench.sourcePath), destination);
  }
  const last = manifest.benches.at(-1)!;
  writeFileSync(path.join(stagingRoot, last.sourcePath), "late mismatch", "utf8");
  assert.throws(
    () => instrumentCaliforniaSignatureQaStagingCopy({ productProjectRoot: projectRoot, stagingProjectRoot: stagingRoot }),
    /staging copy differs before QA instrumentation/
  );
  assert.equal(existsSync(path.join(stagingRoot, CALIFORNIA_SIGNATURE_QA_DO_NOT_DEPLOY_MARKER)), false);
  assert.equal(
    manifest.benches.filter((bench) =>
      readFileSync(path.join(stagingRoot, bench.sourcePath), "utf8").includes(CALIFORNIA_SIGNATURE_QA_SITE_ATTRIBUTE)
    ).length,
    0
  );
});

test("the exclusive DO-NOT-DEPLOY marker refuses symlink overwrite", (t) => {
  const projectRoot = process.cwd();
  const manifest = assertCaliforniaSignatureProductSourcesUninstrumented(projectRoot);
  const stagingRoot = mkdtempSync(path.join(os.tmpdir(), "ca-signature-marker-"));
  t.after(() => rmSync(stagingRoot, { force: true, recursive: true }));
  for (const bench of manifest.benches) {
    const destination = path.join(stagingRoot, bench.sourcePath);
    mkdirSync(path.dirname(destination), { recursive: true });
    copyFileSync(path.join(projectRoot, bench.sourcePath), destination);
  }
  const outside = path.join(stagingRoot, "outside-sentinel.json");
  writeFileSync(outside, "sentinel", "utf8");
  symlinkSync(outside, path.join(stagingRoot, CALIFORNIA_SIGNATURE_QA_DO_NOT_DEPLOY_MARKER));
  assert.throws(
    () => instrumentCaliforniaSignatureQaStagingCopy({ productProjectRoot: projectRoot, stagingProjectRoot: stagingRoot }),
    /EEXIST/
  );
  assert.equal(readFileSync(outside, "utf8"), "sentinel");
});

test("Next SWC parses every instrumented source without syntax rewriting", async () => {
  const moduleName = "next/dist/build/swc";
  const nextSwc = await import(moduleName) as { parse(source: string, options: { filename: string }): Promise<unknown> };
  const manifest = assertCaliforniaSignatureProductSourcesUninstrumented();
  for (const bench of manifest.benches) {
    const productSource = readFileSync(path.join(process.cwd(), bench.sourcePath), "utf8");
    const instrumented = instrumentCaliforniaSignatureBenchSource(bench, productSource);
    await nextSwc.parse(instrumented, { filename: bench.sourcePath });
  }
});

test("the fixed opaque light-paper adapter keeps endpoint geometry theme-independent", () => {
  const adapter = readFileSync(
    path.join(process.cwd(), "components/visualizations/SignatureLabAdapter.tsx"),
    "utf8"
  );
  assert.match(adapter, /data-viz-surface-kind="signature-canvas"/);
  assert.match(adapter, /data-viz-color-scheme="light"/);
  assert.match(adapter, /style=\{\{ colorScheme: "light" \}\}/);
  assert.match(
    adapter,
    /className="overflow-hidden rounded-2xl border border-slate-200 bg-\[#fbfbf8\] shadow-sm dark:border-slate-100\/15"/
  );
  assert.doesNotMatch(adapter, /className="[^"]*shadow-inner/);
  assert.doesNotMatch(adapter, /dark:(?:bg|p-|m-|gap-|grid-|flex-|w-|h-|min-|max-|text-(?:xs|sm|base|lg|xl|2xl))/);
});

test("native endpoint controls compute as light with equal geometry under light and dark hosts", async (t) => {
  const moduleName = "playwright";
  const { chromium } = await import(moduleName) as typeof import("playwright");
  const browser = await chromium.launch({ headless: true });
  t.after(() => browser.close());
  const page = await browser.newPage();
  await page.setContent(`
    <style>
      .host { display:inline-block; padding:8px }
      .dark { color-scheme:dark; background:#020617 }
      .light { color-scheme:light; background:#f8fafc }
      .paper { color-scheme:light; background:#fbfbf8; padding:8px }
      input,select { box-sizing:border-box; width:180px; margin:2px }
    </style>
    <div class="host light"><div class="paper" data-host="light"><input type="range"><input type="number"><select><option>A</option><option>B</option></select></div></div>
    <div class="host dark"><div class="paper" data-host="dark"><input type="range"><input type="number"><select><option>A</option><option>B</option></select></div></div>
  `);
  const evidence = await page.locator(".paper").evaluateAll((papers) => papers.map((paper) => ({
    controls: Array.from(paper.querySelectorAll("input,select")).map((control) => {
      const rect = control.getBoundingClientRect();
      const style = getComputedStyle(control);
      return { colorScheme: style.colorScheme, height: rect.height, width: rect.width };
    }),
    host: paper.getAttribute("data-host")
  })));
  assert.equal(evidence.length, 2);
  assert.ok(evidence.every((entry) => entry.controls.every((control) => control.colorScheme === "light")));
  assert.deepEqual(evidence[0]!.controls, evidence[1]!.controls);
});
