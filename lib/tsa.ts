import { fromB64, fromHex, toB64 } from "@/lib/crypto";

// RFC 3161 trusted timestamps from free public time-stamping authorities. A timestamp token over a
// document's SHA-256 proves the document existed, unchanged, at that moment, and neither party can
// alter that proof later. Anyone can check it with OpenSSL (openssl ts -verify).

const TSA_URLS = ["http://timestamp.digicert.com", "https://freetsa.org/tsr", "http://timestamp.sectigo.com"];

function derLen(n: number): number[] {
  if (n < 128) return [n];
  if (n < 256) return [0x81, n];
  return [0x82, n >> 8, n & 255];
}
function der(tag: number, content: ArrayLike<number>): number[] {
  return [tag, ...derLen(content.length), ...Array.from(content)];
}

// TimeStampReq { version 1, messageImprint (SHA-256), nonce, certReq TRUE }
export function buildTimestampRequest(sha256Hex: string, nonce?: Uint8Array | null): Uint8Array {
  const hash = fromHex(sha256Hex);
  if (hash.length !== 32) throw new Error("Expected a SHA-256 digest");
  const sha256Oid = [0x60, 0x86, 0x48, 0x01, 0x65, 0x03, 0x04, 0x02, 0x01];
  const algorithm = der(0x30, [...der(0x06, sha256Oid), 0x05, 0x00]);
  const imprint = der(0x30, [...algorithm, ...der(0x04, hash)]);
  const parts: number[] = [...der(0x02, [1]), ...imprint];
  if (nonce) {
    const n = Array.from(nonce);
    parts.push(...der(0x02, n[0] >= 0x80 ? [0, ...n] : n));
  }
  parts.push(...der(0x01, [0xff]));
  return Uint8Array.from(der(0x30, parts));
}

// Reads PKIStatus from a TimeStampResp. 0 = granted, 1 = granted with modifications.
export function readTimestampStatus(resp: Uint8Array): number {
  let i = 0;
  const readHeader = () => {
    const tag = resp[i++];
    let len = resp[i++];
    if (len & 0x80) {
      const bytes = len & 0x7f;
      len = 0;
      for (let k = 0; k < bytes; k++) len = (len << 8) | resp[i++];
    }
    return { tag, len };
  };
  const outer = readHeader();
  if (outer.tag !== 0x30) return -1;
  const info = readHeader();
  if (info.tag !== 0x30) return -1;
  const status = readHeader();
  if (status.tag !== 0x02 || status.len !== 1) return -1;
  return resp[i];
}

export type StampResult = { ok: true; url: string; tokenB64: string } | { ok: false; error: string };

export async function requestTimestamp(sha256Hex: string): Promise<StampResult> {
  const nonce = crypto.getRandomValues(new Uint8Array(8));
  const body = buildTimestampRequest(sha256Hex, nonce);
  let lastError = "no authority reachable";
  for (const url of TSA_URLS) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10_000);
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/timestamp-query" },
        body: body as BodyInit,
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!res.ok) {
        lastError = `${url} answered ${res.status}`;
        continue;
      }
      const bytes = new Uint8Array(await res.arrayBuffer());
      const status = readTimestampStatus(bytes);
      if (status === 0 || status === 1) return { ok: true, url, tokenB64: toB64(bytes) };
      lastError = `${url} refused (status ${status})`;
    } catch (err) {
      lastError = `${url}: ${(err as Error).message}`;
    }
  }
  return { ok: false, error: lastError };
}

export function tokenBytes(b64: string): Uint8Array {
  return fromB64(b64);
}
