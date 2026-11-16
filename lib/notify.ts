import "server-only";
import { adminClient } from "@/lib/supabase/admin";
import { brandedEmail, publicUrl, sendMail } from "@/lib/mail";
import { getPartner } from "@/lib/data";
import { milestones, nextGoal, earnedTotal } from "@/lib/milestones";
import { requestTimestamp } from "@/lib/tsa";

const money = (n: number, cur = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: cur }).format(n);

// Records that a notification was sent. Returns false if this exact one was already sent.
async function claim(partnerId: string, kind: string, ref: string): Promise<boolean> {
  const { error } = await adminClient().from("partner_notifications").insert({ partner_id: partnerId, kind, ref });
  if (!error) return true;
  if (error.code !== "23505") console.error("notification claim failed:", error.message);
  return false;
}

async function partnerContact(partnerId: string) {
  const { data } = await adminClient().from("partners").select("id, name, email, status").eq("id", partnerId).maybeSingle();
  return data && data.status === "active" ? (data as { id: string; name: string; email: string; status: string }) : null;
}

async function customerLabel(userId: string | null): Promise<{ business: string; location: string }> {
  if (!userId) return { business: "A new customer", location: "" };
  const admin = adminClient();
  const [{ data: up }, { data: ac }] = await Promise.all([
    admin.from("user_profiles").select("organization_name").eq("user_id", userId).maybeSingle(),
    admin.from("agent_configs").select("organization_name, business_location").eq("user_id", userId).maybeSingle(),
  ]);
  const org = (up?.organization_name || "").trim();
  const alt = (ac?.organization_name || "").trim();
  return {
    business: org || (alt && alt !== "My Business" ? alt : "A new customer"),
    location: (ac?.business_location || "").trim(),
  };
}

async function milestoneEmails(partnerId: string) {
  const c = await partnerContact(partnerId);
  const p = await getPartner(partnerId);
  if (!c || !p) return;
  const fresh: string[] = [];
  for (const m of milestones(p)) {
    if (m.achieved && (await claim(partnerId, "milestone", m.id))) fresh.push(m.label);
  }
  if (fresh.length === 0) return;
  const goal = nextGoal(p);
  const { html, text } = brandedEmail({
    preheader: `Milestone reached: ${fresh[fresh.length - 1]}`,
    title: `Milestone unlocked: ${fresh[fresh.length - 1]}`,
    paragraphs: [
      `Nice work, ${c.name.split(" ")[0]}. ${fresh.length > 1 ? `You just reached ${fresh.length} milestones: ${fresh.join(", ")}.` : "That is a real step forward."}`,
      goal ? `Next up: ${goal.label} (${goal.remaining}).` : "You have reached every milestone so far. We will add more.",
    ],
    cta: { label: "See your dashboard", url: `${publicUrl()}/p/${partnerId}` },
  });
  await sendMail({ to: c.email, toName: c.name, subject: `Milestone unlocked: ${fresh[fresh.length - 1]}`, html, text });
}

export async function handleLead(body: { partner_id?: string; user_id?: string | null; status?: string; lead_id?: string }) {
  if (!body.partner_id || !body.status) return;
  const c = await partnerContact(body.partner_id);
  if (!c) return;
  if (!(await claim(c.id, "lead", `${body.lead_id ?? body.user_id}:${body.status}`))) return;
  const who = await customerLabel(body.user_id ?? null);
  const where = who.location ? ` (${who.location})` : "";
  const paid = body.status === "paid";
  const { html, text } = brandedEmail({
    preheader: paid ? `${who.business} just became a paying customer` : `${who.business} signed up through your link`,
    title: paid ? "You have a new paying customer" : "Someone just signed up through your link",
    paragraphs: paid
      ? [`${who.business}${where} just made their first payment. Your commission is on its way into your dashboard.`]
      : [`${who.business}${where} created an account through your link. They are on a free trial, and you earn when they subscribe.`],
    cta: { label: "Open your dashboard", url: `${publicUrl()}/p/${c.id}` },
  });
  await sendMail({ to: c.email, toName: c.name, subject: paid ? "You have a new paying customer" : "New signup through your link", html, text });
  await milestoneEmails(c.id);
}

export async function handleCommission(body: { partner_id?: string; commission_id?: string }) {
  if (!body.partner_id || !body.commission_id) return;
  const c = await partnerContact(body.partner_id);
  if (!c) return;
  if (!(await claim(c.id, "commission", body.commission_id))) return;
  const { data: row } = await adminClient()
    .from("partner_commissions")
    .select("commission_amount, currency, hold_until, user_id, rate_percent")
    .eq("id", body.commission_id)
    .maybeSingle();
  if (!row || Number(row.commission_amount) <= 0) return;
  const who = await customerLabel(row.user_id);
  const d = await getPartner(c.id);
  const { html, text } = brandedEmail({
    preheader: `You earned ${money(Number(row.commission_amount), row.currency || "USD")}`,
    title: `You earned ${money(Number(row.commission_amount), row.currency || "USD")}`,
    paragraphs: [
      `${who.business} made a payment, and you earned ${row.rate_percent}% of the net revenue. It is held for 21 days, then paid on the next payout date.`,
    ],
    stats: [
      ["Commission", money(Number(row.commission_amount), row.currency || "USD")],
      ["Payable after", new Date(row.hold_until).toISOString().slice(0, 10)],
      ...(d ? ([["Next payout", `${money(d.scheduled_amount, d.currency)} on ${d.next_payout_date}`]] as Array<[string, string]>) : []),
    ],
    cta: { label: "See your earnings", url: `${publicUrl()}/p/${c.id}` },
  });
  await sendMail({ to: c.email, toName: c.name, subject: `You earned ${money(Number(row.commission_amount), row.currency || "USD")}`, html, text });
  await milestoneEmails(c.id);
}

export async function handleDigest() {
  const admin = adminClient();
  const since = new Date(Date.now() - 7 * 86400_000).toISOString();
  const { data: partners } = await admin.from("partners").select("id, name, email").eq("status", "active");
  const week = new Date().toISOString().slice(0, 10);
  for (const p of partners ?? []) {
    const d = await getPartner(p.id);
    if (!d) continue;
    const [{ count: visits }, { count: signups }] = await Promise.all([
      admin.from("partner_leads").select("id", { count: "exact", head: true }).eq("partner_id", p.id).gte("first_seen_at", since),
      admin.from("partner_leads").select("id", { count: "exact", head: true }).eq("partner_id", p.id).gte("signed_up_at", since),
    ]);
    const money_total = earnedTotal(d);
    if (!visits && !signups && money_total === 0) continue; // nothing to celebrate yet
    if (!(await claim(p.id, "digest", week))) continue;
    const goal = nextGoal(d);
    const { html, text } = brandedEmail({
      preheader: `${visits ?? 0} visits and ${signups ?? 0} signups this week`,
      title: "Your week with Knoxified",
      paragraphs: [
        `Here is where you stand, ${p.name.split(" ")[0]}.`,
        goal ? `Next goal: ${goal.label} (${goal.remaining}).` : "You have reached every milestone so far.",
      ],
      stats: [
        ["Link visits this week", String(visits ?? 0)],
        ["Signups this week", String(signups ?? 0)],
        ["Paying customers", String(d.paying_customers)],
        ["Payable now", money(d.payable_now, d.currency)],
        ["Next payout", `${money(d.scheduled_amount, d.currency)} on ${d.next_payout_date}`],
        ["Paid to date", money(d.paid_to_date, d.currency)],
      ],
      cta: { label: "Open your dashboard", url: `${publicUrl()}/p/${p.id}` },
    });
    await sendMail({ to: p.email, toName: p.name, subject: "Your week with Knoxified", html, text });
  }
}

// Retries independent timestamps that could not be obtained at signing time.
export async function handleTimestamps() {
  const admin = adminClient();
  const { data } = await admin
    .from("partner_agreements")
    .select("id, record_sha256")
    .in("tsa_status", ["pending", "failed"])
    .limit(10);
  for (const row of data ?? []) {
    const r = await requestTimestamp(row.record_sha256);
    if (r.ok) {
      await admin
        .from("partner_agreements")
        .update({ tsa_status: "stamped", tsa_url: r.url, tsa_token_b64: r.tokenB64, tsa_stamped_at: new Date().toISOString() })
        .eq("id", row.id);
    } else {
      await admin.from("partner_agreements").update({ tsa_status: "failed" }).eq("id", row.id);
    }
  }
  await handleAddendumTimestamps();
}

export async function handleAddendumTimestamps() {
  const admin = adminClient();
  const { data } = await admin.from("partner_signature_addenda").select("id, record_sha256").in("tsa_status", ["pending", "failed"]).limit(10);
  for (const row of data ?? []) {
    const r = await requestTimestamp(row.record_sha256);
    await admin
      .from("partner_signature_addenda")
      .update(r.ok ? { tsa_status: "stamped", tsa_url: r.url, tsa_token_b64: r.tokenB64, tsa_stamped_at: new Date().toISOString() } : { tsa_status: "failed" })
      .eq("id", row.id);
  }
}

export async function sendPayoutEmail(partnerId: string, amount: number, currency: string, reference: string) {
  const c = await partnerContact(partnerId);
  if (!c) return;
  const { html, text } = brandedEmail({
    preheader: `Your payout of ${money(amount, currency)} has been sent`,
    title: `Your payout of ${money(amount, currency)} is on its way`,
    paragraphs: [
      `We have sent your commission payout. Depending on your bank and country it can take a few days to arrive. Thank you for helping Knoxified grow.`,
    ],
    stats: [["Amount", money(amount, currency)], ["Reference", reference]],
    cta: { label: "See your payment log", url: `${publicUrl()}/p/${c.id}` },
    footnote: "Questions about a payout? Reply to this email.",
  });
  await sendMail({ to: c.email, toName: c.name, subject: `Payout sent: ${money(amount, currency)}`, html, text, copyAdmin: true });
}
