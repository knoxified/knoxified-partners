"use server";

import { headers } from "next/headers";
import { getJoin } from "@/lib/joinsession";
import { rateAllowed } from "@/lib/otp";
import { createHandoff, readHandoff } from "@/lib/handoff";
import { publicUrl } from "@/lib/mail";

export type StartResult = { ok: true; token: string; url: string } | { ok: false; error: string };
export type PollResult = { status: "waiting" | "received" | "expired"; png?: string };

export async function startJoinHandoff(): Promise<StartResult> {
  const state = await getJoin();
  if (!state?.verified) return { ok: false, error: "Your session expired. Please refresh the page." };
  const h = await headers();
  const ip = h.get("cf-connecting-ip") || (h.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";
  if (!(await rateAllowed(`handoff:ip:${ip}`, 12, 3600))) return { ok: false, error: "Too many attempts. Please try again later." };
  try {
    const token = await createHandoff({ inviteId: state.inviteId });
    return { ok: true, token, url: `${publicUrl()}/sig/${token}` };
  } catch {
    return { ok: false, error: "Could not create the link. Please try again." };
  }
}

export async function pollJoinHandoff(token: string): Promise<PollResult> {
  const state = await getJoin();
  if (!state) return { status: "expired" };
  return readHandoff(token, { inviteId: state.inviteId });
}
