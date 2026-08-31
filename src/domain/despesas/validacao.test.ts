import { describe, it, expect } from "vitest";
import { despesaSchema } from "./validacao";

describe("despesaSchema", () => {
  const base = {
    data: new Date("2026-07-28T12:00:00Z"),
    categoria: "combustivel",
    valor: 350.5,
    formaPagamento: null,
    estabelecimento: null,
    descricao: null,
  };

  it("aceita uma despesa válida", () => {
    expect(despesaSchema.safeParse(base).success).toBe(true);
  });
  it("rejeita categoria inválida", () => {
    expect(despesaSchema.safeParse({ ...base, categoria: "cerveja" }).success).toBe(
      false,
    );
  });
  it("rejeita valor negativo", () => {
    expect(despesaSchema.safeParse({ ...base, valor: -10 }).success).toBe(false);
  });
  it("exige a data", () => {
    expect(despesaSchema.safeParse({ ...base, data: null }).success).toBe(false);
  });
});
