-- Signature step: phone handoff tokens and signature addenda.
-- Run once in the Supabase SQL editor. Both tables are service-role only (RLS on, no policies).

create table if not exists public.portal_signature_handoffs (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  invite_id uuid,
  partner_id uuid references public.partners(id),
  status text not null default 'waiting' check (status in ('waiting','received','used')),
  image_b64 text,
  expires_at timestamptz not null,
  received_at timestamptz,
  created_at timestamptz not null default now(),
  check ((invite_id is not null) <> (partner_id is not null))
);
alter table public.portal_signature_handoffs enable row level security;
create index if not exists portal_signature_handoffs_expires_idx on public.portal_signature_handoffs (expires_at);

create table if not exists public.partner_signature_addenda (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id),
  agreement_id uuid not null references public.partner_agreements(id),
  signature_method text not null check (signature_method in ('drawn','photo','typed')),
  record_html text not null,
  record_json jsonb not null,
  record_sha256 text not null,
  signer_ip text,
  signer_user_agent text,
  signed_at timestamptz not null default now(),
  tsa_status text not null default 'pending' check (tsa_status in ('pending','stamped','failed')),
  tsa_url text,
  tsa_token_b64 text,
  tsa_stamped_at timestamptz,
  created_at timestamptz not null default now(),
  unique (agreement_id)
);
alter table public.partner_signature_addenda enable row level security;

-- Housekeeping: clear expired or used handoffs (the existing "timestamps" cron can also call this).
create or replace function public.portal_purge_handoffs() returns void
language sql security definer set search_path = public as $$
  delete from public.portal_signature_handoffs where expires_at < now() - interval '1 day';
$$;
revoke all on function public.portal_purge_handoffs() from public, anon, authenticated;
