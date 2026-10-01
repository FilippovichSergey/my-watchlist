import { afterEach, describe, expect, it, vi } from "vitest";
import type { JWT } from "next-auth/jwt";
import { idTokenExpiry, refreshGoogleIdToken } from "./google-token";

const b64 = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
const fakeIdToken = (payload: Record<string, unknown>) => `${b64({ alg: "RS256" })}.${b64(payload)}.signature`;
const client = { clientId: "cid", clientSecret: "secret" };
const stored: JWT = { sub: "1", idToken: "old-id-token", refreshToken: "refresh-1", expiresAt: 1 };

function googleAnswers(body: unknown, status = 200) {
  return vi.fn(async () => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } }));
}

afterEach(() => vi.restoreAllMocks());

describe("idTokenExpiry", () => {
  it("reads exp from the payload", () => {
    expect(idTokenExpiry(fakeIdToken({ sub: "1", exp: 1_800_000_000 }))).toBe(1_800_000_000);
  });

  it("is undefined for missing or malformed tokens", () => {
    expect(idTokenExpiry(undefined)).toBeUndefined();
    expect(idTokenExpiry("not.a-jwt")).toBeUndefined();
    expect(idTokenExpiry("a.b.c")).toBeUndefined();
    expect(idTokenExpiry(fakeIdToken({ sub: "1" }))).toBeUndefined();
  });
});

describe("refreshGoogleIdToken", () => {
  it("posts a refresh_token grant and schedules renewal by the ID token's own exp", async () => {
    const exp = Math.floor(Date.now() / 1000) + 3000;
    const idToken = fakeIdToken({ sub: "1", exp });
    const fetchImpl = googleAnswers({ access_token: "a", expires_in: 3599, id_token: idToken });

    const result = await refreshGoogleIdToken(stored, client, fetchImpl as unknown as typeof fetch);

    expect(result.idToken).toBe(idToken);
    expect(result.expiresAt).toBe(exp);
    expect(result.refreshToken).toBe("refresh-1");
    expect(result.error).toBeUndefined();
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://oauth2.googleapis.com/token");
    const form = new URLSearchParams(String(init.body));
    expect(form.get("grant_type")).toBe("refresh_token");
    expect(form.get("refresh_token")).toBe("refresh-1");
    expect(form.get("client_id")).toBe("cid");
    expect(form.get("client_secret")).toBe("secret");
  });

  it("falls back to expires_in only when the ID token carries no exp", async () => {
    const fetchImpl = googleAnswers({ expires_in: 3599, id_token: fakeIdToken({ sub: "1" }) });
    const before = Math.floor(Date.now() / 1000);
    const result = await refreshGoogleIdToken(stored, client, fetchImpl as unknown as typeof fetch);
    expect(result.expiresAt).toBeGreaterThanOrEqual(before + 3599);
    expect(result.expiresAt).toBeLessThanOrEqual(before + 3605);
  });

  it("keeps the old refresh token unless Google rotates it", async () => {
    const rotated = googleAnswers({ id_token: fakeIdToken({ exp: 9 }), refresh_token: "refresh-2" });
    expect((await refreshGoogleIdToken(stored, client, rotated as unknown as typeof fetch)).refreshToken).toBe("refresh-2");
  });

  it("flags the session when the response has no id_token", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const fetchImpl = googleAnswers({ access_token: "a", expires_in: 3599 });
    const result = await refreshGoogleIdToken(stored, client, fetchImpl as unknown as typeof fetch);
    expect(result.error).toBe("RefreshTokenError");
    expect(result.idToken).toBe("old-id-token");
  });

  it("flags the session when Google rejects the grant", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const fetchImpl = googleAnswers({ error: "invalid_grant" }, 400);
    expect((await refreshGoogleIdToken(stored, client, fetchImpl as unknown as typeof fetch)).error).toBe("RefreshTokenError");
  });

  it("flags the session without calling Google when there is no refresh token", async () => {
    const fetchImpl = googleAnswers({});
    const result = await refreshGoogleIdToken({ ...stored, refreshToken: undefined }, client, fetchImpl as unknown as typeof fetch);
    expect(result.error).toBe("RefreshTokenError");
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
