"use server";

import { after } from "next/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { adminClient } from "@/lib/supabase/admin";
import { normalizeInviteCode, randomDigits, toB64 } from "@/lib/crypto";
import { inviteHash } from "@/lib/invite";
import { checkCode, rateAllowed, sendCode } from "@/lib/otp";
import { clearJoin, getJoin, setJoin } from "@/lib/joinsession";
import { sanitizeStrokes } from "@/lib/signature";
import { buildRecord, type KnoxSignature } from "@/lib/agreement";
import { requestTimestamp } from "@/lib/tsa";
import { brandedEmail, publicUrl, sendMail } from "@/lib/mail";
import { signInAs } from "@/lib/session";
import { getSetting } from "@/lib/data";

function back(msg: string): never {
  redirect("/join?error=" + encodeURIComponent(msg));
}

async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("cf-connecting-ip") || (h.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";
}

export async function redeemCode(formData: FormData) {
  const ip = await clientIp();
  if (!(await rateAllowed(`join:ip:${ip}`, 12, 3600)) || !(await rateAllowed("join:all", 300, 3600)))
    back("Too many attempts. Please try again later.");
  const core = normalizeInviteCode(String(formData.get("code") ?? ""));
  if (core.length !== 12) back("Check the code and try again.");
  const { data } = await adminClient().rpc("portal_check_invite", { p_code_hash: await inviteHash(core) });
  const inv = Array.isArray(data) ? data[0] : null;
  if (!inv) back("That code is not valid, or it has expired or already been used.");
  await setJoin({ inviteId: inv.invite_id });
  redirect("/join");
}

export async function saveDetails(formData: FormData) {
  const state = await getJoin();
  if (!state) redirect("/join");
  const name = String(formData.get("name") ?? "").trim().replace(/\s+/g, " ");
  const company = String(formData.get("company") ?? "").trim().slice(0, 120);
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const country = String(formData.get("country") ?? "").trim().slice(0, 60);
  if (name.length < 2 || name.length > 80) back("Enter your full name.");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 254) back("Enter a valid email address.");
  if (country.length < 2) back("Enter your country.");

  const result = await sendCode(email, "join", await clientIp());
  if (result === "limited") back("Too many codes requested. Please wait a while and try again.");
  if (result !== "sent") back("We could not send the email. Check the address and try again.");
  await setJoin({ inviteId: state.inviteId, name, company, email, country, verified: false });
  redirect("/join");
}

export async function verifyEmail(formData: FormData) {
  const state = await getJoin();
  if (!state?.email) redirect("/join");
  const ok = await checkCode(state.email, "join", String(formData.get("code") ?? "").trim(), await clientIp());
  if (!ok) back("That code is not right, or it has expired. Check it or request a new one.");
  await setJoin({ ...state, verified: true, verifiedAt: new Date().toISOString() });
  redirect("/join");
}

export async function resendCode() {
  const state = await getJoin();
  if (!state?.email) redirect("/join");
  const r = await sendCode(state.email, "join", await clientIp());
  if (r === "limited") back("Too many codes requested. Please wait a while and try again.");
  redirect("/join?notice=" + encodeURIComponent("A new code is on its way."));
}

export async function editDetails() {
  const state = await getJoin();
  if (!state) redirect("/join");
  await setJoin({ inviteId: state.inviteId });
  redirect("/join");
}

const normName = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

export async function signAgreement(formData: FormData) {
  const state = await getJoin();
  if (!state?.verified || !state.name || !state.email || !state.country || !state.verifiedAt) redirect("/join");
  const ip = await clientIp();
  if (!(await rateAllowed(`sign:ip:${ip}`, 10, 3600))) back("Too many attempts. Please try again later.");
  if (formData.get("accept") !== "on") back("Please tick the box to agree to the terms.");
  if (normName(String(formData.get("typedName") ?? "")) !== normName(state.name)) back("Type your full name exactly as you entered it.");

  let strokes = null;
  try {
    strokes = sanitizeStrokes(JSON.parse(String(formData.get("strokes") ?? "[]")));
  } catch {
    strokes = null;
  }
  if (!strokes) back("Please draw your signature in the box.");

  const admin = adminClient();
  const { data: inv } = await admin
    .from("partner_invites")
    .select("id, code_hint, commission_rate, commission_rate_year2, used_at, revoked_at, expires_at")
    .eq("id", state.inviteId)
    .maybeSingle();
  if (!inv || inv.used_at || inv.revoked_at || new Date(inv.expires_at).getTime() < Date.now())
    back("This invitation is no longer valid. Ask Knoxified for a new one.");

  const email = state.email;
  const { data: existing } = await admin.rpc("portal_find_auth_user", { p_email: email });
  let userId: string | null = typeof existing === "string" ? existing : null;
  if (!userId) {
    const { data: created, error } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { account_type: "partner" },
    });
    if (error || !created.user) back("We could not create your login. Please try again.");
    userId = created!.user!.id;
  }

  const saved = (await getSetting<{ name?: string; title?: string; strokes?: [number, number][][] | null }>("knoxified_signature")) ?? {};
  const knox: KnoxSignature = {
    name: saved.name || "Knox Favour",
    title: saved.title || "Founder, Knoxified",
    strokes: saved.strokes ? sanitizeStrokes(saved.strokes) : null,
  };

  const partnerId = crypto.randomUUID();
  const signedAt = new Date().toISOString();
  const { data: suggested } = await admin.rpc("portal_suggest_ref_code", { p_name: state.name });
  let refCode = String(suggested || "partner-" + randomDigits(4));
  const ua = (await headers()).get("user-agent") || "";

  let record = null as Awaited<ReturnType<typeof buildRecord>> | null;
  let failure = "";
  for (let attempt = 0; attempt < 3; attempt++) {
    record = await buildRecord({
      partnerId,
      refCode,
      referralLink: `https://knoxified.org/?ref=${refCode}`,
      name: state.name,
      company: state.company || "",
      email,
      country: state.country,
      rate1: Number(inv!.commission_rate),
      rate2: Number(inv!.commission_rate_year2),
      inviteHint: inv!.code_hint || "",
      emailVerifiedAt: state.verifiedAt,
      signedAt,
      ip,
      userAgent: ua,
      affiliateStrokes: strokes!,
      knox,
    });
    const { error } = await admin.rpc("portal_onboard_partner", {
      p_invite_id: inv!.id, p_partner_id: partnerId, p_user_id: userId, p_name: state.name, p_company: state.company || "",
      p_email: email, p_ref_code: refCode, p_terms_version: (record.json.terms as { version: string }).version,
      p_terms_sha: record.termsSha256, p_record_html: record.html, p_record_json: record.json, p_record_sha: record.sha256,
      p_ip: ip, p_ua: ua.slice(0, 300), p_email_verified_at: state.verifiedAt,
    });
    if (!error) { failure = ""; break; }
    failure = error.message;
    if (error.code === "23505" && /ref_code/.test(error.message + (error.details ?? ""))) {
      refCode = `${refCode.slice(0, 30)}-${randomDigits(3)}`;
      continue;
    }
    break;
  }
  if (failure || !record) back(failure.replace(/^.*?:\s*/, "") || "We could not finish setting up your account. Please try again.");

  const finished = record!;
  const task = async () => {
    const stamp = await requestTimestamp(finished.sha256);
    if (stamp.ok) {
      await admin.from("partner_agreements").update({
        tsa_status: "stamped", tsa_url: stamp.url, tsa_token_b64: stamp.tokenB64, tsa_stamped_at: new Date().toISOString(),
      }).eq("partner_id", partnerId);
    } else {
      await admin.from("partner_agreements").update({ tsa_status: "failed" }).eq("partner_id", partnerId);
    }
    const enc = new TextEncoder();
    const attachments = [
      { name: "knoxified-affiliate-agreement.html", content: toB64(enc.encode(finished.html)) },
      { name: "knoxified-affiliate-agreement.json", content: toB64(enc.encode(JSON.stringify(finished.json, null, 2))) },
      ...(stamp.ok ? [{ name: "knoxified-affiliate-agreement.tsr", content: stamp.tokenB64 }] : []),
    ];
    const { html, text } = brandedEmail({
      preheader: "Welcome to the Knoxified affiliate program",
      title: `Welcome aboard, ${state.name!.split(" ")[0]}`,
      paragraphs: [
        "Your agreement is signed and your affiliate account is live. Your referral link is waiting in your dashboard.",
        "Attached is your signed agreement, its signing record, and an independent timestamp token. Keep them: anyone can use the fingerprint below to confirm the agreement has not changed.",
        stamp.ok ? "The independent timestamp was obtained successfully." : "The independent timestamp is being retried automatically and will be available in your dashboard shortly.",
      ],
      stats: [["Referral link", `knoxified.org/?ref=${refCode}`], ["Agreement SHA-256", finished.sha256.slice(0, 32) + "…"]],
      cta: { label: "Open your dashboard", url: `${publicUrl()}/p/${partnerId}?welcome=1` },
      footnote: `Full fingerprint: ${finished.sha256}`,
    });
    await sendMail({ to: email, toName: state.name, subject: "Welcome to the Knoxified affiliate program", html, text, attachments, copyAdmin: true });
  };
  try {
    after(task);
  } catch {
    await task();
  }

  const signedIn = await signInAs(email);
  await clearJoin();
  redirect(signedIn ? `/p/${partnerId}?welcome=1` : "/login?notice=" + encodeURIComponent("Your account is ready. Request a sign-in code to open it."));
}
