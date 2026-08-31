import { describe, it, expect } from "vitest";
import {
  recebimentoSchema,
  lerRecebimentoDoForm,
  situacaoConta,
} from "./validacao";

function fd(dados: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(dados)) f.set(k, v);
  return f;
}

describe("recebimento — leitura e validação", () => {
  it("lê valor em formato brasileiro e data", () => {
    const dados = lerRecebimentoDoForm(
      fd({ valor: "1.500,50", data: "2026-07-20", formaPagamento: "PIX" }),
    );
    expect(dados.valor).toBe(1500.5);
    expect(dados.formaPagamento).toBe("PIX");
    expect(recebimentoSchema.safeParse(dados).success).toBe(true);
  });

  it("rejeita valor zero ou vazio", () => {
    expect(
      recebimentoSchema.safeParse(lerRecebimentoDoForm(fd({ valor: "" }))).success,
    ).toBe(false);
  });
});

describe("situação da conta a receber", () => {
  const hoje = new Date("2026-08-02T12:00:00Z");

  it("recebida quando saldo <= 0", () => {
    expect(
      situacaoConta({ saldo: 0, jaRecebido: 500000, previsaoPagamento: null, hoje }),
    ).toBe("recebida");
  });

  it("parcialmente recebida quando há algo recebido e ainda sobra saldo", () => {
    expect(
      situacaoConta({
        saldo: 200000,
        jaRecebido: 300000,
        previsaoPagamento: null,
        hoje,
      }),
    ).toBe("parcialmente_recebida");
  });

  it("vencida quando nada recebido e a previsão já passou", () => {
    expect(
      situacaoConta({
        saldo: 500000,
        jaRecebido: 0,
        previsaoPagamento: new Date("2026-07-01T12:00:00Z"),
        hoje,
      }),
    ).toBe("vencida");
  });

  it("a vencer quando nada recebido e a previsão é futura", () => {
    expect(
      situacaoConta({
        saldo: 500000,
        jaRecebido: 0,
        previsaoPagamento: new Date("2026-09-01T12:00:00Z"),
        hoje,
      }),
    ).toBe("a_vencer");
  });

  it("a vencer quando não há previsão de pagamento", () => {
    expect(
      situacaoConta({ saldo: 500000, jaRecebido: 0, previsaoPagamento: null, hoje }),
    ).toBe("a_vencer");
  });
});
