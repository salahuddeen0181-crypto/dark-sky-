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
  status       text not null default 'new',  -- new | accepted | served (failed: older orders Telegram missed)
  accepted_by  text,
  tg_message_id bigint,
  created_at   timestamptz not null default now(),
  accepted_at  timestamptz,
  served_at    timestamptz
);
create index if not exists orders_table_created on orders (table_id, created_at desc);
create index if not exists orders_created on orders (created_at desc);

-- Guest's comment for the waiter; edited_at: staff changed the lines (something ran out).
alter table orders add column if not exists note text;
alter table orders add column if not exists edited_at timestamptz;

-- Admin-edited site content (home tiles, categories, promotions, rules) over the bundled defaults: key 'content'.
create table if not exists settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

-- Waiters, verified through Telegram (the staff Mini App): a new one is 'pending' until the admin approves.
create table if not exists staff (
  id           serial primary key,
  tg_id        bigint not null unique,
  name         text not null,
  username     text,
  status       text not null default 'pending',  -- pending | active | blocked
  created_at   timestamptz not null default now(),
  last_seen_at timestamptz
);

-- Shifts: started / ended from the staff app or the bot (/smena); one left open is closed after 14 h.
create table if not exists shifts (
  id          serial primary key,
  staff_id    int not null references staff(id),
  started_at  timestamptz not null default now(),
  ended_at    timestamptz,
  auto_closed boolean not null default false
);
create index if not exists shifts_staff_started on shifts (staff_id, started_at desc);
create unique index if not exists shifts_one_open on shifts (staff_id) where ended_at is null;

-- Who approved / served an order (the text name stays for history and Telegram)
alter table orders add column if not exists accepted_by_id int references staff(id);
alter table orders add column if not exists served_by_id int references staff(id);
