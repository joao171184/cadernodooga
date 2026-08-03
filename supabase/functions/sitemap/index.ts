// Sitemap sempre atualizado, gerado direto do banco.
// URL pública: https://<project>.functions.supabase.co/sitemap
import { createClient } from "npm:@supabase/supabase-js@2";

const BASE_URL = "https://cadernodooga.com.br";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*" } });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );

    const { data: pontos, error } = await supabase
      .from("pontos")
      .select("slug, updated_at, categoria")
      .eq("status", "approved")
      .not("slug", "is", null);

    if (error) throw error;

    const entries: { loc: string; lastmod?: string; changefreq: string; priority: string }[] = [
      { loc: `${BASE_URL}/`, changefreq: "weekly", priority: "1.0" },
    ];

    const categorias = new Set<string>();
    for (const p of pontos ?? []) {
      if (p.slug) {
        entries.push({
          loc: `${BASE_URL}/ponto/${p.slug}`,
          lastmod: p.updated_at ? new Date(p.updated_at).toISOString().slice(0, 10) : undefined,
          changefreq: "monthly",
          priority: "0.8",
        });
      }
      if (p.categoria) categorias.add(p.categoria);
    }
    for (const c of categorias) {
      entries.push({
        loc: `${BASE_URL}/?categoria=${encodeURIComponent(c)}`,
        changefreq: "weekly",
        priority: "0.6",
      });
    }

    const xml = [
      `<?xml version="1.0" encoding="UTF-8"?>`,
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
      ...entries.map((e) =>
        [
          `  <url>`,
          `    <loc>${e.loc}</loc>`,
          e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
          `    <changefreq>${e.changefreq}</changefreq>`,
          `    <priority>${e.priority}</priority>`,
          `  </url>`,
        ].filter(Boolean).join("\n")
      ),
      `</urlset>`,
    ].join("\n");

    return new Response(xml, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=600",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (e) {
    console.error("sitemap error", e);
    return new Response("erro ao gerar sitemap", { status: 500 });
  }
});
