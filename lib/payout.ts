import "server-only";
import { decryptJson, encryptJson, masterSecret } from "@/lib/crypto";

// Bank and payout details are encrypted (AES-256-GCM) before they reach the database. Only the
// admin payout screen decrypts them; affiliates see a masked hint.
export type PayoutDetails = {
  holder: string;
  bank: string;
  account: string; // account number or IBAN
  swift: string;
  notes: string;
};

export const COMMON_CURRENCIES = ["USD", "EUR", "GBP", "AED", "NGN", "CAD", "AUD", "ZAR", "KES", "GHS", "INR", "PHP", "BRL", "MXN", "SGD"];

export function validatePayout(input: Record<string, string>): { ok: true; value: PayoutDetails & { currency: string; country: string; method: string } } | { ok: false; error: string } {
  const t = (k: string, max: number) => (input[k] ?? "").trim().slice(0, max);
  const currency = t("currency", 3).toUpperCase();
  const country = t("country", 60);
  const method = t("method", 30) === "other" ? "other" : "bank_transfer";
  const holder = t("holder", 120);
  const bank = t("bank", 120);
  const account = t("account", 64).replace(/\s+/g, " ");
  const swift = t("swift", 20).toUpperCase().replace(/\s+/g, "");
  const notes = t("notes", 300);
  if (!/^[A-Z]{3}$/.test(currency)) return { ok: false, error: "Enter a 3-letter currency code, for example USD." };
  if (country.length < 2) return { ok: false, error: "Enter the country of the account." };
  if (holder.length < 2) return { ok: false, error: "Enter the account holder's name." };
  if (method === "bank_transfer" && (bank.length < 2 || account.replace(/\s/g, "").length < 5))
    return { ok: false, error: "Enter the bank name and the account number or IBAN." };
  if (swift && !/^[A-Z0-9]{6,15}$/.test(swift)) return { ok: false, error: "The SWIFT/BIC code looks wrong." };
  return { ok: true, value: { currency, country, method, holder, bank, account, swift, notes } };
}

export function maskHint(account: string): string {
  const compact = account.replace(/\s+/g, "");
  return compact.length >= 4 ? `•••• ${compact.slice(-4)}` : "••••";
}

export async function encryptPayout(d: PayoutDetails): Promise<string> {
  return encryptJson(d, masterSecret(), "payout-details");
}
export async function decryptPayout(ciphertext: string): Promise<PayoutDetails> {
  return decryptJson<PayoutDetails>(ciphertext, masterSecret(), "payout-details");
}
