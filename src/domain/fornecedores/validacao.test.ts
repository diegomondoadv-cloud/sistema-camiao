import { describe, it, expect } from "vitest";
import { fornecedorSchema, lerFornecedorDoForm } from "./validacao";

function fd(dados: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(dados)) f.set(k, v);
  return f;
}

describe("fornecedor — validação", () => {
  it("aceita um fornecedor válido", () => {
    const r = fornecedorSchema.safeParse(
      lerFornecedorDoForm(fd({ nome: "Posto Rota Araranguá", categoria: "posto", cidade: "Araranguá" })),
    );
    expect(r.success).toBe(true);
  });

  it("rejeita nome muito curto", () => {
    expect(
      fornecedorSchema.safeParse(lerFornecedorDoForm(fd({ nome: "A" }))).success,
    ).toBe(false);
  });

  it("categoria e demais campos são opcionais", () => {
    const r = fornecedorSchema.safeParse(lerFornecedorDoForm(fd({ nome: "Auto Diesel" })));
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.categoria).toBeNull();
  });
});
