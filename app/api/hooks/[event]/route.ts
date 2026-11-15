import { after, NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "@/lib/crypto";
import { handleCommission, handleDigest, handleLead, handleTimestamps } from "@/lib/notify";

export const dynamic = "force-dynamic";

// Called by the database (pg_net) when a lead or commission event happens, and by scheduled jobs.
// Protected by a shared secret; does its work after replying so the database never waits.
export async function POST(request: NextRequest, { params }: { params: Promise<{ event: string }> }) {
  const secret = process.env.PORTAL_HOOK_SECRET;
  const got = request.headers.get("x-portal-secret") ?? "";
  if (!secret || !timingSafeEqual(got, secret)) return new NextResponse("Unauthorized", { status: 401 });

  const { event } = await params;
  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const work = async () => {
    try {
      if (event === "lead") await handleLead(body as Parameters<typeof handleLead>[0]);
      else if (event === "commission") await handleCommission(body as Parameters<typeof handleCommission>[0]);
      else if (event === "digest") await handleDigest();
      else if (event === "timestamps") await handleTimestamps();
    } catch (err) {
      console.error(`hook ${event} failed:`, (err as Error).message);
    }
  };
  try {
    after(work);
  } catch {
    await work();
  }
  return NextResponse.json({ ok: true });
}
