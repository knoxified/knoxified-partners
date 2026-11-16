// Shared by the payout form (browser) and its server-side check. No secrets here.
export type Method = "bank_transfer" | "paypal" | "crypto" | "gift_card";

export const METHODS: Array<{ value: Method; label: string; sub: string }> = [
  { value: "bank_transfer", label: "Bank transfer", sub: "Local or international bank account" },
  { value: "paypal", label: "PayPal", sub: "Paid to your PayPal email, in US dollars" },
  { value: "crypto", label: "Crypto (stablecoins)", sub: "USDT or USDC only, to your own wallet" },
  { value: "gift_card", label: "Gift card", sub: "Delivered to your email, in US dollars" },
];
export const methodLabel = (m: string) => METHODS.find((x) => x.value === m)?.label ?? (m === "other" ? "Other" : m);

const EVM = /^0x[a-fA-F0-9]{40}$/;
export const CRYPTO_ASSETS: Array<{
  value: "USDT" | "USDC"; label: string; sub: string;
  networks: Array<{ value: string; label: string; sub: string; test: RegExp; example: string }>;
}> = [
  {
    value: "USDT", label: "USDT", sub: "Tether, pegged to the US dollar",
    networks: [
      { value: "TRON", label: "TRON (TRC-20)", sub: "Address starts with T", test: /^T[1-9A-HJ-NP-Za-km-z]{33}$/, example: "T…" },
      { value: "BSC", label: "BNB Smart Chain (BEP-20)", sub: "Address starts with 0x", test: EVM, example: "0x…" },
      { value: "POLYGON", label: "Polygon", sub: "Address starts with 0x", test: EVM, example: "0x…" },
    ],
  },
  {
    value: "USDC", label: "USDC", sub: "Circle, pegged to the US dollar",
    networks: [
      { value: "BASE", label: "Base", sub: "Address starts with 0x", test: EVM, example: "0x…" },
      { value: "POLYGON", label: "Polygon", sub: "Address starts with 0x", test: EVM, example: "0x…" },
      { value: "SOLANA", label: "Solana", sub: "Long address, letters and numbers", test: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/, example: "…" },
    ],
  },
];

export const GIFT_CARDS = ["Amazon", "Apple", "Google Play", "Steam", "Netflix", "Uber", "Spotify"];

export const CURRENCIES: Array<{ code: string; name: string }> = [
  { code: "USD", name: "US dollar" }, { code: "NGN", name: "Nigerian naira" }, { code: "GBP", name: "British pound" },
  { code: "EUR", name: "Euro" }, { code: "CAD", name: "Canadian dollar" }, { code: "AUD", name: "Australian dollar" },
  { code: "ZAR", name: "South African rand" }, { code: "KES", name: "Kenyan shilling" }, { code: "GHS", name: "Ghanaian cedi" },
  { code: "AED", name: "UAE dirham" }, { code: "INR", name: "Indian rupee" }, { code: "PHP", name: "Philippine peso" },
  { code: "BRL", name: "Brazilian real" }, { code: "MXN", name: "Mexican peso" }, { code: "SGD", name: "Singapore dollar" },
];

export function validWallet(asset: string, network: string, address: string): boolean {
  const a = CRYPTO_ASSETS.find((x) => x.value === asset);
  const n = a?.networks.find((x) => x.value === network);
  return !!n && n.test.test(address);
}
