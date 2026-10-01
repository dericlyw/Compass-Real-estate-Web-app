// Shared-code access for test deployments (see middleware.ts). Web Crypto only, so it runs
// in both the edge middleware and server actions.

export const ACCESS_COOKIE = "pv_access";

/** Cookie value: a hash of the code, so the code itself is never stored in the browser. */
export async function accessToken(code: string): Promise<string> {
  const bytes = new TextEncoder().encode(`propvid-access:${code}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

export const testMode = () => Boolean(process.env.PROPVID_ACCESS_CODE);
