import assert from "node:assert/strict";
import { createServer, type Socket } from "node:net";
import test from "node:test";
import postgres from "postgres";
import {
  createAiTutorAdmissionConnectionPrimer,
  runAbortBoundedAiTutorPostgresOperation
} from "@/lib/server/userStore/aiTutorAdmissionConnectionPrimer";
import { createAbortableAuthAdmissionSlot } from "@/lib/server/userStore/authAdmissionPersistence";

function deferred<Value = void>() {
  let resolve!: (value: Value) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<Value>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

function rejectAfter(milliseconds: number, message: string) {
  return new Promise<never>((_resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), milliseconds);
    timer.unref();
  });
}

test("connection primer coalesces only the active attempt and primes again after success", async () => {
  const attempts = [deferred(), deferred()];
  let starts = 0;
  const primer = createAiTutorAdmissionConnectionPrimer(() => attempts[starts++].promise);

  const first = primer.prime();
  const coalesced = primer.prime();
  assert.strictEqual(coalesced, first);
  assert.equal(starts, 1);

  attempts[0].resolve();
  await first;

  const afterIdle = primer.prime();
  assert.notStrictEqual(afterIdle, first);
  assert.equal(starts, 2);
  attempts[1].resolve();
  await afterIdle;
});

test("connection primer clears a failed attempt so the next request can retry", async () => {
  let starts = 0;
  const primer = createAiTutorAdmissionConnectionPrimer(async () => {
    starts += 1;
    if (starts === 1) throw new Error("handshake failed");
  });

  await assert.rejects(primer.prime(), /handshake failed/);
  await primer.prime();
  assert.equal(starts, 2);
});

test("an expired queued primer never destroys the active admission transaction", async () => {
  const slot = createAbortableAuthAdmissionSlot();
  const activeGate = deferred();
  const active = slot.run(new AbortController().signal, () => activeGate.promise);
  const primerController = new AbortController();
  let primerOperationCalls = 0;
  let destroyCalls = 0;
  const primer = createAiTutorAdmissionConnectionPrimer(() =>
    slot.run(primerController.signal, () => {
      primerOperationCalls += 1;
      return runAbortBoundedAiTutorPostgresOperation({
        abortOperation: () => {
          destroyCalls += 1;
        },
        operation: async () => undefined,
        signal: primerController.signal
      });
    })
  );
  const queuedPrimer = primer.prime();

  primerController.abort(new DOMException("deadline", "TimeoutError"));
  await assert.rejects(
    queuedPrimer,
    (error) => error instanceof DOMException && error.name === "AbortError"
  );
  assert.equal(primerOperationCalls, 0);
  assert.equal(destroyCalls, 0);

  activeGate.resolve(undefined);
  await active;
  assert.equal(
    await slot.run(new AbortController().signal, async () => "next-admission"),
    "next-admission"
  );
});

test("an admission operation destroys its dedicated client on abort before releasing", async () => {
  const operation = deferred<string>();
  const destruction = deferred();
  const controller = new AbortController();
  let destroyCalls = 0;
  const result = runAbortBoundedAiTutorPostgresOperation({
    abortOperation: () => {
      destroyCalls += 1;
      return destruction.promise;
    },
    operation: () => operation.promise,
    signal: controller.signal
  });
  const rejected = assert.rejects(
    result,
    (error) => error instanceof DOMException && error.name === "AbortError"
  );

  controller.abort(new DOMException("deadline", "TimeoutError"));
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.equal(destroyCalls, 1);

  let settled = false;
  void rejected.finally(() => {
    settled = true;
  });
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.equal(settled, false, "the wrapper must retain ownership until client destruction settles");

  destruction.resolve(undefined);
  await rejected;
  operation.reject(new Error("late connection failure"));
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.equal(destroyCalls, 1);
});

test("a completed admission operation removes its abort listener", async () => {
  const controller = new AbortController();
  let destroyCalls = 0;
  const result = await runAbortBoundedAiTutorPostgresOperation({
    abortOperation: () => {
      destroyCalls += 1;
    },
    operation: async () => "ready",
    signal: controller.signal
  });

  assert.equal(result, "ready");
  controller.abort();
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.equal(destroyCalls, 0);
});

test("a pre-aborted admission operation never starts or destroys a client", async () => {
  const controller = new AbortController();
  controller.abort(new DOMException("deadline", "TimeoutError"));
  let operationCalls = 0;
  let destroyCalls = 0;

  await assert.rejects(
    runAbortBoundedAiTutorPostgresOperation({
      abortOperation: () => {
        destroyCalls += 1;
      },
      operation: async () => {
        operationCalls += 1;
        return "unreachable";
      },
      signal: controller.signal
    }),
    (error) => error instanceof DOMException && error.name === "AbortError"
  );
  assert.equal(operationCalls, 0);
  assert.equal(destroyCalls, 0);
});

test("a failed client destruction still settles the aborted wrapper", async () => {
  const controller = new AbortController();
  const operation = deferred<string>();
  const result = runAbortBoundedAiTutorPostgresOperation({
    abortOperation: async () => {
      throw new Error("synthetic client shutdown failure");
    },
    operation: () => operation.promise,
    signal: controller.signal
  });

  controller.abort(new DOMException("deadline", "TimeoutError"));
  await assert.rejects(
    result,
    (error) => error instanceof DOMException && error.name === "AbortError"
  );
  operation.reject(new Error("late operation failure"));
});

test("a stalled postgres.js cold BEGIN is destroyed after startup completes", async () => {
  const queryObserved = deferred<string>();
  const socketClosed = deferred();
  const sockets = new Set<Socket>();
  const server = createServer((socket) => {
    sockets.add(socket);
    let startupComplete = false;
    let buffered = Buffer.alloc(0);
    socket.once("close", () => {
      sockets.delete(socket);
      socketClosed.resolve(undefined);
    });
    socket.on("data", (chunk) => {
      buffered = Buffer.concat([buffered, chunk]);
      if (!startupComplete) {
        if (buffered.length < 4) return;
        const startupLength = buffered.readInt32BE(0);
        if (buffered.length < startupLength) return;
        buffered = buffered.subarray(startupLength);
        startupComplete = true;
        socket.write(Buffer.from([
          0x52, 0x00, 0x00, 0x00, 0x08, 0x00, 0x00, 0x00, 0x00,
          0x5a, 0x00, 0x00, 0x00, 0x05, 0x49
        ]));
      }

      while (startupComplete && buffered.length >= 5) {
        const messageLength = buffered.readInt32BE(1);
        const totalLength = messageLength + 1;
        if (buffered.length < totalLength) return;
        const messageType = buffered[0];
        const payload = buffered.subarray(5, totalLength - 1).toString("utf8");
        buffered = buffered.subarray(totalLength);
        if (messageType === 0x51 && /^begin\b/i.test(payload)) {
          queryObserved.resolve(payload);
          // Deliberately leave BEGIN unanswered. The watchdog must terminate
          // this socket after postgres.js has already cancelled connect_timeout.
        }
      }
    });
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const address = server.address();
  assert.ok(address && typeof address === "object");
  const sql = postgres({
    connect_timeout: 1,
    database: "mais_nova_ci",
    fetch_types: false,
    host: "127.0.0.1",
    max: 1,
    password: "integration-only",
    port: address.port,
    prepare: false,
    username: "integration-only"
  });
  const controller = new AbortController();

  try {
    const result = runAbortBoundedAiTutorPostgresOperation({
      abortOperation: () => sql.end({ timeout: 0 }),
      operation: () => sql.begin(async () => "unreachable"),
      signal: controller.signal
    });
    const beginPayload = await Promise.race([
      queryObserved.promise,
      rejectAfter(1_000, "postgres.js never issued cold BEGIN")
    ]);
    assert.match(beginPayload, /^begin\b/i);

    controller.abort(new DOMException("deadline", "TimeoutError"));
    await Promise.race([
      assert.rejects(
        result,
        (error) => error instanceof DOMException && error.name === "AbortError"
      ),
      rejectAfter(1_000, "stalled cold BEGIN retained the admission lane")
    ]);
    await Promise.race([
      socketClosed.promise,
      rejectAfter(1_000, "destroyed admission client kept its socket open")
    ]);
  } finally {
    await sql.end({ timeout: 0 }).catch(() => undefined);
    for (const socket of sockets) socket.destroy();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
