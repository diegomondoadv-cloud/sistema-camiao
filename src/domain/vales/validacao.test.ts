import { describe, it, expect } from "vitest";
import { valeSchema, situacaoVale } from "./validacao";

describe("valeSchema", () => {
  it("aceita um vale válido", () => {
    const r = valeSchema.safeParse({
      motoristaId: "m1",
      valor: 200,
      data: new Date("2026-09-01T12:00:00Z"),
      dataVencimento: null,
      observacoes: null,
    });
    expect(r.success).toBe(true);
  });

  it("rejeita sem motorista", () => {
    const r = valeSchema.safeParse({
      motoristaId: "",
      valor: 200,
      data: new Date(),
      dataVencimento: null,
      observacoes: null,
    });
    expect(r.success).toBe(false);
  });

  it("rejeita valor zero ou negativo", () => {
    for (const v of [0, -50]) {
      const r = valeSchema.safeParse({
        motoristaId: "m1",
        valor: v,
        data: new Date(),
        dataVencimento: null,
        observacoes: null,
      });
      expect(r.success).toBe(false);
    }
  });
});

describe("situacaoVale", () => {
  const hoje = new Date("2026-09-10T12:00:00Z");

  it("acertado tem prioridade", () => {
    expect(situacaoVale(true, new Date("2026-09-01T12:00:00Z"), hoje)).toBe("acertado");
  });

  it("vencido quando passou do vencimento e não acertado", () => {
    expect(situacaoVale(false, new Date("2026-09-05T12:00:00Z"), hoje)).toBe("vencido");
  });

  it("pendente quando ainda não venceu", () => {
    expect(situacaoVale(false, new Date("2026-09-20T12:00:00Z"), hoje)).toBe("pendente");
  });

  it("pendente quando não há vencimento", () => {
    expect(situacaoVale(false, null, hoje)).toBe("pendente");
  });
});
