const enc = new TextEncoder();
const dec = new TextDecoder();

export function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
export function fromHex(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}
export function toB64(bytes: Uint8Array): string {
  const parts: string[] = [];
  for (let i = 0; i < bytes.length; i += 0x8000) parts.push(String.fromCharCode(...bytes.subarray(i, i + 0x8000)));
  return btoa(parts.join(""));
}
export function fromB64(b64: string): Uint8Array {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}
export function toB64Url(bytes: Uint8Array): string {
  return toB64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
export function fromB64Url(s: string): Uint8Array {
  const pad = "=".repeat((4 - (s.length % 4)) % 4);
  return fromB64(s.replace(/-/g, "+").replace(/_/g, "/") + pad);
}

export async function sha256Hex(data: string | Uint8Array): Promise<string> {
  const bytes = typeof data === "string" ? enc.encode(data) : data;
  return toHex(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes as BufferSource)));
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
}
export async function hmacHex(secret: string, data: string): Promise<string> {
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(secret), enc.encode(data));
  return toHex(new Uint8Array(sig));
}

export function timingSafeEqual(a: string, b: string): boolean {
  const x = enc.encode(a);
  const y = enc.encode(b);
  let diff = x.length ^ y.length;
  const n = Math.max(x.length, y.length);
  for (let i = 0; i < n; i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

// Uniform random digits / characters (rejection sampling, no modulo bias).
export function randomString(length: number, alphabet: string): string {
  const max = Math.floor(256 / alphabet.length) * alphabet.length;
  let out = "";
  while (out.length < length) {
    const buf = crypto.getRandomValues(new Uint8Array(length * 2));
    for (const b of buf) {
      if (b < max && out.length < length) out += alphabet[b % alphabet.length];
    }
  }
  return out;
}
export const randomDigits = (n: number) => randomString(n, "0123456789");

// Invite codes avoid look-alike characters (no 0/O, 1/I/L).
export const INVITE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
export function normalizeInviteCode(input: string): string {
  const s = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  // Strip the KNX prefix only when it is clearly the prefix (a code is 12 characters long).
  return s.length === 15 && s.startsWith("KNX") ? s.slice(3) : s;
}
export function formatInviteCode(core: string): string {
  return `KNX-${core.slice(0, 4)}-${core.slice(4, 8)}-${core.slice(8, 12)}`;
}

async function aesKey(secret: string, purpose: string): Promise<CryptoKey> {
  const raw = await crypto.subtle.digest("SHA-256", enc.encode(`${secret}:${purpose}`));
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
}

// AES-256-GCM. Output is base64(iv || ciphertext). The purpose string separates key uses.
export async function encryptJson(value: unknown, secret: string, purpose: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await aesKey(secret, purpose), enc.encode(JSON.stringify(value)))
  );
  const out = new Uint8Array(iv.length + ct.length);
  out.set(iv);
  out.set(ct, iv.length);
  return toB64(out);
}
export async function decryptJson<T>(b64: string, secret: string, purpose: string): Promise<T> {
  const all = fromB64(b64);
  const pt = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: all.slice(0, 12) },
    await aesKey(secret, purpose),
    all.slice(12)
  );
  return JSON.parse(dec.decode(pt)) as T;
}

// One master secret in the Worker; separate keys per use are derived from it.
export function masterSecret(): string {
  const s = process.env.PORTAL_SECRET;
  if (!s || s.length < 24) throw new Error("PORTAL_SECRET is not set (needs at least 24 characters)");
  return s;
}
