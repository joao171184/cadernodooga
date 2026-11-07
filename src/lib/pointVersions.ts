import type { Classificacao, Ponto, ToqueTipo } from "@/contexts/PontosContext";

export interface PointVersion {
  id?: string;
  point_id?: string;
  title: string;
  letra: string;
  toque: ToqueTipo | null;
  classificacoes: Classificacao[];
  video_url: string;
  observacoes: string;
  ordem: number;
  is_principal: boolean;
  status: "published" | "draft";
  created_at?: string;
}

export function initialVersion(p: Pick<Ponto, "letra" | "audio" | "toque" | "classificacoes">): PointVersion {
  return { title: "", letra: p.letra, toque: p.toque, classificacoes: [...p.classificacoes], video_url: p.audio, observacoes: "", ordem: 0, is_principal: true, status: "published" };
}

export function publishedVersions(versions: PointVersion[]): PointVersion[] {
  return versions.filter(v => v.status === "published").sort((a, b) => Number(b.is_principal) - Number(a.is_principal) || a.ordem - b.ordem || (a.created_at ?? "").localeCompare(b.created_at ?? ""));
}

export function validateVersions(versions: PointVersion[], publishedPoint: boolean): string | null {
  if (!versions.length) return "Adicione ao menos uma versão.";
  if (publishedPoint && !versions.some(v => v.status === "published")) return "Um ponto publicado precisa de ao menos uma versão publicada.";
  if (versions.filter(v => v.is_principal).length > 1) return "Escolha uma única versão principal.";
  if (versions.some(v => !v.letra.trim())) return "Preencha a letra de todas as versões.";
  return null;
}