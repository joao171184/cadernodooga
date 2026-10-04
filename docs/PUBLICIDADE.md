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

## Aba Campanhas

- Contadores por status no topo (clique para filtrar).
- Faixa "Precisa de atenção" com campanhas perto do fim (botão **Renovar**, que abre a edição) e campanhas já fora do ar (**Renovar** ou **Arquivar**).
- Filtros: busca por nome, anunciante, espaço, status e **Período** (campanhas no ar em algum momento entre as datas). Arquivadas ficam ocultas até marcar "Mostrar arquivadas" ou filtrar por Arquivado.
- Visualização em **cards** (imagem, métricas e barra do limite de impressões) ou **tabela** (colunas ordenáveis); a escolha fica salva no navegador.
- Ações: **Editar** e, no menu "⋯", Pausar/Ativar, **Duplicar** (abre uma cópia como rascunho, reaproveitando as imagens) e Arquivar/Restaurar. Imagens só são apagadas do Storage quando nenhuma outra campanha as usa.

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

O formulário em `/anuncie` grava o pedido no banco pela função `submit_ad_lead`. A aba **Pedidos** do painel tem três sub-abas:

- **Pedidos**: contadores por status (clique para filtrar), busca por nome, empresa ou e-mail, e cards que abrem com contato, mensagem e ações (Responder por e-mail, Em contato, Concluir, Spam, Apagar). Spam fica oculto, a não ser que o filtro Spam esteja selecionado.
- **Avisos por e-mail**: configuração do Brevo, último envio e destinatários.
- **Histórico de envios**: filtros por tipo (pedido/teste) e resultado (aceitos, com erro, aguardando), remoção de um registro ou de todos os filtrados, 10 por vez com "Mostrar todos". Requer a migração `0007_notify_log_history.sql`, que guarda o código e a mensagem de resposta do Brevo (a resposta bruta do `pg_net` expira em poucas horas).

Em **Avisos por e-mail**, **Quem recebe os avisos de novos pedidos** guarda a lista de usuários do site que devem ser avisados (escolhidos pelo e-mail de cadastro; outros administradores não entram). A lista fica na tabela `ad_lead_recipients` e é removida automaticamente se o usuário for apagado.

### Aviso por e-mail (Brevo)

Migração `drizzle/migrations/0006_lead_notifications.sql` (requer a 0005). Os e-mails de login e de redefinição de senha **não mudam**: continuam saindo do Lovable Cloud.

- A cada pedido novo, um trigger no banco chama a API do Brevo pela extensão `pg_net`, com um e-mail separado para cada destinatário.
- O e-mail traz só nome, empresa e interesse de quem pediu, com link para o painel. Telefone, e-mail e mensagem ficam só no painel (LGPD).
- O envio é assíncrono: se o Brevo falhar, o pedido é gravado mesmo assim.
- A chave do Brevo fica no cofre do banco (Supabase Vault) com o nome `brevo_ads_api_key`, nunca no código, no GitHub ou na Vercel.
- O painel mostra se a chave está guardada (sem revelar o valor), quantos destinatários há e o resultado dos últimos envios. O botão **Enviar e-mail de teste** aceita até 5 testes por hora.
- A quantidade de avisos é limitada pelo próprio formulário: no máximo 30 pedidos por hora.

**Configuração no Brevo:**
1. Crie a conta gratuita e, se pedido, complete o perfil para liberar e-mails transacionais.
2. *Senders, Domains & Dedicated IPs → Domains*: adicione `cadernodooga.com.br` e crie na Cloudflare os registros que o Brevo mostrar (TXT `brevo-code`, CNAME `brevo1._domainkey` e `brevo2._domainkey` em **DNS only**, TXT `_dmarc` se ainda não existir). Se já houver um SPF (`v=spf1`), acrescente `include:spf.brevo.com` nele em vez de criar outro. Não altere registros MX.
3. *Senders*: crie o remetente, por exemplo `avisos@cadernodooga.com.br`.
4. *SMTP & API → API Keys*: gere uma chave. Ela aparece uma vez; não a coloque em arquivos nem em chats.
5. *Security → Authorised IPs*: o banco não tem IP fixo, então o bloqueio por IP precisa ficar desativado, senão o Brevo responde 401/403.

**No editor SQL do Lovable, nesta ordem:**
1. Rode a 0005 (se ainda não rodou), depois a 0006 e a 0007.
2. Guarde a chave (cole-a só no editor):
   `SELECT vault.create_secret('CHAVE_DO_BREVO', 'brevo_ads_api_key', 'Brevo: avisos do Anuncie conosco');`
3. No painel, aba **Pedidos → Avisos por e-mail**: escolha os destinatários, informe o remetente, ligue os avisos, salve e envie um teste.

Trocar a chave: `SELECT vault.update_secret((SELECT id FROM vault.secrets WHERE name = 'brevo_ads_api_key'), 'CHAVE_NOVA');`. Para desligar tudo de imediato, desligue os avisos no painel ou revogue a chave no Brevo.

Proteções no servidor: campo isca, tempo mínimo de preenchimento (3 s), consentimento obrigatório, validação dos campos, limite de 3 envios por dia por e-mail e 30 por hora no total. Apague os pedidos que não forem mais necessários (LGPD).

## Ligar o Google AdSense (quando tiver conta)

O AdSense vem **desligado**. Não ligue antes de concluir todos os passos:

1. **Conta aprovada** no AdSense para `cadernodooga.com.br`.
2. **ads.txt**: crie `public/ads.txt` com a linha que o AdSense mostrar, por exemplo:
   `google.com, pub-0000000000000000, DIRECT, f08c47fec0942fa0`
   O `vercel.json` já serve esse arquivo sem passar pelo app.
3. **CSP** em `vercel.json`: já libera os domínios do Google usados pelo AdSense em `script-src`, `img-src`, `frame-src` e `connect-src`. O Google só dá suporte oficial a CSP com *nonce*, que um site estático não consegue gerar; por isso a lista é fixa e pode ficar desatualizada. Se um anúncio não aparecer, abra o console do navegador (F12): um erro "violates the following Content Security Policy directive" mostra o domínio que falta. Acrescente-o à diretiva indicada e, se for `script-src`, também à lista `SCRIPT_HOSTS` de `src/test/securityConfig.test.ts`. Nunca use `https:` ou `*` genéricos.
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
- Avisos por e-mail: a chave do Brevo passa pela fila interna do `pg_net` por alguns segundos e pode ficar no histórico do editor SQL ao ser cadastrada; se houver dúvida, gere outra chave no Brevo. O bloqueio por IP do Brevo precisa ficar desligado, então a chave vale de qualquer lugar até ser revogada.
- O `pg_net` deixa o banco fazer chamadas HTTP. O schema `net` não é exposto pela API pública do site, mas é um recurso a mais para manter em mente.
