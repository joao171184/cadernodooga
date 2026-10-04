import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { ReactNode } from "react";

// ---------- mocks (dados artificiais, sem rede) ----------
const { auth, supabaseMock, toastMock } = vi.hoisted(() => {
  const auth = {
    onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    getSession: vi.fn(async () => ({ data: { session: null }, error: null })),
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    resetPasswordForEmail: vi.fn(),
    resend: vi.fn(),
    signOut: vi.fn(async () => ({ error: null })),
    verifyOtp: vi.fn(),
    updateUser: vi.fn(),
  };
  const chain = {
    select: () => chain,
    eq: () => chain,
    maybeSingle: async () => ({ data: { role: "visitante" } }),
    then: (r: (v: unknown) => void) => r({ data: [] }),
  };
  const channel = { on: () => channel, subscribe: () => channel };
  const supabaseMock = {
    auth,
    from: vi.fn(() => chain),
    rpc: vi.fn(async () => ({ data: false, error: null })),
    channel: vi.fn(() => channel),
    removeChannel: vi.fn(),
  };
  const toastMock = { success: vi.fn(), error: vi.fn() };
  return { auth, supabaseMock, toastMock };
});

vi.mock("@/integrations/supabase/client", () => ({ supabase: supabaseMock }));
vi.mock("sonner", () => ({ toast: toastMock, Toaster: () => null }));
vi.mock("@/components/ThemeToggle", () => ({ ThemeToggle: () => null }));

import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Login, { RESEND_COOLDOWN_SECONDS } from "@/pages/Login";
import AuthConfirm from "@/pages/AuthConfirm";
import { RECOVERY_FLAG_KEY, parseConfirmParams } from "@/lib/authConfirm";
import ResetPassword from "@/pages/ResetPassword";
import {
  GENERIC_RESET_MESSAGE,
  GENERIC_SIGNUP_MESSAGE,
  EMAIL_SEND_FAILED_MESSAGE,
} from "@/lib/authErrors";

const UNCONFIRMED = { id: "u1", email: "nova@exemplo.test", email_confirmed_at: null };
const CONFIRMED = { id: "u2", email: "ok@exemplo.test", email_confirmed_at: "2026-01-01T00:00:00Z" };

function renderWithAuth(ui: ReactNode, path = "/login") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={ui} />
          <Route path="/" element={<div>HOME</div>} />
          <Route path="/reset-password" element={<div>RESET</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

const type = (label: string, value: string) =>
  fireEvent.change(screen.getAllByLabelText(label)[0], { target: { value } });

async function goSignup() {
  fireEvent.click(screen.getByRole("button", { name: /criar conta/i }));
  type("E-mail", "nova@exemplo.test");
  type("Senha", "SenhaForte123");
  type("Confirmar senha", "SenhaForte123");
  fireEvent.click(screen.getAllByRole("button", { name: /criar conta/i }).at(-1)!);
}

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
});

describe("cadastro", () => {
  it("cria conta pendente e mostra mensagem genérica", async () => {
    auth.signUp.mockResolvedValue({ data: { user: UNCONFIRMED, session: null }, error: null });
    renderWithAuth(<Login />);
    await goSignup();
    await waitFor(() => expect(toastMock.success).toHaveBeenCalledWith(GENERIC_SIGNUP_MESSAGE, expect.anything()));
    const opts = auth.signUp.mock.calls[0][0].options;
    expect(opts.emailRedirectTo).toMatch(/^https?:\/\/[^/]+\/$/);
  });

  it("e-mail já cadastrado recebe a mesma resposta (sem enumeração)", async () => {
    auth.signUp.mockResolvedValue({ data: { user: null, session: null }, error: { message: "User already registered" } });
    renderWithAuth(<Login />);
    await goSignup();
    await waitFor(() => expect(toastMock.success).toHaveBeenCalledWith(GENERIC_SIGNUP_MESSAGE, expect.anything()));
    expect(toastMock.error).not.toHaveBeenCalled();
  });

  it("rejeita senha curta no cliente (o servidor também deve exigir)", async () => {
    renderWithAuth(<Login />);
    fireEvent.click(screen.getByRole("button", { name: /criar conta/i }));
    type("E-mail", "nova@exemplo.test");
    type("Senha", "1234567");
    type("Confirmar senha", "1234567");
    fireEvent.click(screen.getAllByRole("button", { name: /criar conta/i }).at(-1)!);
    expect(auth.signUp).not.toHaveBeenCalled();
    expect(toastMock.error).toHaveBeenCalled();
  });

  it("sessão de conta não confirmada é descartada", async () => {
    auth.signUp.mockResolvedValue({ data: { user: UNCONFIRMED, session: { user: UNCONFIRMED } }, error: null });
    renderWithAuth(<Login />);
    await goSignup();
    await waitFor(() => expect(auth.signOut).toHaveBeenCalled());
    expect(screen.queryByText("HOME")).toBeNull();
  });

  it("falha do provedor de e-mail é informada sem revelar a conta", async () => {
    auth.signUp.mockResolvedValue({ data: { user: null, session: null }, error: { message: "Error sending confirmation email" } });
    renderWithAuth(<Login />);
    await goSignup();
    await waitFor(() => expect(toastMock.error).toHaveBeenCalledWith(EMAIL_SEND_FAILED_MESSAGE));
  });
});

describe("reenvio de confirmação", () => {
  afterEach(() => vi.useRealTimers());

  it("respeita a espera de 60s", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    auth.signUp.mockResolvedValue({ data: { user: UNCONFIRMED, session: null }, error: null });
    auth.resend.mockResolvedValue({ error: null });
    renderWithAuth(<Login />);
    await goSignup();
    const btn = await screen.findByRole("button", { name: /reenviar confirmação em/i });
    expect(btn).toBeDisabled();
    fireEvent.click(btn);
    expect(auth.resend).not.toHaveBeenCalled();

    for (let i = 0; i <= RESEND_COOLDOWN_SECONDS; i++) {
      await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    }
    const ready = await screen.findByRole("button", { name: /reenviar e-mail de confirmação/i });
    expect(ready).toBeEnabled();
    fireEvent.click(ready);
    await waitFor(() => expect(auth.resend).toHaveBeenCalledWith(expect.objectContaining({ type: "signup", email: "nova@exemplo.test" })));
  });
});

describe("login", () => {
  it("bloqueia antes da confirmação e oferece reenvio", async () => {
    auth.signInWithPassword.mockResolvedValue({ data: { user: null, session: null }, error: { message: "Email not confirmed" } });
    renderWithAuth(<Login />);
    type("E-mail", "nova@exemplo.test");
    type("Senha", "SenhaForte123");
    fireEvent.click(screen.getByRole("button", { name: /^entrar$/i }));
    await waitFor(() => expect(toastMock.error).toHaveBeenCalledWith("Confirme seu e-mail antes de entrar"));
    expect(await screen.findByRole("button", { name: /reenviar e-mail de confirmação/i })).toBeInTheDocument();
  });

  it("mesmo que o servidor devolva sessão, conta não confirmada não entra", async () => {
    auth.signInWithPassword.mockResolvedValue({ data: { user: UNCONFIRMED, session: { user: UNCONFIRMED } }, error: null });
    renderWithAuth(<Login />);
    type("E-mail", "nova@exemplo.test");
    type("Senha", "SenhaForte123");
    fireEvent.click(screen.getByRole("button", { name: /^entrar$/i }));
    await waitFor(() => expect(auth.signOut).toHaveBeenCalled());
    expect(toastMock.error).toHaveBeenCalledWith("Confirme seu e-mail antes de entrar");
  });

  it("depois da confirmação entra normalmente", async () => {
    auth.signInWithPassword.mockResolvedValue({ data: { user: CONFIRMED, session: { user: CONFIRMED } }, error: null });
    renderWithAuth(<Login />);
    type("E-mail", "ok@exemplo.test");
    type("Senha", "SenhaForte123");
    fireEvent.click(screen.getByRole("button", { name: /^entrar$/i }));
    await waitFor(() => expect(toastMock.success).toHaveBeenCalledWith("Bem-vindo 🪘"));
  });

  it("credenciais erradas não revelam se a conta existe", async () => {
    auth.signInWithPassword.mockResolvedValue({ data: { user: null, session: null }, error: { message: "Invalid login credentials" } });
    renderWithAuth(<Login />);
    type("E-mail", "x@exemplo.test");
    type("Senha", "errada123");
    fireEvent.click(screen.getByRole("button", { name: /^entrar$/i }));
    await waitFor(() => expect(toastMock.error).toHaveBeenCalledWith("E-mail ou senha incorretos"));
  });
});

describe("esqueci minha senha", () => {
  it.each([
    ["existente", { error: null }],
    ["inexistente", { error: { message: "User not found" } }],
  ])("e-mail %s recebe a mesma resposta", async (_label, result) => {
    auth.resetPasswordForEmail.mockResolvedValue(result);
    renderWithAuth(<Login />);
    fireEvent.click(screen.getByRole("button", { name: /esqueci minha senha/i }));
    type("E-mail", "alguem@exemplo.test");
    fireEvent.click(screen.getByRole("button", { name: /enviar link/i }));
    await waitFor(() => expect(toastMock.success).toHaveBeenCalledWith(GENERIC_RESET_MESSAGE, expect.anything()));
    expect(auth.resetPasswordForEmail.mock.calls[0][1].redirectTo).toMatch(/\/reset-password$/);
  });

  it("limite de taxa é informado", async () => {
    auth.resetPasswordForEmail.mockResolvedValue({ error: { message: "email rate limit exceeded" } });
    renderWithAuth(<Login />);
    fireEvent.click(screen.getByRole("button", { name: /esqueci minha senha/i }));
    type("E-mail", "alguem@exemplo.test");
    fireEvent.click(screen.getByRole("button", { name: /enviar link/i }));
    await waitFor(() => expect(toastMock.error).toHaveBeenCalledWith(expect.stringMatching(/muitas tentativas/i)));
  });
});

describe("/auth/confirm", () => {
  const renderConfirm = (search: string) => {
    window.history.replaceState(null, "", `/auth/confirm${search}`);
    return render(
      <MemoryRouter initialEntries={[`/auth/confirm${search}`]}>
        <Routes>
          <Route path="/auth/confirm" element={<AuthConfirm />} />
          <Route path="/" element={<div>HOME</div>} />
          <Route path="/login" element={<div>LOGIN</div>} />
          <Route path="/reset-password" element={<div>RESET</div>} />
        </Routes>
      </MemoryRouter>,
    );
  };

  it("valida os parâmetros", () => {
    expect(parseConfirmParams("?token_hash=abcdefgh12&type=signup")).toMatchObject({ type: "signup", next: "/" });
    expect(parseConfirmParams("?token_hash=abcdefgh12&type=admin")).toBeNull();
    expect(parseConfirmParams("?token_hash=<x>&type=signup")).toBeNull();
    expect(parseConfirmParams("?token_hash=abcdefgh12&type=signup&next=//evil.example")?.next).toBe("/");
    expect(parseConfirmParams("?token_hash=abcdefgh12&type=signup&next=https://evil.example")?.next).toBe("/");
  });

  it("não consome o token sem clique e remove o token da URL", async () => {
    renderConfirm("?token_hash=abcdefgh12&type=signup");
    expect(auth.verifyOtp).not.toHaveBeenCalled();
    await waitFor(() => expect(window.location.search).toBe(""));
  });

  it("confirmação válida", async () => {
    auth.verifyOtp.mockResolvedValue({ data: {}, error: null });
    renderConfirm("?token_hash=abcdefgh12&type=signup");
    fireEvent.click(screen.getByRole("button", { name: /confirmar e-mail/i }));
    await waitFor(() => expect(auth.verifyOtp).toHaveBeenCalledWith({ token_hash: "abcdefgh12", type: "signup" }));
    expect(await screen.findByText("HOME")).toBeInTheDocument();
  });

  it.each(["Token has expired or is invalid", "Email link is invalid or has expired"])(
    "token expirado ou reutilizado (%s) mostra link inválido",
    async (message) => {
      auth.verifyOtp.mockResolvedValue({ data: {}, error: { message } });
      renderConfirm("?token_hash=abcdefgh12&type=signup");
      fireEvent.click(screen.getByRole("button", { name: /confirmar e-mail/i }));
      expect(await screen.findByText(/link inválido ou expirado/i)).toBeInTheDocument();
    },
  );

  it("tipo não permitido não chama o Supabase", () => {
    renderConfirm("?token_hash=abcdefgh12&type=admin");
    expect(screen.getByText(/link inválido ou expirado/i)).toBeInTheDocument();
    expect(auth.verifyOtp).not.toHaveBeenCalled();
  });

  it("recuperação válida leva à troca de senha", async () => {
    auth.verifyOtp.mockResolvedValue({ data: {}, error: null });
    renderConfirm("?token_hash=abcdefgh12&type=recovery");
    fireEvent.click(screen.getByRole("button", { name: /continuar/i }));
    expect(await screen.findByText("RESET")).toBeInTheDocument();
    expect(sessionStorage.getItem(RECOVERY_FLAG_KEY)).toBe("1");
  });
});

describe("/reset-password", () => {
  const renderReset = () =>
    render(
      <MemoryRouter initialEntries={["/reset-password"]}>
        <Routes>
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/" element={<div>HOME</div>} />
        </Routes>
      </MemoryRouter>,
    );

  it("sessão comum (sem link de recuperação) não abre o formulário", async () => {
    auth.getSession.mockResolvedValue({ data: { session: { user: CONFIRMED } }, error: null });
    renderReset();
    expect(await screen.findByText(/link inválido ou expirado/i)).toBeInTheDocument();
    expect(screen.queryByLabelText("Nova senha")).toBeNull();
  });

  it("reset válido troca a senha, encerra outras sessões e não pode ser reutilizado", async () => {
    sessionStorage.setItem(RECOVERY_FLAG_KEY, "1");
    auth.getSession.mockResolvedValue({ data: { session: { user: CONFIRMED } }, error: null });
    auth.updateUser.mockResolvedValue({ data: {}, error: null });
    renderReset();
    fireEvent.change(await screen.findByLabelText("Nova senha"), { target: { value: "NovaSenha123" } });
    fireEvent.change(screen.getByLabelText("Confirme a nova senha"), { target: { value: "NovaSenha123" } });
    fireEvent.click(screen.getByRole("button", { name: /redefinir/i }));
    await waitFor(() => expect(auth.updateUser).toHaveBeenCalledWith({ password: "NovaSenha123" }));
    expect(auth.signOut).toHaveBeenCalledWith({ scope: "others" });
    expect(sessionStorage.getItem(RECOVERY_FLAG_KEY)).toBeNull();
  });

  it("erro do servidor não é exibido cru", async () => {
    sessionStorage.setItem(RECOVERY_FLAG_KEY, "1");
    auth.getSession.mockResolvedValue({ data: { session: { user: CONFIRMED } }, error: null });
    auth.updateUser.mockResolvedValue({ data: {}, error: { message: "internal: pq: relation auth.users ..." } });
    renderReset();
    fireEvent.change(await screen.findByLabelText("Nova senha"), { target: { value: "NovaSenha123" } });
    fireEvent.change(screen.getByLabelText("Confirme a nova senha"), { target: { value: "NovaSenha123" } });
    fireEvent.click(screen.getByRole("button", { name: /redefinir/i }));
    await waitFor(() => expect(toastMock.error).toHaveBeenCalled());
    expect(toastMock.error.mock.calls[0][0]).not.toMatch(/auth\.users|pq:/);
  });

  it("avisa quando a nova senha é igual à atual", async () => {
    sessionStorage.setItem(RECOVERY_FLAG_KEY, "1");
    auth.getSession.mockResolvedValue({ data: { session: { user: CONFIRMED } }, error: null });
    auth.updateUser.mockResolvedValue({
      data: {},
      error: { message: "New password should be different from the old password.", code: "same_password" },
    });
    renderReset();
    fireEvent.change(await screen.findByLabelText("Nova senha"), { target: { value: "SenhaAntiga1" } });
    fireEvent.change(screen.getByLabelText("Confirme a nova senha"), { target: { value: "SenhaAntiga1" } });
    fireEvent.click(screen.getByRole("button", { name: /redefinir/i }));
    await waitFor(() => expect(toastMock.error).toHaveBeenCalledWith(expect.stringMatching(/senha atual/i)));
  });

  it("botão de olho mostra e oculta a nova senha", async () => {
    sessionStorage.setItem(RECOVERY_FLAG_KEY, "1");
    auth.getSession.mockResolvedValue({ data: { session: { user: CONFIRMED } }, error: null });
    renderReset();
    const input = await screen.findByLabelText("Nova senha");
    expect(input).toHaveAttribute("type", "password");
    fireEvent.click(screen.getAllByRole("button", { name: "Mostrar senha" })[0]);
    expect(input).toHaveAttribute("type", "text");
    expect(screen.getByLabelText("Confirme a nova senha")).toHaveAttribute("type", "text");
    fireEvent.click(screen.getAllByRole("button", { name: "Ocultar senha" })[0]);
    expect(input).toHaveAttribute("type", "password");
  });
});

describe("AuthContext", () => {
  function Probe() {
    const { isLoggedIn, isAdmin, isSuperAdmin } = useAuth();
    return <div>{`logged:${isLoggedIn} admin:${isAdmin} super:${isSuperAdmin}`}</div>;
  }

  it("conta não confirmada com sessão não conta como logada", async () => {
    auth.getSession.mockResolvedValue({ data: { session: { user: UNCONFIRMED } }, error: null });
    render(<AuthProvider><Probe /></AuthProvider>);
    expect(await screen.findByText("logged:false admin:false super:false")).toBeInTheDocument();
    expect(supabaseMock.rpc).not.toHaveBeenCalled();
  });

  it("super-admin vem do servidor (rpc), não de e-mail no cliente", async () => {
    auth.getSession.mockResolvedValue({
      data: { session: { user: { ...CONFIRMED, email: "joao.pedro.am.171@gmail.com" } } },
      error: null,
    });
    supabaseMock.rpc.mockResolvedValue({ data: false, error: null });
    render(<AuthProvider><Probe /></AuthProvider>);
    expect(await screen.findByText("logged:true admin:false super:false")).toBeInTheDocument();
    expect(supabaseMock.rpc).toHaveBeenCalledWith("is_super_admin", { _user_id: "u2" });
  });
});
