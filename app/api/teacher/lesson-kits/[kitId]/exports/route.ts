import { NextResponse } from "next/server";
import { canAccessTeacherArea, requireAuthenticatedUser } from "@/lib/server/auth";
import { getTeacherLessonKitDetailData } from "@/lib/server/userStore";
import {
  renderTeacherCoursewareExport,
  teacherCoursewareFileStem,
  teacherCoursewareManifestJson
} from "@/lib/server/teacherCoursewareExports";
import {
  buildTeacherCoursewareManifest,
  type TeacherCoursewareFormat,
  type TeacherCoursewareLanguage
} from "@/lib/server/teacherCoursewareManifest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const validFormats = new Set<TeacherCoursewareFormat | "json">(["json", "html", "pptx", "pdf"]);
const validLanguages = new Set<TeacherCoursewareLanguage>(["en", "zh", "zh-Hans"]);

function privateExportHeaders(contentHash: string) {
  return {
    "Cache-Control": "private, no-store, max-age=0",
    ETag: `"${contentHash}"`,
    "X-Content-Type-Options": "nosniff",
    "X-MAIS-Courseware-Manifest-SHA256": contentHash
  };
}

export async function GET(request: Request, { params }: { params: Promise<{ kitId: string }> }) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (!canAccessTeacherArea(authenticated.user)) return NextResponse.json({ error: "Teacher access required." }, { status: 403 });

  const url = new URL(request.url);
  const requestedFormat = url.searchParams.get("format") ?? "json";
  const requestedLanguage = url.searchParams.get("language") ?? "zh-Hans";
  if (!validFormats.has(requestedFormat as TeacherCoursewareFormat | "json")) {
    return NextResponse.json({ error: "Unsupported courseware export format." }, { status: 400 });
  }
  if (!validLanguages.has(requestedLanguage as TeacherCoursewareLanguage)) {
    return NextResponse.json({ error: "Unsupported courseware export language." }, { status: 400 });
  }

  const { kitId: encodedKitId } = await params;
  const kitId = decodeURIComponent(encodedKitId);
  const kit = await getTeacherLessonKitDetailData(authenticated.user.id, kitId);
  if (!kit) return NextResponse.json({ error: "Lesson kit not found." }, { status: 404 });

  const manifest = buildTeacherCoursewareManifest(kit);
  const commonHeaders = privateExportHeaders(manifest.version.contentHash);
  if (requestedFormat === "json") {
    return new NextResponse(teacherCoursewareManifestJson(manifest), {
      headers: {
        ...commonHeaders,
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="courseware-${encodeURIComponent(kit.id)}.json"`
      }
    });
  }

  const language = requestedLanguage as TeacherCoursewareLanguage;
  const format = requestedFormat as TeacherCoursewareFormat;
  const rendered = await renderTeacherCoursewareExport(manifest, format, language);
  const stem = teacherCoursewareFileStem(manifest, language);
  return new NextResponse(rendered.bytes, {
    headers: {
      ...commonHeaders,
      "Content-Type": rendered.mimeType,
      "Content-Disposition": `attachment; filename="courseware-${encodeURIComponent(kit.id)}.${rendered.extension}"; filename*=UTF-8''${encodeURIComponent(`${stem}.${rendered.extension}`)}`
    }
  });
}
