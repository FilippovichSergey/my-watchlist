import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/backend";

export async function GET(req: NextRequest) {
  return proxyToBackend(req, "/api/entries");
}

export async function POST(req: NextRequest) {
  // The proxy reads the body itself, after the session and origin checks and within a size limit
  return proxyToBackend(req, "/api/entries", { method: "POST", forwardBody: true });
}
