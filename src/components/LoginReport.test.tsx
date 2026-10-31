import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LoginReport } from "./LoginReport";

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), pdf: vi.fn(), download: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc: mocks.rpc } }));
vi.mock("@/lib/pdfReport", () => ({
  brDate: (day: string) => day,
  buildReportPdf: mocks.pdf,
  downloadBlob: mocks.download,
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.rpc.mockImplementation(async (name: string) => ({
    data: name === "get_login_stats"
      ? [{ day: "2026-10-30", logins: 4 }, { day: "2026-10-31", logins: 6 }]
      : [{ day: "2026-10-30", signups: 2 }, { day: "2026-10-31", signups: 3 }],
    error: null,
  }));
});

describe("daily report modes", () => {
  it("keeps daily login totals separate from daily account creation totals", async () => {
    render(<LoginReport />);
    await waitFor(() => expect(mocks.rpc).toHaveBeenCalledWith("get_login_stats", expect.any(Object)));
    fireEvent.click(await screen.findByRole("button", { name: "Baixar PDF" }));
    expect(mocks.pdf.mock.calls[0][0].summary[0][1]).toBe("10");
    fireEvent.click(screen.getByRole("button", { name: "Cadastros" }));
    await waitFor(() => expect(mocks.rpc).toHaveBeenCalledWith("get_signup_stats", expect.any(Object)));
    await waitFor(() => expect(screen.getByRole("button", { name: "Baixar PDF" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Baixar PDF" }));
    expect(mocks.pdf.mock.calls[1][0].summary[0][1]).toBe("5");
    expect(mocks.pdf.mock.calls[1][0].sections[0].body).toEqual([["2026-10-31", 3], ["2026-10-30", 2]]);
  });

  it("preserves date filters when switching modes and exports the selected report", async () => {
    render(<LoginReport />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Baixar PDF" })).toBeEnabled());
    fireEvent.change(screen.getByLabelText("De"), { target: { value: "2026-04-23" } });
    fireEvent.change(screen.getByLabelText("Até"), { target: { value: "2026-10-30" } });
    fireEvent.click(screen.getByRole("button", { name: "Cadastros" }));
    await waitFor(() => expect(mocks.rpc).toHaveBeenLastCalledWith("get_signup_stats", { _from: "2026-04-23", _to: "2026-10-30" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Baixar PDF" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Baixar PDF" }));
    expect(mocks.download).toHaveBeenCalledWith(expect.anything(), "cadastros_2026-04-23_a_2026-10-30.pdf");
  });
});