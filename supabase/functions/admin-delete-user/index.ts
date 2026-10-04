// Edge function: super-admin apaga contas de usuários
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeadersFor, parseAllowedOrigins } from "../_shared/cors.ts";
import { handleAdminDelete } from "../_shared/adminDeleteUser.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ALLOWED_ORIGINS = parseAllowedOrigins(Deno.env.get("ALLOWED_ORIGINS"));

const userClient = (token: string) =>
  createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

const serviceClient = () =>
  createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

async function hasAdminRole(userId: string): Promise<boolean> {
  const { data, error } = await serviceClient()
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .limit(1);
  return !error && (data?.length ?? 0) > 0;
}

// super_admins só existe após a migração 0002; sem ela, a consulta falha e o alvo fica protegido apenas pelo papel admin.
async function isListedSuperAdmin(userId: string): Promise<boolean> {
  const { data, error } = await serviceClient()
    .from("super_admins")
    .select("user_id")
    .eq("user_id", userId)
    .limit(1);
  return !error && (data?.length ?? 0) > 0;
}

Deno.serve(async (req) => {
  const cors = corsHeadersFor(req.headers.get("Origin"), ALLOWED_ORIGINS);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" },
    });

  if (req.method !== "POST") return json(405, { error: "Método não permitido" });

  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    body = null;
  }

  try {
    const result = await handleAdminDelete(req.headers.get("Authorization"), body, {
      async getCallerId(token) {
        const { data, error } = await userClient(token).auth.getUser(token);
        return error || !data.user ? null : data.user.id;
      },
      async getCallerAccess(token, callerId) {
        const [superRes, admin] = await Promise.all([
          userClient(token).rpc("is_super_admin", { _user_id: callerId }),
          hasAdminRole(callerId),
        ]);
        return { superAdmin: !superRes.error && superRes.data === true, admin };
      },
      async getTargetAccess(userId) {
        const [admin, superAdmin] = await Promise.all([hasAdminRole(userId), isListedSuperAdmin(userId)]);
        return { admin, superAdmin };
      },
      async deleteUser(userId) {
        const admin = serviceClient();
        await admin.from("user_roles").delete().eq("user_id", userId);
        await admin.from("profiles").delete().eq("id", userId);
        const { error } = await admin.auth.admin.deleteUser(userId);
        if (error) console.error("admin-delete-user: deleteUser falhou", error.status ?? "");
        return { ok: !error };
      },
      logError: (m) => console.error(m),
    });
    return json(result.status, result.body);
  } catch {
    console.error("admin-delete-user: erro inesperado");
    return json(500, { error: "Erro interno" });
  }
});
