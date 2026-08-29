import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/server/auth";
import { getAdaptiveUniverseSnapshot } from "@/lib/server/userStore";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  if (authenticated.user.role !== "student") {
    return NextResponse.json({
      error: "Student access required.",
      reason: "student-only",
      guard: {
        en: "The Math Universe map is available only to the signed-in student in the P1 pilot loop.",
        zh: "P1 試點閉環中，數學宇宙星圖只對已登入學生本人開放。", zhHans: "P1 试点闭环中，数学宇宙星图只对已登录学生本人开放。"
      }
    }, { status: 403 });
  }

  const universe = await getAdaptiveUniverseSnapshot({
    userId: authenticated.user.id,
    curriculumTrack: authenticated.user.curriculumProfile
  });

  return NextResponse.json({ universe });
}
