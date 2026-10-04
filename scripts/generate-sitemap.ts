// Runs before `vite dev` and `vite build`; writes public/sitemap.xml.
import { existsSync, readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

const BASE_URL = "https://cadernodooga.com.br";
loadDotEnv();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

/** Lê o .env local (sem sobrescrever variáveis já definidas, como as da Vercel). */
function loadDotEnv() {
  const file = resolve(".env");
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"]*)"?\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
  }
}

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

  try {
    if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error("VITE_SUPABASE_URL/VITE_SUPABASE_PUBLISHABLE_KEY ausentes");
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
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
    console.warn("sitemap: falha ao buscar pontos, gerando apenas home:", (e as Error).message);
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
