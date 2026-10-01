// Pilot access token: SHA-256 of the shared access code. Works in the Edge middleware and Node.
export async function accessToken(code: string): Promise<string> {
  const bytes = new TextEncoder().encode(`propvid:${code}`);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("");
}
