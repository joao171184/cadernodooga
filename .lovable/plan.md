Importante: NADA que você já cadastrou será apagado. Categorias, subcategorias, pontos, favoritos e usuários ficam exatamente como estão. As mudanças abaixo só adicionam funcionalidades e corrigem bugs.

1. Matriz de permissões funcionando de verdade
- Cada permissão (ver pontos, ouvir áudio, favoritar, adicionar, editar, excluir, gerenciar categorias, gerenciar usuários) passa a controlar de fato o que o Ogã/Visitante consegue fazer.
- Botões e ações na tela aparecem/somem conforme a permissão.
- Regras do banco respeitam a matriz: se o admin liga "Editar pontos" para Ogã, o Ogã consegue editar mesmo o que não foi ele que criou; se desliga, ele só edita os próprios pendentes.
- Admin continua com tudo liberado.
- Depois de salvar, as permissões da sua sessão atualizam na hora.

2. Aba Acessos (Admin) carregando direito
- Carregamento mais robusto, mostrando erro real se algo falhar em vez de ficar travado.
- Sua conta de super-admin sempre aparece na lista.
- Lista mostra papel atual de cada usuário e permite trocar / excluir.

3. Filtros Chamada / Elevação / Sustentação / Todos
- Adiciono uma classificação extra para os pontos: Chamada, Elevação, Sustentação.
- No formulário (novo e editar) aparece para escolher uma ou mais (igual subcategorias).
- Nas pastas (ex: Exu) aparecem abas: Todos | Chamada | Elevação | Sustentação.
- Pontos antigos continuam aparecendo normalmente em "Todos" — você só preenche essa classificação quando quiser.

4. Link de TikTok nos pontos
- Campo do link aceita YouTube, Spotify e TikTok.
- Ícone oficial do TikTok aparece no card quando o link for do TikTok.
- Ao clicar, toca dentro do app (quando o TikTok permitir incorporar) ou abre no TikTok.

5. Setas de mover pontos funcionando
- Hoje quase todos os pontos têm `ordem = 0`, por isso as setas não fazem efeito visível.
- Vou regravar a ordem de cada ponto dentro da sua categoria atual e fazer as setas trocarem a posição certa, salvando no banco e sincronizando entre dispositivos.

6. Mover categorias e subcategorias em Admin > Estrutura
- Setas para cima/baixo em cada categoria principal e em cada subcategoria.
- A nova ordem vale para o menu lateral, formulário e telas.

7. Layout celular / tablet / zoom
- Cabeçalho mais enxuto em telas pequenas (botões agrupam num menu para não quebrar a linha).
- Cards e diálogos com espaçamento melhor em celular e tablet.
- Botão do auto-scroll fica fixo e visível mesmo com zoom (sai do canto inferior fixo só por viewport e não por porcentagem da tela).
- Painel do auto-scroll não escapa da tela em celular.

Detalhes técnicos
- Migração no banco: nova tabela `ponto_classificacoes` (N:N) para Chamada/Elevação/Sustentação; ajuste das policies de `pontos`/`ponto_subcategorias` para respeitarem a matriz; nova função `has_permission(user, permission)`.
- Nenhuma migração apaga dados existentes (somente CREATE/ALTER/POLICY).
- Arquivos a alterar: `AuthContext`, `PontosContext`, `CategoriasContext`, `Index`, `PontoCard`, `PontoFormDialog`, `SettingsDialog`, `CategoriasManagerDialog`, `AutoScrollControl`, `MediaPlayer`, `MediaIcons`, `embed`.
- Arquivos auto-gerados do backend não serão tocados.