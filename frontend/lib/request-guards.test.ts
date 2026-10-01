import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import {
  MAX_WRITE_BODY_BYTES,
  originPolicyFromEnv,
  readBodyLimited,
  rejectCrossOrigin,
  rejectNavigationOrCrossSite,
  rejectNonJson,
  type OriginPolicy,
} from "./request-guards";

const LOCAL = "http://localhost:3000/api/entries";
const direct: OriginPolicy = { trustProxyHeaders: false };
const behindProxy: OriginPolicy = { trustProxyHeaders: true };

function post(headers: Record<string, string>, body = "{}", url = LOCAL) {
  return new NextRequest(url, { method: "POST", headers, body });
}

function get(headers: Record<string, string>) {
  return new NextRequest(LOCAL, { method: "GET", headers });
}

describe("rejectCrossOrigin", () => {
  it("lets a same-origin request through", () => {
    expect(rejectCrossOrigin(post({ origin: "http://localhost:3000", host: "localhost:3000" }), direct)).toBeNull();
  });

  it("rejects a forged request from another origin", async () => {
    const res = rejectCrossOrigin(post({ origin: "https://evil.example.net", host: "localhost:3000" }), direct);
    expect(res?.status).toBe(403);
    expect(await res?.json()).toEqual({ detail: "Cross-origin request rejected" });
  });

  it("rejects a request without an Origin header", () => {
    expect(rejectCrossOrigin(post({ host: "localhost:3000" }), direct)?.status).toBe(403);
  });

  it("rejects the same host over a different scheme", () => {
    expect(rejectCrossOrigin(post({ origin: "https://localhost:3000", host: "localhost:3000" }), direct)?.status).toBe(403);
  });

  it("rejects the same host on a different port", () => {
    expect(rejectCrossOrigin(post({ origin: "http://localhost:3001", host: "localhost:3000" }), direct)?.status).toBe(403);
  });

  it("treats an explicit default port as the same origin", () => {
    const req = post(
      { origin: "https://app.example.com:443", host: "app.example.com", "x-forwarded-proto": "https" },
      "{}",
      "https://app.example.com/api/entries"
    );
    expect(rejectCrossOrigin(req, behindProxy)).toBeNull();
  });

  it("ignores forwarded headers unless the proxy is trusted", () => {
    const req = post({
      origin: "https://app.example.com",
      host: "localhost:3000",
      "x-forwarded-host": "app.example.com",
      "x-forwarded-proto": "https",
    });
    expect(rejectCrossOrigin(req, direct)?.status).toBe(403);
    expect(rejectCrossOrigin(req, behindProxy)).toBeNull();
  });

  it("uses the forwarded host, not the internal one, behind a trusted proxy", () => {
    const req = post({
      origin: "http://localhost:3000",
      host: "localhost:3000",
      "x-forwarded-host": "app.example.com",
      "x-forwarded-proto": "https",
    });
    expect(rejectCrossOrigin(req, behindProxy)?.status).toBe(403);
  });

  it("compares against the configured public origin when one is set", () => {
    const fixed: OriginPolicy = { appOrigin: "https://app.example.com", trustProxyHeaders: false };
    expect(rejectCrossOrigin(post({ origin: "https://app.example.com", host: "whatever:1" }), fixed)).toBeNull();
    expect(rejectCrossOrigin(post({ origin: "http://localhost:3000", host: "localhost:3000" }), fixed)?.status).toBe(403);
  });
});

describe("originPolicyFromEnv", () => {
  it("trusts proxy headers only on Vercel or when AUTH_TRUST_HOST is set", () => {
    expect(originPolicyFromEnv({}).trustProxyHeaders).toBe(false);
    expect(originPolicyFromEnv({ VERCEL: "1" }).trustProxyHeaders).toBe(true);
    expect(originPolicyFromEnv({ AUTH_TRUST_HOST: "true" }).trustProxyHeaders).toBe(true);
  });

  it("takes the configured origin and ignores an empty one", () => {
    expect(originPolicyFromEnv({ APP_ORIGIN: " https://app.example.com " }).appOrigin).toBe("https://app.example.com");
    expect(originPolicyFromEnv({ APP_ORIGIN: "" }).appOrigin).toBeUndefined();
  });
});

describe("rejectNavigationOrCrossSite", () => {
  it("lets a same-origin fetch through", () => {
    const req = get({ "sec-fetch-site": "same-origin", "sec-fetch-dest": "empty", "sec-fetch-mode": "cors" });
    expect(rejectNavigationOrCrossSite(req)).toBeNull();
  });

  it("refuses a top-level navigation, which would carry the SameSite=Lax cookie", () => {
    const req = get({ "sec-fetch-site": "cross-site", "sec-fetch-dest": "document", "sec-fetch-mode": "navigate" });
    expect(rejectNavigationOrCrossSite(req)?.status).toBe(403);
  });

  it("refuses fetches from another site or a sibling subdomain", () => {
    expect(rejectNavigationOrCrossSite(get({ "sec-fetch-site": "cross-site", "sec-fetch-dest": "empty" }))?.status).toBe(403);
    expect(rejectNavigationOrCrossSite(get({ "sec-fetch-site": "same-site", "sec-fetch-dest": "empty" }))?.status).toBe(403);
  });

  it("falls through when the client sends no Fetch Metadata", () => {
    expect(rejectNavigationOrCrossSite(get({}))).toBeNull();
  });
});

describe("rejectNonJson", () => {
  it("accepts application/json, with or without a charset", () => {
    expect(rejectNonJson(post({ "content-type": "application/json" }))).toBeNull();
    expect(rejectNonJson(post({ "content-type": "application/json; charset=utf-8" }))).toBeNull();
  });

  it("rejects the text/plain body a cross-site form could send", () => {
    expect(rejectNonJson(post({ "content-type": "text/plain" }))?.status).toBe(415);
  });
});

describe("readBodyLimited", () => {
  it("returns a small body intact", async () => {
    expect(await readBodyLimited(post({}, '{"tmdbId":1}'))).toBe('{"tmdbId":1}');
  });

  it("rejects a body whose declared length is too large without reading it", async () => {
    expect(await readBodyLimited(post({ "content-length": String(MAX_WRITE_BODY_BYTES + 1) }, "{}"))).toBeNull();
  });

  it("stops reading an undeclared body once the limit is exceeded", async () => {
    expect(await readBodyLimited(post({}, "x".repeat(MAX_WRITE_BODY_BYTES + 1)))).toBeNull();
  });

  it("accepts a body exactly at the limit", async () => {
    const exact = "x".repeat(MAX_WRITE_BODY_BYTES);
    expect(await readBodyLimited(post({}, exact))).toBe(exact);
  });
});
