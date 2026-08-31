import { describe, it, expect } from "vitest";
import { metaSchema, lerMetaDoForm, percentualAtingido } from "./validacao";

function fd(dados: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(dados)) f.set(k, v);
  return f;
}

describe("meta — validação", () => {
  it("aceita uma meta válida", () => {
    const r = metaSchema.safeParse(
      lerMetaDoForm(fd({ cavaloId: "cav1", ano: "2026", mes: "8", metaFaturamento: "50.000,00", metaKm: "10.000" })),
    );
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.metaFaturamento).toBe(50000);
      expect(r.data.metaKm).toBe(10000);
      expect(r.data.metaLucro).toBeNull();
    }
  });

  it("rejeita sem veículo ou mês inválido", () => {
    expect(metaSchema.safeParse(lerMetaDoForm(fd({ cavaloId: "", ano: "2026", mes: "8" }))).success).toBe(false);
    expect(metaSchema.safeParse(lerMetaDoForm(fd({ cavaloId: "cav1", ano: "2026", mes: "13" }))).success).toBe(false);
  });
});

describe("percentual atingido", () => {
  it("calcula realizado/meta", () => {
    expect(percentualAtingido(30000, 50000)).toBeCloseTo(60, 5);
    expect(percentualAtingido(55000, 50000)).toBeCloseTo(110, 5);
  });
  it("sem meta válida devolve null", () => {
    expect(percentualAtingido(30000, null)).toBeNull();
    expect(percentualAtingido(30000, 0)).toBeNull();
  });
});
