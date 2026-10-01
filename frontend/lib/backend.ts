import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import {
  MAX_WRITE_BODY_BYTES,
  readBodyLimited,
  rejectCrossOrigin,
  rejectNavigationOrCrossSite,
  rejectNonJson,
} from "./request-guards";
import type { Entry } from "./types";

// Server-only: the browser never talks to the Spring backend directly.
const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8080";

/** Public list for the home page (rendered on the server, no credentials). */
export async function fetchPublicEntries(): Promise<Entry[]> {
  const res = await fetch(`${BACKEND_URL}/api/entries`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Backend responded ${res.status}`);
  return res.json();
}

/**
 * Forwards an admin request to the backend with the signed-in user's Google ID token.
 * The token lives only in the encrypted Auth.js cookie, so browser scripts cannot read it.
 * Order matters: session first, then Fetch Metadata, origin and media type, and only then the (bounded) body.
 */
export async function proxyToBackend(
  req: NextRequest,
  path: string,
  init: { method: "GET" | "POST" | "DELETE"; forwardBody?: boolean } = { method: "GET" }
): Promise<NextResponse> {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");

  // Auth.js prefixes the cookie with __Secure- on https; look for whichever variant the browser sent
  const secureCookie = req.cookies.getAll().some((c) => c.name.startsWith("__Secure-authjs.session-token"));
  const token = await getToken({ req, secret, secureCookie });
  if (!token?.idToken) {
    return NextResponse.json({ detail: "Not signed in" }, { status: 401 });
  }
  const expired = token.error !== undefined || (token.expiresAt !== undefined && Date.now() >= token.expiresAt * 1000);
  if (expired) {
    // The client refreshes the session (which renews the token) and retries once
    return NextResponse.json({ detail: "Session expired" }, { status: 401 });
  }

  // Only fetch() calls from our own pages: refuses navigations and other sites, on GET as well
  const notOurs = rejectNavigationOrCrossSite(req);
  if (notOurs) return notOurs;

  let body: string | undefined;
  if (init.method !== "GET") {
    const rejected = rejectCrossOrigin(req);
    if (rejected) return rejected;
  }
  if (init.forwardBody) {
    const rejected = rejectNonJson(req);
    if (rejected) return rejected;
    const text = await readBodyLimited(req);
    if (text === null) {
      return NextResponse.json({ detail: `Request body exceeds ${MAX_WRITE_BODY_BYTES} bytes` }, { status: 413 });
    }
    body = text;
  }

  const res = await fetch(`${BACKEND_URL}${path}`, {
    method: init.method,
    headers: {
      Authorization: `Bearer ${token.idToken}`,
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body,
    cache: "no-store",
  });
  // A Response may not carry a body for these statuses
  const responseBody = [204, 205, 304].includes(res.status) ? null : await res.text();
  return new NextResponse(responseBody, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("Content-Type") ?? "application/json" },
  });
}
