"use server";

import { after } from "next/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { adminClient } from "@/lib/supabase/admin";
import { getViewer } from "@/lib/viewer";
import { rateAllowed } from "@/lib/otp";
import { consumeHandoff, createHandoff, readHandoff } from "@/lib/handoff";
import { buildAddendum } from "@/lib/agreement";
import { requestTimestamp } from "@/lib/tsa";
import { brandedEmail, publicUrl, sendMail } from "@/lib/mail";
import { toB64 } from "@/lib/crypto";
import { sanitizePhotoDataUrl, sanitizeStrokes, type VisibleSignature } from "@/lib/signature";

async function owner(partnerId: string) {
  const v = await getViewer();
  return v && v.role === "partner" && v.partnerId === partnerId ? v : null;
}

export async function startPartnerHandoff(partnerId: string): Promise<{ ok: true; token: string; url: string } | { ok: false; error: string }> {
  if (!(await owner(partnerId))) return { ok: false, error: "Not allowed." };
  if (!(await rateAllowed(`handoff:partner:${partnerId}`, 12, 3600))) return { ok: false, error: "Too many attempts. Please try again later." };
  try {
    const token = await createHandoff({ partnerId });
    return { ok: true, token, url: `${publicUrl()}/sig/${token}` };
  } catch {
    return { ok: false, error: "Could not create the link. Please try again." };
  }
}

export async function pollPartnerHandoff(partnerId: string, token: string) {
  if (!(await owner(partnerId))) return { status: "expired" as const };
  return readHandoff(token, { partnerId });
}

export async function addSignature(formData: FormData) {
  const partnerId = String(formData.get("partnerId") ?? "");
  const viewer = await owner(partnerId);
  const back = (msg: string): never => redirect(`/p/${partnerId}/signature?error=${encodeURIComponent(msg)}`);
  if (!viewer) redirect("/login");
  if (!(await rateAllowed(`addendum:${partnerId}`, 10, 3600))) back("Too many attempts. Please try again later.");
  if (formData.get("confirm") !== "on") back("Please tick the box to confirm.");

  const method = String(formData.get("sigMethod") ?? "");
  let signature: VisibleSignature | null = null;
  if (method === "drawn") {
    let strokes = null;
    try {
      strokes = sanitizeStrokes(JSON.parse(String(formData.get("strokes") ?? "[]")));
    } catch {
      strokes = null;
    }
    if (!strokes) back("Please draw your signature in the box, or choose another way to sign.");
    signature = { method: "drawn", strokes: strokes! };
  } else if (method === "typed") signature = { method: "typed" };
  else if (method === "photo") {
    const direct = sanitizePhotoDataUrl(formData.get("photo"));
    if (direct) signature = { method: "photo", png: direct };
    else {
      const png = await consumeHandoff(String(formData.get("handoff") ?? ""), { partnerId });
      if (!png) back("That signature photo expired. Please add it again.");
      signature = { method: "photo", png: png! };
    }
  } else back("Please choose how to sign.");

  const admin = adminClient();
  const { data: agreement } = await admin
    .from("partner_agreements")
    .select("id, record_sha256, signed_at, signer_name, signer_email, record_json")
    .eq("partner_id", partnerId)
    .order("signed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!agreement) back("We could not find your agreement.");
  const a = agreement!;
  const { data: done } = await admin.from("partner_signature_addenda").select("id").eq("agreement_id", a.id).limit(1).maybeSingle();
  if (done) redirect(`/p/${partnerId}`);

  const h = await headers();
  const ip = h.get("cf-connecting-ip") || (h.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";
  const ua = h.get("user-agent") || "";
  const signedAt = new Date().toISOString();
  const rec = await buildAddendum({
    partnerId, agreementId: a.id, agreementSha256: a.record_sha256, agreementSignedAt: a.signed_at,
    name: a.signer_name, email: a.signer_email, signedAt, ip, userAgent: ua, signature: signature!,
  });
  const { data: row, error } = await admin
    .from("partner_signature_addenda")
    .insert({
      partner_id: partnerId, agreement_id: a.id, signature_method: signature!.method, record_html: rec.html, record_json: rec.json,
      record_sha256: rec.sha256, signer_ip: ip, signer_user_agent: ua.slice(0, 300), signed_at: signedAt,
    })
    .select("id")
    .single();
  if (error || !row) back("We could not save your signature. Please try again.");

  const task = async () => {
    const stamp = await requestTimestamp(rec.sha256);
    await admin
      .from("partner_signature_addenda")
      .update(stamp.ok ? { tsa_status: "stamped", tsa_url: stamp.url, tsa_token_b64: stamp.tokenB64, tsa_stamped_at: new Date().toISOString() } : { tsa_status: "failed" })
      .eq("id", row!.id);
    const enc = new TextEncoder();
    const { html, text } = brandedEmail({
      preheader: "Your signature has been added",
      title: "Your signature is on file",
      paragraphs: [
        "Thank you. Your signature has been added to your Knoxified affiliate agreement as a signed, timestamped addendum. The original agreement was not changed.",
        "Attached are the addendum, its signing record and an independent timestamp token.",
      ],
      stats: [["Addendum SHA-256", rec.sha256.slice(0, 32) + "…"]],
      cta: { label: "Open your dashboard", url: `${publicUrl()}/p/${partnerId}` },
      footnote: `Full fingerprint: ${rec.sha256}`,
    });
    await sendMail({
      to: a.signer_email, toName: a.signer_name, subject: "Your signature has been added", html, text, copyAdmin: true,
      attachments: [
        { name: "knoxified-signature-addendum.html", content: toB64(enc.encode(rec.html)) },
        { name: "knoxified-signature-addendum.json", content: toB64(enc.encode(JSON.stringify(rec.json, null, 2))) },
        ...(stamp.ok ? [{ name: "knoxified-signature-addendum.tsr", content: stamp.tokenB64 }] : []),
      ],
    });
  };
  try {
    after(task);
  } catch {
    await task();
  }
  redirect(`/p/${partnerId}?signed=1`);
}
