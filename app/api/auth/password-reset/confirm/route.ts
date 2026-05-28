import { NextResponse } from "next/server";
import { sessionSecretMissingResponse, setSessionCookie } from "@/lib/server/sessionCookie";
import { resetUserPassword } from "@/lib/server/userStore";

export const runtime = "nodejs";

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

  const token = typeof body.token === "string" ? body.token : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!token || password.length < 5) {
    return NextResponse.json({ error: "A reset token and a password of at least 5 characters are required." }, { status: 400 });
  }

  const result = await resetUserPassword(token, password);
  if (result.status !== "reset") {
    return NextResponse.json({ error: "The reset link is invalid or expired." }, { status: 400 });
  }

  const response = NextResponse.json(result.session);
  try {
    await setSessionCookie(response, result.session.user.id, request);
  } catch {
    return sessionSecretMissingResponse();
  }

  return response;
}
