import "server-only";
import { decryptJson, encryptJson, masterSecret } from "@/lib/crypto";
import { CRYPTO_ASSETS, GIFT_CARDS, validWallet, type Method } from "@/lib/payout-options";

// Payout details are encrypted (AES-256-GCM) before they reach the database. Only the admin payout
// screen decrypts them; affiliates see a masked hint. `account` holds whatever identifies the
// destination for the chosen method: bank account or IBAN, PayPal email, wallet address, or the
// email a gift card is sent to.
export type PayoutDetails = {
  holder: string;
  bank: string;
  account: string;
  swift: string;
  notes: string;
  asset?: string;
  network?: string;
  card?: string;
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validatePayout(input: Record<string, string>): { ok: true; value: PayoutDetails & { currency: string; country: string; method: Method } } | { ok: false; error: string } {
  const t = (k: string, max: number) => (input[k] ?? "").trim().slice(0, max);
  const method = (["bank_transfer", "paypal", "crypto", "gift_card"].includes(t("method", 30)) ? t("method", 30) : "bank_transfer") as Method;
  const country = t("country", 60);
  const holder = t("holder", 120);
  const notes = t("notes", 300);
  const swift = t("swift", 20).toUpperCase().replace(/\s+/g, "");
  let account = t("account", 120);
  // Only bank transfers can be paid in a local currency; everything else is US dollars.
  const currency = method === "bank_transfer" ? t("currency", 3).toUpperCase() : "USD";
  if (!/^[A-Z]{3}$/.test(currency)) return { ok: false, error: "Choose a payout currency." };
  if (country.length < 2) return { ok: false, error: "Choose the country you live in or the account is in." };
  if (holder.length < 2) return { ok: false, error: "Enter your full name, exactly as on the account." };

  const base = { currency, country, method, holder, notes, swift: "", bank: "", account };
  if (method === "bank_transfer") {
    const bank = t("bank", 120);
    account = account.replace(/\s+/g, " ");
    if (bank.length < 2 || account.replace(/\s/g, "").length < 5) return { ok: false, error: "Enter the bank name and the account number or IBAN." };
    if (swift && !/^[A-Z0-9]{6,15}$/.test(swift)) return { ok: false, error: "The SWIFT/BIC code looks wrong." };
    return { ok: true, value: { ...base, bank, account, swift } };
  }
  if (method === "paypal") {
    if (!EMAIL.test(account)) return { ok: false, error: "Enter the email address of your PayPal account." };
    return { ok: true, value: { ...base, account: account.toLowerCase() } };
  }
  if (method === "gift_card") {
    const card = t("card", 40);
    if (!GIFT_CARDS.includes(card)) return { ok: false, error: "Choose which gift card you want." };
    if (!EMAIL.test(account)) return { ok: false, error: "Enter the email address to send the gift card to." };
    return { ok: true, value: { ...base, account: account.toLowerCase(), card } };
  }
  // crypto
  const asset = t("asset", 10);
  const network = t("network", 20);
  if (!CRYPTO_ASSETS.some((a) => a.value === asset)) return { ok: false, error: "Choose USDT or USDC." };
  if (!CRYPTO_ASSETS.find((a) => a.value === asset)!.networks.some((n) => n.value === network)) return { ok: false, error: "Choose a network for that coin." };
  account = account.replace(/\s+/g, "");
  if (!validWallet(asset, network, account)) return { ok: false, error: "That wallet address does not match the network you chose. Check both." };
  if (input["confirm"] !== "on") return { ok: false, error: "Please tick the box to confirm the address and network." };
  return { ok: true, value: { ...base, account, asset, network } };
}

export function maskHint(method: string, account: string): string {
  const a = account.replace(/\s+/g, "");
  if (method === "paypal" || method === "gift_card") {
    const [user, host] = a.split("@");
    return host ? `${user.slice(0, 1)}•••@${host}` : "••••";
  }
  if (method === "crypto") return a.length > 10 ? `${a.slice(0, 5)}…${a.slice(-4)}` : "••••";
  return a.length >= 4 ? `•••• ${a.slice(-4)}` : "••••";
}

export async function encryptPayout(d: PayoutDetails): Promise<string> {
  return encryptJson(d, masterSecret(), "payout-details");
}
export async function decryptPayout(ciphertext: string): Promise<PayoutDetails> {
  return decryptJson<PayoutDetails>(ciphertext, masterSecret(), "payout-details");
}
