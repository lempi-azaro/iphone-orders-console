-- ============================================================
-- iPhone Order Management — Supabase schema
-- Run this once in Supabase SQL Editor (Project > SQL Editor > New query)
-- ============================================================

-- 1. Table
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  customer_name text not null,
  customer_email text not null,
  shipping_address text not null,
  iphone_model text not null,          -- e.g. "iPhone 14 Pro"
  model_year int not null,             -- e.g. 2022
  storage_gb int not null,             -- e.g. 128
  color text not null,
  condition text not null check (condition in ('new', 'like_new', 'used')),
  battery_health int check (battery_health between 0 and 100), -- null if condition = 'new'
  price numeric(10,2) not null,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'shipped', 'delivered', 'cancelled')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

-- Keep updated_at fresh automatically (also gives us a reliable audit trail)
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_orders_updated_at on public.orders;
create trigger trg_orders_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

-- 2. Row Level Security — nobody gets in unless explicitly allowed.
-- This is the single most important security control on a Supabase app:
-- the anon/public API key is meant to be exposed in frontend code, so
-- access control MUST live in the database, not in the JS.
alter table public.orders enable row level security;

-- Only logged-in staff (any authenticated user) can read orders.
create policy "Authenticated users can view orders"
  on public.orders for select
  to authenticated
  using (true);

-- Only logged-in staff can insert/update/delete.
-- In a real deployment, replace `true` with a role check, e.g.
-- exists (select 1 from public.staff where staff.user_id = auth.uid())
create policy "Authenticated users can insert orders"
  on public.orders for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update orders"
  on public.orders for update
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can delete orders"
  on public.orders for delete
  to authenticated
  using (true);

-- Anonymous (not logged in) users: no access at all.
-- (No policy for `anon` role = default deny, since RLS is enabled.)

-- 3. Audit log — who changed what, when (helps catch abuse / tampering)
create table if not exists public.orders_audit (
  id bigint generated always as identity primary key,
  order_id uuid not null,
  action text not null,           -- 'insert' | 'update' | 'delete'
  changed_by uuid references auth.users(id),
  changed_at timestamptz not null default now(),
  old_data jsonb,
  new_data jsonb
);

alter table public.orders_audit enable row level security;

create policy "Authenticated users can view audit log"
  on public.orders_audit for select
  to authenticated
  using (true);

create or replace function public.audit_orders()
returns trigger as $$
begin
  if tg_op = 'INSERT' then
    insert into public.orders_audit(order_id, action, changed_by, new_data)
    values (new.id, 'insert', auth.uid(), to_jsonb(new));
    return new;
  elsif tg_op = 'UPDATE' then
    insert into public.orders_audit(order_id, action, changed_by, old_data, new_data)
    values (new.id, 'update', auth.uid(), to_jsonb(old), to_jsonb(new));
    return new;
  elsif tg_op = 'DELETE' then
    insert into public.orders_audit(order_id, action, changed_by, old_data)
    values (old.id, 'delete', auth.uid(), to_jsonb(old));
    return old;
  end if;
  return null;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_orders_audit on public.orders;
create trigger trg_orders_audit
  after insert or update or delete on public.orders
  for each row execute function public.audit_orders();

-- 4. Seed data: 100 fake iPhone orders for the demo
do $$
declare
  models text[] := array['iPhone 11','iPhone 12','iPhone 12 Pro','iPhone 13','iPhone 13 Pro',
                          'iPhone 14','iPhone 14 Pro','iPhone 14 Pro Max','iPhone 15','iPhone 15 Pro'];
  years int[] := array[2019,2020,2020,2021,2021,2022,2022,2022,2023,2023];
  colors text[] := array['Black','White','Blue','Green','Purple','Red','Gold','Silver'];
  storages int[] := array[64,128,256,512];
  conditions text[] := array['new','like_new','used'];
  statuses text[] := array['pending','processing','shipped','delivered','cancelled'];
  first_names text[] := array['Aisyah','Wei Jian','Muthu','Farhan','Li Ying','Kavya','Zul','Nur','Hafiz','Chin Yee'];
  last_names text[] := array['Tan','Rahman','Kumar','Lee','Ismail','Chong','Devi','Osman','Wong','Aziz'];
  cities text[] := array['Kuala Lumpur','Petaling Jaya','Subang Jaya','Johor Bahru','Penang','Shah Alam','Ipoh','Melaka'];
  i int;
  idx int;
  cond text;
begin
  for i in 1..100 loop
    idx := 1 + floor(random()*10)::int;
    cond := conditions[1 + floor(random()*3)::int];
    insert into public.orders (
      order_number, customer_name, customer_email, shipping_address,
      iphone_model, model_year, storage_gb, color, condition, battery_health,
      price, status
    ) values (
      'ORD-' || to_char(1000 + i, 'FM0000'),
      first_names[1 + floor(random()*10)::int] || ' ' || last_names[1 + floor(random()*10)::int],
      lower(replace(first_names[1 + floor(random()*10)::int], ' ', '')) || i || '@example.com',
      (10 + floor(random()*90))::int || ', Jalan ' || (1 + floor(random()*20))::int ||
        ', ' || cities[1 + floor(random()*8)::int] || ', Malaysia',
      models[idx],
      years[idx],
      storages[1 + floor(random()*4)::int],
      colors[1 + floor(random()*8)::int],
      cond,
      case when cond = 'new' then null else (75 + floor(random()*25))::int end,
      round((300 + random()*1400)::numeric, 2),
      statuses[1 + floor(random()*5)::int]
    );
  end loop;
end $$;
