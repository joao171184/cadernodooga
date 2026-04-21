

# Plano: Painel Admin, Player YouTube/Spotify e Tela de Login

Vou implementar três grandes mudanças mantendo todo o resto funcionando.

## 1. Tela de Login Dedicada (RBAC)

Criar uma página de login que aparece quando o usuário não está logado (em vez do botão no rodapé do sidebar):

- Tela cheia com logo do tambor 🪘 + título "Caderno do Ogã"
- Dois cartões grandes: **"ACESSO ADMIN"** (ícone 🛡️) e **"APENAS VISUALIZAR"** (ícone 👁️) com descrições
- Ao clicar em um deles, aparece o campo de senha
- Senhas: `admin123` (admin) e `102030` (visitante)
- Senha incorreta → toast de erro (sonner)
- Sessão persistida no `localStorage` com chave `user-role`
- Se não logado, qualquer rota redireciona para `/login`
- Botão "Sair" passa a ficar no header (ícone) em vez do sidebar

**Mudança importante**: A senha do admin muda de `admin` → `admin123` (conforme pedido).

## 2. Painel Admin de Categorias (⚙️)

Novo botão de engrenagem ⚙️ no header (visível só para admin) que abre um modal de gerenciamento:

- **Listar** todas as categorias e subcategorias em árvore
- **Criar categoria** principal (nome + emoji)
- **Criar subcategoria** dentro de uma categoria existente (nome + emoji)
- **Renomear** categoria/subcategoria (clique no ícone ✏️)
- **Excluir** categoria (com confirmação; remove subcategorias junto). Se houver pontos vinculados, alertar.
- **Seletor de emoji**: campo de texto curto com sugestões rápidas (grid de emojis comuns: 🔱 ⚔️ 🏹 ⚡ 🌪️ 🌊 🪞 🌙 🩹 ☀️ 🪶 🕯️ 🧸 🤠 ⚓ 🎶 🌹 😈 etc)
- **Salvar tudo**: persiste a árvore inteira no `localStorage` (chave `caderno-oga-categorias`)

A árvore de categorias passa a ser dinâmica: `categoriaTree` vira um valor carregado do localStorage (com fallback para a árvore padrão atual).

## 3. Player Embutido YouTube / Spotify

Substituir o player de áudio MP3 por um player embutido que reproduz **<lov-code></lov-code>
