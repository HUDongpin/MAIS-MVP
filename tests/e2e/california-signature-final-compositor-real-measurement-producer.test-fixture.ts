import assert from "node:assert/strict";
import path from "node:path";
import type {
  CaliforniaSignatureFinalCompositorEnvironmentDiscoveryPublication,
  CaliforniaSignatureFinalCompositorEnvironmentDiscoveryReceipt
} from "./california-signature-final-compositor-real-measurement-producer";

const TEST_HOOK_KEY = Symbol.for(
  "mais.california.final-compositor.real-measurement-producer.test-fixture.v1"
);

type TestHook = {
  dispose(publication: CaliforniaSignatureFinalCompositorEnvironmentDiscoveryPublication): void;
  runWithProbe<T>(probe: unknown, callback: () => T): T;
  validate(value: unknown): CaliforniaSignatureFinalCompositorEnvironmentDiscoveryReceipt;
};

const expectedEntrypoint = path.join(
  "/Volumes/Starship/MAIS-ca-viz-labs-wt",
  "tests/e2e/california-signature-final-compositor-real-measurement-producer.test.ts"
);
assert.equal(process.env.NODE_TEST_CONTEXT, "child-v8",
  "California real measurement producer fixture is test-runner only");
assert.equal(process.argv.length, 2,
  "California real measurement producer fixture rejects extra process entrypoints");
assert.equal(path.resolve(process.argv[1]!), expectedEntrypoint,
  "California real measurement producer fixture rejects another test entrypoint");

const hook = (globalThis as Record<PropertyKey, unknown>)[TEST_HOOK_KEY] as TestHook | undefined;
assert.ok(hook,
  "California real measurement producer did not install its exact-process test hook");

export const californiaSignatureFinalCompositorRealMeasurementProducerTestFixture =
  Object.freeze(hook);
