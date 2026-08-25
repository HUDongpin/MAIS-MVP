import assert from "node:assert/strict";
import test from "node:test";
import {
  createMathSceneVideoObjectUrlLeaseManager,
  type MathSceneVideoObjectUrlAdapter
} from "./mathSceneVideoObjectUrlLease";

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function fixture() {
  const created: string[] = [];
  const revoked: string[] = [];
  let nextId = 1;
  const adapter: MathSceneVideoObjectUrlAdapter = {
    createObjectURL: () => {
      const url = `blob:lease-${nextId}`;
      nextId += 1;
      created.push(url);
      return url;
    },
    revokeObjectURL: (url) => {
      revoked.push(url);
    }
  };
  return {
    adapter,
    created,
    manager: createMathSceneVideoObjectUrlLeaseManager(adapter),
    revoked
  };
}

function webm(bytes = "webm") {
  return new Blob([bytes], { type: "video/webm" });
}

test("stores a ready Blob without creating or exposing a persistent object URL", () => {
  const { created, manager } = fixture();
  const replaced = manager.replaceReadyBlob(webm());

  assert.equal(replaced.ok, true);
  assert.deepEqual(created, []);
  assert.deepEqual(manager.snapshot(), {
    activeLeaseCount: 0,
    disposed: false,
    generation: 1,
    hasReadyBlob: true,
    readyByteLength: 4,
    readyMimeType: "video/webm"
  });
  assert.doesNotMatch(JSON.stringify(manager.snapshot()), /blob:|objectUrl|\"url\"/i);
});

test("creates an object URL only for a download lease and revokes it in finally", async () => {
  const { created, manager, revoked } = fixture();
  manager.replaceReadyBlob(webm());

  const result = await manager.withDownloadLease(async (lease) => {
    assert.equal(lease.generation, 1);
    assert.equal(lease.isCurrent(), true);
    assert.equal(lease.blob.size, 4);
    assert.deepEqual(manager.snapshot().activeLeaseCount, 1);
    return lease.url;
  });

  assert.equal(result.ok, true);
  assert.ok(result.ok);
  assert.equal(result.value, "blob:lease-1");
  assert.deepEqual(created, ["blob:lease-1"]);
  assert.deepEqual(revoked, ["blob:lease-1"]);
  assert.equal(manager.snapshot().activeLeaseCount, 0);
});

test("revokes stale download leases exactly once when a ready Blob is replaced", async () => {
  const { manager, revoked } = fixture();
  manager.replaceReadyBlob(webm("old"));
  const gate = deferred();
  let currentDuringLease = true;
  const pending = manager.withDownloadLease(async (lease) => {
    await gate.promise;
    currentDuringLease = lease.isCurrent();
    return lease.generation;
  });
  await Promise.resolve();

  manager.replaceReadyBlob(webm("new"));
  manager.replaceReadyBlob(webm("newer"));
  assert.deepEqual(revoked, ["blob:lease-1"]);
  gate.resolve();
  const result = await pending;

  assert.equal(result.ok, true);
  assert.equal(currentDuringLease, false);
  assert.deepEqual(revoked, ["blob:lease-1"]);
  assert.equal(manager.snapshot().generation, 3);
});

test("retry and scene switch clear ready data and revoke active leases idempotently", async () => {
  const { manager, revoked } = fixture();
  const firstGate = deferred();
  manager.replaceReadyBlob(webm("retry"));
  const retryDownload = manager.withDownloadLease(async () => {
    await firstGate.promise;
    return "retry-finished";
  });
  await Promise.resolve();
  manager.handleRetry();
  manager.handleRetry();
  firstGate.resolve();
  await retryDownload;

  assert.deepEqual(revoked, ["blob:lease-1"]);
  assert.equal(manager.snapshot().hasReadyBlob, false);

  const secondGate = deferred();
  manager.replaceReadyBlob(webm("switch"));
  const switchDownload = manager.withDownloadLease(async () => {
    await secondGate.promise;
    return "switch-finished";
  });
  await Promise.resolve();
  manager.handleSceneSwitch();
  manager.handleSceneSwitch();
  secondGate.resolve();
  await switchDownload;

  assert.deepEqual(revoked, ["blob:lease-1", "blob:lease-2"]);
  assert.equal(manager.snapshot().hasReadyBlob, false);
});

test("unmount revokes once, becomes terminal, and rejects future leases or replacement", async () => {
  const { manager, revoked } = fixture();
  const gate = deferred();
  manager.replaceReadyBlob(webm());
  const pending = manager.withDownloadLease(async () => {
    await gate.promise;
    return "finished";
  });
  await Promise.resolve();

  manager.handleUnmount();
  manager.handleUnmount();
  manager.handleRetry();
  gate.resolve();
  await pending;

  assert.deepEqual(revoked, ["blob:lease-1"]);
  assert.equal(manager.snapshot().disposed, true);
  assert.equal(manager.snapshot().hasReadyBlob, false);

  const replaced = manager.replaceReadyBlob(webm("later"));
  assert.equal(replaced.ok, false);
  assert.ok(!replaced.ok);
  assert.equal(replaced.error.code, "OBJECT_URL_LEASE_DISPOSED");
  const download = await manager.withDownloadLease(async () => "never");
  assert.equal(download.ok, false);
  assert.ok(!download.ok);
  assert.equal(download.error.code, "OBJECT_URL_LEASE_DISPOSED");
});

test("revokes a temporary URL even when the download action fails", async () => {
  const { manager, revoked } = fixture();
  manager.replaceReadyBlob(webm());

  const result = await manager.withDownloadLease(async () => {
    throw new Error("download rejected");
  });

  assert.equal(result.ok, false);
  assert.ok(!result.ok);
  assert.equal(result.error.code, "OBJECT_URL_LEASE_UNAVAILABLE");
  assert.deepEqual(revoked, ["blob:lease-1"]);
  assert.doesNotMatch(result.error.message, /download rejected/);
});
