import { describe, expect, it } from "vitest";
import { authorCredit } from "./pointAuthor";

describe("point authorship", () => {
  it("keeps author optional for existing and unattributed points", () => {
    expect(authorCredit()).toBeUndefined();
    expect(authorCredit("  ")).toBeUndefined();
  });
  it("credits the entered author", () => {
    expect(authorCredit("  João Pedro  ")).toEqual({ "@type": "Person", name: "João Pedro" });
  });
});