import { describe, it, expect } from "vitest";
import { clienteSchema } from "./validacao";

describe("clienteSchema", () => {
  const base = {
    tipo: "cliente",
    razaoSocial: "Transportes Silva Ltda",
    cnpjCpf: null,
    telefone: null,
    responsavel: null,
    prazoMedioPagamento: 30,
    dadosBancarios: null,
    observacoes: null,
  };

  it("aceita um cliente válido", () => {
    expect(clienteSchema.safeParse(base).success).toBe(true);
  });
  it("aceita tipo transportadora", () => {
    expect(clienteSchema.safeParse({ ...base, tipo: "transportadora" }).success).toBe(
      true,
    );
  });
  it("rejeita razão social vazia", () => {
    expect(clienteSchema.safeParse({ ...base, razaoSocial: "" }).success).toBe(false);
  });
  it("rejeita tipo inválido", () => {
    expect(clienteSchema.safeParse({ ...base, tipo: "fornecedor" }).success).toBe(
      false,
    );
  });
  it("rejeita prazo negativo", () => {
    expect(
      clienteSchema.safeParse({ ...base, prazoMedioPagamento: -5 }).success,
    ).toBe(false);
  });
});
