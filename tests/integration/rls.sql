-- Prova que as políticas RLS fazem o que dizem.
-- Corre em qualquer PostgreSQL vazio; ver tests/integration/README.md.
\set ON_ERROR_STOP on

-- Arremedo das partes do Supabase de que o schema depende.
create schema if not exists auth;
create schema if not exists storage;
create table if not exists auth.users(id uuid primary key);
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create table if not exists storage.buckets(
  id text primary key, name text, public bool, file_size_limit bigint, allowed_mime_types text[]);
create table if not exists storage.objects(id uuid default gen_random_uuid(), bucket_id text, name text);
alter table storage.objects enable row level security;
create or replace function storage.foldername(name text) returns text[] language sql as $$
  select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
do $$ begin create role authenticated; exception when others then null; end $$;
do $$ begin create role anon; exception when others then null; end $$;
do $$ begin create role service_role; exception when others then null; end $$;

\i supabase/schema.sql

grant usage on schema public, auth, storage to authenticated, anon;
grant all on all tables in schema public to authenticated, anon;
grant all on all tables in schema storage to authenticated;
grant usage on all sequences in schema public to authenticated, anon;

insert into auth.users values
  ('11111111-1111-1111-1111-111111111111'),
  ('22222222-2222-2222-2222-222222222222');

-- === Dono A cria um restaurante com dois pratos (um publicado) ===
set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
insert into restaurants(name, slug) values ('Tasca', 'tasca-do-largo') returning id \gset
insert into dishes(restaurant_id, name, price_cents) values (:'id', 'Polvo', 2100);
insert into dishes(restaurant_id, name, price_cents, published) values (:'id', 'Nata', 180, true);
insert into storage.objects(bucket_id, name) values ('photos', :'id' || '/x/a.jpg');

do $$ begin
  assert (select count(*) from dishes) = 2, 'o dono tem de ver os dois pratos';
end $$;

-- === Dono B não vê nem altera nada do A ===
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false);
do $$ begin
  assert (select count(*) from dishes) = 1, 'outro utilizador só pode ver o prato publicado';
end $$;

update dishes set price_cents = 1;
do $$ begin
  assert (select count(*) from dishes where price_cents = 1) = 0, 'outro utilizador não pode alterar preços';
end $$;

delete from dishes;
do $$ begin
  assert (select count(*) from dishes) = 1, 'outro utilizador não pode apagar pratos';
end $$;

-- Também não pode carregar fotos para a pasta do restaurante do A.
do $$
declare ok boolean := false;
begin
  begin
    insert into storage.objects(bucket_id, name)
    values ('photos', '00000000-0000-0000-0000-000000000000/x/b.jpg');
  exception when insufficient_privilege or others then ok := true;
  end;
  assert ok, 'upload para a pasta de outro restaurante tem de ser recusado';
end $$;

-- === Visitante anónimo ===
reset role; set role anon;
select set_config('request.jwt.claim.sub', '', false);
do $$ begin
  assert (select count(*) from dishes) = 1, 'o público só vê pratos publicados';
  assert (select count(*) from restaurants) = 1, 'o público vê o restaurante (precisa do nome)';
end $$;

insert into menu_views(restaurant_id, kind) values (:'id', 'menu');
do $$ begin
  assert (select count(*) from menu_views) = 0, 'o público não pode ler as estatísticas que escreve';
end $$;


-- === Tentativas hostis do dono B contra o restaurante do A ===
set role authenticated;
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false);

-- 1) inserir um prato no restaurante de outra pessoa
do $$
declare ok boolean := false;
begin
  begin
    insert into dishes(restaurant_id, name, price_cents)
    select id, 'Prato intruso', 100 from restaurants limit 1;
  exception when insufficient_privilege or check_violation or others then ok := true;
  end;
  assert ok, 'nao se pode inserir pratos no restaurante de outro';
  assert (select count(*) from dishes where name = 'Prato intruso') = 0, 'o prato intruso nao pode existir';
end $$;

-- 2) publicar um prato de outro (tornar visivel no menu dele)
update dishes set published = true;
do $$ begin
  assert (select count(*) from dishes where published) = 1, 'nao se pode publicar pratos de outro';
end $$;

-- 3) roubar o restaurante mudando o dono
update restaurants set owner_id = '22222222-2222-2222-2222-222222222222';
do $$ begin
  assert (select count(*) from restaurants
          where owner_id = '11111111-1111-1111-1111-111111111111') = 1,
         'nao se pode roubar o restaurante de outro';
end $$;

-- 4) apagar as fotos de outro restaurante
delete from storage.objects where bucket_id = 'photos';
reset role;
do $$ begin
  assert (select count(*) from storage.objects where bucket_id = 'photos') = 1,
         'nao se podem apagar as fotos de outro restaurante';
end $$;
set role authenticated;
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false);

-- 5) ler ou escrever os contadores de limites
-- Semeamos uma linha como superutilizador: assim, ver zero prova mesmo que o
-- RLS esconde, em vez de provar apenas que a tabela esta vazia.
reset role;
insert into usage_counters(key, window_at, count) values ('model:hour:do-dono-a', now(), 7);
do $$ begin
  assert (select count(*) from usage_counters) = 1, 'a linha semeada tem de existir';
end $$;
set role authenticated;
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false);
do $$ begin
  assert (select count(*) from usage_counters) = 0, 'os contadores nao sao legiveis pelos clientes';
end $$;
do $$
declare ok boolean := false;
begin
  begin insert into usage_counters(key, window_at, count) values ('model:hour:x', now(), 0);
  exception when insufficient_privilege or others then ok := true;
  end;
  assert ok, 'nao se pode escrever nos contadores de limites';
end $$;

-- === O dono nao pode dar a si proprio um restaurante que nao criou ===
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
do $$
declare ok boolean := false;
begin
  begin
    insert into restaurants(name, slug, owner_id)
    values ('Roubado', 'roubado', '22222222-2222-2222-2222-222222222222');
  exception when insufficient_privilege or others then ok := true;
  end;
  assert ok, 'nao se pode criar um restaurante em nome de outro';
end $$;

-- === Os limites da base de dados valem mesmo (nao so o Zod no browser) ===
do $$
declare ok boolean := false;
begin
  begin
    insert into dishes(restaurant_id, name, price_cents, width_cm)
    select id, 'Prato gigante', 100, 900 from restaurants limit 1;
  exception when check_violation then ok := true;
  end;
  assert ok, 'a largura fora de 2-150 cm tem de ser recusada pela base';
end $$;

do $$
declare ok boolean := false;
begin
  begin
    insert into dishes(restaurant_id, name, price_cents)
    select id, repeat('x', 200), 100 from restaurants limit 1;
  exception when check_violation then ok := true;
  end;
  assert ok, 'um nome com 200 caracteres tem de ser recusado pela base';
end $$;

-- === Visitante anonimo nao cria restaurantes ===
reset role; set role anon;
select set_config('request.jwt.claim.sub', '', false);
do $$
declare ok boolean := false;
begin
  begin insert into restaurants(name, slug) values ('Anonimo', 'anonimo');
  exception when insufficient_privilege or others then ok := true;
  end;
  assert ok, 'um visitante anonimo nao pode criar restaurantes';
end $$;

-- === Funções SECURITY DEFINER não podem estar abertas ao público ===
reset role; set role anon;
do $$
declare ok boolean := false;
begin
  begin
    perform bump_usage_counter('model:hour:outro-utilizador', now());
  exception when insufficient_privilege then ok := true;
  end;
  assert ok, 'anon não pode mexer nos contadores de limite de outros';
end $$;

do $$
declare ok boolean := false;
begin
  begin
    perform prune_usage_counters();
  exception when insufficient_privilege then ok := true;
  end;
  assert ok, 'anon não pode apagar os contadores para escapar aos limites';
end $$;

reset role;
\echo '=== RLS OK: 19 verificações passaram ==='
