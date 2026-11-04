import { NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { ENTRIES_TAG, proxyToBackend } from "@/lib/backend";

export async function POST(req: NextRequest) {
  return proxyToBackend(req, "/api/entries/refresh", { method: "POST" });
}

/** Progress polling; the background run changes rows as it goes, so each poll also drops the public cache. */
export async function GET(req: NextRequest) {
  const res = await proxyToBackend(req, "/api/entries/refresh");
  if (res.ok) revalidateTag(ENTRIES_TAG);
  return res;
}
