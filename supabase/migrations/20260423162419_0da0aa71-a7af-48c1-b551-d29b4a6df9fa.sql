-- ============ PROFILES ============
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

-- ============ ROLES ENUM + TABLE ============
create type public.app_role as enum ('admin', 'oga', 'visitante');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

-- ============ SECURITY DEFINER FUNCTIONS ============
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

create or replace function public.is_super_admin(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from auth.users
    where id = _user_id and email = 'joao.pedro.am@icloud.com'
  )
$$;

create or replace function public.get_my_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.user_roles where user_id = auth.uid() limit 1
$$;

-- ============ ROLE PERMISSIONS ============
create table public.role_permissions (
  role public.app_role not null,
  permission text not null,
  allowed boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (role, permission)
);
alter table public.role_permissions enable row level security;

-- ============ RLS POLICIES ============

-- profiles
create policy "Users can view own profile"
on public.profiles for select to authenticated
using (auth.uid() = id);

create policy "Super admin can view all profiles"
on public.profiles for select to authenticated
using (public.is_super_admin(auth.uid()));

create policy "Super admin can update profiles"
on public.profiles for update to authenticated
using (public.is_super_admin(auth.uid()));

-- user_roles
create policy "Users can view own role"
on public.user_roles for select to authenticated
using (auth.uid() = user_id);

create policy "Super admin can view all roles"
on public.user_roles for select to authenticated
using (public.is_super_admin(auth.uid()));

create policy "Super admin can insert roles"
on public.user_roles for insert to authenticated
with check (public.is_super_admin(auth.uid()));

create policy "Super admin can update roles"
on public.user_roles for update to authenticated
using (public.is_super_admin(auth.uid()));

create policy "Super admin can delete roles"
on public.user_roles for delete to authenticated
using (public.is_super_admin(auth.uid()));

-- role_permissions: leitura pública (autenticado), escrita só super-admin
create policy "Authenticated can read permissions"
on public.role_permissions for select to authenticated
using (true);

create policy "Super admin can insert permissions"
on public.role_permissions for insert to authenticated
with check (public.is_super_admin(auth.uid()));

create policy "Super admin can update permissions"
on public.role_permissions for update to authenticated
using (public.is_super_admin(auth.uid()));

create policy "Super admin can delete permissions"
on public.role_permissions for delete to authenticated
using (public.is_super_admin(auth.uid()));

-- ============ TRIGGER: novo usuário ============
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email);
  insert into public.user_roles (user_id, role) values (
    new.id,
    case when new.email = 'joao.pedro.am@icloud.com'
         then 'admin'::public.app_role
         else 'visitante'::public.app_role
    end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ============ SEED: permissões padrão ============
-- admin: tudo permitido
insert into public.role_permissions (role, permission, allowed) values
  ('admin', 'view_pontos', true),
  ('admin', 'play_audio', true),
  ('admin', 'favorite', true),
  ('admin', 'add_pontos', true),
  ('admin', 'edit_pontos', true),
  ('admin', 'delete_pontos', true),
  ('admin', 'manage_categories', true),
  ('admin', 'manage_users', true),
-- oga: tudo desmarcado (admin liga depois)
  ('oga', 'view_pontos', false),
  ('oga', 'play_audio', false),
  ('oga', 'favorite', false),
  ('oga', 'add_pontos', false),
  ('oga', 'edit_pontos', false),
  ('oga', 'delete_pontos', false),
  ('oga', 'manage_categories', false),
  ('oga', 'manage_users', false),
-- visitante: tudo desmarcado
  ('visitante', 'view_pontos', false),
  ('visitante', 'play_audio', false),
  ('visitante', 'favorite', false),
  ('visitante', 'add_pontos', false),
  ('visitante', 'edit_pontos', false),
  ('visitante', 'delete_pontos', false),
  ('visitante', 'manage_categories', false),
  ('visitante', 'manage_users', false);
