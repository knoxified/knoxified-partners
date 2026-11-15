import "server-only";
import { hmacHex, masterSecret } from "@/lib/crypto";

// Invite codes are stored only as a keyed hash, so a database leak does not reveal usable codes.
export async function inviteHash(core: string): Promise<string> {
  return hmacHex(masterSecret() + ":invite", core);
}
