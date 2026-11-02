export function CopyrightFooter({ id = "direitos-autorais" }: { id?: string }) {
  return (
    <footer id={id} className="w-full scroll-mt-24 border-t border-border bg-card/50 text-muted-foreground">
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 text-sm leading-relaxed [overflow-wrap:anywhere]">
        <p>
          <strong className="font-semibold text-foreground">Direitos Autorais e Créditos:</strong>{" "}
          O Caderno do Ogã é uma plataforma de estudo e preservação cultural da curimba. Todos os vídeos e áudios são reproduzidos diretamente de suas plataformas oficiais (YouTube, Spotify e TikTok), garantindo os créditos e visualizações aos criadores originais. Se você sabe a autoria de algum ponto marcado como não identificado, ou é autor de alguma obra e deseja alterar créditos ou solicitar a remoção, entre em contato pelo e-mail{" "}
          <a href="mailto:joao.pedro.am.171@gmail.com" className="text-accent-strong underline underline-offset-4">joao.pedro.am.171@gmail.com</a>{" "}
          que faremos o ajuste imediatamente.
        </p>
        <p className="mt-4 text-center text-xs">© 2026 Caderno do Ogã - Todos os direitos reservados.</p>
      </div>
    </footer>
  );
}