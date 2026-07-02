// Runs before `vite dev` and `vite build`; writes public/sitemap.xml.
import { writeFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

const BASE_URL = "https://cadernodooga.lovable.app";
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://mqfrmyndqcyosnipjzrg.supabase.co";
const SUPABASE_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xZnJteW5kcWN5b3NuaXBqenJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4ODEyNDcsImV4cCI6MjA5MjQ1NzI0N30.u-jbsRv3dIS93PA3ZkkO-0UNFmfJLY0NUT3JvArtML8";

interface Entry {
  path: string;
  lastmod?: string;
  changefreq?: string;
  priority?: string;
}

async function build() {
  const entries: Entry[] = [
    { path: "/", changefreq: "weekly", priority: "1.0" },
  ];

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  try {
    const { data: pontos } = await supabase
      .from("pontos")
      .select("slug, updated_at, categoria")
      .eq("status", "approved")
      .not("slug", "is", null);

    const categorias = new Set<string>();
    for (const p of pontos ?? []) {
      if (p.slug) {
        entries.push({
          path: `/ponto/${p.slug}`,
          lastmod: p.updated_at ? new Date(p.updated_at).toISOString().slice(0, 10) : undefined,
          changefreq: "monthly",
          priority: "0.8",
        });
      }
      if (p.categoria) categorias.add(p.categoria);
    }

    for (const c of categorias) {
      entries.push({
        path: `/?categoria=${encodeURIComponent(c)}`,
        changefreq: "weekly",
        priority: "0.6",
      });
    }
  } catch (e) {
    console.warn("sitemap: falha ao buscar pontos, gerando apenas home", e);
  }

  const xml = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...entries.map((e) =>
      [
        `  <url>`,
        `    <loc>${BASE_URL}${e.path}</loc>`,
        e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
        e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
        e.priority ? `    <priority>${e.priority}</priority>` : null,
        `  </url>`,
      ]
        .filter(Boolean)
        .join("\n"),
    ),
    `</urlset>`,
  ].join("\n");

  writeFileSync(resolve("public/sitemap.xml"), xml);
  console.log(`sitemap.xml gerado (${entries.length} URLs)`);
}

build();
