import { NextResponse } from "next/server";
import {
  bodyExpectedUserConstraints,
  expectedUserConstraintsFromRequest,
  guardExpectedAuthenticatedUser
} from "@/lib/server/auth";

type TeacherReportAuthenticatedIdentity = {
  user: {
    id: string;
  };
};

export function applyTeacherReportPrivateBoundary(response: Response) {
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("CDN-Cache-Control", "private, no-store");
  response.headers.set("Vercel-CDN-Cache-Control", "private, no-store");
  response.headers.set("X-Content-Type-Options", "nosniff");
  return response;
}

export function teacherReportPrivateJson(body: unknown, init?: ResponseInit) {
  return applyTeacherReportPrivateBoundary(NextResponse.json(body, init));
}

export function teacherReportPrivateResponse(body: BodyInit | null, init?: ResponseInit) {
  return applyTeacherReportPrivateBoundary(new NextResponse(body, init));
}

export function guardExpectedTeacherReportUser(
  authenticated: TeacherReportAuthenticatedIdentity,
  request: Request,
  body?: unknown
) {
  const conflict = guardExpectedAuthenticatedUser(authenticated, [
    ...expectedUserConstraintsFromRequest(request),
    ...bodyExpectedUserConstraints(body)
  ], { requireConstraint: true });
  return conflict ? applyTeacherReportPrivateBoundary(conflict) : null;
}

export function teacherReportUnavailable(message: string) {
  return teacherReportPrivateJson({ error: message }, { status: 503 });
}
