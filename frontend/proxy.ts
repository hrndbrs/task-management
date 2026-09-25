import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "token";
const PUBLIC_PATHS = ["/login"];

export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  if (PUBLIC_PATHS.includes(pathname) || req.cookies.has(SESSION_COOKIE)) {
    return NextResponse.next();
  }

  const url = new URL("/login", req.nextUrl);
  if (pathname !== "/") url.searchParams.set("from", pathname + search);

  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!api/|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
