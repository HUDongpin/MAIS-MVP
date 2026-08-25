import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import {
  tutorSessionRequestMayContinue,
  type TutorSessionIdentity
} from "./AITutorProvider";

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((next) => {
    resolve = next;
  });
  return { promise, resolve };
}

test("a held classroom-policy continuation cannot submit an old prompt after identity replacement", async () => {
  const accountA: TutorSessionIdentity = { userId: "student-a", role: "student" };
  const accountB: TutorSessionIdentity = { userId: "student-b", role: "student" };
  const controller = new AbortController();
  const policy = deferred();
  let currentEpoch = 4;
  let currentIdentity = accountA;
  let submittedPrompts = 0;

  const continuation = (async () => {
    await policy.promise;
    if (tutorSessionRequestMayContinue({
      aborted: controller.signal.aborted,
      currentEpoch,
      currentIdentity,
      mounted: true,
      snapshotEpoch: 4,
      snapshotIdentity: accountA
    })) {
      submittedPrompts += 1;
    }
  })();

  currentEpoch += 1;
  currentIdentity = accountB;
  controller.abort();
  policy.resolve();
  await continuation;

  assert.equal(submittedPrompts, 0);
});

test("the session fence also rejects quarantine, unmount, and aborted transport", () => {
  const account: TutorSessionIdentity = { userId: "student-a", role: "student" };
  const base = {
    currentEpoch: 8,
    currentIdentity: account,
    mounted: true,
    snapshotEpoch: 8,
    snapshotIdentity: account
  };

  assert.equal(tutorSessionRequestMayContinue({ ...base, aborted: false }), true);
  assert.equal(tutorSessionRequestMayContinue({ ...base, aborted: true }), false);
  assert.equal(tutorSessionRequestMayContinue({ ...base, aborted: false, mounted: false }), false);
  assert.equal(tutorSessionRequestMayContinue({ ...base, aborted: false, currentEpoch: 9 }), false);
});

test("AI Tutor client binds chat, classroom policy, speech, and voice requests to the captured identity", async () => {
  const source = await readFile(join(process.cwd(), "components/ai/AITutorProvider.tsx"), "utf8");
  const sendStart = source.indexOf("const sendTutorMessage = useCallback");
  const sendEnd = source.indexOf("sendTutorMessageRef.current = sendTutorMessage", sendStart);
  const sendSource = source.slice(sendStart, sendEnd);

  const policyAwait = sendSource.indexOf("await loadClassroomPolicy(sessionSnapshot)");
  const postTutor = sendSource.indexOf("await requestTutorReply");
  assert.ok(policyAwait >= 0 && postTutor > policyAwait);
  assert.ok(
    sendSource.indexOf("assertTutorSessionSnapshotCurrent(sessionSnapshot)", policyAwait) < postTutor,
    "the held policy continuation must recheck the captured epoch before chat submission"
  );

  assert.match(source, /"X-MAIS-Expected-User-Id": expectedUserId/);
  assert.match(source, /\.\.\.\(expectedUserId \? \{ expectedUserId \} : \{\}\)/);
  assert.match(source, /signal: sessionSnapshot\.controller\.signal/);
  assert.match(source, /fetch\("\/api\/ai-tutor\/speech"[\s\S]*?expectedUserId,[\s\S]*?signal: sessionSnapshot\.controller\.signal/);
  assert.match(source, /fetch\("\/api\/ai-tutor\/voice"[\s\S]*?expectedUserId,[\s\S]*?signal: controller\.signal/);
  assert.match(source, /window\.addEventListener\("blur", quarantineTutorWork\)/);
  assert.match(source, /window\.addEventListener\("pagehide", quarantineTutorWork\)/);
  assert.match(source, /new BroadcastChannel\(appShellSessionSyncStorageKey\)/);
});
