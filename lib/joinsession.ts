import { cookies } from "next/headers";
import { fromB64Url, hmacHex, masterSecret, timingSafeEqual, toB64Url } from "@/lib/crypto";

// The /join flow keeps its progress in a signed cookie (tamper-proof, expires in 30 minutes).
export type JoinState = {
  inviteId: string;
  name?: string;
  company?: string;
  email?: string;
  country?: string;
  verified?: boolean;
  verifiedAt?: string;
  exp: number;
};

const COOKIE = "kx_join";
const TTL_SECONDS = 30 * 60;
const enc = new TextEncoder();
const dec = new TextDecoder();

export async function signJoin(state: Omit<JoinState, "exp">): Promise<string> {
  const payload = toB64Url(enc.encode(JSON.stringify({ ...state, exp: Date.now() + TTL_SECONDS * 1000 })));
  const mac = await hmacHex(masterSecret() + ":join", payload);
  return `${payload}.${mac}`;
}

export async function readJoinValue(value: string | undefined): Promise<JoinState | null> {
  if (!value) return null;
  const [payload, mac] = value.split(".");
  if (!payload || !mac) return null;
  const expected = await hmacHex(masterSecret() + ":join", payload);
  if (!timingSafeEqual(expected, mac)) return null;
  try {
    const state = JSON.parse(dec.decode(fromB64Url(payload))) as JoinState;
    return state.exp > Date.now() && state.inviteId ? state : null;
  } catch {
    return null;
  }
}

export async function getJoin(): Promise<JoinState | null> {
  return readJoinValue((await cookies()).get(COOKIE)?.value);
}

export async function setJoin(state: Omit<JoinState, "exp">): Promise<void> {
  (await cookies()).set(COOKIE, await signJoin(state), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: TTL_SECONDS,
  });
}

export async function clearJoin(): Promise<void> {
  (await cookies()).delete(COOKIE);
}
