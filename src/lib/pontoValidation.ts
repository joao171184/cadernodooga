export const PONTO_LIMITS = {
  nome: 300,
  letra: 50000,
  puxador: 300,
  audio: 2048,
} as const;

const SAFE_URL = /^https:\/\/[^\s<>"'`]+$/;

export function validatePontoFields(input: { nome: string; letra: string; puxador: string; audio: string }): string | null {
  if (input.nome.length > PONTO_LIMITS.nome) return `O nome pode ter no máximo ${PONTO_LIMITS.nome} caracteres.`;
  if (input.letra.length > PONTO_LIMITS.letra) return `A letra pode ter no máximo ${PONTO_LIMITS.letra} caracteres.`;
  if (input.puxador.length > PONTO_LIMITS.puxador) return `O campo "quem puxa" pode ter no máximo ${PONTO_LIMITS.puxador} caracteres.`;
  const audio = input.audio.trim();
  if (audio && (audio.length > PONTO_LIMITS.audio || !SAFE_URL.test(audio))) {
    return "O link precisa começar com https:// (YouTube, Spotify, TikTok ou arquivo de áudio).";
  }
  return null;
}

export function pontoSaveErrorMessage(error: { code?: string } | null | undefined): string {
  if (error?.code === "23514") return "Algum campo está inválido ou longo demais. Revise o link e os textos.";
  if (error?.code === "42501") return "Você não tem permissão para salvar este ponto.";
  return "Não foi possível salvar o ponto. Tente novamente.";
}
