import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

const viewPath = join(process.cwd(), "components/teacher/TeacherOperationsView.tsx");
const helperPath = join(process.cwd(), "components/teacher/teacherOperationsRequestState.ts");

function sourceSection(source: string, start: string, end: string) {
  const startAt = source.indexOf(start);
  const endAt = source.indexOf(end, startAt + start.length);
  assert.ok(startAt >= 0, `missing source section start: ${start}`);
  assert.ok(endAt > startAt, `missing source section end: ${end}`);
  return source.slice(startAt, endAt);
}

test("TeacherOperations delegates notice and paginated reminder requests to the idempotent client boundary", async () => {
  const source = await readFile(viewPath, "utf8");
  assert.match(source, /TeacherOperationIntentRegistry/);
  assert.match(source, /queueTeacherNoticeRequest/);
  assert.match(source, /createTeacherNoticeQueueIntent/);
  assert.match(source, /createTeacherReminderRequestState/);
  assert.match(source, /runTeacherReminderPages/);
  assert.doesNotMatch(source, /fetch\(`\/api\/teacher\/notices\/\$\{encodeURIComponent\(noticeId\)\}\/deliveries`/);
  assert.doesNotMatch(source, /fetch\("\/api\/teacher\/reminder-runs"/);
});

test("notice and reminder actions use synchronous busy guards plus try-catch-finally cleanup", async () => {
  const source = await readFile(viewPath, "utf8");
  const noticeAction = sourceSection(source, "async function sendNotice", "async function runReminders");
  const reminderAction = sourceSection(source, "async function runReminders", "async function validateRoster");

  for (const [name, section] of [["notice", noticeAction], ["reminder", reminderAction]] as const) {
    assert.match(section, /\.begin\(/, `${name} must synchronously claim its intent before awaiting`);
    assert.match(section, /try\s*\{/u, `${name} must enter a guarded request block`);
    assert.match(section, /catch\s*\{/u, `${name} must handle unexpected client failures`);
    assert.match(section, /finally\s*\{/u, `${name} must always restore its busy state`);
    assert.match(section, /\.finish\(/, `${name} must settle its intent key in finally`);
  }
});

test("component awaits hashed recovery while keeping reminder cursors out of session storage", async () => {
  const source = await readFile(viewPath, "utf8");
  const noticeAction = sourceSection(source, "async function sendNotice", "async function runReminders");
  const reminderAction = sourceSection(source, "async function runReminders", "async function validateRoster");
  assert.match(noticeAction, /const queueIntent = createTeacherNoticeQueueIntent\(notice\)/);
  assert.match(noticeAction, /queueTeacherNoticeRequest\(\{ intent: queueIntent, idempotencyKey \}\)/);
  assert.match(noticeAction, /await operationIntentRegistry\.begin\(intent\)/);
  assert.match(noticeAction, /await operationIntentRegistry\.finish\(intent, idempotencyKey, retainForRetry\)/);
  assert.match(reminderAction, /await operationIntentRegistry\.begin\(intent\)/);
  assert.match(reminderAction, /await operationIntentRegistry\.finish\(intent, idempotencyKey, retainForRetry\)/);
  assert.match(reminderAction, /teacherId:\s*data\.teacher\.id/);
  assert.doesNotMatch(reminderAction, /operationRecoveryStore\.(?:save|load)ReminderState/);
});

test("queued responses never claim delivery and partial pagination distinguishes accepted work from refresh failure", async () => {
  const source = await readFile(viewPath, "utf8");
  const helperSource = await readFile(helperPath, "utf8");
  assert.match(source, /Notice accepted and queued\. Delivery has not been confirmed yet\./);
  assert.match(source, /Reminder requests queued\. Delivery has not been confirmed yet\./);
  assert.match(helperSource, /Some reminder requests were queued, but the next page could not be loaded\./);
  assert.match(helperSource, /Notice was accepted, but updated details could not be read\./);
  assert.doesNotMatch(source, /Notice send attempt recorded\./);
  assert.doesNotMatch(source, /Reminder run completed\./);
});

test("partial terminal reminder failures require review and a new request instead of promising key reuse", async () => {
  const source = await readFile(viewPath, "utf8");
  const reminderAction = sourceSection(source, "async function runReminders", "async function validateRoster");
  assert.match(reminderAction, /teacherOperationFailureMessage\(result\.failure, "reminder", result\.state\.acceptedRunCount, t\)/);
  assert.match(reminderAction, /if \(retainForRetry\)[\s\S]*reminderRequestStates\.set\(intent, result\.state\)[\s\S]*else[\s\S]*reminderRequestStates\.delete\(intent\)/u);
});

test("a valid notice 202 immediately overrides any existing card without pretending router refresh is awaitable", async () => {
  const source = await readFile(viewPath, "utf8");
  const noticeAction = sourceSection(source, "async function sendNotice", "async function runReminders");
  const noticeProjection = sourceSection(source, "const createdNoticeOverride", "const visibleArchives");
  assert.match(source, /noticeOverrides/);
  assert.match(noticeProjection, /reconcileTeacherNoticeOverride/);
  assert.doesNotMatch(noticeProjection, /noticeOverrides\[notice\.id\]\s*\?\?\s*notice/);
  assert.match(noticeAction, /setNoticeOverrides/);
  assert.match(noticeAction, /router\.refresh\(\)/);
  assert.doesNotMatch(noticeAction, /try\s*\{\s*router\.refresh\(\)/u);
  assert.doesNotMatch(source, /updated details could not be read\. Refresh before retrying/u);
});

test("TeacherOperations maps actionable HTTP and network failures and respects Retry-After", async () => {
  const source = await readFile(viewPath, "utf8");
  const helperSource = await readFile(helperPath, "utf8");
  for (const failureKind of [
    "bad-request",
    "not-found",
    "too-large",
    "rate-limited",
    "service-unavailable",
    "network",
    "invalid-response",
    "idempotency-conflict",
    "no-eligible-recipients"
  ]) {
    assert.match(helperSource, new RegExp(`case \\"${failureKind}\\"`), `missing ${failureKind} feedback`);
  }
  assert.match(source, /scheduleRetryAfter\(result\.failure\.retryAfterMs\)/);
  assert.match(helperSource, /retrying will reuse the same request key/);
  assert.match(helperSource, /was not queued/);
  assert.match(helperSource, /no eligible family email recipients are available/);
});

test("notice and reminder controls expose disabled and aria-busy state while feedback uses status or alert", async () => {
  const source = await readFile(viewPath, "utf8");
  assert.match(source, /role=\{messageRole\}/);
  assert.match(source, /"status" \| "alert"/);
  assert.match(source, /aria-busy=\{busy\}/);
  assert.match(source, /disabled=\{busy \|\| retryBlocked\}/);
  assert.match(source, /Queueing…/);
  assert.match(source, /Running…/);
});

test("the request helper enforces a bounded AbortSignal timeout instead of leaving busy state hung", async () => {
  const helperSource = await readFile(join(process.cwd(), "components/teacher/teacherOperationsRequestState.ts"), "utf8");
  assert.match(helperSource, /AbortSignal\.timeout\(/);
  assert.match(helperSource, /signal:\s*timeoutSignal\(\)/);
});
