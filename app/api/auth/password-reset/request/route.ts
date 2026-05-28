import { NextResponse } from "next/server";
import { createPasswordResetRequest } from "@/lib/server/userStore";

export const runtime = "nodejs";

const exposeLocalResetLinks =
  process.env.NODE_ENV !== "production" || process.env.HK_MATH_EXPOSE_LOCAL_RESET_LINKS === "true";

async function sendPasswordResetEmail({
  to,
  resetUrl,
  expiresAt
}: {
  to: string;
  resetUrl: string;
  expiresAt: string;
}) {
  const subject = "HK Math Lab password reset";
  const text = [
    "A password reset was requested for your HK Math Lab account.",
    `Open this secure link to set a new password: ${resetUrl}`,
    `This link expires at ${expiresAt}.`,
    "If you did not request this, you can ignore this email."
  ].join("\n\n");

  if (process.env.RESEND_API_KEY && process.env.PASSWORD_RESET_FROM) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: process.env.PASSWORD_RESET_FROM,
        to,
        subject,
        text
      })
    });
    return response.ok ? "sent" : "failed";
  }

  if (process.env.PASSWORD_RESET_WEBHOOK_URL) {
    const response = await fetch(process.env.PASSWORD_RESET_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, subject, text, resetUrl, expiresAt })
    });
    return response.ok ? "sent" : "failed";
  }

  return "not-configured";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
  }

  if (!isRecord(body)) {
    return NextResponse.json({ error: "Request body must be an object." }, { status: 400 });
  }

  const identifier = typeof body.identifier === "string" ? body.identifier.trim() : "";
  if (!identifier) {
    return NextResponse.json({ error: "Email or username is required." }, { status: 400 });
  }

  const reset = await createPasswordResetRequest(identifier);
  const response: {
    ok: true;
    message: string;
    resetUrl?: string;
    expiresAt?: string;
    delivery?: "sent" | "failed" | "not-configured";
  } = {
    ok: true,
    message: "If an account exists, password reset instructions will be available."
  };

  if (reset?.email) {
    const resetUrl = new URL(`/reset-password?token=${encodeURIComponent(reset.token)}`, request.url).toString();
    response.delivery = await sendPasswordResetEmail({
      to: reset.email,
      resetUrl,
      expiresAt: reset.expiresAt
    });
  }

  if (exposeLocalResetLinks && reset) {
    response.resetUrl = new URL(`/reset-password?token=${encodeURIComponent(reset.token)}`, request.url).toString();
    response.expiresAt = reset.expiresAt;
  }

  return NextResponse.json(response);
}
