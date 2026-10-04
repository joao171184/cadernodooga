// Traduz erros do Supabase Auth para mensagens que não revelam se uma conta existe.

export const MIN_PASSWORD_LENGTH = 8;

export const GENERIC_SIGNUP_MESSAGE =
  "Se este e-mail puder ser cadastrado, enviaremos um link de confirmação. Verifique sua caixa de entrada e o spam.";
export const GENERIC_RESET_MESSAGE =
  "Se existir uma conta com este e-mail, enviaremos um link para redefinir a senha.";
export const GENERIC_RESEND_MESSAGE =
  "Se houver um cadastro pendente para este e-mail, enviaremos um novo link de confirmação.";
export const EMAIL_SEND_FAILED_MESSAGE =
  "Não foi possível enviar o e-mail agora. Tente novamente em alguns minutos.";

export function translateAuthError(msg?: string | null): string | null {
  if (!msg) return null;
  const m = msg.toLowerCase();
  if (m.includes("invalid login") || m.includes("invalid credentials")) return "E-mail ou senha incorretos";
  if (m.includes("email not confirmed")) return "Confirme seu e-mail antes de entrar";
  if (m.includes("rate limit") || m.includes("too many") || m.includes("security purposes"))
    return "Muitas tentativas. Aguarde alguns minutos e tente novamente.";
  if (m.includes("password should be") || m.includes("weak password"))
    return `A senha precisa ter no mínimo ${MIN_PASSWORD_LENGTH} caracteres e não pode ser fraca`;
  if (m.includes("pwned") || m.includes("compromised")) return "Esta senha aparece em vazamentos. Escolha outra.";
  if (m.includes("same password") || m.includes("different from the old"))
    return "A nova senha precisa ser diferente da atual";
  if (m.includes("error sending") || m.includes("sending email") || m.includes("hook"))
    return EMAIL_SEND_FAILED_MESSAGE;
  if (m.includes("network") || m.includes("fetch")) return "Erro de conexão. Verifique sua internet.";
  return "Não foi possível concluir a operação. Tente novamente.";
}

/** No cadastro, "já cadastrado" vira a mesma resposta de sucesso (sem enumeração). */
export function isAccountExistsError(msg?: string | null): boolean {
  return !!msg && /already registered|already exists|user_already_exists/i.test(msg);
}
