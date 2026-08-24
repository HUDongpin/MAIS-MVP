import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

/**
 * Parent actions now distinguish successful state updates from failures. Success
 * is announced politely through `role="status"`; validation, authorization,
 * rate-limit, service and network failures use `role="alert"`. Source assertions
 * remain appropriate because this repository's component gate has no DOM harness.
 */

const parentViewsSource = readFileSync(
  join(process.cwd(), "components", "parent", "ParentViews.tsx"),
  "utf8"
);
const parentNoticesSource = readFileSync(
  join(process.cwd(), "components", "parent", "ParentNoticesView.tsx"),
  "utf8"
);
const parentRequestSource = readFileSync(
  join(process.cwd(), "components", "parent", "parentMessageUi.ts"),
  "utf8"
);
const appProvidersSource = readFileSync(
  join(process.cwd(), "components", "providers", "AppProviders.tsx"),
  "utf8"
);

const adaptiveAnnouncement = /role=\{feedback\.kind === "error" \? "alert" : "status"\}/g;

test("every parent action feedback surface distinguishes alerts from success status", () => {
  assert.equal((parentViewsSource.match(adaptiveAnnouncement) ?? []).length, 2, "messages and connect must expose adaptive announcements");
  assert.equal((parentNoticesSource.match(adaptiveAnnouncement) ?? []).length, 1, "notice receipts must expose adaptive announcements");
  assert.equal((`${parentViewsSource}\n${parentNoticesSource}`.match(/aria-live=\{feedback\.kind === "error" \? "assertive" : "polite"\}/g) ?? []).length, 3);
});

test("no legacy unannounced parent message channel remains", () => {
  assert.doesNotMatch(parentViewsSource, /setMessage\(|>\{message\}<\/p>/);
  assert.doesNotMatch(parentNoticesSource, /setMessage\(|>\{message\}<\/p>/);
});

test("parent write actions recover busy state and use a bounded request", () => {
  assert.equal((parentViewsSource.match(/finally \{/g) ?? []).length, 4, "thread selection, create, reply and child-link actions must recover busy state");
  assert.equal((parentNoticesSource.match(/finally \{/g) ?? []).length, 1, "notice acknowledgement must recover busy state");
  assert.equal((parentViewsSource.match(/parentFetchWithTimeout\(/g) ?? []).length, 4, "reload, create, reply and child-link must be bounded");
  assert.equal((parentNoticesSource.match(/parentFetchWithTimeout\(/g) ?? []).length, 1, "notice acknowledgement must be bounded");
  assert.match(parentRequestSource, /controller\.abort\(\)/, "the bounded request helper must abort timed-out fetches");
});

test("thread navigation isolates drafts and prevents stale selection commits", () => {
  assert.match(parentViewsSource, /data-parent-messages-layout="three-panel"/);
  assert.match(parentViewsSource, /replyThreadRef\.current = selectedThreadId;[\s\S]*?setReply\(""\);[\s\S]*?replyAttemptRef\.current = null;/);
  assert.match(parentViewsSource, /setReportId\(nextReport\?\.id \?\? ""\)/, "a removed report query must clear the report binding");
  assert.match(parentViewsSource, /setSubject\(\(nextSubject \?\? \(nextReport \? parentReportPrefillSubject/, "navigation must replace, rather than retain, another context's subject");
  assert.match(parentViewsSource, /setBody\(""\);[\s\S]*?setReply\(""\);[\s\S]*?createAttemptRef\.current = null;[\s\S]*?replyAttemptRef\.current = null;/);
  assert.match(parentViewsSource, /threadSelectionControllerRef\.current\?\.abort\(\)/);
  assert.match(parentViewsSource, /mayCommit: isCurrentSelection/);
  assert.match(parentViewsSource, /if \(!isCurrentSelection\(\)\) return;/, "stale failures must not replace the latest selection feedback");
});

test("a linked report locks the compose form to its exact safe author target", () => {
  assert.match(parentViewsSource, /id="parent-ask-teacher-heading"/);
  assert.match(parentViewsSource, /<form aria-labelledby="parent-ask-teacher-heading"/);
  for (const [fieldId, fieldName] of [
    ["parent-message-student", "studentId"],
    ["parent-message-class", "classId"],
    ["parent-message-category", "category"],
    ["parent-message-report", "reportId"],
    ["parent-message-subject", "subject"],
    ["parent-message-body", "body"]
  ] as const) {
    assert.match(parentViewsSource, new RegExp(`htmlFor="${fieldId}"`));
    assert.match(parentViewsSource, new RegExp(`id="${fieldId}"[\\s\\S]*?name="${fieldName}"`));
  }
  assert.match(parentViewsSource, /resolveParentComposeTarget\(/);
  assert.match(parentViewsSource, /selectedReportTarget\?\.teacherName/);
  assert.match(parentViewsSource, /selectedReport && !selectedReportTarget/);
  assert.match(parentViewsSource, /disabled=\{Boolean\(selectedReport\) \|\| !availableComposeTargets\.length\}/);
  assert.match(parentViewsSource, /classId: effectiveClassId,[\s\S]*?reportId: normalizedReportId \|\| null/);
});

test("external student navigation invalidates old reads and resolves from the matching server props", () => {
  assert.match(parentViewsSource, /renderedNavigationContextKeyRef\.current = navigationContextKey/);
  assert.match(parentViewsSource, /threadSelectionGenerationRef\.current \+= 1;[\s\S]*?threadSelectionControllerRef\.current\?\.abort\(\);[\s\S]*?setSelectingThreadId\(""\)/);
  assert.match(parentViewsSource, /const nextReport = nextReportId \? initialData\.reports\.find/);
  assert.match(parentViewsSource, /const availableTargets = initialData\.composeTargets/);
  assert.match(parentViewsSource, /expectedContextKey[\s\S]*?expectedDataGeneration[\s\S]*?return null;/);
});

test("thread reads use read-only feedback in all three languages", () => {
  assert.match(parentViewsSource, /function threadReadFailureFeedback/);
  assert.match(parentViewsSource, /No new message was sent/);
  assert.match(parentViewsSource, /沒有發送任何新訊息/);
  assert.match(parentViewsSource, /没有发送任何新消息/);
});

test("parent failures distinguish required HTTP and network outcomes", () => {
  for (const status of ["400", "404", "413", "429", "503"]) {
    assert.ok(parentViewsSource.includes(`status === ${status}`) || parentRequestSource.includes(`status === ${status}`), `missing parent outcome for HTTP ${status}`);
  }
  assert.match(parentViewsSource, /network-ambiguous/);
  assert.match(parentViewsSource, /sent-refresh-failed/);
  assert.match(parentNoticesSource, /response\.status === 429/);
  assert.match(parentNoticesSource, /response\.status === 503/);
});

test("parent pending totals use the full safe summary count instead of the six-row display list", () => {
  assert.match(parentViewsSource, /<h1 className="mt-2[^\"]*\[overflow-wrap:anywhere\][^\"]*">\{child\.student\.name\}<\/h1>/);
  assert.match(parentViewsSource, /function pendingAssignmentCount\(child: ParentChildSummarySafe\) \{\s*return child\.pendingAssignmentCount;\s*\}/);
  assert.doesNotMatch(parentViewsSource, /child\.assignments\.filter\(\(item\) => openAssignmentStatuses\.has/);
});

test("session revalidation never treats an admin account as a parent account", () => {
  assert.match(
    appProvidersSource,
    /const canUseTeacherArea = session\.user\.role === "teacher" \|\| session\.user\.role === "admin";/,
    "teacher session revalidation must retain explicit admin support"
  );
  assert.match(
    appProvidersSource,
    /const canUseParentArea = session\.user\.role === "parent";/,
    "parent session revalidation must be parent-only"
  );
});

test("the parent console matches the login form's error convention", () => {
  const loginSource = readFileSync(join(process.cwd(), "app", "login", "page.tsx"), "utf8");
  assert.match(
    loginSource,
    /<p role="alert"/,
    "login page is the convention this suite anchors to; if it changed, revisit the parent console too"
  );
});
