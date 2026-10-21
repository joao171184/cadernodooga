# Mostrar o anúncio "após a letra" na leitura em tela cheia

## O que foi encontrado
- Existe 1 anúncio ativo e ligado para o espaço "Página do ponto" (após a letra).
- Esse anúncio só está colocado na página individual do ponto (/ponto/...).
- Desde a mudança de leitura, tocar na letra abre o ponto em **tela cheia por cima da lista**, e essa tela cheia não tem o espaço de anúncio. Por isso, na prática, quase ninguém vê o anúncio.

## O que fazer
1. Colocar o anúncio na tela cheia **entre a letra e o vídeo**, igual já está na página do ponto (mesmo carrossel, troca por segundos, setas ao passar o mouse, arrastar no celular).
2. Na página do ponto (/ponto/...) o anúncio já fica entre a letra e o vídeo; manter assim.
3. Não mudar mais nada.
4. Conferir no navegador: abrir um ponto em tela cheia e ver o anúncio logo abaixo da letra e acima do vídeo.

## Detalhes técnicos
- Adicionar `<AdSlot placement="ponto-apos-letra" className="mt-10" />` em `src/components/PontoFullscreen.tsx`, logo após o bloco da letra e antes do bloco do player.
- Verificar com Playwright (desktop e celular) que o slot aparece nessa posição.
