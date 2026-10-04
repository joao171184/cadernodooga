import { Link } from "react-router-dom";

const NotFound = () => (
  <div className="flex min-h-screen items-center justify-center bg-background px-4">
    <div className="text-center">
      <h1 className="mb-4 font-display text-4xl font-bold text-foreground">404</h1>
      <p className="mb-4 text-xl text-muted-foreground">Página não encontrada</p>
      <Link to="/" className="text-accent underline hover:text-accent/80">
        Voltar ao caderno
      </Link>
    </div>
  </div>
);

export default NotFound;
