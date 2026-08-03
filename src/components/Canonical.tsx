import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";

const SITE_ORIGIN = "https://cadernodooga.com.br";

/**
 * Emite uma única tag rel=canonical (auto-referente) para todas as rotas,
 * sempre apontando para o domínio oficial .com.br.
 */
export function Canonical() {
  const { pathname } = useLocation();
  const path = pathname === "/" ? "/" : pathname.replace(/\/+$/, "");
  const url = `${SITE_ORIGIN}${path}`;

  return (
    <Helmet>
      <link rel="canonical" href={url} />
      <meta property="og:url" content={url} />
    </Helmet>
  );
}

export default Canonical;
