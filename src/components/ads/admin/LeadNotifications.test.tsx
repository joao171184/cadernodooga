import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LeadNotifications } from "./LeadNotifications";

const db = vi.hoisted(() => ({
  settings: { data: null as unknown, error: null as unknown },
  status: { data: null as unknown, error: null as unknown },
  test: { data: "sent" as unknown, error: null as unknown },
  update: vi.fn(),
  rpc: vi.fn(),
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock("@/integrations/supabase/adsTypes", () => ({
  adsDb: {
    from: () => ({
      select: () => ({ maybeSingle: async () => db.settings }),
      update: (values: unknown) => ({ eq: async () => { db.update(values); return { error: null }; } }),
    }),
    rpc: async (name: string) => {
      db.rpc(name);
      return name === "ads_notify_status" ? db.status : db.test;
    },
  },
}));
vi.mock("sonner", () => ({ toast: db.toast }));
vi.mock("@/components/ui/switch", () => ({
  Switch: ({ checked, onCheckedChange, ...rest }: { checked: boolean; onCheckedChange: (v: boolean) => void }) => (
    <input type="checkbox" checked={checked} onChange={(e) => onCheckedChange(e.target.checked)} {...rest} />
  ),
}));

beforeEach(() => {
  db.settings = { data: { id: true, enabled: false, sender_email: null, sender_name: "Caderno do Ogã", updated_at: "" }, error: null };
  db.status = { data: { key_configured: false, recipients: 1, recent: [] }, error: null };
  db.test = { data: "sent", error: null };
  db.update.mockReset();
  db.rpc.mockReset();
  db.toast.error.mockReset();
  db.toast.success.mockReset();
});

describe("LeadNotifications", () => {
  it("pede a migração 0006 quando as tabelas não existem", async () => {
    db.settings = { data: null, error: { code: "PGRST205" } };
    render(<LeadNotifications />);
    expect(await screen.findByText(/0006_lead_notifications/)).toBeInTheDocument();
  });

  it("não liga os avisos sem chave do Brevo guardada", async () => {
    render(<LeadNotifications />);
    expect(await screen.findByText("Chave do Brevo não configurada")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("E-mail remetente"), { target: { value: "avisos@cadernodooga.com.br" } });
    fireEvent.click(screen.getByLabelText("Ligar avisos por e-mail"));
    fireEvent.click(screen.getByText("Salvar avisos"));
    expect(db.update).not.toHaveBeenCalled();
    expect(db.toast.error).toHaveBeenCalledWith(expect.stringMatching(/chave do Brevo/i));
  });

  it("salva remetente e liga os avisos quando a chave existe", async () => {
    db.status = { data: { key_configured: true, recipients: 1, recent: [] }, error: null };
    render(<LeadNotifications />);
    await screen.findByText("Chave do Brevo guardada");
    fireEvent.change(screen.getByLabelText("E-mail remetente"), { target: { value: " avisos@cadernodooga.com.br " } });
    fireEvent.click(screen.getByLabelText("Ligar avisos por e-mail"));
    fireEvent.click(screen.getByText("Salvar avisos"));
    await waitFor(() => expect(db.update).toHaveBeenCalledWith({
      enabled: true, sender_email: "avisos@cadernodooga.com.br", sender_name: "Caderno do Ogã",
    }));
  });

  it("mostra o motivo quando o teste não pode ser enviado", async () => {
    db.test = { data: "no_key", error: null };
    render(<LeadNotifications />);
    fireEvent.click(await screen.findByText("Enviar e-mail de teste"));
    await waitFor(() => expect(db.toast.error).toHaveBeenCalledWith(expect.stringMatching(/chave do Brevo/i)));
    expect(db.rpc).toHaveBeenCalledWith("ads_send_test_notification");
  });

  it("lista o resultado dos últimos envios", async () => {
    db.status = {
      data: { key_configured: true, recipients: 1, recent: [
        { created_at: "2026-10-04T17:00:00Z", kind: "test", status_code: 201, timed_out: false, error: null },
        { created_at: "2026-10-04T16:00:00Z", kind: "lead", status_code: 401, timed_out: false, error: null },
      ] },
      error: null,
    };
    render(<LeadNotifications />);
    expect(await screen.findByText("Aceito pelo Brevo")).toBeInTheDocument();
    expect(screen.getByText("Chave do Brevo inválida ou revogada")).toBeInTheDocument();
  });
});
