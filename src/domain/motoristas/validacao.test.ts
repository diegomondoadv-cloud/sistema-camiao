import { describe, it, expect } from "vitest";
import { motoristaSchema, statusVencimento } from "./validacao";

describe("motoristaSchema", () => {
  const base = {
    nome: "José da Silva",
    telefone: null,
    cpf: null,
    cnh: null,
    categoriaCnh: "E",
    vencCnh: new Date("2026-08-15T12:00:00Z"),
    vencToxicologico: null,
    formaRemuneracao: "comissao",
    salario: null,
    percentualComissao: 12,
    observacoes: null,
  };

  it("aceita um motorista válido", () => {
    expect(motoristaSchema.safeParse(base).success).toBe(true);
  });
  it("rejeita nome vazio", () => {
    expect(motoristaSchema.safeParse({ ...base, nome: "" }).success).toBe(false);
  });
  it("rejeita comissão acima de 100%", () => {
    expect(
      motoristaSchema.safeParse({ ...base, percentualComissao: 150 }).success,
    ).toBe(false);
  });
  it("rejeita forma de remuneração inválida", () => {
    expect(
      motoristaSchema.safeParse({ ...base, formaRemuneracao: "outra" }).success,
    ).toBe(false);
  });
});

describe("statusVencimento", () => {
  const hoje = new Date("2026-07-27T12:00:00Z");

  it("data no passado → vencido", () => {
    expect(statusVencimento(new Date("2026-07-01T12:00:00Z"), hoje)).toBe("vencido");
  });
  it("dentro de 30 dias → proximo", () => {
    expect(statusVencimento(new Date("2026-08-10T12:00:00Z"), hoje)).toBe("proximo");
  });
  it("no limite de 30 dias → proximo", () => {
    expect(statusVencimento(new Date("2026-08-26T12:00:00Z"), hoje)).toBe("proximo");
  });
  it("além de 30 dias → ok", () => {
    expect(statusVencimento(new Date("2026-10-01T12:00:00Z"), hoje)).toBe("ok");
  });
  it("sem data → null", () => {
    expect(statusVencimento(null, hoje)).toBeNull();
  });
});
