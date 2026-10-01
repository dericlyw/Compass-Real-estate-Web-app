"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ACCESS_COOKIE, accessToken } from "@/lib/access";

export async function enterAccessCode(fd: FormData) {
  const code = process.env.PROPVID_ACCESS_CODE;
  const given = String(fd.get("code") ?? "");
  const nextRaw = String(fd.get("next") ?? "/");
  const next = nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/"; // no open redirects
  if (!code) redirect(next);
  if (given !== code) redirect(`/access?error=1&next=${encodeURIComponent(next)}`);
  const jar = await cookies();
  const opts = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production" && !process.env.PROPVID_INSECURE_COOKIE, path: "/", maxAge: 60 * 60 * 24 * 30 };
  jar.set(ACCESS_COOKIE, await accessToken(code), opts);
  const name = String(fd.get("name") ?? "").trim().slice(0, 60);
  if (name) jar.set("pv_user", name, { ...opts });
  redirect(next);
}
