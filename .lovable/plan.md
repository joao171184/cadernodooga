

# Plano: Login redesenhado, papéis (Admin/Ogã/Visitante) e painel de configurações

## 1. Tela de Login `/login` simplificada

A tela passa a ter **apenas 2 opções** visíveis para todo mundo:

- **Entrar** (e-mail + senha)
- **Criar Conta** (e-mail + senha + confirmar senha)

Mudanças:
- Campo de senha ganha **ícone de olho** 👁️ que alterna entre mostrar/ocultar a senha (em login e em criar conta).
- O botão "Acesso Admin" sai da tela. Não existe mais "modo visitante por senha 102030" na entrada — quem só quer ver, cria conta normalmente (vira "Visitante" por padrão).
- Layout permanece o mesmo (fundo desfocado, frase do ogã, logo).

## 2. Sistema de papéis (Admin / Ogã / Visitante)

Hoje só existe "logado/não logado". Vou criar um sistema real de papéis no backend (Lovable Cloud):

- Tabela `profiles` (id, email, criado_em) — criada automaticamente no cadastro via trigger.
- Enum `app_role` com `admin`, `oga`, `visitante`.
- Tabela `user_roles` (user_id, role) — separada por segurança.
- Função `has_role()` SECURITY DEFINER + RLS para evitar recursão.
- Tabela `permissions` (role + chave da permissão + permitido sim/não) para o painel de Acessos editar.

**Super-admin fixo (você):** o e-mail `joao.pedro.am@icloud.com` é tratado como **dono** — sempre tem papel `admin` e é o único que pode acessar o painel de Acessos. Cadastros novos recebem o papel `visitante` por padrão.

## 3. Painel de Configurações (engrenagem do header)

Hoje a engrenagem abre direto o gerenciador de categorias. Vai virar um **menu com 3 abas**:

### Aba 1 — Estrutura
Move o `CategoriasManagerDialog` atual + atalho para "Novo Ponto" para cá. Você gerencia categorias, subcategorias e pontos num só lugar.
**Importante:** mantém os emojis (não troca por ícones Lucide), conforme você pediu.

### Aba 2 — Visibilidade
Controla o que aparece no menu/listagem para cada papel:
- Mostrar/ocultar categorias específicas para Ogã e Visitante.
- Mostrar/ocultar a barra de busca, favoritos e player para cada papel.

### Aba 3 — Acessos (só aparece para o super-admin)
- Lista todos os usuários cadastrados (e-mail + papel atual).
- Dropdown ao lado de cada um: Admin / Ogã / Visitante (você escolhe).
- Matriz de permissões editável por papel — você marca o que cada papel pode fazer:
  - Ver pontos
  - Ouvir áudio
  - Favoritar
  - Adicionar pontos
  - Editar pontos
  - Excluir pontos
  - Gerenciar categorias
  - Gerenciar usuários (só admin, fixo)

Como você pediu para definir as permissões na hora, **a matriz começa toda desmarcada** (exceto Admin = tudo marcado e travado). Você liga o que quiser para Ogã e Visitante direto no painel.

## 4. Comportamento na app

- Botões "Novo Ponto", "Editar", "Excluir", "Categorias" passam a checar a permissão real (não mais só `isAdmin`).
- Só você (super-admin) vê a aba **Acessos** e o botão de gerenciar usuários.
- Logout continua igual.

## Detalhes técnicos

**Backend (migração SQL):**
```sql
-- profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  created_at timestamptz default now()
);
alter table public.profiles enable row level security;

-- enum + user_roles
create type public.app_role as enum ('admin', 'oga', 'visitante');
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique(user_id, role)
);
alter table public.user_roles enable row level security;

-- has_role (SECURITY DEFINER, evita recursão)
create function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.user_roles where user_id=_user_id and role=_role) $$;

-- super-admin fixo
create function public.is_super_admin(_user_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from auth.users where id=_user_id and email='joao.pedro.am@icloud.com') $$;

-- permissions
create table public.role_permissions (
  role app_role not null,
  permission text not null,
  allowed boolean not null default false,
  primary key (role, permission)
);
alter table public.role_permissions enable row level security;

-- trigger: cria profile + papel padrão (visitante; admin se for o super-admin)
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email);
  insert into public.user_roles (user_id, role)
    values (new.id, case when new.email = 'joao.pedro.am@icloud.com'
                         then 'admin'::app_role else 'visitante'::app_role end);
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();
```

**RLS resumida:** cada usuário lê o próprio profile/papel; super-admin lê tudo e atualiza papéis e permissões.

**Frontend:**
- `AuthContext` ganha `role`, `permissions: Set<string>`, `isSuperAdmin` carregados após login.
- Hook `usePermission(key)` para gates nos botões.
- `Login.tsx` reescrito (2 modos + toggle olho na senha).
- Novo componente `SettingsDialog.tsx` com 3 abas (Tabs do shadcn) substituindo o atalho atual da engrenagem.
- `CategoriasManagerDialog.tsx`: já usa emojis — mantido como está.

