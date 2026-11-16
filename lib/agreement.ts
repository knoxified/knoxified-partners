import "server-only";
import { sha256Hex } from "@/lib/crypto";
import { esc } from "@/lib/mail";
import { photoToImg, strokesToSvg, type AffiliateSignature, type VisibleSignature } from "@/lib/signature";
import { NOTICE_EMAIL, TERMS, TERMS_DATE, TERMS_VERSION, termsText } from "@/lib/terms";

export type KnoxSignature = { name: string; title: string; strokes: import("@/lib/signature").Stroke[] | null };

export type RecordInput = {
  partnerId: string;
  refCode: string;
  referralLink: string;
  name: string;
  company: string;
  email: string;
  country: string;
  rate1: number;
  rate2: number;
  inviteHint: string;
  emailVerifiedAt: string;
  signedAt: string;
  ip: string;
  userAgent: string;
  signature: AffiliateSignature;
  knox: KnoxSignature;
};

const fmtTime = (iso: string) => iso.replace("T", " ").replace(/\.\d+Z$/, " UTC").replace(/Z$/, " UTC");


const sigMethodText: Record<AffiliateSignature["method"], string> = {
  drawn: "typed name and drawn signature",
  photo: "typed name and photographed handwritten signature",
  typed: "typed name used as signature",
  none: "typed name and explicit acceptance; signature image to be added later as a timestamped addendum",
};

function sigHtml(sig: AffiliateSignature, name: string): string {
  if (sig.method === "drawn") return strokesToSvg(sig.strokes);
  if (sig.method === "photo") return photoToImg(sig.png);
  if (sig.method === "typed") return `<div class="typed">${esc(name)}</div>`;
  return `<div class="pending">Signature image to be added. Agreement accepted by typed name, verified email and explicit acceptance, as shown in the signing record.</div>`;
}

function clauseHtml(label: string, text: string): string {
  const [lead, ...bullets] = text.split("\n- ");
  return `<p class="cl"><b>${esc(label)}</b> ${esc(lead)}</p>${
    bullets.length ? `<ul>${bullets.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>` : ""
  }`;
}

export async function buildRecord(i: RecordInput): Promise<{ html: string; json: Record<string, unknown>; sha256: string; termsSha256: string }> {
  const termsSha256 = await sha256Hex(termsText());
  const knoxSig = i.knox.strokes
    ? strokesToSvg(i.knox.strokes)
    : `<div class="typed">${esc(i.knox.name)}</div>`;

  const orderRows: Array<[string, string]> = [
    ["Knoxified", `Knoxified (business name), operated by ${i.knox.name}, an individual, until the business is carried on by a company`],
    ["Affiliate", i.name],
    ["Business (if any)", i.company || "Not given"],
    ["Email (verified)", i.email],
    ["Country", i.country],
    ["Referral Code", i.refCode],
    ["Referral Link", i.referralLink],
    ["Year One Rate", `${i.rate1}% of Net Revenue`],
    ["Year Two Rate", `${i.rate2}% of Net Revenue`],
    ["Payout", "Paid in US dollars on the 15th of each month after a 21-day hold; minimum US$50. Local-currency payout by choice in the Portal."],
    ["Terms", `Affiliate Program Terms version ${TERMS_VERSION}, ${TERMS_DATE}`],
    ["Notices to Knoxified", NOTICE_EMAIL],
    ["Effective", fmtTime(i.signedAt)],
  ];

  const termsHtml = TERMS.map((s, si) => {
    const table = s.table
      ? `<table class="grid"><thead><tr>${s.table.head.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${s.table.rows
          .map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`)
          .join("")}</tbody></table>`
      : "";
    return `<h3>${si + 1}. ${esc(s.title)}</h3>${s.clauses.map((c, ci) => clauseHtml(`${si + 1}.${ci + 1}`, c)).join("")}${table}`;
  }).join("");

  const audit: Array<[string, string]> = [
    ["Invitation", `Redeemed invitation code ending ${i.inviteHint || "n/a"}`],
    ["Email verified", `${fmtTime(i.emailVerifiedAt)} by one-time code sent to ${i.email}`],
    ["Terms shown and accepted", `Version ${TERMS_VERSION}; terms SHA-256 ${termsSha256}`],
    ["Accepted and signed", `${fmtTime(i.signedAt)}; ${sigMethodText[i.signature.method]}`],
    ["Signer IP address", i.ip || "unknown"],
    ["Signer browser", i.userAgent.slice(0, 300) || "unknown"],
    ["Knoxified signature", i.knox.strokes ? "Applied in advance (drawn)" : "Applied in advance (typed name)"],
  ];

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Knoxified Affiliate Agreement - ${esc(i.name)}</title>
<style>
body{font-family:Georgia,'Times New Roman',serif;color:#0f172a;max-width:820px;margin:32px auto;padding:0 20px;line-height:1.55;font-size:14.5px}
h1{font-size:26px;margin:0 0 4px}h2{font-size:18px;margin:30px 0 10px;border-bottom:2px solid #0e7490;padding-bottom:4px}h3{font-size:15px;margin:22px 0 6px}
.sub{color:#475569;margin:0 0 18px}table.kv,table.grid{border-collapse:collapse;width:100%;margin:8px 0}
table.kv td{border:1px solid #cbd5e1;padding:7px 10px;vertical-align:top}table.kv td:first-child{width:34%;background:#f1f5f9;font-weight:bold}
table.grid th,table.grid td{border:1px solid #cbd5e1;padding:6px 10px;text-align:left}table.grid th{background:#f1f5f9}
.cl{margin:7px 0}ul{margin:4px 0 8px 22px}.sigs{display:flex;gap:28px;flex-wrap:wrap;margin-top:12px}
.sig{flex:1;min-width:260px;border:1px solid #cbd5e1;border-radius:8px;padding:14px}.sig .lbl{font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:.05em}
.typed{font-family:'Brush Script MT',cursive;font-size:34px;height:90px;display:flex;align-items:center}.pending{height:90px;display:flex;align-items:center;font-size:12.5px;color:#92400e;background:#fffbeb;border:1px dashed #f59e0b;border-radius:6px;padding:0 10px}.note{font-size:12.5px;color:#475569;margin-top:14px}
@media print{body{margin:0}h2{page-break-after:avoid}.sig{page-break-inside:avoid}}
</style></head><body>
<h1>Knoxified Affiliate Agreement</h1>
<p class="sub">Partner Order Form and Affiliate Program Terms, version ${esc(TERMS_VERSION)}</p>
<h2>Partner Order Form</h2>
<table class="kv">${orderRows.map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join("")}</table>
<h2>Affiliate Program Terms</h2>
${termsHtml}
<h2>Signatures</h2>
<div class="sigs">
<div class="sig"><div class="lbl">For Knoxified</div>${knoxSig}<div><b>${esc(i.knox.name)}</b>, ${esc(i.knox.title)}</div><div>Signed in advance and effective on ${esc(fmtTime(i.signedAt))}</div></div>
<div class="sig"><div class="lbl">Affiliate</div>${sigHtml(i.signature, i.name)}<div><b>${esc(i.name)}</b>${i.company ? `, ${esc(i.company)}` : ""}</div><div>Signed ${esc(fmtTime(i.signedAt))}</div></div>
</div>
<h2>Signing record</h2>
<table class="kv">${audit.map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join("")}</table>
<p class="note">Integrity. This file is fingerprinted with SHA-256 and the fingerprint is timestamped by an independent public time-stamping authority (RFC 3161). The fingerprint and timestamp token are shown in the Knoxified Partners portal and emailed to both parties; they cannot be written inside this file itself. If this file is changed, its fingerprint will no longer match the timestamp. Agreement reference: ${esc(i.partnerId)}.</p>
</body></html>`;

  const json = {
    record_version: 1,
    partner_id: i.partnerId,
    referral_code: i.refCode,
    parties: {
      knoxified: { business_name: "Knoxified", signatory: i.knox.name, title: i.knox.title },
      affiliate: { name: i.name, company: i.company || null, email: i.email, country: i.country },
    },
    commission: { year_one_rate_percent: i.rate1, year_two_rate_percent: i.rate2 },
    terms: { version: TERMS_VERSION, date: TERMS_DATE, sha256: termsSha256 },
    signing: {
      signed_at: i.signedAt,
      email_verified_at: i.emailVerifiedAt,
      ip: i.ip || null,
      user_agent: i.userAgent.slice(0, 300) || null,
      invitation_hint: i.inviteHint || null,
      method: sigMethodText[i.signature.method],
      signature_method: i.signature.method,
    },
  };

  return { html, json, sha256: await sha256Hex(html), termsSha256 };
}

export type AddendumInput = {
  partnerId: string;
  agreementId: string;
  agreementSha256: string;
  agreementSignedAt: string;
  name: string;
  email: string;
  signedAt: string;
  ip: string;
  userAgent: string;
  signature: VisibleSignature;
};

// A signature added after the original agreement was accepted. It never edits the original record:
// it is a separate file that quotes the original's SHA-256, with its own fingerprint and timestamp.
export async function buildAddendum(i: AddendumInput): Promise<{ html: string; json: Record<string, unknown>; sha256: string }> {
  const rows: Array<[string, string]> = [
    ["Affiliate", i.name],
    ["Email", i.email],
    ["Original agreement reference", i.partnerId],
    ["Original agreement accepted", fmtTime(i.agreementSignedAt)],
    ["Original agreement SHA-256", i.agreementSha256],
    ["Signature added", fmtTime(i.signedAt)],
    ["Method", sigMethodText[i.signature.method]],
    ["Signer IP address", i.ip || "unknown"],
    ["Signer browser", i.userAgent.slice(0, 300) || "unknown"],
  ];
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Signature Addendum - ${esc(i.name)}</title>
<style>
body{font-family:Georgia,'Times New Roman',serif;color:#0f172a;max-width:820px;margin:32px auto;padding:0 20px;line-height:1.55;font-size:14.5px}
h1{font-size:24px;margin:0 0 4px}.sub{color:#475569;margin:0 0 18px}table.kv{border-collapse:collapse;width:100%;margin:8px 0}
table.kv td{border:1px solid #cbd5e1;padding:7px 10px;vertical-align:top;word-break:break-all}table.kv td:first-child{width:34%;background:#f1f5f9;font-weight:bold;word-break:normal}
.sig{border:1px solid #cbd5e1;border-radius:8px;padding:14px;max-width:360px;margin-top:12px}.typed{font-family:'Brush Script MT',cursive;font-size:34px;height:90px;display:flex;align-items:center}
.note{font-size:12.5px;color:#475569;margin-top:14px}@media print{body{margin:0}.sig{page-break-inside:avoid}}
</style></head><body>
<h1>Signature Addendum</h1>
<p class="sub">To the Knoxified Affiliate Agreement accepted on ${esc(fmtTime(i.agreementSignedAt))}</p>
<p>The affiliate named below confirms that the signature shown here is their own, and adds it to the Knoxified Affiliate Agreement identified by the fingerprint below. This addendum does not change the original agreement or its terms.</p>
<div class="sig">${sigHtml(i.signature, i.name)}<div><b>${esc(i.name)}</b></div><div>Signed ${esc(fmtTime(i.signedAt))}</div></div>
<h2 style="font-size:18px;margin:26px 0 8px">Signing record</h2>
<table class="kv">${rows.map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join("")}</table>
<p class="note">Integrity. This file is fingerprinted with SHA-256 and the fingerprint is timestamped by an independent public time-stamping authority (RFC 3161). It refers to the original agreement by that file's own fingerprint, so neither can be changed without the mismatch showing.</p>
</body></html>`;
  const json = {
    record_version: 1,
    kind: "signature_addendum",
    partner_id: i.partnerId,
    agreement_id: i.agreementId,
    original_agreement_sha256: i.agreementSha256,
    signing: { signed_at: i.signedAt, ip: i.ip || null, user_agent: i.userAgent.slice(0, 300) || null, method: sigMethodText[i.signature.method], signature_method: i.signature.method },
  };
  return { html, json, sha256: await sha256Hex(html) };
}
