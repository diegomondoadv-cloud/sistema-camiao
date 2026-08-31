import { describe, it, expect } from "vitest";
import {
  contaPagarSchema,
  lerContaPagarDoForm,
  situacaoContaPagar,
} from "./validacao";

function fd(dados: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(dados)) f.set(k, v);
  return f;
}

describe("conta a pagar — validação", () => {
  it("aceita uma conta válida", () => {
    const r = contaPagarSchema.safeParse(
      lerContaPagarDoForm(fd({ descricao: "Parcela do financiamento", categoria: "financiamento", valor: "8.500,00", dataVencimento: "2026-08-15" })),
    );
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.valor).toBe(8500);
  });

  it("rejeita sem descrição ou sem valor", () => {
    expect(contaPagarSchema.safeParse(lerContaPagarDoForm(fd({ descricao: "", valor: "100" }))).success).toBe(false);
    expect(contaPagarSchema.safeParse(lerContaPagarDoForm(fd({ descricao: "Conta X", valor: "" }))).success).toBe(false);
  });

  it("fornecedorId/cavaloId vazios viram null", () => {
    const d = lerContaPagarDoForm(fd({ descricao: "Seguro", valor: "500", fornecedorId: "", cavaloId: "" }));
    expect(d.fornecedorId).toBeNull();
    expect(d.cavaloId).toBeNull();
  });
});

describe("situação da conta a pagar", () => {
  const hoje = new Date("2026-08-04T12:00:00Z");
  it("paga", () => {
    expect(situacaoContaPagar(true, new Date("2026-07-01T12:00:00Z"), hoje)).toBe("paga");
  });
  it("vencida quando não paga e venc passou", () => {
    expect(situacaoContaPagar(false, new Date("2026-08-01T12:00:00Z"), hoje)).toBe("vencida");
  });
  it("a vencer quando não paga e venc futuro (ou sem venc)", () => {
    expect(situacaoContaPagar(false, new Date("2026-09-01T12:00:00Z"), hoje)).toBe("a_vencer");
    expect(situacaoContaPagar(false, null, hoje)).toBe("a_vencer");
  });
});
