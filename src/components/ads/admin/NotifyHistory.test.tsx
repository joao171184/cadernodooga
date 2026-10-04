import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotifyHistory } from "./NotifyHistory";

const db = vi.hoisted(() => ({
  history: { data: null as unknown, error: null as unknown },
  calls: [] as { name: string; args: Record<string, unknown> }[],
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock("@/integrations/supabase/adsTypes", () => ({
  adsDb: {
    rpc: async (name: string, args: Record<string, unknown>) => {
      db.calls.push({ name, args });
      return name === "ads_notify_history" ? db.history : { data: 1, error: null };
    },
  },
}));
vi.mock("sonner", () => ({ toast: db.toast }));

const item = (id: number, status_code: number | null, kind: "lead" | "test" = "lead") => ({
  id, kind, status_code, timed_out: false, error: null, created_at: `2026-10-04T1${id}:00:00Z`,
});

beforeEach(() => {
  db.calls = [];
  db.history = { data: { total: 2, items: [item(1, 201), item(2, 401, "test")] }, error: null };
});

describe("NotifyHistory", () => {
  it("pede a migração 0007 quando a função não existe", async () => {
    db.history = { data: null, error: { code: "PGRST202" } };
    render(<NotifyHistory />);
    expect(await screen.findByText(/0007_notify_log_history/)).toBeInTheDocument();
  });

  it("lista envios e envia os filtros escolhidos", async () => {
    render(<NotifyHistory />);
    expect(await screen.findByText("Aceito pelo Brevo")).toBeInTheDocument();
    expect(screen.getByText("Mostrando 2 de 2")).toBeInTheDocument();
    expect(db.calls[0].args).toEqual({ _kind: null, _result: null, _limit: 10 });

    fireEvent.change(screen.getByLabelText("Filtrar por resultado"), { target: { value: "error" } });
    await waitFor(() => expect(db.calls.at(-1)?.args).toEqual({ _kind: null, _result: "error", _limit: 10 }));
    expect(screen.getByRole("button", { name: /Limpar filtrados/ })).toBeInTheDocument();
  });

  it("remove um envio da lista", async () => {
    render(<NotifyHistory />);
    await screen.findByText("Aceito pelo Brevo");
    fireEvent.click(screen.getAllByRole("button", { name: /Remover envio/ })[0]);
    await waitFor(() => expect(screen.queryByText("Aceito pelo Brevo")).not.toBeInTheDocument());
    expect(db.calls.at(-1)).toEqual({ name: "ads_notify_delete", args: { _ids: [1] } });
    expect(screen.getByText("Mostrando 1 de 1")).toBeInTheDocument();
  });

  it("oferece mostrar todos quando há mais que uma página", async () => {
    db.history = { data: { total: 25, items: Array.from({ length: 10 }, (_, i) => item(i, 201)) }, error: null };
    render(<NotifyHistory />);
    fireEvent.click(await screen.findByRole("button", { name: "Mostrar todos" }));
    await waitFor(() => expect(db.calls.at(-1)?.args).toMatchObject({ _limit: null }));
  });
});
