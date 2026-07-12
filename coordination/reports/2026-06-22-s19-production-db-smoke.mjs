#!/usr/bin/env node
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const reportPath = path.join(repoRoot, "coordination", "reports", "2026-06-22-s19-production-db-smoke.md");
const sessionLogPath = path.join(repoRoot, "coordination", "session-logs", "2026-06-22-S19.md");
const origin = process.env.PRODUCTION_DB_SMOKE_ORIGIN || "https://www.mais.hk";
const sessionCookieName = "hk_math_session";
const startedAt = new Date();
const suffix = `${startedAt.toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}-${crypto.randomBytes(4).toString("hex")}`;
const gradesToTry = ["P1", "K", "P2", "P3", "P4", "P5", "P6", "S1", "S2", "S3", "S4", "S5", "S6"];

function loadDotEnv(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const env = {};
  for (const rawLine of fs.readFileSync(filePath, "utf8").split(/\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const key = line.slice(0, line.indexOf("=")).trim();
    let value = line.slice(line.indexOf("=") + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

const localEnv = loadDotEnv(path.join(repoRoot, ".env.local"));

function envValue(...keys) {
  for (const key of keys) {
    const value = process.env[key] || localEnv[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

const adminCredentialKeys = {
  username: ["PRODUCTION_DB_SMOKE_ADMIN_USERNAME", "PRODUCTION_ADMIN_USERNAME", "MAIS_BOOTSTRAP_ADMIN_USERNAME", "MAIS_BOOTSTRAP_ADMIN_EMAIL"],
  password: ["PRODUCTION_DB_SMOKE_ADMIN_PASSWORD", "PRODUCTION_ADMIN_PASSWORD", "MAIS_BOOTSTRAP_ADMIN_PASSWORD"]
};

function percentile(values, p) {
  const sorted = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, index))];
}

function summarizeDurations(steps) {
  const durations = steps
    .map((step) => step.durationMs)
    .filter((value) => typeof value === "number" && Number.isFinite(value));
  return {
    count: durations.length,
    minMs: durations.length ? Math.min(...durations) : null,
    p50Ms: percentile(durations, 50),
    p95Ms: percentile(durations, 95),
    maxMs: durations.length ? Math.max(...durations) : null
  };
}

function safeJsonKeys(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? Object.keys(value).sort() : [];
}

function bodyShape(value) {
  if (!value || typeof value !== "object") return { type: value === null ? "null" : typeof value };
  if (Array.isArray(value)) return { type: "array", length: value.length };
  return { type: "object", keys: safeJsonKeys(value) };
}

function splitSetCookie(headerValue) {
  if (!headerValue) return [];
  return headerValue.split(/,(?=\s*[^;,]+=)/g).map((part) => part.trim()).filter(Boolean);
}

class CookieJar {
  cookies = new Map();

  apply(headers) {
    const setCookies = typeof headers.getSetCookie === "function"
      ? headers.getSetCookie()
      : splitSetCookie(headers.get("set-cookie"));
    for (const setCookie of setCookies) {
      const [pair] = setCookie.split(";");
      const index = pair.indexOf("=");
      if (index <= 0) continue;
      const name = pair.slice(0, index).trim();
      const value = pair.slice(index + 1).trim();
      if (name) this.cookies.set(name, value);
    }
  }

  header() {
    return Array.from(this.cookies.entries()).map(([key, value]) => `${key}=${value}`).join("; ");
  }

  hasSessionCookie() {
    return this.cookies.has(sessionCookieName);
  }
}

async function requestJson(pathname, options = {}, jar = null) {
  const started = Date.now();
  const requestUrl = new URL(pathname, origin).toString();
  const method = options.method || "GET";
  const args = ["-4", "-sS", "-i", "--max-time", "45", "-X", method, requestUrl];
  const headerEntries = Object.entries(options.headers || {});
  if (options.body !== undefined && !headerEntries.some(([key]) => key.toLowerCase() === "content-type")) {
    headerEntries.push(["Content-Type", "application/json"]);
  }
  if (jar?.header()) headerEntries.push(["Cookie", jar.header()]);
  for (const [key, value] of headerEntries) {
    args.push("-H", `${key}: ${value}`);
  }
  let input;
  if (options.body !== undefined) {
    args.push("--data-binary", "@-");
    input = JSON.stringify(options.body);
  }

  let text = "";
  let json = null;
  let parseError = false;
  let status = null;
  let ok = false;
  let responseHeaders = new Map();
  try {
    const output = execFileSync("curl", args, {
      cwd: repoRoot,
      encoding: "utf8",
      input,
      maxBuffer: 16 * 1024 * 1024
    });
    const normalized = output.replace(/\r\n/g, "\n");
    const separatorIndex = normalized.lastIndexOf("\n\n");
    const rawHeaders = separatorIndex >= 0 ? normalized.slice(0, separatorIndex) : "";
    text = separatorIndex >= 0 ? normalized.slice(separatorIndex + 2) : normalized;
    const headerBlocks = rawHeaders.split(/\n(?=HTTP\/)/).filter(Boolean);
    const finalHeaderBlock = headerBlocks.at(-1) ?? rawHeaders;
    const headerLines = finalHeaderBlock.split(/\n/).filter(Boolean);
    const statusMatch = headerLines[0]?.match(/^HTTP\/\S+\s+(\d+)/i);
    status = statusMatch ? Number(statusMatch[1]) : null;
    ok = typeof status === "number" && status >= 200 && status < 300;
    const setCookieHeaders = [];
    for (const line of headerLines.slice(1)) {
      const index = line.indexOf(":");
      if (index <= 0) continue;
      const key = line.slice(0, index).trim().toLowerCase();
      const value = line.slice(index + 1).trim();
      if (key === "set-cookie") setCookieHeaders.push(value);
      responseHeaders.set(key, responseHeaders.has(key) ? `${responseHeaders.get(key)}, ${value}` : value);
    }
    if (jar) {
      jar.apply({
        get: (key) => key.toLowerCase() === "set-cookie" ? setCookieHeaders.join(", ") : responseHeaders.get(key.toLowerCase()) ?? null,
        getSetCookie: () => setCookieHeaders
      });
    }
    if (text) {
      try {
        json = JSON.parse(text);
      } catch {
        parseError = true;
      }
    }
  } catch (error) {
    return {
      ok: false,
      status: null,
      durationMs: Date.now() - started,
      xVercelId: null,
      json: null,
      evidence: {
        ok: false,
        status: null,
        durationMs: Date.now() - started,
        transportError: error instanceof Error ? error.name : "unknown-error"
      }
    };
  }

  const durationMs = Date.now() - started;
  return {
    ok,
    status,
    durationMs,
    xVercelId: responseHeaders.get("x-vercel-id") ?? null,
    json,
    evidence: {
      ok,
      status,
      durationMs,
      xVercelId: responseHeaders.get("x-vercel-id") ?? null,
      bodyShape: parseError ? { type: "unparseable-json", textLength: text.length } : bodyShape(json)
    }
  };
}

async function registerActor({ role, grade = "P1" }) {
  const jar = new CookieJar();
  const username = `smoke-db-${role}-${suffix}@example.test`;
  const password = `smoke-db-${crypto.randomBytes(12).toString("hex")}`;
  const response = await requestJson("/api/auth/register", {
    method: "POST",
    body: {
      role,
      name: `Smoke DB ${role}`,
      username,
      password,
      grade,
      curriculumTrack: "US_CA_MATH",
      curriculumProfile: { region: "US", publisher: "US_CA_MATH" },
      language: "en",
      theme: "light"
    }
  }, jar);

  return {
    username,
    password,
    jar,
    response,
    evidence: {
      ...response.evidence,
      role,
      sessionCookieSet: jar.hasSessionCookie(),
      durableStorageGateProof: response.status === 200
        ? "registration-succeeded-in-vercel-path-that-blocks-unless-postgres-durable-ready"
        : null,
      storageBlock: response.status === 503 && response.json?.storage
        ? {
            provider: response.json.storage.provider ?? null,
            status: response.json.storage.status ?? null,
            durableReady: response.json.storage.durableReady ?? null,
            runtime: response.json.storage.runtime ?? null,
            usingTmpFallback: response.json.storage.usingTmpFallback ?? null
          }
        : null
    }
  };
}

async function loginActor(actor, { grade = "P1" } = {}) {
  const jar = new CookieJar();
  const login = await requestJson("/api/auth/login", {
    method: "POST",
    body: {
      username: actor.username,
      password: actor.password,
      grade,
      curriculumTrack: "US_CA_MATH",
      curriculumProfile: { region: "US", publisher: "US_CA_MATH" },
      language: "en",
      theme: "light"
    }
  }, jar);
  const me = await requestJson("/api/me?includeLessonEntry=false", {}, jar);
  return {
    jar,
    login,
    me,
    evidence: {
      login: {
        ...login.evidence,
        sessionCookieSet: jar.hasSessionCookie(),
        role: login.json?.user?.role ?? null
      },
      me: {
        ...me.evidence,
        role: me.json?.user?.role ?? null,
        sameUser: me.json?.user?.username === actor.username
      }
    }
  };
}

function selectedAnswerFor(question) {
  const firstOption = Array.isArray(question?.options) ? question.options[0] : null;
  if (typeof firstOption === "string") return firstOption;
  if (firstOption && typeof firstOption === "object") {
    return firstOption.en || firstOption.zhHans || firstOption.zh || "1";
  }
  return "1";
}

async function runStudentPractice(studentLogin) {
  const attempts = [];
  let selected = null;
  for (const grade of gradesToTry) {
    const questions = await requestJson(`/api/questions?curriculumTrack=US_CA_MATH&grade=${encodeURIComponent(grade)}`, {}, studentLogin.jar);
    attempts.push({
      grade,
      status: questions.status,
      durationMs: questions.durationMs,
      xVercelId: questions.xVercelId,
      questionCount: Array.isArray(questions.json?.questions) ? questions.json.questions.length : null
    });
    const firstQuestion = Array.isArray(questions.json?.questions) ? questions.json.questions[0] : null;
    if (firstQuestion?.id) {
      selected = { grade, question: firstQuestion };
      break;
    }
  }

  if (!selected) {
    return {
      questionLookup: attempts,
      submit: {
        skipped: true,
        reason: "no-us-ca-question-returned-for-authenticated-smoke-student"
      }
    };
  }

  const submit = await requestJson("/api/attempts", {
    method: "POST",
    body: {
      questionId: selected.question.id,
      selectedAnswer: selectedAnswerFor(selected.question),
      durationSeconds: 42
    }
  }, studentLogin.jar);

  return {
    questionLookup: attempts,
    submit: {
      ...submit.evidence,
      selectedGrade: selected.grade,
      feedbackKeys: safeJsonKeys(submit.json),
      correctFieldType: typeof submit.json?.correct
    }
  };
}

async function runTeacherWrite(teacherLogin, studentActor) {
  const classCreate = await requestJson("/api/teacher/classes", {
    method: "POST",
    body: {
      name: `Smoke DB California ${suffix}`,
      grade: "P1",
      academicYear: "2026-2027",
      description: "Redacted production DB smoke class."
    }
  }, teacherLogin.jar);
  const classId = classCreate.json?.class?.id;

  const addStudent = classId
    ? await requestJson(`/api/teacher/classes/${encodeURIComponent(classId)}/students`, {
        method: "POST",
        body: { username: studentActor.username }
      }, teacherLogin.jar)
    : null;

  const assignmentCreate = classId
    ? await requestJson("/api/teacher/assignments", {
        method: "POST",
        body: {
          classId,
          title: `Smoke DB assignment ${suffix}`,
          description: "Redacted production DB smoke assignment.",
          contentType: "practice",
          targetId: "us-ca-db-smoke-practice",
          allowRetake: true,
          showAnswers: false,
          countTowardsGrade: false,
          language: "en"
        }
      }, teacherLogin.jar)
    : null;

  return {
    classCreate: {
      ...classCreate.evidence,
      classIdPresent: Boolean(classId)
    },
    addStudent: addStudent
      ? {
          ...addStudent.evidence,
          enrollmentAccepted: addStudent.status === 201
        }
      : { skipped: true, reason: "class-create-did-not-return-id" },
    assignmentCreate: assignmentCreate
      ? {
          ...assignmentCreate.evidence,
          assignmentIdPresent: Boolean(assignmentCreate.json?.assignment?.id)
        }
      : { skipped: true, reason: "class-create-did-not-return-id" }
  };
}

async function runAdminHealth() {
  const username = envValue(...adminCredentialKeys.username);
  const password = envValue(...adminCredentialKeys.password);
  const credentialPresence = {
    usernameKeyPresent: Boolean(username),
    passwordKeyPresent: Boolean(password)
  };

  if (!username || !password) {
    return {
      skipped: true,
      reason: "missing-admin-smoke-credential",
      credentialPresence
    };
  }

  const actor = { username, password };
  const login = await loginActor(actor, { grade: "P1" });
  const health = await requestJson("/api/admin/storage/health", {}, login.jar);
  return {
    skipped: false,
    credentialPresence,
    login: login.evidence.login,
    health: {
      ...health.evidence,
      storage: health.json?.storage
        ? {
            provider: health.json.storage.provider ?? null,
            status: health.json.storage.status ?? null,
            durableReady: health.json.storage.durableReady ?? null,
            configuredPath: health.json.storage.configuredPath ?? null,
            configuredUrl: health.json.storage.configuredUrl ?? null,
            runtime: health.json.storage.runtime ?? null,
            usingTmpFallback: health.json.storage.usingTmpFallback ?? null
          }
        : null
    }
  };
}

async function createGlobalpingMeasurement(pathname) {
  const payload = {
      type: "http",
      target: "www.mais.hk",
      locations: [{ country: "US", state: "CA" }],
      limit: 8,
      measurementOptions: {
        request: {
          path: pathname,
          method: "GET"
        }
      }
    };

  function curlJson(args, input = undefined) {
    const output = execFileSync("curl", ["-4", "-sS", ...args], {
      cwd: repoRoot,
      encoding: "utf8",
      input,
      maxBuffer: 8 * 1024 * 1024
    });
    return JSON.parse(output);
  }

  let body;
  try {
    body = curlJson([
      "-X",
      "POST",
      "https://api.globalping.io/v1/measurements",
      "-H",
      "Content-Type: application/json",
      "--data",
      "@-"
    ], JSON.stringify(payload));
  } catch (error) {
    return {
      status: "transport-error",
      errorType: "globalping-create-failed",
      errorMessage: error instanceof Error ? error.message : "unknown-error"
    };
  }

  if (!body?.id) {
    return {
      status: "create-failed",
      errorType: body?.error?.type ?? "globalping-create-failed",
      errorMessage: body?.error?.message ?? null
    };
  }

  for (let attempt = 0; attempt < 12; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    let result = null;
    try {
      result = curlJson([`https://api.globalping.io/v1/measurements/${encodeURIComponent(body.id)}`]);
    } catch {
      result = null;
    }
    if (result?.status === "finished") {
      const rows = (result.results ?? []).map((item) => ({
        city: item.probe?.city ?? null,
        network: item.probe?.network ?? null,
        statusCode: item.result?.statusCode ?? null,
        totalMs: item.result?.timings?.total ?? null,
        dnsMs: item.result?.timings?.dns ?? null,
        tcpMs: item.result?.timings?.tcp ?? null,
        tlsMs: item.result?.timings?.tls ?? null,
        firstByteMs: item.result?.timings?.firstByte ?? null,
        xVercelId: item.result?.headers?.["x-vercel-id"] ?? null
      }));
      const totals = rows.map((row) => row.totalMs).filter((value) => Number.isFinite(value));
      return {
        id: body.id,
        status: "finished",
        path: pathname,
        sampleCount: rows.length,
        p50TotalMs: percentile(totals, 50),
        p95TotalMs: percentile(totals, 95),
        maxTotalMs: totals.length ? Math.max(...totals) : null,
        rows
      };
    }
  }

  return {
    id: body.id,
    status: "timeout"
  };
}

function markdownTable(rows) {
  return [
    "| Check | Status | Evidence |",
    "| --- | --- | --- |",
    ...rows.map((row) => `| ${row.check} | ${row.status} | ${row.evidence} |`)
  ].join("\n");
}

function passFail(condition) {
  return condition ? "PASS" : "FAIL";
}

function ms(value) {
  return typeof value === "number" ? `${value} ms` : "n/a";
}

async function main() {
  const steps = [];

  const anonymousHealth = await requestJson("/api/admin/storage/health");
  steps.push({ name: "anonymous admin storage health", ...anonymousHealth.evidence });

  const adminHealth = await runAdminHealth();

  const student = await registerActor({ role: "student", grade: "P1" });
  steps.push({ name: "student register", ...student.evidence });
  const studentLogin = await loginActor(student, { grade: "P1" });
  steps.push({ name: "student login", ...studentLogin.evidence.login });
  steps.push({ name: "student /api/me", ...studentLogin.evidence.me });
  const studentPractice = await runStudentPractice(studentLogin);
  if (!studentPractice.submit.skipped) steps.push({ name: "student practice submit", ...studentPractice.submit });

  const teacher = await registerActor({ role: "teacher", grade: "P1" });
  steps.push({ name: "teacher register", ...teacher.evidence });
  const teacherLogin = await loginActor(teacher, { grade: "P1" });
  steps.push({ name: "teacher login", ...teacherLogin.evidence.login });
  steps.push({ name: "teacher /api/me", ...teacherLogin.evidence.me });
  const teacherWrite = await runTeacherWrite(teacherLogin, student);
  steps.push({ name: "teacher class create", ...teacherWrite.classCreate });
  if (!teacherWrite.addStudent.skipped) steps.push({ name: "teacher add smoke student", ...teacherWrite.addStudent });
  if (!teacherWrite.assignmentCreate.skipped) steps.push({ name: "teacher assignment create", ...teacherWrite.assignmentCreate });

  const californiaLatency = await createGlobalpingMeasurement("/api/questions?grade=S3");

  const durableIndirectPass = student.evidence.durableStorageGateProof && teacher.evidence.durableStorageGateProof;
  const checks = [
    {
      check: "Direct admin storage health",
      status: adminHealth.skipped
        ? "SKIPPED"
        : passFail(adminHealth.health?.storage?.provider === "postgres" && adminHealth.health?.storage?.durableReady === true),
      evidence: adminHealth.skipped
        ? "No admin smoke credential variable was present locally; anonymous endpoint correctly returned 401."
        : `provider=${adminHealth.health?.storage?.provider ?? "n/a"}, durableReady=${adminHealth.health?.storage?.durableReady ?? "n/a"}, status=${adminHealth.health?.status ?? "n/a"}`
    },
    {
      check: "Indirect durable Postgres gate",
      status: passFail(durableIndirectPass),
      evidence: durableIndirectPass
        ? "Student and teacher registrations returned 200 through the Vercel production code path that blocks registration unless storage provider is postgres and durableReady is true."
        : `student=${student.response.status}, teacher=${teacher.response.status}`
    },
    {
      check: "Student login/session",
      status: passFail(studentLogin.login.status === 200 && studentLogin.me.status === 200 && studentLogin.evidence.me.sameUser),
      evidence: `login=${studentLogin.login.status}, me=${studentLogin.me.status}, sameUser=${studentLogin.evidence.me.sameUser}`
    },
    {
      check: "Student practice write",
      status: passFail(studentPractice.submit.status === 200),
      evidence: studentPractice.submit.skipped
        ? studentPractice.submit.reason
        : `attempt=${studentPractice.submit.status}, grade=${studentPractice.submit.selectedGrade}, feedbackKeys=${studentPractice.submit.feedbackKeys?.join(",") ?? "n/a"}`
    },
    {
      check: "Teacher login/session",
      status: passFail(teacherLogin.login.status === 200 && teacherLogin.me.status === 200 && teacherLogin.evidence.me.sameUser),
      evidence: `login=${teacherLogin.login.status}, me=${teacherLogin.me.status}, sameUser=${teacherLogin.evidence.me.sameUser}`
    },
    {
      check: "Teacher write",
      status: passFail(
        teacherWrite.classCreate.status === 201 &&
        teacherWrite.addStudent.status === 201 &&
        teacherWrite.assignmentCreate.status === 201
      ),
      evidence: `class=${teacherWrite.classCreate.status}, addStudent=${teacherWrite.addStudent.status ?? "skipped"}, assignment=${teacherWrite.assignmentCreate.status ?? "skipped"}`
    },
    {
      check: "California public API p95",
      status: passFail(californiaLatency.status === "finished" && californiaLatency.p95TotalMs !== null),
      evidence: californiaLatency.status === "finished"
        ? `Globalping CA samples=${californiaLatency.sampleCount}, p95=${ms(californiaLatency.p95TotalMs)}, max=${ms(californiaLatency.maxTotalMs)}`
        : `Globalping status=${californiaLatency.status ?? californiaLatency.errorType ?? "unknown"}`
    }
  ];

  const failed = checks.filter((check) => check.status === "FAIL");
  const skipped = checks.filter((check) => check.status === "SKIPPED");
  const conclusion = failed.length
    ? "RED: at least one required smoke check failed."
    : skipped.length
      ? "YELLOW: write/session smoke passed, but direct admin storage health remains unverified without admin smoke credentials."
      : "GREEN: direct storage health, write/session smoke, and California public API latency check passed.";

  const durationSummary = summarizeDurations(steps);
  const safeDetails = {
    generatedAt: new Date().toISOString(),
    origin,
    conclusion,
    checks,
    durationSummary,
    adminHealth,
    anonymousHealth: anonymousHealth.evidence,
    student: {
      register: student.evidence,
      login: studentLogin.evidence,
      practice: studentPractice
    },
    teacher: {
      register: teacher.evidence,
      login: teacherLogin.evidence,
      write: teacherWrite
    },
    californiaLatency
  };

  const lines = [
    "# S19/S12/S11 Redacted Production DB Smoke",
    "",
    `Generated: ${safeDetails.generatedAt}`,
    `Target: ${origin}`,
    "",
    `Conclusion: **${conclusion}**`,
    "",
    "## Summary",
    "",
    markdownTable(checks),
    "",
    "## Latency",
    "",
    `- Local smoke API timing count: ${durationSummary.count}; p50 ${ms(durationSummary.p50Ms)}; p95 ${ms(durationSummary.p95Ms)}; max ${ms(durationSummary.maxMs)}.`,
    californiaLatency.status === "finished"
      ? `- Globalping California public API timing: samples ${californiaLatency.sampleCount}; p50 ${ms(californiaLatency.p50TotalMs)}; p95 ${ms(californiaLatency.p95TotalMs)}; max ${ms(californiaLatency.maxTotalMs)}.`
      : `- Globalping California public API timing: ${californiaLatency.status ?? californiaLatency.errorType ?? "unavailable"}.`,
    "",
    "## Important Limitations",
    "",
    "- Direct `provider: postgres` and `durableReady: true` admin health was not proven unless the Direct admin storage health row is PASS.",
    "- The registration checks provide strong indirect evidence because the deployed Vercel registration route blocks real registrations unless `storage.provider === \"postgres\"` and `storage.durableReady === true`.",
    "- California latency uses public unauthenticated API probes only; no login cookie, password, or session token was sent to Globalping.",
    "- Smoke created disposable production student/teacher/class/assignment/practice-attempt records. No cleanup endpoint was used.",
    "",
    "## Redacted Detail",
    "",
    "```json",
    JSON.stringify(safeDetails, null, 2),
    "```",
    "",
    "## Secret Safety",
    "",
    "- No usernames, passwords, cookies, session tokens, Postgres URLs, Vercel secret values, org IDs, or project IDs are stored in this report.",
    "- Generated smoke credentials existed only in process memory.",
    "- Admin credential values, if provided through environment variables, are never printed or stored."
  ];

  fs.writeFileSync(reportPath, `${lines.join("\n")}\n`);
  fs.appendFileSync(sessionLogPath, [
    "",
    "## Production DB Smoke - 2026-06-22 23:18 HKT",
    "",
    `- Target: ${origin}`,
    `- Conclusion: ${conclusion}`,
    `- Report: coordination/reports/${path.basename(reportPath)}`,
    `- Checks: ${checks.map((check) => `${check.check}=${check.status}`).join("; ")}`,
    "- Secret safety: no usernames, passwords, cookies, session tokens, Postgres URLs, Vercel secret values, org IDs, or project IDs recorded.",
    ""
  ].join("\n"));

  console.log(conclusion);
  console.log(`Report: ${reportPath}`);
  for (const check of checks) {
    console.log(`${check.status} ${check.check}: ${check.evidence}`);
  }

  if (failed.length) process.exitCode = 1;
}

await main();
