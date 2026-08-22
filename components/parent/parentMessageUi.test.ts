import assert from "node:assert/strict";
import test from "node:test";

import {
  parentFetchWithTimeout,
  parentIdempotencyAttempt,
  parentLatestRequestIsCurrent,
  parentMessageContextKey,
  parentMessageHref,
  parentMessageOutcome,
  parentReportPrefillSubject,
  parentWeekdayLabel,
  resolveComposeClassId
} from "@/components/parent/parentMessageUi";

test("bounded parent requests abort a hung fetch", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = ((_input: RequestInfo | URL, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
    init?.signal?.addEventListener("abort", () => {
      reject(Object.assign(new Error("aborted"), { name: "AbortError" }));
    }, { once: true });
  })) as typeof fetch;

  try {
    await assert.rejects(parentFetchWithTimeout("https://example.invalid", {}, 1), { name: "AbortError" });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("bounded parent requests also relay a caller cancellation", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = ((_input: RequestInfo | URL, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
    init?.signal?.addEventListener("abort", () => {
      reject(Object.assign(new Error("aborted"), { name: "AbortError" }));
    }, { once: true });
  })) as typeof fetch;

  const caller = new AbortController();
  try {
    const request = parentFetchWithTimeout("https://example.invalid", { signal: caller.signal }, 1_000);
    caller.abort();
    await assert.rejects(
      Promise.race([
        request,
        new Promise<Response>((_resolve, reject) => setTimeout(() => reject(new Error("caller cancellation was not relayed")), 50))
      ]),
      { name: "AbortError" }
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("only the latest non-aborted thread selection may commit", () => {
  assert.equal(parentLatestRequestIsCurrent({ latestGeneration: 2, requestGeneration: 1, aborted: false }), false);
  assert.equal(parentLatestRequestIsCurrent({ latestGeneration: 2, requestGeneration: 2, aborted: true }), false);
  assert.equal(parentLatestRequestIsCurrent({ latestGeneration: 2, requestGeneration: 2, aborted: false }), true);
});

test("draft ownership changes with student, thread and report navigation context", () => {
  const reportA = parentMessageContextKey({ studentId: "student-a", threadId: null, reportId: "report-a", category: "report-question", subject: "Report A" });
  const childB = parentMessageContextKey({ studentId: "student-b", threadId: null, reportId: null, category: null, subject: null });
  const childAWithoutReport = parentMessageContextKey({ studentId: "student-a", threadId: null, reportId: null, category: null, subject: null });
  const threadA = parentMessageContextKey({ studentId: null, threadId: "thread-a", reportId: null, category: null, subject: null });
  const threadB = parentMessageContextKey({ studentId: null, threadId: "thread-b", reportId: null, category: null, subject: null });

  assert.notEqual(reportA, childB);
  assert.notEqual(reportA, childAWithoutReport, "a removed reportId must not revive when returning to the child");
  assert.notEqual(threadA, threadB);
  assert.equal(threadA, parentMessageContextKey({ studentId: null, threadId: "thread-a", reportId: null, category: null, subject: null }));
});

test("ambiguous retries reuse one idempotency key while changed payloads get a new key", () => {
  let nextKey = 0;
  const makeKey = () => `parent-test-key-${++nextKey}`;
  const first = parentIdempotencyAttempt(null, "same-payload", makeKey);
  const retry = parentIdempotencyAttempt(first, "same-payload", makeKey);
  const changed = parentIdempotencyAttempt(retry, "changed-payload", makeKey);

  assert.equal(first.key, "parent-test-key-1");
  assert.equal(retry, first);
  assert.equal(changed.key, "parent-test-key-2");
  assert.notEqual(changed.key, first.key);
});

test("Messages All keeps the cross-child list while a thread is selected", () => {
  assert.equal(parentMessageHref({ threadId: "thread-a" }), "/parent/messages?thread=thread-a");
  assert.equal(
    parentMessageHref({ studentId: "student-a", threadId: "thread-a" }),
    "/parent/messages?studentId=student-a&thread=thread-a"
  );
  assert.equal(parentMessageHref({}), "/parent/messages");
});

test("switching child deliberately drops a stale thread and report context", () => {
  assert.equal(
    parentMessageHref({ studentId: "student-b", category: "homework" }),
    "/parent/messages?studentId=student-b&category=homework"
  );
  assert.doesNotMatch(parentMessageHref({ studentId: "student-b" }), /thread|reportId|subject/);
});

test("report class is authoritative and multi-class compose requires an explicit target", () => {
  assert.equal(resolveComposeClassId({ reportClassId: "class-report", selectedClassId: "class-other", availableClassIds: ["class-report", "class-other"] }), "class-report");
  assert.equal(resolveComposeClassId({ reportClassId: null, selectedClassId: "", availableClassIds: ["class-a"] }), "class-a");
  assert.equal(resolveComposeClassId({ reportClassId: null, selectedClassId: "", availableClassIds: ["class-a", "class-b"] }), "");
  assert.equal(resolveComposeClassId({ reportClassId: null, selectedClassId: "class-b", availableClassIds: ["class-a", "class-b"] }), "class-b");
});

test("request outcomes distinguish validation, rate limits, unavailability and ambiguous network loss", () => {
  assert.deepEqual(parentMessageOutcome({ status: 400 }), { code: "invalid" });
  assert.deepEqual(parentMessageOutcome({ status: 404 }), { code: "not-found" });
  assert.deepEqual(parentMessageOutcome({ status: 413 }), { code: "too-long" });
  assert.deepEqual(parentMessageOutcome({ status: 429, retryAfter: "37" }), { code: "rate-limited", retryAfterSeconds: 37 });
  assert.deepEqual(parentMessageOutcome({ status: 503 }), { code: "unavailable" });
  assert.deepEqual(parentMessageOutcome({ networkError: true }), { code: "network-ambiguous" });
  assert.deepEqual(parentMessageOutcome({ committed: true, refreshFailed: true }), { code: "sent-refresh-failed" });
  assert.deepEqual(parentMessageOutcome({ committed: true }), { code: "sent" });
});

test("weekday and report prefill copy covers English, Traditional Chinese and Simplified Chinese", () => {
  assert.deepEqual(parentWeekdayLabel("Mon", "en"), { short: "Mon", long: "Monday" });
  assert.deepEqual(parentWeekdayLabel("Mon", "zh"), { short: "一", long: "星期一" });
  assert.deepEqual(parentWeekdayLabel("Mon", "zh-Hans"), { short: "一", long: "星期一" });
  assert.equal(parentReportPrefillSubject({ en: "Weekly report", zh: "每週報告", zhHans: "每周报告" }, "en"), "Question about Weekly report");
  assert.equal(parentReportPrefillSubject({ en: "Weekly report", zh: "每週報告", zhHans: "每周报告" }, "zh"), "關於每週報告的問題");
  assert.equal(parentReportPrefillSubject({ en: "Weekly report", zh: "每週報告", zhHans: "每周报告" }, "zh-Hans"), "关于每周报告的问题");
});
