import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LeadRecipients } from "./LeadRecipients";

const db = vi.hoisted(() => ({
  profiles: [
    { id: "u1", email: "ana@exemplo.com" },
    { id: "u2", email: "bruno@exemplo.com" },
    { id: "u3", email: "carla@outro.com" },
  ],
  recipients: [{ user_id: "u1" }],
  insert: vi.fn(async () => ({ error: null })),
  deleteEq: vi.fn(async () => ({ error: null })),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({ select: () => ({ order: async () => ({ data: db.profiles, error: null }) }) }),
  },
}));
vi.mock("@/integrations/supabase/adsTypes", () => ({
  adsDb: {
    from: () => ({
      select: () => ({ order: async () => ({ data: db.recipients, error: null }) }),
      insert: db.insert,
      delete: () => ({ eq: db.deleteEq }),
    }),
  },
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

beforeEach(() => {
  db.insert.mockClear();
  db.deleteEq.mockClear();
});

describe("LeadRecipients", () => {
  it("lista os destinatários escolhidos", async () => {
    render(<LeadRecipients />);
    expect(await screen.findByText("ana@exemplo.com")).toBeInTheDocument();
    expect(screen.queryByText("bruno@exemplo.com")).toBeNull();
  });

  it("busca só entre usuários ainda não escolhidos e adiciona pelo id", async () => {
    render(<LeadRecipients />);
    await screen.findByText("ana@exemplo.com");
    fireEvent.change(screen.getByLabelText("Buscar usuário cadastrado por e-mail"), { target: { value: "exemplo" } });
    expect(screen.getAllByText("ana@exemplo.com")).toHaveLength(1);
    fireEvent.click(screen.getByText("bruno@exemplo.com"));
    await waitFor(() => expect(db.insert).toHaveBeenCalledWith({ user_id: "u2" }));
  });

  it("remove o destinatário", async () => {
    render(<LeadRecipients />);
    fireEvent.click(await screen.findByLabelText("Remover ana@exemplo.com"));
    await waitFor(() => expect(db.deleteEq).toHaveBeenCalledWith("user_id", "u1"));
    await waitFor(() => expect(screen.queryByText("ana@exemplo.com")).toBeNull());
  });
});
