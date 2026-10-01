import { NextResponse, type NextRequest } from "next/server";
import { accessToken } from "@/lib/access";

// When ACCESS_CODE is set (hosted pilot), the operator app needs the shared code.
// Landing pages stay public so test leads can be submitted from a phone.
export async function middleware(req: NextRequest) {
  const code = process.env.ACCESS_CODE;
  if (!code) return NextResponse.next();
  const { pathname, search } = req.nextUrl;
  if (pathname.startsWith("/lp/") || pathname === "/login") return NextResponse.next();
  if (req.cookies.get("pv_access")?.value === (await accessToken(code))) return NextResponse.next();
  if (pathname.startsWith("/api/")) return new NextResponse("Unauthorised", { status: 401 });
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = `?next=${encodeURIComponent(pathname + search)}`;
  return NextResponse.redirect(url);
}

export const config = { matcher: ["/((?!_next/|favicon.ico).*)"] };
