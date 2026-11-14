export function money(value: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 2 }).format(value);
}

export function day(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

// A payment row's human status from its stored status and dates.
export function paymentStatus(p: { status: string; payable_on: string }): { label: string; tone: "green" | "amber" | "slate" | "red" } {
  if (p.status === "paid") return { label: "Paid", tone: "green" };
  if (p.status === "void") return { label: "Void", tone: "red" };
  const payable = new Date(p.payable_on).getTime() <= Date.now();
  return payable ? { label: "Payable", tone: "amber" } : { label: "In hold", tone: "slate" };
}
