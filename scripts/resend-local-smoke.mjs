#!/usr/bin/env node

import assert from "node:assert/strict";

const defaultPayload = {
  from: "onboarding@resend.dev",
  to: "hudongpin@126.com",
  subject: "Hello World",
  html: "<p>Congrats on sending your <strong>first email</strong>!</p>"
};

function parseArgs(argv) {
  const args = {
    dryRun: false,
    selfTest: false,
    from: process.env.RESEND_SMOKE_FROM || defaultPayload.from,
    to: process.env.RESEND_SMOKE_TO || defaultPayload.to,
    subject: process.env.RESEND_SMOKE_SUBJECT || defaultPayload.subject,
    html: process.env.RESEND_SMOKE_HTML || defaultPayload.html
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--dry-run") {
      args.dryRun = true;
    } else if (arg === "--self-test") {
      args.selfTest = true;
    } else if (arg === "--from") {
      args.from = argv[++index] || "";
    } else if (arg === "--to") {
      args.to = argv[++index] || "";
    } else if (arg === "--subject") {
      args.subject = argv[++index] || "";
    } else if (arg === "--html") {
      args.html = argv[++index] || "";
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return args;
}

function readApiKey() {
  return (process.env.RESEND_API_KEY || "").trim();
}

function assertApiKey(apiKey) {
  if (!apiKey || apiKey === "re_xxxxxxxxx") {
    throw new Error(
      [
        "RESEND_API_KEY is not configured.",
        "Replace the placeholder `re_xxxxxxxxx` with your real Resend API key in a private environment variable.",
        "Do not commit or paste the real key into source files, logs, screenshots, or reports."
      ].join("\n")
    );
  }

  if (!apiKey.startsWith("re_")) {
    throw new Error("RESEND_API_KEY should look like a Resend key and start with `re_`.");
  }
}

function buildPayload(args) {
  const payload = {
    from: args.from.trim(),
    to: args.to.trim(),
    subject: args.subject.trim(),
    html: args.html
  };

  if (!payload.from || !payload.to || !payload.subject || !payload.html) {
    throw new Error("Resend smoke payload requires from, to, subject, and html.");
  }

  return payload;
}

function redactPayload(payload) {
  return {
    ...payload,
    html: payload.html.length > 80 ? `${payload.html.slice(0, 77)}...` : payload.html
  };
}

async function sendResendSmokeEmail({ apiKey, payload }) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  let body;
  try {
    body = await response.json();
  } catch {
    body = { message: await response.text() };
  }

  return {
    ok: response.ok,
    status: response.status,
    body
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const payload = buildPayload(args);
  const apiKey = readApiKey();

  if (args.selfTest) {
    assert.deepEqual(redactPayload(defaultPayload), defaultPayload);
    console.log("Resend smoke self-test passed");
    return;
  }

  if (args.dryRun) {
    console.log("Resend smoke dry run");
    console.log(JSON.stringify({ endpoint: "https://api.resend.com/emails", payload: redactPayload(payload) }, null, 2));
    return;
  }

  assertApiKey(apiKey);
  const result = await sendResendSmokeEmail({ apiKey, payload });
  if (!result.ok) {
    console.error(`Resend smoke email failed with HTTP ${result.status}`);
    console.error(JSON.stringify(result.body, null, 2));
    process.exitCode = 1;
    return;
  }

  console.log("Resend smoke email sent");
  console.log(JSON.stringify({ status: result.status, id: result.body?.id ?? null }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
