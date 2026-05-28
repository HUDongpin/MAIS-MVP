import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/server/auth";
import { clearMistakesForUser, getMistakes } from "@/lib/server/userStore";

export const runtime = "nodejs";

function readStatus(value: string | null) {
  if (value === "active" || value === "mastered") return value;
  return undefined;
}

export async function GET(request: Request) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const url = new URL(request.url);
  const status = readStatus(url.searchParams.get("status"));
  const mistakes = await getMistakes(authenticated.user.id, status);

  return NextResponse.json({ mistakes });
}

export async function DELETE(request: Request) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  await clearMistakesForUser(authenticated.user.id);
  return NextResponse.json({ ok: true });
}
