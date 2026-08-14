create table public.ingredients (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  created_at timestamptz not null default now()
);

create unique index ingredients_name_unique on public.ingredients (lower(name));

alter table public.ingredients enable row level security;
-- No policies are created. RLS enabled + zero policies = default-deny for
-- anon/authenticated roles. The service_role key used server-side bypasses
-- RLS entirely, so the app still works -- this just ensures that if the
-- anon/publishable key were ever leaked or accidentally used client-side,
-- it could not read or write this table at all.
