# caderno-do-oga — contexto para IA

## O que é
App web gerado no Lovable (README genérico). Finalidade exata: não verificado (ver `roadmap.md`, `.lovable/plan.md`, `docs/PUBLICIDADE.md` sob demanda). Tem SEO/sitemap e ads.txt.

## Stack
Vite ^5.4 + React ^18.3 + TypeScript ^5.8 + shadcn/Radix + Tailwind + TanStack Query; Supabase (`@supabase/supabase-js` ^2.104); Drizzle (`drizzle/schema.ts`); Vitest; deploy Vercel (`vercel.json`). Lockfiles bun e npm.

## Mapa
- `src/` — `main.tsx`/`App.tsx` (entrada), `pages/`, `components/`, `contexts/`, `hooks/`, `integrations/` (Supabase), `lib/`, `test/`.
- `supabase/` — `functions/` (Edge Functions), `migrations/`, `tests/`, `config.toml`.
- `drizzle/` — schema e migrações. `scripts/generate-sitemap.ts`. `public/` — estáticos, sitemap, robots.

## Comandos
- `npm run dev` (gera sitemap antes) | `npm run build` | `npm run build:dev` | `npm run preview`
- `npm run lint` | `npm test` (vitest run) | `npm run test:watch`

## Config
`vite.config.ts`, `vitest.config.ts`, `tsconfig*.json`, `tailwind.config.ts`, `drizzle.config.ts`, `components.json`.
Variáveis (`.env.example`, só nomes): VITE_SUPABASE_PROJECT_ID, VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, VITE_PUBLIC_SITE_URL, BREVO_API_KEY, BREVO_SENDER_EMAIL, BREVO_SENDER_NAME, PUBLIC_SITE_URL, SEND_EMAIL_HOOK_SECRET, ALLOWED_ORIGINS

## Não ler
`node_modules/`, `dist/`, `supabase/.temp/`, `bun.lock*`, `package-lock.json`.

## Regras do projeto
- Frontend só usa a chave publishable; segredos só em Edge Functions.

## Regras gerais para a IA
- Responda em português do Brasil. Leia só os arquivos necessários (busca/grep antes de abrir).
- Não invente arquivos, funções ou APIs: verifique no código. Se não verificou, diga "não verificado".
- Mudanças mínimas; plano curto antes de mexer em mais de 2 arquivos.
- Nunca leia nem exiba `.env*` (só nomes de variáveis), chaves, tokens ou `serviceAccountKey.json`.
- Sem push, deploy ou produção sem pedido explícito do Marcos.
- Depois de editar, rode lint/testes/build que existirem. Mantenha este arquivo atualizado se a estrutura mudar.
