import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/session";

const protectedPaths = ["/dashboard", "/progress", "/mistake-book", "/teacher", "/parent", "/resource", "/assessment", "/messages", "/classroom/join", "/change-password"];

function isProtectedPath(pathname: string) {
  return protectedPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!isProtectedPath(pathname)) return NextResponse.next();

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (session) return NextResponse.next();

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);

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
    "/change-password"
  ]
};
