# Knoxified Partners

Affiliate portal on its own Cloudflare Worker. Admins see every affiliate; each affiliate sees only their own page.
Everything runs on free tiers: Cloudflare Workers, Supabase, Brevo (email), and free public timestamp authorities.

## What it does
- Invite codes -> /join: code, details, email verification, read and sign (typed name + drawn signature), account live.
- The signed agreement is a self-contained HTML record with a SHA-256 fingerprint and an independent RFC 3161 timestamp.
- Passwordless login by emailed 6-digit code (admins can also use a password).
- Per-affiliate dashboard, payout details (encrypted), milestones, weekly digest and event emails.
- Admin: invites, payout run (13th-14th review, 15th pay), CSV batch, settings, your signature.

## Secrets (wrangler secret put NAME)
SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, BREVO_API_KEY, PORTAL_SECRET (long random), PORTAL_HOOK_SECRET (long random)

Generate a random value: node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"

## Variables (wrangler.jsonc)
SUPABASE_URL, MAIN_SITE_URL, PUBLIC_URL (this site's address), MAIL_FROM_EMAIL (must be a verified sender in Brevo),
MAIL_FROM_NAME, MAIL_REPLY_TO, ADMIN_COPY_EMAIL

## Deploy
1. Run the SQL in the dashboard repo: supabase/migrations/20261114000001_affiliate_onboarding.sql
2. Save the notification link in Supabase (see the portal's Settings page checklist).
3. npm install && npm run deploy
