import { NextResponse } from "next/server";

import { authorizeCronBearer } from "@/lib/server/cronAuthorization";
import { evaluateTeacherNoticeOperationalHealth } from
  "@/lib/server/teacherNoticeOperationalHealth";
import type { TeacherNoticeOperationalSnapshot } from
  "@/lib/server/userStore/teacherNoticeOperationalReadModel";

type TeacherNoticeOperationalHealthDependencies = {
  readCronSecret: () => unknown;
  readHealthSecret: () => unknown;
  readSnapshot: () => Promise<TeacherNoticeOperationalSnapshot>;
};

const privateNoStoreHeaders = {
  "Cache-Control": "private, no-store, max-age=0"
};

function stableStatusResponse(status: "unauthorized" | "unavailable", httpStatus: number) {
  return NextResponse.json(
    { status },
    { headers: privateNoStoreHeaders, status: httpStatus }
  );
}

export function createTeacherNoticeOperationalHealthHandler({
  readCronSecret,
  readHealthSecret,
  readSnapshot
}: TeacherNoticeOperationalHealthDependencies) {
  return async function handleTeacherNoticeOperationalHealth(request: Request) {
    let authorization: ReturnType<typeof authorizeCronBearer>;
    try {
      const healthSecret = readHealthSecret();
      const cronSecret = readCronSecret();
      if (healthSecret === cronSecret) {
        return stableStatusResponse("unavailable", 503);
      }
      authorization = authorizeCronBearer(
        request.headers.get("authorization"),
        healthSecret
      );
    } catch {
      return stableStatusResponse("unavailable", 503);
    }

    if (authorization === "unavailable") {
      return stableStatusResponse("unavailable", 503);
    }
    if (authorization === "unauthorized") {
      return stableStatusResponse("unauthorized", 401);
    }

    try {
      const health = evaluateTeacherNoticeOperationalHealth(await readSnapshot());
      return NextResponse.json(
        { health },
        {
          headers: privateNoStoreHeaders,
          status: health.status === "healthy" ? 200 : 503
        }
      );
    } catch {
      return stableStatusResponse("unavailable", 503);
    }
  };
}
