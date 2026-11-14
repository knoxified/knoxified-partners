# Knoxified Partners

Affiliate portal on its own Cloudflare Worker. Admins see every affiliate; each affiliate sees only their own page.

## Deploy
1. Run supabase/migrations/20261113000005_partner_portal.sql (in the dashboard repo) in Supabase.
2. `wrangler secret put SUPABASE_ANON_KEY` and `wrangler secret put SUPABASE_SERVICE_ROLE_KEY`
3. `npm install && npm run deploy`
4. Add your admin login: `insert into public.portal_admins (user_id) select id from auth.users where email = 'you@example.com';`
5. Give each affiliate access from their page in the portal ("Create sign-in link").

The service-role key is server-only; the browser never receives it. All queries go through database
functions that return masked customer data.
