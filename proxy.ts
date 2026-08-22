import { NextResponse, type NextRequest } from "next/server";
import { buildLoginRedirectUrl } from "@/lib/server/middlewareRedirect";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/session";

const protectedPaths = [
  "/dashboard",
  "/progress",
  "/mistake-book",
  "/teacher",
  "/parent",
  "/resource",
  "/assessment",
  "/messages",
  "/classroom/join",
  "/change-password",
  "/lesson",
  "/student/lessons"
];

function isProtectedPath(pathname: string) {
  return protectedPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!isProtectedPath(pathname)) return NextResponse.next();

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (session) return NextResponse.next();

  const loginUrl = buildLoginRedirectUrl({
    pathname,
    requestUrl: request.url,
    search: request.nextUrl.search
  });

  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/progress/:path*",
    "/mistake-book/:path*",
    "/teacher/:path*",
    "/parent/:path*",
    "/resource/:path*",
    "/assessment/:path*",
    "/messages/:path*",
    "/classroom/join",
    "/change-password",
    "/lesson/:path*",
    "/student/lessons/:path*"
  ]
};
