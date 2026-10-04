export const AD_IMAGE_MAX_BYTES = 1024 * 1024;
export const AD_IMAGE_TYPES: Record<string, "png" | "jpg" | "webp" | "gif"> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
// Mesmo formato aceito pelo CHECK do banco.
const TARGET_URL_RE = /^https:\/\/[A-Za-z0-9.-]+\.[A-Za-z]{2,}(:[0-9]{2,5})?([/?#][^\s]*)?$/;

export function validateTargetUrl(raw: string): string | null {
  const value = raw.trim();
  if (!value) return "Informe o link de destino.";
  if (value.length > 2048) return "O link é longo demais.";
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return "Link inválido.";
  }
  if (url.protocol !== "https:") return "Use um link que comece com https://.";
  if (url.username || url.password) return "O link não pode conter usuário ou senha.";
  if (!TARGET_URL_RE.test(value)) return "Link inválido.";
  return null;
}

export function validateImageFile(file: { type: string; size: number }): string | null {
  if (!AD_IMAGE_TYPES[file.type]) return "Envie uma imagem PNG, JPG, WEBP ou GIF.";
  if (file.size > AD_IMAGE_MAX_BYTES) return "A imagem deve ter no máximo 1 MB.";
  if (file.size === 0) return "Arquivo vazio.";
  return null;
}

/** Proporção diferente da recomendada em mais de 15% distorce o espaço; avisamos sem bloquear. */
export function imageRatioWarning(
  img: { width: number; height: number },
  expected: { width: number; height: number },
): string | null {
  if (!img.width || !img.height) return null;
  const ratio = img.width / img.height;
  const target = expected.width / expected.height;
  if (Math.abs(ratio - target) / target > 0.15) {
    return `A imagem tem ${img.width}×${img.height}; o recomendado é ${expected.width}×${expected.height}. Ela será recortada para caber.`;
  }
  if (img.width < expected.width * 0.5) {
    return `A imagem é pequena (${img.width}px de largura) e pode ficar borrada; o recomendado é ${expected.width}px.`;
  }
  return null;
}

export interface CampaignInput {
  advertiserId: string;
  name: string;
  placementKey: string;
  altText: string;
  targetUrl: string;
  startsAt: string | null;
  endsAt: string | null;
  weight: number;
  maxImpressions: number | null;
  budgetCents: number | null;
  hasImage: boolean;
}

export type CampaignErrors = Partial<Record<keyof CampaignInput, string>>;

export function validateCampaign(input: CampaignInput): CampaignErrors {
  const e: CampaignErrors = {};
  if (!input.advertiserId) e.advertiserId = "Escolha o anunciante.";
  const name = input.name.trim();
  if (!name) e.name = "Informe o nome da campanha.";
  else if (name.length > 120) e.name = "Use até 120 caracteres.";
  if (!input.placementKey) e.placementKey = "Escolha o espaço.";
  const alt = input.altText.trim();
  if (alt.length < 3 || alt.length > 200) e.altText = "Descreva a imagem em 3 a 200 caracteres (acessibilidade).";
  const urlError = validateTargetUrl(input.targetUrl);
  if (urlError) e.targetUrl = urlError;
  if (!input.startsAt) e.startsAt = "Informe o início.";
  if (!input.endsAt) e.endsAt = "Informe o término.";
  if (input.startsAt && input.endsAt && new Date(input.endsAt) <= new Date(input.startsAt)) {
    e.endsAt = "O término precisa ser depois do início.";
  }
  if (!Number.isInteger(input.weight) || input.weight < 1 || input.weight > 10) e.weight = "Prioridade de 1 a 10.";
  if (input.maxImpressions != null && (!Number.isInteger(input.maxImpressions) || input.maxImpressions < 1)) {
    e.maxImpressions = "Use um número inteiro maior que zero, ou deixe vazio.";
  }
  if (input.budgetCents != null && (!Number.isInteger(input.budgetCents) || input.budgetCents < 0)) {
    e.budgetCents = "Valor inválido.";
  }
  if (!input.hasImage) e.hasImage = "Envie a imagem do anúncio.";
  return e;
}

export interface AdvertiserInput {
  name: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  notes: string;
}

export function validateAdvertiser(input: AdvertiserInput): Partial<Record<keyof AdvertiserInput, string>> {
  const e: Partial<Record<keyof AdvertiserInput, string>> = {};
  const name = input.name.trim();
  if (!name || name.length > 120) e.name = "Informe o nome (até 120 caracteres).";
  if (input.contactName.length > 120) e.contactName = "Até 120 caracteres.";
  const email = input.contactEmail.trim();
  if (email && (email.length > 254 || !EMAIL_RE.test(email))) e.contactEmail = "E-mail inválido.";
  if (input.contactPhone.length > 40) e.contactPhone = "Até 40 caracteres.";
  if (input.notes.length > 2000) e.notes = "Até 2000 caracteres.";
  return e;
}

export interface LeadInput {
  name: string;
  company: string;
  email: string;
  phone: string;
  interest: string;
  message: string;
  consent: boolean;
}

export function validateLead(input: LeadInput): Partial<Record<keyof LeadInput, string>> {
  const e: Partial<Record<keyof LeadInput, string>> = {};
  const name = input.name.trim();
  if (name.length < 2 || name.length > 120) e.name = "Informe seu nome.";
  const email = input.email.trim();
  if (!email || email.length > 254 || !EMAIL_RE.test(email)) e.email = "Informe um e-mail válido.";
  if (input.company.length > 120) e.company = "Até 120 caracteres.";
  if (input.phone.length > 40) e.phone = "Até 40 caracteres.";
  const msg = input.message.trim();
  if (msg.length < 10) e.message = "Conte um pouco sobre o que deseja anunciar (mínimo 10 caracteres).";
  else if (msg.length > 2000) e.message = "Use até 2000 caracteres.";
  if (!input.consent) e.consent = "É preciso autorizar o uso dos dados para podermos responder.";
  return e;
}

export const LEAD_RESULT_MESSAGE: Record<string, string> = {
  ok: "Recebemos seu contato! Responderemos pelo e-mail informado.",
  consent: "É preciso autorizar o uso dos dados para podermos responder.",
  invalid: "Confira os campos e tente de novo.",
  rate_limited: "Recebemos muitos envios agora. Tente novamente mais tarde.",
};
