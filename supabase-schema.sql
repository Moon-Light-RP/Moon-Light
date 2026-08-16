-- MOON LIGHT cloud storage
-- Run this once in Supabase Dashboard -> SQL Editor.

create table if not exists public.ml_store (
  key text primary key,
  value jsonb not null default 'null'::jsonb,
  updated_at timestamptz not null default now()
);

create or replace function public.ml_store_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists ml_store_touch on public.ml_store;
create trigger ml_store_touch
before update on public.ml_store
for each row execute function public.ml_store_touch_updated_at();

-- Recommended production setup:
-- Keep the table inaccessible to the browser and let Vercel use
-- SUPABASE_SERVICE_ROLE_KEY server-side. No public/anon policies are needed.
-- If you temporarily deploy using only SUPABASE_PUBLISHABLE_KEY, you will need
-- an explicit RLS policy for the API role; do NOT use that setup for sensitive data.

alter table public.ml_store enable row level security;
