import { NextRequest, NextResponse } from "next/server";

/** Generous for a four-field JSON body whose longest field is a 2000-character note (UTF-8, maybe emoji). */
export const MAX_WRITE_BODY_BYTES = 16 * 1024;

export interface OriginPolicy {
  /** Fixed public origin such as https://my-watchlist-sf.vercel.app. When set, request headers are not consulted. */
  appOrigin?: string;
  /** Whether X-Forwarded-Host / X-Forwarded-Proto are set by a proxy we control (Vercel's is). */
  trustProxyHeaders: boolean;
}

export function originPolicyFromEnv(env: Record<string, string | undefined> = process.env): OriginPolicy {
  return {
    appOrigin: env.APP_ORIGIN?.trim() || undefined,
    trustProxyHeaders: env.VERCEL === "1" || env.AUTH_TRUST_HOST === "true",
  };
}

/** The origin our own pages are served from: configured, or derived from the request. */
export function expectedOrigin(req: NextRequest, policy: OriginPolicy): string | null {
  if (policy.appOrigin) return normalizeOrigin(policy.appOrigin);
  const forwardedHost = policy.trustProxyHeaders ? firstValue(req.headers.get("x-forwarded-host")) : null;
  const forwardedProto = policy.trustProxyHeaders ? firstValue(req.headers.get("x-forwarded-proto")) : null;
  const host = forwardedHost ?? req.headers.get("host");
  const proto = forwardedProto ?? req.nextUrl.protocol.replace(/:$/, "");
  return host ? normalizeOrigin(`${proto}://${host}`) : null;
}

/**
 * Cookie-authenticated writes must come from our own pages. Browsers always send Origin on
 * non-GET requests, so a missing origin or one that differs in scheme, host or port means a
 * cross-site or scripted caller. Returns the response to send instead, or null to proceed.
 */
export function rejectCrossOrigin(req: NextRequest, policy: OriginPolicy = originPolicyFromEnv()): NextResponse | null {
  const origin = req.headers.get("origin");
  const expected = expectedOrigin(req, policy);
  if (!origin || !expected || normalizeOrigin(origin) !== expected) {
    return NextResponse.json({ detail: "Cross-origin request rejected" }, { status: 403 });
  }
  return null;
}

/**
 * Fetch Metadata: our pages call these routes with fetch(), which browsers label
 * Sec-Fetch-Site: same-origin and Sec-Fetch-Dest: empty. Anything else is refused: a top-level
 * navigation (Sec-Fetch-Dest: document), a request from another site, or a client that sends no
 * Fetch Metadata at all, because a cookie-bearing navigation would otherwise spend the TMDB budget
 * even on GET. Every browser that can sign in here sends these headers (Chrome 76+, Firefox 90+,
 * Safari 16.4+); non-browser clients never hold the session cookie in the first place.
 */
export function rejectNavigationOrCrossSite(req: NextRequest): NextResponse | null {
  const site = req.headers.get("sec-fetch-site");
  const dest = req.headers.get("sec-fetch-dest");
  if (site !== "same-origin" || dest !== "empty") {
    return NextResponse.json({ detail: "Request must come from the application's own pages" }, { status: 403 });
  }
  return null;
}

/** Forms cannot send application/json, so insisting on it shuts the door on form-based CSRF. */
export function rejectNonJson(req: NextRequest): NextResponse | null {
  const type = req.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
  if (type !== "application/json") {
    return NextResponse.json({ detail: "Content-Type must be application/json" }, { status: 415 });
  }
  return null;
}

/** Reads at most `limit` bytes of the body; returns null when it is larger (answer 413). */
export async function readBodyLimited(req: NextRequest, limit = MAX_WRITE_BODY_BYTES): Promise<string | null> {
  const declared = Number(req.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > limit) return null;
  if (!req.body) return "";

  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

function normalizeOrigin(value: string): string | null {
  try {
    const { origin } = new URL(value);
    return origin === "null" ? null : origin;
  } catch {
    return null;
  }
}

function firstValue(header: string | null): string | null {
  const first = header?.split(",")[0].trim();
  return first ? first : null;
}
