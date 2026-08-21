import Fuse from "fuse.js";
import type { IFuseOptions } from "fuse.js";

export const normalizeText = (s: string) =>
  (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const squash = (s: string) => normalizeText(s).replace(/[^a-z0-9]/g, "");

export interface SearchableItem {
  id: string;
  nome: string;
  categoria: string;
  subcategorias: string[];
  letra: string;
}

interface Indexed<T> {
  item: T;
  nome: string;
  nomeSquash: string;
  categoria: string;
  subcategorias: string;
  letra: string;
}

const options: IFuseOptions<Indexed<unknown>> = {
  includeScore: true,
  ignoreLocation: true,
  threshold: 0.34,
  minMatchCharLength: 2,
  keys: [
    { name: "nome", weight: 0.5 },
    { name: "nomeSquash", weight: 0.25 },
    { name: "subcategorias", weight: 0.12 },
    { name: "categoria", weight: 0.08 },
    { name: "letra", weight: 0.05 },
  ],
};

export function buildSearchIndex<T extends SearchableItem>(items: T[]) {
  const docs: Indexed<T>[] = items.map((item) => ({
    item,
    nome: normalizeText(item.nome),
    nomeSquash: squash(item.nome),
    categoria: normalizeText(item.categoria),
    subcategorias: (item.subcategorias || []).map(normalizeText).join(" "),
    letra: normalizeText(item.letra),
  }));
  return new Fuse(docs, options as IFuseOptions<Indexed<T>>);
}

/**
 * Busca inteligente: primeiro os resultados exatos (substring),
 * depois os aproximados do Fuse, mantendo a ordem original da lista.
 */
export function fuzzySearch<T extends SearchableItem>(
  items: T[],
  query: string,
  fuse: Fuse<Indexed<T>>,
): T[] {
  const q = normalizeText(query.trim());
  if (!q) return items;

  const allowed = new Set(items.map((i) => i.id));
  const qSquash = squash(query);

  const exact = items.filter((p) => {
    return (
      normalizeText(p.nome).includes(q) ||
      squash(p.nome).includes(qSquash) ||
      normalizeText(p.categoria).includes(q) ||
      normalizeText(p.letra).includes(q) ||
      (p.subcategorias || []).some((s) => normalizeText(s).includes(q))
    );
  });
  const exactIds = new Set(exact.map((p) => p.id));

  const approx =
    q.length >= 3
      ? fuse
          .search(q, { limit: 60 })
          .map((r) => r.item.item)
          .filter((p) => allowed.has(p.id) && !exactIds.has(p.id))
      : [];

  return [...exact, ...approx];
}
