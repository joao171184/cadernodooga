# Publicidade

Anúncios diretos (vendidos pelo próprio site) com o Google AdSense como reserva opcional, gerenciados em `/admin/publicidade` (só administradores).

## Como funciona

| Espaço | Chave | Imagem recomendada |
|---|---|---|
| Faixa no topo da lista de pontos | `topo-lista` | 1200×150 (celular 640×200) |
| Card entre os pontos da lista | `lista-entre-cards` | 600×500 |
| Página do ponto, após a letra | `ponto-apos-letra` | 1200×300 (celular 640×320) |

Para cada espaço, a ordem é: anúncio direto elegível, depois AdSense (se ligado, com bloco configurado e com consentimento do visitante), depois nada. Sem anúncio, o espaço não ocupa lugar na página.

**Elegível**: campanha com status ativo, dentro do período, espaço ligado, anunciante não arquivado e limite de impressões não atingido. A campanha **encerra sozinha** quando passa da data de término ou atinge o limite; ninguém precisa pausar.

**Status exibidos**: Rascunho, Agendado (ativa, antes do início), Ativo, Pausado, Encerrado (por data ou limite) e Arquivado. Só Rascunho, Ativo, Pausado e Arquivado são gravados; Agendado e Encerrado são calculados.

**Rodízio**: a cada carregamento de página o banco sorteia entre as campanhas elegíveis, com chance proporcional à prioridade (1 a 10). Quem recebeu menos impressões que a média do espaço ganha 50% a mais de chance, para equilibrar a exposição.

**Fuso**: datas são digitadas e mostradas no horário de Brasília (`America/Sao_Paulo`) e gravadas em UTC. Os relatórios diários usam o dia de Brasília.

**Orçamento**: campo informativo (valor contratado). O limite que efetivamente encerra a campanha é o de impressões.

## Como as métricas são calculadas

São dados próprios, só de anúncios diretos:

- **Impressão**: o anúncio ficou ao menos 50% visível por 1 segundo.
- **Clique**: clique no anúncio por uma sessão que teve impressão dele na última hora.
- **Deduplicação**: no máximo uma impressão e um clique por campanha a cada 30 minutos por sessão anônima (identificador aleatório na `sessionStorage`, gravado com hash e apagado em 2 dias).
- **Filtros**: robôs conhecidos (pelo User-Agent, checado no servidor) e administradores logados não contam.
- **CTR** = cliques ÷ impressões.
- Nenhum IP, nome ou e-mail de visitante é gravado.

As métricas do **AdSense não aparecem no painel**: consulte o painel do Google AdSense. O site não mede, não simula e não redireciona cliques do AdSense.

## Ativar no banco (obrigatório, uma vez)

A migração `drizzle/migrations/0005_advertising.sql` cria tabelas novas, funções, políticas RLS e o bucket de imagens `ads`. Ela não altera tabelas existentes e pode ser rodada de novo sem efeito colateral.

1. No Lovable: **More → Cloud → SQL editor**.
2. Cole o conteúdo do arquivo e execute.
3. Abra `/admin/publicidade` logado como administrador.

Enquanto a migração não for aplicada, o site funciona normalmente sem anúncios, e o painel mostra um aviso.

**Desfazer**: o fim do arquivo tem o bloco `ROLLBACK` comentado. Ele apaga anúncios, métricas e pedidos. O bucket `ads` precisa ser esvaziado e removido pelo painel de Storage.

## Anuncie conosco

O formulário em `/anuncie` grava o pedido no banco pela função `submit_ad_lead`, e os pedidos aparecem na aba **Pedidos** do painel. Não há envio de e-mail.

Na mesma aba, **Quem recebe os avisos de novos pedidos** guarda a lista de usuários do site que devem ser avisados (escolhidos pelo e-mail de cadastro; outros administradores não entram). A lista fica na tabela `ad_lead_recipients` e é removida automaticamente se o usuário for apagado. **O envio de e-mail ainda não existe**: quando for implementado, ele deve usar só essa lista.

Proteções no servidor: campo isca, tempo mínimo de preenchimento (3 s), consentimento obrigatório, validação dos campos, limite de 3 envios por dia por e-mail e 30 por hora no total. Apague os pedidos que não forem mais necessários (LGPD).

## Ligar o Google AdSense (quando tiver conta)

O AdSense vem **desligado**. Não ligue antes de concluir todos os passos:

1. **Conta aprovada** no AdSense para `cadernodooga.com.br`.
2. **ads.txt**: crie `public/ads.txt` com a linha que o AdSense mostrar, por exemplo:
   `google.com, pub-0000000000000000, DIRECT, f08c47fec0942fa0`
   O `vercel.json` já serve esse arquivo sem passar pelo app.
3. **CSP** em `vercel.json`: libere os domínios do Google exigidos pelo AdSense em `script-src`, `img-src`, `frame-src` e `connect-src` (por exemplo `https://pagead2.googlesyndication.com`, `https://tpc.googlesyndication.com`, `https://googleads.g.doubleclick.net`, `https://www.google.com`, `https://ep1.adtrafficquality.google`). Confira a lista atual na ajuda oficial do AdSense sobre Content Security Policy, porque ela muda. O teste `src/test/securityConfig.test.ts` proíbe `https:` e `*` genéricos; liste os domínios um a um.
4. **Consentimento**: o banner aparece só quando o AdSense está ligado. Nenhum script ou cookie do Google carrega antes do "Aceitar", e quem recusa não vê AdSense. Para tráfego do Espaço Econômico Europeu, Reino Unido ou Suíça, o Google exige uma plataforma de consentimento certificada (CMP); o banner próprio cobre o uso no Brasil (LGPD).
5. No painel, aba **Configurações**: informe o ID de editor (`ca-pub-…`), ligue o AdSense e, em cada espaço, ligue o AdSense e informe o ID do bloco criado no AdSense. Esses IDs são públicos, não são senhas.
6. Atualize a política de privacidade mencionando cookies de publicidade do Google.

Regras do Google que o código já respeita: anúncios diretos identificados como "Publicidade", "Patrocinado" ou "Link de afiliado", e anúncios do Google como "Publicidade · Google"; nenhum incentivo a cliques; nenhum script próprio sobre os blocos do Google.

## Extensões futuras

O campo `revenue_type` (`direct`, `sponsorship`, `affiliate`) já identifica patrocínios e links de afiliado com o rótulo correto. Outra rede de anúncios pode entrar como nova reserva em `AdSlot`, seguindo o mesmo padrão do AdSense (configuração no banco, consentimento e CSP).

## Riscos conhecidos

- A contagem de impressões e cliques usa uma função pública. Um robô que troque de sessão a cada chamada consegue inflar números; há deduplicação e filtro de User-Agent, mas não é à prova de fraude. Use os números para acompanhamento, não como auditoria.
- O filtro de robôs depende do User-Agent, que pode ser falsificado.
- Imagens do bucket `ads` são públicas por natureza (aparecem no site).
