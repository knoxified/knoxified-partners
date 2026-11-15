import "server-only";

// Transactional email through Brevo's API (free plan). The sender address must be verified in Brevo.
export type Attachment = { name: string; content: string }; // content = base64

export const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

export function publicUrl(): string {
  return (process.env.PUBLIC_URL || "https://partners.knoxified.org").replace(/\/$/, "");
}

export async function sendMail(opts: {
  to: string;
  toName?: string;
  subject: string;
  html: string;
  text: string;
  attachments?: Attachment[];
  copyAdmin?: boolean;
}): Promise<boolean> {
  const key = process.env.BREVO_API_KEY;
  const fromEmail = process.env.MAIL_FROM_EMAIL;
  if (!key || !fromEmail) {
    console.warn("Email not sent: BREVO_API_KEY or MAIL_FROM_EMAIL is not configured");
    return false;
  }
  const admin = process.env.ADMIN_COPY_EMAIL;
  const body: Record<string, unknown> = {
    sender: { name: process.env.MAIL_FROM_NAME || "Knoxified Partners", email: fromEmail },
    to: [{ email: opts.to, name: opts.toName || undefined }],
    replyTo: { email: process.env.MAIL_REPLY_TO || admin || fromEmail },
    subject: opts.subject,
    htmlContent: opts.html,
    textContent: opts.text,
  };
  if (opts.copyAdmin && admin && admin.toLowerCase() !== opts.to.toLowerCase()) body.bcc = [{ email: admin }];
  if (opts.attachments?.length) body.attachment = opts.attachments;
  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": key, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      console.error("Brevo send failed:", res.status, (await res.text()).slice(0, 300));
      return false;
    }
    return true;
  } catch (err) {
    console.error("Brevo send error:", (err as Error).message);
    return false;
  }
}

export type EmailContent = {
  preheader?: string;
  title: string;
  paragraphs: string[]; // plain text, escaped here
  stats?: Array<[string, string]>;
  cta?: { label: string; url: string };
  footnote?: string;
};

// Branded, email-client-safe layout (tables and inline styles). Returns HTML and a plain-text twin.
export function brandedEmail(c: EmailContent): { html: string; text: string } {
  const stats = c.stats?.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0;border:1px solid #e2e8f0;border-radius:10px;">${c.stats
        .map(
          ([k, v]) =>
            `<tr><td style="padding:10px 14px;color:#64748b;font-size:13px;border-bottom:1px solid #f1f5f9;">${esc(k)}</td><td style="padding:10px 14px;color:#0f172a;font-size:14px;font-weight:600;text-align:right;border-bottom:1px solid #f1f5f9;">${esc(v)}</td></tr>`
        )
        .join("")}</table>`
    : "";
  const cta = c.cta
    ? `<p style="margin:24px 0 8px;"><a href="${esc(c.cta.url)}" style="background:#0891b2;background-image:linear-gradient(90deg,#06b6d4,#3b82f6);color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 22px;border-radius:10px;display:inline-block;">${esc(c.cta.label)}</a></p>`
    : "";
  const html = `<!doctype html><html><body style="margin:0;background:#f1f5f9;font-family:Inter,Segoe UI,Arial,sans-serif;">
<span style="display:none;max-height:0;overflow:hidden;">${esc(c.preheader || c.title)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:28px 12px;"><tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;">
<tr><td style="background:#0f172a;background-image:linear-gradient(90deg,#0f172a,#0c4a6e);padding:20px 26px;"><span style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.3px;">Knoxified</span> <span style="color:#67e8f9;font-size:12px;font-weight:600;margin-left:8px;">PARTNERS</span></td></tr>
<tr><td style="padding:28px 26px;color:#334155;font-size:15px;line-height:1.6;">
<h1 style="margin:0 0 14px;color:#0f172a;font-size:21px;line-height:1.3;">${esc(c.title)}</h1>
${c.paragraphs.map((p) => `<p style="margin:0 0 12px;">${esc(p)}</p>`).join("")}
${stats}${cta}
${c.footnote ? `<p style="margin:20px 0 0;color:#94a3b8;font-size:12px;">${esc(c.footnote)}</p>` : ""}
</td></tr></table>
<p style="color:#94a3b8;font-size:11px;margin:14px 0 0;">Knoxified affiliate program · affiliates@knoxified.org</p>
</td></tr></table></body></html>`;
  const text = [
    c.title,
    "",
    ...c.paragraphs,
    ...(c.stats ? ["", ...c.stats.map(([k, v]) => `${k}: ${v}`)] : []),
    ...(c.cta ? ["", `${c.cta.label}: ${c.cta.url}`] : []),
    ...(c.footnote ? ["", c.footnote] : []),
  ].join("\n");
  return { html, text };
}
