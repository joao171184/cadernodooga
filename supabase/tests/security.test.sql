-- Testes de RLS/autorização (pgTAP). Somente ambiente LOCAL com dados artificiais.
-- Pré-requisitos: `supabase start` + migrations de supabase/migrations E de drizzle/migrations
-- (incluindo 0002_security_hardening.sql) aplicadas no banco local.
-- Executar: supabase test db
begin;
create extension if not exists pgtap with schema extensions;

select plan(16);

-- ---------- usuários de teste ----------
insert into auth.users (instance_id, id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000', 'aaaaaaaa-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'visitante@exemplo.test', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'aaaaaaaa-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'oga@exemplo.test', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'aaaaaaaa-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'joao.pedro.am@icloud.com', null, '{}', '{}', now(), now());

update public.user_roles set role = 'oga' where user_id = 'aaaaaaaa-0000-4000-8000-000000000002';
insert into public.role_permissions (role, permission, allowed) values ('visitante', 'add_pontos', true)
  on conflict (role, permission) do update set allowed = true;
insert into public.user_notas (user_id, content) values ('aaaaaaaa-0000-4000-8000-000000000002', 'nota privada do ogã');
insert into public.pontos (id, nome, categoria, letra, created_by, status)
values ('bbbbbbbb-0000-4000-8000-000000000001', 'Ponto aprovado de teste', 'Abertura', 'letra', 'aaaaaaaa-0000-4000-8000-000000000001', 'approved'),
       ('bbbbbbbb-0000-4000-8000-000000000002', 'Ponto pendente do ogã', 'Abertura', 'letra', 'aaaaaaaa-0000-4000-8000-000000000002', 'pending');

-- ---------- cadastro com e-mail "privilegiado" ----------
select is(
  (select role::text from public.user_roles where user_id = 'aaaaaaaa-0000-4000-8000-000000000003'),
  'visitante',
  'cadastro com e-mail do antigo super-admin não recebe papel admin'
);

-- ---------- usuário 3 (não confirmado) tentando ser super-admin pelo claim do JWT ----------
set local role authenticated;
set local request.jwt.claims to '{"sub":"aaaaaaaa-0000-4000-8000-000000000003","role":"authenticated","email":"joao.pedro.am.171@gmail.com"}';
select is(public.is_super_admin('aaaaaaaa-0000-4000-8000-000000000003'), false, 'claim de e-mail forjado não concede super-admin');
select throws_ok($$ select * from public.super_admins $$, '42501', null, 'tabela super_admins é inacessível para clientes');

-- ---------- visitante com add_pontos ----------
set local request.jwt.claims to '{"sub":"aaaaaaaa-0000-4000-8000-000000000001","role":"authenticated"}';

insert into public.pontos (id, nome, categoria, letra, created_by, status, approved_by, approved_at)
values ('bbbbbbbb-0000-4000-8000-000000000003', 'Tentativa de publicar direto', 'Abertura', 'letra',
        'aaaaaaaa-0000-4000-8000-000000000002', 'approved', 'aaaaaaaa-0000-4000-8000-000000000001', now());
reset role;
select results_eq(
  $$ select status::text, approved_by, created_by from public.pontos where id = 'bbbbbbbb-0000-4000-8000-000000000003' $$,
  $$ values ('pending'::text, null::uuid, 'aaaaaaaa-0000-4000-8000-000000000001'::uuid) $$,
  'não-admin não publica direto, não define approved_by nem falsifica created_by'
);
set local role authenticated;
set local request.jwt.claims to '{"sub":"aaaaaaaa-0000-4000-8000-000000000001","role":"authenticated"}';

select throws_ok(
  $$ update public.pontos set status = 'approved' where id = 'bbbbbbbb-0000-4000-8000-000000000003' $$,
  '42501', null, 'dono não aprova o próprio ponto'
);
select is(
  (with u as (update public.pontos set nome = 'sequestro' where id = 'bbbbbbbb-0000-4000-8000-000000000002' returning 1) select count(*)::int from u),
  0, 'não altera ponto pendente de outro usuário (IDOR)'
);
select throws_ok(
  $$ insert into public.ponto_subcategorias (ponto_id, subcategoria) values ('bbbbbbbb-0000-4000-8000-000000000001', 'Exu') $$,
  '42501', null, 'dono não altera subcategorias de ponto já aprovado'
);
select throws_ok(
  $$ insert into public.user_roles (user_id, role) values ('aaaaaaaa-0000-4000-8000-000000000001', 'admin') $$,
  '42501', null, 'usuário não concede papel admin a si mesmo'
);
select is(
  (with u as (update public.user_roles set role = 'admin' where user_id = 'aaaaaaaa-0000-4000-8000-000000000001' returning 1) select count(*)::int from u),
  0, 'usuário não promove o próprio papel por UPDATE'
);
select is((select count(*)::int from public.user_notas), 0, 'visitante não lê notas de outro usuário');
select is((select count(*)::int from public.profiles where id <> 'aaaaaaaa-0000-4000-8000-000000000001'), 0, 'visitante não lista perfis de outros');
select throws_ok(
  $$ insert into public.pontos (nome, categoria, letra, created_by, audio) values ('xss', 'Abertura', 'l', 'aaaaaaaa-0000-4000-8000-000000000001', 'javascript:alert(1)//tiktok.com/video/1') $$,
  '23514', null, 'URL de áudio javascript: é rejeitada pelo banco'
);
select is(
  (with u as (update public.role_permissions set allowed = true where role = 'visitante' and permission = 'manage_users' returning 1) select count(*)::int from u),
  0, 'visitante não altera a matriz de permissões'
);

-- ---------- anônimo ----------
reset role;
set local role anon;
set local request.jwt.claims to '{"role":"anon"}';
select is((select count(*)::int from public.pontos where status <> 'approved'), 0, 'anônimo não vê pontos pendentes');
select throws_ok(
  $$ insert into public.pontos (nome, categoria, letra, created_by) values ('x', 'y', 'z', 'aaaaaaaa-0000-4000-8000-000000000001') $$,
  '42501', null, 'anônimo não escreve em pontos'
);
select is((select count(*)::int from public.user_notas), 0, 'anônimo não lê notas');

reset role;
select * from finish();
rollback;
