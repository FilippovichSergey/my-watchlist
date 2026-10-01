import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { encode } from "next-auth/jwt";
import { proxyToBackend } from "./backend";

// Route-level: a real Auth.js session cookie (encrypted with the same secret and salt the app uses),
// a stubbed Spring backend, and the exact header sets browsers send.
const SECRET = "unit-test-secret-that-is-long-enough-for-auth-js";
const COOKIE = "authjs.session-token";
const now = () => Math.floor(Date.now() / 1000);

async function sessionCookie(claims: Record<string, unknown>) {
  return `${COOKIE}=${await encode({ token: claims, secret: SECRET, salt: COOKIE })}`;
}

function request(method: string, headers: Record<string, string>, body?: string) {
  return new NextRequest("http://localhost:3000/api/tmdb/search?q=dune", { method, headers, body });
}

const fromOurPage = { host: "localhost:3000", origin: "http://localhost:3000", "sec-fetch-site": "same-origin", "sec-fetch-dest": "empty" };

function stubBackend() {
  const backend = vi.fn(async () => new Response("[]", { status: 200, headers: { "content-type": "application/json" } }));
  vi.stubGlobal("fetch", backend);
  return backend;
}

beforeEach(() => {
  process.env.AUTH_SECRET = SECRET;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("proxyToBackend", () => {
  it("answers 401 without a session, before looking at anything else", async () => {
    const backend = stubBackend();
    const res = await proxyToBackend(request("GET", {}), "/api/tmdb/search?q=dune");
    expect(res.status).toBe(401);
    expect(backend).not.toHaveBeenCalled();
  });

  it("refuses a signed-in request that carries no Fetch Metadata, even on GET", async () => {
    const backend = stubBackend();
    const cookie = await sessionCookie({ sub: "1", idToken: "id-token", expiresAt: now() + 3600 });
    const res = await proxyToBackend(request("GET", { host: "localhost:3000", cookie }), "/api/tmdb/search?q=dune");
    expect(res.status).toBe(403);
    expect(backend).not.toHaveBeenCalled();
  });

  it("refuses a top-level navigation with the session cookie", async () => {
    stubBackend();
    const cookie = await sessionCookie({ sub: "1", idToken: "id-token", expiresAt: now() + 3600 });
    const headers = { host: "localhost:3000", cookie, "sec-fetch-site": "cross-site", "sec-fetch-dest": "document" };
    expect((await proxyToBackend(request("GET", headers), "/api/tmdb/search?q=dune")).status).toBe(403);
  });

  it("forwards a fetch from our own page with the Google token as bearer", async () => {
    const backend = stubBackend();
    const cookie = await sessionCookie({ sub: "1", idToken: "id-token", expiresAt: now() + 3600 });
    const res = await proxyToBackend(request("GET", { ...fromOurPage, cookie }), "/api/tmdb/search?q=dune");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
    const [url, init] = backend.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("http://localhost:8080/api/tmdb/search?q=dune");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer id-token");
  });

  it("treats an expired Google token as no session so the client refreshes and retries", async () => {
    const backend = stubBackend();
    const cookie = await sessionCookie({ sub: "1", idToken: "stale", expiresAt: now() - 10 });
    expect((await proxyToBackend(request("GET", { ...fromOurPage, cookie }), "/api/tmdb/search?q=dune")).status).toBe(401);
    expect(backend).not.toHaveBeenCalled();
  });

  it("rejects a write from another origin despite a valid session", async () => {
    const backend = stubBackend();
    const cookie = await sessionCookie({ sub: "1", idToken: "id-token", expiresAt: now() + 3600 });
    const headers = { ...fromOurPage, cookie, origin: "https://evil.example.net", "content-type": "application/json" };
    const res = await proxyToBackend(request("POST", headers, "{}"), "/api/entries", { method: "POST", forwardBody: true });
    expect(res.status).toBe(403);
    expect(backend).not.toHaveBeenCalled();
  });
});
