import { createNeonAuth } from "@neondatabase/auth/next/server";

let _auth: ReturnType<typeof createNeonAuth> | null = null;

export function getAuth() {
  if (!_auth) {
    const baseUrl = process.env.NEON_AUTH_BASE_URL;
    const secret = process.env.NEON_AUTH_COOKIE_SECRET;

    if (!baseUrl || !secret) {
      throw new Error(
        "Missing required auth environment variables: NEON_AUTH_BASE_URL and NEON_AUTH_COOKIE_SECRET must be set"
      );
    }

    _auth = createNeonAuth({
      baseUrl,
      cookies: {
        secret,
      },
    });
  }
  return _auth;
}
