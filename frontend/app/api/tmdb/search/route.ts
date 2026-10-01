import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/backend";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  return proxyToBackend(req, `/api/tmdb/search?q=${encodeURIComponent(q)}`);
}
