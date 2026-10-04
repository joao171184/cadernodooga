// Lógica da função admin-delete-user, sem dependências de Deno (testável com Vitest).

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface AdminDeleteDeps {
  /** Valida o JWT e devolve o id do usuário, ou null se a sessão for inválida. */
  getCallerId(token: string): Promise<string | null>;
  /** Executa is_super_admin com o JWT de quem chama (RLS/auth.uid() do próprio usuário). */
  isCallerSuperAdmin(token: string, callerId: string): Promise<boolean>;
  /** Apaga a conta com a service role. */
  deleteUser(userId: string): Promise<{ ok: boolean }>;
  logError(message: string): void;
}

export interface AdminDeleteResult {
  status: number;
  body: { ok: true } | { error: string };
}

export async function handleAdminDelete(
  authorization: string | null,
  rawBody: unknown,
  deps: AdminDeleteDeps,
): Promise<AdminDeleteResult> {
  const match = /^Bearer\s+(\S+)$/i.exec(authorization ?? "");
  if (!match) return { status: 401, body: { error: "Não autenticado" } };
  const token = match[1];

  const callerId = await deps.getCallerId(token);
  if (!callerId) return { status: 401, body: { error: "Sessão inválida" } };

  if (!(await deps.isCallerSuperAdmin(token, callerId))) {
    return { status: 403, body: { error: "Sem permissão" } };
  }

  const userId =
    rawBody && typeof rawBody === "object" ? (rawBody as { userId?: unknown }).userId : undefined;
  if (typeof userId !== "string" || !UUID_RE.test(userId)) {
    return { status: 400, body: { error: "Requisição inválida" } };
  }
  if (userId.toLowerCase() === callerId.toLowerCase()) {
    return { status: 400, body: { error: "Você não pode excluir sua própria conta" } };
  }

  const { ok } = await deps.deleteUser(userId);
  if (!ok) {
    deps.logError("admin-delete-user: falha ao excluir conta");
    return { status: 500, body: { error: "Não foi possível excluir a conta" } };
  }
  return { status: 200, body: { ok: true } };
}
