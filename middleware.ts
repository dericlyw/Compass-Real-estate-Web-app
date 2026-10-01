// Test-environment gate. When PROPVID_ACCESS_CODE is set, every page (including the public
// landing pages) needs the shared access code, and nothing is indexed by search engines.
// Unset locally, so development is unchanged. On Vercel, a missing code blocks everything.

import { NextResponse, type NextRequest } from "next/server";
import { ACCESS_COOKIE, accessToken } from "@/lib/access";

export async function middleware(req: NextRequest) {
  const code = process.env.PROPVID_ACCESS_CODE;
  if (!code) {
    // Fail closed on a host: never serve unreleased project material without a code,
    // unless someone deliberately opts in to a public deployment.
    if (process.env.VERCEL && process.env.PROPVID_PUBLIC !== "1") {
      return new NextResponse("PropVid test site is not configured yet: set PROPVID_ACCESS_CODE and redeploy.", {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8", "X-Robots-Tag": "noindex, nofollow" },
      });
    }
    return NextResponse.next();
  }

  const { pathname, search } = req.nextUrl;
  const open = pathname === "/access" || pathname.startsWith("/_next") || pathname === "/favicon.ico";
  const ok = open || req.cookies.get(ACCESS_COOKIE)?.value === (await accessToken(code));

  const res = ok
    ? NextResponse.next()
    : pathname.startsWith("/api/")
      ? new NextResponse("Access code required", { status: 401 })
      : NextResponse.redirect(new URL(`/access?next=${encodeURIComponent(pathname + search)}`, req.url));
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  return res;
}

export const config = { matcher: ["/((?!_next/static|_next/image).*)"] };
