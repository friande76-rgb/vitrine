-- =====================================================================
-- VITRINE — base de dados
-- Cola este ficheiro inteiro no Supabase: SQL Editor → New query → Run
-- =====================================================================

-- RESTAURANTES ---------------------------------------------------------
create table if not exists public.restaurants (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name        text not null,
  slug        text not null unique check (slug ~ '^[a-z0-9-]{3,40}$'),
  city        text,
  default_lang text not null default 'pt' check (default_lang in ('pt','fr')),
  created_at  timestamptz not null default now()
);

-- PRATOS ---------------------------------------------------------------
create table if not exists public.dishes (
  id             uuid primary key default gen_random_uuid(),
  restaurant_id  uuid not null references public.restaurants(id) on delete cascade,
  name           text not null,
  name_fr        text,
  description    text,
  description_fr text,
  category       text,
  price_cents    integer not null default 0 check (price_cents >= 0),
  width_cm       numeric(5,1) not null default 20 check (width_cm between 2 and 150),
  serves         smallint not null default 1,
  position       integer not null default 0,
  published      boolean not null default false,
  photo_paths    text[] not null default '{}',
  -- estado do modelo 3D: none → processing → finalizing → ready | failed
  model_status   text not null default 'none'
                 check (model_status in ('none','processing','finalizing','ready','failed')),
  model_progress smallint not null default 0,
  model_error    text,
  meshy_task_id  text,
  model_url      text,
  created_at     timestamptz not null default now()
);
create index if not exists dishes_restaurant_idx on public.dishes(restaurant_id, position);

-- Visitas ao menu (para estatísticas simples)
create table if not exists public.menu_views (
  id            bigint generated always as identity primary key,
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  dish_id       uuid references public.dishes(id) on delete cascade,
  kind          text not null check (kind in ('menu','3d','ar')),
  table_label   text,
  created_at    timestamptz not null default now()
);

-- SEGURANÇA (Row Level Security) ----------------------------------------
alter table public.restaurants enable row level security;
alter table public.dishes      enable row level security;
alter table public.menu_views  enable row level security;

create or replace function public.owns_restaurant(rid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from restaurants where id = rid and owner_id = auth.uid());
$$;

drop policy if exists "restaurants public read" on public.restaurants;
create policy "restaurants public read" on public.restaurants for select using (true);
drop policy if exists "restaurants owner insert" on public.restaurants;
create policy "restaurants owner insert" on public.restaurants for insert to authenticated with check (owner_id = auth.uid());
drop policy if exists "restaurants owner update" on public.restaurants;
create policy "restaurants owner update" on public.restaurants for update to authenticated using (owner_id = auth.uid());
drop policy if exists "restaurants owner delete" on public.restaurants;
create policy "restaurants owner delete" on public.restaurants for delete to authenticated using (owner_id = auth.uid());

drop policy if exists "dishes read" on public.dishes;
create policy "dishes read" on public.dishes for select using (published or public.owns_restaurant(restaurant_id));
drop policy if exists "dishes owner write" on public.dishes;
create policy "dishes owner write" on public.dishes for all to authenticated
  using (public.owns_restaurant(restaurant_id)) with check (public.owns_restaurant(restaurant_id));

drop policy if exists "views insert" on public.menu_views;
create policy "views insert" on public.menu_views for insert with check (true);
drop policy if exists "views owner read" on public.menu_views;
create policy "views owner read" on public.menu_views for select to authenticated using (public.owns_restaurant(restaurant_id));

-- ARMAZENAMENTO DE FICHEIROS ----------------------------------------------
-- photos: fotos dos pratos (públicas, a Meshy precisa de as ler por URL)
-- models: modelos 3D finais (.glb), escritos só pelo servidor
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', true, 10485760, array['image/jpeg','image/png']),
       ('models', 'models', true, 104857600, array['model/gltf-binary','application/octet-stream'])
on conflict (id) do nothing;

-- As fotos ficam em photos/<restaurant_id>/<dish_id>/<ficheiro>.jpg
drop policy if exists "photos owner upload" on storage.objects;
create policy "photos owner upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and public.owns_restaurant(((storage.foldername(name))[1])::uuid));
drop policy if exists "photos owner delete" on storage.objects;
create policy "photos owner delete" on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and public.owns_restaurant(((storage.foldername(name))[1])::uuid));

-- LIMITES DE UTILIZAÇÃO -------------------------------------------------
-- Cada modelo 3D gasta créditos pagos na Meshy. Sem limite, carregar muitas
-- vezes no botão esvazia a conta. Uma linha por (chave, janela de tempo).
create table if not exists public.usage_counters (
  id        bigint generated always as identity primary key,
  key       text not null,
  window_at timestamptz not null,
  count     integer not null default 0,
  unique (key, window_at)
);

-- Só o servidor (chave secreta) escreve aqui.
alter table public.usage_counters enable row level security;

-- Limpeza: apagar contadores com mais de 7 dias.
create or replace function public.prune_usage_counters() returns void
language sql security definer set search_path = public as $$
  delete from usage_counters where window_at < now() - interval '7 days';
$$;

-- Incrementa e devolve o novo valor, numa só operação atómica.
create or replace function public.bump_usage_counter(p_key text, p_window_at timestamptz)
returns integer language plpgsql security definer set search_path = public as $$
declare v_count integer;
begin
  insert into usage_counters (key, window_at, count)
  values (p_key, p_window_at, 1)
  on conflict (key, window_at) do update set count = usage_counters.count + 1
  returning count into v_count;
  return v_count;
end;
$$;

-- PERMISSÕES DAS FUNÇÕES -------------------------------------------------
-- O PostgreSQL dá EXECUTE a toda a gente quando uma função é criada, e o
-- Supabase expõe as funções do schema public como endpoints. Uma função
-- SECURITY DEFINER assim fica a ser um caminho de escrita que ignora o RLS:
-- qualquer pessoa com a chave pública podia encher o contador de outro
-- utilizador (e bloqueá-lo) ou apagar os contadores todos (e ficar sem limite).
revoke all on function public.bump_usage_counter(text, timestamptz) from public, anon, authenticated;
grant execute on function public.bump_usage_counter(text, timestamptz) to service_role;

revoke all on function public.prune_usage_counters() from public, anon, authenticated;
grant execute on function public.prune_usage_counters() to service_role;

-- owns_restaurant é lida pelas próprias políticas, por isso tem de continuar
-- executável pelos clientes; devolve só um booleano sobre linhas do próprio.
revoke all on function public.owns_restaurant(uuid) from public;
grant execute on function public.owns_restaurant(uuid) to anon, authenticated, service_role;

-- LIMITES DE TAMANHO (defesa em profundidade, além do Zod na aplicação) ----
-- "drop ... if exists" primeiro para o ficheiro poder ser corrido outra vez
-- sem rebentar: sem isto, a segunda passagem morre em "constraint already exists".
alter table public.restaurants drop constraint if exists restaurants_name_len;
alter table public.dishes drop constraint if exists dishes_name_len;
alter table public.dishes drop constraint if exists dishes_desc_len;

alter table public.restaurants
  add constraint restaurants_name_len check (char_length(name) between 2 and 120) not valid;
alter table public.dishes
  add constraint dishes_name_len check (char_length(name) <= 120) not valid,
  add constraint dishes_desc_len check (description is null or char_length(description) <= 500) not valid;
alter table public.restaurants validate constraint restaurants_name_len;
alter table public.dishes validate constraint dishes_name_len;
alter table public.dishes validate constraint dishes_desc_len;

-- Índice para as estatísticas dos últimos 30 dias.
create index if not exists menu_views_restaurant_date_idx
  on public.menu_views(restaurant_id, created_at desc);
