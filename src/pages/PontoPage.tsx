import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Drum, Mic2, Share2, Loader2, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { TOQUE_OPTIONS, CLASSIFICACAO_OPTIONS, type ToqueTipo, type Classificacao } from "@/contexts/PontosContext";
import { getEmbedInfo } from "@/lib/embed";
import { PublicHeader } from "@/components/PublicHeader";

const SITE_URL = "https://cadernodooga.lovable.app";

interface PontoView {
  id: string;
  slug: string;
  nome: string;
  categoria: string;
  letra: string;
  audio: string;
  puxador: string;
  toque: ToqueTipo | null;
  subcategorias: string[];
  classificacoes: Classificacao[];
}

function buildDescription(letra: string): string {
  const flat = letra.replace(/\s+/g, " ").trim();
  if (flat.length <= 155) return flat;
  return flat.slice(0, 152).trimEnd() + "…";
}

const PontoPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [ponto, setPonto] = useState<PontoView | null>(null);
  const [status, setStatus] = useState<"loading" | "found" | "missing">("loading");

  useEffect(() => {
    let cancelled = false;
    if (!slug) return;

    (async () => {
      setStatus("loading");
      const { data: p, error } = await supabase
        .from("pontos")
        .select("id, slug, nome, categoria, letra, audio, puxador, toque")
        .eq("slug", slug)
        .eq("status", "approved")
        .maybeSingle();

      if (cancelled) return;
      if (error || !p) {
        setStatus("missing");
        return;
      }

      const [{ data: subs }, { data: classifs }] = await Promise.all([
        supabase.from("ponto_subcategorias").select("subcategoria").eq("ponto_id", p.id),
        supabase.from("ponto_classificacoes").select("classificacao").eq("ponto_id", p.id),
      ]);

      if (cancelled) return;
      setPonto({
        id: p.id,
        slug: p.slug,
        nome: p.nome,
        categoria: p.categoria,
        letra: p.letra,
        audio: p.audio ?? "",
        puxador: p.puxador ?? "",
        toque: p.toque,
        subcategorias: (subs ?? []).map((s) => s.subcategoria),
        classificacoes: (classifs ?? []).map((c) => c.classificacao),
      });
      setStatus("found");
    })();

    return () => { cancelled = true; };
  }, [slug]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="animate-spin text-accent" size={32} />
      </div>
    );
  }

  if (status === "missing" || !ponto) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <PublicHeader />
        <main className="flex-1 flex items-center justify-center px-6">
          <div className="text-center max-w-md">
            <h1 className="font-display text-2xl font-bold uppercase text-foreground mb-3">
              Ponto não encontrado
            </h1>
            <p className="text-muted-foreground mb-6">
              Este ponto pode ter sido removido ou ainda está aguardando aprovação.
            </p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-accent-foreground font-bold uppercase text-sm hover:bg-accent/90 transition-all"
            >
              <ArrowLeft size={16} />
              Voltar ao caderno
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const toqueLabel = TOQUE_OPTIONS.find((t) => t.value === ponto.toque)?.label;
  const classifLabels = ponto.classificacoes
    .map((c) => CLASSIFICACAO_OPTIONS.find((o) => o.value === c))
    .filter(Boolean) as { value: string; label: string }[];
  const embed = getEmbedInfo(ponto.audio);
  const url = `${SITE_URL}/ponto/${ponto.slug}`;
  const title = `${ponto.nome.toUpperCase()} — Caderno do Ogã`;
  const description = buildDescription(ponto.letra);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "MusicComposition",
    name: ponto.nome,
    inLanguage: "pt-BR",
    genre: ponto.categoria,
    url,
    lyrics: { "@type": "CreativeWork", text: ponto.letra },
    ...(ponto.puxador ? { composer: { "@type": "Person", name: ponto.puxador } } : {}),
  };

  const handleShare = async () => {
    const header = `🪘 ${ponto.nome}\n${ponto.categoria}${ponto.subcategorias.length ? " › " + ponto.subcategorias.join(" • ") : ""}\n\n`;
    const text = header + ponto.letra + `\n\n${url}`;
    try {
      if (navigator.share) await navigator.share({ title: ponto.nome, text, url });
      else window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
    } catch { /* cancelado */ }
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        {/* canonical emitido globalmente por <Canonical /> */}
        <meta property="og:type" content="article" />
        <meta property="og:site_name" content="Caderno do Ogã" />
        <meta property="og:title" content={ponto.nome} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={url} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={ponto.nome} />
        <meta name="twitter:description" content={description} />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      <PublicHeader />

      <div className="sticky top-[57px] z-10 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-muted-foreground font-bold uppercase truncate">
              {ponto.categoria}{ponto.subcategorias.length ? ` › ${ponto.subcategorias.join(" • ")}` : ""}
            </p>
            <h1 className="font-display text-base sm:text-lg font-bold text-foreground uppercase truncate">
              {ponto.nome}
            </h1>
          </div>
          <button
            onClick={handleShare}
            className="p-2 rounded-lg hover:bg-muted transition-all active:scale-90 shrink-0"
            aria-label="Compartilhar"
          >
            <Share2 size={20} className="text-muted-foreground" />
          </button>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10 pb-32">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-6">
          {toqueLabel && (
            <div className="flex items-center gap-1.5 text-sm">
              <Drum size={14} className="text-accent" />
              <span className="text-muted-foreground uppercase font-semibold text-xs">Toque:</span>
              <span className="text-foreground font-medium">{toqueLabel}</span>
            </div>
          )}
          {ponto.puxador && (
            <div className="flex items-center gap-1.5 text-sm">
              <Mic2 size={14} className="text-accent" />
              <span className="text-muted-foreground uppercase font-semibold text-xs">Puxa:</span>
              <span className="text-foreground font-medium">{ponto.puxador}</span>
            </div>
          )}
          {classifLabels.map((c) => (
            <span
              key={c.value}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-accent/15 text-accent border border-accent/30"
            >
              {c.label}
            </span>
          ))}
        </div>

        <div className="relative">
          <div className="absolute left-0 top-0 bottom-0 w-1.5 rounded-full bg-accent/40" />
          <pre className="text-xl sm:text-2xl md:text-3xl text-foreground whitespace-pre-wrap font-[inherit] leading-relaxed pl-6 py-2 uppercase font-medium tracking-wide">
            {ponto.letra}
          </pre>
        </div>

        {embed.kind !== "none" && (
          <div className="mt-10">
            {embed.kind === "youtube" && (
              <div className="aspect-video rounded-2xl overflow-hidden bg-black">
                <iframe src={embed.src} title={ponto.nome} className="w-full h-full" allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />
              </div>
            )}
            {embed.kind === "spotify" && (
              <iframe src={embed.src} title={ponto.nome} className="w-full rounded-2xl" height={232} allow="autoplay; clipboard-write; encrypted-media; picture-in-picture" />
            )}
            {embed.kind === "audio" && (
              <audio src={embed.src} controls className="w-full" />
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default PontoPage;
