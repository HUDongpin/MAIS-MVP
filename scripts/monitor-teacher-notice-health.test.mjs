import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import YAML from "yaml";

import {
  TEACHER_NOTICE_MONITOR_WORST_CASE_ORIGIN_MS,
  TEACHER_NOTICE_HEALTH_ORIGINS,
  monitorTeacherNoticeHealth,
  teacherNoticeMonitorRetryDelayMs
} from "./monitor-teacher-notice-health.mjs";

const secret = "fixture-health-secret-not-real-1234567890";

function healthyResponse(overrides = {}, headers = {}) {
  return new Response(JSON.stringify({
    health: {
      observedAt: "2026-08-24T12:00:00.000Z",
      reasons: [],
      scheduler: {
        candidateMatch: true,
        heartbeatAgeSeconds: 120,
        heartbeatStatus: "succeeded"
      },
      status: "healthy",
      ...overrides
    }
  }), {
    status: 200,
    headers: {
      "cache-control": "private, no-store, max-age=0",
      "content-type": "application/json",
      "x-vercel-cache": "MISS",
      ...headers
    }
  });
}

function unavailableResponse() {
  return new Response(JSON.stringify({
    health: {
      observedAt: "2026-08-24T12:00:00.000Z",
      reasons: ["scheduler-heartbeat-incomplete"],
      scheduler: {
        candidateMatch: true,
        heartbeatAgeSeconds: 30,
        heartbeatStatus: "started"
      },
      status: "unhealthy"
    }
  }), {
    status: 503,
    headers: {
      "cache-control": "private, no-store, max-age=0",
      "content-type": "application/json",
      "x-vercel-cache": "MISS"
    }
  });
}

test("monitor checks both exact production origins with authenticated read-only GET", async () => {
  const requests = [];
  const result = await monitorTeacherNoticeHealth({
    secret,
    fetchImpl: async (url, options) => {
      requests.push({ url, options });
      return healthyResponse();
    }
  });
  assert.equal(result.results.length, 2);
  assert.deepEqual(requests.map(({ url }) => url), TEACHER_NOTICE_HEALTH_ORIGINS.map(
    (origin) => `${origin}/api/health/teacher-notices`
  ));
  for (const request of requests) {
    assert.equal(request.options.method, "GET");
    assert.equal(request.options.redirect, "error");
    assert.equal(request.options.headers.authorization, `Bearer ${secret}`);
  }
});

test("monitor fails closed for stale/mismatched health, cached responses, cookies, and redirects", async () => {
  for (const response of [
    healthyResponse({ scheduler: { candidateMatch: false, heartbeatAgeSeconds: 10, heartbeatStatus: "succeeded" } }),
    healthyResponse({ scheduler: { candidateMatch: true, heartbeatAgeSeconds: 901, heartbeatStatus: "succeeded" } }),
    healthyResponse({}, { "x-vercel-cache": "HIT" }),
    healthyResponse({}, { "cache-control": "private-x, x-no-store" }),
    healthyResponse({}, {
      "cdn-cache-control": "private-x, x-no-store",
      "vercel-cdn-cache-control": "private, no-store"
    }),
    healthyResponse({}, {
      "cdn-cache-control": "private, no-store",
      "vercel-cdn-cache-control": "private-x, x-no-store"
    }),
    healthyResponse({}, { "set-cookie": "private=value" }),
    new Response("", { status: 307, headers: { location: "/login" } })
  ]) {
    await assert.rejects(
      monitorTeacherNoticeHealth({
        maxAttempts: 1,
        secret,
        fetchImpl: async () => response.clone()
      }),
      /health|cache|cookie/i
    );
  }
});

test("monitor drill intentionally fails only after both healthy origins were checked", async () => {
  let count = 0;
  await assert.rejects(
    monitorTeacherNoticeHealth({
      drillFailure: true,
      secret,
      fetchImpl: async () => {
        count += 1;
        return healthyResponse();
      }
    }),
    /MONITOR_ALERT_DRILL/
  );
  assert.equal(count, 2);
});

test("monitor never accepts arbitrary origins or a short credential", async () => {
  await assert.rejects(
    monitorTeacherNoticeHealth({ secret: "short", fetchImpl: async () => healthyResponse() }),
    /credential/i
  );
  await assert.rejects(
    monitorTeacherNoticeHealth({
      secret,
      origins: ["https://attacker.example", "https://www.mais.hk"],
      fetchImpl: async () => healthyResponse()
    }),
    /approved production boundary/i
  );
});

test("monitor retries a bounded in-progress heartbeat and recovers after success", async () => {
  const attemptsByOrigin = new Map();
  const delays = [];
  const result = await monitorTeacherNoticeHealth({
    secret,
    random: () => 0,
    sleep: async (milliseconds) => { delays.push(milliseconds); },
    fetchImpl: async (url) => {
      const origin = new URL(url).origin;
      const attempt = (attemptsByOrigin.get(origin) ?? 0) + 1;
      attemptsByOrigin.set(origin, attempt);
      return attempt === 1 ? unavailableResponse() : healthyResponse();
    }
  });
  assert.equal(result.results.length, 2);
  assert.deepEqual([...attemptsByOrigin.values()], [2, 2]);
  assert.deepEqual(delays, [25_000, 25_000]);
});

test("monitor still fails closed after three persistent unhealthy responses", async () => {
  let requests = 0;
  const delays = [];
  await assert.rejects(
    monitorTeacherNoticeHealth({
      secret,
      random: () => 0,
      sleep: async (milliseconds) => { delays.push(milliseconds); },
      fetchImpl: async () => {
        requests += 1;
        return unavailableResponse();
      }
    }),
    /not healthy/i
  );
  assert.equal(requests, 6);
  assert.deepEqual(delays.sort((left, right) => left - right), [25_000, 25_000, 50_000, 50_000]);
  assert.equal(teacherNoticeMonitorRetryDelayMs(0, () => 0.5), 27_500);
  assert.equal(teacherNoticeMonitorRetryDelayMs(1, () => 0.5), 52_500);
});

test("scheduled monitor is read-only, bounded, and supports an explicit alert drill", async () => {
  const text = await readFile(
    new URL("../.github/workflows/teacher-notice-health-monitor.yml", import.meta.url),
    "utf8"
  );
  const workflow = YAML.parse(text);
  assert.deepEqual(Object.keys(workflow.on).sort(), ["schedule", "workflow_dispatch"]);
  assert.deepEqual(workflow.on.schedule, [{ cron: "3-59/5 * * * *" }]);
  assert.equal(workflow.on.workflow_dispatch.inputs.alert_drill.type, "boolean");
  assert.equal(workflow.on.workflow_dispatch.inputs.alert_drill.default, false);
  assert.deepEqual(workflow.permissions, { contents: "read", issues: "write" });
  assert.deepEqual(workflow.concurrency, {
    group: "teacher-notice-production-health",
    "cancel-in-progress": false
  });
  assert.equal(workflow.jobs.health["timeout-minutes"], 5);
  assert.equal(workflow.jobs.health.environment, "production-health");
  assert.ok(
    workflow.jobs.health["timeout-minutes"] * 60_000 >=
      TEACHER_NOTICE_MONITOR_WORST_CASE_ORIGIN_MS + 2 * 60_000,
    "The parallel worst-case origin probe must leave at least two minutes for setup and alert delivery."
  );
  assert.ok(
    TEACHER_NOTICE_MONITOR_WORST_CASE_ORIGIN_MS < 5 * 60_000,
    "The monitor must finish its bounded retry window before the next five-minute probe."
  );
  const healthStep = workflow.jobs.health.steps.find((step) => step.id === "health_check");
  const checkout = workflow.jobs.health.steps.find((step) =>
    String(step.uses ?? "").startsWith("actions/checkout@")
  );
  assert.deepEqual(checkout.with, {
    ref: "${{ github.sha }}",
    "fetch-depth": 1,
    "persist-credentials": false
  });
  const binding = workflow.jobs.health.steps.find(
    (step) => step.name === "Bind the monitor to protected main"
  );
  assert.match(binding.run, /GITHUB_REPOSITORY" = "HUDongpin\/MAIS-MVP/u);
  assert.match(binding.run, /GITHUB_EVENT_NAME/u);
  assert.match(binding.run, /GITHUB_REF" = "refs\/heads\/main/u);
  assert.match(binding.run, /GITHUB_REF_PROTECTED" = "true/u);
  assert.match(binding.run, /teacher-notice-health-monitor\.yml@refs\/heads\/main/u);
  assert.match(binding.run, /git rev-parse --verify HEAD/u);
  assert.match(binding.run, /git status --porcelain=v1 --untracked-files=all/u);
  const command = healthStep.run;
  assert.match(command, /node scripts\/monitor-teacher-notice-health\.mjs/u);
  assert.match(command, /--drill-failure/u);
  assert.equal(
    healthStep.env.TEACHER_NOTICE_HEALTH_SECRET,
    "${{ secrets.TEACHER_NOTICE_HEALTH_SECRET }}"
  );
  assert.equal(healthStep["continue-on-error"], true);
  assert.match(
    text,
    /actions\/github-script@60a0d83039c74a4aee543508d2ffcb1c3799cdea/u
  );
  assert.match(text, /github\.paginate\(github\.rest\.issues\.listForRepo/u);
  assert.match(text, /MAIS teacher-notice production health alert/u);
  assert.match(text, /state:\s*"closed"/u);
  assert.match(text, /steps\.health_check\.outcome == 'failure'/u);
  assert.match(text, /steps\.health_check\.outcome == 'success'/u);
  assert.doesNotMatch(
    text,
    /pull_request_target|contents:\s*write|\bcurl\b/iu
  );
  assert.match(text, /do not duplicate the\n\s+# credential as a repository-level Actions secret/u);
});
