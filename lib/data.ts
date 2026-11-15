import "server-only";
import { adminClient } from "@/lib/supabase/admin";

// All reads go through database functions that return masked customer data
// (business name and location, never owner name or email). Identities are admin-only.

export type PartnerRow = {
  partner_id: string; name: string; company: string | null; email: string; ref_code: string; status: string;
  visits: number; signups: number; paying_customers: number;
  in_hold: number; payable_now: number; paid_to_date: number; voided: number;
};
export type PartnerDetail = PartnerRow & {
  year1_rate: number; year2_rate: number; next_payout_date: string;
  scheduled_amount: number; scheduled_count: number; currency: string;
};
export type CustomerRow = {
  customer_key: string; business_name: string; location: string | null; plan_name: string; status: string;
  signed_up_at: string; first_paid_at: string | null; last_paid_at: string | null;
  payments: number; total_commission: number; full_name?: string | null; email?: string | null;
};
export type PaymentRow = {
  paid_at: string; kind: string; customer_key: string | null; business_name: string; plan_name: string | null;
  commission_base: number; rate_percent: number; commission_amount: number; status: string;
  period: string | null; payable_on: string; scheduled_payout: string; paid_out_at: string | null;
  payout_ref: string | null; note: string | null; currency: string | null;
};

const num = (v: unknown) => Number(v ?? 0);

function normaliseRow<T extends Record<string, any>>(row: T, numericKeys: string[]): T {
  const out: Record<string, any> = { ...row };
  for (const k of numericKeys) if (k in out) out[k] = num(out[k]);
  return out as T;
}

export async function listPartners(): Promise<PartnerRow[]> {
  const { data, error } = await adminClient().rpc("portal_partner_list");
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: any) =>
    normaliseRow(r, ["visits", "signups", "paying_customers", "in_hold", "payable_now", "paid_to_date", "voided"])
  );
}

export async function getPartner(partnerId: string): Promise<PartnerDetail | null> {
  const { data, error } = await adminClient().rpc("portal_partner_detail", { p_partner_id: partnerId });
  if (error) throw new Error(error.message);
  const row = (data ?? [])[0];
  if (!row) return null;
  return normaliseRow(row, [
    "visits", "signups", "paying_customers", "in_hold", "payable_now", "paid_to_date", "voided",
    "year1_rate", "year2_rate", "scheduled_amount", "scheduled_count",
  ]);
}

export async function getCustomers(partnerId: string, includeIdentity: boolean): Promise<CustomerRow[]> {
  const admin = adminClient();
  const [{ data, error }, ids] = await Promise.all([
    admin.rpc("portal_partner_customers", { p_partner_id: partnerId }),
    includeIdentity ? admin.rpc("portal_customer_identities", { p_partner_id: partnerId }) : Promise.resolve({ data: [] as any[] }),
  ]);
  if (error) throw new Error(error.message);
  const identity = new Map<string, { full_name: string | null; email: string | null }>();
  for (const i of (ids.data ?? []) as any[]) identity.set(i.customer_key, i);
  return (data ?? []).map((r: any) => {
    const row = normaliseRow(r, ["payments", "total_commission"]) as CustomerRow;
    if (includeIdentity) {
      const i = identity.get(row.customer_key);
      row.full_name = i?.full_name ?? null;
      row.email = i?.email ?? null;
    }
    return row;
  });
}

export async function getPayments(partnerId: string): Promise<PaymentRow[]> {
  const { data, error } = await adminClient().rpc("portal_partner_payments", { p_partner_id: partnerId });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: any) => normaliseRow(r, ["commission_base", "rate_percent", "commission_amount"]));
}

// ---------------------------------------------------------------------------
// Agreement, payout details and settings (service role; callers must authorise first)
// ---------------------------------------------------------------------------
export type AgreementMeta = {
  id: string; terms_version: string; record_sha256: string; signed_at: string;
  tsa_status: "pending" | "stamped" | "failed"; tsa_url: string | null; tsa_stamped_at: string | null; signer_name: string;
};

export async function getAgreementMeta(partnerId: string): Promise<AgreementMeta | null> {
  const { data } = await adminClient()
    .from("partner_agreements")
    .select("id, terms_version, record_sha256, signed_at, tsa_status, tsa_url, tsa_stamped_at, signer_name")
    .eq("partner_id", partnerId)
    .order("signed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as AgreementMeta | null) ?? null;
}

export type PayoutMeta = { currency: string; method: string; country: string | null; hint: string | null; updated_at: string };
export async function getPayoutMeta(partnerId: string): Promise<PayoutMeta | null> {
  const { data } = await adminClient()
    .from("partner_payout_details")
    .select("currency, method, country, hint, updated_at")
    .eq("partner_id", partnerId)
    .maybeSingle();
  return (data as PayoutMeta | null) ?? null;
}

export async function getSetting<T>(key: string): Promise<T | null> {
  const { data } = await adminClient().from("portal_settings").select("value").eq("key", key).maybeSingle();
  return (data?.value as T | undefined) ?? null;
}
