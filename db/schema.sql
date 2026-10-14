-- DARKSKY menu + orders. Safe to run repeatedly.

create table if not exists tables (
  id         serial primary key,
  number     int  not null unique,
  token      text not null unique,          -- secret part of the QR link: /t/<token>
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

-- One row per dish. `data` keeps the item exactly as the menu renders it:
-- { name, d: {es,en,ru}, m, p, v: [{ n: {es,en,ru}, p }], t: [taste], str: [min,max], hit, new, pair: [ids], img }
create table if not exists menu_items (
  id         text primary key,
  cat        text not null,
  sort       int  not null default 0,
  hidden     boolean not null default false, -- stop-list: not shown to guests
  data       jsonb not null,
  updated_at timestamptz not null default now()
);
create index if not exists menu_items_cat_sort on menu_items (cat, sort);

create table if not exists images (
  id         uuid primary key default gen_random_uuid(),
  mime       text  not null,
  bytes      bytea not null,
  created_at timestamptz not null default now()
);

create table if not exists orders (
  id           serial primary key,
  table_id     int not null references tables(id),
  table_number int not null,
  lines        jsonb not null,               -- [{ id, name, variant, qty, price, total }]
  subtotal     int not null,
  discount     int not null default 0,
  total        int not null,
  cash         boolean not null default false,
  on_request   boolean not null default false,
  lang         text,
  status       text not null default 'new',  -- new | accepted | served | failed
  accepted_by  text,
  tg_message_id bigint,
  created_at   timestamptz not null default now(),
  accepted_at  timestamptz,
  served_at    timestamptz
);
create index if not exists orders_table_created on orders (table_id, created_at desc);
create index if not exists orders_created on orders (created_at desc);
