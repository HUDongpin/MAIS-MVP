import assert from "node:assert/strict";
import "./california-signature-final-compositor-measurement-lifecycle";
import type {
  CaliforniaSignatureFinalCompositorMeasurementEnvironmentInput,
  CaliforniaSignatureFinalCompositorMeasurementLifecycle,
  CaliforniaSignatureFinalCompositorMeasurementPublication,
  CaliforniaSignatureFinalCompositorMeasurementSubject,
  CaliforniaSignatureFinalCompositorRawTimingSample
} from "./california-signature-final-compositor-measurement-lifecycle";

const TEST_FIXTURE_HOOK_KEY =
  Symbol.for("mais.california.final-compositor.measurement-lifecycle.test-fixture.v1");

type TestFixtureHook = {
  beforeNextIo(
    lifecycle: CaliforniaSignatureFinalCompositorMeasurementLifecycle,
    hook: (directoryPath: string) => void
  ): void;
  directoryPath(lifecycle: CaliforniaSignatureFinalCompositorMeasurementLifecycle): string;
  dispose(lifecycle: CaliforniaSignatureFinalCompositorMeasurementLifecycle): void;
  publish(options: {
    compositorImplementationSha256: string;
    environment: CaliforniaSignatureFinalCompositorMeasurementEnvironmentInput;
    fileName: string;
    lifecycle: CaliforniaSignatureFinalCompositorMeasurementLifecycle;
    samples: readonly CaliforniaSignatureFinalCompositorRawTimingSample[];
    subject: CaliforniaSignatureFinalCompositorMeasurementSubject;
  }): CaliforniaSignatureFinalCompositorMeasurementPublication;
  publishRaw(options: {
    bytes: Buffer;
    fileName: string;
    lifecycle: CaliforniaSignatureFinalCompositorMeasurementLifecycle;
  }): CaliforniaSignatureFinalCompositorMeasurementPublication;
};

function testFixtureHook(): TestFixtureHook {
  const hook = (globalThis as Record<PropertyKey, unknown>)[TEST_FIXTURE_HOOK_KEY] as
    TestFixtureHook | undefined;
  assert.ok(hook,
    "California final compositor measurement test fixture is unavailable outside exact Node tests");
  return hook;
}

export function publishCaliforniaSignatureFinalCompositorMeasurementTestFixture(
  options: Parameters<TestFixtureHook["publish"]>[0]
): CaliforniaSignatureFinalCompositorMeasurementPublication {
  return testFixtureHook().publish(options);
}

export function publishCaliforniaSignatureFinalCompositorRawMeasurementTestFixture(
  options: Parameters<TestFixtureHook["publishRaw"]>[0]
) {
  return testFixtureHook().publishRaw(options);
}

export function beforeNextCaliforniaSignatureFinalCompositorMeasurementTestIo(
  lifecycle: CaliforniaSignatureFinalCompositorMeasurementLifecycle,
  hook: (directoryPath: string) => void
) {
  testFixtureHook().beforeNextIo(lifecycle, hook);
}

export function californiaSignatureFinalCompositorMeasurementTestDirectoryPath(
  lifecycle: CaliforniaSignatureFinalCompositorMeasurementLifecycle
) {
  return testFixtureHook().directoryPath(lifecycle);
}

export function disposeCaliforniaSignatureFinalCompositorMeasurementTestLifecycle(
  lifecycle: CaliforniaSignatureFinalCompositorMeasurementLifecycle
) {
  testFixtureHook().dispose(lifecycle);
}
