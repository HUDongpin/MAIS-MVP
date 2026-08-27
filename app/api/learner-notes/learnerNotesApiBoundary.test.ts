import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  guardLearnerNoteExpectedOwner,
  learnerNotePayloadHasForbiddenOwnership,
  learnerNotePrivateHeaders,
  readLearnerNoteBody
} from "@/app/api/learner-notes/_shared";

test("learner-note API requires the exact active student identity constraint", async () => {
  const authenticated = { user: { id: "student-current" } };
  const missing = guardLearnerNoteExpectedOwner(
    authenticated,
    new Request("https://mais.example.test/api/learner-notes")
  );
  const stale = guardLearnerNoteExpectedOwner(
    authenticated,
    new Request("https://mais.example.test/api/learner-notes", {
      headers: { "X-MAIS-Expected-User-Id": "student-old" }
    })
  );
  const exact = guardLearnerNoteExpectedOwner(
    authenticated,
    new Request("https://mais.example.test/api/learner-notes", {
      headers: { "X-MAIS-Expected-User-Id": "student-current" }
    })
  );

  assert.equal(missing?.status, 409);
  assert.equal(stale?.status, 409);
  assert.equal(exact, null);
  assert.deepEqual(await stale?.json(), {
    code: "authenticated-user-changed",
    error: "The authenticated user changed. Reload before retrying."
  });
});

test("learner-note payloads cannot choose ownership or broaden visibility", () => {
  assert.equal(learnerNotePayloadHasForbiddenOwnership({ ownerId: "student-other" }), true);
  assert.equal(learnerNotePayloadHasForbiddenOwnership({ owner_id: "student-other" }), true);
  assert.equal(learnerNotePayloadHasForbiddenOwnership({ userId: "student-other" }), true);
  assert.equal(learnerNotePayloadHasForbiddenOwnership({ visibility: "class" }), true);
  assert.equal(learnerNotePayloadHasForbiddenOwnership({ visibility: "private", body: "safe" }), false);
});

test("learner-note requests are bounded and all normal responses are private", async () => {
  assert.equal(learnerNotePrivateHeaders["Cache-Control"], "private, no-store, max-age=0");
  assert.equal(learnerNotePrivateHeaders["CDN-Cache-Control"], "private, no-store");
  assert.equal(learnerNotePrivateHeaders["Vercel-CDN-Cache-Control"], "private, no-store");
  assert.equal(learnerNotePrivateHeaders["X-Content-Type-Options"], "nosniff");

  const oversized = await readLearnerNoteBody(new Request("https://mais.example.test/api/learner-notes", {
    method: "POST",
    headers: { "content-length": "32769", "content-type": "application/json" },
    body: JSON.stringify({ body: "small wire fixture" })
  }));
  const invalid = await readLearnerNoteBody(new Request("https://mais.example.test/api/learner-notes", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "[]"
  }));

  assert.deepEqual(oversized, { ok: false, error: "Request body is too large." });
  assert.deepEqual(invalid, { ok: false, error: "A JSON object is required." });
});

test("lesson UI keeps note text inert and AI writes explicitly learner accepted", async () => {
  const panelSource = await readFile(path.join(process.cwd(), "components/lesson/LearnerNotesPanel.tsx"), "utf8");
  const lessonSource = await readFile(path.join(process.cwd(), "components/lesson/LessonView.tsx"), "utf8");
  const novaLensSource = await readFile(path.join(process.cwd(), "components/ai/NovaLensGlobalOverlay.tsx"), "utf8");
  const draftEventSource = await readFile(path.join(process.cwd(), "components/lesson/learnerNotesDraftEvent.ts"), "utf8");

  assert.doesNotMatch(panelSource, /dangerouslySetInnerHTML/u);
  assert.match(panelSource, /data-nova-lens-ignore="true"/u);
  assert.match(panelSource, /"X-MAIS-Expected-User-Id"/u);
  assert.match(panelSource, /"If-Match"/u);
  assert.match(panelSource, /acceptAiSuggestion: true/u);
  assert.match(panelSource, /Unsaved AI suggestion/u);
  assert.match(panelSource, /erase=true/u);
  assert.match(novaLensSource, /lesson-save-selection-to-notes/u);
  assert.match(novaLensSource, /dispatchLearnerNoteDraftRequest/u);
  assert.match(novaLensSource, /type: selection\.context\.blockId \? "text-quote" : "lesson"/u);
  assert.match(lessonSource, /learnerNoteDraftRequestEventName/u);
  assert.match(draftEventSource, /new CustomEvent<LearnerNoteDraftRequest>/u);
});
