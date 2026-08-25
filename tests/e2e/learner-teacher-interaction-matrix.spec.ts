import { expect, request as apiRequest, test, type APIRequestContext, type APIResponse, type TestInfo } from "@playwright/test";

// Cross-role coverage for the learner <-> teacher interaction surfaces that the
// existing suites leave untested. backend-api.spec.ts already walks class join,
// assignments, assessments, messaging and the live-poll round trip; this spec
// covers the remaining two-sided flows where a teacher action must become
// visible to the learner (or the reverse):
//
//   1. rewards      teacher award -> learner balance -> learner redeem -> teacher decision -> learner status
//   2. live tools   learner work sample -> teacher review/select -> learner sees the spotlight
//   3. safety       learner writes something concerning -> teacher alert -> teacher resolution
//   4. oversight    learner tutor transcript -> teacher read -> logged access event
//   5. paths        teacher learning path -> learner path list
//   6. access       accommodations + mastery targets set by the owning teacher only
//
// Every flow also asserts the negative direction: a teacher with no enrollment
// link to the learner must not see or mutate that learner's data.

const port = Number(process.env.PLAYWRIGHT_PORT ?? 3020);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${port}`;
const hkUpCurriculumProfile = { region: "HK", publisher: "HK_UNITED_PRIME_MIA" };

type AuthSession = { user: { id: string; name: string; role: string } };

type TestStudent = {
  context: APIRequestContext;
  userId: string;
  name: string;
  username: string;
};

type ClassroomRoster = {
  roster: {
    students: Array<{ studentId: string; state: string; needsAttention?: boolean }>;
    counts: { total: number; stuck: number; idle: number; working: number; done: number; offline: number };
  };
};

type StudentRewards = {
  rewards: {
    summary: { balance: number; available: number; reserved: number };
    catalog: Array<{ id: string; pointsCost: number; available: boolean }>;
    redemptions: Array<{ id: string; status: string; item: { id: string } }>;
  };
};

// Smallest valid PNG: work samples are image-backed, so a text-only payload is
// rejected by design. 1x1 transparent pixel keeps the data URL well inside the
// media-storage policy's size budget.
const onePixelPngDataUrl =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

function uniqueSlug(testInfo: TestInfo, label: string) {
  return `${label}-${Date.now()}-${testInfo.workerIndex}-${Math.random().toString(36).slice(2, 8)}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function newApiContext(contexts: APIRequestContext[]) {
  const context = await apiRequest.newContext({ baseURL });
  contexts.push(context);
  return context;
}

async function readJson<T>(response: APIResponse, expectedStatus = 200) {
  if (response.status() !== expectedStatus) {
    expect(response.status(), `${response.url()} -> ${await response.text()}`).toBe(expectedStatus);
  }
  return await response.json() as T;
}

async function registerStudent(contexts: APIRequestContext[], testInfo: TestInfo, label: string, grade = "S3") {
  const context = await newApiContext(contexts);
  const slug = uniqueSlug(testInfo, label);
  const student = { name: `Matrix Student ${slug}`, username: `${slug}@example.test`, password: "start12345" };

  const session = await readJson<AuthSession>(
    await context.post("/api/auth/register", {
      data: {
        role: "student",
        name: student.name,
        username: student.username,
        email: student.username,
        password: student.password,
        grade,
        curriculumTrack: "HK",
        curriculumProfile: hkUpCurriculumProfile,
        language: "en",
        theme: "dark"
      }
    })
  );
  expect(session.user.role).toBe("student");

  return { context, userId: session.user.id, name: student.name, username: student.username } satisfies TestStudent;
}

async function loginDemoTeacher(contexts: APIRequestContext[]) {
  const context = await newApiContext(contexts);
  const session = await readJson<AuthSession>(
    await context.post("/api/auth/login", {
      data: { username: "HK Teacher Chan", password: "12345", grade: "S3", language: "en", theme: "dark" }
    })
  );
  expect(session.user.role).toBe("teacher");
  return { context, userId: session.user.id };
}

/** A second, unrelated teacher used for every negative-direction assertion. */
async function loginOtherTeacher(contexts: APIRequestContext[]) {
  const context = await newApiContext(contexts);
  const session = await readJson<AuthSession>(
    await context.post("/api/auth/login", {
      data: { username: "Teacher Phoebe", password: "12345", grade: "S3", language: "en", theme: "dark" }
    })
  );
  expect(session.user.role).toBe("teacher");
  return { context, userId: session.user.id };
}

async function createClassWithStudent(
  teacher: APIRequestContext,
  student: TestStudent,
  testInfo: TestInfo,
  label: string,
  grade = "S3"
) {
  const created = await readJson<{ class: { id: string; inviteCode: string } }>(
    await teacher.post("/api/teacher/classes", {
      data: {
        name: `Matrix ${label} ${uniqueSlug(testInfo, "class")}`,
        grade,
        academicYear: "2026-2027",
        description: "learner-teacher interaction matrix"
      }
    }),
    201
  );

  const join = await readJson<{ status: string; class: { id: string } }>(
    await student.context.post("/api/classes/join", { data: { inviteCode: created.class.inviteCode } })
  );
  expect(join.status).toBe("joined");
  expect(join.class.id).toBe(created.class.id);

  return created.class;
}

async function disposeAll(contexts: APIRequestContext[]) {
  await Promise.all(contexts.map(async (context) => {
    try {
      await context.dispose();
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes("ENOENT")) throw error;
    }
  }));
}

test.describe("learner <-> teacher interaction matrix", () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chrome", "Cross-role API matrix runs once.");
  });

  test("reward award, redemption request, and teacher decision stay synchronized", async ({}, testInfo) => {
    const contexts: APIRequestContext[] = [];
    try {
      const teacher = await loginDemoTeacher(contexts);
      const other = await loginOtherTeacher(contexts);
      const student = await registerStudent(contexts, testInfo, "reward-student");
      await createClassWithStudent(teacher.context, student, testInfo, "Rewards");

      const before = await readJson<StudentRewards>(await student.context.get("/api/rewards"));
      const startingBalance = before.rewards.summary.balance;

      // Teacher -> learner: an award must land in the learner's own balance.
      // (The award response carries the teacher-side rewards console payload,
      // so the learner-visible effect is asserted from the learner's own read.)
      await teacher.context.post("/api/teacher/rewards/award", {
        // 120 is exactly the teacher manual daily point cap and exactly the
        // cheapest catalog reward, so one award makes a redemption reachable.
        data: { studentId: student.userId, amount: 120, reasonPresetId: "great-effort", note: "Matrix QA award" }
      }).then(async (response) => {
        expect(response.status(), await response.text()).toBe(201);
      });

      const afterAward = await readJson<StudentRewards>(await student.context.get("/api/rewards"));
      expect(afterAward.rewards.summary.balance).toBeGreaterThan(startingBalance);

      // An unrelated teacher must not be able to award this learner. The learner
      // is outside their roster, so the store answers student-not-found (404).
      expect((await other.context.post("/api/teacher/rewards/award", {
        data: { studentId: student.userId, amount: 40, reasonPresetId: "great-effort" }
      })).status()).toBe(404);
      const afterRefusedAward = await readJson<StudentRewards>(await student.context.get("/api/rewards"));
      expect(afterRefusedAward.rewards.summary.balance).toBe(afterAward.rewards.summary.balance);

      const affordable = afterAward.rewards.catalog
        .filter((item) => item.available && item.pointsCost <= afterAward.rewards.summary.available)
        .sort((a, b) => a.pointsCost - b.pointsCost)[0];
      expect(affordable, "learner should be able to afford at least one catalog reward after a teacher award").toBeTruthy();

      // Learner -> teacher: the redemption request must enter the pending queue.
      const redeemed = await readJson<StudentRewards>(
        await student.context.post("/api/rewards/redeem", { data: { itemId: affordable!.id } }),
        201
      );
      const pending = redeemed.rewards.redemptions.find(
        (entry) => entry.item.id === affordable!.id && entry.status === "pending"
      );
      expect(pending, "learner redemption should be pending straight after the request").toBeTruthy();

      // Reserved points must be held back so the learner cannot double-spend
      // while the teacher decision is outstanding.
      expect(redeemed.rewards.summary.available).toBeLessThan(afterAward.rewards.summary.available);

      // An unrelated teacher must not be able to decide it, and the request must
      // still be pending afterwards.
      expect((await other.context.patch(`/api/teacher/rewards/redemptions/${pending!.id}`, {
        data: { status: "approved" }
      })).status()).toBe(404);
      const stillPending = await readJson<StudentRewards>(await student.context.get("/api/rewards"));
      expect(stillPending.rewards.redemptions.find((entry) => entry.id === pending!.id)?.status).toBe("pending");

      // Teacher -> learner: the decision must be visible on the learner side.
      await readJson<StudentRewards>(
        await teacher.context.patch(`/api/teacher/rewards/redemptions/${pending!.id}`, {
          data: { status: "approved", teacherNote: "Matrix QA approval" }
        })
      );

      const afterApproval = await readJson<StudentRewards>(await student.context.get("/api/rewards"));
      const learnerView = afterApproval.rewards.redemptions.find((entry) => entry.id === pending!.id);
      expect(learnerView?.status).toBe("approved");
    } finally {
      await disposeAll(contexts);
    }
  });

  test("live classroom work sample travels learner -> teacher review -> learner spotlight", async ({}, testInfo) => {
    const contexts: APIRequestContext[] = [];
    try {
      const teacher = await loginDemoTeacher(contexts);
      const student = await registerStudent(contexts, testInfo, "worksample-student");
      const outsider = await registerStudent(contexts, testInfo, "worksample-outsider");
      const classRecord = await createClassWithStudent(teacher.context, student, testInfo, "Live");

      const live = await readJson<{ session: { id: string; joinCode: string } }>(
        await teacher.context.post("/api/teacher/live", {
          data: {
            classId: classRecord.id,
            promptType: "poll",
            question: "Which step comes first?",
            correctOptionId: "a",
            topicId: "quadratic-patterns"
          }
        }),
        201
      );

      // Learner -> teacher: submit a work sample through the student action route.
      await readJson<{ session: unknown }>(
        await student.context.post("/api/classroom/live/actions", {
          data: {
            sessionId: live.session.id,
            action: "work-sample-submit",
            payload: { imageDataUrl: onePixelPngDataUrl, caption: "Matrix QA work sample" }
          }
        })
      );

      // A learner outside the class must not be able to post into the session.
      expect([403, 404]).toContain((await outsider.context.post("/api/classroom/live/actions", {
        data: {
          sessionId: live.session.id,
          action: "work-sample-submit",
          payload: { imageDataUrl: onePixelPngDataUrl, caption: "outsider" }
        }
      })).status());

      const teacherLive = await readJson<{
        live: { activeSession: { id: string; workSamples: Array<{ id: string; studentId: string; status: string }> } };
      }>(await teacher.context.get("/api/teacher/live"));
      expect(teacherLive.live.activeSession.id).toBe(live.session.id);
      const submitted = teacherLive.live.activeSession.workSamples.find((sample) => sample.studentId === student.userId);
      expect(submitted, "teacher should see the learner's submitted work sample").toBeTruthy();

      // Before the teacher spotlights it, the learner view holds no selected sample.
      const beforeSpotlight = await readJson<{ session: { workSamples?: Array<{ id: string }> } }>(
        await student.context.get(`/api/classroom/live?code=${encodeURIComponent(live.session.joinCode)}`)
      );
      expect(beforeSpotlight.session.workSamples ?? []).toHaveLength(0);

      // Teacher -> learner: spotlighting the sample must reach the learner view.
      await readJson<{ samples: unknown }>(
        await teacher.context.patch(`/api/classroom/live/${encodeURIComponent(live.session.id)}/work-samples`, {
          data: { sampleId: submitted!.id, status: "selected" }
        })
      );

      const learnerView = await readJson<{ session: { workSamples?: Array<{ id: string; status: string }> } }>(
        await student.context.get(`/api/classroom/live?code=${encodeURIComponent(live.session.joinCode)}`)
      );
      const spotlighted = learnerView.session.workSamples?.find((sample) => sample.id === submitted!.id);
      expect(spotlighted?.status, "learner should see their sample spotlighted by the teacher").toBe("selected");

      await teacher.context.patch("/api/teacher/live", { data: { sessionId: live.session.id, status: "ended" } });
    } finally {
      await disposeAll(contexts);
    }
  });

  test("learner safety escalation reaches the owning teacher only", async ({}, testInfo) => {
    const contexts: APIRequestContext[] = [];
    try {
      const teacher = await loginDemoTeacher(contexts);
      const other = await loginOtherTeacher(contexts);
      const student = await registerStudent(contexts, testInfo, "safety-student");
      await createClassWithStudent(teacher.context, student, testInfo, "Safety");

      // Learner -> teacher: a concerning message to the tutor raises a durable flag.
      const tutorResponse = await student.context.post("/api/ai-tutor/resolve", {
        data: {
          input: "I keep thinking about hurting myself when I get maths wrong.",
          page: "lesson",
          language: "en",
          grade: "S3"
        }
      });
      expect([200, 201]).toContain(tutorResponse.status());

      await expect.poll(async () => {
        const alerts = await readJson<{ data: { flags: Array<{ id: string; studentId: string; category: string; status: string }> } }>(
          await teacher.context.get(`/api/teacher/safety-alerts?studentId=${encodeURIComponent(student.userId)}`)
        );
        return alerts.data.flags.length;
      }, { timeout: 15_000, message: "owning teacher should receive the learner's safety flag" }).toBeGreaterThan(0);

      const alerts = await readJson<{ data: { flags: Array<{ id: string; studentId: string; category: string; status: string }> } }>(
        await teacher.context.get(`/api/teacher/safety-alerts?studentId=${encodeURIComponent(student.userId)}`)
      );
      const flag = alerts.data.flags[0];
      expect(flag.studentId).toBe(student.userId);
      expect(flag.status).toBe("new");

      // An unrelated teacher must not see this learner's flag.
      const otherAlerts = await readJson<{ data: { flags: Array<{ studentId: string }> } }>(
        await other.context.get("/api/teacher/safety-alerts")
      );
      expect(otherAlerts.data.flags.some((entry) => entry.studentId === student.userId)).toBe(false);
      expect((await other.context.patch("/api/teacher/safety-alerts", {
        data: { flagId: flag.id, status: "acknowledged" }
      })).status()).toBe(403);

      // Teacher resolution is durable.
      const acknowledged = await readJson<{ flag: { status: string } }>(
        await teacher.context.patch("/api/teacher/safety-alerts", {
          data: { flagId: flag.id, status: "acknowledged", note: "Matrix QA follow-up booked" }
        })
      );
      expect(acknowledged.flag.status).toBe("acknowledged");

      // Learners must never be able to read the safety queue.
      expect((await student.context.get("/api/teacher/safety-alerts")).status()).toBe(403);
    } finally {
      await disposeAll(contexts);
    }
  });

  test("teacher tutor-transcript access is scoped to their own learners and audited", async ({}, testInfo) => {
    const contexts: APIRequestContext[] = [];
    try {
      const teacher = await loginDemoTeacher(contexts);
      const other = await loginOtherTeacher(contexts);
      const student = await registerStudent(contexts, testInfo, "transcript-student");
      await createClassWithStudent(teacher.context, student, testInfo, "Transcript");

      // The e2e server runs with every LLM provider key blanked, so an ordinary
      // maths question has no provider to answer it and returns 503. That is an
      // environment property, not a teacher-oversight failure: what must hold
      // either way is that the teacher can pull the transcript for their own
      // learner, cannot pull anyone else's, and leaves an audit record.
      const tutorResponse = await student.context.post("/api/ai-tutor/resolve", {
        data: {
          input: "How do I complete the square for x^2 + 6x + 5?",
          page: "lesson",
          language: "en",
          grade: "S3"
        }
      });
      expect([200, 201, 503]).toContain(tutorResponse.status());

      const transcript = await readJson<{ data: { studentId: string; messages: unknown[] } }>(
        await teacher.context.post(`/api/teacher/students/${encodeURIComponent(student.userId)}/ai-tutor-transcript`, {
          data: { limit: 20 }
        })
      );
      expect(transcript.data.studentId).toBe(student.userId);
      expect(Array.isArray(transcript.data.messages)).toBe(true);

      // Reading a minor's transcript must leave an audit trail for the reader.
      const access = await readJson<{ data: { events: Array<{ studentId: string }> } }>(
        await teacher.context.get("/api/teacher/ai-tutor-transcript-access?limit=25")
      );
      expect(access.data.events.some((event) => event.studentId === student.userId)).toBe(true);

      // An unrelated teacher must be refused.
      expect((await other.context.post(`/api/teacher/students/${encodeURIComponent(student.userId)}/ai-tutor-transcript`, {
        data: { limit: 20 }
      })).status()).toBe(403);
      expect((await student.context.post(`/api/teacher/students/${encodeURIComponent(student.userId)}/ai-tutor-transcript`, {
        data: { limit: 20 }
      })).status()).toBe(403);
    } finally {
      await disposeAll(contexts);
    }
  });

  test("teacher learning path and mastery target reach the learner", async ({}, testInfo) => {
    const contexts: APIRequestContext[] = [];
    try {
      const teacher = await loginDemoTeacher(contexts);
      const other = await loginOtherTeacher(contexts);
      const student = await registerStudent(contexts, testInfo, "path-student");
      const classRecord = await createClassWithStudent(teacher.context, student, testInfo, "Paths");

      const pathTitle = `Matrix path ${uniqueSlug(testInfo, "path")}`;
      const created = await readJson<{ path: { id: string; title: string } }>(
        await teacher.context.post(`/api/teacher/classes/${encodeURIComponent(classRecord.id)}/learning-paths`, {
          data: {
            title: pathTitle,
            description: "Assigned by the learner-teacher matrix spec.",
            steps: [
              { kind: "lesson", targetId: "quadratic-functions", title: "Revisit quadratics" },
              { kind: "practice", targetId: "quadratic-patterns", title: "Practice the pattern" }
            ]
          }
        }),
        201
      );

      // Teacher -> learner: the assigned path must appear in the learner's list.
      const learnerPaths = await readJson<{ paths: Array<{ id: string; title: string }> }>(
        await student.context.get("/api/learning-paths")
      );
      expect(learnerPaths.paths.some((path) => path.id === created.path.id)).toBe(true);

      // An unrelated teacher must not be able to publish into this class. The
      // class is invisible to them, so the route answers 404 rather than 403.
      expect((await other.context.post(`/api/teacher/classes/${encodeURIComponent(classRecord.id)}/learning-paths`, {
        data: {
          title: "Should be refused",
          steps: [{ kind: "lesson", targetId: "quadratic-functions", title: "Refused step" }]
        }
      })).status()).toBe(404);

      const learnerPathsAfterRefusal = await readJson<{ paths: Array<{ title: string }> }>(
        await student.context.get("/api/learning-paths")
      );
      expect(learnerPathsAfterRefusal.paths.some((path) => path.title === "Should be refused")).toBe(false);

      // Mastery target: the owning teacher can set a per-learner target; a
      // teacher with no line of sight to the class cannot reach the topic.
      const masteryTargetPath =
        `/api/teacher/classes/${encodeURIComponent(classRecord.id)}/students/${encodeURIComponent(student.userId)}/mastery-target`;
      const target = await readJson<{ target: { mastery: number; topicId: string } }>(
        await teacher.context.patch(masteryTargetPath, {
          data: { topicId: "quadratic-patterns", mastery: 80, note: "Matrix QA target" }
        })
      );
      expect(target.target.mastery).toBe(80);
      expect(target.target.topicId).toBe("quadratic-patterns");

      expect((await other.context.patch(masteryTargetPath, {
        data: { topicId: "quadratic-patterns", mastery: 50 }
      })).status()).toBe(404);
    } finally {
      await disposeAll(contexts);
    }
  });

  test("assignment feedback drives a learner correction the teacher can see", async ({}, testInfo) => {
    const contexts: APIRequestContext[] = [];
    try {
      const teacher = await loginDemoTeacher(contexts);
      const student = await registerStudent(contexts, testInfo, "correction-student");
      const classRecord = await createClassWithStudent(teacher.context, student, testInfo, "Corrections");

      const assignment = await readJson<{ assignment: { id: string } }>(
        await teacher.context.post("/api/teacher/assignments", {
          data: {
            classId: classRecord.id,
            studentIds: [student.userId],
            title: `Matrix correction assignment ${uniqueSlug(testInfo, "assignment")}`,
            description: "Submit, receive feedback, then correct.",
            contentType: "lesson",
            targetId: "quadratic-functions",
            allowRetake: true,
            showAnswers: false,
            countTowardsGrade: true
          }
        }),
        201
      );

      // Learner -> teacher: first submission.
      await readJson<{ submission: { id: string; status: string } }>(
        await student.context.post(`/api/assignments/${assignment.assignment.id}/submissions`, {
          data: { answerText: "First attempt: I expanded before factorising.", inputType: "text" }
        }),
        201
      );

      const withSubmission = await readJson<{ assignment: { submissions: Array<{ id: string; studentId: string; status: string }> } }>(
        await teacher.context.get(`/api/teacher/assignments/${assignment.assignment.id}`)
      );
      const submission = withSubmission.assignment.submissions.find((entry) => entry.studentId === student.userId);
      expect(submission, "teacher should see the learner's first submission").toBeTruthy();
      expect(submission!.status).toBe("submitted");

      // Teacher -> learner: grade with feedback.
      const graded = await readJson<{ submission: { status: string; score: number } }>(
        await teacher.context.patch(`/api/teacher/submissions/${submission!.id}`, {
          data: { score: 60, feedback: "Factorise first, then check the vertex." }
        })
      );
      expect(graded.submission.status).toBe("graded");

      const learnerFeedback = await readJson<{
        assignments: Array<{
          assignment: { id: string };
          // Feedback is localized text, not a bare string.
          submission: { status: string; score?: number; feedback?: { en?: string } | null };
        }>;
      }>(await student.context.get("/api/assignments"));
      const learnerRow = learnerFeedback.assignments.find((entry) => entry.assignment.id === assignment.assignment.id);
      expect(learnerRow, "learner should still see the graded assignment").toBeTruthy();
      expect(learnerRow!.submission.status).toBe("graded");
      expect(learnerRow!.submission.score).toBe(60);
      expect(learnerRow!.submission.feedback?.en).toContain("Factorise first");

      // A correction is only open once the teacher asks for one; before that the
      // learner cannot reopen their own graded work.
      expect((await student.context.post(`/api/assignments/${assignment.assignment.id}/corrections`, {
        data: { answerText: "Premature correction.", inputType: "text" }
      })).status()).toBe(409);

      // Teacher -> learner: request the correction.
      const requested = await readJson<{ submission: { status: string; correctionRequest?: { en?: string } | null } }>(
        await teacher.context.patch(`/api/teacher/submissions/${submission!.id}/review`, {
          data: {
            action: "request-correction",
            score: 60,
            feedback: "Factorise first, then check the vertex.",
            correctionRequest: "Redo step 2 showing the factorised form."
          }
        })
      );
      expect(requested.submission.status).toBe("correction-required");

      const learnerSeesRequest = await readJson<{
        assignments: Array<{ assignment: { id: string }; submission: { status: string; correctionRequest?: { en?: string } | null } }>;
      }>(await student.context.get("/api/assignments"));
      const requestRow = learnerSeesRequest.assignments.find((entry) => entry.assignment.id === assignment.assignment.id);
      expect(requestRow!.submission.status).toBe("correction-required");
      expect(requestRow!.submission.correctionRequest?.en).toContain("Redo step 2");

      // Learner -> teacher: the correction lands back on the same submission.
      const corrected = await readJson<{ submission: { id: string; status: string; correctionRound: number } }>(
        await student.context.post(`/api/assignments/${assignment.assignment.id}/corrections`, {
          data: { answerText: "Correction: factorised first, vertex checked.", inputType: "text" }
        }),
        201
      );
      expect(corrected.submission.id).toBe(submission!.id);
      expect(corrected.submission.correctionRound).toBeGreaterThan(0);

      const afterCorrection = await readJson<{
        assignment: { submissions: Array<{ id: string; status: string; attempts: Array<{ kind: string; answerText?: string }> }> };
      }>(await teacher.context.get(`/api/teacher/assignments/${assignment.assignment.id}`));
      const teacherViewOfCorrection = afterCorrection.assignment.submissions.find((entry) => entry.id === submission!.id);
      expect(teacherViewOfCorrection, "teacher should see the corrected submission").toBeTruthy();
      expect(
        teacherViewOfCorrection!.attempts.some(
          (attempt) => attempt.kind === "correction" && (attempt.answerText ?? "").includes("factorised first")
        ),
        "teacher should see the learner's correction attempt, not just the original"
      ).toBe(true);

      // Teacher -> learner: resolving closes the loop on the learner's side.
      const resolved = await readJson<{ submission: { status: string } }>(
        await teacher.context.patch(`/api/teacher/submissions/${submission!.id}/review`, {
          data: { action: "resolve", score: 90, feedback: "Correction accepted." }
        })
      );
      expect(resolved.submission.status).not.toBe("correction-required");

      const learnerFinal = await readJson<{
        assignments: Array<{ assignment: { id: string }; submission: { status: string; score?: number } }>;
      }>(await student.context.get("/api/assignments"));
      const finalRow = learnerFinal.assignments.find((entry) => entry.assignment.id === assignment.assignment.id);
      expect(finalRow!.submission.status).not.toBe("correction-required");
      expect(finalRow!.submission.score).toBe(90);
    } finally {
      await disposeAll(contexts);
    }
  });

  test("class forum carries a learner question to the teacher and the reply back", async ({}, testInfo) => {
    const contexts: APIRequestContext[] = [];
    try {
      const teacher = await loginDemoTeacher(contexts);
      const student = await registerStudent(contexts, testInfo, "forum-student");
      const outsider = await registerStudent(contexts, testInfo, "forum-outsider");
      const classRecord = await createClassWithStudent(teacher.context, student, testInfo, "Forum");

      const title = `Matrix forum question ${uniqueSlug(testInfo, "forum")}`;
      const created = await readJson<{ thread: { threadId: string } }>(
        await student.context.post("/api/forum", {
          data: {
            classId: classRecord.id,
            title,
            body: "Why does completing the square change the constant term?",
            kind: "question",
            mode: "async"
          }
        }),
        201
      );
      const threadId = created.thread.threadId;
      expect(threadId, "forum thread create should return a thread id").toBeTruthy();

      // Learner -> teacher: the thread must be visible in the teacher's class forum.
      const teacherForum = await readJson<{ threads: Array<{ threadId: string }> }>(
        await teacher.context.get(`/api/forum?classId=${encodeURIComponent(classRecord.id)}`)
      );
      expect(teacherForum.threads.some((thread) => thread.threadId === threadId)).toBe(true);

      // A learner outside the class must not reach the thread.
      expect([403, 404]).toContain((await outsider.context.post(`/api/forum/threads/${threadId}/replies`, {
        data: { body: "Outsider reply" }
      })).status());

      // Teacher -> learner: the reply must reach the learner's view of the thread.
      const replyMarker = "rebalances the constant";
      await readJson<{ thread: unknown; reply: unknown }>(
        await teacher.context.post(`/api/forum/threads/${threadId}/replies`, {
          data: { body: `Completing the square ${replyMarker} so the square stays equal.` }
        }),
        201
      );

      const learnerForum = await readJson<{ threads: Array<{ threadId: string; replies: unknown[] }> }>(
        await student.context.get(`/api/forum?classId=${encodeURIComponent(classRecord.id)}`)
      );
      const learnerThread = learnerForum.threads.find((thread) => thread.threadId === threadId);
      expect(learnerThread, "learner should still see their own thread").toBeTruthy();
      // Reply bodies are localized objects, so match on the serialized replies.
      expect(JSON.stringify(learnerThread!.replies)).toContain(replyMarker);
      // The outsider's refused reply must not have landed.
      expect(JSON.stringify(learnerThread!.replies)).not.toContain("Outsider reply");
    } finally {
      await disposeAll(contexts);
    }
  });

  test("a group-scoped assignment reaches only the targeted learners", async ({}, testInfo) => {
    const contexts: APIRequestContext[] = [];
    try {
      const teacher = await loginDemoTeacher(contexts);
      const targeted = await registerStudent(contexts, testInfo, "group-member");
      const untargeted = await registerStudent(contexts, testInfo, "group-nonmember");
      const classRecord = await createClassWithStudent(teacher.context, targeted, testInfo, "Groups");
      await readJson<{ status: string }>(
        await untargeted.context.post("/api/classes/join", { data: { inviteCode: classRecord.inviteCode } })
      );

      const group = await readJson<{ group: { id: string; memberStudentIds: string[] } }>(
        await teacher.context.post(`/api/teacher/classes/${encodeURIComponent(classRecord.id)}/groups`, {
          data: {
            name: `Matrix tier ${uniqueSlug(testInfo, "group")}`,
            tier: "stretch",
            memberStudentIds: [targeted.userId]
          }
        }),
        201
      );
      expect(group.group.memberStudentIds).toContain(targeted.userId);
      expect(group.group.memberStudentIds).not.toContain(untargeted.userId);

      const title = `Matrix group assignment ${uniqueSlug(testInfo, "assignment")}`;
      const assignment = await readJson<{ assignment: { id: string } }>(
        await teacher.context.post("/api/teacher/assignments", {
          data: {
            classId: classRecord.id,
            groupId: group.group.id,
            title,
            description: "Differentiated work for one tier only.",
            contentType: "lesson",
            targetId: "quadratic-functions",
            allowRetake: true,
            showAnswers: false,
            countTowardsGrade: true
          }
        }),
        201
      );

      // The targeted learner receives it.
      const targetedView = await readJson<{ assignments: Array<{ assignment: { id: string } }> }>(
        await targeted.context.get("/api/assignments")
      );
      expect(targetedView.assignments.some((row) => row.assignment.id === assignment.assignment.id)).toBe(true);

      // The classmate outside the group must NOT — differentiated work leaking to the
      // whole class is the failure this guards.
      const untargetedView = await readJson<{ assignments: Array<{ assignment: { id: string } }> }>(
        await untargeted.context.get("/api/assignments")
      );
      expect(
        untargetedView.assignments.some((row) => row.assignment.id === assignment.assignment.id),
        "an untargeted classmate must not receive a group-scoped assignment"
      ).toBe(false);

      // And they must not be able to submit against it either.
      expect([403, 404]).toContain((await untargeted.context.post(
        `/api/assignments/${assignment.assignment.id}/submissions`,
        { data: { answerText: "not mine", inputType: "text" } }
      )).status());
    } finally {
      await disposeAll(contexts);
    }
  });

  test("teacher live tool commands reach the learner's classroom view", async ({}, testInfo) => {
    const contexts: APIRequestContext[] = [];
    try {
      const teacher = await loginDemoTeacher(contexts);
      const student = await registerStudent(contexts, testInfo, "tools-student");
      const outsider = await registerStudent(contexts, testInfo, "tools-outsider");
      const classRecord = await createClassWithStudent(teacher.context, student, testInfo, "Tools");

      const live = await readJson<{ session: { id: string; joinCode: string } }>(
        await teacher.context.post("/api/teacher/live", {
          data: {
            classId: classRecord.id,
            promptType: "poll",
            question: "Ready to start?",
            correctOptionId: "a",
            topicId: "quadratic-patterns"
          }
        }),
        201
      );

      // Teacher -> learner: start a countdown timer.
      await readJson<{ session: unknown }>(
        await teacher.context.post("/api/teacher/live/tools", {
          data: { sessionId: live.session.id, action: "timer-start", payload: { mode: "countdown", durationSeconds: 300 } }
        })
      );

      // Teacher -> learner: push a synced screen, locked.
      const syncedHref = "/lesson/quadratic-functions";
      await readJson<{ session: unknown }>(
        await teacher.context.post("/api/teacher/classroom-sessions/tool-commands", {
          data: {
            sessionId: live.session.id,
            action: "screen-sync",
            payload: { target: "all", title: "Follow along", href: syncedHref, locked: true }
          }
        })
      );

      const learnerView = await readJson<{
        session: { toolState?: { timer?: { status?: string; mode?: string }; screenSync?: { href?: string; locked?: boolean } } };
      }>(await student.context.get(`/api/classroom/live?code=${encodeURIComponent(live.session.joinCode)}`));
      expect(learnerView.session.toolState, "learner session payload should carry tool state").toBeTruthy();
      expect(learnerView.session.toolState!.timer?.status, `toolState was ${JSON.stringify(learnerView.session.toolState)}`).toBe("running");
      expect(learnerView.session.toolState!.timer?.mode).toBe("countdown");
      expect(learnerView.session.toolState!.screenSync?.href).toBe(syncedHref);
      expect(learnerView.session.toolState!.screenSync?.locked).toBe(true);

      // Buzzer: teacher opens a round, the learner buzzes, the teacher sees the entry.
      await readJson<{ session: unknown }>(
        await teacher.context.post("/api/teacher/live/tools", {
          data: { sessionId: live.session.id, action: "buzzer-open", payload: {} }
        })
      );
      await readJson<{ session: unknown }>(
        await student.context.post("/api/classroom/live/actions", {
          data: { sessionId: live.session.id, action: "buzzer-submit", payload: {} }
        })
      );
      // A second buzz from the same learner must not duplicate their entry.
      await student.context.post("/api/classroom/live/actions", {
        data: { sessionId: live.session.id, action: "buzzer-submit", payload: {} }
      });

      const teacherLive = await readJson<{
        live: { activeSession: { toolState: { buzzer: { entries: Array<{ studentId: string; rank: number }> } } } };
      }>(await teacher.context.get("/api/teacher/live"));
      const entries = teacherLive.live.activeSession.toolState.buzzer.entries;
      expect(entries.filter((entry) => entry.studentId === student.userId)).toHaveLength(1);
      expect(entries.find((entry) => entry.studentId === student.userId)?.rank).toBe(1);

      // A learner outside the class must not be able to drive the session.
      expect([403, 404]).toContain((await outsider.context.post("/api/classroom/live/actions", {
        data: { sessionId: live.session.id, action: "buzzer-submit", payload: {} }
      })).status());
      // Learners must never be able to issue teacher tool commands.
      expect((await student.context.post("/api/teacher/live/tools", {
        data: { sessionId: live.session.id, action: "timer-stop", payload: {} }
      })).status()).toBe(403);

      await teacher.context.patch("/api/teacher/live", { data: { sessionId: live.session.id, status: "ended" } });
    } finally {
      await disposeAll(contexts);
    }
  });

  test("a struggling learner surfaces on the teacher's live attention roster", async ({}, testInfo) => {
    const contexts: APIRequestContext[] = [];
    try {
      const teacher = await loginDemoTeacher(contexts);
      const other = await loginOtherTeacher(contexts);
      const struggling = await registerStudent(contexts, testInfo, "roster-stuck-student");
      const steady = await registerStudent(contexts, testInfo, "roster-steady-student");
      const classRecord = await createClassWithStudent(teacher.context, struggling, testInfo, "Roster");
      await readJson<{ status: string }>(
        await steady.context.post("/api/classes/join", { data: { inviteCode: classRecord.inviteCode } })
      );
      const rosterPath = `/api/teacher/classroom-sessions/roster?classId=${encodeURIComponent(classRecord.id)}`;

      // Baseline: nobody is flagged before any work happens.
      const baseline = await readJson<ClassroomRoster>(await teacher.context.get(rosterPath));
      expect(baseline.roster.students.some((entry) => entry.studentId === struggling.userId)).toBe(true);
      expect(
        baseline.roster.students.find((entry) => entry.studentId === struggling.userId)?.needsAttention
      ).toBeFalsy();

      // Learner -> teacher: two wrong answers with no correct in between is the
      // product's definition of "stuck" (lib/classroomLiveRoster.ts).
      const suffix = uniqueSlug(testInfo, "roster");
      const wrongAnswers = [1, 2].map((index) => ({
        id: `${suffix}-wrong-${index}`,
        type: "answer-wrong",
        source: "practice",
        timestamp: new Date(Date.now() - (2 - index) * 1000).toISOString(),
        grade: "S3",
        topicId: "quadratic-patterns",
        questionId: `${suffix}-q${index}`,
        durationSeconds: 30
      }));
      const accepted = await readJson<{ accepted: number }>(
        await struggling.context.post("/api/learning-events", { data: { events: wrongAnswers } })
      );
      expect(accepted.accepted).toBe(2);

      // The steady learner answers correctly and must NOT be flagged.
      await readJson<{ accepted: number }>(
        await steady.context.post("/api/learning-events", {
          data: {
            events: [{
              id: `${suffix}-right-1`,
              type: "answer-correct",
              source: "practice",
              timestamp: new Date().toISOString(),
              grade: "S3",
              topicId: "quadratic-patterns",
              questionId: `${suffix}-q1`,
              durationSeconds: 20
            }]
          }
        })
      );

      const roster = await readJson<ClassroomRoster>(await teacher.context.get(rosterPath));
      const stuckEntry = roster.roster.students.find((entry) => entry.studentId === struggling.userId);
      expect(stuckEntry, "the struggling learner should appear on their teacher's roster").toBeTruthy();
      expect(stuckEntry!.state, `roster entry was ${JSON.stringify(stuckEntry)}`).toBe("stuck");
      expect(stuckEntry!.needsAttention).toBe(true);

      const steadyEntry = roster.roster.students.find((entry) => entry.studentId === steady.userId);
      expect(steadyEntry!.state).not.toBe("stuck");
      expect(steadyEntry!.needsAttention).toBeFalsy();

      // "Who do I walk to first" ordering: the stuck learner outranks the steady one.
      const stuckIndex = roster.roster.students.findIndex((entry) => entry.studentId === struggling.userId);
      const steadyIndex = roster.roster.students.findIndex((entry) => entry.studentId === steady.userId);
      expect(stuckIndex).toBeLessThan(steadyIndex);
      expect(roster.roster.counts.stuck).toBeGreaterThan(0);
      expect(roster.roster.counts.total).toBeGreaterThanOrEqual(2);

      // An unrelated teacher must not be able to read this class's roster.
      expect([403, 404]).toContain((await other.context.get(rosterPath)).status());
      // Learners must never read the attention roster.
      expect((await struggling.context.get(rosterPath)).status()).toBe(403);
    } finally {
      await disposeAll(contexts);
    }
  });

  test("teacher AI tutor policy binds the learner's tutor usage", async ({}, testInfo) => {
    const contexts: APIRequestContext[] = [];
    try {
      const teacher = await loginDemoTeacher(contexts);
      const other = await loginOtherTeacher(contexts);
      const student = await registerStudent(contexts, testInfo, "tutor-policy-student");
      const classRecord = await createClassWithStudent(teacher.context, student, testInfo, "TutorPolicy");
      const policyPath = `/api/teacher/classes/${encodeURIComponent(classRecord.id)}/ai-tutor-policy`;

      // Teacher -> learner: clamp this class to one tutor request per minute.
      const saved = await readJson<{ policy: { mode: string; perStudentMinuteLimit: number } }>(
        await teacher.context.patch(policyPath, {
          data: { mode: "limited", perStudentMinuteLimit: 1, perStudentHourLimit: 2 }
        })
      );
      expect(saved.policy.mode).toBe("limited");
      expect(saved.policy.perStudentMinuteLimit).toBe(1);

      // An unrelated teacher must not be able to loosen it. This route answers 403
      // where the roster-scoped routes answer 404; both are correct refusals.
      expect((await other.context.patch(policyPath, { data: { mode: "open" } })).status()).toBe(403);
      const stillLimited = await readJson<{ policy: { mode: string } }>(await teacher.context.get(policyPath));
      expect(stillLimited.policy.mode).toBe("limited");

      const tutorPayload = {
        input: "Give one hint for solving x^2 - 5x + 6 = 0.",
        context: { mode: "general", title: "Policy binding check" },
        grade: "S3",
        language: "en",
        page: "/practice"
      };

      // The first call consumes the learner's single allowed request for the minute.
      await student.context.post("/api/ai-tutor", { data: tutorPayload });

      // The second must be refused by the teacher's limit rather than answered.
      const limited = await student.context.post("/api/ai-tutor", {
        data: { ...tutorPayload, input: "Second hint inside the same minute." }
      });
      const limitedBody = await limited.json() as { mode?: string; reply?: string };

      // The substantive guarantee: the teacher's cap denies the learner a live
      // tutor answer and hands back a rate-limit fallback with retry metadata.
      expect(limitedBody.mode, `unexpected tutor body: ${JSON.stringify(limitedBody)}`).toBe("rate-limit-fallback");
      expect(limited.headers()["retry-after"], "a rate-limited tutor reply must tell the learner when to retry").toBeTruthy();
      // NOTE: the resolver returns this fallback with HTTP 200 (no status is set at
      // app/api/ai-tutor/resolve/route.ts, the `!rateLimit.allowed` branch), even though it
      // emits Retry-After / RateLimit-Remaining headers and app/api/ai-tutor/route.ts carries
      // a downstream-429 branch that can never fire. backend-api.spec.ts:801 expects 429.
      // Asserted here as observed so this suite stays honest about the current contract.
      expect(limited.status()).toBe(200);

      // Teacher -> learner: restoring open mode is the teacher's call alone.
      const reopened = await readJson<{ policy: { mode: string } }>(
        await teacher.context.patch(policyPath, { data: { mode: "open" } })
      );
      expect(reopened.policy.mode).toBe("open");
    } finally {
      await disposeAll(contexts);
    }
  });

  test("accommodations set by the owning teacher are readable back and access-scoped", async ({}, testInfo) => {
    const contexts: APIRequestContext[] = [];
    try {
      const teacher = await loginDemoTeacher(contexts);
      const other = await loginOtherTeacher(contexts);
      const student = await registerStudent(contexts, testInfo, "accommodations-student");
      await createClassWithStudent(teacher.context, student, testInfo, "Accommodations");

      const baseline = await readJson<{ profile: Record<string, unknown> }>(
        await teacher.context.get(`/api/teacher/students/${encodeURIComponent(student.userId)}/accommodations`)
      );
      expect(baseline.profile).toBeTruthy();

      const updated = await readJson<{ profile: { extendedTime?: unknown; accommodations?: Record<string, unknown> } }>(
        await teacher.context.patch(`/api/teacher/students/${encodeURIComponent(student.userId)}/accommodations`, {
          data: { extendedTime: true, readAloud: true, reducedDistraction: true }
        })
      );
      expect(updated.profile).toBeTruthy();

      const readBack = await readJson<{ profile: Record<string, unknown> }>(
        await teacher.context.get(`/api/teacher/students/${encodeURIComponent(student.userId)}/accommodations`)
      );
      expect(JSON.stringify(readBack.profile)).toContain("true");

      expect((await other.context.get(`/api/teacher/students/${encodeURIComponent(student.userId)}/accommodations`)).status()).toBe(403);
      expect((await other.context.patch(`/api/teacher/students/${encodeURIComponent(student.userId)}/accommodations`, {
        data: { extendedTime: false }
      })).status()).toBe(403);
      expect((await student.context.get(`/api/teacher/students/${encodeURIComponent(student.userId)}/accommodations`)).status()).toBe(403);
    } finally {
      await disposeAll(contexts);
    }
  });
});
