import type { JWT } from "next-auth/jwt";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

export interface GoogleClient {
  clientId: string;
  clientSecret: string;
}

/**
 * The `exp` claim (Unix seconds) of an ID token, read without verifying the signature: the Spring
 * backend does the authoritative check, this only schedules renewal. Google's `expires_in` describes
 * the access token, so it must not be used for the ID token we actually forward.
 */
export function idTokenExpiry(idToken: string | undefined): number | undefined {
  if (!idToken) return undefined;
  const parts = idToken.split(".");
  if (parts.length !== 3) return undefined;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    return typeof payload.exp === "number" ? payload.exp : undefined;
  } catch {
    return undefined;
  }
}

/** Exchanges the stored refresh token for a fresh Google ID token; marks the session on failure. */
export async function refreshGoogleIdToken(
  token: JWT,
  client: GoogleClient,
  fetchImpl: typeof fetch = fetch
): Promise<JWT> {
  if (!token.refreshToken) {
    return { ...token, error: "RefreshTokenError" };
  }
  try {
    const res = await fetchImpl(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: client.clientId,
        client_secret: client.clientSecret,
        grant_type: "refresh_token",
        refresh_token: token.refreshToken,
      }),
    });
    const data = await res.json();
    if (!res.ok || typeof data.id_token !== "string") {
      throw new Error(typeof data.error === "string" ? data.error : `HTTP ${res.status}`);
    }
    return {
      ...token,
      idToken: data.id_token,
      expiresAt: idTokenExpiry(data.id_token) ?? Math.floor(Date.now() / 1000) + Number(data.expires_in ?? 3600),
      refreshToken: typeof data.refresh_token === "string" ? data.refresh_token : token.refreshToken,
      error: undefined,
    };
  } catch (err) {
    console.error("Google token refresh failed:", err);
    return { ...token, error: "RefreshTokenError" };
  }
}
