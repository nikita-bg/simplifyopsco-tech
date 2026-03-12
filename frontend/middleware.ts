import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const sessionCookie =
    req.cookies.get("__Secure-neon-auth.session_token") ||
    req.cookies.get("neon-auth.session_token");

  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/auth/sign-in", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
