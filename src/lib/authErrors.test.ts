import { describe, it, expect } from "vitest";
import { MIN_PASSWORD_LENGTH, SAME_PASSWORD_MESSAGE, translateAuthError } from "./authErrors";

describe("translateAuthError", () => {
  it("senha igual à atual não é confundida com senha fraca", () => {
    expect(translateAuthError("New password should be different from the old password.")).toBe(SAME_PASSWORD_MESSAGE);
    expect(translateAuthError("anything", "same_password")).toBe(SAME_PASSWORD_MESSAGE);
  });

  it("senha fraca ou curta continua com a mensagem de mínimo", () => {
    const weak = `A senha precisa ter no mínimo ${MIN_PASSWORD_LENGTH} caracteres e não pode ser fraca`;
    expect(translateAuthError("Password should be at least 8 characters.")).toBe(weak);
    expect(translateAuthError("x", "weak_password")).toBe(weak);
  });

  it("senha vazada tem mensagem própria", () => {
    expect(translateAuthError("Password is known to be weak and easy to guess (pwned)", "weak_password")).toMatch(/vazamentos/);
  });

  it("mensagens desconhecidas viram texto genérico", () => {
    expect(translateAuthError("pq: relation auth.users does not exist")).toBe(
      "Não foi possível concluir a operação. Tente novamente.",
    );
  });
});
