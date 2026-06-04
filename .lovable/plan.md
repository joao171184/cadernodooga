## O que vai mudar

### 1. Cada toque tem sua própria ordem
Hoje existe uma única coluna `ordem` por ponto. Quando você arrasta com um filtro de toque ativo, o app reescreve essa ordem global — por isso os pontos se mexem quando você volta pra "TODOS OS TOQUES".

A solução é guardar uma ordem separada para cada toque. Assim você pode organizar:
- "TODOS OS TOQUES" → uma ordem
- "IJEXÁ" → outra ordem
- "NAGÔ" → outra ordem
- etc.

E **nenhuma delas afeta as outras**. O app nunca vai reordenar nada sozinho.

### 2. Ao sair da pasta, volta para "TODOS OS TOQUES"
Quando você mudar de categoria ou subcategoria (ou voltar para a tela inicial), o filtro de toque sempre volta automaticamente para "TODOS OS TOQUES".

---

## Detalhes técnicos

### Backend (migration)
Nova tabela `ponto_toque_ordem`:
- `ponto_id` (FK pontos)
- `toque` (enum toque_tipo)
- `ordem` (int)
- UNIQUE (ponto_id, toque)
- RLS + GRANTs equivalentes aos de `ponto_subcategorias` (select autenticado; update/insert/delete para owner/admin/super_admin/permissão `edit_pontos`).

A coluna `pontos.ordem` continua existindo e representa a ordem quando o filtro é "todos os toques".

### Frontend

**`PontosContext.tsx`**
- Carregar `ponto_toque_ordem` no `refresh()` e expor um `Map<ponto_id, Map<toque, ordem>>` (ex: `toqueOrdens`).
- `reorderPontosInList(orderedList, scope)` ganha um parâmetro extra `toque?: ToqueTipo | null`:
  - Se `toque` for um toque específico → grava apenas em `ponto_toque_ordem` (upsert por (ponto_id, toque)) para os itens da `orderedList`. **Não toca em `pontos.ordem` nem em nenhum outro ponto.**
  - Se `toque` for `null`/`undefined` (todos os toques) → grava em `pontos.ordem` **apenas para os itens da `orderedList`**, sem renumerar os demais.
- Remover a lógica atual que renumera "os outros pontos da pasta" — o app não reordena mais nada que o usuário não tenha movido.

**`Index.tsx`**
- No `useMemo` `filtered`: quando `toqueFilter !== "all"`, ordenar a lista filtrada usando `toqueOrdens[p.id][toqueFilter] ?? Infinity` (itens sem ordem específica caem no fim, mantendo a ordem global como desempate). Quando `toqueFilter === "all"`, segue usando `pontos.ordem`.
- Passar `toqueFilter` (ou `null` quando `"all"`) para `reorderPontosInList` no `handleDrop` e para `movePontoInList`.
- Adicionar `setToqueFilter("all")` no `useEffect` que já zera `classifFilter` quando muda `categoria`/`subcategoria`.

### Comportamento garantido
- Arrastar com filtro "IJEXÁ" ativo → só muda a ordem do IJEXÁ.
- Voltar pra "TODOS OS TOQUES" → ordem global intacta, igual antes.
- Trocar de pasta → filtro de toque volta pra "TODOS OS TOQUES".
- Nenhum ponto é movido sem ação explícita sua.
