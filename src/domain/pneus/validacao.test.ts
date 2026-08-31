import { describe, it, expect } from "vitest";
import { pneuSchema, lerPneuDoForm, custoPorKmPneu } from "./validacao";

function fd(dados: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(dados)) f.set(k, v);
  return f;
}

describe("pneu — validação", () => {
  it("aceita um pneu válido", () => {
    const r = pneuSchema.safeParse(
      lerPneuDoForm(fd({ numeroIdentificacao: "PN-001", marca: "Michelin", valor: "2.500,00", situacao: "em_uso" })),
    );
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.valor).toBe(2500);
  });

  it("rejeita sem número de identificação", () => {
    expect(pneuSchema.safeParse(lerPneuDoForm(fd({ numeroIdentificacao: "", situacao: "estoque" }))).success).toBe(false);
  });

  it("cavaloId vazio vira null", () => {
    const dados = lerPneuDoForm(fd({ numeroIdentificacao: "PN-2", cavaloId: "", situacao: "estoque" }));
    expect(dados.cavaloId).toBeNull();
  });
});

describe("custo por km do pneu", () => {
  it("calcula valor / km rodados", () => {
    expect(custoPorKmPneu(2500, 400000, 450000)).toBeCloseTo(0.05, 5); // 2500/50000
  });
  it("sem km suficiente ou sem valor, null", () => {
    expect(custoPorKmPneu(2500, 400000, 400000)).toBeNull();
    expect(custoPorKmPneu(null, 400000, 450000)).toBeNull();
    expect(custoPorKmPneu(2500, null, 450000)).toBeNull();
  });
});
