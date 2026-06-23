
## Objetivo

Cada ponto vai ganhar uma URL própria, pública, indexável pelo Google, com título/letra/áudio carregados do banco — **sem alterar o design atual** do app. O sistema de login/permissões existente (admin / ogã / visitante) continua valendo para gerenciar conteúdo.

## Backup

O Lovable já versiona automaticamente cada alteração. Antes de aprovar este plano, esta mensagem fica como ponto de restauração — depois de aplicar, basta clicar em **Revert** nesta mensagem na aba **History** para voltar ao estado atual em 1 clique. Não existe (e não é necessário) um botão separado de "criar backup".

<presentation-actions>
  <presentation-open-history>Abrir History</presentation-open-history>
</presentation-actions>

## O que será feito

### 1. Slug no banco (migração)

Adicionar à tabela `pontos`:
- coluna `slug text unique`
- função + trigger que gera o slug a partir de `nome` (minúsculo, sem acento, hífens), garantindo unicidade com sufixo `-2`, `-3`… quando houver colisão
- backfill do slug para todos os pontos já existentes

### 2. Leitura pública dos pontos aprovados (RLS)

Hoje todas as tabelas exigem login. Vou adicionar políticas de **SELECT para o papel `anon`** apenas no necessário para renderizar a página pública:
- `pontos` → só linhas com `status = 'approved'`
- `ponto_subcategorias`, `ponto_classificacoes`, `ponto_toque_ordem` → só linhas ligadas a pontos aprovados
- `categorias` → SELECT público (já é conteúdo de navegação)

`favoritos`, `user_roles`, `profiles`, `role_permissions` e pontos `pending`/`rejected` continuam fechados. Criar / editar / aprovar continua exigindo login + permissão correspondente.

### 3. Nova rota pública `/ponto/:slug`

- Arquivo novo: `src/pages/PontoPage.tsx`
- Rota registrada em `src/App.tsx` **fora** do `ProtectedLayout` (público)
- Busca o ponto pelo slug + dados relacionados via `supabase` direto (sem depender do `PontosContext`, que é autenticado)
- Layout reaproveita exatamente os mesmos componentes/estilos do `PontoFullscreen` atual (cabeçalho com categoria, letra grande em uppercase com barra lateral accent, embed de áudio/vídeo, badges de classificação, toque, puxador). Nenhum token de cor, fonte ou espaçamento muda.
- Header da página pública (mínimo, no mesmo estilo do app):
  - logo + nome "CADERNO DO OGÃ" à esquerda (link para `/`)
  - botão **Entrar** (ou avatar/menu se já logado) à direita, levando para `/login`
- Botão **Compartilhar** já existente no `PontoFullscreen` passa a compartilhar a URL `https://cadernodooga.lovable.app/ponto/<slug>` junto com o texto (melhor para WhatsApp / redes).

### 4. SEO dinâmico por ponto

- Instalar `react-helmet-async` e envolver o app em `<HelmetProvider>` no `src/main.tsx`
- Em `PontoPage.tsx`, `<Helmet>` define dinamicamente:
  - `<title>` → `"{NOME DO PONTO} — Caderno do Ogã"`
  - `<meta name="description">` → primeiras ~155 chars da letra, em frase única
  - `<link rel="canonical">` e `<meta property="og:url">` → URL da própria página
  - `<meta property="og:title">`, `og:type=article`, `og:site_name`
  - JSON-LD `MusicComposition` com `name`, `lyrics.text`, `genre` (categoria), `composer` (puxador, quando houver), `inLanguage="pt-BR"`, `url`
- Remover o `<link rel="canonical">` fixo do `index.html` (passa a ser por rota); manter os `og:*` sitewide como fallback para crawlers que não executam JS.
- `index.html`: nenhuma mudança visual; só ajustes de head.

### 5. Login no canto superior direito

- Só aparece na nova página pública `/ponto/:slug` (o resto do app já tem o `AppSidebar` com login/logout e não será tocado).
- Componente novo e isolado, usando os mesmos tokens de cor/tipografia do design system — zero alteração no CSS global, no `AppSidebar`, no `Index` ou em qualquer componente existente.

### 6. Atualizações de descoberta

- `public/sitemap.xml` passa a listar `/ponto/<slug>` para cada ponto aprovado, gerado em build via um pequeno script (`scripts/gen-sitemap.ts`) que lê do Supabase com a anon key. Roda no `npm run build` via `prebuild`. Se preferir manter simples, posso pular esta etapa.

## O que **não** muda

- Nenhum arquivo CSS, token de tema, fonte, espaçamento ou componente visual existente.
- `src/pages/Index.tsx`, `src/pages/Pendentes.tsx`, `AppSidebar`, `PontoCard`, `PontoFullscreen`, `Login` ficam intactos (exceto o `PontoFullscreen` ganhar opcionalmente um link "Abrir página" — só se você quiser).
- Sistema de papéis (admin/ogã/visitante) e permissões: nada muda.
- Fluxo de e-mail de verificação: nada muda.

## Detalhes técnicos (resumo)

```text
migration:
  ALTER TABLE pontos ADD COLUMN slug text;
  CREATE FUNCTION slugify(text) ...
  CREATE FUNCTION pontos_set_slug() ...  -- trigger BEFORE INSERT/UPDATE OF nome
  UPDATE pontos SET slug = ... (backfill)
  ALTER TABLE pontos ALTER COLUMN slug SET NOT NULL;
  CREATE UNIQUE INDEX pontos_slug_key ON pontos(slug);

  CREATE POLICY "public read approved pontos" ON pontos
    FOR SELECT TO anon USING (status = 'approved');
  GRANT SELECT ON pontos, ponto_subcategorias, ponto_classificacoes,
                 ponto_toque_ordem, categorias TO anon;
  (+ policies análogas nas tabelas filhas)

rotas:
  <Route path="/ponto/:slug" element={<PontoPage />} />   // pública

novos arquivos:
  src/pages/PontoPage.tsx
  src/components/PublicHeader.tsx
  scripts/gen-sitemap.ts            (opcional)

editados:
  src/App.tsx               (rota + HelmetProvider já vem do main)
  src/main.tsx              (HelmetProvider)
  src/components/PontoFullscreen.tsx (share envia URL do slug; opcional)
  index.html                (remove canonical fixo)
  package.json              (react-helmet-async; prebuild opcional)
```

## Pergunta final antes de implementar

Posso seguir incluindo a geração automática de `sitemap.xml` no build (item 6)? Ou prefere pular essa parte e deixar só as páginas + SEO por enquanto?
