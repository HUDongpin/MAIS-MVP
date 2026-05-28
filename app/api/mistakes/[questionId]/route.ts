import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/server/auth";
import { deleteMistake, markMistakeMastered } from "@/lib/server/userStore";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    questionId: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { questionId } = await context.params;
  const mistake = await markMistakeMastered(authenticated.user.id, decodeURIComponent(questionId));
  if (!mistake) {
    return NextResponse.json({ error: "Mistake not found." }, { status: 404 });
  }

  return NextResponse.json({ mistake });
}

export async function DELETE(request: Request, context: RouteContext) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { questionId } = await context.params;
  const deleted = await deleteMistake(authenticated.user.id, decodeURIComponent(questionId));
  if (!deleted) {
    return NextResponse.json({ error: "Mistake not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, removed: true });
}
