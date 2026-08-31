import { describe, it, expect } from "vitest";
import { viagemSchema } from "./validacao";

describe("viagemSchema", () => {
  const base = {
    cavaloId: "cav_123",
    carretaId: null,
    motoristaId: null,
    clienteId: null,
    embarcador: null,
    destinatario: null,
    origem: "São Paulo/SP",
    destino: "Curitiba/PR",
    dataCarregamento: null,
    previsaoEntrega: null,
    dataEntrega: null,
    tipoCarga: null,
    peso: null,
    numeroPaletes: null,
    valorBrutoFrete: 5000,
    adiantamento: 1000,
    comissaoTransportadora: 0,
    pedagioIncluso: true,
    kmInicial: null,
    kmFinal: null,
    kmCarregado: null,
    kmVazio: null,
    status: "planejada",
    numeroCte: null,
    numeroMdfe: null,
    observacoes: null,
  };

  it("aceita uma viagem válida", () => {
    expect(viagemSchema.safeParse(base).success).toBe(true);
  });
  it("exige o caminhão (cavaloId)", () => {
    expect(viagemSchema.safeParse({ ...base, cavaloId: "" }).success).toBe(false);
  });
  it("rejeita valor de frete negativo", () => {
    expect(viagemSchema.safeParse({ ...base, valorBrutoFrete: -1 }).success).toBe(
      false,
    );
  });
  it("rejeita status inválido", () => {
    expect(viagemSchema.safeParse({ ...base, status: "voando" }).success).toBe(false);
  });
});
