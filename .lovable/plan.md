# Mostrar o anúncio "após a letra" na leitura em tela cheia

## O que foi encontrado
- Existe 1 anúncio ativo e ligado para o espaço "Página do ponto" (após a letra).
- Esse anúncio só está colocado na página individual do ponto (/ponto/...).
- Desde a mudança de leitura, tocar na letra abre o ponto em **tela cheia por cima da lista**, e essa tela cheia não tem o espaço de anúncio. Por isso, na prática, quase ninguém vê o anúncio.

## O que fazer
1. Colocar o mesmo espaço de anúncio "após a letra" no fim da letra na tela cheia, igual à página do ponto (mesmo carrossel, troca por segundos, setas ao passar o mouse no computador, arrastar no celular).
2. Não mudar mais nada.
3. Conferir no navegador: abrir um ponto em tela cheia, rolar até o fim da letra e ver o anúncio; conferir também em /ponto/... que continua aparecendo.

## Detalhes técnicos
- Adicionar `<AdSlot placement="ponto-apos-letra" className="mt-10" />` em `src/components/PontoFullscreen.tsx`, logo após o bloco da letra.
- Verificar com Playwright (desktop e celular) que o slot renderiza imagem.
