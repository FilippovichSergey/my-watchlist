import { NextRequest, NextResponse } from "next/server";
import { proxyToBackend } from "@/lib/backend";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) {
    return NextResponse.json({ detail: "Invalid id" }, { status: 400 });
  }
  return proxyToBackend(req, `/api/entries/${id}`, { method: "DELETE" });
}
