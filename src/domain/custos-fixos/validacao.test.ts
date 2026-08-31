import { describe, it, expect } from "vitest";
import {
  custoFixoSchema,
  lerCustoFixoDoForm,
  custoMensalizado,
} from "./validacao";
import { reaisParaCentavos } from "@/shared/dinheiro";

function fd(dados: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(dados)) f.set(k, v);
  return f;
}

describe("custo fixo — leitura e validação", () => {
  it("aceita custo da empresa (sem veículo)", () => {
    const dados = lerCustoFixoDoForm(
      fd({ escopo: "empresa", categoria: "contabilidade", valor: "800,00", periodicidade: "mensal" }),
    );
    expect(dados.cavaloId).toBeNull();
    expect(custoFixoSchema.safeParse(dados).success).toBe(true);
  });

  it("custo por veículo exige o veículo", () => {
    const semVeiculo = custoFixoSchema.safeParse(
      lerCustoFixoDoForm(fd({ escopo: "veiculo", categoria: "financiamento", valor: "8.500,00", periodicidade: "mensal" })),
    );
    expect(semVeiculo.success).toBe(false);

    const comVeiculo = custoFixoSchema.safeParse(
      lerCustoFixoDoForm(fd({ escopo: "veiculo", cavaloId: "cav1", categoria: "financiamento", valor: "8.500,00", periodicidade: "mensal" })),
    );
    expect(comVeiculo.success).toBe(true);
  });

  it("custo da empresa ignora cavalo mesmo se enviado", () => {
    const dados = lerCustoFixoDoForm(
      fd({ escopo: "empresa", cavaloId: "cav1", categoria: "seguro", valor: "500", periodicidade: "anual" }),
    );
    expect(dados.cavaloId).toBeNull();
  });

  it("rejeita valor zero", () => {
    expect(
      custoFixoSchema.safeParse(
        lerCustoFixoDoForm(fd({ escopo: "empresa", categoria: "outros", valor: "", periodicidade: "mensal" })),
      ).success,
    ).toBe(false);
  });
});

describe("custo mensalizado", () => {
  it("mensal mantém o valor", () => {
    expect(custoMensalizado(reaisParaCentavos(5000), "mensal")).toBe(
      reaisParaCentavos(5000),
    );
  });
  it("anual divide por 12", () => {
    expect(custoMensalizado(reaisParaCentavos(1200), "anual")).toBe(
      reaisParaCentavos(100),
    );
  });
  it("único não é recorrente (0 no mensal)", () => {
    expect(custoMensalizado(reaisParaCentavos(3000), "unico")).toBe(0);
  });
});
